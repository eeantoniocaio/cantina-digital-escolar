-- Schema Inicial - Cantina Digital Escolar

-- 1. Habilitar UUID
create extension if not exists "uuid-ossp";

-- 2. Tabela de Perfis (perfis de usuários vinculados à auth.users)
create table public.profiles (
    id uuid references auth.users on delete cascade primary key,
    email text not null,
    nome text,
    role text not null check (role in ('admin', 'familia', 'cantina')),
    criado_em timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;

-- 3. Tabela de Alunos
create table public.alunos (
    id uuid default uuid_generate_v4() primary key,
    nome text not null,
    ra text unique,
    turma text,
    saldo numeric(10, 2) default 0.00 not null check (saldo >= 0),
    ativo boolean default true not null,
    criado_em timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.alunos enable row level security;

-- 4. Tabela de Relacionamento Responsaveis -> Alunos (muitos para muitos)
create table public.responsaveis_alunos (
    id uuid default uuid_generate_v4() primary key,
    familia_id uuid references public.profiles(id) on delete cascade not null,
    aluno_id uuid references public.alunos(id) on delete cascade not null,
    criado_em timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(familia_id, aluno_id)
);

alter table public.responsaveis_alunos enable row level security;

-- 5. Tabela de Comprovantes (Uploads de Pix)
create table public.comprovantes (
    id uuid default uuid_generate_v4() primary key,
    aluno_id uuid references public.alunos(id) on delete cascade not null,
    responsavel_id uuid references public.profiles(id) on delete cascade not null,
    valor numeric(10, 2) not null check (valor > 0),
    pagador text,
    data_pagamento timestamp with time zone,
    id_transacao text unique, -- E2E ID do Pix
    status text default 'pendente' not null check (status in ('pendente', 'aprovado', 'rejeitado')),
    arquivo_url text not null,
    hash_comprovante text unique not null, -- Evitar envio do mesmo arquivo
    observacao text,
    criado_em timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.comprovantes enable row level security;

-- 6. Tabela de Movimentacoes (Ledger / Auditoria Financeira)
create table public.movimentacoes (
    id uuid default uuid_generate_v4() primary key,
    aluno_id uuid references public.alunos(id) on delete cascade not null,
    tipo text not null check (tipo in ('credito', 'debito')),
    valor numeric(10, 2) not null check (valor > 0),
    descricao text not null,
    criado_por uuid references public.profiles(id) on delete set null,
    criado_em timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.movimentacoes enable row level security;

--------------------------------------------------------------------------------
-- TRIGGERS E FUNÇÕES AUTOMATIZADAS
--------------------------------------------------------------------------------

-- Sincronizar criação de novos usuários no Supabase Auth com a tabela public.profiles
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, nome, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nome', 'Usuário Novo'),
    coalesce(new.raw_user_meta_data->>'role', 'familia')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Trigger para atualizar saldo do aluno após inserção em movimentacoes
create or replace function public.handle_new_movimentacao()
returns trigger as $$
begin
  if new.tipo = 'credito' then
    update public.alunos
    set saldo = saldo + new.valor
    where id = new.aluno_id;
  elsif new.tipo = 'debito' then
    -- Verifica se o aluno tem saldo suficiente antes de debitar
    if (select saldo from public.alunos where id = new.aluno_id) < new.valor then
      raise exception 'Saldo insuficiente para realizar este débito.';
    end if;
    
    update public.alunos
    set saldo = saldo - new.valor
    where id = new.aluno_id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_movimentacao_created
  before insert on public.movimentacoes
  for each row execute procedure public.handle_new_movimentacao();

-- Trigger para gerar movimentação de crédito automaticamente quando um comprovante for aprovado
create or replace function public.handle_comprovante_status_change()
returns trigger as $$
begin
  -- Se o status mudou para aprovado
  if new.status = 'aprovado' and old.status = 'pendente' then
    insert into public.movimentacoes (aluno_id, tipo, valor, descricao, criado_por)
    values (
      new.aluno_id,
      'credito',
      new.valor,
      'Recarga PIX Aprovada - Transação ID: ' || coalesce(new.id_transacao, 'Não informada'),
      new.responsavel_id
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_comprovante_approved
  after update on public.comprovantes
  for each row execute procedure public.handle_comprovante_status_change();

--------------------------------------------------------------------------------
-- REGRAS DE RLS (ROW LEVEL SECURITY)
--------------------------------------------------------------------------------

-- Policies para Profiles
create policy "Qualquer um logado pode ver perfis" on public.profiles
  for select using (auth.role() = 'authenticated');

create policy "Usuários podem atualizar seus próprios perfis" on public.profiles
  for update using (auth.uid() = id);

-- Policies para Alunos
create policy "Admins e Cantina podem ver todos os alunos" on public.alunos
  for select using (
    exists (
      select 1 from public.profiles 
      where id = auth.uid() and role in ('admin', 'cantina')
    )
  );

create policy "Famílias podem ver alunos vinculados" on public.alunos
  for select using (
    exists (
      select 1 from public.responsaveis_alunos ra
      where ra.aluno_id = public.alunos.id and ra.familia_id = auth.uid()
    )
  );

create policy "Apenas admins podem inserir/editar alunos" on public.alunos
  for all using (
    exists (
      select 1 from public.profiles 
      where id = auth.uid() and role = 'admin'
    )
  );

-- Policies para Responsaveis Alunos
create policy "Qualquer usuário logado pode ver os vínculos" on public.responsaveis_alunos
  for select using (auth.role() = 'authenticated');

create policy "Apenas admins podem cadastrar vínculos" on public.responsaveis_alunos
  for all using (
    exists (
      select 1 from public.profiles 
      where id = auth.uid() and role = 'admin'
    )
  );

-- Policies para Comprovantes
create policy "Famílias podem ver seus comprovantes" on public.comprovantes
  for select using (responsavel_id = auth.uid());

create policy "Famílias podem criar comprovantes" on public.comprovantes
  for insert with check (responsavel_id = auth.uid());

create policy "Admins podem ver e atualizar todos os comprovantes" on public.comprovantes
  for all using (
    exists (
      select 1 from public.profiles 
      where id = auth.uid() and role = 'admin'
    )
  );

-- Policies para Movimentacoes
create policy "Famílias podem ver movimentações dos seus alunos vinculados" on public.movimentacoes
  for select using (
    exists (
      select 1 from public.responsaveis_alunos ra
      where ra.aluno_id = public.movimentacoes.aluno_id and ra.familia_id = auth.uid()
    )
  );

create policy "Admins e Cantina podem ver e criar movimentações" on public.movimentacoes
  for all using (
    exists (
      select 1 from public.profiles 
      where id = auth.uid() and role in ('admin', 'cantina')
    )
  );
