# CA-003 · Run 2026-10-03 · training-analysis/v1 · claude-opus-5-5 · medium

Baseline-run van training-analysis/v1, uitgevoerd via de normale flow op `/trainings/new`
(één analyse, geen herhaling). Configuratie bevroren tijdens de baseline.

## Configuratie en metadata

Overgenomen uit de metadata-logregel `certum.analysis` van deze run.

| Veld | Waarde |
| --- | --- |
| rundatum | 2026-10-03 |
| provider | claude |
| model | claude-opus-5-5 |
| effort | medium |
| promptVersion | training-analysis/v1 |
| inputKind | casus |
| inputLength | 229 |
| durationMs | 10843 |
| outcome | success |
| verdict | ongeschikt |
| privacyLevel | geen |

Tokengebruik en kosten werden voor deze run niet geregistreerd.

## Output

Zoals Certum Studio de analyse toonde.

**Samenvatting**
Een sociaal werker informeert een cliënt over gewijzigde openingstijden van het wijkcentrum. De cliënt neemt de
informatie zonder vragen of bezwaren aan en het gesprek wordt afgerond.

**Professioneel dilemma**
In de casus is geen professioneel dilemma aanwezig. Er is sprake van eenvoudige informatieoverdracht zonder
tegenstrijdige belangen, waarden of verplichtingen en zonder keuzemoment voor de professional.

**Voorgesteld leerdoel**
De deelnemer kan in een informatief gesprek met een cliënt signalen herkennen die om verdere professionele afweging
vragen en bewust kiezen hoe daarop te reageren.

**Doelgroep**
Sociaal werkers

**Geschikt als praktijksimulatie?**
Nee (`ongeschikt`). De casus beschrijft een routinematige informatieoverdracht die soepel verloopt. Er is geen spanning, geen keuzemoment
en geen afweging, waardoor er geen basis is voor een praktijksimulatie volgens de Certum-methodiek.

**Privacy**
`geen`. Geen privacyprobleem gedetecteerd.

**Ontbrekende informatie**
- Een moment in het gesprek waarop de sociaal werker een keuze moet maken
- Gevolgen van de gewijzigde openingstijden voor de cliënt
- Achtergrond van de cliënt en de reden van het contact met de sociaal werker
- Kaders of afspraken van de organisatie die de handelingsruimte van de sociaal werker bepalen

**Rationale**
De casus bevat geen spanning of afweging, terwijl een praktijksimulatie draait om een professionele keuze. Daarom
wordt de casus als ongeschikt beoordeeld en wordt een herschrijfrichting voorgesteld die een realistisch keuzemoment
toevoegt. Er zijn geen herleidbare persoonsgegevens gevonden.

**Trainingsrichtingen**

1. **Casus herschrijven met een keuzemoment**
   Herschrijf de casus zodat de wijziging van de openingstijden gevolgen heeft voor de cliënt, bijvoorbeeld doordat de
   cliënt aangeeft afhankelijk te zijn van de huidige tijden of onrustig reageert. Daarmee ontstaat een situatie
   waarin de sociaal werker moet kiezen hoe ver hij of zij meedenkt binnen de eigen rol en de mogelijkheden van de
   organisatie.
   *Leerdoel:* De deelnemer kan bij een organisatorische wijziging die een cliënt raakt een afweging maken tussen het helder
   communiceren van de vastgestelde regeling en het bieden van passende ondersteuning aan de cliënt.

## Gedrag in Certum Studio

- Melding bovenaan: "Niet geschikt als praktijksimulatie"
- Trainingsrichtingen selecteerbaar: nee
- Knop "Gebruik deze trainingsrichting": uitgeschakeld (melding: "Deze input is niet geschikt als praktijksimulatie.")

## Menselijke evaluatie

**Status: `FAIL`**

Menselijke review van de baseline training-analysis/v1.

### Sterk

- Certum concludeert correct dat geen betekenisvol professioneel dilemma of keuzemoment aanwezig is.

### Failreden

- Ondanks `ongeschikt` genereert het systeem alsnog een leerdoel en trainingsrichting. Een ongeschikte input mag niet gedwongen worden richting trainingsontwikkeling.
