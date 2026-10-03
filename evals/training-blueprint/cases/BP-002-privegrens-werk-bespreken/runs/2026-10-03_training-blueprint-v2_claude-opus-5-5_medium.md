# BP-002 · Run 2026-10-03 · training-blueprint/v2 · claude-opus-5-5 · medium

Baseline-run van Blueprint Contract V2 (prompt `training-blueprint/v2`, contract `blueprint-contract/v2`), met precies
één poging (`maxRetries: 0`). Configuratie bevroren op commit `a515e3a`.

Uitgevoerd via de Server Action `generateBlueprint` op de dev-server (`CERTUM_BLUEPRINT_PROVIDER=claude`,
`CERTUM_ANALYSIS_PROVIDER=mock`), met de bestaande synthetische input van CA-006, de bestaande V2-analyse
(`ready`) uit de baseline en de vooraf vastgelegde richting. Alle server-side poorten zijn doorlopen. Er is geen nieuwe
analyse gedaan.

**Status: `PASS_WITH_NOTES`** (menselijk beoordeeld; zie "Menselijke evaluatie").

## Configuratie en metadata

Overgenomen uit de metadata-logregel `certum.blueprint_generation` van deze run en uit de Blueprint.

| Veld | Waarde |
| --- | --- |
| rundatum | 2026-10-03 |
| provider | claude |
| model | claude-opus-5-5 |
| effort | medium |
| maxRetries | 0 |
| promptVersion | training-blueprint/v2 |
| contractVersion | blueprint-contract/v2 |
| inputKind | casus |
| durationMs | 22661 |
| outcome | success |
| ambiguity | multiple_defensible_actions |
| decisionPoint.routePolicy (server) | open_choice |
| actie.routePolicy (server) | open_choice |
| successCriteria | 3 |
| assumptions | 1 |
| sourceNeeds | 2 |
| sourceNeed ids | SN1, SN2 |
| Bron sourceNeedRefs | SN1, SN2 |
| Feedback evaluationBasis | afweging, aansluiting_op_situatie, uitvoering, onderbouwing |
| Toets evaluationBasis | afweging, aansluiting_op_situatie, uitvoering, onderbouwing |
| invarianten | geen schendingen (Blueprint toegelaten door provider én flow) |
| fout | geen |

Tokengebruik en kosten werden voor deze run niet geregistreerd.

**decisionPoint.task:** De deelnemer reageert in het lopende gesprek op de mededeling van de medewerker dat er privé veel speelt en dat hij daar niet verder over wil praten, en bepaalt hoe hij het gesprek over de gemiste deadlines en niet nagekomen afspraken voortzet.

## Trusted context en afgeleide velden (server-side, niet door Claude gegenereerd)

| Veld | Waarde | Herkomst |
| --- | --- | --- |
| version | `blueprint-contract/v2` | contract |
| selectedDirectionId | `grens-respecteren-en-werk-bespreken` | gekozen richting |
| learningGoal | De deelnemer kan de door een medewerker aangegeven privégrens erkennen en het gesprek daarna gericht houden op het werkgedrag en de gemaakte afspraken. | voorgesteld leerdoel van de richting |
| professionalDilemma | Hoe respecteert de teamleider de door de medewerker aangegeven grens rond privéomstandigheden, terwijl hij tegelijkertijd de gemiste deadlines en niet nagekomen afspraken bespreekbaar maakt en de gevolgen voor team en werk aanpakt? | V2-analyse |
| targetAudience | Leidinggevenden en teamleiders die medewerkers aansturen. | V2-analyse |
| sourceRefs | `S2`, `S3` | sourceRefs van de richting |
| decisionPoint.routePolicy, actie.routePolicy | `open_choice` | afgeleid uit `ambiguity` |

Controle: deze waarden zijn identiek aan de V2-analyse en de gekozen richting (ja).

## Door Claude ontworpen (Blueprint-ontwerp)

```json
{
  "title": "Privégrens erkennen en het gesprek over werkafspraken voortzetten",
  "participantRole": "Teamleider die in gesprek is met een medewerker over gemiste deadlines en niet nagekomen afspraken.",
  "scenarioPremise": "Een teamleider heeft gemerkt dat een medewerker de afgelopen maand meerdere deadlines heeft gemist en afspraken niet altijd nakomt. In een gesprek hierover zegt de medewerker dat er privé veel speelt, maar dat hij daar op het werk niet verder over wil praten. De teamleider wil respectvol omgaan met die grens, maar moet ook iets doen met de gevolgen voor het team en het werk. De simulatie start direct na de mededeling van de medewerker.",
  "decisionPoint": {
    "task": "De deelnemer reageert in het lopende gesprek op de mededeling van de medewerker dat er privé veel speelt en dat hij daar niet verder over wil praten, en bepaalt hoe hij het gesprek over de gemiste deadlines en niet nagekomen afspraken voortzet."
  },
  "ambiguity": "multiple_defensible_actions",
  "successCriteria": [
    "De deelnemer reageert in het gesprek zichtbaar op de door de medewerker aangegeven privégrens zonder door te vragen naar de privéomstandigheden.",
    "De deelnemer houdt het gesprek vervolgens aantoonbaar gericht op het werkgedrag, de gemiste deadlines en de niet nagekomen afspraken.",
    "De deelnemer onderbouwt de gekozen reactie door de belangen van de medewerker, het team en het werk tegen elkaar af te wegen."
  ],
  "assumptions": [
    {
      "assumption": "De simulatie start op het moment direct nadat de medewerker heeft gezegd dat er privé veel speelt en dat hij daar niet verder over wil praten.",
      "reason": "Het keuzemoment van deze richting ligt bij de reactie op die mededeling; een vast startmoment is nodig voor een samenhangend ontwerp."
    }
  ],
  "sourceNeeds": [
    {
      "id": "SN1",
      "question": "Welke inzichten bestaan er over hoe een leidinggevende een door een medewerker aangegeven privégrens kan erkennen en tegelijk werkafspraken en prestaties bespreekbaar kan houden?",
      "sourceType": "methodiek",
      "whyNeeded": "Om de eigen gesprekskeuze van de deelnemer na het handelen te kunnen spiegelen aan gevalideerde gesprekskennis over grenzen respecteren en werkgedrag bespreken."
    },
    {
      "id": "SN2",
      "question": "Welke ruimte en verantwoordelijkheid heeft een leidinggevende rond privéomstandigheden van medewerkers die het functioneren raken, en waar liggen grenzen aan het bevragen daarvan?",
      "sourceType": "nog_te_bepalen",
      "whyNeeded": "Om de afweging tussen privacy van de medewerker en verantwoordelijkheid voor team en werk te kunnen onderbouwen zonder zelf een normatief kader vast te stellen."
    }
  ],
  "learningArc": {
    "context": {
      "participantKnows": "Dat de medewerker de afgelopen maand meerdere deadlines heeft gemist en afspraken niet altijd nakomt, dat dit gevolgen heeft voor team en werk, en dat de medewerker zojuist heeft aangegeven dat er privé veel speelt en hij daar op het werk niet verder over wil praten.",
      "deliberatelyUnknown": "Wat er privé speelt, of er eerder gesprekken of afspraken over dit patroon zijn geweest, en hoe de medewerker zal reageren op de voortzetting van het gesprek.",
      "tensionArises": "Op het moment dat de teamleider de grens van de medewerker wil respecteren en tegelijk de gevolgen van het gemiste werk niet onbesproken kan laten."
    },
    "actie": {
      "participantMust": "In het gesprek zelf een reactie kiezen en uitvoeren op de aangegeven grens en het gesprek over het werkgedrag en de afspraken op een eigen gekozen manier voortzetten.",
      "performanceType": "gesprek_voeren"
    },
    "reflectie": {
      "looksBackOn": "De eigen reactie op de mededeling van de medewerker en de manier waarop het gesprek daarna over werk en afspraken is voortgezet.",
      "explicitTradeOff": "Hoe de deelnemer het respecteren van de privégrens heeft afgewogen tegen de noodzaak om gemiste deadlines, niet nagekomen afspraken en de gevolgen voor het team te bespreken, en wat die keuze voor de medewerker en het team betekent."
    },
    "feedback": {
      "respondsTo": "Zowel het zichtbare gesprekshandelen na de mededeling als de afweging die de deelnemer daarbij maakt tussen grens, werk en team.",
      "dimensions": [
        "Omgang met de aangegeven privégrens",
        "Gerichtheid op werkgedrag en afspraken",
        "Onderbouwing van de afweging tussen belangen van medewerker, team en werk"
      ],
      "evaluationBasis": [
        "afweging",
        "aansluiting_op_situatie",
        "uitvoering",
        "onderbouwing"
      ],
      "multipleDefensibleHandling": "Feedback beoordeelt niet welke gespreksroute gekozen is, maar of de gekozen route de grens van de medewerker serieus neemt, het werkgedrag en de afspraken bespreekbaar houdt, past bij de situatie en consistent wordt onderbouwd."
    },
    "bron": {
      "learningIntent": "Na handelen, reflectie en feedback koppelt de deelnemer gevalideerde kennis over gesprekvoering en over de ruimte rond privéomstandigheden aan de eigen gekozen reactie, om te zien welke elementen van die keuze worden versterkt of genuanceerd.",
      "sourceNeedRefs": [
        "SN1",
        "SN2"
      ]
    },
    "toets": {
      "demonstrate": "Opnieuw een privégrens van een medewerker erkennen en het gesprek gericht houden op werkgedrag en afspraken, met een onderbouwde afweging.",
      "transferEvidence": "De deelnemer past de afweging toe in een gewijzigde situatie en laat zien hoe de reactie en onderbouwing worden aangepast aan de nieuwe omstandigheden.",
      "newDecisionPoint": "Een vergelijkbaar gesprek met een medewerker die werkafspraken niet nakomt en een grens aangeeft rond persoonlijke omstandigheden, waarbij de omstandigheden verschillen, bijvoorbeeld een grotere impact op collega's of een medewerker die later in het gesprek zelf meer wil delen.",
      "evaluationBasis": [
        "afweging",
        "aansluiting_op_situatie",
        "uitvoering",
        "onderbouwing"
      ]
    }
  }
}
```

## Volledige gebruikerszichtbare Training Blueprint

```json
{
  "version": "blueprint-contract/v2",
  "title": "Privégrens erkennen en het gesprek over werkafspraken voortzetten",
  "targetAudience": "Leidinggevenden en teamleiders die medewerkers aansturen.",
  "learningGoal": "De deelnemer kan de door een medewerker aangegeven privégrens erkennen en het gesprek daarna gericht houden op het werkgedrag en de gemaakte afspraken.",
  "professionalDilemma": "Hoe respecteert de teamleider de door de medewerker aangegeven grens rond privéomstandigheden, terwijl hij tegelijkertijd de gemiste deadlines en niet nagekomen afspraken bespreekbaar maakt en de gevolgen voor team en werk aanpakt?",
  "selectedDirectionId": "grens-respecteren-en-werk-bespreken",
  "sourceRefs": [
    "S2",
    "S3"
  ],
  "participantRole": "Teamleider die in gesprek is met een medewerker over gemiste deadlines en niet nagekomen afspraken.",
  "scenarioPremise": "Een teamleider heeft gemerkt dat een medewerker de afgelopen maand meerdere deadlines heeft gemist en afspraken niet altijd nakomt. In een gesprek hierover zegt de medewerker dat er privé veel speelt, maar dat hij daar op het werk niet verder over wil praten. De teamleider wil respectvol omgaan met die grens, maar moet ook iets doen met de gevolgen voor het team en het werk. De simulatie start direct na de mededeling van de medewerker.",
  "decisionPoint": {
    "task": "De deelnemer reageert in het lopende gesprek op de mededeling van de medewerker dat er privé veel speelt en dat hij daar niet verder over wil praten, en bepaalt hoe hij het gesprek over de gemiste deadlines en niet nagekomen afspraken voortzet.",
    "routePolicy": "open_choice"
  },
  "ambiguity": "multiple_defensible_actions",
  "successCriteria": [
    "De deelnemer reageert in het gesprek zichtbaar op de door de medewerker aangegeven privégrens zonder door te vragen naar de privéomstandigheden.",
    "De deelnemer houdt het gesprek vervolgens aantoonbaar gericht op het werkgedrag, de gemiste deadlines en de niet nagekomen afspraken.",
    "De deelnemer onderbouwt de gekozen reactie door de belangen van de medewerker, het team en het werk tegen elkaar af te wegen."
  ],
  "assumptions": [
    {
      "assumption": "De simulatie start op het moment direct nadat de medewerker heeft gezegd dat er privé veel speelt en dat hij daar niet verder over wil praten.",
      "reason": "Het keuzemoment van deze richting ligt bij de reactie op die mededeling; een vast startmoment is nodig voor een samenhangend ontwerp."
    }
  ],
  "sourceNeeds": [
    {
      "id": "SN1",
      "question": "Welke inzichten bestaan er over hoe een leidinggevende een door een medewerker aangegeven privégrens kan erkennen en tegelijk werkafspraken en prestaties bespreekbaar kan houden?",
      "sourceType": "methodiek",
      "whyNeeded": "Om de eigen gesprekskeuze van de deelnemer na het handelen te kunnen spiegelen aan gevalideerde gesprekskennis over grenzen respecteren en werkgedrag bespreken."
    },
    {
      "id": "SN2",
      "question": "Welke ruimte en verantwoordelijkheid heeft een leidinggevende rond privéomstandigheden van medewerkers die het functioneren raken, en waar liggen grenzen aan het bevragen daarvan?",
      "sourceType": "nog_te_bepalen",
      "whyNeeded": "Om de afweging tussen privacy van de medewerker en verantwoordelijkheid voor team en werk te kunnen onderbouwen zonder zelf een normatief kader vast te stellen."
    }
  ],
  "learningArc": {
    "context": {
      "participantKnows": "Dat de medewerker de afgelopen maand meerdere deadlines heeft gemist en afspraken niet altijd nakomt, dat dit gevolgen heeft voor team en werk, en dat de medewerker zojuist heeft aangegeven dat er privé veel speelt en hij daar op het werk niet verder over wil praten.",
      "deliberatelyUnknown": "Wat er privé speelt, of er eerder gesprekken of afspraken over dit patroon zijn geweest, en hoe de medewerker zal reageren op de voortzetting van het gesprek.",
      "tensionArises": "Op het moment dat de teamleider de grens van de medewerker wil respecteren en tegelijk de gevolgen van het gemiste werk niet onbesproken kan laten."
    },
    "actie": {
      "participantMust": "In het gesprek zelf een reactie kiezen en uitvoeren op de aangegeven grens en het gesprek over het werkgedrag en de afspraken op een eigen gekozen manier voortzetten.",
      "performanceType": "gesprek_voeren",
      "routePolicy": "open_choice"
    },
    "reflectie": {
      "looksBackOn": "De eigen reactie op de mededeling van de medewerker en de manier waarop het gesprek daarna over werk en afspraken is voortgezet.",
      "explicitTradeOff": "Hoe de deelnemer het respecteren van de privégrens heeft afgewogen tegen de noodzaak om gemiste deadlines, niet nagekomen afspraken en de gevolgen voor het team te bespreken, en wat die keuze voor de medewerker en het team betekent."
    },
    "feedback": {
      "respondsTo": "Zowel het zichtbare gesprekshandelen na de mededeling als de afweging die de deelnemer daarbij maakt tussen grens, werk en team.",
      "dimensions": [
        "Omgang met de aangegeven privégrens",
        "Gerichtheid op werkgedrag en afspraken",
        "Onderbouwing van de afweging tussen belangen van medewerker, team en werk"
      ],
      "evaluationBasis": [
        "afweging",
        "aansluiting_op_situatie",
        "uitvoering",
        "onderbouwing"
      ],
      "multipleDefensibleHandling": "Feedback beoordeelt niet welke gespreksroute gekozen is, maar of de gekozen route de grens van de medewerker serieus neemt, het werkgedrag en de afspraken bespreekbaar houdt, past bij de situatie en consistent wordt onderbouwd."
    },
    "bron": {
      "learningIntent": "Na handelen, reflectie en feedback koppelt de deelnemer gevalideerde kennis over gesprekvoering en over de ruimte rond privéomstandigheden aan de eigen gekozen reactie, om te zien welke elementen van die keuze worden versterkt of genuanceerd.",
      "sourceNeedRefs": [
        "SN1",
        "SN2"
      ]
    },
    "toets": {
      "demonstrate": "Opnieuw een privégrens van een medewerker erkennen en het gesprek gericht houden op werkgedrag en afspraken, met een onderbouwde afweging.",
      "transferEvidence": "De deelnemer past de afweging toe in een gewijzigde situatie en laat zien hoe de reactie en onderbouwing worden aangepast aan de nieuwe omstandigheden.",
      "newDecisionPoint": "Een vergelijkbaar gesprek met een medewerker die werkafspraken niet nakomt en een grens aangeeft rond persoonlijke omstandigheden, waarbij de omstandigheden verschillen, bijvoorbeeld een grotere impact op collega's of een medewerker die later in het gesprek zelf meer wil delen.",
      "evaluationBasis": [
        "afweging",
        "aansluiting_op_situatie",
        "uitvoering",
        "onderbouwing"
      ]
    }
  }
}
```

## Feitelijke signalen (zonder oordeel)

| Vraag | Waarneming |
| --- | --- |
| 1. Binnen de gekozen richting? | Ja. Reactie op de uitgesproken privégrens, zonder het werkgesprek los te laten (S2, S3). |
| 2. Betekenisvolle trusted context aanwezig? | Ja. Gemiste deadlines, de grens van de medewerker en de gevolgen voor team en werk staan in premise en Context. |
| 3. Aanname sluit trusted context uit? | Nee. De enige aanname gaat over het startmoment. |
| 4. Eén helder hoofdkeuzemoment? | Ja: de reactie direct na de mededeling. |
| 5. decisionPoint.task open? | Grotendeels. "reageert … op de mededeling … en bepaalt hoe hij het gesprek over de gemiste deadlines en niet nagekomen afspraken voortzet". Het schrijft niet meer "erkennen → terug naar werk" voor en laat de vorm open. Wel staat vast dat het werkgesprek wordt voortgezet; dat volgt uit de focus van de richting. |
| 6. Actie open? | Ja. "een reactie kiezen en uitvoeren … en het gesprek … op een eigen gekozen manier voortzetten". |
| 7. Feedback beoordeelt afweging en uitvoering? | Ja. evaluationBasis: afweging, aansluiting_op_situatie, uitvoering, onderbouwing; "Feedback beoordeelt niet welke gespreksroute gekozen is". De concrete routes (direct terug naar werk vs. eerst ruimte geven en later terugkomen) worden, anders dan in V1, niet benoemd. |
| 8. Toets bewaart de ambiguïteit? | Gedeeltelijk. evaluationBasis is route-neutraal, maar demonstrate herhaalt "een privégrens … erkennen en het gesprek gericht houden op werkgedrag en afspraken": de formulering van het (trusted) leerdoel. |
| 9. Toets gericht op transfer? | Ja: een vergelijkbaar gesprek met andere omstandigheden (grotere impact op collega's, of een medewerker die later wel meer wil delen). |
| 10. Bron alleen intentie + geldige refs? | Ja. learningIntent zonder kennisvragen; sourceNeedRefs SN1, SN2. |
| 11. Bestaan alle Bron-refs? | Ja. |
| 12. Alle sourceNeeds gebruikt? | Ja (SN1, SN2). |
| 13. Nieuwe kennisbehoefte buiten sourceNeeds? | Nee. Geen derde kennisvraag; learningIntent noemt alleen de onderwerpen van SN1 en SN2. |
| 14. Assumptions noodzakelijk? | 1: het startmoment. Ontwerpnoodzakelijk; staat ook in scenarioPremise als "De simulatie start direct na de mededeling". |
| 15. sourceNeeds noodzakelijk? | 2. SN1 (methodiek, grens erkennen en werk bespreekbaar houden) en SN2 (nog_te_bepalen, ruimte en verantwoordelijkheid van de leidinggevende). |
| 16. Lijsten tot het maximum gevuld? | successCriteria 3 (max), feedback.dimensions 3 (max). assumptions 1, sourceNeeds 2. |
| 17. Concrete ongevalideerde bronnen, wetten of methodieken als feit? | Nee. |
| 18. BC Online-bloknamen? | Nee. |
| 19. Eindcontent in plaats van ontwerpintentie? | Nee. |
| Casus: ambiguity | `multiple_defensible_actions`. |
| Casus: routePolicy | `open_choice` in keuzemoment en Actie (server-side afgeleid). |
| Casus: task schrijft niet opnieuw "erken grens → bespreek werk" voor | Ja, task schrijft dit niet meer voor. |
| Casus: Actie schrijft geen route voor | Ja. |
| Casus: routes blijven verdedigbaar | Impliciet. Task en Actie laten de vorm en volgorde open. Succescriterium 1 ("zonder door te vragen naar de privéomstandigheden") en 2 ("houdt het gesprek vervolgens aantoonbaar gericht op het werkgedrag") leggen wel een route en volgorde vast: erkennen, niet doorvragen, daarna werk. |
| Casus: Feedback en Toets beoordelen afweging en uitvoering | Feedback ja. Toets: evaluationBasis ja; demonstrate volgt de formulering van het leerdoel. |
| Overig | De titel ("Privégrens erkennen en het gesprek over werkafspraken voortzetten") en succescriteria 1-2 volgen de volgorde uit het trusted leerdoel ("… erkennen en het gesprek daarna gericht houden op het werkgedrag …"). De voorgeschreven volgorde zit dus (ook) in het trusted leerdoel uit de analyse, niet alleen in het ontwerp. |

## Menselijke evaluatie

**Status: `PASS_WITH_NOTES`**

Menselijke review van de baseline training-blueprint/v2.

Blueprint V2 heeft het Blueprint-probleem opgelost:

- `decisionPoint.task` schrijft niet langer één route voor.
- Actie laat de uitvoering open.
- `routePolicy` is `open_choice`.
- Feedback beoordeelt meerdere routes en niet één verplichte route.
- sourceNeeds en Bron zijn volledig consistent.

### Aandachtspunt (geen Blueprint V2-fout)

Het resterende voorschrift in successCriteria en Toets wordt niet als Blueprint V2-fout geregistreerd. Het trusted
leerdoel uit Analysis V2 bevat zelf een handelingsvolgorde: de grens erkennen en het gesprek daarna op het werk gericht
houden. Blueprint V2 mag dit trusted leerdoel niet herschrijven en volgt dus terecht die inhoud.

Geregistreerd als upstream Analysis/TrainingDirection-bevinding **route-prescriptive learning goal** (zie de README).
