-- Seed SQL para o Banco de Dados da NovaPay
-- Insere dados históricos de teste para visualização completa no painel

-- Limpar dados existentes antes de popular (segurança para re-execução)
TRUNCATE TABLE public.pdca_acoes CASCADE;
TRUNCATE TABLE public.alertas_andon CASCADE;
TRUNCATE TABLE public.vendas CASCADE;
TRUNCATE TABLE public.transacoes CASCADE;
TRUNCATE TABLE public.metas CASCADE;
TRUNCATE TABLE public.clientes CASCADE;
TRUNCATE TABLE public.vendedores CASCADE;

-- 1. POPULAR VENDEDORES (Com UUIDs estáticos para facilitar relações)
INSERT INTO public.vendedores (id, nome, email, perfil) VALUES
('c0a80101-0000-0000-0000-000000000001', 'Carlos Vendedor', 'vendedor@novapay.com', 'vendedor'),
('c0a80101-0000-0000-0000-000000000002', 'Mariana Silva', 'vendedor2@novapay.com', 'vendedor'),
('c0a80101-0000-0000-0000-000000000003', 'Ana Gestora (Processos)', 'gestor@novapay.com', 'gestor');

-- 2. POPULAR CLIENTES (Clientes industriais, de varejo e serviços)
INSERT INTO public.clientes (id, nome, segmento, status) VALUES
('d0a80101-0000-0000-0000-000000000001', 'Supermercados Silva', 'Varejo', 'ativo'),
('d0a80101-0000-0000-0000-000000000002', 'Tech Solutions Ltda', 'Tecnologia', 'ativo'),
('d0a80101-0000-0000-0000-000000000003', 'Restaurante Bom Sabor', 'Alimentação', 'ativo'),
('d0a80101-0000-0000-0000-000000000004', 'Lojas Vestuário Elegância', 'Varejo', 'inativo'),
('d0a80101-0000-0000-0000-000000000005', 'Clínica Saúde & Vida', 'Serviços', 'ativo'),
('d0a80101-0000-0000-0000-000000000006', 'Construtora Forte Norte', 'Indústria/Construção', 'ativo'),
('d0a80101-0000-0000-0000-000000000007', 'Educacional Saber Digital', 'Serviços', 'ativo'),
('d0a80101-0000-0000-0000-000000000008', 'Logística Express Global', 'Logística', 'ativo');

-- 3. POPULAR METAS (Últimos 6 meses baseados em julho de 2026)
INSERT INTO public.metas (mes_referencia, meta_receita, meta_novos_clientes) VALUES
('2026-02-01', 70000.00, 7),
('2026-03-01', 75000.00, 7),
('2026-04-01', 80000.00, 8),
('2026-05-01', 85000.00, 8),
('2026-06-01', 90000.00, 9),
('2026-07-01', 100000.00, 10); -- Mês atual

-- 4. POPULAR TRANSACOES FINANCEIRAS HISTORICAS (Para o gráfico de 6 meses)
-- Ingressos de Receita Comercial e despesas operacionais da NovaPay
INSERT INTO public.transacoes (valor, tipo, categoria, data, status) VALUES
-- Fevereiro/2026 (Meta Receita: 70k)
(68000.00, 'entrada', 'Receita Comercial', '2026-02-28', 'confirmada'),
(32000.00, 'saida', 'Despesas Operacionais', '2026-02-15', 'confirmada'),
(5000.00, 'saida', 'Marketing', '2026-02-10', 'confirmada'),

-- Março/2026 (Meta Receita: 75k)
(74500.00, 'entrada', 'Receita Comercial', '2026-03-31', 'confirmada'),
(34000.00, 'saida', 'Despesas Operacionais', '2026-03-15', 'confirmada'),
(6000.00, 'saida', 'Marketing', '2026-03-10', 'confirmada'),

-- Abril/2026 (Meta Receita: 80k)
(83000.00, 'entrada', 'Receita Comercial', '2026-04-30', 'confirmada'),
(35000.00, 'saida', 'Despesas Operacionais', '2026-04-15', 'confirmada'),
(7000.00, 'saida', 'Marketing', '2026-04-10', 'confirmada'),

-- Maio/2026 (Meta Receita: 85k)
(82000.00, 'entrada', 'Receita Comercial', '2026-05-31', 'confirmada'),
(37000.00, 'saida', 'Despesas Operacionais', '2026-05-15', 'confirmada'),
(8000.00, 'saida', 'Marketing', '2026-05-10', 'confirmada'),

-- Junho/2026 (Meta Receita: 90k)
(94000.00, 'entrada', 'Receita Comercial', '2026-06-30', 'confirmada'),
(38000.00, 'saida', 'Despesas Operacionais', '2026-06-15', 'confirmada'),
(10000.00, 'saida', 'Marketing', '2026-06-10', 'confirmada');

-- Transações de Julho/2026 (Mês Atual - Serão adicionadas também via Trigger nas vendas)
INSERT INTO public.transacoes (valor, tipo, categoria, data, status) VALUES
(25000.00, 'entrada', 'Receita Comercial', '2026-07-02', 'confirmada'), -- Venda da Mariana
(12000.00, 'saida', 'Despesas Operacionais', '2026-07-02', 'confirmada'); -- Custo fixo do mês

-- 5. POPULAR VENDAS (Mapeia o pipeline e vendas do mês atual e anterior)
-- Temporada de Junho (Geralmente fechadas)
INSERT INTO public.vendas (vendedor_id, cliente_id, valor_contrato, data_abertura, data_fechamento, status) VALUES
('c0a80101-0000-0000-0000-000000000001', 'd0a80101-0000-0000-0000-000000000001', 15000.00, '2026-06-05', '2026-06-12', 'ganho'),
('c0a80101-0000-0000-0000-000000000001', 'd0a80101-0000-0000-0000-000000000003', 9000.00, '2026-06-10', '2026-06-18', 'ganho'),
('c0a80101-0000-0000-0000-000000000002', 'd0a80101-0000-0000-0000-000000000002', 30000.00, '2026-06-01', '2026-06-08', 'ganho'),
('c0a80101-0000-0000-0000-000000000002', 'd0a80101-0000-0000-0000-000000000004', 12000.00, '2026-06-15', '2026-06-25', 'perdido');

-- Vendas com motivo de perda para alimentar a análise de causa raiz (PDCA)
UPDATE public.vendas SET motivo_perda = 'Concorrente ofereceu taxas de maquininha menores no plano de adesão.' 
WHERE status = 'perdido';

-- Temporada de Julho (Mês Atual - Alguns fechados, outros em negociação)
-- Nota: Inserções com status 'ganho' dispararão automaticamente mais entradas na tabela de transações
INSERT INTO public.vendas (vendedor_id, cliente_id, valor_contrato, data_abertura, data_fechamento, status) VALUES
('c0a80101-0000-0000-0000-000000000002', 'd0a80101-0000-0000-0000-000000000005', 25000.00, '2026-06-25', '2026-07-02', 'ganho'), -- Vai rodar o trigger
('c0a80101-0000-0000-0000-000000000001', 'd0a80101-0000-0000-0000-000000000006', 15000.00, '2026-07-01', '2026-07-02', 'ganho'), -- Vai rodar o trigger
('c0a80101-0000-0000-0000-000000000001', 'd0a80101-0000-0000-0000-000000000007', 18000.00, '2026-06-20', NULL, 'em_negociacao'),
('c0a80101-0000-0000-0000-000000000002', 'd0a80101-0000-0000-0000-000000000008', 35000.00, '2026-06-15', NULL, 'em_negociacao'),
('c0a80101-0000-0000-0000-000000000001', 'd0a80101-0000-0000-0000-000000000002', 22000.00, '2026-06-22', '2026-07-01', 'perdido');

UPDATE public.vendas SET motivo_perda = 'Cliente optou por adiar a troca de integrador de pagamentos para o próximo ano devido à migração de ERP interno.'
WHERE status = 'perdido' AND data_fechamento = '2026-07-01';

-- 6. POPULAR ALERTAS ANDON (1 Alerta simulado do n8n para visualização visual)
INSERT INTO public.alertas_andon (mensagem, resolvido, tipo) VALUES
('Andon Alert: Faturamento acumulado de R$ 65.000,00 está abaixo do limiar crítico (70% da meta de R$ 100k) restando 10 dias.', FALSE, 'faturamento');

-- 7. POPULAR PLANOS DE AÇÃO PDCA (1 Ação de melhoria cadastrada baseada na perda do cliente ID 2)
INSERT INTO public.pdca_acoes (descricao, responsavel, prazo, causa_raiz, status) VALUES
('Elaborar proposta de carência de 3 meses nas taxas para competir com proposta concorrente.', 'Carlos Vendedor', '2026-07-10', 'Concorrente ofereceu taxas de maquininha menores no plano de adesão.', 'em_andamento');
