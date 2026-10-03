# PP-001 · Run 2026-10-03 · privacy-preflight/v1

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
| resultaat | `safe` |
| gevonden categorieën | geen |
| blocked-bevinding | nee |
| attestatie vereist | ja (synthetische-data-attestatie onder `synthetic_only`) |
| gate gaf doorgang | Ja, uitsluitend na de synthetische-data-attestatie. Zonder attestatie: geweigerd (`synthetic_data_attestation_required`). |

## Waarnemingen

- Geen direct herkenbare identifier gevonden.
- De UI toont "Geen direct herkenbare identificatoren gevonden." met de toelichting dat dit geen garantie is dat de tekst anoniem is. Het systeem geeft expliciet geen anonimiteitsgarantie.
- De combinatie van specifieke kenmerken in de input wordt niet automatisch herkend. Dat is de bedoelde grens van V1.

## Menselijke conclusie

**Status: `PASS`**

Werkt zoals verwacht. De preflight geeft terecht `safe` zonder te suggereren dat de tekst anoniem is; de verplichte attestatie blijft de laatste menselijke poort.
