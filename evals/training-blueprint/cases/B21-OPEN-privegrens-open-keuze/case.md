# B21-OPEN: Trusted open_choice: privégrens en werkverantwoordelijkheid

| | |
| --- | --- |
| **Eval-id** | B21-OPEN |
| **Gebaseerd op** | CA-006 (Analysis V2.1, `ready`, menselijk beoordeeld) |
| **Inputsoort** | casus |
| **Data** | Volledig fictief / synthetisch |
| **Status (laatste run)** | `NOT_RUN` |

## Doel van deze eval

Blueprint V2.1-integratiecase voor trusted routebeleid (prompt `training-blueprint/v2.1`, contract
`blueprint-contract/v2`). Eindtest voor het BP-002-probleem (route-prescriptive learning goal): blijft de Blueprint open wanneer het routebeleid `open_choice` uit de analyse komt?

## Bron van deze eval

- Input en analyse: exact de fixture `test/fixtures/v21-ready-analyses.json` (`CA-006`), afkomstig uit
  `evals/training-analysis/cases/CA-006-leidinggeven-privegrens/runs/2026-10-03_training-analysis-v2.1_claude-opus-5-5_medium.md`.
- Er wordt geen nieuwe richting verzonnen; de gekozen richting staat letterlijk in die analyse.

## Input

```text
Een teamleider merkt dat een medewerker de afgelopen maand meerdere deadlines heeft gemist en afspraken niet altijd nakomt. In een gesprek zegt de medewerker dat er privé veel speelt, maar dat hij daar op het werk niet verder over wil praten. De teamleider wil respectvol omgaan met die grens, maar moet ook iets doen met de gevolgen voor het team en het werk.
```

## Gekozen trainingsrichting (trusted context)

| | |
| --- | --- |
| **id** | `grens-en-verantwoordelijkheid` |
| **titel** | Privégrens respecteren en werkverantwoordelijkheid bewaken |
| **routePolicy** | `open_choice` |
| **focus** | Het keuzemoment waarin de teamleider, nadat de medewerker heeft aangegeven niet verder over zijn privésituatie te willen praten, moet bepalen hoe hij met die grens omgaat en tegelijk iets doet met de gevolgen voor het team en het werk. |
| **voorgesteld leerdoel** | De deelnemer kan afwegen hoe hij de door een medewerker aangegeven grens rond privéomstandigheden respecteert en tegelijk verantwoordelijkheid houdt voor het werk en het team, en kan zijn gekozen aanpak onderbouwen in het licht van de situatie en de mogelijke consequenties. |
| **sourceRefs** | `S2`, `S3` |

## Verwachtingen

Vastgelegd vóór de eerste run.

| # | Soort | Verwachting |
| --- | --- | --- |
| R-1 | Moet | Trusted Analysis-routebeleid: `open_choice`. |
| R-2 | Moet | Server-side Blueprint-ambiguïteit: `multiple_defensible_actions`. |
| R-3 | Moet | `decisionPoint.routePolicy` is `open_choice`. |
| R-4 | Moet | `learningArc.actie.routePolicy` is `open_choice`. |
| R-5 | Mag niet | `decisionPoint.task` schrijft een vaste volgorde of route voor. |
| R-6 | Mag niet | Actie schrijft een vaste oplossing voor. |
| R-7 | Moet | Succescriteria beoordelen beide professionele belangen en de kwaliteit van de gekozen aanpak. |
| R-8 | Moet | Feedback beoordeelt afweging, onderbouwing en uitvoering, niet één verplichte route. |
| R-9 | Moet | Toets behoudt dezelfde professionele openheid. |
| R-10 | Moet | Bron gebruikt uitsluitend geldige `sourceNeedRefs`. |
| R-11 | Mag niet | Een nieuwe diagnose, arbeidsrechtelijke conclusie of andere bronfeiten. |
| R-12 | Mag niet | BC Online-bloknamen. |

## Runs

| Datum | Versie | Generator | Status | Run |
| --- | --- | --- | --- | --- |
