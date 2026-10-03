# CA-007 · Run 2026-10-03 · training-analysis/v2 · claude-opus-5-5 · medium

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
| inputLength | 521 |
| segmentCount | 6 |
| durationMs | 19000 |
| outcome | success |
| analysisOutcome | ready |
| epistemicFlags | 0 |

Tokengebruik en kosten werden voor deze run niet geregistreerd.

## Bronsegmenten

Zoals server-side gesegmenteerd (`source-segments/v1`) en aan de provider aangeleverd.

- `S1` Een volwassen cliënt ontvangt ambulante begeleiding bij het aanbrengen van structuur in de week.
- `S2` De cliënt geeft aan de geplande ondersteuning rond weekplanning niet meer te willen en zegt liever zijn eigen manier te gebruiken.
- `S3` Hij kan duidelijk uitleggen waarom hij dit wil.
- `S4` De professional merkt wel dat de cliënt de afgelopen maand enkele afspraken heeft gemist.
- `S5` Er zijn geen acute veiligheidsproblemen.
- `S6` De professional twijfelt hoeveel hij moet aandringen en hoeveel ruimte hij moet laten voor de keuze van de cliënt.

## Output

Gebruikerszichtbare analyse (`ready`).

**Samenvatting**
Een volwassen cliënt die ambulante begeleiding krijgt bij het structureren van zijn week, geeft aan de geplande ondersteuning rond weekplanning niet meer te willen en liever zijn eigen manier te gebruiken. De cliënt kan volgens de casus duidelijk uitleggen waarom. De professional merkt dat de cliënt de afgelopen maand enkele afspraken heeft gemist. Er zijn geen acute veiligheidsproblemen. De professional twijfelt hoeveel hij moet aandringen en hoeveel ruimte hij moet laten voor de keuze van de cliënt.

**Professioneel dilemma**
De professional moet afwegen hoeveel ruimte hij geeft aan de duidelijk onderbouwde keuze van de cliënt om de ondersteuning bij weekplanning los te laten, terwijl hij heeft opgemerkt dat de cliënt de afgelopen maand enkele afspraken heeft gemist.

**Voorgesteld leerdoel**
De deelnemer kan in een situatie zonder acute veiligheidsproblemen afwegen hoeveel hij aandringt op afgesproken ondersteuning en hoeveel ruimte hij laat voor de eigen keuze van een volwassen cliënt, en deze afweging in het gesprek met de cliënt bespreekbaar maken.

**Doelgroep**
Professionals die ambulante begeleiding bieden aan volwassen cliënten.

**Beslisrelevante ontbrekende informatie (decisionRelevantGaps)**
- Is de ondersteuning bij weekplanning een afspraak die de cliënt zelf vrijwillig is aangegaan, of is deze onderdeel van een bredere opdracht of indicatie?
  *Dilemma:* Bij volledig vrijwillige ondersteuning ligt het accent meer op het respecteren van de keuze; bij een externe opdracht komt er een extra spanning bij tussen de wens van de cliënt en de verwachtingen van een opdrachtgever.
- Is bekend of de gemiste afspraken samenhangen met de weekplanning waarvoor ondersteuning wordt geboden?
  *Richtingkeuze:* Als dat verband onduidelijk is, ligt de nadruk op het bespreekbaar maken van de waarneming; als het verband duidelijk is, weegt de richting rond aandringen zwaarder.

**Abstraction notes**
Geen.

**Rationale**
De casus bevat een concreet keuzemoment: de professional twijfelt tussen aandringen en ruimte laten voor de onderbouwde keuze van de cliënt, terwijl hij gemiste afspraken heeft opgemerkt. Doordat er geen acute veiligheidsproblemen zijn, ligt de nadruk op een echte professionele afweging, wat de casus geschikt maakt voor een praktijksimulatie.

**Trainingsrichtingen**

1. **Ruimte geven of aandringen** (`ruimte-versus-aandringen`)
   *Focus:* De professional kiest hoe hij reageert op de wens van de cliënt om de ondersteuning bij weekplanning te stoppen: meer aandringen op de geplande ondersteuning of meer ruimte laten voor de eigen keuze van de cliënt.
   *Leerdoel:* De deelnemer kan een onderbouwde keuze maken tussen aandringen en ruimte laten wanneer een volwassen cliënt aangeeft afgesproken ondersteuning niet meer te willen.
   *sourceRefs:* `S2`, `S5`, `S6`
2. **Eigen waarneming inbrengen naast de uitleg van de cliënt** (`observatie-bespreekbaar-maken`)
   *Focus:* De professional bepaalt of en hoe hij zijn waarneming dat de cliënt de afgelopen maand enkele afspraken heeft gemist inbrengt, naast de duidelijke uitleg die de cliënt zelf geeft over zijn wens.
   *Leerdoel:* De deelnemer kan een eigen waarneming over gemiste afspraken bespreekbaar maken zonder de door de cliënt gegeven uitleg terzijde te schuiven.
   *sourceRefs:* `S3`, `S4`

## Interne evaluatie-output: sourceCandidates

Niet zichtbaar in de UI. Kandidaten voor de latere Bron-fase; **geen gevalideerde bronnen en geen vaststelling** dat een kader van toepassing is.

- **Zelfbeschikking en autonomie van volwassen cliënten**: De cliënt geeft een onderbouwde wens aan om ondersteuning los te laten, wat mogelijk raakt aan kaders over het respecteren van eigen keuzes van cliënten.
- **Gespreksmethodieken rond weerstand of ambivalentie bij ondersteuning**: De professional twijfelt hoe hij het gesprek voert over aandringen of ruimte laten; gesprekstechnieken kunnen mogelijk houvast bieden.
- **Regie bij de cliënt in ambulante begeleiding**: De casus gaat over wie bepaalt hoe de week gestructureerd wordt, wat mogelijk aansluit bij uitgangspunten over eigen regie in begeleiding.

## Feitelijke metingen

| Meting | Waarde |
| --- | --- |
| verwachte outcome (vooraf vastgelegd) | `ready` |
| werkelijke outcome | `ready` |
| komt overeen | ja |
| trainingsrichtingen | 2 |
| decisionRelevantGaps | 2 |
| possibleScopings | n.v.t. |
| sourceCandidates | 3 |
| epistemicFlags | 0 |
| alle sourceRefs geldig | ja |
| invalid-output | nee |
| gecontroleerde begrippen in gebruikersgerichte velden | geen |

**Signaleringen (geen oordeel):**

- *Mogelijke nieuwe scenariofeiten:* De gemiste afspraken worden feitelijk benoemd, zonder interpretatie als probleem met structuur (een V1-aandachtspunt). Gap 1 noemt "opdracht of indicatie" en "opdrachtgever" als mogelijkheid in een vraag, niet als feit.
- *Perspectieven sterker dan in de input:* Geen versterking waargenomen; de keuze van de cliënt wordt omschreven als "duidelijk onderbouwd", in lijn met de input.
- *Overig:* Twee trainingsrichtingen.

## Menselijke evaluatie

**Status: `PENDING_REVIEW`**

Nog niet beoordeeld. V1 en V2 worden naast elkaar beoordeeld.
