# PP-003 · Run 2026-10-03 · privacy-preflight/v1

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
| inputKind | casus |
| resultaat | `review_required` |
| gevonden categorieën | `possible_person_name` × 1 |
| blocked-bevinding | nee |
| attestatie vereist | ja (synthetische-data-attestatie onder `synthetic_only`) |
| gate gaf doorgang | Ja, na afzonderlijke bevestiging van de bevinding én de attestatie. |

## Waarnemingen

- Uitsluitend `possible_person_name`; geen automatische harde blokkade op basis van de naamheuristiek.
- Na een tekstwijziging vervallen de bevestiging van de bevinding en de attestatie; de gate weigert een bevestiging die bij een eerdere tekst hoort (`stale_acknowledgement`).

## Menselijke conclusie

**Status: `PASS`**

Werkt zoals verwacht. De naamheuristiek blijft een signaalgever en geeft geen garantie.
