# BC-005 · 2026-10-04 · deterministisch (zonder provider)

Uitgevoerd via de Server Action `regenerateBlockContent` op dezelfde dev-server **met
`CERTUM_BLOCK_CONTENT_PROVIDER=claude`**, vóór de betaalde aanroepen. Doelblok `blok-5` uit `BLP-002-UNPROVEN-FEEDBACK`.

## Bewijs: 0 providercreaties, 0 AI-aanroepen

- Flowlog `certum.block_content`: `{"event":"certum.block_content","version":"block-content/v1","operation":"regenerate","outcome":"success","blocks":1,"generated":0,"deterministic":1}`.
- Geen `certum.block_content_generation`-regel voor dit blok: er is geen provider aangemaakt of aangeroepen.
- Doorlooptijd van de request: 89 ms (inclusief HTTP).
- Unittests in `content-flow.test.ts` bewijzen met spies dat `getService` niet wordt aangeroepen.

## Resultaat

AI Feedback zonder eerder vraagblok → `blocked_by_capability` met `ai_context_buiten_vraagblokken` en de niet-aantoonbare blokken blok-2, blok-3, blok-4.

```json
{
  "version": "block-content/v1",
  "plannedBlockId": "blok-5",
  "sequence": 5,
  "certumPhase": "feedback",
  "catalogBlockId": "certum.bco.ai-feedback",
  "routePolicy": "prescribed_action",
  "reviewStatus": "draft",
  "accreditation": {
    "learningGoalContribution": "Feedback geven op uitvoering van de handelingslijn, de verantwoording tegenover de collega en de omgang met diens zorg.",
    "assessmentRole": "formative",
    "estimatedMinutes": null,
    "sourceNeedRefs": [],
    "workform": "AI Feedback"
  },
  "body": {
    "status": "blocked_by_capability",
    "missingCapability": "ai_context_buiten_vraagblokken: Welke context AI Feedback precies krijgt buiten antwoorden op eerdere vraagblokken.",
    "why": "AI Feedback ontvangt aantoonbaar alleen antwoorden op eerdere vraagblokken; vóór dit blok staat er geen. Eerdere invoer die niet aantoonbaar als context beschikbaar is: blok-2, blok-3, blok-4."
  }
}
```

## Menselijke evaluatie

**Status: `PENDING_REVIEW`**

Nog niet beoordeeld. Feitelijk: expliciete status, alleen trusted informatie, geen verzonnen inhoud, URL of bron, en
geen AI-aanroep.
