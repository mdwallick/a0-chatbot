"use client"

import { useUser } from "@auth0/nextjs-auth0"
import { MenuIcon, PanelLeftDashed } from "lucide-react" // Added PencilIcon back if needed
import { useSidebar } from "@/components/sidebar-context" // Adjust path
import { Button } from "@/components/ui/button" // Adjust path

import Link from "next/link"
import UserButton from "@/components/auth0/user-button"
import ThemeToggle from "./theme-toggle"

export default function Header() {
  const { user } = useUser()
  const {
    isSidebarExpanded,
    toggleSidebar /* createNewChat no longer directly called by Header menu items */,
  } = useSidebar()

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
      {/* Mobile Hamburger: Directly toggles the sidebar drawer */}
      <Button
        size="icon"
        variant="outline"
        className="md:hidden" // Only show on mobile screens
        onClick={toggleSidebar}
        aria-label={isSidebarExpanded ? "Close menu" : "Open menu"}
      >
        {/* Change icon based on drawer state. XIcon might be better handled inside the drawer itself. */}
        <MenuIcon size={20} />
      </Button>

      {/* Desktop Sidebar Toggle Button: For collapsing/expanding the persistent desktop sidebar */}
      <Button
        size="icon"
        variant="outline"
        className="hidden md:inline-flex" // Show only on desktop
        onClick={toggleSidebar}
        aria-label={isSidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}
      >
        {isSidebarExpanded ? <PanelLeftDashed size={20} /> : <MenuIcon size={20} />}
      </Button>

      {/* Other Header Content (e.g., Title, User Avatar) */}
      <div className="ml-auto flex items-center gap-2">
        {/* Example: <UserMenu /> or similar */}
        <ThemeToggle />
        {user ? (
          <UserButton user={user}>
            <a href="/profile" className="flex gap-2 items-center text-sm w-full">
              Profile
            </a>
          </UserButton>
        ) : (
          <Button asChild variant="outline">
            <Link href="/auth/login">Sign In</Link>
          </Button>
        )}
      </div>
    </header>
  )
}

// "use client"

// import Link from "next/link"

// import UserButton from "@/components/auth0/user-button"
// import { Auth0Icon, IconAuth0 } from "@/components/icons"
// import { DropdownMenuShortcut } from "@/components/ui/dropdown-menu"
// import { useUser } from "@auth0/nextjs-auth0"
// import { DropdownMenuItem } from "@radix-ui/react-dropdown-menu"

// import { Button } from "./ui/button"
// import ThemeToggle from "./theme-toggle"

// export default function Header() {
//   const { user } = useUser()

//   return (
//     <header className="z-50 flex items-center justify-between px-5 sm:px-6 py-3 h-14 shrink-0 gap-6 sm:gap-0 bg-[var(--sidebar)] text-[var(--sidebar-foreground)]">
//       <div className="flex items-center gap-6">
//         <span className="inline-flex items-center home-links whitespace-nowrap">
//           <Link href="/" rel="noopener">
//             <IconAuth0 className="hidden sm:inline-flex text-black dark:text-white" />
//             <Auth0Icon className="inline-flex sm:hidden text-black dark:text-white" />
//           </Link>
//         </span>
//       </div>

//       <div className="items-center justify-end gap-6 hidden sm:flex">
//         <div className="flex items-center justify-end gap-4">
//           <ThemeToggle />
//           {user ? (
//             <UserButton user={user}>
//               <DropdownMenuItem className="flex items-center px-2 py-1">
//                 <a href="/profile" className="flex gap-2 items-center text-sm w-full">
//                   Profile
//                   <DropdownMenuShortcut>⌘P</DropdownMenuShortcut>
//                 </a>
//               </DropdownMenuItem>
//             </UserButton>
//           ) : (
//             <Button asChild variant="outline">
//               <Link href="/auth/login">Sign In</Link>
//             </Button>
//           )}
//         </div>
//       </div>
//     </header>
//   )
// }
