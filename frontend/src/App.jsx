import React, { useState } from 'react';
import GaConfigForm from './components/GaConfigForm.jsx';
import ScheduleViewer from './components/ScheduleViewer.jsx';
import { runGa } from './services/apiClient.js';

function App() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const handleRunGa = async (config) => {
    setLoading(true);
    setError(null);
    try {
      const data = await runGa(config);
      setResult(data);
    } catch (err) {
      setError(err.message || 'Failed to run GA');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem', maxWidth: 900, margin: '0 auto' }}>
      <h1>Schedule GA Optimizer</h1>
      <p>Optimasi jadwal 7 hari berbasis Genetic Algorithm dan Two-Process Model.</p>
      <GaConfigForm onRun={handleRunGa} disabled={loading} />
      {loading && <p>Menjalankan GA...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {result && (
        <ScheduleViewer bestIndividual={result.bestIndividual} stats={result.stats} />
      )}
    </div>
  );
}

export default App;
