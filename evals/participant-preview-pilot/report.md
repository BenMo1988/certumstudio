# Live Participant Preview Pilot (Step 17B): TR-0018, gestopt op privacyblokkade

Eerste live runtimeproef van Participant Preview V1 (`47c3c66`). Mohamed doorliep TR-0018 zelf als deelnemer, met
Claude live alleen voor de preview-runtime. Datum: 2026-10-05.

Hoofdvraag: voelt TR-0018 als een professionele simulatie wanneer Mohamed hem als deelnemer ervaart, met Claude live?

> Synthetische data. Deze map bevat geen deelnemerstekst, chatberichten, AI-antwoorden of feedbacktekst, en geen secrets.
> `usage.jsonl` komt uit de fetch-probe buiten de productcode en bevat alleen model, tokens, stop_reason, status en duur.

## Opzet

- **Provider:** alleen `CERTUM_PREVIEW_PROVIDER=claude`. Analyse, Blueprint, Block Plan en Block Content stonden
  expliciet op `mock` via de procesomgeving. `.env.local` zet `CERTUM_ANALYSIS_PROVIDER=claude`, maar de procesomgeving
  heeft voorrang; dat is vóór de start gecontroleerd met de env-loader van Next.
- **Instellingen:** `claude-opus-5-5`, chat op effort `low`, feedback op `medium`, `maxRetries: 0`, geen fallbackmodel.
- **Rolverdeling:** Mohamed was de deelnemer. Claude Code voerde niets in en las alleen metadata.
- **Code:** tijdens de pilot zijn geen prompts, schema's, persona's of goedgekeurde inhoud gewijzigd.

## Pilotevidence

| Previewstap | Blok | Type | Uitkomst |
| --- | --- | --- | --- |
| 1 Start | — | Start | doorlopen |
| 2 Context | blok-1 | Tekst | doorlopen |
| 3 Actie-chat | blok-2 | Chat simulatie | 2 deelnemersbeurten, 2 Claude-calls, afgerond |
| 4 Reflectie | blok-3 | Open vraag | beantwoord (alleen preview-state) |
| 5 Feedback | blok-4 | AI Feedback | 1 Claude-call, context: 1 antwoord (blok-3) |
| 6 Bron | blok-5 | Tekst | doorlopen |
| **7 Transfer-chat** | **blok-6** | **Chat simulatie** | **gestopt: privacyblokkade bij de eerste deelnemersbeurt** |
| 8–10 | blok-7, blok-8, Einde | — | niet bereikt |

**De blokkade:**
- **Status:** de Preview Privacy Preflight gaf `review_required` met de categorie `possible_person_name`. De preview
  laat alleen `safe` door, dus het antwoord was `privacy_blocked`.
- **Oorsprong van de naam:** de term was de synthetische naam "Noor". Die komt uit de goedgekeurde training zelf:
  - in blok-6 staat hij 1× in `firstMessage`, 6× in `scenarioContext` en 7× in `personaInstructions`;
  - in geen ander blok, niet in Start of Einde en niet in de oorspronkelijke invoer. Block Content heeft de naam
    geïntroduceerd.
- **Provider:** voor deze beurt is de provider niet aangeroepen. De serverlog toont twee korte requests (44 ms en
  37 ms) zonder `certum.preview_runtime`-regel en zonder probe-regel. Dat past bij geweigerde beurten. De runtime logt
  een privacyweigering niet als metadata, dus de reden is uit de log alleen af te leiden.
- **Gedrag van de gebruiker:** er is niet geprobeerd de tekst aan te passen of de blokkade te omzeilen. De pilot is
  direct gestopt.

### Usage (alleen calls die werkelijk plaatsvonden)

| # | Soort | Blok | Effort | Input | Output | stop_reason | Duur (provider) |
| --- | --- | --- | --- | ---: | ---: | --- | ---: |
| 1 | chat | blok-2 | low | 2.550 | 242 | end_turn | 5,5 s |
| 2 | chat | blok-2 | low | 2.973 | 325 | end_turn | 5,5 s |
| 3 | feedback | blok-4 | medium | 2.062 | 1.500 | **max_tokens** | 17,9 s |

- **Calls:** 3 live calls (2 chat, 1 feedback), allemaal HTTP 200.
- **Tokens:** 7.585 input en 2.067 output.
- **Fouten en herhalingen:** geen providerfouten, geen retries.
- **Wijzigingen:** geen productwijzigingen tijdens de pilot.

**Bevinding `preview_feedback_max_tokens` (WATCH, niet opgelost):** de feedbackcall bereikte de outputlimiet
(`feedbackMaxTokens: 1500`, `stop_reason: max_tokens`). De runtime accepteert dat als `success`, dus de getoonde
feedback was waarschijnlijk afgekapt. Dat de feedback afgekapt was, staat niet vast: de feedbacktekst is bewust niet
ingezien.

## Pilotstatus (voorlopig)

| Onderdeel | Oordeel | Toelichting |
| --- | --- | --- |
| Runtime conversation (Actie-chat) | **YES_WITH_NOTES** | De zorgcoördinator reageerde inhoudelijk, de druk bleef bestaan, er kwam een concrete vervolgvraag en het gesprek stortte niet in na één nette reactie. |
| Transfer | **NOT_COMPLETED** | Privacyblokkade vóór de eerste deelnemersbeurt. |
| Feedback experience (Feedback 1) | **YES_WITH_NOTES** | Sloot aan op het reflectieantwoord, benoemde expliciet dat het gesprek zelf niet zichtbaar was en claimde geen verboden chatcontext. Zie ook `preview_feedback_max_tokens`. |
| Whole training experience | **INCOMPLETE** | |
| Flight-simulator promise | **NOT_YET_PROVEN** | Niet omdat de simulatie inhoudelijk faalde, maar omdat de volledige runtimeflow niet voltooid kon worden. |

De twaalf productvragen zijn niet gesteld, omdat de sessie niet voltooid is.

**Blocker:** `preview_privacy_context_false_positive`, severity **RUNTIME_BLOCKER**. Participant Preview kan niet
onderscheiden tussen een synthetische naam uit de goedgekeurde training en een mogelijk nieuw of echt persoonsgegeven
dat de deelnemer zelf invoert.

## Diagnose (zonder gedragswijziging)

### Huidige preflightarchitectuur in de preview

- **Wat wordt gecontroleerd:** `previewChatTurn` roept `runPrivacyPreflight(message)` aan op uitsluitend het nieuwe
  deelnemersbericht (`preflightCategories([message])` in `app/trainings/preview/preview-runtime.ts`). `previewFeedback`
  controleert alleen de open antwoorden die als context meegaan.
  - Eerdere beurten worden niet opnieuw gecontroleerd; die zijn bij hun eigen beurt al gecontroleerd.
  - Persona-teksten en de goedgekeurde inhoud worden niet gecontroleerd.
- **Geen context:** `runPrivacyPreflight(text)` is een pure functie op één tekst. Er is geen parameter voor context,
  allowlist of trainingskennis, dus de preflight weet niets van de entiteiten in het scenario.
- **Waar `possible_person_name` vandaan komt:** `detectPersonName` (`modules/privacy/detectors.ts`) vindt drie
  vormen:
  1. aanspreekvorm + naam ("mevrouw Jansen");
  2. initialen + achternaam;
  3. een hoofdletterwoord midden in een zin dat niet op de korte lijst `NOT_A_NAME` staat. "Noor" midden in een zin
     valt onder deze vorm.
  - De severity is `review_required` (`CATEGORY_INFO`), dus geen harde blokkade.
- **Strenger dan de intake:**
  - Bij de intake mag de gebruiker iedere `review_required`-bevinding per stuk bevestigen (`evaluatePreflightGate`,
    met hash-binding).
  - De preview laat alleen `safe` door en kent geen bevestiging per bevinding. Daardoor blokkeert iedere
    `review_required`-bevinding, ook een naam uit het scenario. Dat was een bewuste V1-keuze (strenger), maar die is
    hier de directe oorzaak.
- **Wat de server al weet:** op het moment van de check heeft de server de synthetic-only-bevestiging (`syntheticAttested`).
  Na de preflight laadt hij ook het goedgekeurde pakket, maar dat wordt nu niet gebruikt voor de privacycheck. De
  volgorde is: bevestiging → preflight → laden van de goedgekeurde stand.
- **Kan de server de scenario-entiteiten betrouwbaar bepalen?**
  - **Gedeeltelijk.** Er is geen gestructureerde entiteitenlijst: namen staan alleen in vrije tekst (`scenarioContext`,
    `firstMessage`, `personaInstructions`, `text`, …).
  - **Wel betrouwbaar** is dat de server deterministisch dezelfde detector kan draaien over de velden van de current
    goedgekeurde revisions die de deelnemer te zien krijgt. De probe op TR-0018 toont dat dit werkt: in blok-6
    vindt de detector "Noor" 1/1 keer in `firstMessage` en 5/6 keer in `scenarioContext` (eenmaal aan het zinsbegin,
    dus niet gedetecteerd).
  - **Bijvangst:** dezelfde detector markeert ook hoofdletterwoorden die geen naam zijn (blok-1 `text`: 4, blok-5
    `text`: 3, blok-6 `personaName`: 1). De Actie-chat had dus om dezelfde reden kunnen blokkeren als de deelnemer
    zo'n term uit de Context had overgenomen.
- **Bevestiging en naamfout zijn los van elkaar.** De synthetic-only-attestatie is technisch beschikbaar, maar zegt
  niets over welke naam synthetisch is. Ze vervangt de preflight niet en mag dat ook niet doen.

### Root cause

De preview-preflight controleert de tekst van de deelnemer contextloos en laat alleen `safe` door. Een naamachtig
woord dat de goedgekeurde synthetische training zelf aan de deelnemer toont, wordt daardoor behandeld als een
mogelijk nieuw persoonsgegeven. Er is geen server-side weg om te herkennen dat het woord exact uit de goedgekeurde
inhoud komt, en geen weg om een `review_required`-bevinding bewust te bevestigen.

### Veiligheidsrisico's als scenario-entiteiten worden toegestaan

1. **Samenvallende echte naam:** een deelnemer bedoelt met "Noor" een echte cliënt. Dat is technisch nooit te
   onderscheiden van de scenarionaam. Het risico is begrensd, omdat de provider dezelfde naam al uit de goedgekeurde
   inhoud kent; de naam voegt dan geen nieuwe identificator toe. Een echte achternaam erbij ("Noor Bakker") blijft wel
   een nieuw gegeven.
2. **Gedeeltelijke match als lek:** als "Noor" is toegestaan, mag "Noor Bakker" (één samengevoegde span) of
   "Noor + straat + huisnummer" niet meeliften. Toestaan mag alleen op exact dezelfde span. Harde categorieën
   (`blocked`) worden nooit toegestaan.
3. **Vervalsing door de client:** als de client entiteiten, persona-beurten of een allowlist zou kunnen aanleveren,
   kan iemand elke naam "goedkeuren". In de huidige API zijn de persona-beurten in `history` door de client
   aangeleverd. Die mogen daarom nooit als bron voor toegestane entiteiten dienen, ook niet als de persona live een
   naam heeft geïntroduceerd.
4. **Te brede bron:** worden entiteiten afgeleid uit alle teksten, dus ook verborgen `personaInstructions` en
   `instructions`, dan krijgt de deelnemer vrijstelling voor namen die de deelnemer nooit heeft gezien. Dat is klein maar
   onnodig. Neem alleen velden die de deelnemer werkelijk te zien krijgt.
5. **Stale bron:** entiteiten mogen alleen komen uit de current goedgekeurde revisions, dezelfde bron als de runtime.
   Een eerdere revision of een niet-goedgekeurde bewerking telt niet.

## Oplossingsrichtingen (ontwerp, niet gebouwd)

Voor alle opties geldt:
- de server leidt de toegestane entiteiten af uit de current goedgekeurde, voor de deelnemer zichtbare inhoud;
- de client levert nooit entiteiten;
- `blocked`-categorieën blijven altijd blokkeren;
- in logs alleen aantallen, nooit waarden.

### Optie A: Approved synthetic entity context

De preflight blijft streng. De server bouwt per training een set "goedgekeurde scenario-entiteiten" en geeft die mee
aan een contextbewuste variant van de check.

| Criterium | Beoordeling |
| --- | --- |
| Privacyveiligheid | Hoog, mits exact op span wordt gematcht. Nieuwe namen blijven blokkeren. |
| False negatives | Alleen een echte naam die exact gelijk is aan een scenarionaam (zie risico 1). |
| False positives | Sterk lager. Blijven bestaan bij verbuigingen ("Noors") of een naam die de persona live introduceerde. |
| Complexiteit | Laag tot middel: één pure functie plus het afleiden van de set uit het pakket. |
| Server-authority | Volledig; de set komt uit de snapshot die al geladen wordt. |
| Misbruik | Geen clientparameter, dus niet te vervalsen. |
| Logging | Een extra aantal (`approvedEntityMatches`), geen waarden. |

A zegt *wat* vertrouwd is, maar niet *hoe* er gematcht wordt. Zonder een precieze matchregel wordt A in de praktijk
een losse allowlist.

### Optie B: Normaliseren vóór de privacycheck

Exact bekende entiteiten worden in een kopie vervangen door een rol (`Noor → [synthetic_young_person]`). Daarna draait
de preflight op de kopie, en het origineel gaat alleen naar de provider als de check slaagt.

| Criterium | Beoordeling |
| --- | --- |
| Privacyveiligheid | Middel. Vervangen verandert de context waarop de detectoren steunen: zinsbegin, samengevoegde namen ("Noor Bakker" wordt "[rol] Bakker", waarna "Bakker" misschien niet meer als naam wordt herkend) en aanspreekvormen. |
| False negatives | Hoger dan A/C, door de veranderde context. |
| False positives | Vergelijkbaar met A. |
| Complexiteit | Middel tot hoog: een rollabel per entiteit vraagt een rolmapping die niet in het contract staat (de naam staat alleen in vrije tekst). |
| Server-authority | Volledig. |
| Misbruik | Geen clientparameter, maar het verschil tussen gecontroleerde en verstuurde tekst is een nieuw risico. |
| Logging | Neutraal. |

### Optie C: Tweefasencheck

1. Draai de bestaande, ongewijzigde preflight op de originele tekst.
2. Bekijk per bevinding met severity `review_required` en categorie `possible_person_name` (eventueel later ook
   `institution_name`) of de exacte span-tekst voorkomt in de server-side set van goedgekeurde scenario-entiteiten.
   - Alleen zulke bevindingen worden vrijgesteld.
   - Alle andere bevindingen blijven blokkerend: onbekende namen, langere spans en alle `blocked`-categorieën.

| Criterium | Beoordeling |
| --- | --- |
| Privacyveiligheid | Hoog: de detectie zelf verandert niet en de vrijstelling is per bevinding controleerbaar. |
| False negatives | Alleen risico 1. "Noor Bakker" blijft één span en blijft blokkeren. |
| False positives | Laag; verbuigingen en live door de persona geïntroduceerde namen blijven blokkeren (bewust). |
| Complexiteit | Laag: een post-filter op bestaande bevindingen. `runPrivacyPreflight` en de detectoren blijven gelijk. |
| Server-authority | Volledig. |
| Misbruik | Geen clientinvoer in de beslissing. |
| Logging | `certum.preview_privacy` met status, aantallen per categorie, `approvedEntityMatches` en de beslissing (zoals `certum.preflight`). Dat lost ook het gat op dat een preview-weigering nu niet gelogd wordt. |

### (Ter vergelijking) Optie D: bevestiging per bevinding, zoals bij de intake

De trainer bevestigt een `review_required`-bevinding, gebonden aan de hash van exact deze tekst. Dit sluit aan op
bestaand beleid, maar onderbreekt het gesprek bij iedere naam en verschuift de verantwoordelijkheid naar de
deelnemer. Dat past niet bij een simulatie, en later bij echte deelnemers nog minder. Niet aanbevolen als primaire
oplossing.

### Benodigde tests (A+C)

- Een naam uit de goedgekeurde, zichtbare inhoud wordt vrijgesteld. Een onbekende naam blijft blokkeren, en zo ook
  "naam + achternaam" waarvan alleen de voornaam goedgekeurd is.
- `blocked`-categorieën worden nooit vrijgesteld, ook niet als ze letterlijk in de inhoud staan.
- Een naam die alleen in `personaInstructions` of `instructions` staat (niet zichtbaar) wordt niet vrijgesteld.
- Een door de client aangeleverde persona-beurt of extra parameter met een naam heeft geen effect.
- Een naam uit een niet-goedgekeurde of stale revision wordt niet vrijgesteld (na bewerken is de preview `not_ready`).
- Hetzelfde geldt voor de open antwoorden bij AI Feedback.
- De logging bevat aantallen, nooit de naam of de tekst.
- De query-telling blijft 4: de set wordt afgeleid uit dezelfde snapshot.

## Aanbeveling

**A+C:**
- **Bron (A):** de server leidt per training een set goedgekeurde scenario-entiteiten af door de bestaande detector
  te draaien over de voor de deelnemer zichtbare velden van de current goedgekeurde revisions (Start, Einde en per
  blok `title`, `text`, `question`, `scenarioContext`, `firstMessage`, `personaName`). Nooit uit de client of
  `history`.
- **Mechanisme (C):** daarna een tweefasencheck die alleen `possible_person_name`-bevindingen vrijstelt, met een exacte
  span-match.

Daarbij:
- de preflight zelf en de detectoren blijven ongewijzigd;
- er komt geen hardgecodeerde allowlist;
- de vrijstelling hangt aan dezelfde snapshot als de runtime.

Optie B wordt afgeraden, omdat normaliseren de detectiecontext verandert. Optie D past niet bij een simulatie.

Voor de vervolgstap (alleen na akkoord):
- Leg eerst in een kleine test met de TR-0018-fixture vast dat de Transfer-chat met de scenarionaam doorgaat en een
  nieuwe naam blijft blokkeren.
- Hervat daarna de live pilot vanaf het begin, één volledige sessie.
- Neem `preview_feedback_max_tokens` daarbij mee als aparte, bewuste beslissing (limiet of `stop_reason`-afhandeling).
  Die hoort niet bij deze fix.

## Besluit en fix (na de diagnose)

Mohamed koos A+C, strakker dan voorgesteld, en liet `preview_feedback_max_tokens` vóór de hervatting meteen meenemen.

- **Privacy:**
  - De bestaande preflight blijft leidend en ongewijzigd.
  - Alleen `review_required`/`possible_person_name` kan worden vrijgesteld, en alleen als exact die span voorkomt in
    de inhoud die de deelnemer tot en met de huidige stap van de current goedgekeurde training kon zien.
  - `blocked` blijft altijd geblokkeerd. Er is geen fuzzy matching en geen allowlist van de client. "Noor Bakker"
    matcht niet met "Noor", en één andere bevinding blokkeert het hele bericht.
  - Restrisico, geaccepteerd voor Trainer Preview V1: een echte "Noor" is niet te onderscheiden van de synthetische
    "Noor". Voor een publiek deelnemersproduct opnieuw beoordelen.
  - Code: `modules/preview/privacy.ts`. Logging: `certum.preview_privacy`, alleen aantallen.
- **Feedback:**
  - De limiet is niet verhoogd. `participant-feedback/v1.1` vraagt om compacte feedback van ongeveer 350–500 woorden.
  - De technische limiet van 1500 tokens blijft als headroom.
  - `max_tokens` wordt nooit meer als compleet antwoord behandeld, in chat noch feedback (`incomplete_output`).
- **Tests:**
  - TR-0018-fixture (`test/fixtures/tr-0018-package.json`): "Noor" is vertrouwd in blok-6, maar nog niet in blok-2.
  - Exactheid en blokkades: "Noor Bakker", "Noor + Sanne", e-mail en datum blijven geblokkeerd. Verborgen
    persona-instructies leveren geen vertrouwde namen.
  - Vervalsing: een vervalste persona-beurt of een allowlist-parameter van de client heeft geen effect.
  - Afgekapte output: `max_tokens` wordt `incomplete_output`.
