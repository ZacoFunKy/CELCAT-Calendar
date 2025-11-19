'use client'
import { useState, useEffect, useRef } from 'react';

// --- ICÔNES ---
const IconSearch = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>;
const IconCopy = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>;
const IconCheck = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>;
const IconX = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>;
const IconTrash = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>;
const IconGoogle = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12.5 2C18.3 2 23 6.7 23 12.5S18.3 23 12.5 23 2 18.3 2 12.5 6.7 2 12.5 2zm4.5 11h-3.5v3.5a1 1 0 01-2 0V13h-3.5a1 1 0 010-2H11.5V7.5a1 1 0 012 0V11h3.5a1 1 0 010 2z"/></svg>;
const IconCalendar = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>;
const IconSparkles = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-400"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>;
const IconQr = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/></svg>;

export default function Home() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [generatedLink, setGeneratedLink] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [origin, setOrigin] = useState('');
  const [showHolidays, setShowHolidays] = useState(false); // ⚡️ NOUVEAU : État pour les vacances
  const suggestionsRef = useRef(null);

  // 1. CHARGEMENT INITIAL
  useEffect(() => {
    setOrigin(window.location.origin);
    const savedGroups = localStorage.getItem('my_celcat_groups');
    if (savedGroups) {
      try {
        setSelectedGroups(JSON.parse(savedGroups));
      } catch (e) { console.error(e); }
    }
    
    // Chargement pref vacances
    const savedHolidays = localStorage.getItem('my_celcat_holidays');
    if (savedHolidays) setShowHolidays(savedHolidays === 'true');

    function handleClickOutside(event) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) setSuggestions([]);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 2. SAUVEGARDE AUTOMATIQUE
  useEffect(() => {
    localStorage.setItem('my_celcat_groups', JSON.stringify(selectedGroups));
  }, [selectedGroups]);

  useEffect(() => {
    localStorage.setItem('my_celcat_holidays', showHolidays);
  }, [showHolidays]);

  // API RECHERCHE
  useEffect(() => {
    const fetchGroups = async () => {
      if (query.length < 3) { setSuggestions([]); return; }
      setLoading(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        setSuggestions(data.results || []);
      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    const timeoutId = setTimeout(fetchGroups, 300);
    return () => clearTimeout(timeoutId);
  }, [query]);

  const addGroup = (groupText) => {
    if (!selectedGroups.includes(groupText)) setSelectedGroups([...selectedGroups, groupText]);
    setQuery(''); setSuggestions([]); setGeneratedLink('');
  };

  const removeGroup = (groupToRemove) => {
    const newGroups = selectedGroups.filter(g => g !== groupToRemove);
    setSelectedGroups(newGroups);
    setGeneratedLink('');
  };

  const clearAll = () => {
    setSelectedGroups([]); setGeneratedLink('');
  };

  const generateLink = () => {
    if (selectedGroups.length === 0) return;
    const groupsString = selectedGroups.join(',');
    // ⚡️ NOUVEAU : Ajout du paramètre vacances dans l'URL
    const link = `${origin}/api/calendar.ics?group=${encodeURIComponent(groupsString)}&holidays=${showHolidays}`;
    setGeneratedLink(link);
    setIsCopied(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLink);
    setIsCopied(true); setTimeout(() => setIsCopied(false), 2000);
  };

  const getWebcalLink = () => {
    if (!generatedLink) return '';
    return generatedLink.replace(/^https?:\/\//, 'webcal://');
  };

  const getGoogleLink = () => {
    if (!generatedLink) return '';
    const cleanLink = generatedLink.replace('https://', 'http://');
    return `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(cleanLink)}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/50 font-sans text-slate-800 flex flex-col">
      
      {/* HEADER */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#005b8d] rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-900/20">
              <IconCalendar />
            </div>
            <div className="flex flex-col leading-tight">
               <span className="text-lg font-bold text-slate-800 tracking-tight">U-Bordeaux</span>
               <span className="text-xs font-medium text-[#005b8d] uppercase tracking-wider">Calendrier Sync</span>
            </div>
          </div>
          <a href="https://celcat.u-bordeaux.fr" target="_blank" className="text-xs font-medium text-slate-400 hover:text-[#005b8d] transition">Source Celcat →</a>
        </div>
      </header>

      {/* MAIN */}
      <main className="flex-grow flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl animate-fade-in-up">
          
          {/* TITRE */}
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">
              Ton emploi du temps, <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#005b8d] to-blue-500">enfin synchronisé.</span>
            </h1>
            <p className="text-lg text-slate-500 max-w-lg mx-auto leading-relaxed">
              Recherche tes cours, génère ton lien et ajoute-le directement à ton calendrier.
            </p>
          </div>

          {/* CARTE */}
          <div className="bg-white rounded-2xl shadow-xl shadow-blue-900/5 border border-slate-100 overflow-visible transition-all duration-300 hover:shadow-2xl hover:shadow-blue-900/10">
            <div className="p-6 md:p-8 space-y-8">

              {/* RECHERCHE */}
              <div className="relative" ref={suggestionsRef}>
                <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">1. Ajoute tes matières</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-slate-200 border-t-[#005b8d] rounded-full animate-spin"></div>
                    ) : (
                      <div className="text-slate-400 group-focus-within:text-[#005b8d] transition-colors"><IconSearch /></div>
                    )}
                  </div>
                  <input
                    type="text"
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-xl text-slate-800 placeholder-slate-400 focus:bg-white focus:border-[#005b8d] focus:ring-4 focus:ring-blue-50 outline-none transition-all duration-200 text-base font-medium"
                    placeholder="Ex: Info de Gestion, MIAGE, M2 informatique..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>

                {suggestions.length > 0 && (
                  <div className="absolute z-20 w-full bg-white mt-2 border border-slate-100 rounded-xl shadow-2xl max-h-64 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                    <ul className="py-2">
                      {suggestions.map((item) => (
                        <li 
                          key={item.id}
                          onClick={() => addGroup(item.text)}
                          className="px-5 py-3 hover:bg-blue-50 cursor-pointer text-sm text-slate-700 transition-colors flex items-center justify-between group"
                        >
                          <span className="font-medium">{item.text}</span>
                          <span className="text-[#005b8d] opacity-0 group-hover:opacity-100 text-xs font-bold bg-blue-100 px-2 py-1 rounded-md transition-all transform translate-x-2 group-hover:translate-x-0">+ Ajouter</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* LISTE GROUPES */}
              <div className="min-h-[40px]">
                 {selectedGroups.length === 0 ? (
                    <div className="flex items-center justify-center h-full py-4 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50">
                        <p className="text-sm text-slate-400 font-medium">Aucun groupe sélectionné</p>
                    </div>
                 ) : (
                    <div className="space-y-3 animate-in fade-in duration-300">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ta sélection ({selectedGroups.length})</p>
                        <button onClick={clearAll} className="text-xs font-medium text-red-400 hover:text-red-600 flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-red-50"><IconTrash /> Tout effacer</button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {selectedGroups.map((g) => (
                          <span key={g} className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-50 text-[#005b8d] border border-blue-100 group hover:border-blue-200 transition-colors">
                            {g}
                            <button onClick={() => removeGroup(g)} className="ml-2 text-blue-300 hover:text-red-500 transition focus:outline-none p-0.5 rounded-full hover:bg-red-50"><IconX /></button>
                          </span>
                        ))}
                      </div>
                    </div>
                 )}
              </div>
              
              {/* ⚡️ OPTIONS (VACANCES) */}
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                 <div className="flex items-center h-5">
                   <input
                     id="holidays-toggle"
                     type="checkbox"
                     checked={showHolidays}
                     onChange={(e) => {
                         setShowHolidays(e.target.checked);
                         setGeneratedLink(''); // Reset pour forcer la régénération
                     }}
                     className="w-5 h-5 text-[#005b8d] border-gray-300 rounded focus:ring-[#005b8d]"
                   />
                 </div>
                 <div className="ml-2 text-sm">
                   <label htmlFor="holidays-toggle" className="font-medium text-slate-700 cursor-pointer select-none">Inclure les vacances universitaires</label>
                   <p className="text-slate-500 text-xs">Coche cette case si tu veux voir les périodes de congés dans ton calendrier.</p>
                 </div>
              </div>

              {/* BOUTON */}
              <div className="pt-2">
                <button
                  onClick={generateLink}
                  disabled={selectedGroups.length === 0}
                  className={`w-full py-4 rounded-xl font-bold text-white text-lg shadow-lg flex items-center justify-center gap-3 transition-all duration-300
                    ${selectedGroups.length > 0 
                      ? 'bg-gradient-to-r from-[#005b8d] to-blue-600 hover:shadow-blue-900/25 hover:scale-[1.02] active:scale-[0.98]' 
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'}
                  `}
                >
                  <span>Générer mon lien</span>
                </button>
              </div>

              {/* RESULTAT */}
              {generatedLink && (
                <div className="mt-8 pt-8 border-t border-dashed border-slate-200 animate-in slide-in-from-bottom-4 duration-500">
                  
                  <div className="bg-[#f0fdf4] border border-green-200 rounded-xl p-1 overflow-hidden shadow-sm">
                     <div className="bg-white/60 p-4 rounded-lg">
                        <div className="flex items-center gap-2 text-green-700 font-bold mb-4">
                          <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center"><IconCheck /></div>
                          <span>Lien prêt à l'emploi !</span>
                        </div>
                        
                        <div className="flex gap-2 mb-4">
                          <input 
                            readOnly 
                            value={generatedLink}
                            className="flex-grow bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 font-mono outline-none focus:border-green-500 transition-colors select-all"
                            onClick={(e) => e.target.select()}
                          />
                          <button
                            onClick={copyToClipboard}
                            className={`px-4 py-2 rounded-lg font-bold border transition-all flex items-center gap-2 text-sm whitespace-nowrap shadow-sm
                              ${isCopied ? 'bg-green-600 border-green-600 text-white' : 'bg-white border-slate-200 text-slate-700 hover:border-[#005b8d] hover:text-[#005b8d]'}
                            `}
                          >
                            {isCopied ? 'Copié !' : 'Copier'}
                            {!isCopied && <IconCopy />}
                          </button>
                        </div>

                        {/* ⚡️ QR CODE & ACTIONS */}
                        <div className="flex flex-col md:flex-row gap-4">
                            {/* QR CODE VIA API SIMPLE */}
                            <div className="flex-shrink-0 flex items-center justify-center bg-white p-2 border border-slate-100 rounded-lg shadow-sm mx-auto md:mx-0">
                                <img 
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(generatedLink)}`} 
                                    alt="Scan pour mobile" 
                                    className="w-24 h-24"
                                    loading="lazy"
                                />
                            </div>

                            <div className="flex-grow grid grid-cols-1 gap-2">
                                <a
                                    href={getGoogleLink()}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-2 px-4 py-3 bg-[#4285F4] hover:bg-[#3367d6] text-white rounded-lg font-semibold transition-all shadow-sm hover:shadow"
                                >
                                    <IconGoogle /> Ajouter à Google
                                </a>
                                <a
                                    href={getWebcalLink()}
                                    className="flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-slate-100 hover:border-blue-200 text-slate-700 hover:text-[#005b8d] rounded-lg font-semibold transition-all shadow-sm hover:shadow"
                                >
                                    <div className="text-[#005b8d]"><IconCalendar /></div>
                                    Outlook / Apple
                                </a>
                            </div>
                        </div>

                     </div>
                  </div>
                  
                  <p className="text-xs text-center text-slate-400 mt-4 font-medium">
                    📱 Astuce : Scanne le QR Code pour l'ajouter direct sur ton téléphone.
                  </p>

                </div>
              )}

            </div>
          </div>
          
          <p className="text-center text-slate-400 text-xs mt-12 mb-6">
            © {new Date().getFullYear()} • Fait avec ❤️ par un étudiant pour les étudiants.
          </p>

        </div>
      </main>
      
      <style jsx global>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  );
}