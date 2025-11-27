import { useState, useEffect } from 'react';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';

export default function CollapsibleCard({
    title,
    icon: Icon,
    children,
    defaultOpen = true,
    className = "",
    isOpen: controlledIsOpen,
    onToggle
}) {
    const [internalIsOpen, setInternalIsOpen] = useState(defaultOpen);
    const [isOverflowVisible, setIsOverflowVisible] = useState(defaultOpen);

    const isControlled = controlledIsOpen !== undefined;
    const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => setIsOverflowVisible(true), 300);
            return () => clearTimeout(timer);
        } else {
            setIsOverflowVisible(false);
        }
    }, [isOpen]);

    const handleToggle = () => {
        if (isControlled) {
            onToggle && onToggle(!isOpen);
        } else {
            setInternalIsOpen(!isOpen);
        }
    };

    return (
        <div className={`bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl shadow-xl border border-white/50 dark:border-white/10 transition-all duration-300 ${className} ${isOverflowVisible ? 'overflow-visible' : 'overflow-hidden'}`}>
            <button
                onClick={handleToggle}
                className="w-full flex items-center justify-between p-6 text-left focus:outline-none"
            >
                <h2 className="text-lg font-semibold flex items-center gap-2 text-slate-800 dark:text-white">
                    {Icon && <Icon className="text-[#005b8d]" />}
                    {title}
                </h2>
                <div className={`p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500`}>
                    {isOpen ? <FiChevronUp /> : <FiChevronDown />}
                </div>
            </button>

            <div
                className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
                    } ${isOverflowVisible ? 'overflow-visible' : 'overflow-hidden'}`}
            >
                <div className="px-6 pb-6">
                    {children}
                </div>
            </div>
        </div>
    );
}
