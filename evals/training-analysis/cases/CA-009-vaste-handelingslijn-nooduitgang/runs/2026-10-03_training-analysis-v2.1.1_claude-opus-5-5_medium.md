# CA-009 · Run 2026-10-03 · training-analysis/v2.1.1 · claude-opus-5-5 · medium

Bevestigingsrun van `training-analysis/v2.1.1` (contract `analysis-contract/v2.1`), uitgevoerd via de Server Action
`analyzeInput` op de dev-server (`CERTUM_ANALYSIS_PROVIDER=claude`, `CERTUM_ANALYSIS_MAX_RETRIES=0`,
`CERTUM_BLUEPRINT_PROVIDER=mock`), met precies één poging. Configuratie bevroren op commit `e870e26`.

**Status: `PASS`** (menselijk beoordeeld; zie "Menselijke evaluatie").

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
| inputLength | 396 |
| segmentCount | 3 |
| durationMs | 11754 |
| outcome | success |
| analysisOutcome | unsuitable |
| openChoiceDirections | n.v.t. |
| prescribedActionDirections | n.v.t. |
| epistemicFlags | 0 |

Tokengebruik en kosten werden voor deze run niet geregistreerd.

## Bronsegmenten

Zoals server-side gesegmenteerd (`source-segments/v1`) en aan de provider aangeleverd.

- `S1` Tijdens een inspectieronde ziet een facilitair medewerker dat een nooduitgang geblokkeerd is door gestapelde dozen.
- `S2` In deze werksituatie geldt de vaste instructie dat een geblokkeerde nooduitgang direct wordt vrijgemaakt en dat dit daarna wordt gemeld aan de verantwoordelijke.
- `S3` Er hoeft niet te worden afgewogen of dit gebeurt: de medewerker moet de nooduitgang nu vrijmaken en het daarna melden.

## Output

Gebruikerszichtbare analyse (`unsuitable`).

**Samenvatting**
Een facilitair medewerker ziet tijdens een inspectieronde dat een nooduitgang geblokkeerd is door gestapelde dozen. Volgens de vaste instructie maakt de medewerker de nooduitgang direct vrij en meldt dit daarna aan de verantwoordelijke. De input stelt uitdrukkelijk dat er niets hoeft te worden afgewogen.

**Waarom ongeschikt**
De situatie beschrijft een routinematige uitvoering van een eenduidige instructie. De input zelf sluit een afweging uit. Er is geen spanning tussen belangen, geen onduidelijkheid in de beoordeling, geen belemmering bij de uitvoering en geen reactie van anderen die professioneel handelen vraagt. Er is dus wel één vaste handelingslijn, maar geen betekenisvol professioneel keuzemoment of uitvoeringsvraagstuk dat zich leent voor een praktijksimulatie.

**Wat de input geschikt zou maken**
- Beschrijf een concrete complicatie bij de uitvoering die professioneel handelen vraagt, bijvoorbeeld een situatie waarin het vrijmaken of melden niet vanzelf verloopt. Voeg zo'n complicatie alleen toe als die in de praktijk ook werkelijk speelt.
- Maak duidelijk of er een spanning bestaat tussen de instructie en andere belangen of verwachtingen in de werksituatie, zodat de medewerker iets moet beoordelen of verantwoorden.
- Geef aan wat het lastige moment voor de medewerker is, bijvoorbeeld bij het aanspreken van betrokkenen of bij het melden, als daar in de praktijk aarzeling of weerstand rond bestaat.

## Volledige output (JSON)

```json
{
  "outcome": "unsuitable",
  "summary": "Een facilitair medewerker ziet tijdens een inspectieronde dat een nooduitgang geblokkeerd is door gestapelde dozen. Volgens de vaste instructie maakt de medewerker de nooduitgang direct vrij en meldt dit daarna aan de verantwoordelijke. De input stelt uitdrukkelijk dat er niets hoeft te worden afgewogen.",
  "explanation": "De situatie beschrijft een routinematige uitvoering van een eenduidige instructie. De input zelf sluit een afweging uit. Er is geen spanning tussen belangen, geen onduidelijkheid in de beoordeling, geen belemmering bij de uitvoering en geen reactie van anderen die professioneel handelen vraagt. Er is dus wel één vaste handelingslijn, maar geen betekenisvol professioneel keuzemoment of uitvoeringsvraagstuk dat zich leent voor een praktijksimulatie.",
  "whatWouldMakeItSuitable": [
    "Beschrijf een concrete complicatie bij de uitvoering die professioneel handelen vraagt, bijvoorbeeld een situatie waarin het vrijmaken of melden niet vanzelf verloopt. Voeg zo'n complicatie alleen toe als die in de praktijk ook werkelijk speelt.",
    "Maak duidelijk of er een spanning bestaat tussen de instructie en andere belangen of verwachtingen in de werksituatie, zodat de medewerker iets moet beoordelen of verantwoorden.",
    "Geef aan wat het lastige moment voor de medewerker is, bijvoorbeeld bij het aanspreken van betrokkenen of bij het melden, als daar in de praktijk aarzeling of weerstand rond bestaat."
  ]
}
```

## Feitelijke metingen

| Meting | Waarde |
| --- | --- |
| verwachte outcome (vooraf vastgelegd, v2.1.1) | `unsuitable` |
| werkelijke outcome | `unsuitable` |
| komt overeen | ja |
| trainingsrichtingen | 0 |
| open_choice | 0 |
| prescribed_action | 0 |
| epistemicFlags | 0 |
| alle sourceRefs geldig | n.v.t. |
| invalid-output | nee |
| invariantfouten | geen |

**Signaleringen (geen oordeel):**

- Uitkomst `unsuitable`, zoals vooraf verwacht voor v2.1.1 (V2.1-baseline: `ready`, review `FAIL`).
- De uitleg noemt een "routinematige uitvoering van een eenduidige instructie" zonder spanning tussen belangen, onduidelijke beoordeling, belemmering bij de uitvoering of reactie van anderen: "wel één vaste handelingslijn, maar geen betekenisvol professioneel keuzemoment of uitvoeringsvraagstuk".
- Geen trainingsrichting, leerdoel of doelgroep (structureel uitgesloten bij `unsuitable`).
- whatWouldMakeItSuitable (3): aanwijzingen voor een complicatie, spanning of lastig moment, steeds voorwaardelijk geformuleerd ("alleen … als die in de praktijk ook werkelijk speelt"); geen verzonnen conflict als feit.
- Geen nieuwe scenariofeiten of kaders; 0 flags.

## Menselijke evaluatie

**Status: `PASS`**

Menselijke review van de bevestigingsrun training-analysis/v2.1.1.

- Een eenvoudige vaste procedure zonder betekenisvolle professionele spanning wordt `unsuitable`.
- `prescribed_action` omzeilt suitability dus niet.
- Geen nieuwe context of kaders toegevoegd.
