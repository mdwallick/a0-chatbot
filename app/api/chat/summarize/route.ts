import { Message } from "ai"
import { NextResponse } from "next/server"
import OpenAI from "openai"

const openai = new OpenAI()

export async function POST(request: Request) {
  try {
    const { messages }: { messages: Message[] } = await request.json()

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that creates very concise summaries (maximum 5 words) that capture the essence of a conversation. Focus on the main topic or action being discussed.",
        },
        {
          role: "user",
          content: `Create a concise summary (max 5 words) for this conversation:\n\n${messages.map(m => m.content).join("\n")}`,
        },
      ],
    })

    const summary = completion.choices[0]?.message?.content || "New conversation"
    return NextResponse.json({ summary })
  } catch (error) {
    console.error("Error generating summary:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
