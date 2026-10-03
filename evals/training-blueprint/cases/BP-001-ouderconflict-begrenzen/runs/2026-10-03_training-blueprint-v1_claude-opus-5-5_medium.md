# BP-001 · Run 2026-10-03 · training-blueprint/v1 · claude-opus-5-5 · medium

Baseline-run van de Training Blueprint Generation (prompt `training-blueprint/v1`, contract `blueprint-contract/v1`),
met precies één poging (`maxRetries: 0`). Configuratie bevroren op commit `c215757`.

Uitgevoerd via de Server Action `generateBlueprint` op de dev-server (`CERTUM_BLUEPRINT_PROVIDER=claude`), met de
bestaande synthetische input van CA-001, de bestaande V2-analyse (`ready`) uit de baseline en de vooraf
vastgelegde richting. Alle server-side poorten (preflight, `synthetic_only`, attestatie, analyse-invarianten,
`getProceedBlockerV2`) zijn doorlopen. Er is geen nieuwe analyse gedaan.

**Status: `PASS_WITH_NOTES`** (menselijk beoordeeld; zie "Menselijke evaluatie").

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
| durationMs | 44001 |
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
| selectedDirectionId | `escalatie-begrenzen` | gekozen richting |
| learningGoal | De deelnemer kan herkennen wanneer wederzijdse verwijten tussen ouders het gesprek doen escaleren en kan afwegen of en hoe hij het gesprek begrenst. | voorgesteld leerdoel van de richting |
| professionalDilemma | De professional moet tijdens een escalerend gesprek kiezen tussen voortzetten, begrenzen of beëindigen, terwijl de dochter delen van het gesprek kan horen en één ouder verdere medewerking afhankelijk maakt van de vraag of de professional partij kiest. | V2-analyse |
| targetAudience | Jeugdprofessionals die gesprekken voeren met (gescheiden) ouders over zorgen rondom een kind. | V2-analyse |
| sourceRefs | `S2`, `S3`, `S6` | sourceRefs van de richting |

Controle: deze waarden zijn identiek aan de V2-analyse en de gekozen richting (ja).

## Door Claude ontworpen (Blueprint-ontwerp)

```json
{
  "title": "Oplopend conflict tussen ouders herkennen en begrenzen",
  "participantRole": "Jeugdprofessional die het gesprek met twee gescheiden ouders over zorgen rondom hun dochter leidt.",
  "scenarioPremise": "Tijdens een gesprek met twee gescheiden ouders over zorgen rondom hun dochter verwijten de ouders elkaar dat de ander verantwoordelijk is voor de problemen van het kind. De toon wordt steeds feller. De professional twijfelt of hij het gesprek moet voortzetten, eerst moet begrenzen of moet beëindigen. De deelnemer staat op het moment waarop die twijfel ontstaat.",
  "decisionPoint": "Op het moment dat de wederzijdse verwijten feller worden, bepaalt de deelnemer of hij het gesprek voortzet, begrenst of beëindigt, voert die reactie zichtbaar uit richting beide ouders en onderbouwt de keuze.",
  "ambiguity": "multiple_defensible_actions",
  "successCriteria": [
    "De deelnemer benoemt concreet welke signalen in het gesprek erop wijzen dat de wederzijdse verwijten tot escalatie leiden.",
    "De deelnemer voert de gekozen reactie (voortzetten, begrenzen of beëindigen) zichtbaar en gelijkwaardig richting beide ouders uit.",
    "De deelnemer onderbouwt de keuze door de gevolgen voor het gespreksdoel, de relatie met beide ouders en de zorgen rondom de dochter tegen elkaar af te wegen."
  ],
  "assumptions": [
    {
      "assumption": "De training richt zich op het handelen binnen het lopende gesprek en niet op de afweging over het vervolg van de hulpverlening na het gesprek.",
      "reason": "De analyse laat open of het doel gespreksvaardigheid in het moment of ook vervolgbesluitvorming is; de gekozen richting draait om voortzetten, begrenzen of beëindigen van dit gesprek, en één hoofdkeuzemoment vraagt die afbakening."
    },
    {
      "assumption": "Het keuzemoment wordt gesitueerd vóórdat een ouder de professional vraagt partij te kiezen; dat verzoek en het meeluisteren van de dochter worden niet als centrale elementen van het keuzemoment uitgewerkt.",
      "reason": "Die elementen horen niet bij de bronsegmenten van deze richting en zouden er een tweede leerdoel aan toevoegen; de focus blijft zo op herkennen en begrenzen van escalatie."
    }
  ],
  "sourceNeeds": [
    {
      "question": "Welke gesprekstechnieken worden in de praktijk gehanteerd om een escalerend gesprek tussen ouders te begrenzen zonder partij te kiezen?",
      "sourceType": "methodiek",
      "whyNeeded": "Feedback en toets moeten de uitvoering van begrenzen kunnen beoordelen aan de hand van gevalideerde handelingswijzen in plaats van eigen opvattingen van de ontwerper."
    },
    {
      "question": "Welke signalen gelden als aanwijzing dat wederzijdse verwijten tussen ouders een gesprek doen escaleren?",
      "sourceType": "nog_te_bepalen",
      "whyNeeded": "Het leerdoel vraagt herkennen van escalatie; de feedback op het benoemen van signalen moet op een gevalideerde basis rusten."
    },
    {
      "question": "Wanneer wordt het beëindigen of onderbreken van een gesprek met ouders als professioneel verantwoord beschouwd, en welke verwachtingen gelden daarbij voor de professional?",
      "sourceType": "beroepscode",
      "whyNeeded": "Beëindigen is een van de verdedigbare routes; de afweging daarover moet getoetst kunnen worden aan geldende professionele normen of organisatieafspraken."
    }
  ],
  "learningArc": {
    "context": {
      "participantKnows": "Dat hij een gesprek leidt met twee gescheiden ouders over zorgen rondom hun dochter, dat de ouders elkaar verwijten maken over wie verantwoordelijk is voor de problemen van het kind en dat de toon steeds feller wordt.",
      "deliberatelyUnknown": "Hoe de ouders op een interventie zullen reageren, en welke normatieve kaders of technieken voor begrenzen en beëindigen gelden; die komen pas in de Bron-fase aan bod.",
      "tensionArises": "Voortzetten houdt het gesprek en de samenwerking open maar laat de escalatie mogelijk doorgaan; begrenzen of beëindigen doorbreekt de escalatie maar kan het gesprek over de zorgen rondom de dochter stilleggen of de relatie met een ouder belasten."
    },
    "actie": {
      "participantMust": "In het moment van oplopende verwijten zelf een keuze maken tussen voortzetten, begrenzen of beëindigen en die reactie daadwerkelijk richting beide ouders uitspreken, zonder dat routes of formuleringen worden aangereikt.",
      "performanceType": "gesprek_voeren"
    },
    "reflectie": {
      "looksBackOn": "De eigen gekozen reactie: welke signalen de deelnemer zag, op welk moment hij ingreep of juist niet, en hoe zijn woorden bij beide ouders terechtkwamen.",
      "explicitTradeOff": "De afweging tussen het gespreksdoel en de samenwerking met beide ouders enerzijds en het doorbreken van de escalatie anderzijds, inclusief wat de deelnemer met zijn keuze heeft laten liggen."
    },
    "feedback": {
      "respondsTo": "Zowel de uitvoering van de gekozen reactie in het gesprek als de kwaliteit van de onderbouwing die de deelnemer in de reflectie gaf.",
      "dimensions": [
        "Herkenning en benoeming van escalatiesignalen",
        "Gelijkwaardigheid en duidelijkheid van de interventie richting beide ouders",
        "Proportionaliteit en onderbouwing van de gekozen route"
      ],
      "multipleDefensibleHandling": "Feedback beoordeelt niet welke route gekozen is, maar of de keuze aansluit bij de waargenomen signalen, of de deelnemer de nadelen van de eigen route onderkent en of de uitvoering consistent is met de gekozen route; elke route kan sterk of zwak uitgevoerd zijn."
    },
    "bron": {
      "knowledgeQuestions": [
        "Welke gesprekstechnieken zijn gangbaar om escalatie tussen ouders te begrenzen zonder partij te kiezen?",
        "Welke signalen wijzen op escalatie door wederzijdse verwijten tussen ouders?",
        "Wanneer is het onderbreken of beëindigen van een oudergesprek professioneel verantwoord?"
      ],
      "sourceTypes": [
        "methodiek",
        "beroepscode",
        "nog_te_bepalen"
      ]
    },
    "toets": {
      "demonstrate": "Opnieuw escalatiesignalen tijdig herkennen, een passende reactie kiezen en uitvoeren, en die keuze onderbouwen met de kennis uit de Bron-fase.",
      "transferEvidence": "De deelnemer past herkennen en begrenzen toe in een situatie met een ander verloop van de escalatie en verwijst in de onderbouwing expliciet naar de gevalideerde kennis en naar de eigen eerdere afweging.",
      "newDecisionPoint": "Een vergelijkbaar oudergesprek waarin de escalatie anders opbouwt, bijvoorbeeld geleidelijker of na een eerdere begrenzing opnieuw oplaait, zodat de deelnemer opnieuw moet kiezen tussen voortzetten, begrenzen of beëindigen."
    }
  }
}
```

## Volledige gebruikerszichtbare Training Blueprint

```json
{
  "version": "blueprint-contract/v1",
  "title": "Oplopend conflict tussen ouders herkennen en begrenzen",
  "targetAudience": "Jeugdprofessionals die gesprekken voeren met (gescheiden) ouders over zorgen rondom een kind.",
  "learningGoal": "De deelnemer kan herkennen wanneer wederzijdse verwijten tussen ouders het gesprek doen escaleren en kan afwegen of en hoe hij het gesprek begrenst.",
  "professionalDilemma": "De professional moet tijdens een escalerend gesprek kiezen tussen voortzetten, begrenzen of beëindigen, terwijl de dochter delen van het gesprek kan horen en één ouder verdere medewerking afhankelijk maakt van de vraag of de professional partij kiest.",
  "selectedDirectionId": "escalatie-begrenzen",
  "sourceRefs": [
    "S2",
    "S3",
    "S6"
  ],
  "participantRole": "Jeugdprofessional die het gesprek met twee gescheiden ouders over zorgen rondom hun dochter leidt.",
  "scenarioPremise": "Tijdens een gesprek met twee gescheiden ouders over zorgen rondom hun dochter verwijten de ouders elkaar dat de ander verantwoordelijk is voor de problemen van het kind. De toon wordt steeds feller. De professional twijfelt of hij het gesprek moet voortzetten, eerst moet begrenzen of moet beëindigen. De deelnemer staat op het moment waarop die twijfel ontstaat.",
  "decisionPoint": "Op het moment dat de wederzijdse verwijten feller worden, bepaalt de deelnemer of hij het gesprek voortzet, begrenst of beëindigt, voert die reactie zichtbaar uit richting beide ouders en onderbouwt de keuze.",
  "ambiguity": "multiple_defensible_actions",
  "successCriteria": [
    "De deelnemer benoemt concreet welke signalen in het gesprek erop wijzen dat de wederzijdse verwijten tot escalatie leiden.",
    "De deelnemer voert de gekozen reactie (voortzetten, begrenzen of beëindigen) zichtbaar en gelijkwaardig richting beide ouders uit.",
    "De deelnemer onderbouwt de keuze door de gevolgen voor het gespreksdoel, de relatie met beide ouders en de zorgen rondom de dochter tegen elkaar af te wegen."
  ],
  "assumptions": [
    {
      "assumption": "De training richt zich op het handelen binnen het lopende gesprek en niet op de afweging over het vervolg van de hulpverlening na het gesprek.",
      "reason": "De analyse laat open of het doel gespreksvaardigheid in het moment of ook vervolgbesluitvorming is; de gekozen richting draait om voortzetten, begrenzen of beëindigen van dit gesprek, en één hoofdkeuzemoment vraagt die afbakening."
    },
    {
      "assumption": "Het keuzemoment wordt gesitueerd vóórdat een ouder de professional vraagt partij te kiezen; dat verzoek en het meeluisteren van de dochter worden niet als centrale elementen van het keuzemoment uitgewerkt.",
      "reason": "Die elementen horen niet bij de bronsegmenten van deze richting en zouden er een tweede leerdoel aan toevoegen; de focus blijft zo op herkennen en begrenzen van escalatie."
    }
  ],
  "sourceNeeds": [
    {
      "question": "Welke gesprekstechnieken worden in de praktijk gehanteerd om een escalerend gesprek tussen ouders te begrenzen zonder partij te kiezen?",
      "sourceType": "methodiek",
      "whyNeeded": "Feedback en toets moeten de uitvoering van begrenzen kunnen beoordelen aan de hand van gevalideerde handelingswijzen in plaats van eigen opvattingen van de ontwerper."
    },
    {
      "question": "Welke signalen gelden als aanwijzing dat wederzijdse verwijten tussen ouders een gesprek doen escaleren?",
      "sourceType": "nog_te_bepalen",
      "whyNeeded": "Het leerdoel vraagt herkennen van escalatie; de feedback op het benoemen van signalen moet op een gevalideerde basis rusten."
    },
    {
      "question": "Wanneer wordt het beëindigen of onderbreken van een gesprek met ouders als professioneel verantwoord beschouwd, en welke verwachtingen gelden daarbij voor de professional?",
      "sourceType": "beroepscode",
      "whyNeeded": "Beëindigen is een van de verdedigbare routes; de afweging daarover moet getoetst kunnen worden aan geldende professionele normen of organisatieafspraken."
    }
  ],
  "learningArc": {
    "context": {
      "participantKnows": "Dat hij een gesprek leidt met twee gescheiden ouders over zorgen rondom hun dochter, dat de ouders elkaar verwijten maken over wie verantwoordelijk is voor de problemen van het kind en dat de toon steeds feller wordt.",
      "deliberatelyUnknown": "Hoe de ouders op een interventie zullen reageren, en welke normatieve kaders of technieken voor begrenzen en beëindigen gelden; die komen pas in de Bron-fase aan bod.",
      "tensionArises": "Voortzetten houdt het gesprek en de samenwerking open maar laat de escalatie mogelijk doorgaan; begrenzen of beëindigen doorbreekt de escalatie maar kan het gesprek over de zorgen rondom de dochter stilleggen of de relatie met een ouder belasten."
    },
    "actie": {
      "participantMust": "In het moment van oplopende verwijten zelf een keuze maken tussen voortzetten, begrenzen of beëindigen en die reactie daadwerkelijk richting beide ouders uitspreken, zonder dat routes of formuleringen worden aangereikt.",
      "performanceType": "gesprek_voeren"
    },
    "reflectie": {
      "looksBackOn": "De eigen gekozen reactie: welke signalen de deelnemer zag, op welk moment hij ingreep of juist niet, en hoe zijn woorden bij beide ouders terechtkwamen.",
      "explicitTradeOff": "De afweging tussen het gespreksdoel en de samenwerking met beide ouders enerzijds en het doorbreken van de escalatie anderzijds, inclusief wat de deelnemer met zijn keuze heeft laten liggen."
    },
    "feedback": {
      "respondsTo": "Zowel de uitvoering van de gekozen reactie in het gesprek als de kwaliteit van de onderbouwing die de deelnemer in de reflectie gaf.",
      "dimensions": [
        "Herkenning en benoeming van escalatiesignalen",
        "Gelijkwaardigheid en duidelijkheid van de interventie richting beide ouders",
        "Proportionaliteit en onderbouwing van de gekozen route"
      ],
      "multipleDefensibleHandling": "Feedback beoordeelt niet welke route gekozen is, maar of de keuze aansluit bij de waargenomen signalen, of de deelnemer de nadelen van de eigen route onderkent en of de uitvoering consistent is met de gekozen route; elke route kan sterk of zwak uitgevoerd zijn."
    },
    "bron": {
      "knowledgeQuestions": [
        "Welke gesprekstechnieken zijn gangbaar om escalatie tussen ouders te begrenzen zonder partij te kiezen?",
        "Welke signalen wijzen op escalatie door wederzijdse verwijten tussen ouders?",
        "Wanneer is het onderbreken of beëindigen van een oudergesprek professioneel verantwoord?"
      ],
      "sourceTypes": [
        "methodiek",
        "beroepscode",
        "nog_te_bepalen"
      ]
    },
    "toets": {
      "demonstrate": "Opnieuw escalatiesignalen tijdig herkennen, een passende reactie kiezen en uitvoeren, en die keuze onderbouwen met de kennis uit de Bron-fase.",
      "transferEvidence": "De deelnemer past herkennen en begrenzen toe in een situatie met een ander verloop van de escalatie en verwijst in de onderbouwing expliciet naar de gevalideerde kennis en naar de eigen eerdere afweging.",
      "newDecisionPoint": "Een vergelijkbaar oudergesprek waarin de escalatie anders opbouwt, bijvoorbeeld geleidelijker of na een eerdere begrenzing opnieuw oplaait, zodat de deelnemer opnieuw moet kiezen tussen voortzetten, begrenzen of beëindigen."
    }
  }
}
```

## Feitelijke signalen (zonder oordeel)

| Vraag | Waarneming |
| --- | --- |
| 1. Binnen de gekozen richting? | Ja. Het ontwerp blijft bij voortzetten/begrenzen/beëindigen bij oplopende verwijten (S2, S3, S6). Een expliciete aanname sluit het verzoek om partij te kiezen (S5) en het meeluisteren van de dochter (S4) als centrale elementen uit. Let op: het trusted dilemma uit de analyse noemt beide wél; ontwerp en dilemma lopen daardoor niet helemaal gelijk. |
| 2. Eén helder decisionPoint? | Eén keuzemoment (voortzetten, begrenzen of beëindigen), met drie onderdelen: kiezen, uitvoeren richting beide ouders en onderbouwen. |
| 3. Nieuwe feiten in scenarioPremise? | Geen. De premise herhaalt S2, S3 en S6 en laat de leeftijd van de dochter weg. "De deelnemer staat op het moment waarop die twijfel ontstaat" is een ontwerpkeuze. participantRole spreekt van het gesprek "leiden"; de bron zegt "voert een gesprek". |
| 4. Assumptions | 2. De eerste beantwoordt een open vraag uit de analyse (gespreksvaardigheid in het moment vs. vervolgbesluitvorming) als ontwerpkeuze. De tweede bakent de focus af tegenover S4/S5. Beide zijn expliciet als aanname benoemd en hebben een ontwerpfunctie. |
| 5. SourceNeeds | 3, plus 3 knowledgeQuestions in Bron. |
| 6. Concrete bronnen, wetten, methodieken of richtlijnen? | Geen concrete bron of kader genoemd. Wel sourceTypes `methodiek` en `beroepscode` als type. Geen meerzijdige partijdigheid of ander kader als waarheid. |
| 7. Ambiguity zoals verwacht? | Ja: `multiple_defensible_actions` (verwacht: `multiple_defensible_actions`). |
| 8. Feedback bij meerdere routes | Ja. Beoordeelt niet welke route, maar of de keuze aansluit bij de signalen, de nadelen erkend worden en de uitvoering consistent is. |
| 9. Reflectie terug naar de eigen keuze? | Ja: eigen gekozen reactie, moment van ingrijpen en effect bij beide ouders, plus de expliciete afweging. |
| 10. Bron pas ná Actie, Reflectie, Feedback? | Ja. Context noemt kaders en technieken expliciet als bewust onbekend tot de Bron-fase. |
| 11. Toets: transfer of kennisquiz? | Transfer: een vergelijkbaar oudergesprek met een ander escalatieverloop. transferEvidence vraagt daarnaast expliciet te verwijzen naar de gevalideerde kennis. |
| 12. BC Online-bloknamen? | Geen. |
| 13. Overige aanwijzingen van content schrijven? | Geen uitgeschreven dialogen, antwoordopties of toetsvragen. |
| Casus: ambiguïteit behouden | Ja, drie routes blijven open. |
| Casus: geen kaders als waarheid | Ja, niet aangetroffen. |
| Casus: geen nieuw conflictgedrag van ouders | Niet in de casus. Toets beschrijft als nieuwe situatie een escalatie die "na een eerdere begrenzing opnieuw oplaait": een variatie voor de transfer, geen bronfeit. |

## Menselijke evaluatie

**Status: `PASS_WITH_NOTES`**

Menselijke review van de baseline training-blueprint/v1.

### Sterk

- Helder professioneel keuzemoment.
- Meerdere routes blijven verdedigbaar.
- Reflectie en Feedback sluiten aan op de gemaakte keuze.
- Toets richt zich op transfer.
- Geen concrete BC Online-blokken of ongevalideerde bronnen.

### Aandachtspunt

- Assumption 2 scoped het partij-kiezen-verzoek en het meeluisteren van de dochter uit het daadwerkelijke ontwerp,
  terwijl deze elementen wel onderdeel zijn van de trusted professionele kern.
- Een gekozen trainingsrichting mag focus aanbrengen, maar assumptions mogen trusted context niet stil buiten werking
  stellen wanneer die context betekenisvol blijft voor dilemma of leerdoel.
