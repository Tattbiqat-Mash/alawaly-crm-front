import type { NextRequest } from "next/server";
import { proxyRoute } from "@/lib/bff/upstream";

async function handler(req: NextRequest, ctx: RouteContext<"/bff/owner/[...path]">) {
  const { path } = await ctx.params;
  return proxyRoute(req, path, "owner");
}

export { handler as GET, handler as POST, handler as PATCH, handler as PUT, handler as DELETE };
