// Local AI adapter — talks to Ollama's OpenAI-compatible endpoint via the
// AI SDK. Everything stays on-machine; if Ollama isn't running, callers
// catch the error and use the node's fallback text.
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText } from "ai";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "llama3.2";
const AI_TIMEOUT_MS = 15_000; // fail fast so the fallback reply feels instant

const ollama = createOpenAICompatible({
  name: "ollama",
  baseURL: OLLAMA_BASE_URL,
  apiKey: "ollama", // Ollama ignores the key but the client requires one
});

export async function generateAiReply(
  systemPrompt: string,
  userMessage: string,
): Promise<string> {
  const { text } = await generateText({
    model: ollama(OLLAMA_MODEL),
    instructions: systemPrompt,
    prompt: userMessage,
    abortSignal: AbortSignal.timeout(AI_TIMEOUT_MS),
  });
  return text.trim();
}
