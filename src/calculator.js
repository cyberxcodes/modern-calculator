import { calculate } from "./math.js";
import { icon } from "./icons.js";
import { read, write } from "./storage.js";
export function mountCalculator(root, toast, onConvert) {
  let angle = "deg",
    memory = 0,
    answer = 0,
    finished = false;
  let history = read("orbit-history", []);
  if (!Array.isArray(history)) history = [];
  root.innerHTML = `<div class="section-title"><div><span class="eyebrow">A LITTLE SPACE TO THINK</span><h1>Make it <span>add up.</span></h1><p>Big ideas, small calculations. All in your orbit.</p></div><span class="section-badge">${icon("calculator")} Scientific calculator</span></div><div class="calculator-layout"><section class="calculator-card card"><div class="calc-toolbar"><span class="tiny-label">${icon("spark")} YOUR THINKING SPACE</span><button class="pill" id="angle-mode">DEG</button></div><label class="sr-only" for="calc-input">Calculation expression</label><input id="calc-input" class="calc-input" placeholder="0" autocomplete="off" spellcheck="false"><output class="calc-answer" id="calc-answer" aria-live="polite">0</output><div class="calc-meta"><span id="calc-status">Try 24 × (8 + 2), or sin(30)</span><button class="icon-button" id="calc-copy" aria-label="Copy result">${icon("copy")}</button></div><div class="memory-keys">${["MC", "MR", "M+", "M−"].map((k) => `<button data-memory="${k}">${k}</button>`).join("")}<span id="memory-status">Memory empty</span></div><div class="science-keys">${["sin", "cos", "tan", "sqrt", "log", "ln", "π", "e", "^", "!", "(", ")"].map((k) => `<button data-calc="${k}">${{ sqrt: "√", log: "log₁₀", ln: "ln", "^": "xʸ", "!": "x!" }[k] || k}</button>`).join("")}</div><div class="calculator-keys">${["AC", "±", "%", "÷", "7", "8", "9", "×", "4", "5", "6", "−", "1", "2", "3", "+", "⌫", "0", ".", "="].map((k) => `<button data-calc="${k}" class="${k === "=" ? "equals" : ["÷", "×", "−", "+"].includes(k) ? "operator" : ["AC", "±", "%"].includes(k) ? "utility" : ""}" ${k === "⌫" ? 'aria-label="Backspace"' : ""}>${k}</button>`).join("")}</div><div class="calc-bottom"><span><kbd>Enter</kbd> calculate · <kbd>Esc</kbd> clear</span><button id="use-result" class="text-button">Convert this result ${icon("arrow")}</button></div></section><aside class="card calc-history"><div class="panel-heading"><h2>${icon("history")} Calculation history</h2><button class="text-button" id="calc-clear">Clear</button></div><div id="calc-history-list"></div><div class="soft-note">${icon("info")} Saved only in this browser.</div></aside></div>`;
  const input = root.querySelector("#calc-input"),
    output = root.querySelector("#calc-answer"),
    status = root.querySelector("#calc-status");
  function renderHistory() {
    const list = root.querySelector("#calc-history-list");
    list.replaceChildren();
    if (!history.length) {
      list.innerHTML = `<div class="empty-state">${icon("history")}<h3>A clean slate.</h3><p>Your calculations will find a home here.</p></div>`;
      return;
    }
    for (const item of history.slice(0, 15)) {
      if (typeof item.expression !== "string" || !Number.isFinite(item.result))
        continue;
      const b = document.createElement("button");
      b.className = "calc-history-item";
      const label = document.createElement("span"),
        value = document.createElement("strong");
      label.textContent = item.expression + " =";
      value.textContent = item.result;
      b.append(label, value);
      b.onclick = () => {
        input.value = String(item.result);
        update();
      };
      list.append(b);
    }
  }
  function update() {
    try {
      if (input.value.trim()) {
        answer = calculate(input.value, angle);
        output.textContent = String(answer);
        status.textContent = "Preview · press Enter to save";
      } else {
        output.textContent = "0";
        answer = 0;
        status.textContent = "Ready for your next idea.";
      }
    } catch {
      status.textContent = "Keep typing…";
    }
  }
  function run() {
    try {
      answer = calculate(input.value, angle);
      output.textContent = String(answer);
      finished = true;
      history.unshift({ expression: input.value, result: answer });
      history = history.slice(0, 30);
      write("orbit-history", history);
      renderHistory();
      status.textContent = "Calculated. Nice and clear.";
      output.classList.remove("pop");
      void output.offsetWidth;
      output.classList.add("pop");
    } catch (e) {
      status.textContent = e.message;
      toast(e.message);
    }
  }
  function insert(value) {
    if (finished && !["AC", "⌫", "="].includes(value)) {
      input.value = ["+", "−", "×", "÷", "^", "%", "!", "±"].includes(value)
        ? String(answer)
        : "";
      input.setSelectionRange(input.value.length, input.value.length);
      finished = false;
    }
    let text = input.value;
    const start = input.selectionStart ?? text.length,
      end = input.selectionEnd ?? start;
    let insertion = value;
    if (["sin", "cos", "tan", "sqrt", "log", "ln"].includes(value))
      insertion = value + "(";
    if (value === "AC") {
      finished = false;
      input.value = "";
      update();
      return;
    }
    if (value === "=") {
      run();
      return;
    }
    if (value === "⌫") {
      input.value =
        start === end
          ? text.slice(0, Math.max(0, start - 1)) + text.slice(end)
          : text.slice(0, start) + text.slice(end);
      input.focus();
      input.setSelectionRange(Math.max(0, start - 1), Math.max(0, start - 1));
      update();
      return;
    }
    if (value === "±") {
      input.value =
        text.startsWith("−(") && text.endsWith(")")
          ? text.slice(2, -1)
          : text
            ? `−(${text})`
            : "−";
      update();
      return;
    }
    input.value = text.slice(0, start) + insertion + text.slice(end);
    input.focus();
    input.setSelectionRange(start + insertion.length, start + insertion.length);
    update();
  }
  root
    .querySelectorAll("[data-calc]")
    .forEach((b) => (b.onclick = () => insert(b.dataset.calc)));
  input.oninput = () => {
    finished = false;
    update();
  };
  input.onkeydown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      run();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      insert("AC");
    }
  };
  root.querySelector("#angle-mode").onclick = (e) => {
    angle = angle === "deg" ? "rad" : "deg";
    e.currentTarget.textContent = angle.toUpperCase();
    update();
  };
  root.querySelectorAll("[data-memory]").forEach(
    (b) =>
      (b.onclick = () => {
        try {
          const value = ["M+", "M−"].includes(b.dataset.memory)
            ? calculate(input.value || "0", angle)
            : 0;
          switch (b.dataset.memory) {
            case "MC":
              memory = 0;
              break;
            case "MR":
              insert(String(memory));
              break;
            case "M+":
              memory += value;
              break;
            case "M−":
              memory -= value;
              break;
          }
          root.querySelector("#memory-status").textContent =
            `Memory: ${memory}`;
        } catch (e) {
          toast(e.message);
        }
      }),
  );
  root.querySelector("#calc-copy").onclick = async () => {
    try {
      await navigator.clipboard.writeText(output.textContent);
      toast("Result copied");
    } catch {
      toast("Clipboard unavailable. Select the result to copy.");
    }
  };
  root.querySelector("#calc-clear").onclick = () => {
    history = [];
    write("orbit-history", history);
    renderHistory();
    toast("Calculation history cleared");
  };
  root.querySelector("#use-result").onclick = () => {
    try {
      onConvert(calculate(input.value || "0", angle));
    } catch (e) {
      toast(e.message);
    }
  };
  renderHistory();
}
