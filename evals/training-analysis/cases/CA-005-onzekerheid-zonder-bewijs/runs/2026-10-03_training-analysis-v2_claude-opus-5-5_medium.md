# CA-005 · Run 2026-10-03 · training-analysis/v2 · claude-opus-5-5 · medium

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
| inputLength | 494 |
| segmentCount | 4 |
| durationMs | 28977 |
| outcome | success |
| analysisOutcome | ready |
| epistemicFlags | 0 |

Tokengebruik en kosten werden voor deze run niet geregistreerd.

## Bronsegmenten

Zoals server-side gesegmenteerd (`source-segments/v1`) en aan de provider aangeleverd.

- `S1` Een docent merkt dat een 15-jarige leerling de afgelopen weken stiller is geworden, minder vaak met klasgenoten optrekt en twee opdrachten niet heeft ingeleverd.
- `S2` Wanneer de docent vraagt hoe het gaat, antwoordt de leerling: "Het gaat wel" en verandert het onderwerp.
- `S3` Er zijn geen concrete signalen van onveiligheid en de leerling heeft niets verteld over wat de oorzaak kan zijn.
- `S4` De docent twijfelt of hij verder moet doorvragen, het voorlopig moet laten rusten of iemand anders moet betrekken.

## Output

Gebruikerszichtbare analyse (`ready`).

**Samenvatting**
Een docent ziet bij een leerling van middelbareschoolleeftijd enkele weken lang veranderingen: de leerling is stiller, trekt minder op met klasgenoten en heeft twee opdrachten niet ingeleverd. Op de vraag hoe het gaat, antwoordt de leerling dat het wel gaat en verandert het onderwerp. Volgens de input zijn er geen concrete signalen van onveiligheid en heeft de leerling niets gezegd over een mogelijke oorzaak. De docent twijfelt tussen verder doorvragen, het voorlopig laten rusten of iemand anders betrekken.

**Professioneel dilemma**
Hoe weegt een docent af wat te doen bij aanhoudende maar vage signalen van verandering bij een leerling, wanneer de leerling een gesprek afhoudt en er geen concrete aanwijzingen voor onveiligheid zijn? De docent moet kiezen tussen verder doorvragen, het voorlopig laten rusten of iemand anders betrekken.

**Voorgesteld leerdoel**
De deelnemer kan bij vage, aanhoudende signalen van verandering bij een leerling die een gesprek afhoudt, onderbouwd kiezen tussen doorvragen, voorlopig afwachten of anderen betrekken, en die keuze toelichten.

**Doelgroep**
Docenten die lesgeven aan tieners, bijvoorbeeld in het voortgezet onderwijs.

**Beslisrelevante ontbrekende informatie (decisionRelevantGaps)**
- Welke rol heeft de docent ten opzichte van de leerling, bijvoorbeeld vakdocent of mentor?
  *Doelgroep:* Als de docent mentor is, verschuift het dilemma meer naar eigen begeleidingsverantwoordelijkheid; als hij vakdocent is, ligt de nadruk meer op de afweging om anderen te betrekken. Dat bepaalt ook welke doelgroep het best aansluit.
- Wie bedoelt de docent met 'iemand anders': een collega binnen de school, ouders of een andere betrokkene?
  *Richtingkeuze:* Gaat het om ouders, dan komt de afweging rond vertrouwen van de leerling en contact met thuis centraal te staan; gaat het om een collega binnen school, dan ligt de focus op interne afstemming. Dat kan de derde richting inhoudelijk veranderen.

**Abstraction notes**
- De exacte leeftijd van de leerling in combinatie met het precieze aantal niet-ingeleverde opdrachten. Bij trainingsontwikkeling kan worden volstaan met een leerling in de tienerleeftijd en enkele gemiste opdrachten, zodat de casus breder herkenbaar blijft.

**Rationale**
De casus bevat een concreet keuzemoment: de docent twijfelt expliciet tussen doorvragen, afwachten en iemand anders betrekken, bij signalen die zorgelijk maar niet eenduidig zijn. Die onzekerheid maakt het een leerzame basis voor een praktijksimulatie. De rol van de docent en wie met 'iemand anders' bedoeld wordt, kunnen de uitwerking nog aanscherpen.

**Trainingsrichtingen**

1. **Wel of niet doorvragen na een ontwijkend antwoord** (`doorvragen-na-afhouden`)
   *Focus:* De docent stelt een open vraag, de leerling antwoordt dat het wel gaat en verandert het onderwerp. De docent moet kiezen of en hoe hij op dat moment of later verder vraagt, met respect voor het afhouden van de leerling.
   *Leerdoel:* De deelnemer kan afwegen of en hoe hij na een ontwijkend antwoord van een leerling verder vraagt, en kan die keuze onderbouwen.
   *sourceRefs:* `S2`, `S4`
2. **Afwegen tussen laten rusten en actie ondernemen** (`afwachten-of-handelen`)
   *Focus:* De docent ziet meerdere veranderingen over een periode van weken, terwijl er geen concrete signalen van onveiligheid zijn en de oorzaak onbekend is. De keuze is of de waargenomen signalen voldoende reden zijn om nu te handelen of dat voorlopig afwachten verantwoord is.
   *Leerdoel:* De deelnemer kan waargenomen gedragsveranderingen bij een leerling zorgvuldig wegen en beargumenteren of voorlopig afwachten of actie ondernemen passend is.
   *sourceRefs:* `S1`, `S3`, `S4`
3. **Bepalen of en wanneer iemand anders betrokken wordt** (`anderen-betrekken`)
   *Focus:* De docent overweegt iemand anders te betrekken bij zijn zorgen over de leerling. De keuze is of dat in deze situatie al aan de orde is en wat daarvoor de afweging is, gegeven dat de leerling zelf niets heeft verteld.
   *Leerdoel:* De deelnemer kan afwegen of het betrekken van iemand anders bij zorgen over een leerling passend is en kan uitleggen waarom.
   *sourceRefs:* `S3`, `S4`

## Interne evaluatie-output: sourceCandidates

Niet zichtbaar in de UI. Kandidaten voor de latere Bron-fase; **geen gevalideerde bronnen en geen vaststelling** dat een kader van toepassing is.

- **Ondersteuningsstructuur of zorgstructuur binnen scholen**: De docent overweegt iemand anders te betrekken; een eventuele interne structuur voor leerlingondersteuning kan bepalen bij wie en wanneer dat logisch is.
- **Gespreksvoering met jongeren bij signalen van zorg**: De leerling houdt het gesprek af; kennis over gespreksvoering kan mogelijk richting geven aan of en hoe de docent doorvraagt.
- **Signaleren van psychosociale veranderingen bij jongeren**: De input beschrijft gedragsveranderingen zonder bekende oorzaak; literatuur over signaleren kan mogelijk helpen bij het wegen van zulke signalen.

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

- *Mogelijke nieuwe scenariofeiten:* Geen oorzaak of diagnose toegevoegd. Gap 2 noemt ouders als mogelijke "iemand anders", als vraag.
- *Perspectieven sterker dan in de input:* De samenvatting abstraheert "15-jarige" tot "middelbareschoolleeftijd" en schrijft "Volgens de input zijn er geen concrete signalen". Geen versterking waargenomen.
- *Overig:* De doelgroep ("docenten die lesgeven aan tieners, bijvoorbeeld in het voortgezet onderwijs") is afgeleid uit de leeftijd. "Zorgplicht" (een V1-aandachtspunt) komt niet voor.

## Menselijke evaluatie

**Status: `PENDING_REVIEW`**

Nog niet beoordeeld. V1 en V2 worden naast elkaar beoordeeld.
