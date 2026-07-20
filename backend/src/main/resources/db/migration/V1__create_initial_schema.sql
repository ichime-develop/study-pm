create table accounts (
    id uuid primary key,
    email varchar(254) not null,
    password_hash varchar(255) not null,
    display_name varchar(100) not null,
    ai_usage_consent_at timestamptz,
    created_at timestamptz not null,
    updated_at timestamptz not null
);

create unique index ux_accounts_email_lower on accounts (lower(email));

create table refresh_tokens (
    id uuid primary key,
    account_id uuid not null,
    token_hash varchar(255) not null,
    expires_at timestamptz not null,
    revoked_at timestamptz,
    created_at timestamptz not null,
    constraint fk_refresh_tokens_account
        foreign key (account_id) references accounts(id) on delete cascade,
    constraint ck_refresh_tokens_expires_after_created
        check (expires_at > created_at)
);

create unique index ux_refresh_tokens_token_hash on refresh_tokens (token_hash);
create index idx_refresh_tokens_account_state on refresh_tokens (account_id, revoked_at, expires_at);

create table projects (
    id uuid primary key,
    account_id uuid not null,
    name varchar(100) not null,
    description varchar(5000),
    start_date date not null,
    target_end_date date not null,
    status varchar(20) not null,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    constraint fk_projects_account
        foreign key (account_id) references accounts(id) on delete restrict,
    constraint ck_projects_status
        check (status in ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED')),
    constraint ck_projects_name_length
        check (char_length(name) between 1 and 100),
    constraint ck_projects_period
        check (start_date <= target_end_date)
);

create index idx_projects_account_updated on projects (account_id, updated_at desc);
create index idx_projects_account_status on projects (account_id, status);

create table project_period_history (
    id uuid primary key,
    project_id uuid not null,
    old_start_date date not null,
    new_start_date date not null,
    old_target_end_date date not null,
    new_target_end_date date not null,
    changed_by_account_id uuid not null,
    changed_at timestamptz not null,
    constraint fk_project_period_history_project
        foreign key (project_id) references projects(id) on delete restrict,
    constraint fk_project_period_history_changed_by
        foreign key (changed_by_account_id) references accounts(id) on delete restrict,
    constraint ck_project_period_history_old_period
        check (old_start_date <= old_target_end_date),
    constraint ck_project_period_history_new_period
        check (new_start_date <= new_target_end_date)
);

create index idx_project_period_history_project_changed on project_period_history (project_id, changed_at desc);

create table wbs_tasks (
    id uuid primary key,
    project_id uuid not null,
    parent_wbs_task_id uuid,
    task_type varchar(10) not null,
    name varchar(100) not null,
    description varchar(5000),
    planned_start_date date,
    planned_end_date date,
    planned_hours numeric(6, 2),
    progress_rate smallint,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    constraint fk_wbs_tasks_project
        foreign key (project_id) references projects(id) on delete restrict,
    constraint fk_wbs_tasks_parent
        foreign key (parent_wbs_task_id) references wbs_tasks(id) on delete restrict,
    constraint ck_wbs_tasks_type
        check (task_type in ('PARENT', 'LEAF')),
    constraint ck_wbs_tasks_name_length
        check (char_length(name) between 1 and 100),
    constraint ck_wbs_tasks_plan_dates
        check (planned_start_date is null or planned_end_date is null or planned_start_date <= planned_end_date),
    constraint ck_wbs_tasks_parent_columns
        check (
            task_type <> 'PARENT'
            or (
                parent_wbs_task_id is null
                and planned_start_date is null
                and planned_end_date is null
                and planned_hours is null
                and progress_rate is null
            )
        ),
    constraint ck_wbs_tasks_leaf_columns
        check (
            task_type <> 'LEAF'
            or (
                planned_hours is not null
                and planned_hours >= 0.25
                and planned_hours * 4 = floor(planned_hours * 4)
                and progress_rate is not null
                and progress_rate between 0 and 100
                and progress_rate % 10 = 0
            )
        )
);

create index idx_wbs_tasks_project_type on wbs_tasks (project_id, task_type);
create index idx_wbs_tasks_project_parent on wbs_tasks (project_id, parent_wbs_task_id);
create index idx_wbs_tasks_project_plan_dates on wbs_tasks (project_id, planned_start_date, planned_end_date);

create table wbs_task_plan_history (
    id uuid primary key,
    wbs_task_id uuid,
    project_id uuid not null,
    task_name_snapshot varchar(100) not null,
    old_parent_wbs_task_id uuid,
    new_parent_wbs_task_id uuid,
    old_planned_start_date date,
    new_planned_start_date date,
    old_planned_end_date date,
    new_planned_end_date date,
    old_planned_hours numeric(6, 2),
    new_planned_hours numeric(6, 2),
    changed_by_account_id uuid not null,
    changed_at timestamptz not null,
    constraint fk_wbs_task_plan_history_task
        foreign key (wbs_task_id) references wbs_tasks(id) on delete set null,
    constraint fk_wbs_task_plan_history_project
        foreign key (project_id) references projects(id) on delete restrict,
    constraint fk_wbs_task_plan_history_old_parent
        foreign key (old_parent_wbs_task_id) references wbs_tasks(id) on delete set null,
    constraint fk_wbs_task_plan_history_new_parent
        foreign key (new_parent_wbs_task_id) references wbs_tasks(id) on delete set null,
    constraint fk_wbs_task_plan_history_changed_by
        foreign key (changed_by_account_id) references accounts(id) on delete restrict,
    constraint ck_wbs_task_plan_history_old_dates
        check (old_planned_start_date is null or old_planned_end_date is null or old_planned_start_date <= old_planned_end_date),
    constraint ck_wbs_task_plan_history_new_dates
        check (new_planned_start_date is null or new_planned_end_date is null or new_planned_start_date <= new_planned_end_date),
    constraint ck_wbs_task_plan_history_old_hours
        check (old_planned_hours is null or (old_planned_hours >= 0.25 and old_planned_hours * 4 = floor(old_planned_hours * 4))),
    constraint ck_wbs_task_plan_history_new_hours
        check (new_planned_hours is null or (new_planned_hours >= 0.25 and new_planned_hours * 4 = floor(new_planned_hours * 4)))
);

create index idx_wbs_task_plan_history_task_changed on wbs_task_plan_history (wbs_task_id, changed_at desc);
create index idx_wbs_task_plan_history_project_changed on wbs_task_plan_history (project_id, changed_at desc);

create table wbs_task_progress_history (
    id uuid primary key,
    wbs_task_id uuid,
    project_id uuid not null,
    task_name_snapshot varchar(100) not null,
    progress_rate smallint not null,
    changed_by_account_id uuid not null,
    changed_at timestamptz not null,
    constraint fk_wbs_task_progress_history_task
        foreign key (wbs_task_id) references wbs_tasks(id) on delete set null,
    constraint fk_wbs_task_progress_history_project
        foreign key (project_id) references projects(id) on delete restrict,
    constraint fk_wbs_task_progress_history_changed_by
        foreign key (changed_by_account_id) references accounts(id) on delete restrict,
    constraint ck_wbs_task_progress_history_rate
        check (progress_rate between 0 and 100 and progress_rate % 10 = 0)
);

create index idx_wbs_task_progress_history_task_changed on wbs_task_progress_history (wbs_task_id, changed_at desc);
create index idx_wbs_task_progress_history_project_changed on wbs_task_progress_history (project_id, changed_at desc);

create table study_logs (
    id uuid primary key,
    account_id uuid not null,
    project_id uuid not null,
    wbs_task_id uuid not null,
    study_date date not null,
    study_hours numeric(6, 2) not null,
    memo varchar(5000),
    created_at timestamptz not null,
    updated_at timestamptz not null,
    constraint fk_study_logs_account
        foreign key (account_id) references accounts(id) on delete restrict,
    constraint fk_study_logs_project
        foreign key (project_id) references projects(id) on delete restrict,
    constraint fk_study_logs_task
        foreign key (wbs_task_id) references wbs_tasks(id) on delete restrict,
    constraint ck_study_logs_hours
        check (study_hours >= 0.25 and study_hours * 4 = floor(study_hours * 4))
);

create index idx_study_logs_account_date on study_logs (account_id, study_date desc);
create index idx_study_logs_project_date on study_logs (project_id, study_date desc);
create index idx_study_logs_task_date on study_logs (wbs_task_id, study_date desc);
