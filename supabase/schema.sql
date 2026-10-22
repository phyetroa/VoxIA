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

create table public.categories (id bigint generated always as identity primary key, name text not null unique, slug text not null unique);
create table public.proposals (
  id uuid primary key default gen_random_uuid(), author_id uuid not null references public.profiles(id), category_id bigint references public.categories(id), title text not null check (char_length(title) between 8 and 140), description text not null check (char_length(description) between 30 and 8000), problem text not null, solution text not null, expected_benefits text, locality text, government_scope public.government_scope not null, status public.moderation_status not null default 'pending', moderation_reason text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index proposals_public_feed on public.proposals(status, created_at desc);
create index proposals_author on public.proposals(author_id, created_at desc);
create table public.proposal_supports (proposal_id uuid references public.proposals(id) on delete cascade, profile_id uuid references public.profiles(id) on delete cascade, created_at timestamptz not null default now(), primary key(proposal_id, profile_id));
create table public.legal_references (id bigint generated always as identity primary key, norm_name text not null, device text, summary text not null, official_url text not null unique, keywords text[] not null default '{}', verified_at date, is_verified boolean not null default false);
create table public.proposal_legal_references (proposal_id uuid references public.proposals(id) on delete cascade, legal_reference_id bigint references public.legal_references(id), suggested_by text not null default 'keyword_match', reviewed_by uuid references public.profiles(id), reviewed_at timestamptz, primary key(proposal_id, legal_reference_id));
create table public.moderation_history (id bigint generated always as identity primary key, proposal_id uuid not null references public.proposals(id) on delete cascade, moderator_id uuid not null references public.profiles(id), previous_status public.moderation_status, next_status public.moderation_status not null, reason text, created_at timestamptz not null default now());

alter table public.profiles enable row level security; alter table public.proposals enable row level security; alter table public.proposal_supports enable row level security; alter table public.legal_references enable row level security; alter table public.proposal_legal_references enable row level security; alter table public.moderation_history enable row level security;
create policy "profiles read own" on public.profiles for select using (auth.uid() = id);
create policy "users create own proposal" on public.proposals for insert with check (auth.uid() = author_id and status = 'pending');
create policy "authors read own and public reads approved" on public.proposals for select using (status = 'approved' or auth.uid() = author_id);
create policy "public reads verified legal references" on public.legal_references for select using (is_verified);
create policy "users manage own supports" on public.proposal_supports for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

insert into public.categories(name, slug) values ('Educação','educacao'),('Saúde','saude'),('Segurança pública','seguranca-publica'),('Meio ambiente','meio-ambiente'),('Transporte e mobilidade','transporte'),('Transparência pública','transparencia-publica') on conflict do nothing;
insert into public.legal_references(norm_name, device, summary, official_url, keywords, verified_at, is_verified) values
('Constituição da República Federativa do Brasil', 'Art. 5º, caput', 'Igualdade perante a lei.', 'https://www.planalto.gov.br/ccivil_03/constituicao/constituicaocompilado.htm', array['igualdade','discriminação','direitos humanos','racismo'], current_date, true),
('Lei nº 7.716/1989', null, 'Define crimes resultantes de preconceito de raça ou de cor.', 'https://www.planalto.gov.br/ccivil_03/leis/l7716compilado.htm', array['racismo','discriminação','preconceito'], current_date, true)
on conflict (official_url) do nothing;
