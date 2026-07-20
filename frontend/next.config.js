const DEFAULT_ASSETS_URL =
  'http://localhost:9100/casaluxurydecor-media'

function buildRemotePattern(value) {
  try {
    const parsedUrl = new URL(value)

    return {
      protocol: parsedUrl.protocol.replace(':', ''),
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || '',
      pathname: `${parsedUrl.pathname.replace(/\/$/, '')}/**`,
    }
  } catch {
    return null
  }
}

const configuredAssetsUrl =
  process.env.NEXT_PUBLIC_ASSETS_URL ||
  DEFAULT_ASSETS_URL

const remotePatterns = [
  buildRemotePattern(configuredAssetsUrl),
  buildRemotePattern(
    process.env.NEXT_PUBLIC_API_URL ||
      'http://localhost:3000/api'
  ),
].filter(Boolean)

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,

  compress: true,

  images: {
    formats: [
      'image/avif',
      'image/webp',
    ],

    deviceSizes: [
      360,
      390,
      430,
      640,
      768,
      1024,
      1280,
      1536,
      1920,
    ],

    imageSizes: [
      96,
      160,
      240,
      320,
      480,
      640,
    ],

    minimumCacheTTL: 60 * 60 * 24 * 30,

    remotePatterns,
  },

  async headers() {
    return [
      {
        source:
          '/images/:path*',

        headers: [
          {
            key: 'Cache-Control',
            value:
              'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig