/* Meta Pixel — ROOTS BJJ
 *
 * Fica num arquivo só para não existirem 13 cópias do mesmo código
 * espalhadas pelo site. Carregue no <head> de cada página:
 *
 *   <script src="pixel.js"></script>
 *
 * O PageView dispara sozinho. A conversão (Schedule) é disparada
 * apenas em booked.html, que só é alcançada depois de uma reserva
 * de verdade aceita pelo servidor.
 *
 * Nunca mandamos nome, telefone ou e-mail para o pixel — só o tipo de
 * aula. Dado pessoal do aluno não sai daqui.
 */

(function (f, b, e, v, n, t, s) {
  if (f.fbq) return;
  n = f.fbq = function () {
    n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
  };
  if (!f._fbq) f._fbq = n;
  n.push = n; n.loaded = !0; n.version = '2.0';
  n.queue = []; t = b.createElement(e); t.async = !0;
  t.src = v; s = b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t, s);
}(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js'));

fbq('init', '1573735667612795');
fbq('track', 'PageView');
