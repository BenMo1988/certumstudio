# BC-007 · 2026-10-04 · training-block-content/v1 · claude-opus-5-5 · medium · vervanging

**Doel van deze run:** uitsluitend de ontbrekende human-review evidence herstellen. De oorspronkelijke providercall van
de baseline ([run](2026-10-04_training-block-content-v1_claude-opus-5-5_medium.md)) was technisch geslaagd (`outcome: success`, `resultStatus: generated`, door alle
server-side invarianten), maar de inhoud is niet opgeslagen: het runscript bewaarde de tekstchunks van de RSC-respons
niet. De oorspronkelijke run blijft `INCONCLUSIVE` en is niet overschreven.

Met expliciete toestemming exact één extra aanroep, onder dezelfde condities: dezelfde code (geen wijziging in `src/`
of `test/` sinds `5826b1a`), dezelfde fixtures (Blueprint en Block Plan `BLP-003`, doelblok `blok-8`), prompt
`training-block-content/v1`, `claude-opus-5-5`, `medium`, `maxRetries: 0`, Block Content op `claude` en alle andere
providers op mock, en dezelfde verwachtingen. Alleen het gerepareerde runscript (ruwe respons altijd bewaard,
tekstchunks opgelost). Geen retry.

**Status: `PENDING_REVIEW`**

## Runs

| | Oorspronkelijke run | Deze run |
| --- | --- | --- |
| run-id | `BC-007/2026-10-04/baseline` | `BC-007/2026-10-04T10:58:33Z/vervanging` |
| tijdstip (UTC) | 2026-10-04, niet exact vastgelegd | 2026-10-04T10:58:33Z (start request) |
| durationMs (provider) | 22963 | 19851 |
| outcome / resultStatus | success / generated | success / generated |
| estimatedMinutes | 5 | 8 |
| inhoud vastgelegd | nee (harnessfout) | ja |

## Metadata (uit `certum.block_content_generation`)

| Veld | Waarde |
| --- | --- |
| provider | claude |
| model | claude-opus-5-5 |
| effort | medium |
| maxRetries | 0 |
| promptVersion | training-block-content/v1 |
| contentContractVersion | block-content/v1 |
| plannedBlockId | blok-8 |
| catalogBlockId | certum.bco.ai-feedback |
| certumPhase | feedback |
| durationMs | 19851 |
| outcome | success |
| resultStatus | generated |
| estimatedMinutes | 8 |

## Trusted velden (server-side)

```json
{
  "version": "block-content/v1",
  "plannedBlockId": "blok-8",
  "sequence": 8,
  "certumPhase": "feedback",
  "catalogBlockId": "certum.bco.ai-feedback",
  "routePolicy": "open_choice",
  "reviewStatus": "draft",
  "workform": "AI Feedback",
  "catalogBlockIdInContent": "certum.bco.ai-feedback",
  "availableContext": [
    "blok-3",
    "blok-4",
    "blok-7"
  ],
  "unavailableContext": [
    "blok-6"
  ]
}
```

## Gegenereerde velden (Claude)

```json
{
  "accreditation": {
    "learningGoalContribution": "Dit blok geeft de deelnemer formatieve feedback op de kwaliteit van zijn afweging tussen eerst school benaderen en eerst het gezin spreken. Het oordeel richt zich niet op de gekozen route, zodat hij zijn gemotiveerde keuze kan aanscherpen.",
    "assessmentRole": "formative",
    "estimatedMinutes": 8,
    "sourceNeedRefs": []
  },
  "content": {
    "title": "Feedback op je gekozen volgorde en onderbouwing",
    "instructions": "Je geeft formatieve feedback aan een jeugdprofessional die een praktijksimulatie doorloopt. De situatie: school en ouder beschrijven dezelfde jongere verschillend. School ziet een teruggetrokken en gespannen jongere. De ouder herkent dat thuis niet en vindt dat school het probleem groter maakt. Er zijn geen acute veiligheidszorgen. Morgen staat een gezinsgesprek gepland en vandaag kan school nog benaderd worden. Onbekend is of ouder en jongere weten van het schoolcontact en ermee hebben ingestemd, wat de leeftijd van de jongere is en of de jongere bij het gesprek aanwezig is. De deelnemer kiest tussen eerst bij school verhelderen en eerst open met ouder en jongere in gesprek gaan. Je hebt als context de gekozen volgorde uit de poll, de onderbouwing van die keuze en de reflectie op wat de volgorde oplevert en riskeert. Je kent de schriftelijke uitwerking van de eerste stap niet. Ga daar niet van uit en citeer er niet uit. Reageer alleen op wat de deelnemer daarover zelf in zijn onderbouwing of reflectie schrijft. Beide volgordes zijn professioneel verdedigbaar. Beoordeel nooit welke route gekozen is en suggereer niet dat de andere route beter is. Beoordeel de kwaliteit van de afweging op vier punten. Ten eerste de afweging: heeft de deelnemer de voor- en nadelen van beide routes serieus gewogen, ook van de route die hij niet koos? Ten tweede de aansluiting op de situatie: betrekt hij het ontbreken van acute zorgen, het geplande gesprek en de onbekende punten, zoals instemming, leeftijd en aanwezigheid van de jongere, bij zijn keuze? Ten derde de onderbouwing: zijn zijn argumenten concreet, samenhangend en herleidbaar tot deze casus? Ten vierde de consequenties: benoemt hij wat zijn volgorde kan betekenen voor het vertrouwen van ouder en jongere en voor de relatie met school, en hoe hij de risico's van zijn eigen route beperkt? Bouw je feedback zo op. Vat eerst in een of twee zinnen de gekozen volgorde en de kern van de onderbouwing samen. Benoem dan per punt concreet wat sterk is en wat ontbreekt of dunner is, met verwijzing naar de eigen woorden van de deelnemer. Sluit af met een of twee gerichte vragen die de deelnemer uitnodigen zijn afweging verder te verdiepen. Heeft de deelnemer de risico's van zijn route niet benoemd, vraag daar dan naar. Doe hetzelfde bij onbekende punten die hij niet heeft betrokken. Noem geen wetten, richtlijnen, protocollen, methodieken of onderzoek en presenteer geen vakinhoudelijke regels als feit. Die komen later in de training aan bod. Schrijf in helder, zakelijk en respectvol Nederlands, richt je tot de deelnemer met je, gebruik geen opmaak of opsommingstekens en blijf beknopt, maximaal ongeveer 300 woorden."
  }
}
```

## Volledig BlockContentResult

```json
{
  "version": "block-content/v1",
  "plannedBlockId": "blok-8",
  "sequence": 8,
  "certumPhase": "feedback",
  "catalogBlockId": "certum.bco.ai-feedback",
  "routePolicy": "open_choice",
  "reviewStatus": "draft",
  "accreditation": {
    "workform": "AI Feedback",
    "learningGoalContribution": "Dit blok geeft de deelnemer formatieve feedback op de kwaliteit van zijn afweging tussen eerst school benaderen en eerst het gezin spreken. Het oordeel richt zich niet op de gekozen route, zodat hij zijn gemotiveerde keuze kan aanscherpen.",
    "assessmentRole": "formative",
    "estimatedMinutes": 8,
    "sourceNeedRefs": []
  },
  "body": {
    "status": "generated",
    "content": {
      "catalogBlockId": "certum.bco.ai-feedback",
      "title": "Feedback op je gekozen volgorde en onderbouwing",
      "instructions": "Je geeft formatieve feedback aan een jeugdprofessional die een praktijksimulatie doorloopt. De situatie: school en ouder beschrijven dezelfde jongere verschillend. School ziet een teruggetrokken en gespannen jongere. De ouder herkent dat thuis niet en vindt dat school het probleem groter maakt. Er zijn geen acute veiligheidszorgen. Morgen staat een gezinsgesprek gepland en vandaag kan school nog benaderd worden. Onbekend is of ouder en jongere weten van het schoolcontact en ermee hebben ingestemd, wat de leeftijd van de jongere is en of de jongere bij het gesprek aanwezig is. De deelnemer kiest tussen eerst bij school verhelderen en eerst open met ouder en jongere in gesprek gaan. Je hebt als context de gekozen volgorde uit de poll, de onderbouwing van die keuze en de reflectie op wat de volgorde oplevert en riskeert. Je kent de schriftelijke uitwerking van de eerste stap niet. Ga daar niet van uit en citeer er niet uit. Reageer alleen op wat de deelnemer daarover zelf in zijn onderbouwing of reflectie schrijft. Beide volgordes zijn professioneel verdedigbaar. Beoordeel nooit welke route gekozen is en suggereer niet dat de andere route beter is. Beoordeel de kwaliteit van de afweging op vier punten. Ten eerste de afweging: heeft de deelnemer de voor- en nadelen van beide routes serieus gewogen, ook van de route die hij niet koos? Ten tweede de aansluiting op de situatie: betrekt hij het ontbreken van acute zorgen, het geplande gesprek en de onbekende punten, zoals instemming, leeftijd en aanwezigheid van de jongere, bij zijn keuze? Ten derde de onderbouwing: zijn zijn argumenten concreet, samenhangend en herleidbaar tot deze casus? Ten vierde de consequenties: benoemt hij wat zijn volgorde kan betekenen voor het vertrouwen van ouder en jongere en voor de relatie met school, en hoe hij de risico's van zijn eigen route beperkt? Bouw je feedback zo op. Vat eerst in een of twee zinnen de gekozen volgorde en de kern van de onderbouwing samen. Benoem dan per punt concreet wat sterk is en wat ontbreekt of dunner is, met verwijzing naar de eigen woorden van de deelnemer. Sluit af met een of twee gerichte vragen die de deelnemer uitnodigen zijn afweging verder te verdiepen. Heeft de deelnemer de risico's van zijn route niet benoemd, vraag daar dan naar. Doe hetzelfde bij onbekende punten die hij niet heeft betrokken. Noem geen wetten, richtlijnen, protocollen, methodieken of onderzoek en presenteer geen vakinhoudelijke regels als feit. Die komen later in de training aan bod. Schrijf in helder, zakelijk en respectvol Nederlands, richt je tot de deelnemer met je, gebruik geen opmaak of opsommingstekens en blijf beknopt, maximaal ongeveer 300 woorden.",
      "availableContext": [
        "blok-3",
        "blok-4",
        "blok-7"
      ],
      "unavailableContext": [
        "blok-6"
      ]
    }
  }
}
```

## Signalen voor de human review (zonder oordeel)

| Vraag | Waarneming |
| --- | --- |
| Is de instructie operationeel bruikbaar? | Ja. Rol, situatie, beschikbare context, vier beoordelingspunten (exact de trusted `evaluationBasis`: afweging, aansluiting op de situatie, onderbouwing, consequenties), opbouw (samenvatting → per punt sterk/ontbreekt met eigen woorden → één of twee verdiepende vragen), taal en lengte (± 300 woorden). |
| Weet de AI waarop hij wel en niet feedback mag geven? | Ja. Wel: de kwaliteit van de afweging op vier punten. Niet: de gekozen route ("Beoordeel nooit welke route gekozen is en suggereer niet dat de andere route beter is"), wetten, richtlijnen, protocollen, methodieken of onderzoek. |
| Afhankelijkheid van context die hij niet ontvangt? | Nee. De instructie noemt als context precies de poll-keuze, de onderbouwing en de reflectie (= trusted `availableContext` blok-3, blok-4, blok-7) en sluit de Productie expliciet uit: "Je kent de schriftelijke uitwerking van de eerste stap niet. Ga daar niet van uit en citeer er niet uit. Reageer alleen op wat de deelnemer daarover zelf in zijn onderbouwing of reflectie schrijft." Daarmee corrigeert de content de overclaim in de `configurationIntent` van het Block Plan ("De antwoorden uit poll, onderbouwing, productie en reflectie gebruiken"). |
| Bewaart de feedback open_choice? | Ja: "Beide volgordes zijn professioneel verdedigbaar." De verdiepende vragen gaan over risico's van de eigen route en onbekende punten, niet over de andere route. |
| Situatiebeschrijving in de instructie | De instructie herhaalt de situatie, omdat niet aangetoond is dat AI Feedback de scenariotekst krijgt. Alle feiten staan in de Blueprint: verschillende beschrijvingen van school en ouder, geen acute veiligheidszorgen, gezinsgesprek "morgen" (Blueprint: "de volgende dag"), onbekend of ouder en jongere van het schoolcontact weten en ermee instemden, leeftijd en aanwezigheid van de jongere. |
| Content creep / theorie | Geen. Geen vakinhoudelijke regels als feit. |
| Toon en niveau | Zakelijk en respectvol, gericht op jeugdprofessionals (doelgroep Blueprint). De deelnemer wordt met "hij/zijn" aangeduid (net als in de Blueprint). |
| Metadata | `assessmentRole: formative`, `estimatedMinutes: 8` (oorspronkelijke run: 5; een schatting), `sourceNeedRefs: []`. |

## Menselijke evaluatie

**Status: `PENDING_REVIEW`**

Nog niet beoordeeld.
