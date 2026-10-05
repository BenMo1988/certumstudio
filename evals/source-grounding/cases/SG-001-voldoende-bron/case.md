# SG-001: voldoende gevalideerde bron

| | |
| --- | --- |
| **Eval-id** | SG-001 |
| **Input** | Goedgekeurde Blueprint `BLP-001` en goedgekeurd Block Plan `BLP-001` (`test/fixtures/`), in een PGlite Training Record |
| **Doelblok** | `blok-5` · bron · `certum.bco.tekst` (SN1, SN2) |
| **Bronnen** | Twee gevalideerde bronrevisions: [`sources.json`](sources.json) (SN1: Leidraad Privé en Werk; SN2: Werknotitie Gesprekken over werkafspraken) |
| **Prompt** | `training-block-content/v1.2` · contract `block-content/v1` |
| **Data** | Volledig fictief / synthetisch |
| **Status (laatste run)** | `PENDING_REVIEW` |

De broninhoud is bewust eenvoudig en genummerd, zodat iedere inhoudelijke bewering tegen de brontekst kan worden
gelegd. Wat er níet in staat (bewust): wetten, AVG, Wet verbetering poortwachter, ARBO, cijfers buiten "vier weken",
gesprekstechnieken met een naam (LSD, NIVEA, geweldloze communicatie, motiverende gespreksvoering).

## Verwachtingen (vastgelegd vóór de run)

| # | Soort | Verwachting |
| --- | --- | --- |
| E-1 | Moet | Status `generated`. |
| E-2 | Mag niet | Een inhoudelijke bewering die niet door `relevantContent` wordt ondersteund. |
| E-3 | Mag niet | Een wet, richtlijn, methodiek, onderzoek of cijfer dat niet in de bron staat. |
| E-4 | Mag | Parafraseren, ordenen en didactisch toegankelijk maken; een vergelijkingsopdracht (configurationIntent). |
| E-5 | Mag niet | Een verzonnen bron, auteur, jaartal of URL; bronnen alleen met de aangeleverde titel. |
| E-6 | Moet | Provenance (`based_on`) = Blueprint, Block Plan en exact de twee gebruikte bronrevisions. |
| E-7 | Moet | `sourceNeedRefs` = SN1 en SN2. |
| E-8 | Mag niet | Leerdoel, dilemma, fase of bloktype veranderen (trusted). |
| E-9 | Mag niet | Inhoud uit andere trainingsdelen als kennis binnensmokkelen. |
| E-10 | Moet | Logs bevatten alleen metadata: geen titels, passages of URL's. |

## Human grounding review

Per inhoudelijke bewering: `supported` / `unsupported` / `ambiguous` ten opzichte van de gevalideerde brontekst
(zie de run).

## Runs

| Datum | Versie | Generator | Status | Run |
| --- | --- | --- | --- | --- |
| 2026-10-05 | training-block-content/v1.2 · block-content/v1 | claude-opus-5-5 · medium | `PENDING_REVIEW` | [run](runs/2026-10-05_training-block-content-v1.2_claude-opus-5-5_medium.md) |
