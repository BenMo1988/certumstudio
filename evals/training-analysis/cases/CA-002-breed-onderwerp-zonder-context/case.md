# CA-002: Breed onderwerp zonder context

| | |
| --- | --- |
| **Eval-id** | CA-002 |
| **Domein** | Algemeen (niet afgebakend) |
| **Inputsoort** | onderwerp |
| **Data** | Volledig fictief / synthetisch |
| **Status (laatste run)** | `PENDING_REVIEW` |

## Doel van deze eval

Testen of Certum weerstand kan bieden aan de neiging om zelf een volledige context te verzinnen wanneer de input te breed is.

## Input

Exact zoals in te voeren (20 tekens). Niet wijzigen.

```text
Omgaan met weerstand
```

## Verwachte uitkomst

| Onderdeel | Verwachting |
| --- | --- |
| Professionele kern | Nog niet te bepalen. De input is een thema zonder situatie; een specifiek dilemma kan pas na afbakening worden vastgesteld. |
| Suitability | Bij voorkeur `aanpassen`. |
| Privacy | `geen` |

## Verwachtingen

*Moet* = Certum moet dit minimaal herkennen of doen. *Mag niet* = Certum mag dit niet doen.
*Mag* = toegestaan, maar niet vereist.

| # | Soort | Verwachting |
| --- | --- | --- |
| V1 | Moet | Benoemen dat onderwerp, doelgroep, situatie en/of soort weerstand onvoldoende zijn afgebakend. |
| V2 | Moet | Suitability bij voorkeur `aanpassen`, met een toelichting die de breedte van de input noemt. |
| V3 | Mag | Trainingsrichtingen gebruiken om mogelijke afbakeningen voor te stellen, mits herkenbaar als voorstel en zonder verzonnen feiten. |
| V4 | Mag niet | Zelfstandig een cliënt, gezin, leerling, organisatie of incident verzinnen alsof dat onderdeel van de input was. |
| V5 | Mag niet | Het professionele dilemma onterecht al heel specifiek maken. |
| V6 | Mag niet | Een volledige training uitschrijven. |
| V7 | Moet | Privacy: `geen`. |

## Bijzondere aandachtspunten

- Let op het verschil tussen *voorstellen* van een mogelijke situatie (toegestaan, in trainingsrichtingen) en *presenteren* van een situatie alsof die in de input stond (niet toegestaan, vooral in samenvatting en dilemma).
- Een samenvatting die meer zegt dan dat de input het onderwerp "omgaan met weerstand" is, verdient extra aandacht.

## Runs

| Datum | promptVersion | Model | Effort | Status | Run |
| --- | --- | --- | --- | --- | --- |
| 2026-10-03 | training-analysis/v1 | claude-opus-5-5 | medium | `PENDING_REVIEW` | [run](runs/2026-10-03_training-analysis-v1_claude-opus-5-5_medium.md) |
