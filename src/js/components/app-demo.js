// Independent phone demo. Client, team and management share local session state.
export function initAppDemo() {
  const scene = document.querySelector('.app-scene');
  if (!scene) return;
  const $ = (selector) => scene.querySelector(selector);
  const $$ = (selector) => [...scene.querySelectorAll(selector)];
  const tabs = $$('[data-app-tab]');
  const tasks = $$('[data-app-task]');
  const feedback = $('[data-app-feedback]');
  let activeIndex = 0;
  let day = '21';
  let time = '09:00';
  let booking = null;
  let visitComplete = false;
  $$('button, input').forEach((control) => {
    control.disabled = false;
  });
  function announce(message) {
    feedback.textContent = message;
  }
  function selectTab(tab, focus = false) {
    const nextIndex = tabs.indexOf(tab);
    scene.style.setProperty(
      '--app-enter-offset',
      nextIndex < activeIndex ? '-16px' : '16px',
    );
    scene.style.setProperty('--app-tab-index', nextIndex);
    activeIndex = nextIndex;
    tabs.forEach((item) => {
      const selected = item === tab;
      item.setAttribute('aria-selected', String(selected));
      item.tabIndex = selected ? 0 : -1;
      $(`#${item.getAttribute('aria-controls')}`).hidden = !selected;
    });
    if (focus) tab.focus({ preventScroll: true });
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', (event) => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft')
        next = (index + tabs.length - 1) % tabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabs.length - 1;
      else return;
      event.preventDefault();
      selectTab(tabs[next], true);
    });
  });
  const confirmBooking = $('[data-confirm-booking]');
  const bookingResult = $('[data-booking-result]');
  function updateBookingSelection() {
    const confirmed = booking?.day === day && booking?.time === time;
    confirmBooking.disabled = confirmed;
    confirmBooking.dataset.confirmed = String(confirmed);
    $('[data-booking-label]').textContent = confirmed
      ? 'Horário confirmado'
      : booking
        ? 'Atualizar horário'
        : 'Confirmar horário';
    bookingResult.dataset.success = String(confirmed);
    bookingResult.textContent = confirmed
      ? `${day} de outubro, às ${time} · Confirmado`
      : booking
        ? 'Confirme para atualizar sua agenda.'
        : 'Escolha um dia e um horário.';
    confirmBooking
      .querySelector('use')
      .setAttribute('href', confirmed ? '#i-check' : '#i-arrow');
  }
  $$('[data-app-day]').forEach((button) =>
    button.addEventListener('click', () => {
      day = button.dataset.appDay;
      $$('[data-app-day]').forEach((item) =>
        item.setAttribute('aria-pressed', String(item === button)),
      );
      updateBookingSelection();
    }),
  );
  $$('[data-app-time]').forEach((button) =>
    button.addEventListener('click', () => {
      time = button.dataset.appTime;
      $$('[data-app-time]').forEach((item) =>
        item.setAttribute('aria-pressed', String(item === button)),
      );
      updateBookingSelection();
    }),
  );
  $('[data-confirm-booking]').addEventListener('click', () => {
    booking = { day, time };
    $('[data-admin-appointment]').innerHTML =
      `<span class="app-date-tile"><b>${day}</b>OUT</span><div><strong>Atendimento online</strong><small>${time} · Lucas Pereira</small></div>`;
    $('[data-app-bookings]').textContent = '13';
    updateBookingSelection();
    // Keep keyboard focus visible after the completed action becomes disabled.
    $('#app-panel-clientes').focus({ preventScroll: true });
    announce(
      `Horário demonstrativo selecionado: ${booking.day} de outubro, às ${booking.time}. Agenda da gestão atualizada.`,
    );
  });
  function updateTasks() {
    const count = tasks.filter((task) => task.checked).length;
    $('[data-task-progress]').textContent =
      `${count} de ${tasks.length} etapas`;
    $('[data-task-track]').style.width = `${(count / tasks.length) * 100}%`;
    $('[data-complete-visit]').disabled =
      !visitComplete && count < tasks.length;
    $('[data-task-hint]').textContent = visitComplete
      ? 'Visita registrada na gestão.'
      : count === tasks.length
        ? 'Tudo pronto para concluir.'
        : 'Marque as etapas para concluir.';
  }
  tasks.forEach((task) => task.addEventListener('change', updateTasks));
  $('[data-complete-visit]').addEventListener('click', () => {
    visitComplete = !visitComplete;
    if (!visitComplete)
      tasks.forEach((task) => {
        task.checked = false;
      });
    tasks.forEach((task) => {
      task.disabled = visitComplete;
    });
    $('[data-visit-status]').textContent = visitComplete
      ? 'Concluída'
      : 'Em andamento';
    $('[data-app-visits]').textContent = visitComplete ? '9' : '8';
    $('[data-complete-visit] > span').textContent = visitComplete
      ? 'Reiniciar checklist '
      : 'Concluir visita ';
    updateTasks();
    if (!visitComplete) tasks[0].focus({ preventScroll: true });
    announce(
      visitComplete
        ? 'Visita concluída. Indicador da gestão atualizado para 9.'
        : 'Checklist reiniciado.',
    );
  });
  $('[data-approve-request]').addEventListener('click', (event) => {
    const button = event.currentTarget;
    button.querySelector('span').textContent = 'Aprovado';
    button.disabled = true;
    $('[data-approval-count]').textContent = '0';
    $('.app-pending').lastChild.textContent = ' pendentes';
    // Keep focus in the active panel when the completed action becomes disabled.
    $('#app-panel-gestao').focus({ preventScroll: true });
    announce(
      'Reposição de materiais aprovada nesta demonstração. Nenhuma pendência.',
    );
  });
  updateTasks();
}
