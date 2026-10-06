import { test } from "node:test";
import assert from "node:assert/strict";
import { calculate } from "./math.js";
test("precedence, grouping and decimals", () => {
  assert.equal(calculate("2+3×4"), 14);
  assert.equal(calculate("(2+3)×4"), 20);
  assert.equal(calculate("0.1+0.2"), 0.3);
});
test("unary signs and percentages", () => {
  assert.equal(calculate("−(5+3)"), -8);
  assert.equal(calculate("200×10%"), 20);
  assert.equal(calculate("2×−3"), -6);
});
test("rejects incomplete, invalid and nonfinite expressions", () => {
  for (const input of ["1÷0", "2+", "(3+2", "alert(1)", "2 3", ""])
    assert.throws(() => calculate(input));
});
test("scientific functions, constants, powers and factorial", () => {
  assert.equal(calculate("sin(30)"), 0.5);
  assert.equal(calculate("cos(pi)", "rad"), -1);
  assert.equal(calculate("sqrt(144)+log(100)"), 14);
  assert.equal(calculate("2^3^2"), 512);
  assert.equal(calculate("-2^2"), -4);
  assert.equal(calculate("2^-2"), 0.25);
  assert.equal(calculate("5!"), 120);
  assert.throws(() => calculate("sqrt(-1)"));
  assert.throws(() => calculate("171!"));
});
