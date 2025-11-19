'use client'
import { useState, useEffect, useRef } from 'react';

// --- ICÔNES ---
const IconSearch = ({ className }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>;
const IconCopy = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>;
const IconCheck = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>;
const IconX = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>;
const IconTrash = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>;
const IconGoogle = ({ className }) => <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/></svg>;
const IconCalendar = ({ className }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /></svg>;
const IconSun = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>;
const IconMoon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>;

export default function Home() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [generatedLink, setGeneratedLink] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [origin, setOrigin] = useState('');
  const [showHolidays, setShowHolidays] = useState(false);
  const [serverStatus, setServerStatus] = useState('loading');
  const [theme, setTheme] = useState('system');
  
  const [appLoaded, setAppLoaded] = useState(false);
  const [contentVisible, setContentVisible] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [srAnnouncement, setSrAnnouncement] = useState('');
  
  const suggestionsRef = useRef(null);
  const suggestionsListRef = useRef(null);
  const inputRef = useRef(null);

  // --- THEME ---
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) setTheme(savedTheme);
    else if (window.matchMedia('(prefers-color-scheme: dark)').matches) setTheme('dark');
    else setTheme('light');
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  // --- INIT ---
  useEffect(() => {
    setOrigin(window.location.origin);
    document.body.style.overflow = 'hidden'; 
    const initApp = async () => {
        const savedGroups = localStorage.getItem('my_celcat_groups');
        if (savedGroups) { try { setSelectedGroups(JSON.parse(savedGroups)); } catch (e) {} }
        const savedHolidays = localStorage.getItem('my_celcat_holidays');
        if (savedHolidays) setShowHolidays(savedHolidays === 'true');
        fetch('/api/status').then(res => res.json()).then(data => setServerStatus(data.online ? 'online' : 'offline')).catch(() => setServerStatus('offline'));
        await new Promise(resolve => setTimeout(resolve, 800));
        setAppLoaded(true);
        setTimeout(() => { setContentVisible(true); document.body.style.overflow = ''; }, 100);
    };
    initApp();
    function handleClickOutside(event) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target) && !inputRef.current.contains(event.target)) {
        setSuggestions([]); setActiveIndex(-1);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => { if(appLoaded) localStorage.setItem('my_celcat_groups', JSON.stringify(selectedGroups)); }, [selectedGroups, appLoaded]);
  useEffect(() => { if(appLoaded) localStorage.setItem('my_celcat_holidays', showHolidays); }, [showHolidays, appLoaded]);
  
  // --- AUTO SCROLL LOGIC ---
  useEffect(() => {
    if (activeIndex >= 0 && suggestionsListRef.current) {
      const activeElement = suggestionsListRef.current.children[activeIndex];
      if (activeElement) activeElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    } else { setActiveIndex(-1); }
  }, [activeIndex, suggestions]);

  useEffect(() => {
    const fetchGroups = async () => {
      if (query.length < 3) { setSuggestions([]); setError(null); return; }
      setLoading(true); setError(null);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error("Erreur");
        const data = await response.json();
        setSuggestions(data.results || []);
      } catch (error) { setError("Erreur de recherche."); setSuggestions([]); } finally { setLoading(false); }
    };
    const timeoutId = setTimeout(fetchGroups, 300);
    return () => clearTimeout(timeoutId);
  }, [query]);

  const addGroup = (t) => { if (!selectedGroups.includes(t)) setSelectedGroups([...selectedGroups, t]); setQuery(''); setSuggestions([]); setGeneratedLink(''); setActiveIndex(-1); inputRef.current?.focus(); };
  const removeGroup = (g) => { setSelectedGroups(selectedGroups.filter(x => x !== g)); setGeneratedLink(''); };
  const clearAll = () => { setSelectedGroups([]); setGeneratedLink(''); };
  const generateLink = () => {
    if (selectedGroups.length === 0) return;
    const groupsString = selectedGroups.join(',');
    const link = `${origin}/api/calendar.ics?group=${encodeURIComponent(groupsString)}&holidays=${showHolidays}`;
    setGeneratedLink(link); setIsCopied(false);
  };
  const copyToClipboard = () => { navigator.clipboard.writeText(generatedLink); setIsCopied(true); setTimeout(() => setIsCopied(false), 2000); };
  const handleKeyDown = (e) => {
    if (suggestions.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(prev => (prev > 0 ? prev - 1 : -1)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (activeIndex >= 0 && suggestions[activeIndex]) addGroup(suggestions[activeIndex].text); }
    else if (e.key === 'Escape') { setSuggestions([]); setActiveIndex(-1); }
  };
  const getWebcalLink = () => generatedLink ? generatedLink.replace(/^https?:\/\//, 'webcal://') : '';
  const getGoogleLink = () => generatedLink ? `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(generatedLink.replace('https://', 'http://'))}` : '';

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-[#0B1120] font-sans text-slate-900 dark:text-white overflow-x-hidden selection:bg-[#005b8d]/30 transition-colors duration-500">
      
      {/* BACKGROUND */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-60"></div>
          <div className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] bg-[#005b8d]/20 dark:bg-[#005b8d]/20 rounded-full blur-[100px] animate-blob mix-blend-multiply dark:mix-blend-screen"></div>
          <div className="absolute top-[10%] right-[-20%] w-[60vw] h-[60vw] bg-cyan-200/40 dark:bg-cyan-900/20 rounded-full blur-[100px] animate-blob animation-delay-2000 mix-blend-multiply dark:mix-blend-screen"></div>
          <div className="absolute bottom-[-20%] left-[20%] w-[60vw] h-[60vw] bg-blue-200/40 dark:bg-indigo-900/20 rounded-full blur-[100px] animate-blob animation-delay-4000 mix-blend-multiply dark:mix-blend-screen"></div>
      </div>

      {/* LOADER */}
      <div className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white dark:bg-[#0B1120] transition-all duration-700 ease-[cubic-bezier(0.76,0,0.24,1)] ${appLoaded ? 'opacity-0 pointer-events-none translate-y-[-20px]' : 'opacity-100'}`}>
          <div className="relative mb-8">
              <div className="absolute inset-0 bg-[#005b8d]/30 rounded-full blur-xl animate-pulse"></div>
              <div className="w-20 h-20 bg-[#005b8d] rounded-2xl flex items-center justify-center text-white shadow-2xl relative z-10 animate-bounce-subtle">
                  <IconCalendar className="w-10 h-10" />
              </div>
          </div>
          <div className="flex flex-col items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">U-Bordeaux Sync</h1>
            <div className="w-48 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-[#005b8d] animate-loading-bar rounded-full"></div>
            </div>
            <p className="text-xs font-medium text-slate-400 mt-1 animate-pulse">Initialisation...</p>
          </div>
      </div>

      {/* CONTENU PRINCIPAL */}
      <div className={`flex flex-col min-h-screen transition-all duration-1000 ease-out delay-100 ${contentVisible ? 'opacity-100 scale-100 blur-0' : 'opacity-0 scale-95 blur-sm'}`}>
        <div role="status" aria-live="polite" className="sr-only">{srAnnouncement}</div>

        {/* HEADER */}
        <header className="fixed top-0 left-0 right-0 z-50 flex justify-center p-4 lg:p-6 pointer-events-none">
           <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-lg shadow-black/5 rounded-full pl-6 pr-2 py-2 flex items-center gap-4 pointer-events-auto transition-all hover:scale-105">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 bg-[#005b8d] rounded-lg flex items-center justify-center text-white shadow-md shadow-[#005b8d]/20">
                    <IconCalendar className="w-4 h-4" />
                </div>
                <span className="text-sm font-bold text-slate-900 dark:text-white hidden sm:inline">U-Bordeaux</span>
              </div>
              <div className="w-px h-4 bg-slate-300 dark:bg-slate-700"></div>
              <div className="flex items-center gap-1">
                <a href="https://celcat.u-bordeaux.fr" target="_blank" className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-[#005b8d] dark:hover:text-white transition px-3 py-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">Celcat Officiel ↗</a>
                <button onClick={toggleTheme} className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700">
                   {theme === 'dark' ? <IconSun /> : <IconMoon />}
                </button>
              </div>
           </div>
        </header>

        {/* GRILLE RESPONSIVE */}
        <main className="flex-grow flex items-center justify-center px-6 pt-32 pb-12 max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start w-full">
            
            {/* COLONNE GAUCHE : TEXTE (STATUS SUPPRIMÉ ICI) */}
            <div className="flex flex-col space-y-8">
              <div className="text-center lg:text-left">
                 <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-slate-900 dark:text-white mb-4 tracking-tight leading-[0.95]">
                    Sync<br/><span className="text-[#005b8d]">Ton Agenda.</span>
                 </h1>
                 <p className="text-lg text-slate-500 dark:text-slate-400 font-medium max-w-md mx-auto lg:mx-0 leading-relaxed">
                    L'emploi du temps de l'université, propre, rapide et directement dans ta poche.
                 </p>
              </div>

              <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl shadow-[0_20px_40px_-12px_rgba(0,0,0,0.1)] dark:shadow-black/50 border border-white/60 dark:border-white/10 p-2 ring-1 ring-black/5 dark:ring-white/5">
                <div className="bg-white/50 dark:bg-slate-800/50 rounded-2xl p-6 space-y-6 border border-white/50 dark:border-white/5">
                  
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">1. Recherche ta formation</label>
                    <div className="relative group z-20">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        {loading ? (
                           <div className="w-5 h-5 border-2 border-slate-200 dark:border-slate-600 border-t-[#005b8d] dark:border-t-white rounded-full animate-spin"></div>
                        ) : (
                           <IconSearch className="w-5 h-5 text-slate-400 dark:text-slate-500 group-focus-within:text-[#005b8d] dark:group-focus-within:text-white transition-colors" />
                        )}
                      </div>
                      <input
                        ref={inputRef}
                        type="text"
                        autoComplete="off"
                        className="block w-full pl-12 pr-4 py-3.5 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:ring-2 focus:ring-[#005b8d]/20 dark:focus:ring-white/10 focus:border-[#005b8d] dark:focus:border-white/30 outline-none transition-all shadow-sm hover:border-slate-300 dark:hover:border-slate-600"
                        placeholder="Ex: M1 Informatique..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                      />
                      
                      {suggestions.length > 0 && (
                        <div ref={suggestionsRef} className="absolute left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-xl max-h-64 overflow-y-auto p-1.5 z-30 animate-in fade-in slide-in-from-top-1 custom-scrollbar">
                          <ul role="listbox" ref={suggestionsListRef}>
                            {suggestions.map((item, index) => (
                              <li key={item.id} onClick={() => addGroup(item.text)} onMouseEnter={() => setActiveIndex(index)}
                                className={`px-3.5 py-2.5 cursor-pointer text-sm rounded-lg flex items-center justify-between transition-colors 
                                ${index === activeIndex ? 'bg-slate-100 dark:bg-slate-700/60 text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}
                              >
                                <span className="font-medium truncate pr-4">{item.text}</span>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600 ${index === activeIndex ? 'opacity-100 bg-white dark:bg-slate-800' : 'opacity-0'}`}>↵</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    {error && <p className="text-xs text-red-500 font-medium ml-1 animate-pulse">{error}</p>}
                  </div>

                  {selectedGroups.length > 0 && (
                     <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Sélection ({selectedGroups.length})</span>
                          <button onClick={clearAll} className="text-[11px] font-semibold text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1">Tout effacer</button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {selectedGroups.map((g) => (
                            <span key={g} className="inline-flex items-center pl-3 pr-1 py-1.5 rounded-lg text-sm font-medium bg-[#005b8d]/5 dark:bg-[#005b8d]/20 text-[#005b8d] dark:text-blue-100 border border-[#005b8d]/10 dark:border-[#005b8d]/30">
                              {g}
                              <button onClick={() => removeGroup(g)} className="ml-1.5 p-1 text-[#005b8d]/60 dark:text-blue-200/60 hover:text-red-500 dark:hover:text-red-400 hover:bg-white dark:hover:bg-slate-900 rounded-md transition-all"><IconX /></button>
                            </span>
                          ))}
                        </div>
                     </div>
                  )}
                  
                  <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 cursor-pointer transition-colors hover:border-[#005b8d]/30 dark:hover:border-slate-500 group">
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 group-hover:text-[#005b8d] dark:group-hover:text-white transition-colors">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h20"/><path d="M12 2v20"/><path d="m4.93 4.93 1.41 1.41"/><path d="m19.07 4.93-14.14 14.14"/></svg>
                        </div>
                        <div className="flex flex-col">
                           <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Inclure les vacances</span>
                           <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Affiche les congés</span>
                        </div>
                     </div>
                     <div className="relative">
                       <input type="checkbox" className="sr-only peer" checked={showHolidays} onChange={(e) => {setShowHolidays(e.target.checked); setGeneratedLink('')}} />
                       <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#005b8d]"></div>
                     </div>
                  </label>

                  <button onClick={generateLink} disabled={selectedGroups.length === 0} 
                    className={`group w-full py-4 rounded-xl font-bold text-base tracking-wide shadow-lg flex items-center justify-center gap-2 transition-all duration-300 transform active:scale-[0.98]
                    ${selectedGroups.length > 0 
                      ? 'bg-[#005b8d] hover:bg-[#004a75] text-white shadow-[#005b8d]/20 hover:shadow-[#005b8d]/40' 
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none border border-slate-200 dark:border-slate-700'}
                  `}>
                    <span>Générer le calendrier</span>
                    {selectedGroups.length > 0 && <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>}
                  </button>
                </div>
              </div>
            </div>

            {/* COLONNE DROITE : RESULTATS + STATUS (PC) */}
            <div className="w-full flex flex-col gap-6">
               {generatedLink ? (
                  <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl overflow-hidden shadow-xl dark:shadow-black/50">
                      
                      <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                        <div className="flex items-center gap-2.5">
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 animate-pulse"></span>
                          <span className="text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Calendrier prêt</span>
                        </div>
                        {isCopied && <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1 rounded-md animate-fade-in">Copié !</span>}
                      </div>

                      <div className="p-6 space-y-6">
                        <div className="relative group">
                           <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><span className="text-lg">🔗</span></div>
                           <input readOnly value={generatedLink} className="block w-full pl-10 pr-24 py-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-mono text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#005b8d]/20 focus:border-[#005b8d] transition-all" onClick={(e) => e.target.select()} />
                           <button onClick={copyToClipboard} className="absolute right-2 top-2 bottom-2 px-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors shadow-sm">Copier</button>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                           <a href={getGoogleLink()} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 px-4 py-3.5 bg-[#4285F4] hover:bg-[#3367d6] text-white rounded-xl text-sm font-bold transition-transform active:scale-[0.98] hover:shadow-lg">
                              <IconGoogle className="text-white" /> <span>Google</span>
                           </a>
                           <a href={getWebcalLink()} className="flex items-center justify-center gap-2 px-4 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-bold transition-colors hover:bg-slate-50 dark:hover:bg-slate-700">
                              <IconCalendar className="w-4 h-4" /> <span>Apple / Outlook</span>
                           </a>
                        </div>

                        {/* QR CODE (Hidden on mobile, Visible on Desktop) */}
                        <div className="hidden sm:flex flex-col sm:flex-row items-center sm:items-start gap-5 p-5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                           <div className="bg-white p-2 rounded-xl shadow-sm shrink-0">
                              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=0&data=${encodeURIComponent(generatedLink)}`} alt="QR Code" className="w-24 h-24" loading="lazy" />
                           </div>
                           <div className="flex-grow text-center sm:text-left">
                              <p className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">Version Mobile</p>
                              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">Scannez ce code pour ajouter l'emploi du temps directement sur votre téléphone.</p>
                           </div>
                        </div>
                      </div>
                    </div>
                  </div>
               ) : (
                  <div className="hidden lg:flex h-full items-center justify-center opacity-30 select-none">
                      <div className="text-center space-y-4">
                          <div className="w-24 h-24 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto">
                              <IconCalendar className="w-10 h-10 text-slate-400 dark:text-slate-600" />
                          </div>
                          <p className="text-slate-400 dark:text-slate-600 font-medium">Le résultat s'affichera ici</p>
                      </div>
                  </div>
               )}
            </div>
          </div>

              <div className="hidden lg:block fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm
                  ${serverStatus === 'online'
                    ? 'bg-emerald-50/50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
                    : 'bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'}
                `}>
                  <span className={`w-1.5 h-1.5 rounded-full ${serverStatus === 'online' ? 'bg-emerald-500' : 'bg-slate-400 animate-pulse'}`}></span>
                  {serverStatus === 'loading' ? 'Connexion...' : serverStatus === 'online' ? 'Systèmes Opérationnels' : 'Maintenance U-Bordeaux'}
                </div>
              </div>
          <div className="mt-12 lg:hidden flex flex-col items-center gap-4">
             <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm
               ${serverStatus === 'online' ? 'bg-emerald-50/50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400' : 'bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'}
             `}>
                <span className={`w-1.5 h-1.5 rounded-full ${serverStatus === 'online' ? 'bg-emerald-500' : 'bg-slate-400 animate-pulse'}`}></span>
                {serverStatus === 'loading' ? 'Connexion...' : serverStatus === 'online' ? 'Systèmes Opérationnels' : 'Maintenance U-Bordeaux'}
             </div>
             <p className="text-center text-slate-400 dark:text-slate-500 text-xs font-medium">© {new Date().getFullYear()} • Fait avec ❤️</p>
          </div>

        </main>
      </div>
      
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 20px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #475569; }
        .custom-scrollbar { scrollbar-width: thin; scrollbar-color: #cbd5e1 transparent; }
        .dark .custom-scrollbar { scrollbar-color: #475569 transparent; }

        @keyframes blob { 0% { transform: translate(0px, 0px) scale(1); } 33% { transform: translate(30px, -50px) scale(1.1); } 66% { transform: translate(-20px, 20px) scale(0.9); } 100% { transform: translate(0px, 0px) scale(1); } }
        .animate-blob { animation: blob 10s infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
        .animate-loading-bar { animation: loading-bar 1.5s ease-in-out infinite; }
        @keyframes loading-bar { 0% { width: 0%; margin-left: 0; } 50% { width: 100%; margin-left: 0; } 100% { width: 0%; margin-left: 100%; } }
        .animate-bounce-subtle { animation: bounce-subtle 2s infinite; }
        @keyframes bounce-subtle { 0%, 100% { transform: translateY(-3%); } 50% { transform: translateY(3%); } }
        .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border-width: 0; }
      `}</style>
    </div>
  );
}