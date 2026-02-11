import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverComponentsExternalPackages: [
      "googleapis",
      "google-auth-library",
      "@microsoft/microsoft-graph-client",
      "canvas",
      "gtoken",
      "jws",
      "jwa",
      "buffer-equal-constant-time",
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Externalize all problematic packages
      const externals = [
        "googleapis",
        "google-auth-library",
        "gtoken",
        "jws",
        "jwa",
        "buffer-equal-constant-time",
        "ecdsa-sig-formatter",
        "@microsoft/microsoft-graph-client",
        "canvas",
        "bufferutil",
        "utf-8-validate",
        "encoding",
      ]

      // Add to externals array
      if (Array.isArray(config.externals)) {
        config.externals.push(...externals)
      } else {
        config.externals = externals
      }
    }
    return config
  },
}

export default nextConfig
