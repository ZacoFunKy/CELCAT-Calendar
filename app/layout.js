import './globals.css'
import { Providers } from './providers'

export const metadata = {
  title: 'Mon EDT Bordeaux',
  description: 'Synchronise ton emploi du temps Celcat sur ton mobile.',
  openGraph: {
    title: '📅 Exportateur Celcat Bordeaux',
    description: 'Génère ton lien ics en 2 clics.',
    type: 'website',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        { }
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var storage = localStorage.getItem('theme');
                  var support = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  if (storage === 'dark' || (!storage && support)) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })()
            `,
          }}
        />
      </head>
      <body className="font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}