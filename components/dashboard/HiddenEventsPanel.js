import { useState } from 'react';
import { FiEyeOff, FiTrash2, FiX, FiAlertCircle, FiAlertTriangle } from 'react-icons/fi';
import CollapsibleCard from '../CollapsibleCard';
import Portal from '../Portal';

export default function HiddenEventsPanel({
    hiddenEvents,
    hiddenRules,
    onUnhideRule,
    onUnhideEvent,
    onUnhideAll,
    isOpen,
    onToggle
}) {
    const [showConfirm, setShowConfirm] = useState(false);
    const hasHiddenItems = (hiddenEvents?.length > 0 || hiddenRules?.length > 0);

    const handleConfirmUnhide = () => {
        onUnhideAll();
        setShowConfirm(false);
    };

    return (
        <>
            <CollapsibleCard
                title="Cours Masqués"
                icon={FiEyeOff}
                isOpen={isOpen}
                onToggle={onToggle}
            >
                <div className="space-y-4">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-red-500"></span>
                            Règles actives
                        </span>
                        {hasHiddenItems && (
                            <button
                                onClick={() => setShowConfirm(true)}
                                className="text-xs px-2 py-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-md hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors font-medium"
                            >
                                Tout réafficher
                            </button>
                        )}
                    </div>

                    {hiddenRules?.length > 0 && (
                        <div className="space-y-2">
                            {hiddenRules.map((rule, idx) => (
                                <div key={idx} className="group flex items-center justify-between p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-sm hover:shadow-md transition-all hover:border-red-200 dark:hover:border-red-900/50">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-0.5">
                                            {rule.ruleType === 'name' ? 'Par nom' : 'Par professeur'}
                                        </span>
                                        <span className="text-sm text-slate-600 dark:text-slate-400 font-medium truncate max-w-[180px]">
                                            {rule.value}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => onUnhideRule(rule)}
                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                        title="Supprimer la règle"
                                    >
                                        <FiTrash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {hiddenEvents?.length > 0 && (
                        <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Événements individuels</span>
                                <span className="text-xs px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-md font-mono">
                                    {hiddenEvents.length}
                                </span>
                            </div>
                            <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-1 pr-1">
                                {hiddenEvents.map(id => (
                                    <div key={id} className="group flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-xs hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all">
                                        <span className="text-slate-500 truncate max-w-[180px] font-mono opacity-70">{id}</span>
                                        <button
                                            onClick={() => onUnhideEvent(id)}
                                            className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                        >
                                            <FiX className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {!hasHiddenItems && (
                        <div className="py-8 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/30">
                            <FiAlertCircle className="w-8 h-8 mb-2 opacity-50" />
                            <p className="text-sm italic">Aucun cours masqué</p>
                        </div>
                    )}
                </div>
            </CollapsibleCard>

            {/* Confirmation Modal */}
            {showConfirm && (
                <Portal>
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200">
                            <div className="flex flex-col items-center text-center">
                                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4 text-red-600 dark:text-red-500">
                                    <FiAlertTriangle className="w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Tout réafficher ?</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                                    Cette action supprimera toutes les règles de masquage et réaffichera tous les cours précédemment masqués.
                                </p>
                                <div className="flex gap-3 w-full">
                                    <button
                                        onClick={() => setShowConfirm(false)}
                                        className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        onClick={handleConfirmUnhide}
                                        className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20"
                                    >
                                        Confirmer
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </Portal>
            )}
        </>
    );
}
