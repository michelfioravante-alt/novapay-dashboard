import { useState, useEffect } from 'react';
import { supabase } from './lib/supabaseClient';
import Login from './components/Login';
import GestorDashboard from './components/GestorDashboard';
import VendedorDashboard from './components/VendedorDashboard';
import { ShieldCheck, LogOut } from 'lucide-react';

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
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800/60 sticky top-0 z-50 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-gradient-to-tr from-brand-700 to-brand-500 flex items-center justify-center shadow-lg shadow-brand-500/20 flex-shrink-0">
            <span className="font-extrabold text-white text-base sm:text-lg tracking-wider">NP</span>
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-1.5 sm:gap-2">
              NovaPay 
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 hidden sm:inline-block">
                Painel Operacional
              </span>
            </h1>
            <p className="text-[10px] sm:text-xs text-slate-400 font-medium hidden sm:block">Controle de Fluxo e Qualidade Comercial</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-4">
          <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-950/40 border border-slate-800/80">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <div className="text-right">
              <p className="text-xs font-semibold text-slate-200">{profile.nome}</p>
              <p className="text-[10px] text-slate-400 capitalize flex items-center justify-end gap-1 font-mono">
                <ShieldCheck className="w-3 h-3 text-brand-500" />
                {profile.perfil}
              </p>
            </div>
          </div>

          <button
            id="btn-logout"
            onClick={handleLogout}
            className="p-2 sm:p-2.5 rounded-xl bg-slate-800/80 hover:bg-red-500/10 hover:border-red-500/30 text-slate-400 hover:text-red-400 border border-slate-700/50 transition-all duration-300 flex-shrink-0"
            title="Sair do Sistema"
          >
            <LogOut className="w-4 sm:w-4.5 h-4 sm:h-4.5" />
          </button>
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
