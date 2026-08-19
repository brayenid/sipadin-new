/**
 * Unified Multi-Engine AI Agent (SIPADIN Co-Pilot)
 * Engine 1: Groq Cloud (Multi-Key, Llama 3.3 70B & Llama 3.1 8B)
 * Engine 2: China AI (DeepSeek V3, SiliconCloud, Alibaba Qwen)
 * Engine 3: Google Gemini Flash Native (1.5 Flash / 2.0 Flash)
 */

import { getSystemPrompt } from "./prompts";
import { AI_TOOLS_SCHEMA, executeToolCall } from "./tools";
import { getSession, addMessageToSession, ChatMessage } from "./session-store";

// ==========================================
// 1. GROQ ENGINE (UTAMA - STABIL & KILAT)
// ==========================================
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
];

// ==========================================
// 2. CHINA AI ENGINES CONFIGURATION
// ==========================================
interface ChinaAIConfig {
  name: string;
  apiUrl: string;
  apiKey: string;
  models: string[];
  providerCode: string;
}

function getAvailableChinaAIEngines(): ChinaAIConfig[] {
  const configs: ChinaAIConfig[] = [];

  // DeepSeek Official
  const deepseekKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (deepseekKey) {
    configs.push({
      name: "DeepSeek Official",
      apiUrl: "https://api.deepseek.com/v1/chat/completions",
      apiKey: deepseekKey,
      models: ["deepseek-chat"],
      providerCode: "ds",
    });
  }

  // SiliconCloud (SiliconFlow - China)
  const siliconKey = process.env.SILICONFLOW_API_KEY?.trim() || process.env.SILICONCLOUD_API_KEY?.trim();
  if (siliconKey) {
    configs.push({
      name: "SiliconCloud China",
      apiUrl: "https://api.siliconflow.cn/v1/chat/completions",
      apiKey: siliconKey,
      models: ["deepseek-ai/DeepSeek-V3", "Qwen/Qwen2.5-72B-Instruct", "Qwen/Qwen2.5-32B-Instruct"],
      providerCode: "sf",
    });
  }

  // Alibaba DashScope (Qwen Official)
  const dashscopeKey = process.env.DASHSCOPE_API_KEY?.trim() || process.env.QWEN_API_KEY?.trim();
  if (dashscopeKey) {
    configs.push({
      name: "Alibaba Qwen",
      apiUrl: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions",
      apiKey: dashscopeKey,
      models: ["qwen-plus", "qwen-max", "qwen-turbo"],
      providerCode: "qw",
    });
  }

  return configs;
}

export interface AgentProcessResult {
  replyText: string;
  toolCallsExecuted: string[];
}

/**
 * Eksekusi LLM via Endpoint OpenAI-Compatible (Groq / DeepSeek / SiliconFlow / Qwen)
 */
async function runOpenAICompatibleEngine(
  apiUrl: string,
  apiKey: string,
  models: string[],
  conversation: ChatMessage[],
  sessionKey: string,
  contextTeamId?: string,
  providerCode: string = "gr"
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

    // Balasan Teks Akhir
    let rawReply = assistantMsg.content || "Permintaan berhasil diproses.";
    rawReply = rawReply.replace(/<(pad|paa|unk|eos|bos)[^>]*>/gi, "").trim();
    if (!rawReply) rawReply = "Permintaan berhasil diproses.";

    addMessageToSession(sessionKey, { role: "assistant", content: rawReply });

    const finalReplyWithSign = `${rawReply}\n\n_${providerCode}_`;

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
 * Fallback Engine: Google Gemini Native
 */
async function callGeminiNativeFallback(
  prompt: string,
  contextTeamId?: string,
  senderNumber?: string
): Promise<AgentProcessResult> {
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  if (!geminiKey) throw new Error("GEMINI_API_KEY not found");

  const lower = prompt.toLowerCase();
  let directDataText = "";
  const toolsExecuted: string[] = [];

  if (lower.includes("hapus") && (lower.includes("agenda") || lower.includes("kegiatan") || lower.includes("obor") || lower.includes("rapat"))) {
    const { executeToolCall } = await import("./tools");
    const query = prompt.replace(/hapus|agenda|kegiatan|yang|tolong/gi, "").trim();
    directDataText = await executeToolCall("delete_agenda_tim", { searchQuery: query || prompt }, "gemini_fallback", contextTeamId);
    toolsExecuted.push("delete_agenda_tim");
  } else if ((lower.includes("ubah") || lower.includes("edit") || lower.includes("ganti") || lower.includes("geser")) && (lower.includes("agenda") || lower.includes("kegiatan") || lower.includes("jam") || lower.includes("jadwal") || lower.includes("lokasi"))) {
    const { executeToolCall } = await import("./tools");
    const query = prompt.replace(/ubah|edit|ganti|geser|agenda|kegiatan|jam|jadwal|lokasi|jadi|ke|yang|tolong/gi, "").trim();
    directDataText = await executeToolCall("list_agenda_tim", { searchQuery: query || undefined, limit: "5" }, "gemini_fallback", contextTeamId);
    toolsExecuted.push("list_agenda_tim");
  } else if (lower.includes("agenda")) {
    const { executeToolCall } = await import("./tools");
    directDataText = await executeToolCall("list_agenda_tim", { limit: "10" }, "gemini_fallback", contextTeamId);
    toolsExecuted.push("list_agenda_tim");
  } else if (lower.includes("absensi")) {
    const { executeToolCall } = await import("./tools");
    directDataText = await executeToolCall("list_agenda_absensi", { limit: "10" }, "gemini_fallback", contextTeamId);
    toolsExecuted.push("list_agenda_absensi");
  } else if (lower.includes("belum bayar") || lower.includes("belum dibayar") || lower.includes("unpaid")) {
    const { executeToolCall } = await import("./tools");
    directDataText = await executeToolCall("get_unpaid_spjs", { limit: "10" }, "gemini_fallback", contextTeamId);
    toolsExecuted.push("get_unpaid_spjs");
  } else if (lower.includes("nip")) {
    const { executeToolCall } = await import("./tools");
    const nameMatch = prompt.replace(/nip/gi, "").trim();
    directDataText = await executeToolCall("lookup_nip_direct", { nama: nameMatch }, "gemini_fallback", contextTeamId);
    toolsExecuted.push("lookup_nip_direct");
  }

  // Model Gemini yang stabil
  const geminiModels = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-pro"];
  let geminiResponse: Response | null = null;
  let lastGeminiErr: any = null;

  for (const modelName of geminiModels) {
    try {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiKey}`;
      const response = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `${getSystemPrompt(undefined, senderNumber)}\n\nDATA DARI DATABASE:\n${directDataText}\n\nPERTANYAAN USER: "${prompt}"\n\nJawab dengan gaya Sipadin (santai, singkat, to the point, format WhatsApp):`,
                },
              ],
            },
          ],
        }),
      });

      if (response.ok) {
        geminiResponse = response;
        break;
      } else {
        const err = await response.text();
        lastGeminiErr = new Error(`Gemini ${modelName} (${response.status}): ${err}`);
      }
    } catch (err: any) {
      lastGeminiErr = err;
    }
  }

  if (!geminiResponse) {
    throw lastGeminiErr || new Error("Semua model Gemini gagal merespon.");
  }

  const resJson = await geminiResponse.json();
  const rawReply = resJson.candidates?.[0]?.content?.parts?.[0]?.text || "Aman, tapi datanya lagi kosong nih bro.";
  const finalReply = `${rawReply.trim()}\n\n_ge_`;

  return {
    replyText: finalReply,
    toolCallsExecuted: toolsExecuted,
  };
}

/**
 * Dispatcher Utama: Groq Cloud -> China AI (DeepSeek/SiliconFlow/Qwen) -> Google Gemini Native
 */
export async function processUserMessageWithGroq(
  sessionKey: string,
  userMessageText: string,
  contextTeamId?: string,
  senderNumber?: string
): Promise<AgentProcessResult> {
  const session = getSession(sessionKey);
  const userMsg: ChatMessage = { role: "user", content: userMessageText };
  addMessageToSession(sessionKey, userMsg);

  const recentMessages = session.messages.slice(-4).filter((m) => m.content !== null || (m.tool_calls && m.tool_calls.length > 0));
  const conversation: ChatMessage[] = [
    { role: "system", content: getSystemPrompt(undefined, senderNumber) },
    ...recentMessages,
  ];

  // 1. TAHAP 1: Coba Engine Utama Groq Cloud (Mendukung Multiple Keys: "key1,key2")
  const rawGroqKey = process.env.GROQ_API_KEY?.trim() || "";
  const groqKeys = rawGroqKey
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  for (let i = 0; i < groqKeys.length; i++) {
    const groqKey = groqKeys[i];
    console.log(`[AI Dispatcher] Mencoba Groq Key [${i + 1}/${groqKeys.length}] (...${groqKey.slice(-6)})...`);

    const groqRes = await runOpenAICompatibleEngine(
      GROQ_API_URL,
      groqKey,
      GROQ_MODELS,
      conversation,
      sessionKey,
      contextTeamId,
      "gr"
    );

    if (groqRes.success && groqRes.result) {
      return groqRes.result;
    }
    console.warn(`[AI Dispatcher] Groq Key (...${groqKey.slice(-6)}) limit (429) / gagal.`);
  }

  // 2. TAHAP 2: Coba China AI Engine (DeepSeek / SiliconCloud / Qwen) jika terpasang di .env
  const chinaEngines = getAvailableChinaAIEngines();
  for (const engine of chinaEngines) {
    console.log(`[AI Dispatcher] Mencoba China AI: ${engine.name}...`);
    const chinaRes = await runOpenAICompatibleEngine(
      engine.apiUrl,
      engine.apiKey,
      engine.models,
      conversation,
      sessionKey,
      contextTeamId,
      engine.providerCode
    );

    if (chinaRes.success && chinaRes.result) {
      return chinaRes.result;
    }
    console.warn(`[AI Dispatcher] ${engine.name} gagal/limit.`);
  }

  // 3. TAHAP 3: Fallback Google Gemini Flash Native
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  if (geminiKey) {
    try {
      console.log("[AI Dispatcher] Menggunakan Fallback: Google Gemini Flash Native...");
      const geminiRes = await callGeminiNativeFallback(userMessageText, contextTeamId, senderNumber);
      return geminiRes;
    } catch (geminiErr: any) {
      console.warn("[AI Dispatcher] Gemini Flash gagal:", geminiErr?.message);
    }
  }

  return {
    replyText: "Maaf, seluruh server AI sedang mengalami antrean padat. Mohon kirim ulang dalam beberapa saat ya.\n\n_system_",
    toolCallsExecuted: [],
  };
}
