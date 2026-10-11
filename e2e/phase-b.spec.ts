import { expect, test, type Page } from "@playwright/test";

// Phase B journeys in mock mode. The recorded staff user (#126) is "*"-permissioned and is the
// requester / first approver in the recorded examples, which exercises the four-eyes rules.

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("البريد الإلكتروني").fill("staff1@example.test");
  await page.getByLabel("كلمة المرور").fill("Synthetic-Pass-123");
  await page.getByRole("button", { name: "تسجيل الدخول" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "لوحة المعلومات" })).toBeVisible();
}

/** Ask the mock BFF for a specific recorded outcome on matching requests. */
async function mockStatus(page: Page, urlPart: string, method: string, status: number) {
  await page.route(`**${urlPart}`, (route) =>
    route.request().method() === method
      ? route.continue({ headers: { ...route.request().headers(), "x-mock-status": String(status) } })
      : route.continue(),
  );
}

test("S05: the requester cannot approve their own price change", async ({ page }) => {
  await signIn(page);
  await page.goto("/price-changes");
  await expect(page.getByText("لا يمكنك اعتماد طلبك بنفسك")).toBeVisible();
  const approve = page.getByRole("button", { name: "اعتماد" }).first();
  await expect(approve).toBeDisabled();
});

test("S12: reserve a unit, then record the fee as an offline payment", async ({ page }) => {
  await signIn(page);
  await page.goto("/reservations/new");

  const request = page.waitForRequest((r) => r.method() === "POST" && r.url().endsWith("/bff/staff/reservations"));
  await page.getByRole("combobox").fill("10");
  await page.getByRole("option").first().click();
  await page.getByLabel("رقم العميل").fill("93");
  await page.getByRole("button", { name: "حجز الوحدة" }).click();
  const sent = await request;
  expect(sent.headers()["idempotency-key"]).toMatch(/^[0-9a-f-]{36}$/);
  expect(sent.postDataJSON()).toMatchObject({ client_id: 93 });

  await expect(page.getByText("تم حجز الوحدة: الحجز رقم 38.").first()).toBeVisible();
  // Online card payment is visible but not available (no gateway chosen).
  await expect(page.getByRole("button", { name: "الدفع الإلكتروني بالبطاقة" })).toBeDisabled();
  await page.getByRole("button", { name: "تسجيل الرسوم (دفع غير إلكتروني)" }).click();
  await expect(page.getByText("أُنشئت الدفعة رقم 41")).toBeVisible();
});

test("S14 → S15: create a sale directly from a unit and land on its page", async ({ page }) => {
  await signIn(page);
  await page.goto("/sales/new");
  await page.getByRole("tab", { name: "مباشرة من وحدة" }).click();
  await page.getByRole("combobox").fill("10");
  await page.getByRole("option").first().click();
  await page.getByLabel("رقم العميل").fill("94");
  await page.getByLabel("السعر المتفق عليه (ريال)").fill("575000");
  await page.getByRole("button", { name: "التالي" }).click();

  const create = page.waitForRequest((r) => r.method() === "POST" && r.url().endsWith("/bff/staff/sales"));
  await page.getByRole("button", { name: "إنشاء البيع" }).click();
  expect((await create).postDataJSON()).toMatchObject({ client_id: 94, price_agreed: "575000.00" });
  await expect(page).toHaveURL(/\/sales\/54$/);
  await expect(page.getByRole("heading", { level: 1, name: "البيع رقم 54" })).toBeVisible();
});

test("S15: generating installments before the policy is set shows the calm not-configured state", async ({ page }) => {
  await signIn(page);
  await mockStatus(page, "/bff/staff/sales/54/installments/generate", "POST", 409);
  await page.goto("/sales/54");
  await page.getByRole("button", { name: "إنشاء جدول الدفعات" }).click();
  await expect(page.getByText("لم يُضبط بعد")).toBeVisible();
  await expect(page.getByText("D-07")).toBeVisible();
});

test("S06: import runs a dry run before it can commit", async ({ page }) => {
  await signIn(page);
  await page.goto("/units/import");
  await page.getByLabel("الصق CSV (السطر الأول = أسماء الأعمدة)").fill("crm_unit_id,unit_number,rooms,price_in_tax\n7006,101A,4,1");
  // The price column is stripped and reported.
  await expect(page.getByText("حُذفت أعمدة الأسعار (لا تتغير الأسعار إلا عبر الاعتماد): price_in_tax")).toBeVisible();
  const dry = page.waitForRequest((r) => r.method() === "POST" && r.url().endsWith("/bff/staff/units/import"));
  await page.getByRole("button", { name: "تشغيل الفحص التجريبي" }).click();
  expect((await dry).postDataJSON()).toEqual({ rows: [{ crm_unit_id: "7006", unit_number: "101A", rooms: "4" }] });
  await page.getByRole("button", { name: /^اعتماد/ }).click();
  await expect(page.getByText(/تم تحديث وحدة واحدة/).first()).toBeVisible();
});

test("S21: an inspected handover waits for the owner; staff cannot close it yet", async ({ page }) => {
  await signIn(page);
  await page.goto("/handovers/7");
  await expect(page.getByText("بانتظار قبول المالك من بوابة الملّاك")).toBeVisible();
  await expect(page.getByRole("button", { name: "إغلاق التسليم" })).toBeDisabled();
});
