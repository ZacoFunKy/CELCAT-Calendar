import { useState, useRef, useEffect } from 'react';
import { FiSearch, FiPlus, FiX, FiUsers } from 'react-icons/fi';
import CollapsibleCard from '../CollapsibleCard';
import Portal from '../Portal';

export default function GroupSelector({
    preferences,
    onAddGroup,
    onRemoveGroup,
    isOpen,
    onToggle
}) {
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
    const searchInputRef = useRef(null);
    const dropdownRef = useRef(null);

    // Search Debounce
    useEffect(() => {
        const fetchGroups = async () => {
            if (query.length < 3) {
                setSuggestions([]);
                return;
            }
            setIsSearching(true);
            try {
                const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
                if (response.ok) {
                    const data = await response.json();
                    setSuggestions(data.results || []);
                }
            } catch (error) {
                console.error("Search error", error);
                setSuggestions([]);
            } finally {
                setIsSearching(false);
            }
        };

        const timeoutId = setTimeout(fetchGroups, 300);
        return () => clearTimeout(timeoutId);
    }, [query]);

    // Update dropdown position
    const updatePosition = () => {
        if (searchInputRef.current) {
            const rect = searchInputRef.current.getBoundingClientRect();
            setDropdownPosition({
                top: rect.bottom + 8,
                left: rect.left,
                width: rect.width
            });
        }
    };

    useEffect(() => {
        if (showSuggestions) {
            updatePosition();
            window.addEventListener('scroll', updatePosition, true);
            window.addEventListener('resize', updatePosition);
        }
        return () => {
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [showSuggestions]);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
                searchInputRef.current && !searchInputRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (selectedIndex >= 0 && suggestions[selectedIndex]) {
                handleAdd(suggestions[selectedIndex]);
            }
        } else if (e.key === 'Escape') {
            setShowSuggestions(false);
        }
    };

    const handleAdd = (group) => {
        onAddGroup(group);
        setQuery('');
        setSuggestions([]);
        setShowSuggestions(false);
    };

    const getGroupLabel = (value) => {
        if (!value) return '';
        if (typeof value !== 'string') return value.text || value.label || String(value);
        if (value.includes('::')) {
            const [, ...rest] = value.split('::');
            const label = rest.join('::');
            return label || value.split('::')[0];
        }
        return value;
    };

    return (
        <CollapsibleCard
            title="Mes Groupes"
            icon={FiUsers}
            isOpen={isOpen}
            onToggle={onToggle}
        >
            <div className="relative mb-6 z-50">
                <div className="relative group" ref={searchInputRef}>
                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-[#005b8d] transition-colors" />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setShowSuggestions(true);
                            setSelectedIndex(-1);
                        }}
                        onKeyDown={handleKeyDown}
                        onFocus={() => {
                            setShowSuggestions(true);
                            updatePosition();
                        }}
                        placeholder="Rechercher un groupe..."
                        className="w-full pl-10 pr-4 py-3 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#005b8d] outline-none transition-all shadow-sm hover:shadow-md focus:shadow-lg"
                    />
                    {isSearching && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <div className="animate-spin h-4 w-4 border-2 border-[#005b8d] border-t-transparent rounded-full"></div>
                        </div>
                    )}
                </div>

                {/* Suggestions Dropdown via Portal */}
                {showSuggestions && suggestions.length > 0 && (
                    <Portal>
                        <div
                            ref={dropdownRef}
                            style={{
                                top: dropdownPosition.top,
                                left: dropdownPosition.left,
                                width: dropdownPosition.width
                            }}
                            className="fixed z-[9999] bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-100 dark:border-slate-700 max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200"
                        >
                            {suggestions.map((group, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleAdd(group)}
                                    className={`w-full text-left px-4 py-3 text-sm transition-all flex items-center justify-between
                                    ${index === selectedIndex
                                            ? 'bg-[#005b8d]/10 text-[#005b8d] dark:text-cyan-400 pl-6'
                                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:pl-6'
                                        }`}
                                >
                                    <span>{group.text}</span>
                                    <FiPlus className={`w-4 h-4 transition-opacity ${index === selectedIndex ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
                                </button>
                            ))}
                        </div>
                    </Portal>
                )}
            </div>

            <div className="flex flex-wrap gap-2">
                {preferences?.groups?.map((group) => (
                    <span
                        key={group}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-slate-800 text-[#005b8d] dark:text-cyan-400 rounded-lg text-sm font-medium border border-[#005b8d]/10 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
                    >
                        {getGroupLabel(group)}
                        <button
                            onClick={() => onRemoveGroup(group)}
                            className="hover:text-red-500 ml-1 p-0.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full transition-colors"
                        >
                            <FiX className="w-3 h-3" />
                        </button>
                    </span>
                ))}
                {(!preferences?.groups || preferences.groups.length === 0) && (
                    <div className="w-full py-8 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/30">
                        <FiUsers className="w-8 h-8 mb-2 opacity-50" />
                        <p className="text-sm italic">Aucun groupe sélectionné</p>
                    </div>
                )}
            </div>
        </CollapsibleCard>
    );
}
