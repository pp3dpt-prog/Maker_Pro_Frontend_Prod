export default function Page() {
  return (
    <main style={{ padding: 40 }}>
      <h1 style={{ color: 'white', fontSize: 32 }}>
        TESTE DE GRID
      </h1>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 24,
          marginTop: 40,
        }}
      >
        <div style={{ background: 'red', height: 150 }} />
        <div style={{ background: 'green', height: 150 }} />
        <div style={{ background: 'blue', height: 150 }} />
      </div>
    </main>
  );
}
``