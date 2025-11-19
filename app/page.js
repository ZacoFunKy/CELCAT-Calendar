'use client'
import { useState, useEffect, useRef } from 'react';

// --- ICÔNES SIMPLIFIÉES ---
const IconSearch = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>;
const IconCopy = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>;
const IconCheck = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>;
const IconX = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>;

export default function Home() {
  // --- ÉTATS (LOGIQUE) ---
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [generatedLink, setGeneratedLink] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [origin, setOrigin] = useState('');
  const suggestionsRef = useRef(null);

  useEffect(() => {
    setOrigin(window.location.origin);

    // On récupère la sauvegarde
    const savedGroups = localStorage.getItem('my_celcat_groups');
    if (savedGroups) {
      try {
        // On remet les groupes dans l'état
        setSelectedGroups(JSON.parse(savedGroups));
      } catch (e) {
        console.error("Erreur chargement sauvegarde", e);
      }
    }

    // Gestion du clic en dehors de la liste de recherche
    function handleClickOutside(event) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        setSuggestions([]);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (selectedGroups.length > 0) {
      // On enregistre la liste en texte dans le navigateur
      localStorage.setItem('my_celcat_groups', JSON.stringify(selectedGroups));
    }
  }, [selectedGroups]);

  // Appel API de recherche (Debounce)
  useEffect(() => {
    const fetchGroups = async () => {
      if (query.length < 3) {
        setSuggestions([]);
        return;
      }
      setLoading(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        setSuggestions(data.results || []);
      } catch (error) {
        console.error("Erreur search", error);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(fetchGroups, 300);
    return () => clearTimeout(timeoutId);
  }, [query]);

  // --- ACTIONS ---
  const addGroup = (groupText) => {
    if (!selectedGroups.includes(groupText)) {
      setSelectedGroups([...selectedGroups, groupText]);
    }
    setQuery('');
    setSuggestions([]);
    setGeneratedLink('');
  };

  const removeGroup = (groupToRemove) => {
    setSelectedGroups(selectedGroups.filter(g => g !== groupToRemove));
    setGeneratedLink('');
  };

  const generateLink = () => {
    if (selectedGroups.length === 0) return;
    const groupsString = selectedGroups.join(',');
    const link = `${origin}/api/calendar.ics?group=${encodeURIComponent(groupsString)}`;
    setGeneratedLink(link);
    setIsCopied(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLink);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 3000);
  };

  return (
    <div className="min-h-screen bg-[#f5f7f9] font-sans text-slate-800 flex flex-col">

      {/* --- HEADER ÉPURÉ & OFFICIEL --- */}
      <header className="bg-[#005b8d] text-white py-4 shadow-md">
        <div className="container mx-auto px-4 flex justify-center md:justify-start items-center gap-4">
          {/* Logo Textuel */}
          <div className="flex flex-col leading-tight font-bold tracking-tight select-none">
            <span className="text-xl">université</span>
            <span className="text-sm opacity-90">de BORDEAUX</span>
          </div>
          {/* Séparateur discret */}
          <div className="hidden md:block h-8 w-px bg-white/20 mx-2"></div>
          <h1 className="hidden md:block text-blue-100 font-medium tracking-wide text-sm uppercase">
            Exportateur Calendrier
          </h1>
        </div>
      </header>

      {/* --- CONTENU CENTRÉ --- */}
      <main className="flex-grow flex flex-col items-center justify-start pt-10 px-4 pb-10">

        <div className="w-full max-w-2xl">

          {/* TITRE SIMPLE */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-[#005b8d] mb-2">
              Synchronise ton emploi du temps
            </h2>
            <p className="text-slate-500 text-sm md:text-base">
              Récupère tes cours Celcat directement sur ton téléphone ou ordinateur.
            </p>
          </div>

          {/* CARTE PRINCIPALE */}
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-visible">
            <div className="p-6 md:p-8 space-y-6">

              {/* 1. INPUT RECHERCHE */}
              <div className="relative" ref={suggestionsRef}>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Recherche tes groupes
                </label>

                <div className="relative flex items-center">
                  <input
                    type="text"
                    className="w-full p-4 pl-11 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#005b8d] focus:border-[#005b8d] outline-none transition text-base"
                    placeholder="Ex: Info de Gestion..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  <div className="absolute left-4 text-slate-400 pointer-events-none">
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-slate-300 border-t-[#005b8d] rounded-full animate-spin"></div>
                    ) : (
                      <IconSearch />
                    )}
                  </div>
                </div>

                {/* LISTE DEROULANTE */}
                {suggestions.length > 0 && (
                  <div className="absolute z-20 w-full bg-white mt-2 border border-slate-200 rounded-lg shadow-xl max-h-64 overflow-y-auto">
                    <ul>
                      {suggestions.map((item) => (
                        <li
                          key={item.id}
                          onClick={() => addGroup(item.text)}
                          className="px-4 py-3 hover:bg-blue-50 cursor-pointer text-sm border-b border-slate-50 last:border-0 text-slate-700 transition-colors flex items-center justify-between group"
                        >
                          <span>{item.text}</span>
                          <span className="text-[#005b8d] opacity-0 group-hover:opacity-100 text-xs font-bold">+ Ajouter</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* 2. LISTE DES GROUPES SÉLECTIONNÉS */}
              <div className="min-h-[30px]">
                {selectedGroups.length === 0 ? (
                  <p className="text-sm text-slate-400 italic">Aucun groupe sélectionné pour le moment.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {selectedGroups.map((g) => (
                      <span key={g} className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium bg-[#f0f7fc] text-[#005b8d] border border-blue-100">
                        {g}
                        <button onClick={() => removeGroup(g)} className="ml-2 text-blue-400 hover:text-red-500 transition focus:outline-none">
                          <IconX />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. BOUTON ACTION */}
              <button
                onClick={generateLink}
                disabled={selectedGroups.length === 0}
                className={`w-full py-4 rounded-lg font-bold text-white text-lg transition shadow-sm flex items-center justify-center gap-2
                  ${selectedGroups.length > 0
                    ? 'bg-[#005b8d] hover:bg-[#004a73] hover:shadow-md transform active:scale-[0.99]'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'}
                `}
              >
                Générer mon lien
              </button>

              {/* 4. RÉSULTAT */}
              {generatedLink && (
                <div className="mt-6 pt-6 border-t border-slate-100 animate-fade-in">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-green-800 font-bold mb-3">
                      <IconCheck />
                      <span>Lien prêt à l'emploi !</span>
                    </div>

                    <div className="flex gap-2">
                      <input
                        readOnly
                        value={generatedLink}
                        className="flex-grow bg-white border border-green-200 rounded px-3 text-sm text-slate-600 outline-none select-all"
                        onClick={(e) => e.target.select()}
                      />
                      <button
                        onClick={copyToClipboard}
                        className={`px-4 py-2 rounded font-semibold border transition flex items-center gap-2 text-sm whitespace-nowrap
                          ${isCopied
                            ? 'bg-green-600 border-green-600 text-white'
                            : 'bg-white border-slate-300 text-slate-700 hover:border-[#005b8d] hover:text-[#005b8d]'}
                        `}
                      >
                        {isCopied ? 'Copié !' : 'Copier'}
                        {!isCopied && <IconCopy />}
                      </button>
                    </div>

                    <p className="text-xs text-green-700 mt-3">
                      ℹ️ Colle ce lien dans Google Agenda (Ajouter &gt; À partir de l'URL).
                    </p>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* FOOTER DISCRET */}
          <p className="text-center text-slate-400 text-xs mt-8">
            Outil non-officiel • Données Celcat U-Bordeaux • Serveur sécurisé
          </p>

        </div>
      </main>
    </div>
  );
}