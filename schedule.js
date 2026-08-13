/* ROOTS BJJ Brookvale — timetable as data (single source of truth).
 *
 * Transcrito da grade oficial. Qualquer mudança de horário se faz AQUI e
 * propaga para o motor de agendamento, a página de timetable e a landing.
 *
 * Dias: 1 = Monday … 6 = Saturday (0 = Sunday, sem aulas).
 * Horas em 24h, hora local de Sydney.
 */

const PROGRAMS = {
  ninjas: { id: 'ninjas', name: 'Little Ninjas', ages: 'Ages 3–5',   tone: 'ninjas' },
  kids:   { id: 'kids',   name: 'Kids BJJ',      ages: 'Ages 6–12',  tone: 'kids' },
  teens:  { id: 'teens',  name: 'Teens BJJ',     ages: 'Ages 12–17', tone: 'teens' },
  adults: { id: 'adults', name: 'Adults BJJ',    ages: 'All levels', tone: 'adults' },
};

/* variantes de aula do programa adulto */
const VARIANTS = {
  all:   'All levels',
  fund:  'Fundamentals',
  nogi:  'No gi · All levels',
};

const S = (day, start, end, program, variant, beginner) =>
  ({ day, start, end, program, variant: variant || null, beginner: !!beginner });

const SESSIONS = [
  /* ── Monday ── */
  S(1, '16:30', '17:15', 'kids',   null,          true),
  S(1, '17:15', '18:00', 'kids',   null,          true),
  S(1, '18:00', '18:45', 'adults', VARIANTS.fund, true),
  S(1, '18:45', '19:30', 'adults', VARIANTS.all,  false),

  /* ── Tuesday ── */
  S(2, '12:00', '13:00', 'adults', VARIANTS.all,  false),
  S(2, '16:00', '16:30', 'ninjas', null,          true),
  S(2, '16:30', '17:15', 'kids',   null,          true),
  S(2, '17:15', '18:00', 'teens',  null,          true),
  S(2, '18:00', '19:30', 'adults', VARIANTS.nogi, false),

  /* ── Wednesday ── */
  S(3, '16:30', '17:15', 'kids',   null,          true),
  S(3, '17:15', '18:00', 'kids',   null,          true),
  S(3, '18:00', '18:45', 'adults', VARIANTS.fund, true),
  S(3, '18:45', '19:30', 'adults', VARIANTS.all,  false),

  /* ── Thursday ── */
  S(4, '12:00', '13:00', 'adults', VARIANTS.all,  false),
  S(4, '16:30', '17:15', 'kids',   null,          true),
  S(4, '17:15', '18:00', 'teens',  null,          true),
  S(4, '18:00', '19:30', 'adults', VARIANTS.nogi, false),

  /* ── Friday ── */
  S(5, '16:30', '17:15', 'kids',   null,          true),
  S(5, '17:15', '18:00', 'kids',   null,          true),
  S(5, '18:00', '19:30', 'adults', VARIANTS.all,  false),

  /* ── Saturday ── */
  S(6, '09:30', '10:00', 'ninjas', null,          true),
  S(6, '10:00', '10:45', 'kids',   null,          true),
  S(6, '10:45', '11:30', 'teens',  null,          true),
  S(6, '11:30', '12:30', 'adults', VARIANTS.all,  false),
];

const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

/* ─────────── helpers ─────────── */

const pad = n => String(n).padStart(2, '0');

/** '18:45' → '6:45pm' */
function fmtTime(hm) {
  const [h, m] = hm.split(':').map(Number);
  const ampm = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12}${ampm}` : `${h12}:${pad(m)}${ampm}`;
}

/** '16:30','17:15' → '4:30 – 5:15pm' (drops the first suffix when it matches) */
function fmtRange(start, end) {
  const a = fmtTime(start), b = fmtTime(end);
  const sfx = s => s.slice(-2);
  return sfx(a) === sfx(b) ? `${a.slice(0, -2)} – ${b}` : `${a} – ${b}`;
}

function sessionTitle(s) {
  const p = PROGRAMS[s.program];
  return s.variant && s.variant !== VARIANTS.all ? `${p.name} · ${s.variant}` : p.name;
}

/** "now" in Sydney, as a Date shifted so local getters read Sydney time */
function sydneyNow() {
  const parts = new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Sydney', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date()).reduce((a, p) => (a[p.type] = p.value, a), {});
  return new Date(
    `${parts.year}-${parts.month}-${parts.day}T${parts.hour === '24' ? '00' : parts.hour}:${parts.minute}:00`
  );
}

/**
 * Próximas sessões reais de um programa.
 * @param {string} programId  ninjas | kids | teens | adults
 * @param {object} opts  { days, limit, leadMinutes, beginnerFirst }
 * @returns {Array} [{ date:'2026-08-03', day, dayName, start, end, label, range,
 *                     program, variant, beginner, iso }]
 */
function nextSessions(programId, opts = {}) {
  const { days = 21, limit = 60, leadMinutes = 120 } = opts;
  const now = sydneyNow();
  const cutoff = new Date(now.getTime() + leadMinutes * 60000);
  const pool = SESSIONS.filter(s => !programId || s.program === programId);
  const out = [];

  for (let i = 0; i < days && out.length < limit; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    d.setHours(0, 0, 0, 0);
    const dow = d.getDay();
    pool.filter(s => s.day === dow).forEach(s => {
      const [h, m] = s.start.split(':').map(Number);
      const when = new Date(d);
      when.setHours(h, m, 0, 0);
      if (when < cutoff) return;                  // já passou (ou é muito em cima)
      out.push({
        date: `${when.getFullYear()}-${pad(when.getMonth() + 1)}-${pad(when.getDate())}`,
        iso: when.toISOString(),
        day: dow,
        dayName: DAY_NAMES[dow],
        start: s.start, end: s.end,
        range: fmtRange(s.start, s.end),
        program: s.program,
        variant: s.variant,
        beginner: s.beginner,
        label: sessionTitle(s),
        ages: PROGRAMS[s.program].ages,
      });
    });
  }
  return out.sort((a, b) => a.iso.localeCompare(b.iso)).slice(0, limit);
}

/** A aula que recomendamos para a primeira vez nesse programa */
function recommendedFirst(programId) {
  const list = nextSessions(programId, { limit: 40 });
  return list.find(s => s.beginner) || list[0] || null;
}

/** Grade da semana agrupada por dia, para a página de timetable */
function weekGrid() {
  return [1, 2, 3, 4, 5, 6].map(day => ({
    day, dayName: DAY_NAMES[day],
    sessions: SESSIONS.filter(s => s.day === day)
      .sort((a, b) => a.start.localeCompare(b.start))
      .map(s => ({ ...s, range: fmtRange(s.start, s.end), label: sessionTitle(s),
                   ages: PROGRAMS[s.program].ages })),
  }));
}

/** Horário de funcionamento derivado da grade (nada hardcoded) */
function openingHours() {
  return [1, 2, 3, 4, 5, 6].map(day => {
    const ss = SESSIONS.filter(s => s.day === day).sort((a, b) => a.start.localeCompare(b.start));
    if (!ss.length) return { day, dayName: DAY_NAMES[day], closed: true };
    return {
      day, dayName: DAY_NAMES[day], closed: false,
      from: ss[0].start, to: ss[ss.length - 1].end,
      range: fmtRange(ss[0].start, ss[ss.length - 1].end),
    };
  });
}

window.RootsSchedule = {
  PROGRAMS, VARIANTS, SESSIONS, DAY_NAMES,
  nextSessions, recommendedFirst, weekGrid, openingHours,
  fmtTime, fmtRange, sessionTitle, sydneyNow,
};
