# BC-002 · 2026-10-04 · training-block-content/v1 · claude-opus-5-5 · medium

Eén betaalde aanroep via de Server Action `regenerateBlockContent` op de dev-server (alle andere providers op mock,
`CERTUM_BLOCK_CONTENT_PROVIDER=claude`), met de goedgekeurde Blueprint en het goedgekeurde Block Plan `BLP-002`
uit de fixtures en doelblok `blok-3`. Precies één poging (`maxRetries: 0`), geen retry.

**Status: `PENDING_REVIEW`**

## Metadata (uit `certum.block_content_generation`)

| Veld | Waarde |
| --- | --- |
| provider | claude |
| model | claude-opus-5-5 |
| effort | medium |
| maxRetries | 0 |
| promptVersion | training-block-content/v1 |
| contentContractVersion | block-content/v1 |
| plannedBlockId | blok-3 |
| catalogBlockId | certum.bco.productie |
| certumPhase | actie |
| durationMs | 16472 |
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
  "catalogBlockIdInContent": "certum.bco.productie"
}
```

## Gegenereerde velden (Claude)

```json
{
  "accreditation": {
    "learningGoalContribution": "Dit blok laat de deelnemer het tweede deel van de voorgeschreven handelingslijn uitvoeren: na het vrijmaken van de nooduitgang de melding aan de verantwoordelijke schrijven. Zo ontstaat een concreet product dat later aan de verwachtingen rond melden kan worden getoetst.",
    "assessmentRole": "formative",
    "estimatedMinutes": 8,
    "sourceNeedRefs": [
      "SN2"
    ]
  },
  "body": {
    "status": "generated",
    "content": {
      "catalogBlockId": "certum.bco.productie",
      "title": "Melding aan de verantwoordelijke",
      "productType": "anders",
      "instructions": "Je hebt de dozen voor de nooduitgang weggehaald, zodat de nooduitgang weer vrij is. Volgens de vaste instructie meld je dit daarna aan de verantwoordelijke. Schrijf nu die melding, precies zoals je hem in deze situatie aan de verantwoordelijke zou doen. Bepaal zelf wat je opneemt en hoe je het formuleert. Schrijf de melding als een op zichzelf staande tekst die de verantwoordelijke zonder verdere toelichting kan lezen. Je melding wordt later gebruikt bij de feedback en bij het vergelijken met wat er van een melding wordt verwacht.",
      "template": null,
      "minimumWords": 40
    }
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
    "learningGoalContribution": "Dit blok laat de deelnemer het tweede deel van de voorgeschreven handelingslijn uitvoeren: na het vrijmaken van de nooduitgang de melding aan de verantwoordelijke schrijven. Zo ontstaat een concreet product dat later aan de verwachtingen rond melden kan worden getoetst.",
    "assessmentRole": "formative",
    "estimatedMinutes": 8,
    "sourceNeedRefs": [
      "SN2"
    ]
  },
  "body": {
    "status": "generated",
    "content": {
      "catalogBlockId": "certum.bco.productie",
      "title": "Melding aan de verantwoordelijke",
      "productType": "anders",
      "instructions": "Je hebt de dozen voor de nooduitgang weggehaald, zodat de nooduitgang weer vrij is. Volgens de vaste instructie meld je dit daarna aan de verantwoordelijke. Schrijf nu die melding, precies zoals je hem in deze situatie aan de verantwoordelijke zou doen. Bepaal zelf wat je opneemt en hoe je het formuleert. Schrijf de melding als een op zichzelf staande tekst die de verantwoordelijke zonder verdere toelichting kan lezen. Je melding wordt later gebruikt bij de feedback en bij het vergelijken met wat er van een melding wordt verwacht.",
      "template": null,
      "minimumWords": 40
    }
  }
}
```

## Signalen voor de human review (zonder oordeel)

| Vraag | Waarneming |
| --- | --- |
| Begrijpt een deelnemer wat hij moet opleveren? | Ja. Eén opdracht: de melding aan de verantwoordelijke, "als een op zichzelf staande tekst die de verantwoordelijke zonder verdere toelichting kan lezen". |
| Blijft de voorgeschreven handeling intact? | Ja. "Je hebt de dozen voor de nooduitgang weggehaald … Volgens de vaste instructie meld je dit daarna aan de verantwoordelijke." Geen open keuze of alternatieve route; `routePolicy: prescribed_action` (trusted). |
| Nieuwe procedurele eisen? | Geen inhoudelijke eisen aan de melding ("Bepaal zelf wat je opneemt en hoe je het formuleert"). Wel `minimumWords: 40`, dat niet in het Block Plan staat (een configuratiekeuze, geen procedure). |
| Sjabloon/starttekst | `template: null`. Past: wat in een melding hoort is SN2 en nog niet gevalideerd; een sjabloon zou dat voorzeggen. |
| Capability overclaim? | **Ja, in de deelnemertekst:** "Je melding wordt later gebruikt bij de feedback en bij het vergelijken met wat er van een melding wordt verwacht." Een Productie-uitwerking is niet aantoonbaar context voor AI Feedback (catalogus: alleen antwoorden op vraagblokken). De structurele regels vangen dit niet (vrije tekst). |
| Nieuwe scenariofeiten | Geen. "De dozen" staan in de Blueprint ("een door gestapelde dozen geblokkeerde" nooduitgang). |
| Ongevalideerde theorie of wetgeving | Geen. Verwijst naar "de vaste instructie" uit de Blueprint, zonder wet of norm. |
| Metadata | `assessmentRole: formative`, `estimatedMinutes: 8`, `sourceNeedRefs: [SN2]` (passend: SN2 gaat over de inhoud van de melding). `learningGoalContribution` noemt "later aan de verwachtingen rond melden getoetst". |

## Menselijke evaluatie

**Status: `FAIL`** (beoordeeld 2026-10-04)

De productieopdracht is bruikbaar en de voorgeschreven handeling blijft intact, maar de deelnemertekst bevat een
**capability overclaim**: "Je melding wordt later gebruikt bij de feedback en bij het vergelijken met wat er van een
melding wordt verwacht." Een Productie-uitwerking is niet aantoonbaar context voor AI Feedback. Daarnaast introduceert
Claude een **verzonnen kwantitatieve eis** (`minimumWords: 40`) zonder grond in Blueprint of Block Plan.

Gevolg (`fix: tighten block content grounding`):
- gedeelde promptregel: deelnemergerichte inhoud claimt geen onbewezen downstream-gebruik (semantische regel, bewaakt
  via prompt, eval en human review; geen regex of woordenlijst);
- geen verzonnen numerieke deelnemereisen; `Productie.minimumWords` is in V1 server-side `null` en zit niet meer in
  het ontwerpschema van Claude.
