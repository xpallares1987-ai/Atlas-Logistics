export async function saveToGitHub(
  token: string,
  fileName: string,
  content: string,
  gistId: string | null = null
) {
  const url = gistId ? `https://api.github.com/gists/${gistId}` : 'https://api.github.com/gists';
  const method = gistId ? 'PATCH' : 'POST';

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      description: 'BPMN Diagram from BPMN Modeler',
      public: false,
      files: { [fileName]: { content } },
    }),
  });

  if (!response.ok) throw new Error(`GitHub API Error: ${response.statusText}`);
  return await response.json();
}
