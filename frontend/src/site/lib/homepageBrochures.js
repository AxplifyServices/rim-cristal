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

function normalizeImageUrl(
  value
) {
  return String(
    value || ''
  ).trim()
}

function normalizeBrochure(
  brochure
) {
  const desktopVariants = {
    original:
      normalizeImageUrl(
        brochure
          ?.imageVariants
          ?.original
      ),

    tablet:
      normalizeImageUrl(
        brochure
          ?.imageVariants
          ?.tablet
      ),

    desktop:
      normalizeImageUrl(
        brochure
          ?.imageVariants
          ?.desktop
      ),

    large:
      normalizeImageUrl(
        brochure
          ?.imageVariants
          ?.large
      ),
  }

  const mobileVariants = {
    original:
      normalizeImageUrl(
        brochure
          ?.mobileImageVariants
          ?.original
      ),

    mobile:
      normalizeImageUrl(
        brochure
          ?.mobileImageVariants
          ?.mobile
      ),

    tablet:
      normalizeImageUrl(
        brochure
          ?.mobileImageVariants
          ?.tablet
      ),
  }

  const imageUrl =
    desktopVariants.desktop ||
    desktopVariants.large ||
    desktopVariants.tablet ||
    normalizeImageUrl(
      brochure?.imageUrl
    ) ||
    desktopVariants.original

  const mobileImageUrl =
    mobileVariants.mobile ||
    mobileVariants.tablet ||
    normalizeImageUrl(
      brochure?.mobileImageUrl
    ) ||
    mobileVariants.original ||
    imageUrl

  return {
    id: Number(
      brochure?.id
    ),

    imageUrl,
    mobileImageUrl,

    imageVariants:
      desktopVariants,

    mobileImageVariants:
      mobileVariants,

    altTextFr:
      String(
        brochure?.altTextFr || ''
      ).trim(),

    /*
     * Le projet utilise maintenant FR/AR.
     * On accepte encore altTextEn pour compatibilité
     * avec la structure historique.
     */
    altTextAr:
      String(
        brochure?.altTextAr ||
        brochure?.altTextEn ||
        ''
      ).trim() || null,

    altTextEn:
      String(
        brochure?.altTextEn ||
        ''
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