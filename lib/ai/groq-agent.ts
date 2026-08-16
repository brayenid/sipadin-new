/**
 * Unified Multi-Engine AI Agent (SIPADIN Co-Pilot)
 * Engine Utama: OpenRouter (Free Models: Llama 3.3 70B, DeepSeek V3, Gemini 2.0 Flash)
 * Fallback 1: Groq Cloud (Llama 3.1 8B, Gemma2 9B)
 * Fallback 2: Google Gemini 1.5 Flash Native
 */

import { SYSTEM_PROMPT_SIPADIN_AGENT } from "./prompts";
import { AI_TOOLS_SCHEMA, executeToolCall } from "./tools";
import { getSession, addMessageToSession, ChatMessage } from "./session-store";

// ==========================================
// 1. GROQ ENGINE (UTAMA - STABIL & CEPAT)
// ==========================================
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODELS = [
  "llama-3.1-8b-instant",
  "llama-3.3-70b-versatile",
];

// ==========================================
// 2. OPENROUTER ENGINE (FALLBACK 1)
// ==========================================
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_FREE_MODELS = [
  "openai/gpt-oss-20b:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "nvidia/nemotron-3-nano-30b-a3b:free",
];

export interface AgentProcessResult {
  replyText: string;
  toolCallsExecuted: string[];
}

/**
 * Eksekusi LLM via Endpoint OpenAI-Compatible (OpenRouter atau Groq) dengan Recursive Function Calling
 */
async function runOpenAICompatibleEngine(
  apiUrl: string,
  apiKey: string,
  models: string[],
  conversation: ChatMessage[],
  sessionKey: string,
  contextTeamId?: string,
  extraHeaders: Record<string, string> = {}
): Promise<{ success: boolean; result?: AgentProcessResult; error?: any }> {
  const toolsExecuted: string[] = [];
  let maxToolLoops = 4;
  let currentConversation = [...conversation];
  let usedModelName = "";

  while (maxToolLoops > 0) {
    maxToolLoops--;
    let data: any = null;
    let lastErr: any = null;

    for (const model of models) {
      try {
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            ...extraHeaders,
          },
          body: JSON.stringify({
            model,
            messages: currentConversation,
            tools: AI_TOOLS_SCHEMA,
            tool_choice: "auto",
            temperature: 0.1,
            max_tokens: 1024,
          }),
        });

        if (response.ok) {
          data = await response.json();
          usedModelName = model;
          break;
        } else {
          const errText = await response.text();
          console.warn(`[AI Engine ${apiUrl}] Model ${model} error (${response.status}):`, errText);
          lastErr = new Error(`Error ${response.status}: ${errText}`);
        }
      } catch (err: any) {
        lastErr = err;
      }
    }

    if (!data) {
      return { success: false, error: lastErr };
    }

    const choice = data.choices?.[0];
    const assistantMsg = choice?.message;
    if (!assistantMsg) {
      return { success: false, error: new Error("Empty message response") };
    }

    // Jika LLM meminta pemanggilan tool (Function Calling)
    if (assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0) {
      const toolCallMsg: ChatMessage = {
        role: "assistant",
        content: assistantMsg.content || null,
        tool_calls: assistantMsg.tool_calls,
      };
      currentConversation.push(toolCallMsg);
      addMessageToSession(sessionKey, toolCallMsg);

      for (const call of assistantMsg.tool_calls) {
        const toolName = call.function.name;
        let args = {};
        try {
          args = JSON.parse(call.function.arguments || "{}");
        } catch {
          args = {};
        }

        console.log(`[AI Tool Executing]: ${toolName}`, args);
        toolsExecuted.push(toolName);

        const toolResultString = await executeToolCall(
          toolName,
          args,
          sessionKey,
          contextTeamId
        );

        const toolResponseMsg: ChatMessage = {
          role: "tool",
          name: toolName,
          tool_call_id: call.id,
          content: toolResultString,
        };
        currentConversation.push(toolResponseMsg);
        addMessageToSession(sessionKey, toolResponseMsg);
      }
      continue;
    }

    // Balasan Teks Akhir + Sign Model Khusus: "Source: *****"
    let rawReply = assistantMsg.content || "Permintaan berhasil diproses.";
    // Bersihkan glitch token khusus seperti <pad>, <paa>, <unk>
    rawReply = rawReply.replace(/<(pad|paa|unk|eos|bos)[^>]*>/gi, "").trim();
    if (!rawReply) rawReply = "Permintaan berhasil diproses.";

    addMessageToSession(sessionKey, { role: "assistant", content: rawReply });

    const cleanModelName = usedModelName.split("/").pop()?.replace(":free", "") || usedModelName;
    const providerName = apiUrl.includes("openrouter") ? "OpenRouter" : "Groq";
    const finalReplyWithSign = `${rawReply}\n\n_Source: ${providerName} (${cleanModelName})_`;

    return {
      success: true,
      result: {
        replyText: finalReplyWithSign,
        toolCallsExecuted: toolsExecuted,
      },
    };
  }

  return { success: false, error: new Error("Max tool loops reached") };
}

/**
 * Fallback Engine 2: Google Gemini Native
 */
async function callGeminiNativeFallback(
  prompt: string,
  contextTeamId?: string
): Promise<AgentProcessResult> {
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  if (!geminiKey) throw new Error("GEMINI_API_KEY not found");

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

  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
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
  const rawReply = resJson.candidates?.[0]?.content?.parts?.[0]?.text || "Aman, tapi datanya lagi kosong nih bro.";
  const finalReply = `${rawReply.trim()}\n\n_Source: Google Gemini (gemini-2.5-flash)_`;

  return {
    replyText: finalReply,
    toolCallsExecuted: toolsExecuted,
  };
}

/**
 * Dispatcher Utama: OpenRouter (Utama) -> Groq (Fallback 1) -> Gemini (Fallback 2)
 */
export async function processUserMessageWithGroq(
  sessionKey: string,
  userMessageText: string,
  contextTeamId?: string
): Promise<AgentProcessResult> {
  const session = getSession(sessionKey);
  const userMsg: ChatMessage = { role: "user", content: userMessageText };
  addMessageToSession(sessionKey, userMsg);

  const recentMessages = session.messages.slice(-4).filter((m) => m.content !== null || (m.tool_calls && m.tool_calls.length > 0));
  const conversation: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT_SIPADIN_AGENT },
    ...recentMessages,
  ];

  // 1. TAHAP 1: Coba Engine Utama Groq Cloud (Prioritas Utama)
  const groqKey = process.env.GROQ_API_KEY?.trim();
  if (groqKey) {
    console.log("[AI Dispatcher] Menggunakan Engine Utama: Groq Cloud...");
    const groqRes = await runOpenAICompatibleEngine(
      GROQ_API_URL,
      groqKey,
      GROQ_MODELS,
      conversation,
      sessionKey,
      contextTeamId
    );

    if (groqRes.success && groqRes.result) {
      return groqRes.result;
    }
    console.warn("[AI Dispatcher] Groq gagal/limit, beralih ke Fallback 1: OpenRouter...");
  }

  // 2. TAHAP 2: Fallback 1 OpenRouter (Free Models)
  const openRouterKey = process.env.OPENROUTER_API_KEY?.trim();
  if (openRouterKey) {
    console.log("[AI Dispatcher] Menggunakan Fallback 1: OpenRouter...");
    const orRes = await runOpenAICompatibleEngine(
      OPENROUTER_API_URL,
      openRouterKey,
      OPENROUTER_FREE_MODELS,
      conversation,
      sessionKey,
      contextTeamId,
      {
        "HTTP-Referer": "https://sipadin.id",
        "X-Title": "SIPADIN AI Assistant",
      }
    );

    if (orRes.success && orRes.result) {
      return orRes.result;
    }
    console.warn("[AI Dispatcher] OpenRouter gagal/limit, beralih ke Fallback 2: Direct Fallback...");
  }

  // 3. TAHAP 3: Fallback 2 Direct Assistant Handler
  console.log("[AI Dispatcher] Menggunakan Direct Fallback Response...");
  return await callGeminiNativeFallback(userMessageText, contextTeamId);
}
