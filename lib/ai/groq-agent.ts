/**
 * Groq AI Agent Engine (SIPADIN Co-Pilot)
 * Menjalankan LLM Llama 3.3 70B dengan Recursive Tool Calling & Session Memory.
 */

import { SYSTEM_PROMPT_SIPADIN_AGENT } from "./prompts";
import { AI_TOOLS_SCHEMA, executeToolCall } from "./tools";
import { getSession, addMessageToSession, ChatMessage } from "./session-store";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODELS = ["llama-3.1-8b-instant", "llama-3.3-70b-versatile"];

export interface AgentProcessResult {
  replyText: string;
  toolCallsExecuted: string[];
}

/**
 * Proses pesan WhatsApp user melalui Groq AI Agent
 */
export async function processUserMessageWithGroq(
  sessionKey: string,
  userMessageText: string,
  contextTeamId?: string
): Promise<AgentProcessResult> {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GROQ_API_KEY belum dikonfigurasi di environment server (.env).");
  }

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

  // Susun payload pesan lengkap (System Prompt + Riwayat Chat)
  let conversation: ChatMessage[] = [
    {
      role: "system",
      content: SYSTEM_PROMPT_SIPADIN_AGENT,
    },
    ...session.messages,
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
      throw lastError || new Error("Semua model Groq gagal memproses permintaan.");
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
