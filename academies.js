/* Team Roots Worldwide — interactive map
   Injects the world SVG, highlights Roots countries, adds pulsing
   markers, tooltips, and an animated viewBox zoom per region. */

(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Nav (same behaviour as home) ---------- */
  const nav = document.getElementById('nav');
  const burger = document.getElementById('burger');
  const navLinks = document.getElementById('navLinks');
  burger.addEventListener('click', () => {
    const open = navLinks.classList.toggle('is-open');
    burger.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', open);
  });

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

  /* ---------- World map ---------- */
  const REGIONS = {
    au: {
      name: 'Australia', count: 'HQ · 1 academy', target: '#australia',
      isos: ['au'], markerIso: 'au', zoomIso: 'au',
      // marker position inside the country's bbox (fraction of w/h) — Sydney, east coast
      mx: 0.92, my: 0.72,
      // zoom padding around the country bbox
      pad: 0.55,
    },
    kr: {
      name: 'South Korea', count: '27 academies', target: '#korea',
      isos: ['kr'], markerIso: 'kr', zoomIso: 'kr',
      // Incheon, north-west coast
      mx: 0.12, my: 0.22,
      pad: 2.4,
    },
    mn: {
      name: 'Mongolia', count: 'Glory MMA · 2 academies', target: '#mongolia',
      isos: ['mn'], markerIso: 'mn', zoomIso: 'mn',
      // Zamyn-Uud / Erlianhaote — twin cities on Mongolia's southern border
      mx: 0.72, my: 0.84,
      pad: 0.45,
    },
  };

  const mapWrap = document.getElementById('mapWrap');
  const mapHost = document.getElementById('worldMap');
  const tip = document.getElementById('mapTip');
  const resetBtn = document.getElementById('mapReset');
  let svg = null;
  let homeVB = null;   // initial viewBox
  let vbAnim = null;   // rAF handle

  fetch('assets/world.svg')
    .then(r => r.text())
    .then(txt => {
      const doc = new DOMParser().parseFromString(txt, 'image/svg+xml');
      svg = doc.querySelector('svg');
      svg.removeAttribute('width');
      svg.removeAttribute('height');
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      mapHost.appendChild(svg);
      homeVB = svg.viewBox.baseVal;
      homeVB = { x: homeVB.x, y: homeVB.y, w: homeVB.width, h: homeVB.height };

      // roots countries glow red
      Object.values(REGIONS).flatMap(r => r.isos).forEach(iso => {
        const el = svg.getElementById(iso);
        if (el) el.classList.add('is-roots');
      });

      addMarkers();
    })
    .catch(() => { mapWrap.innerHTML = '<p class="world__maperr">Map unavailable — see the academies below.</p>'; });

  const bboxOf = iso => {
    const el = svg.getElementById(iso);
    return el ? el.getBBox() : null;
  };

  function addMarkers() {
    const NS = 'http://www.w3.org/2000/svg';
    Object.entries(REGIONS).forEach(([iso, r]) => {
      const bb = bboxOf(r.markerIso);
      if (!bb) return;
      const cx = bb.x + bb.width * r.mx;
      const cy = bb.y + bb.height * r.my;
      r.cx = cx; r.cy = cy;

      const g = document.createElementNS(NS, 'g');
      g.setAttribute('class', 'marker');
      g.setAttribute('tabindex', '0');
      g.setAttribute('role', 'button');
      g.setAttribute('aria-label', `${r.name} — ${r.count}`);

      const pulse = document.createElementNS(NS, 'circle');
      pulse.setAttribute('class', 'marker__pulse');
      pulse.setAttribute('cx', cx); pulse.setAttribute('cy', cy);
      pulse.setAttribute('r', 14); pulse.dataset.r = 14;

      const dot = document.createElementNS(NS, 'circle');
      dot.setAttribute('class', 'marker__dot');
      dot.setAttribute('cx', cx); dot.setAttribute('cy', cy);
      dot.setAttribute('r', 6); dot.dataset.r = 6;

      const hit = document.createElementNS(NS, 'circle');
      hit.setAttribute('class', 'marker__hit');
      hit.setAttribute('cx', cx); hit.setAttribute('cy', cy);
      hit.setAttribute('r', 22); hit.dataset.r = 22;

      g.append(pulse, dot, hit);
      svg.appendChild(g);

      const showTip = () => {
        const pt = svgToScreen(cx, cy);
        tip.innerHTML = `<strong>${r.name}</strong>${r.count}`;
        tip.hidden = false;
        const wr = mapWrap.getBoundingClientRect();
        tip.style.left = `${pt.x - wr.left}px`;
        tip.style.top = `${pt.y - wr.top}px`;
      };
      const hideTip = () => { tip.hidden = true; };

      g.addEventListener('mouseenter', showTip);
      g.addEventListener('mouseleave', hideTip);
      g.addEventListener('focus', showTip);
      g.addEventListener('blur', hideTip);
      const activate = () => { hideTip(); focusRegion(iso); };
      g.addEventListener('click', activate);
      g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); } });
    });
  }

  function svgToScreen(x, y) {
    const pt = new DOMPoint(x, y).matrixTransform(svg.getScreenCTM());
    return { x: pt.x, y: pt.y };
  }

  // markers keep their on-screen size regardless of zoom level
  function scaleMarkers(vbW) {
    const k = vbW / homeVB.w;
    svg.querySelectorAll('.marker circle').forEach(c =>
      c.setAttribute('r', parseFloat(c.dataset.r) * k));
  }

  function animateViewBox(to, done) {
    if (vbAnim) cancelAnimationFrame(vbAnim);
    const from = svg.viewBox.baseVal;
    const start = { x: from.x, y: from.y, w: from.width, h: from.height };
    if (reduceMotion) {
      svg.setAttribute('viewBox', `${to.x} ${to.y} ${to.w} ${to.h}`);
      scaleMarkers(to.w);
      if (done) done();
      return;
    }
    const t0 = performance.now();
    const DUR = 900;
    const ease = t => 1 - Math.pow(1 - t, 3);
    const step = now => {
      const t = Math.min((now - t0) / DUR, 1);
      const k = ease(t);
      const vb = ['x', 'y', 'w', 'h'].map(a => start[a] + (to[a] - start[a]) * k);
      svg.setAttribute('viewBox', vb.join(' '));
      scaleMarkers(vb[2]);
      if (t < 1) vbAnim = requestAnimationFrame(step);
      else if (done) done();
    };
    vbAnim = requestAnimationFrame(step);
  }

  function focusRegion(iso) {
    const r = REGIONS[iso];
    const bb = bboxOf(r.zoomIso);
    if (!bb) return;
    const padX = bb.width * r.pad;
    const padY = bb.height * r.pad;
    // keep the map's aspect ratio so the zoom doesn't distort
    const ratio = homeVB.w / homeVB.h;
    let w = bb.width + padX * 2;
    let h = bb.height + padY * 2;
    if (w / h > ratio) h = w / ratio; else w = h * ratio;
    const x = bb.x + bb.width / 2 - w / 2;
    const y = bb.y + bb.height / 2 - h / 2;

    animateViewBox({ x, y, w, h }, () => {
      document.querySelector(r.target).scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    });

    resetBtn.hidden = false;
    document.querySelectorAll('.chip').forEach(c =>
      c.classList.toggle('is-active', c.dataset.region === iso));
    svg.querySelectorAll('.is-roots').forEach(el =>
      el.classList.toggle('is-dim', !r.isos.includes(el.id)));
  }

  resetBtn.addEventListener('click', () => {
    animateViewBox(homeVB);
    resetBtn.hidden = true;
    svg.querySelectorAll('.is-dim').forEach(el => el.classList.remove('is-dim'));
  });

  document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => focusRegion(chip.dataset.region));
  });
})();
