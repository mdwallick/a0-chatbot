import Link from "next/link"

export default function Footer() {
  return (
    <footer className="w-full border-t border-gray-200 dark:border-gray-800 py-8 text-center">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-center items-center space-y-2 md:space-y-0 md:space-x-6 text-sm text-muted-foreground">
          <Link href="/privacy" className="hover:text-foreground hover:underline">
            Privacy Policy
          </Link>
          <Link href="/tos" className="hover:text-foreground hover:underline">
            Terms of Service
          </Link>
        </div>
        <p className="mt-6 text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Okta. All Rights Reserved.
        </p>
      </div>
    </footer>
  )
}
