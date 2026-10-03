# CA-001 · Run 2026-10-03 · training-analysis/v2.1 · claude-opus-5-5 · medium

Baseline-run van training-analysis/v2.1 (Analysis Contract V2.1), uitgevoerd via de Server Action `analyzeInput` op de
dev-server (`CERTUM_ANALYSIS_PROVIDER=claude`, `CERTUM_BLUEPRINT_PROVIDER=mock`), met precies één poging.
Configuratie bevroren op commit `b0ae631`.

**Status: `PENDING_REVIEW`** (nog geen menselijke beoordeling; geen PASS/FAIL).

## Configuratie en metadata

Overgenomen uit de metadata-logregels `certum.preflight`, `certum.analysis` en `certum.analysis_result` van deze run.

| Veld | Waarde |
| --- | --- |
| rundatum | 2026-10-03 |
| provider | claude |
| model | claude-opus-5-5 |
| effort | medium |
| promptVersion | training-analysis/v2.1 |
| contractVersion | analysis-contract/v2.1 |
| preflightVersion | privacy-preflight/v1 |
| preflightStatus | safe |
| preflightMiss | false |
| syntheticDataAttested | true |
| inputKind | casus |
| inputLength | 570 |
| segmentCount | 6 |
| durationMs | 31942 |
| outcome | success |
| analysisOutcome | ready |
| openChoiceDirections | 3 |
| prescribedActionDirections | 0 |
| epistemicFlags | 0 |

Tokengebruik en kosten werden voor deze run niet geregistreerd. De Analysis-configuratie heeft `maxRetries: 2`
(SDK-transportretries); er trad geen fout op en de duur van de server en de client ligt binnen ~170 ms van elkaar.

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
Een jeugdprofessional voert een gesprek met twee gescheiden ouders over zorgen rondom hun 12-jarige dochter. De ouders verwijten elkaar dat de ander verantwoordelijk is voor de problemen van het kind en de toon wordt steeds feller. De dochter zit in een aangrenzende ruimte en kan delen van het gesprek horen. Eén ouder vraagt de professional expliciet partij te kiezen en zegt anders niet meer mee te zullen werken aan de hulpverlening. De professional twijfelt of hij het gesprek moet voortzetten, eerst moet begrenzen of moet beëindigen.

**Professioneel dilemma**
De professional moet bepalen hoe hij met een escalerend gesprek omgaat, waarin de dochter delen kan horen en één ouder dreigt de medewerking te stoppen als hij geen partij kiest. Hij weegt daarbij af of hij het gesprek voortzet, begrenst of beëindigt. Daarbij spelen het belang van het kind, de samenwerking met beide ouders en de voortgang van de hulpverlening tegelijk een rol.

**Voorgesteld leerdoel**
De deelnemer kan in een escalerend gesprek met gescheiden ouders bepalen hoe hij het belang van het kind, de samenwerking met beide ouders en de voortgang van de hulpverlening tegen elkaar afweegt, en zijn keuze over het verdere verloop van het gesprek professioneel onderbouwen.

**Doelgroep**
Jeugdprofessionals die gesprekken voeren met (gescheiden) ouders over zorgen rond een kind.

**Beslisrelevante ontbrekende informatie (decisionRelevantGaps)**
- Is de training bedoeld voor beginnende of voor ervaren jeugdprofessionals?
  *doelgroep:* Bij beginnende professionals ligt de nadruk eerder op het herkennen van escalatie en het maken van een basiskeuze over het gesprek; bij ervaren professionals kan de afweging tussen de verschillende belangen complexer en zelfstandiger worden uitgewerkt.
- Wat is het doel of de fase van de hulpverlening waarin dit gesprek plaatsvindt?
  *richtingkeuze:* Als het gesprek een eerste kennismaking of een evaluatie in een lopend traject is, verschuift het gewicht van de dreiging met stoppen van de medewerking en daarmee welke richting het meest leerzaam is.

**Abstraction notes**
- De specifieke leeftijd en het geslacht van het kind in combinatie met de gezinssituatie. *Advies:* Beschrijf het kind later algemener, bijvoorbeeld als een kind in de basisschool- of vroege tienerleeftijd, tenzij de leeftijd inhoudelijk nodig is voor de afweging.
- De concrete fysieke opstelling waarbij het kind in een aangrenzende ruimte meeluistert. *Advies:* Houd het gegeven dat het kind het gesprek kan horen, maar formuleer de ruimtelijke situatie zo dat deze in uiteenlopende werksettings herkenbaar is.

**Rationale**
De casus beschrijft een concreet keuzemoment, waarin de professional twijfelt tussen voortzetten, begrenzen en beëindigen van een escalerend gesprek. Meerdere belangen staan onder spanning: het kind dat meeluistert, de vraag om partij te kiezen en de dreiging met het stoppen van de medewerking. Daardoor is de input geschikt voor een praktijksimulatie waarin verschillende routes verdedigbaar zijn.

**Trainingsrichtingen**

1. **Keuze over het verloop van een escalerend gesprek** (`gespreksverloop-bij-escalatie`)
   *routePolicy:* `open_choice`
   *Focus:* De professional staat voor de keuze om het gesprek voort te zetten, eerst te begrenzen of te beëindigen, terwijl de ouders elkaar verwijten maken, de toon feller wordt en de dochter delen van het gesprek kan horen.
   *Leerdoel:* De deelnemer kan bepalen hoe hij met een escalerend oudergesprek omgaat, waarbij hij het belang van het kind dat meeluistert afweegt tegen het doel van het gesprek, en deze keuze professioneel verantwoorden.
   *sourceRefs:* `S2`, `S3`, `S4`, `S6`
2. **Reageren op de vraag om partij te kiezen** (`verzoek-om-partij-te-kiezen`)
   *routePolicy:* `open_choice`
   *Focus:* Eén ouder vraagt de professional expliciet partij te kiezen en verbindt daar het stoppen van de medewerking aan. De professional moet bepalen hoe hij op dit verzoek reageert, met het oog op de relatie met beide ouders en de voortgang van de hulpverlening.
   *Leerdoel:* De deelnemer kan bepalen hoe hij reageert op het verzoek van een ouder om partij te kiezen, waarbij hij de relatie met beide ouders en de voortzetting van de hulpverlening tegen elkaar afweegt, en zijn reactie professioneel onderbouwen.
   *sourceRefs:* `S5`
3. **Rekening houden met het meeluisterende kind** (`kind-binnen-gehoorsafstand`)
   *routePolicy:* `open_choice`
   *Focus:* De dochter zit in een aangrenzende ruimte en kan delen van het gesprek horen, waarin de ouders elkaar verwijten maken over haar problemen. De professional moet bepalen welk gewicht dit krijgt in zijn handelen tijdens het gesprek.
   *Leerdoel:* De deelnemer kan afwegen welke betekenis het heeft dat het kind delen van een conflictueus oudergesprek kan horen, en verantwoorden hoe die afweging zijn handelen tijdens het gesprek bepaalt.
   *sourceRefs:* `S4`, `S6`

## Interne evaluatie-output: sourceCandidates

Niet zichtbaar in de UI. Kandidaten voor de latere Bron-fase; **geen gevalideerde bronnen en geen vaststelling** dat een kader van toepassing is.

- **Richtlijnen of handreikingen over het werken met gescheiden ouders en vechtscheidingen in de jeugdhulp**: De casus gaat over gescheiden ouders die elkaar verwijten maken in het bijzijn van hulpverlening; zulke kaders kunnen later helpen de afweging te onderbouwen.
- **Kaders over de positie en het belang van het kind bij conflicten tussen ouders**: Het kind kan delen van het conflict horen; mogelijk bestaan er kaders over hoe professionals hiermee omgaan.
- **Methodieken voor de-escalatie en het begrenzen van gesprekken**: De professional twijfelt over begrenzen of beëindigen van een feller wordend gesprek; gespreksmethodieken kunnen later als bron dienen.

## Volledige output (JSON)

```json
{
  "outcome": "ready",
  "summary": "Een jeugdprofessional voert een gesprek met twee gescheiden ouders over zorgen rondom hun 12-jarige dochter. De ouders verwijten elkaar dat de ander verantwoordelijk is voor de problemen van het kind en de toon wordt steeds feller. De dochter zit in een aangrenzende ruimte en kan delen van het gesprek horen. Eén ouder vraagt de professional expliciet partij te kiezen en zegt anders niet meer mee te zullen werken aan de hulpverlening. De professional twijfelt of hij het gesprek moet voortzetten, eerst moet begrenzen of moet beëindigen.",
  "professionalDilemma": "De professional moet bepalen hoe hij met een escalerend gesprek omgaat, waarin de dochter delen kan horen en één ouder dreigt de medewerking te stoppen als hij geen partij kiest. Hij weegt daarbij af of hij het gesprek voortzet, begrenst of beëindigt. Daarbij spelen het belang van het kind, de samenwerking met beide ouders en de voortgang van de hulpverlening tegelijk een rol.",
  "proposedLearningGoal": "De deelnemer kan in een escalerend gesprek met gescheiden ouders bepalen hoe hij het belang van het kind, de samenwerking met beide ouders en de voortgang van de hulpverlening tegen elkaar afweegt, en zijn keuze over het verdere verloop van het gesprek professioneel onderbouwen.",
  "targetAudience": "Jeugdprofessionals die gesprekken voeren met (gescheiden) ouders over zorgen rond een kind.",
  "trainingDirections": [
    {
      "id": "gespreksverloop-bij-escalatie",
      "title": "Keuze over het verloop van een escalerend gesprek",
      "focus": "De professional staat voor de keuze om het gesprek voort te zetten, eerst te begrenzen of te beëindigen, terwijl de ouders elkaar verwijten maken, de toon feller wordt en de dochter delen van het gesprek kan horen.",
      "proposedLearningGoal": "De deelnemer kan bepalen hoe hij met een escalerend oudergesprek omgaat, waarbij hij het belang van het kind dat meeluistert afweegt tegen het doel van het gesprek, en deze keuze professioneel verantwoorden.",
      "sourceRefs": [
        "S2",
        "S3",
        "S4",
        "S6"
      ],
      "routePolicy": "open_choice"
    },
    {
      "id": "verzoek-om-partij-te-kiezen",
      "title": "Reageren op de vraag om partij te kiezen",
      "focus": "Eén ouder vraagt de professional expliciet partij te kiezen en verbindt daar het stoppen van de medewerking aan. De professional moet bepalen hoe hij op dit verzoek reageert, met het oog op de relatie met beide ouders en de voortgang van de hulpverlening.",
      "proposedLearningGoal": "De deelnemer kan bepalen hoe hij reageert op het verzoek van een ouder om partij te kiezen, waarbij hij de relatie met beide ouders en de voortzetting van de hulpverlening tegen elkaar afweegt, en zijn reactie professioneel onderbouwen.",
      "sourceRefs": [
        "S5"
      ],
      "routePolicy": "open_choice"
    },
    {
      "id": "kind-binnen-gehoorsafstand",
      "title": "Rekening houden met het meeluisterende kind",
      "focus": "De dochter zit in een aangrenzende ruimte en kan delen van het gesprek horen, waarin de ouders elkaar verwijten maken over haar problemen. De professional moet bepalen welk gewicht dit krijgt in zijn handelen tijdens het gesprek.",
      "proposedLearningGoal": "De deelnemer kan afwegen welke betekenis het heeft dat het kind delen van een conflictueus oudergesprek kan horen, en verantwoorden hoe die afweging zijn handelen tijdens het gesprek bepaalt.",
      "sourceRefs": [
        "S4",
        "S6"
      ],
      "routePolicy": "open_choice"
    }
  ],
  "decisionRelevantGaps": [
    {
      "question": "Is de training bedoeld voor beginnende of voor ervaren jeugdprofessionals?",
      "affects": "doelgroep",
      "howItChangesTheDecision": "Bij beginnende professionals ligt de nadruk eerder op het herkennen van escalatie en het maken van een basiskeuze over het gesprek; bij ervaren professionals kan de afweging tussen de verschillende belangen complexer en zelfstandiger worden uitgewerkt."
    },
    {
      "question": "Wat is het doel of de fase van de hulpverlening waarin dit gesprek plaatsvindt?",
      "affects": "richtingkeuze",
      "howItChangesTheDecision": "Als het gesprek een eerste kennismaking of een evaluatie in een lopend traject is, verschuift het gewicht van de dreiging met stoppen van de medewerking en daarmee welke richting het meest leerzaam is."
    }
  ],
  "abstractionNotes": [
    {
      "feature": "De specifieke leeftijd en het geslacht van het kind in combinatie met de gezinssituatie.",
      "advice": "Beschrijf het kind later algemener, bijvoorbeeld als een kind in de basisschool- of vroege tienerleeftijd, tenzij de leeftijd inhoudelijk nodig is voor de afweging."
    },
    {
      "feature": "De concrete fysieke opstelling waarbij het kind in een aangrenzende ruimte meeluistert.",
      "advice": "Houd het gegeven dat het kind het gesprek kan horen, maar formuleer de ruimtelijke situatie zo dat deze in uiteenlopende werksettings herkenbaar is."
    }
  ],
  "sourceCandidates": [
    {
      "term": "Richtlijnen of handreikingen over het werken met gescheiden ouders en vechtscheidingen in de jeugdhulp",
      "whyPossiblyRelevant": "De casus gaat over gescheiden ouders die elkaar verwijten maken in het bijzijn van hulpverlening; zulke kaders kunnen later helpen de afweging te onderbouwen."
    },
    {
      "term": "Kaders over de positie en het belang van het kind bij conflicten tussen ouders",
      "whyPossiblyRelevant": "Het kind kan delen van het conflict horen; mogelijk bestaan er kaders over hoe professionals hiermee omgaan."
    },
    {
      "term": "Methodieken voor de-escalatie en het begrenzen van gesprekken",
      "whyPossiblyRelevant": "De professional twijfelt over begrenzen of beëindigen van een feller wordend gesprek; gespreksmethodieken kunnen later als bron dienen."
    }
  ],
  "rationale": "De casus beschrijft een concreet keuzemoment, waarin de professional twijfelt tussen voortzetten, begrenzen en beëindigen van een escalerend gesprek. Meerdere belangen staan onder spanning: het kind dat meeluistert, de vraag om partij te kiezen en de dreiging met het stoppen van de medewerking. Daardoor is de input geschikt voor een praktijksimulatie waarin verschillende routes verdedigbaar zijn."
}
```

## Feitelijke metingen

| Meting | Waarde |
| --- | --- |
| verwachte outcome (vooraf vastgelegd) | `ready` |
| werkelijke outcome | `ready` |
| komt overeen | ja |
| trainingsrichtingen | 3 |
| open_choice | 3 |
| prescribed_action | 0 |
| decisionRelevantGaps | 2 |
| sourceCandidates | 3 |
| epistemicFlags | 0 |
| alle sourceRefs geldig | ja |
| invalid-output | nee |
| invariantfouten | geen |

**Signaleringen (geen oordeel):**

- Alle drie de richtingen zijn open_choice en hebben route-neutrale leerdoelen.
- Vergeleken met V2: dezelfde drie thema's (escalatie, het verzoek om partij te kiezen, het meeluisterende kind), met andere ids (`gespreksverloop-bij-escalatie` i.p.v. `escalatie-begrenzen`). Het V2-leerdoel van de escalatierichting ("kan herkennen wanneer … escaleren en kan afwegen of en hoe hij het gesprek begrenst") is in V2.1 breder geformuleerd als afweging tussen belangen.
- Epistemische discipline: 0 flags in gebruikersgerichte velden. De sourceCandidates noemen "vechtscheidingen" en "Methodieken voor de-escalatie" (alleen intern, niet zichtbaar in de UI).
- Aantallen: decisionRelevantGaps 2, sourceCandidates 3 (zelfde patroon als de V2-baseline).

## Beoordeling per trainingsrichting

### `gespreksverloop-bij-escalatie` · `open_choice`

- routePolicy ↔ focus: open_choice; de focus noemt de keuze tussen voortzetten, begrenzen en beëindigen zonder een uitkomst te kiezen.
- routePolicy ↔ leerdoel: "bepalen hoe hij … omgaat, … afweegt …, en deze keuze professioneel verantwoorden": prestatie, belangen en verantwoording; geen route of volgorde.
- Kunstmatige ambiguïteit: nee; de drie routes staan letterlijk in S6.
- Nieuwe scenariofeiten of kaders: geen. sourceRefs S2, S3, S4, S6 (bestaan).

Te beoordelen: past routePolicy bij de focus? Past het leerdoel bij dezelfde routePolicy? Bevat een open_choice-leerdoel
toch een voorgeschreven route of volgorde? Maakt prescribed_action terecht één handeling leidend? Is er kunstmatige
ambiguïteit toegevoegd? Zijn er nieuwe scenariofeiten of kaders?

### `verzoek-om-partij-te-kiezen` · `open_choice`

- routePolicy ↔ focus: open_choice; "moet bepalen hoe hij op dit verzoek reageert".
- routePolicy ↔ leerdoel: "bepalen hoe hij reageert …, … tegen elkaar afweegt, en zijn reactie professioneel onderbouwen"; geen route voorgeschreven.
- Kunstmatige ambiguïteit: nee.
- Nieuwe scenariofeiten of kaders: geen. sourceRefs S5 (bestaat).

Te beoordelen: past routePolicy bij de focus? Past het leerdoel bij dezelfde routePolicy? Bevat een open_choice-leerdoel
toch een voorgeschreven route of volgorde? Maakt prescribed_action terecht één handeling leidend? Is er kunstmatige
ambiguïteit toegevoegd? Zijn er nieuwe scenariofeiten of kaders?

### `kind-binnen-gehoorsafstand` · `open_choice`

- routePolicy ↔ focus: open_choice; "moet bepalen welk gewicht dit krijgt in zijn handelen".
- routePolicy ↔ leerdoel: "afwegen welke betekenis het heeft … en verantwoorden hoe die afweging zijn handelen … bepaalt"; geen route voorgeschreven.
- Kunstmatige ambiguïteit: nee.
- Nieuwe scenariofeiten of kaders: geen. sourceRefs S4, S6 (bestaan).

Te beoordelen: past routePolicy bij de focus? Past het leerdoel bij dezelfde routePolicy? Bevat een open_choice-leerdoel
toch een voorgeschreven route of volgorde? Maakt prescribed_action terecht één handeling leidend? Is er kunstmatige
ambiguïteit toegevoegd? Zijn er nieuwe scenariofeiten of kaders?

## Menselijke evaluatie

**Status: `PENDING_REVIEW`**

Nog niet beoordeeld.
