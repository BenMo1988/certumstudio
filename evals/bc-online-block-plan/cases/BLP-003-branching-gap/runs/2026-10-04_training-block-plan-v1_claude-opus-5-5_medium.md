# BLP-003 · Run 2026-10-04 · training-block-plan/v1 · claude-opus-5-5 · medium

Baseline-run van BC Online Block Plan Generation (prompt `training-block-plan/v1`, contract
`bc-online-block-plan/v1`), met precies één poging (`maxRetries: 0`). Configuratie bevroren op commit `63b885e`.

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
| durationMs | 61209 |
| outcome | error (invalid-output) |
| plannedBlocks | – |
| capabilityGaps | – |
| invarianten | afgewezen (`invalid-output`); welke regel is niet gelogd |

## Output

Geen Block Plan: de server wees de providerrespons af als `invalid-output` (reden in de flow-log:
`invalid_block_plan`). Ongeldige output wordt niet bewaard.

## Feitelijke review-signalen (zonder oordeel)

| Vraag | Waarneming |
| --- | --- |
| Uitkomst | `invalid-output`: Claude gaf een antwoord (61.209 ms), maar de server wees het af vóór het samengesteld plan werd teruggegeven (schema of Block Plan-invarianten). Conform de baseline-regels geen tweede poging. |
| Welke regel? | Niet vast te stellen. Het log bevat bewust alleen `errorKind: invalid-output`, niet de inhoudsvrije schendingscodes, en ongeldige output wordt niet bewaard. Mogelijke oorzaken zijn onder meer een schemafout, een Actie of Toets zonder open uitvoeringsvorm, een fase zonder blok of gap, of een gepland blok dat zich als vertakking of routering voordoet. |
| Capability honesty | Niet te beoordelen: er is geen plan om te reviewen. Wel vaststaand: er is geen plan met een fictief branching-blok of een verdwenen gap doorgelaten. |
| Observatie | Zonder de schendingscodes is een `invalid-output` in een eval niet uit te leggen. De codes zijn inhoudsvrij (bijv. `branching-als-capability`) en zouden als metadata gelogd kunnen worden; dat is in deze baseline bewust niet gewijzigd. |

## Menselijke evaluatie

**Status: `PENDING_REVIEW`**

Nog niet beoordeeld.
