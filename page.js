/* Shared interactions for content pages (About / Instructors / FAQs)
   nav + About dropdown · jump-safe reveals · tilt */

(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Nav ---------- */
  const nav = document.getElementById('nav');
  const burger = document.getElementById('burger');
  const navLinks = document.getElementById('navLinks');
  burger.addEventListener('click', () => {
    const open = navLinks.classList.toggle('is-open');
    burger.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', open);
  });

  /* ---------- About dropdown ---------- */
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
  const onScroll = () => requestAnimationFrame(() => {
    nav.classList.toggle('is-scrolled', window.scrollY > 40);
    revealSweep();
  });
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

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
})();
