function App() {
  return (
    <main className="gr-fallback">
      <section className="gr-panel" role="alert" aria-labelledby="gr-heading">
        <header className="gr-plate">
          <div className="gr-mark" aria-hidden="true"><span /></div>
          <div>
            <p className="gr-title" style={{ color: '#EDBA3C', fontSize: '.875rem' }}>GoldRush Arena</p>
            <h1 id="gr-heading" className="gr-title" style={{ fontSize: '1.875rem' }}>Game unavailable</h1>
          </div>
        </header>
        <div className="gr-body">
          <p style={{ marginTop: 0, color: '#252A2B', fontWeight: 600 }}>
            The browser version of the game could not be loaded right now.
          </p>
          <p>
            Your progress is not affected. Try loading it again in a moment, or open the
            game launcher instead.
          </p>
          <div className="gr-actions">
            <button type="button" className="gr-btn gr-btn-primary" onClick={() => window.location.reload()}>
              Retry
            </button>
            <a className="gr-btn gr-btn-secondary" href="/mobile/">Open game launcher</a>
          </div>
        </div>
      </section>
    </main>
  );
}

export default App;
