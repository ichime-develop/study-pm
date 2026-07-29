alter table ai_generation_jobs
    add column deadline_priority boolean not null default false;

alter table ai_plan_drafts
    add constraint fk_ai_plan_drafts_converted_project
        foreign key (converted_project_id) references projects(id) on delete set null;
