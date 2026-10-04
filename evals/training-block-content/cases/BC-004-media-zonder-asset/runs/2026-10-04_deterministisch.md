# BC-004 · 2026-10-04 · deterministisch (zonder provider)

Uitgevoerd via de Server Action `regenerateBlockContent` op dezelfde dev-server **met
`CERTUM_BLOCK_CONTENT_PROVIDER=claude`**, vóór de betaalde aanroepen. Doelblok `blok-1` uit `BLP-001-MEDIA`.

## Bewijs: 0 providercreaties, 0 AI-aanroepen

- Flowlog `certum.block_content`: `{"event":"certum.block_content","version":"block-content/v1","operation":"regenerate","outcome":"success","blocks":1,"generated":0,"deterministic":1}`.
- Geen `certum.block_content_generation`-regel voor dit blok: er is geen provider aangemaakt of aangeroepen.
- Doorlooptijd van de request: 91 ms (inclusief HTTP).
- Unittests in `content-flow.test.ts` bewijzen met spies dat `getService` niet wordt aangeroepen.

## Resultaat

Video → `needs_asset`, `assetType: video` (trusted), beschrijving uit het Block Plan, geen URL of bestandsnaam.

```json
{
  "version": "block-content/v1",
  "plannedBlockId": "blok-1",
  "sequence": 1,
  "certumPhase": "context",
  "catalogBlockId": "certum.bco.video",
  "routePolicy": "open_choice",
  "reviewStatus": "draft",
  "accreditation": {
    "learningGoalContribution": "De situatie laten zien tot direct na het moment waarop de medewerker zijn grens aangeeft.",
    "assessmentRole": "none",
    "estimatedMinutes": null,
    "sourceNeedRefs": [],
    "workform": "Video"
  },
  "body": {
    "status": "needs_asset",
    "assetRequirement": {
      "why": "Een korte video maakt het gesprek en de toon zichtbaar voordat de deelnemer zelf handelt.",
      "desiredContent": "Korte opname van het gesprek tot en met de uitgesproken grens; nog geen bestaande video beschikbaar.",
      "captionIntent": null,
      "assetType": "video"
    }
  }
}
```

## Menselijke evaluatie

**Status: `PASS`** (beoordeeld 2026-10-04)

Media zonder asset → `needs_asset` met trusted assettype, zonder URL of bestand en zonder AI-call (0 providercreaties).
