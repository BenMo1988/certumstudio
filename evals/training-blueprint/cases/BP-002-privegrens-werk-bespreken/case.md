# BP-002: Privégrens respecteren en werk bespreekbaar houden

| | |
| --- | --- |
| **Eval-id** | BP-002 |
| **Gebaseerd op** | CA-006 (training-analysis/v2, `ready`) |
| **Inputsoort** | casus |
| **Data** | Volledig fictief / synthetisch |
| **Status (laatste run)** | `PENDING_REVIEW` |

## Bron van deze eval

- Input: exact de input van CA-006 (`evals/training-analysis/cases/CA-006-leidinggeven-privegrens/case.md`).
- Analyse: de V2-baseline-run `evals/training-analysis/cases/CA-006-leidinggeven-privegrens/runs/2026-10-03_training-analysis-v2_claude-opus-5-5_medium.md`
  (outcome `ready`, menselijk beoordeeld).
- Er wordt geen nieuwe richting verzonnen; de gekozen richting bestaat letterlijk in die run.

## Input

Exact zoals in CA-006 (360 tekens). Niet wijzigen.

```text
Een teamleider merkt dat een medewerker de afgelopen maand meerdere deadlines heeft gemist en afspraken niet altijd nakomt. In een gesprek zegt de medewerker dat er privé veel speelt, maar dat hij daar op het werk niet verder over wil praten. De teamleider wil respectvol omgaan met die grens, maar moet ook iets doen met de gevolgen voor het team en het werk.
```

## Gekozen trainingsrichting

| | |
| --- | --- |
| **id** | `grens-respecteren-en-werk-bespreken` |
| **titel** | Grens respecteren, werk bespreekbaar houden |
| **focus** | De teamleider kiest hoe hij reageert op de mededeling van de medewerker dat er privé veel speelt en dat hij daar niet verder over wil praten, zonder het gesprek over de gemiste deadlines en afspraken los te laten. |
| **voorgesteld leerdoel** | De deelnemer kan de door een medewerker aangegeven privégrens erkennen en het gesprek daarna gericht houden op het werkgedrag en de gemaakte afspraken. |
| **sourceRefs** | `S2`, `S3` |

Bronsegmenten van de gekozen richting:
  - `S2` In een gesprek zegt de medewerker dat er privé veel speelt, maar dat hij daar op het werk niet verder over wil praten.
  - `S3` De teamleider wil respectvol omgaan met die grens, maar moet ook iets doen met de gevolgen voor het team en het werk.

Niet gekozen richtingen in dezelfde analyse: `afspraken-maken-over-werkprestaties`, `signaleren-en-aankaarten`.

**Professioneel dilemma (V2-analyse):** Hoe respecteert de teamleider de door de medewerker aangegeven grens rond privéomstandigheden, terwijl hij tegelijkertijd de gemiste deadlines en niet nagekomen afspraken bespreekbaar maakt en de gevolgen voor team en werk aanpakt?

## Verwachte ambiguïteit

Niet vooraf vastgelegd: zowel `single_best_action` als `multiple_defensible_actions` is verdedigbaar. Eis: de keuze is consistent met de Feedback-intentie en de successCriteria.

## Verwachtingen Training Blueprint

| # | Soort | Verwachting |
| --- | --- | --- |
| B-1 | Moet | `selectedDirectionId` is exact de gekozen richting; de Blueprint blijft bij die richting en neemt geen andere richting over. |
| B-2 | Moet | `learningGoal` is gekoppeld aan de gekozen richting (het voorgestelde leerdoel van die richting). |
| B-3 | Moet | `professionalDilemma` blijft inhoudelijk het dilemma uit de V2-analyse. |
| B-4 | Moet | Eén duidelijk hoofdkeuzemoment (`decisionPoint`), herleidbaar tot de gekozen richting en haar `sourceRefs`. |
| B-5 | Mag niet | Noodzakelijke nieuwe feiten over de situatie; ontwerpkeuzes staan als expliciete `assumptions` (max. 3). |
| B-6 | Moet | De zes Certum-fasen (Context, Actie, Reflectie, Feedback, Bron, Toets) vormen samen één leerroute rond hetzelfde keuzemoment. |
| B-7 | Moet | Reflectie kijkt terug op de gemaakte professionele keuze; Feedback reageert op handelen én afweging. |
| B-8 | Moet | Bron formuleert kennisbehoeften (`sourceNeeds`, max. 3) zonder concrete of verzonnen bronnen. |
| B-9 | Moet | Toets richt zich op toepassing/transfer in een nieuw of vergelijkbaar keuzemoment, niet op een kennistoets alleen. |
| B-10 | Moet | `successCriteria` (1–3) zijn observeerbaar handelen of onderbouwen, geen "de deelnemer begrijpt …". |
| B-11 | Mag niet | Volledige trainingscontent: geen uitgeschreven dialogen, antwoordopties, toetsvragen of teksten. |
| B-12 | Mag niet | Diagnoses, arbeidsrechtelijke kaders of reacties van teamleden als feit. |
| B-13 | Moet | Het keuzemoment blijft het bestaande gesprek; geen verschuiving naar een vervolgfase (aandachtspunt uit de V2-review). |

## Verwachtingen BC Online Block Plan

| # | Soort | Verwachting |
| --- | --- | --- |
| P-1 | Moet | Alleen bloktypen uit de vastgelegde BC Online-catalogus (`catalogBlockId`). |
| P-2 | Mag niet | Fictieve of niet-bestaande bloktypen. |
| P-3 | Moet | Ieder voorgesteld blok heeft een didactische reden (`purpose`, `whyThisBlock`). |
| P-4 | Mag | Een Certum-fase met meerdere blokken, en hetzelfde bloktype in verschillende Certum-fasen. |
| P-5 | Moet | Een didactisch gewenste maar niet aantoonbaar ondersteunde capability wordt als `capabilityGap` vastgelegd, niet als nieuw blok. |
| P-6 | Moet | `skjPoints` is `null`; status is `concept`. |
| P-7 | Mag niet | Sleutelwoorden in een Chat simulatie als vervanging van beoordeling van professioneel redeneren. |
| P-8 | Mag niet | Conditionele logica gebruiken alsof het een volledige branching-engine is (het is conditionele tekstweergave). |

## Verwachtingen voor Training Blueprint V2

Vastgelegd vóór de implementatie van `blueprint-contract/v2` en `training-blueprint/v2`, op basis van de
menselijke review van de V1-baseline (tag `blueprint-v1-baseline`). Deze verwachtingen gelden naast de
oorspronkelijke verwachtingen hierboven; die blijven ongewijzigd en gelden ook voor V2.

| # | Soort | Verwachting |
| --- | --- | --- |
| V2-1 | Moet | Een geldige Blueprint (schema en invarianten van `blueprint-contract/v2`). |
| V2-2 | Moet | `ambiguity` is `multiple_defensible_actions`. |
| V2-3 | Mag niet | Een `decisionPoint` dat vooraf één handelingsroute voorschrijft. |
| V2-4 | Moet | Actie houdt daadwerkelijk ruimte voor meerdere professioneel verdedigbare routes. |
| V2-5 | Moet | Feedback beoordeelt de kwaliteit van afweging en uitvoering, niet de gekozen route. |
| V2-6 | Mag niet | Kennisbehoeften in Bron buiten `sourceNeeds`. |

## Runs

| Datum | Versie | Generator | Status | Run |
| --- | --- | --- | --- | --- |
| 2026-10-03 | training-blueprint/v1 · blueprint-contract/v1 | claude-opus-5-5 · medium | `FAIL` | [run](runs/2026-10-03_training-blueprint-v1_claude-opus-5-5_medium.md) |
| 2026-10-03 | training-blueprint/v2 · blueprint-contract/v2 | claude-opus-5-5 · medium | `PENDING_REVIEW` | [run](runs/2026-10-03_training-blueprint-v2_claude-opus-5-5_medium.md) |
