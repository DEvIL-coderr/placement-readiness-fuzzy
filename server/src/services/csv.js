/** Small RFC-4180-style CSV parser and question-row mapper (no dependencies). */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  const src = String(text).replace(/^﻿/, '');
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"' && src[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some((x) => x.trim() !== '')) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((x) => x.trim() !== '')) rows.push(row);
  return rows;
}

/**
 * Columns: subject,type,text,option1..option6,correct,answer,explanation,difficulty,topic,frequency,rankSource
 * `correct` is a letter (A-F) or number (1-6). Returns plain objects for the question validator.
 */
export function questionsFromCsv(text) {
  const [header, ...rows] = parseCsv(text);
  if (!header) return [];
  const cols = header.map((h) => h.trim().toLowerCase());
  return rows.map((r) => {
    const get = (name) => (r[cols.indexOf(name)] ?? '').trim();
    const options = [1, 2, 3, 4, 5, 6].map((n) => get(`option${n}`)).filter(Boolean);
    const type = get('type') || (options.length ? 'mcq' : 'descriptive');
    const q = { subject: get('subject'), type, text: get('text') };
    if (type === 'mcq') {
      const c = get('correct').toUpperCase();
      q.options = options;
      q.correctIndex = /^[A-F]$/.test(c) ? c.charCodeAt(0) - 65 : Number(c) - 1;
    } else q.answer = get('answer');
    for (const k of ['explanation', 'difficulty', 'topic', 'rankSource']) if (get(k.toLowerCase())) q[k] = get(k.toLowerCase());
    if (get('frequency') !== '') q.frequency = Number(get('frequency'));
    return q;
  });
}
