import type { Metadata, Viewport } from "next"
import "./globals.css"

import { Geist, Geist_Mono } from "next/font/google"

import { GooglePickerLoader } from "@/components/google-picker-loader"
import Header from "@/components/header"
import { LinkedAccountsProvider } from "@/components/use-linked-accounts-context"
import { auth0 } from "@/lib/auth0"
import { getLinkedAccounts } from "@/lib/auth0-mgmt"
import { Auth0Provider } from "@auth0/nextjs-auth0"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Auth0 IA | Demo",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1.0,
  maximumScale: 1.0,
  userScalable: false,
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await auth0.getSession()
  let linkedAccounts: any[] = []

  if (session) {
    linkedAccounts = await getLinkedAccounts(session!.user!.sub!)
  }

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <GooglePickerLoader />
        <Auth0Provider user={session?.user}>
          <div className="flex flex-col h-full w-full">
            <Header />
            <main
              className="flex flex-row flex-1 w-full mx-auto border-t border-gray-100"
              style={{ maxHeight: "calc(100vh - 56px)" }}
            >
              <LinkedAccountsProvider value={linkedAccounts}>{children}</LinkedAccountsProvider>
            </main>
          </div>
        </Auth0Provider>
      </body>
    </html>
  )
}
