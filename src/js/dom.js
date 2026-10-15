export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [
  ...root.querySelectorAll(selector),
];

// Let layout and essential controls paint before initializing decorative canvases.
export function afterPaint(callback) {
  requestAnimationFrame(() => requestAnimationFrame(callback));
}
