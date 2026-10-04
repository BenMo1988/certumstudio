# B21-PRESCRIBED · Run 2026-10-03 · training-blueprint/v2.1 · claude-opus-5-5 · medium

Integratierun voor trusted routebeleid (prompt `training-blueprint/v2.1`, contract `blueprint-contract/v2`), met
precies één poging (`maxRetries: 0`). Configuratie bevroren op commit `6a1ccaf` (architectuur `de1f71d`).

Uitgevoerd via de Server Action `generateBlueprint` op de dev-server (`CERTUM_ANALYSIS_PROVIDER=mock`,
`CERTUM_BLUEPRINT_PROVIDER=claude`), met exact de Analysis V2.1-fixture `CA-010`
(`test/fixtures/v21-ready-analyses.json`). Er is geen analyse door Claude gedaan.

**Status: `PASS_WITH_NOTES`** (menselijk beoordeeld; zie "Menselijke evaluatie").

## Configuratie en metadata

| Veld | Waarde |
| --- | --- |
| rundatum | 2026-10-03 |
| provider | claude |
| model | claude-opus-5-5 |
| effort | medium |
| maxRetries | 0 |
| promptVersion | training-blueprint/v2.1 |
| contractVersion | blueprint-contract/v2 |
| durationMs | 24690 |
| outcome | success |
| invarianten | geen schendingen (Blueprint toegelaten door provider én flow, incl. ambiguïteit = routebeleid) |

## Keten

| Veld | Waarde |
| --- | --- |
| gekozen Analysis-richting | `instructie-volgen-ondanks-verzoek` |
| trusted routePolicy (Analysis) | `prescribed_action` |
| afgeleide ambiguity (server) | `single_best_action` |
| decisionPoint.routePolicy (server) | `prescribed_action` |
| actie.routePolicy (server) | `prescribed_action` |
| successCriteria | 3 |
| assumptions | 2 |
| sourceNeeds | SN1, SN2 |
| Bron sourceNeedRefs | SN1, SN2 |
| Feedback evaluationBasis | voorgeschreven_handeling, onderbouwing, uitvoering |
| Toets evaluationBasis | voorgeschreven_handeling, onderbouwing, uitvoering |

**decisionPoint.task:** De deelnemer reageert op het verzoek van de collega om te wachten: hij maakt de nooduitgang direct vrij volgens de vaste instructie, legt de collega uit waarom het verzoek niet wordt gevolgd en meldt het vrijmaken daarna aan de verantwoordelijke.

**Succescriteria**
1. De deelnemer maakt de geblokkeerde nooduitgang direct vrij en meldt dit daarna aan de verantwoordelijke, conform de vaste instructie.
2. De deelnemer legt aan de collega uit waarom het verzoek om te wachten niet wordt gevolgd, met verwijzing naar de vaste instructie en het doel van een vrije nooduitgang.
3. De deelnemer benoemt de zorg van de collega over onrust in de groep en laat zien hoe hij daarmee rekening houdt zonder de instructie uit te stellen.

**Aannames**
1. De simulatie start op het moment waarop de collega het verzoek doet om te wachten met het weghalen van de dozen. *Reden:* Het keuzemoment ontstaat pas wanneer instructie en verzoek tegenover elkaar staan; dit startmoment maakt de spanning direct voelbaar.
2. De deelnemer heeft de handelingsruimte om de dozen zelf weg te halen en weet wie de verantwoordelijke is aan wie gemeld moet worden. *Reden:* Zonder deze handelingsruimte kan de voorgeschreven handelingslijn van vrijmaken en melden niet worden uitgevoerd en beoordeeld.

**sourceNeeds**
- `SN1` (nog_te_bepalen) Welke onderbouwing ligt ten grondslag aan de eis dat nooduitgangen te allen tijde vrij moeten zijn, en welke risico's brengt een tijdelijke blokkade met zich mee? *Waarom:* De deelnemer moet zijn keuze tegenover de collega inhoudelijk kunnen verantwoorden en de reden achter de vaste instructie kunnen koppelen aan zijn eigen handelen.
- `SN2` (organisatiebeleid) Wat houdt een melding aan de verantwoordelijke na het vrijmaken van een geblokkeerde nooduitgang in, en welke informatie hoort daarin? *Waarom:* Het melden is een vast onderdeel van de voorgeschreven handelingslijn; de deelnemer moet zijn eigen melding kunnen toetsen aan wat verwacht wordt.

## Volledige gebruikerszichtbare Training Blueprint

```json
{
  "version": "blueprint-contract/v2",
  "title": "Nooduitgang direct vrijmaken ondanks verzoek collega om te wachten",
  "targetAudience": "Begeleiders die groepsactiviteiten begeleiden in een werksituatie waarin vaste veiligheidsinstructies gelden.",
  "learningGoal": "De deelnemer kan de nooduitgang direct vrijmaken en dit daarna melden aan de verantwoordelijke, en kan aan de collega uitleggen waarom het verzoek om te wachten niet wordt gevolgd.",
  "professionalDilemma": "De begeleider staat voor de vraag of hij de vaste instructie om de nooduitgang direct vrij te maken uitvoert, terwijl een collega vraagt hiermee te wachten om onrust in de groep te voorkomen.",
  "selectedDirectionId": "instructie-volgen-ondanks-verzoek",
  "sourceRefs": [
    "S1",
    "S2",
    "S3"
  ],
  "participantRole": "Begeleider die tijdens een lopende groepsactiviteit een door gestapelde dozen geblokkeerde nooduitgang opmerkt en door een collega wordt gevraagd hiermee te wachten.",
  "scenarioPremise": "Tijdens een lopende groepsactiviteit merkt de begeleider dat een nooduitgang geblokkeerd is door gestapelde dozen. Een collega vraagt de dozen pas na afloop weg te halen, omdat het onderbreken van de activiteit volgens de collega onrust geeft in de groep. In deze werksituatie geldt de vaste instructie dat een geblokkeerde nooduitgang direct wordt vrijgemaakt en dat dit daarna wordt gemeld aan de verantwoordelijke. De sector of setting van de activiteit is niet vastgesteld.",
  "decisionPoint": {
    "task": "De deelnemer reageert op het verzoek van de collega om te wachten: hij maakt de nooduitgang direct vrij volgens de vaste instructie, legt de collega uit waarom het verzoek niet wordt gevolgd en meldt het vrijmaken daarna aan de verantwoordelijke.",
    "routePolicy": "prescribed_action"
  },
  "ambiguity": "single_best_action",
  "successCriteria": [
    "De deelnemer maakt de geblokkeerde nooduitgang direct vrij en meldt dit daarna aan de verantwoordelijke, conform de vaste instructie.",
    "De deelnemer legt aan de collega uit waarom het verzoek om te wachten niet wordt gevolgd, met verwijzing naar de vaste instructie en het doel van een vrije nooduitgang.",
    "De deelnemer benoemt de zorg van de collega over onrust in de groep en laat zien hoe hij daarmee rekening houdt zonder de instructie uit te stellen."
  ],
  "assumptions": [
    {
      "assumption": "De simulatie start op het moment waarop de collega het verzoek doet om te wachten met het weghalen van de dozen.",
      "reason": "Het keuzemoment ontstaat pas wanneer instructie en verzoek tegenover elkaar staan; dit startmoment maakt de spanning direct voelbaar."
    },
    {
      "assumption": "De deelnemer heeft de handelingsruimte om de dozen zelf weg te halen en weet wie de verantwoordelijke is aan wie gemeld moet worden.",
      "reason": "Zonder deze handelingsruimte kan de voorgeschreven handelingslijn van vrijmaken en melden niet worden uitgevoerd en beoordeeld."
    }
  ],
  "sourceNeeds": [
    {
      "id": "SN1",
      "question": "Welke onderbouwing ligt ten grondslag aan de eis dat nooduitgangen te allen tijde vrij moeten zijn, en welke risico's brengt een tijdelijke blokkade met zich mee?",
      "sourceType": "nog_te_bepalen",
      "whyNeeded": "De deelnemer moet zijn keuze tegenover de collega inhoudelijk kunnen verantwoorden en de reden achter de vaste instructie kunnen koppelen aan zijn eigen handelen."
    },
    {
      "id": "SN2",
      "question": "Wat houdt een melding aan de verantwoordelijke na het vrijmaken van een geblokkeerde nooduitgang in, en welke informatie hoort daarin?",
      "sourceType": "organisatiebeleid",
      "whyNeeded": "Het melden is een vast onderdeel van de voorgeschreven handelingslijn; de deelnemer moet zijn eigen melding kunnen toetsen aan wat verwacht wordt."
    }
  ],
  "learningArc": {
    "context": {
      "participantKnows": "Er loopt een groepsactiviteit, de nooduitgang is geblokkeerd door gestapelde dozen, een collega vraagt te wachten tot na afloop vanwege mogelijke onrust in de groep, en er geldt een vaste instructie om direct vrij te maken en daarna te melden.",
      "deliberatelyUnknown": "Hoe de groep en de collega zullen reageren op het onderbreken van de activiteit, en of zich tijdens de activiteit een situatie voordoet waarin de nooduitgang nodig is.",
      "tensionArises": "Tussen de vaste veiligheidsinstructie die onmiddellijk handelen vraagt en het verzoek van een collega die het belang van rust in de groep vooropstelt, waarbij ingaan tegen een collega ongemakkelijk is."
    },
    "actie": {
      "participantMust": "In gesprek met de collega reageren op het verzoek, de nooduitgang direct vrijmaken, de keuze tegenover de collega verantwoorden en het vrijmaken daarna melden aan de verantwoordelijke.",
      "performanceType": "gesprek_voeren",
      "routePolicy": "prescribed_action"
    },
    "reflectie": {
      "looksBackOn": "De eigen reactie op het verzoek van de collega: of en wanneer de nooduitgang is vrijgemaakt, hoe de keuze aan de collega is uitgelegd en of de melding is gedaan.",
      "explicitTradeOff": "De afweging tussen het veiligheidsbelang van een direct vrije nooduitgang en de door de collega genoemde onrust in de groep, en waarom de vaste instructie hier leidend is."
    },
    "feedback": {
      "respondsTo": "Het uitgevoerde handelen (direct vrijmaken en daarna melden) en de onderbouwing die de deelnemer aan de collega geeft, inclusief hoe met de zorg van de collega is omgegaan.",
      "dimensions": [
        "Uitvoering van de voorgeschreven handelingslijn: direct vrijmaken en daarna melden",
        "Verantwoording van de keuze tegenover de collega",
        "Omgang met de zorg van de collega over onrust in de groep"
      ],
      "evaluationBasis": [
        "voorgeschreven_handeling",
        "onderbouwing",
        "uitvoering"
      ],
      "multipleDefensibleHandling": null
    },
    "bron": {
      "learningIntent": "Na het handelen koppelt de deelnemer de gevalideerde onderbouwing van vrije nooduitgangen en de verwachtingen rond melden aan zijn eigen keuze en uitleg aan de collega, zodat hij ziet waar zijn verantwoording sterker of vollediger kan.",
      "sourceNeedRefs": [
        "SN1",
        "SN2"
      ]
    },
    "toets": {
      "demonstrate": "Opnieuw de vaste instructie direct uitvoeren en daarna melden, en de keuze helder verantwoorden tegenover iemand die vraagt te wachten.",
      "transferEvidence": "De deelnemer past dezelfde handelingslijn toe in een gewijzigde situatie en onderbouwt zijn keuze zelfstandig met de reden achter de instructie, zonder zich te laten afleiden door de nieuwe druk.",
      "newDecisionPoint": "Een vergelijkbare situatie waarin de nooduitgang opnieuw geblokkeerd is, maar het verzoek om te wachten met meer aandrang wordt gedaan of van een andere betrokkene komt, bijvoorbeeld met tijdsdruk door het einde van de activiteit.",
      "evaluationBasis": [
        "voorgeschreven_handeling",
        "onderbouwing",
        "uitvoering"
      ]
    }
  }
}
```

## Feitelijke controle (zonder oordeel)

| Vraag | Waarneming |
| --- | --- |
| 1. Eén leidende handelingslijn vastgehouden? | Ja. Task: "hij maakt de nooduitgang direct vrij volgens de vaste instructie, legt de collega uit waarom het verzoek niet wordt gevolgd en meldt het vrijmaken daarna aan de verantwoordelijke"; Actie, succescriterium 1, Feedback-dimensie 1 en Toets volgen dezelfde lijn. |
| 2. Lijn ten onrechte weer open gemaakt? | Nee. Geen alternatieve route; evaluationBasis bevat voorgeschreven_handeling; multipleDefensibleHandling is null. Het trusted `professionalDilemma` (uit de analyse) zegt nog "of hij de vaste instructie … uitvoert" (het CA-010-aandachtspunt); Reflectie kijkt terug op "of en wanneer de nooduitgang is vrijgemaakt". |
| 3. Verschil vaste handeling ↔ vrijheid in uitvoering zichtbaar? | Ja. Succescriterium 3: "benoemt de zorg van de collega … en laat zien hoe hij daarmee rekening houdt zonder de instructie uit te stellen"; Feedback-dimensie "Omgang met de zorg van de collega over onrust in de groep" naast "Uitvoering van de voorgeschreven handelingslijn". |
| 4. Betekenisvol decisionPoint? | Ja: de reactie op het verzoek van de collega onder de spanning van de lopende activiteit; de handeling ligt vast, het verantwoorden en de omgang met de collega vragen professioneel handelen. |
| 5. Feedback meet correcte én professionele uitvoering? | Ja: voorgeschreven_handeling + onderbouwing + uitvoering; dimensies voor de handelingslijn, de verantwoording en de omgang met de zorg van de collega. |
| 6. Toets meet transfer, geen kennisquiz? | Ja: een vergelijkbare situatie met meer aandrang of een andere betrokkene; dezelfde handelingslijn en verantwoording. |
| 7. Externe regels geïntroduceerd? | Geen wet of richtlijn genoemd. SN1 vraagt naar "de onderbouwing … van de eis dat nooduitgangen te allen tijde vrij moeten zijn" (formuleert de instructie iets algemener dan de input, als te valideren kennisvraag, sourceType nog_te_bepalen). SN2 (organisatiebeleid) vraagt wat een melding inhoudt. |
| Overig | Context voegt toe dat "ingaan tegen een collega ongemakkelijk is" (ontwerpduiding van de spanning). De premise vermeldt "De sector of setting van de activiteit is niet vastgesteld". Aanname 2 (handelingsruimte en bekendheid met de verantwoordelijke) is ontwerpnoodzakelijk. Geen BC Online-bloknamen. |

## Menselijke evaluatie

**Status: `PASS_WITH_NOTES`**

Menselijke review van de integratierun training-blueprint/v2.1.

De keten Analysis `prescribed_action` → Blueprint `single_best_action` → decisionPoint `prescribed_action` → Actie
`prescribed_action` blijft inhoudelijk consistent. De vaste handelingslijn blijft leidend, terwijl professionele ruimte
blijft bestaan in de wijze van uitvoering.

### Notes (geen functionele fout, geen aanleiding voor een nieuwe Analysis- of Blueprintversie)

- Het reeds bekende trusted `professionalDilemma` bevat nog de formulering "of hij …".
- Reflectie gebruikt "of en wanneer", wat taalkundig opener klinkt dan het routebeleid.
- SN1 generaliseert de veiligheidsinstructie enigszins, maar uitsluitend als te valideren sourceNeed en niet als
  vastgesteld feit.
