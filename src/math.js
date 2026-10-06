export function calculate(expression, angleMode = "deg") {
  const source = expression
    .replaceAll("×", "*")
    .replaceAll("÷", "/")
    .replaceAll("−", "-")
    .replaceAll("π", "pi");
  const tokens =
    source.match(/(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?|[a-z]+|[()+\-*/%^!,]/gi) ||
    [];
  if (
    tokens.join("") !== source.replace(/\s+/g, "") ||
    !tokens.length ||
    tokens.length > 512
  )
    throw new Error("Enter a valid expression.");
  let pos = 0;
  const radians = (x) => (angleMode === "deg" ? (x * Math.PI) / 180 : x);
  const functions = {
    sqrt: Math.sqrt,
    abs: Math.abs,
    ln: Math.log,
    log: Math.log10,
    exp: Math.exp,
    sin: (x) => Math.sin(radians(x)),
    cos: (x) => Math.cos(radians(x)),
    tan: (x) => Math.tan(radians(x)),
  };
  function primary() {
    const token = tokens[pos++];
    if (token === "(") {
      const value = sum();
      if (tokens[pos++] !== ")") throw new Error("Close your parentheses.");
      return value;
    }
    if (token === "pi") return Math.PI;
    if (token === "e") return Math.E;
    if (functions[token]) {
      if (tokens[pos++] !== "(")
        throw new Error("Use parentheses for functions.");
      const value = sum();
      if (tokens[pos++] !== ")") throw new Error("Close your parentheses.");
      return functions[token](value);
    }
    if (!token || !/^(?:\d|\.)/.test(token))
      throw new Error("Check your expression.");
    return Number(token);
  }
  function postfix() {
    let value = primary();
    while (tokens[pos] === "%" || tokens[pos] === "!") {
      if (tokens[pos++] === "%") value /= 100;
      else {
        if (!Number.isInteger(value) || value < 0 || value > 170)
          throw new Error("Factorial needs a whole number from 0 to 170.");
        let product = 1;
        for (let n = 2; n <= value; n++) product *= n;
        value = product;
      }
    }
    return value;
  }
  function power() {
    const value = postfix();
    return tokens[pos] === "^" ? (pos++, value ** unary()) : value;
  }
  function unary() {
    if (tokens[pos] === "+" || tokens[pos] === "-") {
      const sign = tokens[pos++];
      return unary() * (sign === "-" ? -1 : 1);
    }
    return power();
  }
  function product() {
    let value = unary();
    while (tokens[pos] === "*" || tokens[pos] === "/") {
      const op = tokens[pos++],
        next = unary();
      value = op === "*" ? value * next : value / next;
    }
    return value;
  }
  function sum() {
    let value = product();
    while (tokens[pos] === "+" || tokens[pos] === "-") {
      const op = tokens[pos++],
        next = product();
      value = op === "+" ? value + next : value - next;
    }
    return value;
  }
  const value = sum();
  if (pos !== tokens.length || !Number.isFinite(value))
    throw new Error("Cannot calculate this expression.");
  return Number(value.toPrecision(14));
}
