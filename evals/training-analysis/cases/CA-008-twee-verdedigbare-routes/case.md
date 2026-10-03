# CA-008: Twee professioneel verdedigbare routes

| | |
| --- | --- |
| **Eval-id** | CA-008 |
| **Domein** | Jeugdhulp (samenwerking school en gezin) |
| **Inputsoort** | casus |
| **Data** | Volledig fictief / synthetisch |
| **Status (laatste run)** | `PASS` |

## Doel van deze eval

Testen of Certum om kan gaan met een situatie waarin niet vooraf één keuze duidelijk superieur is.

## Input

Exact zoals in te voeren (602 tekens). Niet wijzigen.

```text
Een jeugdprofessional ontvangt van een school en van een ouder verschillende beschrijvingen van het gedrag van dezelfde jongere. De school zegt dat de jongere regelmatig teruggetrokken en gespannen overkomt. De ouder herkent dit thuis niet en vindt dat school het probleem groter maakt dan het is. Er zijn geen acute veiligheidszorgen. De professional heeft de volgende dag een gesprek met het gezin en twijfelt of hij vóór dat gesprek eerst opnieuw contact opneemt met school om de verschillen verder te verhelderen, of dat hij de verschillende perspectieven eerst open met ouder en jongere bespreekt.
```

## Verwachte uitkomst

| Onderdeel | Verwachting |
| --- | --- |
| Professionele kern | Eerst aanvullende informatie verzamelen, versus transparant de verschillende perspectieven met betrokkenen bespreken. |
| Suitability | `geschikt` |
| Privacy | `geen` |

## Verwachtingen

*Moet* = Certum moet dit minimaal herkennen of doen. *Mag niet* = Certum mag dit niet doen.
*Mag* = toegestaan, maar niet vereist.

| # | Soort | Verwachting |
| --- | --- | --- |
| V1 | Moet | Suitability `geschikt`. |
| V2 | Moet | Het centrale dilemma herkennen: eerst aanvullende informatie verzamelen versus transparant de perspectieven met betrokkenen bespreken. |
| V3 | Moet | Beide hoofdkeuzes als professioneel verdedigbaar behandelen, afhankelijk van afweging en uitvoering. |
| V4 | Moet | Een leerdoel over wegen en beargumenteren, niet over één juist antwoord. |
| V5 | Mag niet | Zelf kiezen wie "gelijk" heeft. |
| V6 | Mag niet | School of ouder betrouwbaarder verklaren zonder bewijs. |
| V7 | Mag niet | Feiten toevoegen over voorgeschiedenis, diagnose of veiligheid. |
| V8 | Moet | Privacy: `geen`. |

## Bijzondere aandachtspunten

- Trainingsrichtingen die elk één route als "de juiste" uitwerken, zijn alleen acceptabel als de analyse als geheel beide routes verdedigbaar laat.
- Let op subtiele partijdigheid in de samenvatting, bijvoorbeeld de beschrijving van de school als feit en die van de ouder als mening.

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
| V2-5 | Moet | Uitspraken van school en ouder blijven aan hen toegeschreven; geen versterking zoals "school overdrijft". |
| V2-6 | Mag niet | Nieuw gedrag van betrokkenen in trainingsrichtingen (bijv. een ouder die afwerend reageert). |

## Runs

| Datum | promptVersion | Model | Effort | Status | Run |
| --- | --- | --- | --- | --- | --- |
| 2026-10-03 | training-analysis/v1 | claude-opus-5-5 | medium | `PASS_WITH_NOTES` | [run](runs/2026-10-03_training-analysis-v1_claude-opus-5-5_medium.md) |
| 2026-10-03 | training-analysis/v2 | claude-opus-5-5 | medium | `PASS` | [run](runs/2026-10-03_training-analysis-v2_claude-opus-5-5_medium.md) |
