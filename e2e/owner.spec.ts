import { expect, test } from "@playwright/test";

test("O01 → O02 → O03: phone code sign-in and home at 360px", async ({ page }) => {
  await page.goto("/owner");
  await expect(page).toHaveURL(/\/owner\/sign-in$/);

  await page.getByLabel("رقم الجوال").fill("0500000101");
  await page.getByRole("button", { name: "إرسال الرمز" }).click();

  await expect(page).toHaveURL(/\/owner\/verify$/);
  await expect(page.getByText("0101")).toBeVisible();
  // The phone never appears in the URL.
  expect(page.url()).not.toContain("500000101");

  await page.getByLabel("رمز من 6 أرقام").fill("755599");
  await expect(page.getByText("مرحبًا، Layla Al-Harbi")).toBeVisible();
  await expect(page.getByText("أحدث الإشعارات")).toBeVisible();

  // No horizontal scrolling at 360px.
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);

  // Sign out through "More".
  await page.getByRole("link", { name: "المزيد" }).click();
  await page.getByRole("button", { name: "تسجيل الخروج" }).click();
  await expect(page).toHaveURL(/\/owner\/sign-in$/);
});

test("O01: an invalid number is caught before any request", async ({ page }) => {
  await page.goto("/owner/sign-in");
  let sent = false;
  page.on("request", (r) => {
    if (r.url().includes("/bff/owner/auth/code")) sent = true;
  });
  await page.getByLabel("رقم الجوال").fill("12345");
  await page.getByRole("button", { name: "إرسال الرمز" }).click();
  await expect(page.getByText("أدخل رقم جوال سعوديًا، مثل 05X XXX XXXX.")).toBeVisible();
  expect(sent).toBe(false);
});
