import { useState, useRef, useEffect } from 'react';
import { FiSettings, FiCheck, FiChevronDown, FiAlertTriangle, FiMonitor, FiDroplet, FiSliders } from 'react-icons/fi';
import CollapsibleCard from '../CollapsibleCard';
import Portal from '../Portal';
import ConfirmationModal from '../ConfirmationModal';

const COLOR_PALETTE = [
    '#e11d48', '#ea580c', '#d97706', '#65a30d',
    '#16a34a', '#059669', '#0d9488', '#0891b2',
    '#0284c7', '#2563eb', '#4f46e5', '#7c3aed',
    '#9333ea', '#c026d3', '#db2777', '#475569'
];

export default function CustomizationPanel({
    showHolidays,
    onHolidayToggle,
    titleFormat,
    onTitleFormatChange,
    onTitleFormatSave,
    saveSuccess,
    colorSettings,
    onColorChange,
    typeMappings,
    onTypeMappingChange,
    onReset,
    isOpen,
    onToggle
}) {
    const [activeTab, setActiveTab] = useState('display'); // display, colors, advanced
    const [activeColorPicker, setActiveColorPicker] = useState(null);
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const colorPickerRef = useRef(null);
    const triggerRef = useRef(null);
    const [pickerPosition, setPickerPosition] = useState({ top: 0, left: 0 });

    // Close picker when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (colorPickerRef.current && !colorPickerRef.current.contains(event.target) &&
                triggerRef.current && !triggerRef.current.contains(event.target)) {
                setActiveColorPicker(null);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Update position on scroll
    useEffect(() => {
        if (!activeColorPicker || !triggerRef.current) return;
        const handleScroll = () => {
            if (triggerRef.current) {
                const rect = triggerRef.current.getBoundingClientRect();
                setPickerPosition({ top: rect.bottom + 8, left: rect.left });
            }
        };
        window.addEventListener('scroll', handleScroll, true);
        window.addEventListener('resize', handleScroll);
        return () => {
            window.removeEventListener('scroll', handleScroll, true);
            window.removeEventListener('resize', handleScroll);
        };
    }, [activeColorPicker]);

    const handleColorSelect = (type, color) => {
        onColorChange(type, color);
        setActiveColorPicker(null);
    };

    const toggleColorPicker = (type, event) => {
        if (activeColorPicker === type) {
            setActiveColorPicker(null);
            triggerRef.current = null;
        } else {
            triggerRef.current = event.currentTarget;
            const rect = event.currentTarget.getBoundingClientRect();
            setPickerPosition({ top: rect.bottom + 8, left: rect.left });
            setActiveColorPicker(type);
        }
    };

    const tabs = [
        { id: 'display', label: 'Affichage', icon: FiMonitor },
        { id: 'colors', label: 'Couleurs', icon: FiDroplet },
        { id: 'advanced', label: 'Avancé', icon: FiSliders },
    ];

    return (
        <CollapsibleCard
            title="Personnalisation"
            icon={FiSettings}
            isOpen={isOpen}
            onToggle={onToggle}
        >
            {/* Tabs Navigation */}
            <div className="flex p-1 mb-6 bg-slate-100 dark:bg-slate-800/50 rounded-xl">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === tab.id
                                ? 'bg-white dark:bg-slate-700 text-[#005b8d] dark:text-white shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                            }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content: Display */}
            {activeTab === 'display' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                        <div className="flex flex-col">
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Vacances scolaires</span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">Afficher les périodes de vacances</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={showHolidays} onChange={(e) => onHolidayToggle(e.target.checked)} className="sr-only peer" />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[#005b8d]"></div>
                        </label>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Format du titre</label>
                        <div className="flex gap-2">
                            <div className="relative flex-1 group">
                                <input
                                    type="text"
                                    value={titleFormat}
                                    onChange={onTitleFormatChange}
                                    onBlur={onTitleFormatSave}
                                    className="w-full px-4 py-3 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-[#005b8d] transition-all shadow-sm group-hover:shadow-md"
                                    placeholder="{type} - {name}"
                                />
                            </div>
                            <button
                                onClick={onTitleFormatSave}
                                className={`p-3 rounded-xl transition-all duration-300 flex items-center justify-center min-w-[3rem] ${saveSuccess
                                    ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                                    : 'bg-[#005b8d] text-white shadow-md hover:bg-[#004a75] hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm'
                                    }`}
                            >
                                <FiCheck className={`w-5 h-5 transition-transform duration-300 ${saveSuccess ? 'scale-110' : ''}`} />
                            </button>
                        </div>
                        <div className="flex gap-2 mt-3 overflow-x-auto pb-2 custom-scrollbar">
                            {['{type}', '{name}', '{teacher}'].map(tag => (
                                <button
                                    key={tag}
                                    onClick={() => onTitleFormatChange({ target: { value: titleFormat + (titleFormat ? ' ' : '') + tag } })}
                                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-[#005b8d]/10 dark:hover:bg-[#005b8d]/20 hover:text-[#005b8d] dark:hover:text-[#005b8d] text-slate-500 dark:text-slate-400 text-xs rounded-lg font-mono border border-slate-200 dark:border-slate-700 whitespace-nowrap transition-colors cursor-pointer"
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Tab Content: Colors */}
            {activeTab === 'colors' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <div className="grid grid-cols-1 gap-3">
                        {['CM', 'TD', 'TP', 'TD_Machine', 'Other'].map((type) => (
                            <div key={type} className="relative group">
                                <button
                                    onClick={(e) => toggleColorPicker(type, e)}
                                    className="w-full flex items-center justify-between p-3 bg-white/50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-[#005b8d]/30 hover:shadow-md transition-all"
                                >
                                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                                        {type === 'Other' ? 'Autres' :
                                            type === 'CM' ? 'Cours Magistraux (CM)' :
                                                type === 'TD' ? 'Travaux Dirigés (TD)' :
                                                    type === 'TP' ? 'Travaux Pratiques (TP)' :
                                                        'TD Machine'}
                                    </span>
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-600 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700"
                                            style={{ backgroundColor: colorSettings[type] }}
                                        />
                                        <FiChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${activeColorPicker === type ? 'rotate-180' : ''}`} />
                                    </div>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Tab Content: Advanced */}
            {activeTab === 'advanced' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Personnalisation des types</label>
                        <div className="space-y-3">
                            {['CM', 'TD', 'TP', 'TD Machine', 'TP Machine'].map((type) => (
                                <div key={type} className="flex items-center gap-3">
                                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 w-20">{type}</span>
                                    <input
                                        type="text"
                                        value={typeMappings?.[type] ?? ''}
                                        onChange={(e) => onTypeMappingChange(type, e.target.value)}
                                        placeholder={type}
                                        className="flex-1 px-3 py-2 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-[#005b8d] transition-all shadow-sm focus:bg-white dark:focus:bg-slate-800"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                        <button
                            onClick={() => setShowResetConfirm(true)}
                            className="w-full py-2.5 px-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors border border-red-200 dark:border-red-900/50 flex items-center justify-center gap-2"
                        >
                            <FiAlertTriangle className="w-4 h-4" />
                            Réinitialiser tout
                        </button>
                    </div>
                </div>
            )}

            {/* Fixed Color Picker Portal */}
            {activeColorPicker && (
                <Portal>
                    <div
                        ref={colorPickerRef}
                        className="fixed z-[9999] bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 w-72 animate-in fade-in zoom-in-95 duration-200"
                        style={{
                            top: pickerPosition.top,
                            left: pickerPosition.left,
                            maxHeight: '300px',
                            overflowY: 'auto'
                        }}
                    >
                        <div className="grid grid-cols-8 gap-2 mb-4">
                            {COLOR_PALETTE.map((color) => (
                                <button
                                    key={color}
                                    onClick={() => handleColorSelect(activeColorPicker, color)}
                                    className="w-7 h-7 rounded-full hover:scale-110 hover:shadow-lg transition-all ring-1 ring-black/5 dark:ring-white/10 relative group/color"
                                    style={{ backgroundColor: color }}
                                >
                                    {colorSettings[activeColorPicker] === color && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="w-2 h-2 bg-white rounded-full shadow-sm"></div>
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                            <span className="text-xs font-medium text-slate-500">Personnalisé</span>
                            <div className="flex-1 h-8 rounded-lg overflow-hidden relative border border-slate-200 dark:border-slate-600">
                                <input
                                    type="color"
                                    value={colorSettings[activeColorPicker]}
                                    onChange={(e) => onColorChange(activeColorPicker, e.target.value)}
                                    className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] cursor-pointer p-0 border-0"
                                />
                            </div>
                        </div>
                    </div>
                </Portal>
            )}

            <ConfirmationModal
                isOpen={showResetConfirm}
                onClose={() => setShowResetConfirm(false)}
                onConfirm={() => {
                    onReset();
                    setShowResetConfirm(false);
                }}
                title="Tout réinitialiser ?"
                description="Cette action est irréversible. Elle effacera tous vos groupes, couleurs, personnalisations et cours masqués."
                confirmText="Confirmer"
                variant="danger"
            />
        </CollapsibleCard>
    );
}
