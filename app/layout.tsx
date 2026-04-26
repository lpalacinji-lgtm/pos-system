import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'POS Profesional',
  description: 'Sistema de punto de venta',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#059669',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `if ('serviceWorker' in navigator) { navigator.serviceWorker.getRegistrations().then(function(rs) { rs.forEach(function(r) { r.unregister(); }); }); if (window.caches) { caches.keys().then(function(ks) { ks.forEach(function(k) { caches.delete(k); }); }); } }`,
          }}
        />
      </body>
    </html>
  )
}
