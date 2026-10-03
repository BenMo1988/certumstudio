# CA-006 · Run 2026-10-03 · training-analysis/v2 · claude-opus-5-5 · medium

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
| inputLength | 360 |
| segmentCount | 3 |
| durationMs | 18757 |
| outcome | success |
| analysisOutcome | ready |
| epistemicFlags | 0 |

Tokengebruik en kosten werden voor deze run niet geregistreerd.

## Bronsegmenten

Zoals server-side gesegmenteerd (`source-segments/v1`) en aan de provider aangeleverd.

- `S1` Een teamleider merkt dat een medewerker de afgelopen maand meerdere deadlines heeft gemist en afspraken niet altijd nakomt.
- `S2` In een gesprek zegt de medewerker dat er privé veel speelt, maar dat hij daar op het werk niet verder over wil praten.
- `S3` De teamleider wil respectvol omgaan met die grens, maar moet ook iets doen met de gevolgen voor het team en het werk.

## Output

Gebruikerszichtbare analyse (`ready`).

**Samenvatting**
Een teamleider merkt dat een medewerker de afgelopen maand meerdere deadlines heeft gemist en afspraken niet altijd nakomt. In een gesprek geeft de medewerker aan dat er privé veel speelt, maar dat hij daar op het werk niet verder over wil praten. De teamleider wil die grens respecteren en moet tegelijk iets doen met de gevolgen voor het team en het werk.

**Professioneel dilemma**
Hoe respecteert de teamleider de door de medewerker aangegeven grens rond privéomstandigheden, terwijl hij tegelijkertijd de gemiste deadlines en niet nagekomen afspraken bespreekbaar maakt en de gevolgen voor team en werk aanpakt?

**Voorgesteld leerdoel**
De deelnemer kan in een gesprek met een medewerker die aangeeft niet over privéomstandigheden te willen praten, die grens respecteren en tegelijk duidelijke afspraken maken over werkprestaties en de gevolgen voor het team.

**Doelgroep**
Leidinggevenden en teamleiders die medewerkers aansturen.

**Beslisrelevante ontbrekende informatie (decisionRelevantGaps)**
- Gaat het om het eerste gesprek over dit patroon of hebben er al eerder gesprekken of afspraken plaatsgevonden?
  *Richtingkeuze:* Bij een eerste gesprek ligt de nadruk op het aankaarten en de grens respecteren; als er al eerder afspraken zijn gemaakt, verschuift de focus naar het bewaken en eventueel aanscherpen van afspraken.
- In welke sector of organisatievorm werkt de teamleider?
  *Doelgroep:* Een specifieke sector, zoals jeugdhulp of onderwijs, kan de doelgroep versmallen en bepalen welke gevolgen voor team en werk in de training centraal staan.

**Abstraction notes**
Geen.

**Rationale**
De casus bevat een concreet keuzemoment: de teamleider moet de privégrens van de medewerker respecteren en tegelijk de gevolgen van gemiste deadlines en niet nagekomen afspraken aanpakken. Die spanning is duidelijk en goed bruikbaar voor een praktijksimulatie voor leidinggevenden.

**Trainingsrichtingen**

1. **Grens respecteren, werk bespreekbaar houden** (`grens-respecteren-en-werk-bespreken`)
   *Focus:* De teamleider kiest hoe hij reageert op de mededeling van de medewerker dat er privé veel speelt en dat hij daar niet verder over wil praten, zonder het gesprek over de gemiste deadlines en afspraken los te laten.
   *Leerdoel:* De deelnemer kan de door een medewerker aangegeven privégrens erkennen en het gesprek daarna gericht houden op het werkgedrag en de gemaakte afspraken.
   *sourceRefs:* `S2`, `S3`
2. **Afspraken maken over werkprestaties** (`afspraken-maken-over-werkprestaties`)
   *Focus:* De teamleider moet iets doen met de gemiste deadlines en niet nagekomen afspraken en de gevolgen daarvan voor het team en het werk, binnen de grens die de medewerker heeft aangegeven.
   *Leerdoel:* De deelnemer kan met een medewerker concrete en haalbare afspraken maken over werkprestaties, met aandacht voor de gevolgen voor het team, zonder naar privéomstandigheden te vragen.
   *sourceRefs:* `S1`, `S3`
3. **Signalen benoemen en aankaarten** (`signaleren-en-aankaarten`)
   *Focus:* De teamleider merkt over een periode van een maand een patroon van gemiste deadlines en niet nagekomen afspraken op en moet kiezen hoe hij dit feitelijk en respectvol bij de medewerker aankaart.
   *Leerdoel:* De deelnemer kan waargenomen veranderingen in werkgedrag feitelijk en zonder oordeel benoemen in een gesprek met een medewerker.
   *sourceRefs:* `S1`, `S2`

## Interne evaluatie-output: sourceCandidates

Niet zichtbaar in de UI. Kandidaten voor de latere Bron-fase; **geen gevalideerde bronnen en geen vaststelling** dat een kader van toepassing is.

- **Kaders rond verzuim, inzetbaarheid en de rol van de leidinggevende bij privéomstandigheden van medewerkers**: De input raakt aan de vraag wat een leidinggevende wel en niet kan vragen of verwachten als een medewerker aangeeft dat privé veel speelt.
- **Gespreksvoering bij functionerings- of slechtnieuwsgesprekken**: De teamleider moet werkprestaties bespreekbaar maken in een gesprek waarin de medewerker een grens aangeeft.
- **Privacy van medewerkers op de werkvloer**: De medewerker geeft aan niet over privézaken te willen praten, wat vragen kan oproepen over welke informatie een leidinggevende mag vragen of vastleggen.

## Feitelijke metingen

| Meting | Waarde |
| --- | --- |
| verwachte outcome (vooraf vastgelegd) | `ready` |
| werkelijke outcome | `ready` |
| komt overeen | ja |
| trainingsrichtingen | 3 |
| decisionRelevantGaps | 2 |
| possibleScopings | n.v.t. |
| sourceCandidates | 3 |
| epistemicFlags | 0 |
| alle sourceRefs geldig | ja |
| invalid-output | nee |
| gecontroleerde begrippen in gebruikersgerichte velden | geen |

**Signaleringen (geen oordeel):**

- *Mogelijke nieuwe scenariofeiten:* Geen reacties of vragen van teamleden toegevoegd (een V1-aandachtspunt). Richting 3 richt zich op het aankaarten van het patroon, terwijl de input al een gesprek beschrijft; dat is geen nieuw feit, wel een andere fase van de situatie.
- *Perspectieven sterker dan in de input:* Geen versterking waargenomen.
- *Overig:* Een sourceCandidate noemt "verzuim", dat niet in de input staat (alleen in de interne sourceCandidates). Gap 2 noemt jeugdhulp en onderwijs als voorbeeldsectoren.

## Menselijke evaluatie

**Status: `PASS_WITH_NOTES`**

Menselijke review van de baseline training-analysis/v2.

De analyse blijft correct in het domein van leidinggeven, zonder diagnose, arbeidsrechtelijke conclusie of verzonnen teamreacties.

### Aandachtspunt

- Eén trainingsrichting verschuift enigszins naar een vervolgfase van de situatie (het breder aankaarten/communiceren) in plaats van uitsluitend het bestaande beslismoment te verdiepen. Dit is geen reden om V2 nu aan te passen, maar moet bij toekomstige scenario-ontwikkeling worden bewaakt.
