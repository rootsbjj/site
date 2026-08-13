/* ROOTS BJJ — interactions
   parallax · belt scroll progress · reveals · word-lit statement ·
   program accordion · testimonial rotation · nav */

(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Nav ---------- */
  const nav = document.getElementById('nav');
  const burger = document.getElementById('burger');
  const navLinks = document.getElementById('navLinks');

  const onScrollNav = () => nav.classList.toggle('is-scrolled', window.scrollY > 40);
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

  /* ---------- Belt scroll progress (signature) ---------- */
  const beltFill = document.getElementById('beltFill');
  const beltBar = document.getElementById('beltBar');
  const beltLabel = document.getElementById('beltLabel');
  const BELTS = [
    { at: 0.00, color: '#d9d1c0', name: 'WHITE BELT' },
    { at: 0.25, color: '#1e5aa8', name: 'BLUE BELT' },
    { at: 0.50, color: '#6a2d8f', name: 'PURPLE BELT' },
    { at: 0.75, color: '#5b3a24', name: 'BROWN BELT' },
    { at: 0.97, color: '#111010', name: 'BLACK BELT' },
  ];
  let currentBelt = -1;
  let labelTimer;

  const updateBelt = () => {
    const doc = document.documentElement;
    const max = doc.scrollHeight - window.innerHeight;
    const p = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
    beltFill.style.transform = `scaleX(${p})`;

    let idx = 0;
    for (let i = 0; i < BELTS.length; i++) if (p >= BELTS[i].at) idx = i;
    if (idx !== currentBelt) {
      currentBelt = idx;
      beltBar.style.background = BELTS[idx].color;
      beltLabel.textContent = BELTS[idx].name;
      beltLabel.classList.add('is-visible');
      clearTimeout(labelTimer);
      labelTimer = setTimeout(() => beltLabel.classList.remove('is-visible'), 1600);
    }
  };

  /* ---------- Parallax ---------- */
  const parallaxEls = [...document.querySelectorAll('[data-parallax]')].map(el => ({
    el,
    speed: parseFloat(el.dataset.parallax) || 0.2,
  }));

  const updateParallax = () => {
    if (reduceMotion) return;
    const vh = window.innerHeight;
    for (const { el, speed } of parallaxEls) {
      const rect = el.getBoundingClientRect();
      if (rect.bottom < -200 || rect.top > vh + 200) continue;
      const center = rect.top + rect.height / 2 - vh / 2;
      el.style.transform = `translate3d(0, ${center * -speed}px, 0)`;
    }
  };

  /* ---------- Reveal on scroll ----------
     A plain scroll sweep (not IntersectionObserver) so sections are
     never skipped by anchor jumps that leap past them in one frame. */
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

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      onScrollNav();
      updateBelt();
      updateParallax();
      updateStatement();
      revealSweep();
      ticking = false;
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);

  /* ---------- Story statement: words light up as you scroll ---------- */
  const statement = document.getElementById('storyStatement');
  let words = [];
  if (statement) {
    const text = statement.textContent.trim().replace(/\s+/g, ' ');
    statement.innerHTML = text.split(' ')
      .map(w => `<span class="w">${w}</span>`).join(' ');
    words = [...statement.querySelectorAll('.w')];
  }
  const updateStatement = () => {
    if (!statement || !words.length) return;
    const rect = statement.getBoundingClientRect();
    const vh = window.innerHeight;
    // progress: 0 when statement top hits 90% vh, 1 when bottom passes 35% vh
    const start = vh * 0.9;
    const end = vh * 0.35;
    const p = Math.min(Math.max((start - rect.top) / (start - end + rect.height), 0), 1);
    const lit = Math.floor(p * words.length * 1.15);
    words.forEach((w, i) => w.classList.toggle('is-lit', i < lit));
  };

  /* ---------- Programs accordion ---------- */
  const items = [...document.querySelectorAll('.acc__item')];
  const openItem = target => {
    items.forEach(i => i.classList.toggle('is-open', i === target));
  };
  items.forEach(item => {
    item.addEventListener('mouseenter', () => {
      if (window.matchMedia('(hover: hover)').matches) openItem(item);
    });
    item.addEventListener('click', e => {
      if (!item.classList.contains('is-open')) {
        e.preventDefault();
        openItem(item);
      }
    });
  });

  /* ---------- Testimonials ---------- */
  const voices = [...document.querySelectorAll('.voice')];
  const dots = [...document.querySelectorAll('.voices__dot')];
  let voiceIdx = 0;
  const showVoice = i => {
    voiceIdx = i;
    voices.forEach((v, k) => v.classList.toggle('is-active', k === i));
    dots.forEach((d, k) => d.classList.toggle('is-active', k === i));
  };
  dots.forEach((d, i) => d.addEventListener('click', () => { showVoice(i); resetVoiceTimer(); }));
  let voiceTimer = setInterval(() => showVoice((voiceIdx + 1) % voices.length), 5500);
  const resetVoiceTimer = () => {
    clearInterval(voiceTimer);
    voiceTimer = setInterval(() => showVoice((voiceIdx + 1) % voices.length), 5500);
  };

  /* O agendamento da home é o widget de booking.js (<div data-booking>),
     que monta e valida sozinho. Aqui só ouvimos o resultado. */
  document.addEventListener('roots:booked', e => {
    // ponto de integração com pixel / analytics quando o backend existir
    // fbq('track', 'Schedule', { content_name: e.detail.classLabel });
  });

  /* ---------- Subtle tilt on cards ---------- */
  if (window.matchMedia('(hover: hover)').matches && !reduceMotion) {
    document.querySelectorAll('[data-tilt]').forEach(card => {
      card.addEventListener('mousemove', e => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `translateY(-6px) rotateX(${-y * 4}deg) rotateY(${x * 4}deg)`;
        card.style.transition = 'transform 0.08s linear';
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
        card.style.transition = 'transform 0.4s ease';
      });
    });
  }

  // initial paint
  onScroll();
})();
