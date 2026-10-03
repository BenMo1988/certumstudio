# BP-003 · Run 2026-10-03 · training-blueprint/v2 · claude-opus-5-5 · medium

Baseline-run van Blueprint Contract V2 (prompt `training-blueprint/v2`, contract `blueprint-contract/v2`), met precies
één poging (`maxRetries: 0`). Configuratie bevroren op commit `a515e3a`.

Uitgevoerd via de Server Action `generateBlueprint` op de dev-server (`CERTUM_BLUEPRINT_PROVIDER=claude`,
`CERTUM_ANALYSIS_PROVIDER=mock`), met de bestaande synthetische input van CA-008, de bestaande V2-analyse
(`ready`) uit de baseline en de vooraf vastgelegde richting. Alle server-side poorten zijn doorlopen. Er is geen nieuwe
analyse gedaan.

**Status: `PASS`** (menselijk beoordeeld; zie "Menselijke evaluatie").

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
| durationMs | 28987 |
| outcome | success |
| ambiguity | multiple_defensible_actions |
| decisionPoint.routePolicy (server) | open_choice |
| actie.routePolicy (server) | open_choice |
| successCriteria | 3 |
| assumptions | 1 |
| sourceNeeds | 2 |
| sourceNeed ids | SN1, SN2 |
| Bron sourceNeedRefs | SN1, SN2 |
| Feedback evaluationBasis | afweging, aansluiting_op_situatie, onderbouwing, consequenties |
| Toets evaluationBasis | afweging, aansluiting_op_situatie, onderbouwing, consequenties |
| invarianten | geen schendingen (Blueprint toegelaten door provider én flow) |
| fout | geen |

Tokengebruik en kosten werden voor deze run niet geregistreerd.

**decisionPoint.task:** Bepaal op de dag vóór het gezinsgesprek welke volgorde van contacten je kiest ten aanzien van school en het gezin, en licht toe waarom je deze volgorde kiest gezien de situatie.

## Trusted context en afgeleide velden (server-side, niet door Claude gegenereerd)

| Veld | Waarde | Herkomst |
| --- | --- | --- |
| version | `blueprint-contract/v2` | contract |
| selectedDirectionId | `volgorde-vervolgcontact` | gekozen richting |
| learningGoal | De deelnemer kan de voor- en nadelen van eerst school benaderen versus eerst het gezin spreken tegen elkaar afwegen en een gemotiveerde keuze maken. | voorgesteld leerdoel van de richting |
| professionalDilemma | De professional moet kiezen tussen vóór het gezinsgesprek eerst bij school verdere verheldering zoeken over de verschillen, of de uiteenlopende perspectieven zonder die extra stap direct en open met ouder en jongere bespreken. | V2-analyse |
| targetAudience | Jeugdprofessionals die met gezinnen en scholen samenwerken. | V2-analyse |
| sourceRefs | `S4`, `S5` | sourceRefs van de richting |
| decisionPoint.routePolicy, actie.routePolicy | `open_choice` | afgeleid uit `ambiguity` |

Controle: deze waarden zijn identiek aan de V2-analyse en de gekozen richting (ja).

## Door Claude ontworpen (Blueprint-ontwerp)

```json
{
  "title": "Eerst school of eerst het gezin: de volgorde van contacten afwegen",
  "participantRole": "Jeugdprofessional die samenwerkt met gezin en school en de dag vóór een gepland gezinsgesprek moet bepalen welk contact eerst plaatsvindt.",
  "scenarioPremise": "Een jeugdprofessional krijgt van school en van een ouder verschillende beschrijvingen van het gedrag van dezelfde jongere. Volgens school komt de jongere regelmatig teruggetrokken en gespannen over. De ouder herkent dit thuis niet en vindt dat school het probleem groter maakt dan het is. Er zijn geen acute veiligheidszorgen. De volgende dag staat een gesprek met het gezin gepland. De professional twijfelt of hij vóór dat gesprek eerst opnieuw contact opneemt met school om de verschillen te verhelderen, of de uiteenlopende perspectieven eerst open met ouder en jongere bespreekt.",
  "decisionPoint": {
    "task": "Bepaal op de dag vóór het gezinsgesprek welke volgorde van contacten je kiest ten aanzien van school en het gezin, en licht toe waarom je deze volgorde kiest gezien de situatie."
  },
  "ambiguity": "multiple_defensible_actions",
  "successCriteria": [
    "De deelnemer maakt een keuze voor de volgorde van contacten en onderbouwt die met de voor- en nadelen van beide routes voor de samenwerking met gezin en school.",
    "De deelnemer benoemt hoe het ontbreken van acute veiligheidszorgen en de nog onbekende punten in de situatie zijn keuze beïnvloeden.",
    "De deelnemer benoemt welke consequenties zijn gekozen volgorde kan hebben voor het vertrouwen van ouder en jongere en voor de relatie met school, en hoe hij daarmee omgaat."
  ],
  "assumptions": [
    {
      "assumption": "De simulatie speelt zich af op de dag vóór het gezinsgesprek, op een moment waarop het voor de deelnemer praktisch nog mogelijk is school te benaderen.",
      "reason": "Zonder deze tijdsruimte is er geen werkelijke keuze tussen beide volgordes en valt het keuzemoment weg."
    }
  ],
  "sourceNeeds": [
    {
      "id": "SN1",
      "question": "Welke kaders gelden voor het opnieuw contact opnemen met school over een jongere en het delen van informatie, en welke rol spelen bekendheid en instemming van ouder en jongere daarbij.",
      "sourceType": "wet_regelgeving",
      "whyNeeded": "De keuze om eerst school te benaderen raakt aan informatiedeling; de deelnemer moet zijn gekozen volgorde achteraf kunnen toetsen aan wat hierover geldt, juist omdat niet vaststaat of het gezin van het schoolcontact weet."
    },
    {
      "id": "SN2",
      "question": "Welke methodische inzichten bestaan over het werken met uiteenlopende perspectieven van gezin en school en over transparantie richting ouder en jongere bij afstemming met netwerkpartners.",
      "sourceType": "methodiek",
      "whyNeeded": "Biedt een gevalideerd referentiekader om de afweging tussen eerst verhelderen bij school en eerst open bespreken met het gezin achteraf te verdiepen, zonder één route als juist neer te zetten."
    }
  ],
  "learningArc": {
    "context": {
      "participantKnows": "De deelnemer kent de verschillende beschrijvingen van school en ouder, het oordeel van de ouder dat school het probleem groter maakt, het ontbreken van acute veiligheidszorgen en het geplande gezinsgesprek van de volgende dag.",
      "deliberatelyUnknown": "Onbekend blijft of ouder en jongere weten van en ingestemd hebben met het contact met school, wat de leeftijd van de jongere is en of de jongere bij het gesprek aanwezig zal zijn.",
      "tensionArises": "De spanning ontstaat tussen het willen verhelderen van de schoolobservaties vóór het gesprek en het risico dat het gezin dat ervaart als over hen in plaats van met hen praten, terwijl de afwezigheid van acute zorgen ruimte laat voor beide routes."
    },
    "actie": {
      "participantMust": "De deelnemer kiest zelf een volgorde van contacten, beschrijft hoe hij deze in de komende dag concreet vormgeeft en onderbouwt zijn keuze, inclusief hoe hij omgaat met wat nog onbekend is.",
      "performanceType": "keuze_maken_en_onderbouwen"
    },
    "reflectie": {
      "looksBackOn": "De deelnemer kijkt terug op de eigen gekozen volgorde en op de argumenten die daarbij de doorslag gaven.",
      "explicitTradeOff": "De deelnemer maakt expliciet wat hij wint en wat hij riskeert met zijn volgorde: meer verheldering vooraf tegenover openheid en vertrouwen in het gezinsgesprek, en welke rol de onbekende instemming en positie van de jongere daarin speelden."
    },
    "feedback": {
      "respondsTo": "Feedback reageert op de gekozen volgorde en de concrete uitwerking daarvan én op de kwaliteit van de onderbouwing en de gewogen voor- en nadelen.",
      "dimensions": [
        "Afweging van voor- en nadelen van beide volgordes",
        "Aansluiting van de keuze op de concrete situatie, inclusief het ontbreken van acute zorgen en de onbekende punten",
        "Oog voor consequenties voor de relatie met gezin en school"
      ],
      "evaluationBasis": [
        "afweging",
        "aansluiting_op_situatie",
        "onderbouwing",
        "consequenties"
      ],
      "multipleDefensibleHandling": "Beide volgordes gelden als verdedigbaar. Feedback beoordeelt niet welke route gekozen is, maar of de deelnemer beide routes serieus heeft gewogen, zijn keuze laat aansluiten op de situatie, de risico's van zijn eigen route benoemt en laat zien hoe hij die beperkt."
    },
    "bron": {
      "learningIntent": "Na handelen, reflectie en feedback legt de deelnemer zijn gekozen volgorde naast gevalideerde kaders over informatiedeling met school en methodische inzichten over werken met uiteenlopende perspectieven, zodat hij ziet welke van zijn argumenten worden versterkt, genuanceerd of aangevuld.",
      "sourceNeedRefs": [
        "SN1",
        "SN2"
      ]
    },
    "toets": {
      "demonstrate": "De deelnemer toont opnieuw dat hij de voor- en nadelen van verschillende volgordes van contacten kan wegen en tot een gemotiveerde keuze komt.",
      "transferEvidence": "Transfer blijkt wanneer de deelnemer in een gewijzigde situatie zijn afweging aanpast aan de nieuwe omstandigheden en daarbij expliciet de inzichten uit de eerdere keuze en de bronkoppeling gebruikt.",
      "newDecisionPoint": "Een vergelijkbare situatie waarin één factor verschuift, bijvoorbeeld dat wel bekend is hoe het gezin tegenover contact met school staat of dat de tijd tot het gesprek anders is, waarin de deelnemer opnieuw een volgorde van contacten kiest en onderbouwt.",
      "evaluationBasis": [
        "afweging",
        "aansluiting_op_situatie",
        "onderbouwing",
        "consequenties"
      ]
    }
  }
}
```

## Volledige gebruikerszichtbare Training Blueprint

```json
{
  "version": "blueprint-contract/v2",
  "title": "Eerst school of eerst het gezin: de volgorde van contacten afwegen",
  "targetAudience": "Jeugdprofessionals die met gezinnen en scholen samenwerken.",
  "learningGoal": "De deelnemer kan de voor- en nadelen van eerst school benaderen versus eerst het gezin spreken tegen elkaar afwegen en een gemotiveerde keuze maken.",
  "professionalDilemma": "De professional moet kiezen tussen vóór het gezinsgesprek eerst bij school verdere verheldering zoeken over de verschillen, of de uiteenlopende perspectieven zonder die extra stap direct en open met ouder en jongere bespreken.",
  "selectedDirectionId": "volgorde-vervolgcontact",
  "sourceRefs": [
    "S4",
    "S5"
  ],
  "participantRole": "Jeugdprofessional die samenwerkt met gezin en school en de dag vóór een gepland gezinsgesprek moet bepalen welk contact eerst plaatsvindt.",
  "scenarioPremise": "Een jeugdprofessional krijgt van school en van een ouder verschillende beschrijvingen van het gedrag van dezelfde jongere. Volgens school komt de jongere regelmatig teruggetrokken en gespannen over. De ouder herkent dit thuis niet en vindt dat school het probleem groter maakt dan het is. Er zijn geen acute veiligheidszorgen. De volgende dag staat een gesprek met het gezin gepland. De professional twijfelt of hij vóór dat gesprek eerst opnieuw contact opneemt met school om de verschillen te verhelderen, of de uiteenlopende perspectieven eerst open met ouder en jongere bespreekt.",
  "decisionPoint": {
    "task": "Bepaal op de dag vóór het gezinsgesprek welke volgorde van contacten je kiest ten aanzien van school en het gezin, en licht toe waarom je deze volgorde kiest gezien de situatie.",
    "routePolicy": "open_choice"
  },
  "ambiguity": "multiple_defensible_actions",
  "successCriteria": [
    "De deelnemer maakt een keuze voor de volgorde van contacten en onderbouwt die met de voor- en nadelen van beide routes voor de samenwerking met gezin en school.",
    "De deelnemer benoemt hoe het ontbreken van acute veiligheidszorgen en de nog onbekende punten in de situatie zijn keuze beïnvloeden.",
    "De deelnemer benoemt welke consequenties zijn gekozen volgorde kan hebben voor het vertrouwen van ouder en jongere en voor de relatie met school, en hoe hij daarmee omgaat."
  ],
  "assumptions": [
    {
      "assumption": "De simulatie speelt zich af op de dag vóór het gezinsgesprek, op een moment waarop het voor de deelnemer praktisch nog mogelijk is school te benaderen.",
      "reason": "Zonder deze tijdsruimte is er geen werkelijke keuze tussen beide volgordes en valt het keuzemoment weg."
    }
  ],
  "sourceNeeds": [
    {
      "id": "SN1",
      "question": "Welke kaders gelden voor het opnieuw contact opnemen met school over een jongere en het delen van informatie, en welke rol spelen bekendheid en instemming van ouder en jongere daarbij.",
      "sourceType": "wet_regelgeving",
      "whyNeeded": "De keuze om eerst school te benaderen raakt aan informatiedeling; de deelnemer moet zijn gekozen volgorde achteraf kunnen toetsen aan wat hierover geldt, juist omdat niet vaststaat of het gezin van het schoolcontact weet."
    },
    {
      "id": "SN2",
      "question": "Welke methodische inzichten bestaan over het werken met uiteenlopende perspectieven van gezin en school en over transparantie richting ouder en jongere bij afstemming met netwerkpartners.",
      "sourceType": "methodiek",
      "whyNeeded": "Biedt een gevalideerd referentiekader om de afweging tussen eerst verhelderen bij school en eerst open bespreken met het gezin achteraf te verdiepen, zonder één route als juist neer te zetten."
    }
  ],
  "learningArc": {
    "context": {
      "participantKnows": "De deelnemer kent de verschillende beschrijvingen van school en ouder, het oordeel van de ouder dat school het probleem groter maakt, het ontbreken van acute veiligheidszorgen en het geplande gezinsgesprek van de volgende dag.",
      "deliberatelyUnknown": "Onbekend blijft of ouder en jongere weten van en ingestemd hebben met het contact met school, wat de leeftijd van de jongere is en of de jongere bij het gesprek aanwezig zal zijn.",
      "tensionArises": "De spanning ontstaat tussen het willen verhelderen van de schoolobservaties vóór het gesprek en het risico dat het gezin dat ervaart als over hen in plaats van met hen praten, terwijl de afwezigheid van acute zorgen ruimte laat voor beide routes."
    },
    "actie": {
      "participantMust": "De deelnemer kiest zelf een volgorde van contacten, beschrijft hoe hij deze in de komende dag concreet vormgeeft en onderbouwt zijn keuze, inclusief hoe hij omgaat met wat nog onbekend is.",
      "performanceType": "keuze_maken_en_onderbouwen",
      "routePolicy": "open_choice"
    },
    "reflectie": {
      "looksBackOn": "De deelnemer kijkt terug op de eigen gekozen volgorde en op de argumenten die daarbij de doorslag gaven.",
      "explicitTradeOff": "De deelnemer maakt expliciet wat hij wint en wat hij riskeert met zijn volgorde: meer verheldering vooraf tegenover openheid en vertrouwen in het gezinsgesprek, en welke rol de onbekende instemming en positie van de jongere daarin speelden."
    },
    "feedback": {
      "respondsTo": "Feedback reageert op de gekozen volgorde en de concrete uitwerking daarvan én op de kwaliteit van de onderbouwing en de gewogen voor- en nadelen.",
      "dimensions": [
        "Afweging van voor- en nadelen van beide volgordes",
        "Aansluiting van de keuze op de concrete situatie, inclusief het ontbreken van acute zorgen en de onbekende punten",
        "Oog voor consequenties voor de relatie met gezin en school"
      ],
      "evaluationBasis": [
        "afweging",
        "aansluiting_op_situatie",
        "onderbouwing",
        "consequenties"
      ],
      "multipleDefensibleHandling": "Beide volgordes gelden als verdedigbaar. Feedback beoordeelt niet welke route gekozen is, maar of de deelnemer beide routes serieus heeft gewogen, zijn keuze laat aansluiten op de situatie, de risico's van zijn eigen route benoemt en laat zien hoe hij die beperkt."
    },
    "bron": {
      "learningIntent": "Na handelen, reflectie en feedback legt de deelnemer zijn gekozen volgorde naast gevalideerde kaders over informatiedeling met school en methodische inzichten over werken met uiteenlopende perspectieven, zodat hij ziet welke van zijn argumenten worden versterkt, genuanceerd of aangevuld.",
      "sourceNeedRefs": [
        "SN1",
        "SN2"
      ]
    },
    "toets": {
      "demonstrate": "De deelnemer toont opnieuw dat hij de voor- en nadelen van verschillende volgordes van contacten kan wegen en tot een gemotiveerde keuze komt.",
      "transferEvidence": "Transfer blijkt wanneer de deelnemer in een gewijzigde situatie zijn afweging aanpast aan de nieuwe omstandigheden en daarbij expliciet de inzichten uit de eerdere keuze en de bronkoppeling gebruikt.",
      "newDecisionPoint": "Een vergelijkbare situatie waarin één factor verschuift, bijvoorbeeld dat wel bekend is hoe het gezin tegenover contact met school staat of dat de tijd tot het gesprek anders is, waarin de deelnemer opnieuw een volgorde van contacten kiest en onderbouwt.",
      "evaluationBasis": [
        "afweging",
        "aansluiting_op_situatie",
        "onderbouwing",
        "consequenties"
      ]
    }
  }
}
```

## Feitelijke signalen (zonder oordeel)

| Vraag | Waarneming |
| --- | --- |
| 1. Binnen de gekozen richting? | Ja. Volgorde van contacten vóór het gezinsgesprek (S4, S5). |
| 2. Betekenisvolle trusted context aanwezig? | Ja. Beide beschrijvingen, het oordeel van de ouder, geen acute veiligheidszorgen en het gesprek van de volgende dag. |
| 3. Aanname sluit trusted context uit? | Nee. De enige aanname gaat over de tijdsruimte om school nog te kunnen benaderen. |
| 4. Eén helder hoofdkeuzemoment? | Ja. |
| 5. decisionPoint.task open? | Ja. "welke volgorde van contacten je kiest ten aanzien van school en het gezin". |
| 6. Actie open? | Ja. "kiest zelf een volgorde van contacten". |
| 7. Feedback beoordeelt afweging en uitvoering? | Ja. evaluationBasis: afweging, aansluiting_op_situatie, onderbouwing, consequenties; "Beide volgordes gelden als verdedigbaar". |
| 8. Toets bewaart de ambiguïteit? | Ja. "opnieuw een volgorde van contacten kiest en onderbouwt"; zelfde evaluationBasis. |
| 9. Toets gericht op transfer? | Ja: een situatie waarin één factor verschuift (bekende houding van het gezin, andere tijd tot het gesprek). |
| 10. Bron alleen intentie + geldige refs? | Ja. learningIntent zonder kennisvragen; sourceNeedRefs SN1, SN2. |
| 11. Bestaan alle Bron-refs? | Ja. |
| 12. Alle sourceNeeds gebruikt? | Ja (SN1, SN2). |
| 13. Nieuwe kennisbehoefte buiten sourceNeeds? | Nee. |
| 14. Assumptions noodzakelijk? | 1: tijdsruimte om school nog te benaderen. Ontwerpnoodzakelijk: anders valt de keuze weg. |
| 15. sourceNeeds noodzakelijk? | 2. SN1 (wet_regelgeving: kaders voor contact en informatiedeling met school, en de rol van instemming) en SN2 (methodiek: uiteenlopende perspectieven en transparantie). Geen wet genoemd. |
| 16. Lijsten tot het maximum gevuld? | successCriteria 3 (max), feedback.dimensions 3 (max). assumptions 1, sourceNeeds 2. |
| 17. Concrete ongevalideerde bronnen, wetten of methodieken als feit? | Nee. |
| 18. BC Online-bloknamen? | Nee. Ook geen branching of routering. |
| 19. Eindcontent in plaats van ontwerpintentie? | Nee. |
| Casus: eerst school vs. eerst gezin open | Ja. |
| Casus: school en ouder blijven perspectieven | Ja: "Volgens school …", "De ouder herkent dit thuis niet en vindt …". |
| Casus: instemming niet als feit ingevuld | Ja. Blijft expliciet onbekend in Context; SN1 noemt het "juist omdat niet vaststaat". |
| Casus: Bron alleen sourceNeeds | Ja. |
| Casus: transfer | Ja. |

## Menselijke evaluatie

**Status: `PASS`**

Menselijke review van de baseline training-blueprint/v2.

- Beide routes blijven open.
- Perspectieven worden niet tot feiten gemaakt.
- Instemming blijft onbekend.
- Bron gebruikt uitsluitend sourceNeeds.
- Toets meet transfer.
- Geen BC Online-techniek of ongevalideerde bronclaims.
