import { useState, useEffect } from 'react';
import { FiX, FiEdit2, FiEyeOff, FiSave, FiCalendar, FiMapPin, FiClock } from 'react-icons/fi';

export default function EventDetailsModal({ isOpen, onClose, event, onHide, onRename }) {
    const [mode, setMode] = useState('view'); // 'view', 'rename', 'hide'
    const [newName, setNewName] = useState('');
    const [renameScope, setRenameScope] = useState('single'); // 'single', 'all'
    const [hideScope, setHideScope] = useState('single'); // 'single', 'name', 'professor'

    useEffect(() => {
        if (event) {
            setNewName(event.title);
            // Don't reset mode if we are just updating the title from parent
            // But if it's a new event (different ID), we should reset
        }
    }, [event]);

    // Reset mode when opening a new event
    useEffect(() => {
        if (isOpen) {
            setMode('view');
            setRenameScope('single');
            setHideScope('single');
        }
    }, [isOpen, event?.id]);

    if (!isOpen || !event) return null;

    const handleSaveRename = () => {
        onRename(event.id, newName, renameScope);
        setMode('view');
    };

    const handleConfirmHide = () => {
        let value = event.id;
        if (hideScope === 'name') value = event.title;
        if (hideScope === 'professor') {
            // Extract professor name from title (assuming "Course - PROFESSOR")
            const parts = event.title.split(' - ');
            value = parts[parts.length - 1];
        }
        onHide(event.id, hideScope, value);
        onClose();
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
        });
    };

    const formatTime = (date) => {
        return new Date(date).toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Extract potential professor name for the option
    const professorName = event.title.split(' - ').length > 1 ? event.title.split(' - ').pop() : null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-white/20 animate-in fade-in zoom-in-95 duration-200">
                {/* Header with Color Strip */}
                <div
                    className="h-3 w-full"
                    style={{ backgroundColor: event.backgroundColor }}
                ></div>

                <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight flex-1 pr-4">
                            {event.title}
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500"
                        >
                            <FiX className="w-5 h-5" />
                        </button>
                    </div>

                    {mode === 'view' && (
                        <>
                            <div className="space-y-4 mb-8">
                                <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                                    <FiCalendar className="text-[#005b8d]" />
                                    <span>{formatDate(event.start)}</span>
                                </div>
                                <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                                    <FiClock className="text-[#005b8d]" />
                                    <span>{formatTime(event.start)} - {formatTime(event.end)}</span>
                                </div>
                                {event.extendedProps?.location && (
                                    <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                                        <FiMapPin className="text-[#005b8d]" />
                                        <span>{event.extendedProps.location}</span>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setMode('rename')}
                                    className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition-colors font-medium"
                                >
                                    <FiEdit2 />
                                    Renommer
                                </button>
                                <button
                                    onClick={() => setMode('hide')}
                                    className="flex items-center justify-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl transition-colors font-medium"
                                >
                                    <FiEyeOff />
                                    Masquer
                                </button>
                            </div>
                        </>
                    )}

                    {mode === 'rename' && (
                        <div className="space-y-4">
                            <h3 className="font-semibold text-slate-900 dark:text-white">Renommer le cours</h3>
                            <input
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-lg font-semibold focus:ring-2 focus:ring-[#005b8d] outline-none"
                                autoFocus
                            />
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="renameScope"
                                        value="single"
                                        checked={renameScope === 'single'}
                                        onChange={(e) => setRenameScope(e.target.value)}
                                        className="text-[#005b8d] focus:ring-[#005b8d]"
                                    />
                                    <span className="text-sm text-slate-700 dark:text-slate-300">Ce cours seulement</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="renameScope"
                                        value="all"
                                        checked={renameScope === 'all'}
                                        onChange={(e) => setRenameScope(e.target.value)}
                                        className="text-[#005b8d] focus:ring-[#005b8d]"
                                    />
                                    <span className="text-sm text-slate-700 dark:text-slate-300">Tous les cours "{event.title}"</span>
                                </label>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setMode('view')}
                                    className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-medium"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={handleSaveRename}
                                    className="flex-1 px-4 py-2 bg-[#005b8d] text-white rounded-xl font-medium hover:bg-[#004a73]"
                                >
                                    Sauvegarder
                                </button>
                            </div>
                        </div>
                    )}

                    {mode === 'hide' && (
                        <div className="space-y-4">
                            <h3 className="font-semibold text-slate-900 dark:text-white">Masquer le cours</h3>
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="hideScope"
                                        value="single"
                                        checked={hideScope === 'single'}
                                        onChange={(e) => setHideScope(e.target.value)}
                                        className="text-[#005b8d] focus:ring-[#005b8d]"
                                    />
                                    <span className="text-sm text-slate-700 dark:text-slate-300">Ce cours seulement</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="hideScope"
                                        value="name"
                                        checked={hideScope === 'name'}
                                        onChange={(e) => setHideScope(e.target.value)}
                                        className="text-[#005b8d] focus:ring-[#005b8d]"
                                    />
                                    <span className="text-sm text-slate-700 dark:text-slate-300">Tous les cours "{event.title}"</span>
                                </label>
                                {professorName && (
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="hideScope"
                                            value="professor"
                                            checked={hideScope === 'professor'}
                                            onChange={(e) => setHideScope(e.target.value)}
                                            className="text-[#005b8d] focus:ring-[#005b8d]"
                                        />
                                        <span className="text-sm text-slate-700 dark:text-slate-300">Tous les cours de {professorName}</span>
                                    </label>
                                )}
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setMode('view')}
                                    className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-medium"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={handleConfirmHide}
                                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700"
                                >
                                    Confirmer
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
