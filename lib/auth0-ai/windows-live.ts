import { auth0 } from "@/lib/auth0"
import { Auth0AI } from "@auth0/ai-vercel"

import { Connections } from "./connections"

const auth0AI = new Auth0AI()

export const withOneDrive = auth0AI.withTokenForConnection({
  ...Connections.windowsLive,
  refreshToken: async () => {
    const session = await auth0.getSession()
    const refreshToken = session?.tokenSet.refreshToken as string
    return refreshToken
  },
})
