import Link from "next/link"

export default function Footer() {
  return (
    <footer className="w-full py-8 text-center">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-center items-center space-y-2 md:space-y-0 md:space-x-6 text-sm text-muted-foreground">
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
