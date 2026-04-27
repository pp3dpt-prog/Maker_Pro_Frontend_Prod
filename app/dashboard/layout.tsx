import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt">
      <body>
        <header style={{ padding: 16, borderBottom: '1px solid #333' }}>
          <h1>MakerPro</h1>
        </header>

        <main>
          {children}
        </main>
      </body>
    </html>
  );
}