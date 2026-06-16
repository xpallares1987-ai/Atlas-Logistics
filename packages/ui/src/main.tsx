import ReactDOM from 'react-dom/client';

const App = () => (
  <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
    <h1>Torre UI Components</h1>
    <p>Documentación técnica y exhibición de componentes.</p>
  </div>
);

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
