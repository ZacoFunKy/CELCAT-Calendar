import { useRef } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useCalendarLogic } from '../hooks/useCalendarLogic';
import { IconSearch, IconX, IconGoogle, IconVacation, IconTrash, IconCalendar } from './Icons';
import Navbar from './Navbar';

const MobileView = ({ theme, toggleTheme, contentVisible }) => {
    const { data: session } = useSession();
    const logic = useCalendarLogic();
    const resultRef = useRef(null);

    const handleGenerate = () => {
        logic.generateLink();
        setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }

    const getWebcalLink = () => logic.generatedLink ? logic.generatedLink.replace(/^https?:\/\//, 'webcal://') : '';
    const getGoogleLink = () => logic.generatedLink ? `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(logic.generatedLink.replace('https://', 'http://'))}` : '';

    return (
        <div className={`min-h-screen transition-all duration-1000 ease-out delay-100 ${contentVisible ? 'opacity-100 scale-100 blur-0' : 'opacity-0 scale-95 blur-sm'}`}>
            {/* HEADER MOBILE */}
            <Navbar theme={theme} toggleTheme={toggleTheme} />

            <main className="pt-24 pb-12 px-4">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-2 tracking-tight leading-tight">
                        Sync<br />
                        <span className="text-[#005b8d]">Ton Agenda.</span>
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">L'emploi du temps de l'université, directement dans ta poche.</p>
                </div>

                {/* CARTE PRINCIPALE (STYLE PC) */}
                < div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl shadow-[0_20px_40px_-12px_rgba(0,0,0,0.1)] dark:shadow-black/50 border border-white/60 dark:border-white/10 p-2 ring-1 ring-black/5 dark:ring-white/5 transition-all duration-300" >
                    <div className="bg-white/50 dark:bg-slate-800/50 rounded-2xl p-6 space-y-6 border border-white/50 dark:border-white/5">

                        {/* RECHERCHE */}
                        <div className="relative">
                            <label htmlFor="group-search" className="block text-sm font-bold text-slate-700 dark:text-slate-400 mb-2 ml-1">1. Ajoute tes matières</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <div className="text-slate-400 dark:text-slate-600 group-focus-within:text-[#005b8d] transition-colors">
                                        <IconSearch className="w-5 h-5" />
                                    </div>
                                </div>
                                {/* Input style PC */}
                                <input
                                    id="group-search"
                                    type="text"
                                    autoComplete="off"
                                    placeholder="Ex: Info de Gestion, MIAGE, M2..."
                                    className="block w-full pl-12 pr-4 py-3.5 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:ring-2 focus:ring-[#005b8d]/20 dark:focus:ring-white/10 focus:border-[#005b8d] dark:focus:border-white/30 outline-none transition-all shadow-sm hover:border-slate-300 dark:hover:border-slate-600 text-base font-medium"
                                    value={logic.query}
                                    onChange={(e) => logic.setQuery(e.target.value)}
                                />
                                {/* Suggestions Mobile (Simplifié) */}
                                {logic.suggestions.length > 0 && (
                                    <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-xl max-h-60 overflow-y-auto z-50">
                                        <ul>
                                            {logic.suggestions.map((item, i) => (
                                                <li key={item.id || i} onClick={() => logic.addGroup(item.text)} className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer text-slate-700 dark:text-slate-300 border-b border-slate-50 dark:border-slate-700 last:border-0">
                                                    {item.text}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* TAGS SELECTIONNÉS */}
                        <div className="min-h-[40px]">
                            {logic.selectedGroups.length > 0 && (
                                <div className="space-y-3 animate-in fade-in duration-300">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ta sélection ({logic.selectedGroups.length})</p>
                                        <button onClick={logic.clearAll} className="text-xs font-medium text-red-400 hover:text-red-600 dark:text-red-300 dark:hover:text-red-500 flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20">
                                            <IconTrash /> Tout effacer
                                        </button>
                                    </div>
                                    <ul className="flex flex-wrap gap-2">
                                        {logic.selectedGroups.map(g => (
                                            <li key={g} className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-[#005b8d]/5 dark:bg-[#005b8d]/20 text-[#005b8d] dark:text-blue-100 border border-[#005b8d]/10 dark:border-[#005b8d]/30 group hover:border-[#005b8d]/30 transition-colors">
                                                {g}
                                                <button onClick={() => logic.removeGroup(g)} className="ml-2 text-blue-300 dark:text-blue-100/50 hover:text-red-500 transition p-0.5 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20">
                                                    <IconX />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>

                        {/* TOGGLE VACANCES */}
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


                        {/* BOUTON GENERER */}
                        <div className="pt-2">
                            <button onClick={handleGenerate} disabled={logic.selectedGroups.length === 0}
                                className={`group w-full py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-3 transition-all duration-300 transform active:scale-[0.98]
                          ${logic.selectedGroups.length === 0
                                        ? 'opacity-50 cursor-not-allowed bg-slate-400 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                                        : 'bg-[#005b8d] hover:bg-[#004a75] text-white shadow-[#005b8d]/20 hover:shadow-[#005b8d]/40'}
                        `}>
                                <span>Générer mon lien</span>
                                {logic.selectedGroups.length > 0 && <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>}
                            </button>
                        </div>
                    </div>
                </div >

                {/* RESULTATS (Style Mobile adapté au glassmorphism) */}
                {
                    logic.generatedLink && (
                        <div ref={resultRef} className="mt-8 bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-700 p-6 animate-in fade-in slide-in-from-bottom-4">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2"><span className="text-emerald-500">●</span> Calendrier prêt</h3>
                            <div className="flex gap-2 mb-4">
                                <input readOnly value={logic.generatedLink} className="flex-grow bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-600 dark:text-slate-300 font-mono" />
                                <button onClick={logic.copyToClipboard} className="bg-[#005b8d] text-white px-4 rounded-lg font-bold text-sm">{logic.isCopied ? 'Copié!' : 'Copier'}</button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <a href={getWebcalLink()} className="block text-center py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-sm hover:bg-slate-200 transition">Apple / Outlook</a>
                                <a href={getGoogleLink()} target="_blank" className="block text-center py-3 bg-[#4285F4] hover:bg-[#3367d6] text-white font-bold rounded-xl text-sm transition">Google</a>
                            </div>
                        </div>
                    )
                }

                <p className="text-center text-slate-400 dark:text-slate-500 text-xs mt-12 mb-6">© {new Date().getFullYear()} • Fait avec ❤️</p>
            </main >
        </div >
    );
};

export default MobileView;
