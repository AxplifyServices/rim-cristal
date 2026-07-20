const PUBLIC_API_BASE = (
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:3000/api'
).replace(/\/$/, '')

function numberOrFallback(
  value,
  fallback
) {
  const parsed = Number(value)

  return Number.isFinite(parsed)
    ? parsed
    : fallback
}

function normalizeFit(value) {
  return value === 'contain'
    ? 'contain'
    : 'cover'
}

function normalizeTarget(value) {
  return value === '_blank'
    ? '_blank'
    : '_self'
}

function normalizeBrochure(
  brochure
) {
  return {
    id: Number(brochure?.id),

    imageUrl:
      String(
        brochure?.imageUrl || ''
      ).trim(),

    mobileImageUrl:
      String(
        brochure?.mobileImageUrl || ''
      ).trim() || null,

    altTextFr:
      String(
        brochure?.altTextFr || ''
      ).trim(),

    altTextEn:
      String(
        brochure?.altTextEn || ''
      ).trim() || null,

    linkUrl:
      String(
        brochure?.linkUrl || ''
      ).trim() || null,

    linkTarget:
      normalizeTarget(
        brochure?.linkTarget
      ),

    sortOrder:
      numberOrFallback(
        brochure?.sortOrder,
        0
      ),

    desktopFit:
      normalizeFit(
        brochure?.desktopFit
      ),

    desktopPositionX:
      numberOrFallback(
        brochure?.desktopPositionX,
        50
      ),

    desktopPositionY:
      numberOrFallback(
        brochure?.desktopPositionY,
        50
      ),

    desktopZoom:
      numberOrFallback(
        brochure?.desktopZoom,
        1
      ),

    mobileFit:
      normalizeFit(
        brochure?.mobileFit
      ),

    mobilePositionX:
      numberOrFallback(
        brochure?.mobilePositionX,
        50
      ),

    mobilePositionY:
      numberOrFallback(
        brochure?.mobilePositionY,
        50
      ),

    mobileZoom:
      numberOrFallback(
        brochure?.mobileZoom,
        1
      ),
  }
}

export async function getHomepageBrochures(
  signal
) {
  const isServer =
    typeof window ===
    'undefined'

  const response = await fetch(
    `${PUBLIC_API_BASE}/homepage-brochures`,
    {
      method: 'GET',

      headers: {
        Accept:
          'application/json',
      },

      cache: isServer
        ? 'force-cache'
        : 'no-store',

      ...(isServer
        ? {
            next: {
              revalidate: 60,
            },
          }
        : {}),

      ...(signal
        ? {
            signal,
          }
        : {}),
    }
  )

  if (!response.ok) {
    let message =
      'Impossible de charger les brochures.'

    try {
      const payload =
        await response.json()

      message =
        payload?.message ||
        message
    } catch {
      // La réponse ne contient pas de JSON exploitable.
    }

    throw new Error(message)
  }

  const payload =
    await response.json()

  if (!Array.isArray(payload)) {
    return []
  }

  return payload
    .map(normalizeBrochure)
    .filter(brochure => {
      return (
        Number.isSafeInteger(
          brochure.id
        ) &&
        brochure.id > 0 &&
        Boolean(
          brochure.imageUrl
        )
      )
    })
    .sort((a, b) => {
      const orderDifference =
        a.sortOrder -
        b.sortOrder

      if (
        orderDifference !==
        0
      ) {
        return orderDifference
      }

      return a.id - b.id
    })
}