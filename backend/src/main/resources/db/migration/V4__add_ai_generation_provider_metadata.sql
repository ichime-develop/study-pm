alter table ai_generation_jobs
    add column provider_request_id varchar(255),
    add column input_tokens integer,
    add column output_tokens integer;

alter table ai_generation_jobs
    add constraint ck_ai_jobs_input_tokens check (input_tokens is null or input_tokens >= 0),
    add constraint ck_ai_jobs_output_tokens check (output_tokens is null or output_tokens >= 0);

create unique index ux_ai_plan_drafts_generation_job on ai_plan_drafts (ai_generation_job_id);
