/* Own a Roots — franchise page interactions
   nav · reveals · tilt · discovery-call booking form (front-end) */

(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Nav ---------- */
  const nav = document.getElementById('nav');
  const burger = document.getElementById('burger');
  const navLinks = document.getElementById('navLinks');
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
  const onScrollNav = () => requestAnimationFrame(() => {
    nav.classList.toggle('is-scrolled', window.scrollY > 40);
    revealSweep();
  });
  window.addEventListener('scroll', onScrollNav, { passive: true });
  window.addEventListener('resize', onScrollNav);
  onScrollNav();
  burger.addEventListener('click', () => {
    const open = navLinks.classList.toggle('is-open');
    burger.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', open);
  });
  navLinks.querySelectorAll('a').forEach(a =>
    a.addEventListener('click', () => {
      navLinks.classList.remove('is-open');
      burger.classList.remove('is-open');
      burger.setAttribute('aria-expanded', 'false');
    })
  );

  const drop = document.querySelector('.nav__drop');
  if (drop) {
    const trigger = drop.querySelector('.nav__droptrigger');
    trigger.addEventListener('click', e => {
      e.stopPropagation();
      const open = drop.classList.toggle('is-open');
      trigger.setAttribute('aria-expanded', open);
    });
    document.addEventListener('click', e => {
      if (!drop.contains(e.target)) drop.classList.remove('is-open');
    });
  }

  /* ---------- Tilt cards ---------- */
  if (window.matchMedia('(hover: hover)').matches && !reduceMotion) {
    document.querySelectorAll('[data-tilt]').forEach(card => {
      card.addEventListener('mousemove', e => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `translateY(-4px) rotateX(${-y * 3}deg) rotateY(${x * 3}deg)`;
        card.style.transition = 'transform 0.08s linear';
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
        card.style.transition = 'transform 0.4s ease';
      });
    });
  }

  /* ---------- Booking form (front-end only) ---------- */
  const form = document.getElementById('frForm');
  const ok = document.getElementById('frOk');

  // can't book a call in the past
  const dateInput = document.getElementById('fr-date');
  const today = new Date();
  today.setDate(today.getDate() + 1);
  dateInput.min = today.toISOString().split('T')[0];

  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }
    ok.hidden = false;
    form.querySelectorAll('input, select, textarea, button').forEach(el => (el.disabled = true));
    ok.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
  });
})();
