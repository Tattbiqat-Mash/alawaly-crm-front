import type { NextRequest } from "next/server";

// Stored media paths (projects/oasis/cover.jpg) → the file on the backend's public disk.
// Server-only base. The live API returns full URLs on this public disk (…/public/storage/images/x.png).
const MEDIA_BASE_URL = (process.env.MEDIA_BASE_URL || "https://alawaly.tattbiqat.com/public/storage").replace(/\/+$/, "");

export async function GET(_req: NextRequest, ctx: RouteContext<"/bff/media/[...path]">) {
  const { path } = await ctx.params;
  // Path segments only: no traversal out of the media base.
  if (path.some((segment) => segment === ".." || segment === ".")) return new Response(null, { status: 400 });
  const target = `${MEDIA_BASE_URL}/${path.map(encodeURIComponent).join("/")}`;
  return new Response(null, { status: 302, headers: { Location: target, "Cache-Control": "public, max-age=3600" } });
}
