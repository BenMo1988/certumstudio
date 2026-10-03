# Training Blueprint & BC Online Block Plan Evals

Kwaliteitsbasis voor de stap ná Certum Analyse: van een gekozen trainingsrichting naar een **Training Blueprint**
(didactisch ontwerp) en een **BC Online Block Plan** (uitvoeringsvoorstel met bestaande BC Online-blokken).

> Dit is geen productiecode. Uitsluitend synthetische data. Verwachtingen worden vastgelegd vóórdat een generator
> (mock of AI) de case ziet.

## Uitgangspunten

- **Blueprint is de didactische waarheid.** Wat moet de deelnemer meemaken, doen, overwegen, leren en opnieuw
  kunnen toepassen? De zes Certum-fasen (Context → Actie → Reflectie → Feedback → Bron → Toets) zijn didactische
  functies, geen BC Online-bloktypen.
- **Block Plan volgt de Blueprint.** Didactische behoefte → geschikt bestaand blok; nooit andersom. Alleen blokken uit
  de vastgelegde catalogus; wat niet aantoonbaar kan, wordt een `capabilityGap`.
- **Iedere eval bouwt op een bestaande, menselijk beoordeelde V2-analyse** (outcome `ready`) en één daarin
  bestaande trainingsrichting. Er worden geen richtingen verzonnen.
- **Twee menselijke goedkeuringen**: Blueprint en Block Plan, elk afzonderlijk.

## Statussen

| Status | Betekenis |
| --- | --- |
| `PASS` | Voldoet aan alle verwachtingen. |
| `PASS_WITH_NOTES` | Bruikbaar, met aandachtspunten. |
| `FAIL` | Wijkt af van een kernverwachting. |
| `NOT_RUN` | Verwachtingen vastgelegd; nog geen run. |

## Overzicht

| Eval | Bron | Gekozen richting | Onderwerp | Laatste run | Status |
| --- | --- | --- | --- | --- | --- |
| [BP-001](cases/BP-001-ouderconflict-begrenzen/case.md) | CA-001 | `escalatie-begrenzen` | Escalerend ouderconflict: begrenzen of voortzetten | – | `NOT_RUN` |
| [BP-002](cases/BP-002-privegrens-werk-bespreken/case.md) | CA-006 | `grens-respecteren-en-werk-bespreken` | Privégrens respecteren en werk bespreekbaar houden | – | `NOT_RUN` |
| [BP-003](cases/BP-003-volgorde-vervolgcontact/case.md) | CA-008 | `volgorde-vervolgcontact` | Volgorde van vervolgcontacten bij uiteenlopende perspectieven | – | `NOT_RUN` |
