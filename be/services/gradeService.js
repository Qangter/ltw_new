const { calcTotal, classify } = require('../utils/grade');

// Thêm hoặc sửa điểm cho một enrollment; ghi grade_history nếu điểm tổng kết thay đổi
async function saveGrade(conn, { enrollmentId, attendance, midterm, final, userId, reason }) {
  const total = calcTotal(attendance, midterm, final);
  const { letter, result } = classify(total);
  const [ex] = await conn.query('SELECT id, total_score, result FROM grades WHERE enrollment_id = ? FOR UPDATE', [enrollmentId]);
  if (ex.length) {
    const g = ex[0];
    await conn.query(
      `UPDATE grades SET attendance_score=?, midterm_score=?, final_score=?, total_score=?, letter_grade=?, result=?, updated_by=? WHERE id=?`,
      [attendance, midterm, final, total, letter, result, userId, g.id]);
    if (Number(g.total_score) !== total) {
      await conn.query(
        `INSERT INTO grade_history (grade_id, old_score, new_score, old_result, new_result, changed_by, reason) VALUES (?,?,?,?,?,?,?)`,
        [g.id, g.total_score, total, g.result, result, userId, reason || 'Cập nhật điểm']);
    }
    return { id: g.id, total, letter, result, created: false };
  }
  const [r] = await conn.query(
    `INSERT INTO grades (enrollment_id, attendance_score, midterm_score, final_score, total_score, letter_grade, result, updated_by) VALUES (?,?,?,?,?,?,?,?)`,
    [enrollmentId, attendance, midterm, final, total, letter, result, userId]);
  await conn.query(`UPDATE enrollments SET status='COMPLETED' WHERE id=? AND status='ENROLLED'`, [enrollmentId]);
  return { id: r.insertId, total, letter, result, created: true };
}
module.exports = { saveGrade };
