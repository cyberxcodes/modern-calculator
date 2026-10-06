# Orbit calculator

A responsive web calculator with keyboard input, local calculation history, light and dark themes, and scientific functions (angles in degrees). No backend or credentials required.

## Development

Use Node.js 20.19+ or 22.12+.

```sh
npm ci
npm run dev -- --port 5173
```

## Validation

```sh
npm test
npm run build
```

Keyboard: digits and operators, Enter to calculate, Escape to clear, Backspace to delete. Percent converts a value to its fraction (`200 × 10% = 20`). History stays in your browser; Clear removes it.
