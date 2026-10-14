import { expect, test, type Page } from "@playwright/test";

// Inventory journeys in mock mode, answered from the recorded Frontend Guide and API brief
// addendum (projects, features, unit templates, floors).

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("البريد الإلكتروني").fill("staff1@example.test");
  await page.getByLabel("كلمة المرور").fill("Synthetic-Pass-123");
  await page.getByRole("button", { name: "تسجيل الدخول" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "لوحة المعلومات" })).toBeVisible();
}

/** Open a Radix select by its accessible name and pick an option. */
async function choose(page: Page, scope: ReturnType<Page["getByRole"]>, name: string, option: string | RegExp) {
  await scope.getByRole("combobox", { name, exact: true }).click();
  await page.getByRole("option", { name: option }).click();
}

test("S08: a project row opens the project page, which leads to its buildings and units", async ({ page }) => {
  await signIn(page);
  await page.goto("/projects");
  await page.getByRole("row", { name: "مشروع الواحة" }).click();
  // The project page is a dynamic route: under a loaded test machine its first load can take a while.
  await expect(page).toHaveURL(/\/projects\/80$/, { timeout: 20_000 });
  // Full project detail (recorded GET /projects/{id}).
  await expect(page.getByRole("heading", { level: 1, name: "واحة الرياض" })).toBeVisible();
  await expect(page.getByText("LIC-2026-114")).toBeVisible();
  await expect(page.getByText("المرحلة الثانية")).toBeVisible();

  await page.getByRole("main").getByRole("link", { name: "الوحدات", exact: true }).first().click();
  await expect(page).toHaveURL(/\/units\?project=928/);
});

test("S08: a featured project needs a feature; the form sends every project field", async ({ page }) => {
  await signIn(page);
  await page.goto("/projects");
  await page.getByRole("button", { name: "مشروع جديد" }).click();
  const sheet = page.getByRole("dialog");
  await sheet.getByLabel("الاسم (عربي)").fill("واحة الرياض");
  await sheet.getByLabel("الاسم (إنجليزي)").fill("Riyadh Oasis");
  await sheet.getByLabel("رقم الترخيص").fill("LIC-2026-114");
  await sheet.getByRole("checkbox", { name: "مميز", exact: true }).check();
  await sheet.getByRole("button", { name: "إنشاء" }).click();
  await expect(sheet.getByText("المشروع المميز يحتاج ميزة واحدة على الأقل.")).toBeVisible();

  await sheet.getByRole("checkbox", { name: "مسبح" }).check();
  const post = page.waitForRequest((r) => r.method() === "POST" && r.url().endsWith("/bff/staff/projects"));
  await sheet.getByRole("button", { name: "إنشاء" }).click();
  expect((await post).postDataJSON()).toMatchObject({ nameEn: "Riyadh Oasis", license_num: "LIC-2026-114", featured: true, features: [33] });
  await expect(page).toHaveURL(/\/projects\/928$/);
});

test("S09: a new building places unit templates on its floors in one request", async ({ page }) => {
  await signIn(page);
  await page.goto("/buildings");
  await page.getByRole("button", { name: "مبنى جديد" }).click();
  const sheet = page.getByRole("dialog");
  await choose(page, sheet, "المشروع", "مشروع الواحة");
  await sheet.getByLabel("رمز المبنى").fill("B1");

  await sheet.getByRole("button", { name: "إضافة دور" }).click();
  await choose(page, sheet, "نموذج الوحدة", /^A2/);
  await sheet.getByRole("button", { name: "إضافة دور" }).click();
  await sheet.getByRole("button", { name: "نطاق أدوار" }).last().click();
  await sheet.getByLabel("إلى الدور").fill("3");
  await sheet.getByRole("combobox", { name: "نموذج الوحدة", exact: true }).last().click();
  await page.getByRole("option", { name: /^A3/ }).click();
  await sheet.getByRole("textbox", { name: "الوحدات", exact: true }).last().fill("2");

  const post = page.waitForRequest((r) => r.method() === "POST" && r.url().endsWith("/bff/staff/buildings/with-floors"));
  await sheet.getByRole("button", { name: "إنشاء 7 وحدات" }).click();
  expect((await post).postDataJSON()).toMatchObject({
    project_id: 80,
    building_code: "B1",
    floors_count: 3,
    floors: [
      { floor_num: 0, templates: [{ template_id: 55, count: 1 }] },
      { floor_from: 1, floor_to: 3, templates: [{ template_id: 54, count: 2 }] },
    ],
  });
  await expect(page).toHaveURL(/\/buildings\/927$/);
});

test("S09: the building page shows floors by template and duplicates the building", async ({ page }) => {
  await signIn(page);
  await page.goto("/buildings/79");
  await expect(page.getByText("الدور 1", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "3", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "تكرار" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("عدد النسخ").fill("2");
  await dialog.getByLabel("نمط رمز المبنى").fill("A-C{n}");
  const post = page.waitForRequest((r) => r.method() === "POST" && r.url().endsWith("/bff/staff/buildings/79/clone"));
  await dialog.getByRole("button", { name: "تكرار" }).click();
  expect((await post).postDataJSON()).toEqual({ copies: 2, building_code_pattern: "A-C{n}" });
  await expect(dialog.getByRole("link", { name: "A-C2" })).toBeVisible();
});

test("S03: a new unit comes from a template, on a chosen building and floor", async ({ page }) => {
  await signIn(page);
  await page.goto("/units");
  await page.getByRole("button", { name: "إضافة وحدة" }).click();
  const dialog = page.getByRole("dialog");
  await choose(page, dialog, "نموذج الوحدة", /^A3/);
  await choose(page, dialog, "المبنى", "مبنى A");
  await dialog.getByRole("textbox", { name: "الدور", exact: true }).fill("6");
  await dialog.getByLabel("رقم الوحدة").fill("1");
  const post = page.waitForRequest((r) => r.method() === "POST" && r.url().endsWith("/bff/staff/unit-templates/54/units"));
  await dialog.getByRole("button", { name: "إضافة الوحدة" }).click();
  expect((await post).postDataJSON()).toEqual({ building_id: 79, units: [{ unit_code: "A-F6-U1", unit_number: "1", floor_num: 6 }] });
  await expect(page.getByText("تم إنشاء الوحدة.")).toBeVisible();
});

test("S04: quick-add a unit feature, then save the unit's features", async ({ page }) => {
  await signIn(page);
  await page.goto("/units/116");
  const card = page.locator("section", { has: page.getByRole("heading", { name: "مزايا الوحدة" }) });
  await card.getByLabel("ابحث في المزايا").fill("Balcony");
  await card.getByRole("button", { name: "ميزة جديدة «Balcony»" }).click();
  await card.getByLabel("الاسم بالعربية").fill("شرفة");
  const create = page.waitForRequest((r) => r.method() === "POST" && r.url().endsWith("/bff/staff/features"));
  await card.getByRole("button", { name: "إضافة", exact: true }).click();
  expect((await create).postDataJSON()).toEqual({ nameAr: "شرفة", nameEn: "Balcony", feature_type: "unit" });

  const put = page.waitForRequest((r) => r.method() === "PUT" && r.url().endsWith("/bff/staff/units/116/features"));
  await card.getByRole("button", { name: "حفظ" }).click();
  expect((await put).postDataJSON()).toEqual({ feature_ids: [34, 33] });
});

test("S08: project images show as a gallery with a viewer, documents as cards", async ({ page }) => {
  // Stand-in images for the stored paths (the mock has no files).
  await page.route("**/bff/media/**", (route) => {
    const hue = route.request().url().includes("aerial") ? 200 : 30;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900"><defs><linearGradient id="g" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue} 60% 55%)"/><stop offset="1" stop-color="hsl(${hue + 40} 50% 30%)"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`;
    return route.fulfill({ contentType: "image/svg+xml", body: svg });
  });
  await signIn(page);
  await page.goto("/projects/928");
  await expect(page.getByText("الغلاف")).toBeVisible();
  await expect(page.getByRole("link", { name: /License/ })).toHaveAttribute("href", "/bff/media/docs/license.pdf");
  await page.screenshot({ path: "test-results/project-gallery.png", fullPage: true });

  await page.getByRole("button", { name: "عرض الصورة 1 من 2" }).first().click();
  const viewer = page.getByRole("dialog");
  await expect(viewer.getByText("1 / 2")).toBeVisible();
  await viewer.getByRole("button", { name: "الصورة التالية" }).click();
  await expect(viewer.getByText("2 / 2")).toBeVisible();
  await page.screenshot({ path: "test-results/project-gallery-viewer.png" });
});

test("S25: the template sheet is wide and shows its images and plans as thumbnails", async ({ page }) => {
  await page.route("**/bff/media/**", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="100%" height="100%" fill="hsl(160 40% 45%)"/></svg>`,
    }),
  );
  await signIn(page);
  await page.goto("/unit-templates");
  await page.getByRole("row", { name: "A3" }).click();
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByText("a.jpg")).toBeVisible();
  await expect(sheet.getByText("p.png")).toBeVisible();
  const box = await sheet.boundingBox();
  expect(box?.width ?? 0).toBeGreaterThan(900);
  await page.screenshot({ path: "test-results/template-sheet.png" });

  // Adding an image shows it at once; removing takes it away.
  await sheet.getByRole("textbox", { name: "الصور" }).fill("images/new.png");
  await sheet.getByRole("button", { name: "إضافة", exact: true }).first().click();
  await expect(sheet.getByText("new.png")).toBeVisible();
  await sheet.getByRole("button", { name: "إزالة new.png" }).click();
  await expect(sheet.getByText("new.png")).toHaveCount(0);
});
