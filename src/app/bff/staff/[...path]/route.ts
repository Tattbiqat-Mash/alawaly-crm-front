import type { NextRequest } from "next/server";
import { proxyRoute } from "@/lib/bff/upstream";

async function handler(req: NextRequest, ctx: RouteContext<"/bff/staff/[...path]">) {
  const { path } = await ctx.params;
  return proxyRoute(req, path, "staff");
}

export { handler as GET, handler as POST, handler as PATCH, handler as PUT, handler as DELETE };
