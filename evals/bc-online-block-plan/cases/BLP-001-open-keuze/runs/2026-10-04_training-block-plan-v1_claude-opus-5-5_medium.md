# BLP-001 · Run 2026-10-04 · training-block-plan/v1 · claude-opus-5-5 · medium

Baseline-run van BC Online Block Plan Generation (prompt `training-block-plan/v1`, contract
`bc-online-block-plan/v1`), met precies één poging (`maxRetries: 0`). Configuratie bevroren op commit `63b885e`.

Uitgevoerd via de Server Action `generateBlockPlan` op de dev-server (`CERTUM_ANALYSIS_PROVIDER=mock`,
`CERTUM_BLUEPRINT_PROVIDER=mock`, `CERTUM_BLOCK_PLAN_PROVIDER=claude`), met exact de goedgekeurde Blueprint
`BLP-001` uit `test/fixtures/approved-blueprints.json`.

**Status: `PASS_WITH_NOTES`** (menselijk beoordeeld; zie "Menselijke evaluatie").

## Configuratie en metadata

Overgenomen uit de metadata-logregel `certum.block_plan_generation` van deze run.

| Veld | Waarde |
| --- | --- |
| rundatum | 2026-10-04 |
| provider | claude |
| model | claude-opus-5-5 |
| effort | medium |
| maxRetries | 0 |
| promptVersion | training-block-plan/v1 |
| contractVersion | bc-online-block-plan/v1 |
| catalogVersion | bc-online-block-catalog/v1 |
| blueprintVersion | blueprint-contract/v2 |
| durationMs | 44694 |
| outcome | success |
| plannedBlocks | 9 |
| capabilityGaps | 2 |
| invarianten | geen schendingen (plan toegelaten door provider én flow) |

## Course shell en trusted velden

| Veld | Waarde |
| --- | --- |
| title (trusted) | Privégrens respecteren en werkverantwoordelijkheid bewaken |
| learningGoals (trusted) | De deelnemer kan afwegen hoe hij de door een medewerker aangegeven grens rond privéomstandigheden respecteert en tegelijk verantwoordelijkheid houdt voor het werk en het team, en kan zijn gekozen aanpak onderbouwen in het licht van de situatie en de mogelijke consequenties. |
| skjPoints | null |
| status | concept |
| estimatedDurationMinutes (cursus / start) | null / null |
| description | Praktijksimulatie voor leidinggevenden over een gesprek waarin een medewerker een grens aangeeft rond zijn privésituatie, terwijl deadlines en afspraken onder druk staan. De deelnemer voert het gesprek, weegt grens en werkverantwoordelijkheid af en toetst zijn aanpak aan gevalideerde kennis. |
| startIntent.explanationIntent | Uitleggen dat de deelnemer de rol van teamleider aanneemt in een lopend gesprek, dat er meerdere verdedigbare aanpakken zijn, dat hij zelf een aanpak kiest, uitvoert en onderbouwt, en dat de training verloopt via context, gesprek, reflectie, feedback, bron en een nieuwe situatie. |
| endIntent.closingIntent | De deelnemer sluit af met het besef dat er meerdere verdedigbare aanpakken zijn en dat het gaat om een zichtbare afweging tussen de privégrens van de medewerker en de verantwoordelijkheid voor werk en team, inclusief de consequenties daarvan. |
| endIntent.summaryIntent | Kort terugblikken op de kern van het dilemma en de drie feedbackdimensies: omgaan met de privégrens, bewaken van werkverantwoordelijkheid en onderbouwing van afweging en consequenties. |
| endIntent.followUpRecommendation | Aanraden om de eigen afweging in een volgend praktijkgesprek bewust toe te passen en te bespreken met een collega-leidinggevende of in intervisie. |

## Geplande blokken

### 1. context · `certum.bco.tekst`

- **purpose:** De deelnemer kent de situatie: gemiste deadlines, niet nagekomen afspraken, gevolgen voor het team en het zojuist uitgesproken signaal van de medewerker dat er privé veel speelt maar dat hij daar niet over wil praten.
- **whyThisBlock:** Een korte situatieschets volstaat om de spanning neer te zetten direct voor het gesprek; geen extra media nodig.
- **configurationIntent:**
  - *situatieschets:* Beschrijven wat de teamleider weet over gemiste deadlines, afspraken en teamgevolgen, en het moment direct nadat de medewerker zijn grens heeft aangegeven.
  - *bewuste onzekerheid:* Niet invullen wat er privé speelt, hoe lang het duurt of hoe de medewerker de gevolgen inschat.

### 2. actie · `certum.bco.chat-simulatie`

- **purpose:** De deelnemer voert het vervolg van het lopende gesprek met de medewerker en bepaalt zelf hoe hij omgaat met de grens en met de gevolgen voor werk en team.
- **whyThisBlock:** Het performancetype is gesprek voeren met open keuze; een AI-rollenspel laat de deelnemer handelen in het moment zonder één juist antwoord op te leggen.
- **configurationIntent:**
  - *rol fictieve persoon:* De AI speelt de medewerker die zojuist heeft aangegeven niet over zijn privésituatie te willen praten en die grens consequent bewaakt, maar wel reageert op vragen over werk en afspraken.
  - *startmoment:* Het gesprek begint direct na de uitspraak van de medewerker over zijn grens.
  - *gespreksdoel sleutelwoorden:* Niet gebruiken, omdat sleutelwoorden geen professioneel redeneren beoordelen en meerdere routes verdedigbaar zijn.
  - *tijdslimiet:* Ruim instellen of uitlaten zodat de deelnemer zijn gekozen aanpak volledig kan uitvoeren.

### 3. reflectie · `certum.bco.open-vraag`

- **purpose:** De deelnemer kijkt terug op zijn gekozen aanpak, beschrijft wat hij wel en niet aansneed, en weegt expliciet de privégrens af tegen werk en team inclusief consequenties voor medewerker, werkrelatie en team.
- **whyThisBlock:** Een open antwoord maakt de eigen afweging zichtbaar en levert de input waarop AI Feedback kan reageren.
- **configurationIntent:**
  - *opdracht:* Vragen om een korte weergave van het eigen gespreksverloop, de afweging tussen grens en werkverantwoordelijkheid en de verwachte consequenties.
  - *voorbeeldantwoord:* Geen voorbeeldantwoord tonen dat één route als juist suggereert.

### 4. feedback · `certum.bco.ai-feedback`

- **purpose:** De deelnemer krijgt feedback op de omgang met de privégrens, het bewaken van werkverantwoordelijkheid en de onderbouwing van afweging en consequenties.
- **whyThisBlock:** AI Feedback kan reageren op het eerdere open antwoord en zo inhoudelijk ingaan op de afweging zonder een route als juist aan te wijzen.
- **configurationIntent:**
  - *bronantwoorden:* Het reflectieantwoord als context meegeven.
  - *feedbackdimensies:* Feedback richten op de drie dimensies uit de Blueprint en op afweging, aansluiting op de situatie, consequenties en uitvoering.
  - *meerdere verdedigbare routes:* Instrueren dat niet de gekozen route wordt beoordeeld maar de aansluiting, de weging van beide kanten, de consequenties en de consistentie tussen beschreven handelen en onderbouwing.

### 5. bron · `certum.bco.tekst`

- **purpose:** De deelnemer legt zijn eigen aanpak naast gevalideerde kennis over de handelingsruimte van een leidinggevende rond privéomstandigheden en over methodische principes voor het bespreken van werkafspraken.
- **whyThisBlock:** Tekstweergave is het eenvoudigste middel om later gevalideerde broninhoud bij SN1 en SN2 te tonen na handelen, reflectie en feedback.
- **configurationIntent:**
  - *broninhoud:* Later gevalideerde kennis tonen die antwoord geeft op SN1 en SN2; geen inhoud verzinnen voordat validatie heeft plaatsgevonden.
  - *vergelijkingsopdracht:* De deelnemer uitnodigen zijn eigen afweging en uitvoering naast de bron te leggen en te zien wat wordt versterkt of herzien.

### 6. toets · `certum.bco.tekst`

- **purpose:** De deelnemer maakt kennis met een nieuwe situatie: een vervolggesprek waarin de gevolgen voor het team groter zijn geworden of teamleden ernaar vragen, terwijl de grens van de medewerker blijft bestaan.
- **whyThisBlock:** Een korte situatieschets introduceert het nieuwe keuzemoment voor transfer zonder extra middelen.
- **configurationIntent:**
  - *nieuwe situatie:* De gewijzigde omstandigheden beschrijven ten opzichte van het eerste gesprek, met behoud van de grens van de medewerker.

### 7. toets · `certum.bco.chat-simulatie`

- **purpose:** De deelnemer kiest en voert opnieuw een eigen aanpak uit in het vervolggesprek met de medewerker.
- **whyThisBlock:** Transfer van het handelen in een gesprek wordt het best zichtbaar in hetzelfde gespreksformat, zonder juist-foutbeoordeling.
- **configurationIntent:**
  - *rol fictieve persoon:* De AI speelt dezelfde medewerker in de nieuwe fase, die zijn privégrens handhaaft terwijl de teamgevolgen groter zijn.
  - *gespreksdoel sleutelwoorden:* Niet gebruiken, omdat meerdere routes verdedigbaar zijn.

### 8. toets · `certum.bco.open-vraag`

- **purpose:** De deelnemer onderbouwt zijn aanpak in de nieuwe situatie en maakt zichtbaar welke elementen zijn keuze anders of juist hetzelfde maken, inclusief consequenties.
- **whyThisBlock:** Een open antwoord maakt transfer van de afweging en onderbouwing zichtbaar en dient als input voor de terugkoppeling.
- **configurationIntent:**
  - *opdracht:* Vragen om een korte weergave van het gevoerde vervolggesprek, de onderbouwing en de vergelijking met de eerdere keuze.

### 9. toets · `certum.bco.ai-feedback`

- **purpose:** De deelnemer krijgt terugkoppeling op zijn transferaanpak op afweging, aansluiting op de situatie, consequenties en onderbouwing.
- **whyThisBlock:** AI Feedback kan reageren op het toetsantwoord en op de eerdere reflectie, zodat de ontwikkeling in afweging zichtbaar wordt.
- **configurationIntent:**
  - *bronantwoorden:* Het toetsantwoord en het eerdere reflectieantwoord als context meegeven.
  - *beoordelingsbasis:* Terugkoppelen op afweging, aansluiting op situatie, consequenties en onderbouwing zonder een route als enig juiste te behandelen.

## Capability gaps

1. **feedback: Feedback die rechtstreeks reageert op het daadwerkelijk gevoerde gesprek in de chatsimulatie, naast de onderbouwing van de gekozen aanpak.**
   - *whyNeeded:* De Blueprint vraagt feedback op zowel het gevoerde gesprek als de onderbouwing, inclusief de consistentie tussen uitvoering en afweging. Niet aangetoond is dat AI Feedback het chatverloop als context ontvangt; alleen antwoorden op eerdere vraagblokken zijn aangetoond.
   - *workaround (partial):* In het reflectieblok (Open vraag) beschrijft de deelnemer zelf wat hij in het gesprek heeft gezegd en aangesneden; AI Feedback reageert op die beschrijving en op de onderbouwing.
   - *limitation:* De feedback is gebaseerd op zelfrapportage van de deelnemer en niet op de werkelijke uitvoering in het gesprek, waardoor de consistentie tussen handelen en onderbouwing niet betrouwbaar wordt beoordeeld.
2. **toets: Terugkoppeling op de uitvoering van het transfergesprek in de chatsimulatie van de toetsfase.**
   - *whyNeeded:* De toets vraagt dat de deelnemer opnieuw een aanpak kiest, uitvoert en onderbouwt; beoordeling van de uitvoering vereist dat het gesprek zelf als context beschikbaar is, wat niet is aangetoond.
   - *workaround (partial):* Na het transfergesprek beschrijft en onderbouwt de deelnemer in een Open vraag zijn aanpak en wat hij in het gesprek deed; AI Feedback reageert daarop.
   - *limitation:* De uitvoering in het gesprek zelf wordt niet aantoonbaar beoordeeld; de terugkoppeling steunt op de eigen weergave van de deelnemer.

## Volledige Block Plan-output

```json
{
  "version": "bc-online-block-plan/v1",
  "blueprintVersion": "blueprint-contract/v2",
  "courseShell": {
    "title": "Privégrens respecteren en werkverantwoordelijkheid bewaken",
    "description": "Praktijksimulatie voor leidinggevenden over een gesprek waarin een medewerker een grens aangeeft rond zijn privésituatie, terwijl deadlines en afspraken onder druk staan. De deelnemer voert het gesprek, weegt grens en werkverantwoordelijkheid af en toetst zijn aanpak aan gevalideerde kennis.",
    "estimatedDurationMinutes": null,
    "skjPoints": null,
    "status": "concept"
  },
  "startIntent": {
    "explanationIntent": "Uitleggen dat de deelnemer de rol van teamleider aanneemt in een lopend gesprek, dat er meerdere verdedigbare aanpakken zijn, dat hij zelf een aanpak kiest, uitvoert en onderbouwt, en dat de training verloopt via context, gesprek, reflectie, feedback, bron en een nieuwe situatie.",
    "estimatedDurationMinutes": null,
    "learningGoals": [
      "De deelnemer kan afwegen hoe hij de door een medewerker aangegeven grens rond privéomstandigheden respecteert en tegelijk verantwoordelijkheid houdt voor het werk en het team, en kan zijn gekozen aanpak onderbouwen in het licht van de situatie en de mogelijke consequenties."
    ]
  },
  "plannedBlocks": [
    {
      "id": "blok-1",
      "sequence": 1,
      "certumPhase": "context",
      "catalogBlockId": "certum.bco.tekst",
      "purpose": "De deelnemer kent de situatie: gemiste deadlines, niet nagekomen afspraken, gevolgen voor het team en het zojuist uitgesproken signaal van de medewerker dat er privé veel speelt maar dat hij daar niet over wil praten.",
      "whyThisBlock": "Een korte situatieschets volstaat om de spanning neer te zetten direct voor het gesprek; geen extra media nodig.",
      "configurationIntent": [
        {
          "setting": "situatieschets",
          "intent": "Beschrijven wat de teamleider weet over gemiste deadlines, afspraken en teamgevolgen, en het moment direct nadat de medewerker zijn grens heeft aangegeven."
        },
        {
          "setting": "bewuste onzekerheid",
          "intent": "Niet invullen wat er privé speelt, hoe lang het duurt of hoe de medewerker de gevolgen inschat."
        }
      ]
    },
    {
      "id": "blok-2",
      "sequence": 2,
      "certumPhase": "actie",
      "catalogBlockId": "certum.bco.chat-simulatie",
      "purpose": "De deelnemer voert het vervolg van het lopende gesprek met de medewerker en bepaalt zelf hoe hij omgaat met de grens en met de gevolgen voor werk en team.",
      "whyThisBlock": "Het performancetype is gesprek voeren met open keuze; een AI-rollenspel laat de deelnemer handelen in het moment zonder één juist antwoord op te leggen.",
      "configurationIntent": [
        {
          "setting": "rol fictieve persoon",
          "intent": "De AI speelt de medewerker die zojuist heeft aangegeven niet over zijn privésituatie te willen praten en die grens consequent bewaakt, maar wel reageert op vragen over werk en afspraken."
        },
        {
          "setting": "startmoment",
          "intent": "Het gesprek begint direct na de uitspraak van de medewerker over zijn grens."
        },
        {
          "setting": "gespreksdoel sleutelwoorden",
          "intent": "Niet gebruiken, omdat sleutelwoorden geen professioneel redeneren beoordelen en meerdere routes verdedigbaar zijn."
        },
        {
          "setting": "tijdslimiet",
          "intent": "Ruim instellen of uitlaten zodat de deelnemer zijn gekozen aanpak volledig kan uitvoeren."
        }
      ]
    },
    {
      "id": "blok-3",
      "sequence": 3,
      "certumPhase": "reflectie",
      "catalogBlockId": "certum.bco.open-vraag",
      "purpose": "De deelnemer kijkt terug op zijn gekozen aanpak, beschrijft wat hij wel en niet aansneed, en weegt expliciet de privégrens af tegen werk en team inclusief consequenties voor medewerker, werkrelatie en team.",
      "whyThisBlock": "Een open antwoord maakt de eigen afweging zichtbaar en levert de input waarop AI Feedback kan reageren.",
      "configurationIntent": [
        {
          "setting": "opdracht",
          "intent": "Vragen om een korte weergave van het eigen gespreksverloop, de afweging tussen grens en werkverantwoordelijkheid en de verwachte consequenties."
        },
        {
          "setting": "voorbeeldantwoord",
          "intent": "Geen voorbeeldantwoord tonen dat één route als juist suggereert."
        }
      ]
    },
    {
      "id": "blok-4",
      "sequence": 4,
      "certumPhase": "feedback",
      "catalogBlockId": "certum.bco.ai-feedback",
      "purpose": "De deelnemer krijgt feedback op de omgang met de privégrens, het bewaken van werkverantwoordelijkheid en de onderbouwing van afweging en consequenties.",
      "whyThisBlock": "AI Feedback kan reageren op het eerdere open antwoord en zo inhoudelijk ingaan op de afweging zonder een route als juist aan te wijzen.",
      "configurationIntent": [
        {
          "setting": "bronantwoorden",
          "intent": "Het reflectieantwoord als context meegeven."
        },
        {
          "setting": "feedbackdimensies",
          "intent": "Feedback richten op de drie dimensies uit de Blueprint en op afweging, aansluiting op de situatie, consequenties en uitvoering."
        },
        {
          "setting": "meerdere verdedigbare routes",
          "intent": "Instrueren dat niet de gekozen route wordt beoordeeld maar de aansluiting, de weging van beide kanten, de consequenties en de consistentie tussen beschreven handelen en onderbouwing."
        }
      ]
    },
    {
      "id": "blok-5",
      "sequence": 5,
      "certumPhase": "bron",
      "catalogBlockId": "certum.bco.tekst",
      "purpose": "De deelnemer legt zijn eigen aanpak naast gevalideerde kennis over de handelingsruimte van een leidinggevende rond privéomstandigheden en over methodische principes voor het bespreken van werkafspraken.",
      "whyThisBlock": "Tekstweergave is het eenvoudigste middel om later gevalideerde broninhoud bij SN1 en SN2 te tonen na handelen, reflectie en feedback.",
      "configurationIntent": [
        {
          "setting": "broninhoud",
          "intent": "Later gevalideerde kennis tonen die antwoord geeft op SN1 en SN2; geen inhoud verzinnen voordat validatie heeft plaatsgevonden."
        },
        {
          "setting": "vergelijkingsopdracht",
          "intent": "De deelnemer uitnodigen zijn eigen afweging en uitvoering naast de bron te leggen en te zien wat wordt versterkt of herzien."
        }
      ]
    },
    {
      "id": "blok-6",
      "sequence": 6,
      "certumPhase": "toets",
      "catalogBlockId": "certum.bco.tekst",
      "purpose": "De deelnemer maakt kennis met een nieuwe situatie: een vervolggesprek waarin de gevolgen voor het team groter zijn geworden of teamleden ernaar vragen, terwijl de grens van de medewerker blijft bestaan.",
      "whyThisBlock": "Een korte situatieschets introduceert het nieuwe keuzemoment voor transfer zonder extra middelen.",
      "configurationIntent": [
        {
          "setting": "nieuwe situatie",
          "intent": "De gewijzigde omstandigheden beschrijven ten opzichte van het eerste gesprek, met behoud van de grens van de medewerker."
        }
      ]
    },
    {
      "id": "blok-7",
      "sequence": 7,
      "certumPhase": "toets",
      "catalogBlockId": "certum.bco.chat-simulatie",
      "purpose": "De deelnemer kiest en voert opnieuw een eigen aanpak uit in het vervolggesprek met de medewerker.",
      "whyThisBlock": "Transfer van het handelen in een gesprek wordt het best zichtbaar in hetzelfde gespreksformat, zonder juist-foutbeoordeling.",
      "configurationIntent": [
        {
          "setting": "rol fictieve persoon",
          "intent": "De AI speelt dezelfde medewerker in de nieuwe fase, die zijn privégrens handhaaft terwijl de teamgevolgen groter zijn."
        },
        {
          "setting": "gespreksdoel sleutelwoorden",
          "intent": "Niet gebruiken, omdat meerdere routes verdedigbaar zijn."
        }
      ]
    },
    {
      "id": "blok-8",
      "sequence": 8,
      "certumPhase": "toets",
      "catalogBlockId": "certum.bco.open-vraag",
      "purpose": "De deelnemer onderbouwt zijn aanpak in de nieuwe situatie en maakt zichtbaar welke elementen zijn keuze anders of juist hetzelfde maken, inclusief consequenties.",
      "whyThisBlock": "Een open antwoord maakt transfer van de afweging en onderbouwing zichtbaar en dient als input voor de terugkoppeling.",
      "configurationIntent": [
        {
          "setting": "opdracht",
          "intent": "Vragen om een korte weergave van het gevoerde vervolggesprek, de onderbouwing en de vergelijking met de eerdere keuze."
        }
      ]
    },
    {
      "id": "blok-9",
      "sequence": 9,
      "certumPhase": "toets",
      "catalogBlockId": "certum.bco.ai-feedback",
      "purpose": "De deelnemer krijgt terugkoppeling op zijn transferaanpak op afweging, aansluiting op de situatie, consequenties en onderbouwing.",
      "whyThisBlock": "AI Feedback kan reageren op het toetsantwoord en op de eerdere reflectie, zodat de ontwikkeling in afweging zichtbaar wordt.",
      "configurationIntent": [
        {
          "setting": "bronantwoorden",
          "intent": "Het toetsantwoord en het eerdere reflectieantwoord als context meegeven."
        },
        {
          "setting": "beoordelingsbasis",
          "intent": "Terugkoppelen op afweging, aansluiting op situatie, consequenties en onderbouwing zonder een route als enig juiste te behandelen."
        }
      ]
    }
  ],
  "endIntent": {
    "closingIntent": "De deelnemer sluit af met het besef dat er meerdere verdedigbare aanpakken zijn en dat het gaat om een zichtbare afweging tussen de privégrens van de medewerker en de verantwoordelijkheid voor werk en team, inclusief de consequenties daarvan.",
    "summaryIntent": "Kort terugblikken op de kern van het dilemma en de drie feedbackdimensies: omgaan met de privégrens, bewaken van werkverantwoordelijkheid en onderbouwing van afweging en consequenties.",
    "followUpRecommendation": "Aanraden om de eigen afweging in een volgend praktijkgesprek bewust toe te passen en te bespreken met een collega-leidinggevende of in intervisie."
  },
  "capabilityGaps": [
    {
      "certumPhase": "feedback",
      "need": "Feedback die rechtstreeks reageert op het daadwerkelijk gevoerde gesprek in de chatsimulatie, naast de onderbouwing van de gekozen aanpak.",
      "whyNeeded": "De Blueprint vraagt feedback op zowel het gevoerde gesprek als de onderbouwing, inclusief de consistentie tussen uitvoering en afweging. Niet aangetoond is dat AI Feedback het chatverloop als context ontvangt; alleen antwoorden op eerdere vraagblokken zijn aangetoond.",
      "workaround": {
        "type": "partial",
        "description": "In het reflectieblok (Open vraag) beschrijft de deelnemer zelf wat hij in het gesprek heeft gezegd en aangesneden; AI Feedback reageert op die beschrijving en op de onderbouwing.",
        "limitation": "De feedback is gebaseerd op zelfrapportage van de deelnemer en niet op de werkelijke uitvoering in het gesprek, waardoor de consistentie tussen handelen en onderbouwing niet betrouwbaar wordt beoordeeld."
      }
    },
    {
      "certumPhase": "toets",
      "need": "Terugkoppeling op de uitvoering van het transfergesprek in de chatsimulatie van de toetsfase.",
      "whyNeeded": "De toets vraagt dat de deelnemer opnieuw een aanpak kiest, uitvoert en onderbouwt; beoordeling van de uitvoering vereist dat het gesprek zelf als context beschikbaar is, wat niet is aangetoond.",
      "workaround": {
        "type": "partial",
        "description": "Na het transfergesprek beschrijft en onderbouwt de deelnemer in een Open vraag zijn aanpak en wat hij in het gesprek deed; AI Feedback reageert daarop.",
        "limitation": "De uitvoering in het gesprek zelf wordt niet aantoonbaar beoordeeld; de terugkoppeling steunt op de eigen weergave van de deelnemer."
      }
    }
  ]
}
```

## Feitelijke review-signalen (zonder oordeel)

| Vraag | Waarneming |
| --- | --- |
| 1. Trouw aan de Blueprint? | Ja. Titel en leerdoel (trusted) ongewijzigd; Context, Actie, Reflectie, Feedback, Bron en Toets volgen de learning arc; de drie Feedback-dimensies en de evaluatiegronden komen letterlijk terug. |
| 2. Nieuwe didactische bedoeling? | Nauwelijks. `followUpRecommendation` stelt voor de afweging "te bespreken met een collega-leidinggevende of in intervisie" (staat niet in de Blueprint). De start-uitleg benoemt vooraf dat er meerdere verdedigbare aanpakken zijn. |
| 3. Past ieder blok bij zijn purpose? | Ja; elk `whyThisBlock` verwijst naar de Blueprint (prestatiesoort gesprek, open keuze, input voor AI Feedback). |
| 4. Overbodige of decoratieve blokken? | Geen. Toets heeft 4 blokken (Tekst, Chat simulatie, Open vraag, AI Feedback); de Open vraag is nodig als input voor AI Feedback, omdat het chatverloop niet aantoonbaar als context beschikbaar is (zie gaps). |
| 5. Interactiviteit alleen waar zinvol? | Ja: chat voor het gesprek, open vragen voor afweging en onderbouwing; context en nieuwe situatie als Tekst. |
| 6. Professionele ambiguïteit behouden? | Ja. Actie en Toets bevatten een Chat simulatie (en Toets ook een Open vraag); geen Meerkeuze of formele Toets; sleutelwoorddoelen expliciet niet gebruikt "omdat meerdere routes verdedigbaar zijn"; AI Feedback beoordeelt niet de gekozen route; Reflectie zonder voorbeeldantwoord "dat één route als juist suggereert". |
| 7. Prescribed action behouden? | n.v.t. (open keuze). |
| 8. Bron alleen voorbereid? | Ja: "Later gevalideerde kennis tonen die antwoord geeft op SN1 en SN2; geen inhoud verzinnen voordat validatie heeft plaatsgevonden." |
| 9. configurationIntent op planniveau? | Ja (rol, startmoment, sleutelwoorden, tijdslimiet, opdracht, bronantwoorden, feedbackdimensies). |
| 10. Volledige vragen, dialogen, antwoordopties, feedbacktekst of toetsitems? | Nee. |
| 11. Capabilities correct geïnterpreteerd? | Ja, en precies: Claude ziet dat alleen "antwoorden op eerdere vraagblokken" als AI-Feedback-context zijn aangetoond (niet-aangetoond: `ai_context_buiten_vraagblokken`) en legt dat vast als gap. |
| 12. Capability gap eerlijk behouden? | Ja. 2 gaps (Feedback en Toets: AI Feedback kan het chatverloop niet aantoonbaar gebruiken), elk met een `partial` workaround (zelfrapportage via Open vraag) en een expliciete beperking ("niet op de werkelijke uitvoering"). |
| 13. Logische volgorde als één leerervaring? | Ja: situatie → gesprek → reflectie → feedback → bron → nieuwe situatie → gesprek → onderbouwing → feedback. |
| 14. Proportioneel aantal blokken? | 9 blokken; proportioneel voor zes fasen met een transfergesprek. |
| Fase versus bloktype | Context = Tekst, Actie = Chat simulatie, Reflectie = Open vraag, Feedback = AI Feedback, Bron = Tekst, Toets = Tekst + Chat simulatie + Open vraag + AI Feedback. Dit lijkt op het patroon van de mock, maar elke keuze is gemotiveerd vanuit de Blueprint (gesprek voeren, open keuze) en de catalogusbeperking; geen formeel Toetsblok of Document. |

## Menselijke evaluatie

**Status: `PASS_WITH_NOTES`**

Menselijke review van de baseline training-block-plan/v1.

### Sterk

- De open professionele keuze blijft behouden.
- Actie en Toets gebruiken open uitvoeringsvormen.
- Feedback beoordeelt niet welke route gekozen wordt.
- Geen fictieve capabilities.
- De beperking dat AI Feedback het chatverloop niet als context krijgt, wordt zelfstandig als capability gap benoemd.
- De workaround blijft `partial` en de beperking blijft zichtbaar.
- Geen content creep in de blokken.

### Note

- `followUpRecommendation` introduceert intervisie, terwijl dit niet uit de goedgekeurde Blueprint volgt.
