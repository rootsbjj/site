/* Paulo — guided AI-avatar experience on the free-trial landing.
 *
 * He is not a background loop. He reacts to where the visitor is in the
 * funnel: greets on arrival, answers the fear if they stall, congratulates
 * them once they book.
 *
 * Assets: transparent WebM (VP9 + alpha). Browsers without alpha video
 * (Safari) fall back to the still cutout and still hear the audio.
 */

(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const CLIPS = {
    hook: {
      src: 'assets/paulo/hook',
      caption: "Hey. You clicked — that already tells me something. Everybody is nervous the first time. I'm Professor Paulo. Pick your class below, and I see you on the mat.",
    },
    objection: {
      src: 'assets/paulo/objection',
      caption: "You don't need to be fit. You don't need to know anything — that is my job. You only need to show up one time.",
    },
    confirm: {
      src: 'assets/paulo/confirm',
      caption: "That's it. You did the hardest part. Bring water, something comfortable to wear. I see you on the mat.",
    },
  };

  const stage = document.getElementById('pv');
  if (!stage) return;

  const figure = stage.querySelector('.pv__figure');
  const video = stage.querySelector('.pv__video');
  const caption = stage.querySelector('.pv__caption');
  const soundBtn = stage.querySelector('.pv__sound');

  let unlocked = false;      // has the visitor allowed sound
  let played = new Set();
  let idleTimer = null;

  /* ---------- alpha-video support ---------- */
  const canAlpha = (() => {
    const v = document.createElement('video');
    return !!v.canPlayType('video/webm; codecs="vp9"');
  })();
  if (!canAlpha) stage.classList.add('is-static');

  /* ---------- play a clip ---------- */
  function play(key, { force = false } = {}) {
    const clip = CLIPS[key];
    if (!clip) return;
    if (!force && played.has(key)) return;
    played.add(key);

    caption.textContent = clip.caption;
    caption.classList.add('is-on');

    if (canAlpha) {
      video.src = `${clip.src}.webm`;
      video.currentTime = 0;
      video.muted = !unlocked;
      figure.classList.add('is-live');
      video.play().catch(() => {});
    } else {
      // no alpha video: still cutout + audio only
      const a = stage.querySelector('.pv__audio') || Object.assign(
        document.createElement('audio'), { className: 'pv__audio' });
      stage.appendChild(a);
      a.src = `${clip.src}.m4a`;
      if (unlocked) a.play().catch(() => {});
    }
  }

  /* ---------- sound toggle ---------- */
  soundBtn.addEventListener('click', () => {
    unlocked = !unlocked;
    soundBtn.classList.toggle('is-on', unlocked);
    soundBtn.querySelector('span').textContent = unlocked ? 'Sound on' : 'Hear Paulo';
    video.muted = !unlocked;
    if (unlocked) { video.currentTime = 0; video.play().catch(() => {}); }
  });

  /* ---------- 3D tilt that follows the cursor ---------- */
  if (!reduce && window.matchMedia('(hover: hover)').matches) {
    const damp = 7;
    stage.addEventListener('mousemove', e => {
      const r = stage.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      figure.style.transition = 'transform 0.12s linear';
      figure.style.transform =
        `rotateY(${x * damp}deg) rotateX(${-y * (damp * 0.6)}deg) translateZ(30px)`;
      stage.querySelector('.pv__depth').style.transform =
        `translate3d(${x * -18}px, ${y * -12}px, 0)`;
    });
    stage.addEventListener('mouseleave', () => {
      figure.style.transition = 'transform 0.5s cubic-bezier(.2,.8,.3,1)';
      figure.style.transform = '';
      stage.querySelector('.pv__depth').style.transform = '';
    });
  }

  /* ---------- funnel triggers ---------- */
  // 1. arrival — greet as soon as he scrolls into view
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { play('hook'); io.disconnect(); startIdleWatch(); }
    });
  }, { threshold: 0.4 });
  io.observe(stage);

  // 2. hesitation — they've been on the form area without submitting
  function startIdleWatch() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      const form = document.getElementById('ldForm');
      if (form && !form.hidden) play('objection');
    }, 22000);
  }
  ['input', 'focusin'].forEach(ev =>
    document.getElementById('ldForm')?.addEventListener(ev, startIdleWatch));

  // 3. booked — celebrate and tell them what happens next
  document.addEventListener('roots:booked', () => {
    clearTimeout(idleTimer);
    play('confirm', { force: true });
    if (!unlocked) soundBtn.click();
  });

  /* ---------- keep the caption tidy ---------- */
  video.addEventListener('ended', () => {
    setTimeout(() => caption.classList.remove('is-on'), 1200);
  });
})();
