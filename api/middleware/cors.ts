import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * CORS (Cross-Origin Resource Sharing) middleware
 * Prevents unauthorized cross-origin requests to the API
 */

const ALLOWED_ORIGINS = [
  "https://musicable.com",
  "https://www.musicable.com",
  "https://miraimusic.com",
  "https://www.miraimusic.com",
  "http://localhost:3000", // Development only
  "http://localhost:5173", // Vite dev
];

export function handleCORS(req: VercelRequest, res: VercelResponse): boolean {
  const origin = req.headers.origin || req.headers.referer;

  // Check if origin is allowed
  const isAllowed = ALLOWED_ORIGINS.some((allowedOrigin) => {
    if (origin?.startsWith(allowedOrigin)) return true;
    return false;
  });

  if (isAllowed) {
    // Allow credentials
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Origin", origin || ALLOWED_ORIGINS[0]);
  }

  // Always set these for preflight requests
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,HEAD,OPTIONS,PATCH,DELETE,POST,PUT"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type,Authorization,X-CSRF-Token,X-Requested-With"
  );

  // Preflight request
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return true; // Request was handled
  }

  return false; // Continue with request
}

/**
 * Middleware version for easy use in API routes
 */
export async function corsMiddleware(
  req: VercelRequest,
  res: VercelResponse,
  handler: () => Promise<void>
) {
  // Handle CORS
  if (handleCORS(req, res)) {
    return;
  }

  // Call the actual handler
  await handler();
}
