import { test } from "node:test";
import assert from "node:assert/strict";
import { categories } from "./units.js";
import {
  categoryById,
  convert,
  formatValue,
  tipTotal,
  discountTotal,
  dateDifference,
} from "./conversion.js";
import { validateRates, fetchRates } from "./currency.js";
const near = (actual, expected) =>
  assert.ok(
    Math.abs(actual - expected) <= Math.max(1e-10, Math.abs(expected) * 1e-9),
    `${actual} should be ${expected}`,
  );
const unit = (id, v, a, b) => convert(String(v), categoryById(id), a, b);
test("all 19 source categories and 228 units are represented with unique identifiers", () => {
  assert.equal(categories.length, 19);
  assert.equal(
    categories.reduce((n, c) => n + c.units.length, 0),
    228,
  );
  assert.equal(new Set(categories.map((c) => c.id)).size, 19);
  for (const c of categories)
    assert.equal(new Set(c.units.map((u) => u.id)).size, c.units.length);
});
test("known metric, imperial and digital conversions", () => {
  near(unit("length", 1, "miles", "meters"), 1609.344);
  near(unit("area", 1, "squareFeet", "squareMeters"), 0.09290304);
  near(unit("mass", 1, "pounds", "kilograms"), 0.45359237);
  near(unit("time", 1, "hours", "seconds"), 3600);
  near(unit("digitalData", 1, "gibibyte", "byte"), 1073741824);
  near(unit("digitalData", 1, "gigabyte", "byte"), 1e9);
  near(unit("energy", 1, "kilowattHours", "joules"), 3600000);
  near(unit("angle", Math.PI, "radians", "degree"), 180);
});
test("temperature offsets, inverse conversion and absolute zero", () => {
  near(unit("temperature", 0, "celsius", "fahrenheit"), 32);
  near(unit("temperature", 100, "celsius", "kelvin"), 373.15);
  near(unit("temperature", 32, "fahrenheit", "celsius"), 0);
  near(unit("temperature", 0, "kelvin", "celsius"), -273.15);
  assert.throws(() => unit("temperature", -1, "kelvin", "celsius"));
});
test("fuel reciprocal conversions, distinct gallon definitions and zero rejection", () => {
  near(unit("fuelConsumption", 10, "litersPer100km", "kilometersPerLiter"), 10);
  near(
    unit("fuelConsumption", 10, "litersPer100km", "milesPerUsGallon"),
    23.5214583333,
  );
  near(
    unit("fuelConsumption", 10, "litersPer100km", "milesPerImperialGallon"),
    28.2480936332,
  );
  assert.throws(() =>
    unit("fuelConsumption", 0, "litersPer100km", "milesPerUsGallon"),
  );
});
test("every physical unit round trips through its category base", () => {
  let count = 0;
  for (const c of categories.filter(
    (c) => !["currencies", "numeralSystems"].includes(c.id),
  )) {
    for (const u of c.units) {
      const input = c.id === "temperature" ? 500 : 50;
      const converted = convert(String(input), c, c.units[0].id, u.id);
      const restored = convert(String(converted), c, u.id, c.units[0].id);
      near(restored, input);
      count++;
    }
  }
  assert.equal(count, 193);
});
test("base conversion preserves large integers, rejects invalid digits, and supports negatives", () => {
  assert.equal(
    unit("numeralSystems", "9007199254740993", "decimal", "hexadecimal"),
    "20000000000001",
  );
  assert.equal(unit("numeralSystems", "FF", "hexadecimal", "decimal"), "255");
  assert.equal(unit("numeralSystems", "-1010", "binary", "decimal"), "-10");
  assert.throws(() => unit("numeralSystems", "102", "binary", "decimal"));
  assert.throws(() => unit("numeralSystems", "3.2", "decimal", "binary"));
});
test("currency cross rates and unavailable data", () => {
  near(
    convert("10", categoryById("currencies"), "USD", "INR", {
      EUR: 1,
      USD: 2,
      INR: 100,
    }),
    500,
  );
  assert.throws(() =>
    convert("10", categoryById("currencies"), "USD", "INR", {}),
  );
  assert.throws(() =>
    validateRates({ base: "EUR", date: "invalid", rates: { USD: 1 } }),
  );
  assert.throws(() =>
    validateRates({ base: "EUR", date: "2026-10-06", rates: { USD: -1 } }),
  );
});
test("rate fetch validates service response and preserves the provider observation date", async () => {
  const r = await fetchRates(async () => ({
    ok: true,
    json: async () => ({
      base: "EUR",
      date: "2026-10-05",
      rates: { USD: 1.1, INR: 90 },
    }),
  }));
  assert.equal(r.date, "2026-10-05");
  assert.equal(r.rates.EUR, 1);
  await assert.rejects(() => fetchRates(async () => ({ ok: false })));
});
test("precision, trailing zeros and expressions", () => {
  assert.equal(formatValue(1.23, 6, false), "1.23000");
  assert.equal(formatValue(1.23, 6, true), "1.23");
  assert.equal(formatValue(1000, 6, true), "1000");
  near(unit("length", "12 × 3", "meters", "centimeters"), 3600);
});
test("everyday tools validate inputs and calculate correct totals", () => {
  assert.deepEqual(tipTotal(120, 15, 3), { tip: 18, total: 138, each: 46 });
  assert.throws(() => tipTotal(100, 10, 0));
  assert.throws(() => tipTotal(100, 10, 1.5));
  assert.deepEqual(discountTotal(100, 20, 5), { saving: 20, total: 84 });
  assert.throws(() => discountTotal(100, 120, 0));
  assert.equal(dateDifference("2024-02-28", "2024-03-01"), 2);
  assert.equal(dateDifference("2026-10-06", "2026-10-05"), -1);
});
