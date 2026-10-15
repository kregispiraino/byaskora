import { initDemoSelects } from './demo-select.js';

// Local, illustrative state only. No API calls or company data.
export function initManagementDemo() {
  const scene = document.querySelector('.management-demo');
  if (!scene) return;
  const $ = (selector) => scene.querySelector(selector);
  const $$ = (selector) => [...scene.querySelectorAll(selector)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const compact = matchMedia('(max-width: 700px)');
  const tabs = $$('[data-management-view]');
  const feedback = $('[data-management-feedback]');
  const records = [
    {
      id: 'ADM-014',
      title: 'Revisão de contrato',
      area: 'administrativo',
      owner: 'Ana Costa',
    },
    {
      id: 'FIN-021',
      title: 'Validação de despesas',
      area: 'financeiro',
      owner: 'Bruno Lima',
    },
    {
      id: 'COM-008',
      title: 'Atualização de cadastro',
      area: 'comercial',
      owner: 'Carla Martins',
    },
    {
      id: 'ADM-015',
      title: 'Compra de equipamentos',
      area: 'administrativo',
      owner: 'Ana Costa',
    },
    {
      id: 'FIN-022',
      title: 'Conferência de pagamentos',
      area: 'financeiro',
      owner: 'Bruno Lima',
    },
    {
      id: 'COM-009',
      title: 'Revisão de proposta',
      area: 'comercial',
      owner: 'Carla Martins',
    },
  ].map((record) => ({ ...record, done: false }));
  const areas = {
    administrativo: { label: 'Administrativo', total: 48, done: 40 },
    financeiro: { label: 'Financeiro', total: 40, done: 26 },
    comercial: { label: 'Comercial', total: 40, done: 30 },
  };
  let rowAnimation;
  let syncing = false;
  $$('button, select').forEach((control) => {
    control.disabled = false;
  });
  initDemoSelects(scene);
  function announce(message) {
    feedback.textContent = message;
  }
  function animateRows() {
    rowAnimation?.cancel();
    if (reduced.matches) return;
    rowAnimation = $('[data-operation-rows]').animate(
      [
        // Keep click targets still while records are filtered or completed.
        { opacity: 0 },
        { opacity: 1 },
      ],
      { duration: 260, easing: 'cubic-bezier(.22,1,.36,1)' },
    );
  }
  function selectTab(tab, focus = false) {
    if (!tab || tab.getAttribute('aria-selected') === 'true') return;
    tabs.forEach((item) => {
      const active = item === tab;
      item.setAttribute('aria-selected', String(active));
      item.tabIndex = active ? 0 : -1;
      document.getElementById(item.getAttribute('aria-controls')).hidden =
        !active;
    });
    $('[data-management-current]').textContent = tab.textContent.trim();
    if (focus) tab.focus({ preventScroll: true });
  }
  function syncOrientation() {
    $('.mg-nav').setAttribute(
      'aria-orientation',
      compact.matches ? 'horizontal' : 'vertical',
    );
  }
  syncOrientation();
  compact.addEventListener('change', syncOrientation);
  reduced.addEventListener('change', () => {
    if (reduced.matches) rowAnimation?.cancel();
  });
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', (event) => {
      let next;
      if (['ArrowDown', 'ArrowRight'].includes(event.key))
        next = (index + 1) % tabs.length;
      else if (['ArrowUp', 'ArrowLeft'].includes(event.key))
        next = (index + tabs.length - 1) % tabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabs.length - 1;
      else return;
      event.preventDefault();
      selectTab(tabs[next], true);
    });
  });
  function updateDashboard() {
    const area = $('#system-area').value;
    const totals = Object.entries(areas).reduce(
      (sum, [key, item]) => {
        const done =
          item.done +
          records.filter((record) => record.area === key && record.done).length;
        const percent = Math.round((done / item.total) * 100);
        $(`[data-area-caption="${key}"]`).textContent =
          `${done} de ${item.total} concluídas`;
        $(`[data-area-percent="${key}"]`).textContent = `${percent}%`;
        $(`[data-area-track="${key}"]`).style.width = `${percent}%`;
        $(`[data-area="${key}"]`).hidden = area !== 'todas' && area !== key;
        if (area === 'todas' || area === key) {
          sum.total += item.total;
          sum.done += done;
        }
        return sum;
      },
      { total: 0, done: 0 },
    );
    const open = totals.total - totals.done;
    Object.entries({ ...totals, open }).forEach(([key, value]) => {
      $(`[data-metric="${key}"]`).textContent = value;
    });
    const percent = Math.round((totals.done / totals.total) * 100);
    $('[data-completion]').textContent = `${percent}%`;
    $('[data-completion-track]').style.width = `${percent}%`;
    // Both paths share a scale and end at the selected area's actual totals.
    const profile = [0, 0.14, 0.28, 0.49, 0.65, 0.83, 1];
    const points = profile.map(
      (value, index) =>
        `${index * 80} ${140 - ((value * totals.done) / totals.total) * 128}`,
    );
    const line = `M${points.join(' L')}`;
    $('[data-chart-done]').setAttribute('d', line);
    $('[data-chart-area]').setAttribute('d', `${line} V140H0Z`);
    $('[data-chart-point]').setAttribute(
      'cy',
      140 - (totals.done / totals.total) * 128,
    );
    $('#mg-chart-title').textContent =
      `Solicitações acumuladas em setembro: ${totals.total} recebidas e ${totals.done} concluídas. ${area === 'todas' ? 'Todas as áreas' : areas[area].label}.`;
  }
  $('#system-area').addEventListener('change', updateDashboard);
  function renderRecords() {
    const filter = $('[data-operation-filter]').value;
    const filtered = records.filter(
      (record) =>
        filter === 'todas' || record.done === (filter === 'concluida'),
    );
    $('[data-operation-rows]').innerHTML = filtered.length
      ? filtered
          .map(
            (record) =>
              `<tr><td><strong>${record.title}</strong><small>${record.id} · ${areas[record.area].label}</small></td><td><span class="mg-person">${record.owner}</span></td><td><span class="mg-status" data-status="${record.done ? 'concluida' : 'pendente'}">${record.done ? '<i></i>Concluída' : 'Em análise'}</span></td><td>${record.done ? '<span class="mg-row-done" aria-label="Solicitação concluída">✓</span>' : `<button type="button" class="mg-row-action" data-complete="${record.id}" aria-label="Concluir ${record.title.toLowerCase()}">Concluir</button>`}</td></tr>`,
          )
          .join('')
      : '<tr><td colspan="4" class="mg-empty">Nenhuma solicitação neste status.</td></tr>';
    const pending = records.filter((record) => !record.done).length;
    $('[data-pending-count]').textContent = `${pending} em análise`;
  }
  $('[data-operation-rows]').addEventListener('click', (event) => {
    const button = event.target.closest('[data-complete]');
    if (!button) return;
    const record = records.find((item) => item.id === button.dataset.complete);
    if (!record || record.done) return;
    record.done = true;
    renderRecords();
    updateDashboard();
    animateRows();
    const next =
      $('[data-complete]') ||
      $('[data-operation-filter]').parentElement.querySelector(
        '[data-select-trigger]',
      );
    next.focus({ preventScroll: true });
    announce(`${record.id} concluída. Dashboard atualizado.`);
  });
  $('[data-operation-filter]').addEventListener('change', () => {
    $('.mg-table-wrap').scrollTop = 0;
    renderRecords();
    animateRows();
  });
  $$('[data-sync]').forEach((button) => {
    button.addEventListener('click', () => {
      if (syncing) return;
      syncing = true;
      const card = button.closest('.mg-connector');
      const name = card.querySelector('h3').textContent;
      card.dataset.syncing = 'true';
      card.setAttribute('aria-busy', 'true');
      $$('[data-sync]').forEach((control) => {
        control.disabled = true;
      });
      button.querySelector('span').textContent = 'Sincronizando';
      announce(`Sincronizando ${name}…`);
      window.setTimeout(
        () => {
          syncing = false;
          card.dataset.syncing = 'false';
          card.setAttribute('aria-busy', 'false');
          $$('[data-sync]').forEach((control) => {
            control.disabled = false;
          });
          button.querySelector('span').textContent = 'Sincronizar';
          card.querySelector('[data-sync-time]').textContent = 'Agora';
          $('[data-sync-title]').textContent = `${name} sincronizado`;
          $('[data-sync-description]').textContent =
            'Registros conferidos · Nenhuma pendência';
          $('[data-sync-last]').textContent = 'Agora';
          announce(`${name}: sincronização demonstrativa concluída.`);
        },
        reduced.matches ? 0 : 750,
      );
    });
  });
  renderRecords();
  updateDashboard();
}
