const API_BASE = 'http://localhost:3000/api';

export interface DiagramVersion {
  id: number;
  diagram_id: string;
  author_id: string | null;
  xml: string;
  label: string | null;
  created_at: string;
}

export async function getDiagramVersions(diagramId: string): Promise<DiagramVersion[]> {
  const response = await fetch(`${API_BASE}/bpm/versions/${encodeURIComponent(diagramId)}`);
  if (!response.ok) {
    throw new Error('Failed to fetch diagram versions');
  }
  return response.json();
}

export async function saveDiagramVersion(
  diagramId: string,
  xml: string,
  label?: string,
  authorId?: string
): Promise<{ id: number; message: string }> {
  const response = await fetch(`${API_BASE}/bpm/versions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      diagram_id: diagramId,
      xml,
      label,
      author_id: authorId,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to save diagram version');
  }
  return response.json();
}
