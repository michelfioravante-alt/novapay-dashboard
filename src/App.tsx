import { useState, useEffect } from 'react';
import { supabase } from './lib/supabaseClient';
import Login from './components/Login';
import GestorDashboard from './components/GestorDashboard';
import VendedorDashboard from './components/VendedorDashboard';
import { LogOut } from 'lucide-react';

interface Vendedor {
  id: string;
  nome: string;
  email: string;
  perfil: 'vendedor' | 'gestor';
}

function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Vendedor | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 1. Obter sessão atual de autenticação
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchUserProfile(session.user.email);
      } else {
        setLoading(false);
      }
    });

    // 2. Escutar mudanças na autenticação (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchUserProfile(session.user.email);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Obter perfil do vendedor associado ao e-mail autenticado
  const fetchUserProfile = async (email: string | undefined) => {
    if (!email) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('vendedores')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (data) {
        setProfile(data);
      } else {
        // Se o usuário logou mas não está cadastrado na tabela vendedores,
        // criamos um perfil padrão (caso de cadastros novos durante testes)
        const isGestor = email.includes('gestor');
        const defaultName = isGestor ? 'Gestor de Teste' : 'Vendedor de Teste';
        
        const { data: newVendedor, error: insertError } = await supabase
          .from('vendedores')
          .insert([
            {
              nome: defaultName,
              email: email,
              perfil: isGestor ? 'gestor' : 'vendedor'
            }
          ])
          .select()
          .single();

        if (insertError) throw insertError;
        if (newVendedor) setProfile(newVendedor);
      }
    } catch (err: any) {
      console.error('Erro ao buscar perfil do vendedor:', err);
      setError('Não foi possível carregar seu perfil operacional.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
        <div className="h-12 w-12 rounded-full border-4 border-slate-800 border-t-brand-500 animate-spin" id="app-spinner"></div>
        <p className="text-slate-400 font-medium animate-pulse">Sincronizando processos NovaPay...</p>
      </div>
    );
  }

  // Se não estiver logado, exibe tela de login
  if (!session || !profile) {
    return <Login onLoginSuccess={() => {}} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header Corporativo Global */}
      <header className="border-b border-[#23282B] bg-[#0E1113] py-5 px-4 sm:px-7 sticky top-0 z-50">
        <div className="max-w-[1160px] mx-auto flex justify-between items-center flex-wrap gap-3">
          <div className="flex items-baseline gap-2.5">
            <span className="font-bold text-white text-sm sm:text-base tracking-tight">NovaPay</span>
            <span className="text-[#4A5256] text-xs">/</span>
            <span className="text-xs text-slate-400">Controle de Fluxo e Qualidade Comercial</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span>
              <b className="text-white font-medium">{profile.nome}</b> · Processos
            </span>
            <span className="border border-[#23282B] px-2 py-0.5 text-[9px] text-[#7FA88C] font-bold uppercase tracking-wider">
              {profile.perfil}
            </span>
            <button
              id="btn-logout"
              onClick={handleLogout}
              className="px-2.5 py-1 bg-[#14181A] hover:bg-[#23282B] border border-[#23282B] text-[10px] font-bold text-slate-300 hover:text-white transition-all uppercase tracking-wider flex-shrink-0"
              title="Sair do Sistema"
            >
              Sair <LogOut className="w-3 h-3 inline-block ml-0.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col" id="main-content-panel">
        {error && (
          <div className="mx-6 mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => fetchUserProfile(session?.user?.email)} className="text-brand-400 hover:underline font-semibold">Tentar Novamente</button>
          </div>
        )}
        
        {profile.perfil === 'gestor' ? (
          <GestorDashboard />
        ) : (
          <VendedorDashboard vendedor={profile} />
        )}
      </main>

      {/* Rodapé Corporativo */}
      <footer className="bg-slate-900/30 border-t border-slate-900/60 py-4 px-6 text-center flex flex-col md:flex-row justify-between items-center gap-2 text-xs text-slate-500 font-medium hidden md:flex">
        <p>© 2026 NovaPay S/A. Todos os direitos reservados.</p>
        <p className="flex items-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          Sistema de Performance e Otimização Comercial (MBR/QBR Review)
        </p>
      </footer>
    </div>
  );
}

export default App;
