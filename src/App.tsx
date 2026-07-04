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
  const [profile, setProfile] = useState<Vendedor | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 1. Obter sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchUserProfile(session.user.email);
      } else {
        setLoadingProfile(false);
      }
    });

    // 2. Ouvir mudanças na autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchUserProfile(session.user.email);
      } else {
        setProfile(null);
        setLoadingProfile(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Obter perfil do vendedor associado ao e-mail autenticado
  const fetchUserProfile = async (email: string | undefined) => {
    if (!email) return;
    setLoadingProfile(true);
    setError(null);
    try {
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
        // criamos um perfil padrão dependendo do domínio do e-mail
        const isGestor = email.toLowerCase().includes('gestor');
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
      setError('Não foi possível carregar seu perfil operacional. Verifique os acessos do Supabase.');
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loadingProfile) {
    return (
      <div className="min-h-screen bg-[#0E1113] flex flex-col items-center justify-center p-6 text-slate-300">
        <div className="h-8 w-8 rounded-full border-4 border-slate-800 border-t-[#C9A227] animate-spin"></div>
        <p className="text-slate-400 font-medium mt-4">Sincronizando processos NovaPay...</p>
      </div>
    );
  }

  // Se não estiver logado, exibe tela de login
  if (!session || !profile) {
    return <Login onLoginSuccess={() => supabase.auth.getSession().then(({ data: { session } }) => setSession(session))} />;
  }

  return (
    <div className="min-h-screen bg-[#0E1113] text-slate-100 flex flex-col">
      {/* Header Fixo do Sistema */}
      <header className="bg-slate-900 border-b border-[#23282B] sticky top-0 z-50 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between shadow-none">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 bg-[#C9A227] flex items-center justify-center flex-shrink-0">
            <span className="font-extrabold text-[#0E1113] text-lg tracking-wider">NP</span>
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-white tracking-tight uppercase">NovaPay S/A</h1>
            <p className="text-[10px] text-slate-500 font-bold tracking-wider uppercase hidden sm:block">Operational Excellence System</p>
          </div>
        </div>

        {/* User Info & Logout */}
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-slate-200">{profile.nome}</p>
            <p className="text-[9px] text-[#C9A227] uppercase tracking-wider font-extrabold mt-0.5 flex items-center justify-end gap-1">
              <ShieldCheck className="w-3 h-3 text-[#C9A227]" />
              {profile.perfil === 'gestor' ? 'Gestão / RevOps' : 'Executivo de Contas'}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 bg-[#14181A] hover:bg-[#23282B] border border-[#23282B] text-slate-400 hover:text-white transition-all"
            title="Sair do Sistema"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col" id="main-content-panel">
        {error && (
          <div className="mx-6 mt-6 p-4 bg-red-500/10 border border-red-500/20 text-red-200 text-sm flex items-center justify-between">
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
