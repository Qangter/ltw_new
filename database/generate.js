/**
 * generate.js
 * Sinh toàn bộ dữ liệu mẫu (seed data) cho database diem_thi.
 * Chạy: node generate.js
 * Kết quả: ghi ra các file 03_seed_base.sql .. 12_seed_grade_history.sql
 *          và full_setup.sql (gộp 01+02+03..12)
 */
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// ---- deterministic PRNG (mulberry32) so the dataset is reproducible ----
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20260918);
const randInt = (min, max) => Math.floor(rnd() * (max - min + 1)) + min;
const pick = (arr) => arr[randInt(0, arr.length - 1)];
const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

function esc(str) {
  if (str === null || str === undefined) return 'NULL';
  return "'" + String(str).replace(/\\/g, '\\\\').replace(/'/g, "''") + "'";
}
function sqlDate(d) {
  return d.toISOString().slice(0, 10);
}

const OUT_DIR = __dirname;

// =====================================================================
// 1. DEPARTMENTS (8-10 khoa)
// =====================================================================
const departments = [
  ['CNTT', 'Công nghệ thông tin', 'Đào tạo về khoa học máy tính và phần mềm'],
  ['DTVT', 'Điện tử Viễn thông', 'Đào tạo kỹ sư điện tử, viễn thông'],
  ['KTPM', 'Kỹ thuật phần mềm', 'Đào tạo chuyên sâu về quy trình phát triển phần mềm'],
  ['ATTT', 'An toàn thông tin', 'Đào tạo chuyên gia bảo mật, an toàn hệ thống'],
  ['QTKD', 'Quản trị kinh doanh', 'Đào tạo về quản trị, kinh doanh'],
  ['TCNH', 'Tài chính Ngân hàng', 'Đào tạo về tài chính, ngân hàng, đầu tư'],
  ['KTOAN', 'Kế toán', 'Đào tạo về kế toán, kiểm toán'],
  ['NNA', 'Ngoại ngữ', 'Đào tạo tiếng Anh và các ngoại ngữ khác'],
  ['MMT', 'Mạng máy tính', 'Đào tạo về hạ tầng mạng và truyền thông dữ liệu'],
  ['KTE', 'Kinh tế', 'Đào tạo về kinh tế học ứng dụng'],
];

// =====================================================================
// 2. MAJORS (15-20 ngành), mỗi ngành gắn với 1 department theo mã khoa
// =====================================================================
const majorsRaw = [
  ['CNTT01', 'Công nghệ thông tin', 'CNTT'],
  ['CNTT02', 'Khoa học máy tính', 'CNTT'],
  ['CNTT03', 'Hệ thống thông tin', 'CNTT'],
  ['KTPM01', 'Kỹ thuật phần mềm', 'KTPM'],
  ['KTPM02', 'Phát triển ứng dụng di động', 'KTPM'],
  ['ATTT01', 'An toàn thông tin', 'ATTT'],
  ['MMT01', 'Mạng máy tính và truyền thông', 'MMT'],
  ['DTVT01', 'Điện tử viễn thông', 'DTVT'],
  ['DTVT02', 'Kỹ thuật máy tính', 'DTVT'],
  ['TMDPT', 'Truyền thông đa phương tiện', 'CNTT'],
  ['QTKD01', 'Quản trị kinh doanh', 'QTKD'],
  ['QTKD02', 'Marketing', 'QTKD'],
  ['QTKD03', 'Thương mại điện tử', 'QTKD'],
  ['TCNH01', 'Tài chính ngân hàng', 'TCNH'],
  ['TCNH02', 'Đầu tư tài chính', 'TCNH'],
  ['KTOAN01', 'Kế toán doanh nghiệp', 'KTOAN'],
  ['KTOAN02', 'Kiểm toán', 'KTOAN'],
  ['NNA01', 'Ngôn ngữ Anh', 'NNA'],
  ['KTE01', 'Kinh tế đối ngoại', 'KTE'],
  ['KTE02', 'Kinh tế đầu tư', 'KTE'],
];

// =====================================================================
// Vietnamese name pools
// =====================================================================
const HO = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Ngô', 'Dương', 'Lý'];
const DEM_MALE = ['Văn', 'Minh', 'Hoàng', 'Quốc', 'Gia', 'Thanh', 'Anh', 'Tuấn', 'Đức', 'Công', 'Hữu', 'Xuân'];
const DEM_FEMALE = ['Thị', 'Minh', 'Ngọc', 'Thanh', 'Gia', 'Anh', 'Thu', 'Hồng', 'Kim', 'Diệu', 'Bảo', 'Hải'];
const TEN_MALE = ['An', 'Bình', 'Cường', 'Dũng', 'Đức', 'Hùng', 'Khang', 'Long', 'Nam', 'Quân', 'Sơn', 'Tuấn', 'Việt', 'Phong', 'Kiên', 'Hải', 'Đạt', 'Khoa', 'Huy', 'Thắng', 'Trung', 'Tùng', 'Vinh', 'Bảo'];
const TEN_FEMALE = ['Anh', 'Chi', 'Hà', 'Lan', 'Linh', 'Mai', 'Ngọc', 'Phương', 'Trang', 'Thảo', 'Vy', 'My', 'Hương', 'Nhung', 'Quỳnh', 'Yến', 'Hiền', 'Thư', 'Giang', 'Nga', 'Tâm', 'Loan', 'Duyên', 'Xuân'];

function noAccent(str) {
  const map = { à:'a',á:'a',ạ:'a',ả:'a',ã:'a',â:'a',ầ:'a',ấ:'a',ậ:'a',ẩ:'a',ẫ:'a',ă:'a',ằ:'a',ắ:'a',ặ:'a',ẳ:'a',ẵ:'a',
    è:'e',é:'e',ẹ:'e',ẻ:'e',ẽ:'e',ê:'e',ề:'e',ế:'e',ệ:'e',ể:'e',ễ:'e',
    ì:'i',í:'i',ị:'i',ỉ:'i',ĩ:'i',
    ò:'o',ó:'o',ọ:'o',ỏ:'o',õ:'o',ô:'o',ồ:'o',ố:'o',ộ:'o',ổ:'o',ỗ:'o',ơ:'o',ờ:'o',ớ:'o',ợ:'o',ở:'o',ỡ:'o',
    ù:'u',ú:'u',ụ:'u',ủ:'u',ũ:'u',ư:'u',ừ:'u',ứ:'u',ự:'u',ử:'u',ữ:'u',
    ỳ:'y',ý:'y',ỵ:'y',ỷ:'y',ỹ:'y',
    đ:'d' };
  return str.toLowerCase().split('').map(c => map[c] !== undefined ? map[c] : c).join('');
}

function genName(gender) {
  const ho = pick(HO);
  const dem = gender === 'MALE' ? pick(DEM_MALE) : pick(DEM_FEMALE);
  const ten = gender === 'MALE' ? pick(TEN_MALE) : pick(TEN_FEMALE);
  return `${ho} ${dem} ${ten}`;
}

// =====================================================================
// Build departments / majors SQL objects with ids
// =====================================================================
const deptById = departments.map((d, i) => ({ id: i + 1, code: d[0], name: d[1], desc: d[2] }));
const deptByCode = Object.fromEntries(deptById.map(d => [d.code, d]));

const majors = majorsRaw.map((m, i) => ({
  id: i + 1,
  code: m[0],
  name: m[1],
  dept: deptByCode[m[2]],
}));

// =====================================================================
// classes: 25-35 lớp phân bố theo majors, năm nhập học 2021-2025
// =====================================================================
const ACADEMIC_YEARS = ['2021-2025', '2022-2026', '2023-2027', '2024-2028', '2025-2029'];
const YEAR_CODE = { '2021-2025': 'D21', '2022-2026': 'D22', '2023-2027': 'D23', '2024-2028': 'D24', '2025-2029': 'D25' };

const classes = [];
{
  let classId = 1;
  for (const yr of ACADEMIC_YEARS) {
    const chosen = shuffle(majors).slice(0, 7);
    chosen.forEach((maj, idx) => {
      const seq = String(idx + 1).padStart(2, '0');
      classes.push({
        id: classId++,
        code: `${YEAR_CODE[yr]}${maj.code.replace(/[^A-Z0-9]/g, '').slice(0, 6)}${seq}`,
        name: `${maj.name} - Khóa ${yr}`,
        major: maj,
        academic_year: yr,
        advisor_teacher_id: null, // filled after teachers are generated
      });
    });
  }
}

// =====================================================================
// USERS + TEACHERS (25) + ADMIN (1)
// =====================================================================
const SALT_ROUNDS = 10;
const adminHash = bcrypt.hashSync('admin123', SALT_ROUNDS);
const teacherHash = bcrypt.hashSync('teacher123', SALT_ROUNDS);
const studentHash = bcrypt.hashSync('student123', SALT_ROUNDS);

const users = []; // {id, username, password_hash, full_name, email, role, is_active}
const teachers = [];

// admin = user id 1
users.push({ id: 1, username: 'admin', password_hash: adminHash, full_name: 'Quản trị hệ thống', email: 'admin@dtu.edu.vn', role: 'ADMIN', is_active: 1 });

const usedTeacherNames = new Set();
function genUniqueTeacherName(gender) {
  let n;
  do { n = genName(gender); } while (usedTeacherNames.has(n));
  usedTeacherNames.add(n);
  return n;
}

let nextUserId = 2;
for (let i = 1; i <= 25; i++) {
  const gender = i % 3 === 0 ? 'FEMALE' : 'MALE';
  const fullName = genUniqueTeacherName(gender);
  const teacherCode = 'GV' + String(i).padStart(3, '0');
  const username = 'teacher' + String(i).padStart(2, '0');
  const email = `${noAccent(fullName).replace(/\s+/g, '.')}${i}@dtu.edu.vn`;
  const userId = nextUserId++;
  users.push({ id: userId, username, password_hash: teacherHash, full_name: fullName, email, role: 'TEACHER', is_active: 1 });
  const dept = deptById[(i - 1) % deptById.length];
  const titles = [null, null, 'ThS', 'ThS', 'TS', 'PGS.TS'];
  teachers.push({
    id: i,
    teacher_code: teacherCode,
    user_id: userId,
    department_id: dept.id,
    full_name: fullName,
    email,
    phone: '09' + String(randInt(10000000, 99999999)),
    academic_title: pick(titles),
  });
}

// assign advisor_teacher_id to classes now that teachers exist
classes.forEach((c, idx) => {
  // pick a teacher from the same department as the class's major when possible
  const sameDept = teachers.filter(t => t.department_id === c.major.dept.id);
  const t = sameDept.length ? pick(sameDept) : pick(teachers);
  c.advisor_teacher_id = t.id;
});

// =====================================================================
// STUDENTS (exactly 500) + their user accounts
// =====================================================================
const students = [];
const usedStudentCodes = new Set();
const today = new Date('2026-09-18');

for (let i = 1; i <= 500; i++) {
  const gender = i % 2 === 0 ? 'FEMALE' : 'MALE';
  const fullName = genName(gender);
  const cls = classes[(i - 1) % classes.length];
  const admissionYear = parseInt(cls.academic_year.slice(0, 4), 10);
  // age 18-25 relative to admission
  const birthYear = admissionYear - randInt(18, 20);
  const birthMonth = randInt(1, 12);
  const birthDay = randInt(1, 28);
  const dob = new Date(Date.UTC(birthYear, birthMonth - 1, birthDay));

  const studentCode = 'SV' + String(i).padStart(4, '0');
  usedStudentCodes.add(studentCode);
  const username = 'student' + String(i).padStart(3, '0');
  const userId = nextUserId++;
  users.push({ id: userId, username, password_hash: studentHash, full_name: fullName, email: `${username}@student.dtu.edu.vn`, role: 'STUDENT', is_active: 1 });

  // status distribution: mostly ACTIVE, a few graduated/suspended, weighted by cohort age
  let status = 'ACTIVE';
  const isOldCohort = admissionYear <= 2022;
  const r = rnd();
  if (isOldCohort && r < 0.15) status = 'GRADUATED';
  else if (r < 0.03) status = 'SUSPENDED';

  students.push({
    id: i,
    student_code: studentCode,
    user_id: userId,
    full_name: fullName,
    date_of_birth: dob,
    gender,
    class_id: cls.id,
    email: `${username}@student.dtu.edu.vn`,
    phone: '03' + String(randInt(10000000, 99999999)),
    address: `Số ${randInt(1, 300)}, Đường ${pick(['Lê Lợi', 'Trần Phú', 'Nguyễn Huệ', 'Hai Bà Trưng', 'Điện Biên Phủ', 'Nguyễn Trãi', 'Cách Mạng Tháng 8'])}, ${pick(['Hà Nội', 'Đà Nẵng', 'TP. Hồ Chí Minh', 'Hải Phòng', 'Cần Thơ', 'Huế'])}`,
    admission_year: admissionYear,
    status,
  });
}

// =====================================================================
// SUBJECTS (30-40)
// =====================================================================
const subjectsRaw = [
  ['IT001', 'Lập trình C++', 3, 'CNTT'],
  ['IT002', 'Cơ sở dữ liệu', 3, 'CNTT'],
  ['IT003', 'Lập trình Web', 3, 'CNTT'],
  ['IT004', 'Cấu trúc dữ liệu và giải thuật', 4, 'CNTT'],
  ['IT005', 'Lập trình Java', 3, 'CNTT'],
  ['IT006', 'Công nghệ phần mềm', 3, 'KTPM'],
  ['IT007', 'Hệ điều hành', 3, 'CNTT'],
  ['IT008', 'Mạng máy tính', 3, 'MMT'],
  ['IT009', 'Trí tuệ nhân tạo', 3, 'CNTT'],
  ['IT010', 'Xử lý ảnh', 3, 'CNTT'],
  ['IT011', 'Đồ họa máy tính', 3, 'CNTT'],
  ['IT012', 'An toàn thông tin', 3, 'ATTT'],
  ['IT013', 'Phân tích thiết kế hệ thống', 3, 'CNTT'],
  ['IT014', 'Phát triển ứng dụng di động', 3, 'KTPM'],
  ['IT015', 'Truyền thông đa phương tiện', 2, 'CNTT'],
  ['IT016', 'Kiến trúc máy tính', 3, 'DTVT'],
  ['IT017', 'Nhập môn lập trình', 3, 'CNTT'],
  ['IT018', 'Lập trình hướng đối tượng', 3, 'CNTT'],
  ['IT019', 'Khai phá dữ liệu', 3, 'CNTT'],
  ['IT020', 'Điện toán đám mây', 2, 'CNTT'],
  ['BM001', 'Toán cao cấp 1', 3, 'KTE'],
  ['BM002', 'Toán cao cấp 2', 3, 'KTE'],
  ['BM003', 'Xác suất thống kê', 3, 'KTE'],
  ['BM004', 'Tiếng Anh 1', 2, 'NNA'],
  ['BM005', 'Tiếng Anh 2', 2, 'NNA'],
  ['BM006', 'Tiếng Anh chuyên ngành', 2, 'NNA'],
  ['BM007', 'Kinh tế học đại cương', 2, 'KTE'],
  ['BM008', 'Pháp luật đại cương', 2, 'KTE'],
  ['BM009', 'Giáo dục thể chất 1', 1, 'KTE'],
  ['BM010', 'Giáo dục thể chất 2', 1, 'KTE'],
  ['BM011', 'Triết học Mác - Lênin', 3, 'KTE'],
  ['BM012', 'Kỹ năng mềm', 1, 'QTKD'],
  ['KT001', 'Nguyên lý kế toán', 3, 'KTOAN'],
  ['KT002', 'Kế toán tài chính', 3, 'KTOAN'],
  ['TC001', 'Tài chính doanh nghiệp', 3, 'TCNH'],
  ['TC002', 'Thị trường chứng khoán', 2, 'TCNH'],
  ['QT001', 'Quản trị học', 3, 'QTKD'],
  ['QT002', 'Marketing căn bản', 2, 'QTKD'],
];
const subjects = subjectsRaw.map((s, i) => ({
  id: i + 1, code: s[0], name: s[1], credits: s[2], department_id: deptByCode[s[3]].id,
}));

// =====================================================================
// SEMESTERS (6)
// =====================================================================
const semestersRaw = [
  ['HK1_2023_2024', 'Học kỳ 1 năm học 2023-2024', '2023-2024', '2023-09-04', '2024-01-14', 'COMPLETED'],
  ['HK2_2023_2024', 'Học kỳ 2 năm học 2023-2024', '2023-2024', '2024-02-05', '2024-06-16', 'COMPLETED'],
  ['HK1_2024_2025', 'Học kỳ 1 năm học 2024-2025', '2024-2025', '2024-09-02', '2025-01-12', 'COMPLETED'],
  ['HK2_2024_2025', 'Học kỳ 2 năm học 2024-2025', '2024-2025', '2025-02-03', '2025-06-15', 'COMPLETED'],
  ['HK1_2025_2026', 'Học kỳ 1 năm học 2025-2026', '2025-2026', '2025-09-01', '2026-01-11', 'ACTIVE'],
  ['HK2_2025_2026', 'Học kỳ 2 năm học 2025-2026', '2025-2026', '2026-02-02', '2026-06-14', 'UPCOMING'],
];
const semesters = semestersRaw.map((s, i) => ({
  id: i + 1, code: s[0], name: s[1], academic_year: s[2], start_date: s[3], end_date: s[4], status: s[5],
}));
const nonUpcomingSemesters = semesters.filter(s => s.status !== 'UPCOMING'); // semesters that actually have grade data

// =====================================================================
// COURSE_OFFERINGS: each subject opened in several of the completed/active semesters
// =====================================================================
const offerings = [];
{
  let offId = 1;
  for (const subj of subjects) {
    // subject offered in 3-5 semesters (out of the 5 non-upcoming ones)
    const semCount = randInt(3, 5);
    const semList = shuffle(nonUpcomingSemesters).slice(0, semCount);
    for (const sem of semList) {
      // taught by a teacher, preferably same department
      const sameDept = teachers.filter(t => t.department_id === subj.department_id);
      const teacher = sameDept.length ? pick(sameDept) : pick(teachers);
      // sometimes tie to a specific class cohort, sometimes open generally (class_id null)
      const classId = rnd() < 0.5 ? pick(classes).id : null;
      offerings.push({
        id: offId++,
        subject_id: subj.id,
        semester_id: sem.id,
        teacher_id: teacher.id,
        class_id: classId,
        room: `P.${randInt(1, 9)}0${randInt(1, 9)}`,
        schedule: `${pick(['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'])}, tiết ${pick(['1-3', '4-6', '7-9', '10-12'])}`,
        max_students: pick([60, 70, 80, 90, 100]),
      });
    }
  }
}
// index offerings by semester for enrollment generation
const offeringsBySemester = {};
for (const o of offerings) {
  (offeringsBySemester[o.semester_id] = offeringsBySemester[o.semester_id] || []).push(o);
}

// =====================================================================
// ENROLLMENTS + GRADES
// Each ACTIVE student enrolls in 5-10 subjects per completed/active semester
// they were already admitted for (admission_year's HK1 onward).
// =====================================================================
const enrollments = [];
const grades = [];
let enrollId = 1;
let gradeId = 1;

function semesterOrderIndex(semCode) {
  // returns numeric order to compare with admission
  const order = { HK1_2023_2024: 1, HK2_2023_2024: 2, HK1_2024_2025: 3, HK2_2024_2025: 4, HK1_2025_2026: 5, HK2_2025_2026: 6 };
  return order[semCode];
}
// map admission year -> earliest semester order the student could enroll from
function earliestSemesterOrderForAdmission(year) {
  if (year <= 2023) return 1;
  if (year === 2024) return 3;
  if (year === 2025) return 5;
  return 5;
}

function scoreToLetterResult(total) {
  let letter, result;
  if (total >= 9.0) letter = 'A+';
  else if (total >= 8.5) letter = 'A';
  else if (total >= 8.0) letter = 'B+';
  else if (total >= 7.0) letter = 'B';
  else if (total >= 6.5) letter = 'C+';
  else if (total >= 5.5) letter = 'C';
  else if (total >= 5.0) letter = 'D';
  else letter = 'F';
  result = total >= 5.0 ? 'PASSED' : 'FAILED';
  return { letter, result };
}

// generate a score biased so ~80% pass overall
function genScoreComponent() {
  // 78% of components healthy (5.5-10), 22% weak (0-6.5) to create realistic overlap & ~15-20% fail rate on total
  if (rnd() < 0.80) {
    return Math.round((5.5 + rnd() * 4.5) * 2) / 2; // 5.5 - 10.0 step .5
  }
  return Math.round((rnd() * 6.5) * 2) / 2; // 0 - 6.5 step .5
}

for (const stu of students) {
  const admissionOrder = earliestSemesterOrderForAdmission(stu.admission_year);
  const eligibleSemesters = semesters.filter(s => s.status !== 'UPCOMING' && semesterOrderIndex(s.code) >= admissionOrder);
  for (const sem of eligibleSemesters) {
    const semOfferings = offeringsBySemester[sem.id] || [];
    if (!semOfferings.length) continue;
    const numCourses = Math.min(semOfferings.length, randInt(5, 10));
    const chosenOfferings = shuffle(semOfferings).slice(0, numCourses);
    for (const off of chosenOfferings) {
      const enrollDate = new Date(sem.start_date);
      enrollDate.setUTCDate(enrollDate.getUTCDate() + randInt(0, 10));
      const isCompleted = sem.status === 'COMPLETED';
      const enrollment = {
        id: enrollId++,
        student_id: stu.id,
        course_offering_id: off.id,
        enrollment_date: enrollDate,
        status: isCompleted ? 'COMPLETED' : 'ENROLLED',
      };
      enrollments.push(enrollment);

      // Only completed semesters (and some active ones) get grades
      if (isCompleted || (sem.status === 'ACTIVE' && rnd() < 0.5)) {
        const attendance = genScoreComponent();
        const midterm = genScoreComponent();
        const final = genScoreComponent();
        let total = Math.round((attendance * 0.1 + midterm * 0.3 + final * 0.6) * 100) / 100;
        if (total > 10) total = 10;
        if (total < 0) total = 0;
        const { letter, result } = scoreToLetterResult(total);
        grades.push({
          id: gradeId++,
          enrollment_id: enrollment.id,
          attendance_score: attendance,
          midterm_score: midterm,
          final_score: final,
          total_score: total,
          letter_grade: letter,
          result,
          updated_by: teachers.find(t => t.id === off.teacher_id).user_id,
        });
      }
    }
  }
}

// =====================================================================
// GRADE_HISTORY (20-50 sample records) - simulate a phúc khảo correction
// =====================================================================
const gradeHistory = [];
{
  const sampleGrades = shuffle(grades).slice(0, 40);
  let hid = 1;
  for (const g of sampleGrades) {
    const oldScore = Math.max(0, Math.round((g.total_score - (0.5 + rnd() * 1.5)) * 100) / 100);
    const oldRes = scoreToLetterResult(oldScore).result;
    gradeHistory.push({
      id: hid++,
      grade_id: g.id,
      old_score: oldScore,
      new_score: g.total_score,
      old_result: oldRes,
      new_result: g.result,
      changed_by: g.updated_by,
      reason: pick(['Cập nhật sau khi phúc khảo', 'Sửa lỗi nhập điểm', 'Chấm lại bài thi cuối kỳ', 'Bổ sung điểm chuyên cần bị thiếu', 'Điều chỉnh theo quyết định của khoa']),
    });
  }
}

// =====================================================================
// WRITE SQL FILES
// =====================================================================
function chunkInsert(table, columns, rows, rowToValues, batchSize = 200) {
  let sql = '';
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    sql += `INSERT INTO ${table} (${columns.join(', ')}) VALUES\n`;
    sql += batch.map(r => `(${rowToValues(r).join(', ')})`).join(',\n');
    sql += ';\n\n';
  }
  return sql;
}

let out;

// 03_seed_base.sql : departments + majors
out = `-- 03_seed_base.sql : departments, majors\nUSE diem_thi;\n\n`;
out += chunkInsert('departments', ['id', 'department_code', 'department_name', 'description'], deptById,
  d => [d.id, esc(d.code), esc(d.name), esc(d.desc)]);
out += chunkInsert('majors', ['id', 'department_id', 'major_code', 'major_name', 'description'], majors,
  m => [m.id, m.dept.id, esc(m.code), esc(m.name), esc(`Ngành ${m.name} thuộc khoa ${m.dept.name}`)]);
fs.writeFileSync(path.join(OUT_DIR, '03_seed_base.sql'), out);

// 04_seed_users.sql : all 526 users (admin, teachers, students)
out = `-- 04_seed_users.sql : 1 admin + 25 teachers + 500 students = 526 users\nUSE diem_thi;\n\n`;
out += chunkInsert('users', ['id', 'username', 'password_hash', 'full_name', 'email', 'role', 'is_active'], users,
  u => [u.id, esc(u.username), esc(u.password_hash), esc(u.full_name), esc(u.email), esc(u.role), u.is_active]);
fs.writeFileSync(path.join(OUT_DIR, '04_seed_users.sql'), out);

// 06_seed_teachers.sql (teachers must exist before classes reference advisor_teacher_id)
out = `-- 06_seed_teachers.sql : 25 teachers\nUSE diem_thi;\n\n`;
out += chunkInsert('teachers', ['id', 'teacher_code', 'user_id', 'department_id', 'full_name', 'email', 'phone', 'academic_title'], teachers,
  t => [t.id, esc(t.teacher_code), t.user_id, t.department_id, esc(t.full_name), esc(t.email), esc(t.phone), esc(t.academic_title)]);
fs.writeFileSync(path.join(OUT_DIR, '06_seed_teachers.sql'), out);

// classes (part of base infra, but must come after teachers) -> put into 03b file referenced in full_setup ordering
out = `-- 03b_seed_classes.sql : 25-35 lớp (yêu cầu teachers đã có dữ liệu)\nUSE diem_thi;\n\n`;
out += chunkInsert('classes', ['id', 'class_code', 'class_name', 'major_id', 'academic_year', 'advisor_teacher_id'], classes,
  c => [c.id, esc(c.code), esc(c.name), c.major.id, esc(c.academic_year), c.advisor_teacher_id]);
fs.writeFileSync(path.join(OUT_DIR, '03b_seed_classes.sql'), out);

// 05_seed_students.sql
out = `-- 05_seed_students.sql : chính xác 500 sinh viên\nUSE diem_thi;\n\n`;
out += chunkInsert('students', ['id', 'student_code', 'user_id', 'full_name', 'date_of_birth', 'gender', 'class_id', 'email', 'phone', 'address', 'admission_year', 'status'], students,
  s => [s.id, esc(s.student_code), s.user_id, esc(s.full_name), esc(sqlDate(s.date_of_birth)), esc(s.gender), s.class_id, esc(s.email), esc(s.phone), esc(s.address), s.admission_year, esc(s.status)]);
fs.writeFileSync(path.join(OUT_DIR, '05_seed_students.sql'), out);

// 07_seed_subjects.sql
out = `-- 07_seed_subjects.sql : ${subjects.length} môn học\nUSE diem_thi;\n\n`;
out += chunkInsert('subjects', ['id', 'subject_code', 'subject_name', 'credits', 'department_id', 'description'], subjects,
  s => [s.id, esc(s.code), esc(s.name), s.credits, s.department_id, esc(`Môn học ${s.name}`)]);
fs.writeFileSync(path.join(OUT_DIR, '07_seed_subjects.sql'), out);

// 08_seed_semesters.sql
out = `-- 08_seed_semesters.sql : 6 học kỳ\nUSE diem_thi;\n\n`;
out += chunkInsert('semesters', ['id', 'semester_code', 'semester_name', 'academic_year', 'start_date', 'end_date', 'status'], semesters,
  s => [s.id, esc(s.code), esc(s.name), esc(s.academic_year), esc(s.start_date), esc(s.end_date), esc(s.status)]);
fs.writeFileSync(path.join(OUT_DIR, '08_seed_semesters.sql'), out);

// 09_seed_course_offerings.sql
out = `-- 09_seed_course_offerings.sql : ${offerings.length} lớp học phần\nUSE diem_thi;\n\n`;
out += chunkInsert('course_offerings', ['id', 'subject_id', 'semester_id', 'teacher_id', 'class_id', 'room', 'schedule', 'max_students'], offerings,
  o => [o.id, o.subject_id, o.semester_id, o.teacher_id, o.class_id === null ? 'NULL' : o.class_id, esc(o.room), esc(o.schedule), o.max_students]);
fs.writeFileSync(path.join(OUT_DIR, '09_seed_course_offerings.sql'), out);

// 10_seed_enrollments.sql
out = `-- 10_seed_enrollments.sql : ${enrollments.length} lượt đăng ký\nUSE diem_thi;\n\n`;
out += chunkInsert('enrollments', ['id', 'student_id', 'course_offering_id', 'enrollment_date', 'status'], enrollments,
  e => [e.id, e.student_id, e.course_offering_id, esc(sqlDate(e.enrollment_date)), esc(e.status)], 500);
fs.writeFileSync(path.join(OUT_DIR, '10_seed_enrollments.sql'), out);

// 11_seed_grades.sql
out = `-- 11_seed_grades.sql : ${grades.length} bản ghi điểm\nUSE diem_thi;\n\n`;
out += chunkInsert('grades', ['id', 'enrollment_id', 'attendance_score', 'midterm_score', 'final_score', 'total_score', 'letter_grade', 'result', 'updated_by'], grades,
  g => [g.id, g.enrollment_id, g.attendance_score, g.midterm_score, g.final_score, g.total_score, esc(g.letter_grade), esc(g.result), g.updated_by === null ? 'NULL' : g.updated_by], 500);
fs.writeFileSync(path.join(OUT_DIR, '11_seed_grades.sql'), out);

// 12_seed_grade_history.sql
out = `-- 12_seed_grade_history.sql : ${gradeHistory.length} bản ghi lịch sử sửa điểm\nUSE diem_thi;\n\n`;
out += chunkInsert('grade_history', ['id', 'grade_id', 'old_score', 'new_score', 'old_result', 'new_result', 'changed_by', 'reason'], gradeHistory,
  h => [h.id, h.grade_id, h.old_score, h.new_score, esc(h.old_result), esc(h.new_result), h.changed_by === null ? 'NULL' : h.changed_by, esc(h.reason)]);
fs.writeFileSync(path.join(OUT_DIR, '12_seed_grade_history.sql'), out);

// =====================================================================
// full_setup.sql : gộp toàn bộ
// =====================================================================
const fileOrder = [
  '01_create_database.sql',
  '02_schema.sql',
  '03_seed_base.sql',
  '04_seed_users.sql',
  '06_seed_teachers.sql',
  '03b_seed_classes.sql',
  '05_seed_students.sql',
  '07_seed_subjects.sql',
  '08_seed_semesters.sql',
  '09_seed_course_offerings.sql',
  '10_seed_enrollments.sql',
  '11_seed_grades.sql',
  '12_seed_grade_history.sql',
];
let full = `-- =====================================================================\n-- full_setup.sql\n-- Chạy 1 lần để tạo toàn bộ database diem_thi kèm dữ liệu mẫu\n-- Cách chạy: mysql -u root -p < full_setup.sql\n-- =====================================================================\n\n`;
for (const f of fileOrder) {
  full += `-- ############################################################\n-- FILE: ${f}\n-- ############################################################\n`;
  full += fs.readFileSync(path.join(OUT_DIR, f), 'utf8');
  full += '\n';
}
fs.writeFileSync(path.join(OUT_DIR, 'full_setup.sql'), full);

// =====================================================================
// Summary + data for excel export
// =====================================================================
const summary = {
  departments: deptById.length,
  majors: majors.length,
  classes: classes.length,
  users: users.length,
  admins: users.filter(u => u.role === 'ADMIN').length,
  teachers_role: users.filter(u => u.role === 'TEACHER').length,
  students_role: users.filter(u => u.role === 'STUDENT').length,
  teachers: teachers.length,
  students: students.length,
  subjects: subjects.length,
  semesters: semesters.length,
  course_offerings: offerings.length,
  enrollments: enrollments.length,
  grades: grades.length,
  grade_history: gradeHistory.length,
  passed: grades.filter(g => g.result === 'PASSED').length,
  failed: grades.filter(g => g.result === 'FAILED').length,
};
fs.writeFileSync(path.join(OUT_DIR, 'summary.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));

// Data for excel sample (student_code, full_name, subject_code, subject_name, credits, semester_name, academic_year, score)
const subjById = Object.fromEntries(subjects.map(s => [s.id, s]));
const semById = Object.fromEntries(semesters.map(s => [s.id, s]));
const offById = Object.fromEntries(offerings.map(o => [o.id, o]));
const stuById = Object.fromEntries(students.map(s => [s.id, s]));

const excelRows = [];
const sampleGradesForExcel = shuffle(grades).slice(0, 80);
for (const g of sampleGradesForExcel) {
  const enr = enrollments.find(e => e.id === g.enrollment_id);
  const off = offById[enr.course_offering_id];
  const subj = subjById[off.subject_id];
  const sem = semById[off.semester_id];
  const stu = stuById[enr.student_id];
  excelRows.push({
    student_code: stu.student_code,
    full_name: stu.full_name,
    subject_code: subj.code,
    subject_name: subj.name,
    credits: subj.credits,
    semester_name: sem.name,
    academic_year: sem.academic_year,
    score: g.total_score,
  });
}
fs.writeFileSync(path.join(OUT_DIR, 'excel_sample_data.json'), JSON.stringify(excelRows, null, 2));

console.log('DONE. Files written to', OUT_DIR);
