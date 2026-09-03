import { chromium } from "playwright";

const BASE = "http://127.0.0.1:8080";

async function dump(page, name) {
  await page.screenshot({ path: `/workspace/screenshots/${name}.png`, fullPage: true });
  const t = (await page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 800);
  console.log(`--- ${name} --- ${t}`);
}

async function waitReady(page) {
  await page.waitForTimeout(1500);
  for (let i = 0; i < 20; i++) {
    const t = await page.locator("body").innerText().catch(() => "");
    if (t && !t.includes("Loading") && t.length > 40) return t;
    await page.waitForTimeout(500);
  }
  return page.locator("body").innerText();
}

async function main() {
  const browser = await chromium.launch({
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(25000);

  await page.goto(`${BASE}/office`, { waitUntil: "domcontentloaded" });
  let body = await waitReady(page);
  await dump(page, "till-office-1");

  const lower = body.toLowerCase();
  if (lower.includes("password") || lower.includes("unlock")) {
    const pw = page.locator('input[type="password"]');
    if (await pw.count()) {
      await pw.fill("ButtyOffice8");
      const unlock = page.getByRole("button", { name: /Unlock/i });
      await unlock.click();
      await page.waitForTimeout(1500);
      body = await waitReady(page);
      await dump(page, "till-office-2");
    }
  }

  const staffBtn = page.getByRole("button", { name: /^Staff$/ });
  if (await staffBtn.count()) {
    await staffBtn.click();
  } else {
    // try clicking by text
    await page.getByText("Staff", { exact: true }).click();
  }
  await page.waitForTimeout(800);
  await dump(page, "till-office-staff");

  const addMaya = async (who, pin, role) => {
    await page.getByPlaceholder("Name").first().fill(who);
    await page.getByPlaceholder("Code").first().fill(pin);
    await page.locator("select").first().selectOption(role);
    await page.getByRole("button", { name: "Add" }).click();
    await page.waitForTimeout(700);
  };
  body = await page.locator("body").innerText();
  if (!body.includes("Maya")) await addMaya("Maya", "1234", "cashier");
  if (!body.includes("Jules")) await addMaya("Jules", "5678", "manager");
  // reload list
  body = await page.locator("body").innerText();
  await dump(page, "till-office-added");
  body = await page.locator("body").innerText();
  if (!body.includes("Maya") || !body.includes("Jules")) {
    throw new Error("staff not listed after add: " + body.slice(0, 400));
  }
  console.log("office: added Maya + Jules");

  await page.goto(`${BASE}/counter`, { waitUntil: "domcontentloaded" });
  body = await waitReady(page);
  await dump(page, "till-counter-1");

  // pick Maya
  await page.getByRole("button", { name: /Maya/ }).last().click();
  await page.waitForTimeout(400);
  await dump(page, "till-maya-pin");
  for (const d of ["1", "2", "3", "4"]) {
    await page.getByRole("button", { name: d, exact: true }).click();
  }
  await page.waitForTimeout(1200);
  await dump(page, "till-maya-in");
  body = await page.locator("body").innerText();
  if (!body.includes("Maya") || !body.includes("Clock out")) {
    throw new Error("clock-in failed: " + body.slice(0, 500));
  }
  console.log("clock-in Maya ok");

  // ticket — open customise if needed
  const item = page.locator("button").filter({ hasText: "£" }).first();
  await item.click();
  await page.waitForTimeout(400);
  const addBtn = page.getByRole("button", { name: /Add to ticket/ });
  if (await addBtn.count()) await addBtn.click();
  await page.getByPlaceholder("Name on ticket").fill("Walk-in Pat");
  await page.waitForTimeout(200);
  await page.getByRole("button", { name: /Send to kitchen/ }).click();
  await page.getByText("Sent to kitchen").waitFor({ timeout: 15000 });
  await page.getByRole("button", { name: "Next customer" }).click();
  await page.waitForTimeout(500);
  await dump(page, "till-ticket");
  body = await page.locator("body").innerText();
  if (!body.includes("Walk-in Pat")) throw new Error("ticket not in live queue");
  console.log("ticket in live queue");

  await page.getByRole("button", { name: "Switch" }).click();
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: /Jules/ }).last().click();
  for (const d of ["5", "6", "7", "8"]) {
    await page.getByRole("button", { name: d, exact: true }).click();
  }
  await page.waitForTimeout(1200);
  await dump(page, "till-jules");
  body = await page.locator("body").innerText();
  if (!body.includes("Jules")) throw new Error("switch failed");
  if (!body.includes("Walk-in Pat")) throw new Error("queue lost after switch");
  console.log("switch Jules, queue intact");

  await page.getByRole("button", { name: "Lock", exact: true }).click();
  await page.waitForTimeout(400);
  await dump(page, "till-locked");
  body = await page.locator("body").innerText();
  if (!body.includes("Till locked")) throw new Error("lock overlay missing");
  for (const d of ["5", "6", "7", "8"]) {
    await page.getByRole("button", { name: d, exact: true }).click();
  }
  await page.waitForTimeout(1000);
  body = await page.locator("body").innerText();
  if (!body.includes("Clock out")) throw new Error("unlock failed");
  console.log("lock/unlock ok");

  if (await page.getByRole("button", { name: "Void" }).count()) {
    await page.getByRole("button", { name: "Void" }).first().click();
    await page.waitForTimeout(300);
    await page.getByRole("button", { name: "Void", exact: true }).last().click();
    await page.waitForTimeout(800);
    console.log("void clicked");
  }

  await page.getByRole("button", { name: "Clock out" }).click();
  await page.waitForTimeout(800);
  await dump(page, "till-totals");
  body = await page.locator("body").innerText();
  if (!/shift over/i.test(body)) throw new Error("no totals: " + body.slice(0, 400));
  await page.getByRole("button", { name: "Done" }).click();
  await page.waitForTimeout(600);
  await dump(page, "till-after-out");
  body = await page.locator("body").innerText();
  if (!body.includes("Maya")) throw new Error("Maya not on roster after Jules out");
  console.log("clock-out totals + Maya still on roster");

  console.log("QA_OK");
  await browser.close();
}

main().catch(async (e) => {
  console.error("QA_FAIL", e);
  process.exit(1);
});
