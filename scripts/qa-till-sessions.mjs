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

async function tapPin(page, digits) {
  for (const d of digits) {
    await page.getByRole("button", { name: d, exact: true }).click();
  }
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
    await page.getByText("Staff", { exact: true }).click();
  }
  await page.waitForTimeout(800);
  await dump(page, "till-office-staff");

  const addPerson = async (who, pin, role) => {
    await page.getByPlaceholder("Name").first().fill(who);
    await page.getByPlaceholder("Code").first().fill(pin);
    await page.locator("select").first().selectOption(role);
    await page.getByRole("button", { name: "Add" }).click();
    await page.waitForTimeout(700);
  };
  body = await page.locator("body").innerText();
  if (!body.includes("Maya")) await addPerson("Maya", "1234", "cashier");
  if (!body.includes("Jules")) await addPerson("Jules", "5678", "manager");
  await addPerson("Maya", "4321", "cashier");
  await dump(page, "till-office-dup");
  body = await page.locator("body").innerText();
  const mayaCount = (body.match(/Maya/g) || []).length;
  if (mayaCount < 2) throw new Error("duplicate name not saved: " + body.slice(0, 400));

  await addPerson("Alex", "1234", "cashier");
  await page.waitForTimeout(400);
  body = await page.locator("body").innerText();
  if (!/already in use/i.test(body)) {
    throw new Error("duplicate PIN not blocked: " + body.slice(0, 400));
  }
  console.log("office: Maya x2 + Jules, duplicate PIN blocked");

  await page.goto(`${BASE}/counter`, { waitUntil: "domcontentloaded" });
  body = await waitReady(page);
  await dump(page, "till-counter-1");
  if (!body.includes("#01") && !body.includes("#1")) {
    // staff codes should show on the clock-in grid
    if (!/#0?\d/.test(body)) throw new Error("staff IDs missing on grid: " + body.slice(0, 400));
  }

  await page.getByRole("button", { name: /Maya/ }).first().click();
  await page.waitForTimeout(400);
  await dump(page, "till-maya-pin");
  await tapPin(page, ["1", "2", "3", "4"]);
  await page.waitForTimeout(1200);
  await dump(page, "till-maya-in");
  body = await page.locator("body").innerText();
  if (!body.includes("Maya") || !body.includes("Clock out")) {
    throw new Error("clock-in failed: " + body.slice(0, 500));
  }
  console.log("clock-in Maya ok");

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
  await tapPin(page, ["5", "6", "7", "8"]);
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
  await tapPin(page, ["5", "6", "7", "8"]);
  await page.waitForTimeout(1000);
  body = await page.locator("body").innerText();
  if (!body.includes("Clock out")) throw new Error("unlock failed");
  console.log("lock/unlock ok");

  await page.getByRole("button", { name: "Clock out" }).click();
  await page.waitForTimeout(400);
  await dump(page, "till-out-pin");
  body = await page.locator("body").innerText();
  if (!/enter your code/i.test(body)) throw new Error("clock-out PIN missing: " + body.slice(0, 400));
  await tapPin(page, ["5", "6", "7", "8"]);
  await page.getByText("Confirm clock out").waitFor({ timeout: 10000 });
  await dump(page, "till-out-confirm");
  body = await page.locator("body").innerText();
  if (!body.includes("Jules") || !/ticket/i.test(body)) {
    throw new Error("confirm sheet missing name/tickets: " + body.slice(0, 400));
  }
  await page.getByRole("button", { name: "Clock out", exact: true }).last().click();
  await page.getByText(/shift over/i).waitFor({ timeout: 10000 });
  await dump(page, "till-totals");
  await page.getByRole("button", { name: "Done" }).click();
  await page.waitForTimeout(600);
  await dump(page, "till-after-out");
  body = await page.locator("body").innerText();
  if (!body.includes("Maya")) throw new Error("Maya not on roster after Jules out");
  console.log("clock-out PIN + confirm + Maya still on roster");

  await page.getByRole("button", { name: /Jules/ }).last().click();
  await tapPin(page, ["5", "6", "7", "8"]);
  await page.waitForTimeout(1200);
  await page.getByRole("button", { name: "Team" }).click();
  await page.waitForTimeout(400);
  await dump(page, "till-team");
  const forceBtn = page.getByRole("button", { name: "Clock out" }).nth(1);
  // Team sheet Clock out for Maya (header also has Clock out)
  const teamClock = page.locator(".fixed").getByRole("button", { name: "Clock out" });
  if (await teamClock.count()) {
    await teamClock.first().click();
  } else {
    await forceBtn.click();
  }
  await page.waitForTimeout(400);
  body = await page.locator("body").innerText();
  if (!/manager/i.test(body)) throw new Error("manager PIN prompt missing: " + body.slice(0, 400));
  await tapPin(page, ["5", "6", "7", "8"]);
  await page.waitForTimeout(1000);
  await dump(page, "till-force-out");
  console.log("force clock-out with manager PIN");

  console.log("QA_OK");
  await browser.close();
}

main().catch(async (e) => {
  console.error("QA_FAIL", e);
  process.exit(1);
});
