// Runs before the first paint. If the module fails, load restores the static UI.
document.documentElement.classList.add('enhancing');
addEventListener(
  'load',
  () => document.documentElement.classList.remove('enhancing'),
  { once: true },
);
