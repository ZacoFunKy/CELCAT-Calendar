import { FiCopy, FiCheck } from 'react-icons/fi';
import CollapsibleCard from '../CollapsibleCard';

export default function ICSLink({ calendarToken, onCopy, copySuccess, isOpen = false }) {
    return (
        <CollapsibleCard title="Mon Lien ICS" icon={FiCopy} defaultOpen={isOpen}>
            <div className="p-1">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                    Utilise ce lien pour t'abonner à ton emploi du temps dans ton application de calendrier préférée (Google Calendar, Apple Calendar, Outlook...).
                </p>
                <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-[#005b8d] to-cyan-500 rounded-xl blur opacity-20 group-hover:opacity-30 transition-opacity"></div>
                    <div className="relative flex gap-2 bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <input
                            readOnly
                            value={calendarToken ? `${typeof window !== 'undefined' ? window.location.origin : ''}/api/calendar.ics?token=${calendarToken}` : 'Chargement...'}
                            className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/50 rounded-lg text-xs font-mono text-slate-600 dark:text-slate-400 truncate outline-none focus:ring-2 focus:ring-[#005b8d]/20 transition-all"
                            onClick={(e) => e.target.select()}
                        />
                        <button
                            onClick={onCopy}
                            className={`px-4 py-2 rounded-lg transition-all duration-300 flex items-center justify-center font-medium shadow-md ${copySuccess
                                    ? 'bg-green-500 text-white shadow-green-500/30'
                                    : 'bg-[#005b8d] hover:bg-[#004a75] text-white shadow-[#005b8d]/20 hover:scale-105'
                                }`}
                        >
                            {copySuccess ? <FiCheck className="w-4 h-4" /> : <FiCopy className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
                {copySuccess && (
                    <div className="mt-3 flex items-center justify-center gap-2 text-green-600 dark:text-green-400 text-xs font-medium animate-in fade-in slide-in-from-top-2">
                        <FiCheck className="w-3 h-3" />
                        {copySuccess}
                    </div>
                )}
            </div>
        </CollapsibleCard>
    );
}
