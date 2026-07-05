import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ComposedChart, Bar, Line, Cell
} from 'recharts';
import { 
  Plus, CheckCircle, RefreshCw, FileQuestion, ArrowRight, ClipboardList, Edit2, X, AlertOctagon, TrendingUp,
  Bell, Check
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
  sparklineData?: { valor: number }[];
  sparklineColor?: string;
}

function ReadoutCard({ 
  label, value, foot, footRight, footRightColor, hero, onClick, active, sparklineData, sparklineColor 
}: ReadoutCardProps) {
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
        <div className="flex items-center justify-between mt-3 mb-2.5">
          <p className={`font-mono font-bold text-white leading-none ${hero ? 'text-[30px] md:text-[34px]' : 'text-[24px] md:text-[26px]'}`}>{value}</p>
          {sparklineData && sparklineData.length > 0 && (
            <div className="w-16 md:w-20 h-7 flex-shrink-0 opacity-40 ml-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparklineData} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
                  <defs>
                    <linearGradient id={`sparkGrad-${label.replace(/[^a-zA-Z]/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={sparklineColor || '#7C868A'} stopOpacity={0.4}/>
                      <stop offset="95%" stopColor={sparklineColor || '#7C868A'} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="valor"
                    stroke={sparklineColor || '#7C868A'}
                    strokeWidth={1.5}
                    fillOpacity={1}
                    fill={`url(#sparkGrad-${label.replace(/[^a-zA-Z]/g, '')})`}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
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

export default function GestorDashboard({ resetKey = 0 }: { resetKey?: number }) {
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

  // Popover de Notificações / Alertas operacionais
  const [showNotificationPopover, setShowNotificationPopover] = useState(false);

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
        supabase.from('vendas').select('*, vendedores(nome), clientes(nome, segmento)'),
        supabase.from('transacoes').select('*, clientes(nome, segmento)'),
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

  // Resetar dashboard ao clicar no logo (resetKey vem do App.tsx)
  useEffect(() => {
    if (resetKey === 0) return; // Ignora a montagem inicial
    setSelectedVendedorFilter('todos');
    setPeriod('2026-07');
    setActiveKpiFilter('receita');
    setMobileTab('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    loadData();
  }, [resetKey]);

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

    // Trimestre: Qn-YYYY
    const qMatch = period.match(/^Q(\d)-([\d]{4})$/);
    if (qMatch) {
      const q = parseInt(qMatch[1]);
      const y = qMatch[2];
      const qMonths: Record<number, string[]> = {
        1: ['01','02','03'], 2: ['04','05','06'],
        3: ['07','08','09'], 4: ['10','11','12']
      };
      return year === y && (qMonths[q] || []).includes(month);
    }

    // Semestre: S1-YYYY ou S2-YYYY
    const sMatch = period.match(/^S(\d)-([\d]{4})$/);
    if (sMatch) {
      const s = parseInt(sMatch[1]);
      const y = sMatch[2];
      const sMonths: Record<number, string[]> = {
        1: ['01','02','03','04','05','06'],
        2: ['07','08','09','10','11','12']
      };
      return year === y && (sMonths[s] || []).includes(month);
    }

    // Formato YYYY-MM
    return `${year}-${month}` === period;
  }, [period]);

  // 1. Filtragem das Metas do Período
  const activeGoals = metas.filter(m => {
    if (!m.mes_referencia) return false;
    const cleanDate = m.mes_referencia.split('T')[0];
    const parts = cleanDate.split('-');
    if (parts.length < 2) return false;
    const year = parts[0];
    const month = parts[1];

    const qMatch = period.match(/^Q(\d)-([\d]{4})$/);
    if (qMatch) {
      const q = parseInt(qMatch[1]);
      const y = qMatch[2];
      const qMonths: Record<number, string[]> = {
        1: ['01','02','03'], 2: ['04','05','06'],
        3: ['07','08','09'], 4: ['10','11','12']
      };
      return year === y && (qMonths[q] || []).includes(month);
    }
    const sMatch = period.match(/^S(\d)-([\d]{4})$/);
    if (sMatch) {
      const s = parseInt(sMatch[1]);
      const y = sMatch[2];
      const sMonths: Record<number, string[]> = {
        1: ['01','02','03','04','05','06'],
        2: ['07','08','09','10','11','12']
      };
      return year === y && (sMonths[s] || []).includes(month);
    }
    return `${year}-${month}` === period;
  });

  const metaReceitaTotal = activeGoals.reduce((acc, m) => acc + Number(m.meta_receita), 0);
  const metaNovosClientesTotal = activeGoals.reduce((acc, m) => acc + m.meta_novos_clientes, 0);

  const totalVendedoresCount = vendedores.length > 0 ? vendedores.length : 3;
  const metaReceita = selectedVendedorFilter === 'todos' 
    ? metaReceitaTotal 
    : (metaReceitaTotal / totalVendedoresCount);
  const metaNovosClientes = selectedVendedorFilter === 'todos' 
    ? metaNovosClientesTotal 
    : Math.round(metaNovosClientesTotal / totalVendedoresCount);

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

  // 8. Ranking de Vendedores (Apenas Vendedores comerciais, removendo perfil 'gestor')
  const rankingVendedores = vendedores
    .filter(vend => vend.perfil === 'vendedor')
    .map(vend => {
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

    // Buscar meta histórica desse mês correspondente
    const metaDoMesObj = metas.find(meta => meta.mes_referencia && meta.mes_referencia.startsWith(m));
    const metaReceitaHist = metaDoMesObj ? Number(metaDoMesObj.meta_receita) : 0;
    const metaClientesHist = metaDoMesObj ? Number(metaDoMesObj.meta_novos_clientes) : 0;

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
      NovosClientes: novosClientesVal,
      MetaReceita: selectedVendedorFilter === 'todos' ? metaReceitaHist : (metaReceitaHist / totalVendedoresCount),
      MetaClientes: selectedVendedorFilter === 'todos' ? metaClientesHist : Math.round(metaClientesHist / totalVendedoresCount)
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

  // 14. Projeção de Faturamento Fim do Mês (Forecast Realista por Pipeline)
  // Receita Realizada + (Valor das Vendas Em Negociação * Conversão Comercial Histórica Geral)
  const isCurrentMonth = period === '2026-07';
  const totalNegociosEmNegociacao = baseFilteredVendas
    .filter(v => v.status === 'em_negociacao')
    .reduce((acc, v) => acc + Number(v.valor_contrato), 0);
  
  const totalOportunidadesConcluidas = vendas.filter(v => ['ganho', 'perdido'].includes(v.status)).length;
  const totalOportunidadesGanhas = vendas.filter(v => v.status === 'ganho').length;
  const taxaConversaoMedia = totalOportunidadesConcluidas > 0 
    ? (totalOportunidadesGanhas / totalOportunidadesConcluidas) 
    : 0.77; // fallback histórico geral ~77%

  const projectedRevenue = isCurrentMonth 
    ? (totalEntradas + (totalNegociosEmNegociacao * taxaConversaoMedia)) 
    : totalEntradas;

  // Valores dos faturamentos por estágio do Funil
  const valorNegociando = filteredVendas.filter(v => v.status === 'em_negociacao').reduce((acc, v) => acc + Number(v.valor_contrato), 0);
  const valorGanho = wonVendas.reduce((acc, v) => acc + Number(v.valor_contrato), 0);
  const valorPerdido = lostVendas.reduce((acc, v) => acc + Number(v.valor_contrato), 0);

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
      const { error: saleUpdateError } = await supabase
        .from('vendas')
        .update({ motivo_perda: causaCadeia })
        .eq('id', selectedVendaPerdida);

      if (saleUpdateError) throw saleUpdateError;

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
    } catch (error: any) {
      console.error('Erro ao registrar Kaizen:', error);
      alert(`Falha ao registrar a análise: ${error.message || 'Erro de conexão ou permissão.'}`);
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
    } catch (error: any) {
      console.error('Erro ao registrar ação:', error);
      alert(`Falha ao salvar a ação 5W2H: ${error.message || 'Erro de conexão ou permissão.'}`);
    } finally {
      setSubmittingAction(false);
    }
  };

  // Mudar Status da Ação (PDCA)
  const handleToggleActionStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'planejada' ? 'em_andamento' : currentStatus === 'em_andamento' ? 'concluida' : 'planejada';
    try {
      const { error } = await supabase
        .from('pdca_acoes')
        .update({ status: nextStatus })
        .eq('id', id);
      
      if (error) throw error;
      loadData();
    } catch (error: any) {
      console.error('Erro ao atualizar status da ação:', error);
      alert(`Falha ao atualizar o status da ação: ${error.message || 'Erro de conexão ou permissão.'}`);
    }
  };

  // Arquivar / Resolver Alerta Andon ou de Meta
  const handleResolveAlerta = async (id: string) => {
    try {
      const { error } = await supabase
        .from('alertas_andon')
        .update({ resolvido: true })
        .eq('id', id);

      if (error) throw error;
      loadData();
    } catch (error: any) {
      console.error('Erro ao resolver alerta:', error);
      alert(`Falha ao arquivar alerta: ${error.message || 'Erro de conexão ou permissão.'}`);
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
    if (/^[QS]\d-\d{4}$/.test(period)) return;

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
        <div className="flex flex-wrap items-center gap-4">
        </div>

        <div className="flex items-center gap-3 relative">
          {/* Sino de Alertas Andon / Meta */}
          <div className="relative">
            <button
              id="btn-alert-notifications"
              onClick={() => setShowNotificationPopover(!showNotificationPopover)}
              className={`p-1.5 border transition-all flex items-center justify-center relative rounded-none ${
                alertas.filter(a => !a.resolvido).length > 0
                  ? 'bg-[#B5504B]/10 border-[#B5504B]/30 text-[#B5504B] hover:bg-[#B5504B]/20'
                  : 'bg-[#14181A] border-[#23282B] text-slate-400 hover:text-white'
              }`}
              title="Alertas Operacionais"
            >
              <Bell className="w-3.5 h-3.5" />
              {alertas.filter(a => !a.resolvido).length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#B5504B] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#B5504B]"></span>
                </span>
              )}
            </button>

            {/* Dropdown de Alertas do Sino */}
            {showNotificationPopover && (
              <div className="absolute right-0 mt-2 w-80 bg-[#14181A] border border-[#23282B] shadow-2xl p-4 z-50 rounded-none space-y-3">
                <div className="flex items-center justify-between border-b border-[#23282B] pb-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertOctagon className="w-3.5 h-3.5 text-[#B5504B]" />
                    Desvios Comerciais ({alertas.filter(a => !a.resolvido).length})
                  </span>
                  <button 
                    onClick={() => setShowNotificationPopover(false)}
                    className="text-slate-500 hover:text-white text-xs"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                
                <div className="max-h-64 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin">
                  {alertas.filter(a => !a.resolvido).length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-4 font-mono">Sem desvios comerciais ativos.</p>
                  ) : (
                    alertas.filter(a => !a.resolvido).map(alerta => (
                      <div key={alerta.id} className="text-[11px] bg-[#0E1113] border border-[#23282B] p-2.5 space-y-2">
                        <div className="text-slate-300 font-sans leading-normal">
                          {alerta.mensagem}
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-[#1D2123]">
                          <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 bg-[#B5504B]/10 text-[#B5504B] font-mono">
                            Crítico
                          </span>
                          <button
                            onClick={() => handleResolveAlerta(alerta.id)}
                            className="text-[9px] font-bold text-slate-400 hover:text-white flex items-center gap-1 transition-colors uppercase font-mono"
                          >
                            <Check className="w-3 h-3 text-[#7FA88C]" /> Arquivar
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            id="btn-refresh-data"
            onClick={handleRefresh}
            className="p-1.5 bg-[#14181A] hover:bg-[#23282B] border border-[#23282B] text-slate-400 hover:text-white transition-all flex items-center justify-center"
            title="Atualizar Dados"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          {/* Botões de Gestão */}
          <button
            id="btn-add-vendedor-modal"
            onClick={() => setIsVendedorModalOpen(true)}
            className="px-3 py-1.5 bg-[#14181A] hover:bg-[#23282B] border border-[#23282B] text-[10px] font-bold text-[#C9A227] hover:text-white transition-all uppercase tracking-wider flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Cadastrar Vendedor
          </button>
          {!/^[QS]\d-\d{4}$/.test(period) && (
            <button
              id="btn-edit-goals"
              onClick={openGoalModal}
              className="px-3 py-1.5 bg-[#14181A] hover:bg-[#23282B] border border-[#23282B] text-[10px] font-bold text-[#C9A227] hover:text-white transition-all uppercase tracking-wider flex items-center gap-1.5"
            >
              <Edit2 className="w-3.5 h-3.5" /> Editar Metas
            </button>
          )}
        </div>
      </div>

      {/* =========================================================================
          GAUGE — Calibração de Faturamento vs Meta
          ========================================================================= */}
      <div className={mobileTab === 'dashboard' ? 'block' : 'hidden md:block'}>
        {/* Header da Gauge */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-4">
          <div>
            <p className="text-[10.5px] font-medium text-[#4A5256] uppercase tracking-[0.12em] mb-1">Faturamento do período face à meta</p>
          </div>
          <div className="flex flex-col items-end text-right flex-shrink-0">
            <div className="font-mono text-base font-bold text-white flex items-baseline gap-1.5 justify-end">
              <span className="text-2xl font-black">{pctReceita.toFixed(1)}%</span>
              <span className="text-xs text-slate-500">de</span>
              <span className="text-sm font-bold text-[#C9A227] tracking-wider">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(metaReceita)}
              </span>
            </div>
            {metaReceita > 0 && (
              <span className="text-[10px] text-slate-500 block mt-0.5 font-mono">
                {pctReceita >= 100 ? 'meta atingida' : `${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(metaReceita - totalEntradas)} restante`} · {pctReceita < 70 ? 'abaixo do limiar' : pctReceita >= 100 ? 'meta alcançada' : 'zona de atenção'}
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
          {/* Ticks proporcionais e distribuídos uniformemente de 0% a 100% */}
          <div className="flex justify-between items-center mt-2.5 font-mono text-[10px]">
            <span className="text-[#4A5256]">R$ 0</span>
            <span className="text-[#4A5256]">
              {new Intl.NumberFormat('pt-BR', { notation: 'compact', style: 'currency', currency: 'BRL' }).format(metaReceita * 0.25)}
            </span>
            <span className="text-[#4A5256]">
              {new Intl.NumberFormat('pt-BR', { notation: 'compact', style: 'currency', currency: 'BRL' }).format(metaReceita * 0.5)}
            </span>
            <span className="text-[#4A5256]">
              {new Intl.NumberFormat('pt-BR', { notation: 'compact', style: 'currency', currency: 'BRL' }).format(metaReceita * 0.75)}
            </span>
            <span className="text-[10px] font-mono font-bold text-[#C9A227] bg-[#C9A227]/5 border border-[#C9A227]/10 px-2 py-0.5 uppercase tracking-wider">
              Objetivo: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(metaReceita)}
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SEÇÃO RESULTADOS — KPIs
          ========================================================================= */}
      <div className={`space-y-8 ${mobileTab === 'dashboard' ? 'block' : 'hidden md:block'}`}>
        {/* Resultados do período */}
        <div className="flex items-center gap-3">
          <span className="text-[10.5px] font-medium text-[#4A5256] uppercase tracking-[0.12em] whitespace-nowrap">Resultados do período</span>
          <div className="flex-1 h-px bg-[#23282B]"></div>
        </div>


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
            sparklineData={chartHistoricoData.map(d => ({ valor: d.Faturamento }))}
            sparklineColor="#7FA88C"
          />
          <ReadoutCard
            label="Ticket Médio"
            value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(ticketMedio)}
            foot="por contrato fechado"
            onClick={() => setActiveKpiFilter('ticket')}
            active={activeKpiFilter === 'ticket'}
            sparklineData={chartHistoricoData.map(d => ({ valor: d.TicketMedio }))}
            sparklineColor="#7C868A"
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
              <h3 className="text-[13.5px] font-semibold text-[#D8DEE1] flex items-center justify-between gap-2 flex-wrap">
                <span className="flex items-center gap-2">
                  {activeKpiFilter === 'receita' && "Evolução de Receita & Perdas"}
                  {activeKpiFilter === 'ticket' && "Evolução de Ticket Médio"}
                  {activeKpiFilter === 'saldo' && "Evolução de Saldo Operacional"}
                  {activeKpiFilter === 'clientes' && "Acompanhamento de Novos Clientes"}
                  {activeKpiFilter === 'roi' && "Retorno sobre Investimento (ROI)"}
                </span>

                {/* Período Contextual Selector */}
                <div className="relative inline-block">
                  <select
                    id="filter-period-select"
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    className="appearance-none bg-[#C9A227]/5 border border-[#C9A227]/25 text-[#C9A227] hover:border-[#C9A227]/50 text-[9px] font-mono font-bold px-2 py-0.5 pr-5 uppercase tracking-wider rounded-none cursor-pointer focus:outline-none focus:ring-0"
                  >
                    <optgroup label="Meses" className="bg-[#0E1113] text-white">
                      {(() => {
                        const opts = [];
                        const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
                        const now = new Date(2026, 6, 1);
                        for (let i = 0; i < 18; i++) {
                          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                          const y = d.getFullYear();
                          const m = String(d.getMonth() + 1).padStart(2, '0');
                          opts.push(<option key={`${y}-${m}`} value={`${y}-${m}`}>{monthNames[d.getMonth()]} {y}</option>);
                        }
                        return opts;
                      })()}
                    </optgroup>
                    <optgroup label="Trimestres" className="bg-[#0E1113] text-white">
                      {[2026,2025].flatMap(y => [4,3,2,1].map(q => (
                        <option key={`Q${q}-${y}`} value={`Q${q}-${y}`}>{q}º Trimestre {y}</option>
                      )))}
                    </optgroup>
                    <optgroup label="Semestres" className="bg-[#0E1113] text-white">
                      {[2026,2025].flatMap(y => [2,1].map(s => (
                        <option key={`S${s}-${y}`} value={`S${s}-${y}`}>{s}º Semestre {y}</option>
                      )))}
                    </optgroup>
                  </select>
                  <span className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-[6px] text-[#C9A227] font-mono font-black">
                    ▼
                  </span>
                </div>
              </h3>
              
              {/* Legenda Dinâmica de Filtros Aplicados */}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 mt-2.5 text-[11px] text-slate-500 font-sans border-t border-[#1A1F21] pt-2.5">
                <span className="text-slate-600">Visualizando:</span>
                
                {/* Vendedor Contextual Selector */}
                <div className="relative inline-block">
                  <select
                    id="filter-vendedor-select"
                    value={selectedVendedorFilter}
                    onChange={(e) => setSelectedVendedorFilter(e.target.value)}
                    className={`appearance-none font-mono text-[9px] uppercase font-bold px-2 py-0.5 pr-5 border rounded-none cursor-pointer focus:outline-none focus:ring-0 ${
                      selectedVendedorFilter === 'todos'
                        ? 'text-slate-400 bg-[#23282B] border-[#23282B] hover:border-slate-600'
                        : 'text-[#C9A227] bg-[#C9A227]/5 border-[#C9A227]/25 hover:border-[#C9A227]/50'
                    }`}
                  >
                    <option value="todos" className="bg-[#0E1113] text-white">Todos os Vendedores</option>
                    {vendedores.filter(v => v.perfil === 'vendedor').map(v => (
                      <option key={v.id} value={v.id} className="bg-[#0E1113] text-white">{v.nome}</option>
                    ))}
                  </select>
                  <span className={`absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-[6px] font-mono font-black ${
                    selectedVendedorFilter === 'todos' ? 'text-slate-500' : 'text-[#C9A227]'
                  }`}>
                    ▼
                  </span>
                </div>

                <span className="text-[#23282B] font-mono">|</span>
                <span className="text-slate-400 font-medium">
                  {activeKpiFilter === 'receita' && "Curva de faturamento ganho comparado a perdas"}
                  {activeKpiFilter === 'ticket' && "Média de faturamento por contrato ganho"}
                  {activeKpiFilter === 'saldo' && "Diferença entre receitas e despesas confirmadas"}
                  {activeKpiFilter === 'clientes' && "Contagem de novos clientes vs metas do período"}
                  {activeKpiFilter === 'roi' && "Retorno percentual sobre as despesas de saídas"}
                </span>
              </div>
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
                      <Area type="monotone" dataKey="MetaReceita" name="Meta Faturamento" stroke="#C9A227" strokeWidth={1.5} strokeDasharray="4 4" fill="none" />
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
                      <Area type="monotone" dataKey="MetaClientes" name="Meta Novos Clientes" stroke="#C9A227" strokeWidth={1.5} strokeDasharray="4 4" fill="none" />
                    </>
                  )}

                  {activeKpiFilter === 'roi' && (
                    <Area type="monotone" dataKey="ROI" name="ROI (%)" stroke="#C9A227" strokeWidth={2} fillOpacity={1} fill="url(#colorGold)" />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pipeline de Vendas (Funil Comercial) */}
          <div className="bg-[#14181A] p-6 space-y-4 flex flex-col justify-between">
            <div>
              <h3 className="text-[13.5px] font-semibold text-[#D8DEE1]">Pipeline de vendas (Funil)</h3>
              <p className="text-xs text-[#7C868A] mt-1">Status das negociações do período</p>
            </div>

            {/* Visualização de Funil Comercial Geométrico */}
            <div className="space-y-2.5 py-2">
              {/* Estágio 1: Em Negociação (Topo do Funil - 100%) */}
              <div
                className="mx-auto bg-[#C9A227]/5 border border-[#C9A227]/20 p-2.5 flex flex-col justify-between relative overflow-hidden transition-all duration-300 hover:bg-[#C9A227]/10"
                style={{ width: '100%' }}
              >
                <div className="flex justify-between items-center z-10">
                  <span className="text-[9.5px] font-bold text-[#C9A227] uppercase tracking-wider">1. Em Negociação</span>
                  <span className="text-[11px] font-mono font-bold text-white">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(valorNegociando)}
                  </span>
                </div>
                <div className="absolute left-0 bottom-0 h-0.5 bg-[#C9A227] opacity-40" style={{ width: `${totalOportunidades > 0 ? (countNegociacao / totalOportunidades * 100) : 0}%` }}></div>
              </div>

              {/* Estágio 2: Fechado Ganho (Meio do Funil - 85%) */}
              <div
                className="mx-auto bg-[#7FA88C]/5 border border-[#7FA88C]/20 p-2.5 flex flex-col justify-between relative overflow-hidden transition-all duration-300 hover:bg-[#7FA88C]/10"
                style={{ width: '85%' }}
              >
                <div className="flex justify-between items-center z-10">
                  <span className="text-[9.5px] font-bold text-[#7FA88C] uppercase tracking-wider">2. Fechado Ganho</span>
                  <span className="text-[11px] font-mono font-bold text-white">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(valorGanho)}
                  </span>
                </div>
                <div className="absolute left-0 bottom-0 h-0.5 bg-[#7FA88C] opacity-40" style={{ width: `${totalOportunidades > 0 ? (countGanho / totalOportunidades * 100) : 0}%` }}></div>
              </div>

              {/* Estágio 3: Fechado Perdido (Fundo do Funil - 70%) */}
              <div
                className="mx-auto bg-[#B5504B]/5 border border-[#B5504B]/20 p-2.5 flex flex-col justify-between relative overflow-hidden transition-all duration-300 hover:bg-[#B5504B]/10"
                style={{ width: '70%' }}
              >
                <div className="flex justify-between items-center z-10">
                  <span className="text-[9.5px] font-bold text-[#B5504B] uppercase tracking-wider">3. Fechado Perdido</span>
                  <span className="text-[11px] font-mono font-bold text-white">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(valorPerdido)}
                  </span>
                </div>
                <div className="absolute left-0 bottom-0 h-0.5 bg-[#B5504B] opacity-40" style={{ width: `${totalOportunidades > 0 ? (countPerdido / totalOportunidades * 100) : 0}%` }}></div>
              </div>
            </div>

            {/* KPI Strip Informativo */}
            <div className="grid grid-cols-3 gap-px bg-[#23282B] border border-[#23282B] mt-2">
              <div className="bg-[#14181A] p-2.5 text-center">
                <div className="text-[9px] font-semibold text-[#4A5256] uppercase tracking-[0.05em]">Negócios Totais</div>
                <div className="font-mono text-[14px] mt-0.5 text-white">{totalOportunidades}</div>
              </div>
              <div className="bg-[#14181A] p-2.5 text-center">
                <div className="text-[9px] font-semibold text-[#4A5256] uppercase tracking-[0.05em]">Taxa Ganho</div>
                <div className="font-mono text-[14px] mt-0.5 text-[#7FA88C] font-bold">
                  {totalOportunidades > 0 ? ((countGanho / totalOportunidades) * 100).toFixed(0) : '0'}%
                </div>
              </div>
              <div className="bg-[#14181A] p-2.5 text-center">
                <div className="text-[9px] font-semibold text-[#4A5256] uppercase tracking-[0.05em]">Taxa Perda</div>
                <div className="font-mono text-[14px] mt-0.5 text-[#B5504B]">
                  {totalOportunidades > 0 ? ((countPerdido / totalOportunidades) * 100).toFixed(0) : '0'}%
                </div>
              </div>
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
          <div className="bg-[#14181A] p-6 space-y-4 lg:col-span-1">
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

          {/* Ranking Comercial (Gráfico de Pareto de Vendas) */}
          <div className="bg-[#14181A] p-6 space-y-4 flex flex-col justify-between lg:col-span-1">
            <div className="space-y-4 flex-1 flex flex-col">
              <div className="flex items-baseline justify-between flex-shrink-0">
                <h3 className="text-[13.5px] font-semibold text-[#D8DEE1]">Análise de Pareto de Vendas</h3>
                <span className="text-[9px] font-mono font-bold text-[#C9A227] bg-[#C9A227]/5 border border-[#C9A227]/10 px-1.5 py-0.5 uppercase tracking-wide">
                  Desempenho
                </span>
              </div>
              <p className="text-[10px] text-slate-500 -mt-2 flex-shrink-0">
                Faturamento individual vs. participação acumulada sobre as vendas totais
              </p>

              {/* Gráfico Composed (Pareto) */}
              <div className="h-64 w-full text-[10px] font-mono mt-2 flex-1 min-h-[220px]">
                {(() => {
                  const sortedVendedores = [...rankingVendedores].sort((a, b) => b.ganho - a.ganho);
                  const totalGanhosRanking = sortedVendedores.reduce((acc, v) => acc + v.ganho, 0);
                  
                  let acumulado = 0;
                  const dataPareto = sortedVendedores.map(v => {
                    acumulado += v.ganho;
                    const pctAcumulada = totalGanhosRanking > 0 ? (acumulado / totalGanhosRanking) * 100 : 0;
                    return {
                      vendedor: v.nome.split(' ')[0], // Apenas primeiro nome
                      "Valor Vendido": v.ganho,
                      "Participação Acumulada": pctAcumulada
                    };
                  });

                  if (totalGanhosRanking === 0) {
                    return (
                      <div className="h-full flex items-center justify-center text-slate-500 font-sans text-xs">
                        Sem faturamento no período selecionado.
                      </div>
                    );
                  }

                  return (
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={dataPareto} margin={{ top: 15, right: 10, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1A1F21" vertical={false} />
                        <XAxis dataKey="vendedor" stroke="#475569" tickLine={false} />
                        <YAxis 
                          yAxisId="left"
                          stroke="#475569" 
                          tickLine={false} 
                          tickFormatter={(val) => new Intl.NumberFormat('pt-BR', { notation: 'compact', compactDisplay: 'short' }).format(val)} 
                        />
                        <YAxis 
                          yAxisId="right"
                          orientation="right"
                          stroke="#475569" 
                          tickLine={false} 
                          domain={[0, 100]}
                          tickFormatter={(val) => `${val}%`} 
                        />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0E1113', borderColor: '#23282B', borderRadius: 0 }} 
                          itemStyle={{ fontSize: 11, fontFamily: 'monospace' }} 
                          labelStyle={{ fontSize: 10.5, fontWeight: 'bold', color: '#fff', marginBottom: 4 }}
                          formatter={(value: any, name: any) => {
                            if (name === "Participação Acumulada") return [`${Number(value).toFixed(1)}%`, name];
                            return [new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value), name];
                          }}
                        />
                        <Bar 
                          yAxisId="left"
                          dataKey="Valor Vendido" 
                          barSize={20}
                        >
                          {dataPareto.map((_, idx) => {
                            // Cores contrastantes e consistentes com a paleta comercial da NovaPay
                            const colors = ['#7FA88C', '#B5504B', '#C9A227', '#8A9A86'];
                            return <Cell key={`cell-${idx}`} fill={colors[idx % colors.length]} />;
                          })}
                        </Bar>
                        <Line 
                          yAxisId="right"
                          type="monotone" 
                          dataKey="Participação Acumulada" 
                          stroke="#C9A227" 
                          strokeWidth={2}
                          dot={{ fill: '#C9A227', r: 3 }}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  );
                })()}
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
