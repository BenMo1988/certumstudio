# BLP-002 · Run 2026-10-04 · training-block-plan/v1 · claude-opus-5-5 · medium

Baseline-run van BC Online Block Plan Generation (prompt `training-block-plan/v1`, contract
`bc-online-block-plan/v1`), met precies één poging (`maxRetries: 0`). Configuratie bevroren op commit `63b885e`.

Uitgevoerd via de Server Action `generateBlockPlan` op de dev-server (`CERTUM_ANALYSIS_PROVIDER=mock`,
`CERTUM_BLUEPRINT_PROVIDER=mock`, `CERTUM_BLOCK_PLAN_PROVIDER=claude`), met exact de goedgekeurde Blueprint
`BLP-002` uit `test/fixtures/approved-blueprints.json`.

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
| durationMs | 57881 |
| outcome | success |
| plannedBlocks | 11 |
| capabilityGaps | 3 |
| invarianten | geen schendingen (plan toegelaten door provider én flow) |

## Course shell en trusted velden

| Veld | Waarde |
| --- | --- |
| title (trusted) | Nooduitgang direct vrijmaken ondanks verzoek collega om te wachten |
| learningGoals (trusted) | De deelnemer kan de nooduitgang direct vrijmaken en dit daarna melden aan de verantwoordelijke, en kan aan de collega uitleggen waarom het verzoek om te wachten niet wordt gevolgd. |
| skjPoints | null |
| status | concept |
| estimatedDurationMinutes (cursus / start) | null / null |
| description | Praktijksimulatie voor begeleiders van groepsactiviteiten waarin de deelnemer een geblokkeerde nooduitgang direct vrijmaakt ondanks het verzoek van een collega om te wachten, dit aan de collega verantwoordt en daarna meldt aan de verantwoordelijke. |
| startIntent.explanationIntent | Uitleggen dat de deelnemer als begeleider in een lopende groepsactiviteit terechtkomt, een gesprek voert met een collega en een melding schrijft, daarna terugkijkt, feedback krijgt, gevalideerde kennis bekijkt en tot slot in een gewijzigde situatie opnieuw handelt. Benoemen dat de deelnemer de dozen zelf mag weghalen en weet wie de verantwoordelijke is. |
| endIntent.closingIntent | De training afsluiten met de bevestiging dat de deelnemer de vaste instructie heeft uitgevoerd en verantwoord in twee situaties: direct vrijmaken, daarna melden en de collega of andere betrokkene uitleggen waarom het verzoek om te wachten niet wordt gevolgd. |
| endIntent.summaryIntent | Kort de voorgeschreven handelingslijn samenvatten: direct vrijmaken, de keuze uitleggen met verwijzing naar de instructie en het doel van een vrije nooduitgang, de zorg over onrust benoemen zonder uit te stellen, en daarna melden aan de verantwoordelijke. |
| endIntent.followUpRecommendation | De deelnemer aanmoedigen om in de eigen werksituatie na te gaan wie de verantwoordelijke is voor meldingen en hoe de vaste instructie daar is vastgelegd. |

## Geplande blokken

### 1. context · `certum.bco.tekst`

- **purpose:** De situatie schetsen op het moment dat de collega vraagt te wachten: lopende groepsactiviteit, geblokkeerde nooduitgang door gestapelde dozen, de zorg over onrust en de geldende vaste instructie.
- **whyThisBlock:** Een korte tekstuele situatieschets volstaat om de spanning neer te zetten; de sector blijft bewust onbepaald, wat beeld of video minder geschikt maakt.
- **configurationIntent:**
  - *situatieschets:* Startmoment leggen bij het verzoek van de collega, met de vaste instructie en de handelingsruimte van de deelnemer expliciet genoemd en zonder sector of setting vast te leggen.
  - *bewust onbekend:* Niet beschrijven hoe groep en collega zullen reageren of of de nooduitgang tijdens de activiteit nodig zal zijn.

### 2. actie · `certum.bco.chat-simulatie`

- **purpose:** De deelnemer voert in het moment het gesprek met de collega: reageert op het verzoek, geeft aan direct vrij te maken, verantwoordt de keuze en gaat in op de zorg over onrust.
- **whyThisBlock:** Het performancetype is gesprek voeren; alleen de chatsimulatie laat de deelnemer reageren op een collega die het belang van rust vooropstelt.
- **configurationIntent:**
  - *rol fictieve persoon:* De AI speelt de collega die vriendelijk maar overtuigd vraagt te wachten tot na afloop vanwege onrust in de groep en doorvraagt op de uitleg.
  - *gespreksdoel sleutelwoorden:* Geen sleutelwoorddoel als beoordeling gebruiken; het gesprek eindigt via een tijdslimiet of natuurlijke afronding.
  - *tijdslimiet:* Een beperkte gesprekstijd instellen die past bij de urgentie van de situatie en daarna automatisch doorgaan.

### 3. actie · `certum.bco.productie`

- **purpose:** De deelnemer schrijft na het vrijmaken de melding aan de verantwoordelijke als professioneel product.
- **whyThisBlock:** Melden is een vast onderdeel van de voorgeschreven handelingslijn en levert een concreet product op dat later aan verwachtingen kan worden getoetst.
- **configurationIntent:**
  - *opdracht:* De deelnemer vragen de melding te schrijven zoals hij die na het vrijmaken aan de verantwoordelijke zou doen.
  - *sjabloon:* Geen inhoudelijk sjabloon dat de te melden informatie voorzegt, zodat zichtbaar wordt wat de deelnemer zelf opneemt.
  - *minimum woorden:* Een laag minimum instellen dat een volledige maar beknopte melding mogelijk maakt.

### 4. reflectie · `certum.bco.open-vraag`

- **purpose:** De deelnemer kijkt terug op de eigen reactie: wanneer de nooduitgang is vrijgemaakt, wat hij de collega heeft uitgelegd, hoe hij met de zorg over onrust omging en of hij heeft gemeld, en expliciteert de afweging tussen veiligheid en rust.
- **whyThisBlock:** Een open vraag laat de deelnemer de afweging en het eigen handelen in eigen woorden vastleggen en levert tevens context voor AI Feedback.
- **configurationIntent:**
  - *vraagopdracht:* Laten beschrijven wat de deelnemer deed en zei in het gesprek, op welk moment hij vrijmaakte en waarom de vaste instructie hier leidend is boven de onrust.
  - *voorbeeldantwoord:* Een voorbeeldantwoord opnemen dat de voorgeschreven handelingslijn en de afweging illustreert, te tonen na indienen.

### 5. feedback · `certum.bco.ai-feedback`

- **purpose:** Feedback geven op uitvoering van de handelingslijn, de verantwoording tegenover de collega en de omgang met diens zorg.
- **whyThisBlock:** AI Feedback kan de antwoorden uit de reflectievraag en de melding als context gebruiken en per dimensie terugkoppelen.
- **configurationIntent:**
  - *context eerdere antwoorden:* De open reflectievraag en de productie van de melding als input meegeven.
  - *beoordelingsdimensies:* Feedback structureren langs de drie dimensies uit de Blueprint, op basis van voorgeschreven handeling, onderbouwing en uitvoering, met uitstel van vrijmaken als duidelijk aandachtspunt.

### 6. bron · `certum.bco.tekst`

- **purpose:** Later gevalideerde kennis tonen over de onderbouwing van vrije nooduitgangen en risico's van tijdelijke blokkade, en over wat een melding aan de verantwoordelijke inhoudt.
- **whyThisBlock:** Tekst is het eenvoudigste middel om gevalideerde broninhoud bij SN1 en SN2 weer te geven; welke bron dat wordt staat nog niet vast.
- **configurationIntent:**
  - *broninhoud:* Uitsluitend later gevalideerde inhoud voor SN1 en SN2 opnemen; voor SN2 het organisatiebeleid van de werksituatie, voor SN1 een nog te bepalen brontype.

### 7. bron · `certum.bco.open-vraag`

- **purpose:** De deelnemer koppelt de bron aan de eigen uitleg en melding en benoemt waar zijn verantwoording sterker of vollediger kan.
- **whyThisBlock:** Het leerdoel van Bron vraagt actieve koppeling aan het eigen handelen; een korte open vraag maakt die koppeling expliciet.
- **configurationIntent:**
  - *vraagopdracht:* Laten benoemen welk element uit de bron de uitleg aan de collega of de melding had versterkt of aangevuld.

### 8. toets · `certum.bco.tekst`

- **purpose:** De nieuwe situatie schetsen: opnieuw een geblokkeerde nooduitgang, nu met een verzoek om te wachten met meer aandrang of van een andere betrokkene, met tijdsdruk door het einde van de activiteit.
- **whyThisBlock:** Een korte tekstuele schets introduceert het nieuwe keuzemoment zonder extra middelen.
- **configurationIntent:**
  - *transfersituatie:* De gewijzigde druk en de andere betrokkene neerzetten, met dezelfde vaste instructie en handelingsruimte.

### 9. toets · `certum.bco.chat-simulatie`

- **purpose:** De deelnemer laat in het nieuwe gesprek opnieuw zien dat hij direct vrijmaakt en de keuze zelfstandig verantwoordt onder grotere druk.
- **whyThisBlock:** Transfer van een gespreksprestatie vraagt opnieuw een gesprek in het moment.
- **configurationIntent:**
  - *rol fictieve persoon:* De AI speelt de nieuwe betrokkene die met meer aandrang en verwijzing naar tijdsdruk vraagt te wachten.
  - *gespreksdoel sleutelwoorden:* Geen sleutelwoorddoel als beoordeling gebruiken.
  - *tijdslimiet:* Een korte gesprekstijd instellen die de tijdsdruk versterkt en daarna automatisch doorgaan.

### 10. toets · `certum.bco.open-vraag`

- **purpose:** De deelnemer legt vast wat hij in de nieuwe situatie deed, hoe hij zijn keuze onderbouwde met de reden achter de instructie en wat hij aan de verantwoordelijke meldt.
- **whyThisBlock:** Een open vraag maakt handelen, onderbouwing en melding als transferbewijs beschikbaar voor beoordeling.
- **configurationIntent:**
  - *vraagopdracht:* Laten beschrijven wanneer werd vrijgemaakt, welke uitleg aan de betrokkene werd gegeven en welke melding volgt.
  - *voorbeeldantwoord:* Een voorbeeldantwoord opnemen dat de handelingslijn onder tijdsdruk illustreert.

### 11. toets · `certum.bco.ai-feedback`

- **purpose:** Terugkoppeling op de transferopdracht langs voorgeschreven handeling, onderbouwing en uitvoering.
- **whyThisBlock:** AI Feedback kan het transferantwoord als context gebruiken en beoordelen of de deelnemer zich niet liet afleiden door de nieuwe druk.
- **configurationIntent:**
  - *context eerdere antwoorden:* De open vraag uit de toetsfase als input meegeven.
  - *beoordelingsbasis:* Beoordelen op direct vrijmaken, daarna melden en zelfstandige onderbouwing met de reden achter de instructie.

## Capability gaps

1. **actie: Het daadwerkelijk en direct vrijmaken van de nooduitgang als handeling uitvoeren en het moment daarvan zichtbaar maken, naast het gesprek met de collega.**
   - *whyNeeded:* Het eerste succescriterium vraagt dat de deelnemer direct vrijmaakt; in een chatgesprek is alleen zichtbaar wat de deelnemer zegt te doen, niet wanneer en of hij het doet.
   - *workaround (partial):* In de chatsimulatie en in de reflectievraag benoemt de deelnemer expliciet wanneer en hoe hij de dozen weghaalt ten opzichte van het gesprek met de collega.
   - *limitation:* De handeling zelf en de timing ervan worden niet waargenomen maar alleen verwoord; uitstel in de werkelijke uitvoering is niet meetbaar.
2. **feedback: AI Feedback die het gevoerde chatgesprek met de collega als context gebruikt om uitvoering, verantwoording en omgang met de zorg van de collega te beoordelen.**
   - *whyNeeded:* Feedback moet reageren op het uitgevoerde handelen en de uitleg aan de collega; dat gebeurt in de chatsimulatie, terwijl niet is aangetoond dat AI Feedback het chatverloop ontvangt.
   - *workaround (partial):* Na de chatsimulatie legt de deelnemer in een open vraag vast wat hij deed en zei; AI Feedback gebruikt die antwoorden en de geschreven melding als context.
   - *limitation:* De feedback berust op de eigen weergave van de deelnemer, niet op het werkelijke gesprek; verschillen tussen gezegd en gerapporteerd blijven onzichtbaar.
3. **toets: Beoordeling van de transferprestatie op basis van het gevoerde gesprek in de nieuwe situatie met meer aandrang of tijdsdruk.**
   - *whyNeeded:* De toets vraagt dat de deelnemer opnieuw handelt en zelfstandig onderbouwt zonder zich te laten afleiden; dat blijkt uit het gesprek, dat niet aantoonbaar als context voor AI Feedback beschikbaar is.
   - *workaround (partial):* Na de transfer-chatsimulatie legt de deelnemer in een open vraag zijn handelen, onderbouwing en melding vast; AI Feedback beoordeelt dat antwoord.
   - *limitation:* De beoordeling van de transfer steunt op zelfrapportage en niet op het werkelijke gespreksverloop onder druk.

## Volledige Block Plan-output

```json
{
  "version": "bc-online-block-plan/v1",
  "blueprintVersion": "blueprint-contract/v2",
  "courseShell": {
    "title": "Nooduitgang direct vrijmaken ondanks verzoek collega om te wachten",
    "description": "Praktijksimulatie voor begeleiders van groepsactiviteiten waarin de deelnemer een geblokkeerde nooduitgang direct vrijmaakt ondanks het verzoek van een collega om te wachten, dit aan de collega verantwoordt en daarna meldt aan de verantwoordelijke.",
    "estimatedDurationMinutes": null,
    "skjPoints": null,
    "status": "concept"
  },
  "startIntent": {
    "explanationIntent": "Uitleggen dat de deelnemer als begeleider in een lopende groepsactiviteit terechtkomt, een gesprek voert met een collega en een melding schrijft, daarna terugkijkt, feedback krijgt, gevalideerde kennis bekijkt en tot slot in een gewijzigde situatie opnieuw handelt. Benoemen dat de deelnemer de dozen zelf mag weghalen en weet wie de verantwoordelijke is.",
    "estimatedDurationMinutes": null,
    "learningGoals": [
      "De deelnemer kan de nooduitgang direct vrijmaken en dit daarna melden aan de verantwoordelijke, en kan aan de collega uitleggen waarom het verzoek om te wachten niet wordt gevolgd."
    ]
  },
  "plannedBlocks": [
    {
      "id": "blok-1",
      "sequence": 1,
      "certumPhase": "context",
      "catalogBlockId": "certum.bco.tekst",
      "purpose": "De situatie schetsen op het moment dat de collega vraagt te wachten: lopende groepsactiviteit, geblokkeerde nooduitgang door gestapelde dozen, de zorg over onrust en de geldende vaste instructie.",
      "whyThisBlock": "Een korte tekstuele situatieschets volstaat om de spanning neer te zetten; de sector blijft bewust onbepaald, wat beeld of video minder geschikt maakt.",
      "configurationIntent": [
        {
          "setting": "situatieschets",
          "intent": "Startmoment leggen bij het verzoek van de collega, met de vaste instructie en de handelingsruimte van de deelnemer expliciet genoemd en zonder sector of setting vast te leggen."
        },
        {
          "setting": "bewust onbekend",
          "intent": "Niet beschrijven hoe groep en collega zullen reageren of of de nooduitgang tijdens de activiteit nodig zal zijn."
        }
      ]
    },
    {
      "id": "blok-2",
      "sequence": 2,
      "certumPhase": "actie",
      "catalogBlockId": "certum.bco.chat-simulatie",
      "purpose": "De deelnemer voert in het moment het gesprek met de collega: reageert op het verzoek, geeft aan direct vrij te maken, verantwoordt de keuze en gaat in op de zorg over onrust.",
      "whyThisBlock": "Het performancetype is gesprek voeren; alleen de chatsimulatie laat de deelnemer reageren op een collega die het belang van rust vooropstelt.",
      "configurationIntent": [
        {
          "setting": "rol fictieve persoon",
          "intent": "De AI speelt de collega die vriendelijk maar overtuigd vraagt te wachten tot na afloop vanwege onrust in de groep en doorvraagt op de uitleg."
        },
        {
          "setting": "gespreksdoel sleutelwoorden",
          "intent": "Geen sleutelwoorddoel als beoordeling gebruiken; het gesprek eindigt via een tijdslimiet of natuurlijke afronding."
        },
        {
          "setting": "tijdslimiet",
          "intent": "Een beperkte gesprekstijd instellen die past bij de urgentie van de situatie en daarna automatisch doorgaan."
        }
      ]
    },
    {
      "id": "blok-3",
      "sequence": 3,
      "certumPhase": "actie",
      "catalogBlockId": "certum.bco.productie",
      "purpose": "De deelnemer schrijft na het vrijmaken de melding aan de verantwoordelijke als professioneel product.",
      "whyThisBlock": "Melden is een vast onderdeel van de voorgeschreven handelingslijn en levert een concreet product op dat later aan verwachtingen kan worden getoetst.",
      "configurationIntent": [
        {
          "setting": "opdracht",
          "intent": "De deelnemer vragen de melding te schrijven zoals hij die na het vrijmaken aan de verantwoordelijke zou doen."
        },
        {
          "setting": "sjabloon",
          "intent": "Geen inhoudelijk sjabloon dat de te melden informatie voorzegt, zodat zichtbaar wordt wat de deelnemer zelf opneemt."
        },
        {
          "setting": "minimum woorden",
          "intent": "Een laag minimum instellen dat een volledige maar beknopte melding mogelijk maakt."
        }
      ]
    },
    {
      "id": "blok-4",
      "sequence": 4,
      "certumPhase": "reflectie",
      "catalogBlockId": "certum.bco.open-vraag",
      "purpose": "De deelnemer kijkt terug op de eigen reactie: wanneer de nooduitgang is vrijgemaakt, wat hij de collega heeft uitgelegd, hoe hij met de zorg over onrust omging en of hij heeft gemeld, en expliciteert de afweging tussen veiligheid en rust.",
      "whyThisBlock": "Een open vraag laat de deelnemer de afweging en het eigen handelen in eigen woorden vastleggen en levert tevens context voor AI Feedback.",
      "configurationIntent": [
        {
          "setting": "vraagopdracht",
          "intent": "Laten beschrijven wat de deelnemer deed en zei in het gesprek, op welk moment hij vrijmaakte en waarom de vaste instructie hier leidend is boven de onrust."
        },
        {
          "setting": "voorbeeldantwoord",
          "intent": "Een voorbeeldantwoord opnemen dat de voorgeschreven handelingslijn en de afweging illustreert, te tonen na indienen."
        }
      ]
    },
    {
      "id": "blok-5",
      "sequence": 5,
      "certumPhase": "feedback",
      "catalogBlockId": "certum.bco.ai-feedback",
      "purpose": "Feedback geven op uitvoering van de handelingslijn, de verantwoording tegenover de collega en de omgang met diens zorg.",
      "whyThisBlock": "AI Feedback kan de antwoorden uit de reflectievraag en de melding als context gebruiken en per dimensie terugkoppelen.",
      "configurationIntent": [
        {
          "setting": "context eerdere antwoorden",
          "intent": "De open reflectievraag en de productie van de melding als input meegeven."
        },
        {
          "setting": "beoordelingsdimensies",
          "intent": "Feedback structureren langs de drie dimensies uit de Blueprint, op basis van voorgeschreven handeling, onderbouwing en uitvoering, met uitstel van vrijmaken als duidelijk aandachtspunt."
        }
      ]
    },
    {
      "id": "blok-6",
      "sequence": 6,
      "certumPhase": "bron",
      "catalogBlockId": "certum.bco.tekst",
      "purpose": "Later gevalideerde kennis tonen over de onderbouwing van vrije nooduitgangen en risico's van tijdelijke blokkade, en over wat een melding aan de verantwoordelijke inhoudt.",
      "whyThisBlock": "Tekst is het eenvoudigste middel om gevalideerde broninhoud bij SN1 en SN2 weer te geven; welke bron dat wordt staat nog niet vast.",
      "configurationIntent": [
        {
          "setting": "broninhoud",
          "intent": "Uitsluitend later gevalideerde inhoud voor SN1 en SN2 opnemen; voor SN2 het organisatiebeleid van de werksituatie, voor SN1 een nog te bepalen brontype."
        }
      ]
    },
    {
      "id": "blok-7",
      "sequence": 7,
      "certumPhase": "bron",
      "catalogBlockId": "certum.bco.open-vraag",
      "purpose": "De deelnemer koppelt de bron aan de eigen uitleg en melding en benoemt waar zijn verantwoording sterker of vollediger kan.",
      "whyThisBlock": "Het leerdoel van Bron vraagt actieve koppeling aan het eigen handelen; een korte open vraag maakt die koppeling expliciet.",
      "configurationIntent": [
        {
          "setting": "vraagopdracht",
          "intent": "Laten benoemen welk element uit de bron de uitleg aan de collega of de melding had versterkt of aangevuld."
        }
      ]
    },
    {
      "id": "blok-8",
      "sequence": 8,
      "certumPhase": "toets",
      "catalogBlockId": "certum.bco.tekst",
      "purpose": "De nieuwe situatie schetsen: opnieuw een geblokkeerde nooduitgang, nu met een verzoek om te wachten met meer aandrang of van een andere betrokkene, met tijdsdruk door het einde van de activiteit.",
      "whyThisBlock": "Een korte tekstuele schets introduceert het nieuwe keuzemoment zonder extra middelen.",
      "configurationIntent": [
        {
          "setting": "transfersituatie",
          "intent": "De gewijzigde druk en de andere betrokkene neerzetten, met dezelfde vaste instructie en handelingsruimte."
        }
      ]
    },
    {
      "id": "blok-9",
      "sequence": 9,
      "certumPhase": "toets",
      "catalogBlockId": "certum.bco.chat-simulatie",
      "purpose": "De deelnemer laat in het nieuwe gesprek opnieuw zien dat hij direct vrijmaakt en de keuze zelfstandig verantwoordt onder grotere druk.",
      "whyThisBlock": "Transfer van een gespreksprestatie vraagt opnieuw een gesprek in het moment.",
      "configurationIntent": [
        {
          "setting": "rol fictieve persoon",
          "intent": "De AI speelt de nieuwe betrokkene die met meer aandrang en verwijzing naar tijdsdruk vraagt te wachten."
        },
        {
          "setting": "gespreksdoel sleutelwoorden",
          "intent": "Geen sleutelwoorddoel als beoordeling gebruiken."
        },
        {
          "setting": "tijdslimiet",
          "intent": "Een korte gesprekstijd instellen die de tijdsdruk versterkt en daarna automatisch doorgaan."
        }
      ]
    },
    {
      "id": "blok-10",
      "sequence": 10,
      "certumPhase": "toets",
      "catalogBlockId": "certum.bco.open-vraag",
      "purpose": "De deelnemer legt vast wat hij in de nieuwe situatie deed, hoe hij zijn keuze onderbouwde met de reden achter de instructie en wat hij aan de verantwoordelijke meldt.",
      "whyThisBlock": "Een open vraag maakt handelen, onderbouwing en melding als transferbewijs beschikbaar voor beoordeling.",
      "configurationIntent": [
        {
          "setting": "vraagopdracht",
          "intent": "Laten beschrijven wanneer werd vrijgemaakt, welke uitleg aan de betrokkene werd gegeven en welke melding volgt."
        },
        {
          "setting": "voorbeeldantwoord",
          "intent": "Een voorbeeldantwoord opnemen dat de handelingslijn onder tijdsdruk illustreert."
        }
      ]
    },
    {
      "id": "blok-11",
      "sequence": 11,
      "certumPhase": "toets",
      "catalogBlockId": "certum.bco.ai-feedback",
      "purpose": "Terugkoppeling op de transferopdracht langs voorgeschreven handeling, onderbouwing en uitvoering.",
      "whyThisBlock": "AI Feedback kan het transferantwoord als context gebruiken en beoordelen of de deelnemer zich niet liet afleiden door de nieuwe druk.",
      "configurationIntent": [
        {
          "setting": "context eerdere antwoorden",
          "intent": "De open vraag uit de toetsfase als input meegeven."
        },
        {
          "setting": "beoordelingsbasis",
          "intent": "Beoordelen op direct vrijmaken, daarna melden en zelfstandige onderbouwing met de reden achter de instructie."
        }
      ]
    }
  ],
  "endIntent": {
    "closingIntent": "De training afsluiten met de bevestiging dat de deelnemer de vaste instructie heeft uitgevoerd en verantwoord in twee situaties: direct vrijmaken, daarna melden en de collega of andere betrokkene uitleggen waarom het verzoek om te wachten niet wordt gevolgd.",
    "summaryIntent": "Kort de voorgeschreven handelingslijn samenvatten: direct vrijmaken, de keuze uitleggen met verwijzing naar de instructie en het doel van een vrije nooduitgang, de zorg over onrust benoemen zonder uit te stellen, en daarna melden aan de verantwoordelijke.",
    "followUpRecommendation": "De deelnemer aanmoedigen om in de eigen werksituatie na te gaan wie de verantwoordelijke is voor meldingen en hoe de vaste instructie daar is vastgelegd."
  },
  "capabilityGaps": [
    {
      "certumPhase": "actie",
      "need": "Het daadwerkelijk en direct vrijmaken van de nooduitgang als handeling uitvoeren en het moment daarvan zichtbaar maken, naast het gesprek met de collega.",
      "whyNeeded": "Het eerste succescriterium vraagt dat de deelnemer direct vrijmaakt; in een chatgesprek is alleen zichtbaar wat de deelnemer zegt te doen, niet wanneer en of hij het doet.",
      "workaround": {
        "type": "partial",
        "description": "In de chatsimulatie en in de reflectievraag benoemt de deelnemer expliciet wanneer en hoe hij de dozen weghaalt ten opzichte van het gesprek met de collega.",
        "limitation": "De handeling zelf en de timing ervan worden niet waargenomen maar alleen verwoord; uitstel in de werkelijke uitvoering is niet meetbaar."
      }
    },
    {
      "certumPhase": "feedback",
      "need": "AI Feedback die het gevoerde chatgesprek met de collega als context gebruikt om uitvoering, verantwoording en omgang met de zorg van de collega te beoordelen.",
      "whyNeeded": "Feedback moet reageren op het uitgevoerde handelen en de uitleg aan de collega; dat gebeurt in de chatsimulatie, terwijl niet is aangetoond dat AI Feedback het chatverloop ontvangt.",
      "workaround": {
        "type": "partial",
        "description": "Na de chatsimulatie legt de deelnemer in een open vraag vast wat hij deed en zei; AI Feedback gebruikt die antwoorden en de geschreven melding als context.",
        "limitation": "De feedback berust op de eigen weergave van de deelnemer, niet op het werkelijke gesprek; verschillen tussen gezegd en gerapporteerd blijven onzichtbaar."
      }
    },
    {
      "certumPhase": "toets",
      "need": "Beoordeling van de transferprestatie op basis van het gevoerde gesprek in de nieuwe situatie met meer aandrang of tijdsdruk.",
      "whyNeeded": "De toets vraagt dat de deelnemer opnieuw handelt en zelfstandig onderbouwt zonder zich te laten afleiden; dat blijkt uit het gesprek, dat niet aantoonbaar als context voor AI Feedback beschikbaar is.",
      "workaround": {
        "type": "partial",
        "description": "Na de transfer-chatsimulatie legt de deelnemer in een open vraag zijn handelen, onderbouwing en melding vast; AI Feedback beoordeelt dat antwoord.",
        "limitation": "De beoordeling van de transfer steunt op zelfrapportage en niet op het werkelijke gespreksverloop onder druk."
      }
    }
  ]
}
```

## Feitelijke review-signalen (zonder oordeel)

| Vraag | Waarneming |
| --- | --- |
| 1. Trouw aan de Blueprint? | Ja. Titel en leerdoel (trusted) ongewijzigd; de start-uitleg neemt aanname 2 over (de deelnemer mag de dozen weghalen en weet wie de verantwoordelijke is). |
| 2. Nieuwe didactische bedoeling? | Beperkt. Een Productie-blok laat de melding als product schrijven (de Blueprint vraagt melden; de schriftelijke vorm is een uitvoeringskeuze). `followUpRecommendation` stelt voor in de eigen werksituatie na te gaan wie de verantwoordelijke is en hoe de instructie is vastgelegd (niet in de Blueprint). |
| 3. Past ieder blok bij zijn purpose? | Ja; elk `whyThisBlock` verwijst naar de Blueprint (gesprek met de collega, melden als vast onderdeel, actieve koppeling in Bron). |
| 4. Overbodige of decoratieve blokken? | Mogelijk het tweede Bron-blok (Open vraag om de bron aan de eigen uitleg te koppelen). Het volgt uit de Blueprint-intentie van Bron ("koppelt … aan zijn eigen keuze"), maar maakt het plan langer (11 blokken). |
| 5. Interactiviteit alleen waar zinvol? | Ja: gesprek onder druk als Chat simulatie (met korte tijdslimiet voor urgentie), melding als Productie. |
| 6. Professionele ambiguïteit behouden? | n.v.t. (één leidende handeling). |
| 7. Prescribed action behouden? | Ja. De Chat simulatie laat de deelnemer "aangeven direct vrij te maken" en de keuze verantwoorden; geen Poll of open keuzemoment; Feedback beoordeelt op voorgeschreven handeling, onderbouwing en uitvoering, "met uitstel van vrijmaken als duidelijk aandachtspunt"; geen formeel Toetsblok; Toets is een nieuw gesprek met meer aandrang. |
| 8. Bron alleen voorbereid? | Ja: "Uitsluitend later gevalideerde inhoud voor SN1 en SN2 opnemen"; geen bron, wet of document genoemd. |
| 9. configurationIntent op planniveau? | Ja. Twee intenties vragen om een voorbeeldantwoord dat de handelingslijn illustreert; dat wordt alleen gepland, niet geschreven. |
| 10. Volledige vragen, dialogen, antwoordopties, feedbacktekst of toetsitems? | Nee. |
| 11. Capabilities correct geïnterpreteerd? | Ja, en kritisch: een chat laat alleen zien wat de deelnemer zegt te doen, niet of en wanneer hij werkelijk vrijmaakt; AI Feedback krijgt het chatverloop niet aantoonbaar als context. |
| 12. Capability gap eerlijk behouden? | Ja. 3 gaps: (a) de fysieke handeling en de timing zijn niet waarneembaar, (b) Feedback zonder chatcontext, (c) Toets zonder chatcontext; elk `partial` met een expliciete beperking. |
| 13. Logische volgorde als één leerervaring? | Ja: situatie → gesprek → melding → reflectie → feedback → bron → koppeling → nieuwe situatie → gesprek → onderbouwing → feedback. |
| 14. Proportioneel aantal blokken? | 11 blokken; aan de ruime kant (Productie en een tweede Bron-blok), maar elk blok is gemotiveerd. |
| Fase versus bloktype | Context = Tekst, Actie = Chat simulatie + Productie, Reflectie = Open vraag, Feedback = AI Feedback, Bron = Tekst + Open vraag, Toets = Tekst + Chat simulatie + Open vraag + AI Feedback. Afwijkingen van het mockpatroon (Productie voor de melding, Open vraag in Bron) komen aantoonbaar uit de Blueprint. |

## Menselijke evaluatie

**Status: `PASS_WITH_NOTES`**

Menselijke review van de baseline training-block-plan/v1.

### Sterk

- De voorgeschreven handeling blijft leidend.
- Productie is functioneel gekozen voor de melding.
- Professionele uitvoering onder druk blijft zichtbaar.
- De fysieke uitvoering en timing en de context van AI Feedback worden eerlijk als gaps geregistreerd.
- Geen externe bronclaims.

### Notes

- Het tweede Bron-blok kan mogelijk overbodig zijn, maar is nog geen bewezen systeemfout.
- `followUpRecommendation` voegt "nagaan wie de verantwoordelijke is" toe zonder dat de Blueprint dit vraagt.
