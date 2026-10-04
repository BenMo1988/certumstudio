# Certum Training Record V1 (persistence)

Status: Step 11B, persistence foundation. Ontwerp goedgekeurd in Step 11A; deze notitie legt de verwachtingen vast
vóór de implementatie.

## Uitgangspunt

**Goedgekeurde output wordt een server-owned snapshot.** Na het opslaan is geen artifact-payload uit de client meer
nodig om de waarheid vast te stellen. Verandert een goedgekeurd onderdeel later inhoudelijk, dan blijft de oude
approval niet stil geldig.

Persistence geeft **geen** toestemming om echte of geanonimiseerde casuïstiek te verwerken. De governance-policy
`synthetic_only` blijft gelden; opslag van invoer vereist dezelfde preflight en attestatie als de analyse.

## Vier tabellen

| Tabel | Doel |
| --- | --- |
| `training` | Het trainingsrecord: interne UUID, unieke leesbare code (`TR-0001`, zonder klant- of casusnaam), titel, status, `data_policy` (`synthetic_only`), tijdstempels |
| `training_input` | De oorspronkelijke invoer, apart, zodat die later gericht verwijderd kan worden zonder het trainingsrecord te verwijderen. Alleen preflight-metadata (versie, status, aantallen per categorie), nooit posities of gevonden waarden |
| `artifact_revision` | Immutable snapshots: `analysis`, `blueprint`, `block_plan`, `start_content`, `end_content`, `block_content` |
| `workflow_event` | Append-only workflowbesluiten: `direction_selected`, `approved`, `needs_revision`, `revoked` |

Geen vijfde tabel voor afhankelijkheden (`based_on_revision_ids` is een UUID-array) en geen aparte head-tabel.
Het Training Content Package wordt **niet** opgeslagen: het wordt server-side samengesteld uit de current revisions.

## Regels

1. **Immutable.** Een revision wordt nooit inhoudelijk gewijzigd of verwijderd. Iedere inhoudelijke wijziging
   (regenerate, handmatige edit, AI-hergeneratie) is een nieuwe revision; de oude blijft bestaan.
2. **Uniek.** `(training_id, artifact_type, artifact_key, revision_no)` bestaat hooguit één keer. Nieuwe revisions
   krijgen hun nummer transactioneel.
3. **Artifact key.** `block_content`: het `plannedBlockId` (`blok-n`). Alle andere types: de vaste key `main`.
4. **Current** = de hoogste `revision_no` voor `(training_id, artifact_type, artifact_key)`.
5. **content_hash** = SHA-256 (hex) over canonieke JSON van de payload (sleutels recursief gesorteerd, geen
   witruimte). Berekend bij het aanmaken, daarna nooit gewijzigd. Onafhankelijk van sleutelvolgorde.
6. **based_on.** Iedere downstream revision legt vast waarop hij gebouwd is, en de server valideert dat:
   - `blueprint` ← `analysis` (met een gekozen richting; `selectedDirectionId` van de Blueprint = die richting);
   - `block_plan` ← goedgekeurde `blueprint`;
   - `start_content`, `end_content`, `block_content` ← goedgekeurde `blueprint` + goedgekeurd `block_plan`.
7. **workflow_event.** Append-only. `direction_selected` bevat `event_data.trainingDirectionId` (een bestaande
   richting van een `ready`-analyse) en dupliceert de analyse niet. `actor_id` is `null` tot er authenticatie is.
8. **Approved.** Een revision is alleen approved als:
   1. hij current is voor zijn artifact en key;
   2. het laatste relevante event voor exact die revision `approved` is;
   3. de `content_hash` van dat event gelijk is aan die van de revision (en aan de herberekende payload-hash);
   4. alle vereiste `based_on`-revisions nog current en approved zijn (voor `analysis`: current met een gekozen
      richting).
   Een nieuwe Blueprint maakt dus een eerder goedgekeurd Block Plan stale, en een nieuw Block Plan de
   blokinhoud. Geen cascading deletes, geen herschreven approvals: historie blijft historie.
9. **Alleen gegenereerde blokinhoud** kan worden goedgekeurd (`needs_source`, `needs_asset` en
   `blocked_by_capability` niet).

## Verwachtingen (tests)

- training maken (unieke code `TR-…`, `data_policy: synthetic_only`);
- input bewaren (alleen na geslaagde preflight en attestatie; geen posities of waarden);
- eerste revision;
- tweede revision laat de eerste intact;
- een dubbel revisienummer faalt (databaseconstraint);
- content hash reproduceerbaar, onafhankelijk van sleutelvolgorde;
- richtingkeuze bewaart het juiste `trainingDirectionId`;
- approval geldt voor exact één revision;
- een nieuwe revision erft de approval niet;
- een nieuwe Blueprint maakt het oude Block Plan stale;
- een nieuw Block Plan maakt oude goedkeuring van blokinhoud stale;
- `revoked` werkt;
- een revision kan niet worden gewijzigd via de repository-API (die bestaat niet) en ook niet via SQL (trigger);
- het Content Package kan uit opgeslagen revisions worden gereconstrueerd;
- gecontroleerde flow: training → synthetische input → analysis → richting → Blueprint → approve → herladen uit
  de database (na sluiten en heropenen) → exact dezelfde goedgekeurde Blueprint.

## Implementatie (Step 11B)

Kleine uitwerkingen ten opzichte van het ontwerp, zonder het model te veranderen:

- `workflow_event.event_no` (identity): de volgorde van besluiten is eenduidig, ook bij gelijke tijdstempels.
- `artifact_revision` heeft een unieke `(id, training_id)`; `workflow_event` verwijst daar samengesteld naar, zodat een
  event altijd bij dezelfde training hoort als zijn revision.
- Append-only wordt in de database afgedwongen met triggers op `artifact_revision` en `workflow_event` (UPDATE en
  DELETE geweigerd). Een volledige training verwijderen vraagt later dus een bewuste, aparte procedure.
- `data_policy_version` = `synthetic_only@attestation-<eerste 12 hex van SHA-256 van de attestatietekst>`: de
  bevestiging is gebonden aan exact de geldende tekst.
- De payload wordt bij het opslaan gevalideerd tegen het domeinschema van het type (analysis: `analysis-contract/v2.1`
  met invarianten tegen de opgeslagen invoer; blueprint: `blueprint-contract/v2` met routebeleid en gekozen richting;
  block_plan, start/end en block_content tegen hun contracten en invarianten).
- Een analyse wordt niet `approved`: hij is geaccepteerd zodra hij current is en een `direction_selected` heeft.

## Infrastructuur en operations

| | |
| --- | --- |
| Database | Managed PostgreSQL via **Supabase** |
| Regio | **Frankfurt, `eu-central-1`** |
| Toegang | Eén server-only `DATABASE_URL` (alleen in `.env.local`, nooit in de client-bundle of in logs). Voor latere serverless hosting: de Supabase transaction pooler (poort 6543, zonder prepared statements) |
| Client | `postgres` (postgres.js), plain SQL; geen ORM |
| Schema | Versieerbare SQL-migraties in `migrations/`, met een registratie- en checksumtabel (`schema_migrations`) |
| Tests | PGlite (PostgreSQL in WASM, in-process) met dezelfde migratie; opt-in test tegen Supabase |
| Deployment | Geen. Certum Studio blijft lokaal tot er authenticatie is |

**Backups**

- **Development (nu, Free):** geen automatische Supabase-backups. Alleen synthetische data. Maak periodiek een eigen
  export (`pg_dump` via de connection string) vóór riskante migraties.
- **Productie (later, betaald plan):** de dagelijkse automatische backups van het Pro-plan (zeven dagen bewaard), plus
  periodiek een eigen `pg_dump` buiten Supabase.
- **PITR** (point-in-time recovery) is een aparte betaalde add-on en **niet** aangenomen; pas overwegen als omzet en
  data dat rechtvaardigen.
