# ROOTS Brazilian Jiu-Jitsu — website

Site institucional e landing de captação da ROOTS BJJ (Brookvale, Northern Beaches — Sydney).
HTML, CSS e JavaScript puros: sem build, sem dependências, sem framework.

## Rodar localmente

Qualquer servidor estático serve. O repositório não precisa de instalação:

```bash
python3 -m http.server 4173
# abre http://localhost:4173
```

## Estrutura

| Página | O que é |
|---|---|
| `index.html` | Home |
| `landing.html` | Landing de anúncios com o motor de agendamento (`noindex`) |
| `timetable.html` | Grade semanal de aulas |
| `instructors.html` | Equipe técnica |
| `academies.html` | Mapa-múndi interativo das academias Team Roots |
| `franchise.html` | Página de franquia com agendamento de discovery call |
| `history.html` · `history-brazil.html` · `lineage.html` · `grading.html` · `women.html` · `faqs.html` | Seção *About* |
| `crm.html` | Painel de trials para os professores (`noindex`) |

## Arquitetura

**`schedule.js` é a fonte única de verdade dos horários.** A grade de aulas está
declarada ali uma vez e alimenta o motor de agendamento, a página de timetable e
os horários de funcionamento exibidos no site. Para mudar um horário, mude só
esse arquivo — nada de editar HTML em vários lugares.

```
schedule.js   grade de aulas + helpers (próximas sessões, grade semanal, horários)
booking.js    motor de agendamento: programa → aulas reais → data e hora concretas
landing.js    landing de anúncios (CTA fixo, sequência guiada, submit)
app.js        home (parallax, progresso em faixa, acordeão de programas, depoimentos)
academies.js  mapa-múndi em SVG com zoom por país
crm.js        painel de trials (fonte de dados plugável — ver CONFIG.api)
page.js       comportamento comum das páginas de conteúdo
paulo.js      experiência de avatar em vídeo (em desenvolvimento)
styles.css    design system inteiro — tokens no topo do arquivo
```

### Design system

Os tokens ficam no `:root` do `styles.css`. Paleta atual: fundo neutro claro,
tinta grafite, e vermelho argila / latão envelhecido / oliva como acentos da
marca. Tipografia: Bricolage Grotesque (display), Big Shoulders Display
(labels e números), Archivo (texto), Pirata One (assinatura da marca).

## Pendências conhecidas

- **Formulários são front-end.** O agendamento monta o payload completo (programa,
  data ISO, horário, aula, nome, telefone) mas ainda não envia para lugar nenhum.
  Falta ligar o webhook/CRM.
- **`crm.js` roda em modo demo** com dados locais. Definir `CONFIG.api` para ir ao ar.
- **Turma feminina**: a grade oficial não tem aula exclusiva para mulheres. O site
  hoje diz que mulheres treinam em todas as turmas adultas. Se existir turma
  exclusiva, adicionar em `schedule.js`.
