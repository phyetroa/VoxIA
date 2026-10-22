revoke insert on public.proposals from authenticated;

create or replace function public.submit_proposal(
  p_title text,
  p_description text,
  p_category_id bigint,
  p_government_scope public.government_scope,
  p_locality text,
  p_problem text,
  p_solution text,
  p_expected_benefits text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_proposal_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
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

  insert into public.proposals (
    author_id, category_id, title, description, problem, solution,
    expected_benefits, locality, government_scope, status
  ) values (
    auth.uid(), p_category_id, btrim(p_title), btrim(p_description),
    btrim(p_problem), btrim(p_solution), nullif(btrim(coalesce(p_expected_benefits, '')), ''),
    nullif(btrim(coalesce(p_locality, '')), ''), p_government_scope, 'approved'
  ) returning id into new_proposal_id;

  return new_proposal_id;
end;
$$;

revoke all on function public.submit_proposal(text, text, bigint, public.government_scope, text, text, text, text) from public;
grant execute on function public.submit_proposal(text, text, bigint, public.government_scope, text, text, text, text) to authenticated;
