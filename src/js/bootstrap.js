// Runs before the first paint. If the module fails, load restores the static UI.
document.documentElement.classList.add('enhancing');
const entryRoot = document.documentElement;
if (
  entryRoot.dataset.entryAddress &&
  !location.hash &&
  !matchMedia('(prefers-reduced-motion: reduce)').matches &&
  performance.getEntriesByType('navigation')[0]?.type !== 'back_forward'
) {
  entryRoot.classList.add('entry-active');
  setTimeout(() => entryRoot.classList.remove('entry-active'), 3200);
}
addEventListener(
  'load',
  () => document.documentElement.classList.remove('enhancing'),
  { once: true },
);
