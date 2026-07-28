-- ============================================================================
-- CECÍLIA — Schema Supabase (PostgreSQL)
-- Sistema de Gestão de Semijoias
--
-- Como usar:
--   1. Crie um projeto em supabase.com
--   2. Abra SQL Editor → New query → cole este arquivo inteiro → Run
--   3. Em Storage, confirme que os buckets "produtos-fotos" e "empresa-logo"
--      foram criados (a seção final também faz isso via SQL)
--
-- Este script é idempotente na maior parte (usa IF NOT EXISTS), mas rodar
-- em um banco já populado pode falhar em alguns pontos — revise antes de
-- rodar em produção com dados reais.
-- ============================================================================

create extension if not exists pgcrypto;

-- ============================================================================
-- 1. PERFIS DE USUÁRIO (liga em auth.users do Supabase Auth)
-- ============================================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type user_role as enum ('admin', 'vendas');
  end if;
end$$;

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  papel user_role not null default 'vendas',
  created_at timestamptz not null default now()
);

-- Função auxiliar usada nas políticas de RLS abaixo
create or replace function is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and papel = 'admin'
  );
$$;

-- Cria automaticamente um profile quando um novo usuário se cadastra no Auth
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nome, papel)
  values (new.id, coalesce(new.raw_user_meta_data->>'nome', new.email), 'vendas');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================================
-- 2. CATEGORIAS (prefixo usado na geração automática de código do produto)
-- ============================================================================

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  nome text unique not null,
  prefixo text unique not null,       -- ex: 'BR', 'CL', 'AN'
  contador integer not null default 0, -- último número usado, incrementado a cada produto novo
  created_at timestamptz not null default now()
);

insert into categories (nome, prefixo) values
  ('Brincos', 'BR'), ('Colares', 'CL'), ('Pulseiras', 'PU'), ('Anéis', 'AN'),
  ('Conjuntos', 'CJ'), ('Tornozeleiras', 'TO'), ('Piercings', 'PI'),
  ('Chokers', 'CH'), ('Pingentes', 'PN')
on conflict (nome) do nothing;

-- ============================================================================
-- 3. FORNECEDORES
-- ============================================================================

create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  contato text,
  telefone text,
  instagram text,
  site text,
  prazo_medio text,
  obs text,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 4. PRODUTOS
-- ============================================================================

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  code text unique,                          -- gerado automaticamente (ex: BR0001)
  name text not null,
  category_id uuid not null references categories(id),
  collection text,
  photo_url text,

  -- características
  banho text,
  cor text,
  pedra text,
  garantia text default '12 meses',
  peso text,

  -- compra (última / referência)
  fornecedor_id uuid references suppliers(id),
  data_compra date,
  valor_pago numeric(10,2) default 0,
  frete_rateado numeric(10,2) default 0,
  custo_total numeric(10,2) default 0,       -- custo médio ponderado, mantido pelos triggers de compra

  -- venda
  preco_sugerido numeric(10,2) default 0,
  margem numeric(6,2) default 100,
  lucro numeric(10,2) default 0,
  promocao boolean default false,

  -- estoque
  quantidade integer not null default 0,
  estoque_minimo integer not null default 5,
  localizacao text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_products_category on products(category_id);
create index if not exists idx_products_code on products(code);

-- Gera o código automático (BR0001, CL0001...) antes de inserir o produto
create or replace function generate_product_code()
returns trigger
language plpgsql
as $$
declare
  v_prefixo text;
  v_numero integer;
begin
  if new.code is not null then
    return new;
  end if;

  update categories
    set contador = contador + 1
    where id = new.category_id
    returning prefixo, contador into v_prefixo, v_numero;

  new.code := v_prefixo || lpad(v_numero::text, 4, '0');
  return new;
end;
$$;

drop trigger if exists trg_generate_product_code on products;
create trigger trg_generate_product_code
  before insert on products
  for each row execute function generate_product_code();

-- Mantém updated_at sempre atual
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_products_touch on products;
create trigger trg_products_touch
  before update on products
  for each row execute function touch_updated_at();

-- ============================================================================
-- 5. CLIENTES
-- ============================================================================

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone text,
  whatsapp text,
  instagram text,
  cidade text,
  estado text,
  aniversario date,
  data_cadastro date not null default current_date,
  total_gasto numeric(10,2) not null default 0,   -- mantido pelo trigger de pedidos
  qtd_pedidos integer not null default 0,          -- mantido pelo trigger de pedidos
  obs text,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 6. COMPRAS — ao inserir, atualiza estoque + custo médio ponderado do produto
--    e lança uma saída no fluxo de caixa
-- ============================================================================

create table if not exists purchases (
  id uuid primary key default gen_random_uuid(),
  fornecedor_id uuid not null references suppliers(id),
  produto_id uuid not null references products(id),
  data date not null default current_date,
  frete numeric(10,2) default 0,
  qtd_pecas integer not null,
  valor_total numeric(10,2) not null,
  frete_unit numeric(10,2),
  created_at timestamptz not null default now()
);

create or replace function apply_purchase()
returns trigger
language plpgsql
as $$
declare
  v_produto products%rowtype;
  v_custo_nova_leva numeric(10,2);
  v_novo_estoque integer;
  v_custo_medio numeric(10,2);
begin
  select * into v_produto from products where id = new.produto_id for update;

  new.frete_unit := case when new.qtd_pecas > 0 then round((new.frete / new.qtd_pecas)::numeric, 2) else 0 end;
  v_custo_nova_leva := case when new.qtd_pecas > 0 then (new.valor_total + coalesce(new.frete,0)) / new.qtd_pecas else 0 end;
  v_novo_estoque := v_produto.quantidade + new.qtd_pecas;

  v_custo_medio := case
    when v_novo_estoque > 0 then
      ((v_produto.quantidade * v_produto.custo_total) + (new.qtd_pecas * v_custo_nova_leva)) / v_novo_estoque
    else v_custo_nova_leva
  end;

  update products set
    quantidade = v_novo_estoque,
    custo_total = round(v_custo_medio, 2),
    lucro = round(preco_sugerido - v_custo_medio, 2),
    margem = case when v_custo_medio > 0 then round(((preco_sugerido - v_custo_medio) / v_custo_medio) * 100, 2) else 0 end
  where id = new.produto_id;

  insert into cashflow (tipo, descricao, valor, data, origem, referencia_id)
  values ('Saída', 'Compra ' || v_produto.code, -(new.valor_total + coalesce(new.frete,0)), new.data, 'compra', new.id);

  return new;
end;
$$;

drop trigger if exists trg_apply_purchase on purchases;
create trigger trg_apply_purchase
  before insert on purchases
  for each row execute function apply_purchase();

-- ============================================================================
-- 7. PEDIDOS + ITENS
-- ============================================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'order_status') then
    create type order_status as enum (
      'Reservado', 'Aguardando pagamento', 'Pago', 'Separando', 'Enviado', 'Entregue', 'Cancelado'
    );
  end if;
end$$;

create sequence if not exists order_number_seq start 1;

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  numero text unique,                         -- gerado automaticamente (PED0001)
  cliente_id uuid not null references clients(id),
  desconto numeric(5,2) default 0,            -- percentual
  forma_pagamento text,
  parcelas integer default 1,
  status order_status not null default 'Aguardando pagamento',
  rastreio text,
  transportadora text,
  obs text,
  total numeric(10,2) not null default 0,     -- recalculado pelo trigger de itens
  baixado boolean not null default false,     -- true depois que o estoque/caixa/cliente já foram atualizados
  data date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  produto_id uuid not null references products(id),
  qtd integer not null check (qtd > 0),
  preco_unit numeric(10,2) not null
);

create index if not exists idx_order_items_order on order_items(order_id);

-- Número automático do pedido
create or replace function generate_order_number()
returns trigger language plpgsql as $$
begin
  if new.numero is null then
    new.numero := 'PED' || lpad(nextval('order_number_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_generate_order_number on orders;
create trigger trg_generate_order_number
  before insert on orders
  for each row execute function generate_order_number();

-- Recalcula o total do pedido sempre que os itens mudam (soma - desconto %)
create or replace function recalc_order_total()
returns trigger language plpgsql as $$
declare
  v_order_id uuid;
  v_bruto numeric(10,2);
  v_desconto numeric(5,2);
begin
  v_order_id := coalesce(new.order_id, old.order_id);
  select coalesce(sum(qtd * preco_unit), 0) into v_bruto from order_items where order_id = v_order_id;
  select desconto into v_desconto from orders where id = v_order_id;
  update orders set total = round(v_bruto * (1 - coalesce(v_desconto,0)/100), 2) where id = v_order_id;
  return null;
end;
$$;

drop trigger if exists trg_recalc_order_total on order_items;
create trigger trg_recalc_order_total
  after insert or update or delete on order_items
  for each row execute function recalc_order_total();

-- Ao mudar o status do pedido: baixa estoque + credita cliente + lança caixa (uma única vez);
-- estorna tudo se um pedido já baixado for cancelado.
create or replace function handle_order_status_change()
returns trigger
language plpgsql
as $$
declare
  v_cliente_nome text;
begin
  -- PAGO (ou estágio seguinte) pela primeira vez → baixa
  if new.status in ('Pago','Separando','Enviado','Entregue') and not old.baixado then
    update products p
      set quantidade = greatest(0, p.quantidade - oi.qtd)
      from order_items oi
      where oi.order_id = new.id and oi.produto_id = p.id;

    update clients set
      total_gasto = total_gasto + new.total,
      qtd_pedidos = qtd_pedidos + 1
      where id = new.cliente_id;

    insert into cashflow (tipo, descricao, valor, data, origem, referencia_id)
    values ('Entrada', 'Venda ' || new.numero, new.total, current_date, 'pedido', new.id);

    new.baixado := true;

  -- CANCELADO depois de já ter sido baixado → estorna
  elsif new.status = 'Cancelado' and old.baixado then
    update products p
      set quantidade = p.quantidade + oi.qtd
      from order_items oi
      where oi.order_id = new.id and oi.produto_id = p.id;

    update clients set
      total_gasto = greatest(0, total_gasto - new.total),
      qtd_pedidos = greatest(0, qtd_pedidos - 1)
      where id = new.cliente_id;

    insert into cashflow (tipo, descricao, valor, data, origem, referencia_id)
    values ('Saída', 'Estorno ' || new.numero || ' (cancelado)', -new.total, current_date, 'estorno', new.id);

    new.baixado := false;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_order_status_change on orders;
create trigger trg_order_status_change
  before update of status on orders
  for each row
  when (new.status is distinct from old.status)
  execute function handle_order_status_change();

-- ============================================================================
-- 8. FLUXO DE CAIXA
-- ============================================================================

create table if not exists cashflow (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('Entrada','Saída')),
  descricao text not null,
  valor numeric(10,2) not null,     -- positivo = entrada, negativo = saída
  data date not null default current_date,
  origem text,                      -- 'compra' | 'pedido' | 'estorno' | 'manual'
  referencia_id uuid,                -- id da compra/pedido de origem, quando houver
  created_at timestamptz not null default now()
);

create index if not exists idx_cashflow_data on cashflow(data);

-- ============================================================================
-- 9. CONFIGURAÇÕES (linha única)
-- ============================================================================

create table if not exists settings (
  id boolean primary key default true check (id),  -- garante uma única linha
  empresa_nome text not null default 'Cecília Semijoias',
  logo_url text,
  margem_padrao numeric(6,2) not null default 100,
  taxa_maquininha numeric(5,2) not null default 3.5,
  comissao numeric(5,2) not null default 0,
  impostos numeric(5,2) not null default 6,
  updated_at timestamptz not null default now()
);
insert into settings (id) values (true) on conflict (id) do nothing;

-- ============================================================================
-- 10. ROW LEVEL SECURITY
--     Regra geral: qualquer usuário autenticado (equipe da loja) pode ler e
--     escrever nos dados operacionais. Exclusões e configurações sensíveis
--     ficam restritas ao papel 'admin'.
-- ============================================================================

alter table profiles enable row level security;
alter table categories enable row level security;
alter table suppliers enable row level security;
alter table products enable row level security;
alter table clients enable row level security;
alter table purchases enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table cashflow enable row level security;
alter table settings enable row level security;

-- profiles: cada um vê a si mesmo; admin vê todos
drop policy if exists "profiles_select_own_or_admin" on profiles;
create policy "profiles_select_own_or_admin" on profiles for select
  using (id = auth.uid() or is_admin());
drop policy if exists "profiles_update_admin" on profiles;
create policy "profiles_update_admin" on profiles for update
  using (is_admin());

-- leitura liberada para autenticados nas tabelas operacionais
drop policy if exists "read_authenticated" on categories;
create policy "read_authenticated" on categories for select using (auth.role() = 'authenticated');
drop policy if exists "read_authenticated" on suppliers;
create policy "read_authenticated" on suppliers for select using (auth.role() = 'authenticated');
drop policy if exists "read_authenticated" on products;
create policy "read_authenticated" on products for select using (auth.role() = 'authenticated');
drop policy if exists "read_authenticated" on clients;
create policy "read_authenticated" on clients for select using (auth.role() = 'authenticated');
drop policy if exists "read_authenticated" on purchases;
create policy "read_authenticated" on purchases for select using (auth.role() = 'authenticated');
drop policy if exists "read_authenticated" on orders;
create policy "read_authenticated" on orders for select using (auth.role() = 'authenticated');
drop policy if exists "read_authenticated" on order_items;
create policy "read_authenticated" on order_items for select using (auth.role() = 'authenticated');
drop policy if exists "read_authenticated" on cashflow;
create policy "read_authenticated" on cashflow for select using (auth.role() = 'authenticated');
drop policy if exists "read_authenticated" on settings;
create policy "read_authenticated" on settings for select using (auth.role() = 'authenticated');

-- inserção/edição liberada para autenticados (equipe de vendas cadastra e vende no dia a dia)
drop policy if exists "write_authenticated" on suppliers;
create policy "write_authenticated" on suppliers for insert with check (auth.role() = 'authenticated');
drop policy if exists "update_authenticated" on suppliers;
create policy "update_authenticated" on suppliers for update using (auth.role() = 'authenticated');
drop policy if exists "write_authenticated" on products;
create policy "write_authenticated" on products for insert with check (auth.role() = 'authenticated');
drop policy if exists "update_authenticated" on products;
create policy "update_authenticated" on products for update using (auth.role() = 'authenticated');
drop policy if exists "write_authenticated" on clients;
create policy "write_authenticated" on clients for insert with check (auth.role() = 'authenticated');
drop policy if exists "update_authenticated" on clients;
create policy "update_authenticated" on clients for update using (auth.role() = 'authenticated');
drop policy if exists "write_authenticated" on purchases;
create policy "write_authenticated" on purchases for insert with check (auth.role() = 'authenticated');
drop policy if exists "write_authenticated" on orders;
create policy "write_authenticated" on orders for insert with check (auth.role() = 'authenticated');
drop policy if exists "update_authenticated" on orders;
create policy "update_authenticated" on orders for update using (auth.role() = 'authenticated');
drop policy if exists "write_authenticated" on order_items;
create policy "write_authenticated" on order_items for insert with check (auth.role() = 'authenticated');
drop policy if exists "update_authenticated" on order_items;
create policy "update_authenticated" on order_items for update using (auth.role() = 'authenticated');
drop policy if exists "delete_authenticated" on order_items;
create policy "delete_authenticated" on order_items for delete using (auth.role() = 'authenticated');
drop policy if exists "write_authenticated" on cashflow;
create policy "write_authenticated" on cashflow for insert with check (auth.role() = 'authenticated');

-- exclusões e configurações: só admin
drop policy if exists "delete_admin_only" on products;
create policy "delete_admin_only" on products for delete using (is_admin());
drop policy if exists "delete_admin_only" on clients;
create policy "delete_admin_only" on clients for delete using (is_admin());
drop policy if exists "delete_admin_only" on suppliers;
create policy "delete_admin_only" on suppliers for delete using (is_admin());
drop policy if exists "delete_admin_only" on orders;
create policy "delete_admin_only" on orders for delete using (is_admin());
drop policy if exists "update_settings_admin" on settings;
create policy "update_settings_admin" on settings for update using (is_admin());

-- ============================================================================
-- 11. STORAGE (fotos de produtos e logo da empresa)
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('produtos-fotos', 'produtos-fotos', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('empresa-logo', 'empresa-logo', true)
on conflict (id) do nothing;

drop policy if exists "produtos_fotos_read_public" on storage.objects;
create policy "produtos_fotos_read_public" on storage.objects for select
  using (bucket_id = 'produtos-fotos');
drop policy if exists "produtos_fotos_write_authenticated" on storage.objects;
create policy "produtos_fotos_write_authenticated" on storage.objects for insert
  with check (bucket_id = 'produtos-fotos' and auth.role() = 'authenticated');
drop policy if exists "produtos_fotos_delete_admin" on storage.objects;
create policy "produtos_fotos_delete_admin" on storage.objects for delete
  using (bucket_id = 'produtos-fotos' and is_admin());

drop policy if exists "empresa_logo_read_public" on storage.objects;
create policy "empresa_logo_read_public" on storage.objects for select
  using (bucket_id = 'empresa-logo');
drop policy if exists "empresa_logo_write_admin" on storage.objects;
create policy "empresa_logo_write_admin" on storage.objects for insert
  with check (bucket_id = 'empresa-logo' and is_admin());

-- ============================================================================
-- FIM — próximos passos sugeridos:
--  1. Rodar este script em um projeto Supabase novo.
--  2. Criar o primeiro usuário admin: cadastre normalmente pelo Auth e depois
--     rode: update profiles set papel = 'admin' where id = '<uuid-do-usuario>';
--  3. Conectar o front-end (CeciliaSistema.jsx) trocando os useState locais
--     por chamadas ao supabase-js (select/insert/update), mantendo a mesma
--     UI e apenas trocando a origem dos dados.
-- ============================================================================
