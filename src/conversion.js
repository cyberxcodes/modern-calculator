import { categories } from "./units.js";
import { calculate } from "./math.js";
export function categoryById(id) {
  return categories.find((c) => c.id === id);
}
export function convert(input, category, fromId, toId, rates = {}) {
  const from = category.units.find((u) => u.id === fromId),
    to = category.units.find((u) => u.id === toId);
  if (!from || !to) throw new Error("Choose two valid units.");
  if (String(input).trim() === "")
    throw new Error("Enter a value to get started.");
  if (category.id === "numeralSystems") {
    const raw = String(input).trim();
    const checks = {
      2: /^-?[01]+$/,
      8: /^-?[0-7]+$/,
      10: /^-?\d+$/,
      16: /^-?[\da-f]+$/i,
    };
    if (!checks[from.base].test(raw) || raw.length > 4096)
      throw new Error(`Use valid base ${from.base} digits (up to 4,096).`);
    const sign = raw.startsWith("-") ? -1n : 1n;
    const digits = raw.replace(/^-/, "");
    const value =
      BigInt(({ 2: "0b", 8: "0o", 16: "0x" }[from.base] || "") + digits) * sign;
    return value.toString(to.base).toUpperCase();
  }
  const value = calculate(String(input));
  let result;
  if (category.id === "currencies") {
    if (!rates[from.id] || !rates[to.id])
      throw new Error(
        "Rates unavailable for this currency. Refresh or choose another currency.",
      );
    result = (value / rates[from.id]) * rates[to.id];
  } else {
    if (category.id === "fuelConsumption" && value <= 0)
      throw new Error("Fuel efficiency needs a value greater than zero.");
    const base = from.reciprocal
      ? from.factor / value + from.offset
      : value * from.factor + from.offset;
    if (category.id === "temperature" && base < -459.67 - 1e-9)
      throw new Error("Temperature cannot be below absolute zero.");
    result = to.reciprocal
      ? to.factor / (base - to.offset)
      : (base - to.offset) / to.factor;
  }
  if (!Number.isFinite(result))
    throw new Error("This value is outside the supported range.");
  return Object.is(result, -0) ? 0 : result;
}
export function formatValue(value, precision = 10, trim = true) {
  if (typeof value === "string") return value;
  if (!Number.isFinite(value)) return "—";
  if (value === 0) return trim ? "0" : (0).toPrecision(precision);
  const text = value.toPrecision(precision);
  if (!trim) return text;
  const [mantissa, exponent] = text.split("e");
  return mantissa.includes(".")
    ? mantissa.replace(/\.?0+$/, "") + (exponent ? `e${exponent}` : "")
    : text;
}
export function tipTotal(bill, percent, people) {
  if (
    ![bill, percent, people].every(Number.isFinite) ||
    bill < 0 ||
    percent < 0 ||
    !Number.isInteger(people) ||
    people < 1
  )
    throw new Error(
      "Use a positive bill, a nonnegative tip, and at least one whole person.",
    );
  return {
    tip: (bill * percent) / 100,
    total: bill * (1 + percent / 100),
    each: (bill * (1 + percent / 100)) / people,
  };
}
export function discountTotal(price, discount, tax) {
  if (
    ![price, discount, tax].every(Number.isFinite) ||
    price < 0 ||
    discount < 0 ||
    discount > 100 ||
    tax < 0
  )
    throw new Error(
      "Use a positive price, 0–100% discount, and nonnegative tax.",
    );
  return {
    saving: (price * discount) / 100,
    total: price * (1 - discount / 100) * (1 + tax / 100),
  };
}
export function dateDifference(start, end) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end))
    throw new Error("Choose two valid dates.");
  const first = Date.parse(start + "T00:00:00Z"),
    last = Date.parse(end + "T00:00:00Z");
  if (!Number.isFinite(first) || !Number.isFinite(last))
    throw new Error("Choose two valid dates.");
  return Math.round((last - first) / 86400000);
}
