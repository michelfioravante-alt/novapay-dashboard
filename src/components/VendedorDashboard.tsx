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
            data_abertura: openingDate,
            status: status,
            data_fechamento: status !== 'em_negociacao' ? new Date().toISOString().split('T')[0] : null
          }
        ]);

      if (error) throw error;

      // Limpar formulário e fechar modal
      setClientId('');
      setContractValue('');
      setStatus('em_negociacao');
      setOpeningDate(new Date().toISOString().split('T')[0]);
      setIsAddModalOpen(false);

      loadData();
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || 'Erro ao registrar a oportunidade comercial.');
    } finally {
      setSubmittingSale(false);
    }
  };

  // Abrir Modal de Status de Venda
  const openStatusModal = (sale: any) => {
    setSelectedSale(sale);
    setNextStatus(sale.status);
    setLossReason(sale.motivo_perda || '');
    setIsStatusModalOpen(true);
  };

  // Atualizar Status da Venda (Ganho / Perdido)
  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSale) return;

    setSubmittingStatus(true);
    try {
      const isClosed = nextStatus !== 'em_negociacao';
      const closingDate = isClosed ? new Date().toISOString().split('T')[0] : null;

      const { error } = await supabase
        .from('vendas')
        .update({
          status: nextStatus,
          data_fechamento: closingDate,
          motivo_perda: nextStatus === 'perdido' ? lossReason : null
        })
        .eq('id', selectedSale.id);

      if (error) throw error;

      setIsStatusModalOpen(false);
      setSelectedSale(null);
      setLossReason('');

      loadData();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    } finally {
      setSubmittingStatus(false);
    }
  };

  // Deletar Venda
  const handleDeleteSale = async (id: string) => {
    if (!confirm('Deseja excluir definitivamente esta oportunidade comercial?')) return;
    try {
      await supabase.from('vendas').delete().eq('id', id);
      loadData();
    } catch (error) {
      console.error('Erro ao deletar venda:', error);
    }
  };

  // =========================================================================
  // CÁLCULO DOS KPIS INDIVIDUAIS
  // =========================================================================

  // Consideramos apenas vendas do mês corrente para a meta individual
  const currentMonthStr = new Date().toISOString().substring(0, 7); // "YYYY-MM"
  
  const currentMonthSales = sales.filter(v => {
    const d = v.data_fechamento || v.data_abertura;
    return d && d.startsWith(currentMonthStr);
  });

  const wonSalesThisMonth = currentMonthSales.filter(v => v.status === 'ganho');
  
  // Realizado Comercial Individual (Faturamento total de vendas ganhas no mês)
  const faturamentoRealizado = wonSalesThisMonth.reduce((acc, v) => acc + Number(v.valor_contrato), 0);

  // Meta Individual Mapeada (Usamos a meta de receita / número de vendedores ativos como simplificação de meta individual,
  // ou definimos uma meta individual fixa padrão de R$ 25.000,00 para demonstração limpa)
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
    <div className="p-6 space-y-6 flex-1 flex flex-col">
      {/* Subheader do Vendedor */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Progresso Meta Card */}
        <div className="glass-panel p-6 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Meta Individual do Mês</p>
              <h3 className="text-2xl font-extrabold text-white mt-2 tracking-tight">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(faturamentoRealizado)} 
                <span className="text-xs font-medium text-slate-500 block mt-1">de {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metaIndividual)}</span>
              </h3>
            </div>
            <div className="h-10 w-10 rounded-xl bg-slate-800 border border-slate-700/50 flex items-center justify-center text-slate-300">
              <Target className="w-5 h-5 text-brand-500" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-800/60 space-y-2">
            <div className="flex justify-between text-xs text-slate-400 font-semibold">
              <span>Progresso</span>
              <span className={pctMeta >= 100 ? 'text-emerald-500' : 'text-brand-400'}>{pctMeta.toFixed(1)}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${pctMeta >= 100 ? 'bg-emerald-500' : 'bg-brand-500'}`}
                style={{ width: `${Math.min(pctMeta, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Comissão Estimada Card */}
        <div className="glass-panel p-6 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Comissão Estimada (5%)</p>
              <h3 className="text-2xl font-extrabold text-emerald-400 mt-2 tracking-tight">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(comissaoEstimada)}
              </h3>
            </div>
            <div className="h-10 w-10 rounded-xl bg-slate-800 border border-slate-700/50 flex items-center justify-center text-slate-300">
              <Percent className="w-5 h-5 text-emerald-500" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-800/60 text-xs text-slate-500">
            <span>Provisionado sobre {wonSalesThisMonth.length} vendas ganhas este mês</span>
          </div>
        </div>

        {/* Total Oportunidades Card */}
        <div className="glass-panel p-6 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Funil Comercial Ativo</p>
              <h3 className="text-2xl font-extrabold text-white mt-2 tracking-tight">
                {sales.filter(s => s.status === 'em_negociacao').length} propostas
              </h3>
            </div>
            <div className="h-10 w-10 rounded-xl bg-slate-800 border border-slate-700/50 flex items-center justify-center text-slate-300">
              <DollarSign className="w-5 h-5 text-brand-500" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-800/60 text-xs text-slate-500">
            <span>Soma estimada no pipeline: {
              new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                sales.filter(s => s.status === 'em_negociacao').reduce((acc, v) => acc + Number(v.valor_contrato), 0)
              )
            }</span>
          </div>
        </div>
      </div>

      {/* Grid Central: Lista de Vendas e Standard Work */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 items-start">
        {/* Tabela de Oportunidades do Vendedor */}
        <div className="glass-panel p-6 lg:col-span-2 space-y-4 flex flex-col h-full">
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">Minhas Negociações Comerciais</h3>
            <p className="text-xs text-slate-500 mt-0.5">Exibição sob RLS ativo no Supabase (apenas seus registros comerciais)</p>
          </div>

          {sales.length > 0 ? (
            <div className="overflow-x-auto flex-grow">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 uppercase tracking-widest font-bold">
                    <th className="py-3 pr-2">Cliente</th>
                    <th className="py-3 px-2">Segmento</th>
                    <th className="py-3 px-2">Abertura</th>
                    <th className="py-3 px-2 text-right">Valor do Contrato</th>
                    <th className="py-3 px-2 text-center">Status</th>
                    <th className="py-3 pl-2 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 text-slate-300 font-medium">
                  {sales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-slate-900/30 transition-colors">
                      <td className="py-3.5 pr-2 text-white font-semibold">{sale.clientes?.nome}</td>
                      <td className="py-3.5 px-2">{sale.clientes?.segmento}</td>
                      <td className="py-3.5 px-2 font-mono text-slate-400">{new Date(sale.data_abertura).toLocaleDateString('pt-BR')}</td>
                      <td className="py-3.5 px-2 text-right font-extrabold font-mono">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sale.valor_contrato)}
                      </td>
                      <td className="py-3.5 px-2 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                          sale.status === 'ganho'
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : sale.status === 'perdido'
                            ? 'bg-red-500/10 border-red-500/30 text-red-400'
                            : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                        }`}>
                          {sale.status === 'ganho' ? 'Ganho' : sale.status === 'perdido' ? 'Perdido' : 'Em Negociação'}
                        </span>
                      </td>
                      <td className="py-3.5 pl-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            id={`btn-edit-status-${sale.id}`}
                            onClick={() => openStatusModal(sale)}
                            className="p-1 rounded bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-colors"
                            title="Atualizar Status"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            id={`btn-delete-sale-${sale.id}`}
                            onClick={() => handleDeleteSale(sale.id)}
                            className="p-1 rounded bg-slate-800 border border-slate-700 text-slate-400 hover:text-red-400 hover:border-red-500/30 transition-colors"
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
        <div className="glass-panel p-6 space-y-4">
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
                className={`p-3.5 rounded-xl border transition-all duration-300 cursor-pointer flex items-center justify-between group ${
                  task.done 
                    ? 'bg-emerald-950/10 border-emerald-500/20 text-slate-500' 
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <span className={`text-xs font-semibold leading-relaxed ${task.done ? 'line-through' : ''}`}>{task.text}</span>
                <div className={`h-5 w-5 rounded-lg border flex items-center justify-center transition-all ${
                  task.done 
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' 
                    : 'border-slate-700 group-hover:border-slate-500'
                }`}>
                  {task.done && <Check className="w-3.5 h-3.5" />}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-brand-500/5 border border-brand-500/15 p-4 rounded-xl text-xs text-brand-200/90 leading-relaxed flex gap-2">
            <AlertCircle className="w-4 h-4 text-brand-400 flex-shrink-0 mt-0.5" />
            <p>O <strong>Standard Work</strong> garante a padronização do funil de vendas comerciais, mitigando o desperdício de retrabalho e inconsistência operacional.</p>
          </div>
        </div>
      </div>

      {/* =========================================================================
          MODAIS E FORMULÁRIOS
          ========================================================================= */}

      {/* Modal 1: Registrar Oportunidade */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-[500px] glass-panel border-slate-800 bg-slate-900/95 p-6 shadow-2xl space-y-4 animate-slide-up">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white tracking-tight">Nova Oportunidade Comercial</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 text-slate-400 hover:text-white"><X className="w-4.5 h-4.5" /></button>
            </div>

            {/* Cadastro de Cliente Rápido */}
            <form onSubmit={handleRegisterClient} className="space-y-3 bg-slate-950/40 p-4 rounded-xl border border-slate-800/80">
              <p className="text-[10px] font-bold text-brand-400 uppercase tracking-wider">Cadastrar Novo Cliente Rápido</p>
              <div className="grid grid-cols-3 gap-2 items-end">
                <div className="col-span-2 space-y-1">
                  <input
                    type="text"
                    required
                    placeholder="Nome da empresa/cliente"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-brand-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isRegisteringClient}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-1.5 px-3 rounded-lg text-xs border border-slate-700/60"
                >
                  {isRegisteringClient ? 'Criando...' : 'Cadastrar'}
                </button>
              </div>
            </form>

            {/* Formulário Principal de Venda */}
            <form onSubmit={handleCreateSale} className="space-y-4">
              {formError && (
                <div className="p-3 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold">
                  {formError}
                </div>
              )}

              <div className="space-y-1">
                <label htmlFor="client-select" className="text-[10px] font-bold text-slate-400 uppercase">Selecione o Cliente</label>
                <select
                  id="client-select"
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label htmlFor="input-contract-value" className="text-[10px] font-bold text-slate-400 uppercase">Valor do Contrato (R$)</label>
                  <input
                    id="input-contract-value"
                    type="number"
                    step="0.01"
                    required
                    placeholder="Ex: 15000.00"
                    value={contractValue}
                    onChange={(e) => setContractValue(e.target.value)}
                    className="w-full glass-input text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="input-opening-date" className="text-[10px] font-bold text-slate-400 uppercase">Data de Abertura</label>
                  <input
                    id="input-opening-date"
                    type="date"
                    required
                    value={openingDate}
                    onChange={(e) => setOpeningDate(e.target.value)}
                    className="w-full glass-input text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="status-select" className="text-[10px] font-bold text-slate-400 uppercase">Status Inicial</label>
                <select
                  id="status-select"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full glass-input text-xs"
                >
                  <option value="em_negociacao">Em Negociação</option>
                  <option value="ganho">Ganho (Faturamento Imediato)</option>
                  <option value="perdido">Perdido</option>
                </select>
              </div>

              <button
                id="btn-register-sale-submit"
                type="submit"
                disabled={submittingSale}
                className="w-full btn-primary py-2.5 text-xs mt-2"
              >
                {submittingSale ? 'Registrando...' : 'Registrar Oportunidade Comercial'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Alterar Status de Venda existente (com motivo de perda) */}
      {isStatusModalOpen && selectedSale && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-[450px] glass-panel border-slate-800 bg-slate-900/95 p-6 shadow-2xl space-y-4 animate-slide-up">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">Atualizar Status de Negociação</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Cliente: {selectedSale.clientes?.nome}</p>
              </div>
              <button onClick={() => setIsStatusModalOpen(false)} className="p-1 text-slate-400 hover:text-white"><X className="w-4.5 h-4.5" /></button>
            </div>

            <form onSubmit={handleUpdateStatus} className="space-y-4">
              <div className="space-y-1">
                <label htmlFor="next-status-select" className="text-[10px] font-bold text-slate-400 uppercase">Selecione o Status</label>
                <select
                  id="next-status-select"
                  value={nextStatus}
                  onChange={(e) => setNextStatus(e.target.value)}
                  className="w-full glass-input text-xs"
                >
                  <option value="em_negociacao">Em Negociação</option>
                  <option value="ganho">Ganho (Gerar Entrada Financeira)</option>
                  <option value="perdido">Perdido (Causa Raiz do PDCA)</option>
                </select>
              </div>

              {nextStatus === 'perdido' && (
                <div className="space-y-1.5">
                  <label htmlFor="loss-reason-textarea" className="text-[10px] font-bold text-slate-400 uppercase">Motivo da Perda (Why?)</label>
                  <textarea
                    id="loss-reason-textarea"
                    required
                    rows={3}
                    placeholder="Detalhamento do porquê o negócio foi perdido (Preço, Concorrente, Prazo, etc.)"
                    value={lossReason}
                    onChange={(e) => setLossReason(e.target.value)}
                    className="w-full glass-input text-xs leading-relaxed resize-none"
                  ></textarea>
                  <span className="text-[9px] text-brand-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> Este motivo alimentará o painel Kaizen do gestor.
                  </span>
                </div>
              )}

              <button
                id="btn-update-status-submit"
                type="submit"
                disabled={submittingStatus}
                className="w-full btn-primary py-2.5 text-xs mt-2"
              >
                {submittingStatus ? 'Sincronizando...' : 'Atualizar Oportunidade'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
