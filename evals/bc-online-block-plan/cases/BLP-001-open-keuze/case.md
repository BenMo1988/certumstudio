# BLP-001: Open professionele keuze (B21-OPEN)

| | |
| --- | --- |
| **Eval-id** | BLP-001 |
| **Input** | Goedgekeurde Training Blueprint (`blueprint-contract/v2`) |
| **Bron** | evals/training-blueprint/cases/B21-OPEN-privegrens-open-keuze/runs/2026-10-03_training-blueprint-v2.1_claude-opus-5-5_medium.md |
| **Data** | Volledig fictief / synthetisch |
| **Status (laatste run)** | `PASS_WITH_NOTES` |

## Input

De Blueprint staat letterlijk in `test/fixtures/approved-blueprints.json` (`BLP-001`).

| | |
| --- | --- |
| **titel** | Privégrens respecteren en werkverantwoordelijkheid bewaken |
| **ambiguity** | `multiple_defensible_actions` |
| **decisionPoint.routePolicy** | `open_choice` |
| **performanceType** | `gesprek_voeren` |
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
| S-1 | Mag niet | De open professionele keuze reduceren tot één juist antwoord: geen Meerkeuze of formele Toets met juist antwoord als kernactiviteit in Actie of Toets. |
| S-2 | Moet | Een uitvoeringsvorm waarin handelen en afwegen zichtbaar worden (de Blueprint vraagt een gesprek). |
| S-3 | Moet | Feedback- en Toetsblokken blijven gericht op de kwaliteit van de afweging, niet op de gekozen route. |

## Runs

| Datum | Versie | Generator | Status | Run |
| --- | --- | --- | --- | --- |
| 2026-10-04 | training-block-plan/v1 · bc-online-block-plan/v1 | claude-opus-5-5 · medium | `PASS_WITH_NOTES` | [run](runs/2026-10-04_training-block-plan-v1_claude-opus-5-5_medium.md) |
