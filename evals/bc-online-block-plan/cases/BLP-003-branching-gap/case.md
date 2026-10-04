# BLP-003: Route-afhankelijk vervolg: capability gap (synthetisch)

| | |
| --- | --- |
| **Eval-id** | BLP-003 |
| **Input** | Goedgekeurde Training Blueprint (`blueprint-contract/v2`) |
| **Bron** | Synthetisch: synthetisch, afgeleid van evals/training-blueprint/cases/BP-003-volgorde-vervolgcontact/runs/2026-10-03_training-blueprint-v2_claude-opus-5-5_medium.md (title, learningArc.actie.participantMust en learningArc.toets.newDecisionPoint aangepast) |
| **Data** | Volledig fictief / synthetisch |
| **Status (laatste run)** | `PENDING_REVIEW` |

## Input

De Blueprint staat letterlijk in `test/fixtures/approved-blueprints.json` (`BLP-003`).

| | |
| --- | --- |
| **titel** | Synthetisch: volgorde van contacten met route-afhankelijk vervolg |
| **ambiguity** | `multiple_defensible_actions` |
| **decisionPoint.routePolicy** | `open_choice` |
| **performanceType** | `keuze_maken_en_onderbouwen` |
| **sourceNeeds** | `SN1`, `SN2` |

## Verwachtingen

Vastgelegd vóór de implementatie van de Block Plan-provider. Algemeen (G) en casusspecifiek (S).

| # | Soort | Verwachting |
| --- | --- | --- |
| G-1 | Moet | Een geldig Block Plan volgens `bc-online-block-plan/v1` en de bestaande Block Plan-invarianten. |
| G-2 | Moet | Uitsluitend bestaande, planbare `certumCatalogId`-waarden uit `bc-online-block-catalog/v1`; geen nieuwe bloktypen, backendtypes of API-capabilities. |
| G-3 | Mag niet | De Blueprint veranderen: leerdoel, dilemma, ambiguïteit, keuzemoment, learning arc, sourceNeeds, succescriteria of aannames. |
| G-4 | Moet | Trusted velden komen server-side: versie, blueprintVersion, titel, skjPoints `null`, status `concept`, leerdoel(en), tijdsduur `null`, blok-ids en volgorde. |
| G-5 | Mag niet | Een vaste één-op-één-mapping tussen Certum-fase en BC Online-categorie; elk blok is gekozen om zijn didactische functie. |
| G-6 | Mag niet | Bronnen verzinnen: geen URL, documentnaam, richtlijn, wet of broninhoud. Bron verwijst hooguit naar later te tonen gevalideerde inhoud. |
| G-7 | Mag niet | Eindcontent in `configurationIntent`: geen uitgeschreven dialogen, antwoordopties, feedbacktekst, documenten, toetsvragen of broninhoud. |
| G-8 | Moet | Wat BC Online niet aantoonbaar kan, wordt een `capabilityGap`; een workaround is hooguit `partial` en sluit het gat niet. |
| S-1 | Moet | Branching (route-afhankelijk vervolg) blijft een `capabilityGap`. |
| S-2 | Mag | Conditionele logica hooguit als `partial` workaround, met behoud van de beperking (alleen conditionele tekstweergave). |
| S-3 | Mag niet | Een fictief branching-blok of een blok dat als vertakking/routering wordt beschreven. |
| S-4 | Mag niet | Het route-afhankelijke vervolg stil uit het ontwerp halen zodat het toevallig bij BC Online past. |

## Runs

| Datum | Versie | Generator | Status | Run |
| --- | --- | --- | --- | --- |
| 2026-10-04 | training-block-plan/v1 · bc-online-block-plan/v1 | claude-opus-5-5 · medium | `FAIL` | [run](runs/2026-10-04_training-block-plan-v1_claude-opus-5-5_medium.md) |
| 2026-10-04 | training-block-plan/v1 · bc-online-block-plan/v1 (bevestiging, na e708f2e) | claude-opus-5-5 · medium | `PENDING_REVIEW` | [run](runs/2026-10-04_training-block-plan-v1_claude-opus-5-5_medium_bevestiging.md) |
