import { auth0 } from "@/lib/auth0"
import { Auth0AI } from "@auth0/ai-vercel"

import { Connections } from "./connections"

const auth0AI = new Auth0AI()

export const withBox = auth0AI.withTokenForConnection({
  connection: Connections.box.connection,
  scopes: [],
  // Using the access token from NextJS-Auth0
  accessToken: async () => {
    const accessToken = await auth0.getAccessTokenForConnection({
      connection: Connections.box.connection,
    })

    return {
      access_token: accessToken.token,
      expires_in: Math.floor((accessToken.expiresAt - Date.now()) / 1000),
      scope: "",
      id_token: "",
    }
  },
})
