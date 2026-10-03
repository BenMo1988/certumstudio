# BP-002 · Run 2026-10-03 · training-blueprint/v1 · claude-opus-5-5 · medium

Baseline-run van de Training Blueprint Generation (prompt `training-blueprint/v1`, contract `blueprint-contract/v1`),
met precies één poging (`maxRetries: 0`). Configuratie bevroren op commit `c215757`.

Uitgevoerd via de Server Action `generateBlueprint` op de dev-server (`CERTUM_BLUEPRINT_PROVIDER=claude`), met de
bestaande synthetische input van CA-006, de bestaande V2-analyse (`ready`) uit de baseline en de vooraf
vastgelegde richting. Alle server-side poorten (preflight, `synthetic_only`, attestatie, analyse-invarianten,
`getProceedBlockerV2`) zijn doorlopen. Er is geen nieuwe analyse gedaan.

**Status: `PENDING_REVIEW`** (nog geen menselijke beoordeling; geen PASS/FAIL).

## Configuratie en metadata

Overgenomen uit de metadata-logregel `certum.blueprint_generation` van deze run.

| Veld | Waarde |
| --- | --- |
| rundatum | 2026-10-03 |
| provider | claude |
| model | claude-opus-5-5 |
| effort | medium |
| promptVersion | training-blueprint/v1 |
| contractVersion | blueprint-contract/v1 |
| inputKind | casus |
| durationMs | 24387 |
| outcome | success |
| ambiguity | multiple_defensible_actions |
| successCriteria | 3 |
| assumptions | 1 |
| sourceNeeds | 2 |
| invarianten | geen schendingen (Blueprint toegelaten door provider én flow) |
| fout | geen |

Tokengebruik en kosten werden voor deze run niet geregistreerd.

## Trusted context (server-side toegevoegd, niet door Claude gegenereerd)

| Veld | Waarde | Herkomst |
| --- | --- | --- |
| version | `blueprint-contract/v1` | contract |
| selectedDirectionId | `grens-respecteren-en-werk-bespreken` | gekozen richting |
| learningGoal | De deelnemer kan de door een medewerker aangegeven privégrens erkennen en het gesprek daarna gericht houden op het werkgedrag en de gemaakte afspraken. | voorgesteld leerdoel van de richting |
| professionalDilemma | Hoe respecteert de teamleider de door de medewerker aangegeven grens rond privéomstandigheden, terwijl hij tegelijkertijd de gemiste deadlines en niet nagekomen afspraken bespreekbaar maakt en de gevolgen voor team en werk aanpakt? | V2-analyse |
| targetAudience | Leidinggevenden en teamleiders die medewerkers aansturen. | V2-analyse |
| sourceRefs | `S2`, `S3` | sourceRefs van de richting |

Controle: deze waarden zijn identiek aan de V2-analyse en de gekozen richting (ja).

## Door Claude ontworpen (Blueprint-ontwerp)

```json
{
  "title": "Grens respecteren, werk bespreekbaar houden",
  "participantRole": "Teamleider die in gesprek is met een medewerker over gemiste deadlines en niet nagekomen afspraken.",
  "scenarioPremise": "De deelnemer voert als teamleider een gesprek met een medewerker die de afgelopen maand meerdere deadlines heeft gemist en afspraken niet altijd nakomt. In het gesprek zegt de medewerker dat er privé veel speelt, maar dat hij daar op het werk niet verder over wil praten. De teamleider wil respectvol omgaan met die grens, maar moet ook iets doen met de gevolgen voor het team en het werk.",
  "decisionPoint": "Direct na de mededeling van de medewerker reageert de teamleider: hij erkent de aangegeven privégrens en brengt het gesprek vervolgens terug naar het werkgedrag, de gemiste deadlines en de afspraken, zonder door te vragen naar de privéomstandigheden en zonder het werkonderwerp los te laten.",
  "ambiguity": "multiple_defensible_actions",
  "successCriteria": [
    "De deelnemer erkent in zijn reactie de door de medewerker aangegeven grens zichtbaar, zonder alsnog naar de privéomstandigheden te vragen of daarover te speculeren.",
    "De deelnemer benoemt concreet het werkgedrag en de gevolgen voor team en werk en houdt het gesprek gericht op afspraken daarover.",
    "De deelnemer onderbouwt waarom hij voor deze reactie en deze volgorde heeft gekozen, met aandacht voor zowel de grens van de medewerker als de verantwoordelijkheid voor team en werk."
  ],
  "assumptions": [
    {
      "assumption": "Het gesprek wordt gesimuleerd vanaf het moment dat de medewerker zijn grens aangeeft; of er al eerdere gesprekken of afspraken over dit patroon waren, blijft in de simulatie open.",
      "reason": "Het keuzemoment draait om de reactie op de grens; de open vraag over eerdere gesprekken is niet beantwoord en wordt daarom niet als feit ingevuld."
    }
  ],
  "sourceNeeds": [
    {
      "question": "Welke ruimte en verantwoordelijkheid heeft een leidinggevende om het werkgedrag van een medewerker te bespreken wanneer die aangeeft dat privéomstandigheden spelen, en waar ligt de grens van doorvragen naar privézaken?",
      "sourceType": "nog_te_bepalen",
      "whyNeeded": "Feedback en bronfase moeten de afweging tussen respect voor de privégrens en aanspreken op werkgedrag kunnen toetsen aan een gevalideerd kader in plaats van aan een aanname."
    },
    {
      "question": "Welke gespreksprincipes worden in de praktijk van leidinggeven gebruikt om een persoonlijke grens te erkennen en tegelijk afspraken over werkgedrag concreet te maken?",
      "sourceType": "methodiek",
      "whyNeeded": "Om de kwaliteit van de uitvoering van de reactie te kunnen beoordelen en in de bronfase onderbouwing te bieden voor verdedigbare gespreksroutes."
    }
  ],
  "learningArc": {
    "context": {
      "participantKnows": "De medewerker heeft de afgelopen maand meerdere deadlines gemist en afspraken niet altijd nagekomen. In het gesprek heeft hij net gezegd dat er privé veel speelt en dat hij daar op het werk niet verder over wil praten.",
      "deliberatelyUnknown": "Wat er privé speelt, of er eerder gesprekken of afspraken over dit patroon zijn geweest en hoe de medewerker op een vervolg zal reageren.",
      "tensionArises": "Op het moment dat de grens wordt uitgesproken: verder doorvragen schendt die grens, maar het gesprek laten rusten laat de gevolgen voor team en werk onbesproken."
    },
    "actie": {
      "participantMust": "In het lopende gesprek reageren op de mededeling van de medewerker: de grens erkennen, bepalen hoe en wanneer hij terugkeert naar het werkgedrag, en het gesprek richten op wat er in het werk nodig is, zonder de privéomstandigheden te onderzoeken.",
      "performanceType": "gesprek_voeren"
    },
    "reflectie": {
      "looksBackOn": "De eigen reactie op de uitgesproken grens en de manier waarop de deelnemer het gesprek daarna terugbracht naar deadlines en afspraken.",
      "explicitTradeOff": "De afweging tussen ruimte geven aan de medewerker en de privégrens respecteren enerzijds, en de verantwoordelijkheid om de gevolgen voor team en werk bespreekbaar te maken en afspraken te maken anderzijds."
    },
    "feedback": {
      "respondsTo": "Hoe de deelnemer de grens erkende en het gesprek op werkgedrag hield, en hoe hij die keuze onderbouwt in de reflectie.",
      "dimensions": [
        "Erkenning van de privégrens zonder doorvragen of invullen",
        "Duidelijkheid over werkgedrag, gevolgen en afspraken",
        "Samenhang tussen gekozen reactie en onderbouwde afweging"
      ],
      "multipleDefensibleHandling": "Feedback beoordeelt of de gekozen route, bijvoorbeeld eerst ruimte geven en later terugkomen of direct terugkeren naar het werk, de grens daadwerkelijk respecteert en het werkonderwerp concreet bespreekbaar houdt, en of de deelnemer die keuze navolgbaar onderbouwt. Geen route wordt bij voorbaat als enige juiste behandeld; zwakke uitvoering binnen een verdedigbare route wordt wel benoemd."
    },
    "bron": {
      "knowledgeQuestions": [
        "Waar ligt voor een leidinggevende de grens tussen belangstelling tonen en doorvragen naar privéomstandigheden van een medewerker?",
        "Welke ruimte en verantwoordelijkheid heeft een leidinggevende om werkgedrag te bespreken als een medewerker privéomstandigheden aangeeft?",
        "Welke gespreksprincipes helpen om een persoonlijke grens te erkennen en tegelijk concrete werkafspraken te maken?"
      ],
      "sourceTypes": [
        "methodiek",
        "organisatiebeleid",
        "nog_te_bepalen"
      ]
    },
    "toets": {
      "demonstrate": "Opnieuw een door een medewerker aangegeven grens erkennen en het gesprek gericht houden op werkgedrag en afspraken, met een onderbouwde afweging.",
      "transferEvidence": "De deelnemer past dezelfde afweging toe in een ander gesprek waarin een grens op een andere manier of op een ander moment wordt aangegeven, en laat zien dat hij erkenning en werkgerichtheid combineert zonder de privésituatie te onderzoeken.",
      "newDecisionPoint": "Een vervolggesprek met dezelfde soort situatie waarin de teamleider concrete werkafspraken moet vastleggen of bijstellen terwijl de medewerker de privégrens handhaaft."
    }
  }
}
```

## Volledige gebruikerszichtbare Training Blueprint

```json
{
  "version": "blueprint-contract/v1",
  "title": "Grens respecteren, werk bespreekbaar houden",
  "targetAudience": "Leidinggevenden en teamleiders die medewerkers aansturen.",
  "learningGoal": "De deelnemer kan de door een medewerker aangegeven privégrens erkennen en het gesprek daarna gericht houden op het werkgedrag en de gemaakte afspraken.",
  "professionalDilemma": "Hoe respecteert de teamleider de door de medewerker aangegeven grens rond privéomstandigheden, terwijl hij tegelijkertijd de gemiste deadlines en niet nagekomen afspraken bespreekbaar maakt en de gevolgen voor team en werk aanpakt?",
  "selectedDirectionId": "grens-respecteren-en-werk-bespreken",
  "sourceRefs": [
    "S2",
    "S3"
  ],
  "participantRole": "Teamleider die in gesprek is met een medewerker over gemiste deadlines en niet nagekomen afspraken.",
  "scenarioPremise": "De deelnemer voert als teamleider een gesprek met een medewerker die de afgelopen maand meerdere deadlines heeft gemist en afspraken niet altijd nakomt. In het gesprek zegt de medewerker dat er privé veel speelt, maar dat hij daar op het werk niet verder over wil praten. De teamleider wil respectvol omgaan met die grens, maar moet ook iets doen met de gevolgen voor het team en het werk.",
  "decisionPoint": "Direct na de mededeling van de medewerker reageert de teamleider: hij erkent de aangegeven privégrens en brengt het gesprek vervolgens terug naar het werkgedrag, de gemiste deadlines en de afspraken, zonder door te vragen naar de privéomstandigheden en zonder het werkonderwerp los te laten.",
  "ambiguity": "multiple_defensible_actions",
  "successCriteria": [
    "De deelnemer erkent in zijn reactie de door de medewerker aangegeven grens zichtbaar, zonder alsnog naar de privéomstandigheden te vragen of daarover te speculeren.",
    "De deelnemer benoemt concreet het werkgedrag en de gevolgen voor team en werk en houdt het gesprek gericht op afspraken daarover.",
    "De deelnemer onderbouwt waarom hij voor deze reactie en deze volgorde heeft gekozen, met aandacht voor zowel de grens van de medewerker als de verantwoordelijkheid voor team en werk."
  ],
  "assumptions": [
    {
      "assumption": "Het gesprek wordt gesimuleerd vanaf het moment dat de medewerker zijn grens aangeeft; of er al eerdere gesprekken of afspraken over dit patroon waren, blijft in de simulatie open.",
      "reason": "Het keuzemoment draait om de reactie op de grens; de open vraag over eerdere gesprekken is niet beantwoord en wordt daarom niet als feit ingevuld."
    }
  ],
  "sourceNeeds": [
    {
      "question": "Welke ruimte en verantwoordelijkheid heeft een leidinggevende om het werkgedrag van een medewerker te bespreken wanneer die aangeeft dat privéomstandigheden spelen, en waar ligt de grens van doorvragen naar privézaken?",
      "sourceType": "nog_te_bepalen",
      "whyNeeded": "Feedback en bronfase moeten de afweging tussen respect voor de privégrens en aanspreken op werkgedrag kunnen toetsen aan een gevalideerd kader in plaats van aan een aanname."
    },
    {
      "question": "Welke gespreksprincipes worden in de praktijk van leidinggeven gebruikt om een persoonlijke grens te erkennen en tegelijk afspraken over werkgedrag concreet te maken?",
      "sourceType": "methodiek",
      "whyNeeded": "Om de kwaliteit van de uitvoering van de reactie te kunnen beoordelen en in de bronfase onderbouwing te bieden voor verdedigbare gespreksroutes."
    }
  ],
  "learningArc": {
    "context": {
      "participantKnows": "De medewerker heeft de afgelopen maand meerdere deadlines gemist en afspraken niet altijd nagekomen. In het gesprek heeft hij net gezegd dat er privé veel speelt en dat hij daar op het werk niet verder over wil praten.",
      "deliberatelyUnknown": "Wat er privé speelt, of er eerder gesprekken of afspraken over dit patroon zijn geweest en hoe de medewerker op een vervolg zal reageren.",
      "tensionArises": "Op het moment dat de grens wordt uitgesproken: verder doorvragen schendt die grens, maar het gesprek laten rusten laat de gevolgen voor team en werk onbesproken."
    },
    "actie": {
      "participantMust": "In het lopende gesprek reageren op de mededeling van de medewerker: de grens erkennen, bepalen hoe en wanneer hij terugkeert naar het werkgedrag, en het gesprek richten op wat er in het werk nodig is, zonder de privéomstandigheden te onderzoeken.",
      "performanceType": "gesprek_voeren"
    },
    "reflectie": {
      "looksBackOn": "De eigen reactie op de uitgesproken grens en de manier waarop de deelnemer het gesprek daarna terugbracht naar deadlines en afspraken.",
      "explicitTradeOff": "De afweging tussen ruimte geven aan de medewerker en de privégrens respecteren enerzijds, en de verantwoordelijkheid om de gevolgen voor team en werk bespreekbaar te maken en afspraken te maken anderzijds."
    },
    "feedback": {
      "respondsTo": "Hoe de deelnemer de grens erkende en het gesprek op werkgedrag hield, en hoe hij die keuze onderbouwt in de reflectie.",
      "dimensions": [
        "Erkenning van de privégrens zonder doorvragen of invullen",
        "Duidelijkheid over werkgedrag, gevolgen en afspraken",
        "Samenhang tussen gekozen reactie en onderbouwde afweging"
      ],
      "multipleDefensibleHandling": "Feedback beoordeelt of de gekozen route, bijvoorbeeld eerst ruimte geven en later terugkomen of direct terugkeren naar het werk, de grens daadwerkelijk respecteert en het werkonderwerp concreet bespreekbaar houdt, en of de deelnemer die keuze navolgbaar onderbouwt. Geen route wordt bij voorbaat als enige juiste behandeld; zwakke uitvoering binnen een verdedigbare route wordt wel benoemd."
    },
    "bron": {
      "knowledgeQuestions": [
        "Waar ligt voor een leidinggevende de grens tussen belangstelling tonen en doorvragen naar privéomstandigheden van een medewerker?",
        "Welke ruimte en verantwoordelijkheid heeft een leidinggevende om werkgedrag te bespreken als een medewerker privéomstandigheden aangeeft?",
        "Welke gespreksprincipes helpen om een persoonlijke grens te erkennen en tegelijk concrete werkafspraken te maken?"
      ],
      "sourceTypes": [
        "methodiek",
        "organisatiebeleid",
        "nog_te_bepalen"
      ]
    },
    "toets": {
      "demonstrate": "Opnieuw een door een medewerker aangegeven grens erkennen en het gesprek gericht houden op werkgedrag en afspraken, met een onderbouwde afweging.",
      "transferEvidence": "De deelnemer past dezelfde afweging toe in een ander gesprek waarin een grens op een andere manier of op een ander moment wordt aangegeven, en laat zien dat hij erkenning en werkgerichtheid combineert zonder de privésituatie te onderzoeken.",
      "newDecisionPoint": "Een vervolggesprek met dezelfde soort situatie waarin de teamleider concrete werkafspraken moet vastleggen of bijstellen terwijl de medewerker de privégrens handhaaft."
    }
  }
}
```

## Feitelijke signalen (zonder oordeel)

| Vraag | Waarneming |
| --- | --- |
| 1. Binnen de gekozen richting? | Ja. Reactie op de uitgesproken privégrens, met het werkonderwerp in beeld (S2, S3). |
| 2. Eén helder decisionPoint? | Eén moment: direct na de mededeling. De formulering beschrijft al een gewenste route (erkennen, terugbrengen naar werkgedrag, niet doorvragen). Dat volgt grotendeels uit het trusted leerdoel. |
| 3. Nieuwe feiten in scenarioPremise? | Geen. De premise herhaalt S1-S3. |
| 4. Assumptions | 1: eerdere gesprekken of afspraken blijven open. Het is eerder het open laten van een onbekende dan een ontwerpkeuze; beperkt noodzakelijk. |
| 5. SourceNeeds | 2. Bron heeft wel 3 knowledgeQuestions en sourceType `organisatiebeleid`, die niet in sourceNeeds staan: sourceNeeds en Bron lopen niet gelijk. |
| 6. Concrete bronnen, wetten, methodieken of richtlijnen? | Geen concrete bron of kader. sourceTypes `methodiek`, `organisatiebeleid`, `nog_te_bepalen`. |
| 7. Ambiguity zoals verwacht? | `multiple_defensible_actions`. Vooraf niet vastgelegd; consistent met Feedback en successCriteria. |
| 8. Feedback bij meerdere routes | Ja. Noemt twee routes (eerst ruimte geven en later terugkomen, of direct terugkeren naar het werk) en behandelt geen route als enige juiste. |
| 9. Reflectie terug naar de eigen keuze? | Ja: de eigen reactie op de grens en hoe het gesprek terugkwam bij deadlines en afspraken. |
| 10. Bron pas ná Actie, Reflectie, Feedback? | Ja. |
| 11. Toets: transfer of kennisquiz? | Transfer: een ander gesprek waarin een grens anders of op een ander moment wordt aangegeven. newDecisionPoint verschuift naar een vervolggesprek over het vastleggen van werkafspraken. |
| 12. BC Online-bloknamen? | Geen. |
| 13. Overige aanwijzingen van content schrijven? | Geen dialogen of antwoordopties. Actie (participantMust) noemt wel al het gewenste handelen ("de grens erkennen … zonder de privéomstandigheden te onderzoeken"). Dat kan het normatieve antwoord vooraf verklappen. |
| Casus: multiple_defensible_actions | Ja. |
| Casus: geen verborgen beste route | Gedeeltelijk: decisionPoint en Actie beschrijven één handelingslijn (erkennen → terug naar werk, niet doorvragen). Variatie blijft in timing en uitvoering, zoals Feedback benoemt. Ter beoordeling. |
| Casus: privégrens én verantwoordelijkheid behouden | Ja. Beide in tensionArises, explicitTradeOff en successCriteria. |
| Casus: geen diagnose, bedrijfsarts of arbeidsrecht | Niet aangetroffen. |

## Beoordeling

Nog niet beoordeeld. Status `PENDING_REVIEW`.
