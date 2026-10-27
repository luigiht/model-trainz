import { NextResponse } from "next/server";

/** The build currently deployed (compared with the build a tab is running). */
export function GET() {
  return NextResponse.json(
    { version: process.env.NEXT_PUBLIC_APP_VERSION },
    { headers: { "Cache-Control": "no-store" } },
  );
}
