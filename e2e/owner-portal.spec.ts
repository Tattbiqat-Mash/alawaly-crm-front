import { expect, test, type Page } from "@playwright/test";

// Phase D owner journeys at 360px in mock mode (recorded owner: client #93).

async function signIn(page: Page) {
  await page.goto("/owner/sign-in");
  await page.getByLabel("رقم الجوال").fill("0500000101");
  await page.getByRole("button", { name: "إرسال الرمز" }).click();
  await page.getByLabel("رمز من 6 أرقام").fill("755599");
  await expect(page.getByText("مرحبًا، Layla Al-Harbi")).toBeVisible();
  // Let the post-sign-in navigation settle before tapping anything.
  await expect(page).toHaveURL(/\/owner$/);
  await page.waitForLoadState("networkidle");
}

test("O04 → O05: my units, then a unit with its service shortcuts", async ({ page }) => {
  await signIn(page);
  await page.getByRole("navigation", { name: "تنقل المالك" }).getByRole("link", { name: "وحداتي" }).click();
  await expect(page).toHaveURL(/\/owner\/units$/);
  await page.getByRole("link", { name: /الوحدة 101A/ }).click();
  await expect(page).toHaveURL(/\/owner\/units\/115$/);
  await expect(page.getByRole("link", { name: "طلب خدمة" })).toBeVisible();
  await expect(page.getByRole("link", { name: "مطالبة ضمان" })).toBeVisible();
});

test("O06 → O08: reserve once, then see how to pay the fee", async ({ page }) => {
  await signIn(page);
  await page.goto("/owner/reserve/118");
  const reserve = page.waitForRequest((r) => r.method() === "POST" && r.url().endsWith("/bff/owner/reservations"));
  await page.getByRole("button", { name: "احجز الآن" }).click();
  const sent = await reserve;
  expect(sent.headers()["idempotency-key"]).toMatch(/^[0-9a-f-]{36}$/);
  expect(sent.postDataJSON()).toEqual({ unit_id: 118 });

  await expect(page).toHaveURL(/\/owner\/reservations\/42\/pay$/);
  // Online card payment is visible but not available yet.
  await expect(page.getByRole("button", { name: "الدفع الإلكتروني بالبطاقة" })).toBeDisabled();
  const initiate = page.waitForRequest((r) => r.method() === "POST" && r.url().endsWith("/bff/owner/payments/initiate"));
  await page.getByRole("button", { name: "اعرض طريقة الدفع" }).click();
  expect((await initiate).postDataJSON()).toEqual({ provider: "offline", reservation_id: 42 });
  await expect(page.getByText("الدفعة رقم 48")).toBeVisible();
});

test("O07: cancelling a pending reservation asks first", async ({ page }) => {
  await signIn(page);
  await page.goto("/owner/reservations");
  await page.getByRole("button", { name: "إلغاء الحجز" }).click();
  const dialog = page.getByRole("dialog", { name: "إلغاء هذا الحجز؟" });
  const cancel = page.waitForRequest((r) => r.method() === "POST" && r.url().endsWith("/bff/owner/reservations/42/cancel"));
  await dialog.getByRole("button", { name: "إلغاء الحجز" }).click();
  await cancel;
  await expect(page.getByText("تم إلغاء الحجز.")).toBeVisible();
});

test("O10: only the owner accepts the handover, with open items named", async ({ page }) => {
  await signIn(page);
  await page.goto("/owner/handover/54");
  await expect(page.getByText("Cracked floor tile near the sink", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "قبول مع ملاحظات مفتوحة" }).click();
  const dialog = page.getByRole("dialog", { name: "قبول الاستلام؟" });
  const accept = page.waitForRequest((r) => r.method() === "POST" && r.url().endsWith("/bff/owner/handovers/7/accept"));
  await dialog.getByRole("button", { name: "قبول مع ملاحظات مفتوحة" }).click();
  await accept;
});

test("O12: a new paid service request is sent once and opens its page", async ({ page }) => {
  await signIn(page);
  await page.goto("/owner/requests/new?unit=115");
  await page.getByRole("radio", { name: "خدمة مدفوعة" }).click();
  await page.getByLabel("الفئة").click();
  await page.getByRole("option", { name: "سباكة" }).click();
  await page.getByLabel("العنوان").fill("Leak under the kitchen sink");

  const create = page.waitForRequest((r) => r.method() === "POST" && r.url().endsWith("/bff/owner/service-requests"));
  await page.getByRole("button", { name: "إرسال الطلب" }).click();
  const sent = await create;
  expect(sent.headers()["idempotency-key"]).toMatch(/^[0-9a-f-]{36}$/);
  expect(sent.postDataJSON()).toEqual({ unit_id: 115, type: "paid", category: "plumbing", priority: "normal", title: "Leak under the kitchen sink" });
  await expect(page).toHaveURL(/\/owner\/requests\/20$/);
});

test("O15: tapping a notification marks it read and opens the request", async ({ page }) => {
  await signIn(page);
  await page.getByRole("navigation", { name: "تنقل المالك" }).getByRole("link", { name: "التنبيهات" }).click();
  const read = page.waitForRequest((r) => r.method() === "POST" && /\/bff\/owner\/notifications\/\d+\/read$/.test(r.url()));
  await page.getByRole("button", { name: /تعذّر قبول طلب الخدمة/ }).click();
  await read;
  await expect(page).toHaveURL(/\/owner\/requests\/22$/);
});
