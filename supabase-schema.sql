create table if not exists public.offer_boards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  board_key text not null default 'default',
  board_data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, board_key)
);

alter table public.offer_boards enable row level security;

drop policy if exists "Users can read their own offer boards" on public.offer_boards;
create policy "Users can read their own offer boards"
on public.offer_boards
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own offer boards" on public.offer_boards;
create policy "Users can insert their own offer boards"
on public.offer_boards
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own offer boards" on public.offer_boards;
create policy "Users can update their own offer boards"
on public.offer_boards
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own offer boards" on public.offer_boards;
create policy "Users can delete their own offer boards"
on public.offer_boards
for delete
to authenticated
using (auth.uid() = user_id);
