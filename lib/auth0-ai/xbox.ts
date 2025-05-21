/**
 * TODO:
 *  1. create types for the returned objects from the Xbox token exchanges
 */

import { auth0 } from "@/lib/auth0"
import { Auth0AI } from "@auth0/ai-vercel"
import { prisma } from "@/lib/prisma"
import axios from "axios"

import { Connections } from "./connections"

const auth0AI = new Auth0AI()

export const withXbox = auth0AI.withTokenForConnection({
  ...Connections.xbox,
  refreshToken: async () => {
    const session = await auth0.getSession()
    const refreshToken = session?.tokenSet.refreshToken as string
    return refreshToken
  },
})

export const callXboxApi = async (url: string, accessToken: string) => {
  try {
    const { userHash, xstsToken, xuid } = await getXstsToken(accessToken)
    console.debug(`Authorization: XBL3.0 x=${userHash};${xstsToken}`)

    /*
      //// HACK ////
      some URIs accept "me" as the user ID meaning the xuid from
      the XSTS token. Some only accept xuid(ID), so every URL will have
      /me/ coming and and we replace it with xuid(${xuid})
    */
    console.debug("original URL", url)
    const newUrl = url.replace("/users/me/", `/users/xuid(${xuid})/`)
    console.debug("new URL", newUrl)

    const response = await axios.get(newUrl, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `XBL3.0 x=${userHash};${xstsToken}`,
        "x-xbl-contract-version": "2",
      },
    })

    return response
  } catch (error) {
    console.error("Axios error:", error)
    throw error
  }
}

export const getXstsToken = async (accessToken: string) => {
  /*
    1. look in DB to see if there is a token.
    2. if there is, check the expiry date
    3. if it is NOT expired, return it
    4. if it IS expired, get a new MSFT access token and exchange that for a new xsts token
    5. save the new Xbox creds to the DB
    6. return the new Xbox creds object
  */
  const session = await auth0.getSession()
  const userId = session?.user.sub

  try {
    // see if we have an xsts token
    const creds = await prisma.xboxCredential.findUnique({
      where: {
        userId,
      },
    })

    if (creds) {
      // see if it's still valid
      const now = new Date().getTime()
      const tokenExpiry = creds.expiresOn.getTime()

      if (tokenExpiry > now) {
        // the token is still good
        return creds
      }
    }
  } catch (error) {
    throw error
  }

  // if we got here, either there aren't any creds, or they're expired
  // so get new ones
  return xboxTokenExchange(userId!, accessToken)
}

const exchangeMsftTokenForXboxUserToken = async (accessToken: string) => {
  const userTokenResponse = await axios.post(
    "https://user.auth.xboxlive.com/user/authenticate",
    {
      Properties: {
        AuthMethod: "RPS",
        SiteName: "user.auth.xboxlive.com",
        RpsTicket: `d=${accessToken}`,
      },
      RelyingParty: "http://auth.xboxlive.com",
      TokenType: "JWT",
    },
    {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "x-xbl-contract-version": 2,
      },
    }
  )

  const userToken = userTokenResponse.data.Token
  const userHash = userTokenResponse.data.DisplayClaims.xui[0].uhs

  return {
    userToken,
    userHash,
  }
}

const exchangeUserTokenForXstsToken = async (userToken: string) => {
  const response = await axios.post(
    "https://xsts.auth.xboxlive.com/xsts/authorize",
    {
      Properties: {
        SandboxId: "RETAIL",
        UserTokens: [userToken],
      },
      RelyingParty: "http://xboxlive.com",
      TokenType: "JWT",
    },
    {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "x-xbl-contract-version": 2,
      },
    }
  )

  const xstsToken = response.data.Token
  const issuedAt = new Date(response.data.IssueInstant)
  const expiresOn = new Date(response.data.NotAfter)
  const xuid = response.data.DisplayClaims.xui[0].xid

  return {
    xstsToken,
    xuid,
    issuedAt,
    expiresOn,
  }
}

const xboxTokenExchange = async (userId: string, accessToken: string) => {
  // Step 1: Obtain User Token
  const { userToken, userHash } = await exchangeMsftTokenForXboxUserToken(accessToken)

  // Step 2: Obtain XSTS Token
  const { xstsToken, xuid, issuedAt, expiresOn } = await exchangeUserTokenForXstsToken(userToken)

  // Step 3: save the creds to the DB
  await prisma.xboxCredential.upsert({
    where: { userId: userId },
    update: {
      userHash,
      xstsToken,
      issuedAt,
      expiresOn,
    },
    create: {
      userId,
      userHash,
      xuid,
      xstsToken,
      issuedAt,
      expiresOn,
    },
  })

  return {
    userHash,
    xuid,
    xstsToken,
    issuedAt,
    expiresOn,
  }
}

export const Endpoints = {
  achievements: {
    baseUri: "achievements.xboxlive.com",
  },
  gamerpics: {
    baseUri: "gamerpics.xboxlive.com",
  },
  // inventory: {
  //   baseUri: "inventory.xboxlive.com", // only available if running on device
  // },
  leaderboards: {
    baseUri: "leaderboards.xboxlive.com",
  },
  people: {
    baseUri: "social.xboxlive.com",
  },
  presence: {
    baseUri: "userpresence.xboxlive.com",
  },
  privacy: {
    baseUri: "privacy.xboxlive.com",
  },
  profile: {
    baseUri: "profile.xboxlive.com",
  },
  userstats: {
    baseUri: "userstats.xboxlive.com",
  },
}
