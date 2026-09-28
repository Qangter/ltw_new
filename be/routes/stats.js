const router = require('express').Router();
const pool = require('../config/db');
const { auth, requireRole, wrap } = require('../middleware/auth');

router.use(auth, requireRole('ADMIN', 'TEACHER'));
const G = `FROM grades g JOIN enrollments e ON e.id=g.enrollment_id JOIN course_offerings o ON o.id=e.course_offering_id`;

router.get('/overview', wrap(async (req, res) => {
  const one = async (sql) => (await pool.query(sql))[0][0].n;
  const [[gs]] = await pool.query(`SELECT COUNT(*) AS total, ROUND(AVG(total_score),2) AS avg_score, SUM(result='PASSED') AS passed, SUM(result='FAILED') AS failed FROM grades`);
  const total = gs.total || 0;
  res.json({
    students: await one('SELECT COUNT(*) n FROM students'),
    teachers: await one('SELECT COUNT(*) n FROM teachers'),
    subjects: await one('SELECT COUNT(*) n FROM subjects'),
    classes: await one('SELECT COUNT(*) n FROM classes'),
    grades: total, avg_score: gs.avg_score, passed: Number(gs.passed || 0), failed: Number(gs.failed || 0),
    pass_rate: total ? Math.round(gs.passed / total * 10000) / 100 : 0,
    fail_rate: total ? Math.round(gs.failed / total * 10000) / 100 : 0,
  });
}));

router.get('/by-subject', wrap(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT sb.subject_code, sb.subject_name, COUNT(*) AS total, ROUND(AVG(g.total_score),2) AS avg_score,
            SUM(g.result='PASSED') AS passed, ROUND(100*SUM(g.result='PASSED')/COUNT(*),2) AS pass_rate
     ${G} JOIN subjects sb ON sb.id=o.subject_id GROUP BY sb.id ORDER BY sb.subject_code`);
  res.json(rows);
}));

router.get('/by-semester', wrap(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT sm.semester_code, sm.semester_name, COUNT(*) AS total, ROUND(AVG(g.total_score),2) AS avg_score,
            SUM(g.result='PASSED') AS passed, ROUND(100*SUM(g.result='PASSED')/COUNT(*),2) AS pass_rate
     ${G} JOIN semesters sm ON sm.id=o.semester_id GROUP BY sm.id ORDER BY sm.start_date`);
  res.json(rows);
}));

router.get('/distribution', wrap(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT letter_grade, COUNT(*) AS total FROM grades GROUP BY letter_grade ORDER BY FIELD(letter_grade,'A+','A','B+','B','C+','C','D','F')`);
  res.json(rows);
}));

router.get('/by-department', wrap(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT d.department_name, COUNT(s.id) AS students FROM departments d
     LEFT JOIN majors m ON m.department_id=d.id LEFT JOIN classes c ON c.major_id=m.id LEFT JOIN students s ON s.class_id=c.id
     GROUP BY d.id ORDER BY students DESC`);
  res.json(rows);
}));
module.exports = router;
