import { useState, useEffect } from 'react';

export function useCalendarLogic() {
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedGroups, setSelectedGroups] = useState([]);
    const [generatedLink, setGeneratedLink] = useState('');
    const [isCopied, setIsCopied] = useState(false);
    const [showHolidays, setShowHolidays] = useState(false);
    const [origin, setOrigin] = useState('');

    useEffect(() => {
        setOrigin(window.location.origin);
        const savedGroups = localStorage.getItem('my_celcat_groups');
        if (savedGroups) { try { setSelectedGroups(JSON.parse(savedGroups)); } catch (e) { } }
        const savedHolidays = localStorage.getItem('my_celcat_holidays');
        if (savedHolidays) setShowHolidays(savedHolidays === 'true');
    }, []);

    useEffect(() => { if (origin) localStorage.setItem('my_celcat_groups', JSON.stringify(selectedGroups)); }, [selectedGroups, origin]);
    useEffect(() => { if (origin) localStorage.setItem('my_celcat_holidays', showHolidays); }, [showHolidays, origin]);

    useEffect(() => {
        const fetchGroups = async () => {
            if (query.length < 3) { setSuggestions([]); setError(null); return; }
            setLoading(true); setError(null);
            try {
                const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
                if (!response.ok) throw new Error("Erreur");
                const data = await response.json();
                setSuggestions(data.results || []);
            } catch (error) { setSuggestions([]); } finally { setLoading(false); }
        };
        const timeoutId = setTimeout(fetchGroups, 300);
        return () => clearTimeout(timeoutId);
    }, [query]);

    const addGroup = (t) => { if (!selectedGroups.includes(t)) setSelectedGroups([...selectedGroups, t]); setQuery(''); setSuggestions([]); setGeneratedLink(''); };
    const removeGroup = (g) => { setSelectedGroups(selectedGroups.filter(x => x !== g)); setGeneratedLink(''); };
    const clearAll = () => { setSelectedGroups([]); setGeneratedLink(''); };
    const generateLink = () => {
        if (selectedGroups.length === 0) return;
        const groupsString = selectedGroups.join(',');
        setGeneratedLink(`${origin}/api/calendar.ics?group=${encodeURIComponent(groupsString)}&holidays=${showHolidays}`);
        setIsCopied(false);
    };
    const copyToClipboard = () => { navigator.clipboard.writeText(generatedLink); setIsCopied(true); setTimeout(() => setIsCopied(false), 2000); };

    return { query, setQuery, suggestions, loading, error, selectedGroups, addGroup, removeGroup, clearAll, generateLink, setGeneratedLink, generatedLink, isCopied, copyToClipboard, showHolidays, setShowHolidays, setSuggestions };
}
