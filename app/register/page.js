'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function RegisterPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Erreur lors de l\'inscription');
            }

            router.push('/login?registered=true');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
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

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="w-full max-w-md bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 dark:border-white/10 p-8"
            >
                <div className="text-center mb-8 relative">
                    <Link href="/" className="absolute left-0 top-0 p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-[#005b8d] hover:text-white transition-all duration-300 shadow-sm hover:shadow-md group">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 transform group-hover:-translate-x-0.5 transition-transform">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                        </svg>
                    </Link>
                    <motion.h1
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-3xl font-bold text-slate-900 dark:text-white mb-2"
                    >
                        Inscription
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="text-slate-500 dark:text-slate-400"
                    >
                        Crée ton compte pour personnaliser ton agenda
                    </motion.p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300 rounded-xl text-sm font-medium text-center"
                        >
                            {error}
                        </motion.div>
                    )}

                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                    >
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#005b8d] focus:border-transparent outline-none transition-all dark:text-white"
                            placeholder="etudiant@u-bordeaux.fr"
                            required
                        />
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 }}
                    >
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Mot de passe</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#005b8d] focus:border-transparent outline-none transition-all dark:text-white"
                            placeholder="••••••••"
                            required
                        />
                    </motion.div>

                    <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 bg-[#005b8d] hover:bg-[#004a75] text-white font-bold rounded-xl shadow-lg shadow-[#005b8d]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Création...' : "S'inscrire"}
                    </motion.button>
                </form>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                    className="mt-8 text-center"
                >
                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                        Déjà un compte ?{' '}
                        <Link href="/login" className="text-[#005b8d] dark:text-blue-400 font-bold hover:underline">
                            Se connecter
                        </Link>
                    </p>
                </motion.div>
            </motion.div>
        </div>
    );
}
