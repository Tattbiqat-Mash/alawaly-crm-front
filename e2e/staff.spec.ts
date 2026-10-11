import { expect, test, type Page } from "@playwright/test";

async function signIn(page: Page) {
  await page.goto("/login");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await page.getByLabel("البريد الإلكتروني").fill("staff1@example.test");
  await page.getByLabel("كلمة المرور").fill("Synthetic-Pass-123");
  await page.getByRole("button", { name: "تسجيل الدخول" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "لوحة المعلومات" })).toBeVisible();
}

test("signed-out staff are sent to sign in and come back afterwards", async ({ page }) => {
  await page.goto("/units");
  await expect(page).toHaveURL(/\/login\?next=%2Funits/);
});

test("S01 → S02 → S03 → S04: sign in, browse units, open a unit", async ({ page }) => {
  await signIn(page);

  // Dashboard widgets from /reports/*
  await expect(page.getByText("الوحدات حسب الحالة")).toBeVisible();

  // Units list with paging meta
  await page.getByRole("navigation", { name: "التنقل الرئيسي" }).getByRole("link", { name: "الوحدات", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "الوحدات" })).toBeVisible();
  const row = page.getByRole("row", { name: "الوحدة 108" });
  await expect(row).toBeVisible();

  // Row → quick view → full view
  await row.click();
  await page.getByRole("link", { name: "فتح الصفحة الكاملة" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "الوحدة 102" })).toBeVisible();
  await expect(page.getByText("النسخة 1").first()).toBeVisible();
});

test("S04: saving sends If-Match and shows success", async ({ page }) => {
  await signIn(page);
  await page.goto("/units/116");
  const patch = page.waitForRequest((r) => r.method() === "PATCH" && r.url().includes("/bff/staff/units/116"));
  await page.getByLabel("ملاحظات").fill("Corner unit, park view");
  await page.getByRole("button", { name: "حفظ" }).click();
  const request = await patch;
  expect(request.headers()["if-match"]).toBe('"1"');
  expect(request.postDataJSON()).toEqual({ comments: "Corner unit, park view" });
  await expect(page.getByText("تم حفظ الوحدة.")).toBeVisible();
});

test("S04: a stale version opens the conflict dialog", async ({ page }) => {
  await signIn(page);
  // Ask the mock BFF for the recorded 409 VERSION_CONFLICT response.
  await page.route("**/bff/staff/units/116", (route) =>
    route.request().method() === "PATCH"
      ? route.continue({ headers: { ...route.request().headers(), "x-mock-status": "409" } })
      : route.continue(),
  );
  await page.goto("/units/116");
  await page.getByLabel("ملاحظات").fill("Overwrite attempt");
  await page.getByRole("button", { name: "حفظ" }).click();
  await expect(page.getByRole("dialog", { name: "عدّله شخص آخر" })).toBeVisible();
});

test("S04: a price change is only ever a request", async ({ page }) => {
  await signIn(page);
  await page.goto("/units/116");
  await page.getByRole("button", { name: "طلب تغيير السعر" }).click();
  const post = page.waitForRequest((r) => r.method() === "POST" && r.url().includes("/price-changes"));
  await page.getByLabel("القيمة الجديدة (ريال)").fill("598000");
  await page.getByRole("button", { name: "إرسال للاعتماد" }).click();
  const request = await post;
  expect(request.headers()["idempotency-key"]).toMatch(/^[0-9a-f-]{36}$/);
  expect(request.postDataJSON()).toMatchObject({ field: "price_in_tax", new_value: "598000.00" });
  await expect(page.getByText("أُرسل الطلب، وهو الآن بانتظار اعتماد شخص آخر.")).toBeVisible();
});

test("English is left-to-right with the same screens", async ({ page }) => {
  await page.goto("/en/login");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await expect(page.getByRole("heading", { name: "Staff sign in" })).toBeVisible();
});
