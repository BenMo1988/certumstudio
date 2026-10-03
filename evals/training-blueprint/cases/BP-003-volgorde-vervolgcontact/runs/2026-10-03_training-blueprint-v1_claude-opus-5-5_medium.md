# BP-003 · Run 2026-10-03 · training-blueprint/v1 · claude-opus-5-5 · medium

Baseline-run van de Training Blueprint Generation (prompt `training-blueprint/v1`, contract `blueprint-contract/v1`),
met precies één poging (`maxRetries: 0`). Configuratie bevroren op commit `c215757`.

Uitgevoerd via de Server Action `generateBlueprint` op de dev-server (`CERTUM_BLUEPRINT_PROVIDER=claude`), met de
bestaande synthetische input van CA-008, de bestaande V2-analyse (`ready`) uit de baseline en de vooraf
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
| durationMs | 34793 |
| outcome | success |
| ambiguity | multiple_defensible_actions |
| successCriteria | 3 |
| assumptions | 2 |
| sourceNeeds | 3 |
| invarianten | geen schendingen (Blueprint toegelaten door provider én flow) |
| fout | geen |

Tokengebruik en kosten werden voor deze run niet geregistreerd.

## Trusted context (server-side toegevoegd, niet door Claude gegenereerd)

| Veld | Waarde | Herkomst |
| --- | --- | --- |
| version | `blueprint-contract/v1` | contract |
| selectedDirectionId | `volgorde-vervolgcontact` | gekozen richting |
| learningGoal | De deelnemer kan de voor- en nadelen van eerst school benaderen versus eerst het gezin spreken tegen elkaar afwegen en een gemotiveerde keuze maken. | voorgesteld leerdoel van de richting |
| professionalDilemma | De professional moet kiezen tussen vóór het gezinsgesprek eerst bij school verdere verheldering zoeken over de verschillen, of de uiteenlopende perspectieven zonder die extra stap direct en open met ouder en jongere bespreken. | V2-analyse |
| targetAudience | Jeugdprofessionals die met gezinnen en scholen samenwerken. | V2-analyse |
| sourceRefs | `S4`, `S5` | sourceRefs van de richting |

Controle: deze waarden zijn identiek aan de V2-analyse en de gekozen richting (ja).

## Door Claude ontworpen (Blueprint-ontwerp)

```json
{
  "title": "Eerst school of eerst het gezin: de volgorde van contacten afwegen",
  "participantRole": "De deelnemer handelt als de jeugdprofessional die de volgende dag een gesprek heeft met het gezin en vooraf beslist of hij eerst opnieuw contact opneemt met school.",
  "scenarioPremise": "School en een ouder beschrijven het gedrag van dezelfde jongere verschillend. Volgens school komt de jongere regelmatig teruggetrokken en gespannen over. De ouder herkent dit thuis niet en vindt dat school het probleem groter maakt dan het is. Er zijn geen acute veiligheidszorgen. De professional heeft de volgende dag een gesprek met het gezin en twijfelt of hij vóór dat gesprek eerst opnieuw contact opneemt met school om de verschillen verder te verhelderen, of de verschillende perspectieven eerst open met ouder en jongere bespreekt.",
  "decisionPoint": "De dag vóór het gezinsgesprek kiest de deelnemer of hij eerst opnieuw contact opneemt met school of de uiteenlopende perspectieven direct en open met ouder en jongere bespreekt, en onderbouwt die keuze.",
  "ambiguity": "multiple_defensible_actions",
  "successCriteria": [
    "De deelnemer maakt een expliciete keuze voor de volgorde van contacten en onderbouwt die met voor- en nadelen van beide routes.",
    "De deelnemer benoemt welke belangen en perspectieven van ouder, jongere en school door de gekozen volgorde worden geraakt.",
    "De deelnemer legt uit hoe het ontbreken van acute veiligheidszorgen en de nog onbekende afspraken over contact met school zijn keuze beïnvloeden."
  ],
  "assumptions": [
    {
      "assumption": "In de simulatie blijft open of ouder en jongere weten van en ingestemd hebben met contact tussen professional en school; de deelnemer moet deze onzekerheid zelf meewegen.",
      "reason": "De bron zegt hier niets over en de open vraag mag niet worden ingevuld, terwijl het gegeven de afweging tussen beide routes wezenlijk raakt."
    },
    {
      "assumption": "Het gezinsgesprek wordt behandeld als gesprek waarin zowel ouder als jongere de perspectieven kunnen bespreken, zonder leeftijd van de jongere vast te leggen.",
      "reason": "De bron spreekt over bespreken met ouder en jongere, maar aanwezigheid en leeftijd zijn onbekend; voor een samenhangend keuzemoment is een werkbare uitgangssituatie nodig."
    }
  ],
  "sourceNeeds": [
    {
      "question": "Welke voorwaarden gelden voor het opnieuw contact opnemen met school en het delen of opvragen van informatie over een jongere zonder dat ouder en jongere daarvan op de hoogte zijn?",
      "sourceType": "wet_regelgeving",
      "whyNeeded": "De route eerst school benaderen is alleen verantwoord te wegen als duidelijk is binnen welke kaders dat contact mag plaatsvinden."
    },
    {
      "question": "Welke methodische uitgangspunten zijn er voor het omgaan met uiteenlopende perspectieven van school en ouders en het betrekken van de jongere daarbij?",
      "sourceType": "methodiek",
      "whyNeeded": "Feedback en bronfase moeten de afweging tussen eerst verhelderen bij school en eerst open bespreken met het gezin kunnen toetsen aan gevalideerde werkwijzen."
    },
    {
      "question": "Welke professionele normen gelden voor transparantie naar ouder en jongere over contacten met andere betrokkenen?",
      "sourceType": "beroepscode",
      "whyNeeded": "De volgorde van contacten raakt aan vertrouwen en openheid in de relatie met het gezin; dat moet in de afweging normatief onderbouwd kunnen worden."
    }
  ],
  "learningArc": {
    "context": {
      "participantKnows": "De deelnemer kent de uiteenlopende beschrijvingen van school en ouder, weet dat er geen acute veiligheidszorgen zijn en dat het gezinsgesprek de volgende dag plaatsvindt.",
      "deliberatelyUnknown": "Onbekend blijft of ouder en jongere weten van en ingestemd hebben met contact met school, wat de leeftijd van de jongere is en wat school bij een nieuw contact zou toevoegen.",
      "tensionArises": "De wens om beter voorbereid het gesprek in te gaan door eerst bij school te verhelderen botst met de wens om het gezin niet te passeren en de perspectieven eerst open met ouder en jongere te bespreken."
    },
    "actie": {
      "participantMust": "De deelnemer kiest welke contactroute hij vóór of in het gezinsgesprek volgt, benoemt wat hij met die volgorde wil bereiken en motiveert waarom hij de andere route nu niet als eerste neemt.",
      "performanceType": "keuze_maken_en_onderbouwen"
    },
    "reflectie": {
      "looksBackOn": "De deelnemer kijkt terug op de eigen gekozen volgorde en op welke overwegingen die keuze uiteindelijk bepaalden.",
      "explicitTradeOff": "De afweging tussen extra verheldering en voorbereiding via school enerzijds en transparantie, vertrouwen en het eigen perspectief van ouder en jongere anderzijds, gegeven het ontbreken van acute veiligheidszorgen."
    },
    "feedback": {
      "respondsTo": "Feedback reageert op de gemaakte keuze voor de volgorde én op de kwaliteit van de onderbouwing, inclusief hoe met onbekende gegevens over instemming en aanwezigheid is omgegaan.",
      "dimensions": [
        "Volledigheid en evenwichtigheid van de afweging van voor- en nadelen van beide routes",
        "Aandacht voor belangen en positie van ouder, jongere en school",
        "Omgang met onzekerheid en ontbrekende informatie"
      ],
      "multipleDefensibleHandling": "Beide routes kunnen verdedigbaar zijn. Feedback beoordeelt niet welke route gekozen is, maar of de keuze expliciet is, of de nadelen van de gekozen route erkend worden, of de onbekende instemming is meegewogen en of de deelnemer aangeeft hoe hij de nadelen van zijn route opvangt."
    },
    "bron": {
      "knowledgeQuestions": [
        "Binnen welke kaders mag een professional contact met school opnemen over een jongere en welke rol speelt instemming van ouder en jongere daarbij?",
        "Welke werkwijzen worden aanbevolen bij uiteenlopende perspectieven van school en ouders?",
        "Welke normen over transparantie naar het gezin zijn relevant bij de volgorde van contacten?"
      ],
      "sourceTypes": [
        "wet_regelgeving",
        "methodiek",
        "beroepscode"
      ]
    },
    "toets": {
      "demonstrate": "De deelnemer toont opnieuw dat hij een volgorde van contacten kan kiezen en die gemotiveerd kan onderbouwen met afweging van belangen, transparantie en onzekerheid.",
      "transferEvidence": "Transfer blijkt wanneer de deelnemer in een gewijzigde situatie zelfstandig benoemt welke factoren de afweging verschuiven en zijn keuze daarop aanpast of bewust handhaaft.",
      "newDecisionPoint": "Een vergelijkbaar keuzemoment waarin een andere betrokkene dan school een afwijkend beeld geeft van een jongere, of waarin bekend is dat ouder en jongere wel of geen instemming hebben gegeven voor contact, en de deelnemer opnieuw de volgorde van contacten moet bepalen."
    }
  }
}
```

## Volledige gebruikerszichtbare Training Blueprint

```json
{
  "version": "blueprint-contract/v1",
  "title": "Eerst school of eerst het gezin: de volgorde van contacten afwegen",
  "targetAudience": "Jeugdprofessionals die met gezinnen en scholen samenwerken.",
  "learningGoal": "De deelnemer kan de voor- en nadelen van eerst school benaderen versus eerst het gezin spreken tegen elkaar afwegen en een gemotiveerde keuze maken.",
  "professionalDilemma": "De professional moet kiezen tussen vóór het gezinsgesprek eerst bij school verdere verheldering zoeken over de verschillen, of de uiteenlopende perspectieven zonder die extra stap direct en open met ouder en jongere bespreken.",
  "selectedDirectionId": "volgorde-vervolgcontact",
  "sourceRefs": [
    "S4",
    "S5"
  ],
  "participantRole": "De deelnemer handelt als de jeugdprofessional die de volgende dag een gesprek heeft met het gezin en vooraf beslist of hij eerst opnieuw contact opneemt met school.",
  "scenarioPremise": "School en een ouder beschrijven het gedrag van dezelfde jongere verschillend. Volgens school komt de jongere regelmatig teruggetrokken en gespannen over. De ouder herkent dit thuis niet en vindt dat school het probleem groter maakt dan het is. Er zijn geen acute veiligheidszorgen. De professional heeft de volgende dag een gesprek met het gezin en twijfelt of hij vóór dat gesprek eerst opnieuw contact opneemt met school om de verschillen verder te verhelderen, of de verschillende perspectieven eerst open met ouder en jongere bespreekt.",
  "decisionPoint": "De dag vóór het gezinsgesprek kiest de deelnemer of hij eerst opnieuw contact opneemt met school of de uiteenlopende perspectieven direct en open met ouder en jongere bespreekt, en onderbouwt die keuze.",
  "ambiguity": "multiple_defensible_actions",
  "successCriteria": [
    "De deelnemer maakt een expliciete keuze voor de volgorde van contacten en onderbouwt die met voor- en nadelen van beide routes.",
    "De deelnemer benoemt welke belangen en perspectieven van ouder, jongere en school door de gekozen volgorde worden geraakt.",
    "De deelnemer legt uit hoe het ontbreken van acute veiligheidszorgen en de nog onbekende afspraken over contact met school zijn keuze beïnvloeden."
  ],
  "assumptions": [
    {
      "assumption": "In de simulatie blijft open of ouder en jongere weten van en ingestemd hebben met contact tussen professional en school; de deelnemer moet deze onzekerheid zelf meewegen.",
      "reason": "De bron zegt hier niets over en de open vraag mag niet worden ingevuld, terwijl het gegeven de afweging tussen beide routes wezenlijk raakt."
    },
    {
      "assumption": "Het gezinsgesprek wordt behandeld als gesprek waarin zowel ouder als jongere de perspectieven kunnen bespreken, zonder leeftijd van de jongere vast te leggen.",
      "reason": "De bron spreekt over bespreken met ouder en jongere, maar aanwezigheid en leeftijd zijn onbekend; voor een samenhangend keuzemoment is een werkbare uitgangssituatie nodig."
    }
  ],
  "sourceNeeds": [
    {
      "question": "Welke voorwaarden gelden voor het opnieuw contact opnemen met school en het delen of opvragen van informatie over een jongere zonder dat ouder en jongere daarvan op de hoogte zijn?",
      "sourceType": "wet_regelgeving",
      "whyNeeded": "De route eerst school benaderen is alleen verantwoord te wegen als duidelijk is binnen welke kaders dat contact mag plaatsvinden."
    },
    {
      "question": "Welke methodische uitgangspunten zijn er voor het omgaan met uiteenlopende perspectieven van school en ouders en het betrekken van de jongere daarbij?",
      "sourceType": "methodiek",
      "whyNeeded": "Feedback en bronfase moeten de afweging tussen eerst verhelderen bij school en eerst open bespreken met het gezin kunnen toetsen aan gevalideerde werkwijzen."
    },
    {
      "question": "Welke professionele normen gelden voor transparantie naar ouder en jongere over contacten met andere betrokkenen?",
      "sourceType": "beroepscode",
      "whyNeeded": "De volgorde van contacten raakt aan vertrouwen en openheid in de relatie met het gezin; dat moet in de afweging normatief onderbouwd kunnen worden."
    }
  ],
  "learningArc": {
    "context": {
      "participantKnows": "De deelnemer kent de uiteenlopende beschrijvingen van school en ouder, weet dat er geen acute veiligheidszorgen zijn en dat het gezinsgesprek de volgende dag plaatsvindt.",
      "deliberatelyUnknown": "Onbekend blijft of ouder en jongere weten van en ingestemd hebben met contact met school, wat de leeftijd van de jongere is en wat school bij een nieuw contact zou toevoegen.",
      "tensionArises": "De wens om beter voorbereid het gesprek in te gaan door eerst bij school te verhelderen botst met de wens om het gezin niet te passeren en de perspectieven eerst open met ouder en jongere te bespreken."
    },
    "actie": {
      "participantMust": "De deelnemer kiest welke contactroute hij vóór of in het gezinsgesprek volgt, benoemt wat hij met die volgorde wil bereiken en motiveert waarom hij de andere route nu niet als eerste neemt.",
      "performanceType": "keuze_maken_en_onderbouwen"
    },
    "reflectie": {
      "looksBackOn": "De deelnemer kijkt terug op de eigen gekozen volgorde en op welke overwegingen die keuze uiteindelijk bepaalden.",
      "explicitTradeOff": "De afweging tussen extra verheldering en voorbereiding via school enerzijds en transparantie, vertrouwen en het eigen perspectief van ouder en jongere anderzijds, gegeven het ontbreken van acute veiligheidszorgen."
    },
    "feedback": {
      "respondsTo": "Feedback reageert op de gemaakte keuze voor de volgorde én op de kwaliteit van de onderbouwing, inclusief hoe met onbekende gegevens over instemming en aanwezigheid is omgegaan.",
      "dimensions": [
        "Volledigheid en evenwichtigheid van de afweging van voor- en nadelen van beide routes",
        "Aandacht voor belangen en positie van ouder, jongere en school",
        "Omgang met onzekerheid en ontbrekende informatie"
      ],
      "multipleDefensibleHandling": "Beide routes kunnen verdedigbaar zijn. Feedback beoordeelt niet welke route gekozen is, maar of de keuze expliciet is, of de nadelen van de gekozen route erkend worden, of de onbekende instemming is meegewogen en of de deelnemer aangeeft hoe hij de nadelen van zijn route opvangt."
    },
    "bron": {
      "knowledgeQuestions": [
        "Binnen welke kaders mag een professional contact met school opnemen over een jongere en welke rol speelt instemming van ouder en jongere daarbij?",
        "Welke werkwijzen worden aanbevolen bij uiteenlopende perspectieven van school en ouders?",
        "Welke normen over transparantie naar het gezin zijn relevant bij de volgorde van contacten?"
      ],
      "sourceTypes": [
        "wet_regelgeving",
        "methodiek",
        "beroepscode"
      ]
    },
    "toets": {
      "demonstrate": "De deelnemer toont opnieuw dat hij een volgorde van contacten kan kiezen en die gemotiveerd kan onderbouwen met afweging van belangen, transparantie en onzekerheid.",
      "transferEvidence": "Transfer blijkt wanneer de deelnemer in een gewijzigde situatie zelfstandig benoemt welke factoren de afweging verschuiven en zijn keuze daarop aanpast of bewust handhaaft.",
      "newDecisionPoint": "Een vergelijkbaar keuzemoment waarin een andere betrokkene dan school een afwijkend beeld geeft van een jongere, of waarin bekend is dat ouder en jongere wel of geen instemming hebben gegeven voor contact, en de deelnemer opnieuw de volgorde van contacten moet bepalen."
    }
  }
}
```

## Feitelijke signalen (zonder oordeel)

| Vraag | Waarneming |
| --- | --- |
| 1. Binnen de gekozen richting? | Ja. Volgorde van contacten vóór het gezinsgesprek (S4, S5). Actie spreekt van een route "vóór of in het gezinsgesprek", een lichte verbreding. |
| 2. Eén helder decisionPoint? | Ja. Eerst school of eerst het gezin, plus onderbouwing. |
| 3. Nieuwe feiten in scenarioPremise? | Geen. De premise herhaalt S1-S5, met de perspectieven toegeschreven. |
| 4. Assumptions | 2, beide over onbekenden uit de analyse (instemming met schoolcontact; aanwezigheid en leeftijd van de jongere). De tweede is een werkbare ontwerpkeuze, de eerste laat de onbekende bewust open. |
| 5. SourceNeeds | 3, plus 3 knowledgeQuestions. |
| 6. Concrete bronnen, wetten, methodieken of richtlijnen? | Geen concrete wet of bron genoemd. sourceType `wet_regelgeving` met een kennisvraag over voorwaarden voor contact en informatie-uitwisseling met school; als te valideren behoefte geformuleerd, niet als feit. |
| 7. Ambiguity zoals verwacht? | Ja: `multiple_defensible_actions` (verwacht: `multiple_defensible_actions`). |
| 8. Feedback bij meerdere routes | Ja. "Beide routes kunnen verdedigbaar zijn"; beoordeelt expliciet de afweging en de omgang met onzekerheid. |
| 9. Reflectie terug naar de eigen keuze? | Ja. |
| 10. Bron pas ná Actie, Reflectie, Feedback? | Ja. |
| 11. Toets: transfer of kennisquiz? | Transfer: een andere betrokkene met een afwijkend beeld, of bekende instemming, en opnieuw een volgorde bepalen. |
| 12. BC Online-bloknamen? | Geen. Ook geen branching- of routeringslogica. |
| 13. Overige aanwijzingen van content schrijven? | Geen. |
| Casus: school en ouder blijven perspectieven | Ja: "Volgens school …", "De ouder herkent dit thuis niet en vindt …". |
| Casus: geen branching- of BC Online-logica | Niet aangetroffen. |
| Casus: meerdere routes blijven mogelijk | Ja. |

## Beoordeling

Nog niet beoordeeld. Status `PENDING_REVIEW`.
