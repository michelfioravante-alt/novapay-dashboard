import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, Cell, PieChart, Pie
} from 'recharts';
import { 
  TrendingUp, TrendingDown, DollarSign, Target, UserCheck, AlertOctagon, 
  Clock, Plus, CheckCircle, RefreshCw, FileQuestion, ArrowRight, ClipboardList
} from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtext: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendText?: string;
}

function MetricCard({ title, value, subtext, icon, trend, trendText }: MetricCardProps) {
  return (
    <div className="glass-panel glass-panel-hover p-6 flex flex-col justify-between">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</p>
          <h3 className="text-2xl font-extrabold text-white mt-2 tracking-tight">{value}</h3>
        </div>
        <div className="h-10 w-10 rounded-xl bg-slate-800/80 border border-slate-700/50 flex items-center justify-center text-slate-300">
          {icon}
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-500">
        <span>{subtext}</span>
        {trend && (
          <span className={`flex items-center gap-1 font-bold ${
            trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-red-500' : 'text-slate-400'
          }`}>
            {trend === 'up' && <TrendingUp className="w-3.5 h-3.5" />}
            {trend === 'down' && <TrendingDown className="w-3.5 h-3.5" />}
            {trendText}
          </span>
        )}
      </div>
    </div>
  );
}

export default function GestorDashboard() {
  const [period, setPeriod] = useState<string>('2026-07'); // Mês atual por padrão
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Estados dos Dados Brutos do Banco
  const [vendas, setVendas] = useState<any[]>([]);
  const [transacoes, setTransacoes] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [metas, setMetas] = useState<any[]>([]);
  const [alertas, setAlertas] = useState<any[]>([]);
  const [acoes, setAcoes] = useState<any[]>([]);

  // Formulário 5 Porquês
  const [selectedVendaPerdida, setSelectedVendaPerdida] = useState<string>('');
  const [whys, setWhys] = useState<string[]>(['', '', '', '', '']);
  const [actionDesc, setActionDesc] = useState('');
  const [actionResponsavel, setActionResponsavel] = useState('');
  const [actionPrazo, setActionPrazo] = useState('');
  const [submittingKaizen, setSubmittingKaizen] = useState(false);

  // Formulário Ação Avulsa 5W2H
  const [newActionWhat, setNewActionWhat] = useState('');
  const [newActionWho, setNewActionWho] = useState('');
  const [newActionWhen, setNewActionWhen] = useState('');
  const [newActionWhy, setNewActionWhy] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  // Função para carregar todos os dados do Supabase
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      const [
        { data: resVendas },
        { data: resTransacoes },
        { data: resClientes },
        { data: resVendedores },
        { data: resMetas },
        { data: resAlertas },
        { data: resAcoes }
      ] = await Promise.all([
        supabase.from('vendas').select('*, vendedores(nome), clientes(nome)'),
        supabase.from('transacoes').select('*, clientes(nome)'),
        supabase.from('clientes').select('*'),
        supabase.from('vendedores').select('*'),
        supabase.from('metas').select('*'),
        supabase.from('alertas_andon').select('*').order('data', { ascending: false }),
        supabase.from('pdca_acoes').select('*').order('created_at', { ascending: false })
      ]);

      setVendas(resVendas || []);
      setTransacoes(resTransacoes || []);
      setClientes(resClientes || []);
      setVendedores(resVendedores || []);
      setMetas(resMetas || []);
      setAlertas(resAlertas || []);
      setAcoes(resAcoes || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handler de atualização manual
  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // =========================================================================
  // PROCESSAMENTO DE INDICADORES COM FILTRO DE PERÍODO (MONTH / QUARTER)
  // =========================================================================

  // Função utilitária para verificar se a data está no período selecionado
  const isInPeriod = useCallback((dateStr: string) => {
    if (!dateStr) return false;
    const dateObj = new Date(dateStr);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    
    if (period === 'Q2-2026') {
      // Q2 = Abril, Maio, Junho
      return year === 2026 && ['04', '05', '06'].includes(month);
    } else {
      // Formato YYYY-MM
      return `${year}-${month}` === period;
    }
  }, [period]);

  // 1. Filtragem das Metas do Período
  const activeGoals = metas.filter(m => {
    const metaDate = new Date(m.mes_referencia);
    const year = metaDate.getFullYear();
    const month = String(metaDate.getMonth() + 1).padStart(2, '0');
    if (period === 'Q2-2026') {
      return year === 2026 && ['04', '05', '06'].includes(month);
    }
    return `${year}-${month}` === period;
  });

  const metaReceitaTotal = activeGoals.reduce((acc, m) => acc + Number(m.meta_receita), 0);
  const metaNovosClientesTotal = activeGoals.reduce((acc, m) => acc + m.meta_novos_clientes, 0);

  // 2. Filtragem de Vendas no período
  const filteredVendas = vendas.filter(v => isInPeriod(v.data_fechamento || v.data_abertura));
  const wonVendas = filteredVendas.filter(v => v.status === 'ganho');
  const lostVendas = filteredVendas.filter(v => v.status === 'perdido');

  // 3. Filtragem de Transações no período
  const filteredTransacoes = transacoes.filter(t => isInPeriod(t.data));
  const totalEntradas = filteredTransacoes
    .filter(t => t.tipo === 'entrada' && t.status === 'confirmada')
    .reduce((acc, t) => acc + Number(t.valor), 0);
  const totalSaidas = filteredTransacoes
    .filter(t => t.tipo === 'saida' && t.status === 'confirmada')
    .reduce((acc, t) => acc + Number(t.valor), 0);

  // 4. Saldo Operacional e Ticket Médio
  const saldoOperacional = totalEntradas - totalSaidas;
  const ticketMedio = wonVendas.length > 0 ? (totalEntradas / wonVendas.length) : 0;

  // 5. Clientes cadastrados no período (Novos Clientes)
  const novosClientesCadastrados = clientes.filter(c => isInPeriod(c.data_cadastro)).length;

  // 6. Taxa de Conversão do Funil Comercial
  const totalOportunidades = filteredVendas.length;
  const conversionRate = totalOportunidades > 0 ? (wonVendas.length / totalOportunidades) * 100 : 0;

  // 7. Métrica Lean: Lead Time Comercial Médio (Tempo de fechamento em dias)
  const closedVendas = filteredVendas.filter(v => v.data_fechamento && (v.status === 'ganho' || v.status === 'perdido'));
  const leadTimeMedio = closedVendas.length > 0 
    ? closedVendas.reduce((acc, v) => {
        const start = new Date(v.data_abertura).getTime();
        const end = new Date(v.data_fechamento).getTime();
        const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        return acc + diffDays;
      }, 0) / closedVendas.length
    : 0;

  // 8. Ranking de Vendedores (Por valor fechado)
  const rankingVendedores = vendedores.map(vend => {
    const totalFechado = vendas
      .filter(v => v.vendedor_id === vend.id && v.status === 'ganho' && isInPeriod(v.data_fechamento))
      .reduce((acc, v) => acc + Number(v.valor_contrato), 0);
    return {
      nome: vend.nome,
      valor: totalFechado
    };
  }).sort((a, b) => b.valor - a.valor);

  // 9. Top 5 Clientes por Faturamento no período
  const clientBillingMap: { [key: string]: { nome: string; valor: number; segmento: string } } = {};
  filteredTransacoes
    .filter(t => t.tipo === 'entrada' && t.status === 'confirmada' && t.cliente_id)
    .forEach(t => {
      const cid = t.cliente_id;
      const val = Number(t.valor);
      const cname = t.clientes?.nome || 'Cliente Desconhecido';
      const cseg = t.clientes?.segmento || 'Não especificado';
      if (!clientBillingMap[cid]) {
        clientBillingMap[cid] = { nome: cname, valor: 0, segmento: cseg };
      }
      clientBillingMap[cid].valor += val;
    });
  const top5Clientes = Object.values(clientBillingMap)
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 5);

  // 10. Pipeline de Vendas (Status counts)
  const countNegociacao = filteredVendas.filter(v => v.status === 'em_negociacao').length;
  const countGanho = wonVendas.length;
  const countPerdido = lostVendas.length;
  
  const pipelineData = [
    { name: 'Em Negociação', value: countNegociacao, color: '#f59e0b' },
    { name: 'Ganhos', value: countGanho, color: '#10b981' },
    { name: 'Perdidos', value: countPerdido, color: '#ef4444' }
  ];

  // 11. Gráfico Histórico de 6 Meses (Linha/Área)
  // Agrupa entradas e saídas confirmadas nos últimos 6 meses (Fevereiro a Julho de 2026)
  const mesesHistoricos = ['2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07'];
  const chartHistoricoData = mesesHistoricos.map(m => {
    const transDoMes = transacoes.filter(t => {
      const d = new Date(t.data);
      const y = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, '0');
      return `${y}-${mo}` === m;
    });
    const ent = transDoMes.filter(t => t.tipo === 'entrada' && t.status === 'confirmada').reduce((acc, t) => acc + Number(t.valor), 0);
    const sai = transDoMes.filter(t => t.tipo === 'saida' && t.status === 'confirmada').reduce((acc, t) => acc + Number(t.valor), 0);
    
    // Traduz o mês para exibição
    const [_, mesNum] = m.split('-');
    const nomesMeses: { [key: string]: string } = {
      '02': 'Fev', '03': 'Mar', '04': 'Abr', '05': 'Mai', '06': 'Jun', '07': 'Jul'
    };
    return {
      mesLabel: nomesMeses[mesNum],
      Faturamento: ent,
      Despesas: sai,
      Lucro: ent - sai
    };
  });

  // =========================================================================
  // SUBMISSÃO DE PLANOS DE AÇÃO (PDCA)
  // =========================================================================

  // Submeter Análise de 5 Porquês e gerar Ação Corretiva
  const handleKaizenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendaPerdida || !actionDesc || !actionResponsavel || !actionPrazo) return;

    setSubmittingKaizen(true);
    try {
      const rootCause = whys.filter(w => w.trim() !== '').pop() || 'Causa raiz não detalhada';
      const causaCadeia = whys.filter(w => w.trim() !== '').join(' -> ');

      // 1. Atualizar a venda com o motivo de perda detalhado (causa raiz)
      await supabase
        .from('vendas')
        .update({ motivo_perda: causaCadeia })
        .eq('id', selectedVendaPerdida);

      // 2. Inserir a Ação Corretiva no Plano de Ação 5W2H
      const { error: actionError } = await supabase
        .from('pdca_acoes')
        .insert([
          {
            venda_id: selectedVendaPerdida,
            descricao: actionDesc,
            responsavel: actionResponsavel,
            prazo: actionPrazo,
            causa_raiz: rootCause,
            status: 'planejada'
          }
        ]);

      if (actionError) throw actionError;

      // Limpar formulário
      setSelectedVendaPerdida('');
      setWhys(['', '', '', '', '']);
      setActionDesc('');
      setActionResponsavel('');
      setActionPrazo('');
      
      // Recarregar dados
      loadData();
    } catch (error) {
      console.error('Erro ao registrar Kaizen:', error);
    } finally {
      setSubmittingKaizen(false);
    }
  };

  // Submeter Ação Avulsa (5W2H)
  const handleActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActionWhat || !newActionWho || !newActionWhen || !newActionWhy) return;

    setSubmittingAction(true);
    try {
      const { error } = await supabase
        .from('pdca_acoes')
        .insert([
          {
            descricao: newActionWhat,
            responsavel: newActionWho,
            prazo: newActionWhen,
            causa_raiz: newActionWhy,
            status: 'planejada'
          }
        ]);

      if (error) throw error;

      // Limpar formulário
      setNewActionWhat('');
      setNewActionWho('');
      setNewActionWhen('');
      setNewActionWhy('');

      loadData();
    } catch (error) {
      console.error('Erro ao registrar ação:', error);
    } finally {
      setSubmittingAction(false);
    }
  };

  // Mudar Status da Ação (PDCA)
  const handleToggleActionStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'planejada' ? 'em_andamento' : currentStatus === 'em_andamento' ? 'concluida' : 'planejada';
    try {
      await supabase
        .from('pdca_acoes')
        .update({ status: nextStatus })
        .eq('id', id);
      
      loadData();
    } catch (error) {
      console.error('Erro ao atualizar status da ação:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12">
        <div className="h-8 w-8 rounded-full border-4 border-slate-800 border-t-brand-500 animate-spin"></div>
        <p className="text-slate-400 text-sm mt-3">Carregando métricas organizacionais...</p>
      </div>
    );
  }

  // Filtrar vendas perdidas que ainda não têm análise no PDCA
  const vendasPerdidasDisponiveis = vendas.filter(v => v.status === 'perdido');

  // Porcentagens vs Meta
  const pctReceita = metaReceitaTotal > 0 ? (totalEntradas / metaReceitaTotal) * 100 : 0;
  const pctClientes = metaNovosClientesTotal > 0 ? (novosClientesCadastrados / metaNovosClientesTotal) * 100 : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Barra de Filtros de Período e Andon Light */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Painel Gestor</span>
          <div className="h-4 w-px bg-slate-800 hidden md:block"></div>
          <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1">
            <button
              id="filter-period-july"
              onClick={() => setPeriod('2026-07')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                period === '2026-07' ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Julho (Atual)
            </button>
            <button
              id="filter-period-june"
              onClick={() => setPeriod('2026-06')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                period === '2026-06' ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Junho
            </button>
            <button
              id="filter-period-may"
              onClick={() => setPeriod('2026-05')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                period === '2026-05' ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Maio
            </button>
            <button
              id="filter-period-q2"
              onClick={() => setPeriod('Q2-2026')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                period === 'Q2-2026' ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              2º Trimestre (Q2)
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="btn-refresh-data"
            onClick={handleRefresh}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition-all flex items-center justify-center gap-2"
            title="Atualizar Dados"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          {/* Andon Status Light */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-950 border border-slate-800">
            <span className="andon-indicator">
              <span className={`andon-indicator-ring ${
                pctReceita >= 95 ? 'bg-emerald-500' : pctReceita >= 70 ? 'bg-amber-500' : 'bg-red-500'
              }`}></span>
              <span className={`andon-indicator-dot ${
                pctReceita >= 95 ? 'bg-emerald-500' : pctReceita >= 70 ? 'bg-amber-500' : 'bg-red-500'
              }`}></span>
            </span>
            <span className="text-xs font-bold text-slate-300">
              Andon: {pctReceita >= 95 ? 'Fluxo Estável (Verde)' : pctReceita >= 70 ? 'Atenção (Amarelo)' : 'Intervenção Exigida (Vermelho)'}
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SEÇÃO PLAN (Planejar) - Metas Estabelecidas
          ========================================================================= */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-brand-500 uppercase tracking-widest flex items-center gap-1.5">
          <Target className="w-4 h-4" /> PLAN (Planejar) — Objetivos do Período
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="glass-panel p-5 flex items-center justify-between border-slate-700/50">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Meta de Faturamento Estimada</p>
              <h4 className="text-xl font-black text-white mt-1">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metaReceitaTotal)}
              </h4>
            </div>
            <div className="h-10 w-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 font-bold">
              $
            </div>
          </div>
          <div className="glass-panel p-5 flex items-center justify-between border-slate-700/50">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Meta de Novos Clientes</p>
              <h4 className="text-xl font-black text-white mt-1">{metaNovosClientesTotal} clientes</h4>
            </div>
            <div className="h-10 w-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 font-bold">
              #
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SEÇÃO DO & CHECK (Executar & Checar) - KPIs de Performance Financeira e Comercial
          ========================================================================= */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold text-brand-500 uppercase tracking-widest flex items-center gap-1.5">
          <ClipboardList className="w-4 h-4" /> DO & CHECK (Executar & Checar) — Análise de Resultados
        </h2>

        {/* Alertas Andon Ativos (se houver) */}
        {alertas.filter(a => !a.resolvido).length > 0 && (
          <div className="glass-panel border-red-500/30 bg-red-950/20 p-5 space-y-3">
            <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
              <AlertOctagon className="w-4.5 h-4.5 animate-pulse" />
              <span>Painel de Anomalias Ativas (Andon Alert)</span>
            </div>
            <div className="space-y-2">
              {alertas.filter(a => !a.resolvido).map(alerta => (
                <div key={alerta.id} className="text-xs text-red-200/90 leading-relaxed bg-red-500/5 p-3 rounded-lg border border-red-500/10 flex items-center justify-between">
                  <span>{alerta.mensagem}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/20 border border-red-500/40 text-red-300 font-mono uppercase">n8n trigger</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cards de Métricas Principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Receita Realizada"
            value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalEntradas)}
            subtext={`${pctReceita.toFixed(1)}% atingido da meta`}
            icon={<DollarSign className="w-5 h-5 text-emerald-500" />}
            trend={pctReceita >= 95 ? 'up' : pctReceita >= 70 ? 'neutral' : 'down'}
            trendText={pctReceita >= 100 ? 'Meta Superada' : `${pctReceita.toFixed(0)}%`}
          />
          <MetricCard
            title="Ticket Médio"
            value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(ticketMedio)}
            subtext="Média por contrato fechado"
            icon={<Target className="w-5 h-5 text-brand-500" />}
          />
          <MetricCard
            title="Saldo Operacional"
            value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(saldoOperacional)}
            subtext={`Despesas totais: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalSaidas)}`}
            icon={<TrendingUp className={`w-5 h-5 ${saldoOperacional >= 0 ? 'text-emerald-500' : 'text-red-500'}`} />}
            trend={saldoOperacional >= 0 ? 'up' : 'down'}
            trendText={saldoOperacional >= 0 ? 'Positivo' : 'Déficit'}
          />
          <MetricCard
            title="Novos Clientes"
            value={`${novosClientesCadastrados} clientes`}
            subtext={`${pctClientes.toFixed(1)}% atingido da meta`}
            icon={<UserCheck className="w-5 h-5 text-emerald-500" />}
            trend={pctClientes >= 100 ? 'up' : 'neutral'}
            trendText={`${novosClientesCadastrados}/${metaNovosClientesTotal}`}
          />
        </div>

        {/* Gráfico de Histórico e Pipeline */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Gráfico de Evolução 6 Meses */}
          <div className="glass-panel p-6 lg:col-span-2 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">Fluxo de Caixa Acumulado (Últimos 6 meses)</h3>
              <p className="text-xs text-slate-500 mt-0.5">Visão histórica consolidada de Faturamento e Despesas Operacionais</p>
            </div>
            <div className="h-72 w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartHistoricoData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorFat" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0284c7" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#0284c7" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorDesp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="mesLabel" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f1f5f9' }} />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Area type="monotone" dataKey="Faturamento" name="Faturamento (Entradas)" stroke="#0284c7" strokeWidth={2.5} fillOpacity={1} fill="url(#colorFat)" />
                  <Area type="monotone" dataKey="Despesas" name="Despesas (Saídas)" stroke="#ef4444" strokeWidth={1.5} fillOpacity={1} fill="url(#colorDesp)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráfico do Pipeline de Vendas */}
          <div className="glass-panel p-6 space-y-4 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">Pipeline de Vendas (Funil Comercial)</h3>
              <p className="text-xs text-slate-500 mt-0.5">Distribuição do status das negociações do período</p>
            </div>
            
            <div className="h-44 w-full flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                     data={pipelineData}
                     cx="50%"
                     cy="50%"
                     innerRadius={50}
                     outerRadius={70}
                     paddingAngle={3}
                     dataKey="value"
                  >
                    {pipelineData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f1f5f9' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-xs text-slate-500 font-bold uppercase leading-none">Total</span>
                <span className="text-2xl font-black text-white mt-1">{totalOportunidades}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs border-t border-slate-800/80 pt-4">
              {pipelineData.map(entry => (
                <div key={entry.name}>
                  <div className="flex items-center justify-center gap-1.5 text-slate-400">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
                    <span className="text-[10px] font-bold uppercase tracking-wider">{entry.name}</span>
                  </div>
                  <p className="text-base font-extrabold text-white mt-1">{entry.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tabelas de Qualidade e Processos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top 5 Clientes por Faturamento e Conversão */}
          <div className="glass-panel p-6 space-y-4">
            <h3 className="text-sm font-bold text-white tracking-tight">Top 5 Clientes por Faturamento</h3>
            {top5Clientes.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500 uppercase tracking-widest font-bold">
                      <th className="py-3 pr-4">Cliente</th>
                      <th className="py-3 px-4">Segmento</th>
                      <th className="py-3 pl-4 text-right">Faturamento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300 font-medium">
                    {top5Clientes.map((client, index) => (
                      <tr key={index} className="hover:bg-slate-900/40 transition-colors">
                        <td className="py-3.5 pr-4 text-white font-semibold">{client.nome}</td>
                        <td className="py-3.5 px-4">{client.segmento}</td>
                        <td className="py-3.5 pl-4 text-right text-emerald-400 font-bold font-mono">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(client.valor)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-6 text-center">Nenhuma transação comercial no período.</p>
            )}
          </div>

          {/* Ranking e Fluxo (Lead Time / Conversão) */}
          <div className="glass-panel p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white tracking-tight">Ranking Comercial de Vendedores</h3>
              <div className="flex items-center gap-1 bg-slate-950/60 px-2.5 py-1 rounded-lg border border-slate-800 text-[10px] font-mono text-slate-400 font-bold uppercase">
                <Clock className="w-3.5 h-3.5 text-brand-500" /> Lead Time Médio: {leadTimeMedio.toFixed(1)} dias
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-1">
              <div className="bg-slate-950/40 border border-slate-800/80 p-4 rounded-xl text-center">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Oportunidades</span>
                <span className="text-xl font-extrabold text-white mt-1 block">{totalOportunidades}</span>
              </div>
              <div className="bg-slate-950/40 border border-slate-800/80 p-4 rounded-xl text-center">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Conversão</span>
                <span className="text-xl font-extrabold text-emerald-400 mt-1 block">{conversionRate.toFixed(1)}%</span>
              </div>
              <div className="bg-slate-950/40 border border-slate-800/80 p-4 rounded-xl text-center">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Lead Time Fechamento</span>
                <span className="text-xl font-extrabold text-brand-400 mt-1 block">{leadTimeMedio.toFixed(1)} d</span>
              </div>
            </div>

            {/* Lista Leaderboard */}
            <div className="space-y-3.5">
              {rankingVendedores.map((vend, index) => (
                <div key={index} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className={`h-6 w-6 rounded-lg flex items-center justify-center font-bold text-[10px] ${
                      index === 0 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {index + 1}
                    </span>
                    <span className="font-semibold text-slate-200">{vend.nome}</span>
                  </div>
                  <span className="font-extrabold font-mono text-slate-100">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(vend.valor)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SEÇÃO ACT (Agir) - Melhoria Contínua & Kaizen
          ========================================================================= */}
      <div className="space-y-6">
        <h2 className="text-xs font-bold text-brand-500 uppercase tracking-widest flex items-center gap-1.5">
          <RefreshCw className="w-4 h-4" /> ACT (Agir/Ajustar) — Gestão de Melhoria Contínua (Kaizen)
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Análise de 5 Porquês para Vendas Perdidas */}
          <div className="glass-panel p-6 lg:col-span-1 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                <FileQuestion className="w-4 h-4 text-brand-400" /> Método dos 5 Porquês
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Analise desvios no fluxo de conversão (vendas perdidas)</p>
            </div>

            <form onSubmit={handleKaizenSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="venda-perdida-select" className="text-xs font-semibold text-slate-300">Selecione uma Oportunidade Perdida</label>
                <select
                  id="venda-perdida-select"
                  required
                  value={selectedVendaPerdida}
                  onChange={(e) => setSelectedVendaPerdida(e.target.value)}
                  className="w-full glass-input text-xs"
                >
                  <option value="">Selecione...</option>
                  {vendasPerdidasDisponiveis.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.clientes?.nome} - {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v.valor_contrato)} ({v.vendedores?.nome})
                    </option>
                  ))}
                </select>
              </div>

              {selectedVendaPerdida && (
                <div className="space-y-3.5 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                  <p className="text-[10px] font-bold text-brand-400 uppercase tracking-wider mb-2">Desdobramento da Causa Raiz</p>
                  
                  {whys.map((why, index) => (
                    <div key={index} className="space-y-1">
                      <label htmlFor={`why-${index}`} className="text-[10px] font-bold text-slate-500 uppercase">{index + 1}º Porquê?</label>
                      <input
                        id={`why-${index}`}
                        type="text"
                        required={index === 0}
                        placeholder={index === 0 ? "Por que o cliente recusou?" : "Por que isso ocorreu?"}
                        value={why}
                        onChange={(e) => {
                          const newWhys = [...whys];
                          newWhys[index] = e.target.value;
                          setWhys(newWhys);
                        }}
                        className="w-full bg-slate-900 border border-slate-800/80 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-brand-500"
                      />
                    </div>
                  ))}

                  <div className="h-px bg-slate-800 my-4"></div>
                  <p className="text-[10px] font-bold text-brand-400 uppercase tracking-wider mb-2">Plano de Contenção (5W2H)</p>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label htmlFor="action-desc" className="text-[10px] font-bold text-slate-500 uppercase">Ação Corretiva (O quê?)</label>
                      <input
                        id="action-desc"
                        type="text"
                        required
                        placeholder="Ex: Formular plano de discounts estruturados"
                        value={actionDesc}
                        onChange={(e) => setActionDesc(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800/80 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-brand-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label htmlFor="action-resp" className="text-[10px] font-bold text-slate-500 uppercase">Quem?</label>
                        <input
                          id="action-resp"
                          type="text"
                          required
                          placeholder="Ex: Carlos"
                          value={actionResponsavel}
                          onChange={(e) => setActionResponsavel(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800/80 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-brand-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label htmlFor="action-deadline" className="text-[10px] font-bold text-slate-500 uppercase">Quando?</label>
                        <input
                          id="action-deadline"
                          type="date"
                          required
                          value={actionPrazo}
                          onChange={(e) => setActionPrazo(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800/80 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-brand-500"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    id="btn-submit-kaizen"
                    type="submit"
                    disabled={submittingKaizen}
                    className="w-full btn-primary py-2.5 text-xs mt-4 flex items-center justify-center gap-1.5"
                  >
                    {submittingKaizen ? 'Registrando...' : (
                      <>
                        Registrar Ação PDCA <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Quadro de Ações PDCA / 5W2H */}
          <div className="glass-panel p-6 lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                  <ClipboardList className="w-4 h-4 text-brand-400" /> Quadro de Planos de Ação (5W2H)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Ações para mitigação de perdas e melhoria contínua de processos</p>
              </div>
            </div>

            {acoes.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500 uppercase tracking-widest font-bold">
                      <th className="py-2.5 pr-2">Ação (O quê)</th>
                      <th className="py-2.5 px-2">Causa Raiz (Porquê)</th>
                      <th className="py-2.5 px-2">Responsável</th>
                      <th className="py-2.5 px-2">Prazo</th>
                      <th className="py-2.5 pl-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40 text-slate-300 font-medium">
                    {acoes.map((acao) => (
                      <tr key={acao.id} className="hover:bg-slate-900/30 transition-colors">
                        <td className="py-3 pr-2 text-white font-semibold leading-relaxed">{acao.descricao}</td>
                        <td className="py-3 px-2 text-slate-400 leading-normal max-w-[200px] truncate" title={acao.causa_raiz}>{acao.causa_raiz}</td>
                        <td className="py-3 px-2 font-semibold text-slate-200">{acao.responsavel}</td>
                        <td className="py-3 px-2 font-mono text-slate-400">{new Date(acao.prazo).toLocaleDateString('pt-BR')}</td>
                        <td className="py-3 pl-2 text-center">
                          <button
                            id={`btn-toggle-action-${acao.id}`}
                            onClick={() => handleToggleActionStatus(acao.id, acao.status)}
                            className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-all ${
                              acao.status === 'concluida' 
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                                : acao.status === 'em_andamento'
                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                                : 'bg-slate-800 border-slate-700 text-slate-400'
                            }`}
                          >
                            {acao.status === 'concluida' ? 'Concluída' : acao.status === 'em_andamento' ? 'Em Andamento' : 'Planejada'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-12 text-center">Nenhum plano de ação registrado no quadro PDCA.</p>
            )}

            {/* Cadastro Rápido de Ação Avulsa */}
            <div className="h-px bg-slate-800/80 my-4"></div>
            <form onSubmit={handleActionSubmit} className="space-y-3 bg-slate-950/20 p-4 rounded-xl border border-slate-800/60">
              <p className="text-[10px] font-bold text-brand-400 uppercase tracking-wider flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Adicionar Ação Corretiva Avulsa (5W2H)
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="new-action-what" className="text-[10px] font-bold text-slate-500 uppercase">O quê (Ação)?</label>
                  <input
                     id="new-action-what"
                     type="text"
                     required
                     placeholder="Descrição da ação de melhoria"
                     value={newActionWhat}
                     onChange={(e) => setNewActionWhat(e.target.value)}
                     className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="new-action-why" className="text-[10px] font-bold text-slate-500 uppercase">Por quê (Causa Raiz)?</label>
                  <input
                     id="new-action-why"
                     type="text"
                     required
                     placeholder="Qual a causa identificada?"
                     value={newActionWhy}
                     onChange={(e) => setNewActionWhy(e.target.value)}
                     className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                <div className="space-y-1">
                  <label htmlFor="new-action-who" className="text-[10px] font-bold text-slate-500 uppercase">Quem?</label>
                  <input
                     id="new-action-who"
                     type="text"
                     required
                     placeholder="Responsável"
                     value={newActionWho}
                     onChange={(e) => setNewActionWho(e.target.value)}
                     className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="new-action-when" className="text-[10px] font-bold text-slate-500 uppercase">Quando?</label>
                  <input
                     id="new-action-when"
                     type="date"
                     required
                     value={newActionWhen}
                     onChange={(e) => setNewActionWhen(e.target.value)}
                     className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-brand-500"
                  />
                </div>
                <button
                  id="btn-add-action-submit"
                  type="submit"
                  disabled={submittingAction}
                  className="btn-primary py-2 text-xs h-9 flex items-center justify-center gap-1"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  {submittingAction ? 'Salvando...' : 'Salvar Ação'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
