drop function public.get_proposal_stats();

create function public.get_proposal_stats()
returns table(proposal_id uuid, support_count bigint, comment_count bigint, is_author boolean)
language sql stable security definer set search_path = public
as $$
  select p.id,
    (select count(*) from public.proposal_supports s where s.proposal_id = p.id),
    (select count(*) from public.proposal_comments c where c.proposal_id = p.id and c.is_hidden = false),
    (p.author_id = auth.uid())
  from public.proposals p
  where p.status = 'approved';
$$;

revoke all on function public.get_proposal_stats() from public;
grant execute on function public.get_proposal_stats() to anon, authenticated;

create function public.can_delete_own_proposal(p_proposal uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select auth.uid() is not null and exists (
    select 1 from public.proposals where id = p_proposal and author_id = auth.uid()
  );
$$;

revoke all on function public.can_delete_own_proposal(uuid) from public;
grant execute on function public.can_delete_own_proposal(uuid) to authenticated;

create function public.delete_own_proposal(p_proposal uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  delete from public.proposals
  where id = p_proposal and author_id = auth.uid();

  if not found then
    raise exception 'Proposal not found or not owned by current user' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.delete_own_proposal(uuid) from public;
grant execute on function public.delete_own_proposal(uuid) to authenticated;
