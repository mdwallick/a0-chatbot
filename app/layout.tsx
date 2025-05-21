import type { Metadata, Viewport } from "next"
import "./globals.css"

import { Geist, Geist_Mono } from "next/font/google"

import { ChatSidebar } from "@/components/chat-sidebar"
import { MobileChatSidebarDrawer } from "@/components/mobile-sidebar-drawer"
import { SidebarProvider } from "@/components/sidebar-context"
import { GooglePickerLoader } from "@/components/google-picker-loader"
import Header from "@/components/header"
import { LinkedAccountsProvider } from "@/components/use-linked-accounts-context"
import { auth0 } from "@/lib/auth0"
import { getLinkedAccounts } from "@/lib/auth0-mgmt"
import { Auth0Provider } from "@auth0/nextjs-auth0"
import { ThemeProvider } from "@/components/theme-provider"

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

// Suggestion 1: Review Viewport settings for accessibility
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1.0,
  // maximumScale: 1.0, // Consider removing or adjusting these for accessibility
  // userScalable: false, // Users might need to zoom; true is generally better.
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
    <html lang="en">
      <head>
        {/* Next.js's `viewport` export above should handle this. You can likely remove this manual tag. */}
        {/* <meta name="viewport" content="width=device-width, initial-scale=1.0" /> */}
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          <GooglePickerLoader />
          <Auth0Provider user={session?.user}>
            <SidebarProvider>
              {/* Suggestion 2: Overall structure for full height. `min-h-screen` is often preferred over `h-full` on the immediate body wrapper for true full viewport height. */}
              <div className="flex flex-col min-h-screen w-full">
                {" "}
                {/* Changed h-full to min-h-screen */}
                <Header /> {/* Assuming Header has a fixed or defined height, e.g., h-14 (56px) */}
                <main
                  // Suggestion 3: Main layout responsiveness
                  className="flex flex-col md:flex-row flex-1 w-full mx-auto" // Mobile: column, Medium screens & up: row
                  // Suggestion 4: Manage max-height with Tailwind & consider header height dynamically
                  // style={{ maxHeight: "calc(100vh - 56px)" }} // Let's try to use Tailwind for this.
                  // Example: Assuming Header is 56px (h-14). We can use Tailwind's arbitrary values for this.
                  // Or, better, make the inner content areas scrollable.
                >
                  {/* Suggestion 5: ChatSidebar responsiveness */}
                  {/* This will likely be hidden on mobile and shown on md+ screens */}
                  {/* The actual logic might live inside ChatSidebar or be controlled by state here (e.g., for a drawer) */}
                  {/* This div handles showing/hiding the sidebar area at different breakpoints */}
                  {/* It does NOT set a fixed width, allowing ChatSidebar to control its own w-16 or w-64 */}
                  <div className="hidden md:flex flex-shrink-0">
                    {" "}
                    {/* Ensures sidebar slot is shown from md upwards */}
                    <ChatSidebar />
                  </div>
                  <MobileChatSidebarDrawer />

                  {/* Main content area */}
                  <div className="flex-1 min-w-0 overflow-y-auto">
                    {" "}
                    {/* Added overflow-y-auto for content scrolling */}
                    {/* `min-w-0` is good here to prevent flexbox blowout */}
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

// import type { Metadata, Viewport } from "next"
// import "./globals.css"

// import { Geist, Geist_Mono } from "next/font/google"

// import { ChatSidebar } from "@/components/chat-sidebar"
// import { GooglePickerLoader } from "@/components/google-picker-loader"
// import Header from "@/components/header"
// import { LinkedAccountsProvider } from "@/components/use-linked-accounts-context"
// import { auth0 } from "@/lib/auth0"
// import { getLinkedAccounts } from "@/lib/auth0-mgmt"
// import { Auth0Provider } from "@auth0/nextjs-auth0"
// import { ThemeProvider } from "@/components/theme-provider"

// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// })

// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// })

// export const metadata: Metadata = {
//   title: "Auth0 AI | Demo",
// }

// export const viewport: Viewport = {
//   width: "device-width",
//   initialScale: 1.0,
//   maximumScale: 1.0,
//   userScalable: false,
// }

// export default async function RootLayout({
//   children,
// }: Readonly<{
//   children: React.ReactNode
// }>) {
//   const session = await auth0.getSession()
//   let linkedAccounts: any[] = []

//   if (session?.user?.sub) {
//     linkedAccounts = await getLinkedAccounts(session.user.sub)
//   }

//   return (
//     <html lang="en">
//       <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
//         <ThemeProvider>
//           <GooglePickerLoader />
//           <Auth0Provider user={session?.user}>
//             <div className="flex flex-col h-full w-full">
//               <Header />
//               <main
//                 className="flex flex-row flex-1 w-full mx-auto"
//                 style={{ maxHeight: "calc(100vh - 56px)" }}
//               >
//                 <ChatSidebar />
//                 <div className="flex-1 min-w-0">
//                   <LinkedAccountsProvider value={linkedAccounts}>{children}</LinkedAccountsProvider>
//                 </div>
//               </main>
//             </div>
//           </Auth0Provider>
//         </ThemeProvider>
//       </body>
//     </html>
//   )
// }
