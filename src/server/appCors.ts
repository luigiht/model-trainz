/**
 * CORS for the iOS/Android app, whose web view has its own origin and calls the website's API.
 * Only the Capacitor origins are allowed; the Game ID stays the only credential.
 */
const APP_ORIGINS = new Set(["capacitor://localhost", "https://localhost"]);

/** Adds the header a request from the app needs to read `res` (none for other origins). */
export function allowApp(req: Request, res: Response): Response {
  res.headers.append("Vary", "Origin");
  const origin = req.headers.get("origin");
  if (origin && APP_ORIGINS.has(origin)) res.headers.set("Access-Control-Allow-Origin", origin);
  return res;
}

/** Answers the app's preflight request. */
export function preflight(req: Request, methods: string): Response {
  const headers = {
    "Access-Control-Allow-Methods": methods,
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
  return allowApp(req, new Response(null, { status: 204, headers }));
}
