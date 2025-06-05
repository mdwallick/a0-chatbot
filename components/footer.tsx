import Link from "next/link"

export default function Footer() {
  return (
    <footer className="w-full py-8 text-center">
      <div className="container mx-auto px-4">
        <div className="text-sm text-muted-foreground text-center max-w-2xl mx-auto">
          This demonstration may make mistakes. Using it means you agree to the{" "}
          <Link href="/tos" className="hover:underline">
            Terms of Use
          </Link>
          . See our{" "}
          <Link href="/privacy" className="hover:underline">
            Privacy Statement
          </Link>
          .
        </div>
        <p className="mt-6 text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Auth0 by Okta. All Rights Reserved.
        </p>
      </div>
    </footer>
  )
}
