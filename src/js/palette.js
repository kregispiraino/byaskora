// Canvas effects read the same CSS tokens as the rest of the site.
export function tokenRgb(name) {
  const hex = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim()
    .replace('#', '');
  return [0, 2, 4].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));
}
