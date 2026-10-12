import { expect, test, type Page } from "@playwright/test";

// First loads in a fresh browser: no errors or failed requests, styles and fonts applied, and the
// page hydrated (the empty form is caught in the browser). Also run against `wrangler dev` after
// `pnpm cf:build`: the Cloudflare bundle broke first loads where `next start` did not.

/** Collects everything that would make a first load "not clean". */
function watch(page: Page) {
  const problems: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning") problems.push(`console.${m.type()}: ${m.text()}`);
  });
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
  page.on("requestfailed", (r) => problems.push(`failed: ${r.url()} ${r.failure()?.errorText}`));
  page.on("response", (r) => {
    if (r.status() >= 400) problems.push(`${r.status()}: ${r.url()}`);
  });
  return problems;
}

async function assertStyled(page: Page) {
  const info = await page.evaluate(async () => {
    await document.fonts.ready;
    const res = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
    return {
      font: getComputedStyle(document.body).fontFamily,
      bg: getComputedStyle(document.body).backgroundColor,
      fontsLoaded: [...document.fonts].filter((f) => f.status === "loaded").length,
      css: res.filter((r) => r.initiatorType === "link" && r.name.includes(".css")).length,
      js: res.filter((r) => r.initiatorType === "script").length,
    };
  });
  expect(info.css, "stylesheet loaded").toBeGreaterThan(0);
  expect(info.js, "scripts loaded").toBeGreaterThan(0);
  expect(info.font, "app font applied").toMatch(/plex/i);
  expect(info.bg, "body background from CSS").not.toBe("rgba(0, 0, 0, 0)");
  expect(info.fontsLoaded, "web fonts loaded").toBeGreaterThan(0);
}

const staffPages = [
  { path: "/login", lang: "ar", dir: "rtl", title: /دخول الموظفين/, submit: "تسجيل الدخول", field: "البريد الإلكتروني" },
  { path: "/en/login", lang: "en", dir: "ltr", title: /Staff sign in/, submit: /sign in/i, field: /email/i },
];

for (const p of staffPages) {
  test(`first load ${p.path}: clean, styled, hydrated`, async ({ page }) => {
    const problems = watch(page);
    const res = await page.goto(p.path, { waitUntil: "load" });
    expect(res?.status()).toBe(200);
    await expect(page.locator("html")).toHaveAttribute("lang", p.lang);
    await expect(page.locator("html")).toHaveAttribute("dir", p.dir);
    await expect(page).toHaveTitle(p.title);
    await assertStyled(page);

    // Hydration: an empty submit is caught in the browser, nothing is sent.
    let sent = false;
    page.on("request", (r) => {
      if (r.url().includes("/bff/staff/auth/login")) sent = true;
    });
    await page.getByRole("button", { name: p.submit }).click();
    await expect(page.getByLabel(p.field)).toHaveAttribute("aria-invalid", "true");
    expect(sent).toBe(false);
    expect(page.url()).toContain(p.path);

    await page.waitForLoadState("networkidle");
    expect(problems).toEqual([]);
  });
}

const ownerPages = [
  { path: "/owner/sign-in", lang: "ar", dir: "rtl", title: /بوابة الملّاك/, submit: "إرسال الرمز", field: "رقم الجوال" },
  { path: "/en/owner/sign-in", lang: "en", dir: "ltr", title: /Owner portal/, submit: /send/i, field: /mobile|phone/i },
];

for (const p of ownerPages) {
  test(`first load ${p.path}: clean, styled, hydrated`, async ({ page }) => {
    const problems = watch(page);
    const res = await page.goto(p.path, { waitUntil: "load" });
    expect(res?.status()).toBe(200);
    await expect(page.locator("html")).toHaveAttribute("lang", p.lang);
    await expect(page.locator("html")).toHaveAttribute("dir", p.dir);
    await expect(page).toHaveTitle(p.title);
    await assertStyled(page);

    let sent = false;
    page.on("request", (r) => {
      if (r.url().includes("/bff/owner/auth/code")) sent = true;
    });
    await page.getByLabel(p.field).fill("12345");
    await page.getByRole("button", { name: p.submit }).click();
    await expect(page.getByLabel(p.field)).toHaveAttribute("aria-invalid", "true");
    expect(sent).toBe(false);

    await page.waitForLoadState("networkidle");
    expect(problems).toEqual([]);
  });
}

test("first load / when signed out lands on a working sign-in page", async ({ page }) => {
  const problems = watch(page);
  const res = await page.goto("/", { waitUntil: "load" });
  expect(res?.status()).toBe(200);
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("button", { name: "تسجيل الدخول" })).toBeVisible();
  await page.waitForLoadState("networkidle");
  expect(problems).toEqual([]);
});

test("signed-in staff: hard reloads render on the server and hydrate", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("البريد الإلكتروني").fill("staff1@example.test");
  await page.getByLabel("كلمة المرور").fill("Synthetic-Pass-123");
  await page.getByRole("button", { name: "تسجيل الدخول" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "لوحة المعلومات" })).toBeVisible();

  for (const [path, heading] of [
    ["/", "لوحة المعلومات"],
    ["/units", "الوحدات"],
    ["/units/116", null],
    ["/en/units", "Units"],
  ] as const) {
    const problems = watch(page);
    const res = await page.goto(path, { waitUntil: "load" });
    expect(res?.status(), path).toBe(200);
    if (heading) await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    else await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.waitForLoadState("networkidle");
    await assertStyled(page);
    expect(problems, path).toEqual([]);
    page.removeAllListeners("console");
    page.removeAllListeners("pageerror");
    page.removeAllListeners("requestfailed");
    page.removeAllListeners("response");
  }
});
