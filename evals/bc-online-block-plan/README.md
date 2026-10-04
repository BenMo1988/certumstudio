# BC Online Block Plan Evals

Kwaliteitsbasis voor de laag ná de goedgekeurde Training Blueprint: van didactisch ontwerp naar een
**BC Online Block Plan** (welke bestaande BC Online-blokken voeren de leerervaring uit).

> Dit is geen productiecode. Uitsluitend synthetische data. Verwachtingen worden vastgelegd vóórdat een generator
> (mock of AI) de case ziet.

## Plaats in de keten

Training Blueprint (didactische waarheid, menselijk goedgekeurd) → **Block Plan** (welke bestaande blokken) →
later Block Content (uitgeschreven inhoud per blok) → later BC Online Adapter (export als concepttraining).

Het Block Plan ontwerpt de leerervaring niet opnieuw en schrijft nog geen eindcontent.

## Uitgangspunten

- De input is uitsluitend een goedgekeurde Blueprint, de catalogus `bc-online-block-catalog/v1` en versiemetadata;
  nooit de oorspronkelijke casus, de analyse of bronsegmenten.
- Alleen bestaande, planbare `certumCatalogId`-waarden. `certumCatalogId` is geen bewezen backendtype.
- Geen vaste koppeling tussen Certum-fase en BC Online-categorie.
- Wat niet aantoonbaar kan, wordt een `capabilityGap`. Branching is niet ondersteund; Conditionele logica is alleen
  conditionele tekstweergave.

## Statussen

| Status | Betekenis |
| --- | --- |
| `PASS` | Voldoet aan alle verwachtingen. |
| `PASS_WITH_NOTES` | Bruikbaar, met aandachtspunten. |
| `FAIL` | Wijkt af van een kernverwachting. |
| `PENDING_REVIEW` | Run vastgelegd; menselijke beoordeling volgt. |
| `NOT_RUN` | Verwachtingen vastgelegd; nog geen run. |

## Overzicht

| Eval | Blueprint | Ambiguïteit | Wat wordt getest | Status |
| --- | --- | --- | --- | --- |
| [BLP-001](cases/BLP-001-open-keuze/case.md) | B21-OPEN | `multiple_defensible_actions` | Open professionele keuze (B21-OPEN) | [`PENDING_REVIEW`](cases/BLP-001-open-keuze/runs/2026-10-04_training-block-plan-v1_claude-opus-5-5_medium.md) |
| [BLP-002](cases/BLP-002-voorgeschreven-handeling/case.md) | B21-PRESCRIBED | `single_best_action` | Voorgeschreven handeling onder druk (B21-PRESCRIBED) | [`PENDING_REVIEW`](cases/BLP-002-voorgeschreven-handeling/runs/2026-10-04_training-block-plan-v1_claude-opus-5-5_medium.md) |
| [BLP-003](cases/BLP-003-branching-gap/case.md) | synthetisch | `multiple_defensible_actions` | Route-afhankelijk vervolg: capability gap (synthetisch) | [`PENDING_REVIEW`](cases/BLP-003-branching-gap/runs/2026-10-04_training-block-plan-v1_claude-opus-5-5_medium.md) |
