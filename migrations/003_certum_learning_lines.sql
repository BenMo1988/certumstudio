-- Certum Learning Line V1: een leerlijn van exact zes modules boven de bestaande Training Engine.
--
-- Alleen nieuwe tabellen; migratie 001 en 002 en alle bestaande trainingen blijven ongewijzigd.
-- - learning_line_revision en learning_line_event zijn immutable/append-only (zelfde trigger als 001).
-- - learning_line_module koppelt een module (M1..M6) aan precies één bestaande training; ook append-only.
-- - Alleen synthetische data (data_policy), net als de trainingen.

create sequence learning_line_code_seq;

create table learning_line (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique
              default ('LL-' || lpad(nextval('learning_line_code_seq')::text, 4, '0'))
              check (code ~ '^LL-[0-9]{4,}$'),
  title       text not null check (length(title) between 1 and 200),
  data_policy text not null check (data_policy in ('synthetic_only')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table learning_line_input (
  id                  uuid primary key default gen_random_uuid(),
  learning_line_id    uuid not null references learning_line (id) on delete restrict,
  prompt_text         text not null check (length(prompt_text) between 1 and 4000),
  text_hash           text not null check (text_hash ~ '^[0-9a-f]{64}$'),
  privacy_preflight   jsonb not null check (jsonb_typeof(privacy_preflight) = 'object'),
  attestation         jsonb not null check (jsonb_typeof(attestation) = 'object'),
  data_policy_version text not null,
  created_at          timestamptz not null default now()
);

create index learning_line_input_line_idx on learning_line_input (learning_line_id, created_at);

create table learning_line_revision (
  id               uuid primary key default gen_random_uuid(),
  learning_line_id uuid not null references learning_line (id) on delete restrict,
  revision_no      integer not null check (revision_no >= 1),
  contract_version text not null check (length(contract_version) > 0),
  prompt_version   text,
  model_version    text,
  payload          jsonb not null,
  content_hash     text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  created_at       timestamptz not null default now(),
  constraint learning_line_revision_unique_revision unique (learning_line_id, revision_no),
  constraint learning_line_revision_id_line unique (id, learning_line_id)
);

create table learning_line_event (
  id               uuid primary key default gen_random_uuid(),
  event_no         bigint generated always as identity unique,
  learning_line_id uuid not null references learning_line (id) on delete restrict,
  revision_id      uuid not null,
  -- design_approved = Gate 1, package_approved = Gate 2, needs_revision = één gerichte revisie-instructie.
  event_type       text not null check (event_type in ('design_approved', 'needs_revision', 'package_approved')),
  event_data       jsonb not null default '{}'::jsonb check (jsonb_typeof(event_data) = 'object'),
  content_hash     text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  actor_id         uuid,
  created_at       timestamptz not null default now(),
  constraint learning_line_event_revision_fk foreign key (revision_id, learning_line_id)
    references learning_line_revision (id, learning_line_id) on delete restrict
);

create index learning_line_event_line_idx on learning_line_event (learning_line_id, event_no);

create table learning_line_module (
  learning_line_id uuid not null references learning_line (id) on delete restrict,
  module_id        text not null check (module_id ~ '^M[1-6]$'),
  training_id      uuid not null unique references training (id) on delete restrict,
  revision_id      uuid not null,
  created_at       timestamptz not null default now(),
  primary key (learning_line_id, module_id),
  constraint learning_line_module_revision_fk foreign key (revision_id, learning_line_id)
    references learning_line_revision (id, learning_line_id) on delete restrict
);

create trigger learning_line_revision_immutable
  before update or delete on learning_line_revision
  for each row execute function certum_forbid_change();

create trigger learning_line_event_append_only
  before update or delete on learning_line_event
  for each row execute function certum_forbid_change();

create trigger learning_line_module_append_only
  before update or delete on learning_line_module
  for each row execute function certum_forbid_change();
