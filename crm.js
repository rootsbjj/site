/* ROOTS Trial Desk — coach-facing CRM for free-trial bookings.
 *
 * DATA SOURCE
 * -----------
 * Set CONFIG.api to your endpoint and this reads/writes live. With api = null
 * it runs on localStorage with seeded demo rows so the team can trial the
 * workflow before any backend exists.
 *
 * Expected API contract (JSON):
 *   GET  {api}/leads            -> { leads: Lead[] }
 *   POST {api}/leads/{id}       -> Lead   (partial update body)
 *
 * Lead = { id, createdAt, name, phone, program, status, coach,
 *          classDate, classTime, notes, source }
 */

const CONFIG = {
  api: null,                       // e.g. 'https://api.rootsbjj.com.au/crm'
  gym: 'Brookvale',
  // who can be assigned, and which programs auto-route to them
  coaches: [
    { id: 'paulo',  name: 'Professor Paulo', programs: ['Adults', 'Teens', "Women's"] },
    { id: 'atila',  name: 'Átila Cardoso',   programs: ['Adults', 'Teens'] },
    { id: 'kids',   name: 'Kids coach',      programs: ['Kids (6–12)', 'Little Ninjas (3–5)'] },
  ],
  times: ['Morning 9–11am', 'Midday 11am–2pm', 'Afternoon 2–5pm', 'Evening 5–7:30pm'],
  slaHours: 2,                     // new lead older than this = overdue
};

const STATUSES = [
  { id: 'new',       label: 'New',       hint: 'Just came in from the ad' },
  { id: 'contacted', label: 'Contacted', hint: 'Called or messaged, no date yet' },
  { id: 'booked',    label: 'Booked',    hint: 'Class date locked in' },
  { id: 'attended',  label: 'Attended',  hint: 'Showed up and trained' },
  { id: 'joined',    label: 'Joined',    hint: 'Signed up as a member' },
  { id: 'no_show',   label: 'No show',   hint: "Didn't turn up" },
  { id: 'lost',      label: 'Lost',      hint: 'Not going ahead' },
];

const OPEN = ['new', 'contacted', 'booked'];
const CLOSED = ['attended', 'joined', 'no_show', 'lost'];

/* ---------- store ---------- */
const KEY = 'roots_crm_leads';
let leads = [];
let activeId = null;

const uid = () => 'l_' + Math.random().toString(36).slice(2, 9);
const hoursSince = iso => (Date.now() - new Date(iso).getTime()) / 36e5;
const fmtDate = iso => new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
const fmtAgo = iso => {
  const h = hoursSince(iso);
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} min ago`;
  if (h < 24) return `${Math.round(h)}h ago`;
  return `${Math.round(h / 24)}d ago`;
};

function seed() {
  const now = Date.now();
  const mk = (name, phone, program, status, hoursAgo, extra = {}) => ({
    id: uid(), createdAt: new Date(now - hoursAgo * 36e5).toISOString(),
    name, phone, program, status, coach: null, classDate: '', classTime: '',
    notes: '', source: 'Meta Ads — free trial', ...extra,
  });
  return [
    mk('Sarah Mitchell', '0412 445 890', 'Kids (6–12)', 'new', 0.4),
    mk('James Turner', '0433 210 774', 'Adults', 'new', 3.2),
    mk('Priya Nair', '0421 908 336', "Women's", 'contacted', 26),
    mk('Dan Kovac', '0400 761 220', 'Adults', 'booked', 50,
      { coach: 'atila', classDate: new Date(now + 864e5).toISOString().slice(0, 10), classTime: CONFIG.times[3] }),
    mk('Emma Cole', '0455 332 118', 'Little Ninjas (3–5)', 'booked', 72,
      { coach: 'kids', classDate: new Date(now + 1728e5).toISOString().slice(0, 10), classTime: CONFIG.times[0] }),
    mk('Marco Silva', '0466 550 901', 'Adults', 'joined', 200, { coach: 'paulo' }),
    mk('Tess Brown', '0477 118 245', 'Teens', 'no_show', 150, { coach: 'atila' }),
  ];
}

async function load() {
  if (CONFIG.api) {
    try {
      const r = await fetch(`${CONFIG.api}/leads`);
      leads = (await r.json()).leads || [];
      note(`Live — ${CONFIG.api}`);
      return;
    } catch (e) {
      note('API unreachable — showing local data');
    }
  }
  const raw = localStorage.getItem(KEY);
  leads = raw ? JSON.parse(raw) : seed();
  if (!raw) localStorage.setItem(KEY, JSON.stringify(leads));
  if (!CONFIG.api) note('Demo mode — local data only. Set CONFIG.api in crm.js to go live.');
}

async function save(lead) {
  if (CONFIG.api) {
    try {
      await fetch(`${CONFIG.api}/leads/${lead.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lead),
      });
    } catch (e) { /* keep local copy either way */ }
  }
  localStorage.setItem(KEY, JSON.stringify(leads));
}

const note = t => { document.getElementById('crmSource').textContent = t; };

/* ---------- intelligence ---------- */
const suggestCoach = program =>
  (CONFIG.coaches.find(c => c.programs.includes(program)) || CONFIG.coaches[0]).id;

const coachName = id =>
  (CONFIG.coaches.find(c => c.id === id) || {}).name || 'Unassigned';

const isOverdue = l => l.status === 'new' && hoursSince(l.createdAt) > CONFIG.slaHours;

const isToday = l =>
  l.classDate && l.classDate === new Date().toISOString().slice(0, 10);

/* ---------- render ---------- */
function visible(list) {
  const who = document.getElementById('coachPick').value;
  if (who === 'all') return list;
  return list.filter(l => (l.coach || suggestCoach(l.program)) === who);
}

function render() {
  const open = visible(leads.filter(l => OPEN.includes(l.status)));
  const closed = visible(leads.filter(l => CLOSED.includes(l.status)))
    .filter(l => hoursSince(l.createdAt) < 24 * 14);

  const newOnes = open.filter(l => l.status !== 'booked')
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const booked = open.filter(l => l.status === 'booked')
    .sort((a, b) => (a.classDate || '9').localeCompare(b.classDate || '9'));

  document.getElementById('listNew').innerHTML =
    newOnes.map(card).join('') || empty('Nothing waiting. Good desk.');
  document.getElementById('listBooked').innerHTML =
    booked.map(card).join('') || empty('No trials booked yet.');
  document.getElementById('listDone').innerHTML =
    closed.map(card).join('') || empty('Nothing closed in the last two weeks.');

  const all = visible(leads);
  const kpi = (n, l, cls = '') => `<div class="crm-kpi ${cls}"><b>${n}</b><span>${l}</span></div>`;
  const attended = all.filter(l => ['attended', 'joined'].includes(l.status)).length;
  const finished = all.filter(l => CLOSED.includes(l.status)).length;
  document.getElementById('kpis').innerHTML =
    kpi(all.filter(l => l.status === 'new').length, 'New leads',
        all.some(isOverdue) ? 'is-alert' : '') +
    kpi(all.filter(l => l.status === 'booked').length, 'Booked') +
    kpi(all.filter(isToday).length, 'On the mat today', 'is-gold') +
    kpi(all.filter(l => l.status === 'joined').length, 'Joined') +
    kpi(finished ? Math.round((attended / finished) * 100) + '%' : '—', 'Show-up rate');

  document.getElementById('crmToday').textContent =
    new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })
    + ' · ' + CONFIG.gym;
}

const empty = t => `<p class="crm-empty">${t}</p>`;

function card(l) {
  const overdue = isOverdue(l);
  const today = isToday(l);
  const slot = l.classDate
    ? `${fmtDate(l.classDate)}${l.classTime ? ' · ' + l.classTime.replace(/\s.*—?\s?/, ' ') : ''}`
    : '';
  return `
    <article class="crm-card ${overdue ? 'is-overdue' : ''} ${today ? 'is-today' : ''}" data-id="${l.id}">
      <div class="crm-card__main">
        <h3>${l.name}</h3>
        <p class="crm-card__sub">
          <span class="crm-badge">${l.program}</span>
          <span>${coachName(l.coach || suggestCoach(l.program))}</span>
          ${slot ? `<span class="crm-card__slot">${slot}</span>` : ''}
        </p>
      </div>
      <div class="crm-card__side">
        ${overdue ? '<span class="crm-flag">Overdue</span>' : ''}
        ${today ? '<span class="crm-flag crm-flag--gold">Today</span>' : ''}
        <span class="crm-card__age">${fmtAgo(l.createdAt)}</span>
        <a class="crm-icon" href="tel:${l.phone.replace(/\s/g, '')}" title="Call" onclick="event.stopPropagation()">&#9742;</a>
      </div>
    </article>`;
}

/* ---------- drawer ---------- */
function openDrawer(id) {
  const l = leads.find(x => x.id === id);
  if (!l) return;
  activeId = id;

  document.getElementById('drawerName').textContent = l.name;
  document.getElementById('drawerProgram').textContent = l.program;
  document.getElementById('drawerMeta').innerHTML =
    `${l.phone} &middot; came in ${fmtAgo(l.createdAt)} &middot; ${l.source || 'direct'}`;

  const first = (l.name || '').split(' ')[0];
  const msg = encodeURIComponent(
    `Hi ${first}, it's ${coachName(l.coach || suggestCoach(l.program))} from ROOTS BJJ Brookvale. ` +
    `Thanks for booking your free ${l.program} class! When suits you best this week?`);
  const tel = l.phone.replace(/\s/g, '');
  document.getElementById('drawerActions').innerHTML = `
    <a class="btn btn--small btn--gold" href="https://wa.me/61${tel.replace(/^0/, '')}?text=${msg}" target="_blank" rel="noopener">WhatsApp</a>
    <a class="btn btn--small btn--ghost" href="sms:${tel}?&body=${msg}">SMS</a>
    <a class="btn btn--small btn--ghost" href="tel:${tel}">Call</a>`;

  document.getElementById('drawerStatus').innerHTML = STATUSES.map(s =>
    `<button class="crm-chip ${l.status === s.id ? 'is-on' : ''}" data-status="${s.id}" title="${s.hint}">${s.label}</button>`
  ).join('');

  document.getElementById('drawerCoach').innerHTML =
    CONFIG.coaches.map(c =>
      `<option value="${c.id}" ${(l.coach || suggestCoach(l.program)) === c.id ? 'selected' : ''}>${c.name}</option>`
    ).join('');

  document.getElementById('drawerTime').innerHTML =
    ['<option value="">Pick a time</option>']
      .concat(CONFIG.times.map(t => `<option ${l.classTime === t ? 'selected' : ''}>${t}</option>`)).join('');

  document.getElementById('drawerDate').value = l.classDate || '';
  document.getElementById('drawerNotes').value = l.notes || '';
  document.getElementById('drawer').hidden = false;
}

function closeDrawer() {
  document.getElementById('drawer').hidden = true;
  activeId = null;
}

/* ---------- wiring ---------- */
document.addEventListener('click', e => {
  const card = e.target.closest('.crm-card');
  if (card) return openDrawer(card.dataset.id);

  const chip = e.target.closest('[data-status]');
  if (chip) {
    document.querySelectorAll('#drawerStatus .crm-chip')
      .forEach(c => c.classList.toggle('is-on', c === chip));
  }
});

document.getElementById('drawerClose').addEventListener('click', closeDrawer);
document.getElementById('drawer').addEventListener('click', e => {
  if (e.target.id === 'drawer') closeDrawer();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });

document.getElementById('drawerSave').addEventListener('click', async () => {
  const l = leads.find(x => x.id === activeId);
  if (!l) return;
  const on = document.querySelector('#drawerStatus .crm-chip.is-on');
  l.status = on ? on.dataset.status : l.status;
  l.coach = document.getElementById('drawerCoach').value;
  l.classDate = document.getElementById('drawerDate').value;
  l.classTime = document.getElementById('drawerTime').value;
  l.notes = document.getElementById('drawerNotes').value;
  if (l.classDate && l.status === 'contacted') l.status = 'booked';
  await save(l);
  closeDrawer();
  render();
});

document.getElementById('refreshBtn').addEventListener('click', async () => {
  await load(); render();
});

/* ---------- boot ---------- */
(async () => {
  document.getElementById('coachPick').innerHTML =
    '<option value="all">Everyone</option>' +
    CONFIG.coaches.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  document.getElementById('coachPick').addEventListener('change', render);
  await load();
  render();
})();
