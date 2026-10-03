# CA-003: Casus zonder professioneel beslismoment

| | |
| --- | --- |
| **Eval-id** | CA-003 |
| **Domein** | Sociaal werk |
| **Inputsoort** | casus |
| **Data** | Volledig fictief / synthetisch |
| **Status (laatste run)** | `PENDING_REVIEW` |

## Doel van deze eval

Testen of Certum onderscheid maakt tussen een gebeurtenis en een leerwaardige praktijksimulatie.

## Input

Exact zoals in te voeren (229 tekens). Niet wijzigen.

```text
Een sociaal werker vertelt een cliënt dat de openingstijden van het wijkcentrum volgende maand veranderen. De cliënt bedankt voor de informatie en geeft aan de nieuwe tijden te hebben genoteerd. Daarna wordt het gesprek afgerond.
```

## Verwachte uitkomst

| Onderdeel | Verwachting |
| --- | --- |
| Professionele kern | Geen betekenisvol professioneel dilemma: er is geen spanning en geen keuzemoment. |
| Suitability | `ongeschikt`, of zeer duidelijk `aanpassen`. |
| Privacy | `geen` |

## Verwachtingen

*Moet* = Certum moet dit minimaal herkennen of doen. *Mag niet* = Certum mag dit niet doen.
*Mag* = toegestaan, maar niet vereist.

| # | Soort | Verwachting |
| --- | --- | --- |
| V1 | Moet | Herkennen dat er nauwelijks professioneel dilemma, spanning of betekenisvol keuzemoment aanwezig is. |
| V2 | Moet | Suitability `ongeschikt` of zeer duidelijk `aanpassen`. |
| V3 | Mag | Bij ontbrekende informatie benoemen wat nodig zou zijn om er wél een oefensituatie van te maken. |
| V4 | Mag niet | Een conflict of probleem erbij verzinnen om alsnog een training te kunnen maken. |
| V5 | Mag niet | Een kunstmatig zwaar leerdoel formuleren. |
| V6 | Moet | Privacy: `geen`. |

## Bijzondere aandachtspunten

- Bij `aanpassen` moet de toelichting expliciet maken dat de input zoals die is geen keuzemoment bevat; een `aanpassen` dat de situatie toch als bruikbaar presenteert, geldt als niet voldaan.
- Het schema vraagt altijd minstens één trainingsrichting. Bij een ongeschikte input hoort die richting te beschrijven hoe de input kan worden herschreven, niet een uitgewerkt scenario.

## Verwachtingen voor Analysis Contract V2

Vastgelegd vóór de implementatie van Analysis Contract V2 en `training-analysis/v2`. De V1-verwachtingen hierboven
blijven ongewijzigd en gelden voor de v1-runs.

**Verwachte uitkomst:** `unsuitable`: geen leerdoel en geen trainingsrichtingen.

| # | Soort | Verwachting |
| --- | --- | --- |
| V2-1 | Moet | Uitkomst `unsuitable` met een toelichting en maximaal 3 `whatWouldMakeItSuitable`. |
| V2-2 | Mag niet | Een leerdoel, doelgroep of trainingsrichting. |
| V2-3 | Mag niet | Een conflict, probleem of reactie van de cliënt verzinnen om alsnog een training mogelijk te maken. |

## Runs

| Datum | promptVersion | Model | Effort | Status | Run |
| --- | --- | --- | --- | --- | --- |
| 2026-10-03 | training-analysis/v1 | claude-opus-5-5 | medium | `FAIL` | [run](runs/2026-10-03_training-analysis-v1_claude-opus-5-5_medium.md) |
| 2026-10-03 | training-analysis/v2 | claude-opus-5-5 | medium | `PENDING_REVIEW` | [run](runs/2026-10-03_training-analysis-v2_claude-opus-5-5_medium.md) |
