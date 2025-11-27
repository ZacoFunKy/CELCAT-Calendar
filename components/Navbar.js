import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { IconCalendar, IconSun, IconMoon, IconLogOut } from './Icons';

const Navbar = ({ theme, toggleTheme, placement = 'top' }) => {
    const { data: session } = useSession();

    return (
        <header className={`fixed ${placement === 'bottom' ? 'bottom-0' : 'top-0'} left-0 right-0 z-50 flex justify-between lg:justify-center items-center p-4 lg:p-6 pointer-events-none`}>
            {/* Desktop Style (Pill) */}
            <div className="hidden lg:flex bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-lg shadow-black/5 rounded-full pl-6 pr-2 py-2 items-center gap-4 pointer-events-auto transition-all hover:scale-105">
                <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
                    <div className="w-7 h-7 bg-[#005b8d] rounded-lg flex items-center justify-center text-white shadow-md shadow-[#005b8d]/20">
                        <IconCalendar className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">U-Bordeaux</span>
                </Link>
                <div className="w-px h-4 bg-slate-300 dark:bg-slate-700"></div>
                <div className="flex items-center gap-1">
                    {session?.user?.role === 'admin' && (
                        <Link href="/admin" className="text-xs font-semibold text-red-500 hover:text-red-600 transition px-3 py-1.5 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20">Admin</Link>
                    )}
                    {session ? (
                        <>
                            <Link href="/dashboard" className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-[#005b8d] dark:hover:text-white transition px-3 py-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                Mon Espace
                            </Link>
                            <button
                                onClick={() => signOut({ callbackUrl: '/' })}
                                className="text-xs font-semibold text-slate-400 hover:text-red-500 transition px-2 py-1.5 rounded-full hover:bg-red-50 dark:hover:bg-red-900/10"
                                title="Se déconnecter"
                            >
                                <IconLogOut className="w-4 h-4" />
                            </button>
                        </>
                    ) : (
                        <Link href="/login" className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-[#005b8d] dark:hover:text-white transition px-3 py-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                            Connexion
                        </Link>
                    )}
                    <a href="https://celcat.u-bordeaux.fr" target="_blank" className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-[#005b8d] dark:hover:text-white transition px-3 py-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">Celcat Officiel ↗</a>
                    <button onClick={toggleTheme} className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700">
                        {theme === 'dark' ? <IconSun /> : <IconMoon />}
                    </button>
                </div>
            </div>

            {/* Mobile Style (Full Width) */}
            <div className="flex lg:hidden w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 pointer-events-auto justify-between items-center p-4 -m-4">
                <Link href="/" className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-[#005b8d] rounded-lg flex items-center justify-center text-white shadow-md shadow-[#005b8d]/20"><IconCalendar className="w-5 h-5" /></div>
                    <span className="text-lg font-bold text-slate-900 dark:text-white">U-Bordeaux</span>
                </Link>
                <div className="flex items-center gap-2">
                    {session?.user?.role === 'admin' && (
                        <Link href="/admin" className="text-xs font-semibold text-red-500 hover:text-red-600 transition px-2 py-1.5 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20">Admin</Link>
                    )}
                    {session ? (
                        <button
                            onClick={() => signOut({ callbackUrl: '/' })}
                            className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-red-500 transition-colors"
                        >
                            <IconLogOut className="w-5 h-5" />
                        </button>
                    ) : (
                        <Link href="/login" className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-[#005b8d] dark:hover:text-white transition px-3 py-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">Connexion</Link>
                    )}
                    <button onClick={toggleTheme} className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700">
                        {theme === 'dark' ? <IconSun /> : <IconMoon />}
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Navbar;
