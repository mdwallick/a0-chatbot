"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Download, Trash2, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/components/ui/use-toast"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

import { deleteAccount, exportUserData } from "@/actions/account-actions"

export default function AccountSettings() {
  const { toast } = useToast()
  const router = useRouter()
  const [isExporting, setIsExporting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleExport = useCallback(async () => {
    setIsExporting(true)
    try {
      const data = await exportUserData()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `account-data-${new Date().toISOString().split("T")[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: "Export complete",
        description: "Your data has been downloaded.",
      })
    } catch (error) {
      console.error("Export failed:", error)
      toast({
        title: "Export failed",
        description: "There was a problem exporting your data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }, [toast])

  const handleDelete = useCallback(async () => {
    if (deleteConfirmation !== "DELETE") {
      return
    }

    setIsDeleting(true)
    try {
      await deleteAccount()

      toast({
        title: "Account deleted",
        description: "Your account and all associated data have been permanently deleted.",
      })

      // Redirect to logout to clear the session
      router.push("/auth/logout")
    } catch (error) {
      console.error("Delete failed:", error)
      toast({
        title: "Delete failed",
        description: "There was a problem deleting your account. Please try again.",
        variant: "destructive",
      })
      setIsDeleting(false)
    }
  }, [deleteConfirmation, toast, router])

  const handleDialogOpenChange = useCallback((open: boolean) => {
    setIsDialogOpen(open)
    if (!open) {
      setDeleteConfirmation("")
    }
  }, [])

  return (
    <Card className="shadow-none">
      <CardHeader className="p-4 md:p-6 mb-3 md:pt-0 md:pb-0">
        <CardTitle className="text-lg sm:text-md font-bold tracking-tight">
          Account Management
        </CardTitle>
        <CardDescription className="text-sm font-light">
          Export your data or delete your account.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-4 pt-0 md:p-6 md:pt-0 md:pb-0 space-y-6">
        {/* Export Section */}
        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-medium">Export Your Data</h4>
            <p className="text-sm text-muted-foreground">
              Download all your data including profile information, chat history, and granted
              permissions as a JSON file.
            </p>
          </div>
          <Button variant="outline" onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Download Data
              </>
            )}
          </Button>
        </div>

        <Separator />

        {/* Danger Zone */}
        <div className="rounded-lg border border-destructive/50 p-4 space-y-3">
          <div>
            <h4 className="text-sm font-medium text-destructive">Danger Zone</h4>
            <p className="text-sm text-muted-foreground">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
          </div>

          <AlertDialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="h-4 w-4" />
                Delete Account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your account and remove
                  all associated data including:
                </AlertDialogDescription>
              </AlertDialogHeader>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>Your profile information</li>
                <li>All chat conversations and messages</li>
                <li>Connected account permissions</li>
                <li>Usage history</li>
              </ul>
              <div className="space-y-2 pt-2">
                <Label htmlFor="delete-confirm" className="text-sm font-medium">
                  Type <span className="font-mono font-bold">DELETE</span> to confirm
                </Label>
                <Input
                  id="delete-confirm"
                  value={deleteConfirmation}
                  onChange={e => setDeleteConfirmation(e.target.value)}
                  placeholder="DELETE"
                  disabled={isDeleting}
                />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteConfirmation !== "DELETE" || isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    "Delete Account"
                  )}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  )
}
