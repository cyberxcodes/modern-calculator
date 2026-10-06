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

## GitHub Pages

The deployment workflow tests and builds the application with the `/modern-calculator/` base path, then publishes the static output to `gh-pages` on every push to `main`.

In repository **Settings → Pages**, choose **Deploy from a branch**, select **gh-pages** and **/ (root)**, then save. The website will be at https://cyberxcodes.github.io/modern-calculator/.
