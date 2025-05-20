import { Connections } from "@/lib/auth0-ai/connections"
import {
  GoogleIconSquared,
  OneDriveIconSquared,
  SalesforceIconSquared,
  XboxIconSquared,
} from "./icons"

export const AvailableConnections = [
  {
    icon: <GoogleIconSquared />,
    strategy: "google-oauth2",

    displayName: "Google Drive",
    description: "Search your personal and shared drives",
    title: "Google Drive Tools",
    shortDescription: "Requires access to your files and folders.",
    ...Connections.googleDrive,
  },
  {
    icon: <OneDriveIconSquared />,
    strategy: "windowslive",
    displayName: "One Drive",
    description: "Search your public and private files",
    title: "One Drive Tools",
    shortDescription: "Requires access to your files.",
    ...Connections.windowsLive,
  },
  {
    icon: <XboxIconSquared />,
    strategy: "oidc",
    displayName: "Xbox",
    description: "Read your Xbox profile information",
    title: "Xbox Tools",
    shortDescription: "Requires read access to your Xbox profile.",
    ...Connections.xbox,
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
]
