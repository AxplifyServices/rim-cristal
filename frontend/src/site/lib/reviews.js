const API_BASE =
  process.env
    .NEXT_PUBLIC_API_URL ||
  'http://localhost:3000/api'

export async function getHomeReviews() {
  const response =
    await fetch(
      `${API_BASE}/reviews/home`,
      {
        next: {
          revalidate: 60,
        },
      }
    )

  if (!response.ok) {
    throw new Error(
      `Impossible de charger les avis (${response.status}).`
    )
  }

  const data =
    await response.json()

  return Array.isArray(data)
    ? data
    : []
}