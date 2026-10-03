# CA-007 · Run 2026-10-03 · training-analysis/v1 · claude-opus-5-5 · medium

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
| inputLength | 521 |
| durationMs | 18984 |
| outcome | success |
| verdict | geschikt |
| privacyLevel | geen |

Tokengebruik en kosten werden voor deze run niet geregistreerd.

## Output

Zoals Certum Studio de analyse toonde.

**Samenvatting**
Een volwassen cliënt met ambulante begeleiding bij het structureren van de week wil de geplande ondersteuning rond
weekplanning stoppen en zijn eigen aanpak volgen. Hij kan zijn keuze goed onderbouwen. De professional ziet dat de
cliënt de afgelopen maand enkele afspraken heeft gemist, maar er zijn geen acute veiligheidsrisico's. De professional
twijfelt tussen aandringen en ruimte geven.

**Professioneel dilemma**
Het respecteren van de autonomie en zelfbeschikking van een volwassen cliënt die zijn keuze helder kan uitleggen staat
tegenover de professionele verantwoordelijkheid om zorgen te benoemen en ondersteuning te bieden waar signalen, zoals
gemiste afspraken, wijzen op mogelijke problemen met structuur.

**Voorgesteld leerdoel**
De deelnemer kan in gesprek met een volwassen cliënt die ondersteuning afwijst de keuze van de cliënt serieus nemen,
eigen zorgen op basis van concrete signalen transparant benoemen en samen met de cliënt tot een passende afspraak
komen.

**Doelgroep**
Ambulant begeleiders die volwassen cliënten ondersteunen bij structuur en dagelijks functioneren.

**Geschikt als praktijksimulatie?**
Ja (`geschikt`). De casus bevat een herkenbare praktijksituatie met een duidelijk keuzemoment voor de professional en een reëel
spanningsveld tussen autonomie en zorg, zonder dat acute veiligheid het dilemma wegneemt.

**Privacy**
`geen`. Geen privacyprobleem gedetecteerd.

**Ontbrekende informatie**
- Welke afspraken de cliënt heeft gemist en wat de gevolgen daarvan waren of kunnen zijn.
- Wat de eigen manier van de cliënt inhoudt en welke redenen hij geeft om de ondersteuning te stoppen.
- Hoe de begeleiding is ingekaderd, bijvoorbeeld via een ondersteuningsplan, indicatie of afspraken met een
  opdrachtgever, en wat stoppen betekent voor de rest van de begeleiding.
- Of er betrokkenen zijn zoals naasten of andere hulpverleners die een rol spelen in de afweging.
- Hoe lang de begeleiding al loopt en hoe de werkrelatie tussen professional en cliënt is.

**Rationale**
De casus beschrijft een herkenbaar spanningsveld tussen zelfbeschikking van een volwassen cliënt en de zorg van de
professional, met een concreet gespreksmoment als keuzepunt. Omdat er geen acute veiligheidsrisico's zijn, ligt de
nadruk op gesprekshouding en afweging, wat zich goed leent voor een praktijksimulatie. Aanvullende details over de
gemiste afspraken en de eigen aanpak van de cliënt maken de simulatie realistischer.

**Trainingsrichtingen**

1. **Keuze respecteren en zorg benoemen**
   De cliënt geeft in een gesprek aan te willen stoppen met de weekplanningsondersteuning. De deelnemer kiest hoe hij
   reageert: de keuze direct accepteren, aandringen op voortzetting of de keuze verkennen en de eigen zorgen over
   gemiste afspraken bespreekbaar maken.
   *Leerdoel:* De deelnemer kan de wens van een cliënt om ondersteuning te stoppen verkennen en de eigen zorgen op basis van
   concrete observaties benoemen zonder de autonomie van de cliënt te ondermijnen.
2. **Eigen aanpak van de cliënt een kans geven**
   De deelnemer staat voor de keuze of en hoe hij ruimte geeft aan de eigen methode van de cliënt, bijvoorbeeld met
   afspraken over een proefperiode en evaluatiemomenten, of dat hij de ondersteuning ongewijzigd voortzet.
   *Leerdoel:* De deelnemer kan met een cliënt die een eigen aanpak wil volgen samen heldere afspraken maken over een
   proefperiode, signalen om op te letten en een evaluatiemoment.
3. **Gemiste afspraken bespreekbaar maken**
   De deelnemer moet beslissen of en hoe hij de gemiste afspraken inbrengt in het gesprek over het stoppen van de
   ondersteuning, zonder dat het gesprek een verwijtend of controlerend karakter krijgt.
   *Leerdoel:* De deelnemer kan feitelijke signalen zoals gemiste afspraken op een niet-beschuldigende manier bespreken en samen
   met de cliënt onderzoeken wat die signalen betekenen.

## Gedrag in Certum Studio

- Melding bovenaan: geen
- Trainingsrichtingen selecteerbaar: ja
- Knop "Gebruik deze trainingsrichting": uitgeschakeld (melding: "Kies eerst een trainingsrichting.")

## Menselijke evaluatie

**Status: `PASS_WITH_NOTES`**

Menselijke review van de baseline training-analysis/v1.

### Sterk

- Autonomie en eigen regie worden serieus genomen; er wordt geen wilsonbekwaamheid of diagnose verondersteld.

### Aandachtspunten

- Gemiste afspraken worden iets te snel geïnterpreteerd als aanwijzing voor problemen met structuur.
- Enkele aanvullende contextvelden zijn niet noodzakelijk.
