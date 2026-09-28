-- =====================================================================
-- 02_schema.sql
-- Toàn bộ cấu trúc bảng (DDL) cho database diem_thi
-- =====================================================================

USE diem_thi;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- =====================================================================
-- 1. departments (Khoa)
-- =====================================================================
CREATE TABLE departments (
    id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    department_code   VARCHAR(20)  NOT NULL,
    department_name   VARCHAR(150) NOT NULL,
    description       VARCHAR(500) NULL,
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_departments_code UNIQUE (department_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Danh sách các Khoa trong trường';

-- =====================================================================
-- 2. majors (Ngành)
-- =====================================================================
CREATE TABLE majors (
    id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    department_id     INT UNSIGNED NOT NULL,
    major_code        VARCHAR(20)  NOT NULL,
    major_name        VARCHAR(150) NOT NULL,
    description       VARCHAR(500) NULL,
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_majors_code UNIQUE (major_code),
    CONSTRAINT fk_majors_department
        FOREIGN KEY (department_id) REFERENCES departments(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Danh sách các Ngành, mỗi ngành thuộc một Khoa';

CREATE INDEX idx_majors_department_id ON majors(department_id);

-- =====================================================================
-- 3. users (Tài khoản đăng nhập - ADMIN / TEACHER / STUDENT)
-- =====================================================================
CREATE TABLE users (
    id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username       VARCHAR(50)  NOT NULL,
    password_hash  VARCHAR(255) NOT NULL COMMENT 'bcrypt hash, KHÔNG lưu plaintext',
    full_name      VARCHAR(150) NOT NULL,
    email          VARCHAR(150) NULL,
    role           ENUM('ADMIN','TEACHER','STUDENT') NOT NULL,
    is_active      TINYINT(1)  NOT NULL DEFAULT 1,
    created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_users_username UNIQUE (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Tài khoản đăng nhập hệ thống';

CREATE INDEX idx_users_role ON users(role);

-- =====================================================================
-- 4. teachers (Giáo viên)
-- =====================================================================
CREATE TABLE teachers (
    id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    teacher_code     VARCHAR(20)  NOT NULL,
    user_id          INT UNSIGNED NOT NULL,
    department_id    INT UNSIGNED NOT NULL,
    full_name        VARCHAR(150) NOT NULL,
    email            VARCHAR(150) NULL,
    phone            VARCHAR(20)  NULL,
    academic_title   VARCHAR(50)  NULL COMMENT 'VD: ThS, TS, PGS, GS',
    created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_teachers_code UNIQUE (teacher_code),
    CONSTRAINT uq_teachers_user_id UNIQUE (user_id),
    CONSTRAINT fk_teachers_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_teachers_department
        FOREIGN KEY (department_id) REFERENCES departments(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Hồ sơ giáo viên, 1-1 với users';

CREATE INDEX idx_teachers_full_name ON teachers(full_name);
CREATE INDEX idx_teachers_department_id ON teachers(department_id);

-- =====================================================================
-- 5. classes (Lớp)
-- =====================================================================
CREATE TABLE classes (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    class_code          VARCHAR(30)  NOT NULL,
    class_name          VARCHAR(150) NOT NULL,
    major_id            INT UNSIGNED NOT NULL,
    academic_year       VARCHAR(20)  NOT NULL COMMENT 'VD: 2021-2025',
    advisor_teacher_id  INT UNSIGNED NULL COMMENT 'Giáo viên chủ nhiệm',
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_classes_code UNIQUE (class_code),
    CONSTRAINT fk_classes_major
        FOREIGN KEY (major_id) REFERENCES majors(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_classes_advisor
        FOREIGN KEY (advisor_teacher_id) REFERENCES teachers(id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Lớp sinh viên, mỗi lớp thuộc một ngành';

CREATE INDEX idx_classes_major_id ON classes(major_id);

-- =====================================================================
-- 6. students (Sinh viên)
-- =====================================================================
CREATE TABLE students (
    id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    student_code     VARCHAR(30)  NOT NULL,
    user_id          INT UNSIGNED NOT NULL,
    full_name        VARCHAR(150) NOT NULL,
    date_of_birth    DATE NOT NULL,
    gender           ENUM('MALE','FEMALE','OTHER') NOT NULL DEFAULT 'OTHER',
    class_id         INT UNSIGNED NOT NULL,
    email            VARCHAR(150) NULL,
    phone            VARCHAR(20)  NULL,
    address          VARCHAR(255) NULL,
    admission_year   YEAR NOT NULL,
    status           ENUM('ACTIVE','GRADUATED','SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
    created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_students_code UNIQUE (student_code),
    CONSTRAINT uq_students_user_id UNIQUE (user_id),
    CONSTRAINT fk_students_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_students_class
        FOREIGN KEY (class_id) REFERENCES classes(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Hồ sơ sinh viên, 1-1 với users. Ngành/Khoa suy ra qua class_id -> majors -> departments';

CREATE INDEX idx_students_full_name ON students(full_name);
CREATE INDEX idx_students_class_id ON students(class_id);

-- =====================================================================
-- 7. subjects (Môn học)
-- =====================================================================
CREATE TABLE subjects (
    id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    subject_code     VARCHAR(20)  NOT NULL,
    subject_name     VARCHAR(200) NOT NULL,
    credits          TINYINT UNSIGNED NOT NULL,
    department_id    INT UNSIGNED NOT NULL,
    description      VARCHAR(500) NULL,
    created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_subjects_code UNIQUE (subject_code),
    CONSTRAINT chk_subjects_credits CHECK (credits BETWEEN 1 AND 4),
    CONSTRAINT fk_subjects_department
        FOREIGN KEY (department_id) REFERENCES departments(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Danh mục môn học';

CREATE INDEX idx_subjects_name ON subjects(subject_name);

-- =====================================================================
-- 8. semesters (Học kỳ)
-- =====================================================================
CREATE TABLE semesters (
    id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    semester_code    VARCHAR(30)  NOT NULL,
    semester_name    VARCHAR(100) NOT NULL,
    academic_year    VARCHAR(20)  NOT NULL,
    start_date       DATE NOT NULL,
    end_date         DATE NOT NULL,
    status           ENUM('UPCOMING','ACTIVE','COMPLETED') NOT NULL DEFAULT 'UPCOMING',
    created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_semesters_code UNIQUE (semester_code),
    CONSTRAINT chk_semesters_dates CHECK (end_date > start_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Danh sách học kỳ';

CREATE INDEX idx_semesters_academic_year ON semesters(academic_year);
CREATE INDEX idx_semesters_status ON semesters(status);

-- =====================================================================
-- 9. course_offerings (Lớp học phần - môn học được mở trong 1 học kỳ)
-- =====================================================================
CREATE TABLE course_offerings (
    id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    subject_id       INT UNSIGNED NOT NULL,
    semester_id      INT UNSIGNED NOT NULL,
    teacher_id       INT UNSIGNED NOT NULL,
    class_id         INT UNSIGNED NULL COMMENT 'Lớp/khóa chính theo học lớp học phần này (có thể NULL nếu mở tự do nhiều lớp)',
    room             VARCHAR(30)  NULL,
    schedule         VARCHAR(100) NULL COMMENT 'VD: Thứ 2, tiết 1-3',
    max_students     SMALLINT UNSIGNED NOT NULL DEFAULT 80,
    created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_course_offering UNIQUE (subject_id, semester_id, teacher_id, class_id),
    CONSTRAINT fk_offerings_subject
        FOREIGN KEY (subject_id) REFERENCES subjects(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_offerings_semester
        FOREIGN KEY (semester_id) REFERENCES semesters(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_offerings_teacher
        FOREIGN KEY (teacher_id) REFERENCES teachers(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_offerings_class
        FOREIGN KEY (class_id) REFERENCES classes(id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Một môn học được mở trong một học kỳ, do một giáo viên dạy';

CREATE INDEX idx_offerings_subject_id ON course_offerings(subject_id);
CREATE INDEX idx_offerings_semester_id ON course_offerings(semester_id);
CREATE INDEX idx_offerings_teacher_id ON course_offerings(teacher_id);

-- =====================================================================
-- 10. enrollments (Đăng ký môn học)
-- =====================================================================
CREATE TABLE enrollments (
    id                   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    student_id           INT UNSIGNED NOT NULL,
    course_offering_id   INT UNSIGNED NOT NULL,
    enrollment_date      DATE NOT NULL,
    status               ENUM('ENROLLED','COMPLETED','DROPPED') NOT NULL DEFAULT 'ENROLLED',
    created_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_enrollment_student_offering UNIQUE (student_id, course_offering_id),
    CONSTRAINT fk_enrollments_student
        FOREIGN KEY (student_id) REFERENCES students(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_enrollments_offering
        FOREIGN KEY (course_offering_id) REFERENCES course_offerings(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Sinh viên đăng ký học một lớp học phần. Không cho đăng ký trùng.';

CREATE INDEX idx_enrollments_student_id ON enrollments(student_id);
CREATE INDEX idx_enrollments_offering_id ON enrollments(course_offering_id);

-- =====================================================================
-- 11. grades (Điểm) - BẢNG QUAN TRỌNG NHẤT
-- total_score = attendance_score * 0.1 + midterm_score * 0.3 + final_score * 0.6
-- (trọng số chuẩn: chuyên cần 10%, giữa kỳ 30%, cuối kỳ 60%)
-- =====================================================================
CREATE TABLE grades (
    id                   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    enrollment_id        INT UNSIGNED NOT NULL,
    attendance_score     DECIMAL(4,2) NULL COMMENT 'Điểm chuyên cần 0-10',
    midterm_score        DECIMAL(4,2) NULL COMMENT 'Điểm giữa kỳ 0-10',
    final_score          DECIMAL(4,2) NOT NULL COMMENT 'Điểm cuối kỳ 0-10',
    total_score          DECIMAL(4,2) NOT NULL COMMENT 'Điểm tổng kết = 0.1*CC + 0.3*GK + 0.6*CK, 0-10',
    letter_grade         ENUM('A+','A','B+','B','C+','C','D','F') NOT NULL,
    result               ENUM('PASSED','FAILED') NOT NULL,
    updated_by           INT UNSIGNED NULL COMMENT 'user (giáo viên/admin) nhập/sửa điểm gần nhất',
    created_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_grades_enrollment UNIQUE (enrollment_id),
    CONSTRAINT chk_grades_attendance CHECK (attendance_score IS NULL OR (attendance_score BETWEEN 0 AND 10)),
    CONSTRAINT chk_grades_midterm CHECK (midterm_score IS NULL OR (midterm_score BETWEEN 0 AND 10)),
    CONSTRAINT chk_grades_final CHECK (final_score BETWEEN 0 AND 10),
    CONSTRAINT chk_grades_total CHECK (total_score BETWEEN 0 AND 10),
    CONSTRAINT fk_grades_enrollment
        FOREIGN KEY (enrollment_id) REFERENCES enrollments(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_grades_updated_by
        FOREIGN KEY (updated_by) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Điểm của sinh viên cho một lượt đăng ký (enrollment). Không lưu tên SV/môn/học kỳ trực tiếp.';

CREATE INDEX idx_grades_final_score ON grades(final_score);
CREATE INDEX idx_grades_result ON grades(result);

-- =====================================================================
-- 12. grade_history (Lịch sử thay đổi điểm)
-- =====================================================================
CREATE TABLE grade_history (
    id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    grade_id       INT UNSIGNED NOT NULL,
    old_score      DECIMAL(4,2) NULL,
    new_score      DECIMAL(4,2) NULL,
    old_result     ENUM('PASSED','FAILED') NULL,
    new_result     ENUM('PASSED','FAILED') NULL,
    changed_by     INT UNSIGNED NULL,
    reason         VARCHAR(255) NULL,
    changed_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_history_grade
        FOREIGN KEY (grade_id) REFERENCES grades(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_history_changed_by
        FOREIGN KEY (changed_by) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Lịch sử mỗi lần điểm total_score bị sửa';

CREATE INDEX idx_history_grade_id ON grade_history(grade_id);

SET FOREIGN_KEY_CHECKS = 1;
