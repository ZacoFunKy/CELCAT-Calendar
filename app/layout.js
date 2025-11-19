import './globals.css'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

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
    <html lang="fr">
      <body className={`${inter.className} bg-gray-50 text-gray-900 antialiased`}>
        {children}
      </body>
    </html>
  )
}