# BP-001 · Run 2026-10-03 · training-blueprint/v2 · claude-opus-5-5 · medium

Baseline-run van Blueprint Contract V2 (prompt `training-blueprint/v2`, contract `blueprint-contract/v2`), met precies
één poging (`maxRetries: 0`). Configuratie bevroren op commit `a515e3a`.

Uitgevoerd via de Server Action `generateBlueprint` op de dev-server (`CERTUM_BLUEPRINT_PROVIDER=claude`,
`CERTUM_ANALYSIS_PROVIDER=mock`), met de bestaande synthetische input van CA-001, de bestaande V2-analyse
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
| durationMs | 35598 |
| outcome | success |
| ambiguity | multiple_defensible_actions |
| decisionPoint.routePolicy (server) | open_choice |
| actie.routePolicy (server) | open_choice |
| successCriteria | 3 |
| assumptions | 3 |
| sourceNeeds | 2 |
| sourceNeed ids | SN1, SN2 |
| Bron sourceNeedRefs | SN1, SN2 |
| Feedback evaluationBasis | afweging, aansluiting_op_situatie, proportionaliteit, uitvoering |
| Toets evaluationBasis | afweging, aansluiting_op_situatie, proportionaliteit, uitvoering |
| invarianten | geen schendingen (Blueprint toegelaten door provider én flow) |
| fout | geen |

Tokengebruik en kosten werden voor deze run niet geregistreerd.

**decisionPoint.task:** Bepaal op het moment dat de ouders elkaar steeds feller verwijten maken hoe je reageert: of je het gesprek voortzet, begrenst of beëindigt, voer die reactie uit in het gesprek en onderbouw je keuze.

## Trusted context en afgeleide velden (server-side, niet door Claude gegenereerd)

| Veld | Waarde | Herkomst |
| --- | --- | --- |
| version | `blueprint-contract/v2` | contract |
| selectedDirectionId | `escalatie-begrenzen` | gekozen richting |
| learningGoal | De deelnemer kan herkennen wanneer wederzijdse verwijten tussen ouders het gesprek doen escaleren en kan afwegen of en hoe hij het gesprek begrenst. | voorgesteld leerdoel van de richting |
| professionalDilemma | De professional moet tijdens een escalerend gesprek kiezen tussen voortzetten, begrenzen of beëindigen, terwijl de dochter delen van het gesprek kan horen en één ouder verdere medewerking afhankelijk maakt van de vraag of de professional partij kiest. | V2-analyse |
| targetAudience | Jeugdprofessionals die gesprekken voeren met (gescheiden) ouders over zorgen rondom een kind. | V2-analyse |
| sourceRefs | `S2`, `S3`, `S6` | sourceRefs van de richting |
| decisionPoint.routePolicy, actie.routePolicy | `open_choice` | afgeleid uit `ambiguity` |

Controle: deze waarden zijn identiek aan de V2-analyse en de gekozen richting (ja).

## Door Claude ontworpen (Blueprint-ontwerp)

```json
{
  "title": "Escalerende verwijten tussen gescheiden ouders begrenzen",
  "participantRole": "Jeugdprofessional die het gesprek met de twee gescheiden ouders over de zorgen rondom hun dochter leidt.",
  "scenarioPremise": "De deelnemer voert een gesprek met twee gescheiden ouders over zorgen rondom hun dochter. De ouders verwijten elkaar dat de ander verantwoordelijk is voor de problemen van het kind en de toon wordt steeds feller. De dochter zit in een aangrenzende ruimte en kan delen van het gesprek horen. Eén ouder vraagt de professional expliciet partij te kiezen en zegt anders niet meer mee te werken aan de hulpverlening. De deelnemer moet in dit moment bepalen hoe hij op de escalatie reageert.",
  "decisionPoint": {
    "task": "Bepaal op het moment dat de ouders elkaar steeds feller verwijten maken hoe je reageert: of je het gesprek voortzet, begrenst of beëindigt, voer die reactie uit in het gesprek en onderbouw je keuze."
  },
  "ambiguity": "multiple_defensible_actions",
  "successCriteria": [
    "De deelnemer benoemt aan welke signalen in het gesprek hij herkent dat de wederzijdse verwijten tot escalatie leiden.",
    "De deelnemer kiest of hij het gesprek voortzet, begrenst of beëindigt en onderbouwt die keuze met de belangen die in de situatie spelen, waaronder die van de dochter die meeluistert.",
    "De deelnemer voert de gekozen reactie zichtbaar uit in het gesprek en licht toe welke gevolgen hij van zijn keuze verwacht voor het gesprek en de verdere samenwerking."
  ],
  "assumptions": [
    {
      "assumption": "De simulatie start op het moment dat de verwijten over en weer gaan en de toon merkbaar feller wordt, terwijl de dochter in de aangrenzende ruimte zit en het verzoek om partij te kiezen al is gedaan.",
      "reason": "Het leerdoel vraagt om een keuzemoment midden in de escalatie; het exacte startmoment staat niet in de bron."
    },
    {
      "assumption": "Het keuzemoment ligt bij de reactie tijdens het gesprek zelf; de afweging over het vervolg van de hulpverlening na het gesprek is geen apart oefendoel, maar mag in de onderbouwing van de consequenties meegenomen worden.",
      "reason": "De analyse laat open of de training ook het vervolg na het gesprek omvat; voor één samenhangend keuzemoment is een afbakening nodig."
    },
    {
      "assumption": "De deelnemer heeft als gespreksleider de ruimte om het gesprek voort te zetten, te begrenzen of te beëindigen, zonder dat het specifieke kader van de hulpverlening wordt vastgelegd.",
      "reason": "Rol en setting zijn niet vastgesteld, maar het dilemma veronderstelt dat alle drie de routes voor de professional beschikbaar zijn."
    }
  ],
  "sourceNeeds": [
    {
      "id": "SN1",
      "question": "Welke gevalideerde inzichten bestaan er over het herkennen van escalatie en het begrenzen, onderbreken of beëindigen van gesprekken met conflicterende gescheiden ouders?",
      "sourceType": "methodiek",
      "whyNeeded": "Om de eigen keuze en uitvoering van de deelnemer achteraf te kunnen spiegelen aan onderbouwde werkwijzen voor de-escalatie en begrenzing."
    },
    {
      "id": "SN2",
      "question": "Wat is bekend over de impact op een kind wanneer het een oplopend conflict tussen ouders hoort?",
      "sourceType": "wetenschappelijk_onderzoek",
      "whyNeeded": "Om het belang van de meeluisterende dochter in de afweging tussen voortzetten, begrenzen en beëindigen te kunnen onderbouwen."
    }
  ],
  "learningArc": {
    "context": {
      "participantKnows": "Dat het een gesprek is met twee gescheiden ouders over zorgen rondom hun dochter, dat de ouders elkaar de schuld geven en de toon oploopt, dat de dochter in de aangrenzende ruimte delen kan horen en dat één ouder verdere medewerking afhankelijk maakt van het partij kiezen.",
      "deliberatelyUnknown": "Hoe de ouders op een reactie van de professional zullen reageren, wat de dochter precies hoort en het precieze kader waarin het gesprek plaatsvindt.",
      "tensionArises": "Op het moment dat de verwijten feller worden: doorgaan kan ruimte bieden voor het gesprek over de dochter maar de escalatie laten oplopen, terwijl begrenzen of beëindigen de escalatie kan stoppen maar de samenwerking onder druk kan zetten."
    },
    "actie": {
      "participantMust": "Zelf een route kiezen tussen voortzetten, begrenzen of beëindigen en die reactie in het gesprek met de ouders daadwerkelijk uitvoeren.",
      "performanceType": "gesprek_voeren"
    },
    "reflectie": {
      "looksBackOn": "De eigen gekozen reactie op de escalatie en de signalen waarop de deelnemer die keuze baseerde.",
      "explicitTradeOff": "De afweging tussen ruimte geven aan het gesprek over de zorgen om de dochter en het stoppen van de escalatie, met oog voor de meeluisterende dochter en de gevolgen voor de samenwerking met beide ouders."
    },
    "feedback": {
      "respondsTo": "De herkenning van de escalatie, de gekozen reactie zoals die in het gesprek is uitgevoerd en de onderbouwing van die keuze.",
      "dimensions": [
        "Herkennen van escalatiesignalen in het gesprek",
        "Kwaliteit en proportionaliteit van de afweging tussen voortzetten, begrenzen en beëindigen",
        "Uitvoering van de gekozen reactie richting beide ouders"
      ],
      "evaluationBasis": [
        "afweging",
        "aansluiting_op_situatie",
        "proportionaliteit",
        "uitvoering"
      ],
      "multipleDefensibleHandling": "Feedback beoordeelt niet welke route gekozen is, maar of de keuze aansluit op de signalen in het gesprek, of de relevante belangen inclusief die van de dochter zijn gewogen, of de reactie in verhouding staat tot de escalatie en of de uitvoering consistent is met de gekozen route."
    },
    "bron": {
      "learningIntent": "Na het handelen koppelt de deelnemer gevalideerde inzichten over de-escalatie en begrenzing en over de impact van ouderconflict op een kind aan de eigen keuze, om te zien welke overwegingen zijn route versterken of aanvullen.",
      "sourceNeedRefs": [
        "SN1",
        "SN2"
      ]
    },
    "toets": {
      "demonstrate": "Opnieuw escalatie tussen ouders herkennen, een eigen route kiezen tussen voortzetten, begrenzen of beëindigen en die keuze uitvoeren en onderbouwen.",
      "transferEvidence": "De deelnemer past de afweging toe in een gewijzigde situatie en laat zien dat de onderbouwing aansluit op de nieuwe signalen en belangen in plaats van de eerdere keuze te herhalen.",
      "newDecisionPoint": "Een vergelijkbaar gesprek met gescheiden ouders waarin de verwijten in een ander stadium of op een andere manier escaleren, zodat de deelnemer de afweging opnieuw moet maken onder gewijzigde omstandigheden.",
      "evaluationBasis": [
        "afweging",
        "aansluiting_op_situatie",
        "proportionaliteit",
        "uitvoering"
      ]
    }
  }
}
```

## Volledige gebruikerszichtbare Training Blueprint

```json
{
  "version": "blueprint-contract/v2",
  "title": "Escalerende verwijten tussen gescheiden ouders begrenzen",
  "targetAudience": "Jeugdprofessionals die gesprekken voeren met (gescheiden) ouders over zorgen rondom een kind.",
  "learningGoal": "De deelnemer kan herkennen wanneer wederzijdse verwijten tussen ouders het gesprek doen escaleren en kan afwegen of en hoe hij het gesprek begrenst.",
  "professionalDilemma": "De professional moet tijdens een escalerend gesprek kiezen tussen voortzetten, begrenzen of beëindigen, terwijl de dochter delen van het gesprek kan horen en één ouder verdere medewerking afhankelijk maakt van de vraag of de professional partij kiest.",
  "selectedDirectionId": "escalatie-begrenzen",
  "sourceRefs": [
    "S2",
    "S3",
    "S6"
  ],
  "participantRole": "Jeugdprofessional die het gesprek met de twee gescheiden ouders over de zorgen rondom hun dochter leidt.",
  "scenarioPremise": "De deelnemer voert een gesprek met twee gescheiden ouders over zorgen rondom hun dochter. De ouders verwijten elkaar dat de ander verantwoordelijk is voor de problemen van het kind en de toon wordt steeds feller. De dochter zit in een aangrenzende ruimte en kan delen van het gesprek horen. Eén ouder vraagt de professional expliciet partij te kiezen en zegt anders niet meer mee te werken aan de hulpverlening. De deelnemer moet in dit moment bepalen hoe hij op de escalatie reageert.",
  "decisionPoint": {
    "task": "Bepaal op het moment dat de ouders elkaar steeds feller verwijten maken hoe je reageert: of je het gesprek voortzet, begrenst of beëindigt, voer die reactie uit in het gesprek en onderbouw je keuze.",
    "routePolicy": "open_choice"
  },
  "ambiguity": "multiple_defensible_actions",
  "successCriteria": [
    "De deelnemer benoemt aan welke signalen in het gesprek hij herkent dat de wederzijdse verwijten tot escalatie leiden.",
    "De deelnemer kiest of hij het gesprek voortzet, begrenst of beëindigt en onderbouwt die keuze met de belangen die in de situatie spelen, waaronder die van de dochter die meeluistert.",
    "De deelnemer voert de gekozen reactie zichtbaar uit in het gesprek en licht toe welke gevolgen hij van zijn keuze verwacht voor het gesprek en de verdere samenwerking."
  ],
  "assumptions": [
    {
      "assumption": "De simulatie start op het moment dat de verwijten over en weer gaan en de toon merkbaar feller wordt, terwijl de dochter in de aangrenzende ruimte zit en het verzoek om partij te kiezen al is gedaan.",
      "reason": "Het leerdoel vraagt om een keuzemoment midden in de escalatie; het exacte startmoment staat niet in de bron."
    },
    {
      "assumption": "Het keuzemoment ligt bij de reactie tijdens het gesprek zelf; de afweging over het vervolg van de hulpverlening na het gesprek is geen apart oefendoel, maar mag in de onderbouwing van de consequenties meegenomen worden.",
      "reason": "De analyse laat open of de training ook het vervolg na het gesprek omvat; voor één samenhangend keuzemoment is een afbakening nodig."
    },
    {
      "assumption": "De deelnemer heeft als gespreksleider de ruimte om het gesprek voort te zetten, te begrenzen of te beëindigen, zonder dat het specifieke kader van de hulpverlening wordt vastgelegd.",
      "reason": "Rol en setting zijn niet vastgesteld, maar het dilemma veronderstelt dat alle drie de routes voor de professional beschikbaar zijn."
    }
  ],
  "sourceNeeds": [
    {
      "id": "SN1",
      "question": "Welke gevalideerde inzichten bestaan er over het herkennen van escalatie en het begrenzen, onderbreken of beëindigen van gesprekken met conflicterende gescheiden ouders?",
      "sourceType": "methodiek",
      "whyNeeded": "Om de eigen keuze en uitvoering van de deelnemer achteraf te kunnen spiegelen aan onderbouwde werkwijzen voor de-escalatie en begrenzing."
    },
    {
      "id": "SN2",
      "question": "Wat is bekend over de impact op een kind wanneer het een oplopend conflict tussen ouders hoort?",
      "sourceType": "wetenschappelijk_onderzoek",
      "whyNeeded": "Om het belang van de meeluisterende dochter in de afweging tussen voortzetten, begrenzen en beëindigen te kunnen onderbouwen."
    }
  ],
  "learningArc": {
    "context": {
      "participantKnows": "Dat het een gesprek is met twee gescheiden ouders over zorgen rondom hun dochter, dat de ouders elkaar de schuld geven en de toon oploopt, dat de dochter in de aangrenzende ruimte delen kan horen en dat één ouder verdere medewerking afhankelijk maakt van het partij kiezen.",
      "deliberatelyUnknown": "Hoe de ouders op een reactie van de professional zullen reageren, wat de dochter precies hoort en het precieze kader waarin het gesprek plaatsvindt.",
      "tensionArises": "Op het moment dat de verwijten feller worden: doorgaan kan ruimte bieden voor het gesprek over de dochter maar de escalatie laten oplopen, terwijl begrenzen of beëindigen de escalatie kan stoppen maar de samenwerking onder druk kan zetten."
    },
    "actie": {
      "participantMust": "Zelf een route kiezen tussen voortzetten, begrenzen of beëindigen en die reactie in het gesprek met de ouders daadwerkelijk uitvoeren.",
      "performanceType": "gesprek_voeren",
      "routePolicy": "open_choice"
    },
    "reflectie": {
      "looksBackOn": "De eigen gekozen reactie op de escalatie en de signalen waarop de deelnemer die keuze baseerde.",
      "explicitTradeOff": "De afweging tussen ruimte geven aan het gesprek over de zorgen om de dochter en het stoppen van de escalatie, met oog voor de meeluisterende dochter en de gevolgen voor de samenwerking met beide ouders."
    },
    "feedback": {
      "respondsTo": "De herkenning van de escalatie, de gekozen reactie zoals die in het gesprek is uitgevoerd en de onderbouwing van die keuze.",
      "dimensions": [
        "Herkennen van escalatiesignalen in het gesprek",
        "Kwaliteit en proportionaliteit van de afweging tussen voortzetten, begrenzen en beëindigen",
        "Uitvoering van de gekozen reactie richting beide ouders"
      ],
      "evaluationBasis": [
        "afweging",
        "aansluiting_op_situatie",
        "proportionaliteit",
        "uitvoering"
      ],
      "multipleDefensibleHandling": "Feedback beoordeelt niet welke route gekozen is, maar of de keuze aansluit op de signalen in het gesprek, of de relevante belangen inclusief die van de dochter zijn gewogen, of de reactie in verhouding staat tot de escalatie en of de uitvoering consistent is met de gekozen route."
    },
    "bron": {
      "learningIntent": "Na het handelen koppelt de deelnemer gevalideerde inzichten over de-escalatie en begrenzing en over de impact van ouderconflict op een kind aan de eigen keuze, om te zien welke overwegingen zijn route versterken of aanvullen.",
      "sourceNeedRefs": [
        "SN1",
        "SN2"
      ]
    },
    "toets": {
      "demonstrate": "Opnieuw escalatie tussen ouders herkennen, een eigen route kiezen tussen voortzetten, begrenzen of beëindigen en die keuze uitvoeren en onderbouwen.",
      "transferEvidence": "De deelnemer past de afweging toe in een gewijzigde situatie en laat zien dat de onderbouwing aansluit op de nieuwe signalen en belangen in plaats van de eerdere keuze te herhalen.",
      "newDecisionPoint": "Een vergelijkbaar gesprek met gescheiden ouders waarin de verwijten in een ander stadium of op een andere manier escaleren, zodat de deelnemer de afweging opnieuw moet maken onder gewijzigde omstandigheden.",
      "evaluationBasis": [
        "afweging",
        "aansluiting_op_situatie",
        "proportionaliteit",
        "uitvoering"
      ]
    }
  }
}
```

## Feitelijke signalen (zonder oordeel)

| Vraag | Waarneming |
| --- | --- |
| 1. Binnen de gekozen richting? | Ja. Reageren op de escalatie: voortzetten, begrenzen of beëindigen (S2, S3, S6). |
| 2. Betekenisvolle trusted context aanwezig? | Ja. scenarioPremise en Context noemen de meeluisterende dochter en het verzoek om partij te kiezen; succescriterium 2 en Reflectie wegen het belang van de dochter mee. |
| 3. Aanname sluit trusted context uit? | Nee. Aanname 1 bevestigt juist dat de dochter in de aangrenzende ruimte zit en dat het verzoek om partij te kiezen al is gedaan. |
| 4. Eén helder hoofdkeuzemoment? | Ja: reageren op de oplopende verwijten, met uitvoeren en onderbouwen. |
| 5. decisionPoint.task open? | Ja. "Bepaal … hoe je reageert: of je het gesprek voortzet, begrenst of beëindigt": de drie routes uit S6 blijven open, zonder voorkeur. |
| 6. Actie open? | Ja. "Zelf een route kiezen tussen voortzetten, begrenzen of beëindigen". |
| 7. Feedback beoordeelt afweging en uitvoering? | Ja. evaluationBasis: afweging, aansluiting_op_situatie, proportionaliteit, uitvoering; multipleDefensibleHandling beoordeelt niet de gekozen route. |
| 8. Toets bewaart de ambiguïteit? | Ja. "een eigen route kiezen tussen voortzetten, begrenzen of beëindigen"; zelfde evaluationBasis, zonder voorgeschreven handeling. |
| 9. Toets gericht op transfer? | Ja: een vergelijkbaar gesprek waarin de escalatie anders verloopt; de onderbouwing moet aansluiten op de nieuwe signalen. |
| 10. Bron alleen intentie + geldige refs? | Ja. learningIntent zonder kennisvragen; sourceNeedRefs SN1, SN2. |
| 11. Bestaan alle Bron-refs? | Ja. |
| 12. Alle sourceNeeds gebruikt? | Ja (SN1, SN2). |
| 13. Nieuwe kennisbehoefte buiten sourceNeeds? | Nee. learningIntent noemt alleen de onderwerpen van SN1 en SN2. |
| 14. Assumptions noodzakelijk? | 3 (maximum). 1: startmoment (bevat ook een herhaling van trusted feiten). 2: afbakening van het vervolg na het gesprek (open vraag uit de analyse). 3: de handelingsruimte van de deelnemer (open vraag over rol en setting). Elk heeft een eigen functie. |
| 15. sourceNeeds noodzakelijk? | 2. SN1 (methodiek, de-escalatie en begrenzing) en SN2 (wetenschappelijk onderzoek, impact op een kind dat het conflict hoort; hangt aan de trusted context van de dochter). |
| 16. Lijsten tot het maximum gevuld? | successCriteria 3 (max), assumptions 3 (max), feedback.dimensions 3 (max). sourceNeeds 2 en sourceNeedRefs 2 zijn niet het maximum. |
| 17. Concrete ongevalideerde bronnen, wetten of methodieken als feit? | Nee. |
| 18. BC Online-bloknamen? | Nee. |
| 19. Eindcontent in plaats van ontwerpintentie? | Nee. Geen dialogen, antwoordopties of toetsvragen. |
| Casus: partij-kiezen en dochter niet weggeschreven | Ja, beide blijven expliciet onderdeel van de situatie. |
| Casus: smallere focus zonder context te herschrijven | Ja. De focus ligt op de escalatie; de andere elementen blijven context en wegen mee in de afweging. |
| Casus: meerdere routes open | Ja. |
| Overig | participantRole spreekt opnieuw van het gesprek "leiden" (bron: "voert een gesprek"), zoals in V1. |

## Menselijke evaluatie

**Status: `PASS`**

Menselijke review van de baseline training-blueprint/v2.

Het V1-probleem is opgelost:

- Trusted context blijft onderdeel van premise en Context.
- Het partij-kiezen-verzoek en de dochter worden niet via assumptions verwijderd.
- De gekozen trainingsfocus mag smaller zijn zonder de situatie te herschrijven.
- decisionPoint en Actie blijven open.
- Bron gebruikt uitsluitend geldige sourceNeedRefs.
