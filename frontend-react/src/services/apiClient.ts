export const API_BASE_URL = 'http://localhost:3001/api';

export async function request(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(url, { ...options, headers });
  
  if (!response.ok) {
    let errMsg = `Request failed with status ${response.status}`;
    try {
      const errData = await response.json();
      errMsg = errData.message || errMsg;
    } catch {}
    throw new Error(errMsg);
  }

  return response.json();
}

export const getDownloadUrl = (relativePath: string) => 
  `${API_BASE_URL}/files/download?path=${encodeURIComponent(relativePath)}`;
