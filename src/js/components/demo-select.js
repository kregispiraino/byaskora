// Select-only combobox: focus stays on the trigger while exploring options.
export function initDemoSelects(root) {
  root.querySelectorAll('[data-demo-select]').forEach((container) => {
    const trigger = container.querySelector('[data-select-trigger]');
    const value = container.querySelector('[data-select-value]');
    const label = container.querySelector('[data-select-label]');
    const list = container.querySelector('[role="listbox"]');
    const options = [...list.querySelectorAll('[role="option"]')];
    let active = 0;
    let search = '';
    let lastKeyAt = 0;
    const selected = () =>
      options.findIndex(
        (option) => option.dataset.selectOption === value.value,
      );
    const normalize = (text) =>
      text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
    function highlight(index) {
      active = (index + options.length) % options.length;
      options.forEach((option, i) => {
        option.dataset.active = String(i === active);
      });
      trigger.setAttribute('aria-activedescendant', options[active].id);
    }
    function open() {
      list.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
      highlight(selected());
      search = '';
    }
    function close() {
      list.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
      trigger.removeAttribute('aria-activedescendant');
      search = '';
    }
    function commit(index) {
      const option = options[index];
      const changed = value.value !== option.dataset.selectOption;
      value.value = option.dataset.selectOption;
      label.textContent = option.querySelector('span').textContent;
      options.forEach((item) =>
        item.setAttribute('aria-selected', String(item === option)),
      );
      close();
      trigger.focus({ preventScroll: true });
      if (changed) value.dispatchEvent(new Event('change', { bubbles: true }));
    }
    trigger.addEventListener('click', () => {
      if (list.hidden) open();
      else close();
    });
    trigger.addEventListener('keydown', (event) => {
      if (event.key === 'Tab') {
        close();
        return;
      }
      if (event.key === 'Escape') {
        if (!list.hidden) {
          event.preventDefault();
          event.stopPropagation();
          close();
        }
        return;
      }
      if (['Enter', ' '].includes(event.key)) {
        event.preventDefault();
        if (list.hidden) open();
        else commit(active);
        return;
      }
      if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault();
        const wasOpen = !list.hidden;
        if (!wasOpen) open();
        if (event.key === 'Home') highlight(0);
        else if (event.key === 'End') highlight(options.length - 1);
        else if (wasOpen)
          highlight(active + (event.key === 'ArrowDown' ? 1 : -1));
        return;
      }
      if (
        event.key.length === 1 &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.metaKey
      ) {
        event.preventDefault();
        if (list.hidden) open();
        const now = performance.now();
        search = now - lastKeyAt > 700 ? event.key : search + event.key;
        lastKeyAt = now;
        const index = options.findIndex((option) =>
          normalize(option.textContent.trim()).startsWith(normalize(search)),
        );
        if (index !== -1) highlight(index);
      }
    });
    options.forEach((option, index) => {
      option.addEventListener('pointerdown', (event) => event.preventDefault());
      option.addEventListener('pointermove', () => highlight(index));
      option.addEventListener('click', () => commit(index));
    });
    document.addEventListener('pointerdown', (event) => {
      if (!container.contains(event.target)) close();
    });
    document.addEventListener('focusin', (event) => {
      if (!container.contains(event.target)) close();
    });
  });
}
