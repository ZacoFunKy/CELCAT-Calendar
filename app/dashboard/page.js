'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import frLocale from '@fullcalendar/core/locales/fr';
import EventDetailsModal from '../../components/EventDetailsModal';
import { useAppTheme } from '../../hooks/useAppTheme';

// Components
import Navbar from '../../components/Navbar';
import SidebarNav from '../../components/SidebarNav';
import GroupSelector from '../../components/dashboard/GroupSelector';
import CustomizationPanel from '../../components/dashboard/CustomizationPanel';
import HiddenEventsPanel from '../../components/dashboard/HiddenEventsPanel';
import ICSLink from '../../components/dashboard/ICSLink';

export default function DashboardPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const { theme, toggleTheme, mounted } = useAppTheme();

    // Data States
    const [preferences, setPreferences] = useState(null);
    const [events, setEvents] = useState([]);
    const [calendarToken, setCalendarToken] = useState(null);

    // Settings State
    const [colorSettings, setColorSettings] = useState({
        CM: '#e11d48', TD: '#005b8d', TP: '#059669', TD_Machine: '#d97706', Other: '#64748b'
    });
    const [showHolidays, setShowHolidays] = useState(true);
    const [titleFormat, setTitleFormat] = useState('{type} - {name}');
    const [customNames, setCustomNames] = useState({});
    const [typeMappings, setTypeMappings] = useState({});

    // UI States
    const [loading, setLoading] = useState(true);
    const [copySuccess, setCopySuccess] = useState('');
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [activeCard, setActiveCard] = useState('groups'); // Default open card
    const [statusMessage, setStatusMessage] = useState('');

    // Modal State
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const calendarRef = useRef(null);

    const formatGroupValue = (group) => {
        if (!group) return '';
        if (typeof group === 'object') {
            const id = group.id || group.text || '';
            const label = group.text || group.id || '';
            return id && label ? `${id}::${label}` : label || id;
        }
        return group;
    };

    const getGroupLabelFromValue = (value) => {
        if (!value) return '';
        if (typeof value !== 'string') return String(value);
        if (value.includes('::')) {
            const [, ...rest] = value.split('::');
            const label = rest.join('::');
            return label || value.split('::')[0];
        }
        return value;
    };

    // Fetch preferences on load
    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        } else if (status === 'authenticated') {
            fetchPreferences();
        }
    }, [status, router]);

    // Fetch events when token changes or settings change
    useEffect(() => {
        if (calendarToken) {
            fetchEvents();
        }
    }, [calendarToken, colorSettings, showHolidays, titleFormat, customNames, typeMappings]);

    const fetchPreferences = async () => {
        try {
            const res = await fetch('/api/user/preferences');
            if (res.ok) {
                const data = await res.json();
                setPreferences(data.preferences);
                setCalendarToken(data.calendarToken);
                if (data.preferences.colorMap) setColorSettings(prev => ({ ...prev, ...data.preferences.colorMap }));
                if (data.preferences.settings) {
                    if (data.preferences.settings.showHolidays !== undefined) setShowHolidays(data.preferences.settings.showHolidays);
                    if (data.preferences.settings.titleFormat) setTitleFormat(data.preferences.settings.titleFormat);
                    if (data.preferences.settings.customNames) setCustomNames(data.preferences.settings.customNames);
                    if (data.preferences.settings.typeMappings) setTypeMappings(data.preferences.settings.typeMappings);
                }
            }
        } catch (error) {
            console.error('Error fetching preferences:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchEvents = async () => {
        if (!calendarToken) return;
        try {
            setStatusMessage('');
            const res = await fetch(`/api/calendar.ics?token=${calendarToken}&format=json&holidays=${showHolidays}`);
            if (res.ok) {
                const data = await res.json();
                
                const formattedEvents = (data.events || []).map((event) => {
                    let title = event.summary || event.title || 'Cours';

                    // Parse type, name, teacher from original title
                    let type = 'Cours', name = title, teacher = '';
                    if (title.includes(' - ')) {
                        const parts = title.split(' - ');
                        const standardTypes = ['CM', 'TD', 'TP', 'TD Machine', 'TP Machine'];
                        
                        if (standardTypes.some(t => parts[0].includes(t))) {
                            type = parts[0];
                            name = parts[1] || '';
                            teacher = parts[2] || '';
                        }
                    }

                    // 1. Apply type mappings to the extracted type
                    if (typeMappings && typeMappings[type]) {
                        type = typeMappings[type];
                    }

                    // 2. Apply custom names (overrides everything)
                    if (customNames[event.id]) {
                        title = customNames[event.id];
                    } else {
                        // 3. Apply title format with mapped type
                        let formattedTitle = titleFormat
                            .replace('{type}', type)
                            .replace('{name}', name)
                            .replace('{teacher}', teacher)
                            .replace(/ - \s*$/, '')
                            .trim();
                        if (formattedTitle) title = formattedTitle;
                    }

                    let backgroundColor = colorSettings.Other;
                    let borderColor = colorSettings.Other;
                    // Use eventType from backend if available, otherwise fallback to parsing
                    const typeToCheck = (event.eventType || event.summary || '').toUpperCase();

                    if (typeToCheck.includes('CM')) { backgroundColor = colorSettings.CM; borderColor = colorSettings.CM; }
                    else if (typeToCheck.includes('TD MACHINE') || typeToCheck.includes('TP MACHINE')) { backgroundColor = colorSettings.TD_Machine || colorSettings.TD; borderColor = colorSettings.TD_Machine || colorSettings.TD; }
                    else if (typeToCheck.includes('TD')) { backgroundColor = colorSettings.TD; borderColor = colorSettings.TD; }
                    else if (typeToCheck.includes('TP')) { backgroundColor = colorSettings.TP; borderColor = colorSettings.TP; }

                    // Create new object with all required properties for FullCalendar
                    const formatted = {
                        id: event.id,
                        title: title,  // REQUIRED by FullCalendar
                        start: event.start,
                        end: event.end,
                        backgroundColor: backgroundColor,
                        borderColor: borderColor,
                        // Pass through other properties
                        summary: event.summary,
                        description: event.description,
                        location: event.location,
                        eventType: event.eventType,
                        isHoliday: event.isHoliday,
                        allDay: event.allDay
                    };
                    
                    return formatted;
                });
                
                setEvents(formattedEvents);
                if ((data.events || []).length === 0) {
                    setStatusMessage('Aucun cours trouvé pour les groupes sélectionnés.');
                }
            } else {
                const error = await res.json().catch(() => ({}));
                setStatusMessage(error.error || 'Service indisponible (CELCAT indisponible ou requête invalide).');
                setEvents([]);
            }
        } catch (error) {
            console.error('Error fetching events:', error);
            setStatusMessage('Service indisponible (CELCAT indisponible ou requête invalide).');
            setEvents([]);
        }
    };

    const updatePreferences = async (newPrefs) => {
        try {
            const res = await fetch('/api/user/preferences', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newPrefs),
            });
            if (res.ok) {
                const data = await res.json();
                setPreferences(data.preferences);
            }
        } catch (error) {
            console.error('Error updating preferences:', error);
        }
    };

    const handleAddGroup = (groupToAdd) => {
        if (!groupToAdd) return;
        const groupName = formatGroupValue(groupToAdd);
        const currentGroups = preferences?.groups || [];
        const newLabel = getGroupLabelFromValue(groupName);
        const hasLabelAlready = currentGroups.some(g => getGroupLabelFromValue(g) === newLabel);
        if (currentGroups.includes(groupName) || hasLabelAlready) return;
        const updatedGroups = [...currentGroups, groupName];
        updatePreferences({ groups: updatedGroups });
        setTimeout(fetchEvents, 500);
    };

    const handleRemoveGroup = (groupToRemove) => {
        const updatedGroups = preferences.groups.filter(g => g !== groupToRemove);
        updatePreferences({ groups: updatedGroups });
        setTimeout(fetchEvents, 500);
    };

    const handleColorChange = (type, color) => {
        const newColors = { ...colorSettings, [type]: color };
        setColorSettings(newColors);
        updatePreferences({ colorMap: newColors });
        // Reload events to apply new colors immediately
        setTimeout(fetchEvents, 100);
    };

    const handleTypeMappingChange = (type, value) => {
        let newMappings;
        if (!value || value.trim() === '') {
            // Remove the mapping if empty - create new object without the key
            const { [type]: removed, ...rest } = typeMappings;
            newMappings = rest;
        } else {
            // Add or update the mapping
            newMappings = { ...typeMappings, [type]: value.trim() };
        }
        
        // Update state and preferences
        setTypeMappings(newMappings);
        updatePreferences({ settings: { ...preferences?.settings, typeMappings: newMappings } });
        
        // Force immediate reload to show changes
        setTimeout(() => {
            fetchEvents();
        }, 50);
    };

    const handleTitleFormatSave = () => {
        updatePreferences({ settings: { ...preferences?.settings, showHolidays, titleFormat, customNames, typeMappings } });
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
        fetchEvents();
    };

    const handleEventClick = (clickInfo) => {
        setSelectedEvent({
            id: clickInfo.event.id,
            title: clickInfo.event.title,
            start: clickInfo.event.start,
            end: clickInfo.event.end,
            backgroundColor: clickInfo.event.backgroundColor,
            borderColor: clickInfo.event.borderColor,
            extendedProps: clickInfo.event.extendedProps,
            allDay: clickInfo.event.allDay
        });
        setIsModalOpen(true);
    };

    const handleRenameEvent = (eventId, newName, scope) => {
        setEvents(prevEvents => prevEvents.map(evt => {
            if (scope === 'single' && evt.id === eventId) return { ...evt, title: newName };
            if (scope === 'all' && evt.title === selectedEvent.title) return { ...evt, title: newName };
            return evt;
        }));
        if (selectedEvent) setSelectedEvent(prev => ({ ...prev, title: newName }));

        if (scope === 'single') {
            const updatedCustomNames = { ...customNames, [eventId]: newName };
            setCustomNames(updatedCustomNames);
            updatePreferences({ settings: { ...preferences?.settings, showHolidays, titleFormat, customNames: updatedCustomNames, typeMappings } });
        } else if (scope === 'all') {
            const currentRenamingRules = preferences?.settings?.renamingRules || {};
            const updatedRenamingRules = { ...currentRenamingRules, [selectedEvent.title]: newName };
            updatePreferences({ settings: { ...preferences?.settings, renamingRules: updatedRenamingRules } });
        }
    };

    const handleHideEvent = (eventId, scope, value) => {
        setEvents(prevEvents => prevEvents.filter(evt => {
            if (scope === 'single') return evt.id !== eventId;
            if (scope === 'name') return evt.title !== value;
            if (scope === 'professor') return !evt.title.includes(value);
            return true;
        }));

        if (scope === 'single') {
            const updatedHidden = [...(preferences?.hiddenEvents || []), eventId];
            updatePreferences({ hiddenEvents: updatedHidden });
        } else {
            const newRule = { ruleType: scope, value: value };
            const currentRules = preferences?.settings?.hiddenRules || [];
            const updatedRules = [...currentRules, newRule];
            updatePreferences({ settings: { ...preferences?.settings, hiddenRules: updatedRules } });
        }
    };

    const handleUnhideRule = (ruleToRemove) => {
        const currentRules = preferences?.settings?.hiddenRules || [];
        const updatedRules = currentRules.filter(r => !(r.ruleType === ruleToRemove.ruleType && r.value === ruleToRemove.value));
        updatePreferences({ settings: { ...preferences?.settings, hiddenRules: updatedRules } });
        setTimeout(fetchEvents, 500);
    };

    const handleUnhideEvent = (idToRemove) => {
        const currentHidden = preferences?.hiddenEvents || [];
        const updatedHidden = currentHidden.filter(id => id !== idToRemove);
        updatePreferences({ hiddenEvents: updatedHidden });
        setTimeout(fetchEvents, 500);
    };

    const handleUnhideAll = () => {
        updatePreferences({ hiddenEvents: [], settings: { ...preferences?.settings, hiddenRules: [] } });
        setTimeout(fetchEvents, 500);
    };

    const handleResetAll = async () => {
        try {
            const res = await fetch('/api/user/preferences', {
                method: 'DELETE',
            });
            if (res.ok) {
                const data = await res.json();
                // Reset local state to defaults
                setPreferences(data.preferences);
                setColorSettings({
                    CM: '#e11d48', TD: '#005b8d', TP: '#059669', TD_Machine: '#d97706', Other: '#64748b'
                });
                setShowHolidays(true);
                setTitleFormat('{type} - {name}');
                setCustomNames({});
                setTypeMappings({});
                // Reload events with clean state
                setTimeout(fetchEvents, 500);
            }
        } catch (error) {
            console.error('Error resetting preferences:', error);
        }
    };

    const copyLink = () => {
        if (!calendarToken) return;
        const link = `${window.location.origin}/api/calendar.ics?token=${calendarToken}`;
        navigator.clipboard.writeText(link);
        setCopySuccess('Lien copié !');
        setTimeout(() => setCopySuccess(''), 2000);
    };

    if (loading || status === 'loading' || !mounted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0B1120]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#005b8d]"></div>
            </div>
        );
    }

    return (
        <div className="h-screen bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-white relative overflow-hidden transition-colors duration-300 flex flex-col">
            {/* BACKGROUND BLOBS */}
            <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-60"></div>
                <div className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] bg-[#005b8d]/20 dark:bg-[#005b8d]/20 rounded-full blur-[100px] animate-blob mix-blend-multiply dark:mix-blend-screen"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] bg-cyan-200/40 dark:bg-cyan-900/20 rounded-full blur-[100px] animate-blob animation-delay-2000 mix-blend-multiply dark:mix-blend-screen"></div>
            </div>

            <div className="flex-1 max-w-[1920px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-4 overflow-hidden">
                <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 h-full">

                    {/* Left Sidebar - Settings */}
                    <div className="xl:col-span-1 h-full overflow-hidden flex flex-col">
                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4 pb-4">
                            <SidebarNav theme={theme} toggleTheme={toggleTheme} />


                            <GroupSelector
                                preferences={preferences}
                                onAddGroup={handleAddGroup}
                                onRemoveGroup={handleRemoveGroup}
                                isOpen={activeCard === 'groups'}
                                onToggle={(open) => setActiveCard(open ? 'groups' : null)}
                            />

                            <CustomizationPanel
                                showHolidays={showHolidays}
                                onHolidayToggle={(checked) => {
                                    setShowHolidays(checked);
                                    updatePreferences({ settings: { ...preferences?.settings, showHolidays: checked, titleFormat, customNames, typeMappings } });
                                    setTimeout(fetchEvents, 100);
                                }}
                                titleFormat={titleFormat}
                                onTitleFormatChange={(e) => setTitleFormat(e.target.value)}
                                onTitleFormatSave={handleTitleFormatSave}
                                saveSuccess={saveSuccess}
                                colorSettings={colorSettings}
                                onColorChange={handleColorChange}
                                typeMappings={typeMappings}
                                onTypeMappingChange={handleTypeMappingChange}
                                onReset={handleResetAll}
                                isOpen={activeCard === 'customization'}
                                onToggle={(open) => setActiveCard(open ? 'customization' : null)}
                            />

                            <HiddenEventsPanel
                                hiddenEvents={preferences?.hiddenEvents}
                                hiddenRules={preferences?.settings?.hiddenRules}
                                onUnhideRule={handleUnhideRule}
                                onUnhideEvent={handleUnhideEvent}
                                onUnhideAll={handleUnhideAll}
                                isOpen={activeCard === 'hidden'}
                                onToggle={(open) => setActiveCard(open ? 'hidden' : null)}
                            />

                            <ICSLink
                                calendarToken={calendarToken}
                                onCopy={copyLink}
                                copySuccess={copySuccess}
                            />
                        </div>
                    </div>

                    {/* Main Content - Calendar */}
                    <div className="xl:col-span-3 h-full overflow-hidden">
                        <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl rounded-[2rem] shadow-2xl border border-white/50 dark:border-white/10 p-4 h-full flex flex-col transition-all duration-300 hover:shadow-[#005b8d]/10">
                            {statusMessage && (
                                <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-100 px-3 py-2 text-sm">
                                    {statusMessage}
                                </div>
                            )}
                            <div className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                                Événements chargés: {events.length} | Première date: {events[0]?.start}
                            </div>
                            <FullCalendar
                                ref={calendarRef}
                                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                                initialView="timeGridWeek"
                                headerToolbar={{
                                    left: 'prev,next today',
                                    center: 'title',
                                    right: 'dayGridMonth,timeGridWeek,timeGridDay'
                                }}
                                locale={frLocale}
                                events={events}
                                eventClick={handleEventClick}
                                height="100%"
                                slotMinTime="07:50:00"
                                slotMaxTime="20:00:00"
                                allDaySlot={false}
                                weekends={false}
                                nowIndicator={true}
                                eventTextColor="#ffffff"
                                slotLabelFormat={{
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: false
                                }}
                                dayHeaderFormat={{ weekday: 'long', day: 'numeric', month: 'numeric' }}
                                slotDuration="00:30:00"
                                slotLabelInterval="01:00"
                                expandRows={true}
                                stickyHeaderDates={true}
                                dayMaxEvents={true}
                            />
                        </div>
                    </div>

                </div>
            </div>

            <div className="flex-none z-50 order-last">
                <Navbar theme={theme} toggleTheme={toggleTheme} placement="bottom" />
            </div>

            <EventDetailsModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                event={selectedEvent}
                onHide={handleHideEvent}
                onRename={handleRenameEvent}
            />

            <style jsx global>{`
            .custom-scrollbar::-webkit-scrollbar { width: 6px; }
            .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 20px; }
            .dark .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #475569; }
            
            /* Calendar Customization */
            .fc { font-family: inherit; }
            .fc-toolbar-title { font-size: 1.75rem !important; font-weight: 800 !important; color: #0f172a; letter-spacing: -0.025em; }
            .dark .fc-toolbar-title { color: #f8fafc; }
            
            /* Buttons */
            .fc-button-primary { 
                background-color: #005b8d !important; 
                border-color: transparent !important; 
                border-radius: 1rem !important; 
                text-transform: capitalize; 
                font-weight: 600; 
                padding: 0.6rem 1.2rem !important; 
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); 
                box-shadow: 0 4px 6px -1px rgba(0, 91, 141, 0.2), 0 2px 4px -1px rgba(0, 91, 141, 0.1);
            }
            .fc-button-primary:hover { 
                background-color: #004a75 !important; 
                transform: translateY(-2px); 
                box-shadow: 0 10px 15px -3px rgba(0, 91, 141, 0.3), 0 4px 6px -2px rgba(0, 91, 141, 0.1); 
            }
            .fc-button-active { 
                background-color: #003858 !important; 
                transform: translateY(0);
                box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.05);
            }
            
            /* Button Group Spacing */
            .fc-button-group > .fc-button { margin-left: 0.5rem !important; border-radius: 0.75rem !important; }
            .fc-button-group > .fc-button:first-child { margin-left: 0 !important; }

            /* Header Cells */
            .fc-col-header-cell { background-color: transparent !important; border: none !important; padding: 1.5rem 0 1rem !important; }
            .fc-col-header-cell-cushion { color: #64748b; font-weight: 700; text-decoration: none !important; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.1em; }
            .dark .fc-col-header-cell-cushion { color: #94a3b8; }
            
            /* Time Slots */
            .fc-timegrid-slot-label-cushion { font-size: 0.75rem; color: #94a3b8; font-weight: 600; font-variant-numeric: tabular-nums; }
            
            /* Grid Lines */
            .fc-theme-standard td, .fc-theme-standard th { border-color: rgba(203, 213, 225, 0.3); }
            .dark .fc-theme-standard td, .dark .fc-theme-standard th { border-color: rgba(51, 65, 85, 0.3); }

            /* Dark Mode Calendar Background Fix */
            .dark .fc-theme-standard td, .dark .fc-theme-standard th { background-color: transparent !important; }
            .dark .fc-scrollgrid { border-color: rgba(51, 65, 85, 0.3); }
            .dark .fc-list-day-cushion, .dark .fc-list-event:hover td { background-color: rgba(30, 41, 59, 0.5); }
            .dark .fc-col-header-cell { background-color: transparent !important; }
            
            /* Events */
            .fc-event { 
                border-radius: 12px; 
                border: none; 
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); 
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); 
                cursor: pointer; 
                overflow: hidden;
            }

            .fc-event-main { 
                padding: 6px 10px; 
                font-weight: 600; 
                font-size: 0.85rem; 
                letter-spacing: -0.01em;
                background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%);
            }
            
            /* Current Time Indicator */
            .fc-timegrid-now-indicator-line { border-color: #ef4444; border-width: 2px; }
            .fc-timegrid-now-indicator-arrow { border-color: #ef4444; border-width: 6px; }
        `}</style>
        </div>
    );
}
