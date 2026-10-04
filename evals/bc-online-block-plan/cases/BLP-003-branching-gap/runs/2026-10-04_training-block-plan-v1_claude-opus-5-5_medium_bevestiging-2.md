# BLP-003 · Bevestigingsrun 2 · 2026-10-04 · training-block-plan/v1 · claude-opus-5-5 · medium

Laatste bevestigingsrun na het verwijderen van de vrije-tekst branching-invariant (commit `f438caa`). Zelfde
prompt, contract, catalogus, model, effort en fixture. Precies één poging (`maxRetries: 0`), geen retry.

Uitgevoerd via de Server Action `generateBlockPlan` op de dev-server (`CERTUM_ANALYSIS_PROVIDER=mock`,
`CERTUM_BLUEPRINT_PROVIDER=mock`, `CERTUM_BLOCK_PLAN_PROVIDER=claude`), met exact de goedgekeurde Blueprint
`BLP-003` uit `test/fixtures/approved-blueprints.json`.

**Status: `PENDING_REVIEW`** (nog geen menselijke beoordeling; geen PASS/FAIL).

## Configuratie en metadata

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
| durationMs | 58544 |
| outcome | success |
| plannedBlocks | 14 |
| capabilityGaps | 2 |
| invarianten | geen schendingen (plan toegelaten door provider én flow) |

## Course shell en trusted velden

| Veld | Waarde |
| --- | --- |
| title (trusted) | Synthetisch: volgorde van contacten met route-afhankelijk vervolg |
| learningGoals (trusted) | De deelnemer kan de voor- en nadelen van eerst school benaderen versus eerst het gezin spreken tegen elkaar afwegen en een gemotiveerde keuze maken. |
| skjPoints / status | null / concept |
| estimatedDurationMinutes (cursus / start) | null / null |
| followUpRecommendation | null |
| description | Praktijksimulatie voor jeugdprofessionals over de volgorde van contacten met school en gezin wanneer beide de jongere verschillend beschrijven. De deelnemer weegt eerst verhelderen bij school af tegen eerst open bespreken met ouder en jongere, maakt een gemotiveerde keuze en werkt de eerste stap uit. |
| startIntent.explanationIntent | Uitleggen dat de deelnemer een situatie doorloopt met meerdere verdedigbare routes en dat er geen goed of fout antwoord is. Benadrukken dat de kwaliteit van de afweging en onderbouwing centraal staat. Kort de opbouw toelichten: situatie, keuze en uitwerking, terugblik, feedback, bronkoppeling en een nieuwe situatie. |
| endIntent.closingIntent | De training afronden door te benadrukken dat beide volgordes verdedigbaar zijn en dat professionele kwaliteit zit in het wegen van routes, het aansluiten op de situatie en het bewust omgaan met consequenties voor gezin en school. |
| endIntent.summaryIntent | Kort samenvatten welke afwegingen bij de volgorde van contacten een rol spelen, en dat transparantie, onbekende punten en de afwezigheid van acute zorgen de keuze mede bepalen. |

## Geplande blokken

### 1. context · `certum.bco.tekst`

- **purpose:** De situatie schetsen vanuit de rol van de jeugdprofessional op de dag vóór het geplande gezinsgesprek. Daarin komen het ontbreken van acute veiligheidszorgen en de praktische mogelijkheid om school nog te benaderen aan bod.
- **whyThisBlock:** Een tekstuele situatieschets is het eenvoudigste middel om rol, tijdstip en randvoorwaarden helder neer te zetten.
- **configurationIntent:**
  - *situatieschets:* De rol, de dag vóór het gezinsgesprek, de afwezigheid van acute zorgen en de nog bestaande mogelijkheid om school te benaderen beschrijven. Dit volgt de aanname uit de Blueprint.
  - *bewust onbekend:* Niets vermelden over instemming van ouder en jongere met het schoolcontact, over de leeftijd van de jongere of over diens aanwezigheid bij het gesprek.

### 2. context · `certum.bco.whatsapp-email`

- **purpose:** De deelnemer laten zien hoe school en ouder de jongere elk verschillend beschrijven. Zo voelt hij de spanning tussen beide perspectieven.
- **whyThisBlock:** Gesimuleerde berichten maken de twee uiteenlopende perspectieven realistisch zichtbaar zonder dat de deelnemer hoeft te antwoorden.
- **configurationIntent:**
  - *bericht school:* Een bericht van school over teruggetrokken en gespannen gedrag van de jongere.
  - *bericht ouder:* Een bericht van de ouder die dit thuis niet herkent en vindt dat school het probleem groter maakt dan het is.

### 3. actie · `certum.bco.poll`

- **purpose:** De deelnemer kiest welke volgorde van contacten hij hanteert: eerst school of eerst het gezin.
- **whyThisBlock:** Een poll legt een routekeuze vast zonder juist antwoord en past daarmee bij meerdere verdedigbare handelingen.
- **configurationIntent:**
  - *opties:* Twee neutraal geformuleerde opties voor de twee volgordes, zonder voorkeur of waardering.

### 4. actie · `certum.bco.open-vraag`

- **purpose:** De deelnemer onderbouwt zijn gekozen volgorde met de voor- en nadelen van beide routes en met de invloed van de afwezige acute zorgen en de onbekende punten.
- **whyThisBlock:** Een open antwoord maakt de afweging zichtbaar. Een meerkeuzeblok zou die afweging reduceren tot één juist antwoord.
- **configurationIntent:**
  - *opdracht:* De deelnemer vragen zijn keuze te onderbouwen en beide routes te wegen, met verwijzing naar de concrete situatie.
  - *voorbeeldantwoord:* Een voorbeeld dat beide routes serieus weegt, zonder een van beide als juist neer te zetten.

### 5. actie · `certum.bco.conditionele-logica`

- **purpose:** Op basis van de pollkeuze een korte route-specifieke situatietekst tonen die de eerste stap van de gekozen route inleidt.
- **whyThisBlock:** Conditionele tekstweergave is het enige aangetoonde middel om op de gekozen route in te spelen. Het routeert niet; zie de capabilityGap.
- **configurationIntent:**
  - *conditie:* Koppelen aan de keuze in de voorgaande poll.
  - *tekst per route:* Voor eerst school een korte inleiding op het contact met school, voor eerst gezin een korte inleiding op het gezinsgesprek.

### 6. actie · `certum.bco.productie`

- **purpose:** De deelnemer werkt de eerste stap van zijn gekozen route schriftelijk uit. Hij beschrijft hoe hij het contact opent en de uiteenlopende perspectieven aan de orde stelt.
- **whyThisBlock:** Een schriftelijke productie met sjabloon laat het concrete handelen zien voor beide routes binnen één blok.
- **configurationIntent:**
  - *sjabloon:* Ruimte voor de gekozen route, de aanpak van het eerste contact en hoe de deelnemer omgaat met transparantie en de onbekende punten.
  - *minimum woorden:* Een bescheiden minimum zodat de uitwerking concreet genoeg wordt.

### 7. reflectie · `certum.bco.open-vraag`

- **purpose:** De deelnemer kijkt terug op zijn gekozen volgorde en de doorslaggevende argumenten. Hij maakt expliciet wat hij wint en riskeert, inclusief de rol van de onbekende instemming en de positie van de jongere.
- **whyThisBlock:** Een open vraag is het eenvoudigste middel voor een persoonlijke terugblik op de eigen afweging.
- **configurationIntent:**
  - *opdracht:* Laten benoemen wat de gekozen volgorde oplevert en riskeert voor het vertrouwen van ouder en jongere en voor de relatie met school, en hoe de deelnemer die risico's beperkt.

### 8. feedback · `certum.bco.ai-feedback`

- **purpose:** Feedback geven op de gekozen volgorde, de uitwerking en de kwaliteit van de onderbouwing, langs de dimensies uit de Blueprint.
- **whyThisBlock:** AI Feedback ontvangt de eerdere antwoorden als context en kan inhoudelijk op afweging en onderbouwing reageren.
- **configurationIntent:**
  - *beoordelingsbasis:* Beoordelen op afweging, aansluiting op de situatie, onderbouwing en consequenties.
  - *verdedigbaarheid:* Beide volgordes als verdedigbaar behandelen. Niet de gekozen route beoordelen, maar of beide routes zijn gewogen en of de risico's van de eigen route zijn benoemd en beperkt.
  - *context:* De antwoorden uit poll, onderbouwing, productie en reflectie gebruiken.

### 9. bron · `certum.bco.tekst`

- **purpose:** De deelnemer legt zijn keuze naast later gevalideerde kaders over informatiedeling met school en naast methodische inzichten over uiteenlopende perspectieven en transparantie.
- **whyThisBlock:** Een tekstblok kan later gevalideerde broninhoud tonen en die koppelen aan de eerdere afweging.
- **configurationIntent:**
  - *broninhoud:* Later gevalideerde kennis tonen voor SN1 en SN2, zonder één route als juist neer te zetten.
  - *koppeling:* De deelnemer uitnodigen na te gaan welke van zijn argumenten worden versterkt, genuanceerd of aangevuld.

### 10. toets · `certum.bco.tekst`

- **purpose:** Een gewijzigde, vergelijkbare situatie presenteren waarin opnieuw een volgorde van contacten gekozen moet worden.
- **whyThisBlock:** Een tekstuele schets is het eenvoudigste middel om een nieuwe transfersituatie neer te zetten.
- **configurationIntent:**
  - *nieuwe situatie:* Een vergelijkbare casus met gewijzigde omstandigheden die een aangepaste afweging vragen.

### 11. toets · `certum.bco.poll`

- **purpose:** De deelnemer kiest in de nieuwe situatie opnieuw een volgorde van contacten.
- **whyThisBlock:** Een poll legt de route vast zonder juist antwoord, passend bij meerdere verdedigbare handelingen.
- **configurationIntent:**
  - *opties:* Neutrale opties voor de mogelijke volgordes in de nieuwe situatie.

### 12. toets · `certum.bco.conditionele-logica`

- **purpose:** Een korte route-specifieke vervolgsituatie tonen op basis van de gekozen route.
- **whyThisBlock:** Conditionele tekstweergave is het enige aangetoonde middel om op de route in te spelen. Het routeert niet; zie de capabilityGap.
- **configurationIntent:**
  - *conditie:* Koppelen aan de keuze in de toetspoll.
  - *tekst per route:* Per route een korte vervolgsituatie die de deelnemer daarna uitwerkt.

### 13. toets · `certum.bco.open-vraag`

- **purpose:** De deelnemer onderbouwt zijn keuze en vervolgstap in de nieuwe situatie. Hij laat zien hoe hij zijn afweging aanpast en daarbij inzichten uit de eerdere keuze en de bronkoppeling gebruikt.
- **whyThisBlock:** Een open antwoord maakt transfer en afweging zichtbaar. Een toets met één juist antwoord zou de keuze reduceren tot goed of fout.
- **configurationIntent:**
  - *opdracht:* Laten onderbouwen met voor- en nadelen, aansluiting op de nieuwe omstandigheden, consequenties voor gezin en school en expliciete verwijzing naar eerdere inzichten.
  - *voorbeeldantwoord:* Een voorbeeld van een aangepaste, goed onderbouwde afweging zonder voorkeursroute.

### 14. toets · `certum.bco.ai-feedback`

- **purpose:** De transferopdracht terugkoppelen langs dezelfde beoordelingsbasis als eerder.
- **whyThisBlock:** AI Feedback kan de toetsantwoorden en de eerdere antwoorden gebruiken om transfer zichtbaar te maken.
- **configurationIntent:**
  - *beoordelingsbasis:* Beoordelen op afweging, aansluiting op de situatie, onderbouwing en consequenties, met aandacht voor aanpassing aan de gewijzigde omstandigheden.
  - *verdedigbaarheid:* Geen route als juist beoordelen; de kwaliteit van de afweging staat centraal.

## Capability gaps

1. **actie: Na de gekozen volgorde een route-afhankelijk vervolg bieden: wie eerst school benadert, voert daarna het contact met school; wie eerst het gezin spreekt, voert daarna het gezinsgesprek, elk in een eigen vervolgblok.**
   - *whyNeeded:* De Blueprint schrijft voor dat de deelnemer de eerste stap van de gekozen route daadwerkelijk uitvoert en een ander vervolg krijgt afhankelijk van de keuze. Dat vraagt routering naar verschillende vervolgblokken, en die is in BC Online niet aangetoond.
   - *workaround (partial):* Een Poll legt de gekozen volgorde vast. Conditionele logica toont daarna een korte route-specifieke situatietekst. In één gezamenlijk Productieblok werkt de deelnemer de eerste stap van zijn eigen route schriftelijk uit.
   - *limitation:* Er is geen apart vervolgblok per route en geen gesprek in het moment met school of gezin. Alle deelnemers doorlopen dezelfde blokken. De route-afhankelijke uitvoering blijft beperkt tot tekstweergave en een schriftelijke uitwerking, dus het gat blijft bestaan.
2. **toets: In de transfersituatie opnieuw een route-afhankelijk vervolg bieden, waarbij elke gekozen route naar een eigen vervolgsituatie leidt die de deelnemer daarna doorloopt.**
   - *whyNeeded:* Het nieuwe keuzemoment in de Toets vraagt volgens de Blueprint dat het vervolg afhangt van de gekozen route. Daarvoor is branching naar verschillende vervolgblokken nodig, en die is niet aangetoond.
   - *workaround (partial):* Een Poll legt de route in de nieuwe situatie vast. Conditionele logica toont een korte route-specifieke vervolgsituatie. Een Open vraag laat de deelnemer daarop zijn aangepaste afweging en vervolgstap uitwerken.
   - *limitation:* Er is geen eigen vervolgsituatie als apart doorlopen traject per route. Het vervolg blijft een tekstuele variatie binnen dezelfde blokvolgorde, dus het gat blijft bestaan.

## Volledige Block Plan-output

```json
{
  "version": "bc-online-block-plan/v1",
  "blueprintVersion": "blueprint-contract/v2",
  "courseShell": {
    "title": "Synthetisch: volgorde van contacten met route-afhankelijk vervolg",
    "description": "Praktijksimulatie voor jeugdprofessionals over de volgorde van contacten met school en gezin wanneer beide de jongere verschillend beschrijven. De deelnemer weegt eerst verhelderen bij school af tegen eerst open bespreken met ouder en jongere, maakt een gemotiveerde keuze en werkt de eerste stap uit.",
    "estimatedDurationMinutes": null,
    "skjPoints": null,
    "status": "concept"
  },
  "startIntent": {
    "explanationIntent": "Uitleggen dat de deelnemer een situatie doorloopt met meerdere verdedigbare routes en dat er geen goed of fout antwoord is. Benadrukken dat de kwaliteit van de afweging en onderbouwing centraal staat. Kort de opbouw toelichten: situatie, keuze en uitwerking, terugblik, feedback, bronkoppeling en een nieuwe situatie.",
    "estimatedDurationMinutes": null,
    "learningGoals": [
      "De deelnemer kan de voor- en nadelen van eerst school benaderen versus eerst het gezin spreken tegen elkaar afwegen en een gemotiveerde keuze maken."
    ]
  },
  "plannedBlocks": [
    {
      "id": "blok-1",
      "sequence": 1,
      "certumPhase": "context",
      "catalogBlockId": "certum.bco.tekst",
      "purpose": "De situatie schetsen vanuit de rol van de jeugdprofessional op de dag vóór het geplande gezinsgesprek. Daarin komen het ontbreken van acute veiligheidszorgen en de praktische mogelijkheid om school nog te benaderen aan bod.",
      "whyThisBlock": "Een tekstuele situatieschets is het eenvoudigste middel om rol, tijdstip en randvoorwaarden helder neer te zetten.",
      "configurationIntent": [
        {
          "setting": "situatieschets",
          "intent": "De rol, de dag vóór het gezinsgesprek, de afwezigheid van acute zorgen en de nog bestaande mogelijkheid om school te benaderen beschrijven. Dit volgt de aanname uit de Blueprint."
        },
        {
          "setting": "bewust onbekend",
          "intent": "Niets vermelden over instemming van ouder en jongere met het schoolcontact, over de leeftijd van de jongere of over diens aanwezigheid bij het gesprek."
        }
      ]
    },
    {
      "id": "blok-2",
      "sequence": 2,
      "certumPhase": "context",
      "catalogBlockId": "certum.bco.whatsapp-email",
      "purpose": "De deelnemer laten zien hoe school en ouder de jongere elk verschillend beschrijven. Zo voelt hij de spanning tussen beide perspectieven.",
      "whyThisBlock": "Gesimuleerde berichten maken de twee uiteenlopende perspectieven realistisch zichtbaar zonder dat de deelnemer hoeft te antwoorden.",
      "configurationIntent": [
        {
          "setting": "bericht school",
          "intent": "Een bericht van school over teruggetrokken en gespannen gedrag van de jongere."
        },
        {
          "setting": "bericht ouder",
          "intent": "Een bericht van de ouder die dit thuis niet herkent en vindt dat school het probleem groter maakt dan het is."
        }
      ]
    },
    {
      "id": "blok-3",
      "sequence": 3,
      "certumPhase": "actie",
      "catalogBlockId": "certum.bco.poll",
      "purpose": "De deelnemer kiest welke volgorde van contacten hij hanteert: eerst school of eerst het gezin.",
      "whyThisBlock": "Een poll legt een routekeuze vast zonder juist antwoord en past daarmee bij meerdere verdedigbare handelingen.",
      "configurationIntent": [
        {
          "setting": "opties",
          "intent": "Twee neutraal geformuleerde opties voor de twee volgordes, zonder voorkeur of waardering."
        }
      ]
    },
    {
      "id": "blok-4",
      "sequence": 4,
      "certumPhase": "actie",
      "catalogBlockId": "certum.bco.open-vraag",
      "purpose": "De deelnemer onderbouwt zijn gekozen volgorde met de voor- en nadelen van beide routes en met de invloed van de afwezige acute zorgen en de onbekende punten.",
      "whyThisBlock": "Een open antwoord maakt de afweging zichtbaar. Een meerkeuzeblok zou die afweging reduceren tot één juist antwoord.",
      "configurationIntent": [
        {
          "setting": "opdracht",
          "intent": "De deelnemer vragen zijn keuze te onderbouwen en beide routes te wegen, met verwijzing naar de concrete situatie."
        },
        {
          "setting": "voorbeeldantwoord",
          "intent": "Een voorbeeld dat beide routes serieus weegt, zonder een van beide als juist neer te zetten."
        }
      ]
    },
    {
      "id": "blok-5",
      "sequence": 5,
      "certumPhase": "actie",
      "catalogBlockId": "certum.bco.conditionele-logica",
      "purpose": "Op basis van de pollkeuze een korte route-specifieke situatietekst tonen die de eerste stap van de gekozen route inleidt.",
      "whyThisBlock": "Conditionele tekstweergave is het enige aangetoonde middel om op de gekozen route in te spelen. Het routeert niet; zie de capabilityGap.",
      "configurationIntent": [
        {
          "setting": "conditie",
          "intent": "Koppelen aan de keuze in de voorgaande poll."
        },
        {
          "setting": "tekst per route",
          "intent": "Voor eerst school een korte inleiding op het contact met school, voor eerst gezin een korte inleiding op het gezinsgesprek."
        }
      ]
    },
    {
      "id": "blok-6",
      "sequence": 6,
      "certumPhase": "actie",
      "catalogBlockId": "certum.bco.productie",
      "purpose": "De deelnemer werkt de eerste stap van zijn gekozen route schriftelijk uit. Hij beschrijft hoe hij het contact opent en de uiteenlopende perspectieven aan de orde stelt.",
      "whyThisBlock": "Een schriftelijke productie met sjabloon laat het concrete handelen zien voor beide routes binnen één blok.",
      "configurationIntent": [
        {
          "setting": "sjabloon",
          "intent": "Ruimte voor de gekozen route, de aanpak van het eerste contact en hoe de deelnemer omgaat met transparantie en de onbekende punten."
        },
        {
          "setting": "minimum woorden",
          "intent": "Een bescheiden minimum zodat de uitwerking concreet genoeg wordt."
        }
      ]
    },
    {
      "id": "blok-7",
      "sequence": 7,
      "certumPhase": "reflectie",
      "catalogBlockId": "certum.bco.open-vraag",
      "purpose": "De deelnemer kijkt terug op zijn gekozen volgorde en de doorslaggevende argumenten. Hij maakt expliciet wat hij wint en riskeert, inclusief de rol van de onbekende instemming en de positie van de jongere.",
      "whyThisBlock": "Een open vraag is het eenvoudigste middel voor een persoonlijke terugblik op de eigen afweging.",
      "configurationIntent": [
        {
          "setting": "opdracht",
          "intent": "Laten benoemen wat de gekozen volgorde oplevert en riskeert voor het vertrouwen van ouder en jongere en voor de relatie met school, en hoe de deelnemer die risico's beperkt."
        }
      ]
    },
    {
      "id": "blok-8",
      "sequence": 8,
      "certumPhase": "feedback",
      "catalogBlockId": "certum.bco.ai-feedback",
      "purpose": "Feedback geven op de gekozen volgorde, de uitwerking en de kwaliteit van de onderbouwing, langs de dimensies uit de Blueprint.",
      "whyThisBlock": "AI Feedback ontvangt de eerdere antwoorden als context en kan inhoudelijk op afweging en onderbouwing reageren.",
      "configurationIntent": [
        {
          "setting": "beoordelingsbasis",
          "intent": "Beoordelen op afweging, aansluiting op de situatie, onderbouwing en consequenties."
        },
        {
          "setting": "verdedigbaarheid",
          "intent": "Beide volgordes als verdedigbaar behandelen. Niet de gekozen route beoordelen, maar of beide routes zijn gewogen en of de risico's van de eigen route zijn benoemd en beperkt."
        },
        {
          "setting": "context",
          "intent": "De antwoorden uit poll, onderbouwing, productie en reflectie gebruiken."
        }
      ]
    },
    {
      "id": "blok-9",
      "sequence": 9,
      "certumPhase": "bron",
      "catalogBlockId": "certum.bco.tekst",
      "purpose": "De deelnemer legt zijn keuze naast later gevalideerde kaders over informatiedeling met school en naast methodische inzichten over uiteenlopende perspectieven en transparantie.",
      "whyThisBlock": "Een tekstblok kan later gevalideerde broninhoud tonen en die koppelen aan de eerdere afweging.",
      "configurationIntent": [
        {
          "setting": "broninhoud",
          "intent": "Later gevalideerde kennis tonen voor SN1 en SN2, zonder één route als juist neer te zetten."
        },
        {
          "setting": "koppeling",
          "intent": "De deelnemer uitnodigen na te gaan welke van zijn argumenten worden versterkt, genuanceerd of aangevuld."
        }
      ]
    },
    {
      "id": "blok-10",
      "sequence": 10,
      "certumPhase": "toets",
      "catalogBlockId": "certum.bco.tekst",
      "purpose": "Een gewijzigde, vergelijkbare situatie presenteren waarin opnieuw een volgorde van contacten gekozen moet worden.",
      "whyThisBlock": "Een tekstuele schets is het eenvoudigste middel om een nieuwe transfersituatie neer te zetten.",
      "configurationIntent": [
        {
          "setting": "nieuwe situatie",
          "intent": "Een vergelijkbare casus met gewijzigde omstandigheden die een aangepaste afweging vragen."
        }
      ]
    },
    {
      "id": "blok-11",
      "sequence": 11,
      "certumPhase": "toets",
      "catalogBlockId": "certum.bco.poll",
      "purpose": "De deelnemer kiest in de nieuwe situatie opnieuw een volgorde van contacten.",
      "whyThisBlock": "Een poll legt de route vast zonder juist antwoord, passend bij meerdere verdedigbare handelingen.",
      "configurationIntent": [
        {
          "setting": "opties",
          "intent": "Neutrale opties voor de mogelijke volgordes in de nieuwe situatie."
        }
      ]
    },
    {
      "id": "blok-12",
      "sequence": 12,
      "certumPhase": "toets",
      "catalogBlockId": "certum.bco.conditionele-logica",
      "purpose": "Een korte route-specifieke vervolgsituatie tonen op basis van de gekozen route.",
      "whyThisBlock": "Conditionele tekstweergave is het enige aangetoonde middel om op de route in te spelen. Het routeert niet; zie de capabilityGap.",
      "configurationIntent": [
        {
          "setting": "conditie",
          "intent": "Koppelen aan de keuze in de toetspoll."
        },
        {
          "setting": "tekst per route",
          "intent": "Per route een korte vervolgsituatie die de deelnemer daarna uitwerkt."
        }
      ]
    },
    {
      "id": "blok-13",
      "sequence": 13,
      "certumPhase": "toets",
      "catalogBlockId": "certum.bco.open-vraag",
      "purpose": "De deelnemer onderbouwt zijn keuze en vervolgstap in de nieuwe situatie. Hij laat zien hoe hij zijn afweging aanpast en daarbij inzichten uit de eerdere keuze en de bronkoppeling gebruikt.",
      "whyThisBlock": "Een open antwoord maakt transfer en afweging zichtbaar. Een toets met één juist antwoord zou de keuze reduceren tot goed of fout.",
      "configurationIntent": [
        {
          "setting": "opdracht",
          "intent": "Laten onderbouwen met voor- en nadelen, aansluiting op de nieuwe omstandigheden, consequenties voor gezin en school en expliciete verwijzing naar eerdere inzichten."
        },
        {
          "setting": "voorbeeldantwoord",
          "intent": "Een voorbeeld van een aangepaste, goed onderbouwde afweging zonder voorkeursroute."
        }
      ]
    },
    {
      "id": "blok-14",
      "sequence": 14,
      "certumPhase": "toets",
      "catalogBlockId": "certum.bco.ai-feedback",
      "purpose": "De transferopdracht terugkoppelen langs dezelfde beoordelingsbasis als eerder.",
      "whyThisBlock": "AI Feedback kan de toetsantwoorden en de eerdere antwoorden gebruiken om transfer zichtbaar te maken.",
      "configurationIntent": [
        {
          "setting": "beoordelingsbasis",
          "intent": "Beoordelen op afweging, aansluiting op de situatie, onderbouwing en consequenties, met aandacht voor aanpassing aan de gewijzigde omstandigheden."
        },
        {
          "setting": "verdedigbaarheid",
          "intent": "Geen route als juist beoordelen; de kwaliteit van de afweging staat centraal."
        }
      ]
    }
  ],
  "endIntent": {
    "closingIntent": "De training afronden door te benadrukken dat beide volgordes verdedigbaar zijn en dat professionele kwaliteit zit in het wegen van routes, het aansluiten op de situatie en het bewust omgaan met consequenties voor gezin en school.",
    "summaryIntent": "Kort samenvatten welke afwegingen bij de volgorde van contacten een rol spelen, en dat transparantie, onbekende punten en de afwezigheid van acute zorgen de keuze mede bepalen.",
    "followUpRecommendation": null
  },
  "capabilityGaps": [
    {
      "certumPhase": "actie",
      "need": "Na de gekozen volgorde een route-afhankelijk vervolg bieden: wie eerst school benadert, voert daarna het contact met school; wie eerst het gezin spreekt, voert daarna het gezinsgesprek, elk in een eigen vervolgblok.",
      "whyNeeded": "De Blueprint schrijft voor dat de deelnemer de eerste stap van de gekozen route daadwerkelijk uitvoert en een ander vervolg krijgt afhankelijk van de keuze. Dat vraagt routering naar verschillende vervolgblokken, en die is in BC Online niet aangetoond.",
      "workaround": {
        "type": "partial",
        "description": "Een Poll legt de gekozen volgorde vast. Conditionele logica toont daarna een korte route-specifieke situatietekst. In één gezamenlijk Productieblok werkt de deelnemer de eerste stap van zijn eigen route schriftelijk uit.",
        "limitation": "Er is geen apart vervolgblok per route en geen gesprek in het moment met school of gezin. Alle deelnemers doorlopen dezelfde blokken. De route-afhankelijke uitvoering blijft beperkt tot tekstweergave en een schriftelijke uitwerking, dus het gat blijft bestaan."
      }
    },
    {
      "certumPhase": "toets",
      "need": "In de transfersituatie opnieuw een route-afhankelijk vervolg bieden, waarbij elke gekozen route naar een eigen vervolgsituatie leidt die de deelnemer daarna doorloopt.",
      "whyNeeded": "Het nieuwe keuzemoment in de Toets vraagt volgens de Blueprint dat het vervolg afhangt van de gekozen route. Daarvoor is branching naar verschillende vervolgblokken nodig, en die is niet aangetoond.",
      "workaround": {
        "type": "partial",
        "description": "Een Poll legt de route in de nieuwe situatie vast. Conditionele logica toont een korte route-specifieke vervolgsituatie. Een Open vraag laat de deelnemer daarop zijn aangepaste afweging en vervolgstap uitwerken.",
        "limitation": "Er is geen eigen vervolgsituatie als apart doorlopen traject per route. Het vervolg blijft een tekstuele variatie binnen dezelfde blokvolgorde, dus het gat blijft bestaan."
      }
    }
  ]
}
```

## Feitelijke signalen (zonder oordeel)

| Vraag | Waarneming |
| --- | --- |
| Staat branching expliciet als capability gap? | Ja. Twee gaps: Actie ("route-afhankelijk vervolg … elk in een eigen vervolgblok … routering naar verschillende vervolgblokken, en die is in BC Online niet aangetoond") en Toets (idem voor de transfersituatie). |
| Blijft het gap bestaan? | Ja. Beide limitations eindigen met "dus het gat blijft bestaan". |
| Geen fictief bloktype? | Ja. Alle 14 blokken zijn planbare catalogus-ids (Tekst, WhatsApp/E-mail, Poll, Open vraag, Conditionele logica, Productie, AI Feedback). |
| Conditionele logica alleen als beperkt alternatief? | Ja. Beide Conditionele-logica-blokken: "Conditionele tekstweergave is het enige aangetoonde middel om op de gekozen route in te spelen. Het routeert niet; zie de capabilityGap." |
| Maakt de limitation duidelijk dat er geen echte alternatieve vervolgroutes zijn? | Ja. "Er is geen apart vervolgblok per route en geen gesprek in het moment met school of gezin. Alle deelnemers doorlopen dezelfde blokken." en "Het vervolg blijft een tekstuele variatie binnen dezelfde blokvolgorde." |
| Doet een gepland blok alsof het deelnemers werkelijk routeert? | Nee. De route-specifieke inhoud is steeds een korte tekst (Conditionele logica) gevolgd door een gezamenlijk blok (Productie of Open vraag). |
| Blijft het plan bruikbaar ondanks de beperking? | Ja. Poll (keuze zonder juist antwoord) + Open vraag (onderbouwing) + Conditionele logica (route-specifieke tekst) + Productie (uitwerking van de eerste stap); Toets herhaalt dit in een nieuwe situatie. |
| Open keuze behouden? | Ja. Actie en Toets bevatten open uitvoeringsvormen (Open vraag, Productie); geen Meerkeuze of formele Toets; AI Feedback beoordeelt "niet de gekozen route". |
| Vaste velden | Titel en leerdoel letterlijk uit de Blueprint; `skjPoints: null`, `status: concept`, beide tijdsduren `null`, `followUpRecommendation: null`. |
| Bron | Alleen voorbereid: "Later gevalideerde kennis tonen voor SN1 en SN2, zonder één route als juist neer te zetten"; geen bron, wet of document genoemd. |
| Overig | 14 blokken (aan de ruime kant). WhatsApp/E-mail wordt gebruikt als berichtweergave van de twee perspectieven, zonder dat de deelnemer antwoordt (zoals de catalogus toestaat). AI Feedback noemt als context de antwoorden uit poll, onderbouwing, productie en reflectie; de catalogus toont alleen dat AI Feedback antwoorden op eerdere vraagblokken krijgt. |
| Validator | De oude vrije-tekstinvariant (verwijderd in `f438caa`) had dit plan afgewezen: de eerlijke ontkenning "Het routeert niet" bevat het patroon `routeer`. Dit ondersteunt de beoordeling van de vorige bevestigingsrun als `INCONCLUSIVE` (blocked by validator). |

## Menselijke evaluatie

**Status: `PENDING_REVIEW`**

Nog niet beoordeeld.
