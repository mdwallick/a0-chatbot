import { Connections } from "@/lib/auth0-ai/connections"
import {
  GoogleIconSquared,
  MicrosoftIconSquared,
  SalesforceIconSquared,
  XboxIconSquared,
} from "./icons"

export const AvailableConnections = [
  {
    icon: <GoogleIconSquared />,
    strategy: "google-oauth2",
    displayName: "Google",
    description: "Access your Google services like Gmail or Drive.",
    title: "Google Tools",
    shortDescription: "Requires access to your Google account.",
    ...Connections.google,
  },
  {
    icon: <MicrosoftIconSquared />,
    strategy: "windowslive",
    displayName: "Microsoft",
    description: "Access your personal Microsoft services like Outlook or OneDrive",
    title: "Microsoft Tools",
    shortDescription: "Requires access to your Microsoft account.",
    ...Connections.microsoft,
  },
  {
    icon: <SalesforceIconSquared />,
    strategy: "oidc",
    displayName: "Salesforce",
    description: "Search your CRM data",
    title: "Salesforce Tools",
    shortDescription: "Requires access to your CRM data.",
    ...Connections.salesforce,
  },
  {
    icon: <XboxIconSquared />,
    strategy: "oidc",
    displayName: "Xbox",
    description: "Access your Xbox account.",
    title: "Xbox Tools",
    shortDescription: "Requires access to your Xbox account.",
    ...Connections.xbox,
  },
]
