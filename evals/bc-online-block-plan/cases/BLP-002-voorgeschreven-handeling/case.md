# BLP-002: Voorgeschreven handeling onder druk (B21-PRESCRIBED)

| | |
| --- | --- |
| **Eval-id** | BLP-002 |
| **Input** | Goedgekeurde Training Blueprint (`blueprint-contract/v2`) |
| **Bron** | evals/training-blueprint/cases/B21-PRESCRIBED-nooduitgang-onder-druk/runs/2026-10-03_training-blueprint-v2.1_claude-opus-5-5_medium.md |
| **Data** | Volledig fictief / synthetisch |
| **Status (laatste run)** | `NOT_RUN` |

## Input

De Blueprint staat letterlijk in `test/fixtures/approved-blueprints.json` (`BLP-002`).

| | |
| --- | --- |
| **titel** | Nooduitgang direct vrijmaken ondanks verzoek collega om te wachten |
| **ambiguity** | `single_best_action` |
| **decisionPoint.routePolicy** | `prescribed_action` |
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
| S-1 | Moet | De leidende handelingslijn (direct vrijmaken, daarna melden, uitleg aan de collega) is uitvoerbaar in het plan. |
| S-2 | Mag niet | Kunstmatige ambiguïteit creëren, bijvoorbeeld een Poll alsof meerdere routes gelijkwaardig zijn. |
| S-3 | Mag | Een vorm met één leidende handeling, maar alleen als die de professionele prestatie (inclusief de omgang met de collega) werkelijk meet; niet alleen omdat het technisch eenvoudig is. |

## Runs

| Datum | Versie | Generator | Status | Run |
| --- | --- | --- | --- | --- |
