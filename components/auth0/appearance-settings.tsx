import ThemeToggle from "../theme-toggle"

export default function AppearanceSettings() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Theme</h3>
      <p className="text-muted-foreground">Choose between light or dark mode for the interface.</p>
      <ThemeToggle />
    </div>
  )
}
