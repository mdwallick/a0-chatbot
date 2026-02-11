import { generateText } from "ai"
import { openai } from "@/lib/openai"

export async function summarizeThread(messages: { role: string; content: string }[]) {
  const systemPrompt = `You are summarizing a conversation. Summarize the following messages into a short, descriptive title (3-8 words). The title should reflect the main topic or intent.`
  const conversation = messages.map(m => `${m.role}: ${m.content}`).join("\n")

  const result = await generateText({
    model: openai(process.env.OPENAI_MODEL || "gpt-4o-mini"),
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: conversation },
    ],
    maxOutputTokens: 20,
    temperature: 0.7,
  })

  return result.text.trim() || "New Conversation"
}
