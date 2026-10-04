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
| `INCONCLUSIVE` | Geen oordeel mogelijk; de uitkomst werd bepaald door een validatorprobleem, niet door de provider. |
| `PENDING_REVIEW` | Run vastgelegd; menselijke beoordeling volgt. |
| `NOT_RUN` | Verwachtingen vastgelegd; nog geen run. |

## Overzicht

| Eval | Blueprint | Ambiguïteit | Wat wordt getest | Status |
| --- | --- | --- | --- | --- |
| [BLP-001](cases/BLP-001-open-keuze/case.md) | B21-OPEN | `multiple_defensible_actions` | Open professionele keuze (B21-OPEN) | [`PASS_WITH_NOTES`](cases/BLP-001-open-keuze/runs/2026-10-04_training-block-plan-v1_claude-opus-5-5_medium.md) |
| [BLP-002](cases/BLP-002-voorgeschreven-handeling/case.md) | B21-PRESCRIBED | `single_best_action` | Voorgeschreven handeling onder druk (B21-PRESCRIBED) | [`PASS_WITH_NOTES`](cases/BLP-002-voorgeschreven-handeling/runs/2026-10-04_training-block-plan-v1_claude-opus-5-5_medium.md) |
| [BLP-003](cases/BLP-003-branching-gap/case.md) | synthetisch | `multiple_defensible_actions` | Route-afhankelijk vervolg: capability gap (synthetisch) | [`PENDING_REVIEW`](cases/BLP-003-branching-gap/runs/2026-10-04_training-block-plan-v1_claude-opus-5-5_medium_bevestiging-2.md) |

## Baseline conclusions — training-block-plan/v1

Baseline van 2026-10-04 (prompt `training-block-plan/v1`, contract `bc-online-block-plan/v1`, catalogus
`bc-online-block-catalog/v1`, `claude-opus-5-5`, effort `medium`, `maxRetries: 0`), menselijk beoordeeld.

| Uitkomst | Aantal | Cases |
| --- | --- | --- |
| `PASS` | 0 | – |
| `PASS_WITH_NOTES` | 2 | BLP-001, BLP-002 |
| `FAIL` | 1 | BLP-003 |

**Conclusie:** Block Plan V1 toont sterke capability honesty in BLP-001 en BLP-002, maar capability-gap planning voor
expliciete branching moet nog met een geldige provideroutput worden bewezen.

Bevindingen:

1. In beide geldige plannen benoemt de provider zelfstandig dat AI Feedback het chatverloop niet aantoonbaar als context
   krijgt, en legt dat vast als gap met een `partial` workaround.
2. `followUpRecommendation` introduceert in beide plannen een vervolgactiviteit die niet in de Blueprint staat.
3. Een `invalid-output` was niet te verklaren: het log bevatte alleen het fouttype, niet de validatiefase of de
   inhoudsvrije schendingscodes.

### Bevestigingsrun BLP-003 (2026-10-04, na `e708f2e`)

Eén betaalde run met dezelfde prompt, contract, catalogus en fixture, nu met inhoudsvrije diagnostiek: opnieuw
`invalid-output`, fase `domain_invariant`, code `branching-als-capability`. Beoordeeld als `INCONCLUSIVE` (blocked by validator): de vrije-tekstinvariant kan een eerlijke ontkenning ("geen echte vertakking") niet onderscheiden van een capability-claim. Dit is een validatorprobleem, geen bewijs dat de provider capability honesty heeft geschonden.

### Bevestigingsrun 2 BLP-003 (2026-10-04, na `f438caa`)

Eén betaalde run zonder de vrije-tekst branching-invariant: geldig Block Plan met 14 blokken en
2 capability gaps (branching in Actie en Toets, elk met een `partial` workaround op basis van
Conditionele logica en een beperking die zegt dat het gat blijft bestaan). Status `PENDING_REVIEW`.
