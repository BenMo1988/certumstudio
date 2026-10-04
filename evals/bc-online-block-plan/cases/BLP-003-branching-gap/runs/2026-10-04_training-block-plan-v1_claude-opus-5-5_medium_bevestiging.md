# BLP-003 · Bevestigingsrun 2026-10-04 · training-block-plan/v1 · claude-opus-5-5 · medium

Bevestigingsrun na de review van de baseline (BLP-003 `FAIL`, reden niet observeerbaar). Zelfde prompt, contract,
catalogus, model, effort en fixture; alleen de inhoudsvrije diagnostiek en `followUpRecommendation: null` zijn
toegevoegd (commit `e708f2e`). Precies één poging (`maxRetries: 0`), geen retry.

Uitgevoerd via de Server Action `generateBlockPlan` op de dev-server (`CERTUM_ANALYSIS_PROVIDER=mock`,
`CERTUM_BLUEPRINT_PROVIDER=mock`, `CERTUM_BLOCK_PLAN_PROVIDER=claude`), met exact de goedgekeurde Blueprint
`BLP-003` uit `test/fixtures/approved-blueprints.json`.

**Status: `PENDING_REVIEW`** (nog geen menselijke beoordeling; geen PASS/FAIL).

## Configuratie en metadata

Overgenomen uit de metadata-logregel `certum.block_plan_generation` van deze run.

| Veld | Waarde |
| --- | --- |
| rundatum | 2026-10-04 |
| provider | claude |
| model | claude-opus-5-5 |
| effort | medium |
| maxRetries | 0 |
| promptVersion | training-block-plan/v1 |
| contractVersion | bc-online-block-plan/v1 |
| catalogVersion | bc-online-block-catalog/v1 |
| blueprintVersion | blueprint-contract/v2 |
| durationMs | 61512 |
| outcome | error (invalid-output) |
| validationStage | `domain_invariant` |
| violationCodes | `branching-als-capability` |

## Output

Geen Block Plan: de server wees de providerrespons af in de fase `domain_invariant` met
`branching-als-capability`. Ongeldige output wordt niet bewaard.

## Feitelijke signalen (zonder oordeel)

| Vraag | Waarneming |
| --- | --- |
| Uitkomst | `invalid-output`, opnieuw (zoals in de baseline), nu met diagnose: `domain_invariant: branching-als-capability`. Conform de regels geen tweede poging. |
| Wat de code betekent | Het schema was geldig en de overige invarianten zijn niet geschonden; minstens één gepland blok (purpose, whyThisBlock of configuratie-instelling/-intentie) bevat een term die de invariant als vertakking of routering herkent (`branch…`, `vertakk…`, `routeer…`, `routering`). |
| Echte claim of vermelding? | Niet vast te stellen. De invariant herkent termen, geen bedoeling: ook een eerlijke ontkenning in een blok (bijv. "geen echte vertakking") valt eronder. Omdat ongeldige output niet wordt bewaard, is niet te zien welke van de twee het was. |
| Capability honesty | Niet te beoordelen: geen geldig plan. Vaststaand: er is geen plan doorgelaten waarin een gepland blok zich als vertakking voordoet. |
| Verwachtingen S-1 t/m S-4 | Niet aangetoond: er is geen geldig plan met een branching-gap en een `partial` workaround. |

## Menselijke evaluatie

**Status: `PENDING_REVIEW`**

Nog niet beoordeeld.
