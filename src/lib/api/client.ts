import axios, { type AxiosInstance } from "axios";
import type { SessionKind } from "@/lib/bff/cookies";
import { toApiError } from "./errors";

// Browser clients talk only to our same-origin BFF, which holds the tokens in httpOnly cookies.
// Two separate sessions: staff (/bff/staff) and owner (/bff/owner).

const SIGN_IN_PATH: Record<SessionKind, string> = { staff: "/login", owner: "/owner/sign-in" };

function currentLocalePrefix() {
  const lang = document.documentElement.lang;
  return lang && lang !== "ar" ? `/${lang}` : "";
}

/** Session expired or revoked: leave for sign-in (a full navigation also drops all cached data). */
function redirectToSignIn(kind: SessionKind) {
  const prefix = currentLocalePrefix();
  const here = window.location.pathname.slice(prefix.length) || "/";
  const target = SIGN_IN_PATH[kind];
  if (here === target) return;
  const next = kind === "staff" && here !== "/" ? `?next=${encodeURIComponent(here + window.location.search)}` : "";
  // A full navigation on purpose: it drops every cached query of the ended session.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign(`${prefix}${target}${next}`);
}

function createClient(kind: SessionKind): AxiosInstance {
  const client = axios.create({
    baseURL: `/bff/${kind}`,
    timeout: 30_000,
    headers: { Accept: "application/json" },
  });

  client.interceptors.request.use((config) => {
    // Error and notification texts follow Accept-Language (Arabic by default).
    config.headers.set("Accept-Language", document.documentElement.lang || "ar");
    return config;
  });

  client.interceptors.response.use(undefined, (err: unknown) => {
    const error = toApiError(err);
    // INVALID_CREDENTIALS / INVALID_CODE are form errors, not an expired session.
    if (error.status === 401 && error.code === "UNAUTHENTICATED") redirectToSignIn(kind);
    return Promise.reject(error);
  });

  return client;
}

export const staffApi = createClient("staff");
export const ownerApi = createClient("owner");
