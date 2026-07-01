const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export async function fetchHealth() {
  const res = await fetch(`${API}/health`);
  return res.json();
}

export async function fetchClips() {
  const res = await fetch(`${API}/clips`);
  if (!res.ok) throw new Error('Backend unavailable');
  return res.json();
}

export async function prewarmClip(clipName) {
  try {
    await fetch(`${API}/prewarm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clip_name: clipName }),
    });
  } catch {}  // fire-and-forget — never block the UI
}

export async function extractFrame(clipName, timestampMs) {
  // Start background job (returns immediately — avoids Heroku's 30s H12 timeout)
  const res = await fetch(`${API}/extract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clip_name: clipName, timestamp_ms: timestampMs }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Extraction failed');
  }
  const { job_id } = await res.json();

  // Poll every 2 seconds until done (max 3 minutes)
  for (let i = 0; i < 90; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const poll = await fetch(`${API}/extract/status/${job_id}`);
    if (!poll.ok) throw new Error('Extraction status check failed');
    const job = await poll.json();
    if (job.status === 'done') return job.result;
    if (job.status === 'error') throw new Error(job.error || 'Extraction failed');
  }
  throw new Error('Extraction timed out after 3 minutes');
}

export async function startYoutubeDownload(url) {
  const res = await fetch(`${API}/upload/youtube`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Download failed');
  }
  return res.json();  // { job_id, status }
}

export async function pollDownloadStatus(jobId) {
  const res = await fetch(`${API}/upload/status/${jobId}`);
  if (!res.ok) throw new Error('Job not found');
  return res.json();  // { status, clip?, error? }
}

export async function getPrediction(payload) {
  const res = await fetch(`${API}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Prediction failed');
  }
  return res.json();
}

export async function getZlatanComment(event, context = {}) {
  const res = await fetch(`${API}/zlatan/comment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event, context }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function searchPlayers(q, league = 39, season = 2024) {
  const params = new URLSearchParams({ q, league, season });
  const res = await fetch(`${API}/players/search?${params}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Player search failed');
  }
  return res.json();
}

export { API };
