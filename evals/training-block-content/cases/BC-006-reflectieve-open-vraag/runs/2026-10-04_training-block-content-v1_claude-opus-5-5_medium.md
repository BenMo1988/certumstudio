# BC-006 · 2026-10-04 · training-block-content/v1 · claude-opus-5-5 · medium

Eén betaalde aanroep via de Server Action `regenerateBlockContent` op de dev-server (alle andere providers op mock,
`CERTUM_BLOCK_CONTENT_PROVIDER=claude`), met de goedgekeurde Blueprint en het goedgekeurde Block Plan `BLP-001`
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
| catalogBlockId | certum.bco.open-vraag |
| certumPhase | reflectie |
| durationMs | 11284 |
| outcome | success |
| resultStatus | generated |
| estimatedMinutes | 10 |

## Trusted velden (server-side)

```json
{
  "version": "block-content/v1",
  "plannedBlockId": "blok-3",
  "sequence": 3,
  "certumPhase": "reflectie",
  "catalogBlockId": "certum.bco.open-vraag",
  "routePolicy": "open_choice",
  "reviewStatus": "draft",
  "workform": "Open vraag",
  "catalogBlockIdInContent": "certum.bco.open-vraag"
}
```

## Gegenereerde velden (Claude)

```json
{
  "accreditation": {
    "learningGoalContribution": "De deelnemer maakt zijn eigen gespreksaanpak en de afweging tussen de privégrens van de medewerker en de verantwoordelijkheid voor werk en team expliciet, inclusief de verwachte consequenties. Dit antwoord vormt de basis voor de feedback in het volgende blok.",
    "assessmentRole": "formative",
    "estimatedMinutes": 10,
    "sourceNeedRefs": []
  },
  "body": {
    "status": "generated",
    "content": {
      "catalogBlockId": "certum.bco.open-vraag",
      "title": "Terugblik op je gesprek",
      "question": "Kijk terug op het gesprek dat je zojuist met de medewerker voerde. Beschrijf kort en zo concreet mogelijk wat je zei en vroeg nadat hij zijn grens aangaf, wat je wel en bewust niet hebt aangesneden en welke afspraken of ruimte rond het werk je hebt gemaakt. Leg uit hoe je zijn privégrens hebt afgewogen tegen je verantwoordelijkheid voor de deadlines, de afspraken en het team. Welke consequenties verwacht je van jouw aanpak voor de medewerker, voor jullie werkrelatie en voor het team?",
      "exampleAnswer": null,
      "feedback": null
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
  "certumPhase": "reflectie",
  "catalogBlockId": "certum.bco.open-vraag",
  "routePolicy": "open_choice",
  "reviewStatus": "draft",
  "accreditation": {
    "workform": "Open vraag",
    "learningGoalContribution": "De deelnemer maakt zijn eigen gespreksaanpak en de afweging tussen de privégrens van de medewerker en de verantwoordelijkheid voor werk en team expliciet, inclusief de verwachte consequenties. Dit antwoord vormt de basis voor de feedback in het volgende blok.",
    "assessmentRole": "formative",
    "estimatedMinutes": 10,
    "sourceNeedRefs": []
  },
  "body": {
    "status": "generated",
    "content": {
      "catalogBlockId": "certum.bco.open-vraag",
      "title": "Terugblik op je gesprek",
      "question": "Kijk terug op het gesprek dat je zojuist met de medewerker voerde. Beschrijf kort en zo concreet mogelijk wat je zei en vroeg nadat hij zijn grens aangaf, wat je wel en bewust niet hebt aangesneden en welke afspraken of ruimte rond het werk je hebt gemaakt. Leg uit hoe je zijn privégrens hebt afgewogen tegen je verantwoordelijkheid voor de deadlines, de afspraken en het team. Welke consequenties verwacht je van jouw aanpak voor de medewerker, voor jullie werkrelatie en voor het team?",
      "exampleAnswer": null,
      "feedback": null
    }
  }
}
```

## Signalen voor de human review (zonder oordeel)

| Vraag | Waarneming |
| --- | --- |
| Vraagt de vraag om professionele reflectie? | Ja. Wat de deelnemer zei en vroeg nadat de medewerker zijn grens aangaf, wat hij wel en bewust niet aansneed, welke afspraken hij maakte, de afweging grens ↔ deadlines/afspraken/team en de verwachte consequenties. |
| Sluit de vraag direct aan op het handelen? | Ja: "het gesprek dat je zojuist met de medewerker voerde". |
| Generiek? | Nee. Geen "Hoe vond je dat het ging?". |
| Eén route als juist? | Nee. Geen route genoemd of gewaardeerd; `routePolicy: open_choice` (trusted). |
| Geeft de vraag het antwoord weg? | Nee. Wel noemt de vraag de afwegingselementen uit de Blueprint (privégrens, deadlines, afspraken, team, consequenties); dat is een structuur, geen antwoord. |
| Voorbeeldantwoord | `exampleAnswer: null`, conform het Block Plan ("Geen voorbeeldantwoord tonen dat één route als juist suggereert"). |
| Nieuwe scenariofeiten | Geen. |
| Omvang | Eén vraag met vier deelvragen; aan de zware kant voor één open veld. |
| Metadata | `assessmentRole: formative`, `estimatedMinutes: 10`, `sourceNeedRefs: []`. `learningGoalContribution`: "Dit antwoord vormt de basis voor de feedback in het volgende blok" (klopt: Open vraag is aantoonbare context voor AI Feedback). |

## Menselijke evaluatie

**Status: `PENDING_REVIEW`**

Nog niet beoordeeld.
