# Database `diem_thi` – Website Tra cứu Kết quả Thi Trực tuyến

Database MySQL 8.x mô phỏng hệ thống quản lý điểm của một trường đại học. Dữ liệu mẫu được sinh bằng `generate.js` (có seed cố định nên kết quả luôn giống nhau).

## Chạy trên Windows
```
cd database
mysql -u root -p < full_setup.sql
mysql -u root -p < verify.sql
```
(Nếu `mysql` chưa nhận lệnh, dùng đường dẫn đầy đủ, ví dụ `"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"`, hoặc chạy trong MySQL Workbench: File > Open SQL Script > `full_setup.sql` > Execute.)

**Reset:** `mysql -u root -p < reset.sql` (⚠ XÓA TOÀN BỘ dữ liệu) rồi chạy lại `full_setup.sql`.
**Sinh lại dữ liệu:** `npm install` rồi `node generate.js` (ghi đè các file seed và `full_setup.sql`).

## Tài khoản demo
| Vai trò | Username | Password |
|---|---|---|
| ADMIN | admin | admin123 |
| TEACHER | teacher01 … teacher25 | teacher123 |
| STUDENT | student001 … student500 | student123 |

(student001 ↔ SV0001, ... student500 ↔ SV0500.) Mật khẩu lưu dạng bcrypt (cost 10).

## Số lượng dữ liệu
Departments 10 · Majors 20 · Classes 35 · Users 526 (1/25/500) · Teachers 25 · Students 500 · Subjects 38 · Semesters 6 · Course offerings 153 · Enrollments 14.232 · Grades 12.326 · Grade history 40. Tỷ lệ đạt ≈ 86,8%, rớt ≈ 13,2%.
Enrollments nhiều hơn Grades vì học kỳ ACTIVE chỉ có điểm một phần và học kỳ UPCOMING chưa có đăng ký.

## Sơ đồ quan hệ
```
users ─┬─ students ── classes ── majors ── departments
       └─ teachers ── departments
departments ── subjects
subjects ─┐
semesters ─┼─ course_offerings ── enrollments ── grades ── grade_history
teachers ──┘        (class_id tùy chọn)   (student_id)
```

## Các bảng
| Bảng | Ý nghĩa |
|---|---|
| departments | Khoa |
| majors | Ngành (thuộc khoa) |
| users | Tài khoản, role ADMIN/TEACHER/STUDENT |
| teachers / students | Hồ sơ 1-1 với users |
| classes | Lớp (thuộc ngành, có GVCN) |
| subjects | Môn học (1-4 tín chỉ) |
| semesters | Học kỳ (UPCOMING/ACTIVE/COMPLETED) |
| course_offerings | Môn mở trong học kỳ do một giáo viên dạy |
| enrollments | Sinh viên đăng ký lớp học phần (unique student+offering) |
| grades | Điểm, 1-1 với enrollment |
| grade_history | Lịch sử sửa điểm |

## Công thức điểm
`total_score = 0.1 × chuyên cần + 0.3 × giữa kỳ + 0.6 × cuối kỳ`. Xếp loại và kết quả tính theo `total_score`: ≥9.0 A+, ≥8.5 A, ≥8.0 B+, ≥7.0 B, ≥6.5 C+, ≥5.5 C, ≥5.0 D, <5.0 F; ≥5.0 là PASSED, còn lại FAILED. CHECK constraint giữ mọi điểm trong 0–10.

## ON DELETE
- **RESTRICT** (dữ liệu điểm được bảo vệ): majors→departments, classes→majors, students→classes, subjects→departments, course_offerings→subjects/semesters/teachers, enrollments→students/offerings, grades→enrollments. Không xóa được sinh viên/giáo viên/môn đã có điểm; hãy đổi `status` thay vì xóa.
- **CASCADE**: teachers/students→users (hồ sơ đi theo tài khoản, không chạm tới bảng điểm vì các FK phía sau là RESTRICT), grade_history→grades.
- **SET NULL**: classes.advisor_teacher_id, course_offerings.class_id, grades.updated_by, grade_history.changed_by.

## Chuẩn hóa
Bảng điểm chỉ chứa `enrollment_id`; tên SV/môn/học kỳ/khoa lấy qua JOIN. Không lưu trùng thông tin.

## Kiểm tra nhanh
```sql
SELECT COUNT(*) FROM students;                       -- 500
SELECT COUNT(*) FROM teachers;                       -- 25
SELECT COUNT(*) FROM users WHERE role='ADMIN';       -- 1
SELECT result, COUNT(*) FROM grades GROUP BY result; -- dữ liệu điểm
```
`verify.sql` chạy đủ 15+ kiểm tra toàn vẹn (trùng mã, orphan, điểm ngoài 0–10, ...); `example_queries.sql` có 15 truy vấn mẫu.

## Node.js
`be/config/db.js` dùng `mysql2/promise` (`npm install mysql2 dotenv`), biến môi trường `DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME`. Luôn dùng `pool.execute(sql, [params])`.

## Excel
`sample_grades.xlsx` (80 dòng khớp database) và `excel_template.xlsx` (tiêu đề + 1 dòng ví dụ + sheet hướng dẫn) với cột: student_code, full_name, subject_code, subject_name, credits, semester_name, academic_year, score.

## Ghi chú
Thứ tự nạp: classes (`03b_seed_classes.sql`) phải sau teachers (`06`) vì có GVCN, nên `full_setup.sql` nạp theo thứ tự đúng; các file rời nên chạy qua `full_setup.sql`. Script được kiểm thử thực tế trên MariaDB 10.11 (cú pháp tương thích MySQL 8.x); bạn nên chạy thử trên MySQL 8 của mình.
