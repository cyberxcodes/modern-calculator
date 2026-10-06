# Orbit Studio

A modern calculator and conversion workspace, inspired by [Converter NOW](https://github.com/cyberxcodes/ConverterNOW). Built with Vite and plain JavaScript. No accounts, ads, analytics, backend, or API keys.

**Website:** https://cyberxcodes.github.io/modern-calculator/

## Features

- **All 19 Converter NOW categories:** length, area, volume, currency, time, temperature, speed, mass, force, fuel consumption, numeral systems, pressure, energy, power, angles, shoe size, digital data, SI prefixes, and torque.
- **228 units**, including all source unit definitions, modern SI prefixes (ronna, quetta, ronto, quecto), turns and gradians. Shoe sizing is approximate; brand-specific charts remain authoritative.
- Instant pair conversion and results across every unit; expressions work in value inputs. Exact BigInt integer conversion between binary, octal, decimal and hexadecimal, up to 4,096 digits.
- Search by category or unit, custom category/unit ordering, persistent precision and trailing-zero preferences, and undo after clearing a value.
- Favorites, conversion history, one-click copying, and shareable conversion links.
- Scientific calculator with degree/radian angles, trigonometry, logarithms, factorials, powers, constants, memory, keyboard input, and history. Calculator results can be sent to the converter.
- Tip splitting, discounts with tax, and date differences.
- Responsive light, dark, system, and AMOLED themes, subtle animations, reduced-motion support, keyboard shortcuts and labeled controls.
- Installable PWA with an offline app shell and local conversions after the first successful visit.
- 14 languages for category, source-unit, and core settings labels, adapted from the original translation dictionaries. New interface copy and new tools currently use English; Arabic uses right-to-left layout.

## Currency rates

The app fetches daily EUR-based reference rates from [Frankfurter](https://frankfurter.dev), which uses institutional sources including the ECB. The provider observation date is displayed; successfully fetched rates are cached locally and explicitly labeled when reused. Failed refreshes retain the last usable rates. Missing currencies display an unavailable state rather than fabricated exchange rates. Reference rates are not transaction quotes. Conversion/history/favorites/preferences stay on your device; only the exchange-rate request uses the network.

The cloud environment currently blocks the live API domain. Currency math, response validation, network failures and cached-rate behavior are tested with deterministic responses; a successful live API request from this cloud instance has not been verified.

## Development

Node.js 20.19+ or 22.12+ is required; Node 24 is used in CI.

```sh
npm ci --cache /tmp/orbit-npm-cache
npm run dev -- --port 5173
```

The default base path is `/modern-calculator/`, matching GitHub Pages. To run at the root on a different host, pass `--base=/` to the dev/build/preview command.

## Validation

```sh
npm test
npm run build
npm run preview -- --port 4173
```

Unit tests cover known conversions, every physical-unit round trip, temperature/fuel edge cases, exact integer bases, rate validation, precision, calculator functions, and everyday tools.

With the development server running, browser smoke checks cover conversion input, clipboard, favorites/history, swap and undo, science and memory, tools, language and preferences, and mobile navigation:

```sh
npx playwright install chromium  # unnecessary when system Chromium is available
npm run test:browser
```

Set `ORBIT_BROWSER_PATH` for a custom Chromium executable and `ORBIT_TEST_URL` for a different development URL. Screenshots are written under `/tmp`. Browser currency responses are mocked; they do not prove live rate-service availability. The service worker runs in production builds, not the development server. With the production preview server running, `npm run test:offline` checks the Pages subpath, precaching, offline reloads, and cached currency conversions.

Keyboard: `/` or Ctrl/Cmd+K for search; Ctrl/Cmd+, for settings; Enter to calculate/save; Escape to clear the calculator or close a dialog/navigation overlay.

## GitHub Pages

The workflow tests and builds on pushes to `main`, publishes static output to `gh-pages`, and explicitly requests a Pages build. An explicit build request is needed because a branch push with the Actions token alone does not trigger a Pages build. Repository Settings → Pages must use **Deploy from a branch → gh-pages → / (root)**. This site already uses that setup.

## Scope and attribution

This is a JavaScript web implementation, not an embedded Flutter build. Android/iOS store packaging, desktop binaries, native shortcuts, and device-specific Flutter dynamic-color integration are not part of this web app. Responsive themes and PWA installation cover its browser workflow.

Translations are adapted from Converter NOW (GNU GPL-3.0), and conversion definitions from units_converter 2.0.1 (MIT), by Damiano Ferrari and contributors. Complete source is available in this repository. See [LICENSE](LICENSE) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). License notices and source links are also available in the app’s About dialog.
