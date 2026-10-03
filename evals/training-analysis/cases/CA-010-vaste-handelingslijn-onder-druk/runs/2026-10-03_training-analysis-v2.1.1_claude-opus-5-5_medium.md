# CA-010 · Run 2026-10-03 · training-analysis/v2.1.1 · claude-opus-5-5 · medium

Bevestigingsrun van `training-analysis/v2.1.1` (contract `analysis-contract/v2.1`), uitgevoerd via de Server Action
`analyzeInput` op de dev-server (`CERTUM_ANALYSIS_PROVIDER=claude`, `CERTUM_ANALYSIS_MAX_RETRIES=0`,
`CERTUM_BLUEPRINT_PROVIDER=mock`), met precies één poging. Configuratie bevroren op commit `e870e26`.

**Status: `PENDING_REVIEW`** (nog geen menselijke beoordeling; geen PASS/FAIL).

## Configuratie en metadata

Overgenomen uit de metadata-logregels `certum.analysis` en `certum.analysis_result` van deze run.

| Veld | Waarde |
| --- | --- |
| rundatum | 2026-10-03 |
| provider | claude |
| model | claude-opus-5-5 |
| effort | medium |
| maxRetries | 0 (eval-override) |
| promptVersion | training-analysis/v2.1.1 |
| contractVersion | analysis-contract/v2.1 |
| preflightVersion | privacy-preflight/v1 |
| preflightStatus | safe |
| preflightMiss | false |
| inputKind | casus |
| inputLength | 399 |
| segmentCount | 3 |
| durationMs | 23464 |
| outcome | success |
| analysisOutcome | ready |
| openChoiceDirections | 0 |
| prescribedActionDirections | 2 |
| epistemicFlags | 0 |

Tokengebruik en kosten werden voor deze run niet geregistreerd.

## Bronsegmenten

Zoals server-side gesegmenteerd (`source-segments/v1`) en aan de provider aangeleverd.

- `S1` Tijdens een lopende groepsactiviteit merkt een begeleider dat een nooduitgang geblokkeerd is door gestapelde dozen.
- `S2` Een collega vraagt de dozen pas na afloop weg te halen, omdat het onderbreken van de activiteit onrust geeft in de groep.
- `S3` In deze werksituatie geldt de vaste instructie dat een geblokkeerde nooduitgang direct wordt vrijgemaakt en dat dit daarna wordt gemeld aan de verantwoordelijke.

## Output

Gebruikerszichtbare analyse (`ready`).

**Samenvatting**
Tijdens een lopende groepsactiviteit ziet een begeleider dat een nooduitgang geblokkeerd is door gestapelde dozen. Een collega vraagt de dozen pas na afloop weg te halen, omdat het onderbreken van de activiteit volgens de collega onrust geeft in de groep. Er geldt een vaste instructie dat een geblokkeerde nooduitgang direct wordt vrijgemaakt en dat dit daarna wordt gemeld aan de verantwoordelijke.

**Professioneel dilemma**
De begeleider staat voor de vraag of hij de vaste instructie om de nooduitgang direct vrij te maken uitvoert, terwijl een collega vraagt hiermee te wachten om onrust in de groep te voorkomen.

**Voorgesteld leerdoel**
De deelnemer kan een geblokkeerde nooduitgang conform de vaste instructie direct vrijmaken en dit daarna melden aan de verantwoordelijke, ook wanneer een collega vraagt te wachten, en deze keuze helder tegenover de collega verantwoorden.

**Doelgroep**
Begeleiders die groepsactiviteiten begeleiden in een werksituatie waarin vaste veiligheidsinstructies gelden.

**Beslisrelevante ontbrekende informatie (decisionRelevantGaps)**
- In welke sector of setting vindt de groepsactiviteit plaats, bijvoorbeeld jeugdhulp, onderwijs of dagbesteding?
  *doelgroep:* Een specifieke setting maakt het mogelijk de doelgroep concreter af te bakenen dan de algemene omschrijving van begeleiders van groepsactiviteiten.

**Rationale**
De casus bevat een concreet keuzemoment met professionele spanning tussen het verzoek van een collega en een vaste instructie. Omdat de input zelf aangeeft dat direct vrijmaken en daarna melden de geldende handelingslijn is, zijn de trainingsrichtingen als voorgeschreven handelen geclassificeerd.

**Trainingsrichtingen**

1. **Vaste instructie uitvoeren bij tegengesteld verzoek** (`instructie-volgen-ondanks-verzoek`)
   *routePolicy:* `prescribed_action`
   *Focus:* De begeleider ontvangt van een collega het verzoek om te wachten met het vrijmaken van de geblokkeerde nooduitgang, terwijl de vaste instructie voorschrijft dat dit direct gebeurt en daarna wordt gemeld. De richting oefent het vasthouden aan deze handelingslijn en het verantwoorden daarvan tegenover de collega.
   *Leerdoel:* De deelnemer kan de nooduitgang direct vrijmaken en dit daarna melden aan de verantwoordelijke, en kan aan de collega uitleggen waarom het verzoek om te wachten niet wordt gevolgd.
   *sourceRefs:* `S1`, `S2`, `S3`
2. **Direct handelen met aandacht voor de groep** (`uitvoering-met-oog-voor-groep`)
   *routePolicy:* `prescribed_action`
   *Focus:* De instructie schrijft direct vrijmaken voor, terwijl de collega aangeeft dat het onderbreken van de activiteit onrust geeft. De richting oefent hoe de begeleider de voorgeschreven handeling uitvoert terwijl de groepsactiviteit gaande is, zonder de handeling uit te stellen.
   *Leerdoel:* De deelnemer kan de geblokkeerde nooduitgang tijdens een lopende groepsactiviteit direct vrijmaken en daarna melden, en daarbij zijn uitvoering zo inrichten dat hij rekening houdt met de door de collega genoemde zorg over onrust in de groep.
   *sourceRefs:* `S2`, `S3`

## Interne evaluatie-output: sourceCandidates

Niet zichtbaar in de UI. Kandidaten voor de latere Bron-fase; **geen gevalideerde bronnen en geen vaststelling** dat een kader van toepassing is.

- **Brandveiligheids- en ontruimingsvoorschriften**: De casus gaat over een geblokkeerde nooduitgang, waarvoor mogelijk algemene voorschriften over vrije vluchtwegen gelden die de vaste instructie onderbouwen.
- **Interne veiligheidsinstructies en meldprocedure van de organisatie**: De input noemt een vaste instructie met een meldstap aan de verantwoordelijke; de exacte inhoud en meldroute kunnen later als bron dienen.

## Volledige output (JSON)

```json
{
  "outcome": "ready",
  "summary": "Tijdens een lopende groepsactiviteit ziet een begeleider dat een nooduitgang geblokkeerd is door gestapelde dozen. Een collega vraagt de dozen pas na afloop weg te halen, omdat het onderbreken van de activiteit volgens de collega onrust geeft in de groep. Er geldt een vaste instructie dat een geblokkeerde nooduitgang direct wordt vrijgemaakt en dat dit daarna wordt gemeld aan de verantwoordelijke.",
  "professionalDilemma": "De begeleider staat voor de vraag of hij de vaste instructie om de nooduitgang direct vrij te maken uitvoert, terwijl een collega vraagt hiermee te wachten om onrust in de groep te voorkomen.",
  "proposedLearningGoal": "De deelnemer kan een geblokkeerde nooduitgang conform de vaste instructie direct vrijmaken en dit daarna melden aan de verantwoordelijke, ook wanneer een collega vraagt te wachten, en deze keuze helder tegenover de collega verantwoorden.",
  "targetAudience": "Begeleiders die groepsactiviteiten begeleiden in een werksituatie waarin vaste veiligheidsinstructies gelden.",
  "trainingDirections": [
    {
      "id": "instructie-volgen-ondanks-verzoek",
      "title": "Vaste instructie uitvoeren bij tegengesteld verzoek",
      "focus": "De begeleider ontvangt van een collega het verzoek om te wachten met het vrijmaken van de geblokkeerde nooduitgang, terwijl de vaste instructie voorschrijft dat dit direct gebeurt en daarna wordt gemeld. De richting oefent het vasthouden aan deze handelingslijn en het verantwoorden daarvan tegenover de collega.",
      "proposedLearningGoal": "De deelnemer kan de nooduitgang direct vrijmaken en dit daarna melden aan de verantwoordelijke, en kan aan de collega uitleggen waarom het verzoek om te wachten niet wordt gevolgd.",
      "sourceRefs": [
        "S1",
        "S2",
        "S3"
      ],
      "routePolicy": "prescribed_action"
    },
    {
      "id": "uitvoering-met-oog-voor-groep",
      "title": "Direct handelen met aandacht voor de groep",
      "focus": "De instructie schrijft direct vrijmaken voor, terwijl de collega aangeeft dat het onderbreken van de activiteit onrust geeft. De richting oefent hoe de begeleider de voorgeschreven handeling uitvoert terwijl de groepsactiviteit gaande is, zonder de handeling uit te stellen.",
      "proposedLearningGoal": "De deelnemer kan de geblokkeerde nooduitgang tijdens een lopende groepsactiviteit direct vrijmaken en daarna melden, en daarbij zijn uitvoering zo inrichten dat hij rekening houdt met de door de collega genoemde zorg over onrust in de groep.",
      "sourceRefs": [
        "S2",
        "S3"
      ],
      "routePolicy": "prescribed_action"
    }
  ],
  "decisionRelevantGaps": [
    {
      "question": "In welke sector of setting vindt de groepsactiviteit plaats, bijvoorbeeld jeugdhulp, onderwijs of dagbesteding?",
      "affects": "doelgroep",
      "howItChangesTheDecision": "Een specifieke setting maakt het mogelijk de doelgroep concreter af te bakenen dan de algemene omschrijving van begeleiders van groepsactiviteiten."
    }
  ],
  "abstractionNotes": [],
  "sourceCandidates": [
    {
      "term": "Brandveiligheids- en ontruimingsvoorschriften",
      "whyPossiblyRelevant": "De casus gaat over een geblokkeerde nooduitgang, waarvoor mogelijk algemene voorschriften over vrije vluchtwegen gelden die de vaste instructie onderbouwen."
    },
    {
      "term": "Interne veiligheidsinstructies en meldprocedure van de organisatie",
      "whyPossiblyRelevant": "De input noemt een vaste instructie met een meldstap aan de verantwoordelijke; de exacte inhoud en meldroute kunnen later als bron dienen."
    }
  ],
  "rationale": "De casus bevat een concreet keuzemoment met professionele spanning tussen het verzoek van een collega en een vaste instructie. Omdat de input zelf aangeeft dat direct vrijmaken en daarna melden de geldende handelingslijn is, zijn de trainingsrichtingen als voorgeschreven handelen geclassificeerd."
}
```

## Feitelijke metingen

| Meting | Waarde |
| --- | --- |
| verwachte outcome (vooraf vastgelegd, v2.1.1) | `ready` |
| werkelijke outcome | `ready` |
| komt overeen | ja |
| trainingsrichtingen | 2 |
| open_choice | 0 |
| prescribed_action | 2 |
| epistemicFlags | 0 |
| alle sourceRefs geldig | ja |
| invalid-output | nee |
| invariantfouten | geen |

**Signaleringen (geen oordeel):**

- Uitkomst `ready`, zoals vooraf verwacht.
- Beide richtingen zijn `prescribed_action`; er is geen `open_choice`-richting en de instructie wordt nergens als een van meerdere gelijkwaardige routes behandeld.
- De focus van beide richtingen benoemt de spanning (het verzoek van de collega om te wachten, de zorg over onrust in de groep) tegenover de instructie.
- De leerdoelen benoemen de voorgeschreven handelingslijn (direct vrijmaken, daarna melden). Richting 2 laat binnen die lijn ruimte voor de uitvoering ("rekening houdt met de … zorg over onrust"); dat past bij "prescribed_action betekent niet dat iedere formulering of tussenstap vastligt".
- Het `professionalDilemma` is geformuleerd als "de vraag of hij de vaste instructie … uitvoert" en het algemene leerdoel spreekt van "deze keuze … verantwoorden". De richtingen zelf laten het uitvoeren van de instructie niet open.
- De twee richtingen overlappen deels (beide: direct vrijmaken en melden; richting 1 legt de nadruk op uitleg aan de collega, richting 2 op de uitvoering met oog voor de groep).
- sourceCandidates (intern, niet in de UI): "Brandveiligheids- en ontruimingsvoorschriften" en "Interne veiligheidsinstructies en meldprocedure", als te onderzoeken bron en niet als vaststelling. 0 flags in gebruikersgerichte velden.
- Geen nieuwe scenariofeiten; de samenvatting schrijft de onrust toe aan de collega ("volgens de collega"). sourceRefs geldig.

## Menselijke evaluatie

**Status: `PENDING_REVIEW`**

Nog niet beoordeeld.
