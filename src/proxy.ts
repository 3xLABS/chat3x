// CORS for the local API — lets trusted local tooling (e.g. the Claude
// control-panel artifact) call /api/* cross-origin. CHAT3X is a local
// single-user tool; if you ever expose this server beyond localhost,
// remove this or restrict the origin list.
import { NextResponse, type NextRequest } from "next/server";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function proxy(request: NextRequest) {
  // Preflight requests never reach the route handlers
  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
  }
  const response = NextResponse.next();
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

export const proxyConfig = {
  matcher: ["/api/:path*"],
};
