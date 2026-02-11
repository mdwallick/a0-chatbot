import { auth0AI } from "./index"
import { Connections } from "./connections"

export const withSalesforce = auth0AI.withTokenVault({
  ...Connections.salesforce,
  scopes: ["id", "api", "refresh_token"],
})
