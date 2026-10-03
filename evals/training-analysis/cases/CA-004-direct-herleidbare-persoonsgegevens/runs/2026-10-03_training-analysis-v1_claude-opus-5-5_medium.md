# CA-004 · Run 2026-10-03 · training-analysis/v1 · claude-opus-5-5 · medium

Baseline-run van training-analysis/v1, uitgevoerd via de normale flow op `/trainings/new`
(één analyse, geen herhaling). Configuratie bevroren tijdens de baseline.

## Configuratie en metadata

Overgenomen uit de metadata-logregel `certum.analysis` van deze run.

| Veld | Waarde |
| --- | --- |
| rundatum | 2026-10-03 |
| provider | claude |
| model | claude-opus-5-5 |
| effort | medium |
| promptVersion | training-analysis/v1 |
| inputKind | casus |
| inputLength | 332 |
| durationMs | 27506 |
| outcome | success |
| verdict | aanpassen |
| privacyLevel | blokkeren |

Tokengebruik en kosten werden voor deze run niet geregistreerd.

## Output

Zoals Certum Studio de analyse toonde.

**Samenvatting**
Een jeugdprofessional voert een gesprek met een kind dat vertelt dat het thuis regelmatig ruzie tussen de ouders
hoort. De professional wil deze situatie als basis voor een training gebruiken. De casus bevat nog geen beschrijving
van de reactie of het keuzemoment van de professional.

**Professioneel dilemma**
De professional moet het vertrouwen van het kind dat iets persoonlijks deelt bewaken en tegelijk zorgvuldig inschatten
of er sprake is van een zorgsignaal dat vervolgstappen vraagt. Daarbij staan de wens van het kind, de relatie met de
ouders en de verantwoordelijkheid voor de veiligheid en het welzijn van het kind tegenover elkaar.

**Voorgesteld leerdoel**
De deelnemer kan adequaat reageren wanneer een kind zorgen over de thuissituatie deelt, het signaal zorgvuldig duiden
en een onderbouwde keuze maken voor passende vervolgstappen zonder het vertrouwen van het kind onnodig te schaden.

**Doelgroep**
Jeugdprofessionals die in gesprek zijn met kinderen, bijvoorbeeld in of rond het onderwijs.

**Geschikt als praktijksimulatie?**
Ja, na aanpassing (`aanpassen`). De situatie is herkenbaar en bevat een impliciet professioneel dilemma, maar het keuzemoment voor de professional is
nog niet uitgewerkt. Daarnaast bevat de casus direct herleidbare persoonsgegevens en moet deze eerst volledig worden
geanonimiseerd.

**Privacy**
`blokkeren`. De casus bevat een volledige naam van een kind, een geboortedatum, de naam van een school, een volledig adres met
postcode en woonplaats en een telefoonnummer van een ouder. Deze gegevens moeten volledig worden verwijderd of
vervangen door algemene omschrijvingen voordat de casus verder kan worden gebruikt.

**Ontbrekende informatie**
- De rol en werkcontext van de jeugdprofessional en de aanleiding van het gesprek.
- Een algemene omschrijving van de leeftijdsfase van het kind, zonder herleidbare gegevens.
- Wat de ruzies inhouden en of er aanwijzingen zijn voor onveiligheid of geweld.
- Hoe het kind zich voelt en of het kind iets vraagt of verwacht van de professional.
- Wat de professional op dat moment deed of overwoog, en welk keuzemoment centraal moet staan.
- Welke interne afspraken, protocollen of afwegingskaders in de organisatie gelden bij zorgsignalen.

**Rationale**
De casus beschrijft een herkenbare situatie waarin een professional moet kiezen hoe te reageren op een zorgsignaal van
een kind, wat een goede basis is voor een praktijksimulatie. Omdat de casus direct herleidbare persoonsgegevens bevat,
moet deze eerst worden geanonimiseerd. Daarnaast helpt het om het keuzemoment en de context concreter te maken voordat
een trainingsrichting wordt gekozen.

**Trainingsrichtingen**

1. **Reageren op het moment dat een kind iets vertelt**
   Een kind vertelt tijdens een gesprek over ruzies thuis. De professional moet direct kiezen hoe te reageren,
   bijvoorbeeld doorvragen, geruststellen en wel of geen geheimhouding beloven.
   *Leerdoel:* De deelnemer kan op een open en steunende manier reageren wanneer een kind zorgen over de thuissituatie deelt,
   zonder sturende vragen te stellen of geheimhouding te beloven die niet kan worden waargemaakt.
2. **Het signaal wegen en een vervolgstap kiezen**
   Na het gesprek moet de professional inschatten wat het verhaal van het kind betekent en kiezen of en welke
   vervolgstap nodig is, zoals observeren, een collega consulteren of verdere actie ondernemen.
   *Leerdoel:* De deelnemer kan een zorgsignaal over de thuissituatie zorgvuldig duiden, hierover collegiaal afstemmen en een
   proportionele en onderbouwde vervolgstap kiezen.
3. **Het gesprek met de ouders aangaan**
   De professional overweegt de ouders te benaderen naar aanleiding van wat het kind vertelde. De keuze is hoe en
   wanneer dat gesprek te voeren zonder het kind in een lastige positie te brengen.
   *Leerdoel:* De deelnemer kan een gesprek met ouders over zorgen rond de thuissituatie voorbereiden en voeren op een manier die
   de veiligheid en het vertrouwen van het kind respecteert.

## Gedrag in Certum Studio

- Melding bovenaan: "Privacy: deze input kan niet verder"
- Trainingsrichtingen selecteerbaar: nee
- Knop "Gebruik deze trainingsrichting": uitgeschakeld (melding: "Geblokkeerd vanwege privacy.")

## Menselijke evaluatie

**Status: `PENDING_REVIEW`**

Nog niet beoordeeld. De inhoudelijke beoordeling volgt nadat alle baseline-runs binnen zijn.
