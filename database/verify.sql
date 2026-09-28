-- verify.sql : kiểm tra tính toàn vẹn dữ liệu. Chạy: mysql -u root -p < verify.sql
USE diem_thi;

SELECT '=== DATABASE VERIFICATION: SỐ LƯỢNG ===' AS info;
SELECT 'Departments' AS item, COUNT(*) AS value FROM departments
UNION ALL SELECT 'Majors', COUNT(*) FROM majors
UNION ALL SELECT 'Classes', COUNT(*) FROM classes
UNION ALL SELECT 'Users', COUNT(*) FROM users
UNION ALL SELECT 'Admins', COUNT(*) FROM users WHERE role='ADMIN'
UNION ALL SELECT 'Teacher users', COUNT(*) FROM users WHERE role='TEACHER'
UNION ALL SELECT 'Student users', COUNT(*) FROM users WHERE role='STUDENT'
UNION ALL SELECT 'Teachers', COUNT(*) FROM teachers
UNION ALL SELECT 'Students', COUNT(*) FROM students
UNION ALL SELECT 'Subjects', COUNT(*) FROM subjects
UNION ALL SELECT 'Semesters', COUNT(*) FROM semesters
UNION ALL SELECT 'Course offerings', COUNT(*) FROM course_offerings
UNION ALL SELECT 'Enrollments', COUNT(*) FROM enrollments
UNION ALL SELECT 'Grades', COUNT(*) FROM grades
UNION ALL SELECT 'Grade history', COUNT(*) FROM grade_history;

SELECT '=== KIỂM TRA (mọi giá trị "value" phải đúng như expected) ===' AS info;
SELECT 'Students = 500' AS check_name, COUNT(*) AS value, 500 AS expected FROM students
UNION ALL SELECT 'Teachers = 25', COUNT(*), 25 FROM teachers
UNION ALL SELECT 'Admins = 1', COUNT(*), 1 FROM users WHERE role='ADMIN'
UNION ALL SELECT 'Duplicate student codes', COUNT(*), 0 FROM (SELECT student_code FROM students GROUP BY student_code HAVING COUNT(*)>1) x
UNION ALL SELECT 'Duplicate teacher codes', COUNT(*), 0 FROM (SELECT teacher_code FROM teachers GROUP BY teacher_code HAVING COUNT(*)>1) x
UNION ALL SELECT 'Duplicate subject codes', COUNT(*), 0 FROM (SELECT subject_code FROM subjects GROUP BY subject_code HAVING COUNT(*)>1) x
UNION ALL SELECT 'Duplicate usernames', COUNT(*), 0 FROM (SELECT username FROM users GROUP BY username HAVING COUNT(*)>1) x
UNION ALL SELECT 'Orphan grades (no enrollment)', COUNT(*), 0 FROM grades g LEFT JOIN enrollments e ON e.id=g.enrollment_id WHERE e.id IS NULL
UNION ALL SELECT 'Orphan enrollments (no student)', COUNT(*), 0 FROM enrollments e LEFT JOIN students s ON s.id=e.student_id WHERE s.id IS NULL
UNION ALL SELECT 'Orphan enrollments (no offering)', COUNT(*), 0 FROM enrollments e LEFT JOIN course_offerings o ON o.id=e.course_offering_id WHERE o.id IS NULL
UNION ALL SELECT 'Orphan grade_history', COUNT(*), 0 FROM grade_history h LEFT JOIN grades g ON g.id=h.grade_id WHERE g.id IS NULL
UNION ALL SELECT 'Scores < 0', COUNT(*), 0 FROM grades WHERE final_score<0 OR total_score<0
UNION ALL SELECT 'Scores > 10', COUNT(*), 0 FROM grades WHERE final_score>10 OR total_score>10
UNION ALL SELECT 'Students without user', COUNT(*), 0 FROM students s LEFT JOIN users u ON u.id=s.user_id AND u.role='STUDENT' WHERE u.id IS NULL
UNION ALL SELECT 'Teachers without user', COUNT(*), 0 FROM teachers t LEFT JOIN users u ON u.id=t.user_id AND u.role='TEACHER' WHERE u.id IS NULL
UNION ALL SELECT 'Duplicate grade per enrollment', COUNT(*), 0 FROM (SELECT enrollment_id FROM grades GROUP BY enrollment_id HAVING COUNT(*)>1) x
UNION ALL SELECT 'Duplicate grade student+subject+semester', COUNT(*), 0 FROM (
    SELECT e.student_id, o.subject_id, o.semester_id FROM grades g
    JOIN enrollments e ON e.id=g.enrollment_id JOIN course_offerings o ON o.id=e.course_offering_id
    GROUP BY e.student_id, o.subject_id, o.semester_id HAVING COUNT(*)>1) x
UNION ALL SELECT 'Wrong letter/result mapping', COUNT(*), 0 FROM grades
    WHERE (total_score>=5 AND result<>'PASSED') OR (total_score<5 AND result<>'FAILED') OR (total_score<5 AND letter_grade<>'F');

SELECT '=== TỶ LỆ ĐẬU/RỚT ===' AS info;
SELECT result, COUNT(*) AS so_luong, ROUND(100*COUNT(*)/(SELECT COUNT(*) FROM grades),2) AS ty_le_pct FROM grades GROUP BY result;
