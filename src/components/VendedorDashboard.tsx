import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
  DollarSign, Target, Percent, Plus, Edit2, Check, X, 
  Trash2, RefreshCw, ClipboardList, AlertCircle 
} from 'lucide-react';

interface Vendedor {
  id: string;
  nome: string;
  email: string;
  perfil: 'vendedor' | 'gestor';
}

interface VendedorDashboardProps {
  vendedor: Vendedor;
}

export default function VendedorDashboard({ vendedor }: VendedorDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sales, setSales] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  
  // Navegação Mobile (Aparência de App)
  const [mobileTab, setMobileTab] = useState<'dashboard' | 'sales' | 'checklist'>('dashboard');
  
  // Controle de Modais / Formulários
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<any | null>(null);

  // Estados do Formulário de Venda
  const [clientId, setClientId] = useState('');
  const [contractValue, setContractValue] = useState('');
  const [status, setStatus] = useState('em_negociacao');
  const [openingDate, setOpeningDate] = useState(new Date().toISOString().split('T')[0]);
  const [formError, setFormError] = useState<string | null>(null);
  const [submittingSale, setSubmittingSale] = useState(false);

  // Estados do Formulário de Alteração de Status
  const [nextStatus, setNextStatus] = useState('ganho');
  const [lossReason, setLossReason] = useState('');
  const [submittingStatus, setSubmittingStatus] = useState(false);

  // Estados de Cadastro de Cliente Rápido
  const [newClientName, setNewClientName] = useState('');
  const [newClientSegment] = useState('Varejo');
  const [isRegisteringClient, setIsRegisteringClient] = useState(false);

  // Checklist Standard Work (Lean Visual Management)
  const [standardWork, setStandardWork] = useState([
    { id: 1, text: 'Realizar follow-up das propostas "Em Negociação"', done: false },
    { id: 2, text: 'Revisar metas individuais do mês', done: false },
    { id: 3, text: 'Verificar se novos leads foram distribuídos', done: false },
    { id: 4, text: 'Alimentar os motivos de perda das propostas recusadas', done: false },
    { id: 5, text: 'Sincronizar dados fechados com o time financeiro', done: false }
  ]);

  // Carregar dados de vendas do vendedor e clientes
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // 1. Carregar vendas (Filtradas automaticamente pelo RLS no Supabase!)
      const { data: salesData, error: salesError } = await supabase
        .from('vendas')
        .select('*, clientes(nome, segmento)')
        .order('created_at', { ascending: false });

      if (salesError) throw salesError;
      setSales(salesData || []);

      // 2. Carregar clientes para o seletor
      const { data: clientsData, error: clientsError } = await supabase
        .from('clientes')
        .select('*')
        .order('nome', { ascending: true });

      if (clientsError) throw clientsError;
      setClients(clientsData || []);

    } catch (err: any) {
      console.error('Erro ao carregar dados do vendedor:', err);
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

  // Toggle Standard Work Checklist
  const handleToggleTask = (id: number) => {
    setStandardWork(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  // Registrar Novo Cliente Rápido no seletor
  const handleRegisterClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName || !newClientSegment) return;
    
    setIsRegisteringClient(true);
    try {
      const { data, error } = await supabase
        .from('clientes')
        .insert([
          { nome: newClientName, segmento: newClientSegment, status: 'ativo' }
        ])
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setClients(prev => [...prev, data].sort((a, b) => a.nome.localeCompare(b.nome)));
        setClientId(data.id); // Selecionar o cliente recém criado
        setNewClientName(''); // Limpar
      }
    } catch (error) {
      console.error('Erro ao cadastrar cliente:', error);
    } finally {
      setIsRegisteringClient(false);
    }
  };

  // Registrar Nova Venda
  const handleCreateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || !contractValue || !openingDate) {
      setFormError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    setFormError(null);
    setSubmittingSale(true);

    try {
      const { error } = await supabase
        .from('vendas')
        .insert([
          {
            vendedor_id: vendedor.id,
            cliente_id: clientId,
            valor_contrato: parseFloat(contractValue),
            status: status,
            data_abertura: openingDate,
            data_fechamento: status !== 'em_negociacao' ? openingDate : null
          }
        ]);

      if (error) throw error;

      setIsAddModalOpen(false);
      setClientId('');
      setContractValue('');
      setStatus('em_negociacao');
      loadData();
    } catch (error: any) {
      console.error('Erro ao registrar venda:', error);
      setFormError(error.message || 'Erro ao registrar negociação comercial.');
    } finally {
      setSubmittingSale(false);
    }
  };

  // Alterar Status da Venda
  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSale) return;

    setSubmittingStatus(true);
    try {
      const updateData: any = {
        status: nextStatus,
        data_fechamento: new Date().toISOString().split('T')[0]
      };

      if (nextStatus === 'perdido') {
        updateData.motivo_perda = lossReason;
      } else {
        updateData.motivo_perda = null;
      }

      const { error } = await supabase
        .from('vendas')
        .update(updateData)
        .eq('id', selectedSale.id);

      if (error) throw error;

      setIsStatusModalOpen(false);
      setSelectedSale(null);
      setLossReason('');
      loadData();
    } catch (error) {
      console.error('Erro ao atualizar status do negócio:', error);
    } finally {
      setSubmittingStatus(false);
    }
  };

  // Excluir Venda
  const handleDeleteSale = async (id: string) => {
    if (!window.confirm('Deseja realmente excluir esta negociação?')) return;

    try {
      const { error } = await supabase
        .from('vendas')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Erro ao excluir venda:', error);
    }
  };

  const openStatusModal = (sale: any) => {
    setSelectedSale(sale);
    setNextStatus(sale.status === 'em_negociacao' ? 'ganho' : sale.status);
    setLossReason(sale.motivo_perda || '');
    setIsStatusModalOpen(true);
  };

  // =========================================================================
  // CÁLCULO DE METRICAS INDIVIDUAIS COM REGRAS LEAN
  // =========================================================================

  // Consideramos apenas vendas do mês corrente para a meta individual
  const todayObj = new Date();
  const currentMonthStr = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}`;
  
  const currentMonthSales = sales.filter(v => {
    const d = v.data_fechamento || v.data_abertura;
    return d && d.startsWith(currentMonthStr);
  });

  const wonSalesThisMonth = currentMonthSales.filter(v => v.status === 'ganho');
  
  // Realizado Comercial Individual (Faturamento total de vendas ganhas no mês)
  const faturamentoRealizado = wonSalesThisMonth.reduce((acc, v) => acc + Number(v.valor_contrato), 0);

  // Meta Individual Mapeada
  const metaIndividual = 25000.00; 

  // Comissão estimada: 5% sobre vendas ganhas no mês
  const comissaoEstimada = faturamentoRealizado * 0.05;

  const pctMeta = (faturamentoRealizado / metaIndividual) * 100;

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12">
        <div className="h-8 w-8 rounded-full border-4 border-slate-800 border-t-brand-500 animate-spin"></div>
        <p className="text-slate-400 text-sm mt-3">Carregando carteira de vendas comerciais...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 flex-1 flex flex-col pb-20 md:pb-6">
      {/* Subheader do Vendedor */}
      <div className={`flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between ${mobileTab === 'dashboard' ? 'flex' : 'hidden md:flex'}`}>
        <div>
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Painel Comercial Individual</h2>
          <p className="text-xs text-slate-500 mt-1">Gerencie seu funil e acompanhe suas metas em tempo real</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="btn-vendedor-refresh"
            onClick={handleRefresh}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition-all flex items-center justify-center gap-2"
            title="Atualizar Dados"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          <button
            id="btn-open-add-sale"
            onClick={() => setIsAddModalOpen(true)}
            className="btn-primary py-2 text-xs flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Registrar Oportunidade
          </button>
        </div>
      </div>

      {/* Grid de KPIs Individuais */}
      <div className={`grid grid-cols-1 md:grid-cols-3 border-t border-l border-[#23282B] bg-[#14181A] ${mobileTab === 'dashboard' ? 'grid' : 'hidden md:grid'}`}>
        {/* Progresso Meta Card */}
        <div className="bg-[#14181A] border-r border-b border-[#23282B] p-6 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Meta Individual do Mês</p>
              <h3 className="text-2xl font-extrabold text-white mt-2 tracking-tight font-mono">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(faturamentoRealizado)} 
                <span className="text-xs font-medium text-slate-500 block mt-1 font-sans">de {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metaIndividual)}</span>
              </h3>
            </div>
            <div className="h-10 w-10 border border-[#23282B] bg-[#0E1113] flex items-center justify-center text-slate-300">
              <Target className="w-5 h-5 text-[#C9A227]" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-[#23282B] space-y-2">
            <div className="flex justify-between text-xs text-slate-400 font-semibold">
              <span>Régua de Calibração</span>
              <span className={`font-mono ${pctMeta >= 70 ? 'text-[#7FA88C]' : 'text-[#B5504B]'}`}>{pctMeta.toFixed(1)}%</span>
            </div>
            <div className="h-6 bg-[#0E1113] border border-[#23282B] relative w-full overflow-hidden">
              <div 
                className={`h-full ${pctMeta >= 70 ? 'bg-[#7FA88C]' : 'bg-[#B5504B]'}`}
                style={{ width: `${Math.min(pctMeta, 100)}%` }}
              ></div>
              {/* Limiar de 70% fixo */}
              <div className="absolute top-0 bottom-0 left-[70%] w-px bg-[#B5504B]" title="Zona Crítica (70%)">
                <span className="absolute bottom-0.5 left-1 text-[7px] text-[#B5504B] font-bold">70%</span>
              </div>
              {/* Meta 100% */}
              <div className="absolute top-0 bottom-0 left-[99%] w-0.5 bg-[#C9A227]" title="Meta 100%">
                <span className="absolute bottom-0.5 right-1 text-[7px] text-[#C9A227] font-bold">META</span>
              </div>
            </div>
          </div>
        </div>

        {/* Comissão Estimada Card */}
        <div className="bg-[#14181A] border-r border-b border-[#23282B] p-6 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Comissão Estimada (5%)</p>
              <h3 className="text-2xl font-extrabold text-[#7FA88C] mt-2 tracking-tight font-mono">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(comissaoEstimada)}
              </h3>
            </div>
            <div className="h-10 w-10 border border-[#23282B] bg-[#0E1113] flex items-center justify-center text-slate-300">
              <Percent className="w-5 h-5 text-[#7FA88C]" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-[#23282B] text-xs text-slate-500">
            <span>Provisionado sobre {wonSalesThisMonth.length} vendas ganhas este mês</span>
          </div>
        </div>

        {/* Total Oportunidades Card */}
        <div className="bg-[#14181A] border-r border-b border-[#23282B] p-6 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Funil Comercial Ativo</p>
              <h3 className="text-2xl font-extrabold text-white mt-2 tracking-tight font-mono">
                {sales.filter(s => s.status === 'em_negociacao').length} propostas
              </h3>
            </div>
            <div className="h-10 w-10 border border-[#23282B] bg-[#0E1113] flex items-center justify-center text-slate-300">
              <DollarSign className="w-5 h-5 text-brand-500" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-[#23282B] text-xs text-slate-500">
            <span>Soma pipeline: <span className="font-mono">{
              new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                sales.filter(s => s.status === 'em_negociacao').reduce((acc, v) => acc + Number(v.valor_contrato), 0)
              )
            }</span></span>
          </div>
        </div>
      </div>

      {/* Grid Central: Lista de Vendas e Standard Work */}
      <div className={`grid grid-cols-1 lg:grid-cols-3 border-t border-l border-[#23282B] bg-[#14181A] flex-1 items-start ${mobileTab !== 'dashboard' ? 'block' : 'hidden md:block'}`}>
        {/* Tabela de Oportunidades do Vendedor */}
        <div className={`p-6 lg:col-span-2 border-r border-b border-[#23282B] space-y-4 flex flex-col h-full ${mobileTab === 'sales' ? 'flex' : 'hidden md:flex'}`}>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">Minhas Negociações Comerciais</h3>
            <p className="text-xs text-slate-500 mt-0.5">Exibição sob RLS ativo no Supabase (apenas seus registros comerciais)</p>
          </div>

          {sales.length > 0 ? (
            <div className="overflow-x-auto flex-grow">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#23282B] text-slate-500 uppercase tracking-widest font-bold">
                    <th className="py-3 pr-2">Cliente</th>
                    <th className="py-3 px-2">Segmento</th>
                    <th className="py-3 px-2">Abertura</th>
                    <th className="py-3 px-2 text-right">Valor do Contrato</th>
                    <th className="py-3 px-2 text-center">Status</th>
                    <th className="py-3 pl-2 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#23282B]/60 text-slate-300 font-medium">
                  {sales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-[#0E1113] transition-colors">
                      <td className="py-3.5 pr-2 text-white font-semibold">{sale.clientes?.nome}</td>
                      <td className="py-3.5 px-2">{sale.clientes?.segmento}</td>
                      <td className="py-3.5 px-2 font-mono text-slate-400">{new Date(sale.data_abertura).toLocaleDateString('pt-BR')}</td>
                      <td className="py-3.5 px-2 text-right font-extrabold font-mono">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sale.valor_contrato)}
                      </td>
                      <td className="py-3.5 px-2 text-center">
                        <span className={`px-2 py-0.5 text-[9px] font-bold border rounded-none ${
                          sale.status === 'ganho'
                            ? 'bg-[#7FA88C]/10 border-[#7FA88C]/20 text-[#7FA88C]'
                            : sale.status === 'perdido'
                            ? 'bg-[#B5504B]/10 border-[#B5504B]/20 text-[#B5504B]'
                            : 'bg-[#C9A227]/10 border-[#C9A227]/20 text-[#C9A227]'
                        }`}>
                          {sale.status === 'ganho' ? 'Ganho' : sale.status === 'perdido' ? 'Perdido' : 'Em Negociação'}
                        </span>
                      </td>
                      <td className="py-3.5 pl-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            id={`btn-edit-status-${sale.id}`}
                            onClick={() => openStatusModal(sale)}
                            className="p-1 bg-[#0E1113] border border-[#23282B] rounded-none text-slate-300 hover:text-white transition-colors"
                            title="Atualizar Status"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            id={`btn-delete-sale-${sale.id}`}
                            onClick={() => handleDeleteSale(sale.id)}
                            className="p-1 bg-[#0E1113] border border-[#23282B] rounded-none text-slate-400 hover:text-red-400 hover:border-red-500/30 transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-slate-500 py-12 text-center flex-grow">Você ainda não registrou nenhuma oportunidade.</p>
          )}
        </div>

        {/* Standard Work Checklist (Lean) */}
        <div className={`p-6 border-r border-b border-[#23282B] space-y-4 ${mobileTab === 'checklist' ? 'block' : 'hidden md:block'}`}>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
              <ClipboardList className="w-4 h-4 text-brand-400" /> Standard Work Comercial
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Procedimento Operacional Padrão diário do vendedor</p>
          </div>

          <div className="space-y-3.5 pt-2">
            {standardWork.map((task) => (
              <div 
                key={task.id}
                onClick={() => handleToggleTask(task.id)}
                className={`p-3.5 border cursor-pointer flex items-center justify-between group rounded-none ${
                  task.done 
                    ? 'bg-[#7FA88C]/5 border-[#7FA88C]/10 text-slate-500' 
                    : 'bg-[#0E1113] border-[#23282B] text-slate-300'
                }`}
              >
                <span className={`text-xs font-semibold leading-relaxed ${task.done ? 'line-through' : ''}`}>{task.text}</span>
                <div className={`h-5 w-5 border flex items-center justify-center rounded-none ${
                  task.done 
                    ? 'bg-[#7FA88C]/20 border-[#7FA88C] text-[#7FA88C]' 
                    : 'border-[#23282B] group-hover:border-slate-500'
                }`}>
                  {task.done && <Check className="w-3.5 h-3.5" />}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-[#0E1113] border border-[#23282B] p-4 text-xs text-slate-400 leading-relaxed flex gap-2 rounded-none">
            <AlertCircle className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />
            <p>O <strong>Standard Work</strong> garante a padronização do funil de vendas comerciais, mitigando o desperdício de retrabalho e inconsistência operacional.</p>
          </div>
        </div>
      </div>

      {/* =========================================================================
          MODAIS E FORMULÁRIOS
          ========================================================================= */}

      {/* Modal 1: Registrar Oportunidade */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-[500px] border border-[#23282B] bg-[#14181A] p-6 shadow-none space-y-4 rounded-none">
            <div className="flex items-center justify-between border-b border-[#23282B] pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Plus className="w-4.5 h-4.5 text-brand-500" /> Registrar Negociação Comercial
              </h3>
              <button 
                onClick={() => {
                  setIsAddModalOpen(false);
                  setFormError(null);
                }} 
                className="p-1 rounded bg-[#0E1113] border border-[#23282B] text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-[#B5504B]/10 border border-[#B5504B]/20 text-[#B5504B] text-xs font-semibold leading-relaxed">
                {formError}
              </div>
            )}

            {/* Cadastro Rápido de Cliente */}
            <form onSubmit={handleRegisterClient} className="space-y-3 bg-[#0E1113] p-4 border border-[#23282B] rounded-none">
              <p className="text-[10px] font-bold text-[#C9A227] uppercase tracking-wider">Cliente não cadastrado? Adicione rápido:</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="Nome da empresa ou parceiro"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="flex-1 bg-[#14181A] border border-[#23282B] rounded-none px-3 py-1.5 text-xs focus:outline-none focus:border-brand-500 text-white"
                />
                <button
                  type="submit"
                  disabled={isRegisteringClient}
                  className="btn-secondary px-3 py-1.5 text-xs font-bold uppercase tracking-wider"
                >
                  {isRegisteringClient ? 'Criando...' : 'Cadastrar'}
                </button>
              </div>
            </form>

            <form onSubmit={handleCreateSale} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="select-sale-client" className="text-[10px] font-bold text-slate-400 uppercase">Selecione o Cliente *</label>
                <select
                  id="select-sale-client"
                  required
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full glass-input text-xs"
                >
                  <option value="">Selecione...</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.nome} ({c.segmento})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="input-sale-val" className="text-[10px] font-bold text-slate-400 uppercase">Valor de Contrato (R$) *</label>
                  <input
                    id="input-sale-val"
                    type="number"
                    step="0.01"
                    required
                    placeholder="Ex: 5000.00"
                    value={contractValue}
                    onChange={(e) => setContractValue(e.target.value)}
                    className="w-full glass-input text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="select-sale-status" className="text-[10px] font-bold text-slate-400 uppercase">Status Inicial *</label>
                  <select
                    id="select-sale-status"
                    required
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full glass-input text-xs"
                  >
                    <option value="em_negociacao">Em Negociação</option>
                    <option value="ganho">Ganho (Fechado)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="input-sale-date" className="text-[10px] font-bold text-slate-400 uppercase">Data de Abertura *</label>
                <input
                  id="input-sale-date"
                  type="date"
                  required
                  value={openingDate}
                  onChange={(e) => setOpeningDate(e.target.value)}
                  className="w-full glass-input text-xs"
                />
              </div>

              <button
                id="btn-register-sale-submit"
                type="submit"
                disabled={submittingSale}
                className="w-full btn-primary py-2.5 text-xs mt-2"
              >
                {submittingSale ? 'Registrando...' : 'Registrar Oportunidade'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Alterar Status da Venda (PDCA / Kaizen Trigger para Perdas) */}
      {isStatusModalOpen && selectedSale && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-[450px] border border-[#23282B] bg-[#14181A] p-6 shadow-none space-y-4 rounded-none">
            <div className="flex items-center justify-between border-b border-[#23282B] pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Edit2 className="w-4.5 h-4.5 text-brand-500" /> Atualizar Status Comercial
              </h3>
              <button 
                onClick={() => {
                  setIsStatusModalOpen(false);
                  setSelectedSale(null);
                  setLossReason('');
                }} 
                className="p-1 rounded bg-[#0E1113] border border-[#23282B] text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-[#0E1113] border border-[#23282B] text-xs text-slate-300">
              <p><strong>Cliente:</strong> {selectedSale.clientes?.nome}</p>
              <p className="mt-1"><strong>Valor Original:</strong> {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedSale.valor_contrato)}</p>
            </div>

            <form onSubmit={handleUpdateStatus} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="select-update-status" className="text-[10px] font-bold text-slate-400 uppercase">Novo Status *</label>
                <select
                  id="select-update-status"
                  required
                  value={nextStatus}
                  onChange={(e) => setNextStatus(e.target.value)}
                  className="w-full glass-input text-xs"
                >
                  <option value="ganho">Ganho (Venda Fechada)</option>
                  <option value="perdido">Perdido (Venda Descartada)</option>
                </select>
              </div>

              {nextStatus === 'perdido' && (
                <div className="space-y-1.5">
                  <label htmlFor="select-loss-reason" className="text-[10px] font-bold text-[#B5504B] uppercase">Motivo da Perda (Requisito Kaizen) *</label>
                  <select
                    id="select-loss-reason"
                    required
                    value={lossReason}
                    onChange={(e) => setLossReason(e.target.value)}
                    className="w-full glass-input text-xs text-white"
                  >
                    <option value="">Selecione o principal desvio comercial...</option>
                    <option value="Preço Alto">Preço Alto / Sem Fit Financeiro</option>
                    <option value="Falta de Recurso Técnico">Falta de Recurso Técnico do Produto</option>
                    <option value="Perdido para Concorrência">Perdido para Concorrência</option>
                    <option value="Decisão Adiada">Decisão Adiada pelo Cliente</option>
                    <option value="Sem Contato / Ghosting">Sem Resposta do Lead (Ghosting)</option>
                  </select>
                  <p className="text-[9px] text-slate-500 mt-1">Este dado alimentará automaticamente o painel de 5 Porquês do gestor.</p>
                </div>
              )}

              <button
                id="btn-update-status-submit"
                type="submit"
                disabled={submittingStatus}
                className="w-full btn-primary py-2.5 text-xs mt-2"
              >
                {submittingStatus ? 'Sincronizando...' : 'Confirmar Transição de Status'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Barra de Navegação Mobile (Estilo App) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-slate-900 border-t border-slate-800 flex items-center justify-around z-40 px-4 shadow-xl">
        <button
          onClick={() => setMobileTab('dashboard')}
          className={`flex flex-col items-center justify-center gap-1 text-[10px] font-bold uppercase transition-all ${
            mobileTab === 'dashboard' ? 'text-[#C9A227]' : 'text-slate-400'
          }`}
        >
          <Target className="w-5 h-5" />
          <span>Meta</span>
        </button>
        <button
          onClick={() => setMobileTab('sales')}
          className={`flex flex-col items-center justify-center gap-1 text-[10px] font-bold uppercase transition-all ${
            mobileTab === 'sales' ? 'text-[#C9A227]' : 'text-slate-400'
          }`}
        >
          <DollarSign className="w-5 h-5" />
          <span>Funil</span>
        </button>
        <button
          onClick={() => setMobileTab('checklist')}
          className={`flex flex-col items-center justify-center gap-1 text-[10px] font-bold uppercase transition-all ${
            mobileTab === 'checklist' ? 'text-[#C9A227]' : 'text-slate-400'
          }`}
        >
          <ClipboardList className="w-5 h-5" />
          <span>Procedimento</span>
        </button>
      </div>
    </div>
  );
}
