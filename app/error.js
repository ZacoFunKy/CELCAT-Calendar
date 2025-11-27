'use client';

import { useEffect } from 'react';
import { FiRefreshCw, FiHome } from 'react-icons/fi';
import Link from 'next/link';

export default function Error({ error, reset }) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-white p-4 transition-colors duration-300">
            {/* Background Blobs */}
            <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] bg-red-500/10 dark:bg-red-500/10 rounded-full blur-[100px] animate-blob"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] bg-orange-200/20 dark:bg-orange-900/10 rounded-full blur-[100px] animate-blob animation-delay-2000"></div>
            </div>

            <div className="text-center space-y-6 max-w-md mx-auto relative z-10">
                <div className="relative w-32 h-32 mx-auto mb-8">
                    <div className="absolute inset-0 bg-red-500/20 dark:bg-red-400/10 rounded-full animate-pulse"></div>
                    <div className="absolute inset-0 flex items-center justify-center text-6xl">
                        😵
                    </div>
                </div>

                <h1 className="text-4xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Une erreur est survenue</h1>
                <p className="text-slate-500 dark:text-slate-400 text-lg">
                    Quelque chose s'est mal passé. Ne vous inquiétez pas, ce n'est pas de votre faute.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                        onClick={reset}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl transition-all shadow-sm hover:shadow-md"
                    >
                        <FiRefreshCw className="w-5 h-5" />
                        Réessayer
                    </button>
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#005b8d] hover:bg-[#004a75] text-white rounded-xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 active:translate-y-0"
                    >
                        <FiHome className="w-5 h-5" />
                        Accueil
                    </Link>
                </div>
            </div>
        </div>
    );
}
