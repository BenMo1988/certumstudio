# CA-009 · Run 2026-10-03 · training-analysis/v2.1 · claude-opus-5-5 · medium

Baseline-run van training-analysis/v2.1 (Analysis Contract V2.1), uitgevoerd via de Server Action `analyzeInput` op de
dev-server (`CERTUM_ANALYSIS_PROVIDER=claude`, `CERTUM_BLUEPRINT_PROVIDER=mock`), met precies één poging.
Configuratie bevroren op commit `b0ae631`.

**Status: `FAIL`** (menselijk beoordeeld; zie "Menselijke evaluatie").

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
| inputLength | 396 |
| segmentCount | 3 |
| durationMs | 23736 |
| outcome | success |
| analysisOutcome | ready |
| openChoiceDirections | 0 |
| prescribedActionDirections | 1 |
| epistemicFlags | 0 |

Tokengebruik en kosten werden voor deze run niet geregistreerd. De Analysis-configuratie heeft `maxRetries: 2`
(SDK-transportretries); er trad geen fout op en de duur van de server en de client ligt binnen ~170 ms van elkaar.

## Bronsegmenten

Zoals server-side gesegmenteerd (`source-segments/v1`) en aan de provider aangeleverd.

- `S1` Tijdens een inspectieronde ziet een facilitair medewerker dat een nooduitgang geblokkeerd is door gestapelde dozen.
- `S2` In deze werksituatie geldt de vaste instructie dat een geblokkeerde nooduitgang direct wordt vrijgemaakt en dat dit daarna wordt gemeld aan de verantwoordelijke.
- `S3` Er hoeft niet te worden afgewogen of dit gebeurt: de medewerker moet de nooduitgang nu vrijmaken en het daarna melden.

## Output

Gebruikerszichtbare analyse (`ready`).

**Samenvatting**
Een facilitair medewerker ziet tijdens een inspectieronde dat een nooduitgang geblokkeerd is door gestapelde dozen. Volgens de input geldt in deze werksituatie een vaste instructie: de nooduitgang direct vrijmaken en dit daarna melden aan de verantwoordelijke. Volgens de input hoeft niet te worden afgewogen óf dit gebeurt.

**Professioneel dilemma**
De casus bevat geen open dilemma. Het professionele moment is dat de medewerker de vaste instructie direct en volledig toepast: de nooduitgang meteen vrijmaken en dit daarna melden aan de verantwoordelijke. Het leerpunt zit dus in correcte uitvoering, niet in een afweging.

**Voorgesteld leerdoel**
De deelnemer kan bij het aantreffen van een geblokkeerde nooduitgang tijdens een inspectieronde de vaste instructie uitvoeren door de nooduitgang direct vrij te maken en dit daarna te melden aan de verantwoordelijke.

**Doelgroep**
Facilitair medewerkers die inspectierondes uitvoeren.

**Beslisrelevante ontbrekende informatie (decisionRelevantGaps)**
- Is het de bedoeling dat de training alleen correcte uitvoering van de instructie oefent, of wil de ontwikkelaar ook situaties onderzoeken waarin uitvoering in de praktijk lastig is?
  *geschiktheid:* Bij alleen correcte uitvoering blijft de casus een korte instructietraining met één voorgeschreven handelingslijn en beperkte simulatiediepte. Als er een spanning in de uitvoering bestaat, moet die in de input worden toegevoegd. Dat kan leiden tot een andere richting of een ander leerdoel.

**Abstraction notes**
Geen.

**Rationale**
De input beschrijft een concrete werksituatie waarin één handelingslijn uitdrukkelijk leidend is. Daarom is één richting met een voorgeschreven handelingslijn passend. Omdat er geen afweging in zit, is de leerwaarde beperkt tot correcte en tijdige uitvoering van de instructie.

**Trainingsrichtingen**

1. **Vaste instructie bij een geblokkeerde nooduitgang** (`instructie-geblokkeerde-nooduitgang`)
   *routePolicy:* `prescribed_action`
   *Focus:* De medewerker treft tijdens een inspectieronde een geblokkeerde nooduitgang aan. Volgens de geldende instructie wordt deze direct vrijgemaakt en wordt dit daarna gemeld aan de verantwoordelijke. Er is geen vrije keuze tussen routes. De nadruk ligt op tijdige en volledige uitvoering van beide stappen in de voorgeschreven volgorde.
   *Leerdoel:* De deelnemer kan bij het aantreffen van een geblokkeerde nooduitgang de nooduitgang direct vrijmaken en dit daarna melden aan de verantwoordelijke, conform de vaste instructie.
   *sourceRefs:* `S1`, `S2`, `S3`

## Interne evaluatie-output: sourceCandidates

Niet zichtbaar in de UI. Kandidaten voor de latere Bron-fase; **geen gevalideerde bronnen en geen vaststelling** dat een kader van toepassing is.

- **Interne veiligheids- of ontruimingsinstructies over het vrijhouden van nooduitgangen**: De input verwijst naar een vaste instructie. Bij de Bron-fase kan worden nagegaan welk document of voorschrift deze instructie onderbouwt.

## Volledige output (JSON)

```json
{
  "outcome": "ready",
  "summary": "Een facilitair medewerker ziet tijdens een inspectieronde dat een nooduitgang geblokkeerd is door gestapelde dozen. Volgens de input geldt in deze werksituatie een vaste instructie: de nooduitgang direct vrijmaken en dit daarna melden aan de verantwoordelijke. Volgens de input hoeft niet te worden afgewogen óf dit gebeurt.",
  "professionalDilemma": "De casus bevat geen open dilemma. Het professionele moment is dat de medewerker de vaste instructie direct en volledig toepast: de nooduitgang meteen vrijmaken en dit daarna melden aan de verantwoordelijke. Het leerpunt zit dus in correcte uitvoering, niet in een afweging.",
  "proposedLearningGoal": "De deelnemer kan bij het aantreffen van een geblokkeerde nooduitgang tijdens een inspectieronde de vaste instructie uitvoeren door de nooduitgang direct vrij te maken en dit daarna te melden aan de verantwoordelijke.",
  "targetAudience": "Facilitair medewerkers die inspectierondes uitvoeren.",
  "trainingDirections": [
    {
      "id": "instructie-geblokkeerde-nooduitgang",
      "title": "Vaste instructie bij een geblokkeerde nooduitgang",
      "focus": "De medewerker treft tijdens een inspectieronde een geblokkeerde nooduitgang aan. Volgens de geldende instructie wordt deze direct vrijgemaakt en wordt dit daarna gemeld aan de verantwoordelijke. Er is geen vrije keuze tussen routes. De nadruk ligt op tijdige en volledige uitvoering van beide stappen in de voorgeschreven volgorde.",
      "proposedLearningGoal": "De deelnemer kan bij het aantreffen van een geblokkeerde nooduitgang de nooduitgang direct vrijmaken en dit daarna melden aan de verantwoordelijke, conform de vaste instructie.",
      "sourceRefs": [
        "S1",
        "S2",
        "S3"
      ],
      "routePolicy": "prescribed_action"
    }
  ],
  "decisionRelevantGaps": [
    {
      "question": "Is het de bedoeling dat de training alleen correcte uitvoering van de instructie oefent, of wil de ontwikkelaar ook situaties onderzoeken waarin uitvoering in de praktijk lastig is?",
      "affects": "geschiktheid",
      "howItChangesTheDecision": "Bij alleen correcte uitvoering blijft de casus een korte instructietraining met één voorgeschreven handelingslijn en beperkte simulatiediepte. Als er een spanning in de uitvoering bestaat, moet die in de input worden toegevoegd. Dat kan leiden tot een andere richting of een ander leerdoel."
    }
  ],
  "abstractionNotes": [],
  "sourceCandidates": [
    {
      "term": "Interne veiligheids- of ontruimingsinstructies over het vrijhouden van nooduitgangen",
      "whyPossiblyRelevant": "De input verwijst naar een vaste instructie. Bij de Bron-fase kan worden nagegaan welk document of voorschrift deze instructie onderbouwt."
    }
  ],
  "rationale": "De input beschrijft een concrete werksituatie waarin één handelingslijn uitdrukkelijk leidend is. Daarom is één richting met een voorgeschreven handelingslijn passend. Omdat er geen afweging in zit, is de leerwaarde beperkt tot correcte en tijdige uitvoering van de instructie."
}
```

## Feitelijke metingen

| Meting | Waarde |
| --- | --- |
| verwachte outcome (vooraf vastgelegd) | `ready` |
| werkelijke outcome | `ready` |
| komt overeen | ja |
| trainingsrichtingen | 1 |
| open_choice | 0 |
| prescribed_action | 1 |
| decisionRelevantGaps | 1 |
| sourceCandidates | 1 |
| epistemicFlags | 0 |
| alle sourceRefs geldig | ja |
| invalid-output | nee |
| invariantfouten | geen |

**Signaleringen (geen oordeel):**

- Eén richting, prescribed_action, met de concrete handelingslijn uit de input; geen kunstmatige open keuze en geen tweede richting.
- Het `professionalDilemma` zegt letterlijk "De casus bevat geen open dilemma … Het leerpunt zit dus in correcte uitvoering, niet in een afweging." De uitkomst is toch `ready` (zoals vooraf verwacht). Spanning met de v2-regel dat `unsuitable` past bij input zonder betekenisvol dilemma of keuzemoment; de rationale noemt de leerwaarde "beperkt tot correcte en tijdige uitvoering".
- De enige decisionRelevantGap vraagt of de training alleen correcte uitvoering oefent (raakt: geschiktheid).
- De samenvatting gebruikt tweemaal "Volgens de input". 0 flags; sourceCandidates 1 (interne veiligheids- of ontruimingsinstructies, als te onderzoeken bron, niet als vaststelling).

## Beoordeling per trainingsrichting

### `instructie-geblokkeerde-nooduitgang` · `prescribed_action`

- routePolicy ↔ focus: prescribed_action; "Er is geen vrije keuze tussen routes. De nadruk ligt op tijdige en volledige uitvoering van beide stappen in de voorgeschreven volgorde."
- routePolicy ↔ leerdoel: "de nooduitgang direct vrijmaken en dit daarna melden aan de verantwoordelijke, conform de vaste instructie": de concrete handelingslijn uit S2 en S3.
- Kunstmatige ambiguïteit: nee; geen open_choice-richting en geen keuze tussen gelijkwaardige routes.
- Nieuwe scenariofeiten of kaders: geen nieuwe wet, richtlijn of veiligheidsregel; "conform de vaste instructie" verwijst naar de instructie uit de input. sourceRefs S1, S2, S3 (bestaan).

Te beoordelen: past routePolicy bij de focus? Past het leerdoel bij dezelfde routePolicy? Bevat een open_choice-leerdoel
toch een voorgeschreven route of volgorde? Maakt prescribed_action terecht één handeling leidend? Is er kunstmatige
ambiguïteit toegevoegd? Zijn er nieuwe scenariofeiten of kaders?

## Menselijke evaluatie

**Status: `FAIL`**

Menselijke review van de baseline training-analysis/v2.1.

### Correct

- `routePolicy: prescribed_action` past bij de vastgelegde instructie.
- focus en learningGoal zijn daarmee consistent.

### Failreden

- De input bevat expliciet geen betekenisvol professioneel dilemma of keuzemoment.
- De analyse benoemt zelf dat het leerpunt correcte uitvoering is en dat de leerwaarde beperkt is.
- Toch wordt de uitkomst `ready`.
- `prescribed_action` mag de bestaande suitability-eis niet omzeilen.

De FAIL zit niet in de routePolicy-classificatie, maar op de laag van suitability.
