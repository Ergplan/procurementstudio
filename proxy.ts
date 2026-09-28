import { NextResponse, type NextRequest } from "next/server";

// Optional password gate. Set STUDIO_PASSWORD in Vercel → Settings → Environment Variables.
// When it's unset the app is open (fine locally, or behind Vercel Deployment Protection).
export function proxy(req: NextRequest) {
  const pass = process.env.STUDIO_PASSWORD;
  if (!pass) return NextResponse.next();
  const h = req.headers.get("authorization") || "";
  if (h.startsWith("Basic ")) {
    try {
      const [, pw] = atob(h.slice(6)).split(/:(.*)/s);
      if (pw === pass) return NextResponse.next();
    } catch { /* bad header */ }
  }
  return new NextResponse("Authentication required", { status: 401, headers: { "WWW-Authenticate": 'Basic realm="Procurement Studio", charset="UTF-8"' } });
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
