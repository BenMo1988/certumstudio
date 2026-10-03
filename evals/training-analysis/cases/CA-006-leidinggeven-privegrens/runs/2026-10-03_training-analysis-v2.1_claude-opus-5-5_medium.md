# CA-006 · Run 2026-10-03 · training-analysis/v2.1 · claude-opus-5-5 · medium

Baseline-run van training-analysis/v2.1 (Analysis Contract V2.1), uitgevoerd via de Server Action `analyzeInput` op de
dev-server (`CERTUM_ANALYSIS_PROVIDER=claude`, `CERTUM_BLUEPRINT_PROVIDER=mock`), met precies één poging.
Configuratie bevroren op commit `b0ae631`.

**Status: `PASS`** (menselijk beoordeeld; zie "Menselijke evaluatie").

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
| inputLength | 360 |
| segmentCount | 3 |
| durationMs | 18847 |
| outcome | success |
| analysisOutcome | ready |
| openChoiceDirections | 2 |
| prescribedActionDirections | 0 |
| epistemicFlags | 0 |

Tokengebruik en kosten werden voor deze run niet geregistreerd. De Analysis-configuratie heeft `maxRetries: 2`
(SDK-transportretries); er trad geen fout op en de duur van de server en de client ligt binnen ~170 ms van elkaar.

## Bronsegmenten

Zoals server-side gesegmenteerd (`source-segments/v1`) en aan de provider aangeleverd.

- `S1` Een teamleider merkt dat een medewerker de afgelopen maand meerdere deadlines heeft gemist en afspraken niet altijd nakomt.
- `S2` In een gesprek zegt de medewerker dat er privé veel speelt, maar dat hij daar op het werk niet verder over wil praten.
- `S3` De teamleider wil respectvol omgaan met die grens, maar moet ook iets doen met de gevolgen voor het team en het werk.

## Output

Gebruikerszichtbare analyse (`ready`).

**Samenvatting**
Een teamleider merkt dat een medewerker de afgelopen maand meerdere deadlines heeft gemist en afspraken niet altijd nakomt. In een gesprek geeft de medewerker aan dat er privé veel speelt, maar dat hij daar op het werk niet verder over wil praten. De teamleider wil die grens respecteren, maar moet ook iets doen met de gevolgen voor het team en het werk.

**Professioneel dilemma**
De teamleider staat voor de vraag hoe hij de door de medewerker aangegeven grens rond zijn privésituatie respecteert, terwijl hij tegelijk verantwoordelijkheid houdt voor de gemiste deadlines, niet nagekomen afspraken en de gevolgen daarvan voor het team en het werk.

**Voorgesteld leerdoel**
De deelnemer kan als leidinggevende bepalen hoe hij de privacygrens van een medewerker respecteert en tegelijk verantwoordelijkheid neemt voor de werkprestaties en de gevolgen voor het team, en deze keuze professioneel onderbouwen.

**Doelgroep**
Teamleiders en andere leidinggevenden die medewerkers aansturen.

**Beslisrelevante ontbrekende informatie (decisionRelevantGaps)**
- Gaat het om leidinggevenden in een specifieke sector of organisatievorm, bijvoorbeeld zorg, onderwijs of sociaal domein?
  *doelgroep:* Een specifieke sector maakt de doelgroep nauwer en kan bepalen welke gevolgen voor het team en het werk in de training centraal staan.
- Is de training bedoeld voor beginnende of voor ervaren leidinggevenden?
  *leerdoel:* Voor beginnende leidinggevenden ligt het accent eerder op het voeren van het gesprek zelf; voor ervaren leidinggevenden kan het leerdoel meer gericht zijn op de afweging van belangen en de vervolgstappen.

**Abstraction notes**
Geen.

**Rationale**
De casus bevat een concreet keuzemoment waarin een teamleider de grens van een medewerker wil respecteren en tegelijk verantwoordelijk is voor de gevolgen voor team en werk. Die spanning is herkenbaar en leent zich voor een praktijksimulatie waarin meerdere aanpakken verdedigbaar zijn en de kwaliteit van de afweging centraal staat.

**Trainingsrichtingen**

1. **Privégrens respecteren en werkverantwoordelijkheid bewaken** (`grens-en-verantwoordelijkheid`)
   *routePolicy:* `open_choice`
   *Focus:* Het keuzemoment waarin de teamleider, nadat de medewerker heeft aangegeven niet verder over zijn privésituatie te willen praten, moet bepalen hoe hij met die grens omgaat en tegelijk iets doet met de gevolgen voor het team en het werk.
   *Leerdoel:* De deelnemer kan afwegen hoe hij de door een medewerker aangegeven grens rond privéomstandigheden respecteert en tegelijk verantwoordelijkheid houdt voor het werk en het team, en kan zijn gekozen aanpak onderbouwen in het licht van de situatie en de mogelijke consequenties.
   *sourceRefs:* `S2`, `S3`
2. **Werkprestaties bespreekbaar maken** (`bespreken-werkprestaties`)
   *routePolicy:* `open_choice`
   *Focus:* Het moment waarop de teamleider de waargenomen gemiste deadlines en niet nagekomen afspraken met de medewerker bespreekt, waarbij hij moet kiezen hoe hij het gesprek over het werk voert zonder de aangegeven privégrens te passeren.
   *Leerdoel:* De deelnemer kan bepalen hoe hij concrete observaties over werkprestaties bespreekbaar maakt bij een medewerker die privéomstandigheden noemt maar daar niet over wil praten, en kan verantwoorden hoe zijn aanpak recht doet aan zowel de medewerker als de belangen van het werk.
   *sourceRefs:* `S1`, `S2`

## Interne evaluatie-output: sourceCandidates

Niet zichtbaar in de UI. Kandidaten voor de latere Bron-fase; **geen gevalideerde bronnen en geen vaststelling** dat een kader van toepassing is.

- **Organisatiebeleid of richtlijnen over het bespreken van verminderd functioneren en privéomstandigheden**: De teamleider moet iets doen met de gevolgen voor het werk terwijl de medewerker privéomstandigheden noemt; interne kaders kunnen mogelijk richting geven aan wat een leidinggevende hierin mag en moet.
- **Privacyregels rond gegevens over medewerkers**: De medewerker geeft aan niet over zijn privésituatie te willen praten; regels over wat een werkgever mag vragen of vastleggen kunnen mogelijk relevant zijn voor de afweging.

## Volledige output (JSON)

```json
{
  "outcome": "ready",
  "summary": "Een teamleider merkt dat een medewerker de afgelopen maand meerdere deadlines heeft gemist en afspraken niet altijd nakomt. In een gesprek geeft de medewerker aan dat er privé veel speelt, maar dat hij daar op het werk niet verder over wil praten. De teamleider wil die grens respecteren, maar moet ook iets doen met de gevolgen voor het team en het werk.",
  "professionalDilemma": "De teamleider staat voor de vraag hoe hij de door de medewerker aangegeven grens rond zijn privésituatie respecteert, terwijl hij tegelijk verantwoordelijkheid houdt voor de gemiste deadlines, niet nagekomen afspraken en de gevolgen daarvan voor het team en het werk.",
  "proposedLearningGoal": "De deelnemer kan als leidinggevende bepalen hoe hij de privacygrens van een medewerker respecteert en tegelijk verantwoordelijkheid neemt voor de werkprestaties en de gevolgen voor het team, en deze keuze professioneel onderbouwen.",
  "targetAudience": "Teamleiders en andere leidinggevenden die medewerkers aansturen.",
  "trainingDirections": [
    {
      "id": "grens-en-verantwoordelijkheid",
      "title": "Privégrens respecteren en werkverantwoordelijkheid bewaken",
      "focus": "Het keuzemoment waarin de teamleider, nadat de medewerker heeft aangegeven niet verder over zijn privésituatie te willen praten, moet bepalen hoe hij met die grens omgaat en tegelijk iets doet met de gevolgen voor het team en het werk.",
      "proposedLearningGoal": "De deelnemer kan afwegen hoe hij de door een medewerker aangegeven grens rond privéomstandigheden respecteert en tegelijk verantwoordelijkheid houdt voor het werk en het team, en kan zijn gekozen aanpak onderbouwen in het licht van de situatie en de mogelijke consequenties.",
      "sourceRefs": [
        "S2",
        "S3"
      ],
      "routePolicy": "open_choice"
    },
    {
      "id": "bespreken-werkprestaties",
      "title": "Werkprestaties bespreekbaar maken",
      "focus": "Het moment waarop de teamleider de waargenomen gemiste deadlines en niet nagekomen afspraken met de medewerker bespreekt, waarbij hij moet kiezen hoe hij het gesprek over het werk voert zonder de aangegeven privégrens te passeren.",
      "proposedLearningGoal": "De deelnemer kan bepalen hoe hij concrete observaties over werkprestaties bespreekbaar maakt bij een medewerker die privéomstandigheden noemt maar daar niet over wil praten, en kan verantwoorden hoe zijn aanpak recht doet aan zowel de medewerker als de belangen van het werk.",
      "sourceRefs": [
        "S1",
        "S2"
      ],
      "routePolicy": "open_choice"
    }
  ],
  "decisionRelevantGaps": [
    {
      "question": "Gaat het om leidinggevenden in een specifieke sector of organisatievorm, bijvoorbeeld zorg, onderwijs of sociaal domein?",
      "affects": "doelgroep",
      "howItChangesTheDecision": "Een specifieke sector maakt de doelgroep nauwer en kan bepalen welke gevolgen voor het team en het werk in de training centraal staan."
    },
    {
      "question": "Is de training bedoeld voor beginnende of voor ervaren leidinggevenden?",
      "affects": "leerdoel",
      "howItChangesTheDecision": "Voor beginnende leidinggevenden ligt het accent eerder op het voeren van het gesprek zelf; voor ervaren leidinggevenden kan het leerdoel meer gericht zijn op de afweging van belangen en de vervolgstappen."
    }
  ],
  "abstractionNotes": [],
  "sourceCandidates": [
    {
      "term": "Organisatiebeleid of richtlijnen over het bespreken van verminderd functioneren en privéomstandigheden",
      "whyPossiblyRelevant": "De teamleider moet iets doen met de gevolgen voor het werk terwijl de medewerker privéomstandigheden noemt; interne kaders kunnen mogelijk richting geven aan wat een leidinggevende hierin mag en moet."
    },
    {
      "term": "Privacyregels rond gegevens over medewerkers",
      "whyPossiblyRelevant": "De medewerker geeft aan niet over zijn privésituatie te willen praten; regels over wat een werkgever mag vragen of vastleggen kunnen mogelijk relevant zijn voor de afweging."
    }
  ],
  "rationale": "De casus bevat een concreet keuzemoment waarin een teamleider de grens van een medewerker wil respecteren en tegelijk verantwoordelijk is voor de gevolgen voor team en werk. Die spanning is herkenbaar en leent zich voor een praktijksimulatie waarin meerdere aanpakken verdedigbaar zijn en de kwaliteit van de afweging centraal staat."
}
```

## Feitelijke metingen

| Meting | Waarde |
| --- | --- |
| verwachte outcome (vooraf vastgelegd) | `ready` |
| werkelijke outcome | `ready` |
| komt overeen | ja |
| trainingsrichtingen | 2 |
| open_choice | 2 |
| prescribed_action | 0 |
| decisionRelevantGaps | 2 |
| sourceCandidates | 2 |
| epistemicFlags | 0 |
| alle sourceRefs geldig | ja |
| invalid-output | nee |
| invariantfouten | geen |

**Signaleringen (geen oordeel):**

- Hoofdtest: de richting over de privégrens is open_choice met een route-neutraal leerdoel (zie de richtingtabel).
- Ook het algemene `proposedLearningGoal` is route-neutraal: "bepalen hoe hij de privacygrens … respecteert en tegelijk verantwoordelijkheid neemt …, en deze keuze professioneel onderbouwen".
- Vergeleken met V2: in V2 schreef het leerdoel van `grens-respecteren-en-werk-bespreken` "de … privégrens erkennen en het gesprek daarna gericht houden op het werkgedrag" voor; die volgorde komt in V2.1 niet meer voor. V2 had 3 richtingen, V2.1 heeft er 2; de V2-richting "Signalen benoemen en aankaarten" (de V2-review noemde die een verschuiving naar een vervolgfase) komt niet terug.
- Geen diagnose, arbeidsrechtelijke conclusie of teamreacties. 0 flags. sourceCandidates 2 (in de V2-baseline altijd 3), waaronder "Privacyregels rond gegevens over medewerkers" (intern).

## Beoordeling per trainingsrichting

### `grens-en-verantwoordelijkheid` · `open_choice`

- Dit is de richting van de BP-002-regressie (in V2: `grens-respecteren-en-werk-bespreken`, zelfde sourceRefs S2, S3).
- routePolicy ↔ focus: open_choice; "moet bepalen hoe hij met die grens omgaat en tegelijk iets doet met de gevolgen voor het team en het werk".
- routePolicy ↔ leerdoel: "kan afwegen hoe hij de … grens … respecteert en tegelijk verantwoordelijkheid houdt voor het werk en het team, en kan zijn gekozen aanpak onderbouwen in het licht van de situatie en de mogelijke consequenties". Route-neutraal: geen "eerst erkennen, daarna werk"; beide belangen moeten worden meegenomen.
- Kunstmatige ambiguïteit: nee; de spanning staat in S3.
- Nieuwe scenariofeiten of kaders: geen diagnose, arbeidsrecht of teamreacties. sourceRefs S2, S3 (bestaan).

Te beoordelen: past routePolicy bij de focus? Past het leerdoel bij dezelfde routePolicy? Bevat een open_choice-leerdoel
toch een voorgeschreven route of volgorde? Maakt prescribed_action terecht één handeling leidend? Is er kunstmatige
ambiguïteit toegevoegd? Zijn er nieuwe scenariofeiten of kaders?

### `bespreken-werkprestaties` · `open_choice`

- routePolicy ↔ focus: open_choice; "moet kiezen hoe hij het gesprek over het werk voert zonder de aangegeven privégrens te passeren".
- routePolicy ↔ leerdoel: "bepalen hoe hij concrete observaties … bespreekbaar maakt … en kan verantwoorden hoe zijn aanpak recht doet aan zowel de medewerker als de belangen van het werk"; geen route voorgeschreven.
- Overlap: deze richting ligt inhoudelijk dicht bij de eerste richting (beide gaan over het werkgesprek binnen de grens).
- Nieuwe scenariofeiten of kaders: geen. sourceRefs S1, S2 (bestaan).

Te beoordelen: past routePolicy bij de focus? Past het leerdoel bij dezelfde routePolicy? Bevat een open_choice-leerdoel
toch een voorgeschreven route of volgorde? Maakt prescribed_action terecht één handeling leidend? Is er kunstmatige
ambiguïteit toegevoegd? Zijn er nieuwe scenariofeiten of kaders?

## Menselijke evaluatie

**Status: `PASS`**

Menselijke review van de baseline training-analysis/v2.1.

- De primaire regressie (BP-002: route-prescriptive learning goal) is opgelost.
- `grens-en-verantwoordelijkheid` is `open_choice`.
- Het route-prescriptive V2-learningGoal ("de grens erkennen en het gesprek daarna gericht houden op het werkgedrag")
  is verdwenen.
- Het nieuwe learningGoal beschrijft beide professionele belangen en de afweging.
- De uitvoering blijft open.
- Geen nieuwe diagnose, arbeidsrechtelijke conclusie of teamreacties.
