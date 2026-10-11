import { expect, test, type Page } from "@playwright/test";

// Phase C journeys in mock mode (recorded staff user #126 holds "*").

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("البريد الإلكتروني").fill("staff1@example.test");
  await page.getByLabel("كلمة المرور").fill("Synthetic-Pass-123");
  await page.getByRole("button", { name: "تسجيل الدخول" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "لوحة المعلومات" })).toBeVisible();
}

test("S33: terminating a lease needs a reason before anything is sent", async ({ page }) => {
  await signIn(page);
  await page.goto("/rentals/leases");
  await page.getByRole("row", { name: "العقد رقم 9" }).click();
  await expect(page.getByRole("heading", { name: "العقد رقم 9" })).toBeVisible();

  let sent = false;
  page.on("request", (r) => {
    if (r.method() === "POST" && r.url().endsWith("/leases/9/terminate")) sent = true;
  });
  await page.getByRole("button", { name: "فسخ" }).click();
  const dialog = page.getByRole("dialog", { name: "فسخ العقد رقم 9؟" });
  await dialog.getByRole("button", { name: "فسخ" }).click();
  await expect(dialog.getByText("يرجى كتابة السبب.")).toBeVisible();
  expect(sent).toBe(false);

  const request = page.waitForRequest((r) => r.method() === "POST" && r.url().endsWith("/leases/9/terminate"));
  await dialog.getByLabel("السبب").fill("Tenant left early");
  await dialog.getByRole("button", { name: "فسخ" }).click();
  expect((await request).postDataJSON()).toEqual({ reason: "Tenant left early" });
});

test("S37: a new role is built from the permission catalogue and sent once", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/roles");
  await page.getByRole("button", { name: "دور جديد" }).click();
  await page.getByLabel("الاسم (إنجليزي)").fill("Sales agent");
  await page.getByLabel("الاسم (عربي)").fill("مندوب مبيعات");
  await page.getByLabel("view").click();

  const request = page.waitForRequest((r) => r.method() === "POST" && r.url().endsWith("/bff/staff/roles"));
  await page.getByRole("button", { name: "إنشاء" }).click();
  const sent = await request;
  expect(sent.headers()["idempotency-key"]).toMatch(/^[0-9a-f-]{36}$/);
  expect(sent.postDataJSON()).toEqual({ role_nameEn: "Sales agent", role_nameAr: "مندوب مبيعات", permissions: ["inventory.view"] });
  await expect(page.getByText("تم إنشاء الدور.")).toBeVisible();
});

test("S38: a short initial password is refused before sending", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/users");
  await page.getByRole("button", { name: "مستخدم جديد" }).click();
  await page.getByLabel("الاسم").fill("Huda Al-Otaibi");
  await page.getByLabel("البريد الإلكتروني").fill("huda@example.test");
  await page.getByLabel("رقم الفرع").fill("129");
  await page.getByLabel("كلمة المرور الأولى").fill("short");

  let sent = false;
  page.on("request", (r) => {
    if (r.method() === "POST" && r.url().endsWith("/bff/staff/users")) sent = true;
  });
  await page.getByRole("button", { name: "إنشاء" }).click();
  await expect(page.getByText("استخدم 12 حرفًا على الأقل.")).toBeVisible();
  expect(sent).toBe(false);
});

test("S39: an audit entry opens with its before and after values", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/audit");
  await page.getByRole("row", { name: "ownership.transfer unit 121" }).click();
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByText("قبل", { exact: true })).toBeVisible();
  await expect(sheet.getByText('"client_id": 94')).toBeVisible();
});

test("S40: health strip, then link an external id", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/integrations");
  await expect(page.getByText("leadflow").first()).toBeVisible();
  await page.getByRole("tab", { name: "المعرّفات الخارجية" }).click();
  await page.getByRole("button", { name: "ربط معرّف خارجي" }).click();
  const sheet = page.getByRole("dialog");
  await sheet.getByLabel("رقم السجل").fill("93");
  await sheet.getByLabel("المعرّف الخارجي").fill("LF-90421");

  const request = page.waitForRequest((r) => r.method() === "POST" && r.url().endsWith("/bff/staff/external-refs"));
  await sheet.getByRole("button", { name: "ربط معرّف خارجي" }).click();
  expect((await request).postDataJSON()).toEqual({ system: "leadflow", entity_type: "client", entity_id: 93, external_id: "LF-90421" });
  await expect(page.getByText("تم ربط المعرّف الخارجي.")).toBeVisible();
});

test("S36: exports and the documents index", async ({ page }) => {
  await signIn(page);
  await page.goto("/data");
  await expect(page.getByRole("button", { name: "تنزيل" })).toHaveCount(4);
  await expect(page.getByText("contract.pdf")).toBeVisible();
});
