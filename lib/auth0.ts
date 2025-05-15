import { Auth0Client } from "@auth0/nextjs-auth0/server"

// export const auth0 = new Auth0Client()
export const auth0 = new Auth0Client({
  domain: process.env.AUTH0_ISSUER_BASE_URL!,
  clientId: process.env.AUTH0_CLIENT_ID!,
  clientSecret: process.env.AUTH0_CLIENT_SECRET!,
  secret: process.env.AUTH0_SECRET!,
  appBaseUrl: process.env.APP_BASE_URL!,
  // authorizationParameters: {
  //   scope: process.env.AUTH0_SCOPES || "openid profile email offline_access",
  //   connection: process.env.AUTH0_CONNECTION_NAME || "Username-Password-Authentication",
  // },
})
