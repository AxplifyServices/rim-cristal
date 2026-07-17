import { NextResponse } from 'next/server'

const APPLICATION_DOMAIN =
  'casaluxurydecor.axplitest.com'

function isAssetPath(pathname) {
  return (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/media') ||
    pathname.startsWith('/assets') ||
    pathname.startsWith('/icons') ||
    pathname.startsWith('/manifest') ||
    pathname.startsWith('/robots') ||
    pathname.startsWith('/sitemap')
  )
}

export function middleware(request) {
  const hostname =
    request.headers
      .get('host')
      ?.split(':')[0] || ''

  const pathname =
    request.nextUrl.pathname

  if (isAssetPath(pathname)) {
    return NextResponse.next()
  }

  const isProductionDomain =
    hostname === APPLICATION_DOMAIN

  const isLocalDomain =
    hostname === 'localhost' ||
    hostname === '127.0.0.1'

  if (
    !isProductionDomain &&
    !isLocalDomain
  ) {
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api).*)',
  ],
}