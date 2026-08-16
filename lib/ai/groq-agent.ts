/**
 * Groq AI Agent Engine (SIPADIN Co-Pilot)
 * Menjalankan LLM Llama 3.3 70B dengan Recursive Tool Calling & Session Memory.
 */

import { SYSTEM_PROMPT_SIPADIN_AGENT } from "./prompts";
import { AI_TOOLS_SCHEMA, executeToolCall } from "./tools";
import { getSession, addMessageToSession, ChatMessage } from "./session-store";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODELS = [
  "llama-3.1-8b-instant",        // Kuota 500.000 TPD
  "gemma2-9b-it",                // Kuota 500.000 TPD
  "llama-3.2-3b-preview",        // Kuota 500.000 TPD
];

export interface AgentProcessResult {
  replyText: string;
  toolCallsExecuted: string[];
}

/**
 * Fallback AI Engine: Google Gemini (Bypass total limit Groq jika 429)
 */
async function callGeminiFallback(prompt: string, contextTeamId?: string): Promise<AgentProcessResult> {
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  if (!geminiKey) throw new Error("GEMINI_API_KEY not found");

  // Jika pertanyaan umum tentang agenda / absensi / spj, kita jalankan query data langsung
  const lower = prompt.toLowerCase();
  let directDataText = "";
  const toolsExecuted: string[] = [];

  if (lower.includes("agenda")) {
    const { executeToolCall } = await import("./tools");
    directDataText = await executeToolCall("list_agenda_tim", { limit: 10 }, "gemini_fallback", contextTeamId);
    toolsExecuted.push("list_agenda_tim");
  } else if (lower.includes("absensi")) {
    const { executeToolCall } = await import("./tools");
    directDataText = await executeToolCall("list_agenda_absensi", { limit: 10 }, "gemini_fallback", contextTeamId);
    toolsExecuted.push("list_agenda_absensi");
  } else if (lower.includes("belum bayar") || lower.includes("belum dibayar") || lower.includes("unpaid")) {
    const { executeToolCall } = await import("./tools");
    directDataText = await executeToolCall("get_unpaid_spjs", { limit: 10 }, "gemini_fallback", contextTeamId);
    toolsExecuted.push("get_unpaid_spjs");
  } else if (lower.includes("nip")) {
    const { executeToolCall } = await import("./tools");
    const nameMatch = prompt.replace(/nip/gi, "").trim();
    directDataText = await executeToolCall("lookup_nip_direct", { nama: nameMatch }, "gemini_fallback", contextTeamId);
    toolsExecuted.push("lookup_nip_direct");
  }

  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
  const response = await fetch(geminiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `${SYSTEM_PROMPT_SIPADIN_AGENT}\n\nDATA DARI DATABASE:\n${directDataText}\n\nPERTANYAAN USER: "${prompt}"\n\nJawab dengan gaya Sipadin (santai, singkat, to the point, format WhatsApp):`,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini Error (${response.status}): ${err}`);
  }

  const resJson = await response.json();
  const reply = resJson.candidates?.[0]?.content?.parts?.[0]?.text || "Aman, tapi datanya lagi kosong nih bro.";

  return {
    replyText: reply.trim(),
    toolCallsExecuted: toolsExecuted,
  };
}

/**
 * Proses pesan WhatsApp user melalui Groq AI Agent dengan Auto Gemini Fallback
 */
export async function processUserMessageWithGroq(
  sessionKey: string,
  userMessageText: string,
  contextTeamId?: string
): Promise<AgentProcessResult> {
  const apiKey = process.env.GROQ_API_KEY?.trim();

  // 1. Ambil Session Percakapan
  const session = getSession(sessionKey);

  // Tambahkan user message ke session
  const userMsg: ChatMessage = {
    role: "user",
    content: userMessageText,
  };
  addMessageToSession(sessionKey, userMsg);

  const toolsExecuted: string[] = [];
  let maxToolLoops = 5;

  // Pangkas hanya 4 pesan terakhir agar payload token sangat kecil (< 300 token)
  const recentMessages = session.messages.slice(-4).filter((m) => m.content !== null || (m.tool_calls && m.tool_calls.length > 0));

  let conversation: ChatMessage[] = [
    {
      role: "system",
      content: SYSTEM_PROMPT_SIPADIN_AGENT,
    },
    ...recentMessages,
  ];

  while (maxToolLoops > 0) {
    maxToolLoops--;

    let lastError: any = null;
    let data: any = null;

    for (const model of GROQ_MODELS) {
      try {
        const response = await fetch(GROQ_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: conversation,
            tools: AI_TOOLS_SCHEMA,
            tool_choice: "auto",
            temperature: 0.1,
            max_tokens: 1024,
          }),
        });

        if (response.ok) {
          data = await response.json();
          break;
        } else {
          const errBody = await response.text();
          console.warn(`[Groq Agent] Model ${model} returned error ${response.status}:`, errBody);
          lastError = new Error(`Groq error (${response.status}): ${errBody}`);
        }
      } catch (err: any) {
        lastError = err;
      }
    }

    if (!data) {
      console.warn("[Groq Agent] Semua model Groq terkena Rate Limit. Mengalihkan ke Fallback Engine: Google Gemini Flash...");
      return await callGeminiFallback(userMessageText, contextTeamId);
    }
    const choice = data.choices?.[0];
    const assistantMsg = choice?.message;

    if (!assistantMsg) {
      throw new Error("Groq tidak mengembalikan respon pesan yang valid.");
    }

    // Jika Groq meminta pemanggilan tool (Function Calling)
    if (assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0) {
      // Simpan assistant message dengan tool_calls ke memory
      const toolCallMsg: ChatMessage = {
        role: "assistant",
        content: assistantMsg.content || null,
        tool_calls: assistantMsg.tool_calls,
      };
      conversation.push(toolCallMsg);
      addMessageToSession(sessionKey, toolCallMsg);

      // Eksekusi setiap tool call
      for (const call of assistantMsg.tool_calls) {
        const toolName = call.function.name;
        let args = {};
        try {
          args = JSON.parse(call.function.arguments || "{}");
        } catch (e) {
          console.warn("[Groq Agent] Gagal parse argument tool:", call.function.arguments);
        }

        console.log(`[Groq Agent] Mengeksekusi tool: ${toolName}`, args);
        toolsExecuted.push(toolName);

        const toolResultString = await executeToolCall(
          toolName,
          args,
          sessionKey,
          contextTeamId
        );

        // Tambahkan hasil tool ke conversation
        const toolResponseMsg: ChatMessage = {
          role: "tool",
          name: toolName,
          tool_call_id: call.id,
          content: toolResultString,
        };
        conversation.push(toolResponseMsg);
        addMessageToSession(sessionKey, toolResponseMsg);
      }

      // Lanjutkan loop untuk meminta Groq merangkum hasil tool menjadi balasan teks
      continue;
    }

    // Jika Groq selesai menghasilkan balasan teks akhir
    const finalReply = assistantMsg.content || "Permintaan telah diproses.";
    const finalAssistantMsg: ChatMessage = {
      role: "assistant",
      content: finalReply,
    };
    addMessageToSession(sessionKey, finalAssistantMsg);

    return {
      replyText: finalReply,
      toolCallsExecuted: toolsExecuted,
    };
  }

  return {
    replyText: "Maaf, proses membutuhkan waktu lebih lama dari biasanya. Silakan coba kembali.",
    toolCallsExecuted: toolsExecuted,
  };
}
