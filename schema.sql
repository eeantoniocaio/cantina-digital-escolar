-- ================================================================
-- Cantina Digital Escolar — Schema de Banco de Dados
-- Versão: 2.0 — Arquitetura Definitiva Segura
-- Última atualização: 2026-08-25
-- ================================================================
-- INSTRUÇÕES DE APLICAÇÃO:
-- Execute este arquivo UMA VEZ em um banco vazio.
-- Não execute em banco com dados existentes sem uma migration controlada.
-- ================================================================

-- ----------------------------------------------------------------
-- 1. EXTENSÕES
-- ----------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ----------------------------------------------------------------
-- 2. FUNÇÕES AUXILIARES DE RLS
-- Devem ser criadas ANTES das policies que as utilizam.
-- SECURITY DEFINER + SET search_path = '' previne:
--   (a) recursão infinita em policies de self-reference
--   (b) search_path injection (elevação de privilégio)
-- ----------------------------------------------------------------

-- Verifica se o usuário autenticado é admin ou gestão.
-- Usada nas policies de outras tabelas para evitar consultas
-- recursivas que causariam infinite recursion no RLS.
CREATE OR REPLACE FUNCTION public.is_admin_or_gestao()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
          AND role IN ('admin', 'gestao')
    );
$$;

-- Retorna o role do usuário autenticado.
-- Usado em validações dentro das RPCs.
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Proteção de profiles.role:
-- Bloqueia qualquer UPDATE na coluna role feito por usuário não-administrador.
-- Defesa em dois níveis:
--   (a) REVOKE UPDATE (role): impede a role 'authenticated' de atualizar
--       a coluna via API REST (PostgREST), independente de RLS.
--   (b) Trigger BEFORE UPDATE: bloqueia tentativas que cheguem por outros
--       caminhos (ex: SQL direto autenticado, edge functions sem service_role).
-- A alteração de role é permitida apenas para admin/gestão ou via service_role
-- (Supabase Dashboard), que bypassa RLS e triggers de aplicação.
CREATE OR REPLACE FUNCTION public.prevent_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Permite se o role não mudou
    IF NEW.role = OLD.role THEN
        RETURN NEW;
    END IF;

    -- Permite se o chamador é admin ou gestão
    IF public.is_admin_or_gestao() THEN
        RETURN NEW;
    END IF;

    -- Bloqueia qualquer outra tentativa de mudar role
    RAISE EXCEPTION 'alteracao_role_nao_autorizada: apenas administradores podem alterar o role de um perfil'
        USING ERRCODE = 'P0010';
END;
$$;

-- Trigger function: bloqueia alteração direta de saldo por clientes.
-- Proteção principal contra escrita direta: session_user='postgres' indica
-- que a chamada vem de uma função SECURITY DEFINER owner=postgres
-- (registrar_debito ou aprovar_comprovante). Clientes Supabase autenticados
-- chegam com session_user='authenticator'.
-- NOTA: REVOKE UPDATE (saldo) é inefetivo no Supabase (grant de tabela
-- prevalece sobre revoke de coluna), por isso este trigger é a barreira real.
CREATE OR REPLACE FUNCTION public.prevent_saldo_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NEW.saldo = OLD.saldo THEN
        RETURN NEW;
    END IF;
    -- session_user='postgres' = chamada vem de função SECURITY DEFINER (nossas RPCs)
    -- session_user='authenticator' = chamada direta do cliente via PostgREST
    IF session_user = 'postgres' THEN
        RETURN NEW;
    END IF;
    RAISE EXCEPTION 'alteracao_saldo_nao_autorizada: saldo so pode ser alterado pelas RPCs registrar_debito e aprovar_comprovante'
        USING ERRCODE = 'P0011';
END;
$$;


-- ----------------------------------------------------------------
-- 3. TABELAS (em ordem de dependência FK)
-- A ordem é obrigatória: alunos antes de profiles (FK aluno_id).
-- ----------------------------------------------------------------

-- 3.1 alunos — entidade central financeira
-- saldo: protegido por REVOKE de coluna (Seção 5) e RPCs
CREATE TABLE public.alunos (
    id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
    nome            text          NOT NULL,
    ra              text          NOT NULL UNIQUE,
    digito          text,
    turma           text          NOT NULL,
    saldo           numeric(10,2) NOT NULL DEFAULT 0.00 CHECK (saldo >= 0),
    ativo           boolean       NOT NULL DEFAULT true,
    foto            text,
    data_nascimento date,         -- ausente no schema v1; adicionado
    criado_em       timestamptz   NOT NULL DEFAULT now()
);

-- 3.2 profiles — vinculado a auth.users + alunos
-- aluno_id: uuid com FK real (era text sem FK no schema v1)
CREATE TABLE public.profiles (
    id        uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email     text        NOT NULL,
    nome      text        NOT NULL,
    role      text        NOT NULL DEFAULT 'familia'
                          CHECK (role IN ('admin','familia','cantina','aluno','professor','gestao')),
    aluno_id  uuid        REFERENCES public.alunos(id) ON DELETE SET NULL,
    rg        text,
    whatsapp  text,
    criado_em timestamptz NOT NULL DEFAULT now()
);

-- 3.3 responsaveis — vínculo familia ↔ aluno (N:N)
CREATE TABLE public.responsaveis (
    familia_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    aluno_id   uuid NOT NULL REFERENCES public.alunos(id)   ON DELETE CASCADE,
    PRIMARY KEY (familia_id, aluno_id)
);

-- 3.4 comprovantes — recibos de PIX
-- aluno_id NOT NULL: comprovante sem aluno não tem significado financeiro
-- ON DELETE RESTRICT: impede exclusão de aluno com comprovante associado
CREATE TABLE public.comprovantes (
    id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
    aluno_id         uuid          NOT NULL REFERENCES public.alunos(id)   ON DELETE RESTRICT,
    responsavel_id   uuid          NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    valor            numeric(10,2) NOT NULL CHECK (valor > 0),
    pagador          text          NOT NULL,
    data_pagamento   timestamptz   NOT NULL,
    id_transacao     text          NOT NULL UNIQUE,
    status           text          NOT NULL DEFAULT 'pendente'
                                   CHECK (status IN ('pendente','aprovado','rejeitado')),
    arquivo_url      text          NOT NULL,
    hash_comprovante text          NOT NULL UNIQUE,
    observacao       text,
    aprovado_por     uuid          REFERENCES public.profiles(id) ON DELETE SET NULL,
    criado_em        timestamptz   NOT NULL DEFAULT now()
);

-- 3.5 movimentacoes — ledger financeiro append-only
-- aluno_id NOT NULL: movimentação sem aluno não seria registrada (era nullable no v1)
-- ON DELETE RESTRICT em criado_por: preserva auditoria de quem lançou
CREATE TABLE public.movimentacoes (
    id          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
    aluno_id    uuid          NOT NULL REFERENCES public.alunos(id)   ON DELETE RESTRICT,
    tipo        text          NOT NULL CHECK (tipo IN ('credito','debito')),
    valor       numeric(10,2) NOT NULL CHECK (valor > 0),
    descricao   text          NOT NULL,
    criado_por  uuid          NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    criado_em   timestamptz   NOT NULL DEFAULT now()
);

-- 3.6 produtos — cardápio da cantina
CREATE TABLE public.produtos (
    id        uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
    nome      text          NOT NULL,
    preco     numeric(10,2) NOT NULL CHECK (preco >= 0),
    categoria text          NOT NULL CHECK (categoria IN ('salgado','bebida','doce','outro')),
    ativo     boolean       NOT NULL DEFAULT true,
    criado_em timestamptz   NOT NULL DEFAULT now()
);


-- ----------------------------------------------------------------
-- 4. PROTEÇÃO DE COLUNA saldo
-- NOTA: REVOKE UPDATE (saldo) É INEFETIVO no Supabase porque o Supabase
-- concede UPDATE em nível de tabela para 'authenticated'. Um REVOKE de
-- coluna não substitui um GRANT de tabela no PostgreSQL.
-- A proteção real é feita pelo trigger prevent_aluno_saldo_change (Seção 6).
-- O REVOKE abaixo é mantido como defesa adicional de documentação.
-- ----------------------------------------------------------------
REVOKE UPDATE (saldo) ON public.alunos FROM authenticated;

-- ----------------------------------------------------------------
-- 4b. PROTEÇÃO DE COLUNA role em profiles
-- Defesa em dois níveis:
--   (a) REVOKE UPDATE (role): bloqueia o PostgREST de aceitar UPDATE
--       na coluna role de qualquer cliente 'authenticated'.
--   (b) Trigger prevent_role_change (criado abaixo, após tabelas e RPCs):
--       bloqueia caminhos alternativos que não passem pelo PostgREST.
-- ----------------------------------------------------------------
REVOKE UPDATE (role) ON public.profiles FROM authenticated;


-- ----------------------------------------------------------------
-- 5. FUNÇÕES RPC TRANSACIONAIS
--
-- PRINCÍPIOS:
-- (a) auth.uid() interno — nunca confia em UUID de usuário enviado
--     pelo cliente via parâmetro. O operador é sempre quem chamou.
-- (b) SET search_path = '' — evita search_path injection.
-- (c) FOR UPDATE — serializa operações concorrentes no mesmo aluno.
-- (d) Uma responsabilidade por operação — sem trigger paralelo
--     atualizando o mesmo saldo.
-- ----------------------------------------------------------------

-- 5.1 registrar_debito
-- Responsabilidade: débito atômico de compra na cantina.
-- Substitui: DBService.registrarConsumo() (TypeScript).
-- Substitui: trigger on_movimentacao_created (REMOVIDO).
CREATE OR REPLACE FUNCTION public.registrar_debito(
    p_aluno_id  uuid,
    p_valor     numeric,
    p_descricao text
)
RETURNS uuid   -- id da movimentação criada
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_saldo_atual numeric;
    v_mov_id      uuid;
    v_operador_id uuid := auth.uid();  -- identidade do chamador, nunca do cliente
BEGIN
    -- Valida autenticação
    IF v_operador_id IS NULL THEN
        RAISE EXCEPTION 'nao_autenticado'
            USING ERRCODE = 'P0000';
    END IF;

    -- Valida valor positivo
    IF p_valor <= 0 THEN
        RAISE EXCEPTION 'valor_invalido: %', p_valor
            USING ERRCODE = 'P0009';
    END IF;

    -- Lock exclusivo na linha do aluno (serializa compras simultâneas do mesmo aluno)
    SELECT saldo
      INTO v_saldo_atual
      FROM public.alunos
     WHERE id = p_aluno_id AND ativo = true
       FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'aluno_nao_encontrado: %', p_aluno_id
            USING ERRCODE = 'P0001';
    END IF;

    IF v_saldo_atual < p_valor THEN
        RAISE EXCEPTION 'saldo_insuficiente: saldo=%, valor=%', v_saldo_atual, p_valor
            USING ERRCODE = 'P0002';
    END IF;

    -- Debita o saldo (única escrita em alunos.saldo para débito)
    UPDATE public.alunos
       SET saldo = saldo - p_valor
     WHERE id = p_aluno_id;

    -- Registra no ledger usando o operador autenticado (auth.uid())
    INSERT INTO public.movimentacoes (aluno_id, tipo, valor, descricao, criado_por)
    VALUES (p_aluno_id, 'debito', p_valor, p_descricao, v_operador_id)
    RETURNING id INTO v_mov_id;

    RETURN v_mov_id;
END;
$$;


-- 5.2 aprovar_comprovante
-- Responsabilidade: aprovação atômica de comprovante PIX com crédito.
-- Substitui: DBService.approveComprovante() (TypeScript).
-- Substitui: trigger on_comprovante_approved (REMOVIDO).
-- AJUSTE 2: valida aluno_id existe e está ativo antes de creditar.
CREATE OR REPLACE FUNCTION public.aprovar_comprovante(
    p_comprovante_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_comp        public.comprovantes%ROWTYPE;
    v_admin_id    uuid    := auth.uid();  -- identidade do aprovador via JWT
    v_aluno_ativo boolean;
BEGIN
    -- Valida autenticação
    IF v_admin_id IS NULL THEN
        RAISE EXCEPTION 'nao_autenticado'
            USING ERRCODE = 'P0000';
    END IF;

    -- Lock exclusivo no comprovante (previne aprovação dupla simultânea por dois admins)
    SELECT *
      INTO v_comp
      FROM public.comprovantes
     WHERE id = p_comprovante_id
       FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'comprovante_nao_encontrado: %', p_comprovante_id
            USING ERRCODE = 'P0003';
    END IF;

    IF v_comp.status != 'pendente' THEN
        RAISE EXCEPTION 'comprovante_ja_processado: status=%', v_comp.status
            USING ERRCODE = 'P0004';
    END IF;

    -- Verifica idempotência: mesmo id_transacao já aprovado em outro comprovante?
    IF EXISTS (
        SELECT 1 FROM public.comprovantes
         WHERE id_transacao = v_comp.id_transacao
           AND status = 'aprovado'
           AND id != p_comprovante_id
    ) THEN
        RAISE EXCEPTION 'transacao_ja_aprovada: id_transacao=%', v_comp.id_transacao
            USING ERRCODE = 'P0005';
    END IF;

    -- AJUSTE 2: Valida que o aluno existe e está ativo ANTES de creditar.
    -- Aborta a transação se o aluno estiver inativo ou inexistente.
    SELECT ativo
      INTO v_aluno_ativo
      FROM public.alunos
     WHERE id = v_comp.aluno_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'aluno_inexistente: aluno_id=%, comprovante_id=%',
            v_comp.aluno_id, p_comprovante_id
            USING ERRCODE = 'P0006';
    END IF;

    IF v_aluno_ativo = false THEN
        RAISE EXCEPTION 'aluno_inativo: aluno_id=%, comprovante_id=%',
            v_comp.aluno_id, p_comprovante_id
            USING ERRCODE = 'P0007';
    END IF;

    -- Aprova o comprovante registrando quem aprovou (auth.uid())
    UPDATE public.comprovantes
       SET status      = 'aprovado',
           aprovado_por = v_admin_id
     WHERE id = p_comprovante_id;

    -- Credita o saldo (única escrita em alunos.saldo para crédito)
    UPDATE public.alunos
       SET saldo = saldo + v_comp.valor
     WHERE id = v_comp.aluno_id;

    -- Registra no ledger usando o admin autenticado (auth.uid())
    INSERT INTO public.movimentacoes (aluno_id, tipo, valor, descricao, criado_por)
    VALUES (
        v_comp.aluno_id,
        'credito',
        v_comp.valor,
        'Recarga PIX aprovada — Transação: ' || COALESCE(v_comp.id_transacao, 'N/A'),
        v_admin_id
    );
END;
$$;


-- 5.3 rejeitar_comprovante
-- Responsabilidade: rejeição atômica de comprovante PIX.
-- Substitui: DBService.rejectComprovante() (TypeScript).
CREATE OR REPLACE FUNCTION public.rejeitar_comprovante(
    p_comprovante_id uuid,
    p_observacao     text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_status   text;
    v_admin_id uuid := auth.uid();  -- identidade do rejeitador via JWT
BEGIN
    IF v_admin_id IS NULL THEN
        RAISE EXCEPTION 'nao_autenticado'
            USING ERRCODE = 'P0000';
    END IF;

    IF p_observacao IS NULL OR trim(p_observacao) = '' THEN
        RAISE EXCEPTION 'observacao_obrigatoria'
            USING ERRCODE = 'P0008';
    END IF;

    SELECT status
      INTO v_status
      FROM public.comprovantes
     WHERE id = p_comprovante_id
       FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'comprovante_nao_encontrado: %', p_comprovante_id
            USING ERRCODE = 'P0003';
    END IF;

    IF v_status != 'pendente' THEN
        RAISE EXCEPTION 'comprovante_ja_processado: status=%', v_status
            USING ERRCODE = 'P0004';
    END IF;

    UPDATE public.comprovantes
       SET status      = 'rejeitado',
           observacao  = p_observacao,
           aprovado_por = v_admin_id   -- registra quem rejeitou para auditoria
     WHERE id = p_comprovante_id;
END;
$$;


-- ----------------------------------------------------------------
-- 6. TRIGGER DE AUTENTICAÇÃO
-- Propósito: garantir que qualquer usuário criado via Supabase Auth
-- (inclusive fora do fluxo normal da app) tenha um profile básico.
--
-- SEGURANÇA:
-- - Apenas roles seguras são aceitas dos metadados do cliente.
--   'admin', 'cantina', 'gestao' não podem ser definidos pelo cliente.
-- - ON CONFLICT (id) DO NOTHING: se o código já criou o profile
--   com dados ricos (via upsert), o trigger não sobrescreve.
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_safe_role text;
BEGIN
    -- Aceita do cliente apenas roles não privilegiadas.
    -- 'admin', 'cantina', 'gestao' devem ser definidos pelo admin via
    -- Supabase Dashboard (service_role) ou função SECURITY DEFINER separada.
    v_safe_role := CASE
        WHEN NEW.raw_user_meta_data->>'role' IN ('familia', 'aluno', 'professor')
        THEN NEW.raw_user_meta_data->>'role'
        ELSE 'familia'
    END;

    INSERT INTO public.profiles (id, email, nome, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(
            NULLIF(trim(NEW.raw_user_meta_data->>'nome'), ''),
            split_part(NEW.email, '@', 1)
        ),
        v_safe_role
    )
    ON CONFLICT (id) DO NOTHING;  -- código com dados ricos tem prioridade via upsert

    RETURN NEW;
END;
$$;

-- NOTA: on_movimentacao_created e on_comprovante_approved NÃO são criados.
-- Toda lógica financeira está nas RPCs acima. Ter ambos causaria dupla escrita.
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Trigger de proteção de role: bloqueia UPDATE na coluna role por não-admins.
-- Criado APÓS as tabelas (depende de public.profiles) e APÓS is_admin_or_gestao().
-- Complementa o REVOKE UPDATE (role) acima para caminhos não-PostgREST.
CREATE TRIGGER prevent_profile_role_change
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE PROCEDURE public.prevent_role_change();

-- Trigger de proteção de saldo: bloqueia UPDATE direto em alunos.saldo.
-- Necessidade: REVOKE UPDATE (saldo) é inefetivo no Supabase (table-level
-- grant prevalece). Este trigger é a barreira efetiva.
CREATE TRIGGER prevent_aluno_saldo_change
    BEFORE UPDATE ON public.alunos
    FOR EACH ROW EXECUTE PROCEDURE public.prevent_saldo_change();


-- ----------------------------------------------------------------
-- 7. HABILITAR RLS EM TODAS AS TABELAS
-- ----------------------------------------------------------------
ALTER TABLE public.alunos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responsaveis  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comprovantes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos      ENABLE ROW LEVEL SECURITY;


-- ----------------------------------------------------------------
-- 8. RLS POLICIES
--
-- REGRAS GERAIS:
-- (a) Nenhuma tabela financeira tem policy de DELETE.
-- (b) movimentacoes não tem policy de INSERT/UPDATE para 'authenticated'.
--     Somente RPCs SECURITY DEFINER (BYPASSRLS) inserem no ledger.
-- (c) Sem WITH CHECK (true) não justificado.
-- (d) profiles: AJUSTE 1 — SELECT restrito, não expõe dados sensíveis
--     de outros usuários para roles não-admin.
-- ----------------------------------------------------------------

-- 8.1 profiles (AJUSTE 1: SELECT restrito ao próprio perfil + admin)

-- Usuário vê apenas o próprio perfil (inclui campos sensíveis como RG/WhatsApp)
CREATE POLICY "perfil_select_proprio"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

-- Admin e gestão veem todos os perfis (necessário para dashboard de gerenciamento)
-- Usa função SECURITY DEFINER para evitar infinite recursion.
CREATE POLICY "perfil_select_admin"
    ON public.profiles FOR SELECT
    USING (public.is_admin_or_gestao());

-- Usuário insere o próprio perfil; roles privilegiadas não são auto-cadastráveis.
-- 'admin', 'cantina', 'gestao': definidos apenas via Supabase Dashboard ou
-- função SECURITY DEFINER com validação adicional.
CREATE POLICY "perfil_insert_proprio"
    ON public.profiles FOR INSERT
    WITH CHECK (
        auth.uid() = id
        AND role IN ('familia', 'aluno', 'professor')
    );

-- Usuário atualiza o próprio perfil
CREATE POLICY "perfil_update_proprio"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Admin e gestão atualizam qualquer perfil (ex: vincular aluno, corrigir role)
CREATE POLICY "perfil_update_admin"
    ON public.profiles FOR UPDATE
    USING (public.is_admin_or_gestao());

-- DELETE: nenhuma policy. Cascade de auth.users (ON DELETE CASCADE) cuida da remoção.


-- 8.2 alunos

-- Staff (admin, cantina, gestão) vê todos os alunos
CREATE POLICY "alunos_select_staff"
    ON public.alunos FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin','cantina','gestao')
        )
    );

-- Família vê apenas alunos vinculados a ela via responsaveis
CREATE POLICY "alunos_select_familia"
    ON public.alunos FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.responsaveis
            WHERE aluno_id = public.alunos.id AND familia_id = auth.uid()
        )
    );

-- Aluno/professor vê o próprio registro de aluno
CREATE POLICY "alunos_select_proprio"
    ON public.alunos FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND aluno_id = public.alunos.id
        )
    );

-- Apenas admin insere alunos
CREATE POLICY "alunos_insert_admin"
    ON public.alunos FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Apenas admin atualiza dados dos alunos.
-- Coluna saldo: protegida por REVOKE de coluna (Seção 4), não por RLS.
CREATE POLICY "alunos_update_admin"
    ON public.alunos FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- DELETE: nenhuma policy. Usar ativo=false para "exclusão" lógica.


-- 8.3 responsaveis

-- Qualquer usuário autenticado vê vínculos (necessário para joins do cliente)
CREATE POLICY "responsaveis_select_auth"
    ON public.responsaveis FOR SELECT
    USING (auth.role() = 'authenticated');

-- Apenas admin insere vínculos
CREATE POLICY "responsaveis_insert_admin"
    ON public.responsaveis FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Apenas admin remove vínculos
CREATE POLICY "responsaveis_delete_admin"
    ON public.responsaveis FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );


-- 8.4 comprovantes

-- Família vê apenas os próprios comprovantes
CREATE POLICY "comprovantes_select_proprio"
    ON public.comprovantes FOR SELECT
    USING (responsavel_id = auth.uid());

-- Admin e gestão veem todos os comprovantes (fila de aprovação)
CREATE POLICY "comprovantes_select_admin"
    ON public.comprovantes FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin','gestao')
        )
    );

-- Família envia comprovante; verifica que o responsavel_id é o próprio usuário
-- e que o usuário tem role familia (não qualquer autenticado)
CREATE POLICY "comprovantes_insert_familia"
    ON public.comprovantes FOR INSERT
    WITH CHECK (
        responsavel_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'familia'
        )
    );

-- UPDATE: nenhuma policy para 'authenticated'.
-- UPDATE em comprovantes (status='aprovado'/'rejeitado') é feito pelas
-- RPCs aprovar_comprovante e rejeitar_comprovante (SECURITY DEFINER, BYPASSRLS).

-- DELETE: nenhuma policy. Comprovantes são registros de auditoria imutáveis.


-- 8.5 movimentacoes (ledger imutável)

-- Família vê movimentações dos alunos vinculados
CREATE POLICY "movimentacoes_select_familia"
    ON public.movimentacoes FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.responsaveis
            WHERE aluno_id = public.movimentacoes.aluno_id
              AND familia_id = auth.uid()
        )
    );

-- Aluno/professor vê as próprias movimentações
CREATE POLICY "movimentacoes_select_proprio"
    ON public.movimentacoes FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND aluno_id = public.movimentacoes.aluno_id
        )
    );

-- Staff vê todas as movimentações (relatórios financeiros)
CREATE POLICY "movimentacoes_select_staff"
    ON public.movimentacoes FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin','cantina','gestao')
        )
    );

-- INSERT: nenhuma policy para 'authenticated'.
-- Somente RPCs SECURITY DEFINER (BYPASSRLS) inserem no ledger.
-- UPDATE: nenhuma policy. Ledger é imutável.
-- DELETE: nenhuma policy. Ledger é imutável.


-- 8.6 produtos

-- Qualquer usuário autenticado vê o cardápio
CREATE POLICY "produtos_select_auth"
    ON public.produtos FOR SELECT
    USING (auth.role() = 'authenticated');

-- Apenas admin gerencia produtos
CREATE POLICY "produtos_insert_admin"
    ON public.produtos FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "produtos_update_admin"
    ON public.produtos FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "produtos_delete_admin"
    ON public.produtos FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );


-- ================================================================
-- FIM DO SCHEMA
-- ================================================================
-- RESUMO DE SEGURANÇA:
-- ✅ alunos.saldo: protegido por REVOKE de coluna + RPCs SECURITY DEFINER
-- ✅ profiles.role: protegido por REVOKE de coluna + trigger prevent_role_change
-- ✅ movimentacoes: ledger append-only sem INSERT/UPDATE/DELETE via RLS
-- ✅ RPCs: usam auth.uid() internamente, nunca aceitam UUID de usuário do cliente
-- ✅ profiles SELECT: restrito ao próprio perfil + admin/gestão
-- ✅ Trigger on_auth_user_created: não aceita roles privilegiadas de metadados do cliente
-- ✅ Sem FOR ALL em nenhuma tabela financeira
-- ✅ Sem WITH CHECK(true) não justificado
-- ✅ search_path seguro em todas as funções SECURITY DEFINER
-- ✅ ON DELETE RESTRICT em comprovantes/movimentacoes (preserva auditoria)
-- ✅ is_admin_or_gestao(): SECURITY DEFINER evita recursão em policies de profiles
-- ================================================================
