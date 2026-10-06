const { chromium } = require("playwright");
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({
    executablePath:
      process.env.ORBIT_BROWSER_PATH ||
      (require("node:fs").existsSync("/usr/bin/chromium")
        ? "/usr/bin/chromium"
        : undefined),
    headless: true,
    args: ["--no-sandbox"],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    permissions: ["clipboard-read", "clipboard-write"],
  });
  await context.route("**/api.frankfurter.dev/**", (route) =>
    route.fulfill({
      json: {
        base: "EUR",
        date: "2026-10-06",
        rates: { USD: 1.1, INR: 100, GBP: 0.85, JPY: 160 },
      },
    }),
  );
  const page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(
    process.env.ORBIT_TEST_URL || "http://127.0.0.1:5173/modern-calculator/",
  );
  assert.equal(
    await page.locator("#conversion-result").textContent(),
    "3.280839895",
  );
  await page.locator("#conversion-input").fill("12 × 3");
  assert.equal(
    await page.locator("#conversion-result").textContent(),
    "118.1102362",
  );
  await page.locator("#favorite-pair").click();
  await page.locator("#save-conversion").click();
  assert.equal(await page.locator(".shortcut-item").count(), 1);
  assert.equal(await page.locator(".recent-item").count(), 1);
  await page.locator("#copy-result").click();
  assert.equal(
    await page.evaluate(() => navigator.clipboard.readText()),
    "118.1102362",
  );
  await page.locator("#swap").click();
  assert.equal(await page.locator("#from-unit").inputValue(), "feet");
  assert.ok(
    Math.abs(
      Number(await page.locator("#conversion-result").textContent()) - 36,
    ) < 1e-8,
  );
  await page.locator("#clear-value").click();
  assert.equal(await page.locator("#conversion-input").inputValue(), "");
  await page.locator("#toast button").click();
  assert.notEqual(await page.locator("#conversion-input").inputValue(), "");
  await page.locator('[data-quick="temperature"]').click();
  await page.locator("#conversion-input").fill("0");
  assert.equal(await page.locator("#conversion-result").textContent(), "32");
  await page.locator("#from-unit").selectOption("kelvin");
  await page.locator("#conversion-input").fill("-1");
  assert.match(
    await page.locator("#conversion-error").textContent(),
    /absolute zero/,
  );
  await page.locator("#global-search").fill("binary");
  await page.locator('[data-search-category="numeralSystems"]').click();
  await page.locator("#conversion-input").fill("9007199254740993");
  await page.locator("#to-unit").selectOption("hexadecimal");
  assert.equal(
    await page.locator("#conversion-result").textContent(),
    "20000000000001",
  );
  await page.locator('[data-quick="currencies"]').click();
  await page.waitForTimeout(200);
  await page.locator("#conversion-input").fill("10");
  assert.equal(
    await page.locator("#conversion-result").textContent(),
    "909.0909091",
  );
  assert.match(
    await page.locator("#currency-info").textContent(),
    /2026-10-06/,
  );
  await page.locator('[data-view="calculator"]').click();
  await page.locator("#calc-input").fill("sin(30)+2^3");
  await page.locator("#calc-input").press("Enter");
  assert.equal(await page.locator("#calc-answer").textContent(), "8.5");
  assert.equal(await page.locator(".calc-history-item").count(), 1);
  await page.locator('[data-memory="M+"]').click();
  assert.match(await page.locator("#memory-status").textContent(), /8.5/);
  await page.locator("#use-result").click();
  assert.equal(await page.locator("#conversion-input").inputValue(), "8.5");
  await page.locator('[data-view="tools"]').click();
  assert.equal(await page.locator("#tip-result").textContent(), "46.00");
  assert.equal(await page.locator("#discount-result").textContent(), "84.00");
  await page.locator("#tip-people").fill("0");
  assert.equal(await page.locator("#tip-result").textContent(), "—");
  await page.locator("#settings").click();
  await page.locator("#setting-language").selectOption("fr");
  await page.locator("#settings-dialog .close-dialog").last().click();
  await page.locator('[data-category="length"]').click();
  assert.equal(
    await page.locator("#from-unit option:checked").textContent(),
    "Mètres · m",
  );
  await page.locator("#settings").click();
  await page.locator("#setting-language").selectOption("en");
  await page.locator("#setting-precision").selectOption("6");
  await page.locator("#setting-theme").selectOption("dark");
  await page.locator("#settings-dialog .close-dialog").last().click();
  assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
  assert.equal(
    await page.locator("#conversion-result").textContent(),
    "3.28084",
  );
  await page.reload();
  assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
  assert.equal(await page.locator(".shortcut-item").count(), 1);
  await page.locator("#theme").click();
  await page.screenshot({
    path: "/tmp/orbit-studio-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(350);
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth),
    390,
  );
  assert.equal(
    await page
      .locator("#sidebar")
      .evaluate((el) => el.getBoundingClientRect().right <= 0),
    true,
  );
  await page.screenshot({
    path: "/tmp/orbit-studio-mobile.png",
    fullPage: true,
  });
  await page.locator("#menu").click();
  await page.locator('[data-view="calculator"]').click();
  await page.locator("#calc-input").fill("sqrt(144)");
  await page.locator("#calc-input").press("Enter");
  assert.equal(await page.locator("#calc-answer").textContent(), "12");
  await page.waitForTimeout(300);
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth),
    390,
  );
  await page.screenshot({
    path: "/tmp/orbit-studio-mobile-calculator.png",
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  console.log(
    "Browser interactions passed: conversions, expression input, clipboard, favorites/history, swap/undo, temperature errors, exact integer bases, mocked currency, calculator/memory, tools, language, preferences persistence, mobile navigation and overflow. No runtime errors.",
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
