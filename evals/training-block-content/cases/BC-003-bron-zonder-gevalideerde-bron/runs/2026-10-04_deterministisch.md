# BC-003 · 2026-10-04 · deterministisch (zonder provider)

Uitgevoerd via de Server Action `regenerateBlockContent` op dezelfde dev-server **met
`CERTUM_BLOCK_CONTENT_PROVIDER=claude`**, vóór de betaalde aanroepen. Doelblok `blok-5` uit `BLP-001`.

## Bewijs: 0 providercreaties, 0 AI-aanroepen

- Flowlog `certum.block_content`: `{"event":"certum.block_content","version":"block-content/v1","operation":"regenerate","outcome":"success","blocks":1,"generated":0,"deterministic":1}`.
- Geen `certum.block_content_generation`-regel voor dit blok: er is geen provider aangemaakt of aangeroepen.
- Doorlooptijd van de request: 128 ms (inclusief HTTP).
- Unittests in `content-flow.test.ts` bewijzen met spies dat `getService` niet wordt aangeroepen.

## Resultaat

Bron → `needs_source` met SN1 en SN2 en de kennisvragen letterlijk uit de Blueprint; geen kennisinhoud.

```json
{
  "version": "block-content/v1",
  "plannedBlockId": "blok-5",
  "sequence": 5,
  "certumPhase": "bron",
  "catalogBlockId": "certum.bco.tekst",
  "routePolicy": "open_choice",
  "reviewStatus": "draft",
  "accreditation": {
    "learningGoalContribution": "De deelnemer legt zijn eigen aanpak naast gevalideerde kennis over de handelingsruimte van een leidinggevende rond privéomstandigheden en over methodische principes voor het bespreken van werkafspraken.",
    "assessmentRole": "none",
    "estimatedMinutes": null,
    "sourceNeedRefs": [
      "SN1",
      "SN2"
    ],
    "workform": "Tekst"
  },
  "body": {
    "status": "needs_source",
    "whatToValidate": "SN1: Welke handelingsruimte en verantwoordelijkheden heeft een leidinggevende wanneer een medewerker privéomstandigheden noemt maar daar niet over wil praten, terwijl het functioneren onder druk staat, en waar liggen de grenzen van wat een leidinggevende mag vragen of bespreken? SN2: Welke gesprekstechnieken of methodische principes ondersteunen een leidinggevende bij het bespreekbaar maken van werkafspraken en gevolgen voor het team zonder een aangegeven persoonlijke grens te overschrijden?",
    "generatableAfterValidation": "Na validatie: De deelnemer legt zijn eigen aanpak naast gevalideerde kennis over de handelingsruimte van een leidinggevende rond privéomstandigheden en over methodische principes voor het bespreken van werkafspraken."
  }
}
```

## Menselijke evaluatie

**Status: `PASS`** (beoordeeld 2026-10-04)

Bron zonder gevalideerde bron → `needs_source` met SN-refs, zonder kennisinhoud en zonder AI-call (0 providercreaties).
