import { NextResponse } from 'next/server'

const PUBLIC_DOMAIN = 'rim-cristal.axplitest.com'
const ADMIN_DOMAIN = 'rim-cristal-admin.axplitest.com'

function isAssetPath(pathname) {
  return (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/assets') ||
    pathname.startsWith('/icons') ||
    pathname.startsWith('/manifest') ||
    pathname.startsWith('/robots') ||
    pathname.startsWith('/sitemap')
  )
}

export function middleware(request) {
  const url = request.nextUrl
  const hostname = request.headers.get('host')?.split(':')[0] || ''
  const pathname = url.pathname

  if (isAssetPath(pathname)) {
    return NextResponse.next()
  }

  const isPublicDomain = hostname === PUBLIC_DOMAIN
  const isAdminDomain = hostname === ADMIN_DOMAIN

  if (!isPublicDomain && !isAdminDomain) {
    return NextResponse.next()
  }

  if (isPublicDomain && pathname.startsWith('/admin')) {
    return new NextResponse('Not Found', {
      status: 404,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
      },
    })
  }

  if (isAdminDomain) {
    if (pathname === '/') {
      const loginUrl = url.clone()
      loginUrl.pathname = '/admin/login'
      return NextResponse.redirect(loginUrl)
    }

    if (!pathname.startsWith('/admin')) {
      return new NextResponse('Not Found', {
        status: 404,
        headers: {
          'content-type': 'text/plain; charset=utf-8',
        },
      })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api).*)'],
}