# CA-004 · Run 2026-10-03 · training-analysis/v2 · lokaal gestopt

Baseline-run van training-analysis/v2. **Geen Claude-aanroep:** de lokale Privacy Preflight stopte de invoer vóór de
externe analyse.

## Resultaat

Alleen categorieën en aantallen; nooit de gevonden waarden.

| Veld | Waarde |
| --- | --- |
| rundatum | 2026-10-03 |
| route | lokaal gestopt door Privacy Preflight |
| preflightVersion | privacy-preflight/v1 |
| dataPolicy | synthetic_only |
| inputKind | casus |
| preflight-uitkomst | `blocked` |
| blocked-categorieën | `birth_date`, `phone`, `street_address` |
| review-categorieën | `possible_person_name` × 2, `institution_name` × 1 |
| attestatie | uitgeschakeld (blocked kan niet worden bevestigd) |
| knop "Verder naar analyse" | uitgeschakeld |
| nieuwe server-events voor deze case | 0 |
| Claude-events voor deze case | 0 |
| analyseprovider aangemaakt/aangeroepen | nee |

## Vergelijking met V1

In de V1-baseline werd deze synthetische tekst met persoonsgegevens volledig naar de externe provider gestuurd en
pas daar als `blokkeren` herkend. In V2 verlaat de tekst de browser niet: de lokale preflight stopt de invoer en de
server ontvangt geen analyseverzoek. Dat de server bij een geblokkeerde invoer de provider ook niet aanmaakt, is
daarnaast met unit tests op `runGatedAnalysis` en de Server Action aangetoond.

## Menselijke evaluatie

**Status: `PASS`**

Menselijke review van de baseline training-analysis/v2.

Privacy Preflight blokkeert de input lokaal vóór de analyseprovider wordt aangemaakt of aangeroepen. Er is geen Claude-event ontstaan. Dit lost de fundamentele privacyfout uit V1 architectonisch op.
