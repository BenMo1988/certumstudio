# BP-003: Volgorde van vervolgcontacten bij uiteenlopende perspectieven

| | |
| --- | --- |
| **Eval-id** | BP-003 |
| **Gebaseerd op** | CA-008 (training-analysis/v2, `ready`) |
| **Inputsoort** | casus |
| **Data** | Volledig fictief / synthetisch |
| **Status (laatste run)** | `PASS` |

## Bron van deze eval

- Input: exact de input van CA-008 (`evals/training-analysis/cases/CA-008-twee-verdedigbare-routes/case.md`).
- Analyse: de V2-baseline-run `evals/training-analysis/cases/CA-008-twee-verdedigbare-routes/runs/2026-10-03_training-analysis-v2_claude-opus-5-5_medium.md`
  (outcome `ready`, menselijk beoordeeld).
- Er wordt geen nieuwe richting verzonnen; de gekozen richting bestaat letterlijk in die run.

## Input

Exact zoals in CA-008 (602 tekens). Niet wijzigen.

```text
Een jeugdprofessional ontvangt van een school en van een ouder verschillende beschrijvingen van het gedrag van dezelfde jongere. De school zegt dat de jongere regelmatig teruggetrokken en gespannen overkomt. De ouder herkent dit thuis niet en vindt dat school het probleem groter maakt dan het is. Er zijn geen acute veiligheidszorgen. De professional heeft de volgende dag een gesprek met het gezin en twijfelt of hij vóór dat gesprek eerst opnieuw contact opneemt met school om de verschillen verder te verhelderen, of dat hij de verschillende perspectieven eerst open met ouder en jongere bespreekt.
```

## Gekozen trainingsrichting

| | |
| --- | --- |
| **id** | `volgorde-vervolgcontact` |
| **titel** | Afwegen van de volgorde van contacten |
| **focus** | De twijfel van de professional of hij vóór het gezinsgesprek eerst opnieuw contact opneemt met school of eerst met ouder en jongere spreekt, gegeven dat er geen acute veiligheidszorgen zijn. |
| **voorgesteld leerdoel** | De deelnemer kan de voor- en nadelen van eerst school benaderen versus eerst het gezin spreken tegen elkaar afwegen en een gemotiveerde keuze maken. |
| **sourceRefs** | `S4`, `S5` |

Bronsegmenten van de gekozen richting:
  - `S4` Er zijn geen acute veiligheidszorgen.
  - `S5` De professional heeft de volgende dag een gesprek met het gezin en twijfelt of hij vóór dat gesprek eerst opnieuw contact opneemt met school om de verschillen verder te verhelderen, of dat hij de verschillende perspectieven eerst open met ouder en jongere bespreekt.

Niet gekozen richtingen in dezelfde analyse: `perspectieven-open-bespreken`, `verheldering-bij-school`.

**Professioneel dilemma (V2-analyse):** De professional moet kiezen tussen vóór het gezinsgesprek eerst bij school verdere verheldering zoeken over de verschillen, of de uiteenlopende perspectieven zonder die extra stap direct en open met ouder en jongere bespreken.

## Verwachte ambiguïteit

`multiple_defensible_actions`: beide routes (eerst school, eerst gezin) zijn verdedigbaar.

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
| B-12 | Mag niet | Eén route als juist behandelen; Feedback beoordeelt de afweging, niet de gekozen route. |
| B-13 | Moet | Uitspraken van school en ouder blijven toegeschreven in scenarioPremise en Context-intentie. |

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
| P-9 | Mag niet | Een Meerkeuze- of Toetsblok met één "juist antwoord" voor de routekeuze. |
| P-10 | Moet | Als route-afhankelijke vervolgstappen gewenst zijn: vastleggen als capabilityGap (geen bewezen branching), eventueel met workaround. |

## Verwachtingen voor Training Blueprint V2

Vastgelegd vóór de implementatie van `blueprint-contract/v2` en `training-blueprint/v2`, op basis van de
menselijke review van de V1-baseline (tag `blueprint-v1-baseline`). Deze verwachtingen gelden naast de
oorspronkelijke verwachtingen hierboven; die blijven ongewijzigd en gelden ook voor V2.

| # | Soort | Verwachting |
| --- | --- | --- |
| V2-1 | Moet | Een geldige Blueprint (schema en invarianten van `blueprint-contract/v2`). |
| V2-2 | Moet | `ambiguity` is `multiple_defensible_actions`. |
| V2-3 | Moet | Beide contactvolgordes (eerst school, eerst het gezin) blijven mogelijk. |
| V2-4 | Moet | School en gezin blijven perspectieven; geen van beide wordt als waarheid behandeld. |
| V2-5 | Mag niet | BC Online-techniek (blokken, branching, routering) in de Blueprint. |
| V2-6 | Moet | Bron verwijst uitsluitend naar `sourceNeeds` (via hun ids). |
| V2-7 | Moet | Toets behoudt transfer: professioneel afwegen onder gewijzigde omstandigheden. |

## Runs

| Datum | Versie | Generator | Status | Run |
| --- | --- | --- | --- | --- |
| 2026-10-03 | training-blueprint/v1 · blueprint-contract/v1 | claude-opus-5-5 · medium | `PASS` | [run](runs/2026-10-03_training-blueprint-v1_claude-opus-5-5_medium.md) |
| 2026-10-03 | training-blueprint/v2 · blueprint-contract/v2 | claude-opus-5-5 · medium | `PASS` | [run](runs/2026-10-03_training-blueprint-v2_claude-opus-5-5_medium.md) |
