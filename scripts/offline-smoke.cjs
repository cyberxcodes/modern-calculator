const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
(async () => {
  const browser = await chromium.launch({
    executablePath:
      process.env.ORBIT_BROWSER_PATH ||
      (fs.existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
    headless: true,
    args: ["--no-sandbox"],
  });
  try {
    const context = await browser.newContext();
    await context.route("**/api.frankfurter.dev/**", (r) =>
      r.fulfill({
        json: {
          base: "EUR",
          date: "2026-10-06",
          rates: { USD: 1.1, INR: 100, GBP: 0.85 },
        },
      }),
    );
    const page = await context.newPage(),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(
      process.env.ORBIT_TEST_URL || "http://127.0.0.1:4173/modern-calculator/",
    );
    await page.waitForFunction(
      () => Boolean(navigator.serviceWorker.controller),
      null,
      { timeout: 15000 },
    );
    const assets = await page.evaluate(async () => {
      const name = (await caches.keys()).find((n) => n.startsWith("orbit-"));
      return (await (await caches.open(name)).keys()).map(
        (r) => new URL(r.url).pathname,
      );
    });
    assert(assets.includes("/modern-calculator/index.html"));
    assert(assets.includes("/modern-calculator/manifest.webmanifest"));
    await page.locator('[data-quick="currencies"]').click();
    await page.waitForFunction(
      () =>
        document
          .querySelector("#currency-info")
          .textContent.includes("2026-10-06"),
      null,
      { timeout: 15000 },
    );
    await context.unroute("**/api.frankfurter.dev/**");
    await context.setOffline(true);
    await page.reload();
    await page.locator("#conversion-input").fill("2");
    assert.equal(
      await page.locator("#conversion-result").textContent(),
      "6.56167979",
    );
    await page.locator('[data-quick="currencies"]').click();
    await page.locator("#conversion-input").fill("10");
    assert.equal(
      await page.locator("#conversion-result").textContent(),
      "909.0909091",
    );
    assert.match(await page.locator("#currency-info").textContent(), /cached/);
    assert.deepEqual(errors, []);
    console.log(
      "Production subpath, precaching, offline reload, offline unit conversions and cached currency conversions passed.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
