import { HttpError } from "./errors"

export const fetcher = async (url: string) => {
  const res = await fetch(url)

  // If the status code is not in the range 200-299,
  // we still try to parse and throw it.
  if (!res.ok) {
    const info = await res.json().catch(() => ({})) // Try to get error details
    const error = new HttpError("An error occurred while fetching the data.", res.status, info)
    throw error
  }

  return res.json()
}
