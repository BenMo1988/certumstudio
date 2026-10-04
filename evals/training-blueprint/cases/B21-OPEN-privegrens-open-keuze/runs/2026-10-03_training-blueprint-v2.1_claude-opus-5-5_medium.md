# B21-OPEN · Run 2026-10-03 · training-blueprint/v2.1 · claude-opus-5-5 · medium

Integratierun voor trusted routebeleid (prompt `training-blueprint/v2.1`, contract `blueprint-contract/v2`), met
precies één poging (`maxRetries: 0`). Configuratie bevroren op commit `6a1ccaf` (architectuur `de1f71d`).

Uitgevoerd via de Server Action `generateBlueprint` op de dev-server (`CERTUM_ANALYSIS_PROVIDER=mock`,
`CERTUM_BLUEPRINT_PROVIDER=claude`), met exact de Analysis V2.1-fixture `CA-006`
(`test/fixtures/v21-ready-analyses.json`). Er is geen analyse door Claude gedaan.

**Status: `PASS`** (menselijk beoordeeld; zie "Menselijke evaluatie").

## Configuratie en metadata

| Veld | Waarde |
| --- | --- |
| rundatum | 2026-10-03 |
| provider | claude |
| model | claude-opus-5-5 |
| effort | medium |
| maxRetries | 0 |
| promptVersion | training-blueprint/v2.1 |
| contractVersion | blueprint-contract/v2 |
| durationMs | 31160 |
| outcome | success |
| invarianten | geen schendingen (Blueprint toegelaten door provider én flow, incl. ambiguïteit = routebeleid) |

## Keten

| Veld | Waarde |
| --- | --- |
| gekozen Analysis-richting | `grens-en-verantwoordelijkheid` |
| trusted routePolicy (Analysis) | `open_choice` |
| afgeleide ambiguity (server) | `multiple_defensible_actions` |
| decisionPoint.routePolicy (server) | `open_choice` |
| actie.routePolicy (server) | `open_choice` |
| successCriteria | 3 |
| assumptions | 1 |
| sourceNeeds | SN1, SN2 |
| Bron sourceNeedRefs | SN1, SN2 |
| Feedback evaluationBasis | afweging, aansluiting_op_situatie, consequenties, uitvoering |
| Toets evaluationBasis | afweging, aansluiting_op_situatie, consequenties, onderbouwing |

**decisionPoint.task:** Bepaal hoe je als teamleider in dit gesprek verder gaat nu de medewerker heeft aangegeven niet over zijn privésituatie te willen praten, voer dat vervolg van het gesprek uit en onderbouw je aanpak in het licht van de grens van de medewerker en de gevolgen voor het team en het werk.

**Succescriteria**
1. De deelnemer voert het vervolg van het gesprek zichtbaar uit op een manier waarin zowel de aangegeven privégrens als de gevolgen voor werk en team aan bod komen.
2. De deelnemer onderbouwt zijn gekozen aanpak door de belangen van de medewerker, het team en het werk expliciet tegen elkaar af te wegen.
3. De deelnemer benoemt de mogelijke consequenties van zijn aanpak voor de medewerker, de werkrelatie en het team.

**Aannames**
1. De simulatie start op het moment direct nadat de medewerker in het lopende gesprek heeft aangegeven niet verder over zijn privésituatie te willen praten. *Reden:* De bron legt het exacte startmoment niet vast; het keuzemoment uit de gekozen richting vraagt om een start waarin de grens al is aangegeven en de teamleider moet reageren.

**sourceNeeds**
- `SN1` (nog_te_bepalen) Welke handelingsruimte en verantwoordelijkheden heeft een leidinggevende wanneer een medewerker privéomstandigheden noemt maar daar niet over wil praten, terwijl het functioneren onder druk staat, en waar liggen de grenzen van wat een leidinggevende mag vragen of bespreken? *Waarom:* De deelnemer moet zijn gekozen aanpak achteraf kunnen toetsen aan gevalideerde kaders over de verhouding tussen privacy van de medewerker en de verantwoordelijkheid van de leidinggevende voor werk en team.
- `SN2` (methodiek) Welke gesprekstechnieken of methodische principes ondersteunen een leidinggevende bij het bespreekbaar maken van werkafspraken en gevolgen voor het team zonder een aangegeven persoonlijke grens te overschrijden? *Waarom:* Om de uitvoering van de eigen gekozen route te kunnen verdiepen en te vergelijken met beproefde manieren om grens en werkverantwoordelijkheid tegelijk te hanteren.

## Volledige gebruikerszichtbare Training Blueprint

```json
{
  "version": "blueprint-contract/v2",
  "title": "Privégrens respecteren en werkverantwoordelijkheid bewaken",
  "targetAudience": "Teamleiders en andere leidinggevenden die medewerkers aansturen.",
  "learningGoal": "De deelnemer kan afwegen hoe hij de door een medewerker aangegeven grens rond privéomstandigheden respecteert en tegelijk verantwoordelijkheid houdt voor het werk en het team, en kan zijn gekozen aanpak onderbouwen in het licht van de situatie en de mogelijke consequenties.",
  "professionalDilemma": "De teamleider staat voor de vraag hoe hij de door de medewerker aangegeven grens rond zijn privésituatie respecteert, terwijl hij tegelijk verantwoordelijkheid houdt voor de gemiste deadlines, niet nagekomen afspraken en de gevolgen daarvan voor het team en het werk.",
  "selectedDirectionId": "grens-en-verantwoordelijkheid",
  "sourceRefs": [
    "S2",
    "S3"
  ],
  "participantRole": "Teamleider die een medewerker aanstuurt en met hem in gesprek is over gemiste deadlines en niet nagekomen afspraken.",
  "scenarioPremise": "Een teamleider merkt dat een medewerker de afgelopen maand meerdere deadlines heeft gemist en afspraken niet altijd nakomt. In een gesprek hierover zegt de medewerker dat er privé veel speelt, maar dat hij daar op het werk niet verder over wil praten. De teamleider wil respectvol omgaan met die grens, maar moet ook iets doen met de gevolgen voor het team en het werk. De simulatie start direct nadat de medewerker deze grens heeft aangegeven, terwijl het gesprek nog loopt.",
  "decisionPoint": {
    "task": "Bepaal hoe je als teamleider in dit gesprek verder gaat nu de medewerker heeft aangegeven niet over zijn privésituatie te willen praten, voer dat vervolg van het gesprek uit en onderbouw je aanpak in het licht van de grens van de medewerker en de gevolgen voor het team en het werk.",
    "routePolicy": "open_choice"
  },
  "ambiguity": "multiple_defensible_actions",
  "successCriteria": [
    "De deelnemer voert het vervolg van het gesprek zichtbaar uit op een manier waarin zowel de aangegeven privégrens als de gevolgen voor werk en team aan bod komen.",
    "De deelnemer onderbouwt zijn gekozen aanpak door de belangen van de medewerker, het team en het werk expliciet tegen elkaar af te wegen.",
    "De deelnemer benoemt de mogelijke consequenties van zijn aanpak voor de medewerker, de werkrelatie en het team."
  ],
  "assumptions": [
    {
      "assumption": "De simulatie start op het moment direct nadat de medewerker in het lopende gesprek heeft aangegeven niet verder over zijn privésituatie te willen praten.",
      "reason": "De bron legt het exacte startmoment niet vast; het keuzemoment uit de gekozen richting vraagt om een start waarin de grens al is aangegeven en de teamleider moet reageren."
    }
  ],
  "sourceNeeds": [
    {
      "id": "SN1",
      "question": "Welke handelingsruimte en verantwoordelijkheden heeft een leidinggevende wanneer een medewerker privéomstandigheden noemt maar daar niet over wil praten, terwijl het functioneren onder druk staat, en waar liggen de grenzen van wat een leidinggevende mag vragen of bespreken?",
      "sourceType": "nog_te_bepalen",
      "whyNeeded": "De deelnemer moet zijn gekozen aanpak achteraf kunnen toetsen aan gevalideerde kaders over de verhouding tussen privacy van de medewerker en de verantwoordelijkheid van de leidinggevende voor werk en team."
    },
    {
      "id": "SN2",
      "question": "Welke gesprekstechnieken of methodische principes ondersteunen een leidinggevende bij het bespreekbaar maken van werkafspraken en gevolgen voor het team zonder een aangegeven persoonlijke grens te overschrijden?",
      "sourceType": "methodiek",
      "whyNeeded": "Om de uitvoering van de eigen gekozen route te kunnen verdiepen en te vergelijken met beproefde manieren om grens en werkverantwoordelijkheid tegelijk te hanteren."
    }
  ],
  "learningArc": {
    "context": {
      "participantKnows": "Dat de medewerker de afgelopen maand meerdere deadlines heeft gemist en afspraken niet altijd nakomt, dat dit gevolgen heeft voor team en werk, en dat de medewerker zojuist heeft gezegd dat er privé veel speelt maar dat hij daar op het werk niet verder over wil praten.",
      "deliberatelyUnknown": "Wat er privé speelt, hoe lang het nog duurt en hoe de medewerker zelf de gevolgen voor zijn werk inschat; die onzekerheid blijft bestaan.",
      "tensionArises": "Tussen het willen respecteren van de door de medewerker aangegeven grens en de verantwoordelijkheid van de teamleider om iets te doen met de gemiste deadlines, niet nagekomen afspraken en de gevolgen voor het team."
    },
    "actie": {
      "participantMust": "Zelf een aanpak kiezen voor het vervolg van het gesprek en die uitvoeren in reactie op de medewerker, waarbij de deelnemer bepaalt hoe hij omgaat met de aangegeven grens en wat hij doet met de gevolgen voor werk en team.",
      "performanceType": "gesprek_voeren",
      "routePolicy": "open_choice"
    },
    "reflectie": {
      "looksBackOn": "De eigen gekozen aanpak in het gesprek: wat de deelnemer wel en niet heeft aangesneden, hoe hij op de grens van de medewerker reageerde en welke ruimte of afspraken hij rond het werk heeft gecreëerd.",
      "explicitTradeOff": "Hoe de deelnemer het respecteren van de privégrens heeft gewogen tegen zijn verantwoordelijkheid voor het werk en het team, en welke consequenties hij daarbij voor medewerker, werkrelatie en team heeft meegenomen of laten liggen."
    },
    "feedback": {
      "respondsTo": "Zowel het gevoerde gesprek als de onderbouwing van de gekozen aanpak: hoe zorgvuldig de grens is gehanteerd, hoe helder werkverantwoordelijkheid is bewaakt en hoe consistent het handelen is met de uitgesproken afweging.",
      "dimensions": [
        "Omgaan met de aangegeven privégrens van de medewerker",
        "Bewaken van werkverantwoordelijkheid en gevolgen voor het team",
        "Onderbouwing van de afweging en de consequenties"
      ],
      "evaluationBasis": [
        "afweging",
        "aansluiting_op_situatie",
        "consequenties",
        "uitvoering"
      ],
      "multipleDefensibleHandling": "Verschillende routes kunnen verdedigbaar zijn; feedback beoordeelt niet welke route is gekozen, maar of de aanpak aansluit op de situatie, of beide kanten van het dilemma zichtbaar zijn meegewogen, of de consequenties zijn doordacht en of de uitvoering in het gesprek overeenkomt met de onderbouwing."
    },
    "bron": {
      "learningIntent": "Na handelen, reflectie en feedback legt de deelnemer zijn eigen gekozen aanpak naast gevalideerde kennis over de handelingsruimte van een leidinggevende rond privéomstandigheden en over methodische principes voor het bespreken van werkafspraken, zodat hij ziet welke onderdelen van zijn afweging en uitvoering worden versterkt of herzien.",
      "sourceNeedRefs": [
        "SN1",
        "SN2"
      ]
    },
    "toets": {
      "demonstrate": "Dat de deelnemer opnieuw een eigen aanpak kan kiezen, uitvoeren en onderbouwen waarin een door een medewerker aangegeven grens en de verantwoordelijkheid voor werk en team beide worden gewogen.",
      "transferEvidence": "De deelnemer past zijn afweging aan op gewijzigde omstandigheden en maakt in de onderbouwing zichtbaar welke elementen van de nieuwe situatie zijn keuze anders of juist hetzelfde maken.",
      "newDecisionPoint": "Een vergelijkbaar keuzemoment met de teamleider in een andere fase, bijvoorbeeld een vervolggesprek waarin de gevolgen voor het team inmiddels groter zijn geworden of teamleden ernaar vragen, terwijl de grens van de medewerker blijft bestaan.",
      "evaluationBasis": [
        "afweging",
        "aansluiting_op_situatie",
        "consequenties",
        "onderbouwing"
      ]
    }
  }
}
```

## Feitelijke controle (zonder oordeel)

| Vraag | Waarneming |
| --- | --- |
| 1. Toch één gespreksroute ingebouwd? | Nee. `decisionPoint.task`: "Bepaal hoe je als teamleider in dit gesprek verder gaat …, voer dat vervolg van het gesprek uit en onderbouw je aanpak in het licht van de grens van de medewerker en de gevolgen voor het team en het werk." Geen volgorde (erkennen → werk) en geen oplossing. Actie: "Zelf een aanpak kiezen voor het vervolg van het gesprek en die uitvoeren". |
| 2. Direct terug naar werk én eerst ruimte geven / later terugkomen mogelijk? | Conceptueel ja. Task en Actie leggen timing en volgorde niet vast; Reflectie kijkt terug op "welke ruimte of afspraken hij rond het werk heeft gecreëerd". De routes worden niet bij naam genoemd. |
| 3. Succescriteria route-neutraal? | Ja, in de zin dat geen route of volgorde wordt voorgeschreven. Criterium 1 vraagt dat "zowel de aangegeven privégrens als de gevolgen voor werk en team aan bod komen" in het vervolg van het gesprek; bij een route "eerst ruimte geven, later terugkomen" moet het werkonderwerp dus in dit gesprek wel ter sprake komen (bijv. als afspraak voor later). Criteria 2 en 3 gaan over afweging en consequenties. Het V2-patroon "zonder door te vragen … vervolgens gericht op het werkgedrag" komt niet meer voor. |
| 4. Feedback route-neutraal? | Ja. evaluationBasis: afweging, aansluiting_op_situatie, consequenties, uitvoering; "feedback beoordeelt niet welke route is gekozen". |
| 5. Toets route-neutraal? | Ja. "opnieuw een eigen aanpak kan kiezen, uitvoeren en onderbouwen"; evaluationBasis zonder voorgeschreven_handeling. Het nieuwe keuzemoment (vervolggesprek, "teamleden ernaar vragen") is een variatie voor transfer, geen bronfeit. |
| 6. Spanning privégrens ↔ werkverantwoordelijkheid intact? | Ja, in Context (tensionArises), Reflectie, Feedback-dimensies en succescriteria. |
| 7. Content of ontwerpintentie? | Ontwerpintentie; geen dialogen, antwoordopties of toetsvragen. |
| Overig | Trusted leerdoel is het route-neutrale V2.1-leerdoel; de V2-volgorde uit BP-002 zit daardoor niet meer in leerdoel, succescriteria of Toets. Geen diagnose, arbeidsrecht of nieuwe bronfeiten. Bron: SN1, SN2, beide gebruikt. Geen BC Online-bloknamen (een automatische treffer op "chat" bleek het woord "inschat"). |

## Menselijke evaluatie

**Status: `PASS`**

Menselijke review van de integratierun training-blueprint/v2.1.

De keten Analysis `open_choice` → Blueprint `multiple_defensible_actions` → decisionPoint `open_choice` → Actie
`open_choice` blijft inhoudelijk consistent.

Het oorspronkelijke BP-002-probleem is opgelost:

- geen voorgeschreven volgorde in het learningGoal;
- geen voorgeschreven route in het decisionPoint;
- geen voorgeschreven route in Actie;
- succescriteria beoordelen beide belangen en de kwaliteit van de gekozen aanpak;
- Feedback beoordeelt niet welke route gekozen werd;
- Toets vraagt opnieuw om een eigen professionele afweging.
