# CA-003 · Run 2026-10-03 · training-analysis/v2 · claude-opus-5-5 · medium

Baseline-run van training-analysis/v2 (Analysis Contract V2), uitgevoerd via de normale flow op `/trainings/new`,
met precies één poging. Configuratie bevroren tijdens de baseline.

## Configuratie en metadata

Overgenomen uit de metadata-logregels `certum.analysis` en `certum.analysis_result` van deze run.

| Veld | Waarde |
| --- | --- |
| rundatum | 2026-10-03 |
| provider | claude |
| model | claude-opus-5-5 |
| effort | medium |
| promptVersion | training-analysis/v2 |
| contractVersion | analysis-contract/v2 |
| preflightVersion | privacy-preflight/v1 |
| preflightStatus | safe |
| preflightMiss | false |
| inputKind | casus |
| inputLength | 229 |
| segmentCount | 3 |
| durationMs | 6655 |
| outcome | success |
| analysisOutcome | unsuitable |
| epistemicFlags | 0 |

Tokengebruik en kosten werden voor deze run niet geregistreerd.

## Bronsegmenten

Zoals server-side gesegmenteerd (`source-segments/v1`) en aan de provider aangeleverd.

- `S1` Een sociaal werker vertelt een cliënt dat de openingstijden van het wijkcentrum volgende maand veranderen.
- `S2` De cliënt bedankt voor de informatie en geeft aan de nieuwe tijden te hebben genoteerd.
- `S3` Daarna wordt het gesprek afgerond.

## Output

Gebruikerszichtbare analyse (`unsuitable`).

**Samenvatting**
Een sociaal werker informeert een cliënt over gewijzigde openingstijden van het wijkcentrum. De cliënt bedankt, geeft aan de nieuwe tijden te hebben genoteerd en het gesprek wordt afgerond.

**Waarom geen goede basis (explanation)**
De casus beschrijft een routinematige mededeling zonder spanning, afweging of keuzemoment voor de professional. De informatie wordt overgedragen en zonder complicaties ontvangen, waardoor er geen betekenisvolle professionele beslissing is om in een praktijksimulatie te oefenen.

**Wat zou de input leerwaardig maken (whatWouldMakeItSuitable)**
- Beschrijf een situatie waarin de wijziging voor de cliënt daadwerkelijk iets betekent en de sociaal werker moet afwegen hoe daarmee om te gaan.
- Voeg een concreet moment toe waarop de sociaal werker tussen meerdere redelijke handelingsopties moet kiezen, bijvoorbeeld door tegenstrijdige belangen of verwachtingen.
- Geef aan welk professioneel vraagstuk de trainingsontwikkelaar met deze casus wil onderzoeken, zodat duidelijk wordt waar de leerwaarde zou moeten liggen.

## Feitelijke metingen

| Meting | Waarde |
| --- | --- |
| verwachte outcome (vooraf vastgelegd) | `unsuitable` |
| werkelijke outcome | `unsuitable` |
| komt overeen | ja |
| trainingsrichtingen | 0 |
| decisionRelevantGaps | 0 |
| possibleScopings | n.v.t. |
| sourceCandidates | n.v.t. |
| epistemicFlags | 0 |
| alle sourceRefs geldig | n.v.t. |
| invalid-output | nee |
| gecontroleerde begrippen in gebruikersgerichte velden | geen |

**Signaleringen (geen oordeel):**

- *Mogelijke nieuwe scenariofeiten:* Geen conflict, probleem of reactie toegevoegd. De aanwijzingen in whatWouldMakeItSuitable beschrijven wat de gebruiker zou kunnen toevoegen.
- *Perspectieven sterker dan in de input:* Geen versterking waargenomen.
- *Overig:* Geen leerdoel, doelgroep of trainingsrichting.

## Menselijke evaluatie

**Status: `PENDING_REVIEW`**

Nog niet beoordeeld. V1 en V2 worden naast elkaar beoordeeld.
