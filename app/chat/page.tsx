import { Sparkles } from "lucide-react"
import Chat from "@/components/chat"

export default function ChatPage() {
  return (
    <div className="flex flex-col h-full bg-background">
      {/* Main content area */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-4xl mx-auto w-full">
        {/* Copilot greeting */}
        <div className="text-center mb-8 space-y-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-semibold text-foreground mb-2">
            Hey, what&apos;s on your mind today?
          </h1>
        </div>

        {/* Chat component */}
        <div className="w-full max-w-3xl">
          <Chat id="new" />

          {/* Suggested actions */}
          <div className="mt-6 flex flex-wrap gap-2 justify-center">
            <button className="px-4 py-2 text-sm bg-card hover:bg-accent border border-border rounded-full transition-colors">
              Create an image
            </button>
            <button className="px-4 py-2 text-sm bg-card hover:bg-accent border border-border rounded-full transition-colors">
              Write an analysis
            </button>
            <button className="px-4 py-2 text-sm bg-card hover:bg-accent border border-border rounded-full transition-colors">
              Pitch a brand collab
            </button>
            <button className="px-4 py-2 text-sm bg-card hover:bg-accent border border-border rounded-full transition-colors">
              Learn something new
            </button>
          </div>
        </div>

        {/* Footer disclaimer */}
        <div className="mt-12 text-center">
          <p className="text-xs text-muted-foreground max-w-2xl mx-auto">
            Copilot may make mistakes. Using Copilot means you agree to the{" "}
            <a href="/tos" className="text-primary hover:underline">
              Terms of Use
            </a>
            . See our{" "}
            <a href="/privacy" className="text-primary hover:underline">
              Privacy Statement
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  )
}
