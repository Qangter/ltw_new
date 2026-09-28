class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
// Trọng số: chuyên cần 10%, giữa kỳ 30%, cuối kỳ 60%
function calcTotal(a, m, f) {
  if (a === null || m === null) return Math.round(f * 100) / 100;
  return Math.round((a * 0.1 + m * 0.3 + f * 0.6) * 100) / 100;
}
function classify(t) {
  let letter = 'F';
  if (t >= 9) letter = 'A+'; else if (t >= 8.5) letter = 'A'; else if (t >= 8) letter = 'B+';
  else if (t >= 7) letter = 'B'; else if (t >= 6.5) letter = 'C+'; else if (t >= 5.5) letter = 'C'; else if (t >= 5) letter = 'D';
  return { letter, result: t >= 5 ? 'PASSED' : 'FAILED' };
}
function parseScore(v, name, required) {
  if (v === undefined || v === null || String(v).trim() === '') {
    if (required) throw new HttpError(400, `Thiếu ${name}`);
    return null;
  }
  const n = Number(String(v).replace(',', '.'));
  if (!Number.isFinite(n) || n < 0 || n > 10) throw new HttpError(400, `${name} phải là số từ 0 đến 10`);
  return Math.round(n * 100) / 100;
}
module.exports = { HttpError, calcTotal, classify, parseScore };
