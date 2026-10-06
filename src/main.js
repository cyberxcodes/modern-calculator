import "./style.css";
import { categories } from "./units.js";
import { translations } from "./translations.js";
import {
  categoryById,
  convert,
  formatValue,
  tipTotal,
  discountTotal,
  dateDifference,
} from "./conversion.js";
import { fetchRates, validateRates } from "./currency.js";
import { icon } from "./icons.js";
import { read, write } from "./storage.js";
import { mountCalculator } from "./calculator.js";
const $ = (s) => document.querySelector(s);
const esc = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const ids = categories.map((c) => c.id);
const saved = read("orbit-preferences", {});
const prefs = {
  theme: ["light", "dark", "system", "amoled"].includes(saved?.theme)
    ? saved.theme
    : "light",
  language: translations[saved?.language] ? saved.language : "en",
  precision: [6, 8, 10, 12, 14].includes(saved?.precision)
    ? saved.precision
    : 10,
  trim: saved?.trim !== false,
  motion: saved?.motion !== false,
  order: Array.isArray(saved?.order)
    ? [...new Set(saved.order.filter((id) => ids.includes(id)).concat(ids))]
    : ids,
  unitOrder:
    saved?.unitOrder && typeof saved.unitOrder === "object"
      ? saved.unitOrder
      : {},
};
let favorites = read("orbit-favorites", []);
if (!Array.isArray(favorites)) favorites = [];
favorites = favorites.filter(
  (f) =>
    categoryById(f?.category)?.units.some((u) => u.id === f.from) &&
    categoryById(f?.category)?.units.some((u) => u.id === f.to),
);
let history = read("orbit-conversions", []);
if (!Array.isArray(history)) history = [];
history = history
  .filter(
    (h) =>
      categoryById(h?.category) &&
      typeof h.value === "string" &&
      typeof h.result === "string",
  )
  .slice(0, 30);
let rates = null,
  rateError = "",
  rateLoading = false,
  ratesCached = false;
try {
  rates = validateRates(read("orbit-rates", null));
  ratesCached = true;
} catch {}
let current = "length",
  view = "converter",
  from = "meters",
  to = "feet",
  value = "1",
  unitFilter = "",
  unitReordering = false,
  undo = null;
const params = new URLSearchParams(location.search),
  shared = categoryById(params.get("category"));
if (shared) {
  current = shared.id;
  from = shared.units.some((u) => u.id === params.get("from"))
    ? params.get("from")
    : shared.units[0].id;
  to = shared.units.some((u) => u.id === params.get("to"))
    ? params.get("to")
    : shared.units[1].id;
  value = (params.get("value") || "1").slice(0, 4096);
}
const languageNames = {
  en: "English",
  de: "Deutsch",
  es: "Español",
  fr: "Français",
  hr: "Hrvatski",
  id: "Bahasa Indonesia",
  it: "Italiano",
  ja: "日本語",
  nb: "Norsk",
  pl: "Polski",
  pt: "Português",
  ru: "Русский",
  tr: "Türkçe",
  ar: "العربية",
};
function t(key, fallback) {
  return (
    translations[prefs.language]?.[key] ||
    translations.en[key] ||
    fallback ||
    key
  );
}
function categoryName(c) {
  return t({ angle: "angles", currencies: "currencies" }[c.id] || c.id, c.name);
}
function unitName(u) {
  return t(u.labelKey || u.id, u.name);
}
function persistPrefs() {
  write("orbit-preferences", prefs);
  applyTheme();
}
function applyTheme() {
  const dark =
    prefs.theme === "dark" ||
    prefs.theme === "amoled" ||
    (prefs.theme === "system" &&
      matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.documentElement.dataset.amoled = String(prefs.theme === "amoled");
  document.documentElement.dataset.motion = String(prefs.motion);
  document.documentElement.lang = prefs.language;
  document.documentElement.dir = prefs.language === "ar" ? "rtl" : "ltr";
  $('meta[name="theme-color"]').content = dark ? "#14151c" : "#f7f8fc";
}
let toastTimer;
function toast(message, canUndo = false) {
  const el = $("#toast");
  el.replaceChildren();
  const text = document.createElement("span");
  text.textContent = message;
  el.append(text);
  if (canUndo) {
    const button = document.createElement("button");
    button.textContent = t("undo");
    button.onclick = () => {
      if (undo) {
        value = undo.value;
        from = undo.from;
        to = undo.to;
        current = undo.current;
        undo = null;
        view = "converter";
        renderNav();
        renderContent();
        toast("Restored");
      }
    };
    el.append(button);
  }
  el.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(
    () => el.classList.remove("visible"),
    canUndo ? 8000 : 3500,
  );
}
$("#app").innerHTML =
  `<div class="app-shell"><aside class="sidebar" id="sidebar"><a class="brand" href="${import.meta.env.BASE_URL}" aria-label="Orbit Studio home"><span class="brand-mark">${icon("layers")}</span><span>orbit<span class="brand-dot">.</span><small>YOUR EVERYDAY STUDIO</small></span></a><div class="sidebar-caption">WORKSPACE</div><nav class="workspace-nav" aria-label="Workspace"><button data-view="converter">${icon("swap")}<span>Converter</span><span class="nav-tag">19</span></button><button data-view="calculator">${icon("calculator")}<span>${esc(t("calculator"))}</span></button><button data-view="tools">${icon("grid")}<span>Everyday tools</span><span class="new-tag">NEW</span></button><button data-view="favorites">${icon("star")}<span>Favorites</span><span id="favorites-count" class="nav-tag"></span></button></nav><div class="sidebar-caption category-caption"><span>CONVERSION LIBRARY</span><button class="icon-button" id="category-order" aria-label="Reorder categories">${icon("settings")}</button></div><nav id="category-nav" class="category-nav" aria-label="Conversion categories"></nav><div class="sidebar-bottom"><div class="privacy-note"><span class="privacy-dot"></span><div>Your numbers. Your space.<small>No ads. No accounts. Just clarity.</small></div></div><button id="settings" class="settings-link">${icon("settings")}<span>${esc(t("settings"))}</span><span class="shortcut">⌘ ,</span></button></div></aside><div class="main-shell"><header class="topbar"><div class="breadcrumb"><button class="icon-button mobile-menu" id="menu" aria-label="Open navigation">${icon("menu")}</button><span>Workspace</span>${icon("chevron")}<strong id="breadcrumb-current">Converter</strong></div><div class="topbar-actions"><label class="search-box">${icon("search")}<input id="global-search" type="search" placeholder="Search units & categories" aria-label="Search units and categories"><kbd>/</kbd></label><button id="theme" class="icon-button" aria-label="Toggle light or dark theme">${icon("moon")}</button><button id="install" class="small-button" hidden>${icon("download")} Install app</button><a class="avatar" href="https://github.com/cyberxcodes/modern-calculator" target="_blank" rel="noopener" aria-label="View source on GitHub">O</a></div></header><div id="search-results" class="search-results" hidden></div><main id="content" tabindex="-1"></main><footer class="app-footer"><span><i class="privacy-dot"></i><span id="connection-status">Works offline · made for your flow</span></span><button id="about">Orbit Studio · Open source ${icon("external")}</button></footer></div></div><div id="sidebar-overlay" class="sidebar-overlay" hidden></div><div id="toast" role="status" aria-live="polite"></div><dialog id="settings-dialog" class="modal"></dialog><dialog id="about-dialog" class="modal"></dialog>`;
applyTheme();
function renderNav() {
  $('[data-view="calculator"] span').textContent = t("calculator");
  $("#settings span").textContent = t("settings");
  const nav = $("#category-nav");
  nav.innerHTML = prefs.order
    .map((id) => {
      const c = categoryById(id);
      return `<button data-category="${id}" class="${view === "converter" && id === current ? "active" : ""}" ${view === "converter" && id === current ? 'aria-current="page"' : ""}>${icon(c.icon)}<span>${esc(categoryName(c))}</span>${id === current && view === "converter" ? '<span class="active-dot"></span>' : ""}</button>`;
    })
    .join("");
  nav
    .querySelectorAll("[data-category]")
    .forEach((b) => (b.onclick = () => selectCategory(b.dataset.category)));
  document.querySelectorAll("[data-view]").forEach((b) => {
    b.classList.toggle("active", b.dataset.view === view);
    b.setAttribute("aria-current", b.dataset.view === view ? "page" : "false");
  });
  $("#favorites-count").textContent = favorites.length || "";
  $("#breadcrumb-current").textContent =
    view === "converter"
      ? categoryName(categoryById(current))
      : {
          calculator: t("calculator"),
          tools: "Everyday tools",
          favorites: "Favorites",
        }[view];
}
function closeSidebar() {
  $("#sidebar").classList.remove("open");
  $("#sidebar-overlay").hidden = true;
  $("#menu").setAttribute("aria-expanded", "false");
}
function setView(next) {
  view = next;
  renderNav();
  renderContent();
  closeSidebar();
  $("#global-search").value = "";
  $("#search-results").hidden = true;
}
const defaultPairs = {
  length: ["meters", "feet"],
  temperature: ["celsius", "fahrenheit"],
  mass: ["kilograms", "pounds"],
  speed: ["kilometersPerHour", "milesPerHour"],
  currencies: ["USD", "INR"],
  digitalData: ["gigabyte", "megabyte"],
  numeralSystems: ["decimal", "binary"],
  fuelConsumption: ["litersPer100km", "milesPerUsGallon"],
  shoeSize: ["euChina", "usaCanadaMan"],
};
function selectCategory(id) {
  const c = categoryById(id);
  current = id;
  view = "converter";
  const defaults = defaultPairs[id];
  from = c.units.find((u) => u.id === defaults?.[0])?.id || c.units[0].id;
  to = c.units.find((u) => u.id === defaults?.[1])?.id || c.units[1].id;
  value =
    id === "shoeSize"
      ? "42"
      : id === "temperature"
        ? "25"
        : id === "numeralSystems"
          ? "42"
          : "1";
  unitFilter = "";
  unitReordering = false;
  renderNav();
  renderContent();
  closeSidebar();
  $("#global-search").value = "";
  $("#search-results").hidden = true;
  if (id === "currencies" && !rates) refreshRates();
}
function pairIsFavorite() {
  return favorites.some(
    (f) => f.category === current && f.from === from && f.to === to,
  );
}
function options(c, selected) {
  return c.units
    .map(
      (u) =>
        `<option value="${u.id}" ${u.id === selected ? "selected" : ""}>${esc(unitName(u))}${u.symbol ? " · " + esc(u.symbol) : ""}</option>`,
    )
    .join("");
}
function unit(id) {
  return categoryById(current).units.find((u) => u.id === id);
}
function pairResult() {
  return convert(value, categoryById(current), from, to, rates?.rates);
}
function renderContent() {
  const root = $("#content");
  root.className = "view-enter";
  if (view === "calculator") {
    mountCalculator(root, toast, (result) => {
      selectCategory("length");
      value = String(result);
      renderContent();
    });
    return;
  }
  if (view === "tools") {
    renderTools(root);
    return;
  }
  if (view === "favorites") {
    renderFavorites(root);
    return;
  }
  const c = categoryById(current);
  root.innerHTML = `<div class="section-title"><div><div class="eyebrow"><span class="tiny-orbit"></span> A WORLD OF UNITS. ONE SIMPLE SPACE.</div><h1>Less friction.<br class="mobile-break"> <span>More possibility.</span></h1><p>From everyday essentials to the wonderfully specific. Let’s convert.</p></div><span class="section-badge">${icon("spark")} Your everyday companion</span></div><div class="quick-categories">${[
    "length",
    "temperature",
    "mass",
    "currencies",
    "digitalData",
  ]
    .map((id) => {
      const cat = categoryById(id);
      return `<button data-quick="${id}" class="${id === current ? "active" : ""}">${icon(cat.icon)}${esc(categoryName(cat))}</button>`;
    })
    .join(
      "",
    )}<button id="browse-all">${icon("grid")} All categories</button></div><div class="converter-layout"><div class="converter-main"><section class="conversion-card card"><div class="panel-heading"><div class="category-heading"><span class="category-icon">${icon(c.icon)}</span><div><h2>${esc(categoryName(c))}</h2><p>${esc(c.description)}</p></div></div><button class="favorite-button ${pairIsFavorite() ? "selected" : ""}" id="favorite-pair" aria-label="${pairIsFavorite() ? "Remove from" : "Add to"} favorites" aria-pressed="${pairIsFavorite()}">${icon("star")}</button></div><div class="conversion-fields"><div class="unit-field"><label for="from-unit">FROM</label><select id="from-unit">${options(c, from)}</select><label class="sr-only" for="conversion-input">Value or arithmetic expression to convert</label><input id="conversion-input" type="text" inputmode="${c.id === "numeralSystems" ? "text" : "decimal"}" value="${esc(value)}" spellcheck="false" autocomplete="off" placeholder="Enter a value"><span class="field-hint">${c.id === "numeralSystems" ? "Whole numbers · up to 4,096 digits" : "You can type math, too. Try 12 × 3"}</span></div><button class="swap-button" id="swap" aria-label="Swap units">${icon("swap")}</button><div class="unit-field result-field"><label for="to-unit">TO</label><select id="to-unit">${options(c, to)}</select><output id="conversion-result" for="conversion-input" aria-live="polite">—</output><span class="field-hint" id="result-unit">${esc(unit(to).symbol || unitName(unit(to)))}</span></div></div><div id="conversion-error" class="input-error" role="status"></div><div class="conversion-bottom"><span id="formula" class="formula">${icon("check")} Instant conversion</span><div class="conversion-actions"><button id="clear-value" class="icon-button" aria-label="Clear value">${icon("undo")}</button><button id="share" class="icon-button" aria-label="Copy link to this conversion">${icon("external")}</button><button id="save-conversion" class="small-button">${icon("history")} Save</button><button id="copy-result" class="primary-button">${icon("copy")} ${esc(t("copy"))}</button></div></div><div id="currency-info" class="currency-info" ${c.id !== "currencies" ? "hidden" : ""}></div>${c.id === "shoeSize" ? `<div class="warning-note">Shoe sizes are approximate. Brand, style, and fit can vary; check the maker’s size chart.</div>` : ""}</section><section class="all-units"><div class="all-units-heading"><div><h2>One value. <span>Every unit.</span></h2><p>${c.units.length} ways to see the same thing.</p></div><div class="unit-controls"><label class="unit-search">${icon("search")}<input id="unit-search" type="search" placeholder="Filter units" aria-label="Filter conversion results" value="${esc(unitFilter)}"></label><button id="reorder-units" class="icon-button ${unitReordering ? "selected" : ""}" aria-label="Reorder units" aria-pressed="${unitReordering}">${icon("settings")}</button></div></div><div id="all-unit-results" class="all-unit-results"></div></section></div><aside class="right-rail"><section class="card favorites-card"><div class="panel-heading"><h2>${icon("star")} Your shortcuts</h2><span class="count-badge">${favorites.length}</span></div><div id="shortcut-list"></div></section><section class="card recent-card"><div class="panel-heading"><h2>${icon("history")} Recent conversions</h2><button id="clear-conversions" class="text-button">${esc(t("clearAll"))}</button></div><div id="conversion-history"></div></section><div class="tip-card"><span class="tip-icon">${icon("spark")}</span><span class="tiny-label">A SMALL SHORTCUT</span><h3>Let the numbers<br>do the thinking.</h3><p>Type an expression in any value field. We’ll handle the math and the conversion.</p><button id="open-calculator" class="text-button">Open calculator ${icon("arrow")}</button><div class="tip-decoration">${icon("spark")}</div></div></aside></div>`;
  root
    .querySelectorAll("[data-quick]")
    .forEach((b) => (b.onclick = () => selectCategory(b.dataset.quick)));
  $("#browse-all").onclick = () => {
    $("#sidebar").classList.add("open");
    $("#sidebar-overlay").hidden = false;
    $("#category-nav button").focus();
  };
  $("#conversion-input").oninput = (e) => {
    value = e.target.value;
    updateConversion();
  };
  $("#conversion-input").onkeydown = (e) => {
    if (e.key === "Enter") saveConversion();
  };
  $("#from-unit").onchange = (e) => {
    from = e.target.value;
    updateConversion();
  };
  $("#to-unit").onchange = (e) => {
    to = e.target.value;
    updateConversion();
  };
  $("#swap").onclick = () => {
    let converted;
    try {
      converted = pairResult();
    } catch {}
    [from, to] = [to, from];
    if (converted !== undefined) value = String(converted);
    $("#from-unit").value = from;
    $("#to-unit").value = to;
    $("#conversion-input").value = value;
    $("#swap").classList.remove("spin");
    void $("#swap").offsetWidth;
    $("#swap").classList.add("spin");
    updateConversion();
  };
  $("#favorite-pair").onclick = () => {
    if (pairIsFavorite())
      favorites = favorites.filter(
        (f) => !(f.category === current && f.from === from && f.to === to),
      );
    else favorites.unshift({ category: current, from, to });
    write("orbit-favorites", favorites);
    renderNav();
    renderShortcuts();
    updateFavoriteButton();
    toast(
      pairIsFavorite() ? "Shortcut added to favorites" : "Shortcut removed",
    );
  };
  $("#copy-result").onclick = async () => {
    try {
      const result = pairResult();
      await copyText(formatValue(result, prefs.precision, prefs.trim));
      saveConversion(false);
    } catch (e) {
      toast(e.message);
    }
  };
  $("#save-conversion").onclick = () => saveConversion();
  $("#clear-value").onclick = () => {
    undo = { value, from, to, current };
    value = "";
    $("#conversion-input").value = "";
    updateConversion();
    toast("Value cleared", true);
  };
  $("#share").onclick = () => {
    const url = new URL(location.href);
    url.search = "";
    url.searchParams.set("category", current);
    url.searchParams.set("from", from);
    url.searchParams.set("to", to);
    url.searchParams.set("value", value);
    copyText(url.href, "Conversion link copied");
  };
  $("#unit-search").oninput = (e) => {
    unitFilter = e.target.value;
    renderAllUnits();
  };
  $("#reorder-units").onclick = () => {
    unitReordering = !unitReordering;
    $("#reorder-units").classList.toggle("selected", unitReordering);
    $("#reorder-units").setAttribute("aria-pressed", unitReordering);
    renderAllUnits();
  };
  $("#clear-conversions").onclick = () => {
    history = [];
    write("orbit-conversions", history);
    renderConversionHistory();
    toast("Conversion history cleared");
  };
  $("#open-calculator").onclick = () => setView("calculator");
  renderShortcuts();
  renderConversionHistory();
  updateConversion();
}
async function copyText(text, message = "Copied to clipboard") {
  try {
    await navigator.clipboard.writeText(text);
    toast(message);
  } catch {
    toast("Clipboard unavailable. Select the value to copy it.");
  }
}
function updateFavoriteButton() {
  const b = $("#favorite-pair");
  if (!b) return;
  b.classList.toggle("selected", pairIsFavorite());
  b.setAttribute("aria-pressed", pairIsFavorite());
  b.setAttribute(
    "aria-label",
    `${pairIsFavorite() ? "Remove from" : "Add to"} favorites`,
  );
}
function updateConversion() {
  if (view !== "converter") return;
  let valid = false;
  try {
    const result = pairResult();
    $("#conversion-result").textContent = formatValue(
      result,
      prefs.precision,
      prefs.trim,
    );
    $("#conversion-error").textContent = "";
    valid = true;
    const one = convert("1", categoryById(current), from, to, rates?.rates);
    $("#formula").innerHTML =
      icon("check") +
      `<span>1 ${esc(unit(from).symbol || unitName(unit(from)))} = ${esc(formatValue(one, 6))} ${esc(unit(to).symbol || unitName(unit(to)))}</span>`;
  } catch (e) {
    $("#conversion-result").textContent = "—";
    $("#conversion-error").textContent = value.trim() ? e.message : "";
    $("#formula").innerHTML =
      icon("info") + "<span>Enter a value to see the conversion</span>";
  }
  $("#result-unit").textContent = unit(to).symbol || unitName(unit(to));
  $("#copy-result").disabled = !valid;
  $("#save-conversion").disabled = !valid;
  updateFavoriteButton();
  renderCurrencyInfo();
  renderAllUnits();
}
function orderedUnits() {
  const c = categoryById(current);
  const saved = prefs.unitOrder[current];
  if (!Array.isArray(saved)) return c.units;
  return [...new Set(saved.concat(c.units.map((u) => u.id)))]
    .map((id) => c.units.find((u) => u.id === id))
    .filter(Boolean);
}
function renderAllUnits() {
  const list = $("#all-unit-results");
  if (!list) return;
  const c = categoryById(current),
    all = orderedUnits();
  const filtered = all.filter((u) =>
    (unitName(u) + " " + u.symbol + " " + u.name)
      .toLowerCase()
      .includes(unitFilter.toLowerCase()),
  );
  list.replaceChildren();
  if (!filtered.length) {
    list.innerHTML =
      '<div class="empty-search">No units found. Try a different search.</div>';
    return;
  }
  for (const u of filtered) {
    let formatted = "—",
      error = "";
    try {
      formatted = formatValue(
        convert(value, c, from, u.id, rates?.rates),
        prefs.precision,
        prefs.trim,
      );
    } catch (e) {
      error = e.message;
    }
    const card = document.createElement("div");
    card.className = `unit-result ${u.id === to ? "highlighted" : ""}`;
    card.innerHTML = `<div class="unit-result-top"><span>${esc(u.symbol || u.name.slice(0, 3))}</span><div>${unitReordering ? `<button class="icon-button move-unit" data-direction="-1" aria-label="Move ${esc(unitName(u))} up">${icon("up")}</button><button class="icon-button move-unit" data-direction="1" aria-label="Move ${esc(unitName(u))} down">${icon("down")}</button>` : `<button class="icon-button unit-copy" aria-label="Copy ${esc(unitName(u))} result" ${error ? "disabled" : ""}>${icon("copy")}</button>`}</div></div><button class="unit-choose" aria-label="Convert to ${esc(unitName(u))}"><strong>${esc(formatted)}</strong><span>${esc(unitName(u))}</span></button>`;
    card.querySelector(".unit-choose").onclick = () => {
      to = u.id;
      $("#to-unit").value = to;
      updateConversion();
    };
    card
      .querySelector(".unit-copy")
      ?.addEventListener("click", () => copyText(formatted));
    card.querySelectorAll(".move-unit").forEach(
      (b) =>
        (b.onclick = () => {
          const ids = all.map((u) => u.id),
            idx = ids.indexOf(u.id),
            next = idx + Number(b.dataset.direction);
          if (next < 0 || next >= ids.length) return;
          [ids[idx], ids[next]] = [ids[next], ids[idx]];
          prefs.unitOrder[current] = ids;
          persistPrefs();
          renderAllUnits();
        }),
    );
    list.append(card);
  }
}
function renderCurrencyInfo() {
  const el = $("#currency-info");
  if (!el || current !== "currencies") return;
  el.innerHTML = `<div>${icon("info")}<span>${rateLoading ? "Updating reference rates…" : rates ? `Reference rates · ${esc(rates.date)} · ${rateError ? "cached; refresh unavailable" : ratesCached ? "cached · ECB via Frankfurter" : "ECB via Frankfurter"}` : "No rates loaded. Connect to the internet to get reference rates."}${rateError && !rates ? " Refresh failed." : ""}</span></div><button class="text-button" id="refresh-rates" ${rateLoading ? "disabled" : ""}>${icon("rotate")} Refresh</button><small>Daily reference rates, not transaction quotes. Unavailable currencies show —.</small>`;
  $("#refresh-rates").onclick = () => refreshRates();
}
async function refreshRates() {
  if (rateLoading) return;
  rateLoading = true;
  renderCurrencyInfo();
  try {
    rates = await fetchRates();
    ratesCached = false;
    rateError = "";
    write("orbit-rates", rates);
  } catch (e) {
    rateError = e.message;
    if (rates) ratesCached = true;
  } finally {
    rateLoading = false;
    if (view === "converter" && current === "currencies") updateConversion();
  }
}
function saveConversion(showToast = true) {
  try {
    const result = formatValue(pairResult(), prefs.precision, prefs.trim),
      item = { category: current, from, to, value, result };
    if (JSON.stringify(history[0]) !== JSON.stringify(item))
      history.unshift(item);
    history = history.slice(0, 30);
    write("orbit-conversions", history);
    renderConversionHistory();
    if (showToast) toast("Conversion saved");
  } catch (e) {
    toast(e.message);
  }
}
function recall(item) {
  const c = categoryById(item.category);
  if (
    !c ||
    !c.units.find((u) => u.id === item.from) ||
    !c.units.find((u) => u.id === item.to)
  )
    return;
  current = item.category;
  from = item.from;
  to = item.to;
  value = item.value || "1";
  view = "converter";
  unitFilter = "";
  renderNav();
  renderContent();
  if (current === "currencies" && !rates) refreshRates();
}
function renderShortcuts() {
  const el = $("#shortcut-list");
  if (!el) return;
  if (!favorites.length) {
    el.innerHTML = `<div class="empty-shortcuts">${icon("star")}<p>Your favorites, a tap away.</p><span>Star a conversion to keep it close.</span></div>`;
    return;
  }
  el.innerHTML = favorites
    .slice(0, 4)
    .map((f, i) => {
      const c = categoryById(f.category),
        a = c.units.find((u) => u.id === f.from),
        b = c.units.find((u) => u.id === f.to);
      return `<button class="shortcut-item" data-shortcut="${i}"><span class="shortcut-icon">${icon(c.icon)}</span><span><strong>${esc(a.symbol || a.name)} ${icon("arrow")} ${esc(b.symbol || b.name)}</strong><small>${esc(categoryName(c))}</small></span>${icon("chevron")}</button>`;
    })
    .join("");
  el.querySelectorAll("[data-shortcut]").forEach(
    (b) => (b.onclick = () => recall(favorites[Number(b.dataset.shortcut)])),
  );
}
function renderConversionHistory() {
  const el = $("#conversion-history");
  if (!el) return;
  if (!history.length) {
    el.innerHTML =
      '<div class="empty-history"><span>↺</span><p>A fresh start.</p><small>Save a conversion to revisit it here.</small></div>';
    return;
  }
  el.innerHTML = history
    .slice(0, 5)
    .map((h, i) => {
      const c = categoryById(h.category),
        a = c.units.find((u) => u.id === h.from),
        b = c.units.find((u) => u.id === h.to);
      return `<button class="recent-item" data-history="${i}"><span>${esc(h.value)} ${esc(a?.symbol || a?.name || "")} ${icon("arrow")} ${esc(b?.symbol || b?.name || "")}</span><strong>${esc(h.result)}</strong></button>`;
    })
    .join("");
  el.querySelectorAll("[data-history]").forEach(
    (b) => (b.onclick = () => recall(history[Number(b.dataset.history)])),
  );
}
function renderFavorites(root) {
  root.innerHTML = `<div class="section-title"><div><span class="eyebrow">THE ONES YOU COME BACK TO</span><h1>Your favorite <span>shortcuts.</span></h1><p>Less searching. More doing. Make this space your own.</p></div><span class="section-badge">${icon("star")} ${favorites.length} saved pairs</span></div><div class="favorites-grid">${
    favorites.length
      ? favorites
          .map((f, i) => {
            const c = categoryById(f.category),
              a = c.units.find((u) => u.id === f.from),
              b = c.units.find((u) => u.id === f.to);
            return `<div class="card favorite-card"><div class="panel-heading"><span class="category-icon">${icon(c.icon)}</span><button class="icon-button remove-favorite" data-index="${i}" aria-label="Remove favorite">${icon("close")}</button></div><h2>${esc(a.symbol || a.name)} ${icon("arrow")} ${esc(b.symbol || b.name)}</h2><p>${esc(categoryName(c))} · ${esc(unitName(a))} to ${esc(unitName(b))}</p><button class="primary-button open-favorite" data-index="${i}">Start converting ${icon("arrow")}</button></div>`;
          })
          .join("")
      : `<div class="card empty-state">${icon("star")}<h2>A space for your go-to conversions.</h2><p>Tap the star on any conversion to save a shortcut here.</p><button class="primary-button" id="start-favorites">Explore conversions ${icon("arrow")}</button></div>`
  }</div>`;
  root
    .querySelectorAll(".open-favorite")
    .forEach(
      (b) => (b.onclick = () => recall(favorites[Number(b.dataset.index)])),
    );
  root.querySelectorAll(".remove-favorite").forEach(
    (b) =>
      (b.onclick = () => {
        favorites.splice(Number(b.dataset.index), 1);
        write("orbit-favorites", favorites);
        renderNav();
        renderFavorites(root);
      }),
  );
  $("#start-favorites")?.addEventListener("click", () => setView("converter"));
}
function renderTools(root) {
  root.innerHTML = `<div class="section-title"><div><span class="eyebrow">SMALL TOOLS. BIG EVERYDAY HELP.</span><h1>A little more <span>useful.</span></h1><p>For splitting dinner, finding a deal, and making plans.</p></div><span class="section-badge">${icon("grid")} Everyday essentials</span></div><div class="tools-grid"><section class="card tool-card"><div class="tool-heading"><span class="category-icon">${icon("heart")}</span><div><h2>Tip & split</h2><p>Good company. Easy numbers.</p></div></div><label>Bill amount<input id="tip-bill" type="number" min="0" step="any" value="120"></label><div class="tool-fields"><label>Tip (%)<input id="tip-percent" type="number" min="0" step="any" value="15"></label><label>People<input id="tip-people" type="number" min="1" step="1" value="3"></label></div><div class="tool-answer"><span>Each person pays</span><output id="tip-result" aria-live="polite"></output><small id="tip-detail"></small></div></section><section class="card tool-card"><div class="tool-heading"><span class="category-icon peach">${icon("percent")}</span><div><h2>Discount & tax</h2><p>See the real price, instantly.</p></div></div><label>Original price<input id="discount-price" type="number" min="0" step="any" value="100"></label><div class="tool-fields"><label>Discount (%)<input id="discount-percent" type="number" min="0" max="100" step="any" value="20"></label><label>Tax (%)<input id="discount-tax" type="number" min="0" step="any" value="5"></label></div><div class="tool-answer peach"><span>Final price</span><output id="discount-result" aria-live="polite"></output><small id="discount-detail"></small></div></section><section class="card tool-card"><div class="tool-heading"><span class="category-icon blue">${icon("calendar")}</span><div><h2>Date distance</h2><p>How far away is your next big day?</p></div></div><label>Start date<input id="date-start" type="date"></label><label>End date<input id="date-end" type="date"></label><div class="tool-answer blue"><span>Time between dates</span><output id="date-result" aria-live="polite"></output><small id="date-detail"></small></div></section></div><div class="tool-banner">${icon("spark")}<div><h3>One studio. So many possibilities.</h3><p>Need something else? Explore 19 conversion categories or open the scientific calculator.</p></div><button id="tool-calculator" class="primary-button">${icon("calculator")} Calculator</button></div>`;
  const now = new Date(),
    date = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10),
    later = new Date(now);
  later.setDate(later.getDate() + 30);
  $("#date-start").value = date;
  $("#date-end").value = new Date(
    later.getTime() - later.getTimezoneOffset() * 60000,
  )
    .toISOString()
    .slice(0, 10);
  const number = (id) => {
    const input = $(id);
    return input.value.trim() === "" ? NaN : Number(input.value);
  };
  function updateTools() {
    try {
      const r = tipTotal(
        number("#tip-bill"),
        number("#tip-percent"),
        number("#tip-people"),
      );
      $("#tip-result").textContent = r.each.toFixed(2);
      $("#tip-detail").textContent =
        `${r.tip.toFixed(2)} tip · ${r.total.toFixed(2)} total`;
    } catch (e) {
      $("#tip-result").textContent = "—";
      $("#tip-detail").textContent = e.message;
    }
    try {
      const r = discountTotal(
        number("#discount-price"),
        number("#discount-percent"),
        number("#discount-tax"),
      );
      $("#discount-result").textContent = r.total.toFixed(2);
      $("#discount-detail").textContent =
        `You save ${r.saving.toFixed(2)} before tax`;
    } catch (e) {
      $("#discount-result").textContent = "—";
      $("#discount-detail").textContent = e.message;
    }
    try {
      const days = dateDifference($("#date-start").value, $("#date-end").value);
      $("#date-result").textContent = `${Math.abs(days)} days`;
      $("#date-detail").textContent =
        `${(Math.abs(days) / 7).toFixed(1)} weeks${days < 0 ? " · end is before start" : ""}`;
    } catch (e) {
      $("#date-result").textContent = "—";
      $("#date-detail").textContent = e.message;
    }
  }
  root
    .querySelectorAll("input")
    .forEach((input) => (input.oninput = updateTools));
  $("#tool-calculator").onclick = () => setView("calculator");
  updateTools();
}
function renderSettings(orderOnly = false) {
  const dialog = $("#settings-dialog");
  dialog.innerHTML = `<div class="modal-heading"><div><span class="eyebrow">MAKE YOURSELF AT HOME</span><h2>${esc(t("settings"))}</h2></div><button class="icon-button close-dialog" aria-label="Close settings">${icon("close")}</button></div><div class="settings-fields" ${orderOnly ? "hidden" : ""}><label>${esc(t("theme"))}<select id="setting-theme">${["light", "dark", "system", "amoled"].map((theme) => `<option value="${theme}" ${prefs.theme === theme ? "selected" : ""}>${esc(theme === "amoled" ? t("amoledDarkTheme") : t(theme))}</option>`).join("")}</select></label><label>${esc(t("language"))}<select id="setting-language">${Object.entries(
    languageNames,
  )
    .map(
      ([id, name]) =>
        `<option value="${id}" ${prefs.language === id ? "selected" : ""}>${name}</option>`,
    )
    .join(
      "",
    )}</select><small>Category, unit, and core setting labels. New features use English.</small></label><label>${esc(t("significantFigures"))}<select id="setting-precision">${[6, 8, 10, 12, 14].map((n) => `<option ${prefs.precision === n ? "selected" : ""}>${n}</option>`).join("")}</select></label><label class="check-setting"><span>${esc(t("removeTrailingZeros"))}</span><input id="setting-trim" type="checkbox" ${prefs.trim ? "checked" : ""}></label><label class="check-setting"><span>Interface animations<small>System reduced-motion preferences are always respected.</small></span><input id="setting-motion" type="checkbox" ${prefs.motion ? "checked" : ""}></label></div><div class="settings-order"><h3>${esc(t("reorderProperties"))}</h3><p>Put your everyday categories first. Changes save automatically.</p><div id="order-list"></div></div><div class="modal-footer"><span>Preferences stay on this device.</span><button class="primary-button close-dialog">Done ${icon("check")}</button></div>`;
  dialog
    .querySelectorAll(".close-dialog")
    .forEach((b) => (b.onclick = () => dialog.close()));
  for (const [selector, key] of [
    ["#setting-theme", "theme"],
    ["#setting-language", "language"],
    ["#setting-precision", "precision"],
    ["#setting-trim", "trim"],
    ["#setting-motion", "motion"],
  ])
    dialog.querySelector(selector).onchange = (e) => {
      prefs[key] =
        e.target.type === "checkbox"
          ? e.target.checked
          : key === "precision"
            ? Number(e.target.value)
            : e.target.value;
      persistPrefs();
      renderNav();
      renderContent();
    };
  function renderOrder() {
    const list = dialog.querySelector("#order-list");
    list.innerHTML = prefs.order
      .map(
        (id, index) =>
          `<div class="order-row"><span>${icon(categoryById(id).icon)}${esc(categoryName(categoryById(id)))}</span><div><button class="icon-button" data-index="${index}" data-dir="-1" aria-label="Move ${esc(categoryName(categoryById(id)))} up" ${index === 0 ? "disabled" : ""}>${icon("up")}</button><button class="icon-button" data-index="${index}" data-dir="1" aria-label="Move ${esc(categoryName(categoryById(id)))} down" ${index === prefs.order.length - 1 ? "disabled" : ""}>${icon("down")}</button></div></div>`,
      )
      .join("");
    list.querySelectorAll("[data-index]").forEach(
      (b) =>
        (b.onclick = () => {
          const i = Number(b.dataset.index),
            j = i + Number(b.dataset.dir);
          [prefs.order[i], prefs.order[j]] = [prefs.order[j], prefs.order[i]];
          persistPrefs();
          renderNav();
          renderOrder();
        }),
    );
  }
  renderOrder();
  dialog.showModal();
}
$("#settings").onclick = () => renderSettings();
$("#category-order").onclick = () => renderSettings(true);
$("#about").onclick = () => {
  const dialog = $("#about-dialog");
  dialog.innerHTML = `<div class="modal-heading"><div><span class="eyebrow">MADE FOR EVERYDAY CURIOSITY</span><h2>Meet Orbit Studio.</h2></div><button class="icon-button" id="close-about" aria-label="Close about">${icon("close")}</button></div><div class="about-body"><div class="about-logo">${icon("layers")}</div><p>Your everyday calculator and conversion companion. 19 categories, 228 units, and a little more space to think.</p><p>Inspired by <a href="https://github.com/ferraridamiano/ConverterNOW" target="_blank" rel="noopener">Converter NOW</a>, by Damiano Ferrari and contributors. Translation labels adapted under GPL-3.0; conversion definitions adapted from units_converter (MIT).</p><p>This modified web application is free software under GPL-3.0, supplied without warranty. You may redistribute it under that license.</p><div class="about-links"><a href="https://github.com/cyberxcodes/modern-calculator" target="_blank" rel="noopener">${icon("github")} Complete source code</a><a href="${import.meta.env.BASE_URL}licenses/gpl-3.0.txt" target="_blank" rel="noopener">GPL-3.0 license</a><a href="${import.meta.env.BASE_URL}licenses/units-converter.txt" target="_blank" rel="noopener">MIT notice</a></div><p class="soft-note">Unit calculations work locally. Currency rates require a request to Frankfurter; last successful rates are cached on your device. There are no accounts or analytics.</p></div>`;
  $("#close-about").onclick = () => dialog.close();
  dialog.showModal();
};
document
  .querySelectorAll("[data-view]")
  .forEach((b) => (b.onclick = () => setView(b.dataset.view)));
$("#menu").onclick = () => {
  $("#sidebar").classList.toggle("open");
  const open = $("#sidebar").classList.contains("open");
  $("#sidebar-overlay").hidden = !open;
  $("#menu").setAttribute("aria-expanded", String(open));
};
$("#sidebar-overlay").onclick = closeSidebar;
$("#theme").onclick = () => {
  prefs.theme =
    document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  persistPrefs();
  toast(`${prefs.theme === "dark" ? "Dark" : "Light"} theme`);
};
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  if (prefs.theme === "system") applyTheme();
});
$("#global-search").oninput = (e) => {
  const q = e.target.value.trim().toLowerCase(),
    el = $("#search-results");
  if (!q) {
    el.hidden = true;
    return;
  }
  const matches = categories
    .map((c) => ({
      c,
      units: c.units.filter((u) =>
        (unitName(u) + " " + u.name + " " + u.symbol).toLowerCase().includes(q),
      ),
    }))
    .filter(
      ({ c, units }) =>
        (categoryName(c) + " " + c.name).toLowerCase().includes(q) ||
        units.length,
    );
  el.innerHTML = matches.length
    ? matches
        .map(
          ({ c, units }) =>
            `<button data-search-category="${c.id}" ${units[0] ? `data-search-unit="${units[0].id}"` : ""}>${icon(c.icon)}<span><strong>${esc(categoryName(c))}</strong><small>${esc(units.slice(0, 3).map(unitName).join(" · ") || c.description)}</small></span>${icon("arrow")}</button>`,
        )
        .join("")
    : "<p>No matches. Try “feet”, “temperature”, or “bytes”.</p>";
  el.hidden = false;
  el.querySelectorAll("[data-search-category]").forEach(
    (b) =>
      (b.onclick = () => {
        selectCategory(b.dataset.searchCategory);
        if (b.dataset.searchUnit) {
          to = b.dataset.searchUnit;
          $("#to-unit").value = to;
          updateConversion();
        }
      }),
  );
};
document.addEventListener("click", (e) => {
  if (!e.target.closest(".search-box") && !e.target.closest("#search-results"))
    $("#search-results").hidden = true;
});
document.addEventListener("keydown", (e) => {
  const typing = e.target.matches("input,textarea,select");
  if (
    (e.key === "/" && !typing) ||
    ((e.ctrlKey || e.metaKey) && e.key === "k")
  ) {
    e.preventDefault();
    $("#global-search").focus();
  }
  if (e.key === "Escape") {
    $("#search-results").hidden = true;
    closeSidebar();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === ",") {
    e.preventDefault();
    if (!$("#settings-dialog").open) renderSettings();
  }
});
let installPrompt;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  installPrompt = e;
  $("#install").hidden = false;
});
$("#install").onclick = async () => {
  if (!installPrompt) return;
  await installPrompt.prompt();
  installPrompt = null;
  $("#install").hidden = true;
};
window.addEventListener("appinstalled", () =>
  toast("Orbit installed. Welcome home."),
);
function connectionStatus() {
  $("#connection-status").textContent = navigator.onLine
    ? "Works offline · made for your flow"
    : "You’re offline · unit conversions still work";
}
window.addEventListener("online", () => {
  connectionStatus();
  if (current === "currencies") refreshRates();
});
window.addEventListener("offline", connectionStatus);
connectionStatus();
renderNav();
renderContent();
if (
  current === "currencies" ||
  !rates ||
  rates.date !== new Date().toISOString().slice(0, 10)
)
  refreshRates();
if (import.meta.env.PROD && "serviceWorker" in navigator)
  navigator.serviceWorker
    .register(`${import.meta.env.BASE_URL}sw.js`)
    .catch(() => {});
