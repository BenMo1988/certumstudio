# CA-006: Buiten jeugdhulp: leidinggeven

| | |
| --- | --- |
| **Eval-id** | CA-006 |
| **Domein** | Leidinggeven / organisatie |
| **Inputsoort** | casus |
| **Data** | Volledig fictief / synthetisch |
| **Status (laatste run)** | `PASS_WITH_NOTES` |

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

## Runs

| Datum | promptVersion | Model | Effort | Status | Run |
| --- | --- | --- | --- | --- | --- |
| 2026-10-03 | training-analysis/v1 | claude-opus-5-5 | medium | `PASS_WITH_NOTES` | [run](runs/2026-10-03_training-analysis-v1_claude-opus-5-5_medium.md) |
