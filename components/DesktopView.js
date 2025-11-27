import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useCalendarLogic } from '../hooks/useCalendarLogic';
import { IconSearch, IconX, IconGoogle, IconVacation, IconTrash, IconCalendar } from './Icons';
import Navbar from './Navbar';

const DesktopView = ({ theme, toggleTheme, contentVisible }) => {
    const { data: session } = useSession();
    const logic = useCalendarLogic();
    const suggestionsRef = useRef(null);
    const inputRef = useRef(null);
    const suggestionsListRef = useRef(null);
    const [activeIndex, setActiveIndex] = useState(-1);

    // FIX 1. SCROLL ET NAVIGATION CLAVIER
    useEffect(() => {
        if (activeIndex >= 0 && suggestionsListRef.current) {
            const activeElement = suggestionsListRef.current.children[activeIndex];
            if (activeElement) activeElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        } else { setActiveIndex(-1); }
    }, [activeIndex, logic.suggestions]);


    // Gestion Clavier
    const handleKeyDown = (e) => {
        if (logic.suggestions.length === 0) return;
        if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(prev => (prev < logic.suggestions.length - 1 ? prev + 1 : prev)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(prev => (prev > 0 ? prev - 1 : -1)); }
        else if (e.key === 'Enter') { e.preventDefault(); if (activeIndex >= 0 && logic.suggestions[activeIndex]) logic.addGroup(logic.suggestions[activeIndex].text); }
        else if (e.key === 'Escape') { logic.setSuggestions([]); setActiveIndex(-1); }
    };

    const getWebcalLink = () => logic.generatedLink ? logic.generatedLink.replace(/^https?:\/\//, 'webcal://') : '';
    const getGoogleLink = () => logic.generatedLink ? `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(logic.generatedLink.replace('https://', 'http://'))}` : '';

    return (
        <div className={`relative min-h-screen transition-all duration-1000 ease-out delay-100 ${contentVisible ? 'opacity-100 scale-100 blur-0' : 'opacity-0 scale-95 blur-sm'}`}>
            {/* BACKGROUND PC */}
            <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-60"></div>
                <div className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] bg-[#005b8d]/20 dark:bg-[#005b8d]/20 rounded-full blur-[100px] animate-blob mix-blend-multiply dark:mix-blend-screen"></div>
                <div className="absolute top-[10%] right-[-20%] w-[60vw] h-[60vw] bg-cyan-200/40 dark:bg-cyan-900/20 rounded-full blur-[100px] animate-blob animation-delay-2000 mix-blend-multiply dark:mix-blend-screen"></div>
                <div className="absolute bottom-[-20%] left-[20%] w-[60vw] h-[60vw] bg-blue-200/40 dark:bg-indigo-900/20 rounded-full blur-[100px] animate-blob animation-delay-4000 mix-blend-multiply dark:mix-blend-screen"></div>
            </div>

            {/* HEADER PC */}
            <Navbar theme={theme} toggleTheme={toggleTheme} />

            <main className="flex-grow flex items-center justify-center px-6 pt-32 pb-12 max-w-7xl mx-auto w-full h-screen">
                <div className="grid grid-cols-2 gap-20 items-start w-full">
                    {/* GAUCHE PC */}
                    <div className="flex flex-col space-y-8">
                        <div className="text-left">
                            {/* TITRE STANDARDISÉ */}
                            <h1 className="text-7xl font-black text-slate-900 dark:text-white mb-4 tracking-tight leading-[0.95]">
                                Sync<br />
                                <span className="text-[#005b8d]">Ton Agenda.</span>
                            </h1>
                            <p className="text-lg text-slate-500 dark:text-slate-400 font-medium">L'emploi du temps de l'université, propre, rapide et directement dans ta poche.</p>
                        </div>

                        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl shadow-[0_20px_40px_-12px_rgba(0,0,0,0.1)] dark:shadow-black/50 border border-white/60 dark:border-white/10 p-2">
                            <div className="bg-white/50 dark:bg-slate-800/50 rounded-2xl p-6 space-y-6 border border-white/50 dark:border-white/5">
                                {/* Input PC */}
                                <div className="relative group z-20">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        {logic.loading ? <div className="w-5 h-5 border-2 border-t-[#005b8d] dark:border-t-white rounded-full animate-spin"></div> : <IconSearch className="w-5 h-5 text-slate-400 dark:text-slate-600" />}
                                    </div>
                                    <input ref={inputRef} type="text" className="block w-full pl-12 pr-4 py-3.5 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#005b8d]/20 dark:focus:ring-white/10" placeholder="Ex: M1 Informatique..." value={logic.query} onChange={(e) => logic.setQuery(e.target.value)} onKeyDown={handleKeyDown} />
                                    {logic.suggestions.length > 0 && (
                                        <div ref={suggestionsRef} className="absolute left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-xl max-h-64 overflow-y-auto p-1.5 z-30 custom-scrollbar">
                                            <ul ref={suggestionsListRef}>
                                                {logic.suggestions.map((item, index) => (
                                                    <li key={item.id || index}
                                                        onClick={() => logic.addGroup(item.text)}
                                                        onMouseEnter={() => setActiveIndex(index)}
                                                        className={`px-3.5 py-2.5 cursor-pointer text-sm rounded-lg flex items-center justify-between transition-colors 
                                                        ${index === activeIndex
                                                                ? 'bg-slate-100 dark:bg-slate-700/60 text-slate-900 dark:text-white'
                                                                : 'text-slate-600 dark:text-slate-400'}`}
                                                    >
                                                        <span className="font-medium truncate pr-4">{item.text}</span>
                                                        {/* FIX 2. AFFICHAGE INTUITIF ENTRER */}
                                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600 ${index === activeIndex ? 'opacity-100 bg-white dark:bg-slate-800' : 'opacity-0'}`}>↵</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>

                                {/* Tags PC */}
                                {logic.selectedGroups.length > 0 && (
                                    <div className="space-y-3 animate-in fade-in duration-300">
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ta sélection ({logic.selectedGroups.length})</p>
                                            {/* FIX 3. BOUTON TOUT EFFACER */}
                                            <button onClick={logic.clearAll} className="text-xs font-medium text-red-400 hover:text-red-600 dark:text-red-300 dark:hover:text-red-500 flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20">
                                                <IconTrash /> Tout effacer
                                            </button>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {logic.selectedGroups.map(g => (
                                                <span key={g} className="inline-flex items-center pl-3 pr-1 py-1.5 rounded-lg text-sm font-medium bg-[#005b8d]/5 dark:bg-[#005b8d]/20 text-[#005b8d] dark:text-blue-100 border border-[#005b8d]/10">
                                                    {g} <button onClick={() => logic.removeGroup(g)} className="ml-1.5 p-1 hover:text-red-500 dark:hover:text-red-400"><IconX /></button>
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* TOGGLE VACANCES PC */}
                                <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 cursor-pointer transition-colors hover:border-[#005b8d]/30 dark:hover:border-slate-500 group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 group-hover:text-[#005b8d] dark:group-hover:text-white transition-colors">
                                            <IconVacation />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Inclure les vacances</span>
                                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Affiche les congés</span>
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <input type="checkbox" className="sr-only peer" checked={logic.showHolidays} onChange={(e) => { logic.setShowHolidays(e.target.checked); logic.setGeneratedLink('') }} />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#005b8d]"></div>
                                    </div>
                                </label>


                                <button onClick={logic.generateLink} disabled={logic.selectedGroups.length === 0} className={`w-full py-4 rounded-xl font-bold text-base shadow-lg transition-all ${logic.selectedGroups.length > 0 ? 'bg-[#005b8d] hover:bg-[#004a75] text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'}`}>
                                    Générer le calendrier
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* DROITE PC */}
                    <div className="w-full flex flex-col gap-6">
                        {logic.generatedLink ? (
                            <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl overflow-hidden shadow-xl">
                                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                                    <div className="flex items-center gap-2.5"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span><span className="text-sm font-bold uppercase text-slate-600 dark:text-slate-300">Calendrier prêt</span></div>
                                    {logic.isCopied && <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1 rounded-md">Copié !</span>}
                                </div>
                                <div className="p-6 space-y-6">
                                    <div className="relative">
                                        <input readOnly value={logic.generatedLink} className="block w-full pl-4 pr-24 py-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-mono text-slate-600 dark:text-slate-300" onClick={(e) => e.target.select()} />
                                        <button onClick={logic.copyToClipboard} className="absolute right-2 top-2 bottom-2 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200">Copier</button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <a href={getGoogleLink()} target="_blank" className="flex items-center justify-center gap-2 px-4 py-3.5 bg-[#4285F4] hover:bg-[#3367d6] text-white rounded-xl text-sm font-bold"><IconGoogle className="text-white" /> Google</a>
                                        <a href={getWebcalLink()} className="flex items-center justify-center gap-2 px-4 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-bold"><IconCalendar className="w-4 h-4" /> Apple / Outlook</a>
                                    </div>
                                    {/* QR CODE PC */}
                                    <div className="flex items-start gap-5 p-5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                                        <div className="bg-white p-2 rounded-xl shadow-sm shrink-0"><img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=0&data=${encodeURIComponent(logic.generatedLink)}`} alt="QR Code" className="w-24 h-24" loading="lazy" /></div>
                                        <div><p className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">Version Mobile</p><p className="text-sm text-slate-500 dark:text-slate-400">Scannez ce code pour l'ajouter sur votre téléphone.</p></div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex h-full items-center justify-center opacity-30 select-none"><div className="text-center"><div className="w-24 h-24 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4"><IconCalendar className="w-10 h-10 text-slate-400 dark:text-slate-600" /></div><p className="text-slate-400 dark:text-slate-600 font-medium">Le résultat s'affichera ici</p></div></div>
                        )}
                    </div>
                </div>
            </main>
            <style jsx global>{`
            .custom-scrollbar::-webkit-scrollbar { width: 6px; }
            .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 20px; }
            .dark .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #475569; }
        `}</style>
        </div >
    );
};

export default DesktopView;
