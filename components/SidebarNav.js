import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { IconCalendar, IconSun, IconMoon, IconLogOut } from './Icons';

const SidebarNav = ({ theme, toggleTheme }) => {
    const { data: session } = useSession();

    return (
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-lg shadow-black/5 rounded-full pl-3 pr-2 py-1.5 flex items-center justify-between pointer-events-auto transition-all">
            <div className="flex items-center gap-3 flex-1">
                <Link href="/" className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
                    <div className="w-4 h-4 bg-[#005b8d] rounded flex items-center justify-center text-white shadow-md shadow-[#005b8d]/20">
                        <IconCalendar className="w-2.5 h-2.5" />
                    </div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white whitespace-nowrap">U-Bordeaux</span>
                </Link>
                <div className="w-px h-3 bg-slate-300 dark:bg-slate-700"></div>
                <div className="flex items-center gap-1.5">
                    {session?.user?.role === 'admin' && (
                        <Link href="/admin" className="text-xs font-semibold text-red-500 hover:text-red-600 transition px-1.5 py-0.5 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 whitespace-nowrap">
                            Admin
                        </Link>
                    )}
                    {session ? (
                        <>
                            <Link href="/dashboard" className="flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-[#005b8d] dark:hover:text-white transition px-1.5 py-0.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap">
                                <span className="w-1 h-1 rounded-full bg-green-500 animate-pulse"></span>
                                Mon Espace
                            </Link>
                            <button
                                onClick={() => signOut({ callbackUrl: '/' })}
                                className="text-xs font-semibold text-slate-400 hover:text-red-500 transition px-1 py-0.5 rounded-full hover:bg-red-50 dark:hover:bg-red-900/10"
                                title="Se déconnecter"
                            >
                                <IconLogOut className="w-3.5 h-3.5" />
                            </button>
                        </>
                    ) : (
                        <Link href="/login" className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-[#005b8d] dark:hover:text-white transition px-1.5 py-0.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap">
                            Connexion
                        </Link>
                    )}
                    <a href="https://celcat.u-bordeaux.fr" target="_blank" className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-[#005b8d] dark:hover:text-white transition px-1.5 py-0.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap">
                        Celcat ↗
                    </a>
                </div>
            </div>
            <button 
                onClick={toggleTheme} 
                className="p-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700 flex-shrink-0"
                title={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
            >
                {theme === 'dark' ? <IconSun className="w-2.5 h-2.5" /> : <IconMoon className="w-2.5 h-2.5" />}
            </button>
        </div>
    );
};

export default SidebarNav;
