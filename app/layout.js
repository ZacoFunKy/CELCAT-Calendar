import './globals.css'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Export Calendrier U-Bordeaux',
  description: 'Convertisseur d\'emploi du temps Celcat vers Calendrier iCal (.ics) compatible Google Calendar, Outlook, Apple Calendar...',
  icons: {
    icon: 'https://tse2.mm.bing.net/th/id/OIP.Qrn92GNZ_J7mCdjmv4RQ3gHaHa?rs=1&pid=ImgDetMain&o=7&rm=3', 
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