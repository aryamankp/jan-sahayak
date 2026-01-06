import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname;

    // 1. Define Public Paths (Login, Assets, Public API)
    const isPublicPath =
        path === "/login" ||
        path.startsWith("/_next") ||
        path.startsWith("/api/auth") ||
        path.startsWith("/static") ||
        path.includes("."); // Files

    // 2. Check Session
    const hasSession = request.cookies.has("gen_session_id");

    // 3. Redirect Logic
    if (!isPublicPath && !hasSession) {
        // Protected Route accessed without session -> Redirect to Login
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("redirect", path);
        return NextResponse.redirect(loginUrl);
    }

    if (path === "/login" && hasSession) {
        // Login accessed with session -> Redirect to Home/Consent
        return NextResponse.redirect(new URL("/consent-gate", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api/ (API routes) -> We handle API auth separately inside routes usually, 
         *   but here we might want to block API too? 
         *   Let's block everything NOT in public list.
         *   Actually, we listed public paths above.
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};
