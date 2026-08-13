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

  /* ---------- Cards de programa: seleciona no widget e sobe para o form ---------- */
  const scrollToForm = () => {
    formCard.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
  };
  document.querySelectorAll('[data-book]').forEach(btn => {
    btn.addEventListener('click', () => {
      // clica o botão de programa dentro do widget — ele recarrega as aulas sozinho
      document.querySelector(`.bk__prog[data-prog="${btn.dataset.book}"]`)?.click();
      scrollToForm();
    });
  });
  document.querySelectorAll('[data-scrolltop]').forEach(a => {
    a.addEventListener('click', e => { e.preventDefault(); scrollToForm(); });
  });

  /* ---------- Booking form ---------- */
  /* O card usa o widget de booking.js — ele valida, confirma e emite
     `roots:booked`. Aqui só reagimos ao resultado. */
  document.addEventListener('roots:booked', () => {
    sticky.classList.remove('is-shown');
    // fbq('track','Schedule');
  });
})();
