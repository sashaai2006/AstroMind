const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function startProject(idea: string) {
  const response = await fetch(`${API_URL}/projects/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ idea }),
  });

  if (!response.ok) {
    throw new Error('Failed to start project');
  }

  return response.json();
}

