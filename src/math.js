export function calculate(expression) {
  const source = expression.replaceAll('×', '*').replaceAll('÷', '/').replaceAll('−', '-');
  const tokens = source.match(/(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?|[()+\-*/%]/gi) || [];
  if (tokens.join('') !== source.replaceAll(' ', '') || !tokens.length) throw new Error('Enter a valid expression');
  let pos = 0;
  function atom() {
    let value;
    if (tokens[pos] === '+' || tokens[pos] === '-') { const sign = tokens[pos++]; value = atom() * (sign === '-' ? -1 : 1); }
    else if (tokens[pos] === '(') { pos++; value = sum(); if (tokens[pos++] !== ')') throw new Error('Close your parentheses'); }
    else { value = Number(tokens[pos++]); if (!Number.isFinite(value)) throw new Error('Check your expression'); }
    while (tokens[pos] === '%') { pos++; value /= 100; }
    return value;
  }
  function product() { let value = atom(); while (tokens[pos] === '*' || tokens[pos] === '/') { const op = tokens[pos++]; const next = atom(); value = op === '*' ? value * next : value / next; } return value; }
  function sum() { let value = product(); while (tokens[pos] === '+' || tokens[pos] === '-') { const op = tokens[pos++]; const next = product(); value = op === '+' ? value + next : value - next; } return value; }
  const value = sum();
  if (pos !== tokens.length || !Number.isFinite(value)) throw new Error('Cannot calculate this expression');
  return Number(value.toPrecision(12));
}
