'use client'

import { Agentation } from 'agentation'

export default function SiteAgentation() {
  if (
    process.env.NODE_ENV !==
    'development'
  ) {
    return null
  }

  return (
    <Agentation
      endpoint="http://localhost:4747"
      onSessionCreated={sessionId => {
        console.log(
          '[Agentation site] Session créée :',
          sessionId
        )
      }}
    />
  )
}