create table public.proposal_comments (
  id bigint generated always as identity primary key,
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 2 and 1000),
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);

create index proposal_comments_visible on public.proposal_comments(proposal_id, created_at)
  where is_hidden = false;

alter table public.proposal_comments enable row level security;
grant insert, delete on public.proposal_comments to authenticated;
grant usage, select on sequence public.proposal_comments_id_seq to authenticated;

create policy "users comment on approved proposals"
  on public.proposal_comments for insert to authenticated
  with check (
    auth.uid() = author_id
    and exists (select 1 from public.proposals where id = proposal_id and status = 'approved')
  );

create policy "authors delete own comments"
  on public.proposal_comments for delete to authenticated
  using (auth.uid() = author_id);

create or replace function public.get_proposal_stats()
returns table(proposal_id uuid, support_count bigint, comment_count bigint)
language sql stable security definer set search_path = public
as $$
  select p.id,
    (select count(*) from public.proposal_supports s where s.proposal_id = p.id),
    (select count(*) from public.proposal_comments c where c.proposal_id = p.id and c.is_hidden = false)
  from public.proposals p
  where p.status = 'approved';
$$;

create or replace function public.get_proposal_comments(proposal uuid)
returns table(id bigint, body text, created_at timestamptz, display_name text)
language sql stable security definer set search_path = public
as $$
  select c.id, c.body, c.created_at, p.display_name
  from public.proposal_comments c
  join public.profiles p on p.id = c.author_id
  join public.proposals proposal_row on proposal_row.id = c.proposal_id
  where c.proposal_id = $1
    and c.is_hidden = false
    and proposal_row.status = 'approved'
  order by c.created_at asc
  limit 200;
$$;

revoke all on function public.get_proposal_stats() from public;
revoke all on function public.get_proposal_comments(uuid) from public;
grant execute on function public.get_proposal_stats() to anon, authenticated;
grant execute on function public.get_proposal_comments(uuid) to anon, authenticated;
