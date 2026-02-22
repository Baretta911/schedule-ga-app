export async function runGa(config) {
  const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

  const response = await fetch(`${baseUrl}/api/ga/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(config || {})
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}`);
  }

  return response.json();
}

export async function getGaMeta() {
  const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';
  const response = await fetch(`${baseUrl}/api/ga/meta`);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}`);
  }

  return response.json();
}
