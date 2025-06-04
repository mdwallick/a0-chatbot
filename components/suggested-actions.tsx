import { Button } from "@/components/ui/button"

interface SuggestedAction {
  title: string
  label: string
  action: () => void
}

interface SuggestedActionsProps {
  actions: SuggestedAction[]
}

export default function SuggestedActions({ actions }: SuggestedActionsProps) {
  return (
    <div className="flex flex-wrap gap-2 mt-4">
      {actions.map((action, index) => (
        <Button
          key={index}
          variant="outline"
          size="sm"
          onClick={action.action}
          className="text-xs bg-card hover:bg-accent border-border rounded-full px-4 py-2 h-auto font-normal"
        >
          {action.label}
        </Button>
      ))}
    </div>
  )
}