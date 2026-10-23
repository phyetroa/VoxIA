create table if not exists public.proposal_updates (
  id bigint generated always as identity primary key,
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  stage text not null check (stage in ('received','discussion','analysis','forwarded','awaiting_response','official_response','in_progress','completed')),
  description text not null check (char_length(btrim(description)) between 8 and 3000),
  evidence_url text check (evidence_url is null or (evidence_url like 'https://%' and char_length(evidence_url) <= 2048)),
  created_at timestamptz not null default now(),
  check (stage not in ('forwarded','official_response','completed') or evidence_url is not null)
);
create index if not exists proposal_updates_timeline on public.proposal_updates(proposal_id, created_at desc);
alter table public.proposal_updates enable row level security;
grant select on public.proposal_updates to anon, authenticated;
create policy "public reads published proposal updates" on public.proposal_updates for select
  using (exists (select 1 from public.proposals p where p.id = proposal_id and (p.status = 'approved' or p.author_id = auth.uid() or public.is_moderator())));

insert into public.proposal_updates(proposal_id, stage, description)
select p.id, 'received', 'Proposta publicada na Voxia.'
from public.proposals p where p.status = 'approved'
  and not exists (select 1 from public.proposal_updates u where u.proposal_id = p.id);

create or replace function public.add_initial_proposal_update()
returns trigger language plpgsql security definer set search_path = public
as $$ begin
  insert into public.proposal_updates(proposal_id, stage, description)
  values (new.id, 'received', 'Proposta publicada na Voxia.');
  return new;
end; $$;
drop trigger if exists proposal_first_update on public.proposals;
create trigger proposal_first_update after insert on public.proposals
for each row execute function public.add_initial_proposal_update();

create or replace function public.update_own_proposal(
  p_proposal uuid, p_title text, p_description text, p_category_id bigint,
  p_government_scope public.government_scope, p_locality text,
  p_problem text, p_solution text, p_expected_benefits text default null
)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if char_length(btrim(coalesce(p_title,''))) not between 8 and 140
    or char_length(btrim(coalesce(p_description,''))) not between 30 and 8000
    or char_length(btrim(coalesce(p_problem,''))) not between 10 and 3000
    or char_length(btrim(coalesce(p_solution,''))) not between 10 and 3000
    or char_length(btrim(coalesce(p_locality,''))) > 140
    or char_length(btrim(coalesce(p_expected_benefits,''))) > 3000 then
    raise exception 'invalid proposal fields' using errcode = '22023';
  end if;
  if not exists (select 1 from public.categories where id = p_category_id) then
    raise exception 'invalid proposal category' using errcode = '22023';
  end if;
  update public.proposals set title=btrim(p_title), description=btrim(p_description), category_id=p_category_id,
    government_scope=p_government_scope, locality=nullif(btrim(coalesce(p_locality,'')),''),
    problem=btrim(p_problem), solution=btrim(p_solution), expected_benefits=nullif(btrim(coalesce(p_expected_benefits,'')),'')
  where id=p_proposal and author_id=auth.uid() and status='approved';
  if not found then raise exception 'proposal not found or not editable' using errcode = '42501'; end if;
end; $$;
revoke all on function public.update_own_proposal(uuid,text,text,bigint,public.government_scope,text,text,text,text) from public;
grant execute on function public.update_own_proposal(uuid,text,text,bigint,public.government_scope,text,text,text,text) to authenticated;

create or replace function public.record_proposal_update(p_proposal uuid, p_stage text, p_description text, p_evidence_url text default null)
returns bigint language plpgsql security definer set search_path = public
as $$
declare new_update_id bigint;
begin
  if auth.uid() is null or not public.is_moderator() then raise exception 'not authorized' using errcode = '42501'; end if;
  if p_stage not in ('discussion','analysis','forwarded','awaiting_response','official_response','in_progress','completed') then
    raise exception 'invalid tracking stage' using errcode = '22023';
  end if;
  if char_length(btrim(coalesce(p_description,''))) not between 8 and 3000 then
    raise exception 'invalid update description' using errcode = '22023';
  end if;
  if p_stage in ('forwarded','official_response','completed') and coalesce(p_evidence_url,'') not like 'https://%' then
    raise exception 'https evidence is required for this stage' using errcode = '22023';
  end if;
  if p_evidence_url is not null and (p_evidence_url not like 'https://%' or char_length(p_evidence_url)>2048) then
    raise exception 'invalid evidence URL' using errcode = '22023';
  end if;
  if not exists (select 1 from public.proposals where id=p_proposal and status='approved') then
    raise exception 'published proposal not found' using errcode = '22023';
  end if;
  insert into public.proposal_updates(proposal_id,actor_id,stage,description,evidence_url)
  values(p_proposal,auth.uid(),p_stage,btrim(p_description),p_evidence_url) returning id into new_update_id;
  return new_update_id;
end; $$;
revoke all on function public.record_proposal_update(uuid,text,text,text) from public;
grant execute on function public.record_proposal_update(uuid,text,text,text) to authenticated;

create table if not exists public.notifications (
  id bigint generated always as identity primary key,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  proposal_id uuid references public.proposals(id) on delete cascade,
  kind text not null check (kind in ('support','comment','proposal_update')),
  message text not null check (char_length(message) between 1 and 240),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists notifications_recipient_unread on public.notifications(recipient_id, created_at desc) where read_at is null;
alter table public.notifications enable row level security;
grant select on public.notifications to authenticated;
create policy "users read own notifications" on public.notifications for select using (recipient_id=auth.uid());

create or replace function public.notify_proposal_activity()
returns trigger language plpgsql security definer set search_path = public
as $$
declare owner_id uuid; proposal_name text;
begin
  select author_id,title into owner_id,proposal_name from public.proposals where id=new.proposal_id and status='approved';
  if owner_id is null then return new; end if;
  if tg_table_name='proposal_supports' then
    if new.profile_id<>owner_id then insert into public.notifications(recipient_id,actor_id,proposal_id,kind,message)
      values(owner_id,new.profile_id,new.proposal_id,'support','Sua proposta recebeu um novo apoio.'); end if;
  elsif tg_table_name='proposal_comments' then
    if new.author_id<>owner_id and not new.is_hidden then insert into public.notifications(recipient_id,actor_id,proposal_id,kind,message)
      values(owner_id,new.author_id,new.proposal_id,'comment','Sua proposta recebeu um comentário.'); end if;
  elsif tg_table_name='proposal_updates' then
    if new.actor_id is not null and new.actor_id is distinct from owner_id then insert into public.notifications(recipient_id,actor_id,proposal_id,kind,message)
      values(owner_id,new.actor_id,new.proposal_id,'proposal_update','Acompanhe uma nova atualização da sua proposta.'); end if;
  end if;
  return new;
end; $$;
drop trigger if exists proposal_support_notification on public.proposal_supports;
create trigger proposal_support_notification after insert on public.proposal_supports for each row execute function public.notify_proposal_activity();
drop trigger if exists proposal_comment_notification on public.proposal_comments;
create trigger proposal_comment_notification after insert on public.proposal_comments for each row execute function public.notify_proposal_activity();
drop trigger if exists proposal_update_notification on public.proposal_updates;
create trigger proposal_update_notification after insert on public.proposal_updates for each row execute function public.notify_proposal_activity();

create or replace function public.mark_notification_read(p_notification bigint)
returns void language plpgsql security definer set search_path = public
as $$ begin
  update public.notifications set read_at=now() where id=p_notification and recipient_id=auth.uid();
  if not found then raise exception 'notification not found' using errcode='42501'; end if;
end; $$;
revoke all on function public.mark_notification_read(bigint) from public;
grant execute on function public.mark_notification_read(bigint) to authenticated;

create or replace function public.get_public_transparency()
returns table(published_proposals bigint,total_supports bigint,total_comments bigint,forwarded_with_evidence bigint,official_replies_with_evidence bigint,completed_with_evidence bigint)
language sql stable security definer set search_path = public
as $$
  select
    (select count(*) from public.proposals p where p.status='approved'),
    (select count(*) from public.proposal_supports s join public.proposals p on p.id=s.proposal_id where p.status='approved'),
    (select count(*) from public.proposal_comments c join public.proposals p on p.id=c.proposal_id where p.status='approved' and not c.is_hidden),
    (select count(distinct u.proposal_id) from public.proposal_updates u join public.proposals p on p.id=u.proposal_id where p.status='approved' and u.stage='forwarded' and u.evidence_url is not null),
    (select count(distinct u.proposal_id) from public.proposal_updates u join public.proposals p on p.id=u.proposal_id where p.status='approved' and u.stage='official_response' and u.evidence_url is not null),
    (select count(distinct u.proposal_id) from public.proposal_updates u join public.proposals p on p.id=u.proposal_id where p.status='approved' and u.stage='completed' and u.evidence_url is not null);
$$;
revoke all on function public.get_public_transparency() from public;
grant execute on function public.get_public_transparency() to anon, authenticated;

create or replace function public.get_current_civic_challenge()
returns table(title text,prompt text,starts_on date,ends_on date)
language plpgsql stable set search_path = public
as $$
declare week_start date := date_trunc('week', current_date)::date;
  prompts text[] := array[
    'Escolha um problema público da sua comunidade. Descreva quem é afetado, proponha uma solução viável e indique qual órgão poderia agir. Não inclua dados pessoais ou locais sensíveis.',
    'Como melhorar o acesso à saúde perto de você? Apresente uma barreira observável, uma medida possível e a esfera de governo responsável, sem expor informações de pacientes.',
    'O que tornaria o transporte da sua região mais seguro e acessível? Sugira uma mudança concreta e indique o trecho ou serviço sem divulgar endereços residenciais.',
    'Que ação ajudaria escolas públicas da sua região? Descreva o desafio, a proposta e como a comunidade poderia acompanhar o resultado.'
  ];
  challenge_index integer := (extract(week from current_date)::integer % 4) + 1;
begin
  return query select 'Desafio cívico: uma melhoria possível'::text, prompts[challenge_index], week_start, week_start+6;
end; $$;
revoke all on function public.get_current_civic_challenge() from public;
grant execute on function public.get_current_civic_challenge() to anon, authenticated;

create table if not exists public.community_reports (
  id bigint generated always as identity primary key,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  comment_id bigint references public.proposal_comments(id) on delete cascade,
  reason text not null check (char_length(btrim(reason)) between 8 and 1000),
  created_at timestamptz not null default now(),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  resolution text check (resolution is null or char_length(resolution)<=1000)
);
create index if not exists community_reports_open on public.community_reports(created_at desc) where reviewed_at is null;
create unique index if not exists community_reports_one_target_per_user on public.community_reports(reporter_id,proposal_id,(coalesce(comment_id,0)));
alter table public.community_reports enable row level security;
grant select on public.community_reports to authenticated;
create policy "moderators review community reports" on public.community_reports for select using (public.is_moderator());

create or replace function public.report_community_content(p_proposal uuid,p_comment bigint,p_reason text)
returns bigint language plpgsql security definer set search_path = public
as $$
declare new_report_id bigint;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode='42501'; end if;
  if char_length(btrim(coalesce(p_reason,''))) not between 8 and 1000 then raise exception 'invalid report reason' using errcode='22023'; end if;
  if not exists(select 1 from public.proposals where id=p_proposal and status='approved') then raise exception 'published proposal not found' using errcode='22023'; end if;
  if p_comment is not null and not exists(select 1 from public.proposal_comments where id=p_comment and proposal_id=p_proposal and not is_hidden) then raise exception 'comment not found' using errcode='22023'; end if;
  insert into public.community_reports(reporter_id,proposal_id,comment_id,reason) values(auth.uid(),p_proposal,p_comment,btrim(p_reason)) returning id into new_report_id;
  return new_report_id;
end; $$;
revoke all on function public.report_community_content(uuid,bigint,text) from public;
grant execute on function public.report_community_content(uuid,bigint,text) to authenticated;

create or replace function public.resolve_community_report(p_report bigint,p_resolution text,p_hide_comment boolean default false)
returns void language plpgsql security definer set search_path = public
as $$
declare reported_comment bigint;
begin
  if auth.uid() is null or not public.is_moderator() then raise exception 'not authorized' using errcode='42501'; end if;
  if char_length(btrim(coalesce(p_resolution,''))) not between 5 and 1000 then raise exception 'resolution is required' using errcode='22023'; end if;
  select comment_id into reported_comment from public.community_reports where id=p_report and reviewed_at is null for update;
  if not found then raise exception 'open report not found' using errcode='22023'; end if;
  if p_hide_comment and reported_comment is not null then update public.proposal_comments set is_hidden=true where id=reported_comment; end if;
  update public.community_reports set reviewed_by=auth.uid(),reviewed_at=now(),resolution=btrim(p_resolution) where id=p_report;
end; $$;
revoke all on function public.resolve_community_report(bigint,text,boolean) from public;
grant execute on function public.resolve_community_report(bigint,text,boolean) to authenticated;

create or replace function public.get_open_community_reports()
returns table(report_id bigint,proposal_id uuid,proposal_title text,comment_id bigint,comment_body text,reason text,created_at timestamptz)
language plpgsql stable security definer set search_path = public
as $$ begin
  if auth.uid() is null or not public.is_moderator() then raise exception 'not authorized' using errcode='42501'; end if;
  return query select r.id,r.proposal_id,p.title,r.comment_id,c.body,r.reason,r.created_at
    from public.community_reports r join public.proposals p on p.id=r.proposal_id
    left join public.proposal_comments c on c.id=r.comment_id
    where r.reviewed_at is null order by r.created_at asc limit 200;
end; $$;
revoke all on function public.get_open_community_reports() from public;
grant execute on function public.get_open_community_reports() to authenticated;
