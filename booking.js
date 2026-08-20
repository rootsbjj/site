/* ROOTS — booking engine (widget reutilizável).
 *
 * Monta-se sozinho em qualquer <div data-booking>. Usa schedule.js como
 * fonte dos horários, então nunca oferece uma aula que não existe.
 *
 *   <div data-booking></div>                  → completo (calendário)
 *   <div data-booking data-variant="compact"> → enxuto (trilha de dias)
 *
 * Dispara `roots:booked` no document com o detalhe da reserva.
 */

(() => {
  const SC = window.RootsSchedule;
  if (!SC) return;

  const pad = n => String(n).padStart(2, '0');
  const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const MONTHS = ['January','February','March','April','May','June','July',
                  'August','September','October','November','December'];
  const DOW = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

  /* idade → programa. É isto que torna o formulário "inteligente": o pai
     digita a idade do filho e o programa certo se seleciona sozinho. */
  function programForAge(age) {
    if (!age || isNaN(age)) return null;
    if (age >= 3 && age <= 5) return 'ninjas';
    if (age >= 6 && age <= 11) return 'kids';
    if (age >= 12 && age <= 15) return 'teens';
    return 'adults';
  }

  function mount(root) {
    const compact = root.dataset.variant === 'compact';
    const state = { program: 'adults', month: null, date: null, session: null, sessions: [] };

    root.classList.add('bk', compact ? 'bk--compact' : 'bk--full');
    root.innerHTML = `
      <form class="bk__form" novalidate>
        <section class="bk__step">
          <h3 class="bk__legend"><i>1</i>Who&rsquo;s training?</h3>
          <div class="bk__progs" role="radiogroup" aria-label="Program"></div>
          <label class="bk__age">
            <span>Booking for a child? Enter their age and we&rsquo;ll pick the right class</span>
            <input type="number" min="3" max="99" inputmode="numeric" placeholder="Age" aria-label="Age">
          </label>
        </section>

        <section class="bk__step bk__step--cal">
          <h3 class="bk__legend"><i>2</i>Pick a day</h3>
          <div class="bk__cal"></div>
          <p class="bk__none" hidden></p>
        </section>

        <section class="bk__step">
          <h3 class="bk__legend"><i>3</i>Pick a class</h3>
          <div class="bk__slots"></div>
          <p class="bk__hint" hidden></p>
        </section>

        <section class="bk__step">
          <h3 class="bk__legend"><i>4</i>Where do we send the confirmation?</h3>
          <div class="bk__fields">
            <input class="bk__in" name="name" type="text" placeholder="Your name" required autocomplete="name">
            <input class="bk__in" name="phone" type="tel" placeholder="Mobile number" required autocomplete="tel" inputmode="tel">
            <input class="bk__in bk__in--wide" name="email" type="email" placeholder="Email (optional)" autocomplete="email">
          </div>
          <input class="bk__pot" name="company" type="text" tabindex="-1" autocomplete="off" aria-hidden="true">
        </section>

        <div class="bk__summary" aria-live="polite"></div>
        <button type="submit" class="btn btn--gold bk__submit">Confirm my free class</button>
        <p class="bk__fail" role="alert" hidden>
          We couldn&rsquo;t reach the academy just now, so <b>your class isn&rsquo;t booked yet</b>.
          Please try again, or call us on <a href="tel:1300590598">1300 590 598</a> and
          we&rsquo;ll lock it in for you.
        </p>
        <p class="bk__micro">Free trial &middot; no contract &middot; no payment details.</p>
      </form>

      <div class="bk__done" hidden></div>`;

    const $ = s => root.querySelector(s);
    const form = $('.bk__form');
    const progsEl = $('.bk__progs');
    const calEl = $('.bk__cal');
    const slotsEl = $('.bk__slots');
    const hintEl = $('.bk__hint');
    const noneEl = $('.bk__none');
    const sumEl = $('.bk__summary');
    const failEl = $('.bk__fail');
    const ageEl = $('.bk__age input');

    /* ---------- dados ---------- */
    function reload() {
      state.sessions = SC.nextSessions(state.program, { days: 70, limit: 400 });
      const byDate = new Map();
      state.sessions.forEach(s => {
        if (!byDate.has(s.date)) byDate.set(s.date, []);
        byDate.get(s.date).push(s);
      });
      state.byDate = byDate;
      const first = state.sessions[0];
      if (!first) { state.date = null; state.month = SC.sydneyNow(); }
      else {
        state.month = state.month || new Date(first.iso);
        if (!state.date || !byDate.has(state.date)) state.date = first.date;
      }
      state.session = null;
      renderProgs(); renderCal(); renderSlots(); renderSummary();
    }

    /* ---------- programas ---------- */
    function renderProgs() {
      progsEl.innerHTML = Object.values(SC.PROGRAMS).map(p => `
        <button type="button" role="radio" aria-checked="${p.id === state.program}"
          class="bk__prog ${p.id === state.program ? 'is-on' : ''}" data-prog="${p.id}">
          <b>${p.name.replace(' BJJ', '')}</b><span>${p.ages}</span>
        </button>`).join('');
    }

    /* ---------- calendário ---------- */
    function renderCal() {
      if (compact) return renderDayStrip();
      const m = state.month || SC.sydneyNow();
      const y = m.getFullYear(), mo = m.getMonth();
      const first = new Date(y, mo, 1);
      const startPad = (first.getDay() + 6) % 7;          // semana começa na segunda
      const total = new Date(y, mo + 1, 0).getDate();
      const today = ymd(SC.sydneyNow());

      const last = state.sessions.length
        ? new Date(state.sessions[state.sessions.length - 1].iso) : m;
      const canPrev = new Date(y, mo, 1) > new Date(SC.sydneyNow().getFullYear(), SC.sydneyNow().getMonth(), 1);
      const canNext = new Date(y, mo, 1) < new Date(last.getFullYear(), last.getMonth(), 1);

      let cells = '';
      for (let i = 0; i < startPad; i++) cells += '<span class="bk__cell is-blank"></span>';
      for (let d = 1; d <= total; d++) {
        const key = `${y}-${pad(mo + 1)}-${pad(d)}`;
        const has = state.byDate.has(key);
        const cls = ['bk__cell'];
        if (has) cls.push('has');
        if (key === state.date) cls.push('is-on');
        if (key === today) cls.push('is-today');
        cells += has
          ? `<button type="button" class="${cls.join(' ')}" data-date="${key}">
               ${d}<i></i><em>${state.byDate.get(key).length}</em></button>`
          : `<span class="${cls.join(' ')} is-off">${d}</span>`;
      }

      calEl.innerHTML = `
        <div class="bk__calhead">
          <button type="button" class="bk__nav" data-move="-1" ${canPrev ? '' : 'disabled'} aria-label="Previous month">&larr;</button>
          <strong>${MONTHS[mo]} ${y}</strong>
          <button type="button" class="bk__nav" data-move="1" ${canNext ? '' : 'disabled'} aria-label="Next month">&rarr;</button>
        </div>
        <div class="bk__dow">${DOW.map(d => `<span>${d}</span>`).join('')}</div>
        <div class="bk__grid">${cells}</div>
        <p class="bk__callegend"><i class="bk__dot"></i> days with ${SC.PROGRAMS[state.program].name} classes</p>`;
    }

    /* variante enxuta: trilha horizontal em vez de calendário */
    function renderDayStrip() {
      const keys = [...state.byDate.keys()].slice(0, 10);
      calEl.innerHTML = `<div class="bk__strip">${keys.map(k => {
        const s = state.byDate.get(k)[0];
        return `<button type="button" class="bk__sday ${k === state.date ? 'is-on' : ''}" data-date="${k}">
          <b>${dayLabel(s.iso)}</b><span>${state.byDate.get(k).length} class${state.byDate.get(k).length > 1 ? 'es' : ''}</span>
        </button>`;
      }).join('')}</div>`;
    }

    function dayLabel(iso) {
      const d = new Date(iso), t = SC.sydneyNow();
      const diff = Math.round((new Date(d.toDateString()) - new Date(t.toDateString())) / 864e5);
      if (diff === 0) return 'Today';
      if (diff === 1) return 'Tomorrow';
      return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
    }

    /* ---------- horários do dia ---------- */
    function renderSlots() {
      const list = state.date ? state.byDate.get(state.date) : null;
      if (!list || !list.length) {
        slotsEl.innerHTML = '';
        noneEl.hidden = false;
        noneEl.innerHTML = `No ${SC.PROGRAMS[state.program].name} classes coming up.
          Call <a href="tel:1300590598">1300 590 598</a> and we&rsquo;ll find you a spot.`;
        return;
      }
      noneEl.hidden = true;
      const rec = list.find(s => s.beginner);
      slotsEl.innerHTML = list.map(s => `
        <button type="button" class="bk__slot ${state.session && state.session.iso === s.iso ? 'is-on' : ''}"
          data-iso="${s.iso}">
          <span class="bk__time">${s.range}</span>
          <span class="bk__what">${s.label}${s.ages.startsWith('Ages') || !s.label.includes('\u00b7') ? `<em>${s.ages}</em>` : ''}</span>
          ${rec === s ? '<span class="bk__flag">Best for a first class</span>' : ''}
        </button>`).join('');

      /* se a aula ideal para novato está noutro dia, aponta o caminho */
      const recAll = state.sessions.find(s => s.beginner);
      if (recAll && !rec) {
        hintEl.hidden = false;
        hintEl.innerHTML = `Never trained before? <b>${recAll.label}</b> on
          <button type="button" data-goto="${recAll.date}">${dayLabel(recAll.iso)}, ${recAll.range}</button>
          is the gentlest place to start.`;
      } else hintEl.hidden = true;
    }

    /* ---------- resumo + validação ---------- */
    function renderSummary() {
      if (!state.session) { sumEl.hidden = true; return; }
      const s = state.session;
      sumEl.hidden = false;
      sumEl.innerHTML = `<b>${s.label}</b> &middot; ${dayLabel(s.iso)}, ${s.range}
        <span>ROOTS BJJ Brookvale &middot; 2/16 Dale Street</span>`;
    }

    /* ---------- eventos ---------- */
    root.addEventListener('click', e => {
      const prog = e.target.closest('[data-prog]');
      if (prog) { state.program = prog.dataset.prog; state.month = null; state.date = null; reload(); return; }

      const move = e.target.closest('[data-move]');
      if (move) {
        const m = new Date(state.month);
        m.setMonth(m.getMonth() + Number(move.dataset.move), 1);
        state.month = m; renderCal(); return;
      }

      const day = e.target.closest('[data-date]');
      if (day) {
        state.date = day.dataset.date; state.session = null;
        renderCal(); renderSlots(); renderSummary(); return;
      }

      const goto = e.target.closest('[data-goto]');
      if (goto) {
        state.date = goto.dataset.goto;
        state.month = new Date(state.date + 'T00:00:00');
        state.session = null;
        renderCal(); renderSlots(); renderSummary(); return;
      }

      const slot = e.target.closest('[data-iso]');
      if (slot) {
        state.session = state.sessions.find(s => s.iso === slot.dataset.iso) || null;
        renderSlots(); renderSummary();
        root.querySelector('.bk__in[name="name"]').focus({ preventScroll: true });
      }
    });

    /* idade → programa automático */
    ageEl.addEventListener('input', () => {
      const p = programForAge(Number(ageEl.value));
      if (p && p !== state.program) {
        state.program = p; state.month = null; state.date = null; reload();
        ageEl.closest('.bk__age').classList.add('is-matched');
        setTimeout(() => ageEl.closest('.bk__age').classList.remove('is-matched'), 1400);
      }
    });

    /* ---------- envio ao backend ----------
       Tenta 3 vezes com espera crescente. O lead é a coisa mais cara do
       site: nunca damos "confirmado" sem que o Telegram tenha aceitado. */
    async function sendBooking(booking) {
      let lastErr = null;
      for (let i = 0; i < 3; i++) {
        try {
          const r = await fetch('/api/book', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(booking),
          });
          if (r.ok) return true;
          // 4xx é culpa do payload — repetir não ajuda
          if (r.status >= 400 && r.status < 500) return false;
          lastErr = new Error('http ' + r.status);
        } catch (err) {
          lastErr = err;
        }
        await new Promise(r => setTimeout(r, 400 * Math.pow(2, i)));
      }
      console.error('reserva não enviada:', lastErr && lastErr.message);
      return false;
    }

    /* ---------- submit ---------- */
    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (!state.session) {
        root.querySelector('.bk__step--cal').classList.add('is-missing');
        setTimeout(() => root.querySelector('.bk__step--cal').classList.remove('is-missing'), 2000);
        calEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
        return;
      }
      if (!form.checkValidity()) { form.reportValidity(); return; }

      const s = state.session;
      const booking = {
        program: state.program, programName: SC.PROGRAMS[state.program].name,
        date: s.date, iso: s.iso, start: s.start, end: s.end,
        classLabel: s.label, ages: s.ages,
        name: form.name.value.trim(),
        phone: form.phone.value.trim(),
        email: form.email.value.trim() || null,
        company: form.company ? form.company.value : '',   // honeypot
        source: location.pathname.includes('landing') ? 'ads-landing' : 'website',
      };

      const btn = root.querySelector('.bk__submit');
      const btnText = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Confirming…';
      failEl.hidden = true;

      const sent = await sendBooking(booking);

      btn.disabled = false;
      btn.textContent = btnText;

      if (!sent) {
        // não mentimos para o cliente: a reserva não chegou na academia
        failEl.hidden = false;
        failEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
        return;
      }

      document.dispatchEvent(new CustomEvent('roots:booked', { detail: booking }));

      /* A confirmação vive numa URL própria (/booked.html) para servir de
         meta de conversão no Meta Ads. Os dados vão por sessionStorage —
         nunca na query string, que vaza nome e telefone em log e referrer. */
      try {
        sessionStorage.setItem('roots:receipt', JSON.stringify({
          day: new Date(s.iso).toLocaleDateString('en-AU',
            { weekday: 'long', day: 'numeric', month: 'long' }),
          range: s.range, label: s.label, ages: s.ages,
          ics: icsHref(s), source: booking.source,
        }));
      } catch (_) { /* modo privado bloqueia storage — segue para a página */ }
      location.href = 'booked.html';
    });

    function icsHref(s) {
      const z = n => String(n).padStart(2, '0');
      const st = d => `${d.getUTCFullYear()}${z(d.getUTCMonth() + 1)}${z(d.getUTCDate())}T${z(d.getUTCHours())}${z(d.getUTCMinutes())}00Z`;
      const start = new Date(s.iso);
      const [eh, em] = s.end.split(':').map(Number);
      const end = new Date(start); end.setHours(eh, em, 0, 0);
      return 'data:text/calendar;charset=utf-8,' + encodeURIComponent([
        'BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//ROOTS BJJ//Trial//EN','BEGIN:VEVENT',
        `UID:${start.getTime()}@rootsbjj.com.au`, `DTSTAMP:${st(new Date())}`,
        `DTSTART:${st(start)}`, `DTEND:${st(end)}`,
        `SUMMARY:Free trial — ${s.label} at ROOTS BJJ`,
        'LOCATION:2/16 Dale Street, Brookvale NSW 2100',
        'DESCRIPTION:Arrive 10 minutes early. Comfortable clothes and a water bottle.',
        'END:VEVENT','END:VCALENDAR'].join('\r\n'));
    }

    /* veio da timetable com programa e dia já escolhidos */
    const pre = sessionStorage.getItem('roots:program');
    const preDate = sessionStorage.getItem('roots:date');
    if (pre && SC.PROGRAMS[pre]) state.program = pre;
    sessionStorage.removeItem('roots:program');
    reload();
    if (preDate && state.byDate.has(preDate)) {
      state.date = preDate;
      state.month = new Date(preDate + 'T00:00:00');
      renderCal(); renderSlots();
    }
    sessionStorage.removeItem('roots:date');
  }

  document.querySelectorAll('[data-booking]').forEach(mount);
  window.RootsBookingMount = mount;
})();
