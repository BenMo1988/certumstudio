-- Certum Training Record V1 (docs/persistence/training-record-v1.md)
--
-- Vier tabellen: training, training_input, artifact_revision, workflow_event.
-- - artifact_revision en workflow_event zijn append-only (triggers hieronder): geen UPDATE of DELETE.
-- - Geen cascading deletes. training_input kan apart worden verwijderd (er verwijst niets naar).
-- - Alleen synthetische data: persistence geeft geen toestemming voor echte casuïstiek (data_policy).

create sequence training_code_seq;

create table training (
  id          uuid primary key default gen_random_uuid(),
  -- Leesbaar en uniek, zonder klant- of casusnaam.
  code        text not null unique
              default ('TR-' || lpad(nextval('training_code_seq')::text, 4, '0'))
              check (code ~ '^TR-[0-9]{4,}$'),
  title       text not null check (length(title) between 1 and 200),
  status      text not null default 'concept' check (status in ('concept', 'review', 'gereed')),
  data_policy text not null check (data_policy in ('synthetic_only')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table training_input (
  id                  uuid primary key default gen_random_uuid(),
  training_id         uuid not null references training (id) on delete restrict,
  input_type          text not null check (input_type in ('onderwerp', 'praktijkvraag', 'casus')),
  input_text          text not null check (length(input_text) between 1 and 10000),
  -- SHA-256 (hex) van de getrimde tekst, zoals de Privacy Preflight hem gebruikt.
  text_hash           text not null check (text_hash ~ '^[0-9a-f]{64}$'),
  -- Alleen metadata: versie, status en aantallen per categorie. Nooit posities of gevonden waarden.
  privacy_preflight   jsonb not null check (jsonb_typeof(privacy_preflight) = 'object'),
  -- Bevestigde finding-ids (bevatten geen waarden).
  acknowledgements    jsonb not null default '[]'::jsonb check (jsonb_typeof(acknowledgements) = 'array'),
  attestation         jsonb not null check (jsonb_typeof(attestation) = 'object'),
  data_policy_version text not null,
  created_at          timestamptz not null default now()
);

create index training_input_training_idx on training_input (training_id);

create table artifact_revision (
  id                    uuid primary key default gen_random_uuid(),
  training_id           uuid not null references training (id) on delete restrict,
  artifact_type         text not null check (artifact_type in
                          ('analysis', 'blueprint', 'block_plan', 'start_content', 'end_content', 'block_content')),
  -- block_content: het plannedBlockId; alle andere types: de vaste key 'main'.
  artifact_key          text not null,
  revision_no           integer not null check (revision_no >= 1),
  contract_version      text not null check (length(contract_version) > 0),
  prompt_version        text,
  model_version         text,
  payload               jsonb not null,
  -- SHA-256 (hex) over canonieke JSON van de payload; berekend bij het aanmaken.
  content_hash          text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  based_on_revision_ids uuid[] not null default '{}',
  created_at            timestamptz not null default now(),
  constraint artifact_revision_key_check check (
    (artifact_type = 'block_content' and artifact_key ~ '^blok-[1-9][0-9]*$')
    or (artifact_type <> 'block_content' and artifact_key = 'main')
  ),
  constraint artifact_revision_unique_revision unique (training_id, artifact_type, artifact_key, revision_no),
  -- Doel voor de samengestelde foreign key vanuit workflow_event (zelfde training afgedwongen).
  constraint artifact_revision_id_training unique (id, training_id)
);

create table workflow_event (
  id                   uuid primary key default gen_random_uuid(),
  -- Volgorde van events; created_at kan binnen dezelfde tijdstempel gelijk zijn.
  event_no             bigint generated always as identity unique,
  training_id          uuid not null references training (id) on delete restrict,
  artifact_revision_id uuid not null,
  event_type           text not null check (event_type in ('direction_selected', 'approved', 'needs_revision', 'revoked')),
  event_data           jsonb not null default '{}'::jsonb check (jsonb_typeof(event_data) = 'object'),
  content_hash         text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  -- Leeg tot er authenticatie is.
  actor_id             uuid,
  created_at           timestamptz not null default now(),
  constraint workflow_event_revision_fk foreign key (artifact_revision_id, training_id)
    references artifact_revision (id, training_id) on delete restrict,
  -- coalesce: een CHECK die NULL oplevert geldt in Postgres als geslaagd; een ontbrekende id moet falen.
  constraint workflow_event_direction_check check (
    event_type <> 'direction_selected'
    or coalesce(jsonb_typeof(event_data -> 'trainingDirectionId') = 'string'
                and length(event_data ->> 'trainingDirectionId') > 0, false)
  )
);

create index workflow_event_revision_idx on workflow_event (artifact_revision_id, event_no);
create index workflow_event_training_idx on workflow_event (training_id, event_no);

-- Append-only: revisions en events worden nooit gewijzigd of verwijderd.
create function certum_forbid_change() returns trigger
language plpgsql as $$
begin
  raise exception 'certum: % is append-only (% niet toegestaan)', tg_table_name, tg_op;
end;
$$;

create trigger artifact_revision_immutable
  before update or delete on artifact_revision
  for each row execute function certum_forbid_change();

create trigger workflow_event_append_only
  before update or delete on workflow_event
  for each row execute function certum_forbid_change();
