import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, Cell, PieChart, Pie
} from 'recharts';
import { 
  TrendingUp, DollarSign, Target, UserCheck, AlertOctagon, 
  Clock, Plus, CheckCircle, RefreshCw, FileQuestion, ArrowRight, ClipboardList, Edit2, X
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
    <div className="bg-[#14181A] border-r border-b border-[#23282B] p-6 flex flex-col justify-between">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</p>
          <h3 className="text-2xl font-extrabold text-white mt-2 tracking-tight font-mono">{value}</h3>
        </div>
        <div className="h-10 w-10 border border-[#23282B] bg-[#0E1113] flex items-center justify-center text-slate-300 flex-shrink-0">
          {icon}
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-[#23282B] flex items-center justify-between text-xs text-slate-500">
        <span>{subtext}</span>
        {trend && (
          <span className={`flex items-center gap-1 font-bold font-mono ${
            trend === 'up' ? 'text-[#7FA88C]' : trend === 'down' ? 'text-[#B5504B]' : 'text-slate-400'
          }`}>
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

  // Navegação Mobile (Aparência de App)
  const [mobileTab, setMobileTab] = useState<'dashboard' | 'whys' | 'actions'>('dashboard');

  // Estados de Edição de Metas (Gestor)
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [inputMetaReceita, setInputMetaReceita] = useState('');
  const [inputMetaClientes, setInputMetaClientes] = useState('');
  const [submittingGoal, setSubmittingGoal] = useState(false);
  const [goalModalError, setGoalModalError] = useState<string | null>(null);

  // Estados dos Dados Brutos do Banco
  const [vendas, setVendas] = useState<any[]>([]);
  const [transacoes, setTransacoes] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [alertas, setAlertas] = useState<any[]>([]);
  const [acoes, setAcoes] = useState<any[]>([]);
  const [metas, setMetas] = useState<any[]>([]);

  // Estados dos Formulários Kaizen
  const [selectedVendaPerdida, setSelectedVendaPerdida] = useState('');
  const [whys, setWhys] = useState(['', '', '', '', '']); // 5 Níveis de Causa Raiz
  const [actionDesc, setActionDesc] = useState('');
  const [actionResponsavel, setActionResponsavel] = useState('');
  const [actionPrazo, setActionPrazo] = useState('');
  const [submittingKaizen, setSubmittingKaizen] = useState(false);

  // Estados de Cadastro Rápido de Ação Avulsa (5W2H)
  const [newActionWhat, setNewActionWhat] = useState('');
  const [newActionWhy, setNewActionWhy] = useState('');
  const [newActionWho, setNewActionWho] = useState('');
  const [newActionWhen, setNewActionWhen] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // 1. Carregar vendas
      const { data: salesData, error: salesError } = await supabase
        .from('vendas')
        .select('*, clientes(nome, segmento), vendedores(nome)');
      if (salesError) throw salesError;
      setVendas(salesData || []);

      // 2. Carregar transações (Fluxo de Caixa)
      const { data: transData, error: transError } = await supabase
        .from('transacoes')
        .select('*');
      if (transError) throw transError;
      setTransacoes(transData || []);

      // 3. Carregar clientes
      const { data: clientsData, error: clientsError } = await supabase
        .from('clientes')
        .select('*');
      if (clientsError) throw clientsError;
      setClientes(clientsData || []);

      // 4. Carregar alertas Andon
      const { data: alertsData, error: alertsError } = await supabase
        .from('alertas_andon')
        .select('*')
        .order('created_at', { ascending: false });
      if (alertsError) throw alertsError;
      setAlertas(alertsData || []);

      // 5. Carregar Ações PDCA
      const { data: actionsData, error: actionsError } = await supabase
        .from('pdca_acoes')
        .select('*')
        .order('created_at', { ascending: false });
      if (actionsError) throw actionsError;
      setAcoes(actionsData || []);

      // 6. Carregar metas corporativas
      const { data: goalsData, error: goalsError } = await supabase
        .from('metas')
        .select('*');
      if (goalsError) throw goalsError;
      setMetas(goalsData || []);

    } catch (err: any) {
      console.error('Erro ao carregar dados organizacionais:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
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

  // Abrir Modal de Edição de Metas
  const openGoalModal = () => {
    const activeGoal = activeGoals[0];
    setInputMetaReceita(activeGoal ? activeGoal.meta_receita.toString() : '0');
    setInputMetaClientes(activeGoal ? activeGoal.meta_novos_clientes.toString() : '0');
    setGoalModalError(null);
    setIsGoalModalOpen(true);
  };

  // Salvar / Atualizar Metas
  const handleGoalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (period === 'Q2-2026') return;

    setSubmittingGoal(true);
    setGoalModalError(null);

    try {
      const { error } = await supabase
        .from('metas')
        .upsert([
          {
            mes_referencia: `${period}-01`,
            meta_receita: parseFloat(inputMetaReceita),
            meta_novos_clientes: parseInt(inputMetaClientes)
          }
        ], { onConflict: 'mes_referencia' });

      if (error) throw error;

      setIsGoalModalOpen(false);
      loadData();
    } catch (err: any) {
      console.error(err);
      setGoalModalError(err.message || 'Erro ao atualizar metas corporativas.');
    } finally {
      setSubmittingGoal(false);
    }
  };

  // Filtragem Dinâmica por Período
  const filterByPeriod = useCallback((items: any[], dateField: string) => {
    if (period === 'Q2-2026') {
      // Q2 = Abril, Maio, Junho de 2026
      return items.filter(item => {
        const dateVal = item[dateField];
        if (!dateVal) return false;
        const cleanDate = dateVal.split('T')[0];
        return cleanDate >= '2026-04-01' && cleanDate <= '2026-06-30';
      });
    } else {
      // Período mensal simples (YYYY-MM)
      return items.filter(item => {
        const dateVal = item[dateField];
        if (!dateVal) return false;
        return dateVal.startsWith(period);
      });
    }
  }, [period]);

  // Obter Metas para o Período Selecionado
  const activeGoals = (() => {
    if (period === 'Q2-2026') {
      // Agregar metas de Abril (04), Maio (05) e Junho (06)
      const q2Months = ['2026-04', '2026-05', '2026-06'];
      const filtered = metas.filter(m => q2Months.some(month => m.mes_referencia.startsWith(month)));
      return [{
        meta_receita: filtered.reduce((acc, curr) => acc + curr.meta_receita, 0) || 120000.00, // Fallback se não configurado
        meta_novos_clientes: filtered.reduce((acc, curr) => acc + curr.meta_novos_clientes, 0) || 30
      }];
    }
    const filtered = metas.filter(m => m.mes_referencia.startsWith(period));
    if (filtered.length > 0) return filtered;
    
    // Fallback padrão se não configurado no banco para o mês
    return [{
      meta_receita: period === '2026-06' ? 50000.00 : 60000.00,
      meta_novos_clientes: period === '2026-06' ? 15 : 20
    }];
  })();

  const metaReceitaTotal = activeGoals[0].meta_receita;
  const metaNovosClientesTotal = activeGoals[0].meta_novos_clientes;

  // Filtrar dados do período
  const periodVendas = filterByPeriod(vendas, 'data_abertura');
  const periodTrans = filterByPeriod(transacoes, 'data');
  const periodClientes = filterByPeriod(clientes, 'created_at');

  // 1. Receita Realizada (Entradas confirmadas no fluxo de caixa no período)
  const totalEntradas = periodTrans
    .filter(t => t.tipo === 'entrada')
    .reduce((acc, t) => acc + Number(t.valor), 0);

  // 2. Despesas Operacionais (Saídas confirmadas no fluxo de caixa no período)
  const totalSaidas = periodTrans
    .filter(t => t.tipo === 'saida')
    .reduce((acc, t) => acc + Number(t.valor), 0);

  // 3. Saldo Líquido Operacional
  const saldoOperacional = totalEntradas - totalSaidas;

  // 4. Ticket Médio das vendas fechadas (Ganhos)
  const wonVendas = periodVendas.filter(v => v.status === 'ganho');
  const ticketMedio = wonVendas.length > 0 
    ? wonVendas.reduce((acc, v) => acc + Number(v.valor_contrato), 0) / wonVendas.length 
    : 0;

  // 5. Quantidade de novos clientes ativos cadastrados no período
  const novosClientesCadastrados = periodClientes.filter(c => c.status === 'ativo').length;

  // 6. Taxa de conversão de leads (vendas ganhas / total oportunidades abertas no período)
  const lostVendas = periodVendas.filter(v => v.status === 'perdido');
  const totalOportunidades = periodVendas.length;
  const conversionRate = totalOportunidades > 0 
    ? (wonVendas.length / totalOportunidades) * 100 
    : 0;

  // 7. Lead Time Médio de Fechamento de Vendas (diferença em dias entre data_fechamento e data_abertura)
  const closedVendas = periodVendas.filter(v => v.data_fechamento && v.data_abertura);
  const leadTimeMedio = closedVendas.length > 0
    ? closedVendas.reduce((acc, v) => {
        const start = new Date(v.data_abertura).getTime();
        const end = new Date(v.data_fechamento).getTime();
        const diffDays = Math.max((end - start) / (1000 * 60 * 60 * 24), 0.5);
        return acc + diffDays;
      }, 0) / closedVendas.length
    : 0;

  // 8. Top 5 Clientes por Faturamento no período
  const top5Clientes = [...wonVendas]
    .sort((a, b) => Number(b.valor_contrato) - Number(a.valor_contrato))
    .slice(0, 5)
    .map(v => ({
      nome: v.clientes?.nome || 'Cliente avulso',
      segmento: v.clientes?.segmento || 'Não Classificado',
      valor: Number(v.valor_contrato)
    }));

  // 9. Ranking de Vendedores por Faturamento Fechado no período
  const rankingVendedoresObj = wonVendas.reduce((acc: any, v) => {
    const name = v.vendedores?.nome || 'Vendedor Padrão';
    acc[name] = (acc[name] || 0) + Number(v.valor_contrato);
    return acc;
  }, {});

  const rankingVendedores = Object.keys(rankingVendedoresObj)
    .map(name => ({ nome: name, valor: rankingVendedoresObj[name] }))
    .sort((a, b) => b.valor - a.valor);

  // 10. Funil de Vendas (Pipeline)
  const countNegociacao = periodVendas.filter(v => v.status === 'em_negociacao').length;
  const countGanho = wonVendas.length;
  const countPerdido = lostVendas.length;
  
  const pipelineData = [
    { name: 'Em Negociação', value: countNegociacao, color: '#C9A227' },
    { name: 'Ganhos', value: countGanho, color: '#7FA88C' },
    { name: 'Perdidos', value: countPerdido, color: '#B5504B' }
  ];

  // 11. Gráfico Histórico de 6 Meses (Linha/Área)
  // Agrupa entradas e saídas confirmadas nos últimos 6 meses (Fevereiro a Julho de 2026)
  const mesesHistoricos = ['2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07'];
  const chartHistoricoData = mesesHistoricos.map(m => {
    const transDoMes = transacoes.filter(t => {
      if (!t.data) return false;
      const cleanDate = t.data.split('T')[0];
      return cleanDate.startsWith(m);
    });

    const labelMap: any = {
      '2026-02': 'Fev/26',
      '2026-03': 'Mar/26',
      '2026-04': 'Abr/26',
      '2026-05': 'Mai/26',
      '2026-06': 'Jun/26',
      '2026-07': 'Jul/26'
    };

    return {
      mesLabel: labelMap[m],
      Faturamento: transDoMes.filter(t => t.tipo === 'entrada').reduce((acc, t) => acc + Number(t.valor), 0),
      Despesas: transDoMes.filter(t => t.tipo === 'saida').reduce((acc, t) => acc + Number(t.valor), 0)
    };
  });

  // Cadastro de Novo Kaizen (5 Porquês + Ação Corretiva 5W2H)
  const handleKaizenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendaPerdida || !actionDesc || !actionResponsavel || !actionPrazo) return;

    setSubmittingKaizen(true);

    try {
      const causaRaizString = whys
        .filter(w => w.trim() !== '')
        .map((w, idx) => `${idx + 1}º: ${w}`)
        .join(' | ');

      const { error: insertError } = await supabase
        .from('pdca_acoes')
        .insert([
          {
            descricao: actionDesc,
            causa_raiz: causaRaizString || 'Não detalhado',
            responsavel: actionResponsavel,
            prazo: actionPrazo,
            status: 'planejada',
            venda_id: selectedVendaPerdida
          }
        ]);

      if (insertError) throw insertError;

      // Reseta formulário
      setSelectedVendaPerdida('');
      setWhys(['', '', '', '', '']);
      setActionDesc('');
      setActionResponsavel('');
      setActionPrazo('');
      
      loadData();
    } catch (error) {
      console.error('Erro ao registrar Kaizen no Supabase:', error);
    } finally {
      setSubmittingKaizen(false);
    }
  };

  // Cadastro de Ação Avulsa (5W2H)
  const handleActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActionWhat || !newActionWhy || !newActionWho || !newActionWhen) return;

    setSubmittingAction(true);

    try {
      const { error: insertError } = await supabase
        .from('pdca_acoes')
        .insert([
          {
            descricao: newActionWhat,
            causa_raiz: newActionWhy,
            responsavel: newActionWho,
            prazo: newActionWhen,
            status: 'planejada'
          }
        ]);

      if (insertError) throw insertError;

      setNewActionWhat('');
      setNewActionWhy('');
      setNewActionWho('');
      setNewActionWhen('');
      
      loadData();
    } catch (error) {
      console.error('Erro ao adicionar ação avulsa:', error);
    } finally {
      setSubmittingAction(false);
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
    <div className="p-6 space-y-6 flex-1 flex flex-col pb-20 md:pb-6">
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
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800">
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
      <div className={`space-y-3 ${mobileTab === 'dashboard' ? 'block' : 'hidden md:block'}`}>
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-brand-500 uppercase tracking-widest flex items-center gap-1.5">
            <Target className="w-4 h-4" /> PLAN (Planejar) — Objetivos do Período
          </h2>
          {period !== 'Q2-2026' && (
            <button
              id="btn-edit-goals"
              onClick={openGoalModal}
              className="px-3 py-1.5 bg-[#14181A] hover:bg-[#23282B] border border-[#23282B] text-[10px] font-bold text-brand-400 hover:text-brand-300 transition-all uppercase tracking-wider flex items-center gap-1.5"
            >
              <Edit2 className="w-3.5 h-3.5" /> Editar Metas
            </button>
          )}
        </div>

        {/* Régua de Calibração (Faturamento vs Meta) - Posição de Destaque no Planejamento */}
        <div className="bg-[#14181A] border border-[#23282B] p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-brand-500"></span> Régua de Calibração de Faturamento
            </span>
            <span className="font-mono text-white text-sm">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalEntradas)}{' '}
              / {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metaReceitaTotal)}{' '}
              ({pctReceita.toFixed(1)}%)
            </span>
          </div>
          
          <div className="h-8 bg-[#0E1113] border border-[#23282B] relative w-full overflow-hidden">
            {/* Fill correspondente ao faturamento real */}
            <div 
              className={`h-full ${
                pctReceita >= 70 ? 'bg-[#7FA88C]' : 'bg-[#B5504B]'
              }`}
              style={{ width: `${Math.min(pctReceita, 100)}%` }}
            ></div>
            
            {/* Limiar de Zona Crítica (70%) fixo */}
            <div className="absolute top-0 bottom-0 left-[70%] w-px bg-[#B5504B]" title="Limiar Crítico (70%)">
              <span className="absolute top-1/2 -translate-y-1/2 left-2 text-[9px] font-bold text-[#B5504B] tracking-wider uppercase bg-[#0E1113]/85 px-1 border border-[#23282B] font-mono">
                70% CRÍTICO
              </span>
            </div>

            {/* Marcador de Meta (100%) - Destaque com Accent Accent */}
            <div className="absolute top-0 bottom-0 left-[99.5%] w-0.5 bg-[#C9A227]" title="Meta (100%)">
              <span className="absolute top-1/2 -translate-y-1/2 right-2 text-[9px] font-bold text-[#C9A227] tracking-wider uppercase bg-[#0E1113]/85 px-1 border border-[#23282B] font-mono">
                META 100%
              </span>
            </div>
          </div>
        </div>

        {/* Grid de Metas Secundárias (colapsado) */}
        <div className="grid grid-cols-1 md:grid-cols-2 border-t border-l border-[#23282B] bg-[#14181A]">
          <div className="border-r border-b border-[#23282B] p-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Meta de Faturamento Estimada</p>
              <h4 className="text-xl font-bold text-white mt-1 font-mono">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metaReceitaTotal)}
              </h4>
            </div>
            <div className="h-10 w-10 border border-[#23282B] bg-[#0E1113] flex items-center justify-center text-slate-400 font-bold font-mono">
              $
            </div>
          </div>
          <div className="border-r border-b border-[#23282B] p-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Meta de Novos Clientes</p>
              <h4 className="text-xl font-bold text-white mt-1 font-mono">{metaNovosClientesTotal} clientes</h4>
            </div>
            <div className="h-10 w-10 border border-[#23282B] bg-[#0E1113] flex items-center justify-center text-slate-400 font-bold font-mono">
              #
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SEÇÃO DO & CHECK (Executar & Analisar) - KPIs de Performance Financeira e Comercial
          ========================================================================= */}
      <div className={`space-y-4 ${mobileTab === 'dashboard' ? 'block' : 'hidden md:block'}`}>
        <h2 className="text-xs font-bold text-brand-500 uppercase tracking-widest flex items-center gap-1.5">
          <ClipboardList className="w-4 h-4" /> DO & CHECK (Executar & Checar) — Análise de Resultados
        </h2>

        {/* Alertas Andon Ativos (se houver) */}
        {alertas.filter(a => !a.resolvido).length > 0 && (
          <div className="border border-[#B5504B] bg-[#14181A] p-5 space-y-3">
            <div className="flex items-center gap-2 text-[#B5504B] font-bold text-sm">
              <AlertOctagon className="w-4.5 h-4.5" />
              <span>Painel de Anomalias Ativas (Andon Alert)</span>
            </div>
            <div className="space-y-2">
              {alertas.filter(a => !a.resolvido).map(alerta => (
                <div key={alerta.id} className="text-xs text-slate-300 leading-relaxed bg-[#0E1113] p-3 border border-[#23282B] flex items-center justify-between">
                  <span>{alerta.mensagem}</span>
                  <span className="text-[10px] px-2 py-0.5 border border-[#B5504B]/20 text-[#B5504B] bg-[#B5504B]/5 font-mono uppercase font-bold">n8n trigger</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cards de Métricas Principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 border-t border-l border-[#23282B] bg-[#14181A]">
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
            icon={<UserCheck className="w-5 h-5 text-brand-500" />}
            trend={pctClientes >= 100 ? 'up' : 'neutral'}
            trendText={pctClientes >= 100 ? 'Meta Cumprida' : `${pctClientes.toFixed(0)}%`}
          />
        </div>

        {/* Gráfico de Histórico e Pipeline */}
        <div className="grid grid-cols-1 lg:grid-cols-3 border-t border-l border-[#23282B] bg-[#14181A]">
          {/* Gráfico de Evolução 6 Meses */}
          <div className="p-6 lg:col-span-2 border-r border-b border-[#23282B] space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">Fluxo de Caixa Acumulado (Últimos 6 meses)</h3>
              <p className="text-xs text-slate-500 mt-0.5">Visão histórica consolidada de Faturamento e Despesas Operacionais</p>
            </div>
            <div className="h-72 w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartHistoricoData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorFat" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7FA88C" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#7FA88C" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorDesp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#B5504B" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#B5504B" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#23282B" />
                  <XAxis dataKey="mesLabel" stroke="#475569" />
                  <YAxis stroke="#475569" />
                  <Tooltip contentStyle={{ backgroundColor: '#14181A', borderColor: '#23282B', color: '#f1f5f9' }} />
                  <Legend verticalAlign="top" height={36} iconType="square" />
                  <Area type="monotone" dataKey="Faturamento" name="Faturamento (Entradas)" stroke="#7FA88C" strokeWidth={2} fillOpacity={1} fill="url(#colorFat)" />
                  <Area type="monotone" dataKey="Despesas" name="Despesas (Saídas)" stroke="#B5504B" strokeWidth={1.5} fillOpacity={1} fill="url(#colorDesp)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráfico do Pipeline de Vendas */}
          <div className="p-6 border-r border-b border-[#23282B] space-y-4 flex flex-col justify-between">
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
                    isAnimationActive={false}
                  >
                    {pipelineData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#14181A', borderColor: '#23282B', color: '#f1f5f9' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-xs text-slate-500 font-bold uppercase leading-none">Total</span>
                <span className="text-2xl font-black text-white mt-1 font-mono">{totalOportunidades}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs border-t border-[#23282B] pt-4">
              {pipelineData.map(entry => (
                <div key={entry.name}>
                  <div className="flex items-center justify-center gap-1.5 text-slate-400">
                    <span className="h-2 w-2" style={{ backgroundColor: entry.color }}></span>
                    <span className="text-[10px] font-bold uppercase tracking-wider">{entry.name}</span>
                  </div>
                  <p className="text-base font-extrabold text-white mt-1 font-mono">{entry.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tabelas de Qualidade e Processos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 border-t border-l border-[#23282B] bg-[#14181A]">
          {/* Top 5 Clientes por Faturamento e Conversão */}
          <div className="p-6 border-r border-b border-[#23282B] space-y-4">
            <h3 className="text-sm font-bold text-white tracking-tight">Top 5 Clientes por Faturamento</h3>
            {top5Clientes.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#23282B] text-slate-500 uppercase tracking-widest font-bold">
                      <th className="py-3 pr-4">Cliente</th>
                      <th className="py-3 px-4">Segmento</th>
                      <th className="py-3 pl-4 text-right">Faturamento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#23282B]/60 text-slate-300 font-medium">
                    {top5Clientes.map((client, index) => (
                      <tr key={index} className="hover:bg-[#0E1113] transition-colors">
                        <td className="py-3.5 pr-4 text-white font-semibold">{client.nome}</td>
                        <td className="py-3.5 px-4">{client.segmento}</td>
                        <td className="py-3.5 pl-4 text-right text-[#7FA88C] font-bold font-mono">
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
          <div className="p-6 border-r border-b border-[#23282B] space-y-5">
            <div className="flex items-center justify-between border-b border-[#23282B] pb-3">
              <h3 className="text-sm font-bold text-white tracking-tight">Ranking Comercial de Vendedores</h3>
              <div className="flex items-center gap-1 bg-[#0E1113] px-2.5 py-1 border border-[#23282B] text-[10px] font-mono text-slate-400 font-bold uppercase">
                <Clock className="w-3.5 h-3.5 text-brand-500" /> Lead Time Médio: <span className="font-mono">{leadTimeMedio.toFixed(1)} dias</span>
              </div>
            </div>

            <div className="grid grid-cols-3 border-t border-l border-[#23282B] bg-[#0E1113] pb-0">
              <div className="border-r border-b border-[#23282B] p-4 text-center">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Oportunidades</span>
                <span className="text-xl font-extrabold text-white mt-1 block font-mono">{totalOportunidades}</span>
              </div>
              <div className="border-r border-b border-[#23282B] p-4 text-center">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Conversão</span>
                <span className="text-xl font-extrabold text-[#7FA88C] mt-1 block font-mono">{conversionRate.toFixed(1)}%</span>
              </div>
              <div className="border-r border-b border-[#23282B] p-4 text-center">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Lead Time</span>
                <span className="text-xl font-extrabold text-brand-500 mt-1 block font-mono">{leadTimeMedio.toFixed(1)} d</span>
              </div>
            </div>

            {/* Lista Leaderboard */}
            <div className="space-y-3.5">
              {rankingVendedores.map((vend, index) => (
                <div key={index} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className={`h-6 w-6 flex items-center justify-center font-bold text-[10px] ${
                      index === 0 ? 'bg-brand-500/10 text-brand-400 border border-brand-500/30' : 'bg-slate-800 text-slate-400 border border-[#23282B]'
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
      <div className={`space-y-6 ${mobileTab !== 'dashboard' ? 'block' : 'hidden md:block'}`}>
        <h2 className="text-xs font-bold text-brand-500 uppercase tracking-widest flex items-center gap-1.5 hidden md:flex">
          <RefreshCw className="w-4 h-4" /> ACT (Agir/Ajustar) — Gestão de Melhoria Contínua (Kaizen)
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 border-t border-l border-[#23282B] bg-[#14181A]">
          {/* Análise de 5 Porquês para Vendas Perdidas */}
          <div className={`p-6 lg:col-span-1 border-r border-b border-[#23282B] space-y-4 ${mobileTab === 'whys' ? 'block' : 'hidden md:block'}`}>
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
                <div className="space-y-3.5 bg-[#0E1113] p-4 border border-[#23282B] rounded-none">
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
                        className="w-full bg-[#14181A] border border-[#23282B] rounded-none px-3 py-1.5 text-xs focus:outline-none focus:border-brand-500 text-white"
                      />
                    </div>
                  ))}

                  <div className="h-px bg-[#23282B] my-4"></div>
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
                        className="w-full bg-[#14181A] border border-[#23282B] rounded-none px-3 py-1.5 text-xs focus:outline-none focus:border-brand-500 text-white"
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
                          className="w-full bg-[#14181A] border border-[#23282B] rounded-none px-3 py-1.5 text-xs focus:outline-none focus:border-brand-500 text-white"
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
                          className="w-full bg-[#14181A] border border-[#23282B] rounded-none px-3 py-1.5 text-xs focus:outline-none focus:border-brand-500 text-white"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    id="btn-submit-kaizen"
                    type="submit"
                    disabled={submittingKaizen}
                    className="w-full btn-primary py-2 text-xs mt-4 flex items-center justify-center gap-1.5"
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
          <div className={`p-6 lg:col-span-2 border-r border-b border-[#23282B] space-y-4 ${mobileTab === 'actions' ? 'block' : 'hidden md:block'}`}>
            <div className="flex items-center justify-between border-b border-[#23282B] pb-3">
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
                    <tr className="border-b border-[#23282B] text-slate-500 uppercase tracking-widest font-bold">
                      <th className="py-2.5 pr-2">Ação (O quê)</th>
                      <th className="py-2.5 px-2">Causa Raiz (Porquê)</th>
                      <th className="py-2.5 px-2">Responsável</th>
                      <th className="py-2.5 px-2">Prazo</th>
                      <th className="py-2.5 pl-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#23282B]/60 text-slate-300 font-medium">
                    {acoes.map((acao) => (
                      <tr key={acao.id} className="hover:bg-[#0E1113] transition-colors">
                        <td className="py-3 pr-2 text-white font-semibold leading-relaxed">{acao.descricao}</td>
                        <td className="py-3 px-2 text-slate-400 leading-normal max-w-[200px] truncate" title={acao.causa_raiz}>{acao.causa_raiz}</td>
                        <td className="py-3 px-2 font-semibold text-slate-200">{acao.responsavel}</td>
                        <td className="py-3 px-2 font-mono text-slate-400">
                          {(() => {
                            if (!acao.prazo) return '-';
                            const parts = acao.prazo.split('T')[0].split('-');
                            if (parts.length < 3) return acao.prazo;
                            return `${parts[2]}/${parts[1]}/${parts[0]}`;
                          })()}
                        </td>
                        <td className="py-3 pl-2 text-center">
                          <button
                            id={`btn-toggle-action-${acao.id}`}
                            onClick={() => handleToggleActionStatus(acao.id, acao.status)}
                            className={`px-2.5 py-1 text-[10px] font-bold border transition-all rounded-none ${
                              acao.status === 'concluida' 
                                ? 'bg-[#7FA88C]/10 border-[#7FA88C]/20 text-[#7FA88C]' 
                                : acao.status === 'em_andamento'
                                ? 'bg-[#C9A227]/10 border-[#C9A227]/20 text-[#C9A227]'
                                : 'bg-[#14181A] border-[#23282B] text-slate-400'
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
              <p className="text-xs text-slate-500 py-12 text-center font-mono">Nenhum plano de ação registrado no quadro PDCA.</p>
            )}

            {/* Cadastro Rápido de Ação Avulsa */}
            <div className="h-px bg-[#23282B] my-4"></div>
            <form onSubmit={handleActionSubmit} className="space-y-3 bg-[#0E1113] p-4 border border-[#23282B] rounded-none">
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
                    className="w-full bg-[#14181A] border border-[#23282B] rounded-none px-3 py-1.5 text-xs focus:outline-none focus:border-brand-500 text-white"
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
                    className="w-full bg-[#14181A] border border-[#23282B] rounded-none px-3 py-1.5 text-xs focus:outline-none focus:border-brand-500 text-white"
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
                    className="w-full bg-[#14181A] border border-[#23282B] rounded-none px-3 py-1.5 text-xs focus:outline-none focus:border-brand-500 text-white"
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
                    className="w-full bg-[#14181A] border border-[#23282B] rounded-none px-3 py-1.5 text-xs focus:outline-none focus:border-brand-500 text-white"
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

      {/* Barra de Navegação Mobile (Estilo App) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-slate-900 border-t border-slate-800 flex items-center justify-around z-40 px-4 shadow-xl">
        <button
          onClick={() => setMobileTab('dashboard')}
          className={`flex flex-col items-center justify-center gap-1 text-[10px] font-bold uppercase transition-all ${
            mobileTab === 'dashboard' ? 'text-brand-500' : 'text-slate-400'
          }`}
        >
          <ClipboardList className="w-5 h-5" />
          <span>Dashboard</span>
        </button>
        <button
          onClick={() => setMobileTab('whys')}
          className={`flex flex-col items-center justify-center gap-1 text-[10px] font-bold uppercase transition-all ${
            mobileTab === 'whys' ? 'text-brand-500' : 'text-slate-400'
          }`}
        >
          <FileQuestion className="w-5 h-5" />
          <span>5 Porquês</span>
        </button>
        <button
          onClick={() => setMobileTab('actions')}
          className={`flex flex-col items-center justify-center gap-1 text-[10px] font-bold uppercase transition-all ${
            mobileTab === 'actions' ? 'text-brand-500' : 'text-slate-400'
          }`}
        >
          <CheckCircle className="w-5 h-5" />
          <span>Ações</span>
        </button>
      </div>

      {/* =========================================================================
          MODAL DE CONFIGURAÇÃO DE METAS (PLAN)
          ========================================================================= */}
      {isGoalModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-[400px] glass-panel border border-[#23282B] bg-[#14181A] p-6 shadow-none space-y-4">
            <div className="flex items-center justify-between border-b border-[#23282B] pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Target className="w-4.5 h-4.5 text-brand-500" /> Definir Metas Corporativas
              </h3>
              <button onClick={() => setIsGoalModalOpen(false)} className="p-1 rounded bg-[#0E1113] border border-[#23282B] text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {goalModalError && (
              <div className="p-3 bg-[#B5504B]/10 border border-[#B5504B]/20 text-[#B5504B] text-xs font-semibold leading-relaxed">
                {goalModalError}
              </div>
            )}

            <form onSubmit={handleGoalSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Mês de Referência</label>
                <div className="w-full bg-[#0E1113] border border-[#23282B] px-3 py-2 text-xs font-semibold text-white capitalize">
                  {period === '2026-07' ? 'Julho / 2026' : period === '2026-06' ? 'Junho / 2026' : 'Maio / 2026'}
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="input-goal-revenue" className="text-[10px] font-bold text-slate-400 uppercase">Meta de Receita (R$)</label>
                <input
                  id="input-goal-revenue"
                  type="number"
                  step="0.01"
                  required
                  placeholder="Ex: 100000.00"
                  value={inputMetaReceita}
                  onChange={(e) => setInputMetaReceita(e.target.value)}
                  className="w-full glass-input text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="input-goal-clients" className="text-[10px] font-bold text-slate-400 uppercase">Meta de Novos Clientes</label>
                <input
                  id="input-goal-clients"
                  type="number"
                  required
                  placeholder="Ex: 10"
                  value={inputMetaClientes}
                  onChange={(e) => setInputMetaClientes(e.target.value)}
                  className="w-full glass-input text-xs"
                />
              </div>

              <button
                id="btn-save-goals-submit"
                type="submit"
                disabled={submittingGoal}
                className="w-full btn-primary py-2.5 text-xs mt-2"
              >
                {submittingGoal ? 'Sincronizando...' : 'Salvar Metas'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
