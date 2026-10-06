export const RATE_URL = "https://api.frankfurter.dev/v1/latest?base=EUR";
export function validateRates(data) {
  if (
    !data ||
    data.base !== "EUR" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(data.date) ||
    !Number.isFinite(Date.parse(data.date))
  )
    throw new Error("Invalid rate response.");
  const rates = { EUR: 1 };
  for (const [code, value] of Object.entries(data.rates || {}))
    if (/^[A-Z]{3}$/.test(code) && Number.isFinite(value) && value > 0)
      rates[code] = value;
  if (Object.keys(rates).length < 2)
    throw new Error("No usable exchange rates.");
  return { base: "EUR", date: data.date, rates };
}
export async function fetchRates(fetcher = fetch) {
  const response = await fetcher(RATE_URL, {
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok)
    throw new Error("The exchange-rate service is unavailable.");
  return validateRates(await response.json());
}
