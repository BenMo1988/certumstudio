# CA-006: Buiten jeugdhulp: leidinggeven

| | |
| --- | --- |
| **Eval-id** | CA-006 |
| **Domein** | Leidinggeven / organisatie |
| **Inputsoort** | casus |
| **Data** | Volledig fictief / synthetisch |
| **Status (laatste run)** | `PASS` |

## Doel van deze eval

Testen of Certum ook buiten het sociaal domein een goed professioneel dilemma kan herkennen.

## Input

Exact zoals in te voeren (360 tekens). Niet wijzigen.

```text
Een teamleider merkt dat een medewerker de afgelopen maand meerdere deadlines heeft gemist en afspraken niet altijd nakomt. In een gesprek zegt de medewerker dat er privé veel speelt, maar dat hij daar op het werk niet verder over wil praten. De teamleider wil respectvol omgaan met die grens, maar moet ook iets doen met de gevolgen voor het team en het werk.
```

## Verwachte uitkomst

| Onderdeel | Verwachting |
| --- | --- |
| Professionele kern | Verantwoordelijkheid voor functioneren en het team, versus respect voor privacy en persoonlijke grenzen. |
| Suitability | `geschikt` |
| Privacy | `geen` |

## Verwachtingen

*Moet* = Certum moet dit minimaal herkennen of doen. *Mag niet* = Certum mag dit niet doen.
*Mag* = toegestaan, maar niet vereist.

| # | Soort | Verwachting |
| --- | --- | --- |
| V1 | Moet | Suitability `geschikt`. |
| V2 | Moet | De kern herkennen: verantwoordelijkheid voor functioneren versus respect voor privacy en persoonlijke grenzen. |
| V3 | Moet | Een handelingsgericht leerdoel. |
| V4 | Moet | Trainingsrichtingen die inhoudelijk van elkaar verschillen. |
| V5 | Mag niet | Een diagnose zoals burn-out, depressie of psychische problematiek verzinnen. |
| V6 | Mag niet | Arbeidsrechtelijke conclusies als feit presenteren. |
| V7 | Moet | Privacy: `geen`. |

## Bijzondere aandachtspunten

- De prompt noemt als voorbeelddomeinen het sociaal domein, de jeugdhulp en het onderwijs. Let erop of de analyse het domein leidinggeven correct herkent en niet naar jeugdhulptaal trekt.
- "Privé" in de input is een gespreksonderwerp, geen privacybevinding: privacy hoort `geen` te zijn.

## Verwachtingen voor Analysis Contract V2

Vastgelegd vóór de implementatie van Analysis Contract V2 en `training-analysis/v2`. De V1-verwachtingen hierboven
blijven ongewijzigd en gelden voor de v1-runs.

**Verwachte uitkomst:** `ready`: alleen deze uitkomst levert selecteerbare trainingsrichtingen.

| # | Soort | Verwachting |
| --- | --- | --- |
| V2-1 | Moet | Trainingsrichtingen (1–3) verwijzen elk via `sourceRefs` naar minimaal één bestaand bronsegment. |
| V2-2 | Mag niet | Nieuwe scenariofeiten: personen, reacties, gebeurtenissen, oorzaken of gevolgen die niet in de input staan, ook niet in trainingsrichtingen. |
| V2-3 | Mag niet | Ongefundeerde juridische, methodische of theoretische kaders in gebruikersgerichte analysevelden; zulke begrippen horen hooguit in `sourceCandidates`. |
| V2-4 | Moet | `decisionRelevantGaps` (max. 3) alleen voor informatie die een beslissing over geschiktheid, dilemma, leerdoel, doelgroep of richtingkeuze kan veranderen. |
| V2-5 | Mag niet | Nieuwe reacties of vragen van teamleden in trainingsrichtingen (staan niet in de input). |
| V2-6 | Mag niet | Een diagnose (bijv. burn-out) of arbeidsrechtelijke conclusie. |

## Verwachtingen voor Analysis Direction V2.1

Vastgelegd vóór de implementatie van `training-analysis/v2.1` en `analysis-contract/v2.1`, naar aanleiding van de
upstream-bevinding *route-prescriptive learning goal* uit de Blueprint V2-review van BP-002 (zie
`evals/training-blueprint/README.md`). De V1- en V2-verwachtingen hierboven blijven ongewijzigd en gelden ook voor V2.1.

**Verwachte uitkomst:** `ready`.

Beoordeel expliciet de samenhang **focus ↔ routePolicy ↔ proposedLearningGoal** van de richting
`grens-respecteren-en-werk-bespreken` (of de richting die hetzelfde keuzemoment beschrijft: de reactie op de
uitgesproken privégrens, zonder het werkgesprek los te laten).

| # | Soort | Verwachting |
| --- | --- | --- |
| V2.1-1 | Moet | Iedere trainingsrichting heeft een `routePolicy` (`open_choice` of `prescribed_action`). |
| V2.1-2 | Moet | De richting over de reactie op de privégrens krijgt `routePolicy: open_choice`. |
| V2.1-3 | Moet | De focus van die richting blijft gericht op het spanningsveld tussen de privégrens van de medewerker respecteren en verantwoordelijkheid houden voor functioneren, werk en team. |
| V2.1-4 | Moet | Het `proposedLearningGoal` van die richting is route-neutraal: het beschrijft de professionele prestatie, de af te wegen belangen en wat de professional moet kunnen verantwoorden. |
| V2.1-5 | Mag niet | Een leerdoel dat vooraf vastlegt dat de professional eerst de grens erkent en daarna (direct) het werk bespreekt, of een andere specifieke route, volgorde of oplossing. |
| V2.1-6 | Moet | Meerdere professionele uitvoeringsroutes blijven mogelijk, zolang beide belangen (grens en werk) aantoonbaar worden meegenomen. |
| V2.1-7 | Mag niet | Een diagnose, arbeidsrechtelijke conclusie of andere nieuwe bronfeiten, ook niet via `routePolicy`. |
| V2.1-8 | Moet | `sourceRefs` blijven geldig en verwijzen naar bestaande bronsegmenten; `routePolicy` is een ontwerpclassificatie, geen bronfeit. |

## Runs

| Datum | promptVersion | Model | Effort | Status | Run |
| --- | --- | --- | --- | --- | --- |
| 2026-10-03 | training-analysis/v1 | claude-opus-5-5 | medium | `PASS_WITH_NOTES` | [run](runs/2026-10-03_training-analysis-v1_claude-opus-5-5_medium.md) |
| 2026-10-03 | training-analysis/v2 | claude-opus-5-5 | medium | `PASS_WITH_NOTES` | [run](runs/2026-10-03_training-analysis-v2_claude-opus-5-5_medium.md) |
| 2026-10-03 | training-analysis/v2.1 | claude-opus-5-5 | medium | `PASS` | [run](runs/2026-10-03_training-analysis-v2.1_claude-opus-5-5_medium.md) |
