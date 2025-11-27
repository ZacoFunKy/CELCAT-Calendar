'use client';

import Link from 'next/link';
import { FiHome } from 'react-icons/fi';

export default function NotFound() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-white p-4 transition-colors duration-300">
            {/* Background Blobs */}
            <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] bg-[#005b8d]/10 dark:bg-[#005b8d]/10 rounded-full blur-[100px] animate-blob"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] bg-cyan-200/20 dark:bg-cyan-900/10 rounded-full blur-[100px] animate-blob animation-delay-2000"></div>
            </div>

            <div className="text-center space-y-6 max-w-md mx-auto relative z-10">
                {/* Animation */}
                <div className="relative w-32 h-32 mx-auto mb-8">
                    <div className="absolute inset-0 bg-blue-500/20 dark:bg-blue-400/10 rounded-full animate-ping"></div>
                    <div className="absolute inset-0 flex items-center justify-center text-6xl animate-bounce">
                        🤔
                    </div>
                </div>

                <h1 className="text-4xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Page introuvable</h1>
                <p className="text-slate-500 dark:text-slate-400 text-lg">
                    Oups ! La page que vous cherchez semble avoir disparu dans le néant.
                </p>

                <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-[#005b8d] hover:bg-[#004a75] text-white rounded-xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 active:translate-y-0"
                >
                    <FiHome className="w-5 h-5" />
                    Retour au tableau de bord
                </Link>
            </div>
        </div>
    );
}
