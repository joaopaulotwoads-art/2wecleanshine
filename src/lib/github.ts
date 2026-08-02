const OWNER = 'joaopaulotwoads-art';
const REPO = '2wecleanshine';
const BRANCH = 'main';
const API_BASE = `https://api.github.com/repos/${OWNER}/${REPO}/contents`;

function token(): string {
  return (import.meta.env.GITHUB_TOKEN ?? process.env.GITHUB_TOKEN ?? '') as string;
}

function headers(): HeadersInit {
  return {
    Authorization: `Bearer ${token()}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

export interface GithubFile {
  content: string; // base64
  sha: string;
}

export async function getGithubFile(path: string): Promise<GithubFile | null> {
  const res = await fetch(`${API_BASE}/${path}?ref=${BRANCH}`, { headers: headers(), cache: 'no-store' });
  if (!res.ok) return null;
  const data = await res.json();
  return { content: data.content, sha: data.sha };
}

export async function putGithubFile(
  path: string,
  contentBase64: string,
  message: string,
  sha?: string
): Promise<boolean> {
  const res = await fetch(`${API_BASE}/${path}`, {
    method: 'PUT',
    headers: { ...headers(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      content: contentBase64,
      branch: BRANCH,
      ...(sha ? { sha } : {}),
    }),
  });
  return res.ok;
}
