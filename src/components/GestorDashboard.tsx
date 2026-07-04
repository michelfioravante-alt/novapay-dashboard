import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  Cell, PieChart, Pie, ReferenceLine
} from 'recharts';
import { 
  Plus, CheckCircle, RefreshCw, FileQuestion, ArrowRight, ClipboardList, Edit2, X, AlertOctagon, TrendingUp
} from 'lucide-react';

interface ReadoutCardProps {
  label: string;
  value: string | number;
  foot?: string;
  footRight?: string;
  footRightColor?: 'pos' | 'neg' | 'warn';
  hero?: boolean;
  onClick?: () => void;
  active?: boolean;
}

function ReadoutCard({ label, value, foot, footRight, footRightColor, hero, onClick, active }: ReadoutCardProps) {
  const rightColor = footRightColor === 'pos' ? 'text-[#7FA88C]' : footRightColor === 'neg' ? 'text-[#B5504B]' : footRightColor === 'warn' ? 'text-[#C9A227]' : 'text-[#7C868A]';
  return (
    <div 
      onClick={onClick}
      className={`border-r border-b border-[#23282B] p-[22px] flex flex-col justify-between transition-all select-none ${
        onClick ? 'cursor-pointer hover:bg-[#1C2022]' : ''
      } ${
        active 
          ? 'bg-[#C9A227]/5 border-b-2 border-b-[#C9A227]/70' 
          : 'bg-[#14181A]'
      }`}
    >
      <div>
        <p className={`text-[11px] font-medium uppercase tracking-[0.06em] transition-colors ${active ? 'text-[#C9A227] font-semibold' : 'text-[#7C868A]'}`}>{label}</p>
        <p className={`font-mono font-bold text-white mt-3 mb-2.5 ${hero ? 'text-[34px]' : 'text-[26px]'}`}>{value}</p>
      </div>
      {(foot || footRight) && (
        <div className="flex items-center justify-between text-[11.5px] text-[#7C868A] pt-3 border-t border-[#1A1F21]">
          {foot && <span className={active ? 'text-slate-300' : ''}>{foot}</span>}
          {footRight && <span className={`font-mono font-bold ${rightColor}`}>{footRight}</span>}
        </div>
      )}
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

  // Filtro de Vendedor
  const [selectedVendedorFilter, setSelectedVendedorFilter] = useState<string>('todos');

  // Modal e Formulário de Cadastro de Novo Vendedor
  const [isVendedorModalOpen, setIsVendedorModalOpen] = useState(false);
  const [newVendedorNome, setNewVendedorNome] = useState('');
  const [newVendedorEmail, setNewVendedorEmail] = useState('');
  const [submittingVendedor, setSubmittingVendedor] = useState(false);
  const [vendedorModalError, setVendedorModalError] = useState<string | null>(null);

  // Seleção e modal de detalhes do cliente
  const [selectedClientDetails, setSelectedClientDetails] = useState<any | null>(null);

  // Métrica ativa para o gráfico de acompanhamento comercial
  const [activeKpiFilter, setActiveKpiFilter] = useState<'receita' | 'ticket' | 'saldo' | 'clientes' | 'roi'>('receita');

  // Manipulador para exibir os detalhes ricos do cliente em um modal
  const handleShowClientDetails = (clientSummary: any) => {
    const fullClient = clientes.find(c => c.nome === clientSummary.nome);
    if (!fullClient) return;

    // Achar vendas dele no período
    const clientVendas = vendas.filter(v => v.cliente_id === fullClient.id && isInPeriod(v.data_fechamento || v.data_abertura));

    // Achar vendedor responsável
    const ultimoNegocio = clientVendas[0];
    const vendedorNome = ultimoNegocio?.vendedores?.nome || 'Não atribuído';

    setSelectedClientDetails({
      id: fullClient.id,
      nome: fullClient.nome,
      segmento: fullClient.segmento,
      valorTotal: clientSummary.valor,
      vendedorNome: vendedorNome,
      propostas: clientVendas
    });
  };

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

    // Inscrição em tempo real para sincronização automática entre vendedor e gestor
    const channel = supabase
      .channel('gestor-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendas' }, () => {
        loadData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transacoes' }, () => {
        loadData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pdca_acoes' }, () => {
        loadData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'metas' }, () => {
        loadData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendedores' }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  // Handler de atualização manual
  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Cadastrar Novo Vendedor
  const handleVendedorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVendedorNome || !newVendedorEmail) return;

    setSubmittingVendedor(true);
    setVendedorModalError(null);

    try {
      const { error } = await supabase
        .from('vendedores')
        .insert([
          {
            nome: newVendedorNome,
            email: newVendedorEmail.toLowerCase().trim(),
            perfil: 'vendedor'
          }
        ]);

      if (error) throw error;

      setIsVendedorModalOpen(false);
      setNewVendedorNome('');
      setNewVendedorEmail('');
      loadData();
    } catch (err: any) {
      console.error(err);
      setVendedorModalError(err.message || 'Erro ao cadastrar vendedor.');
    } finally {
      setSubmittingVendedor(false);
    }
  };

  // =========================================================================
  // PROCESSAMENTO DE INDICADORES COM FILTRO DE PERÍODO (MONTH / QUARTER)
  // =========================================================================

  // Função utilitária para verificar se a data está no período selecionado
  const isInPeriod = useCallback((dateStr: string) => {
    if (!dateStr) return false;
    const cleanDate = dateStr.split('T')[0];
    const parts = cleanDate.split('-');
    if (parts.length < 2) return false;
    const year = parts[0];
    const month = parts[1];
    
    if (period === 'Q2-2026') {
      // Q2 = Abril, Maio, Junho
      return year === '2026' && ['04', '05', '06'].includes(month);
    } else {
      // Formato YYYY-MM
      return `${year}-${month}` === period;
    }
  }, [period]);

  // 1. Filtragem das Metas do Período
  const activeGoals = metas.filter(m => {
    if (!m.mes_referencia) return false;
    const cleanDate = m.mes_referencia.split('T')[0];
    const parts = cleanDate.split('-');
    if (parts.length < 2) return false;
    const year = parts[0];
    const month = parts[1];
    if (period === 'Q2-2026') {
      return year === '2026' && ['04', '05', '06'].includes(month);
    }
    return `${year}-${month}` === period;
  });

  const metaReceitaTotal = activeGoals.reduce((acc, m) => acc + Number(m.meta_receita), 0);
  const metaNovosClientesTotal = activeGoals.reduce((acc, m) => acc + m.meta_novos_clientes, 0);

  const metaReceita = selectedVendedorFilter === 'todos' ? metaReceitaTotal : 25000.00;
  const metaNovosClientes = selectedVendedorFilter === 'todos' ? metaNovosClientesTotal : 3;

  // 2. Filtragem de Vendas no período (filtrando por vendedor se selecionado)
  const baseFilteredVendas = vendas.filter(v => isInPeriod(v.data_fechamento || v.data_abertura));
  const filteredVendas = selectedVendedorFilter === 'todos'
    ? baseFilteredVendas
    : baseFilteredVendas.filter(v => v.vendedor_id === selectedVendedorFilter);

  const wonVendas = filteredVendas.filter(v => v.status === 'ganho');
  const lostVendas = filteredVendas.filter(v => v.status === 'perdido');

  // 3. Filtragem de Transações no período
  const filteredTransacoes = transacoes.filter(t => isInPeriod(t.data));
  
  // Receita Realizada (se filtrado por vendedor, calculamos pelas vendas dele; senão, por transações de entrada)
  const totalEntradas = selectedVendedorFilter === 'todos'
    ? filteredTransacoes
        .filter(t => t.tipo === 'entrada' && t.status === 'confirmada')
        .reduce((acc, t) => acc + Number(t.valor), 0)
    : wonVendas.reduce((acc, v) => acc + Number(v.valor_contrato), 0);

  // Despesas (saídas são corporativas, então se filtrado por vendedor definimos como 0 para não distorcer)
  const totalSaidas = selectedVendedorFilter === 'todos'
    ? filteredTransacoes
        .filter(t => t.tipo === 'saida' && t.status === 'confirmada')
        .reduce((acc, t) => acc + Number(t.valor), 0)
    : 0;

  // 4. Saldo Operacional e Ticket Médio
  const saldoOperacional = totalEntradas - totalSaidas;
  const totalValorContratosGanhos = wonVendas.reduce((acc, v) => acc + Number(v.valor_contrato), 0);
  const ticketMedio = wonVendas.length > 0 ? (totalValorContratosGanhos / wonVendas.length) : 0;

  // 5. Clientes cadastrados no período (Novos Clientes)
  const baseNovosClientes = clientes.filter(c => isInPeriod(c.data_cadastro));
  const novosClientesCadastrados = selectedVendedorFilter === 'todos'
    ? baseNovosClientes.length
    : baseNovosClientes.filter(c => 
        vendas.some(v => v.cliente_id === c.id && v.vendedor_id === selectedVendedorFilter)
      ).length;

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

  // 8. Ranking de Vendedores (Por valor fechado e perdido)
  const rankingVendedores = vendedores.map(vend => {
    // Vendas ganhas do vendedor no período
    const totalGanho = vendas
      .filter(v => v.vendedor_id === vend.id && v.status === 'ganho' && isInPeriod(v.data_fechamento))
      .reduce((acc, v) => acc + Number(v.valor_contrato), 0);

    // Vendas perdidas do vendedor no período
    const totalPerdido = vendas
      .filter(v => v.vendedor_id === vend.id && v.status === 'perdido' && isInPeriod(v.data_fechamento))
      .reduce((acc, v) => acc + Number(v.valor_contrato), 0);

    // Oportunidades totais do vendedor no período
    const totalOps = vendas
      .filter(v => v.vendedor_id === vend.id && isInPeriod(v.data_fechamento || v.data_abertura));

    const totalOpsCount = totalOps.length;
    const wonCount = totalOps.filter(v => v.status === 'ganho').length;
    const convRate = totalOpsCount > 0 ? (wonCount / totalOpsCount) * 100 : 0;

    return {
      id: vend.id,
      nome: vend.nome,
      ganho: totalGanho,
      perdido: totalPerdido,
      conversao: convRate,
      totalNegocios: totalOpsCount,
      valor: totalGanho // Mantemos 'valor' para compatibilidade se houver outras referências
    };
  }).sort((a, b) => b.ganho - a.ganho);

  // Cálculo de Pareto dos motivos de perda
  const motivosFrequencia = (() => {
    const counts: { [key: string]: number } = {};
    let totalLost = 0;
    
    // Filtramos usando filteredVendas para que mude dinamicamente ao selecionar um vendedor!
    const lostSales = filteredVendas.filter(v => v.status === 'perdido');
    
    lostSales.forEach(s => {
      let motivo = s.motivo_perda;
      if (!motivo) {
        motivo = "Objeção não detalhada";
      } else if (motivo.includes('->')) {
        const parts = motivo.split('->');
        motivo = parts[parts.length - 1].trim();
      }
      
      motivo = motivo.trim();
      if (motivo.toLowerCase().includes('preço') || motivo.toLowerCase().includes('caro') || motivo.toLowerCase().includes('orçamento')) {
        motivo = "Preço / Verba Insuficiente";
      } else if (motivo.toLowerCase().includes('concorrente') || motivo.toLowerCase().includes('concorrência')) {
        motivo = "Perdido para Concorrente";
      } else if (motivo.toLowerCase().includes('recurso') || motivo.toLowerCase().includes('funcionalidade') || motivo.toLowerCase().includes('falta')) {
        motivo = "Falta de Recursos / Fit Técnico";
      } else if (motivo.toLowerCase().includes('tempo') || motivo.toLowerCase().includes('prazo') || motivo.toLowerCase().includes('demora')) {
        motivo = "Timing / Prazo de Decisão";
      } else if (motivo.toLowerCase().includes('fria') || motivo.toLowerCase().includes('contato') || motivo.toLowerCase().includes('sumiu')) {
        motivo = "Lead Frio / Sem Retorno";
      }
      
      counts[motivo] = (counts[motivo] || 0) + 1;
      totalLost++;
    });

    const sorted = Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    let accValue = 0;
    const result = sorted.map(item => {
      accValue += item.value;
      const pct = totalLost > 0 ? (item.value / totalLost) * 100 : 0;
      const accPct = totalLost > 0 ? (accValue / totalLost) * 100 : 0;
      return {
        name: item.name,
        value: item.value,
        pct,
        accPct
      };
    });

    return { items: result, total: totalLost };
  })();

  // 9. Top 5 Clientes por Faturamento no período
  const clientBillingMap: { [key: string]: { nome: string; valor: number; segmento: string } } = {};
  if (selectedVendedorFilter === 'todos') {
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
  } else {
    wonVendas.forEach(v => {
      const cid = v.cliente_id;
      const val = Number(v.valor_contrato);
      const cname = v.clientes?.nome || 'Cliente Desconhecido';
      const cseg = v.clientes?.segmento || 'Não especificado';
      if (!clientBillingMap[cid]) {
        clientBillingMap[cid] = { nome: cname, valor: 0, segmento: cseg };
      }
      clientBillingMap[cid].valor += val;
    });
  }
  const top5Clientes = Object.values(clientBillingMap)
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 5);

  // 10. Pipeline de Vendas (Status counts)
  const countNegociacao = filteredVendas.filter(v => v.status === 'em_negociacao').length;
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
    // Filtrar transações desse mês
    const transDoMes = transacoes.filter(t => {
      if (!t.data) return false;
      const cleanDate = t.data.split('T')[0];
      const parts = cleanDate.split('-');
      if (parts.length < 2) return false;
      return `${parts[0]}-${parts[1]}` === m;
    });

    // Filtrar vendas desse mês (respeitando o filtro de vendedor)
    const vendasDoMes = vendas.filter(v => {
      const dFechamento = v.data_fechamento || v.data_abertura;
      if (!dFechamento) return false;
      return dFechamento.startsWith(m);
    });

    const vendasDoMesFiltradas = selectedVendedorFilter === 'todos'
      ? vendasDoMes
      : vendasDoMes.filter(v => v.vendedor_id === selectedVendedorFilter);

    // Vendas Ganhadas no mês
    const ganhoVendas = vendasDoMesFiltradas
      .filter(v => v.status === 'ganho')
      .reduce((acc, v) => acc + Number(v.valor_contrato), 0);

    // Vendas Perdidas no mês
    const perdidoVendas = vendasDoMesFiltradas
      .filter(v => v.status === 'perdido')
      .reduce((acc, v) => acc + Number(v.valor_contrato), 0);

    const ganhoVendasCount = vendasDoMesFiltradas.filter(v => v.status === 'ganho').length;
    const ticketMedioVal = ganhoVendasCount > 0 ? ganhoVendas / ganhoVendasCount : 0;

    const ent = selectedVendedorFilter === 'todos'
      ? transDoMes.filter(t => t.tipo === 'entrada' && t.status === 'confirmada').reduce((acc, t) => acc + Number(t.valor), 0)
      : ganhoVendas;

    const sai = selectedVendedorFilter === 'todos'
      ? transDoMes.filter(t => t.tipo === 'saida' && t.status === 'confirmada').reduce((acc, t) => acc + Number(t.valor), 0)
      : 0;

    const saldoVal = ent - sai;
    const roiVal = sai > 0 ? (saldoVal / sai) * 100 : 0;
    const novosClientesVal = ganhoVendasCount;

    // Traduz o mês para exibição
    const [_, mesNum] = m.split('-');
    const nomesMeses: { [key: string]: string } = {
      '02': 'Fev', '03': 'Mar', '04': 'Abr', '05': 'Mai', '06': 'Jun', '07': 'Jul'
    };
    return {
      mesLabel: nomesMeses[mesNum],
      Faturamento: ent,
      Despesas: sai,
      Lucro: saldoVal,
      GanhoVendas: ganhoVendas,
      PerdidoVendas: perdidoVendas,
      TicketMedio: ticketMedioVal,
      ROI: roiVal,
      NovosClientes: novosClientesVal
    };
  });

  // 12. Despesas por Categoria
  const despesasPorCategoria: { [key: string]: number } = {};
  filteredTransacoes
    .filter(t => t.tipo === 'saida' && t.status === 'confirmada')
    .forEach(t => {
      const cat = t.categoria || 'Outros';
      despesasPorCategoria[cat] = (despesasPorCategoria[cat] || 0) + Number(t.valor);
    });

  // 13. Ticket Médio por Segmento de Cliente
  const ticketMedioPorSegmento: { [key: string]: { valorTotal: number; quantidade: number } } = {};
  wonVendas.forEach(v => {
    const seg = v.clientes?.segmento || 'Não especificado';
    if (!ticketMedioPorSegmento[seg]) {
      ticketMedioPorSegmento[seg] = { valorTotal: 0, quantidade: 0 };
    }
    ticketMedioPorSegmento[seg].valorTotal += Number(v.valor_contrato);
    ticketMedioPorSegmento[seg].quantidade += 1;
  });

  // 14. Projeção de Faturamento Fim do Mês (Ritmo Atual)
  const isCurrentMonth = period === '2026-07';
  const elapsedDays = 4; // Data atual da simulação: 04/07/2026
  const totalDays = 31; // Total de dias em Julho
  const projectedRevenue = isCurrentMonth 
    ? (totalEntradas / elapsedDays) * totalDays 
    : totalEntradas;

  // 15. Análise de Clientes Ativos vs Inativos (Retenção / Churn)
  const totalClientes = clientes.length;
  const ativos = clientes.filter(c => c.status === 'ativo').length;
  const inativos = clientes.filter(c => c.status === 'inativo').length;
  const _taxaRetencao = totalClientes > 0 ? (ativos / totalClientes) * 100 : 100;
  const _taxaChurn = totalClientes > 0 ? (inativos / totalClientes) * 100 : 0;
  void _taxaRetencao; void _taxaChurn;

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
  const pctReceita = metaReceita > 0 ? (totalEntradas / metaReceita) * 100 : 0;
  const pctClientes = metaNovosClientes > 0 ? (novosClientesCadastrados / metaNovosClientes) * 100 : 0;

  // ROI da Operação = (Faturamento - Despesas) / Despesas * 100
  // totalEntradas representa a Receita Realizada e totalSaidas representa as Despesas
  const roiOperacao = totalSaidas > 0 ? ((totalEntradas - totalSaidas) / totalSaidas) * 100 : 0;

  return (
    <div className="p-6 space-y-6 flex-1 flex flex-col pb-20 md:pb-6 w-full">
      {/* Barra de Filtros de Período e Andon Light */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#23282B] pb-4">
        <div className="flex flex-wrap items-center gap-6">
          <div className="periods flex gap-6">
            <button
              id="filter-period-july"
              onClick={() => setPeriod('2026-07')}
              className={`text-xs font-semibold pb-2 transition-all border-b-2 ${
                period === '2026-07' ? 'text-white border-[#C9A227]' : 'text-slate-500 border-transparent hover:text-slate-300'
              }`}
            >
              Julho
            </button>
            <button
              id="filter-period-june"
              onClick={() => setPeriod('2026-06')}
              className={`text-xs font-semibold pb-2 transition-all border-b-2 ${
                period === '2026-06' ? 'text-white border-[#C9A227]' : 'text-slate-500 border-transparent hover:text-slate-300'
              }`}
            >
              Junho
            </button>
            <button
              id="filter-period-may"
              onClick={() => setPeriod('2026-05')}
              className={`text-xs font-semibold pb-2 transition-all border-b-2 ${
                period === '2026-05' ? 'text-white border-[#C9A227]' : 'text-slate-500 border-transparent hover:text-slate-300'
              }`}
            >
              Maio
            </button>
            <button
              id="filter-period-q2"
              onClick={() => setPeriod('Q2-2026')}
              className={`text-xs font-semibold pb-2 transition-all border-b-2 ${
                period === 'Q2-2026' ? 'text-white border-[#C9A227]' : 'text-slate-500 border-transparent hover:text-slate-300'
              }`}
            >
              2º Trimestre
            </button>
          </div>

          {/* Filtro por Vendedor */}
          <div className="flex items-center bg-[#14181A] border border-[#23282B] px-2 py-0.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pr-2">Vendedor:</span>
            <select
              id="filter-vendedor-select"
              value={selectedVendedorFilter}
              onChange={(e) => setSelectedVendedorFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold text-white py-1 focus:outline-none rounded-none border-none cursor-pointer"
            >
              <option value="todos">Todos os Vendedores</option>
              {vendedores.map(v => (
                <option key={v.id} value={v.id} className="bg-[#14181A]">{v.nome}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="btn-refresh-data"
            onClick={handleRefresh}
            className="p-1.5 bg-[#14181A] hover:bg-[#23282B] border border-[#23282B] text-slate-400 hover:text-white transition-all flex items-center justify-center"
            title="Atualizar Dados"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <div className="text-[10.5px] uppercase tracking-widest text-[#4A5256] font-medium">
            Sincronizado automaticamente
          </div>
        </div>
      </div>

      {/* =========================================================================
          GAUGE — Calibração de Faturamento vs Meta
          ========================================================================= */}
      <div className={mobileTab === 'dashboard' ? 'block' : 'hidden md:block'}>
        {/* Header da Gauge com botões de gestão */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-4">
          <div>
            <p className="text-[10.5px] font-medium text-[#4A5256] uppercase tracking-[0.12em] mb-1">Faturamento do período face à meta</p>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 w-full md:w-auto">
                <button
                  id="btn-add-vendedor-modal"
                  onClick={() => setIsVendedorModalOpen(true)}
                  className="flex-1 md:flex-none px-3 py-1.5 bg-[#14181A] hover:bg-[#23282B] border border-[#23282B] text-[10px] font-bold text-[#C9A227] hover:text-white transition-all uppercase tracking-wider flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Cadastrar Vendedor
                </button>
                {period !== 'Q2-2026' && (
                  <button
                    id="btn-edit-goals"
                    onClick={openGoalModal}
                    className="flex-1 md:flex-none px-3 py-1.5 bg-[#14181A] hover:bg-[#23282B] border border-[#23282B] text-[10px] font-bold text-[#C9A227] hover:text-white transition-all uppercase tracking-wider flex items-center justify-center gap-1.5"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Editar Metas
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="text-xs text-[#B5504B] flex items-center gap-1.5 flex-shrink-0">
            <span className="w-2 h-2 bg-[#B5504B] inline-block"></span>
            {metaReceita > 0 && (
              <span>
                {(metaReceita > 0 ? ((metaReceita - totalEntradas) / metaReceita * 100) : 0).toFixed(0)}% restante · {pctReceita < 70 ? 'abaixo do limiar de segurança' : pctReceita >= 100 ? 'meta atingida' : 'dentro da zona de atenção'}
              </span>
            )}
          </div>
        </div>

        {/* Track — linha fina tipo instrumento de medição */}
        <div className="relative h-16">
          <div className="relative h-[2px] bg-[#23282B] mt-7">
            {/* Zona crítica (0–70%) */}
            <div className="absolute top-0 left-0 h-[2px] bg-[rgba(181,80,75,0.12)]" style={{ width: '70%' }}></div>
            {/* Fill atual */}
            <div
              className="absolute top-0 left-0 h-[2px] bg-[#7C868A] transition-all duration-700"
              style={{ width: `${Math.min(pctReceita, 100)}%` }}
            ></div>
            {/* Marcador 70% */}
            <div className="absolute top-[-9px] h-5 w-[2px] bg-[#C9A227]" style={{ left: '70%' }}>
              <span className="absolute top-[-22px] left-1/2 -translate-x-1/2 text-[11px] font-mono text-[#C9A227] whitespace-nowrap">70% · limiar</span>
            </div>
          </div>
          {/* Ticks */}
          <div className="flex justify-between mt-1.5">
            {(['R$ 0', 'R$ 25K', 'R$ 50K', 'R$ 75K',
              `${new Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(metaReceita)} — meta`
            ]).map(t => (
              <span key={t} className="text-[10px] font-mono text-[#4A5256]">{t}</span>
            ))}
          </div>
        </div>
      </div>

      {/* =========================================================================
          SEÇÃO RESULTADOS — KPIs
          ========================================================================= */}
      <div className={`space-y-8 ${mobileTab === 'dashboard' ? 'block' : 'hidden md:block'}`}>
        {/* Section label */}
        <div className="flex items-center gap-3">
          <span className="text-[10.5px] font-medium text-[#4A5256] uppercase tracking-[0.12em] whitespace-nowrap">Resultados do período</span>
          <div className="flex-1 h-px bg-[#23282B]"></div>
        </div>

        {/* Alertas de Desvios Comerciais (se houver) */}
        {alertas.filter(a => !a.resolvido).length > 0 && (
          <div className="border border-[#B5504B] bg-[#14181A] p-5 space-y-3">
            <div className="flex items-center gap-2 text-[#B5504B] font-bold text-sm">
              <AlertOctagon className="w-4 h-4" />
              <span>Desvios Comerciais Detectados</span>
            </div>
            <div className="space-y-2">
              {alertas.filter(a => !a.resolvido).map(alerta => (
                <div key={alerta.id} className="text-xs text-[#D8DEE1] leading-relaxed bg-[#0E1113] p-3 border border-[#23282B] flex items-center justify-between">
                  <span>{alerta.mensagem}</span>
                  <span className="text-[10px] px-2 py-0.5 border border-[#B5504B]/20 text-[#B5504B] bg-[#B5504B]/5 font-mono uppercase font-bold">n8n trigger</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Readout Grid (hero + 4 cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-px bg-[#23282B] border border-[#23282B]">
          <ReadoutCard
            label="Receita Realizada"
            value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(totalEntradas)}
            foot={isCurrentMonth ? `Proj. mês: ${new Intl.NumberFormat('pt-BR', { notation: 'compact', style: 'currency', currency: 'BRL' }).format(projectedRevenue)}` : `${pctReceita.toFixed(1)}% da meta`}
            footRight={pctReceita >= 100 ? '↑ Meta' : `${pctReceita.toFixed(0)}%`}
            footRightColor={pctReceita >= 95 ? 'pos' : pctReceita >= 70 ? 'warn' : 'neg'}
            hero
            onClick={() => setActiveKpiFilter('receita')}
            active={activeKpiFilter === 'receita'}
          />
          <ReadoutCard
            label="Ticket Médio"
            value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(ticketMedio)}
            foot="por contrato fechado"
            onClick={() => setActiveKpiFilter('ticket')}
            active={activeKpiFilter === 'ticket'}
          />
          <ReadoutCard
            label="Saldo Operacional"
            value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(saldoOperacional)}
            foot={`despesas ${new Intl.NumberFormat('pt-BR', { notation: 'compact', style: 'currency', currency: 'BRL' }).format(totalSaidas)}`}
            footRight={saldoOperacional >= 0 ? 'positivo' : 'déficit'}
            footRightColor={saldoOperacional >= 0 ? 'pos' : 'neg'}
            onClick={() => setActiveKpiFilter('saldo')}
            active={activeKpiFilter === 'saldo'}
          />
          <ReadoutCard
            label="Novos Clientes"
            value={`${novosClientesCadastrados} / ${metaNovosClientes}`}
            foot={`${pctClientes.toFixed(0)}% da meta`}
            footRight={metaNovosClientes > novosClientesCadastrados ? `faltam ${metaNovosClientes - novosClientesCadastrados}` : 'atingido'}
            footRightColor={pctClientes >= 100 ? 'pos' : 'warn'}
            onClick={() => setActiveKpiFilter('clientes')}
            active={activeKpiFilter === 'clientes'}
          />
          <ReadoutCard
            label="ROI da Operação"
            value={totalSaidas > 0 ? `${roiOperacao.toFixed(0)}%` : '100%'}
            foot="retorno por R$ investido"
            footRight={roiOperacao >= 100 ? 'excelente' : roiOperacao >= 0 ? 'positivo' : 'deficitário'}
            footRightColor={roiOperacao >= 100 ? 'pos' : roiOperacao >= 0 ? 'warn' : 'neg'}
            onClick={() => setActiveKpiFilter('roi')}
            active={activeKpiFilter === 'roi'}
          />
        </div>

        {/* Histórico e Pipeline */}
        <div className="flex items-center gap-3">
          <span className="text-[10.5px] font-medium text-[#4A5256] uppercase tracking-[0.12em] whitespace-nowrap">Histórico e pipeline</span>
          <div className="flex-1 h-px bg-[#23282B]"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[#23282B] border border-[#23282B]">
          {/* Gráfico de Evolução 6 Meses (Dinâmico com base no KPI ativo) */}
          <div className="bg-[#14181A] p-6 space-y-3">
            <div>
              <h3 className="text-[13.5px] font-semibold text-[#D8DEE1] flex items-center gap-2">
                {activeKpiFilter === 'receita' && "Evolução de Receita & Perdas"}
                {activeKpiFilter === 'ticket' && "Evolução de Ticket Médio"}
                {activeKpiFilter === 'saldo' && "Evolução de Saldo Operacional"}
                {activeKpiFilter === 'clientes' && "Acompanhamento de Novos Clientes"}
                {activeKpiFilter === 'roi' && "Retorno sobre Investimento (ROI)"}
                <span className="text-[9px] font-mono text-[#C9A227] bg-[#C9A227]/5 border border-[#C9A227]/10 px-1.5 py-0.5 uppercase tracking-wider font-bold">
                  Histórico
                </span>
              </h3>
              <p className="text-xs text-[#7C868A] mt-1">Comparativo de performance comercial nos últimos 6 meses</p>
            </div>
            
            <div className="h-72 w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartHistoricoData} margin={{ top: 15, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorGreen" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7FA88C" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#7FA88C" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorRed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#B5504B" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#B5504B" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorGold" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C9A227" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#C9A227" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  
                  <CartesianGrid strokeDasharray="3 3" stroke="#1A1F21" vertical={false} />
                  <XAxis dataKey="mesLabel" stroke="#475569" tickLine={false} />
                  
                  {activeKpiFilter === 'roi' ? (
                    <YAxis stroke="#475569" tickLine={false} tickFormatter={(val) => `${val.toFixed(0)}%`} />
                  ) : (
                    <YAxis 
                      stroke="#475569" 
                      tickLine={false}
                      tickFormatter={(val) => {
                        if (activeKpiFilter === 'clientes') return String(val);
                        return new Intl.NumberFormat('pt-BR', { notation: 'compact', compactDisplay: 'short' }).format(val);
                      }}
                    />
                  )}

                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0E1113', borderColor: '#23282B', borderRadius: 0 }} 
                    itemStyle={{ fontSize: 11, fontFamily: 'monospace' }} 
                    labelStyle={{ fontSize: 10.5, fontWeight: 'bold', color: '#fff', marginBottom: 4 }}
                    formatter={(value: any, name: any) => {
                      if (activeKpiFilter === 'roi') return [`${Number(value).toFixed(0)}%`, name];
                      if (activeKpiFilter === 'clientes') return [value, name];
                      return [new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value), name];
                    }}
                  />

                  {/* Renderização condicional de curvas baseada na métrica selecionada */}
                  {activeKpiFilter === 'receita' && (
                    <>
                      <Area type="monotone" dataKey="Faturamento" name="Faturamento Ganho" stroke="#7FA88C" strokeWidth={2} fillOpacity={1} fill="url(#colorGreen)" />
                      <Area type="monotone" dataKey="PerdidoVendas" name="Faturamento Perdido" stroke="#B5504B" strokeWidth={1.5} fillOpacity={1} fill="url(#colorRed)" />
                      {metaReceita > 0 && (
                        <ReferenceLine y={metaReceita} stroke="#C9A227" strokeDasharray="4 4" label={{ value: 'Meta Receita', fill: '#C9A227', fontSize: 9, position: 'top' }} />
                      )}
                    </>
                  )}

                  {activeKpiFilter === 'ticket' && (
                    <Area type="monotone" dataKey="TicketMedio" name="Ticket Médio" stroke="#7FA88C" strokeWidth={2} fillOpacity={1} fill="url(#colorGreen)" />
                  )}

                  {activeKpiFilter === 'saldo' && (
                    <>
                      <Area type="monotone" dataKey="Faturamento" name="Receitas" stroke="#7FA88C" strokeWidth={2} fillOpacity={1} fill="url(#colorGreen)" />
                      <Area type="monotone" dataKey="Despesas" name="Despesas" stroke="#B5504B" strokeWidth={1.5} fillOpacity={1} fill="url(#colorRed)" />
                    </>
                  )}

                  {activeKpiFilter === 'clientes' && (
                    <>
                      <Area type="monotone" dataKey="NovosClientes" name="Novos Clientes" stroke="#7FA88C" strokeWidth={2} fillOpacity={1} fill="url(#colorGreen)" />
                      {metaNovosClientes > 0 && (
                        <ReferenceLine y={metaNovosClientes} stroke="#C9A227" strokeDasharray="4 4" label={{ value: 'Meta Clientes', fill: '#C9A227', fontSize: 9, position: 'top' }} />
                      )}
                    </>
                  )}

                  {activeKpiFilter === 'roi' && (
                    <Area type="monotone" dataKey="ROI" name="ROI (%)" stroke="#C9A227" strokeWidth={2} fillOpacity={1} fill="url(#colorGold)" />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pipeline de Vendas */}
          <div className="bg-[#14181A] p-6 space-y-4 flex flex-col justify-between">
            <div>
              <h3 className="text-[13.5px] font-semibold text-[#D8DEE1]">Pipeline de vendas</h3>
              <p className="text-xs text-[#7C868A] mt-1">Status das negociações do período</p>
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
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#14181A', borderColor: '#23282B' }} 
                    itemStyle={{ color: '#cbd5e1' }} 
                    labelStyle={{ color: '#ffffff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-xs text-slate-500 font-bold uppercase leading-none">Total</span>
                <span className="text-2xl font-black text-white mt-1 font-mono">{totalOportunidades}</span>
              </div>
            </div>

            {/* KPI Strip */}
            <div className="grid grid-cols-3 gap-px bg-[#23282B] border border-[#23282B] mt-4">
              {pipelineData.map(entry => (
                <div key={entry.name} className="bg-[#14181A] p-3 text-center">
                  <div className="text-[9.5px] font-medium text-[#4A5256] uppercase tracking-[0.05em]">{entry.name}</div>
                  <div className="font-mono text-[17px] mt-1" style={{ color: entry.color }}>{entry.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tabelas de Qualidade */}
        <div className="flex items-center gap-3">
          <span className="text-[10.5px] font-medium text-[#4A5256] uppercase tracking-[0.12em] whitespace-nowrap">Clientes e ranking</span>
          <div className="flex-1 h-px bg-[#23282B]"></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-px bg-[#23282B] border border-[#23282B]">
          {/* Top 5 Clientes por Faturamento */}
          <div className="bg-[#14181A] p-6 space-y-4">
            <h3 className="text-[13.5px] font-semibold text-[#D8DEE1]">Top 5 clientes por faturamento</h3>
            <p className="text-xs text-[#7C868A] -mt-2">Período corrente</p>
            {top5Clientes.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse" style={{ fontSize: '12.5px' }}>
                  <thead>
                    <tr className="border-b border-[#23282B]">
                      <th className="pb-2.5 text-left text-[10.5px] uppercase tracking-[0.05em] text-[#4A5256] font-medium">Cliente</th>
                      <th className="pb-2.5 text-left text-[10.5px] uppercase tracking-[0.05em] text-[#4A5256] font-medium">Segmento</th>
                      <th className="pb-2.5 text-right text-[10.5px] uppercase tracking-[0.05em] text-[#4A5256] font-medium">Faturamento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {top5Clientes.map((client, index) => (
                      <tr 
                        key={index} 
                        onClick={() => handleShowClientDetails(client)}
                        className="border-b border-[#1A1F21] cursor-pointer hover:bg-[#1C2022] transition-colors"
                      >
                        <td className="py-3.5 pr-4 text-[#D8DEE1] font-medium">{client.nome}</td>
                        <td className="py-3.5 px-4 text-[#4A5256]" style={{ fontSize: '11.5px' }}>{client.segmento}</td>
                        <td className="py-3.5 text-right font-mono" style={{ fontSize: '12.5px' }}>
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(client.valor)}
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

          {/* Ranking Comercial (Leaderboard Interativo Ganhos & Perdas) */}
          <div className="bg-[#14181A] p-6 space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-baseline justify-between">
                <h3 className="text-[13.5px] font-semibold text-[#D8DEE1]">Ranking & Conversão</h3>
                <span className="text-[9px] font-mono font-bold text-[#C9A227] bg-[#C9A227]/5 border border-[#C9A227]/10 px-1.5 py-0.5 uppercase tracking-wide">
                  Interativo
                </span>
              </div>
              <p className="text-[10px] text-slate-500 -mt-2">Clique em um vendedor para isolar suas métricas e andamento comercial</p>

              <div className="space-y-1">
                {rankingVendedores.map((vend, index) => {
                  const isSelected = selectedVendedorFilter === vend.id;
                  const totalFechadoVal = vend.ganho + vend.perdido;
                  const pctGanho = totalFechadoVal > 0 ? (vend.ganho / totalFechadoVal) * 100 : 0;
                  const pctPerdido = totalFechadoVal > 0 ? (vend.perdido / totalFechadoVal) * 100 : 0;
                  
                  return (
                    <div 
                      key={index} 
                      onClick={() => setSelectedVendedorFilter(isSelected ? 'todos' : vend.id)}
                      className={`flex flex-col py-2.5 px-3 border border-transparent cursor-pointer transition-all hover:bg-[#1C2022] ${
                        isSelected 
                          ? 'bg-[#C9A227]/10 border-[#C9A227]/20 text-white' 
                          : 'text-[#D8DEE1]'
                      }`}
                    >
                      <div className="flex justify-between items-center gap-2">
                        <div className="flex items-center gap-2 truncate">
                          <span className={`font-mono text-[10px] w-4 ${
                            index === 0 ? 'text-[#C9A227] font-bold' : 'text-[#4A5256]'
                          }`}>{String(index + 1).padStart(2, '0')}</span>
                          <div className="flex flex-col truncate">
                            <span className={`text-xs ${isSelected ? 'font-bold text-white' : 'font-medium'}`}>{vend.nome}</span>
                            <span className="text-[9.5px] text-slate-500 font-medium">
                              Conv: {vend.conversao.toFixed(0)}% · {vend.totalNegocios} neg.
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end text-right font-mono text-[11px] flex-shrink-0">
                          <span className="text-[#7FA88C] font-bold">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(vend.ganho)}
                          </span>
                          <span className="text-[#B5504B] text-[9.5px]">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(vend.perdido)}
                          </span>
                        </div>
                      </div>
                      
                      {/* Barra de Proporção Ganho vs Perdido */}
                      {totalFechadoVal > 0 && (
                        <div className="h-1 bg-[#0E1113] w-full mt-1.5 flex overflow-hidden border border-[#23282B]/20">
                          <div className="h-full bg-[#7FA88C]" style={{ width: `${pctGanho}%` }} title={`Ganhos: ${pctGanho.toFixed(0)}%`}></div>
                          <div className="h-full bg-[#B5504B]" style={{ width: `${pctPerdido}%` }} title={`Perdas: ${pctPerdido.toFixed(0)}%`}></div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* KPI Strip */}
            <div className="grid grid-cols-3 gap-px bg-[#23282B] border border-[#23282B] mt-4">
              <div className="bg-[#14181A] p-2.5 text-center">
                <div className="text-[9px] font-semibold text-[#4A5256] uppercase tracking-[0.05em]">Negócios</div>
                <div className="font-mono text-[15px] mt-0.5 text-white">{totalOportunidades}</div>
              </div>
              <div className="bg-[#14181A] p-2.5 text-center">
                <div className="text-[9px] font-semibold text-[#4A5256] uppercase tracking-[0.05em]">Conversão</div>
                <div className="font-mono text-[15px] mt-0.5 text-[#7FA88C]">{conversionRate.toFixed(1)}%</div>
              </div>
              <div className="bg-[#14181A] p-2.5 text-center">
                <div className="text-[9px] font-semibold text-[#4A5256] uppercase tracking-[0.05em]">Lead Time</div>
                <div className="font-mono text-[15px] mt-0.5 text-slate-300">{leadTimeMedio.toFixed(0)}d</div>
              </div>
            </div>
          </div>

          {/* Diagnóstico de Motivos de Negativa (Lost Analysis) */}
          <div className="bg-[#14181A] p-6 space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-baseline justify-between">
                <h3 className="text-[13.5px] font-semibold text-[#D8DEE1]">Principais Motivos de Negativa</h3>
                <span className="text-[9px] font-mono font-bold text-[#B5504B] bg-[#B5504B]/5 border border-[#B5504B]/10 px-1.5 py-0.5 uppercase tracking-wide">
                  Análise
                </span>
              </div>
              <p className="text-[10px] text-slate-500 -mt-2">Mapeamento de objeções registradas em tempo real pelas equipes de vendas</p>

              <div className="space-y-3">
                {motivosFrequencia.items.slice(0, 3).map((mot, index) => {
                  // Determina dica do Kaizen de acordo com o motivo de perda
                  const dicaKaizen = (() => {
                    const mName = mot.name.toLowerCase();
                    if (mName.includes('preço') || mName.includes('verba')) {
                      return "Recomendar simulação de ROI ou parcelamento.";
                    }
                    if (mName.includes('concorrente')) {
                      return "Fortalecer diferenciais competitivos e fit.";
                    }
                    if (mName.includes('recurso') || mName.includes('técnico')) {
                      return "Mapear demanda recorrente para time de produto.";
                    }
                    if (mName.includes('timing') || mName.includes('prazo')) {
                      return "Aplicar gatilhos de urgência comercial.";
                    }
                    return "Criar fluxos automatizados de reengajamento.";
                  })();

                  return (
                    <div key={index} className="bg-[#0E1113] border border-[#23282B] p-3 space-y-2 transition-all hover:border-slate-700">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-mono font-black bg-[#B5504B]/10 border border-[#B5504B]/20 text-[#B5504B] w-4.5 h-4.5 flex items-center justify-center">
                            #{index + 1}
                          </span>
                          <span className="text-[11.5px] font-bold text-[#D8DEE1] truncate max-w-[130px]">{mot.name}</span>
                        </div>
                        <span className="font-mono text-[10px] text-[#B5504B] font-bold">
                          {mot.value} {mot.value === 1 ? 'venda' : 'vendas'} ({mot.pct.toFixed(0)}%)
                        </span>
                      </div>
                      
                      {/* Barra de Proporção de Perdas */}
                      <div className="h-1 bg-[#14181A] w-full flex overflow-hidden border border-[#23282B]/20">
                        <div className="h-full bg-[#B5504B]/80" style={{ width: `${mot.pct}%` }}></div>
                      </div>

                      <div className="text-[9px] text-slate-500 font-sans leading-relaxed pt-1.5 border-t border-[#1A1F21] flex items-center gap-1">
                        <span className="text-[#C9A227]">💡</span>
                        <span>{dicaKaizen}</span>
                      </div>
                    </div>
                  );
                })}

                {motivosFrequencia.items.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-10 text-center space-y-2">
                    <span className="text-2xl">🎉</span>
                    <p className="text-xs text-slate-500 font-sans">Sem objeções ou negativas registradas no período.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="text-[9px] text-slate-500 leading-normal border-t border-[#1A1F21] pt-3 font-sans">
              💡 <strong>Inteligência RevOps:</strong> As negativas acima acumulam {motivosFrequencia.total} perdas. Mapeie e atue nas principais objeções para recuperar receita!
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[#23282B] border border-[#23282B]">
          {/* Ticket Médio por Segmento de Cliente */}
          <div className="bg-[#14181A] p-6 space-y-4">
            <h3 className="text-[13.5px] font-semibold text-[#D8DEE1]">Ticket médio por segmento</h3>
            <div className="space-y-3.5 pt-1.5">
              {Object.entries(ticketMedioPorSegmento).map(([segmento, dados]: any) => (
                <div key={segmento} className="flex items-center justify-between text-xs border-b border-[#23282B]/30 pb-2">
                  <span className="font-semibold text-slate-300 capitalize">{segmento}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-slate-500 font-mono text-[10px]">({dados.quantidade} {dados.quantidade === 1 ? 'contrato' : 'contratos'})</span>
                    <span className="font-bold font-mono text-[#7FA88C]">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dados.valorTotal / dados.quantidade)}
                    </span>
                  </div>
                </div>
              ))}
              {Object.keys(ticketMedioPorSegmento).length === 0 && (
                <p className="text-xs text-slate-500 text-center py-4 font-mono">Sem dados de segmento no período.</p>
              )}
            </div>
          </div>

          {/* Distribuição de Despesas por Categoria */}
          <div className="bg-[#14181A] p-6 space-y-4">
            <h3 className="text-[13.5px] font-semibold text-[#D8DEE1]">Distribuição de despesas</h3>
            <div className="space-y-3.5 pt-1.5">
              {Object.entries(despesasPorCategoria).map(([categoria, valor]: any) => {
                const pctDespesa = totalSaidas > 0 ? (valor / totalSaidas) * 100 : 0;
                return (
                  <div key={categoria} className="flex items-center justify-between text-xs border-b border-[#23282B]/30 pb-2">
                    <span className="font-semibold text-slate-300">{categoria}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-slate-500 font-mono text-[10px]">({pctDespesa.toFixed(0)}%)</span>
                      <span className="font-bold font-mono text-[#B5504B]">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)}
                      </span>
                    </div>
                  </div>
                );
              })}
              {Object.keys(despesasPorCategoria).length === 0 && (
                <p className="text-xs text-slate-500 text-center py-4 font-mono">Nenhuma despesa registrada no período.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SEÇÃO PLANO DE AÇÃO - Melhoria e Ajustes
          ========================================================================= */}
      <div className={`space-y-6 ${mobileTab !== 'dashboard' ? 'block' : 'hidden md:block'}`}>
        <div className="flex items-center gap-3 hidden md:flex">
          <span className="text-[10.5px] font-medium text-[#4A5256] uppercase tracking-[0.12em] whitespace-nowrap">Plano de ação comercial</span>
          <div className="flex-1 h-px bg-[#23282B]"></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 border-t border-l border-[#23282B] bg-[#14181A]">
          {/* Diagnóstico de Vendas Perdidas */}
          <div className={`p-6 lg:col-span-1 border-r border-b border-[#23282B] space-y-4 ${mobileTab === 'whys' ? 'block' : 'hidden md:block'}`}>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                <FileQuestion className="w-4 h-4 text-brand-400" /> Diagnóstico de Perda de Vendas
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
                  <p className="text-[10px] font-bold text-brand-400 uppercase tracking-wider mb-2">Diagnóstico de Motivo de Perda</p>
                  
                  {(() => {
                    const labelsComerciais = [
                      "1. Objeção Principal (ex: Preço, Concorrência)",
                      "2. Por que nossa proposta não cobriu isso?",
                      "3. Qual foi o principal gargalo comercial?",
                      "4. Causa Raiz Real da Perda",
                      "5. Aprendizado / O que ajustar no processo"
                    ];
                    const placeholdersComerciais = [
                      "Qual a objeção declarada pelo cliente?",
                      "Por que não conseguimos contornar a objeção?",
                      "Houve demora, falta de flexibilidade ou concorrência?",
                      "O que de fato causou a perda do negócio?",
                      "Qual a lição para a próxima negociação?"
                    ];
                    return whys.map((why, index) => (
                      <div key={index} className="space-y-1">
                        <label htmlFor={`why-${index}`} className="text-[10px] font-bold text-slate-500 uppercase">
                          {labelsComerciais[index]}
                        </label>
                        <input
                          id={`why-${index}`}
                          type="text"
                          required={index === 0}
                          placeholder={placeholdersComerciais[index]}
                          value={why}
                          onChange={(e) => {
                            const newWhys = [...whys];
                            newWhys[index] = e.target.value;
                            setWhys(newWhys);
                          }}
                          className="w-full bg-[#14181A] border border-[#23282B] rounded-none px-3 py-1.5 text-xs focus:outline-none focus:border-brand-500 text-white"
                        />
                      </div>
                    ));
                  })()}

                  <div className="h-px bg-[#23282B] my-4"></div>
                  <p className="text-[10px] font-bold text-brand-400 uppercase tracking-wider mb-2">Ação Comercial (5W2H)</p>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label htmlFor="action-desc" className="text-[10px] font-bold text-slate-500 uppercase">Ação Corretiva (O quê?)</label>
                      <input
                        id="action-desc"
                        type="text"
                        required
                        placeholder="Ex: Formular plano de descontos estruturados"
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
                        Registrar Plano de Ação <ArrowRight className="w-3.5 h-3.5" />
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
              <div>
                {/* Visualização Mobile: Lista de Cards Fluidos */}
                <div className="md:hidden space-y-3.5">
                  {acoes.map((acao) => (
                    <div key={acao.id} className="bg-[#0E1113] border border-[#23282B] p-4 space-y-3">
                      <div className="flex justify-between items-start gap-3">
                        <span className="font-bold text-white text-xs leading-relaxed">{acao.descricao}</span>
                        <button
                          id={`btn-toggle-action-mob-${acao.id}`}
                          onClick={() => handleToggleActionStatus(acao.id, acao.status)}
                          className={`px-2.5 py-1 text-[9px] font-bold border transition-all rounded-none flex-shrink-0 ${
                            acao.status === 'concluida' 
                              ? 'bg-[#7FA88C]/10 border-[#7FA88C]/20 text-[#7FA88C]' 
                              : acao.status === 'em_andamento'
                              ? 'bg-[#C9A227]/10 border-[#C9A227]/20 text-[#C9A227]'
                              : 'bg-[#14181A] border-[#23282B] text-slate-400'
                          }`}
                        >
                          {acao.status === 'concluida' ? 'Concluída' : acao.status === 'em_andamento' ? 'Em Andamento' : 'Planejada'}
                        </button>
                      </div>

                      {acao.causa_raiz && (
                        <div className="text-[10px] text-slate-400 bg-[#14181A] p-2.5 border border-[#23282B]/60 leading-relaxed">
                          <span className="text-[8px] font-extrabold text-slate-500 uppercase tracking-widest block mb-1">Diagnóstico (Causa Raiz)</span>
                          {acao.causa_raiz}
                        </div>
                      )}

                      <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono border-t border-[#23282B]/40 pt-2.5">
                        <div>
                          <span className="text-slate-500 font-semibold">Responsável:</span> <span className="text-slate-200 font-bold">{acao.responsavel}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 font-semibold">Prazo:</span> <span className="text-slate-200 font-bold">
                            {(() => {
                              if (!acao.prazo) return '-';
                              const parts = acao.prazo.split('T')[0].split('-');
                              if (parts.length < 3) return acao.prazo;
                              return `${parts[2]}/${parts[1]}/${parts[0]}`;
                            })()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Visualização Desktop: Tabela de Grade */}
                <div className="hidden md:block overflow-x-auto">
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
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-12 text-center font-mono">Nenhum plano de ação registrado.</p>
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
          className={`flex flex-col items-center justify-center gap-1 transition-all ${
            mobileTab === 'dashboard' ? 'text-brand-500 scale-105' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <TrendingUp className="w-5 h-5" />
          <span className="text-[10px] font-bold">Métricas</span>
        </button>
        
        <button
          onClick={() => setMobileTab('whys')}
          className={`flex flex-col items-center justify-center gap-1 transition-all ${
            mobileTab === 'whys' ? 'text-brand-500 scale-105' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileQuestion className="w-5 h-5" />
          <span className="text-[10px] font-bold font-sans">Diagnóstico</span>
        </button>
        
        <button
          onClick={() => setMobileTab('actions')}
          className={`flex flex-col items-center justify-center gap-1 transition-all ${
            mobileTab === 'actions' ? 'text-brand-500 scale-105' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ClipboardList className="w-5 h-5" />
          <span className="text-[10px] font-bold font-sans">Planos</span>
        </button>
      </div>

      {/* Modal: Editar Metas do Gestor */}
      {isGoalModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-[450px] glass-panel border-slate-800 bg-slate-900/95 p-6 shadow-2xl space-y-4 animate-slide-up">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">Editar Metas Organizacionais</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Referência: {period}</p>
              </div>
              <button onClick={() => setIsGoalModalOpen(false)} className="p-1 text-slate-400 hover:text-white"><X className="w-4.5 h-4.5" /></button>
            </div>

            <form onSubmit={handleGoalSubmit} className="space-y-4">
              {goalModalError && (
                <div className="p-3 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold">
                  {goalModalError}
                </div>
              )}

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

      {/* =========================================================================
          MODAL DE CADASTRO DE VENDEDOR
          ========================================================================= */}
      {isVendedorModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-[400px] glass-panel border border-[#23282B] bg-[#14181A] p-6 shadow-none space-y-4">
            <div className="flex items-center justify-between border-b border-[#23282B] pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Plus className="w-4.5 h-4.5 text-[#C9A227]" /> Cadastrar Novo Vendedor
              </h3>
              <button onClick={() => setIsVendedorModalOpen(false)} className="p-1 rounded bg-[#0E1113] border border-[#23282B] text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {vendedorModalError && (
              <div className="p-3 bg-[#B5504B]/10 border border-[#B5504B]/20 text-[#B5504B] text-xs font-semibold leading-relaxed">
                {vendedorModalError}
              </div>
            )}

            <form onSubmit={handleVendedorSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="input-vendedor-name" className="text-[10px] font-bold text-slate-400 uppercase">Nome Completo</label>
                <input
                  id="input-vendedor-name"
                  type="text"
                  required
                  placeholder="Ex: Mariana Silva"
                  value={newVendedorNome}
                  onChange={(e) => setNewVendedorNome(e.target.value)}
                  className="w-full glass-input text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="input-vendedor-email" className="text-[10px] font-bold text-slate-400 uppercase">E-mail Corporativo</label>
                <input
                  id="input-vendedor-email"
                  type="email"
                  required
                  placeholder="Ex: mariana.silva@novapay.com"
                  value={newVendedorEmail}
                  onChange={(e) => setNewVendedorEmail(e.target.value)}
                  className="w-full glass-input text-xs"
                />
              </div>

              <button
                id="btn-save-vendedor-submit"
                type="submit"
                disabled={submittingVendedor}
                className="w-full btn-primary py-2.5 text-xs mt-2"
              >
                {submittingVendedor ? 'Sincronizando...' : 'Cadastrar Vendedor'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL DE DETALHES DO CLIENTE
          ========================================================================= */}
      {selectedClientDetails && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-[420px] glass-panel border border-[#23282B] bg-[#14181A] p-6 shadow-none space-y-4 relative">
            <div className="flex items-center justify-between border-b border-[#23282B] pb-3">
              <div className="flex flex-col">
                <span className="text-[9px] font-mono font-bold text-[#C9A227] uppercase tracking-wider">Detalhamento de Conta</span>
                <h3 className="text-sm font-bold text-white tracking-tight">{selectedClientDetails.nome}</h3>
              </div>
              <button 
                onClick={() => setSelectedClientDetails(null)} 
                className="p-1 rounded bg-[#0E1113] border border-[#23282B] text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 bg-[#0E1113] p-4 border border-[#23282B]">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Segmento comercial:</span>
                <span className="text-slate-300 font-semibold capitalize">{selectedClientDetails.segmento}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Gestor comercial (vendedor):</span>
                <span className="text-white font-semibold">{selectedClientDetails.vendedorNome}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Receita total confirmada:</span>
                <span className="text-[#7FA88C] font-mono font-bold">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedClientDetails.valorTotal)}
                </span>
              </div>
            </div>

            {/* Histórico de Negociações */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Histórico de Oportunidades ({selectedClientDetails.propostas.length})</p>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {selectedClientDetails.propostas.map((prop: any, idx: number) => (
                  <div key={idx} className="bg-[#0E1113]/60 border border-[#23282B]/60 p-2.5 flex justify-between items-center text-xs">
                    <div className="flex flex-col">
                      <span className="text-slate-300 font-semibold">Proposta #{idx + 1}</span>
                      <span className="text-[10px] text-slate-500">{new Date(prop.data_fechamento || prop.data_abertura).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(prop.valor_contrato)}
                      </span>
                      <span className={`text-[9px] px-1.5 py-0.5 border font-bold uppercase ${
                        prop.status === 'ganho' ? 'border-[#7FA88C]/20 text-[#7FA88C] bg-[#7FA88C]/5' :
                        prop.status === 'perdido' ? 'border-[#B5504B]/20 text-[#B5504B] bg-[#B5504B]/5' :
                        'border-[#C9A227]/20 text-[#C9A227] bg-[#C9A227]/5'
                      }`}>
                        {prop.status}
                      </span>
                    </div>
                  </div>
                ))}
                {selectedClientDetails.propostas.length === 0 && (
                  <p className="text-[10.5px] text-slate-500 text-center py-4">Nenhuma proposta comercial no período.</p>
                )}
              </div>
            </div>

            <button 
              onClick={() => setSelectedClientDetails(null)}
              className="w-full btn-primary py-2.5 text-xs"
            >
              Fechar Detalhes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
