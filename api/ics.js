/* GET /api/ics?iso=…&start=…&end=…&label=… — devolve o convite da aula.
 *
 * Existe porque o Safari do iPhone ignora o atributo `download` em
 * `data:` URIs: o botão simplesmente não fazia nada no celular. Servindo
 * de uma URL real com Content-Type text/calendar, o iOS reconhece o
 * arquivo e abre direto no app Calendário.
 *
 * Só recebe dados da aula. Nome, telefone e e-mail do aluno não passam
 * por aqui — não vão para log de servidor nem para o header referrer.
 */

function pad(n) { return String(n).padStart(2, '0'); }

function stamp(d) {
  return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate())
    + 'T' + pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + '00Z';
}

/* "18:45" -> 1125 minutos. Devolve null se não for hora válida. */
function mins(hhmm) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || '').trim());
  if (!m) return null;
  const h = +m[1], min = +m[2];
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/* quebra de linha do iCalendar: 75 octetos por linha, continuação com espaço */
function fold(line) {
  if (line.length <= 73) return line;
  const out = [line.slice(0, 73)];
  let rest = line.slice(73);
  while (rest.length > 72) { out.push(' ' + rest.slice(0, 72)); rest = rest.slice(72); }
  if (rest) out.push(' ' + rest);
  return out.join('\r\n');
}

function esc(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;')
    .replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

module.exports = (req, res) => {
  const q = req.query || {};
  const start = new Date(String(q.iso || ''));
  if (isNaN(start.getTime())) {
    return res.status(400).send('invalid date');
  }

  /* Duração pela diferença entre os horários da grade, que estão no fuso
     de Sydney. Somar minutos ao instante inicial funciona em qualquer
     fuso — o erro antigo era aplicar setHours no relógio do visitante. */
  const a = mins(q.start), b = mins(q.end);
  let duration = (a !== null && b !== null && b > a) ? b - a : 45;
  if (duration > 300) duration = 45;
  const end = new Date(start.getTime() + duration * 60000);

  const label = String(q.label || 'Free trial').slice(0, 120);

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ROOTS BJJ//Trial//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    'UID:' + start.getTime() + '@rootsbjj.com.au',
    'DTSTAMP:' + stamp(new Date()),
    'DTSTART:' + stamp(start),
    'DTEND:' + stamp(end),
    fold('SUMMARY:' + esc('Free trial — ' + label + ' at ROOTS BJJ')),
    fold('LOCATION:' + esc('ROOTS BJJ Brookvale, 2/16 Dale Street, Brookvale NSW 2100')),
    fold('DESCRIPTION:' + esc(
      'Arrive 10 minutes early in comfortable clothes with a water bottle. '
      + 'No gi needed for your first class. Questions? Call 1300 590 598.')),
    'BEGIN:VALARM',
    'TRIGGER:-PT2H',
    'ACTION:DISPLAY',
    'DESCRIPTION:ROOTS BJJ trial class in 2 hours',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="roots-trial.ics"');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).send(ics);
};
