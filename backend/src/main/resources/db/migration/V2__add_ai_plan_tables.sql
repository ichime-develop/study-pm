alter table accounts drop column ai_usage_consent_at;

create table ai_plan_generation_requests (
    id uuid primary key,
    account_id uuid not null references accounts(id) on delete cascade,
    source_type varchar(20) not null,
    learning_goal varchar(5000) not null,
    start_date date not null,
    target_end_date date not null,
    constraints_json jsonb not null,
    retention_expires_at timestamptz not null,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    constraint ck_ai_requests_source_type check (source_type in ('OVERVIEW', 'TABLE_OF_CONTENTS', 'MIXED')),
    constraint ck_ai_requests_period check (start_date <= target_end_date)
);

create table ai_plan_sources (
    id uuid primary key,
    ai_plan_generation_request_id uuid not null references ai_plan_generation_requests(id) on delete cascade,
    temporary_key varchar(100) not null,
    source_type varchar(20) not null,
    source_order integer not null,
    label varchar(100),
    text_content text not null,
    content_hash varchar(64) not null,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    constraint ux_ai_sources_request_key unique (ai_plan_generation_request_id, temporary_key),
    constraint ck_ai_sources_type check (source_type in ('OVERVIEW', 'PASTED_TOC', 'OCR_TEXT')),
    constraint ck_ai_sources_order check (source_order >= 0),
    constraint ck_ai_sources_content check (char_length(text_content) >= 1)
);

create table ai_generation_jobs (
    id uuid primary key,
    ai_plan_generation_request_id uuid not null references ai_plan_generation_requests(id) on delete cascade,
    account_id uuid not null references accounts(id) on delete cascade,
    job_type varchar(30) not null,
    status varchar(30) not null,
    deadline_at timestamptz not null,
    attempt_count integer not null default 0,
    schema_regeneration_count integer not null default 0,
    error_code varchar(100),
    model_name varchar(100) not null,
    prompt_version varchar(50) not null,
    schema_version varchar(50) not null,
    strategy_version varchar(50) not null,
    started_at timestamptz,
    completed_at timestamptz,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    constraint ck_ai_jobs_type check (job_type = 'WBS_GENERATION'),
    constraint ck_ai_jobs_status check (status in ('QUEUED', 'PROCESSING', 'CANCEL_REQUESTED', 'COMPLETED', 'FAILED', 'CANCELED')),
    constraint ck_ai_jobs_attempt_count check (attempt_count >= 0),
    constraint ck_ai_jobs_schema_regeneration_count check (schema_regeneration_count between 0 and 1),
    constraint ck_ai_jobs_deadline check (deadline_at > created_at)
);

create table ai_plan_drafts (
    id uuid primary key,
    ai_plan_generation_request_id uuid not null references ai_plan_generation_requests(id) on delete cascade,
    ai_generation_job_id uuid not null references ai_generation_jobs(id) on delete cascade,
    account_id uuid not null references accounts(id) on delete cascade,
    revision integer not null,
    project_name varchar(100) not null,
    project_description varchar(5000),
    start_date date not null,
    target_end_date date not null,
    draft_wbs_tasks_json jsonb not null,
    validation_status varchar(20) not null,
    warnings_json jsonb not null,
    relaxation_options_json jsonb not null,
    converted_project_id uuid unique,
    converted_at timestamptz,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    constraint ck_ai_drafts_period check (start_date <= target_end_date),
    constraint ck_ai_drafts_validation_status check (validation_status in ('VALID', 'WARNING', 'INVALID'))
);

create index idx_ai_requests_account_updated on ai_plan_generation_requests (account_id, updated_at desc);
create index idx_ai_requests_retention on ai_plan_generation_requests (retention_expires_at);
create index idx_ai_sources_request_order on ai_plan_sources (ai_plan_generation_request_id, source_order);
create unique index ux_ai_generation_jobs_account_active on ai_generation_jobs (account_id)
    where status in ('QUEUED', 'PROCESSING', 'CANCEL_REQUESTED');
create index idx_ai_generation_jobs_account_created on ai_generation_jobs (account_id, created_at desc);
create index idx_ai_generation_jobs_deadline on ai_generation_jobs (status, deadline_at);
create index idx_ai_plan_drafts_account_updated on ai_plan_drafts (account_id, updated_at desc);
