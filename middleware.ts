import { NextRequest, NextResponse } from "next/server"

import { auth0 } from "@/lib/auth0"

// List of paths that require authentication
const PROTECTED_PATHS = ["/profile", "/api/link-account", "/api/integrations"]

export async function middleware(request: NextRequest) {
  const authRes = await auth0.middleware(request)
  const qs = request.nextUrl.searchParams
  const tx = qs.get("tx")

  // trying to link an account, we need to store the information in a cookie
  if (tx && tx === "link-account") {
    const subject = qs.get("tx_sub")
    const strategy = qs.get("tx_strategy")

    // create a cookie to store the link-account information
    authRes.cookies.set({
      name: "link-account",
      value: JSON.stringify({ subject, strategy }),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      expires: new Date(Date.now() + 5 * 60 * 1000),
    })
  }

  if (request.nextUrl.pathname.startsWith("/auth")) {
    return authRes
  }

  // Check if the requested path requires authentication
  const requiresAuth = PROTECTED_PATHS.some(path => request.nextUrl.pathname.startsWith(path))

  if (requiresAuth) {
    const session = await auth0.getSession(request)
    if (!session) {
      return NextResponse.redirect(new URL("/auth/login", process.env.APP_BASE_URL!))
    }
  }

  return authRes
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
}
