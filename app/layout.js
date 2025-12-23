
import './globals.css'

export const metadata = {
  title: 'Bellagio Plaza HR Portal',
  description: 'Central hub for Bellagio Plaza resources, links, and schedules.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
