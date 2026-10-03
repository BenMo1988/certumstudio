# PP-002 · Run 2026-10-03 · privacy-preflight/v1

**Dit is geen Claude-run.** De Privacy Preflight draait lokaal en deterministisch; er is geen externe AI aangeroepen.

## Uitvoering

Uitgevoerd via unit tests (`src/modules/privacy/preflight.test.ts`, `src/app/trainings/new/gated-analysis.test.ts`,
`src/app/trainings/new/actions.test.ts`) en een browserflow op een lokale server met de mock-provider.

## Resultaat

Alleen categorieën en aantallen; nooit de gevonden waarden.

| Veld | Waarde |
| --- | --- |
| rundatum | 2026-10-03 |
| preflightVersion | privacy-preflight/v1 |
| dataPolicy | synthetic_only |
| inputKind | praktijkvraag |
| resultaat | `review_required` |
| gevonden categorieën | `full_date` × 1 |
| blocked-bevinding | nee |
| attestatie vereist | ja (synthetische-data-attestatie onder `synthetic_only`) |
| gate gaf doorgang | Ja, na bevestiging van de datumbevinding én de attestatie. Alleen de datum bevestigen is niet voldoende. |

## Waarnemingen

- Uitsluitend `full_date`; geen `blocked`-bevinding.
- Geen valse treffers op versie-, artikel-, aantal- of tijdnotaties, en niet op de naam van een instantie.

## Menselijke conclusie

**Status: `PASS`**

Werkt zoals verwacht. Onzekerheid leidt tot review, niet tot een harde blokkade.
