import type { Metadata, Viewport } from "next"
import { ThemeProvider } from "next-themes"
import "./globals.css"

import { Geist, Geist_Mono } from "next/font/google"

import { Auth0Provider } from "@auth0/nextjs-auth0"

import { ChatSidebar } from "@/components/chat-sidebar"
import { MobileChatSidebarDrawer } from "@/components/mobile-sidebar-drawer"
import { SidebarProvider } from "@/components/sidebar-context"
import { GooglePickerLoader } from "@/components/google-picker-loader"
import Header from "@/components/header"
import { LinkedAccountsProvider } from "@/components/use-linked-accounts-context"
import { auth0 } from "@/lib/auth0"
import { getLinkedAccounts } from "@/lib/auth0-mgmt"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Auth0 AI | Demo",
}

export const viewport: Viewport = {
  width: "device-width",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await auth0.getSession()
  let linkedAccounts: any[] = []

  if (session?.user?.sub) {
    linkedAccounts = await getLinkedAccounts(session.user.sub)
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider attribute="class" enableSystem={true} defaultTheme="system">
          <GooglePickerLoader />
          <Auth0Provider user={session?.user}>
            <SidebarProvider>
              <div className="flex flex-col min-h-screen w-full">
                {" "}
                <Header />
                <main className="flex flex-col md:flex-row flex-1 w-full mx-auto">
                  <div className="hidden md:flex flex-shrink-0">
                    {" "}
                    <ChatSidebar />
                  </div>
                  <MobileChatSidebarDrawer />

                  <div className="flex-1 min-w-0 overflow-y-auto">
                    {" "}
                    <LinkedAccountsProvider value={linkedAccounts}>
                      {children}
                    </LinkedAccountsProvider>
                  </div>
                </main>
              </div>
            </SidebarProvider>
          </Auth0Provider>
        </ThemeProvider>
      </body>
    </html>
  )
}
