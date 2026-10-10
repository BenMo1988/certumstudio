-- Gate Compression V1 voor leerlijnen. Raakt alleen de leerlijntabellen uit migratie 003; het Training Record
-- (training, training_input, artifact_revision, workflow_event) blijft ongewijzigd.
--
-- 1. Een modulekoppeling hoort bij één ontwerprevision: na een revisie van het hele ontwerp krijgt de nieuwe versie
--    eigen trainingen (de vorige koppelingen blijven als historie bestaan).
-- 2. learning_line_module_plan: het voorlopige Block Plan per module, gemaakt vóór Gate 1 op een nog niet goedgekeurde
--    Blueprint. Het staat bewust níet in het Training Record (dat eist een goedgekeurde upstream). Bij Gate 1 wordt
--    exact deze inhoud (zelfde hash) als gewone Block Plan-revision vastgelegd en goedgekeurd. Append-only.

alter table learning_line_module drop constraint learning_line_module_pkey;
alter table learning_line_module add primary key (learning_line_id, revision_id, module_id);

create table learning_line_module_plan (
  id                    uuid primary key default gen_random_uuid(),
  learning_line_id      uuid not null references learning_line (id) on delete restrict,
  module_id             text not null check (module_id ~ '^M[1-6]$'),
  training_id           uuid not null references training (id) on delete restrict,
  blueprint_revision_id uuid not null references artifact_revision (id) on delete restrict,
  prompt_version        text,
  model_version         text,
  payload               jsonb not null,
  content_hash          text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  created_at            timestamptz not null default now(),
  constraint learning_line_module_plan_unique unique (training_id, blueprint_revision_id)
);

create index learning_line_module_plan_line_idx on learning_line_module_plan (learning_line_id, created_at);

create trigger learning_line_module_plan_append_only
  before update or delete on learning_line_module_plan
  for each row execute function certum_forbid_change();
