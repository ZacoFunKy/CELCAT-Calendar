// Utilities for Calendar ICS generation

// ==========================================
// CONFIGURATION
// ==========================================
const getEnvArray = (key, def) => {
    try { return process.env[key] ? JSON.parse(process.env[key]) : def; }
    catch { return def; }
};

const getEnvObject = (key, def) => {
    try { return process.env[key] ? JSON.parse(process.env[key]) : def; }
    catch { return def; }
};

export const CONFIG = {
    celcatUrl: process.env.CELCAT_URL || 'https://celcat.u-bordeaux.fr/Calendar/Home/GetCalendarData',
    timezone: 'Europe/Paris',
    blacklist: getEnvArray('CELCAT_BLACKLIST', ['DSPEG', 'Cours DSPEG']),
    replacements: getEnvObject('CELCAT_REPLACEMENTS', { 'Test': '💻' }),

    MAX_RETRIES: 3,
    INITIAL_BACKOFF: 500,
    TIMEOUT: parseInt(process.env.API_TIMEOUT || '6000'),
    CACHE_TTL: parseInt(process.env.CACHE_TTL || '3600'), // 1 heure
    GROUP_REGEX: /^[a-zA-Z0-9\s\-\_\.\(\)\,àâäçèéêëîïôöùûüÀÂÄÇÈÉÊËÎÏÔÖÙÛÜ]+$/
};

// ==========================================
// LOGIQUE MÉTIER (Helpers)
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
    if (!event || typeof event !== 'object' || !event.start) return null;

    const cleanDescription = cleanDescriptionText(event.description || "");
    if (CONFIG.blacklist.some(keyword => cleanDescription.includes(keyword))) return null;

    const fullTextScan = ((event.eventCategory || "") + " " + cleanDescription).toUpperCase();
    const sitesText = (event.sites ? event.sites.join(', ') : '').toUpperCase();

    // Extract course name and professor from description
    const descriptionLines = cleanDescription.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    let summary = "";
    let professorName = "";

    // Look for full course name in description
    for (const line of descriptionLines) {
        if (/^\d[A-Z0-9]+\s+/i.test(line)) continue;
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

        return {
            id: event.id,
            start: startDate,
            end: endDate,
            summary: summary,
            description: null,
            location: null,
            isHoliday: true,
            allDay: true
        };
    }

    if (summary.length < 3 && (!event.modules || event.modules.length === 0)) return null;

    for (const [key, replacement] of Object.entries(CONFIG.replacements)) {
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
        if (!summaryUpper.startsWith(prefix.toUpperCase()) && !summaryUpper.startsWith("TD") && !summaryUpper.startsWith("TP")) {
            summary = `${prefix} - ${summary}`;
        } else if (isMachine && !summaryUpper.includes("MACHINE")) {
            summary = `${prefix} - ${summary.replace(/^(TD|TP)\s*-?\s*/i, '')}`;
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
            finalLocation = (cleanRoom.includes(finalLocation) || cleanRoom.includes("CREMI"))
                ? cleanRoom
                : `${finalLocation} - ${cleanRoom}`;
        } else {
            finalLocation = cleanRoom;
        }
    }

    return {
        id: event.id,
        start: startDate,
        end: endDate,
        summary: summary,
        description: cleanDescription,
        location: finalLocation,
        eventType: prefix,
        isHoliday: false,
        allDay: false
    };
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
