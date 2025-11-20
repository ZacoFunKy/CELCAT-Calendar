'use client'
import { useState, useEffect } from 'react';

// Icons
const IconSun = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>;
const IconMoon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>;

export default function AdminDashboard() {
  const [theme, setTheme] = useState('system');
  const [mounted, setMounted] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [authenticated, setAuthenticated] = useState(false);

  // Theme management
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) setTheme(savedTheme);
    else if (window.matchMedia('(prefers-color-scheme: dark)').matches) setTheme('dark');
    else setTheme('light');
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const root = window.document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme, mounted]);

  const toggleTheme = () => setTheme(prev => (prev === 'light' ? 'dark' : 'light'));

  const fetchStats = async () => {
    if (!apiKey) {
      setError('Veuillez entrer une clé API');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/stats', {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Échec de la récupération des statistiques');
      }

      const data = await response.json();
      setStats(data);
      setAuthenticated(true);
      
      sessionStorage.setItem('adminApiKey', apiKey);
    } catch (err) {
      setError(err.message);
      setAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const savedKey = sessionStorage.getItem('adminApiKey');
    if (savedKey) {
      setApiKey(savedKey);
    }
  }, []);

  useEffect(() => {
    if (apiKey && sessionStorage.getItem('adminApiKey')) {
      fetchStats();
    }
  }, []); // Only run on mount

  const handleRefresh = () => {
    fetchStats();
  };

  if (!mounted) return null;

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-[#0B1120] font-sans text-slate-900 dark:text-white overflow-x-hidden selection:bg-[#005b8d]/30 transition-colors duration-500">
      
      {/* BACKGROUND (same as main page) */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-60"></div>
        <div className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] bg-[#005b8d]/20 dark:bg-[#005b8d]/20 rounded-full blur-[100px] animate-blob mix-blend-multiply dark:mix-blend-screen"></div>
        <div className="absolute top-[10%] right-[-20%] w-[60vw] h-[60vw] bg-cyan-200/40 dark:bg-cyan-900/20 rounded-full blur-[100px] animate-blob animation-delay-2000 mix-blend-multiply dark:mix-blend-screen"></div>
        <div className="absolute bottom-[-20%] left-[20%] w-[60vw] h-[60vw] bg-blue-200/40 dark:bg-indigo-900/20 rounded-full blur-[100px] animate-blob animation-delay-4000 mix-blend-multiply dark:mix-blend-screen"></div>
      </div>

      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center p-4 pointer-events-none">
        <a href="/" className="pointer-events-auto">
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-lg rounded-full pl-4 pr-4 py-2 hover:scale-105 transition-transform">
            <span className="text-sm font-bold text-slate-900 dark:text-white">← Retour</span>
          </div>
        </a>
        <button onClick={toggleTheme} className="p-2 rounded-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700 shadow-md pointer-events-auto">
          {theme === 'dark' ? <IconSun /> : <IconMoon />}
        </button>
      </header>

      <div className="max-w-7xl mx-auto px-4 pt-24 pb-12">
        {/* Title */}
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight">
            Dashboard<br/>
            <span className="text-[#005b8d] dark:text-white">Administrateur</span>
          </h1>
          <p className="text-lg text-slate-500 dark:text-slate-400">
            Statistiques et monitoring de l'API
          </p>
        </div>

        {/* Login Card */}
        {!authenticated && (
          <div className="max-w-md mx-auto">
            <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl shadow-[0_20px_40px_-12px_rgba(0,0,0,0.1)] dark:shadow-black/50 border border-white/60 dark:border-white/10 p-2">
              <div className="bg-white/50 dark:bg-slate-800/50 rounded-2xl p-6 space-y-4 border border-white/50 dark:border-white/5">
                <div>
                  <label htmlFor="apiKey" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Clé API
                  </label>
                  <input
                    id="apiKey"
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && fetchStats()}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-[#005b8d]/20 focus:border-[#005b8d] outline-none transition-all"
                    placeholder="Entrez votre clé API"
                  />
                </div>
                <button
                  onClick={fetchStats}
                  disabled={loading || !apiKey}
                  className={`w-full py-3 rounded-xl font-bold text-base shadow-lg transition-all ${
                    loading || !apiKey
                      ? 'opacity-50 cursor-not-allowed bg-slate-400 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      : 'bg-[#005b8d] hover:bg-[#004a75] text-white'
                  }`}
                >
                  {loading ? 'Chargement...' : 'Accéder au Dashboard'}
                </button>
              </div>
            </div>

            {error && (
              <div className="mt-4 bg-red-50/80 dark:bg-red-900/20 backdrop-blur-xl border border-red-200 dark:border-red-800 rounded-xl p-4">
                <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
              </div>
            )}
          </div>
        )}

        {/* Stats Display */}
        {authenticated && stats && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl shadow-lg border border-white/60 dark:border-white/10 p-6">
                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Total Requêtes</h3>
                <p className="text-3xl font-bold text-[#005b8d] dark:text-white">{stats.summary.totalRequests}</p>
              </div>
              <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl shadow-lg border border-white/60 dark:border-white/10 p-6">
                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Total Groupes</h3>
                <p className="text-3xl font-bold text-[#005b8d] dark:text-white">{stats.summary.totalGroups}</p>
              </div>
              <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl shadow-lg border border-white/60 dark:border-white/10 p-6">
                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Dernière MAJ</h3>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">
                  {new Date(stats.summary.timestamp).toLocaleTimeString('fr-FR')}
                </p>
              </div>
            </div>

            {/* Popular Groups */}
            <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl shadow-[0_20px_40px_-12px_rgba(0,0,0,0.1)] dark:shadow-black/50 border border-white/60 dark:border-white/10 p-2 mb-6">
              <div className="bg-white/50 dark:bg-slate-800/50 rounded-2xl p-6 border border-white/50 dark:border-white/5">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Groupes Populaires</h2>
                  <button
                    onClick={handleRefresh}
                    className="px-4 py-2 text-sm bg-[#005b8d] text-white rounded-lg hover:bg-[#004a75] transition-colors"
                  >
                    Actualiser
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Rang</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Groupe</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Requêtes</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Dernière</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {stats.popularGroups.map((group, index) => (
                        <tr key={group.name} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="px-4 py-3 text-sm font-medium text-[#005b8d] dark:text-cyan-400">
                            #{index + 1}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white">
                            {group.name}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                            {group.requestCount}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                            {new Date(group.lastRequest).toLocaleString('fr-FR')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* All Groups Stats */}
            <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl shadow-[0_20px_40px_-12px_rgba(0,0,0,0.1)] dark:shadow-black/50 border border-white/60 dark:border-white/10 p-2">
              <div className="bg-white/50 dark:bg-slate-800/50 rounded-2xl p-6 border border-white/50 dark:border-white/5">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Tous les Groupes</h2>
                <div className="overflow-x-auto max-h-96 custom-scrollbar">
                  <table className="min-w-full">
                    <thead className="sticky top-0 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Groupe</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Requêtes</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Première</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Dernière</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {Object.entries(stats.allGroups).map(([name, data]) => (
                        <tr key={name} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white">
                            {name}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                            {data.requestCount}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                            {new Date(data.firstRequest).toLocaleString('fr-FR')}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                            {new Date(data.lastRequest).toLocaleString('fr-FR')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}

      
      </div>

      {/* Animations */}
      <style jsx global>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob { animation: blob 10s infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
        
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { 
          background-color: #cbd5e1; 
          border-radius: 20px; 
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { 
          background-color: #475569; 
        }
      `}</style>
    </div>
  );
}
