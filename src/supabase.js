const LOCAL_KEY = 'paia-local-answers';

function readLocal() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
}

function writeLocal(rows) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(rows));
}

export function saveLocalAnswer(record) {
  const rows = readLocal();
  rows.push({
    ...record,
    savedAt: new Date().toISOString(),
  });
  writeLocal(rows);
  return record;
}

export function loadLocalAnswers() {
  return readLocal();
}

export function queueForSupabase(record) {
  return Promise.resolve({
    ok: true,
    queued: true,
    record,
  });
}

export function hasSupabaseConfig() {
  return Boolean(globalThis.SUPABASE_URL && globalThis.SUPABASE_ANON_KEY);
}
