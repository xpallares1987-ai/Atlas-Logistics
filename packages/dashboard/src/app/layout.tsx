import './globals.css';
import ClientLayoutWrapperLoader from './ClientLayoutWrapperLoader';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="icon" href="/favicon.png" sizes="any" />
      </head>
      <body>
        <ClientLayoutWrapperLoader>{children}</ClientLayoutWrapperLoader>
      </body>
    </html>
  );
}
