import { ConnectionsMetadata } from "@/lib/auth0-ai/connections-metadata"
import {
  GoogleIconSquared,
  MicrosoftIconSquared,
  SalesforceIconSquared,
  XboxIconSquared,
} from "./icons"

const google = ConnectionsMetadata.find(c => c.name === "google")!
const microsoft = ConnectionsMetadata.find(c => c.name === "microsoft")!
const salesforce = ConnectionsMetadata.find(c => c.name === "salesforce")!
const xbox = ConnectionsMetadata.find(c => c.name === "xbox")!

export const AvailableConnections = [
  {
    icon: <GoogleIconSquared />,
    strategy: "google-oauth2",
    displayName: "Google",
    description: "Access your Google services like Gmail or Drive.",
    title: "Google Tools",
    shortDescription: "Requires access to your Google account.",
    connection: google.connection,
    scopes: google.scopes,
    friendlyScopes: google.friendlyScopes,
  },
  {
    icon: <MicrosoftIconSquared />,
    strategy: "windowslive",
    displayName: "Microsoft",
    description: "Access your personal Microsoft services like Outlook or OneDrive",
    title: "Microsoft Tools",
    shortDescription: "Requires access to your Microsoft account.",
    connection: microsoft.connection,
    scopes: microsoft.scopes,
    friendlyScopes: microsoft.friendlyScopes,
  },
  {
    icon: <SalesforceIconSquared />,
    strategy: "oidc",
    displayName: "Salesforce",
    description: "Search your CRM data",
    title: "Salesforce Tools",
    shortDescription: "Requires access to your CRM data.",
    connection: salesforce.connection,
    scopes: salesforce.scopes,
    friendlyScopes: salesforce.friendlyScopes,
  },
  {
    icon: <XboxIconSquared />,
    strategy: "oidc",
    displayName: "Xbox",
    description: "Access your Xbox account.",
    title: "Xbox Tools",
    shortDescription: "Requires access to your Xbox account.",
    connection: xbox.connection,
    scopes: xbox.scopes,
    friendlyScopes: xbox.friendlyScopes,
  },
]
