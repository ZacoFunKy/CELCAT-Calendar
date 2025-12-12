// Utilities for Calendar ICS generation

import { CALENDAR_CONFIG } from '../../../lib/config.js';

// ==========================================
// DATE HELPERS
// ==========================================

export function formatDate(date) {
    return date.toISOString().split('T')[0];
}

export function getFullAcademicYear() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const startYear = currentMonth < 6 ? currentYear - 1 : currentYear;
    return {
        start: `${startYear}-08-01`,
        end: `${startYear + 1}-08-31`
    };
}

export function cleanDescriptionText(text) {
    if (!text) return "";
    let txt = text
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
        .replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ');

    return txt.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0).join('\n');
}

export function processEvent(event, { showHolidays }) {
    if (!event || typeof event !== 'object' || !event.start) {
        return null;
    }

    const cleanDescription = cleanDescriptionText(event.description || "");
    if (CALENDAR_CONFIG.blacklist.some(keyword => cleanDescription.includes(keyword))) {
        return null;
    }

    const fullTextScan = ((event.eventCategory || "") + " " + cleanDescription).toUpperCase();
    const sitesText = (event.sites ? event.sites.join(', ') : '').toUpperCase();

    // Extract course name and professor from description
    const descriptionLines = cleanDescription.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    let summary = "";
    let professorName = "";

    // Look for full course name in description
    for (const line of descriptionLines) {
        // Check if line starts with module code (e.g., "4TYG601U - Utilisation des réseaux")
        // Extract course name from same line as the code
        const moduleCodeMatch = line.match(/^\d[A-Z0-9]+\s*-?\s*(.+)$/i);
        if (moduleCodeMatch) {
            const courseName = moduleCodeMatch[1].trim();
            // Make sure it's not just another code or group identifier
            if (courseName && courseName.length > 3 && !/^\d[A-Z0-9]+\s*-/i.test(courseName) && !/^G\d+$/i.test(courseName)) {
                summary = courseName;
                break;
            }
            continue;
        }
        
        if (/^(Cours|TD|TP|CM|Examen|Examens|Contrôle Continu)$/i.test(line)) continue;
        if (line.toLowerCase().includes('salle') ||
            line.toLowerCase().includes('amphi') ||
            line.toLowerCase().includes('bât') ||
            (line.includes('/') && !line.includes('-'))) {
            continue;
        }

        const wordCount = line.split(' ').length;
        const hasLowercase = /[a-zàâäçèéêëîïôöùûü]/.test(line);
        const words = line.split(/\s+/);
        const firstWord = words[0] || "";
        const secondWord = words[1] || "";
        const isProfessorPattern = words.length === 2 &&
            /^[A-ZÀÂÄÇÈÉÊËÎÏÔÖÙÛÜ][A-ZÀÂÄÇÈÉÊËÎÏÔÖÙÛÜ-]+$/.test(firstWord) &&
            /^[A-ZÀÂÄÇÈÉÊËÎÏÔÖÙÛÜ][a-zàâäçèéêëîïôöùûü]+$/.test(secondWord);

        if (isProfessorPattern) continue;

        if (line.length >= 18 || wordCount >= 3) {
            const uppercaseWords = words.filter(word => word.length > 1 && word === word.toUpperCase());
            const mostlyUppercase = uppercaseWords.length > words.length / 2;

            if (hasLowercase && !mostlyUppercase) {
                summary = line;
                break;
            }
        } else if (wordCount <= 2 && hasLowercase) {
            const hasLowercaseInWords = words.some(word => /[a-zàâäçèéêëîïôöùûü]/.test(word.substring(1)));
            if (hasLowercaseInWords || wordCount === 1) {
                summary = line;
                break;
            }
        }
    }

    if (!summary) {
        if (event.modules && event.modules.length > 0) {
            const moduleName = event.modules[0];
            summary = moduleName.replace(/^\d[A-Z0-9]+\s+/i, '').trim();
            if (!summary) summary = moduleName;
        }
        else if (event.eventCategory) summary = event.eventCategory;
        else summary = descriptionLines[0] || "Cours";
    }

    // Fallback: if summary is too short or looks like a code, try modules
    if (summary.length < 3 || /^\d[A-Z0-9]+$/.test(summary)) {
        if (event.modules && event.modules.length > 0) {
            const moduleName = event.modules[0];
            const cleanName = moduleName.replace(/^\d[A-Z0-9]+\s*-?\s*/i, '').trim();
            if (cleanName && cleanName.length > summary.length) {
                summary = cleanName;
            }
        }
    }

    // Look for professor name
    for (const line of descriptionLines) {
        if (line === summary) continue;
        if (/^(TD|TP|CM|Cours|Examen|Examens|Contrôle Continu|TD Machine|TP Machine)$/i.test(line)) continue;

        if (line.length > 3 && line.length < 60 &&
            !line.toLowerCase().includes('salle') &&
            !line.toLowerCase().includes('amphi') &&
            !line.toLowerCase().includes('bât') &&
            !line.toLowerCase().includes('cremi') &&
            !line.match(/^\d/) &&
            !line.includes('/')) {

            const words = line.split(/\s+/);
            if (words.length >= 2 && words.length <= 4) {
                const isName = words.every(word =>
                    /^[A-ZÀÂÄÇÈÉÊËÎÏÔÖÙÛÜ][a-zàâäçèéêëîïôöùûü-]*$/i.test(word) ||
                    /^[A-ZÀÂÄÇÈÉÊËÎÏÔÖÙÛÜ]$/i.test(word)
                );

                if (isName) {
                    professorName = line;
                    break;
                }
            }
        }
    }

    summary = cleanDescriptionText(summary);

    // After cleaning, check if summary is too short and use modules as fallback
    const summaryTooShort = summary.length < 3 || /^\d+$/.test(summary) || /^[A-Z0-9-]+$/.test(summary);
    if (summaryTooShort && event.modules && event.modules.length > 0) {
        const moduleName = event.modules[0];
        const cleanName = moduleName.replace(/^\d[A-Z0-9]+\s*-?\s*/i, '').trim();
        if (cleanName && cleanName.length >= 3) {
            summary = cleanName;
        }
    }

    const isHoliday = (event.eventCategory && event.eventCategory.includes('Vacances')) ||
        summary.toLowerCase().includes('vacances');

    let startDate = new Date(event.start);
    let endDate = event.end ? new Date(event.end) : new Date(event.start);

    if (isHoliday) {
        const now = new Date();
        const currentYear = now.getMonth() < 6 ? now.getFullYear() - 1 : now.getFullYear();
        const academicStart = new Date(currentYear, 7, 1);
        const academicEnd = new Date(currentYear + 1, 7, 31);

        if (startDate < academicStart || startDate > academicEnd) return null;
        if (!showHolidays) return null;

        // Standardize holiday title to avoid "Cours-Vacance" style names
        summary = CALENDAR_CONFIG.holidayCategory || 'Vacances';

        return {
            id: event.id,
            start: toLocalISOString(startDate),
            end: toLocalISOString(endDate),
            summary: summary,
            description: null,
            location: null,
            isHoliday: true,
            allDay: true
        };
    }

    if (summary.length < 3 && (!event.modules || event.modules.length === 0)) {
        return null;
    }

    for (const [key, replacement] of Object.entries(CALENDAR_CONFIG.replacements)) {
        if (summary.includes(key)) summary = replacement;
    }

    let prefix = "";
    let isMachine = fullTextScan.includes("MACHINE") || fullTextScan.includes("PC") || sitesText.includes("CREMI");

    if (/\bTD\b/.test(fullTextScan) || fullTextScan.includes("TD")) prefix = isMachine ? "TD Machine" : "TD";
    else if (/\bTP\b/.test(fullTextScan) || fullTextScan.includes("TP")) prefix = isMachine ? "TP Machine" : "TP";
    else if (fullTextScan.includes("CM") || fullTextScan.includes("COURS")) prefix = "CM";
    else if (fullTextScan.includes("EXAM") || fullTextScan.includes("EVALUATION")) prefix = "📝 EXAM";

    if (prefix) {
        const summaryUpper = summary.toUpperCase();
        // Only add prefix if summary is not empty and doesn't already start with the type
        if (summary.length >= 3 && !summaryUpper.startsWith(prefix.toUpperCase()) && !summaryUpper.startsWith("TD") && !summaryUpper.startsWith("TP")) {
            summary = `${prefix} - ${summary}`;
        } else if (isMachine && !summaryUpper.includes("MACHINE") && summary.length >= 3) {
            summary = `${prefix} - ${summary.replace(/^(TD|TP)\s*-?\s*/i, '')}`;
        } else if (summary.length < 3) {
            // If summary is too short, just use the prefix without adding empty content
            summary = prefix;
        }
    }

    if (professorName) {
        summary = `${summary} - ${professorName}`;
    }

    let finalLocation = cleanDescriptionText(event.sites ? event.sites.join(', ') : '');
    const roomRegex = /(?:salle\s+\w+|amphi(?:théâtre)?\s+\w+|bât\.|a\d{2}\/|cremi)/i;
    const specificRoomLine = descriptionLines.find(line => roomRegex.test(line));

    if (specificRoomLine) {
        const cleanRoom = specificRoomLine.trim();
        if (finalLocation) {
            // If room line repeats building code, strip it to avoid "Bâtiment A29 - A29/ Salle 105"
            let roomPart = cleanRoom;
            const buildingCodeMatch = cleanRoom.match(/^([A-Z]?\d{2,3})\s*\/\s*(.+)$/i);
            if (buildingCodeMatch && finalLocation.toLowerCase().includes(buildingCodeMatch[1].toLowerCase())) {
                roomPart = buildingCodeMatch[2];
            }

            finalLocation = (roomPart.includes(finalLocation) || roomPart.includes("CREMI"))
                ? roomPart
                : `${finalLocation} - ${roomPart}`;
        } else {
            finalLocation = cleanRoom;
        }
    }

    return {
        id: event.id,
        start: toLocalISOString(startDate),
        end: toLocalISOString(endDate),
        summary: summary,
        description: cleanDescription,
        location: finalLocation,
        eventType: prefix,
        isHoliday: false,
        allDay: false
    };
}

function toLocalISOString(date) {
    // Format date as ISO string SIMPLE format without timezone or milliseconds
    // FullCalendar v6 treats this as local time
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    // Return format: YYYY-MM-DDTHH:mm:ss (FullCalendar interprets as local)
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

export function applyCustomizations(event, { customNames, typeMappings, renamingRules, hiddenRules }) {
    if (!event) return null;

    // 1. Check hidden rules
    if (hiddenRules && Array.isArray(hiddenRules)) {
        const shouldHide = hiddenRules.some(rule => {
            if (rule.ruleType === 'name' && event.summary === rule.value) return true;
            if (rule.ruleType === 'professor' && event.summary.includes(rule.value)) return true;
            return false;
        });
        if (shouldHide) return null;
    }

    // 2. Apply custom names
    // Check specific ID rename
    let customName = customNames instanceof Map ? customNames.get(event.id) : (customNames ? customNames[event.id] : null);

    // If no specific rename, check global renaming rules
    if (!customName && renamingRules) {
        const rules = renamingRules instanceof Map ? renamingRules : new Map(Object.entries(renamingRules));
        if (rules.has(event.summary)) {
            customName = rules.get(event.summary);
        }
    }

    // 3. Apply type mappings
    if (typeMappings) {
        const mappings = typeMappings instanceof Map ? typeMappings : new Map(Object.entries(typeMappings));
        const prefixMatch = event.summary.match(/^([A-Z]+(?:\s+[A-Z]+)?)\s*-\s*(.+)/);

        if (prefixMatch) {
            const prefix = prefixMatch[1];
            const rest = prefixMatch[2];
            if (mappings.has(prefix)) {
                const newPrefix = mappings.get(prefix);
                event.summary = newPrefix ? `${newPrefix} - ${rest}` : rest;
            }
        } else {
            // Try to match exact eventType if summary doesn't have "TYPE - Name" format but we have a type
            if (event.eventType && mappings.has(event.eventType)) {
                const newPrefix = mappings.get(event.eventType);
                // If summary is just the name, prepend custom type
                if (!event.summary.startsWith(newPrefix)) {
                    event.summary = `${newPrefix} - ${event.summary}`;
                }
            }
        }
    }

    if (customName) {
        event.summary = customName;
    }

    return event;
}
