import { Auth0AI } from "@auth0/ai-vercel"
import { Connections } from "./connections"

const auth0AI = new Auth0AI()

export const withSalesforce = auth0AI.withTokenForConnection({
  ...Connections.salesforce,
  //scopes: ["id", "api", "refresh_token"],
})
