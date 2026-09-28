-- example_queries.sql : 15 truy vấn mẫu cho website tra cứu điểm
USE diem_thi;

-- 1. 20 sinh viên đầu tiên
SELECT id, student_code, full_name, class_id, status FROM students ORDER BY id LIMIT 20;

-- 2. Tìm sinh viên theo mã
SELECT s.*, c.class_code, m.major_name, d.department_name
FROM students s JOIN classes c ON c.id=s.class_id JOIN majors m ON m.id=c.major_id JOIN departments d ON d.id=m.department_id
WHERE s.student_code = 'SV0001';

-- 3. Tìm sinh viên theo tên (gần đúng)
SELECT student_code, full_name, class_id FROM students WHERE full_name LIKE '%Nguyễn Văn%' LIMIT 20;

-- 4. Bảng điểm đầy đủ của SV0001
SELECT st.student_code, st.full_name, sb.subject_code, sb.subject_name, sb.credits,
       sm.semester_name, sm.academic_year, t.full_name AS giao_vien,
       g.total_score, g.letter_grade, g.result
FROM grades g
JOIN enrollments e ON e.id=g.enrollment_id
JOIN students st ON st.id=e.student_id
JOIN course_offerings o ON o.id=e.course_offering_id
JOIN subjects sb ON sb.id=o.subject_id
JOIN semesters sm ON sm.id=o.semester_id
JOIN teachers t ON t.id=o.teacher_id
WHERE st.student_code='SV0001'
ORDER BY sm.start_date, sb.subject_code;

-- 5. Điểm của SV0001 theo học kỳ
SELECT sb.subject_code, sb.subject_name, g.total_score, g.letter_grade, g.result
FROM grades g JOIN enrollments e ON e.id=g.enrollment_id JOIN students st ON st.id=e.student_id
JOIN course_offerings o ON o.id=e.course_offering_id JOIN subjects sb ON sb.id=o.subject_id JOIN semesters sm ON sm.id=o.semester_id
WHERE st.student_code='SV0001' AND sm.semester_code='HK1_2024_2025';

-- 6. GPA (điểm TB có trọng số tín chỉ) của SV0001
SELECT st.student_code, ROUND(SUM(g.total_score*sb.credits)/SUM(sb.credits),2) AS gpa_10, SUM(sb.credits) AS tong_tin_chi
FROM grades g JOIN enrollments e ON e.id=g.enrollment_id JOIN students st ON st.id=e.student_id
JOIN course_offerings o ON o.id=e.course_offering_id JOIN subjects sb ON sb.id=o.subject_id
WHERE st.student_code='SV0001' GROUP BY st.student_code;

-- 7. Thống kê đạt/rớt
SELECT result, COUNT(*) AS so_luong, ROUND(100*COUNT(*)/(SELECT COUNT(*) FROM grades),2) AS ty_le FROM grades GROUP BY result;

-- 8. Thống kê theo môn
SELECT sb.subject_code, sb.subject_name, COUNT(*) AS so_diem, ROUND(AVG(g.total_score),2) AS diem_tb,
       ROUND(100*SUM(g.result='PASSED')/COUNT(*),2) AS ty_le_dat
FROM grades g JOIN enrollments e ON e.id=g.enrollment_id JOIN course_offerings o ON o.id=e.course_offering_id JOIN subjects sb ON sb.id=o.subject_id
GROUP BY sb.id ORDER BY ty_le_dat;

-- 9. Thống kê theo học kỳ
SELECT sm.semester_code, COUNT(*) AS so_diem, ROUND(AVG(g.total_score),2) AS diem_tb,
       ROUND(100*SUM(g.result='PASSED')/COUNT(*),2) AS ty_le_dat
FROM grades g JOIN enrollments e ON e.id=g.enrollment_id JOIN course_offerings o ON o.id=e.course_offering_id JOIN semesters sm ON sm.id=o.semester_id
GROUP BY sm.id ORDER BY sm.start_date;

-- 10. Top 10 sinh viên điểm TB cao nhất (tối thiểu 20 tín chỉ)
SELECT st.student_code, st.full_name, ROUND(SUM(g.total_score*sb.credits)/SUM(sb.credits),2) AS gpa, SUM(sb.credits) AS tin_chi
FROM grades g JOIN enrollments e ON e.id=g.enrollment_id JOIN students st ON st.id=e.student_id
JOIN course_offerings o ON o.id=e.course_offering_id JOIN subjects sb ON sb.id=o.subject_id
GROUP BY st.id HAVING SUM(sb.credits)>=20 ORDER BY gpa DESC LIMIT 10;

-- 11. Sinh viên có môn trượt
SELECT st.student_code, st.full_name, COUNT(*) AS so_mon_truot
FROM grades g JOIN enrollments e ON e.id=g.enrollment_id JOIN students st ON st.id=e.student_id
WHERE g.result='FAILED' GROUP BY st.id ORDER BY so_mon_truot DESC LIMIT 20;

-- 12. Số sinh viên theo khoa
SELECT d.department_name, COUNT(s.id) AS so_sv FROM departments d
LEFT JOIN majors m ON m.department_id=d.id LEFT JOIN classes c ON c.major_id=m.id LEFT JOIN students s ON s.class_id=c.id
GROUP BY d.id ORDER BY so_sv DESC;

-- 13. Số sinh viên theo ngành
SELECT m.major_name, COUNT(s.id) AS so_sv FROM majors m
LEFT JOIN classes c ON c.major_id=m.id LEFT JOIN students s ON s.class_id=c.id GROUP BY m.id ORDER BY so_sv DESC;

-- 14. Số sinh viên theo lớp
SELECT c.class_code, COUNT(s.id) AS so_sv FROM classes c LEFT JOIN students s ON s.class_id=c.id GROUP BY c.id ORDER BY c.class_code;

-- 15. Danh sách điểm đã sửa
SELECT st.student_code, sb.subject_code, h.old_score, h.new_score, h.old_result, h.new_result, u.username AS nguoi_sua, h.reason, h.changed_at
FROM grade_history h JOIN grades g ON g.id=h.grade_id JOIN enrollments e ON e.id=g.enrollment_id
JOIN students st ON st.id=e.student_id JOIN course_offerings o ON o.id=e.course_offering_id JOIN subjects sb ON sb.id=o.subject_id
LEFT JOIN users u ON u.id=h.changed_by ORDER BY h.changed_at DESC;

-- Bonus: phân bố điểm
SELECT letter_grade, COUNT(*) AS so_luong FROM grades GROUP BY letter_grade ORDER BY FIELD(letter_grade,'A+','A','B+','B','C+','C','D','F');

-- EXPLAIN: tra cứu theo student_code phải dùng index uq_students_code
EXPLAIN SELECT * FROM students WHERE student_code='SV0001';
