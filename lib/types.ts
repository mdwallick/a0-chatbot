export type ChatThread = {
  id: string
  summary: string
  updatedAt: string
}

export type ThreadsApiResponse = { threads: ChatThread[] } // Expected API response shape
