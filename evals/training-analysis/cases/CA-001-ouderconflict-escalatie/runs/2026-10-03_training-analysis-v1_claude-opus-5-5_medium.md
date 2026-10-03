# CA-001 · Run 2026-10-03 · training-analysis/v1 · claude-opus-5-5 · medium

Eerste officiële run met de echte Claude-provider, uitgevoerd via de normale flow op `/trainings/new`
(één analyse, geen herhaling).

## Configuratie en metadata

Overgenomen uit de metadata-logregel `certum.analysis` van deze run.

| Veld | Waarde |
| --- | --- |
| provider | claude |
| model | claude-opus-5-5 |
| effort | medium |
| promptVersion | training-analysis/v1 |
| inputKind | casus |
| inputLength | 570 |
| durationMs | 26131 |
| outcome | success |
| verdict | geschikt |
| privacyLevel | geen |

Tokengebruik en kosten werden voor deze run niet geregistreerd.

## Output

Zoals Certum Studio de analyse toonde.

**Samenvatting**
Een jeugdprofessional voert een gesprek met twee gescheiden ouders over zorgen om hun 12-jarige dochter. De ouders
verwijten elkaar de problemen van het kind en de toon escaleert, terwijl de dochter in een aangrenzende ruimte delen
van het gesprek kan horen. Eén ouder eist dat de professional partij kiest en dreigt anders de medewerking aan de
hulpverlening te stoppen. De professional twijfelt tussen voortzetten, begrenzen of beëindigen van het gesprek.

**Professioneel dilemma**
De professional moet kiezen tussen het behouden van de samenwerking met beide ouders, ook met de ouder die dreigt af
te haken, en het beschermen van het kind tegen het escalerende conflict dat het kan horen. Daarbij staat zijn
meerzijdige partijdigheid onder druk: toegeven aan de eis om partij te kiezen kan de medewerking van één ouder redden
maar de relatie met de andere ouder en zijn professionele positie schaden. Ingrijpen of het gesprek beëindigen
beschermt het kind, maar kan het contact en de voortgang van de hulpverlening in gevaar brengen.

**Voorgesteld leerdoel**
De deelnemer kan in een escalerend gesprek met conflicterende ouders het belang van het kind centraal stellen door
tijdig te begrenzen, een meerzijdig partijdige positie te behouden en een onderbouwde keuze te maken tussen
voortzetten, onderbreken of beëindigen van het gesprek.

**Doelgroep**
Jeugdprofessionals die gesprekken voeren met (gescheiden) ouders in het kader van jeugdhulp.

**Geschikt als praktijksimulatie?**
Ja. De casus beschrijft een herkenbare, concrete situatie met een duidelijk keuzemoment en meerdere legitieme
handelingsopties. Er spelen tegengestelde belangen die zich goed lenen voor een praktijksimulatie met reflectie en
feedback.

**Privacy**
Geen privacyprobleem gedetecteerd.

**Ontbrekende informatie**
- De aard van de zorgen over de dochter en de reden van de hulpverlening.
- De rol en het kader van de professional, bijvoorbeeld vrijwillige of gedwongen hulpverlening, en daarmee de gevolgen
  als een ouder de medewerking stopt.
- Of er afspraken zijn over gezag, omgang of een lopende juridische procedure tussen de ouders.
- Waarom de dochter tijdens het gesprek in de aangrenzende ruimte aanwezig is en of er alternatieven waren.
- Of er eerder gesprekken met beide ouders zijn geweest en hoe die verliepen.
- Of er signalen zijn van onveiligheid voor het kind die een meldplicht of afwegingskader relevant maken.

**Rationale**
De casus bevat een helder keuzemoment onder druk, met botsende belangen tussen kindbescherming, samenwerking met
ouders en professionele neutraliteit, wat een sterke basis is voor een praktijksimulatie. De voorgestelde richtingen
belichten elk een ander aspect van hetzelfde moment, zodat gekozen kan worden voor een focus op begrenzen, op de
professionele positie of op het centraal stellen van het kind. De ontbrekende informatie helpt om de simulatie
realistischer en beter afgebakend te maken.

**Trainingsrichtingen**

1. **Begrenzen bij escalatie met het kind binnen gehoorsafstand**
   Het gesprek escaleert terwijl de dochter in de aangrenzende ruimte meeluistert. De deelnemer moet kiezen of hij het
   gesprek voortzet, de ouders begrenst of het gesprek onderbreekt of beëindigt om het kind te beschermen.
   *Leerdoel:* De deelnemer kan een escalerend oudergesprek tijdig en respectvol begrenzen en een onderbouwde keuze
   maken om het gesprek voort te zetten, te onderbreken of te beëindigen, met het belang van het kind als uitgangspunt.
2. **Omgaan met de eis om partij te kiezen**
   Eén ouder eist dat de professional partij kiest en dreigt de medewerking te stoppen. De deelnemer moet bepalen hoe
   hij zijn meerzijdig partijdige positie bewaakt zonder de samenwerking onnodig te verliezen.
   *Leerdoel:* De deelnemer kan een verzoek om partij te kiezen helder en niet-verwijtend afwijzen, zijn meerzijdig
   partijdige rol uitleggen en het gesprek terugbrengen naar de gezamenlijke zorg om het kind.
3. **Het gesprek terugbrengen naar het kind**
   De ouders verliezen zich in verwijten over en weer. De deelnemer moet kiezen hoe hij de focus verschuift van
   schuldvraag naar de behoeften en de beleving van de dochter.
   *Leerdoel:* De deelnemer kan in een conflictueus gesprek tussen ouders de aandacht verleggen van onderlinge verwijten
   naar de behoeften van het kind en dit vertalen naar een vervolgafspraak.

## Menselijke evaluatie

**Status: `PASS_WITH_NOTES`**

### Sterk

- Professionele kern goed herkend.
- Sterk handelingsgericht leerdoel.
- Bruikbare trainingsrichtingen.
- Correcte privacybeoordeling.

### Aandachtspunten

- Meerzijdige partijdigheid wordt al als concept geïntroduceerd, terwijl dit niet uit de input volgt.
- Ontbrekende informatie is deels breder dan noodzakelijk voor trainingsontwikkeling.
- De verwijzing naar een meldplicht is zonder bronvalidatie te stellig.
- De term "kindbescherming" is zwaarder dan de input noodzakelijk maakt.

### Verwachtingen

| # | Verwachting | Oordeel |
| --- | --- | --- |
| V1 | Centrale kern: regie + belasting/belang kind | Voldaan |
| V2 | Geschikt | Voldaan (`geschikt`) |
| V3 | Geen privacyblokkade | Voldaan (`geen`) |
| V4 | 2–3 professioneel verschillende richtingen | Voldaan (3) |
| V5 | Niet gereduceerd tot "communicatie verbeteren" | Voldaan |
| V6 | Geen verzonnen diagnoses of feiten | Voldaan, met aandachtspunt: het concept meerzijdige partijdigheid volgt niet uit de input |
| V7 | Geen juridische verplichtingen als feit zonder bronvalidatie | Aandachtspunt: de meldplicht wordt te stellig genoemd |
| V8 | Geen volledige training uitgeschreven | Voldaan |
