-- Schema SQL para o Banco de Dados da NovaPay
-- Contém modelagem de tabelas, políticas de RLS, triggers e funções

-- Habilitar a extensão UUID se necessário
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABELA VENDEDORES
CREATE TABLE IF NOT EXISTS public.vendedores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    perfil VARCHAR(50) NOT NULL DEFAULT 'vendedor', -- 'vendedor' ou 'gestor'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. TABELA CLIENTES
CREATE TABLE IF NOT EXISTS public.clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    segmento VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ativo', -- 'ativo' ou 'inativo'
    data_cadastro TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. TABELA TRANSACOES
CREATE TABLE IF NOT EXISTS public.transacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
    valor NUMERIC(15, 2) NOT NULL,
    tipo VARCHAR(50) NOT NULL, -- 'entrada' ou 'saida'
    categoria VARCHAR(100) NOT NULL, -- 'Receita Comercial', 'Marketing', 'Infraestrutura', 'Salários', etc.
    data DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'confirmada', -- 'confirmada', 'pendente', 'cancelada'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. TABELA METAS
CREATE TABLE IF NOT EXISTS public.metas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mes_referencia DATE NOT NULL UNIQUE, -- Sempre o primeiro dia do mês correspondente (ex: '2026-07-01')
    meta_receita NUMERIC(15, 2) NOT NULL,
    meta_novos_clientes INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. TABELA VENDAS (Mapeia o Funil Comercial)
CREATE TABLE IF NOT EXISTS public.vendas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendedor_id UUID NOT NULL REFERENCES public.vendedores(id) ON DELETE CASCADE,
    cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
    valor_contrato NUMERIC(15, 2) NOT NULL,
    data_abertura DATE NOT NULL DEFAULT CURRENT_DATE, -- Para métrica Lean de Lead Time
    data_fechamento DATE, -- Preenchido ao fechar a venda
    status VARCHAR(50) NOT NULL DEFAULT 'em_negociacao', -- 'ganho', 'perdido', 'em_negociacao'
    motivo_perda TEXT, -- Para o PDCA (Kaizen) analisar causa raiz se status = 'perdido'
    playbook_checklist JSONB DEFAULT '[]'::jsonb, -- CRM checklists
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. TABELA ALERTAS ANDON (Gestão Visual Lean de Desvios)
CREATE TABLE IF NOT EXISTS public.alertas_andon (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    mensagem TEXT NOT NULL,
    resolvido BOOLEAN NOT NULL DEFAULT FALSE,
    tipo VARCHAR(50) NOT NULL DEFAULT 'faturamento' -- 'faturamento', 'lead_time', 'conversao'
);

-- 7. TABELA PDCA ACOES (Planos de Ação 5W2H para melhoria contínua)
CREATE TABLE IF NOT EXISTS public.pdca_acoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venda_id UUID REFERENCES public.vendas(id) ON DELETE SET NULL, -- Se originado de uma perda
    descricao TEXT NOT NULL, -- O quê (What)
    responsavel VARCHAR(255) NOT NULL, -- Quem (Who)
    prazo DATE NOT NULL, -- Quando (When)
    causa_raiz TEXT, -- Por quê (Why) - vindo dos 5 Porquês
    status VARCHAR(50) NOT NULL DEFAULT 'planejada', -- 'planejada', 'em_andamento', 'concluida'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =========================================================================
-- TRIGGERS E FUNÇÕES (Automatização e Integridade de Processos)
-- =========================================================================

-- Função disparada quando uma venda é marcada como GANHA
CREATE OR REPLACE FUNCTION public.handle_sale_won()
RETURNS TRIGGER AS $$
BEGIN
    -- Se o status mudou para 'ganho'
    IF NEW.status = 'ganho' AND (OLD.status IS NULL OR OLD.status != 'ganho') THEN
        -- 1. Cria uma transação financeira de ENTRADA automaticamente
        INSERT INTO public.transacoes (cliente_id, valor, tipo, categoria, data, status)
        VALUES (
            NEW.cliente_id,
            NEW.valor_contrato,
            'entrada',
            'Receita Comercial',
            COALESCE(NEW.data_fechamento, CURRENT_DATE),
            'confirmada'
        );

        -- 2. Garante que o cliente está com status ativo
        UPDATE public.clientes
        SET status = 'ativo'
        WHERE id = NEW.cliente_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar o trigger na tabela vendas
CREATE OR REPLACE TRIGGER trg_on_sale_won
    AFTER INSERT OR UPDATE ON public.vendas
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_sale_won();

-- =========================================================================
-- SEGURANÇA E RLS (Row Level Security)
-- =========================================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.vendedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alertas_andon ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdca_acoes ENABLE ROW LEVEL SECURITY;

-- 1. Políticas para VENDEDORES (Qualquer autenticado pode ler nomes, mas apenas gestor edita)
CREATE POLICY "Permitir leitura de vendedores para todos autenticados"
    ON public.vendedores FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Permitir inserção de vendedores apenas para gestores"
    ON public.vendedores FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.vendedores
            WHERE email = auth.jwt() ->> 'email' AND perfil = 'gestor'
        )
    );

CREATE POLICY "Permitir atualização de vendedores apenas para gestores"
    ON public.vendedores FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.vendedores
            WHERE email = auth.jwt() ->> 'email' AND perfil = 'gestor'
        )
    );

CREATE POLICY "Permitir deleção de vendedores apenas para gestores"
    ON public.vendedores FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.vendedores
            WHERE email = auth.jwt() ->> 'email' AND perfil = 'gestor'
        )
    );


-- 2. Políticas para CLIENTES (Todos autenticados podem ler e cadastrar clientes)
CREATE POLICY "Permitir leitura de clientes para todos autenticados"
    ON public.clientes FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Permitir inserção e atualização de clientes para autenticados"
    ON public.clientes FOR ALL
    TO authenticated
    USING (true);

-- 3. Políticas para TRANSAÇÕES (Gestor vê tudo e escreve; Vendedor não vê detalhes financeiros gerais do fluxo de caixa)
CREATE POLICY "Permitir tudo em transações apenas para gestores"
    ON public.transacoes FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.vendedores
            WHERE email = auth.jwt() ->> 'email' AND perfil = 'gestor'
        )
    );

-- 4. Políticas para METAS (Todos autenticados podem ver metas; Apenas gestor gerencia)
CREATE POLICY "Permitir leitura de metas para todos autenticados"
    ON public.metas FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Permitir gerenciamento de metas apenas para gestores"
    ON public.metas FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.vendedores
            WHERE email = auth.jwt() ->> 'email' AND perfil = 'gestor'
        )
    );

-- 5. Políticas para VENDAS (A regra principal de RLS pedida no teste técnico)
-- Vendedor só vê/edita as suas próprias vendas; Gestor vê e edita tudo.
CREATE POLICY "RLS Vendas: Acesso total para gestores ou acesso pessoal para vendedores"
    ON public.vendas FOR ALL
    TO authenticated
    USING (
        -- É gestor?
        EXISTS (
            SELECT 1 FROM public.vendedores
            WHERE email = auth.jwt() ->> 'email' AND perfil = 'gestor'
        )
        OR
        -- É o próprio vendedor dono do registro?
        vendedor_id IN (
            SELECT id FROM public.vendedores
            WHERE email = auth.jwt() ->> 'email'
        )
    );

-- 6. Políticas para ALERTAS ANDON (Todos autenticados leem; Gestor e automação escrevem)
CREATE POLICY "Permitir leitura de alertas andon para todos autenticados"
    ON public.alertas_andon FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Permitir escrita de alertas andon para gestor"
    ON public.alertas_andon FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.vendedores
            WHERE email = auth.jwt() ->> 'email' AND perfil = 'gestor'
        )
    );

-- 7. Políticas para PDCA ACOES (Todos autenticados podem ler e registrar ações corretivas)
CREATE POLICY "Permitir leitura e escrita de ações PDCA para todos autenticados"
    ON public.pdca_acoes FOR ALL
    TO authenticated
    USING (true);
