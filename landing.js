/* ROOTS free-trial landing — one goal: the booking form.
   Journey: ad click → form above the fold → book → "what happens next". */

(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Reveal on scroll (jump-safe sweep) ---------- */
  const revealEls = [...document.querySelectorAll('.reveal')];
  const revealSweep = () => {
    const vh = window.innerHeight;
    for (let i = revealEls.length - 1; i >= 0; i--) {
      if (revealEls[i].getBoundingClientRect().top < vh * 0.92) {
        revealEls[i].classList.add('is-in');
        revealEls.splice(i, 1);
      }
    }
  };

  /* ---------- Sticky mobile CTA: hidden while the form is on screen ---------- */
  const sticky = document.getElementById('ldSticky');
  const formCard = document.getElementById('form');
  const updateSticky = () => {
    const r = formCard.getBoundingClientRect();
    const formVisible = r.top < window.innerHeight * 0.85 && r.bottom > 120;
    sticky.classList.toggle('is-shown', !formVisible);
  };

  const onScroll = () => requestAnimationFrame(() => { revealSweep(); updateSticky(); });
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* ---------- Program buttons pre-select the chip and jump to the form ---------- */
  const scrollToForm = () => {
    formCard.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    setTimeout(() => document.getElementById('ld-name').focus({ preventScroll: true }), reduceMotion ? 0 : 550);
  };
  document.querySelectorAll('[data-book]').forEach(btn => {
    btn.addEventListener('click', () => {
      const chip = document.querySelector(`.ld-chips input[value="${btn.dataset.book}"]`);
      if (chip) {
        chip.checked = true;
        // .checked não dispara change — o motor precisa recarregar as aulas
        chip.dispatchEvent(new Event('change', { bubbles: true }));
      }
      scrollToForm();
    });
  });
  document.querySelectorAll('[data-scrolltop]').forEach(a => {
    a.addEventListener('click', e => { e.preventDefault(); scrollToForm(); });
  });

  /* ---------- Booking form ---------- */
  const form = document.getElementById('ldForm');
  const ok = document.getElementById('ldOk');
  form.addEventListener('submit', e => {
    e.preventDefault();

    // a aula tem de estar escolhida antes dos dados de contato
    const B = window.RootsBooking;
    const slotError = B ? B.validate() : null;
    if (slotError) {
      const slots = document.getElementById('ldSlots');
      slots.classList.add('is-missing');
      document.getElementById('ldMicro').textContent = slotError;
      slots.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
      setTimeout(() => slots.classList.remove('is-missing'), 2200);
      return;
    }
    if (!form.checkValidity()) { form.reportValidity(); return; }

    // conversion hooks — wire these when the pixel / backend is connected:
    // fbq('track', 'Schedule', { content_name: B.chosen.label });
    // window.dataLayer?.push({ event: 'trial_booked', ...B.chosen });

    if (B) {
      document.getElementById('ldTicket').innerHTML = B.ticketHTML();
      const ics = document.getElementById('ldIcs');
      if (ics) ics.href = B.icsHref();
    }

    form.hidden = true;
    document.querySelector('.ld-card__title').hidden = true;
    document.querySelector('.ld-card > .ld-card__script').hidden = true;
    ok.hidden = false;
    ok.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
    document.dispatchEvent(new CustomEvent('roots:booked'));
  });
})();
