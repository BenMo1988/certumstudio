# Full Training Pilot 2: TR-0018 (Simulation Production Proof), eindrapport

Tweede volledige synthetische Certum-training, door de normale persisted Studio-flow met echte Claude-output.
Hoofdvraag: kan Certum Studio een praktijksimulatie produceren waarin de deelnemer werkelijk moet handelen onder druk,
in plaats van vooral op te schrijven wat hij zou doen? Datum: 2026-10-05. Codebasis `1d48fce` (na 15A en 15B), plus de
expliciet toegestane observability-commit `b1b6f24` tijdens de pilot.

> Synthetische data. Geen secrets of databasegegevens in deze map. Usage per call via de fetch-probe buiten de
> productcode (alleen model, tokens, stop_reason, status en duur).

## Eindoordeel

| Uitspraak | Oordeel |
| --- | --- |
| **Trainingkwaliteit** | **YES_AFTER_EDIT** |
| **Simulatieproductie** | **YES** |
| **Runtime-simulatie** | **NOT_YET_PROVEN** |
| Pilot 2 geslaagd (kwaliteit YES/YES_AFTER_EDIT én simulatie YES) | **Ja** |

Simulatieproductie en runtime-ervaring zijn bewust gescheiden. Certum Studio heeft zelfstandig een interactieve
professionele simulatie ontworpen en geproduceerd (geen werkblad): de Block Plan-agent koos zonder override een Chat
simulatie voor het kernmoment en voor de transfer, en de gegenereerde persona geeft geloofwaardige, responsieve tegendruk.
Of die persona zich in een echt gesprek zo gedraagt, is nog niet ervaren: dat kan pas met Participant Preview.

## Kerngegevens

| | |
| --- | --- |
| Training | **TR-0018** (`e4726c9f-03b1-4bf3-8350-d57efb3cd625`, Supabase dev) |
| Titel (Blueprint én trainingsrecord) | Terughoudendheid uitleggen onder druk in het MDO (recordtitel automatisch gesynchroniseerd, 15A) |
| Frozen input | [input.md](input.md) (casus) |
| Gekozen richting | `uitleg-en-samenwerking`, "Terughoudendheid uitleggen en samenwerking werkbaar houden" (keuze Mohamed) |
| Leerdoel | De deelnemer kan in reactie op druk van een samenwerkingspartner zijn positie over het delen van informatie helder en respectvol toelichten, daarbij het belang van de samenwerking en de vraag van school serieus nemen, en verantwoorden hoe zijn reactie bijdraagt aan een werkbare samenwerking. |
| routePolicy / ambiguity | `open_choice` / `multiple_defensible_actions`; performanceType `gesprek_voeren` |
| sourceNeeds | SN1, SN2, beide door de opleider als `professional` geclassificeerd (15B); geen organisatiegebonden behoefte |
| Blokken | 8 + Vaste Start en Vast Einde: Tekst · **Chat simulatie** · Open vraag · AI Feedback · Tekst (Bron) · **Chat simulatie** · Open vraag · AI Feedback |
| Duur | **66 minuten** (afgeleid; 27 min gesprek, 20 min schrijven, 9 min lezen, 10 min feedback) |
| Bronnen | 3, door Mohamed gevalideerd: A BPSW Beroepscode 2021 (SN1+SN2), B NJi informatie delen (SN1), C NJi samenwerken (SN2) |
| Final readiness | **`approved` · Training gereed** (stage `training_ready`); alle 10 onderdelen goedgekeurd |
| Open (niet blokkerend) | `ai_context` voor blok-4 en blok-8: AI Feedback ziet de chats niet (eerlijk benoemd) |

## Calls, tokens en betrouwbaarheid

| # | Stap | In | Uit | Duur | Uitkomst |
| --- | --- | --- | --- | --- | --- |
| 1 | Analysis | 7 920 | 3 583 | 36,2 s | `ready`, 3 richtingen `open_choice` |
| 2 | Blueprint | 9 111 | 3 322 | 32,3 s | ok |
| 3 | Block Plan | 10 255 | 5 028 | 45,4 s | ok, Chat in Actie en Toets |
| 4–11 | Content (Start/Einde + 7 blokken) | 112 428 | 12 703 | 144,9 s | blok-8 ✗ `structured_output` |
| 12 | blok-8, technische herstart | 13 991 | 1 751 | 21,0 s | ok |
| 13 | Bron | 17 207 | 4 300 | 43,5 s | ✗ `structured_output` |
| 14 | Bron, gecontroleerde technische retry | 17 207 | 2 454 | 26,0 s | ok |
| | **Totaal** | **188 119** | **33 141** | **349,2 s** | |

| | Aantal |
| --- | --- |
| Claude-calls | 14 |
| Mislukte calls | 2 (blok-8 AI Feedback, Bron), beide `invalid-output` in fase `structured_output` |
| Technische herstarts | 2 (normale operatorflow; "Ontbrekende blokken genereren" en "Bron-blok genereren") |
| Inhoudelijke regeneraties | **0** |
| Human Block Plan Override | 0 (niet nodig) |
| Handmatige edits | 6 revisions op 6 blokken (zie hieronder) |
| Calls voor scope review, bronnen, redactie, goedkeuring | 0 |
| Kosten | Geen betrouwbare lokale prijsdata; alleen usage. ≈ 17 % van de tokens ging naar mislukte output. |

## Oordelen vóór menselijke redactie

Vastgelegd omdat de edits publicatiekwaliteit zijn, geen reddingsactie:

| Laag | Oordeel op de ruwe AI-output |
| --- | --- |
| Block Plan | Zelfstandig Chat simulatie voor het kernmoment en de transfer; `open_choice` behouden; goedgekeurd zoals gegenereerd |
| Simulatie-inhoud | **SIMULATION_CONTENT = PASS_WITH_NOTES** |
| Bron | **BRON_GROUNDING = PASS_WITH_NOTES** (gegenereerd bij de gecontroleerde retry) |

## Handmatige edits (allemaal via de bestaande editor; nieuwe immutable revisions)

| Blok | Voor → na | Wijziging | Reden |
| --- | --- | --- | --- |
| blok-1 Context | v1 → v2 | "Daan" → "de jongere", "Ilse de Vries" → "de zorgcoördinator"; voornaamwoorden neutraal | Verzonnen namen, inconsistent met de chat |
| blok-2 Actie-chat | v1 → v2 | Persona "Ingrid Verhoeven" → "Zorgcoördinator"; geen naam of onnodige voornaamwoorden; na een heldere eerste uitleg normaal gesproken minstens één geloofwaardige vervolgvraag of tegenpositie (redelijk, niet vijandig, geen vaste formulering, responsief) | Continuïteit; `pressure_persistence_not_explicit` |
| blok-3 Reflectie | v1 → v2 | 534 → 276 tekens, drie gerichte vragen | Vraagdichtheid (89 % van de limiet) |
| blok-6 Transfer-chat | v1 → v2 | Noor 16 → 15; verder ongewijzigd | Geen leeftijdsgebonden juridische variabele |
| blok-7 Transferreflectie | v1 → v2 | 384 → 236 tekens | Vraagdichtheid |
| blok-5 Bron | v2 → v3 | "alleen" verwijderd ("Geen toestemming is vereist wanneer…"); bron C neutraal ("In de geselecteerde passages … komen onder meer … terug"); geen "haar" voor de zorgcoördinator; ingekort van 3 680 naar 2 624 tekens met 3 spiegelvragen (één per deel); geschatte duur 10 → 6 min | Bronprecisie, neutraliteit, didactische compactheid |

Iedere nieuwe revision is server-side gecontroleerd vóór goedkeuring: alleen de bedoelde velden gewijzigd, `goal`
blijft `null`, en de Bron-revisie steunt op exact dezelfde drie gevalideerde bronrevisions. De feedbackblokken en
Start/Einde zijn niet bewerkt.

## Review per onderdeel (current revisions)

| Onderdeel | Oordeel | Kern |
| --- | --- | --- |
| Vaste Start | OK | Legt uit dat de zorgcoördinator door AI wordt gespeeld en dat het verloop niet vastligt. Restpunt: "Zij reageert…" (WATCH `persona_fact_drift`). |
| Context (v2) | OK | Rol, reikwijdte van de instemming, geen acuut gevaar, protocol niet bij de hand, startmoment; geen verzonnen namen meer. |
| Actie-chat (v2) | OK | Opent met de beschuldiging ("…wat samenwerken voor zin heeft als professionals informatie voor elkaar achterhouden"), reageert op inhoud en toon, minstens één vervolgvraag of tegenpositie, beweegt pas geleidelijk mee; open keuze (ook delen is een route); geen sleutelwoorden; 15 minuten. |
| Reflectie (v2) | OK | Wat gedeeld en hoe reageerde de zorgcoördinator (eigen weergave voor de feedback), welke belangen het zwaarst, wat volgende keer hetzelfde of anders. |
| Feedback (v1) | OK | Ziet alleen de reflectie; zegt expliciet dat het gesprek niet beschikbaar is en dat uitvoering op eigen weergave berust. |
| Bron (v3) | OK | Grounded op A/B/C; bron B niet als schoolregel; geen absolute conclusie; geen meldcode of organisatiebeleid; compact (6 min). |
| Transfer-chat (v2) | OK | Andere partner (mentor), informeel op de gang, relationele druk ("dit blijft tussen ons", "op zijn minst een hint"), andere jongere (15). |
| Transferreflectie (v2) | OK | Wat hetzelfde of anders, hoe reageerde de mentor, welke afweging hergebruikt. |
| Transferfeedback (v1) | OK | Ziet reflectie en transferantwoord; vergelijkt de ontwikkeling; eerlijk over ontbrekende chatcontext. |
| Vast Einde | OK | Neutraal, sluit aan op de leerervaring. |

## Expliciete beoordeling

| Vraag | Antwoord |
| --- | --- |
| Vraagt Actie een werkelijke gespreksreactie onder druk? | Ja: "Zeg het maar. Zij reageert." De deelnemer begint midden in het MDO op het moment van de beschuldiging. |
| Is minstens één vervolgvraag of tegenpositie geconfigureerd? | Ja, expliciet na edit 2; daarvóór impliciet ("vraag door", "geleidelijk"). |
| Blijft open keuze behouden? | Ja: `goal: null`, geen sleutelwoorden, feedback beoordeelt de route niet, persona stuurt niet aan op één oplossing. |
| Verschilt de transfer-chat wezenlijk? | Ja: andere partner, relatie, setting, soort druk (relationeel in plaats van institutioneel) en een andere jongere. |
| Voegt Reflectie leren toe in plaats van transcriptie? | Na edit 3 grotendeels: één zin eigen weergave (nodig voor de feedback), daarna weging en volgende keer. |
| Is Feedback technisch eerlijk over beperkte context? | Ja, beide feedbackblokken benoemen dat het gesprek niet beschikbaar is. Wel: niemand geeft feedback op wat er werkelijk gezegd is (`ai_feedback_text_context_gap`). |
| Voegt Bron compacte grounded kennis toe na handelen? | Ja, als lens op het gesprek (drie delen, drie spiegelvragen), na edit compact. |
| Vraagt de Toets opnieuw toepassing? | Ja, in een tweede gesprek onder een andere vorm van druk, met verantwoording. |
| Eén Certum-leerervaring? | Ja: Context → gesprek → terugkijken → feedback → bronnen als lens → nieuw gesprek → verantwoording → feedback. |
| Commercieel proportionele duur? | Ja: 66 minuten, waarvan 27 in twee gesprekken. Proportioneel voor een geaccrediteerde module van ruim een uur. |

## Vergelijking met Pilot 1 (TR-0014)

| | TR-0014 | TR-0018 |
| --- | --- | --- |
| Actie | 2 open vragen (werkblad) | Chat simulatie met tegendruk |
| Toets | Tekst + open vraag | Tweede Chat simulatie + verantwoording |
| Block Plan Override nodig | (bestond nog niet) | Nee: de agent koos zelf de interactieve werkvorm |
| Bron | Niet te genereren (SN3) | Gegenereerd, grounded, goedgekeurd |
| Readiness | `incomplete` (PRODUCT_BLOCKER) | **Training gereed** |
| Oordeel | YES_AFTER_EDIT als casustraining; NO als praktijksimulatie | YES_AFTER_EDIT; simulatieproductie YES |

## Betrouwbaarheid

- **`structured_output_length_budget`, WATCH.** Bewijs uit drie bloktypes:
  - Open vraag: Pilot 1, 2× gefaald, vragen op 74–89 % van 600.
  - AI Feedback: Pilot 2 blok-8 1× gefaald; de geslaagde versie zit op 96 % van 3 000.
  - Bron (Tekst): Pilot 2 1× gefaald met 4 300 outputtokens; de geslaagde versie zit op **92 % van 4 000**.
  - Zod-maxima gaan alleen als beschrijving naar de API en worden pas ná ontvangst gecontroleerd.
- **De exacte Bron-oorzaak is niet bewezen.** De gecontroleerde retry slaagde, waardoor de nieuwe diagnose
  (`b1b6f24`) het falende veld niet heeft vastgelegd. Bij een volgende fout logt Certum nu inhoudsvrij welk veld en
  welke grens het waren.
- **`open_question_structured_output_failure`:** waargenomen (Pilot 1); in Pilot 2 slaagden de open vragen in één keer.
- **Geen fix tijdens Pilot 2.** Richting (besluit Bureau Certum): niet simpelweg de limiet verhogen, maar het model
  vooraf een didactisch lengtebudget geven, gecombineerd met voldoende maar begrensde technische marge.

## Openstaande WATCH-items

| Item | Status |
| --- | --- |
| `persona_fact_drift` | Waargenomen (verzonnen namen en geslacht); gecorrigeerd in Context, chat en Bron; rest: "Zij" in Vaste Start |
| `pressure_persistence_not_explicit` | Blueprint-notitie; publicatiekant opgelost met edit 2; runtime niet bewezen |
| `reflection_question_density` | Bevestigd (Reflectie, transferreflectie, Bron); met redactie opgelost |
| `bron_content_didactic_density` | Bevestigd (3 680 tekens, 6 spiegelvragen); met redactie opgelost |
| `formulaic_repetition` | Aanwezig ("meerdere reacties zijn professioneel verdedigbaar", "helder en respectvol") |
| `ai_feedback_text_context_gap` | Capability gap: feedback ziet de chats niet |
| `structured_output_length_budget` | WATCH (zie hierboven) |

## Aanbeveling voor de volgende productstap

**Participant Preview.** TR-0018 bewijst dat Certum Studio een interactieve praktijksimulatie kan ontwerpen en
produceren. De vluchtsimulator-belofte zelf (een zorgcoördinator die je onder druk zet en reageert op wat je zegt) is
pas te testen als een opleider de training als deelnemer kan doorlopen. Daarna, gebaseerd op runtime-bewijs: het
lengtebudget (prompt plus begrensde marge) en de feedback-contextgap.

## Bewijs in deze map

| Bestand | Inhoud |
| --- | --- |
| [input.md](input.md) | Frozen input |
| [log.md](log.md) | Werklog met alle besluiten, calls en edits |
| [sources-proposal.md](sources-proposal.md) | Bronvoorstel met letterlijke passages en tekenaantallen |
| [usage.jsonl](usage.jsonl) | Usage per call (alleen metadata) |
| `record/01-analysis.json` … `record/12-final.json` | Exports van het Training Record per stap; `12-final.json` bevat het goedgekeurde eindpakket |
