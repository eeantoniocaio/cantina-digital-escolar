-- ================================================================
-- Migration: 20260902192650_cardapio_categorias
-- Aplicada em: 2026-09-02 19:26:50 UTC
-- Descrição: Criação de public.cardapio_categorias, adição de
--            produtos.categoria_id e seed de categorias iniciais.
--
-- ⚠️  ATENÇÃO: Esta migration JÁ FOI EXECUTADA no banco remoto.
--     NÃO execute novamente. Registrada aqui apenas para
--     versionamento e reprodutibilidade do ambiente.
-- ================================================================

-- ----------------------------------------------------------------
-- 1. TABELA cardapio_categorias
-- ----------------------------------------------------------------
CREATE TABLE public.cardapio_categorias (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    nome        text        NOT NULL UNIQUE,
    slug        text        NOT NULL UNIQUE,
    ativo       boolean     NOT NULL DEFAULT true,
    ordem       integer     NOT NULL DEFAULT 0,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------
-- 2. COLUNA produtos.categoria_id (FK opcional para cardapio_categorias)
-- Mantém a coluna categoria (text) existente para compatibilidade.
-- categoria_id é nullable: produtos antigos sem categoria migrada
-- continuam funcionando com a coluna categoria (text).
-- ----------------------------------------------------------------
ALTER TABLE public.produtos
    ADD COLUMN categoria_id uuid REFERENCES public.cardapio_categorias(id);

-- ----------------------------------------------------------------
-- 3. HABILITAR RLS
-- ----------------------------------------------------------------
ALTER TABLE public.cardapio_categorias ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------
-- 4. GRANTS (PostgREST precisa de acesso via anon/authenticated)
-- ----------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cardapio_categorias TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cardapio_categorias TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cardapio_categorias TO service_role;

-- ----------------------------------------------------------------
-- 5. RLS POLICIES
-- ----------------------------------------------------------------

-- Qualquer usuário autenticado pode ler as categorias
CREATE POLICY "categorias_select_auth"
    ON public.cardapio_categorias FOR SELECT
    USING (auth.role() = 'authenticated');

-- Apenas admin/gestão pode inserir categorias
CREATE POLICY "categorias_insert_admin"
    ON public.cardapio_categorias FOR INSERT
    WITH CHECK (is_admin_or_gestao());

-- Apenas admin/gestão pode atualizar categorias (inclui soft-disable via ativo=false)
CREATE POLICY "categorias_update_admin"
    ON public.cardapio_categorias FOR UPDATE
    USING (is_admin_or_gestao())
    WITH CHECK (is_admin_or_gestao());

-- Apenas admin/gestão pode deletar categorias
-- (na prática, preferir soft-disable via ativo=false para categorias em uso)
CREATE POLICY "categorias_delete_admin"
    ON public.cardapio_categorias FOR DELETE
    USING (is_admin_or_gestao());

-- ----------------------------------------------------------------
-- 6. SEED — Categorias históricas iniciais
-- INSERT ... ON CONFLICT DO NOTHING garante idempotência
-- ----------------------------------------------------------------
INSERT INTO public.cardapio_categorias (nome, slug, ativo, ordem) VALUES
    ('Salgados', 'salgado', true, 1),
    ('Bebidas',  'bebida',  true, 2),
    ('Doces',    'doce',    true, 3),
    ('Outros',   'outro',   true, 4)
ON CONFLICT (slug) DO NOTHING;

-- ================================================================
-- FIM DA MIGRATION
-- ================================================================
