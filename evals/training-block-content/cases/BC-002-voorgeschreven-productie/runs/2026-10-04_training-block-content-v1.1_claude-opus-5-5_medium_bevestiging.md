# BC-002 · 2026-10-04 · training-block-content/v1.1 · claude-opus-5-5 · medium · bevestiging

Bevestigingsrun na de baseline-review (vorige run: [`FAIL`](2026-10-04_training-block-content-v1_claude-opus-5-5_medium.md)) en de correctie
`fix: tighten block content grounding` (`e0e2b23`, code freeze). Contract blijft `block-content/v1`; prompt
`training-block-content/v1.1`. Zelfde fixtures (Blueprint en Block Plan `BLP-002`, doelblok `blok-3`),
`claude-opus-5-5`, `medium`, `maxRetries: 0`, Block Content op `claude` en alle andere providers op mock. Precies één
aanroep, geen retry. Gerepareerd runscript (ruwe respons bewaard, tekstchunks opgelost).

**Status: `PENDING_REVIEW`**

## Metadata (uit `certum.block_content_generation`)

| Veld | Waarde |
| --- | --- |
| run-id | `BC-002/2026-10-04T11:09:59Z/bevestiging-v1.1` |
| commit | `e0e2b23` |
| provider | claude |
| model | claude-opus-5-5 |
| effort | medium |
| maxRetries | 0 |
| promptVersion | training-block-content/v1.1 |
| contentContractVersion | block-content/v1 |
| plannedBlockId | blok-3 |
| catalogBlockId | certum.bco.productie |
| certumPhase | actie |
| durationMs | 13077 |
| outcome | success |
| resultStatus | generated |
| estimatedMinutes | 8 |

## Trusted velden (server-side)

```json
{
  "version": "block-content/v1",
  "plannedBlockId": "blok-3",
  "sequence": 3,
  "certumPhase": "actie",
  "catalogBlockId": "certum.bco.productie",
  "routePolicy": "prescribed_action",
  "reviewStatus": "draft",
  "workform": "Productie",
  "catalogBlockIdInContent": "certum.bco.productie",
  "minimumWords": null
}
```

## Gegenereerde velden (Claude)

```json
{
  "accreditation": {
    "learningGoalContribution": "De deelnemer voert het tweede deel van de voorgeschreven handelingslijn uit door na het vrijmaken van de nooduitgang zelf een melding aan de verantwoordelijke te schrijven. Zo wordt zichtbaar welke informatie hij uit zichzelf in die melding opneemt.",
    "assessmentRole": "formative",
    "estimatedMinutes": 8,
    "sourceNeedRefs": []
  },
  "content": {
    "title": "Melding aan de verantwoordelijke",
    "productType": "anders",
    "instructions": "Je hebt de gestapelde dozen weggehaald en de nooduitgang is weer vrij. Volgens de vaste instructie meld je dit daarna aan de verantwoordelijke. Je weet wie dat is. Schrijf nu de melding zoals jij die in deze situatie aan de verantwoordelijke zou doen. Bepaal zelf welke informatie je opneemt en hoe je die formuleert. Schrijf de melding als een professioneel product dat je zo zou kunnen versturen of overhandigen.",
    "template": null
  }
}
```

## Volledig BlockContentResult

```json
{
  "version": "block-content/v1",
  "plannedBlockId": "blok-3",
  "sequence": 3,
  "certumPhase": "actie",
  "catalogBlockId": "certum.bco.productie",
  "routePolicy": "prescribed_action",
  "reviewStatus": "draft",
  "accreditation": {
    "workform": "Productie",
    "learningGoalContribution": "De deelnemer voert het tweede deel van de voorgeschreven handelingslijn uit door na het vrijmaken van de nooduitgang zelf een melding aan de verantwoordelijke te schrijven. Zo wordt zichtbaar welke informatie hij uit zichzelf in die melding opneemt.",
    "assessmentRole": "formative",
    "estimatedMinutes": 8,
    "sourceNeedRefs": []
  },
  "body": {
    "status": "generated",
    "content": {
      "catalogBlockId": "certum.bco.productie",
      "title": "Melding aan de verantwoordelijke",
      "productType": "anders",
      "instructions": "Je hebt de gestapelde dozen weggehaald en de nooduitgang is weer vrij. Volgens de vaste instructie meld je dit daarna aan de verantwoordelijke. Je weet wie dat is. Schrijf nu de melding zoals jij die in deze situatie aan de verantwoordelijke zou doen. Bepaal zelf welke informatie je opneemt en hoe je die formuleert. Schrijf de melding als een professioneel product dat je zo zou kunnen versturen of overhandigen.",
      "template": null,
      "minimumWords": null
    }
  }
}
```

## Verwachtingen van de bevestiging (feitelijke signalen, zonder oordeel)

| Vraag | Waarneming |
| --- | --- |
| Voorgeschreven handeling intact? | Ja. "Je hebt de gestapelde dozen weggehaald en de nooduitgang is weer vrij. Volgens de vaste instructie meld je dit daarna aan de verantwoordelijke." Geen open keuze of alternatieve route; `routePolicy: prescribed_action` (trusted). |
| Bruikbare productieopdracht? | Ja. Eén duidelijke opdracht: de melding schrijven "als een professioneel product dat je zo zou kunnen versturen of overhandigen"; de inhoud bepaalt de deelnemer zelf. |
| Claim dat de Productie later voor Feedback wordt gebruikt? | **Nee.** De baseline-zin ("Je melding wordt later gebruikt bij de feedback …") is verdwenen; de opdracht vraagt alleen het product te schrijven. |
| minWords | `minimumWords: null` (trusted, server-side; niet in het ontwerpschema van Claude). |
| Andere verzonnen kwantitatieve verplichting? | Nee. Geen lengte, aantal zinnen, tijdslimiet of aantallen, ook niet in de opdrachttekst. |
| Nieuwe feiten of procedures? | Nee. "Je weet wie dat is" komt uit een Blueprint-aanname ("weet wie de verantwoordelijke is aan wie gemeld moet worden"); "de gestapelde dozen" uit de scenariopremisse. Geen eisen aan de inhoud van de melding (dat is SN2, nog niet gevalideerd); `template: null`. |
| Metadata | `assessmentRole: formative`, `estimatedMinutes: 8` (gelijk aan de baseline). `sourceNeedRefs: []` (baseline: `[SN2]`); de opdracht steunt niet op gevalideerde kennis, maar de melding hangt wel samen met SN2. |

## Menselijke evaluatie

**Status: `PASS`** (beoordeeld 2026-10-04)

De twee baseline-bevindingen zijn opgelost: geen claim dat de Productie later voor Feedback wordt gebruikt en
`minimumWords: null` (trusted). De voorgeschreven handeling blijft intact, de opdracht is bruikbaar en er zijn geen
nieuwe feiten, procedures of kwantitatieve eisen.

`sourceNeedRefs: []` is **geen fout**: deze opdracht vraagt de deelnemer een melding te schrijven en steunt zelf niet
op bronkennis. Een leeg `sourceNeedRefs` is juist wanneer een contentblok geen bronkennis nodig heeft.
