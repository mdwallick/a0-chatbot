export type TokenSet = {
  accessToken?: string
  refreshToken?: string
}

export interface IRevocationService {
  providerName: string
  revoke: (tokens: TokenSet) => Promise<boolean>
}
