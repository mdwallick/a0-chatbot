export type ChatThread = {
  id: string
  summary: string
  updatedAt: string
}

export type ThreadsApiResponse = { threads: ChatThread[] }

export type ChatContext = {
  user?: {
    id: string
    email?: string
    name?: string
  }
}
