import assert from "node:assert/strict";
import { pbkdf2Sync, randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright-core";

process.loadEnvFile?.(".env");

const baseUrl = process.env.E2E_BASE_URL || "http://localhost:3000";
const runId = Date.now().toString();
const prefix = `E2E-${runId}`;
const testPassword = `Audit-${runId}-Aa1!`;
const adminEmail = `audit-admin-${runId}@example.invalid`;
const salesEmail = `audit-sales-${runId}@example.invalid`;
const disposableMemberEmail = `audit-delete-${runId}@example.invalid`;
const customerPhone = `9${runId.slice(-9)}`;
const salesCustomerPhone = `8${runId.slice(-9)}`;
const testSkus = {
  quote: `${prefix}-QUOTE`,
  bulkA: `${prefix}-BULK-A`,
  bulkB: `${prefix}-BULK-B`,
  single: `${prefix}-SINGLE`
};

const supabase = createClient(
  requiredEnv("SUPABASE_URL"),
  requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const cleanupState = {
  memberIds: new Set(),
  productIds: new Set(),
  customerIds: new Set(),
  quotationIds: new Set()
};

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for E2E testing.`);
  return value;
}

function passwordHash(password) {
  const salt = randomBytes(16);
  const hash = pbkdf2Sync(password, salt, 210_000, 32, "sha256");
  return `pbkdf2:sha256:210000:${salt.toString("base64url")}:${hash.toString("base64url")}`;
}

function pass(message) {
  console.log(`PASS ${message}`);
}

async function insertTemporaryAdmin() {
  const { data, error } = await supabase
    .from("team_members")
    .insert({
      member_name: "E2E Audit Admin",
      phone_number: "9000000001",
      email: adminEmail,
      password_hash: passwordHash(testPassword),
      role: "Admin",
      branch_location: "E2E Audit",
      max_discount_percent: 100,
      status: "active"
    })
    .select("id")
    .single();

  if (error) throw error;
  cleanupState.memberIds.add(data.id);
}

async function login(page, email, password) {
  await page.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded" });
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await Promise.all([
    page.waitForURL(/\/dashboard$/, { timeout: 30_000 }),
    page.getByRole("button", { name: /^Login$/ }).click()
  ]);
}

async function logout(page) {
  await Promise.all([
    page.waitForURL(/\/login$/, { timeout: 30_000 }),
    page.locator("header").getByRole("button", { name: "Sign Out" }).click()
  ]);
}

async function createProduct(page, sku, name) {
  await page.goto(`${baseUrl}/products/new`);
  await page.getByLabel("Product ID").fill(sku);
  await page.getByLabel("Product Name").fill(name);
  await page.getByLabel("Unit Price").fill("125000");
  await page.getByRole("button", { name: "Link", exact: true }).click();
  await page
    .getByLabel("Product image link")
    .fill(`${baseUrl}/login%20image/span-logo-s.png`);
  await page.locator('img[alt="Product preview"]').waitFor();
  assert.equal(
    await page.locator('img[alt="Product preview"]').evaluate((image) => image.naturalWidth > 0),
    true,
    "Product link preview did not load"
  );

  await Promise.all([
    page.waitForURL(/\/products$/, { timeout: 30_000 }),
    page.getByRole("button", { name: "Save Product" }).click()
  ]);

  const { data, error } = await supabase
    .from("products")
    .select("id")
    .eq("sku", sku)
    .single();
  if (error) throw error;
  cleanupState.productIds.add(data.id);
  return data.id;
}

async function addMember(page, input) {
  await page.goto(`${baseUrl}/members`);
  await page.locator("#member-name").fill(input.name);
  await page.locator("#member-phone").fill(input.phone);
  await page.locator("#member-email").fill(input.email);
  await page.locator("#member-password").fill(input.password);
  await page.locator("#member-role").selectOption(input.role);
  await page.locator("#member-branch").fill("E2E Branch");
  await page.locator("#member-max-discount").fill(String(input.maxDiscount));
  await page.locator("#member-status").selectOption("active");

  await page.getByRole("button", { name: "Add Member" }).click();
  await page
    .locator("tr")
    .filter({ hasText: input.email })
    .waitFor({ state: "visible", timeout: 30_000 });

  const { data, error } = await supabase
    .from("team_members")
    .select("id")
    .eq("email", input.email)
    .single();
  if (error) throw error;
  cleanupState.memberIds.add(data.id);
  return data.id;
}

async function selectQuotationProduct(page, productName) {
  await page.getByRole("button", { name: "Add product row" }).click();
  const searchInput = page.locator(
    'input[placeholder="Search Product ID or Product Name"]:visible'
  );

  if (!(await searchInput.count())) {
    await page.locator('button[title="Select Product"]:visible').click();
  }

  await searchInput.fill(productName);
  await page.locator("button:visible").filter({ hasText: productName }).last().click();
}

async function createQuotationForExistingCustomer(page, customerId, productName) {
  await page.goto(`${baseUrl}/quotations/new`);
  assert.match(
    await page.getByRole("button", { name: "New", exact: true }).getAttribute("class"),
    /bg-mist/,
    "New customer mode is not selected by default"
  );
  await page.getByRole("button", { name: "Existing", exact: true }).click();
  await page.getByLabel("Select Customer").selectOption(customerId);
  await selectQuotationProduct(page, productName);

  await Promise.all([
    page.waitForURL(/\/quotations\/[0-9a-f-]+\/preview$/, { timeout: 45_000 }),
    page.getByRole("button", { name: "Create Quotation" }).last().click()
  ]);

  return page.url().match(/\/quotations\/([0-9a-f-]+)\/preview$/)?.[1];
}

async function createQuotationAsSalesMember(page, productName) {
  await page.goto(`${baseUrl}/quotations/new`);
  await page.locator('[name="new_phone"]').fill(salesCustomerPhone);
  await page.locator('[name="new_suffix"]').selectOption("M/S");
  await page.locator('[name="new_customer_name"]').fill(`${prefix} Sales Customer`);
  await selectQuotationProduct(page, productName);

  const productRow = page.locator("table tbody tr").first();
  const discountInput = productRow.locator('input[type="number"]').nth(1);
  await discountInput.fill("49");
  await discountInput.blur();
  assert.equal(await discountInput.inputValue(), "10");
  await page
    .locator("p:visible")
    .filter({ hasText: "Maximum discount applicable is 10%." })
    .waitFor();

  await Promise.all([
    page.waitForURL(/\/quotations\/[0-9a-f-]+\/preview$/, { timeout: 45_000 }),
    page.getByRole("button", { name: "Create Quotation" }).last().click()
  ]);

  return page.url().match(/\/quotations\/([0-9a-f-]+)\/preview$/)?.[1];
}

async function confirmDeletion(page, dialogTitle, confirm) {
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("heading", { name: dialogTitle }).waitFor();
  await dialog
    .getByRole("button", { name: confirm ? "Delete" : "Cancel", exact: true })
    .click();
}

async function cleanup() {
  const quotationIds = Array.from(cleanupState.quotationIds);
  if (quotationIds.length) {
    const { data } = await supabase
      .from("quotations")
      .select("id, pdf_path, excel_path")
      .in("id", quotationIds);

    const pdfPaths = (data || []).map((item) => item.pdf_path).filter(Boolean);
    const excelPaths = (data || []).map((item) => item.excel_path).filter(Boolean);
    if (pdfPaths.length) await supabase.storage.from("quotation-pdfs").remove(pdfPaths);
    if (excelPaths.length) await supabase.storage.from("quotation-excels").remove(excelPaths);
    await supabase.from("quotations").delete().in("id", quotationIds);
  }

  const customerIds = Array.from(cleanupState.customerIds);
  if (customerIds.length) await supabase.from("customers").delete().in("id", customerIds);
  await supabase
    .from("customers")
    .delete()
    .in("phone", [customerPhone, salesCustomerPhone]);

  const productIds = Array.from(cleanupState.productIds);
  if (productIds.length) await supabase.from("products").delete().in("id", productIds);

  const memberIds = Array.from(cleanupState.memberIds);
  if (memberIds.length) {
    await supabase.from("activity_logs").delete().in("user_id", memberIds);
    await supabase.from("team_members").delete().in("id", memberIds);
  }
}

async function run() {
  await insertTemporaryAdmin();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    acceptDownloads: true,
    viewport: { width: 1440, height: 1000 }
  });
  const page = await context.newPage();
  const browserErrors = [];

  page.on("pageerror", (error) => browserErrors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(`console: ${message.text()}`);
  });

  try {
    await page.goto(`${baseUrl}/dashboard`);
    assert.match(page.url(), /\/login/);
    pass("unauthenticated protected-route redirect");

    await login(page, adminEmail, testPassword);
    pass("custom member authentication");

    const smokeRoutes = [
      "/dashboard",
      "/products",
      "/brands",
      "/categories",
      "/customers",
      "/quotations",
      "/members",
      "/image-to-link",
      "/settings/company",
      "/settings/terms",
      "/settings/profile"
    ];

    for (const route of smokeRoutes) {
      const response = await page.goto(`${baseUrl}${route}`, {
        waitUntil: "domcontentloaded",
        timeout: 30_000
      });
      assert.equal(response?.status(), 200, `${route} did not return HTTP 200`);
      assert.equal(
        await page.getByText("Something Went Wrong", { exact: true }).count(),
        0,
        `${route} rendered the error boundary`
      );
    }
    pass("all authenticated application routes");

    const quoteProductName = `${prefix} Quote Product`;
    await createProduct(page, testSkus.quote, quoteProductName);
    await createProduct(page, testSkus.bulkA, `${prefix} Bulk Product A`);
    await createProduct(page, testSkus.bulkB, `${prefix} Bulk Product B`);
    await createProduct(page, testSkus.single, `${prefix} Single Product`);
    pass("product creation and linked-image preview");

    await page.goto(`${baseUrl}/products?q=${encodeURIComponent(prefix)}`);
    const singleRow = page.locator("tr").filter({ hasText: `${prefix} Single Product` });
    await singleRow.getByTitle("Delete product").click();
    await confirmDeletion(page, "Delete this product?", false);
    await singleRow.getByTitle("Delete product").click();
    await confirmDeletion(page, "Delete this product?", true);
    await singleRow.waitFor({ state: "detached" });
    pass("single-product delete confirmation");

    assert.equal(
      await page.locator('tr input[type="checkbox"]').count(),
      0,
      "Product selection checkboxes were visible before Select mode"
    );
    await page.getByRole("button", { name: "Select", exact: true }).click();

    for (const name of [`${prefix} Bulk Product A`, `${prefix} Bulk Product B`]) {
      const row = page.locator("tr").filter({ hasText: name });
      await row.getByLabel(`Select ${name}`).check();
    }
    await page.getByRole("button", { name: "Delete Selected" }).click();
    await confirmDeletion(page, "Delete 2 selected products?", false);
    await page.getByRole("button", { name: "Delete Selected" }).click();
    await confirmDeletion(page, "Delete 2 selected products?", true);
    await page
      .locator("tr")
      .filter({ hasText: `${prefix} Bulk Product A` })
      .waitFor({ state: "detached" });
    pass("bulk-product selection and delete confirmation");

    await page.goto(`${baseUrl}/customers/new`);
    const customerPhoneInput = page.locator('[name="phone"]');
    await customerPhoneInput.fill("123456789");
    await page.getByRole("button", { name: "Save Customer" }).click();
    assert.match(
      await customerPhoneInput.evaluate((input) => input.validationMessage),
      /10 digits/i
    );
    await customerPhoneInput.fill(customerPhone);
    await page.locator('[name="suffix"]').selectOption("Dr");
    await page.locator('[name="customer_name"]').fill(`${prefix} Customer`);
    await page.locator('[name="email"]').fill(`customer-${runId}@example.invalid`);
    await page.locator('[name="state"]').selectOption("Andhra Pradesh");
    await page.locator('[name="city"]').selectOption("Visakhapatnam");
    await page.locator('[name="pincode"]').fill("530016");
    await page.locator('[name="address"]').fill("Seethammapeta Junction");
    await page.locator('[name="gst_number"]').fill("37ABCDE1234F1Z5");
    await Promise.all([
      page.waitForURL(/\/customers$/, { timeout: 30_000 }),
      page.getByRole("button", { name: "Save Customer" }).click()
    ]);
    const customerResult = await supabase
      .from("customers")
      .select("id, suffix")
      .eq("phone", customerPhone)
      .single();
    if (customerResult.error) throw customerResult.error;
    assert.equal(customerResult.data.suffix, "Dr");
    cleanupState.customerIds.add(customerResult.data.id);
    pass("customer phone validation and suffix persistence");

    const quotationId = await createQuotationForExistingCustomer(
      page,
      customerResult.data.id,
      quoteProductName
    );
    assert.ok(quotationId, "Quotation ID was not present after creation");
    cleanupState.quotationIds.add(quotationId);
    await page
      .frameLocator("iframe")
      .getByText(`${prefix} Customer`, { exact: false })
      .waitFor();
    pass("quotation creation and HTML preview");

    const excelResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/api/quotations/${quotationId}/excel`) &&
        response.request().method() === "POST",
      { timeout: 60_000 }
    );
    await page.getByRole("button", { name: "Download Excel" }).click();
    const excelResponse = await excelResponsePromise;
    assert.equal(excelResponse.status(), 200);
    const excelResult = await excelResponse.json();
    const excelFile = await context.request.get(excelResult.url);
    assert.equal(excelFile.status(), 200);
    assert.equal((await excelFile.body()).subarray(0, 2).toString(), "PK");
    pass("Excel generation, storage, and signed download");

    const pdfDownloadPromise = page.waitForEvent("download", { timeout: 120_000 });
    await page.getByRole("button", { name: "Download PDF" }).click();
    const pdfDownload = await pdfDownloadPromise;
    const pdfPath = await pdfDownload.path();
    assert.ok(pdfPath, "Browser PDF download did not create a local file");
    assert.equal((await readFile(pdfPath)).subarray(0, 4).toString(), "%PDF");
    pass("preview-matched browser PDF download");

    await page.goto(`${baseUrl}/quotations`);
    const visibleQuoteNumber = await page
      .locator(`a[href="/quotations/${quotationId}"]`)
      .first()
      .textContent();
    const quoteRowByNumber = page.locator("tr").filter({ hasText: visibleQuoteNumber.trim() });
    await quoteRowByNumber.getByTitle("Delete").click();
    await confirmDeletion(page, "Delete this quotation?", false);
    await quoteRowByNumber.getByTitle("Delete").click();
    await confirmDeletion(page, "Delete this quotation?", true);
    await page.waitForURL(/\/quotations$/);
    cleanupState.quotationIds.delete(quotationId);
    pass("quotation delete confirmation and file cleanup action");

    await page.goto(`${baseUrl}/customers?q=${encodeURIComponent(customerPhone)}`);
    const customerCardOrRow = page.locator("tr").filter({ hasText: customerPhone });
    await customerCardOrRow.getByLabel(`Delete Dr ${prefix} Customer`).click();
    await confirmDeletion(page, "Delete this customer?", false);
    await customerCardOrRow.getByLabel(`Delete Dr ${prefix} Customer`).click();
    await confirmDeletion(page, "Delete this customer?", true);
    await customerCardOrRow.waitFor({ state: "detached" });
    cleanupState.customerIds.delete(customerResult.data.id);
    pass("customer delete confirmation");

    const disposableMemberId = await addMember(page, {
      name: `${prefix} Disposable Member`,
      phone: "9000000002",
      email: disposableMemberEmail,
      password: testPassword,
      role: "Sales Executive",
      maxDiscount: 10
    });
    const memberRow = page.locator("tr").filter({ hasText: disposableMemberEmail });
    await memberRow.getByLabel(`Delete ${prefix} Disposable Member`).click();
    await confirmDeletion(page, "Delete this member?", false);
    await memberRow.getByLabel(`Delete ${prefix} Disposable Member`).click();
    await confirmDeletion(page, "Delete this member?", true);
    await memberRow.waitFor({ state: "detached" });
    cleanupState.memberIds.delete(disposableMemberId);
    pass("member delete confirmation");

    const salesMemberId = await addMember(page, {
      name: `${prefix} Sales Member`,
      phone: "9000000003",
      email: salesEmail,
      password: testPassword,
      role: "Sales Executive",
      maxDiscount: 10
    });

    await logout(page);
    await login(page, salesEmail, testPassword);
    await page.goto(`${baseUrl}/members`);
    await page.waitForURL(/\/dashboard$/);
    pass("non-admin member route restriction");

    const salesQuotationId = await createQuotationAsSalesMember(page, quoteProductName);
    assert.ok(salesQuotationId);
    cleanupState.quotationIds.add(salesQuotationId);
    pass("member quotation and maximum-discount enforcement");

    await page.setViewportSize({ width: 390, height: 844 });
    for (const route of ["/dashboard", "/products", "/customers", "/quotations", "/quotations/new"]) {
      await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded" });
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth
      );
      assert.ok(overflow <= 1, `${route} has ${overflow}px horizontal overflow on mobile`);
    }
    pass("mobile responsive overflow checks");

    await supabase.from("team_members").update({ status: "inactive" }).eq("id", salesMemberId);
    await page.goto(`${baseUrl}/dashboard`);
    await page.waitForURL(/\/login\?error=session_expired$/);
    pass("immediate deactivated-member session invalidation");

    assert.deepEqual(browserErrors, [], browserErrors.join("\n"));
    pass("no browser console or page errors");
  } finally {
    await context.close();
    await browser.close();
  }
}

try {
  await run();
} finally {
  await cleanup();
}
