import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that don't require authentication
const publicRoutes = ['/splash', '/language', '/login', '/api'];

// Routes that require full authentication (citizen linked)
const protectedRoutes = ['/', '/voice', '/apply', '/my-applications', '/grievance', '/status'];

export function middleware(request: NextRequest) {
    const pathname = request.nextUrl.pathname;

    // Skip API routes and static files
    if (pathname.startsWith('/api') || pathname.startsWith('/_next') || pathname.startsWith('/icons')) {
        return NextResponse.next();
    }

    // Check session state
    const sessionId = request.cookies.get('gen_session_id')?.value;
    const hasLanguage = request.cookies.get('gen_language')?.value;
    const citizenId = request.cookies.get('gen_citizen_id')?.value;
    const hasConsent = request.cookies.get('gen_consent')?.value;

    // If accessing root without session, redirect to splash
    if (pathname === '/' && !sessionId) {
        return NextResponse.redirect(new URL('/splash', request.url));
    }

    // If accessing root without language, redirect to language
    if (pathname === '/' && sessionId && !hasLanguage) {
        return NextResponse.redirect(new URL('/language', request.url));
    }

    // If accessing root without being logged in, redirect to login
    if (pathname === '/' && sessionId && hasLanguage && !citizenId) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // If accessing root without consent, redirect to consent
    if (pathname === '/' && sessionId && citizenId && !hasConsent) {
        return NextResponse.redirect(new URL('/consent-gate', request.url));
    }

    // For other protected routes, check full auth
    const isProtectedRoute = protectedRoutes.some(route =>
        pathname === route || pathname.startsWith(route + '/')
    );

    if (isProtectedRoute && pathname !== '/') {
        if (!sessionId) {
            return NextResponse.redirect(new URL('/splash', request.url));
        }
        if (!citizenId && pathname !== '/consent-gate') {
            return NextResponse.redirect(new URL('/login', request.url));
        }
    }

    const response = NextResponse.next();

    // Add session info header for client
    if (!sessionId) {
        response.headers.set('x-session-missing', 'true');
    }

    return response;
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|icons|manifest.json).*)',
    ],
};
