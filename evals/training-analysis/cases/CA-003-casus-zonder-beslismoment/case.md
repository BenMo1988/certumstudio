# CA-003: Casus zonder professioneel beslismoment

| | |
| --- | --- |
| **Eval-id** | CA-003 |
| **Domein** | Sociaal werk |
| **Inputsoort** | casus |
| **Data** | Volledig fictief / synthetisch |
| **Status (laatste run)** | `NOT_RUN` |

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

## Runs

Nog geen runs. Een runbestand wordt pas aangemaakt nadat de analyse daadwerkelijk is uitgevoerd.

| Datum | promptVersion | Model | Effort | Status | Run |
| --- | --- | --- | --- | --- | --- |
