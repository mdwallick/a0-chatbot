import { openaiClient } from "@/lib/openai-chat"

export async function summarizeThread(messages: { role: string; content: string }[]) {
  const systemPrompt = `You are summarizing a conversation. Summarize the following messages into a short, descriptive title (3-8 words). The title should reflect the main topic or intent.`
  const conversation = messages.map(m => `${m.role}: ${m.content}`).join("\n")

  const result = await openaiClient.chat.completions.create({
    model: process.env.OPENAI_MODEL || "claude-4-5-sonnet",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: conversation },
    ],
    max_tokens: 20,
    temperature: 0.7,
  })

  return result.choices[0]?.message?.content?.trim() || "New Conversation"
}
