import { Connections } from "../lib/auth0-ai/connections"
import {
  BoxIconSquared,
  GoogleIconSquared,
  OneDriveIconSquared,
  SalesforceIconSquared,
  SlackIconSquared,
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
    icon: <SlackIconSquared />,
    strategy: "oauth2",
    displayName: "Slack",
    description: "Search your public and private channels",
    title: "Slack Tools",
    shortDescription: "Requires access to view channels and conversations.",
    ...Connections.slack,
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
    icon: <SalesforceIconSquared />,
    strategy: "oidc",
    displayName: "Salesforce",
    description: "Search your CRM data",
    title: "Salesforce Tools",
    shortDescription: "Requires access to your CRM data.",
    ...Connections.salesforce,
  },
  {
    icon: <BoxIconSquared />,
    strategy: "box",
    displayName: "Box",
    description: "Search your public and private files",
    title: "Box Tools",
    shortDescription: "Requires access to your files.",
    ...Connections.box,
  },
]
