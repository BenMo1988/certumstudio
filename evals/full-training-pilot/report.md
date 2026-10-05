# Full Training Pilot 1: TR-0014 (eindrapport)

Eerste volledige synthetische Certum-training van intake tot review, door de normale persisted Studio-flow (UI) met
echte Claude-output. Beoordeeld als opleider en als product, niet als technische flow. Datum: 2026-10-05.

> Synthetische data. Geen secrets of databasegegevens in deze map. Usage per call is vastgelegd met een fetch-probe
> buiten de productcode ([harness/usage-probe.mjs](harness/usage-probe.mjs)); alleen model, tokens, stop_reason,
> status en duur.

## Kerngegevens

| | |
| --- | --- |
| Training code | **TR-0014** (`0ff3cc98-453a-46fc-ac1e-8a5dd0e37a32`, Supabase dev) |
| Titel (Blueprint) | Een toevertrouwd geheim van een 15-jarige: wat doe je ermee? |
| Titel (trainingsrecord) | "Nieuwe training · Casus" (niet bijgewerkt; zie bevindingen) |
| Frozen input | [input.md](input.md) (casus, jeugd/wijkteam) |
| Gekozen richting | `vertrouwelijkheid-jongere`: "Omgaan met het geheimhoudingsverzoek van de jongere" |
| Leerdoel | De deelnemer kan afwegen hoe hij omgaat met informatie die een jongere hem onder voorwaarde van geheimhouding toevertrouwt, waarbij hij de vertrouwensrelatie, de zorgen die de informatie oproept en zijn professionele verantwoordelijkheid meeweegt, en kan zijn keuze tegenover de jongere en zichzelf onderbouwen. |
| routePolicy / ambiguity | `open_choice` / `multiple_defensible_actions` |
| Blokken | 9 (Context 1 · Actie 2 · Reflectie 1 · Feedback 1 · Bron 1 · Toets 3) + Vaste Start en Vast Einde |
| estimatedMinutes | **65** (8 gegenereerde blokken; Bron onbekend; Start/Einde zonder eigen schatting, totaalduur Start `null`) |
| Bronnen | 4 gevalideerd (src-1, src-2 → SN1; src-3, src-4 → SN2); zie [sources-proposal.md](sources-proposal.md) |
| Gedekte sourceNeeds | SN1, SN2 |
| Niet gedekte sourceNeeds | **SN3** (organisatiewerkwijze), bewust |
| Claude-calls totaal | **14** (allemaal `claude-opus-5-5`, HTTP 200, `end_turn`) |
| Input- / outputtokens | **177 692** / **26 929** (providerduur 312 s) |
| Technische restart-calls | **2** (mislukte calls: blok-4 en blok-8, `invalid-output` · `structured_output`) |
| Handmatige edits | **4** (blok-1, blok-2, blok-4, blok-8) |
| Inhoudelijke regenerations | **0** |
| Goedgekeurde onderdelen | **10 van 11** (8 blokken + Vaste Start + Vast Einde) |
| Unresolved requirements | blok-6 Bron `needs_source` (SN3); capability gap AI Feedback-context (partial workaround, Block Plan) |
| Final readiness | `incomplete` · stage `content_review` · "1 bron ontbreekt"; **niet** Training gereed |
| Pilotstatus | **PRODUCT_BLOCKER: `organisation_specific_source_need`** (enige resterende readiness-blocker; geen technische failure) |
| Commercieel oordeel | **YES_AFTER_EDIT** (zie onderaan) |

## Calls en usage

| # | Stap | Doel | In | Uit | Duur (ms) | Uitkomst |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Intake | Analysis | 7 711 | 3 069 | 38 543 | `ready` |
| 2 | Richting | Blueprint | 9 141 | 3 335 | 39 363 | ok |
| 3 | Blueprint goedgekeurd | Block Plan | 10 420 | 5 070 | 48 394 | ok |
| 4 | Content | Vaste Start/Einde | 11 764 | 1 643 | 17 232 | ok |
| 5 | Content | blok-1 Context | 13 744 | 1 344 | 17 667 | ok |
| 6 | Content | blok-2 Actie | 14 003 | 1 604 | 15 515 | ok |
| 7 | Content | blok-3 Actie | 13 855 | 1 078 | 14 668 | ok |
| 8 | Content | blok-4 Reflectie | 13 944 | 979 | 15 577 | **`invalid-output` (structured_output)** |
| 9 | Technische herstart | blok-4 Reflectie | 13 944 | 1 151 | 13 196 | ok |
| 10 | Technische herstart | blok-5 Feedback | 13 966 | 1 689 | 25 225 | ok |
| 11 | Technische herstart | blok-7 Toets | 13 600 | 1 838 | 21 437 | ok |
| 12 | Technische herstart | blok-8 Toets | 13 910 | 898 | 12 192 | **`invalid-output` (structured_output)** |
| 13 | Technische herstart | blok-8 Toets | 13 910 | 1 268 | 12 837 | ok |
| 14 | Technische herstart | blok-9 Toets | 13 780 | 1 963 | 20 354 | ok |
| – | Bron (blok-6) | – | 0 | 0 | 0 | `needs_source` server-side, 0 calls |

- **Technische restart ≠ inhoudelijke regeneration.** Na beide fouten koos de operator één keer "Ontbrekende blokken
  genereren" (bestaande UI); dat genereert alleen blokken zonder inhoud. Geen inhoudelijke regeneratie.
- Per categorie: Analysis 1 · Blueprint 1 · Block Plan 1 · Start/Einde 1 · blokken 10 (8 geslaagd, 2 mislukt) ·
  Bron 0 · regeneration 0. Ruwe usage: [usage.jsonl](usage.jsonl).
- **Kosten:** geen betrouwbare lokale prijsdata voor `claude-opus-5-5`; alleen usage gerapporteerd. Ongeveer 15 %
  van de tokens (2 calls) ging naar mislukte output.
- Bronnenonderzoek, broninvoer, review, edits en goedkeuringen: **0 calls** (providers op mock; probe bevestigt).

## Werkwijze en menselijke besluiten

Volledig in [log.md](log.md). Samengevat: richting gekozen (kern van het dilemma), Blueprint goedgekeurd, Block Plan
goedgekeurd met notities (Actie alleen open vragen; regeneratie niet stuurbaar), content gegenereerd met twee
technische herstarts, bronnen door Claude Code onderzocht en voorgesteld en door Mohamed gecontroleerd en
gevalideerd (na twee rondes met inhoudsloze bronversies), daarna review, vier handmatige edits en goedkeuring.

## Review per onderdeel (trainingsvolgorde)

| Onderdeel | Oordeel | Reden |
| --- | --- | --- |
| Vaste Start | **OK** | Duidelijke rol, opbouw en route-neutrale verwachting. Wat lang en herhaalt de vaste drieslag (relatie, zorg, verantwoordelijkheid) die later in bijna elk blok terugkomt. |
| Context · blok-1 Tekst | **EDIT** → OK | Geloofwaardige, concrete situatie die eindigt op het keuzemoment en benoemt wat onbekend is. Maar: zelf verzonnen namen met achternaam ("Lotte", "Ingrid de Wit"), inconsistent met alle andere blokken ("het meisje"), en een sturend nieuw detail ("Ze vertelde het rustig, alsof het voor haar niet zo bijzonder is"). |
| Actie · blok-2 Open vraag | **EDIT** → OK | Juiste kernvraag, maar vijf eisen in één alinea en opnieuw "Er is niet één juiste route". Gestructureerd in drie genummerde onderdelen. |
| Actie · blok-3 Open vraag | **OK** | Sterke opdracht (wat zeg je tegen haar, en waarom zo) met bruikbare feedbackcriteria (eerlijk, toon voor een 15-jarige, ruimte voor haar reactie). Hier hoort eigenlijk een gesprek; zie Actie-fase. |
| Reflectie · blok-4 Open vraag | **EDIT** → OK | Vroeg opnieuw dezelfde weging als blok-2 (overlap Actie/Reflectie) met vier deelvragen. Teruggebracht tot: wat woog het zwaarst en waarom, wat riskeer/maak je mogelijk, past je uitleg aan haar bij je afweging. |
| Feedback · blok-5 AI Feedback | **OK** | Specifiek, route-neutraal, vraagt in plaats van te veroordelen, geen kaders vóór Bron. Geeft de situatieachtergrond zelf mee (workaround voor de capability gap). Beperking: ziet de context-tekst niet, alleen antwoorden. |
| Bron · blok-6 | **BLOCKER (product)** | Bestaat niet: `needs_source` omdat SN3 open blijft. SN1/SN2 zijn inhoudelijk goed gekozen en gedekt. |
| Toets · blok-7 Tekst | **OK** | Echte transfer: de situatie verschuift wezenlijk (hij drong aan op afspreken bij hem thuis, zij heeft het beëindigd, berichten gaan door), route-neutraal ("Hoe je eerder ook hebt gehandeld"), expliciet wat bekend en onbekend is. |
| Toets · blok-8 Open vraag | **EDIT** → OK | Goede transferopdracht, maar een kromme openingszin ("Lees de nieuwe situatie die je net hebt gelezen nog eens door"). Zwaar (keuze, weging, wat je zegt, vergelijking), passend voor de afsluitende toets. |
| Toets · blok-9 AI Feedback | **OK** | Goede criteria, inclusief proportionaliteit van de verschuiving. Eerlijk dat de nieuwe situatie niet zichtbaar is ("De precieze beschrijving … ken je niet"); dat beperkt het oordeel over proportionaliteit. |
| Vast Einde | **OK** | Samenhangende afsluiting; verwijst naar "handelingsruimte anders dan je aannam" (een Bron-inzicht dat nu ontbreekt). |

### Handmatige edits

| Blok | Versie voor | Wijziging | Reden | Versie na |
| --- | --- | --- | --- | --- |
| blok-1 (Context) | v1 (gegenereerd) | Namen "Lotte" en "Ingrid de Wit" vervangen door "het meisje" / "haar moeder"; de zin "Ze vertelde het rustig, alsof het voor haar niet zo bijzonder is." geschrapt | Nieuwe casusfeiten (achternaam, houding) die niet in Blueprint of input staan en inconsistent zijn met de andere blokken; het houdingsdetail stuurt de risico-inschatting | v2 (handmatig), goedgekeurd |
| blok-2 (Actie) | v1 | Vraag herschreven tot hoofdvraag + drie genummerde onderdelen (keuze en moment; ontbrekende informatie; weging); "Er is niet één juiste route" geschrapt | Vraagdichtheid; herhaling (staat al in Start en feedback). Inhoud gelijk | v2 (handmatig), goedgekeurd |
| blok-4 (Reflectie) | v1 | De herhaalde weegvraag geschrapt; drie vragen: zwaarst wegend element en waarom, risico en mogelijkheid, samenhang tussen afweging en wat je haar zegt | Overlap met blok-2 en vraagdichtheid; reflectie moet terugkijken, niet de Actie herhalen | v2 (handmatig), goedgekeurd |
| blok-8 (Toets) | v1 | Openingszin vervangen door "Bekijk de nieuwe situatie nog eens." | Kromme formulering | v2 (handmatig), goedgekeurd |

Alle edits via de bestaande editor (`saveBlockEdit`, nieuwe immutable revision, concept); iedere nieuwe revision is
opnieuw bekeken vóór goedkeuring. Geen leerdoel, routebeleid of leerarchitectuur gewijzigd.

## Actie-fase: praktijksimulatie of digitaal werkblad?

**Oordeel: inhoudelijk sterk, als ervaring een werkblad.**

- De deelnemer moet wél echt kiezen en onderbouwen (blok-2) en verwoorden wat hij tegen het meisje zegt (blok-3).
  De afweging is reëel en open.
- Maar de deelnemer **beschrijft** zijn handelen in plaats van het te **doen**. Het kernmoment van deze casus, een
  15-jarige vertellen wat je met haar geheim doet terwijl zij dreigt niets meer te vertellen, wordt opgeschreven en
  nooit ervaren. Er is geen tegenspel, geen reactie van het meisje, geen moment waarop de deelnemer onder druk moet
  bijsturen.
- Over de hele training schrijft de deelnemer **vier open antwoorden** (≈ 48 van de 65 minuten). Dat voelt als een
  goed gemaakte digitale casusopdracht, niet als de vluchtsimulator die Bureau Certum positioneert.
- Het Block Plan koos bewust een open vraag boven een Chat simulatie met de redenering "eenvoudiger dan een
  gespreksimulatie met sleutelwoorden". Die redenering klopt niet voor `open_choice`: een Chat simulatie heeft daar
  juist geen sleutelwoorddoel (`goal: null`). Het Block Plan liet de sterkste beschikbare werkvorm daardoor liggen.
- Niet gerepareerd (geen regeneration, geen code). **Productbevinding `action_phase_worksheet`**, zie hieronder.

## Bron-fase

- **Inhoudelijk gewenst:** zonder Bron mist de training precies de vakinhoudelijke scherpte na het handelen; Einde
  verwijst er zelfs naar.
- **SN1 en SN2 zijn goed gekozen** en de vier gevalideerde bronnen zijn geschikt: BPSW Beroepscode 2021 (geldende
  code voor SKJ-geregistreerden; vertrouwelijkheid, toestemming, conflict van plichten) en NJi over informatie delen
  met ouders van 12–15-jarigen (SN1); NJi-signalen van online misbruik (alleen signalen, geen diagnostische framing)
  en NJi over moeilijk signaleren, het perspectief van jongeren en niet-oordelend contact (SN2). Samen geven ze
  precies de houding: zorg serieus nemen zonder alvast te besluiten wat er speelt.
- **SN3 is geen terechte blokkade voor deze generieke training.** "Wat zegt de werkwijze van déze organisatie?" kan
  in een generieke training alleen als opdracht aan de deelnemer ("ga na wat jouw organisatie afspreekt"), niet als
  centrale bron. Het huidige model kent maar één soort sourceNeed en eist dat het Bron-blok alle sourceNeeds dekt;
  daardoor blokkeert één organisatiegebonden vraag ook de inhoud die wél gedekt is.
- **Toekomstig onderscheid nodig (niet gebouwd):** public/professional sourceNeed (moet door een gevalideerde bron
  gedekt worden) tegenover organisation_specific sourceNeed (verwijzing naar het eigen beleid van de deelnemer;
  blokkeert een generieke training niet).

## Eindbeoordeling per Certum-fase

| Fase | Oordeel | Onderbouwing |
| --- | --- | --- |
| Context | **STERK** | Geloofwaardig, concreet, spanning en onbekenden helder; na het schrappen van verzonnen namen en één sturend detail volledig bruikbaar. |
| Actie | **BRUIKBAAR_MET_REDACTIE** | Echte, open professionele keuze, maar uitsluitend schriftelijk; mist het gesprek met het meisje als simulatie. Redactie nodig voor vraagdichtheid. |
| Reflectie | **BRUIKBAAR_MET_REDACTIE** | Na redactie scherp (wat woog het zwaarst, wat riskeer je, klopt je uitleg met je afweging); in de gegenereerde vorm een herhaling van Actie. |
| Feedback | **STERK** | Specifiek, eerlijk en route-neutraal binnen de aantoonbare context; gaat eerlijk om met wat hij niet ziet. |
| Bron | **ONVOLDOENDE** | Bestaat niet: productmatig geblokkeerd door SN3 (`organisation_specific_source_need`). Bronnen en kennisbehoeften SN1/SN2 zelf zijn wel goed. |
| Toets | **STERK** | Echte transfer met een wezenlijk andere situatie, route-neutraal, met feedback op de proportionaliteit van de verschuiving. |

## Productbeoordeling

| Vraag | Antwoord |
| --- | --- |
| **Waarde** | Ja. Een dagelijks, juridisch en ethisch lastig dilemma met echte spanning; precies waar jeugdprofessionals houvast bij zoeken. |
| **Praktijkherkenning** | Hoog. De situatie (ultimatum van het meisje, telefoontje van de moeder, onvolledige informatie) voelt als echte wijkteampraktijk. Na de edit geen verzonnen persoonsdetails meer. |
| **Handelen** | Onvoldoende als simulatie: de deelnemer schrijft vier keer op wat hij zou doen, maar handelt nergens in interactie. Dit is de belangrijkste productbevinding. |
| **Professionele ruimte** | Echt open. Ieder blok is route-neutraal, de feedback beoordeelt de kwaliteit van de afweging, en de Toets werkt ongeacht de eerder gekozen route. |
| **Flow** | Eén training: context → keuze → wat je zegt → terugkijken → feedback → nieuwe situatie → feedback. De ontbrekende Bron breekt de boog tussen feedback en transfer. |
| **Taal** | Professioneel, helder Nederlands, weinig wolligheid. Wel formulematig: de drieslag "vertrouwensrelatie, zorgen, professionele verantwoordelijkheid" staat in bijna elk blok en varianten van "er is niet één juiste route / meerdere routes zijn verdedigbaar" acht keer (na de edits; "vertrouwensrelatie" 18 keer). Dat verraadt het systeem. |
| **Lengte** | 9 blokken, 65 minuten zonder Bron (Start en Einde ongeschat). Voor één dilemma aan de zware kant, vooral door de schrijflast (≈ 48 minuten open antwoorden). Proportioneel voor een geaccrediteerde module van ruim een uur, maar niet licht. |
| **Menselijke redactie** | 4 handmatige edits op 10 beoordeelde onderdelen, alle klein (geen herbouw). Patronen: verzonnen persoonsfeiten (`persona_fact_drift` bevestigd), vraagdichtheid (`reflection_question_density` bevestigd), overlap tussen Actie en Reflectie, formulematige herhaling, één kromme zin. |
| **Regeneration** | 0 inhoudelijke regenerations; 2 technische herstarts na `invalid-output`. |
| **Verkoopbaarheid** | **YES_AFTER_EDIT** |

**Onderbouwing verkoopbaarheid.** Inhoudelijk draagt deze training na vier kleine redactionele edits de naam
Bureau Certum: het dilemma is echt, de professionele ruimte blijft open, de feedback is eerlijk en de transfer is
sterk. Twee voorwaarden: (1) Bron moet bestaan: met SN1/SN2-inhoud uit de gevalideerde bronnen, wat het huidige
productmodel door SN3 verhindert; (2) aanbieden als **reflectieve casustraining**, niet als Certum-praktijksimulatie:
in deze vorm handelt de deelnemer niet, hij schrijft. Als vlaggenschip "praktijksimulatie" zou het oordeel NO zijn
zolang Actie geen gesprek met tegenspel bevat.

## Productbevindingen

| Code | Soort | Bevinding |
| --- | --- | --- |
| `organisation_specific_source_need` | **PRODUCT_BLOCKER** | Een organisatiegebonden kennisbehoefte (SN3) is niet als zodanig uit te drukken en blokkeert het hele Bron-blok, ook de gedekte SN1/SN2. Training gereed is daardoor onbereikbaar voor een verder goedgekeurde training. |
| `action_phase_worksheet` | Product / didactiek (belangrijkst voor positionering) | Actie bestaat alleen uit open vragen; de deelnemer beschrijft handelen in plaats van het te doen. Het Block Plan liet de Chat simulatie liggen op basis van een onjuiste aanname (sleutelwoorden bij `open_choice`). Regeneratie van het Block Plan is niet stuurbaar. |
| `source_validation_visibility` | UX (ernstig) | Twee rondes validatie van inhoudsloze bronnen (eerst alleen URL's, daarna alleen titels) door een operator die wist wat er moest staan. De relevante inhoud staat bij het valideren ingeklapt; de controle dwingt niet af dat je ziet wat je valideert. |
| `url_only_relevant_content` | WATCH | Een URL of titel wordt technisch geaccepteerd als `relevantContent` (een leeg veld wordt terecht geweigerd). |
| `open_question_structured_output_failure` | Technisch | 2 van 5 eerste pogingen voor `certum.bco.open-vraag` gaven `invalid-output` in de fase `structured_output` (`end_turn`, < 1 000 outputtokens). Oorzaak onbekend (inhoud wordt bewust niet gelogd); ≈ 15 % van de tokens verloren. |
| `persona_fact_drift` | WATCH (bevestigd) | Context verzon voor- en achternamen en een sturend gedragsdetail; andere blokken niet. |
| `reflection_question_density` | WATCH (bevestigd) | Gestapelde deelvragen in Actie en Reflectie; Reflectie herhaalde de weging uit Actie. |
| `formulaic_repetition` | Kwaliteit | Dezelfde drieslag en "niet één juiste route" in bijna ieder blok. |
| `ai_feedback_text_context_gap` | Capability | AI Feedback ziet geen tekstblokken; de transferfeedback kent de nieuwe situatie niet en kan proportionaliteit maar beperkt beoordelen. |
| `training_title_not_synced` | Klein | Het trainingsrecord heet nog "Nieuwe training · Casus" in plaats van de Blueprint-titel. |
| `stale_unresolved_refs` | Klein | De openstaande eis van Bron noemt nog SN1–SN3 terwijl SN1 en SN2 gedekt zijn (de UI-telling "1 bron ontbreekt" klopt wel). |
| `bron_content_didactic_density`, `assessment_role_consistency` | WATCH (uit SG) | Niet te beoordelen (geen Bron-inhoud); assessmentRoles in TR-0014 zijn consistent (Context/Bron `none`, Actie–Feedback `formative`, Toets `transfer`). |

## Opvolging (Step 15A, 2026-10-05)

| Bevinding | Prioriteit | Status na 15A |
| --- | --- | --- |
| `action_phase_worksheet` | P0 | Human Block Plan Override gebouwd: de opleider kan een werkvorm (bijv. Open vraag → Chat simulatie) vóór goedkeuring corrigeren zonder regeneratie. Of dit de training een praktijksimulatie maakt, bewijst Pilot 2. |
| `organisation_specific_source_need` | P0 | Opgelost in het model: `scope` per sourceNeed; organisatiegebonden kennis blokkeert niet. Open: de Blueprint-provider classificeert de scope nog niet (TR-0014 en nieuwe Claude-Blueprints blijven `professional`). |
| `source_validation_visibility` | P0 | Opgelost: volledige inhoud prominent bij valideren, verklaring direct bij de passage. |
| `url_only_relevant_content` | WATCH | Opgelost voor de bewezen vormen (alleen titel, alleen URL). |
| `training_title_not_synced` | P1 | Opgelost voor nieuwe goedkeuringen; TR-0014 zelf houdt de oude recordtitel (de UI toonde al de Blueprint-titel). |
| `stale_unresolved_refs` | P1 | Opgelost: actuele refs volgen de brondekking. |
| `open_question_structured_output_failure` | P1 | Gediagnosticeerd, niet gewijzigd: [diagnosis-open-question.md](diagnosis-open-question.md). |

## Bewijs in deze map

| Bestand | Inhoud |
| --- | --- |
| [input.md](input.md) | Frozen input |
| [log.md](log.md) | Werklog met alle operatorbesluiten en de broninvoer |
| [sources-proposal.md](sources-proposal.md) | Bronvoorstel, definitieve keuze en letterlijke passages |
| [usage.jsonl](usage.jsonl) | Usage per call (alleen metadata) |
| `record/01-blueprint.json` … `record/09-final.json` | Exports van het Training Record per fase (revisions met herkomst en `based_on`, events, workspace, pakket); `09-final.json` bevat het eindpakket |
| `harness/` | Alleen-lezen export (`export.eval.ts`) en de usage-probe; geen productcode |
