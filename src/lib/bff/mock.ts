import "server-only";
import addendum from "../../../api-spec/addendum-examples.json";
import guide from "../../../api-spec/guide-examples.json";

// Opt-in mock mode (API_MOCKS=1): answers from the responses recorded in the Frontend Guide and
// the API brief addendum (newer, so it wins), so the browser code path is identical to the real
// API. Used by tests and while v2 is not deployed.

type RecordedExample = {
  title: string;
  response: { status: number | null; headers: Record<string, string>; body: unknown };
};
type RecordedEndpoint = { method: string; path: string; examples: RecordedExample[] };

const endpoints = [...(addendum as RecordedEndpoint[]), ...(guide as RecordedEndpoint[])];

const compiled = endpoints
  .map((e) => ({
    ...e,
    params: (e.path.match(/\{[^}]+\}/g) ?? []).length,
    regex: new RegExp(`^${e.path.replace(/\{[^}]+\}/g, "[^/]+")}$`),
  }))
  // Prefer static segments (/units/import) over parameters (/units/{id}).
  .sort((a, b) => a.params - b.params);

/** The guide shortens long lists with a placeholder string ("… 5 items in total"); drop it. */
function stripPlaceholders(body: unknown): unknown {
  if (body && typeof body === "object" && "data" in body && Array.isArray(body.data)) {
    return { ...body, data: body.data.filter((item: unknown) => typeof item !== "string" || !item.startsWith("…")) };
  }
  return body;
}

const findEndpoint = (method: string, apiPath: string) => compiled.find((e) => e.method === method && e.regex.test(apiPath));

export function mockResponse(method: string, apiPath: string, requestHeaders: Headers): Response {
  const endpoint =
    findEndpoint(method, apiPath) ??
    // /unit-templates is the same resource as /unit-styles.
    findEndpoint(method, apiPath.replace(/^\/unit-templates/, "/unit-styles")) ??
    // GET …/features answers with the list PUT …/features sets.
    (method === "GET" && apiPath.endsWith("/features") ? findEndpoint("PUT", apiPath) : undefined);
  if (!endpoint) {
    return Response.json(
      { error: { code: "NOT_FOUND", message: `No recorded example for ${method} ${apiPath}` } },
      { status: 404 },
    );
  }

  // Tests can ask for a specific recorded outcome, e.g. x-mock-status: 409.
  const wanted = Number(requestHeaders.get("x-mock-status")) || null;
  const isSuccess = (x: RecordedExample) => (x.response.status ?? 0) >= 200 && (x.response.status ?? 0) < 300;
  const example =
    (wanted && endpoint.examples.find((x) => x.response.status === wanted)) ||
    endpoint.examples.find(isSuccess) ||
    endpoint.examples[0];

  const status = example.response.status ?? 200;
  const headers = new Headers({ "Cache-Control": "no-store" });
  for (const [name, value] of Object.entries(example.response.headers)) headers.set(name, value);

  const body = example.response.body;
  if (typeof body === "string") {
    headers.set("Content-Type", "text/csv; charset=utf-8");
    return new Response(body, { status, headers });
  }
  return Response.json(stripPlaceholders(body), { status, headers });
}
