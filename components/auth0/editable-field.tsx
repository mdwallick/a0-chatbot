"use client"

import { useState, useCallback } from "react"
import { Pencil, Check, X, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"

type EditableFieldProps = {
  label: string
  value: string | undefined
  onSave: (value: string) => Promise<void>
  editable?: boolean
  hint?: string
  type?: string
  placeholder?: string
}

export default function EditableField({
  label,
  value,
  onSave,
  editable = true,
  hint,
  type = "text",
  placeholder,
}: EditableFieldProps) {
  const { toast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value || "")
  const [isSaving, setIsSaving] = useState(false)

  const handleEdit = useCallback(() => {
    setEditValue(value || "")
    setIsEditing(true)
  }, [value])

  const handleCancel = useCallback(() => {
    setEditValue(value || "")
    setIsEditing(false)
  }, [value])

  const handleSave = useCallback(async () => {
    if (editValue === value) {
      setIsEditing(false)
      return
    }

    setIsSaving(true)
    try {
      await onSave(editValue)
      setIsEditing(false)
      toast({
        title: "Success",
        description: `${label} updated successfully.`,
      })
    } catch (error) {
      console.error("Failed to save:", error)
      toast({
        title: "Error",
        description: `Failed to update ${label.toLowerCase()}. Please try again.`,
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }, [editValue, value, onSave, label, toast])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        handleSave()
      } else if (e.key === "Escape") {
        handleCancel()
      }
    },
    [handleSave, handleCancel]
  )

  return (
    <div className="grid items-center gap-2">
      <Label htmlFor={label.toLowerCase()}>{label}</Label>
      {isEditing ? (
        <div className="flex items-center gap-2">
          <Input
            type={type}
            id={label.toLowerCase()}
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isSaving}
            autoFocus
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSave}
            disabled={isSaving}
            className="h-9 w-9 shrink-0"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCancel}
            disabled={isSaving}
            className="h-9 w-9 shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Input
            type={type}
            id={label.toLowerCase()}
            value={value || ""}
            placeholder={placeholder}
            disabled
            className="flex-1"
          />
          {editable ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleEdit}
              className="h-9 w-9 shrink-0 hover:bg-accent"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          ) : hint ? (
            <span className="text-xs text-muted-foreground whitespace-nowrap">{hint}</span>
          ) : null}
        </div>
      )}
    </div>
  )
}
