/* ROOTS — booking engine.
 *
 * Liga a grade real (schedule.js) ao formulário: o visitante escolhe o
 * programa, vê só as aulas que existem de verdade, e sai com data e hora
 * concretas. Nada de "a gente te liga para combinar".
 */

(() => {
  const SC = window.RootsSchedule;
  if (!SC) return;

  const form = document.getElementById('ldForm');
  const daysEl = document.getElementById('ldDays');
  const timesEl = document.getElementById('ldTimes');
  const hidden = document.getElementById('ld-session');
  if (!form || !daysEl || !timesEl) return;

  let program = 'adults';
  let sessions = [];
  let byDate = new Map();
  let activeDate = null;
  let chosen = null;

  const AU = { weekday: 'short', day: 'numeric', month: 'short' };
  const label = iso => {
    const d = new Date(iso);
    const t = SC.sydneyNow();
    const days = Math.round((new Date(d.toDateString()) - new Date(t.toDateString())) / 864e5);
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    return d.toLocaleDateString('en-AU', AU);
  };
  /* "Tomorrow (Friday)" ou só "Mon, 3 Aug" — sem repetir o dia da semana */
  const whenText = s => {
    const l = label(s.iso);
    return (l === 'Today' || l === 'Tomorrow') ? `${l} · ${s.dayName}` : l;
  };

  /* ---------- build ---------- */
  function load(p) {
    program = p;
    chosen = null;
    hidden.value = '';
    sessions = SC.nextSessions(program, { days: 21, limit: 60 });
    byDate = new Map();
    sessions.forEach(s => {
      if (!byDate.has(s.date)) byDate.set(s.date, []);
      byDate.get(s.date).push(s);
    });
    activeDate = [...byDate.keys()][0] || null;
    renderDays();
    renderTimes();
    renderHint();
  }

  /* Se a aula ideal para iniciante não está no dia aberto, aponta para ela.
     Adultos só têm Fundamentals seg/qua — sem isso o novato não descobre. */
  function renderHint() {
    const el = document.getElementById('ldHint');
    if (!el) return;
    const rec = sessions.find(s => s.beginner);
    const openHasRec = activeDate && byDate.get(activeDate)?.some(s => s.beginner);
    if (!rec || openHasRec) { el.hidden = true; return; }
    el.hidden = false;
    el.innerHTML = `Never trained before? <b>${rec.label}</b> on
      <button type="button" data-goto="${rec.date}">${label(rec.iso)}, ${rec.range}</button>
      is the easiest place to start.`;
  }

  function renderDays() {
    const keys = [...byDate.keys()].slice(0, 8);
    if (!keys.length) {
      daysEl.innerHTML = '';
      return;
    }
    daysEl.innerHTML = keys.map(d => {
      const first = byDate.get(d)[0];
      return `<button type="button" role="tab" class="ld-day ${d === activeDate ? 'is-on' : ''}"
        data-date="${d}" aria-selected="${d === activeDate}">
        <b>${label(first.iso)}</b><span>${byDate.get(d).length} class${byDate.get(d).length > 1 ? 'es' : ''}</span>
      </button>`;
    }).join('');
  }

  function renderTimes() {
    if (!activeDate) {
      timesEl.innerHTML = `<p class="ld-slots__empty">No ${SC.PROGRAMS[program].name} classes in the
        next three weeks. Call <a href="tel:1300590598">1300 590 598</a> and we&rsquo;ll sort you out.</p>`;
      return;
    }
    const list = byDate.get(activeDate);
    const rec = list.find(s => s.beginner);
    timesEl.innerHTML = list.map(s => {
      const isRec = rec && s === rec;
      const on = chosen && chosen.iso === s.iso;
      return `<button type="button" class="ld-slot ${on ? 'is-on' : ''}" data-iso="${s.iso}">
        <span class="ld-slot__time">${s.range}</span>
        <span class="ld-slot__what">${s.label}<em>${s.ages}</em></span>
        ${isRec ? '<span class="ld-slot__flag">Best for a first class</span>' : ''}
      </button>`;
    }).join('');
  }

  /* ---------- interaction ---------- */
  daysEl.addEventListener('click', e => {
    const b = e.target.closest('.ld-day');
    if (!b) return;
    activeDate = b.dataset.date;
    renderDays();
    renderTimes();
    renderHint();
  });

  document.getElementById('ldHint')?.addEventListener('click', e => {
    const b = e.target.closest('[data-goto]');
    if (!b) return;
    activeDate = b.dataset.goto;
    renderDays();
    renderTimes();
    renderHint();
    daysEl.querySelector('.ld-day.is-on')?.scrollIntoView({ block: 'nearest', inline: 'center' });
  });

  timesEl.addEventListener('click', e => {
    const b = e.target.closest('.ld-slot');
    if (!b) return;
    chosen = sessions.find(s => s.iso === b.dataset.iso) || null;
    hidden.value = chosen ? `${whenText(chosen)} · ${chosen.range} · ${chosen.label}` : '';
    renderTimes();
    renderHint();
    document.getElementById('ldMicro').textContent = chosen
      ? `${chosen.label} — ${whenText(chosen)}, ${chosen.range}. Free trial, no contract.`
      : 'Free trial, no contract. We’ll text you a confirmation — arrive 10 minutes early.';
  });

  form.addEventListener('change', e => {
    if (e.target.name === 'program') load(e.target.value);
  });

  /* ---------- expose for landing.js ---------- */
  window.RootsBooking = {
    get chosen() { return chosen; },
    get program() { return SC.PROGRAMS[program]; },
    /** valida antes do submit; devolve mensagem de erro ou null */
    validate() {
      if (!chosen) return 'Pick a class time first.';
      return null;
    },
    /** cartão de confirmação */
    ticketHTML() {
      if (!chosen) return '';
      return `
        <div class="ld-ticket__day">${chosen.dayName}, ${new Date(chosen.iso)
          .toLocaleDateString('en-AU', { day: 'numeric', month: 'long' })}</div>
        <div class="ld-ticket__time">${chosen.range}</div>
        <div class="ld-ticket__what">${chosen.label} · ${chosen.ages}</div>
        <div class="ld-ticket__where">ROOTS BJJ Brookvale · 2/16 Dale Street</div>`;
    },
    /** arquivo .ics para "adicionar ao calendário" */
    icsHref() {
      if (!chosen) return '#';
      const z = n => String(n).padStart(2, '0');
      const stamp = d => `${d.getUTCFullYear()}${z(d.getUTCMonth() + 1)}${z(d.getUTCDate())}T${z(d.getUTCHours())}${z(d.getUTCMinutes())}00Z`;
      const start = new Date(chosen.iso);
      const [eh, em] = chosen.end.split(':').map(Number);
      const end = new Date(start); end.setHours(eh, em, 0, 0);
      const ics = [
        'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ROOTS BJJ//Trial//EN',
        'BEGIN:VEVENT',
        `UID:${start.getTime()}@rootsbjj.com.au`,
        `DTSTAMP:${stamp(new Date())}`,
        `DTSTART:${stamp(start)}`,
        `DTEND:${stamp(end)}`,
        `SUMMARY:Free trial — ${chosen.label} at ROOTS BJJ`,
        'LOCATION:2/16 Dale Street, Brookvale NSW 2100',
        'DESCRIPTION:Arrive 10 minutes early. Comfortable clothes and a water bottle.',
        'END:VEVENT', 'END:VCALENDAR',
      ].join('\r\n');
      return 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics);
    },
  };

  /* se o visitante veio de um clique na timetable, já abre no programa dele */
  const fromTimetable = sessionStorage.getItem('roots:program');
  if (fromTimetable && SC.PROGRAMS[fromTimetable]) {
    const chip = document.querySelector(`.ld-chips input[value="${fromTimetable}"]`);
    if (chip) chip.checked = true;
    sessionStorage.removeItem('roots:program');
    load(fromTimetable);
  } else {
    load('adults');
  }
})();
