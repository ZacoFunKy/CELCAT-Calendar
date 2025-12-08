import { FiAlertTriangle, FiInfo, FiCheckCircle } from 'react-icons/fi';
import Portal from './Portal';

export default function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmText = "Confirmer",
    cancelText = "Annuler",
    variant = "danger", // danger, warning, info, success
    icon: Icon
}) {
    if (!isOpen) return null;

    const getVariantStyles = () => {
        switch (variant) {
            case 'danger':
                return {
                    iconBg: 'bg-red-100 dark:bg-red-900/30',
                    iconColor: 'text-red-600 dark:text-red-500',
                    confirmBtn: 'bg-red-600 hover:bg-red-700 shadow-red-600/20',
                    DefaultIcon: FiAlertTriangle
                };
            case 'warning':
                return {
                    iconBg: 'bg-amber-100 dark:bg-amber-900/30',
                    iconColor: 'text-amber-600 dark:text-amber-500',
                    confirmBtn: 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20',
                    DefaultIcon: FiAlertTriangle
                };
            case 'success':
                return {
                    iconBg: 'bg-green-100 dark:bg-green-900/30',
                    iconColor: 'text-green-600 dark:text-green-500',
                    confirmBtn: 'bg-green-600 hover:bg-green-700 shadow-green-600/20',
                    DefaultIcon: FiCheckCircle
                };
            case 'info':
            default:
                return {
                    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
                    iconColor: 'text-blue-600 dark:text-blue-500',
                    confirmBtn: 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20',
                    DefaultIcon: FiInfo
                };
        }
    };

    const styles = getVariantStyles();
    const DisplayIcon = Icon || styles.DefaultIcon;

    return (
        <Portal>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200">
                    <div className="flex flex-col items-center text-center">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${styles.iconBg} ${styles.iconColor}`}>
                            <DisplayIcon className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{title}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                            {description}
                        </p>
                        <div className="flex gap-3 w-full">
                            <button
                                onClick={onClose}
                                className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            >
                                {cancelText}
                            </button>
                            <button
                                onClick={onConfirm}
                                className={`flex-1 px-4 py-2.5 text-white rounded-xl font-medium transition-colors shadow-lg ${styles.confirmBtn}`}
                            >
                                {confirmText}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </Portal>
    );
}
