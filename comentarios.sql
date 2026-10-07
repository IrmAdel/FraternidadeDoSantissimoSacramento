-- Cole isto no Supabase: SQL Editor > New query > Run
create table public.comentarios (
  id uuid primary key default gen_random_uuid(),
  post_id text not null,
  parent_id uuid references public.comentarios(id) on delete cascade,
  apelido text not null check (char_length(apelido) between 1 and 40),
  texto text not null check (char_length(texto) between 1 and 2000),
  criado_em timestamptz not null default now()
);
create index on public.comentarios (post_id, criado_em);

alter table public.comentarios enable row level security;

-- qualquer pessoa pode ler e comentar; ninguém (sem a chave de admin) pode editar ou apagar
create policy "ler comentarios" on public.comentarios for select to anon using (true);
create policy "criar comentarios" on public.comentarios for insert to anon with check (true);
grant select, insert on public.comentarios to anon;
