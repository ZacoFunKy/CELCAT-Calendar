'use client'
import { useState, useEffect } from 'react';
import { useAppTheme } from '../hooks/useAppTheme';
import MobileView from '../components/MobileView';
import DesktopView from '../components/DesktopView';
import { IconCalendar } from '../components/Icons';

export default function Home() {
  const { theme, toggleTheme, mounted } = useAppTheme();
  const [isMobile, setIsMobile] = useState(false);

  const [appLoaded, setAppLoaded] = useState(false);
  const [contentVisible, setContentVisible] = useState(false);
  const [serverStatus, setServerStatus] = useState('loading');

  useEffect(() => {
    // 1. Détection Mobile
    const checkScreen = () => setIsMobile(window.innerWidth < 1024);
    checkScreen();
    window.addEventListener('resize', checkScreen);

    // 2. Initialisation et Loader
    const initApp = async () => {
      setServerStatus('online');

      await new Promise(resolve => setTimeout(resolve, 800));
      setAppLoaded(true);
      setTimeout(() => {
        setContentVisible(true);
      }, 100);
    };

    if (mounted) {
      initApp();
    }

    return () => window.removeEventListener('resize', checkScreen);
  }, [mounted]);


  if (!mounted || !appLoaded) {
    // LOADER AFFICHÉ PENDANT L'INITIALISATION
    return (
      <div className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white dark:bg-[#0B1120] transition-all duration-700 ease-[cubic-bezier(0.76,0,0.24,1)] ${appLoaded ? 'opacity-0 pointer-events-none translate-y-[-20px]' : 'opacity-100'}`}>
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-[#005b8d]/30 rounded-full blur-xl animate-pulse"></div>
          <div className="w-20 h-20 bg-[#005b8d] rounded-2xl flex items-center justify-center text-white shadow-2xl relative z-10 animate-bounce-subtle">
            <IconCalendar className="w-10 h-10" />
          </div>
        </div>
        <div className="flex flex-col items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">U-Bordeaux Sync</h1>
          <div className="w-48 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-[#005b8d] animate-loading-bar rounded-full"></div>
          </div>
          <p className="text-xs font-medium text-slate-400 mt-1 animate-pulse">Initialisation...</p>
        </div>
        {/* Styles pour le Loader nécessaires ici */}
        <style jsx global>{`
                .animate-loading-bar { animation: loading-bar 1.5s ease-in-out infinite; }
                @keyframes loading-bar { 0% { width: 0%; margin-left: 0; } 50% { width: 100%; margin-left: 0; } 100% { width: 0%; margin-left: 100%; } }
                .animate-bounce-subtle { animation: bounce-subtle 2s infinite; }
                @keyframes bounce-subtle { 0%, 100% { transform: translateY(-3%); } 50% { transform: translateY(3%); } }
                /* Styles pour les Blobs, déplacés ici pour la cohérence globale */
                @keyframes blob { 0% { transform: translate(0px, 0px) scale(1); } 33% { transform: translate(30px, -50px) scale(1.1); } 66% { transform: translate(-20px, 20px) scale(0.9); } 100% { transform: translate(0px, 0px) scale(1); } }
                .animate-blob { animation: blob 10s infinite; }
                .animation-delay-2000 { animation-delay: 2s; }
                .animation-delay-4000 { animation-delay: 4s; }
            `}</style>
      </div>
    );
  }

  // AFFICHAGE DES VUES APRÈS LE LOADER
  return isMobile
    ? <MobileView theme={theme} toggleTheme={toggleTheme} contentVisible={contentVisible} />
    : <DesktopView theme={theme} toggleTheme={toggleTheme} contentVisible={contentVisible} />;
}