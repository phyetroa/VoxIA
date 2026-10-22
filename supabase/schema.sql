-- Voxia: schema inicial para Supabase/PostgreSQL.
-- Execute uma unica vez no SQL Editor de um projeto novo.

create type public.user_role as enum ('user', 'moderator', 'admin');
create type public.moderation_status as enum ('pending', 'approved', 'rejected', 'changes_requested');
create type public.government_scope as enum ('municipal', 'state', 'federal');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 60),
  role public.user_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id bigint generated always as identity primary key,
  name text not null unique,
  slug text not null unique
);

create table public.proposals (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  category_id bigint references public.categories(id),
  title text not null check (char_length(title) between 8 and 140),
  description text not null check (char_length(description) between 30 and 8000),
  problem text not null check (char_length(problem) between 10 and 3000),
  solution text not null check (char_length(solution) between 10 and 3000),
  expected_benefits text,
  locality text check (char_length(locality) <= 140),
  government_scope public.government_scope not null,
  status public.moderation_status not null default 'pending',
  moderation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index proposals_public_feed on public.proposals(status, created_at desc);
create index proposals_author on public.proposals(author_id, created_at desc);

create table public.proposal_supports (
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(proposal_id, profile_id)
);

create table public.proposal_comments (
  id bigint generated always as identity primary key,
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 2 and 1000),
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index proposal_comments_visible on public.proposal_comments(proposal_id, created_at) where is_hidden = false;

create table public.legal_references (
  id bigint generated always as identity primary key,
  norm_name text not null,
  device text,
  summary text not null,
  official_url text not null,
  keywords text[] not null default '{}',
  verified_at date,
  is_verified boolean not null default false,
  unique (norm_name, device, official_url)
);

create table public.knowledge_sources (
  id bigint generated always as identity primary key,
  name text not null,
  url text not null unique,
  source_type text not null check (source_type in ('official', 'informational')),
  verified_at date,
  is_active boolean not null default true
);

create table public.proposal_legal_references (
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  legal_reference_id bigint not null references public.legal_references(id) on delete cascade,
  suggested_by text not null default 'keyword_match',
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  primary key(proposal_id, legal_reference_id)
);

create table public.moderation_history (
  id bigint generated always as identity primary key,
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  moderator_id uuid not null references public.profiles(id),
  previous_status public.moderation_status,
  next_status public.moderation_status not null,
  reason text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.proposals enable row level security;
alter table public.proposal_supports enable row level security;
alter table public.proposal_comments enable row level security;
alter table public.legal_references enable row level security;
alter table public.knowledge_sources enable row level security;
alter table public.proposal_legal_references enable row level security;
alter table public.moderation_history enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.categories, public.legal_references, public.knowledge_sources, public.proposal_legal_references to anon, authenticated;
grant select on public.proposals to anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant update on public.proposals to authenticated;
grant select, insert, delete on public.proposal_supports to authenticated;
grant insert, delete on public.proposal_comments to authenticated;
grant usage, select on sequence public.proposal_comments_id_seq to authenticated;
grant select on public.moderation_history to authenticated;

create function public.is_moderator()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.profiles where id = auth.uid() and role in ('moderator', 'admin')) $$;

create function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), split_part(new.email, '@', 1), 'Cidadão'));
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create function public.touch_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
create trigger profiles_updated before update on public.profiles for each row execute procedure public.touch_updated_at();
create trigger proposals_updated before update on public.proposals for each row execute procedure public.touch_updated_at();

create policy "profiles read own" on public.profiles for select using (auth.uid() = id);
create policy "profiles update own name" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id and role = (select role from public.profiles where id = auth.uid()));
create policy "public reads categories" on public.categories for select using (true);
create policy "public reads approved proposals" on public.proposals for select using (status = 'approved' or auth.uid() = author_id or public.is_moderator());
create policy "users create own pending proposal" on public.proposals for insert with check (auth.uid() = author_id and status = 'pending');
create policy "authors update editable proposal" on public.proposals for update using (auth.uid() = author_id and status in ('pending', 'changes_requested')) with check (auth.uid() = author_id and status = 'pending');
create policy "public reads verified legal references" on public.legal_references for select using (is_verified);
create policy "public reads active sources" on public.knowledge_sources for select using (is_active);
create policy "public reads approved proposal references" on public.proposal_legal_references for select using (exists (select 1 from public.proposals where id = proposal_id and status = 'approved'));
create policy "users read own supports" on public.proposal_supports for select using (auth.uid() = profile_id);
create policy "users support approved proposals" on public.proposal_supports for insert with check (auth.uid() = profile_id and exists (select 1 from public.proposals where id = proposal_id and status = 'approved'));
create policy "users remove own support" on public.proposal_supports for delete using (auth.uid() = profile_id);
create policy "users comment on approved proposals" on public.proposal_comments for insert to authenticated with check (auth.uid() = author_id and exists (select 1 from public.proposals where id = proposal_id and status = 'approved'));
create policy "authors delete own comments" on public.proposal_comments for delete to authenticated using (auth.uid() = author_id);
create policy "moderators read history" on public.moderation_history for select using (public.is_moderator());

create function public.moderate_proposal(proposal uuid, next_state public.moderation_status, reason text default null)
returns void language plpgsql security definer set search_path = public
as $$
declare prior_state public.moderation_status;
begin
  if not public.is_moderator() then raise exception 'not authorized'; end if;
  if next_state = 'pending' then raise exception 'invalid moderation state'; end if;
  select status into prior_state from public.proposals where id = proposal for update;
  if prior_state is null then raise exception 'proposal not found'; end if;
  update public.proposals set status = next_state, moderation_reason = reason where id = proposal;
  insert into public.moderation_history(proposal_id, moderator_id, previous_status, next_status, reason)
  values (proposal, auth.uid(), prior_state, next_state, reason);
end;
$$;

revoke all on function public.moderate_proposal(uuid, public.moderation_status, text) from public;
grant execute on function public.moderate_proposal(uuid, public.moderation_status, text) to authenticated;

create function public.submit_proposal(
  p_title text, p_description text, p_category_id bigint,
  p_government_scope public.government_scope, p_locality text,
  p_problem text, p_solution text, p_expected_benefits text default null
)
returns uuid language plpgsql security definer set search_path = public
as $$
declare new_proposal_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if char_length(btrim(coalesce(p_title, ''))) not between 8 and 140
    or char_length(btrim(coalesce(p_description, ''))) not between 30 and 8000
    or char_length(btrim(coalesce(p_problem, ''))) not between 10 and 3000
    or char_length(btrim(coalesce(p_solution, ''))) not between 10 and 3000
    or char_length(btrim(coalesce(p_locality, ''))) > 140
    or char_length(btrim(coalesce(p_expected_benefits, ''))) > 3000 then
    raise exception 'invalid proposal fields' using errcode = '22023';
  end if;
  if not exists (select 1 from public.categories where id = p_category_id) then
    raise exception 'invalid proposal category' using errcode = '22023';
  end if;
  insert into public.proposals (author_id, category_id, title, description, problem, solution, expected_benefits, locality, government_scope, status)
  values (auth.uid(), p_category_id, btrim(p_title), btrim(p_description), btrim(p_problem), btrim(p_solution), nullif(btrim(coalesce(p_expected_benefits, '')), ''), nullif(btrim(coalesce(p_locality, '')), ''), p_government_scope, 'approved')
  returning id into new_proposal_id;
  return new_proposal_id;
end;
$$;
revoke all on function public.submit_proposal(text, text, bigint, public.government_scope, text, text, text, text) from public;
grant execute on function public.submit_proposal(text, text, bigint, public.government_scope, text, text, text, text) to authenticated;

create function public.get_proposal_stats()
returns table(proposal_id uuid, support_count bigint, comment_count bigint)
language sql stable security definer set search_path = public
as $$
  select p.id,
    (select count(*) from public.proposal_supports s where s.proposal_id = p.id),
    (select count(*) from public.proposal_comments c where c.proposal_id = p.id and c.is_hidden = false)
  from public.proposals p where p.status = 'approved';
$$;

create function public.get_proposal_comments(proposal uuid)
returns table(id bigint, body text, created_at timestamptz, display_name text)
language sql stable security definer set search_path = public
as $$
  select c.id, c.body, c.created_at, p.display_name
  from public.proposal_comments c
  join public.profiles p on p.id = c.author_id
  join public.proposals proposal_row on proposal_row.id = c.proposal_id
  where c.proposal_id = $1 and c.is_hidden = false and proposal_row.status = 'approved'
  order by c.created_at asc limit 200;
$$;
revoke all on function public.get_proposal_stats() from public;
revoke all on function public.get_proposal_comments(uuid) from public;
grant execute on function public.get_proposal_stats() to anon, authenticated;
grant execute on function public.get_proposal_comments(uuid) to anon, authenticated;

insert into public.categories(name, slug) values
  ('Educação','educacao'), ('Saúde','saude'), ('Segurança pública','seguranca-publica'),
  ('Economia e emprego','economia-emprego'), ('Meio ambiente','meio-ambiente'),
  ('Transporte e mobilidade','transporte'), ('Direitos humanos','direitos-humanos'),
  ('Combate à discriminação','combate-discriminacao'), ('Tecnologia e inovação','tecnologia-inovacao'),
  ('Transparência pública','transparencia-publica'), ('Infraestrutura','infraestrutura'),
  ('Assistência social','assistencia-social'), ('Cultura e lazer','cultura-lazer'), ('Outras questões','outras')
on conflict do nothing;

insert into public.legal_references(norm_name, device, summary, official_url, keywords, verified_at, is_verified) values
  ('Constituição da República Federativa do Brasil', 'Art. 5º, caput', 'Igualdade perante a lei.', 'https://www.planalto.gov.br/ccivil_03/constituicao/constituicaocompilado.htm', array['igualdade','discriminação','direitos humanos','racismo'], current_date, true),
  ('Constituição da República Federativa do Brasil', 'Art. 5º, XLII', 'A prática do racismo constitui crime inafiançável e imprescritível, nos termos da lei.', 'https://www.planalto.gov.br/ccivil_03/constituicao/constituicaocompilado.htm', array['racismo','discriminação','preconceito'], current_date, true),
  ('Lei nº 7.716/1989', null, 'Define crimes resultantes de preconceito de raça ou de cor.', 'https://www.planalto.gov.br/ccivil_03/leis/l7716compilado.htm', array['racismo','discriminação','preconceito'], current_date, true)
on conflict (norm_name, device, official_url) do nothing;

insert into public.knowledge_sources(name, url, source_type, verified_at) values
  ('Constituição Federal — Planalto', 'https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm', 'official', null),
  ('Constituição: o que é e como funciona no Brasil — INW', 'https://inw.org.br/constituicao-o-que-e-e-como-funciona-no-brasil/', 'informational', null),
  ('Portal da Legislação — Planalto', 'https://www4.planalto.gov.br/legislacao/copy_of_home', 'official', null),
  ('Leis e decretos-leis — CONARQ', 'https://www.gov.br/conarq/pt-br/legislacao-arquivistica/leis-e-decretos-leis', 'official', null),
  ('Propostas de governo — TSE', 'https://www.tse.jus.br/eleicoes/eleicoes-2026-content/propostas-de-governo-dos-candidatos-ao-cargo-de-presidente-da-republica-eleicoes-2026/flavio-bolsonaro', 'official', null)
on conflict (url) do nothing;
