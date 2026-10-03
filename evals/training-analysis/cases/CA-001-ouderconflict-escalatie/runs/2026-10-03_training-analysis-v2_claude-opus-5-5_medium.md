# CA-001 · Run 2026-10-03 · training-analysis/v2 · claude-opus-5-5 · medium

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
| inputLength | 570 |
| segmentCount | 6 |
| durationMs | 31149 |
| outcome | success |
| analysisOutcome | ready |
| epistemicFlags | 0 |

Tokengebruik en kosten werden voor deze run niet geregistreerd.

## Bronsegmenten

Zoals server-side gesegmenteerd (`source-segments/v1`) en aan de provider aangeleverd.

- `S1` Een jeugdprofessional voert een gesprek met twee gescheiden ouders over zorgen rondom hun 12-jarige dochter.
- `S2` Tijdens het gesprek verwijten de ouders elkaar dat de ander verantwoordelijk is voor de problemen van het kind.
- `S3` De toon wordt steeds feller.
- `S4` De dochter zit in een aangrenzende ruimte en kan delen van het gesprek horen.
- `S5` Eén ouder vraagt de professional expliciet partij te kiezen en zegt anders niet meer mee te zullen werken aan de hulpverlening.
- `S6` De professional twijfelt of hij het gesprek moet voortzetten, eerst moet begrenzen of het gesprek moet beëindigen.

## Output

Gebruikerszichtbare analyse (`ready`).

**Samenvatting**
Een jeugdprofessional voert een gesprek met twee gescheiden ouders over zorgen rondom hun dochter. De ouders verwijten elkaar dat de ander verantwoordelijk is voor de problemen van het kind en de toon wordt steeds feller. De dochter zit in een aangrenzende ruimte en kan delen van het gesprek horen. Eén ouder vraagt de professional expliciet partij te kiezen en zegt anders niet meer mee te werken aan de hulpverlening. De professional twijfelt of hij het gesprek moet voortzetten, eerst moet begrenzen of moet beëindigen.

**Professioneel dilemma**
De professional moet tijdens een escalerend gesprek kiezen tussen voortzetten, begrenzen of beëindigen, terwijl de dochter delen van het gesprek kan horen en één ouder verdere medewerking afhankelijk maakt van de vraag of de professional partij kiest.

**Voorgesteld leerdoel**
De deelnemer kan in een escalerend gesprek met gescheiden ouders, waarin het kind meeluistert en een ouder vraagt partij te kiezen, een onderbouwde keuze maken tussen het gesprek voortzetten, begrenzen of beëindigen.

**Doelgroep**
Jeugdprofessionals die gesprekken voeren met (gescheiden) ouders over zorgen rondom een kind.

**Beslisrelevante ontbrekende informatie (decisionRelevantGaps)**
- In welke rol en setting voert de professional dit gesprek, bijvoorbeeld als vrijwillige hulpverlener of binnen een ander kader?
  *Doelgroep:* De rol bepaalt voor welke groep jeugdprofessionals de training het meest passend is en welke handelingsruimte de professional heeft om het gesprek te beëindigen of door te zetten zonder medewerking.
- Is het doel van de training vooral gespreksvaardigheid in het moment, of ook de afweging over het vervolg van de hulpverlening na het gesprek?
  *Richtingkeuze:* Bij een focus op het moment liggen de richtingen over begrenzen en het meeluisterende kind voor de hand; bij een focus op het vervolg weegt de richting over het verzoek om partij te kiezen en dreigende niet-medewerking zwaarder.

**Abstraction notes**
- De combinatie van specifieke leeftijd en geslacht van het kind. Beschrijf het kind bij trainingsontwikkeling algemener, bijvoorbeeld als een kind in de basisschool- of vroege tienerleeftijd, tenzij leeftijd inhoudelijk relevant is voor de leerdoelen.

**Rationale**
De casus bevat een concreet keuzemoment waarin de professional expliciet twijfelt tussen voortzetten, begrenzen of beëindigen van het gesprek. Meerdere spanningsvelden, zoals escalatie, een meeluisterend kind en een voorwaardelijk verzoek om partij te kiezen, maken de situatie geschikt als basis voor een praktijksimulatie.

**Trainingsrichtingen**

1. **Oplopend conflict tussen ouders begrenzen** (`escalatie-begrenzen`)
   *Focus:* De professional moet bepalen hoe hij reageert wanneer ouders elkaar verwijten maken en de toon steeds feller wordt, en of hij het gesprek voortzet, begrenst of beëindigt.
   *Leerdoel:* De deelnemer kan herkennen wanneer wederzijdse verwijten tussen ouders het gesprek doen escaleren en kan afwegen of en hoe hij het gesprek begrenst.
   *sourceRefs:* `S2`, `S3`, `S6`
2. **Rekening houden met het meeluisterende kind** (`meeluisterend-kind`)
   *Focus:* De professional moet in zijn keuze over het verloop van het gesprek meewegen dat de dochter in een aangrenzende ruimte delen van het gesprek kan horen.
   *Leerdoel:* De deelnemer kan de aanwezigheid van een meeluisterend kind betrekken bij de beslissing om een gesprek voort te zetten, te begrenzen of te beëindigen.
   *sourceRefs:* `S4`, `S6`
3. **Reageren op de vraag om partij te kiezen** (`verzoek-partij-kiezen`)
   *Focus:* De professional moet reageren op een ouder die expliciet vraagt partij te kiezen en anders dreigt niet meer mee te werken aan de hulpverlening.
   *Leerdoel:* De deelnemer kan reageren op een expliciet verzoek van een ouder om partij te kiezen, waarbij verdere medewerking aan de hulpverlening op het spel wordt gezet, en die reactie onderbouwen.
   *sourceRefs:* `S5`, `S6`

## Interne evaluatie-output: sourceCandidates

Niet zichtbaar in de UI. Kandidaten voor de latere Bron-fase; **geen gevalideerde bronnen en geen vaststelling** dat een kader van toepassing is.

- **Meerzijdige partijdigheid**: Een ouder vraagt de professional expliciet partij te kiezen; een kader over het innemen van een positie tegenover meerdere partijen kan mogelijk helpen bij die afweging.
- **De-escalerende gespreksvoering**: De toon in het gesprek wordt steeds feller en de professional overweegt te begrenzen; methodieken voor de-escalatie kunnen mogelijk ondersteuning bieden.
- **Literatuur over kinderen in (conflict)scheidingen**: Het kind kan delen van het ouderconflict horen; kennis over de impact daarvan kan mogelijk de afweging van de professional onderbouwen.

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

- *Mogelijke nieuwe scenariofeiten:* Geen nieuwe personen, reacties of gebeurtenissen waargenomen. De samenvatting laat de leeftijd van de dochter weg; een abstraction note stelt voor leeftijd en geslacht algemener te maken.
- *Perspectieven sterker dan in de input:* Geen versterking waargenomen; de samenvatting volgt de input vrijwel letterlijk.
- *Overig:* "Meerzijdige partijdigheid" (een V1-aandachtspunt) komt nu alleen voor in de interne sourceCandidates, niet in gebruikersgerichte velden. Gap 1 noemt "vrijwillige hulpverlener of binnen een ander kader" als vraag.

## Menselijke evaluatie

**Status: `PENDING_REVIEW`**

Nog niet beoordeeld. V1 en V2 worden naast elkaar beoordeeld.
