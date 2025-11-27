'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const router = useRouter();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const res = await signIn('credentials', {
            email,
            password,
            redirect: false,
        });

        if (res?.error) {
            setError('Email ou mot de passe incorrect');
        } else {
            router.push('/dashboard');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0B1120] p-4 relative overflow-hidden">
            {/* BACKGROUND BLOBS */}
            <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-60"></div>
                <div className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] bg-[#005b8d]/20 dark:bg-[#005b8d]/20 rounded-full blur-[100px] animate-blob mix-blend-multiply dark:mix-blend-screen"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] bg-cyan-200/40 dark:bg-cyan-900/20 rounded-full blur-[100px] animate-blob animation-delay-2000 mix-blend-multiply dark:mix-blend-screen"></div>
            </div>

            <div className="w-full max-w-md bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 dark:border-white/10 p-8">
                <div className="text-center mb-8 relative">
                    <Link href="/" className="absolute left-0 top-0 p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-[#005b8d] hover:text-white transition-all duration-300 shadow-sm hover:shadow-md group">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 transform group-hover:-translate-x-0.5 transition-transform">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                        </svg>
                    </Link>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Connexion</h1>
                    <p className="text-slate-500 dark:text-slate-400">Accède à ton emploi du temps personnalisé</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300 rounded-xl text-sm font-medium text-center">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#005b8d] focus:border-transparent outline-none transition-all dark:text-white"
                            placeholder="etudiant@u-bordeaux.fr"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Mot de passe</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#005b8d] focus:border-transparent outline-none transition-all dark:text-white"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full py-3.5 bg-[#005b8d] hover:bg-[#004a75] text-white font-bold rounded-xl shadow-lg shadow-[#005b8d]/20 transition-all transform active:scale-[0.98]"
                    >
                        Se connecter
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                        Pas encore de compte ?{' '}
                        <Link href="/register" className="text-[#005b8d] dark:text-blue-400 font-bold hover:underline">
                            S'inscrire
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
