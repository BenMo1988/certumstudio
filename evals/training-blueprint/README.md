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
| `PENDING_REVIEW` | Run vastgelegd; menselijke beoordeling volgt. |
| `NOT_RUN` | Verwachtingen vastgelegd; nog geen run. |

## Overzicht

| Eval | Bron | Gekozen richting | Onderwerp | Laatste run | Status |
| --- | --- | --- | --- | --- | --- |
| [BP-001](cases/BP-001-ouderconflict-begrenzen/case.md) | CA-001 | `escalatie-begrenzen` | Escalerend ouderconflict: begrenzen of voortzetten | [2026-10-03 (v2)](cases/BP-001-ouderconflict-begrenzen/runs/2026-10-03_training-blueprint-v2_claude-opus-5-5_medium.md) | `PASS` |
| [BP-002](cases/BP-002-privegrens-werk-bespreken/case.md) | CA-006 | `grens-respecteren-en-werk-bespreken` | Privégrens respecteren en werk bespreekbaar houden | [2026-10-03 (v2)](cases/BP-002-privegrens-werk-bespreken/runs/2026-10-03_training-blueprint-v2_claude-opus-5-5_medium.md) | `PASS_WITH_NOTES` |
| [BP-003](cases/BP-003-volgorde-vervolgcontact/case.md) | CA-008 | `volgorde-vervolgcontact` | Volgorde van vervolgcontacten bij uiteenlopende perspectieven | [2026-10-03 (v2)](cases/BP-003-volgorde-vervolgcontact/runs/2026-10-03_training-blueprint-v2_claude-opus-5-5_medium.md) | `PASS` |

## Baseline conclusions — training-blueprint/v1

Baseline van 2026-10-03 (prompt `training-blueprint/v1`, contract `blueprint-contract/v1`, `claude-opus-5-5`,
effort `medium`, `maxRetries: 0`), één poging per case, menselijk beoordeeld.

| Uitkomst | Aantal | Cases |
| --- | --- | --- |
| `PASS` | 1 | BP-003 |
| `PASS_WITH_NOTES` | 1 | BP-001 |
| `FAIL` | 1 | BP-002 |

Systeembrede bevindingen:

1. Training Blueprint V1 kan een coherente Certum learning arc genereren zonder direct volledige trainingscontent of
   BC Online-blokken te schrijven.
2. Professionele ambiguïteit wordt door de AI meestal herkend, maar wordt nog niet consequent doorgevoerd tot in
   `decisionPoint` en Actie (BP-002).
3. `sourceNeeds` en de kennisinhoud van `learningArc.bron` dupliceren dezelfde verantwoordelijkheid en kunnen
   uiteenlopen (BP-002). Er moet één bron van waarheid komen.
4. Assumptions kunnen momenteel als scope-mechanisme worden gebruikt om trusted context buiten het ontwerp te plaatsen
   (BP-001); dit moet in V2 scherper worden begrensd.
5. Alle drie de Blueprints gebruikten exact 3 `successCriteria` en alle drie de Bron-fasen bevatten 3 kennisvragen.
   Dit wordt als observatie vastgelegd wegens mogelijk quota- of templategedrag, maar leidt nu nog niet tot een
   wijziging.

## Baseline conclusions — training-blueprint/v2

Baseline van 2026-10-03 (prompt `training-blueprint/v2`, contract `blueprint-contract/v2`, `claude-opus-5-5`,
effort `medium`, `maxRetries: 0`), één poging per case, menselijk beoordeeld.

| Uitkomst | Aantal | Cases |
| --- | --- | --- |
| `PASS` | 2 | BP-001, BP-003 |
| `PASS_WITH_NOTES` | 1 | BP-002 |
| `FAIL` | 0 | – |

Vergeleken met V1 (1× PASS, 1× PASS_WITH_NOTES, 1× FAIL):

- BP-001: trusted context wordt niet meer via assumptions uit het ontwerp gehaald.
- BP-002: `decisionPoint.task` en Actie schrijven geen route meer voor; sourceNeeds en Bron zijn consistent.
- BP-003: blijft `PASS`.

**Conclusie: Training Blueprint V2 is voldoende stabiel om te sluiten. Er wordt geen Blueprint V3 gestart.**

### Upstream-bevinding: route-prescriptive learning goal

- De geselecteerde trainingsrichting van BP-002 (`grens-respecteren-en-werk-bespreken`) suggereert een open
  professionele keuze.
- Het gekoppelde leerdoel schrijft tegelijkertijd een specifieke handelingslijn en volgorde voor: de grens erkennen en
  het gesprek daarna gericht houden op het werkgedrag.
- Daardoor ontstaat spanning tussen `multiple_defensible_actions` in de Blueprint en het immutable `learningGoal`.
  Blueprint V2 volgt het trusted leerdoel terecht; het resterende voorschrift in successCriteria en Toets komt daaruit
  voort.
- Dit wordt niet in een Blueprint V3 gerepareerd, maar upstream, in de vorming van trainingsrichtingen en leerdoelen.

### Vervolgbevindingen

1. Analysis directions can be internally inconsistent when an open-choice direction is paired with a route-prescriptive
   learning goal.
2. Uit V1, nog open: successCriteria (3/3/3) en Feedback-dimensies (3/3/3) staan in V2 nog steeds op het maximum;
   sourceNeeds (2/2/2) en Bron-refs niet meer. Observatie, geen wijziging.

## Integratiecases — trusted routebeleid (training-blueprint/v2.1)

De ambiguïteit van de Blueprint komt sinds `training-blueprint/v2.1` (contract `blueprint-contract/v2`) uit het
routebeleid van de gekozen Analysis V2.1-richting. Twee integratiecases op basis van beoordeelde Analysis V2.1-uitkomsten:

| Eval | Bron | Gekozen richting | Routebeleid | Verwachte ambiguïteit | Status |
| --- | --- | --- | --- | --- | --- |
| [B21-OPEN](cases/B21-OPEN-privegrens-open-keuze/case.md) | CA-006 | `grens-en-verantwoordelijkheid` | `open_choice` | `multiple_defensible_actions` | [`PENDING_REVIEW`](cases/B21-OPEN-privegrens-open-keuze/runs/2026-10-03_training-blueprint-v2.1_claude-opus-5-5_medium.md) |
| [B21-PRESCRIBED](cases/B21-PRESCRIBED-nooduitgang-onder-druk/case.md) | CA-010 | `instructie-volgen-ondanks-verzoek` | `prescribed_action` | `single_best_action` | [`PENDING_REVIEW`](cases/B21-PRESCRIBED-nooduitgang-onder-druk/runs/2026-10-03_training-blueprint-v2.1_claude-opus-5-5_medium.md) |
