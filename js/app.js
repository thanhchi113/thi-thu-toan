// App Controller chính cho Cổng Luyện Thi & Quản Lý Môn Toán THPT QG 2027
// Phong cách Azota & Interactive Test GDPT 2018 (Hỗ trợ Box-digit 4 ô, Palette câu hỏi, Confetti, Themes, IndexedDB PDF Storage)

const App = {
  ADMIN_RECOVERY_EMAIL: 'badaoqn132@gmail.com',

  ACCENT_PRESETS: [
    { id: 'indigo',  name: 'Chàm Cổ Điển',  hex: '#4f46e5' },
    { id: 'ocean',   name: 'Xanh Đại Dương', hex: '#0284c7' },
    { id: 'emerald', name: 'Ngọc Lục Bảo',   hex: '#059669' },
    { id: 'violet',  name: 'Tím Hoàng Gia',  hex: '#7c3aed' },
    { id: 'rose',    name: 'Đỏ Ruby',        hex: '#e11d48' },
    { id: 'teal',    name: 'Xanh Cổ Vịt',    hex: '#0d9488' },
    { id: 'amber',   name: 'Cam Hổ Phách',   hex: '#d97706' }
  ],

  state: {
    currentUser: null,       // { role: 'admin' | 'student', ... }
    admin: null,             // Hồ sơ & mật khẩu Giáo viên quản trị
    students: [],
    exams: [],
    homeworks: [],
    submissions: [],
    
    // Trạng thái bài thi đang làm
    activeExam: null,
    resolvedPdfUrl: null,     // URL thực tế của PDF (Blob URL từ IndexedDB hoặc file nội bộ)
    answers: { 
      part1: {}, 
      part2: {}, 
      part3: {},              // lưu { 1: ['','','',''], 2: ... }
      flagged: {}             // câu hỏi được đánh dấu xem lại
    },
    examStartTime: null,
    timerInterval: null,
    secondsLeft: 0,
    tabSwitchesCount: 0,      // Giám sát số lần rời tab
    activeSectionTab: 'p1',   // 'p1' | 'p2' | 'p3'
    paletteFilter: 'all',     // 'all' | 'unanswered' | 'answered' | 'flagged'
    activePart3Target: { qId: 1, boxIdx: 0 },
    theme: 'light',           // 'light' | 'sepia' | 'dark'
    accentHex: '#4f46e5',     // Mã màu chủ đạo (#RRGGBB)
    accentPreset: 'indigo',   // ID bộ màu chọn sẵn hoặc 'custom'
    contrast: 'normal',       // 'normal' (WCAG AA+) | 'high' (WCAG AAA)
    fontSizeDelta: 0,

    // Bộ nhớ tạm khi Giáo viên tải file PDF & thiết lập đáp án
    tempSelectedPdfFile: null,
    tempSelectedSolutionPdfFile: null,
    answerKeyDraft: null,

    // Quản lý hiển thị Bảng điểm & Học sinh Admin
    adminViewTab: 'matrix',   // 'matrix' (Sổ điểm tổng hợp các đợt) | 'log' (Chi tiết từng lượt nộp)
    adminGradeFilter: 'ALL',  // 'ALL' hoặc 6..12
    adminClassFilter: 'ALL',  // 'ALL' hoặc tên lớp ('12A1', '12A2')
    studentGradeFilter: 'ALL', // 'ALL' hoặc 6..12

    // Bộ lọc & Tìm kiếm Đề thi (Giáo viên & Học sinh)
    examSearchQuery: '',
    examGradeFilter: 'ALL',     // 'ALL' hoặc 6..12
    examCategoryFilter: 'ALL',  // 'ALL' | 'GK1' | 'CK1' | 'GK2' | 'CK2' | 'TS10' | 'THPTQG' | 'KHAOSAT'
    examStatusFilter: 'ALL',    // 'ALL' | 'active' | 'inactive'
    studentExamSearchQuery: '',
    studentExamGradeFilter: 'ALL',
    studentExamCategoryFilter: 'ALL',

    // Bộ lọc & Tìm kiếm Tài liệu & Chuyên đề theo Khối 6 – 12
    hwSearchQuery: '',
    hwGradeFilter: 'ALL',
    studentHwSearchQuery: '',
    studentHwGradeFilter: 'ALL',

    // Cấu hình quyền xem điểm và chế độ ẩn danh
    settings: {
      allowStudentViewOwnScore: true,    // Cho phép học sinh tra cứu điểm của bản thân
      allowStudentViewClassBoard: true,  // Cho phép học sinh xem bảng điểm/thứ hạng của lớp
      anonymizeOtherStudents: true,      // Ẩn thông tin các bạn khác để bảo vệ sự riêng tư
    },
    studentScoreTab: 'mine',             // 'mine' (Kết quả cá nhân) | 'classBoard' (Bảng xếp hạng lớp)
  },

  EXAM_CATEGORIES: [
    { id: 'GK1', label: 'Giữa kì 1 (GK1)', short: 'GK1', icon: 'fa-star-half-stroke', badge: 'bg-sky-50 text-sky-700 border-sky-200' },
    { id: 'CK1', label: 'Cuối kì 1 (CK1)', short: 'CK1', icon: 'fa-award', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    { id: 'GK2', label: 'Giữa kì 2 (GK2)', short: 'GK2', icon: 'fa-star-half-stroke', badge: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
    { id: 'CK2', label: 'Cuối kì 2 (CK2)', short: 'CK2', icon: 'fa-medal', badge: 'bg-purple-50 text-purple-700 border-purple-200' },
    { id: 'TS10', label: 'Đề thi vào 10', short: 'Vào 10', icon: 'fa-school', badge: 'bg-rose-50 text-rose-700 border-rose-200' },
    { id: 'THPTQG', label: 'Thi thử THPT QG', short: 'THPT QG', icon: 'fa-graduation-cap', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { id: 'KHAOSAT', label: 'Khảo sát & Chuyên đề', short: 'Khảo sát', icon: 'fa-clipboard-check', badge: 'bg-amber-50 text-amber-700 border-amber-200' }
  ],

  getExamCategoryMeta(catId) {
    return this.EXAM_CATEGORIES.find(c => c.id === catId) || this.EXAM_CATEGORIES[0];
  },

  inferExamCategory(ex) {
    if (ex && ex.category && this.EXAM_CATEGORIES.some(c => c.id === ex.category)) return ex.category;
    const text = `${ex?.title || ''} ${ex?.roundLabel || ''} ${ex?.pdf_name || ''} ${ex?.pdf_url || ''}`;
    if (ex?.category === 'GK') return /(?:k[ìỳ]|hk)\s*2|\bgk\s*2\b/i.test(text) ? 'GK2' : 'GK1';
    if (ex?.category === 'CK') return /(?:k[ìỳ]|hk)\s*2|\bck\s*2\b/i.test(text) ? 'CK2' : 'CK1';
    if (/giữa\s*(?:học\s*)?k[ìỳ]\s*2|\bgk\s*2\b/i.test(text)) return 'GK2';
    if (/giữa\s*(?:học\s*)?k[ìỳ](?:\s*1)?|\bgk\s*1?\b/i.test(text)) return 'GK1';
    if (/cuối\s*(?:học\s*)?k[ìỳ]\s*2|học\s*k[ìỳ]\s*2|\bck\s*2\b/i.test(text)) return 'CK2';
    if (/cuối\s*(?:học\s*)?k[ìỳ](?:\s*1)?|học\s*k[ìỳ]\s*1|\bck\s*1?\b/i.test(text)) return 'CK1';
    if (/vào\s*(?:lớp\s*)?10|tuyển\s*sinh\s*10|\bts\s*10\b/i.test(text)) return 'TS10';
    if (/thpt\s*qg|thpt\s*quốc\s*gia|tốt\s*nghiệp\s*thpt|thi\s*thử\s*thpt/i.test(text)) return 'THPTQG';
    return 'KHAOSAT';
  },

  syncGradeByCategory(catValue, gradeSelectId) {
    const sel = document.getElementById(gradeSelectId);
    if (!sel) return;
    if (catValue === 'TS10') sel.value = '9';
    else if (catValue === 'THPTQG') sel.value = '12';
  },

  renderExamGradePillsHtml(examsSource, activeGrade, fnName) {
    const list = examsSource || [];
    const curGrade = activeGrade || 'ALL';
    return `
      <div class="flex flex-wrap items-center gap-1.5">
        <span class="text-[11px] font-bold text-slate-500 mr-1 inline-flex items-center gap-1">
          <i class="fa-solid fa-layer-group text-indigo-500"></i><span>Khối lớp:</span>
        </span>
        <button type="button" onclick="${fnName}('grade', 'ALL')" class="px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${curGrade === 'ALL' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}">
          Tất cả khối (${list.length})
        </button>
        ${[6, 7, 8, 9, 10, 11, 12].map(g => {
          const cnt = list.filter(e => Number(e.grade || 12) === g).length;
          const active = String(curGrade) === String(g);
          return `
            <button type="button" onclick="${fnName}('grade', '${g}')" class="px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer inline-flex items-center gap-1.5 ${active ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}">
              <span>Khối ${g}</span>
              ${cnt > 0 ? `<span class="px-1.5 py-0.2 rounded-full text-[10px] font-mono ${active ? 'bg-indigo-700 text-white' : 'bg-indigo-50 text-indigo-700'}">${cnt}</span>` : ''}
            </button>
          `;
        }).join('')}
      </div>
    `;
  },

  renderExamCategoryPillsHtml(examsSource, gradeFilter, activeCat, fnName) {
    const gFilter = gradeFilter || 'ALL';
    const curCat = activeCat || 'ALL';
    const inGrade = (examsSource || []).filter(e => gFilter === 'ALL' || String(e.grade || 12) === String(gFilter));
    return `
      <div class="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-200/70">
        <span class="text-[11px] font-bold text-slate-500 mr-1 inline-flex items-center gap-1">
          <i class="fa-solid fa-tags text-indigo-500"></i><span>Phân loại${gFilter !== 'ALL' ? ` (Khối ${gFilter})` : ''}:</span>
        </span>
        <button type="button" onclick="${fnName}('category', 'ALL')" class="px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${curCat === 'ALL' ? 'bg-slate-800 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}">
          Tất cả loại (${inGrade.length})
        </button>
        ${this.EXAM_CATEGORIES.map(c => {
          const cnt = inGrade.filter(e => (e.category || this.inferExamCategory(e)) === c.id).length;
          const active = curCat === c.id;
          return `
            <button type="button" onclick="${fnName}('category', '${c.id}')" class="px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer inline-flex items-center gap-1.5 ${active ? 'bg-slate-800 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}">
              <i class="fa-solid ${c.icon} ${active ? 'text-indigo-300' : 'text-slate-400'}"></i>
              <span>${c.label}</span>
              ${cnt > 0 ? `<span class="px-1.5 py-0.2 rounded-full text-[10px] font-mono ${active ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-700'}">${cnt}</span>` : ''}
            </button>
          `;
        }).join('')}
      </div>
    `;
  },

  init() {
    this.loadAppearance();
    this.applyAppearance();
    this.loadData();
    this.checkSession();
    this.initGlobalEvents();
    this.render();
    this.checkPasswordResetUrl();
  },

  initGlobalEvents() {
    // Giám sát rời tab thi & cảnh báo gian lận trực tiếp
    document.addEventListener('visibilitychange', () => {
      if (!App.state.activeExam) return;
      if (document.hidden) {
        App.state.tabSwitchesCount++;
        console.warn('Cảnh báo: Thí sinh rời màn hình bài thi! Lần vi phạm thứ: ', App.state.tabSwitchesCount);
      } else {
        // Học sinh vừa quay lại màn hình làm bài -> cảnh báo tức thì
        App.showAntiCheatWarning();
      }
    });

    // Ngăn chặn vô tình tải lại hoặc đóng tab khi đang thi
    window.addEventListener('beforeunload', (e) => {
      if (App.state.activeExam) {
        e.preventDefault();
        e.returnValue = 'Bài thi đang diễn ra! Nếu thoát trang, tiến trình của bạn sẽ bị mất.';
        return e.returnValue;
      }
    });
  },

  showAntiCheatWarning() {
    if (!this.state.activeExam || this.state.tabSwitchesCount <= 0) return;
    const existing = document.getElementById('antiCheatModal');
    if (existing) existing.remove();

    this.updateExamHeaderViolationBadge();

    const count = this.state.tabSwitchesCount;
    const modal = document.createElement('div');
    modal.id = 'antiCheatModal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-red-950/70 backdrop-blur-sm animate-fade-in';
    modal.innerHTML = `
      <div class="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl text-center space-y-5 border-2 border-red-500">
        <div class="w-16 h-16 mx-auto rounded-full bg-red-100 text-red-600 flex items-center justify-center text-3xl shadow-inner animate-bounce">
          <i class="fa-solid fa-triangle-exclamation"></i>
        </div>
        <div>
          <span class="text-xs font-bold uppercase tracking-wider text-red-600">Giám Sát Khảo Sát Trực Tuyến</span>
          <h3 class="text-lg font-extrabold text-slate-900 mt-1">CẢNH BÁO RỜI KHỎI BÀI THI!</h3>
          <p class="text-xs text-slate-600 mt-2 leading-relaxed">
            Hệ thống phát hiện bạn vừa chuyển tab hoặc rời khỏi giao diện làm bài.
          </p>
        </div>
        <div class="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-800">
          <div>Số lần ghi nhận rời tab: <strong class="text-red-700 text-base font-mono font-bold">${count}</strong> lần</div>
          <div class="text-[11px] text-red-600 mt-1">Lưu ý: Mọi hành vi rời màn hình đều được lưu vào biên bản nộp bài gửi Thầy/Cô.</div>
        </div>
        <button onclick="document.getElementById('antiCheatModal').remove();" class="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs shadow-md transition">
          Tôi Đã Hiểu & Tiếp Tục Làm Bài
        </button>
      </div>
    `;
    document.body.appendChild(modal);
  },

  updateExamHeaderViolationBadge() {
    const badge = document.getElementById('violationHeaderBadge');
    if (!badge) return;
    const count = this.state.tabSwitchesCount || 0;
    if (count > 0) {
      badge.className = 'flex items-center space-x-1 bg-red-100 border border-red-300 px-2 py-1 rounded-lg text-red-700 font-bold text-xs animate-pulse';
      badge.innerHTML = `<i class="fa-solid fa-triangle-exclamation text-red-600"></i><span>Rời tab: ${count} lần</span>`;
    }
  },

  // 1. Tải và đồng bộ dữ liệu với LocalStorage
  loadData() {
    const storedAdmin = localStorage.getItem('thpt_admin_account');
    const parsedAdmin = storedAdmin ? JSON.parse(storedAdmin) : {};
    this.state.admin = {
      ...INITIAL_SEED_DATA.admin,
      ...parsedAdmin,
      role: 'admin',
      email: this.ADMIN_RECOVERY_EMAIL
    };

    const storedStudents = localStorage.getItem('thpt_students');
    const storedExams = localStorage.getItem('thpt_exams');
    const storedHomeworks = localStorage.getItem('thpt_homeworks');
    const storedSubmissions = localStorage.getItem('thpt_submissions');

    let stus = storedStudents ? JSON.parse(storedStudents) : INITIAL_SEED_DATA.students;
    if (INITIAL_SEED_DATA.students) {
      INITIAL_SEED_DATA.students.forEach(st => {
        const existing = stus.find(x => x.studentId === st.studentId);
        if (!existing) {
          stus.push(st);
        } else {
          if (!existing.phone && st.phone) existing.phone = st.phone;
          if (!existing.parentName && st.parentName) existing.parentName = st.parentName;
          if (!existing.notes && st.notes) existing.notes = st.notes;
        }
      });
    }
    // Đảm bảo mọi học sinh đều có đủ trường và khối lớp chuẩn (6 – 12)
    stus.forEach(s => {
      if (s.phone === undefined) s.phone = '';
      if (s.parentName === undefined) s.parentName = '';
      if (s.notes === undefined) s.notes = '';
      if (!s.status) s.status = 'active';
      s.grade = this.getStudentGrade(s);
    });
    this.state.students = stus;
    
    let examsList = storedExams ? JSON.parse(storedExams) : (INITIAL_SEED_DATA.exams || [SAMPLE_EXAM_2027]);
    if (INITIAL_SEED_DATA.exams) {
      INITIAL_SEED_DATA.exams.forEach(se => {
        if (!examsList.find(e => e.id === se.id)) {
          examsList.push(se);
        }
      });
    }
    // Đảm bảo đề mặc định luôn đồng bộ với file PDF thực tế và đáp án chuẩn 2027
    const defIdx = examsList.findIndex(e => e.id === 'EXAM-2027-01');
    if (defIdx !== -1) {
      examsList[defIdx] = {
        ...SAMPLE_EXAM_2027,
        ...examsList[defIdx],
        roundLabel: examsList[defIdx].roundLabel || 'Đợt 1',
        title: examsList[defIdx].title || SAMPLE_EXAM_2027.title,
        pdf_url: examsList[defIdx].pdf_url || 'de-toan-12-le-thanh-tong.pdf',
        solution_pdf_url: examsList[defIdx].solution_pdf_url || 'dethi_toan_thpt_2027_ma101.pdf',
        part1: Array.isArray(examsList[defIdx].part1) && examsList[defIdx].part1.length > 0 ? examsList[defIdx].part1 : SAMPLE_EXAM_2027.part1,
        part2: Array.isArray(examsList[defIdx].part2) && examsList[defIdx].part2.length > 0 ? examsList[defIdx].part2 : SAMPLE_EXAM_2027.part2,
        part3: Array.isArray(examsList[defIdx].part3) && examsList[defIdx].part3.length > 0 ? examsList[defIdx].part3 : SAMPLE_EXAM_2027.part3
      };
    } else {
      examsList.unshift({ ...SAMPLE_EXAM_2027, roundLabel: 'Đợt 1', solution_pdf_url: 'dethi_toan_thpt_2027_ma101.pdf' });
    }
    // Đảm bảo tất cả đề thi chỉ dùng định dạng PDF thuần túy, có bảng đáp án 3 phần, khối lớp 6-12 và phân quyền
    examsList.forEach(ex => {
      delete ex.raw_tex;
      delete ex.html_exam_key;
      delete ex.solution_html_key;
      if (!ex.pdf_url || /^(tex:|idb_html:)/.test(ex.pdf_url)) ex.pdf_url = 'de-toan-12-le-thanh-tong.pdf';
      if (ex.solution_pdf_url && /^(tex:|idb_html:)/.test(ex.solution_pdf_url)) ex.solution_pdf_url = '';
      if (ex.solution_pdf_url === undefined && ex.id && ex.id.startsWith('EXAM-2027-')) {
        ex.solution_pdf_url = 'dethi_toan_thpt_2027_ma101.pdf';
      }
      if (!Array.isArray(ex.part1)) ex.part1 = SAMPLE_EXAM_2027.part1;
      if (!Array.isArray(ex.part2)) ex.part2 = SAMPLE_EXAM_2027.part2;
      if (!Array.isArray(ex.part3)) ex.part3 = SAMPLE_EXAM_2027.part3;
      if (ex.allow_view_answers === undefined) ex.allow_view_answers = true;
      if (!ex.grade) {
        const match = (ex.title + ' ' + (ex.pdf_url || '')).match(/(?:Toán|Khối|Lớp)\s*(1[0-2]|[6-9])/i);
        ex.grade = match ? parseInt(match[1]) : 12;
      }
      if (!ex.roundLabel) {
        const roundMatch = (ex.title || '').match(/Đợt\s*([0-9]+)/i);
        ex.roundLabel = roundMatch ? `Đợt ${roundMatch[1]}` : 'Đợt 1';
      }
      if (!ex.category || !this.EXAM_CATEGORIES.some(c => c.id === ex.category)) {
        const seedMatch = (INITIAL_SEED_DATA.exams || []).find(se => se.id === ex.id);
        ex.category = (seedMatch && seedMatch.category) ? seedMatch.category : this.inferExamCategory(ex);
      }
      if (ex.allowed_all === undefined) ex.allowed_all = true;
      if (!ex.allowed_grades) ex.allowed_grades = [ex.grade || 12];
      if (!ex.allowed_students) ex.allowed_students = [];
      if (!ex.access_type) ex.access_type = ex.allowed_all ? 'all' : (ex.allowed_grades.length ? 'grade' : 'custom');
    });
    this.state.exams = examsList;

    this.state.homeworks = storedHomeworks ? JSON.parse(storedHomeworks) : INITIAL_SEED_DATA.homeworks;
    if (this.state.homeworks) {
      this.state.homeworks.forEach(hw => {
        delete hw.htmlDocKey;
        if (!hw.pdfUrl || /^(https:\/\/raw\.githubusercontent\.com|tex:|idb_html:)/.test(hw.pdfUrl)) {
          hw.pdfUrl = hw.id === 'HW-2027-01' ? 'dethi_toan_thpt_2027_ma101.pdf' : 'de-toan-12-le-thanh-tong.pdf';
        }
        if (!hw.grade) {
          const seedHw = (INITIAL_SEED_DATA.homeworks || []).find(sh => sh.id === hw.id);
          if (seedHw && seedHw.grade) {
            hw.grade = seedHw.grade;
          } else {
            const txt = `${hw.title || ''} ${hw.fileName || ''}`;
            const m = txt.match(/(?:Toán|Khối|Lớp)\s*(1[0-2]|[6-9])/i);
            hw.grade = m ? parseInt(m[1], 10) : (/vào\s*(?:lớp\s*)?10/i.test(txt) ? 9 : 12);
          }
        }
        if (!hw.accessType) hw.accessType = hw.allowedAll ? 'all' : 'selected';
      });
    }

    let subs = storedSubmissions ? JSON.parse(storedSubmissions) : INITIAL_SEED_DATA.submissions;
    if (INITIAL_SEED_DATA.submissions) {
      INITIAL_SEED_DATA.submissions.forEach(ss => {
        if (!subs.find(x => x.id === ss.id)) {
          subs.push(ss);
        }
      });
    }
    this.state.submissions = subs;

    // Tải cấu hình quyền riêng tư & xem điểm
    const defaultSettings = {
      allowStudentViewOwnScore: true,
      allowStudentViewClassBoard: true,
      anonymizeOtherStudents: true,
      allowStudentViewAnswers: true,
    };
    const storedSettings = localStorage.getItem('thpt_settings');
    this.state.settings = storedSettings ? { ...defaultSettings, ...JSON.parse(storedSettings) } : defaultSettings;
    if (typeof this.state.settings.allowStudentViewAnswers === 'undefined') {
      this.state.settings.allowStudentViewAnswers = true;
    }

    this.saveData();
  },

  saveData() {
    try {
      if (this.state.admin) {
        localStorage.setItem('thpt_admin_account', JSON.stringify({
          ...this.state.admin,
          role: 'admin',
          email: this.ADMIN_RECOVERY_EMAIL
        }));
      }
      localStorage.setItem('thpt_students', JSON.stringify(this.state.students));
      // Không lưu các chuỗi base64 khổng lồ vào localStorage
      const safeExams = this.state.exams.map(e => ({
        ...e,
        pdf_url: (e.pdf_url && e.pdf_url.startsWith('data:')) ? 'de-toan-12-le-thanh-tong.pdf' : e.pdf_url
      }));
      localStorage.setItem('thpt_exams', JSON.stringify(safeExams));
      localStorage.setItem('thpt_homeworks', JSON.stringify(this.state.homeworks));
      localStorage.setItem('thpt_submissions', JSON.stringify(this.state.submissions));
      localStorage.setItem('thpt_settings', JSON.stringify(this.state.settings));
    } catch (e) {
      console.warn('LocalStorage limit, continuing in memory.', e);
    }
  },

  // Hệ thống Hộp thoại Thông báo & Xác nhận đồng bộ giao diện toàn web
  showDialog({
    type = 'info',
    title = '',
    message = '',
    icon = '',
    confirmText = 'Đã hiểu',
    cancelText = '',
    onConfirm = null,
    onCancel = null
  } = {}) {
    const existing = document.getElementById('appSystemDialog');
    if (existing) existing.remove();

    const themes = {
      success: {
        badge: 'bg-emerald-50 text-emerald-600 border-emerald-200',
        btn: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200/70',
        icon: 'fa-circle-check',
        defaultTitle: 'Thao tác thành công'
      },
      error: {
        badge: 'bg-red-50 text-red-600 border-red-200',
        btn: 'bg-red-600 hover:bg-red-700 shadow-red-200/70',
        icon: 'fa-circle-xmark',
        defaultTitle: 'Không thể thực hiện'
      },
      danger: {
        badge: 'bg-red-50 text-red-600 border-red-200',
        btn: 'bg-red-600 hover:bg-red-700 shadow-red-200/70',
        icon: 'fa-trash-can',
        defaultTitle: 'Xác nhận xóa dữ liệu'
      },
      warning: {
        badge: 'bg-amber-50 text-amber-600 border-amber-200',
        btn: 'bg-amber-600 hover:bg-amber-700 shadow-amber-200/70',
        icon: 'fa-triangle-exclamation',
        defaultTitle: 'Lưu ý hệ thống'
      },
      info: {
        badge: 'bg-indigo-50 text-indigo-600 border-indigo-200',
        btn: 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200/70',
        icon: 'fa-circle-info',
        defaultTitle: 'Thông báo hệ thống'
      }
    };

    const t = themes[type] || themes.info;
    const finalTitle = title || t.defaultTitle;
    const finalIcon = icon || t.icon;
    const safeMsg = String(message || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');

    return new Promise(resolve => {
      const overlay = document.createElement('div');
      overlay.id = 'appSystemDialog';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in';
      overlay.style.zIndex = '90';

      overlay.innerHTML = `
        <div class="dialog-card bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-200 text-center space-y-4">
          <div class="w-14 h-14 mx-auto rounded-2xl border flex items-center justify-center text-2xl shadow-sm ${t.badge}">
            <i class="fa-solid ${finalIcon}"></i>
          </div>
          <div class="space-y-1.5">
            <h3 class="text-base sm:text-lg font-extrabold text-slate-900 leading-snug">${finalTitle}</h3>
            <p class="text-xs sm:text-sm text-slate-600 leading-relaxed">${safeMsg}</p>
          </div>
          <div class="${cancelText ? 'grid grid-cols-2 gap-2.5' : 'flex'} pt-2">
            ${cancelText ? `
              <button type="button" id="appDialogCancelBtn" class="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer">
                ${cancelText}
              </button>
            ` : ''}
            <button type="button" id="appDialogConfirmBtn" class="w-full py-2.5 px-4 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition inline-flex items-center justify-center gap-1.5 cursor-pointer ${t.btn}">
              <span>${confirmText}</span>
            </button>
          </div>
        </div>
      `;

      const close = (confirmed) => {
        document.removeEventListener('keydown', onKey);
        overlay.remove();
        if (confirmed && typeof onConfirm === 'function') onConfirm();
        if (!confirmed && typeof onCancel === 'function') onCancel();
        resolve(confirmed);
      };

      const onKey = (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          close(false);
        }
      };

      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close(false);
      });
      document.addEventListener('keydown', onKey);
      document.body.appendChild(overlay);

      const confirmBtn = overlay.querySelector('#appDialogConfirmBtn');
      const cancelBtn = overlay.querySelector('#appDialogCancelBtn');
      if (confirmBtn) {
        confirmBtn.addEventListener('click', () => close(true));
        confirmBtn.focus();
      }
      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => close(false));
      }
    });
  },

  notify(message, type = 'info', title = '', confirmText = 'Đã hiểu') {
    return this.showDialog({ type, title, message, confirmText });
  },

  confirmDialog(message, onConfirm, options = {}) {
    return this.showDialog({
      type: options.type || 'warning',
      title: options.title || 'Xác nhận thao tác',
      message,
      icon: options.icon || '',
      confirmText: options.confirmText || 'Xác nhận',
      cancelText: options.cancelText || 'Hủy bỏ',
      onConfirm
    });
  },

  // 2. Quản lý Đăng nhập / Phiên làm việc
  checkSession() {
    const session = sessionStorage.getItem('thpt_current_user');
    if (session) {
      const parsed = JSON.parse(session);
      if (parsed && parsed.role === 'admin' && this.state.admin) {
        this.state.currentUser = { ...this.state.admin };
        sessionStorage.setItem('thpt_current_user', JSON.stringify(this.state.currentUser));
      } else if (parsed && parsed.role === 'student') {
        const fresh = this.state.students.find(x => x.studentId === parsed.studentId);
        this.state.currentUser = fresh ? { role: 'student', ...fresh } : { ...parsed, grade: this.getStudentGrade(parsed) };
        sessionStorage.setItem('thpt_current_user', JSON.stringify(this.state.currentUser));
      } else {
        this.state.currentUser = parsed;
      }
    }
  },

  loginStudent(studentId, password) {
    const s = this.state.students.find(
      x => x.studentId.trim().toUpperCase() === studentId.trim().toUpperCase() && x.password === password
    );
    if (!s) {
      this.notify('Mã học sinh hoặc mật khẩu không chính xác! Vui lòng kiểm tra lại.', 'error', 'Đăng nhập thất bại');
      return false;
    }
    if (s.status !== 'active') {
      this.notify('Tài khoản của bạn đang bị tạm khóa. Vui lòng liên hệ Thầy/Cô giáo để mở khóa.', 'warning', 'Tài khoản tạm khóa');
      return false;
    }
    this.state.currentUser = { role: 'student', ...s };
    sessionStorage.setItem('thpt_current_user', JSON.stringify(this.state.currentUser));
    this.render();
    return true;
  },

  loginAdmin(username, password) {
    const adminAcc = this.state.admin || INITIAL_SEED_DATA.admin;
    const inputUser = String(username || '').trim().toLowerCase();
    const targetUser = String(adminAcc.username || 'admin').trim().toLowerCase();
    if (inputUser === targetUser && password === adminAcc.password) {
      this.state.currentUser = { ...adminAcc, role: 'admin', email: this.ADMIN_RECOVERY_EMAIL };
      sessionStorage.setItem('thpt_current_user', JSON.stringify(this.state.currentUser));
      this.render();
      return true;
    }
    this.notify('Tên đăng nhập hoặc mật khẩu Quản trị không chính xác!', 'error', 'Đăng nhập thất bại');
    return false;
  },

  logout() {
    this.clearIntervalTimer();
    this.state.currentUser = null;
    this.state.activeExam = null;
    this.state.studentExamSearchQuery = '';
    this.state.studentExamGradeFilter = 'ALL';
    this.state.studentExamCategoryFilter = 'ALL';
    this.state.examSearchQuery = '';
    this.state.examGradeFilter = 'ALL';
    this.state.examCategoryFilter = 'ALL';
    this.state.examStatusFilter = 'ALL';
    this.state.studentGradeFilter = 'ALL';
    this.state.adminGradeFilter = 'ALL';
    sessionStorage.removeItem('thpt_current_user');
    this.render();
  },

  // 3. Quản lý Giao diện (Sáng / Dịu mắt / Tối), Bộ màu tùy chỉnh & Độ tương phản WCAG
  normalizeHex(hex) {
    const raw = String(hex || '').trim().replace(/^#/, '');
    if (/^[0-9a-fA-F]{3}$/.test(raw)) {
      return '#' + raw.split('').map(c => c + c).join('').toLowerCase();
    }
    if (/^[0-9a-fA-F]{6}$/.test(raw)) {
      return '#' + raw.toLowerCase();
    }
    return '#4f46e5';
  },

  hexToRgb(hex) {
    const h = this.normalizeHex(hex).slice(1);
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  },

  rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
  },

  hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360;
    s = Math.max(0, Math.min(100, s)) / 100;
    l = Math.max(0, Math.min(100, l)) / 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; }
    else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; }
    else { r = c; b = x; }
    return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
  },

  relativeLuminance(r, g, b) {
    const lin = [r, g, b].map(v => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
  },

  contrastRatio(rgb1, rgb2) {
    const l1 = this.relativeLuminance(rgb1[0], rgb1[1], rgb1[2]);
    const l2 = this.relativeLuminance(rgb2[0], rgb2[1], rgb2[2]);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  },

  generateAccentScale(hex, highContrast = false) {
    const [r, g, b] = this.hexToRgb(hex);
    const [h, s, l] = this.rgbToHsl(r, g, b);
    const sat = s < 8 ? s : Math.min(92, Math.max(s, 45));

    // Đảm bảo mức 600 (nút thao tác chính chữ trắng #ffffff) luôn đạt chuẩn tương phản WCAG AA+ (>=4.8) hoặc AAA (>=6.2)
    const minPrimaryContrast = highContrast ? 6.2 : 4.8;
    let l600 = Math.min(48, Math.max(24, l));
    while (l600 > 14 && this.contrastRatio(this.hslToRgb(h, sat, l600), [255, 255, 255]) < minPrimaryContrast) {
      l600 -= 1;
    }

    // Đảm bảo mức 700 (chữ nhấn trên nền sáng #f8fafc) luôn đạt >=5.6 (AA+) hoặc >=7.0 (AAA)
    const minLightTextContrast = highContrast ? 7.0 : 5.6;
    let l700 = Math.max(15, l600 - 7);
    while (l700 > 12 && this.contrastRatio(this.hslToRgb(h, sat, l700), [248, 250, 252]) < minLightTextContrast) {
      l700 -= 1;
    }

    // Đảm bảo mức 300 (chữ nhấn trên nền thẻ tối #131c31) luôn đạt >=6.5 (AA+) hoặc >=8.2 (AAA)
    const minDarkTextContrast = highContrast ? 8.2 : 6.5;
    let l300 = highContrast ? 79 : 74;
    while (l300 < 90 && this.contrastRatio(this.hslToRgb(h, Math.min(90, sat), l300), [19, 28, 49]) < minDarkTextContrast) {
      l300 += 1;
    }

    const l500 = Math.min(60, l600 + 9);
    const l400 = Math.round((l300 + l500) / 2);
    const l800 = Math.max(12, l700 - 6);
    const l900 = Math.max(9, l800 - 5);
    const l950 = Math.max(6, l900 - 5);

    const stops = {
      50:  this.hslToRgb(h, Math.min(100, sat + 8), 97),
      100: this.hslToRgb(h, Math.min(96, sat + 6), 93),
      200: this.hslToRgb(h, Math.min(94, sat + 4), 86),
      300: this.hslToRgb(h, Math.min(90, sat), l300),
      400: this.hslToRgb(h, sat, l400),
      500: this.hslToRgb(h, sat, l500),
      600: this.hslToRgb(h, sat, l600),
      700: this.hslToRgb(h, sat, l700),
      800: this.hslToRgb(h, sat, l800),
      900: this.hslToRgb(h, sat, l900),
      950: this.hslToRgb(h, Math.min(95, sat + 5), l950)
    };

    const result = {};
    Object.keys(stops).forEach(k => {
      result[k] = stops[k].join(' ');
    });
    result._meta = {
      primaryHex: '#' + stops[600].map(v => v.toString(16).padStart(2, '0')).join(''),
      primaryContrast: this.contrastRatio(stops[600], [255, 255, 255]),
      darkTextContrast: this.contrastRatio(stops[300], [19, 28, 49])
    };
    return result;
  },

  loadAppearance() {
    try {
      const raw = localStorage.getItem('thpt_appearance');
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (['light', 'sepia', 'dark'].includes(saved.theme)) this.state.theme = saved.theme;
      if (['normal', 'high'].includes(saved.contrast)) this.state.contrast = saved.contrast;
      if (saved.accentHex) {
        this.state.accentHex = this.normalizeHex(saved.accentHex);
        const match = this.ACCENT_PRESETS.find(p => p.hex.toLowerCase() === this.state.accentHex);
        this.state.accentPreset = saved.accentPreset || (match ? match.id : 'custom');
      }
      if (typeof saved.fontSizeDelta === 'number') {
        this.state.fontSizeDelta = Math.max(-2, Math.min(6, saved.fontSizeDelta));
      }
    } catch (e) {
      // Bỏ qua nếu dữ liệu cũ lỗi định dạng
    }
  },

  saveAppearance() {
    try {
      localStorage.setItem('thpt_appearance', JSON.stringify({
        theme: this.state.theme,
        accentHex: this.state.accentHex,
        accentPreset: this.state.accentPreset,
        contrast: this.state.contrast,
        fontSizeDelta: this.state.fontSizeDelta
      }));
    } catch (e) {}
  },

  applyAppearance() {
    if (typeof document === 'undefined') return;
    document.body.setAttribute('data-theme', this.state.theme || 'light');
    document.body.setAttribute('data-contrast', this.state.contrast || 'normal');
    document.documentElement.style.fontSize = `${16 + (this.state.fontSizeDelta || 0)}px`;

    const scale = this.generateAccentScale(this.state.accentHex || '#4f46e5', this.state.contrast === 'high');
    ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'].forEach(k => {
      document.documentElement.style.setProperty(`--accent-${k}`, scale[k]);
    });
    this._lastAccentMeta = scale._meta;
  },

  getThemeMeta(th = this.state.theme) {
    if (th === 'dark') return { id: 'dark', label: 'Tối', icon: 'fa-moon' };
    if (th === 'sepia') return { id: 'sepia', label: 'Dịu mắt', icon: 'fa-book-open' };
    return { id: 'light', label: 'Sáng', icon: 'fa-sun' };
  },

  refreshOpenThemeModal() {
    const modalBody = document.getElementById('themeCustomizerModalBody');
    if (modalBody) {
      modalBody.innerHTML = this.renderAppearanceControlsHtml('modal');
    }
  },

  setTheme(th) {
    if (!['light', 'sepia', 'dark'].includes(th)) return;
    this.state.theme = th;
    this.saveAppearance();
    this.applyAppearance();
    this.render();
    this.refreshOpenThemeModal();
  },

  cycleTheme() {
    const next = this.state.theme === 'light' ? 'sepia' : (this.state.theme === 'sepia' ? 'dark' : 'light');
    this.setTheme(next);
  },

  setContrast(level) {
    this.state.contrast = level === 'high' ? 'high' : 'normal';
    this.saveAppearance();
    this.applyAppearance();
    this.render();
    this.refreshOpenThemeModal();
  },

  setAccentPreset(presetId) {
    const preset = this.ACCENT_PRESETS.find(p => p.id === presetId);
    if (!preset) return;
    this.state.accentPreset = preset.id;
    this.state.accentHex = preset.hex;
    this.saveAppearance();
    this.applyAppearance();
    this.render();
    this.refreshOpenThemeModal();
  },

  setAccentColor(hex, isLiveInput = false) {
    const clean = this.normalizeHex(hex);
    const match = this.ACCENT_PRESETS.find(p => p.hex.toLowerCase() === clean);
    this.state.accentHex = clean;
    this.state.accentPreset = match ? match.id : 'custom';
    this.saveAppearance();
    this.applyAppearance();

    if (isLiveInput) {
      const meta = this._lastAccentMeta || { primaryContrast: 4.8 };
      const ratioStr = meta.primaryContrast.toFixed(1) + ':1';
      const gradeStr = meta.primaryContrast >= 6.0 ? 'Chuẩn AAA' : 'Chuẩn AA+';
      document.querySelectorAll('[data-appearance-hex-input]').forEach(el => {
        if (document.activeElement !== el) el.value = clean.toUpperCase();
      });
      document.querySelectorAll('[data-appearance-color-input]').forEach(el => {
        if (document.activeElement !== el) el.value = clean;
      });
      document.querySelectorAll('[data-appearance-contrast-badge]').forEach(el => {
        el.textContent = `Độ tương phản nút chính: ${ratioStr} • ${gradeStr}`;
      });
      document.querySelectorAll('[data-appearance-swatch-dot]').forEach(el => {
        el.style.backgroundColor = meta.primaryHex || clean;
      });
      document.querySelectorAll('[data-preset-btn]').forEach(btn => {
        const active = btn.getAttribute('data-preset-btn') === this.state.accentPreset;
        btn.classList.toggle('ring-2', active);
        btn.classList.toggle('ring-indigo-500', active);
        btn.classList.toggle('border-indigo-500', active);
      });
      return;
    }

    this.render();
    this.refreshOpenThemeModal();
  },

  handleHexTextInput(val) {
    const trimmed = String(val || '').trim();
    const withHash = trimmed.startsWith('#') ? trimmed : '#' + trimmed;
    if (/^#[0-9a-fA-F]{6}$/.test(withHash)) {
      this.setAccentColor(withHash, true);
    }
  },

  adjustFontSize(delta) {
    this.state.fontSizeDelta = Math.max(-2, Math.min(6, (this.state.fontSizeDelta || 0) + delta));
    this.saveAppearance();
    this.applyAppearance();
    const pct = Math.round(((16 + this.state.fontSizeDelta) / 16) * 100) + '%';
    document.querySelectorAll('[data-appearance-fontsize]').forEach(el => { el.textContent = pct; });
  },

  resetFontSize() {
    this.state.fontSizeDelta = 0;
    this.saveAppearance();
    this.applyAppearance();
    document.querySelectorAll('[data-appearance-fontsize]').forEach(el => { el.textContent = '100%'; });
  },

  resetAppearance() {
    this.state.theme = 'light';
    this.state.accentHex = '#4f46e5';
    this.state.accentPreset = 'indigo';
    this.state.contrast = 'normal';
    this.state.fontSizeDelta = 0;
    this.saveAppearance();
    this.applyAppearance();
    this.render();
    this.refreshOpenThemeModal();
  },

  renderAppearanceControlsHtml(context = 'modal') {
    const meta = this._lastAccentMeta || this.generateAccentScale(this.state.accentHex, this.state.contrast === 'high')._meta;
    const ratioStr = meta.primaryContrast.toFixed(1) + ':1';
    const gradeStr = meta.primaryContrast >= 6.0 ? 'Chuẩn AAA' : 'Chuẩn AA+';
    const fontPct = Math.round(((16 + (this.state.fontSizeDelta || 0)) / 16) * 100) + '%';

    const themes = [
      { id: 'light', title: 'Sáng (Light)', desc: 'Nền trắng thanh thoát, rõ nét ban ngày', icon: 'fa-sun', previewBg: '#f8fafc', previewCard: '#ffffff', previewText: '#0f172a', previewBorder: '#cbd5e1' },
      { id: 'sepia', title: 'Dịu mắt (Sepia)', desc: 'Giấy ấm chống mỏi mắt khi luyện đề lâu', icon: 'fa-book-open', previewBg: '#f4ecd8', previewCard: '#fdf9f0', previewText: '#241b10', previewBorder: '#d8c6a8' },
      { id: 'dark',  title: 'Tối (Dark)', desc: 'Nền tối sâu giảm chói, tương phản cao', icon: 'fa-moon', previewBg: '#0b1120', previewCard: '#131c31', previewText: '#f8fafc', previewBorder: '#334155' }
    ];

    return `
      <div class="space-y-5">
        <!-- 1. Chế độ Sáng / Dịu mắt / Tối -->
        <div>
          <div class="flex items-center justify-between mb-2.5">
            <label class="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <i class="fa-solid fa-circle-half-stroke text-indigo-600"></i>
              <span>1. Chế độ nền Sáng / Tối</span>
            </label>
            <span class="text-[11px] font-semibold text-slate-500">Đang dùng: <strong class="text-indigo-600">${this.getThemeMeta().label}</strong></span>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            ${themes.map(t => {
              const active = this.state.theme === t.id;
              return `
                <button type="button" id="${context}Theme_${t.id}" onclick="App.setTheme('${t.id}')"
                  class="p-3 rounded-xl text-left transition cursor-pointer border-2 ${active ? 'border-indigo-600 bg-indigo-50/60 shadow-xs' : 'border-slate-200 bg-white hover:border-slate-300'}">
                  <div class="flex items-center justify-between mb-2">
                    <span class="inline-flex items-center gap-1.5 text-xs font-extrabold text-slate-900">
                      <i class="fa-solid ${t.icon} ${active ? 'text-indigo-600' : 'text-slate-500'}"></i>
                      <span>${t.title}</span>
                    </span>
                    ${active ? '<i class="fa-solid fa-circle-check text-indigo-600 text-sm"></i>' : ''}
                  </div>
                  <div class="h-7 rounded-lg p-1.5 flex items-center justify-between mb-1.5" style="background:${t.previewBg}; border:1px solid ${t.previewBorder};">
                    <div class="px-2 py-0.5 rounded text-[10px] font-bold" style="background:${t.previewCard}; color:${t.previewText};">Aa 123</div>
                    <div class="w-8 h-3 rounded-full bg-indigo-600"></div>
                  </div>
                  <p class="text-[11px] text-slate-500 leading-snug">${t.desc}</p>
                </button>
              `;
            }).join('')}
          </div>
        </div>

        <!-- 2. Bộ màu chủ đạo & Bảng chọn màu tùy ý -->
        <div>
          <div class="flex flex-wrap items-center justify-between gap-2 mb-2.5">
            <label class="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <i class="fa-solid fa-palette text-indigo-600"></i>
              <span>2. Bộ màu chủ đạo (Chọn sẵn hoặc đổi màu tùy ý)</span>
            </label>
            <span data-appearance-contrast-badge class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Độ tương phản nút chính: ${ratioStr} • ${gradeStr}
            </span>
          </div>

          <div class="grid ${context === 'modal' ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-4 xl:grid-cols-7'} gap-2 mb-3">
            ${this.ACCENT_PRESETS.map(p => {
              const active = this.state.accentPreset === p.id;
              return `
                <button type="button" data-preset-btn="${p.id}" id="${context}Preset_${p.id}" onclick="App.setAccentPreset('${p.id}')"
                  class="px-2.5 py-2 rounded-xl border ${active ? 'border-indigo-500 ring-2 ring-indigo-500 bg-indigo-50/50' : 'border-slate-200 bg-white hover:bg-slate-50'} flex items-center gap-2 text-left transition cursor-pointer">
                  <span class="w-5 h-5 rounded-full shrink-0 shadow-xs border border-black/10" style="background:${p.hex};"></span>
                  <span class="text-[11px] font-bold text-slate-800 leading-tight truncate">${p.name}</span>
                </button>
              `;
            }).join('')}
          </div>

          <!-- Thanh chọn màu tự do (Arbitrary Color Picker + HEX) -->
          <div class="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <label class="relative flex items-center cursor-pointer" title="Nhấn để chọn màu bất kỳ">
                <input type="color" data-appearance-color-input id="${context}CustomColorPicker" value="${this.state.accentHex}"
                  oninput="App.setAccentColor(this.value, true)"
                  class="w-10 h-10 rounded-xl border border-slate-300 cursor-pointer p-0.5 bg-white">
              </label>
              <div>
                <div class="text-xs font-bold text-slate-800">Tùy chọn màu tự do theo sở thích</div>
                <div class="text-[11px] text-slate-500">Tự động cân chỉnh độ sáng tối để chữ luôn sắc nét, dễ đọc</div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-[11px] font-bold text-slate-500">Mã HEX:</span>
              <input type="text" maxlength="7" data-appearance-hex-input id="${context}CustomHexInput" value="${this.state.accentHex.toUpperCase()}"
                oninput="App.handleHexTextInput(this.value)"
                onchange="App.setAccentColor(this.value, false)"
                placeholder="#4F46E5"
                class="w-28 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-mono font-bold text-slate-800 uppercase focus:border-indigo-500 outline-none">
            </div>
          </div>
        </div>

        <!-- 3. Mức độ tương phản & Cỡ chữ -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div class="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <i class="fa-solid fa-eye text-indigo-600"></i>
              <span>3. Mức độ tương phản hiển thị</span>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <button type="button" id="${context}Contrast_normal" onclick="App.setContrast('normal')"
                class="py-2 px-3 rounded-lg text-xs font-bold border transition cursor-pointer ${this.state.contrast !== 'high' ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'}">
                Tiêu chuẩn (AA+)
              </button>
              <button type="button" id="${context}Contrast_high" onclick="App.setContrast('high')"
                class="py-2 px-3 rounded-lg text-xs font-bold border transition cursor-pointer ${this.state.contrast === 'high' ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'}">
                Tương phản cao (AAA)
              </button>
            </div>
          </div>

          <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div class="flex items-center justify-between">
              <span class="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <i class="fa-solid fa-text-height text-indigo-600"></i>
                <span>4. Cỡ chữ toàn trang</span>
              </span>
              <button type="button" onclick="App.resetAppearance()" class="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer">
                <i class="fa-solid fa-rotate-left mr-1"></i>Đặt lại mặc định
              </button>
            </div>
            <div class="flex items-center gap-2">
              <button type="button" onclick="App.adjustFontSize(-1)" class="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-xs font-extrabold text-slate-700 cursor-pointer">A-</button>
              <button type="button" onclick="App.resetFontSize()" data-appearance-fontsize class="flex-1 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-mono font-bold text-slate-800 cursor-pointer" title="Nhấn để về 100%">${fontPct}</button>
              <button type="button" onclick="App.adjustFontSize(1)" class="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-xs font-extrabold text-slate-700 cursor-pointer">A+</button>
            </div>
          </div>
        </div>

        <!-- Khung xem trước trực quan độ tương phản -->
        <div class="p-3.5 rounded-xl bg-white border border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div class="space-y-0.5">
            <div class="text-xs font-extrabold text-slate-900">Xem trước độ rõ nét chữ &amp; công thức Toán</div>
            <div class="text-xs text-slate-600">Hàm số <span class="font-mono font-bold text-indigo-700">y = x³ - 3x + 2</span> đạt cực đại tại <span class="font-mono font-bold">x = -1</span>.</div>
          </div>
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">Nhãn chuyên đề</span>
            <span class="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white shadow-xs">Nút chính sắc nét</span>
          </div>
        </div>
      </div>
    `;
  },

  showThemeModal() {
    this.closeThemeModal();
    const modal = document.createElement('div');
    modal.id = 'themeCustomizerModal';
    modal.className = 'fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in';
    modal.innerHTML = `
      <div class="dialog-card bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div class="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-indigo-50/40 flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <i class="fa-solid fa-palette"></i>
            </div>
            <div>
              <h3 class="text-sm sm:text-base font-extrabold text-slate-900">Tùy Chỉnh Giao Diện, Bộ Màu &amp; Độ Tương Phản</h3>
              <p class="text-[11px] text-slate-500">Chuyển Sáng / Dịu mắt / Tối, đổi màu tùy ý và tối ưu độ nét dễ nhìn</p>
            </div>
          </div>
          <button type="button" onclick="App.closeThemeModal()" class="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer" title="Đóng">
            <i class="fa-solid fa-xmark text-base"></i>
          </button>
        </div>
        <div id="themeCustomizerModalBody" class="p-5 overflow-y-auto">
          ${this.renderAppearanceControlsHtml('modal')}
        </div>
        <div class="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span class="text-[11px] text-slate-500"><i class="fa-solid fa-floppy-disk text-indigo-600 mr-1"></i>Tự động lưu cho các phiên đăng nhập tiếp theo</span>
          <button type="button" onclick="App.closeThemeModal()" class="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer">
            Hoàn tất
          </button>
        </div>
      </div>
    `;
    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.closeThemeModal();
    });
    document.body.appendChild(modal);
  },

  closeThemeModal() {
    const existing = document.getElementById('themeCustomizerModal');
    if (existing) existing.remove();
  },

  // 4. Render Router chính
  render() {
    const appContainer = document.getElementById('app');
    if (!appContainer) return;

    if (this.state.activeExam) {
      this.renderExamRoom(appContainer);
      return;
    }

    if (!this.state.currentUser) {
      this.renderLoginView(appContainer);
      return;
    }

    if (this.state.currentUser.role === 'admin') {
      this.renderAdminDashboard(appContainer);
      return;
    }

    if (this.state.currentUser.role === 'student') {
      this.renderStudentPortal(appContainer);
      return;
    }
  },

  // --- VIEW: MÀN HÌNH ĐĂNG NHẬP ---
  renderLoginView(container) {
    const activeTab = this.state.loginTab === 'admin' ? 'admin' : 'student';
    const thMeta = this.getThemeMeta();
    const swatchHex = (this._lastAccentMeta && this._lastAccentMeta.primaryHex) || this.state.accentHex || '#4f46e5';

    container.innerHTML = `
      <div class="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative text-slate-900">
        <!-- Thanh công cụ Giao diện & Bộ màu nhanh ở góc phải -->
        <div class="fixed top-4 right-4 z-30 flex items-center gap-2">
          <button type="button" id="loginQuickThemeBtn" onclick="App.cycleTheme()" class="px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-sm hover:bg-slate-100 text-xs font-bold text-slate-700 inline-flex items-center gap-1.5 cursor-pointer" title="Chuyển nhanh chế độ Sáng / Dịu mắt / Tối">
            <i class="fa-solid ${thMeta.icon} text-indigo-600"></i>
            <span>${thMeta.label}</span>
          </button>
          <button type="button" id="loginThemeBtn" onclick="App.showThemeModal()" class="px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-sm hover:bg-slate-100 text-xs font-bold text-slate-700 inline-flex items-center gap-1.5 cursor-pointer" title="Đổi bộ màu chủ đạo & mức độ tương phản">
            <span data-appearance-swatch-dot class="w-3.5 h-3.5 rounded-full border border-black/15 shrink-0" style="background:${swatchHex};"></span>
            <span>Bộ màu &amp; Tương phản</span>
          </button>
        </div>

        <div class="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-500/25 mb-4">
            <i class="fa-solid fa-graduation-cap text-2xl text-white"></i>
          </div>
          <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            KHẢO THÍ &amp; LUYỆN ĐỀ TOÁN 6 – 12
          </h1>
          <p class="mt-2 text-sm font-semibold text-indigo-700">
            Kiểm tra định kì (GK1, CK1, GK2, CK2) • Đề thi vào 10 • Thi thử THPT QG
          </p>
        </div>

        <div class="mt-7 sm:mx-auto sm:w-full sm:max-w-md px-4">
          <div class="bg-white py-8 px-6 shadow-xl rounded-2xl border border-slate-200 sm:px-10">
            <div class="flex border-b border-slate-200 mb-6">
              <button id="tabStudentBtn" onclick="App.switchLoginTab('student')" class="flex-1 pb-3 text-center text-sm cursor-pointer ${activeTab === 'student' ? 'font-extrabold border-b-2 border-indigo-600 text-indigo-700' : 'font-semibold border-b-2 border-transparent text-slate-500 hover:text-slate-800'}">
                <i class="fa-solid fa-user-graduate mr-2"></i>Học sinh
              </button>
              <button id="tabAdminBtn" onclick="App.switchLoginTab('admin')" class="flex-1 pb-3 text-center text-sm cursor-pointer ${activeTab === 'admin' ? 'font-extrabold border-b-2 border-emerald-600 text-emerald-700' : 'font-semibold border-b-2 border-transparent text-slate-500 hover:text-slate-800'}">
                <i class="fa-solid fa-chalkboard-user mr-2"></i>Giáo viên
              </button>
            </div>

            <!-- Form Học sinh -->
            <form id="studentLoginForm" onsubmit="event.preventDefault(); App.handleStudentLogin();" class="space-y-4 ${activeTab === 'student' ? '' : 'hidden'}">
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-slate-700">Mã Học Sinh</label>
                <div class="mt-1 relative rounded-lg shadow-2xs">
                  <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <i class="fa-solid fa-id-card"></i>
                  </div>
                  <input type="text" id="loginStudentId" placeholder="Nhập mã học sinh (VD: HS202701)" required
                    class="block w-full pl-10 pr-3 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-medium">
                </div>
              </div>

              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-slate-700">Mật khẩu</label>
                <div class="mt-1 relative rounded-lg shadow-2xs">
                  <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <i class="fa-solid fa-lock"></i>
                  </div>
                  <input type="password" id="loginStudentPass" placeholder="Nhập mật khẩu" required
                    class="block w-full pl-10 pr-3 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-medium">
                </div>
              </div>

              <button type="submit" class="w-full mt-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all flex items-center justify-center cursor-pointer">
                <span>Đăng Nhập Cổng Học Sinh</span>
                <i class="fa-solid fa-arrow-right ml-2 text-xs"></i>
              </button>
            </form>

            <!-- Form Giáo viên -->
            <form id="adminLoginForm" onsubmit="event.preventDefault(); App.handleAdminLogin();" class="space-y-4 ${activeTab === 'admin' ? '' : 'hidden'}">
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-slate-700">Tài khoản Giáo viên</label>
                <div class="mt-1 relative rounded-lg shadow-2xs">
                  <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <i class="fa-solid fa-user-shield"></i>
                  </div>
                  <input type="text" id="loginAdminUser" placeholder="Nhập tên đăng nhập" required
                    class="block w-full pl-10 pr-3 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-medium">
                </div>
              </div>

              <div>
                <div class="flex items-center justify-between">
                  <label class="block text-xs font-bold uppercase tracking-wider text-slate-700">Mật khẩu Quản trị</label>
                  <button type="button" id="forgotAdminPassBtn" onclick="App.requestAdminPasswordReset()" class="text-xs font-bold text-emerald-700 hover:underline cursor-pointer">
                    Quên mật khẩu?
                  </button>
                </div>
                <div class="mt-1 relative rounded-lg shadow-2xs">
                  <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <i class="fa-solid fa-key"></i>
                  </div>
                  <input type="password" id="loginAdminPass" placeholder="Nhập mật khẩu quản trị" required
                    class="block w-full pl-10 pr-3 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-medium">
                </div>
              </div>

              <button type="submit" class="w-full mt-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all flex items-center justify-center cursor-pointer">
                <span>Đăng Nhập Cổng Giáo Viên</span>
                <i class="fa-solid fa-arrow-right ml-2 text-xs"></i>
              </button>
            </form>
          </div>
        </div>
      </div>
    `;
  },

  switchLoginTab(tab) {
    this.state.loginTab = tab === 'admin' ? 'admin' : 'student';
    const sBtn = document.getElementById('tabStudentBtn');
    const aBtn = document.getElementById('tabAdminBtn');
    const sForm = document.getElementById('studentLoginForm');
    const aForm = document.getElementById('adminLoginForm');
    if (!sBtn || !aBtn || !sForm || !aForm) return;

    if (this.state.loginTab === 'student') {
      sBtn.className = 'flex-1 pb-3 text-center text-sm font-extrabold border-b-2 border-indigo-600 text-indigo-700 cursor-pointer';
      aBtn.className = 'flex-1 pb-3 text-center text-sm font-semibold border-b-2 border-transparent text-slate-500 hover:text-slate-800 cursor-pointer';
      sForm.classList.remove('hidden');
      aForm.classList.add('hidden');
    } else {
      aBtn.className = 'flex-1 pb-3 text-center text-sm font-extrabold border-b-2 border-emerald-600 text-emerald-700 cursor-pointer';
      sBtn.className = 'flex-1 pb-3 text-center text-sm font-semibold border-b-2 border-transparent text-slate-500 hover:text-slate-800 cursor-pointer';
      aForm.classList.remove('hidden');
      sForm.classList.add('hidden');
    }
  },

  handleStudentLogin() {
    const id = document.getElementById('loginStudentId').value;
    const pass = document.getElementById('loginStudentPass').value;
    this.loginStudent(id, pass);
  },

  handleAdminLogin() {
    const user = document.getElementById('loginAdminUser').value;
    const pass = document.getElementById('loginAdminPass').value;
    this.loginAdmin(user, pass);
  },

  // Xác định khối lớp chuẩn (6 – 12) của học sinh: ưu tiên trường grade, dự phòng tách từ tên lớp
  getStudentGrade(st) {
    const g = Number(st && st.grade);
    if (Number.isInteger(g) && g >= 6 && g <= 12) return g;
    const m = String((st && st.className) || '').match(/(?:^|\D)(1[0-2]|[6-9])(?=\D|$)/);
    return m ? parseInt(m[1], 10) : 12;
  },

  syncGradeFromClassInput(clsValue, gradeSelectId) {
    const m = String(clsValue || '').match(/(?:^|\D)(1[0-2]|[6-9])(?=\D|$)/);
    const sel = document.getElementById(gradeSelectId);
    if (m && sel) sel.value = String(parseInt(m[1], 10));
  },

  syncClassFromGradeSelect(gradeValue, classInputId) {
    const inp = document.getElementById(classInputId);
    if (!inp) return;
    if (/^(1[0-2]|[6-9])A1$/i.test(inp.value.trim())) {
      inp.value = `${gradeValue}A1`;
    }
  },

  // Kiểm tra quyền dự thi của học sinh theo 3 chế độ: Tất cả / Theo khối (6-12) / Chỉ định
  isStudentAllowedExam(ex, u) {
    if (!ex || !ex.is_active || !u) return false;
    if (ex.allowed_all) return true;
    const studentGrade = this.getStudentGrade(u);
    if (ex.access_type === 'grade') {
      return Array.isArray(ex.allowed_grades) && ex.allowed_grades.map(Number).includes(studentGrade);
    }
    return Array.isArray(ex.allowed_students) && ex.allowed_students.includes(u.studentId);
  },

  // Tìm kiếm đề thi theo tên đề, đợt thi, loại đề (GK/CK/Vào 10/THPT QG), tên file PDF đề/đáp án, mã đề, khối lớp
  matchExamSearch(ex, query) {
    if (!query) return true;
    const q = String(query).toLowerCase().trim();
    if (!q) return true;
    const catMeta = this.getExamCategoryMeta(ex.category || this.inferExamCategory(ex));
    return [
      ex.title,
      ex.roundLabel,
      ex.id,
      ex.pdf_name,
      ex.pdf_url,
      ex.solution_pdf_name,
      ex.solution_pdf_url,
      catMeta.label,
      catMeta.short,
      ex.category,
      `khối ${ex.grade || 12}`,
      `lớp ${ex.grade || 12}`
    ].some(v => v && String(v).toLowerCase().includes(q));
  },

  isStudentAllowedHomework(hw, u) {
    if (!hw || !u) return false;
    if (hw.allowedAll || hw.accessType === 'all') return true;
    const studentGrade = this.getStudentGrade(u);
    if (hw.accessType === 'grade') return Number(hw.grade || 12) === studentGrade;
    return Array.isArray(hw.allowedStudents) && hw.allowedStudents.includes(u.studentId);
  },

  matchHwSearch(hw, query) {
    if (!query) return true;
    const q = String(query).toLowerCase().trim();
    if (!q) return true;
    return [
      hw.title,
      hw.description,
      hw.fileName,
      hw.id,
      `khối ${hw.grade || 12}`,
      `lớp ${hw.grade || 12}`,
      `toán ${hw.grade || 12}`
    ].some(v => v && String(v).toLowerCase().includes(q));
  },

  // --- VIEW: TRANG HỌC SINH (STUDENT PORTAL) ---
  renderStudentPortal(container) {
    const u = this.state.currentUser;
    const allowedExams = this.state.exams.filter(e => this.isStudentAllowedExam(e, u));
    const allowedHomeworks = this.state.homeworks.filter(h => this.isStudentAllowedHomework(h, u));
    const mySubmissions = this.state.submissions.filter(s => s.studentId === u.studentId);
    if (!this.state.studentMainTab) this.state.studentMainTab = 'exams';
    const thMeta = this.getThemeMeta();
    const swatchHex = (this._lastAccentMeta && this._lastAccentMeta.primaryHex) || this.state.accentHex || '#4f46e5';

    container.innerHTML = `
      <div class="min-h-screen bg-slate-50 flex flex-col">
        <!-- Header -->
        <header class="bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 shadow-xs">
          <div class="w-full max-w-[97%] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <div class="flex items-center space-x-3 cursor-pointer" onclick="App.goHome()" title="Về trang chủ">
              <div class="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-200">
                <i class="fa-solid fa-graduation-cap"></i>
              </div>
              <div>
                <span class="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Cổng Học Sinh</span>
                <h1 class="text-base sm:text-lg font-bold text-slate-800 leading-none">Khảo Thí Toán 6 – 12</h1>
              </div>
            </div>

            <div class="flex items-center space-x-2 sm:space-x-2.5">
              <!-- Nút Về Trang Chủ -->
              <button onclick="App.goHome()" class="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 border border-indigo-200 shadow-xs cursor-pointer" title="Về trang chủ">
                <i class="fa-solid fa-house"></i>
                <span class="hidden sm:inline">Trang chủ</span>
              </button>

              <!-- Nút Chuyển Nhanh Sáng/Tối & Bảng Màu -->
              <button id="studentQuickThemeBtn" onclick="App.cycleTheme()" class="p-2 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold transition border border-slate-200 shadow-xs cursor-pointer" title="Chuyển nhanh chế độ: Sáng / Dịu mắt / Tối">
                <i class="fa-solid ${thMeta.icon} text-indigo-600"></i>
              </button>
              <button id="studentThemeBtn" onclick="App.showThemeModal()" class="px-2.5 py-1.5 bg-white hover:bg-indigo-50 text-slate-700 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 border border-slate-200 shadow-xs cursor-pointer" title="Tùy chỉnh Sáng/Tối, Bộ màu & Độ tương phản">
                <span data-appearance-swatch-dot class="w-3.5 h-3.5 rounded-full border border-black/15 shrink-0" style="background:${swatchHex};"></span>
                <span class="hidden md:inline">Giao diện</span>
              </button>

              <!-- Nút Hồ Sơ Cá Nhân / Đổi Mật Khẩu -->
              <button onclick="App.showStudentSelfEditModal()" class="px-3 py-1.5 bg-white hover:bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 border border-slate-200 shadow-xs cursor-pointer" title="Hồ sơ cá nhân & Đổi mật khẩu">
                <i class="fa-solid fa-user-pen text-indigo-600"></i>
                <span class="hidden lg:inline">Hồ sơ cá nhân</span>
              </button>

              <div class="h-6 w-px bg-slate-200 hidden sm:block"></div>

              <div class="text-right hidden sm:block">
                <div class="text-sm font-bold text-slate-800">${u.fullName}</div>
                <div class="text-xs text-slate-500">Mã HS: <span class="font-mono font-semibold text-indigo-600">${u.studentId}</span> • Khối ${this.getStudentGrade(u)} • Lớp ${u.className || '12'}</div>
              </div>
              <button onclick="App.logout()" class="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition cursor-pointer" title="Đăng xuất">
                <i class="fa-solid fa-right-from-bracket"></i>
              </button>
            </div>
          </div>
        </header>

        <!-- Main Body -->
        <main class="w-full max-w-[97%] mx-auto px-4 sm:px-6 py-8 flex-1 space-y-6">
          <!-- Student Banner -->
          <div class="bg-gradient-to-r from-indigo-700 via-indigo-600 to-indigo-800 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
            <div class="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div class="inline-flex items-center space-x-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold mb-3">
                  <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Tài khoản đang hoạt động</span>
                </div>
                <h2 class="text-2xl sm:text-3xl font-extrabold">Xin chào, ${u.fullName}!</h2>
                <p class="text-indigo-100 text-sm mt-1">
                  Mã học sinh: <strong class="font-mono tracking-wider">${u.studentId}</strong> • Khối: <strong>Khối ${this.getStudentGrade(u)}</strong> • Lớp: <strong>${u.className || '12'}</strong>
                  ${u.phone ? ` • SĐT: <strong>${u.phone}</strong>` : ''}
                </p>
                <div class="mt-3.5">
                  <button onclick="App.showStudentSelfEditModal()" class="px-3.5 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 backdrop-blur-md border border-white/25 cursor-pointer shadow-xs">
                    <i class="fa-solid fa-user-pen"></i><span>Hồ sơ cá nhân &amp; Đổi mật khẩu</span>
                  </button>
                </div>
              </div>
              <div class="flex gap-3">
                <div class="bg-white/10 backdrop-blur-md rounded-xl p-3 text-center min-w-[96px]">
                  <div class="text-xs text-indigo-200">Đề được mở</div>
                  <div class="text-2xl font-bold font-mono">${allowedExams.length}</div>
                </div>
                <div class="bg-white/10 backdrop-blur-md rounded-xl p-3 text-center min-w-[96px]">
                  <div class="text-xs text-indigo-200">Lượt đã nộp</div>
                  <div class="text-2xl font-bold font-mono">${mySubmissions.length}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Thanh Điều Hướng Cổng Học Sinh -->
          <div class="bg-white rounded-2xl p-2.5 border border-slate-200 shadow-sm">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <nav class="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <button
                  id="studentTabExamsBtn"
                  onclick="App.setStudentMainTab('exams')"
                  class="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${this.state.studentMainTab === 'exams' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 ring-2 ring-indigo-500/25' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}"
                >
                  <i class="fa-solid fa-file-pen"></i>
                  <span>Đề Thi &amp; Kiểm Tra</span>
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-mono ${this.state.studentMainTab === 'exams' ? 'bg-indigo-700 text-white' : 'bg-white text-slate-700 shadow-2xs'}">
                    ${allowedExams.length} đề
                  </span>
                </button>

                <button
                  id="studentTabHomeworksBtn"
                  onclick="App.setStudentMainTab('homeworks')"
                  class="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${this.state.studentMainTab === 'homeworks' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 ring-2 ring-indigo-500/25' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}"
                >
                  <i class="fa-solid fa-book-open"></i>
                  <span>Tài Liệu &amp; Chuyên Đề</span>
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-mono ${this.state.studentMainTab === 'homeworks' ? 'bg-indigo-700 text-white' : 'bg-white text-slate-700 shadow-2xs'}">
                    ${allowedHomeworks.length}
                  </span>
                </button>

                <button
                  id="studentTabGradesBtn"
                  onclick="App.setStudentMainTab('grades')"
                  class="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${this.state.studentMainTab === 'grades' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 ring-2 ring-indigo-500/25' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}"
                >
                  <i class="fa-solid fa-chart-simple"></i>
                  <span>Kết Quả &amp; Xếp Hạng</span>
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-mono ${this.state.studentMainTab === 'grades' ? 'bg-indigo-700 text-white' : 'bg-white text-slate-700 shadow-2xs'}">
                    ${mySubmissions.length} lượt
                  </span>
                </button>
              </nav>
            </div>

            <div class="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
              <div class="flex items-center space-x-2 text-slate-600 font-medium">
                <i class="fa-solid fa-circle-info text-indigo-500 text-xs"></i>
                <span>
                  ${this.state.studentMainTab === 'exams' ? 'Chọn đề thi theo Khối 6 – 12 và phân loại (GK1, CK1, GK2, CK2, Đề thi vào 10, Thi thử THPT QG) để vào làm bài trực tuyến.' : ''}
                  ${this.state.studentMainTab === 'homeworks' ? 'Chọn tài liệu & chuyên đề theo Khối 6 – 12 để xem trực tiếp hoặc tải file PDF về máy.' : ''}
                  ${this.state.studentMainTab === 'grades' ? 'Tra cứu kết quả các lượt nộp bài, đối chiếu đáp án chi tiết và xem vị trí trên bảng xếp hạng lớp.' : ''}
                </span>
              </div>
              <div class="text-[11px] text-slate-400 hidden lg:block">
                Hệ thống Khảo thí Toán 6 – 12
              </div>
            </div>
          </div>

          <!-- Section Tabs Container -->
          <div class="space-y-6">
            ${this.state.studentMainTab === 'exams' ? `
            <!-- 1. Đề Thi & Kiểm Tra -->
            <section class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div class="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-gradient-to-r from-slate-50 via-white to-indigo-50/30">
                <div>
                  <h3 class="text-lg font-bold text-slate-900 flex items-center">
                    <i class="fa-solid fa-file-pen text-indigo-600 mr-2"></i>
                    Đề Thi &amp; Kiểm Tra Đang Mở (${allowedExams.length})
                  </h3>
                  <p class="text-xs text-slate-500 mt-0.5">Phân chia theo Khối 6 – 12 &amp; Phân loại (GK1, CK1, GK2, CK2, Đề thi vào 10, Thi thử THPT QG)</p>
                </div>
              </div>

              <!-- Thanh Phân Khối 6-12, Phân Loại Đề & Tìm Kiếm -->
              <div class="p-5 sm:p-6 pt-4 pb-3 border-b border-slate-100 bg-slate-50/60 space-y-2.5">
                ${this.renderExamGradePillsHtml(allowedExams, this.state.studentExamGradeFilter, 'App.onStudentExamFilterInput')}
                ${this.renderExamCategoryPillsHtml(allowedExams, this.state.studentExamGradeFilter, this.state.studentExamCategoryFilter, 'App.onStudentExamFilterInput')}

                <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div class="flex-1 relative">
                    <i class="fa-solid fa-magnifying-glass absolute left-3.5 top-2.5 text-slate-400 text-xs"></i>
                    <input
                      id="studentExamSearchInput"
                      type="text"
                      oninput="App.onStudentExamFilterInput('query', this.value)"
                      placeholder="Tìm theo tên đề thi, phân loại (GK1, CK1, GK2, CK2, Vào 10, THPT QG), đợt thi, tên file PDF..."
                      value="${this.state.studentExamSearchQuery || ''}"
                      class="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:border-indigo-500 outline-none transition"
                    />
                  </div>
                  <button onclick="App.resetStudentExamFilter()" class="px-3.5 py-2 bg-slate-200/80 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0">
                    <i class="fa-solid fa-rotate-left"></i><span>Đặt lại</span>
                  </button>
                </div>
              </div>

              <div id="studentExamListContainer" class="p-5 sm:p-6">
                ${this.renderStudentExamGridHtml(allowedExams, mySubmissions)}
              </div>
            </section>
            ` : ''}

            ${this.state.studentMainTab === 'homeworks' ? `
            <!-- 2. Tài Liệu & Chuyên Đề -->
            <section class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div class="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-gradient-to-r from-slate-50 via-white to-indigo-50/30">
                <div>
                  <h3 class="text-lg font-bold text-slate-900 flex items-center">
                    <i class="fa-solid fa-book-open text-indigo-600 mr-2"></i>
                    Tài Liệu &amp; Chuyên Đề (${allowedHomeworks.length})
                  </h3>
                  <p class="text-xs text-slate-500 mt-0.5">Phân chia theo Khối 6 – 12 • Tài liệu lý thuyết, chuyên đề trọng tâm và bài tập tự luyện</p>
                </div>
              </div>

              <!-- Thanh Phân Khối 6 – 12 & Tìm Kiếm Tài Liệu -->
              <div class="p-5 sm:p-6 pt-4 pb-3 border-b border-slate-100 bg-slate-50/60 space-y-2.5">
                ${this.renderExamGradePillsHtml(allowedHomeworks, this.state.studentHwGradeFilter, 'App.onStudentHwFilterInput')}

                <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 border-t border-slate-200/70">
                  <div class="flex-1 relative">
                    <i class="fa-solid fa-magnifying-glass absolute left-3.5 top-2.5 text-slate-400 text-xs"></i>
                    <input
                      id="studentHwSearchInput"
                      type="text"
                      oninput="App.onStudentHwFilterInput('query', this.value)"
                      placeholder="Tìm theo tên chuyên đề, mô tả, khối lớp (Khối 6 – 12), tên file PDF..."
                      value="${this.state.studentHwSearchQuery || ''}"
                      class="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:border-indigo-500 outline-none transition"
                    />
                  </div>
                  <button onclick="App.resetStudentHwFilter()" class="px-3.5 py-2 bg-slate-200/80 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0">
                    <i class="fa-solid fa-rotate-left"></i><span>Đặt lại</span>
                  </button>
                </div>
              </div>

              <div id="studentHwListContainer" class="p-5 sm:p-6">
                ${this.renderStudentHwGridHtml(allowedHomeworks)}
              </div>
            </section>
            ` : ''}

            ${this.state.studentMainTab === 'grades' ? `
            <!-- 3. Kết Quả & Xếp Hạng -->
            <section class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div class="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-gradient-to-r from-slate-50 via-white to-indigo-50/30">
                <div>
                  <h3 class="text-lg font-bold text-slate-900 flex items-center">
                    <i class="fa-solid fa-chart-simple text-indigo-600 mr-2"></i>
                    Kết Quả Làm Bài &amp; Bảng Xếp Hạng
                  </h3>
                  <p class="text-xs text-slate-500 mt-0.5">Theo dõi điểm số các lượt thi đã nộp và đối chiếu thứ hạng trong lớp</p>
                </div>

                ${(this.state.settings && this.state.settings.allowStudentViewClassBoard && this.state.settings.allowStudentViewOwnScore) ? `
                  <div class="bg-slate-100 p-1 rounded-xl border border-slate-200 flex text-xs font-semibold self-start sm:self-auto">
                    <button onclick="App.setStudentScoreTab('mine')" class="px-3 py-1.5 rounded-lg transition cursor-pointer ${this.state.studentScoreTab === 'mine' ? 'bg-white shadow-xs text-indigo-600 font-bold' : 'text-slate-600 hover:text-slate-900'}">
                      <i class="fa-solid fa-user mr-1.5"></i>Kết Quả Cá Nhân
                    </button>
                    <button onclick="App.setStudentScoreTab('classBoard')" class="px-3 py-1.5 rounded-lg transition cursor-pointer ${this.state.studentScoreTab === 'classBoard' ? 'bg-white shadow-xs text-indigo-600 font-bold' : 'text-slate-600 hover:text-slate-900'}">
                      <i class="fa-solid fa-ranking-star mr-1.5"></i>Bảng Xếp Hạng Lớp
                    </button>
                  </div>
                ` : ''}
              </div>

              <div class="p-5 sm:p-6">

              ${!(this.state.settings && this.state.settings.allowStudentViewOwnScore) ? `
                <!-- Trạng thái giáo viên khóa xem điểm -->
                <div class="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center text-amber-900 space-y-3">
                  <div class="w-12 h-12 mx-auto rounded-full bg-amber-100 flex items-center justify-center text-amber-600 text-xl font-bold shadow-sm">
                    <i class="fa-solid fa-lock"></i>
                  </div>
                  <h4 class="text-base font-bold">Điểm Thi Đang Được Giáo Viên Bảo Mật</h4>
                  <p class="text-xs text-amber-700 max-w-md mx-auto">
                    Bài làm của bạn đã được ghi nhận an toàn trên hệ thống. Giáo viên đang khóa chế độ xem điểm để tổng kết chung cho cả lớp. Kết quả sẽ hiển thị ngay khi giáo viên công bố.
                  </p>
                </div>
              ` : (this.state.studentScoreTab === 'classBoard' && this.state.settings && this.state.settings.allowStudentViewClassBoard) ? `
                <!-- TAB 2: BẢNG SO SÁNH VÀ XẾP HẠNG LỚP (CƠ CHẾ ẨN DANH THÔNG TIN BẠN KHÁC) -->
                <div class="space-y-4">
                  ${this.state.settings.anonymizeOtherStudents ? `
                    <div class="p-3.5 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-900 flex items-center space-x-2.5">
                      <div class="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 font-bold">
                        <i class="fa-solid fa-user-secret"></i>
                      </div>
                      <div class="text-[11px] leading-relaxed">
                        <strong>Chế độ so sánh ẩn danh đang BẬT:</strong> Thông tin họ tên và mã số của các bạn khác đã được ẩn để bảo vệ quyền riêng tư. Bạn hoàn toàn có thể đối chiếu điểm số của mình với thứ hạng chung của cả lớp.
                      </div>
                    </div>
                  ` : ''}

                  <div class="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <div class="overflow-x-auto">
                      <table class="min-w-full divide-y divide-slate-200 text-left text-sm">
                        <thead class="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                          <tr>
                            <th class="px-4 py-3.5 text-center font-bold w-14">Hạng</th>
                            <th class="px-4 py-3.5 font-bold font-mono">Mã HS</th>
                            <th class="px-5 py-3.5 font-bold">Học Sinh</th>
                            <th class="px-4 py-3.5 text-center font-bold">Khối / Lớp</th>
                            ${this.state.exams.map((ex, idx) => `
                              <th class="px-4 py-3.5 text-center font-bold min-w-[100px]">
                                <div class="text-indigo-900 font-extrabold">${ex.roundLabel || ('Đợt ' + (idx + 1))}</div>
                              </th>
                            `).join('')}
                            <th class="px-4 py-3.5 text-center font-bold bg-indigo-50/50 text-indigo-900">Điểm TB</th>
                            <th class="px-4 py-3.5 text-center font-bold">Xếp Loại</th>
                          </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                          ${(() => {
                            // Sắp xếp học sinh theo điểm trung bình từ cao xuống thấp
                            const rankedList = this.state.students.map(st => {
                              const examScores = this.state.exams.map(ex => {
                                const sub = this.state.submissions.find(x => x.studentId === st.studentId && x.examId === ex.id);
                                return sub ? Number(sub.scoreResult.totalScore) : null;
                              });
                              const valid = examScores.filter(x => x !== null);
                              const avg = valid.length > 0 ? (valid.reduce((a, b) => a + b, 0) / valid.length) : -1;
                              return { student: st, examScores, avg, completed: valid.length };
                            }).sort((a, b) => b.avg - a.avg || b.completed - a.completed);

                            return rankedList.map((item, rIdx) => {
                              const isMe = item.student.studentId === u.studentId;
                              const isAnon = this.state.settings.anonymizeOtherStudents && !isMe;
                              const displayName = isMe ? `${u.fullName} (Bạn)` : (isAnon ? `Học sinh ẩn danh #${rIdx + 1}` : item.student.fullName);
                              const displayId = isMe ? u.studentId : (isAnon ? 'HS******' : item.student.studentId);
                              const avgStr = item.avg >= 0 ? item.avg.toFixed(2) : '--';

                              let rankMedal = `<span class="text-xs font-bold text-slate-500">#${rIdx + 1}</span>`;
                              if (rIdx === 0 && item.avg >= 0) rankMedal = `<span class="text-base" title="Hạng 1"><i class="fa-solid fa-medal text-amber-500"></i></span>`;
                              else if (rIdx === 1 && item.avg >= 0) rankMedal = `<span class="text-base" title="Hạng 2"><i class="fa-solid fa-medal text-slate-400"></i></span>`;
                              else if (rIdx === 2 && item.avg >= 0) rankMedal = `<span class="text-base" title="Hạng 3"><i class="fa-solid fa-medal text-amber-700"></i></span>`;

                              let rankBadge = '<span class="text-xs text-slate-400">--</span>';
                              if (item.avg >= 9.0) rankBadge = '<span class="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">Xuất sắc</span>';
                              else if (item.avg >= 8.0) rankBadge = '<span class="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800">Giỏi</span>';
                              else if (item.avg >= 6.5) rankBadge = '<span class="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">Khá</span>';
                              else if (item.avg >= 5.0) rankBadge = '<span class="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">Trung bình</span>';
                              else if (item.avg >= 0) rankBadge = '<span class="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">Yếu</span>';

                              return `
                                <tr class="${isMe ? 'bg-indigo-50/70 border-y-2 border-indigo-400 font-bold' : 'hover:bg-slate-50/80'} transition">
                                  <td class="px-4 py-3.5 text-center">${rankMedal}</td>
                                  <td class="px-4 py-3.5 font-mono text-xs ${isMe ? 'text-indigo-800 font-extrabold' : 'text-slate-500'}">${displayId}</td>
                                  <td class="px-5 py-3.5 text-sm ${isMe ? 'text-indigo-900 font-extrabold flex items-center space-x-1.5' : 'text-slate-700'}">
                                    <span>${displayName}</span>
                                    ${isMe ? `<span class="px-1.5 py-0.5 rounded bg-indigo-600 text-white text-[10px] font-bold">Chính Bạn</span>` : ''}
                                  </td>
                                  <td class="px-4 py-3.5 text-center text-xs font-semibold text-slate-600 whitespace-nowrap">K${this.getStudentGrade(item.student)} • ${item.student.className || '12'}</td>
                                  ${item.examScores.map(sc => `
                                    <td class="px-4 py-3.5 text-center font-mono text-xs">
                                      ${sc !== null ? `
                                        <span class="font-extrabold ${sc >= 8.0 ? 'text-emerald-700' : (sc >= 6.5 ? 'text-indigo-700' : 'text-slate-700')}">${sc.toFixed(2)}</span>
                                      ` : `<span class="text-slate-300 font-normal">--</span>`}
                                    </td>
                                  `).join('')}
                                  <td class="px-4 py-3.5 text-center font-mono font-extrabold text-sm ${isMe ? 'text-indigo-700' : 'text-slate-800'} bg-indigo-50/30">
                                    ${avgStr}
                                  </td>
                                  <td class="px-4 py-3.5 text-center">
                                    ${rankBadge}
                                  </td>
                                </tr>
                              `;
                            }).join('');
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ` : `
                <!-- TAB 1: BÀI LÀM VÀ LỜI GIẢI CỦA BẢN THÂN -->
                <!-- Thống kê tổng hợp các đợt thi của học sinh -->
                <div class="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl p-4 mb-4">
                  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <span class="text-xs font-bold text-indigo-700 uppercase tracking-wider flex items-center">
                        <i class="fa-solid fa-chart-line mr-1.5"></i>Tiến trình điểm số qua các đợt thi
                      </span>
                      <p class="text-xs text-slate-500 mt-0.5">Theo dõi kết quả làm bài và điểm trung bình qua từng vòng khảo sát</p>
                    </div>
                    <div class="flex flex-wrap items-center gap-2">
                      ${this.state.exams.filter(ex => this.isStudentAllowedExam(ex, u) || mySubmissions.some(s => s.examId === ex.id)).map((ex) => {
                        const sSub = mySubmissions.find(s => s.examId === ex.id);
                        const catShort = this.getExamCategoryMeta(this.inferExamCategory(ex)).short;
                        const label = `K${ex.grade || 12} • ${catShort}`;
                        return `
                          <div class="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border bg-white shadow-xs text-xs" title="${ex.title}">
                            <span class="font-bold text-slate-600">${label}:</span>
                            ${sSub ? `
                              <span class="font-mono font-extrabold text-indigo-600">${Number(sSub.scoreResult.totalScore).toFixed(2)}đ</span>
                            ` : `
                              <span class="text-slate-400 font-medium">Chưa thi</span>
                            `}
                          </div>
                        `;
                      }).join('')}
                      ${mySubmissions.length > 0 ? `
                        <div class="flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-600 text-white shadow-xs text-xs font-bold">
                          <span>ĐTB:</span>
                          <span class="font-mono">${(mySubmissions.reduce((a, b) => a + Number(b.scoreResult.totalScore), 0) / mySubmissions.length).toFixed(2)}đ</span>
                        </div>
                      ` : ''}
                    </div>
                  </div>
                </div>

                ${mySubmissions.length === 0 ? `
                  <div class="bg-white rounded-xl p-8 text-center border border-slate-200 text-slate-500">
                    <p>Bạn chưa hoàn thành đề thi nào. Hãy chọn đề ở mục <strong>Đề Thi &amp; Kiểm Tra</strong> để bắt đầu làm bài!</p>
                  </div>
                ` : `
                  <div class="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <div class="overflow-x-auto">
                      <table class="min-w-full divide-y divide-slate-200 text-left text-sm">
                        <thead class="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                          <tr>
                            <th class="px-5 py-3.5 font-semibold">Đề Thi</th>
                            <th class="px-3 py-3.5 font-semibold text-center">Lần Thi</th>
                            <th class="px-3 py-3.5 font-semibold text-center">Giám Sát</th>
                            <th class="px-5 py-3.5 font-semibold">Thời gian nộp</th>
                            <th class="px-4 py-3.5 font-semibold text-center">Phần I (3đ)</th>
                            <th class="px-4 py-3.5 font-semibold text-center">Phần II (4đ)</th>
                            <th class="px-4 py-3.5 font-semibold text-center">Phần III (3đ)</th>
                            <th class="px-4 py-3.5 font-semibold text-center">Tổng Điểm</th>
                            <th class="px-5 py-3.5 font-semibold text-right">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                          ${mySubmissions.map(sub => `
                            <tr class="hover:bg-slate-50/80 transition">
                              <td class="px-5 py-4 font-bold text-slate-900">${sub.examTitle}</td>
                              <td class="px-3 py-4 text-center font-bold text-xs text-indigo-700">Lần ${sub.attemptNumber || 1}</td>
                              <td class="px-3 py-4 text-center">
                                ${(sub.tabSwitches || 0) > 0 ? `
                                  <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-700 border border-red-200" title="Đã chuyển tab hoặc rời giao diện">
                                    <i class="fa-solid fa-triangle-exclamation mr-1"></i>${sub.tabSwitches} lần
                                  </span>
                                ` : `
                                  <span class="text-emerald-600 text-xs font-medium inline-flex items-center gap-1">
                                    <i class="fa-solid fa-check"></i>Nghiêm túc
                                  </span>
                                `}
                              </td>
                              <td class="px-5 py-4 text-xs text-slate-500">${new Date(sub.submittedAt).toLocaleString('vi-VN')}</td>
                              <td class="px-4 py-4 text-center font-mono font-semibold text-slate-700">${sub.scoreResult.part1.score}đ</td>
                              <td class="px-4 py-4 text-center font-mono font-semibold text-slate-700">${sub.scoreResult.part2.score}đ</td>
                              <td class="px-4 py-4 text-center font-mono text-xs font-semibold">${sub.scoreResult.part3.score}đ</td>
                              <td class="px-4 py-4 text-center">
                                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${sub.scoreResult.totalScore >= 8.0 ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}">
                                  ${sub.scoreResult.totalScore} / 10.0
                                </span>
                              </td>
                              <td class="px-5 py-4 text-right">
                                <button onclick="App.viewSubmissionDetail('${sub.id}')" class="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer">
                                  <i class="fa-solid fa-eye"></i><span>Chi tiết</span>
                                </button>
                              </td>
                            </tr>
                          `).join('')}
                        </tbody>
                      </table>
                    </div>
                  </div>
                `}
              `}
              </div>
            </section>
            ` : ''}
          </div>
        </main>

        <!-- Floating Scroll-To-Top Button (Hình tròn có mũi tên ở góc phải màn hình) -->
        <button onclick="App.scrollToTop()" class="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xl flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer border-2 border-white" title="Lên đầu trang">
          <i class="fa-solid fa-arrow-up text-lg"></i>
        </button>
      </div>
    `;
  },

  // Xác nhận thi lại đề thi
  confirmRetakeExam(examId) {
    const exam = this.state.exams.find(e => e.id === examId);
    if (!exam) return;
    const subs = this.state.submissions.filter(s => s.studentId === this.state.currentUser.studentId && s.examId === examId);
    const count = subs.length;
    this.confirmDialog(
      `Bạn đã thi đề "${exam.title}" ${count} lần.\nBạn có muốn bắt đầu lượt thi lần thứ ${count + 1} ngay bây giờ không?`,
      () => this.startExam(examId),
      {
        type: 'warning',
        title: `Thi lại lần thứ ${count + 1}?`,
        icon: 'fa-rotate-right',
        confirmText: 'Vào thi lại',
        cancelText: 'Để sau'
      }
    );
  },

  // Điều hướng thống nhất về Trang chủ (Tab Chính của Cổng hiện tại)
  goHome() {
    if (this.state.activeExam) {
      this.confirmExitExam();
      return;
    }
    document.querySelectorAll('[id$="Modal"], #appSystemDialog').forEach(el => el.remove());
    document.body.classList.remove('in-exam');
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';

    this.state.adminMainTab = 'main';
    this.state.adminViewTab = 'matrix';
    this.state.adminClassFilter = 'ALL';
    this.state.studentMainTab = 'exams';
    this.state.studentExamSearchQuery = '';
    this.state.studentExamGradeFilter = 'ALL';
    this.state.studentExamCategoryFilter = 'ALL';
    this.state.examSearchQuery = '';
    this.state.examGradeFilter = 'ALL';
    this.state.examCategoryFilter = 'ALL';
    this.state.examStatusFilter = 'ALL';

    this.render();
    this.scrollToTop();
  },

  // Xác nhận thoát bài thi và quay về trang chủ
  confirmExitExam() {
    this.confirmDialog(
      'Bài thi hiện tại sẽ kết thúc phiên mở để đưa bạn về Trang chủ.',
      () => this.exitExamToHome(),
      {
        type: 'info',
        title: 'Quay về Trang chủ?',
        icon: 'fa-house',
        confirmText: 'Về Trang chủ',
        cancelText: 'Ở lại làm bài'
      }
    );
  },

  exitExamToHome() {
    this.clearIntervalTimer();
    this.state.activeExam = null;
    this.goHome();
  },

  // Cuộn mượt lên đầu trang
  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const quizEl = document.getElementById('quizScrollContainer');
    if (quizEl) quizEl.scrollTo({ top: 0, behavior: 'smooth' });
    const splitLeft = document.querySelector('.split-pane-left');
    if (splitLeft) splitLeft.scrollTo({ top: 0, behavior: 'smooth' });
    const splitRight = document.querySelector('.split-pane-right');
    if (splitRight) splitRight.scrollTo({ top: 0, behavior: 'smooth' });
    const scrollContainers = document.querySelectorAll('.overflow-y-auto, .overflow-auto');
    scrollContainers.forEach(el => {
      try { el.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) {}
    });
  },

  renderStudentExamGridHtml(allowedExams, mySubmissions) {
    const u = this.state.currentUser;
    const examsSource = allowedExams || this.state.exams.filter(e => this.isStudentAllowedExam(e, u));
    const subsSource = mySubmissions || this.state.submissions.filter(s => s.studentId === u?.studentId);
    const gradeFilter = this.state.studentExamGradeFilter || 'ALL';
    const catFilter = this.state.studentExamCategoryFilter || 'ALL';
    const query = this.state.studentExamSearchQuery || '';

    const filtered = examsSource.filter(ex => {
      if (gradeFilter !== 'ALL' && String(ex.grade || 12) !== String(gradeFilter)) return false;
      if (catFilter !== 'ALL' && (ex.category || this.inferExamCategory(ex)) !== catFilter) return false;
      return this.matchExamSearch(ex, query);
    });

    if (examsSource.length === 0) {
      return `
        <div class="bg-slate-50 rounded-2xl p-8 text-center border border-dashed border-slate-200 text-slate-500 text-xs">
          <i class="fa-solid fa-lock text-2xl text-slate-300 mb-2"></i>
          <p class="font-semibold">Hiện tại chưa có bài kiểm tra nào được mở quyền cho bạn.</p>
        </div>
      `;
    }

    if (filtered.length === 0) {
      return `
        <div class="bg-slate-50 rounded-2xl p-8 text-center border border-dashed border-slate-200 text-slate-500 text-xs">
          <i class="fa-solid fa-magnifying-glass text-2xl text-slate-300 mb-2"></i>
          <p class="font-semibold">Không tìm thấy đề thi phù hợp với khối lớp / phân loại đề / từ khóa.</p>
          <button onclick="App.resetStudentExamFilter()" class="mt-2.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-100 transition cursor-pointer">
            <i class="fa-solid fa-rotate-left mr-1"></i>Đặt lại bộ lọc
          </button>
        </div>
      `;
    }

    return `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        ${filtered.map(ex => {
          const studentExamSubs = subsSource.filter(s => s.examId === ex.id);
          const attemptsCount = studentExamSubs.length;
          const latestSub = studentExamSubs[0];
          const displayFileName = ex.pdf_name || ex.pdf_url || '';
          const catMeta = this.getExamCategoryMeta(ex.category || this.inferExamCategory(ex));
          return `
            <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md hover:border-indigo-200 transition flex flex-col justify-between space-y-3">
              <div>
                <div class="flex items-center justify-between gap-2 mb-2">
                  <div class="flex items-center flex-wrap gap-1.5">
                    <span class="px-2.5 py-0.5 rounded-lg text-xs font-extrabold font-mono bg-indigo-50 text-indigo-700 border border-indigo-100">
                      Khối ${ex.grade || 12}
                    </span>
                    <span class="px-2 py-0.5 rounded-lg text-[11px] font-bold border inline-flex items-center gap-1 ${catMeta.badge}">
                      <i class="fa-solid ${catMeta.icon}"></i><span>${catMeta.label}</span>
                    </span>
                    <span class="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      ${ex.roundLabel || 'Đợt 1'}
                    </span>
                  </div>
                  <div class="flex items-center space-x-2 text-xs text-slate-500">
                    ${attemptsCount > 0 ? `<span class="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[11px]"><i class="fa-solid fa-rotate-right mr-1"></i>Đã thi ${attemptsCount} lần</span>` : ''}
                    <span class="inline-flex items-center font-semibold"><i class="fa-regular fa-clock mr-1 text-slate-400"></i>${ex.time_minutes || 90} phút</span>
                  </div>
                </div>
                <h4 class="text-sm sm:text-base font-bold text-slate-900 mb-1.5 leading-snug line-clamp-2" title="${ex.title}">${ex.title}</h4>
                <p class="text-xs text-slate-500 mb-2 line-clamp-2">${ex.description || 'Cấu trúc 3 phần: Phần I (12 câu), Phần II (4 câu Đúng/Sai), Phần III (6 câu Trả lời ngắn).'}</p>
                ${displayFileName ? `
                  <div class="text-[11px] text-slate-400 font-mono truncate" title="${displayFileName}">
                    <i class="fa-solid fa-file-pdf text-red-400 mr-1"></i>${displayFileName}
                  </div>
                ` : ''}
              </div>

              <div class="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                ${attemptsCount > 0 ? `
                  <div class="flex items-center gap-2">
                    <button onclick="App.viewSubmissionDetail('${latestSub.id}')" class="px-3 py-1.5 text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-xl transition flex items-center cursor-pointer">
                      <i class="fa-solid fa-eye mr-1.5"></i>Xem lại (${latestSub.scoreResult.totalScore}đ)
                    </button>
                    <button onclick="App.confirmRetakeExam('${ex.id}')" class="px-3 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition flex items-center cursor-pointer">
                      <i class="fa-solid fa-rotate-right mr-1.5"></i>Thi Lại (Lần ${attemptsCount + 1})
                    </button>
                  </div>
                  <span class="text-[11px] text-slate-400">Gần nhất: ${new Date(latestSub.submittedAt).toLocaleDateString('vi-VN')}</span>
                ` : `
                  <button onclick="App.startExam('${ex.id}')" class="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition flex items-center cursor-pointer">
                    <i class="fa-solid fa-play mr-1.5 text-[10px]"></i>
                    <span>Vào Làm Bài</span>
                  </button>
                  <span class="text-[11px] text-slate-400">Chưa làm bài</span>
                `}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  onStudentExamFilterInput(field, val) {
    if (field === 'query') {
      this.state.studentExamSearchQuery = val;
      const container = document.getElementById('studentExamListContainer');
      if (container) {
        container.innerHTML = this.renderStudentExamGridHtml();
        return;
      }
    }
    if (field === 'grade') {
      this.state.studentExamGradeFilter = val;
      if (val !== 'ALL' && this.state.studentExamCategoryFilter !== 'ALL') {
        const u = this.state.currentUser;
        const allowed = this.state.exams.filter(e => this.isStudentAllowedExam(e, u));
        const hasCat = allowed.some(e => String(e.grade || 12) === String(val) && (e.category || this.inferExamCategory(e)) === this.state.studentExamCategoryFilter);
        if (!hasCat) this.state.studentExamCategoryFilter = 'ALL';
      }
    }
    if (field === 'category') this.state.studentExamCategoryFilter = val;
    this.render();
  },

  resetStudentExamFilter() {
    this.state.studentExamSearchQuery = '';
    this.state.studentExamGradeFilter = 'ALL';
    this.state.studentExamCategoryFilter = 'ALL';
    this.render();
  },

  renderStudentHwGridHtml(allowedList) {
    const u = this.state.currentUser;
    const baseList = allowedList || this.state.homeworks.filter(h => this.isStudentAllowedHomework(h, u));
    const gFilter = this.state.studentHwGradeFilter || 'ALL';
    const q = this.state.studentHwSearchQuery || '';
    const filtered = baseList.filter(hw => {
      if (gFilter !== 'ALL' && String(hw.grade || 12) !== String(gFilter)) return false;
      return this.matchHwSearch(hw, q);
    });

    if (filtered.length === 0) {
      return `
        <div class="bg-slate-50 rounded-2xl p-8 text-center border border-dashed border-slate-200 text-slate-500 text-xs">
          <i class="fa-solid fa-folder-open text-2xl text-slate-300 mb-2"></i>
          <p class="font-semibold">${baseList.length === 0 ? 'Hiện chưa có tài liệu hoặc chuyên đề nào được mở cho bạn.' : `Không tìm thấy tài liệu phù hợp${gFilter !== 'ALL' ? ` trong Khối ${gFilter}` : ''}.`}</p>
        </div>
      `;
    }

    return `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        ${filtered.map(hw => `
          <div class="bg-white rounded-2xl p-5 border border-slate-200 hover:border-indigo-200 hover:shadow-md transition flex items-start space-x-4">
            <div class="w-11 h-11 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-100">
              <i class="fa-solid fa-file-pdf text-lg"></i>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex flex-wrap items-center gap-1.5 mb-1.5">
                <span class="px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Khối ${hw.grade || 12}
                </span>
                <span class="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 text-slate-600 font-mono">
                  ${hw.dateAdded || 'Mới cập nhật'}
                </span>
              </div>
              <h4 class="text-sm font-bold text-slate-900 truncate" title="${hw.title}">${hw.title}</h4>
              <p class="text-xs text-slate-500 mt-0.5 line-clamp-2">${hw.description}</p>
              <div class="mt-2 text-[11px] text-slate-400 font-mono truncate">${hw.fileName || 'Tai_Lieu.pdf'} • ${hw.fileSize || '2.0 MB'}</div>

              <div class="mt-3 flex items-center space-x-2">
                <button onclick="App.openPdfModal('${hw.title}', '${hw.pdfUrl}', '${hw.id}')" class="inline-flex items-center px-3 py-1.5 text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 rounded-xl transition cursor-pointer">
                  <i class="fa-solid fa-eye mr-1.5"></i>Xem trực tiếp
                </button>
                <a href="${hw.pdfUrl}" download="${hw.fileName || 'Tai_Lieu.pdf'}" class="inline-flex items-center px-3 py-1.5 text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl transition">
                  <i class="fa-solid fa-download mr-1.5"></i>Tải về
                </a>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  },

  onStudentHwFilterInput(field, val) {
    if (field === 'query') {
      this.state.studentHwSearchQuery = val;
      const container = document.getElementById('studentHwListContainer');
      if (container) {
        container.innerHTML = this.renderStudentHwGridHtml();
        return;
      }
    }
    if (field === 'grade') this.state.studentHwGradeFilter = val;
    this.render();
  },

  resetStudentHwFilter() {
    this.state.studentHwSearchQuery = '';
    this.state.studentHwGradeFilter = 'ALL';
    this.render();
  },

  // --- VIEW: PHÒNG THI CHUẨN AZOTA & INTERACTIVE TEST ---
  async startExam(examId) {
    const exam = this.state.exams.find(e => e.id === examId);
    if (!exam) return;
    if (this.state.currentUser?.role === 'student' && !this.isStudentAllowedExam(exam, this.state.currentUser)) {
      this.notify('Bạn chưa được cấp quyền tham gia bài kiểm tra này!', 'error', 'Chưa được cấp quyền');
      return;
    }

    // Đếm số lần thi của học sinh cho đề này
    const subs = this.state.submissions.filter(s => s.studentId === this.state.currentUser.studentId && s.examId === examId);
    this.state.currentAttemptNumber = subs.length + 1;

    // Khóa hoàn toàn cuộn trang ngoài để loại bỏ triệt để 2 thanh kéo & lỗi màn che
    document.body.classList.add('in-exam');
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    this.state.activeExam = exam;
    this.state.answers = { 
      part1: {}, 
      part2: {}, 
      part3: {},
      flagged: {}
    };

    // Khởi tạo 4 ô ký tự cho mỗi câu Phần III
    exam.part3.forEach(q => {
      this.state.answers.part3[q.id] = ['', '', '', ''];
    });

    this.state.examStartTime = new Date();
    this.state.secondsLeft = (exam.time_minutes || 90) * 60;
    this.state.tabSwitchesCount = 0;
    this.state.activeSectionTab = exam.part1.length ? 'p1' : (exam.part2.length ? 'p2' : 'p3');

    // Đọc file PDF thực tế từ IndexedDB nếu có
    if (typeof PDFStorage !== 'undefined') {
      const idbUrl = await PDFStorage.getPdfBlobUrl(exam.id);
      this.state.resolvedPdfUrl = idbUrl || exam.pdf_url || 'de-toan-12-le-thanh-tong.pdf';
    } else {
      this.state.resolvedPdfUrl = exam.pdf_url || 'de-toan-12-le-thanh-tong.pdf';
    }

    this.render();
    this.startTimer();
  },

  startTimer() {
    this.clearIntervalTimer();
    this.state.timerInterval = setInterval(() => {
      this.state.secondsLeft--;
      this.updateTimerDisplay();

      if (this.state.secondsLeft <= 0) {
        this.clearIntervalTimer();
        this.submitExam(true);
        this.notify('Đã hết thời gian làm bài! Hệ thống đã tự động thu bài và chấm điểm của bạn.', 'warning', 'Hết giờ làm bài', 'Xem kết quả');
      }
    }, 1000);
  },

  clearIntervalTimer() {
    if (this.state.timerInterval) {
      clearInterval(this.state.timerInterval);
      this.state.timerInterval = null;
    }
  },

  updateTimerDisplay() {
    const el = document.getElementById('examTimer');
    if (!el) return;
    const m = Math.floor(this.state.secondsLeft / 60);
    const s = this.state.secondsLeft % 60;
    el.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

    if (this.state.secondsLeft <= 300) {
      el.classList.add('text-red-600', 'animate-pulse');
    }
  },

  setSectionTab(tab) {
    this.state.activeSectionTab = tab;
    // Cập nhật tab active mà KHÔNG tải lại PDF
    ['p1', 'p2', 'p3'].forEach(t => {
      const btn = document.getElementById(`sectionTabBtn_${t}`);
      if (btn) {
        if (t === tab) {
          btn.className = 'flex-1 py-1.5 rounded-md text-center transition bg-indigo-600 text-white shadow font-bold';
        } else {
          btn.className = 'flex-1 py-1.5 rounded-md text-center transition text-slate-600 hover:bg-slate-50 font-medium';
        }
      }
    });
    const pane = document.getElementById('splitAnswerInputsContainer');
    if (pane && this.state.activeExam) {
      pane.innerHTML = this.renderAnswerSheetInputs(this.state.activeExam);
    }
  },

  setPaletteFilter(filter) {
    this.state.paletteFilter = filter;
    this.render();
  },

  toggleFlag(qType, qId) {
    const key = `${qType}_${qId}`;
    this.state.answers.flagged[key] = !this.state.answers.flagged[key];
    this.render();
  },

  scrollToQuestion(part, qId) {
    const drawer = document.getElementById('mobileDrawer');
    if (drawer && !drawer.classList.contains('hidden')) {
      this.toggleMobileDrawer();
    }
    this.setSectionTab(part);
    setTimeout(() => {
      const el = document.getElementById(`row_${part}_${qId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-2', 'ring-indigo-500');
        setTimeout(() => el.classList.remove('ring-2', 'ring-indigo-500'), 1400);
      }
    }, 60);
  },

  calculateProgress() {
    const ex = this.state.activeExam;
    if (!ex) return { answered: 0, total: 22, percentage: 0 };

    let p1 = 0;
    ex.part1.forEach(q => {
      if (this.state.answers.part1[q.id]) p1++;
    });

    let p2 = 0;
    ex.part2.forEach(q => {
      const ans = this.state.answers.part2[q.id] || {};
      if (Object.keys(ans).length === 4) p2++;
    });

    let p3 = 0;
    ex.part3.forEach(q => {
      const raw = (this.state.answers.part3[q.id] || []).join('').trim();
      if (raw.length > 0) p3++;
    });

    const answered = p1 + p2 + p3;
    const total = ex.part1.length + ex.part2.length + ex.part3.length;
    const percentage = total > 0 ? Math.round((answered / total) * 100) : 0;

    return { answered, total, percentage };
  },

  renderExamRoom(container) {
    const ex = this.state.activeExam;
    const u = this.state.currentUser;
    const progress = this.calculateProgress();
    const pdfSrc = this.state.resolvedPdfUrl || ex.pdf_url || 'de-toan-12-le-thanh-tong.pdf';

    container.innerHTML = `
      <div class="fixed inset-0 flex flex-col bg-slate-100 overflow-hidden select-none z-10">
        <!-- Top Sticky Header -->
        <header class="bg-white/95 backdrop-blur-md border-b border-slate-200 px-3 sm:px-6 py-2 flex items-center justify-between shrink-0 z-30 shadow-xs sticky top-0">
          <div class="flex items-center space-x-2 sm:space-x-3">
            <!-- Nút Về Trang Chủ -->
            <button onclick="App.confirmExitExam()" class="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-indigo-600 border border-slate-200 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 shadow-xs cursor-pointer" title="Quay về trang chủ">
              <i class="fa-solid fa-house text-indigo-600"></i>
              <span class="hidden sm:inline">Trang chủ</span>
            </button>

            <div class="h-5 w-px bg-slate-200 hidden sm:block"></div>

            <span class="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
              <i class="fa-solid fa-pen-ruler text-xs"></i>
            </span>
            <div class="min-w-0">
              <h2 class="text-xs sm:text-sm font-bold text-slate-800 truncate max-w-[130px] sm:max-w-xs md:max-w-md">${ex.title}</h2>
              <div class="text-[11px] text-slate-500 flex items-center space-x-2 flex-wrap">
                <span>Học sinh: <strong>${u.fullName}</strong> (${u.studentId})</span>
                <span class="text-indigo-600 font-bold">• Lần thi: ${this.state.currentAttemptNumber || 1}</span>
                <span id="violationHeaderBadge" class="${this.state.tabSwitchesCount > 0 ? 'inline-flex items-center space-x-1 bg-red-100 border border-red-300 px-2 py-0.5 rounded text-red-700 font-bold text-[11px] animate-pulse' : 'hidden'}">
                  <i class="fa-solid fa-triangle-exclamation text-red-600"></i><span>Rời tab: ${this.state.tabSwitchesCount} lần</span>
                </span>
              </div>
            </div>
          </div>

          <!-- Controls & Actions -->
          <div class="flex items-center space-x-1.5 sm:space-x-2.5">
            <!-- Nút Lên Đầu Trang -->
            <button onclick="App.scrollToTop()" class="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-indigo-600 border border-slate-200 rounded-lg text-xs font-bold transition flex items-center space-x-1 shadow-xs" title="Cuộn lên đầu trang">
              <i class="fa-solid fa-arrow-up text-indigo-600"></i>
              <span class="hidden md:inline">Đầu trang</span>
            </button>

            <!-- Tải file PDF về máy -->
            <a href="${pdfSrc}" download="De_Thi_${ex.id}.pdf" class="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold transition flex items-center" title="Tải file PDF về máy nếu muốn in ấn">
              <i class="fa-solid fa-cloud-arrow-down text-indigo-600 mr-1.5"></i>
              <span class="hidden lg:inline">Tải Đề</span>
            </a>

            <!-- Nút chỉnh cỡ chữ A- / A+ -->
            <div class="hidden sm:flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200 text-xs">
              <button onclick="App.adjustFontSize(-1)" class="px-2 py-1 text-slate-600 hover:text-indigo-600 font-bold" title="Giảm cỡ chữ">A-</button>
              <button onclick="App.adjustFontSize(1)" class="px-2 py-1 text-slate-600 hover:text-indigo-600 font-bold" title="Tăng cỡ chữ">A+</button>
            </div>

            <!-- Nút đổi theme: Sáng / Dịu mắt / Tối & Bộ màu -->
            <button id="examQuickThemeBtn" onclick="App.cycleTheme()" class="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs text-slate-600 border border-slate-200 cursor-pointer" title="Chuyển nhanh chế độ: Sáng / Dịu mắt / Tối">
              <i class="fa-solid fa-circle-half-stroke"></i>
            </button>
            <button id="examThemeBtn" onclick="App.showThemeModal()" class="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs text-indigo-600 border border-slate-200 cursor-pointer" title="Tùy chỉnh bộ màu & độ tương phản">
              <i class="fa-solid fa-palette"></i>
            </button>

            <!-- Timer Badge -->
            <div class="flex items-center space-x-1.5 bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded-lg text-amber-900 font-mono font-bold text-xs sm:text-sm">
              <i class="fa-regular fa-clock text-amber-600"></i>
              <span id="examTimer">--:--</span>
            </div>

            <!-- Nộp bài Button -->
            <button onclick="App.confirmSubmitExam()" class="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs sm:text-sm font-bold shadow-sm transition flex items-center">
              <i class="fa-solid fa-paper-plane mr-1.5"></i>
              <span>Nộp Bài</span>
            </button>
          </div>
        </header>

        <!-- Live Progress Bar -->
        <div class="w-full bg-slate-200 h-1 overflow-hidden shrink-0">
          <div class="exam-progress-bar" style="width: ${progress.percentage}%;"></div>
        </div>

        <!-- Main Exam Area: Xem đề trực tiếp qua PDF & Điền phiếu trả lời -->
        <div class="flex-1 overflow-hidden flex flex-col lg:flex-row w-full h-[calc(100vh-3.75rem)]">
          ${this.renderSplitViewContent(ex)}
        </div>

        <!-- Mobile Floating Button -->
        <div class="lg:hidden fixed bottom-6 left-6 z-40">
          <button onclick="App.toggleMobileDrawer()" class="px-4 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-2xl flex items-center space-x-2 border-2 border-white">
            <i class="fa-solid fa-list-check"></i>
            <span>Bảng Câu (${progress.answered}/${progress.total})</span>
          </button>
        </div>

        <!-- Mobile Drawer Backdrop & Content -->
        <div id="mobileDrawerBackdrop" class="hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm transition" onclick="App.toggleMobileDrawer()"></div>
        <div id="mobileDrawer" class="hidden fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl shadow-2xl p-5 border-t border-slate-200 max-h-[80vh] overflow-y-auto space-y-4">
          <div class="flex items-center justify-between border-b border-slate-100 pb-2">
            <div class="flex items-center space-x-2">
              <i class="fa-solid fa-list-check text-indigo-600 text-base"></i>
              <h3 class="font-bold text-slate-900 text-sm">Bảng Điều Hướng Câu Hỏi</h3>
              <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">${progress.answered}/${progress.total} câu</span>
            </div>
            <button onclick="App.toggleMobileDrawer()" class="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center">
              <i class="fa-solid fa-xmark text-sm"></i>
            </button>
          </div>
          <div class="space-y-4">
            ${this.renderPaletteMatrix(ex)}
          </div>
        </div>
      </div>
    `;

    this.updateTimerDisplay();
  },

  toggleMobileDrawer() {
    const backdrop = document.getElementById('mobileDrawerBackdrop');
    const drawer = document.getElementById('mobileDrawer');
    if (backdrop && drawer) {
      backdrop.classList.toggle('hidden');
      drawer.classList.toggle('hidden');
    }
  },

  // 1. Chế độ Split View (Hiển thị trực tiếp file PDF đề thi của giáo viên + Phiếu trả lời 3 phần)
  renderSplitViewContent(ex) {
    const pdfSrc = this.state.resolvedPdfUrl || ex.pdf_url || 'de-toan-12-le-thanh-tong.pdf';
    const safeTitle = (ex.title || '').replace(/'/g, "\\'");

    return `
      <!-- Cột trái: Trình xem PDF nhúng trực tiếp (Mở rộng vùng hiển thị tối đa) -->
      <div class="lg:w-[68%] h-1/2 lg:h-full border-r border-slate-200 bg-slate-900 flex flex-col split-pane-left">
        <div class="bg-slate-950 text-slate-300 text-xs px-4 py-2 flex items-center justify-between border-b border-slate-800">
          <span class="flex items-center font-bold text-white"><i class="fa-solid fa-file-pdf text-red-400 mr-2"></i>Đề thi PDF gốc (Hiển thị trực tiếp)</span>
          <div class="flex items-center space-x-3">
            <a href="${pdfSrc}" download="De_Thi_${ex.id}.pdf" class="text-xs text-indigo-300 hover:text-white flex items-center">
              <i class="fa-solid fa-download mr-1"></i>Tải về máy
            </a>
            <button onclick="App.openPdfModal('${safeTitle}', '${pdfSrc}', '${ex.id}')" class="text-xs text-emerald-400 hover:text-emerald-300 flex items-center cursor-pointer">
              <i class="fa-solid fa-expand mr-1"></i>Toàn màn hình
            </button>
            <a href="${pdfSrc}" target="_blank" class="text-xs hover:text-white flex items-center">
              <i class="fa-solid fa-arrow-up-right-from-square mr-1"></i>Tab mới
            </a>
          </div>
        </div>
        <div class="flex-1 w-full h-full relative bg-slate-950">
          <object data="${pdfSrc}#toolbar=1&navpanes=0" type="application/pdf" class="w-full h-full border-0">
            <iframe src="${pdfSrc}#toolbar=1&navpanes=0" class="w-full h-full border-0">
              <div class="p-6 text-center text-slate-300">
                <i class="fa-solid fa-file-pdf text-4xl mb-2 text-red-400"></i>
                <p>Trình duyệt của bạn đang tải về hoặc mở file PDF.</p>
                <a href="${pdfSrc}" target="_blank" class="mt-2 inline-block px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold">Mở PDF trong tab mới</a>
              </div>
            </iframe>
          </object>
        </div>
      </div>

      <!-- Cột phải: Phiếu trả lời 3 phần trực tuyến -->
      <div class="lg:w-[32%] h-1/2 lg:h-full bg-white flex flex-col split-pane-right overflow-y-auto">
        <div class="p-3 border-b border-slate-200 bg-slate-50 sticky top-0 z-10 space-y-2">
          <div class="flex border border-slate-200 rounded-lg p-1 bg-white text-xs font-bold">
            <button id="sectionTabBtn_p1" onclick="App.setSectionTab('p1')" class="flex-1 py-1.5 rounded-md text-center transition ${this.state.activeSectionTab === 'p1' ? 'bg-indigo-600 text-white shadow font-bold' : 'text-slate-600 hover:bg-slate-50 font-medium'}">
              Phần I (${ex.part1.length} câu)
            </button>
            <button id="sectionTabBtn_p2" onclick="App.setSectionTab('p2')" class="flex-1 py-1.5 rounded-md text-center transition ${this.state.activeSectionTab === 'p2' ? 'bg-indigo-600 text-white shadow font-bold' : 'text-slate-600 hover:bg-slate-50 font-medium'}">
              Phần II (${ex.part2.length} câu Đ/S)
            </button>
            <button id="sectionTabBtn_p3" onclick="App.setSectionTab('p3')" class="flex-1 py-1.5 rounded-md text-center transition ${this.state.activeSectionTab === 'p3' ? 'bg-indigo-600 text-white shadow font-bold' : 'text-slate-600 hover:bg-slate-50 font-medium'}">
              Phần III (${ex.part3.length} câu ngắn)
            </button>
          </div>
        </div>

        <div id="splitAnswerInputsContainer" class="p-4 space-y-6 flex-1">
          ${this.renderAnswerSheetInputs(ex)}
        </div>
      </div>
    `;
  },

  // 2. Render Bảng điều hướng Matrix (Palette)
  renderPaletteMatrix(ex) {
    return `
      <div class="space-y-3">
        ${ex.part1.length > 0 ? `
        <div>
          <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Phần I: Trắc nghiệm 4 lựa chọn (${ex.part1.length} câu)</div>
          <div class="flex flex-wrap gap-1.5">
            ${ex.part1.map(q => {
              const isAns = Boolean(this.state.answers.part1[q.id]);
              const isFlag = Boolean(this.state.answers.flagged[`p1_${q.id}`]);
              return `
                <button id="qmat_p1_${q.id}" onclick="App.scrollToQuestion('p1', ${q.id})" 
                  class="q-matrix-btn ${isAns ? 'answered' : 'unanswered'} ${isFlag ? 'flagged' : ''}">
                  ${q.id}
                </button>
              `;
            }).join('')}
          </div>
        </div>
        ` : ''}

        ${ex.part2.length > 0 ? `
        <div>
          <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Phần II: Đúng/Sai (${ex.part2.length} câu)</div>
          <div class="flex flex-wrap gap-1.5">
            ${ex.part2.map(q => {
              const ans = this.state.answers.part2[q.id] || {};
              const isAns = Object.keys(ans).length === 4;
              const isFlag = Boolean(this.state.answers.flagged[`p2_${q.id}`]);
              return `
                <button id="qmat_p2_${q.id}" onclick="App.scrollToQuestion('p2', ${q.id})" 
                  class="q-matrix-btn ${isAns ? 'answered' : 'unanswered'} ${isFlag ? 'flagged' : ''}">
                  ${q.id}
                </button>
              `;
            }).join('')}
          </div>
        </div>
        ` : ''}

        ${ex.part3.length > 0 ? `
        <div>
          <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Phần III: Trả lời ngắn (${ex.part3.length} câu)</div>
          <div class="flex flex-wrap gap-1.5">
            ${ex.part3.map(q => {
              const str = (this.state.answers.part3[q.id] || []).join('').trim();
              const isAns = str.length > 0;
              const isFlag = Boolean(this.state.answers.flagged[`p3_${q.id}`]);
              return `
                <button id="qmat_p3_${q.id}" onclick="App.scrollToQuestion('p3', ${q.id})" 
                  class="q-matrix-btn ${isAns ? 'answered' : 'unanswered'} ${isFlag ? 'flagged' : ''}">
                  ${q.id}
                </button>
              `;
            }).join('')}
          </div>
        </div>
        ` : ''}
      </div>
    `;
  },

  // 3. Render Phiếu làm bài bên phải (Split Mode)
  renderAnswerSheetInputs(ex) {
    if (this.state.activeSectionTab === 'p1') {
      if (ex.part1.length === 0) return `<div class="p-4 text-center text-xs text-slate-400 italic">Đề thi này không có câu hỏi Phần I.</div>`;
      return `
        <div class="space-y-3">
          <div class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Phần I: Chọn 1 trong 4 đáp án (${ex.part1.length} câu)</div>
          ${ex.part1.map(q => {
            const curAns = this.state.answers.part1[q.id];
            return `
              <div id="row_p1_${q.id}" class="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between transition">
                <span class="font-bold text-xs text-slate-700 w-16">Câu ${q.id}:</span>
                <div class="flex space-x-2">
                  ${['A', 'B', 'C', 'D'].map(opt => `
                    <button id="split_btn_p1_${q.id}_${opt}" onclick="App.selectPart1Answer(${q.id}, '${opt}')" 
                      class="w-8 h-8 rounded-lg font-bold text-xs border transition cursor-pointer ${curAns === opt ? 'bg-indigo-600 border-indigo-600 text-white shadow' : 'bg-white border-slate-300 text-slate-700 hover:bg-indigo-50'}">
                      ${opt}
                    </button>
                  `).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    if (this.state.activeSectionTab === 'p2') {
      if (ex.part2.length === 0) return `<div class="p-4 text-center text-xs text-slate-400 italic">Đề thi này không có câu hỏi Phần II.</div>`;
      return `
        <div class="space-y-4">
          <div class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Phần II: Chọn Đúng hoặc Sai (${ex.part2.length} câu)</div>
          ${ex.part2.map(q => `
            <div id="row_p2_${q.id}" class="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 transition">
              <div class="font-bold text-xs text-slate-800">Câu ${q.id} (4 ý):</div>
              <div class="grid grid-cols-2 gap-2">
                ${['a', 'b', 'c', 'd'].map(sub => {
                  const val = this.state.answers.part2[q.id]?.[sub];
                  return `
                    <div class="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200 text-xs">
                      <span class="font-mono font-bold text-slate-700">${sub})</span>
                      <div class="flex space-x-1">
                        <button id="split_tf_${q.id}_${sub}_true" onclick="App.selectPart2Answer(${q.id}, '${sub}', true)" class="tf-btn px-2.5 py-0.5 rounded text-[11px] font-bold border cursor-pointer ${val === true ? 'selected-true' : 'bg-slate-50 text-slate-600 border-slate-200'}">Đ</button>
                        <button id="split_tf_${q.id}_${sub}_false" onclick="App.selectPart2Answer(${q.id}, '${sub}', false)" class="tf-btn px-2.5 py-0.5 rounded text-[11px] font-bold border cursor-pointer ${val === false ? 'selected-false' : 'bg-slate-50 text-slate-600 border-slate-200'}">S</button>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    if (this.state.activeSectionTab === 'p3') {
      if (ex.part3.length === 0) return `<div class="p-4 text-center text-xs text-slate-400 italic">Đề thi này không có câu hỏi Phần III.</div>`;
      return `
        <div class="space-y-4">
          <div class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Phần III: Ô vuông kết quả 4 ký tự (${ex.part3.length} câu)</div>
          <div class="space-y-3">
            ${ex.part3.map(q => {
              const digits = this.state.answers.part3[q.id] || ['', '', '', ''];
              return `
                <div id="row_p3_${q.id}" class="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between transition">
                  <span class="font-bold text-xs text-slate-700 w-16">Câu ${q.id}:</span>
                  <div class="flex space-x-2">
                    ${[0, 1, 2, 3].map(boxIdx => `
                      <input type="text" maxlength="1" 
                        id="split_box_${q.id}_${boxIdx}"
                        value="${digits[boxIdx] || ''}"
                        onfocus="App.state.activePart3Target = { qId: ${q.id}, boxIdx: ${boxIdx} }"
                        onkeydown="App.handleBoxKeyDown(event, ${q.id}, ${boxIdx}, 'split_box_')"
                        oninput="App.handleBoxInput(event, ${q.id}, ${boxIdx}, 'split_box_')"
                        class="box-digit ${digits[boxIdx] ? 'box-digit-filled' : ''}">
                    `).join('')}
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <!-- Bàn phím số nhanh cho Phần III -->
          <div class="mt-4 pt-4 border-t border-slate-200">
            <div class="text-[11px] text-slate-400 font-semibold mb-2 text-center">Bàn phím số nhanh (Chạm vào ô để điền):</div>
            <div class="math-keypad max-w-xs mx-auto">
              ${[
                { k: '1', l: '1' },
                { k: '2', l: '2' },
                { k: '3', l: '3' },
                { k: 'backspace', l: '<i class="fa-solid fa-delete-left"></i>' },
                { k: '4', l: '4' },
                { k: '5', l: '5' },
                { k: '6', l: '6' },
                { k: '-', l: '-' },
                { k: '7', l: '7' },
                { k: '8', l: '8' },
                { k: '9', l: '9' },
                { k: '.', l: '.' },
                { k: '0', l: '0' },
                { k: '/', l: '/' },
                { k: 'C', l: 'C' },
                { k: 'enter', l: '<i class="fa-solid fa-check"></i>' }
              ].map(btn => `
                <button onclick="App.handleKeypadPress('${btn.k}')" class="math-key ${['backspace', 'C', 'enter', '-', '/', '.'].includes(btn.k) ? 'math-key-action' : ''}">
                  ${btn.l}
                </button>
              `).join('')}
            </div>
          </div>
        </div>
      `;
    }
  },

  handleBoxInput(event, qId, boxIdx, prefix = 'box_') {
    const val = event.target.value.slice(-1);
    event.target.value = val;

    if (!this.state.answers.part3[qId]) {
      this.state.answers.part3[qId] = ['', '', '', ''];
    }
    this.state.answers.part3[qId][boxIdx] = val;

    if (val) {
      event.target.classList.add('box-digit-filled');
      if (boxIdx < 3) {
        const nextInput = document.getElementById(`${prefix}${qId}_${boxIdx + 1}`);
        if (nextInput) nextInput.focus();
      }
    } else {
      event.target.classList.remove('box-digit-filled');
    }

    const str = (this.state.answers.part3[qId] || []).join('').trim();
    this.updatePaletteMatrixButton('p3', qId, str.length > 0);
    this.updateProgressUi();
  },

  handleBoxKeyDown(event, qId, boxIdx, prefix = 'box_') {
    if (event.key === 'Backspace' && !event.target.value && boxIdx > 0) {
      const prevInput = document.getElementById(`${prefix}${qId}_${boxIdx - 1}`);
      if (prevInput) {
        prevInput.focus();
        prevInput.value = '';
        prevInput.classList.remove('box-digit-filled');
        this.state.answers.part3[qId][boxIdx - 1] = '';
        const str = (this.state.answers.part3[qId] || []).join('').trim();
        this.updatePaletteMatrixButton('p3', qId, str.length > 0);
        this.updateProgressUi();
      }
    }
  },

  handleKeypadPress(key) {
    const { qId, boxIdx } = this.state.activePart3Target || { qId: 1, boxIdx: 0 };
    if (!this.state.answers.part3[qId]) {
      this.state.answers.part3[qId] = ['', '', '', ''];
    }

    const targetInput = document.getElementById(`split_box_${qId}_${boxIdx}`);

    if (key === 'backspace') {
      this.state.answers.part3[qId][boxIdx] = '';
      if (targetInput) { targetInput.value = ''; targetInput.classList.remove('box-digit-filled'); }
      if (boxIdx > 0) {
        this.state.activePart3Target.boxIdx = boxIdx - 1;
        const prev = document.getElementById(`split_box_${qId}_${boxIdx - 1}`);
        if (prev) prev.focus();
      }
    } else if (key === 'C') {
      this.state.answers.part3[qId] = ['', '', '', ''];
      [0, 1, 2, 3].forEach(b => {
        const inp = document.getElementById(`split_box_${qId}_${b}`);
        if (inp) { inp.value = ''; inp.classList.remove('box-digit-filled'); }
      });
      this.state.activePart3Target.boxIdx = 0;
      const first = document.getElementById(`split_box_${qId}_0`);
      if (first) first.focus();
    } else if (key === 'enter') {
      const maxP3 = this.state.activeExam?.part3?.length || 6;
      if (qId < maxP3) {
        this.state.activePart3Target = { qId: qId + 1, boxIdx: 0 };
        const next = document.getElementById(`split_box_${qId + 1}_0`);
        if (next) next.focus();
      }
    } else {
      this.state.answers.part3[qId][boxIdx] = key;
      if (targetInput) { targetInput.value = key; targetInput.classList.add('box-digit-filled'); }
      if (boxIdx < 3) {
        this.state.activePart3Target.boxIdx = boxIdx + 1;
        const next = document.getElementById(`split_box_${qId}_${boxIdx + 1}`);
        if (next) next.focus();
      }
    }

    const str = (this.state.answers.part3[qId] || []).join('').trim();
    this.updatePaletteMatrixButton('p3', qId, str.length > 0);
    this.updateProgressUi();
  },

  selectPart1Answer(qId, choice) {
    this.state.answers.part1[qId] = choice;
    this.updatePart1AnswerUI(qId, choice);
    this.updatePaletteMatrixButton('p1', qId, true);
    this.updateProgressUi();
  },

  updatePart1AnswerUI(qId, choice) {
    ['A', 'B', 'C', 'D'].forEach(opt => {
      const btn = document.getElementById(`split_btn_p1_${qId}_${opt}`);
      if (btn) {
        if (opt === choice) {
          btn.className = 'w-8 h-8 rounded-lg font-bold text-xs border transition cursor-pointer bg-indigo-600 border-indigo-600 text-white shadow';
        } else {
          btn.className = 'w-8 h-8 rounded-lg font-bold text-xs border transition cursor-pointer bg-white border-slate-300 text-slate-700 hover:bg-indigo-50';
        }
      }
    });
  },

  selectPart2Answer(qId, subId, boolVal) {
    if (!this.state.answers.part2[qId]) this.state.answers.part2[qId] = {};
    this.state.answers.part2[qId][subId] = boolVal;
    this.updatePart2AnswerUI(qId, subId, boolVal);
    const ansCount = Object.keys(this.state.answers.part2[qId]).length;
    this.updatePaletteMatrixButton('p2', qId, ansCount === 4);
    this.updateProgressUi();
  },

  updatePart2AnswerUI(qId, subId, boolVal) {
    const sTrue = document.getElementById(`split_tf_${qId}_${subId}_true`);
    const sFalse = document.getElementById(`split_tf_${qId}_${subId}_false`);
    if (sTrue && sFalse) {
      if (boolVal === true) {
        sTrue.className = 'tf-btn px-2.5 py-0.5 rounded text-[11px] font-bold border cursor-pointer selected-true';
        sFalse.className = 'tf-btn px-2.5 py-0.5 rounded text-[11px] font-bold border cursor-pointer bg-slate-50 text-slate-600 border-slate-200';
      } else if (boolVal === false) {
        sFalse.className = 'tf-btn px-2.5 py-0.5 rounded text-[11px] font-bold border cursor-pointer selected-false';
        sTrue.className = 'tf-btn px-2.5 py-0.5 rounded text-[11px] font-bold border cursor-pointer bg-slate-50 text-slate-600 border-slate-200';
      }
    }
  },

  updatePaletteMatrixButton(part, qId, isAnswered) {
    const btns = document.querySelectorAll(`[id="qmat_${part}_${qId}"]`);
    btns.forEach(btn => {
      if (isAnswered) {
        btn.classList.add('answered');
        btn.classList.remove('unanswered');
      } else {
        btn.classList.remove('answered');
        btn.classList.add('unanswered');
      }
    });
  },

  updateProgressUi() {
    const p = this.calculateProgress();
    const bar = document.querySelector('.exam-progress-bar');
    if (bar) bar.style.width = `${p.percentage}%`;
    const counterEls = document.querySelectorAll('.exam-progress-counter');
    counterEls.forEach(el => {
      el.textContent = `Đã làm: ${p.answered}/${p.total} câu (${p.percentage}%)`;
    });
  },

  confirmSubmitExam() {
    const p = this.calculateProgress();
    const unanswered = p.total - p.answered;
    this.confirmDialog(
      `Bạn đã hoàn thành ${p.answered}/${p.total} câu hỏi${unanswered > 0 ? ` (còn ${unanswered} câu chưa chọn)` : ''}.\nBạn có chắc chắn muốn nộp bài ngay bây giờ?`,
      () => this.submitExam(),
      {
        type: unanswered > 0 ? 'warning' : 'success',
        title: 'Xác nhận nộp bài thi?',
        icon: 'fa-paper-plane',
        confirmText: 'Nộp bài ngay',
        cancelText: 'Kiểm tra lại'
      }
    );
  },

  submitExam(force = false) {
    this.clearIntervalTimer();

    // Khôi phục cuộn trang bình thường
    document.body.classList.remove('in-exam');
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';

    const formattedP3Answers = {};
    Object.keys(this.state.answers.part3).forEach(k => {
      const arr = this.state.answers.part3[k];
      formattedP3Answers[k] = Array.isArray(arr) ? arr.join('').trim() : String(arr).trim();
    });

    const evaluatedAnswers = {
      ...this.state.answers,
      part3: formattedP3Answers
    };

    const result = GradingSystem.grade(evaluatedAnswers, this.state.activeExam);
    const duration = Math.floor((new Date() - this.state.examStartTime) / 1000);

    const submission = {
      id: 'SUB-' + Date.now(),
      examId: this.state.activeExam.id,
      examTitle: this.state.activeExam.title,
      studentId: this.state.currentUser.studentId,
      studentName: this.state.currentUser.fullName,
      submittedAt: new Date().toISOString(),
      durationTakenSeconds: duration,
      tabSwitches: this.state.tabSwitchesCount,
      attemptNumber: this.state.currentAttemptNumber || 1,
      scoreResult: result,
      answers: JSON.parse(JSON.stringify(evaluatedAnswers))
    };

    this.state.submissions.unshift(submission);
    this.saveData();

    this.state.activeExam = null;
    this.render();

    if (typeof confetti === 'function' && (result.percentage ?? 0) >= 65) {
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 }
      });
    }

    this.showScoreModal(submission);
  },

  showScoreModal(sub) {
    const res = sub.scoreResult;
    const modal = document.createElement('div');
    modal.id = 'scoreModal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in';
    modal.innerHTML = `
      <div class="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-6">
        <div class="w-20 h-20 mx-auto rounded-full ${(res.percentage ?? 0) >= 80 ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'} flex items-center justify-center text-4xl shadow-inner">
          <i class="fa-solid fa-trophy"></i>
        </div>

        <div>
          <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Kết quả bài thi</span>
          <h3 class="text-xl font-extrabold text-slate-900">${sub.examTitle}</h3>
          <p class="text-xs text-slate-500 mt-1">Giám sát: <strong class="text-slate-700">${sub.tabSwitches || 0} lần rời tab</strong></p>
        </div>

        <div class="bg-slate-50 rounded-2xl p-4 border border-slate-100">
          <div class="text-4xl font-extrabold text-indigo-600 font-mono">${res.totalScore} <span class="text-base text-slate-400 font-normal">/ ${res.maxTotal || 10}</span></div>
          <div class="text-xs font-bold uppercase mt-1 ${(res.percentage ?? 0) >= 80 ? 'text-emerald-600' : 'text-indigo-600'}">Xếp loại: ${res.rank}</div>
        </div>

        <div class="grid grid-cols-3 gap-2 text-xs">
          <div class="bg-indigo-50/60 p-2.5 rounded-xl border border-indigo-100">
            <div class="text-slate-500 font-medium">Phần I</div>
            <div class="font-bold text-indigo-700 text-sm mt-0.5">${res.part1.score} / ${res.part1.maxScore ?? 3}đ</div>
          </div>
          <div class="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-100">
            <div class="text-slate-500 font-medium">Phần II</div>
            <div class="font-bold text-emerald-700 text-sm mt-0.5">${res.part2.score} / ${res.part2.maxScore ?? 4}đ</div>
          </div>
          <div class="bg-amber-50/60 p-2.5 rounded-xl border border-amber-100">
            <div class="text-slate-500 font-medium">Phần III</div>
            <div class="font-bold text-amber-700 text-sm mt-0.5">${res.part3.score} / ${res.part3.maxScore ?? 3}đ</div>
          </div>
        </div>

        <div class="flex space-x-3 pt-2">
          <button onclick="document.getElementById('scoreModal').remove(); App.viewSubmissionDetail('${sub.id}');" class="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-md transition">
            Xem Lời Giải Chi Tiết
          </button>
          <button onclick="document.getElementById('scoreModal').remove();" class="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-sm transition">
            Đóng
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  },

  async viewSubmissionDetail(subId) {
    const sub = this.state.submissions.find(s => s.id === subId);
    if (!sub) return;

    // Khôi phục cuộn trang
    document.body.classList.remove('in-exam');
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';

    const exam = this.state.exams.find(e => e.id === sub.examId) || SAMPLE_EXAM_2027;
    const res = sub.scoreResult;
    const isStudent = this.state.currentUser && this.state.currentUser.role === 'student';
    const canViewAnswers = !isStudent || (exam.allow_view_answers !== false && (this.state.settings && this.state.settings.allowStudentViewAnswers !== false));

    let solPdfUrl = exam.solution_pdf_url || '';
    if (typeof PDFStorage !== 'undefined' && solPdfUrl) {
      const idbSol = await PDFStorage.getPdfBlobUrl(exam.id + '_sol');
      if (idbSol) solPdfUrl = idbSol;
      else if (solPdfUrl.startsWith('idb:')) {
        const key = solPdfUrl.replace('idb:', '');
        const b = await PDFStorage.getPdfBlobUrl(key);
        if (b) solPdfUrl = b;
      }
    }

    const showPdf = canViewAnswers && solPdfUrl && !this.state.hideSolutionPdfInDetail;

    // Tạo bảng tóm tắt phiếu trả lời & kết quả chấm 3 phần (Gọn gàng, khoa học)
    const answerSheetSummaryHtml = `
      <div class="space-y-5">
        <!-- Phần I: Trắc nghiệm 4 lựa chọn -->
        <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
          <div class="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h4 class="font-bold text-sm text-indigo-900 flex items-center">
              <span class="w-6 h-6 rounded-md bg-indigo-100 text-indigo-700 inline-flex items-center justify-center mr-2 text-xs font-bold">I</span>
              Phần I: Trắc nghiệm 4 lựa chọn
            </h4>
            <span class="text-xs bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-full">
              ${res.part1.score}/${res.part1.maxScore ?? 3}đ (${res.part1.correctCount}/${exam.part1.length} câu đúng)
            </span>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-xs text-center border-collapse">
              <thead>
                <tr class="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                  <th class="py-2 px-2">Câu</th>
                  <th class="py-2 px-2">Bạn chọn</th>
                  ${canViewAnswers ? '<th class="py-2 px-2 text-emerald-700">Đáp án</th>' : ''}
                  <th class="py-2 px-2">Kết quả</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 font-mono">
                ${exam.part1.map(q => {
                  const userChoice = sub.answers.part1[q.id];
                  const isCorrect = userChoice === q.correct_answer;
                  return `
                    <tr class="${isCorrect ? 'bg-emerald-50/30' : 'bg-rose-50/30'}">
                      <td class="py-2 px-2 font-bold text-slate-700">Câu ${q.id}</td>
                      <td class="py-2 px-2 font-bold ${userChoice ? 'text-indigo-800' : 'text-slate-400 italic'}">${userChoice || 'Bỏ trống'}</td>
                      ${canViewAnswers ? `<td class="py-2 px-2 font-bold text-emerald-700">${q.correct_answer}</td>` : ''}
                      <td class="py-2 px-2 font-bold ${isCorrect ? 'text-emerald-600' : 'text-rose-600'}">
                        ${isCorrect ? '<span class="inline-flex items-center gap-1 text-emerald-600 font-bold"><i class="fa-solid fa-check"></i>(+0.25đ)</span>' : '<span class="inline-flex items-center gap-1 text-rose-500 font-bold"><i class="fa-solid fa-xmark"></i>(0đ)</span>'}
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Phần II: Trắc nghiệm Đúng/Sai -->
        <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
          <div class="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h4 class="font-bold text-sm text-indigo-900 flex items-center">
              <span class="w-6 h-6 rounded-md bg-emerald-100 text-emerald-700 inline-flex items-center justify-center mr-2 text-xs font-bold">II</span>
              Phần II: Trắc nghiệm Đúng/Sai
            </h4>
            <span class="text-xs bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full">
              ${res.part2.score}/${res.part2.maxScore ?? 4}đ
            </span>
          </div>
          <div class="space-y-2.5">
            ${exam.part2.map(q => {
              const qAns = sub.answers.part2[q.id] || {};
              const stList = q.statements || q.items || [];
              let correctCount = 0;
              stList.forEach(st => {
                const subId = st.sub_id || st.key;
                if (qAns[subId] === st.correct) correctCount++;
              });
              return `
                <div class="p-3 bg-slate-50/60 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <div class="flex items-center justify-between font-bold text-slate-800">
                    <span>Câu ${q.id}:</span>
                    <span class="text-indigo-700">Đúng ${correctCount}/4 ý (+${GradingSystem.part2Scale[correctCount]}đ)</span>
                  </div>
                  <div class="grid grid-cols-2 sm:grid-cols-4 gap-1.5 font-mono">
                    ${stList.map(st => {
                      const subId = st.sub_id || st.key;
                      const userVal = qAns[subId];
                      const isMatch = userVal === st.correct;
                      return `
                        <div class="p-2 rounded-lg border text-center ${canViewAnswers ? (isMatch ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900') : 'bg-white border-slate-200 text-slate-800'}">
                          <div class="font-bold">${subId}) ${userVal === true ? 'Đ' : (userVal === false ? 'S' : '-')}</div>
                          ${canViewAnswers ? `<div class="text-[10px] text-slate-500 font-sans mt-0.5">ĐA: <strong>${st.correct ? 'Đ' : 'S'}</strong></div>` : ''}
                        </div>
                      `;
                    }).join('')}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Phần III: Trả lời ngắn -->
        <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
          <div class="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h4 class="font-bold text-sm text-indigo-900 flex items-center">
              <span class="w-6 h-6 rounded-md bg-amber-100 text-amber-700 inline-flex items-center justify-center mr-2 text-xs font-bold">III</span>
              Phần III: Trả lời ngắn
            </h4>
            <span class="text-xs bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded-full">
              ${res.part3.score}/${res.part3.maxScore ?? 3}đ (${res.part3.correctCount}/${exam.part3.length} câu đúng)
            </span>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-xs text-center border-collapse">
              <thead>
                <tr class="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                  <th class="py-2 px-2">Câu</th>
                  <th class="py-2 px-2">Kết quả bạn điền</th>
                  ${canViewAnswers ? '<th class="py-2 px-2 text-emerald-700">Đáp án chuẩn</th>' : ''}
                  <th class="py-2 px-2">Kết quả</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 font-mono">
                ${exam.part3.map(q => {
                  const userVal = sub.answers.part3[q.id];
                  const isMatch = GradingSystem.isShortAnsMatch(userVal, q.correct_answer);
                  return `
                    <tr class="${isMatch ? 'bg-emerald-50/30' : 'bg-rose-50/30'}">
                      <td class="py-2 px-2 font-bold text-slate-700">Câu ${q.id}</td>
                      <td class="py-2 px-2 font-bold ${userVal ? 'text-indigo-800' : 'text-slate-400 italic'}">${userVal || 'Bỏ trống'}</td>
                      ${canViewAnswers ? `<td class="py-2 px-2 font-bold text-emerald-700">${q.correct_answer}</td>` : ''}
                      <td class="py-2 px-2 font-bold ${isMatch ? 'text-emerald-600' : 'text-rose-600'}">
                        ${isMatch ? '<span class="inline-flex items-center gap-1 text-emerald-600 font-bold"><i class="fa-solid fa-check"></i>(+0.5đ)</span>' : '<span class="inline-flex items-center gap-1 text-rose-500 font-bold"><i class="fa-solid fa-xmark"></i>(0đ)</span>'}
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    const container = document.getElementById('app');
    container.innerHTML = `
      <div class="min-h-screen bg-slate-50 flex flex-col">
        <!-- Top Fixed Taskbar -->
        <header class="bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 shadow-xs">
          <div class="w-full max-w-[98%] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
            <div class="flex items-center space-x-2 sm:space-x-3">
              <button onclick="App.goHome()" class="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 shadow-xs cursor-pointer" title="Quay về trang chủ">
                <i class="fa-solid fa-house"></i>
                <span>Trang chủ</span>
              </button>
              <div class="h-5 w-px bg-slate-200"></div>
              <span class="text-xs sm:text-sm font-bold text-slate-800 truncate max-w-[160px] sm:max-w-md">Chi tiết bài làm: ${sub.examTitle}</span>
            </div>

            <div class="flex items-center space-x-2">
              ${solPdfUrl ? `
                <button onclick="App.toggleSolutionPdfInDetail('${subId}')" class="px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center cursor-pointer shadow-xs ${this.state.hideSolutionPdfInDetail ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'}" title="Ẩn hoặc hiện file PDF lời giải chi tiết">
                  <i class="fa-solid ${this.state.hideSolutionPdfInDetail ? 'fa-file-pdf' : 'fa-eye-slash'} mr-1.5"></i>
                  <span>${this.state.hideSolutionPdfInDetail ? 'Hiện PDF Lời Giải' : 'Ẩn PDF Lời Giải'}</span>
                </button>
              ` : ''}

              ${!isStudent ? `
                <button onclick="App.toggleExamViewAnswers('${exam.id}'); setTimeout(() => App.viewSubmissionDetail('${subId}'), 100);" class="px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center cursor-pointer ${exam.allow_view_answers !== false ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-300 hover:bg-amber-100'}" title="Bật/Tắt quyền cho học sinh xem đáp án và file lời giải của đề này">
                  <i class="fa-solid ${exam.allow_view_answers !== false ? 'fa-eye' : 'fa-eye-slash'} mr-1.5"></i>
                  <span>${exam.allow_view_answers !== false ? 'Học sinh: Mở xem đáp án' : 'Học sinh: Khóa xem đáp án'}</span>
                </button>
              ` : ''}

              <button onclick="window.print()" class="text-xs bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-xs font-semibold text-slate-700 hover:bg-slate-50 transition flex items-center cursor-pointer">
                <i class="fa-solid fa-print mr-1.5"></i>In kết quả
              </button>
            </div>
          </div>
        </header>

        <div class="py-6 px-3 sm:px-6 flex-1 w-full max-w-[98%] mx-auto space-y-6">
          <!-- Banner tóm tắt điểm số & Học sinh -->
          <div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <span class="text-xs font-bold uppercase tracking-wider text-indigo-600">Chi Tiết Bài Làm &amp; Đáp Án</span>
              <h2 class="text-xl font-extrabold text-slate-900">${sub.examTitle}</h2>
              <div class="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span>Học sinh: <strong>${sub.studentName}</strong> (${sub.studentId})</span>
                <span>• <strong class="text-indigo-600">Lần thi: ${sub.attemptNumber || 1}</strong></span>
                <span>• Nộp lúc: ${new Date(sub.submittedAt).toLocaleString('vi-VN')}</span>
                <span>• Giám sát rời tab: <strong class="${(sub.tabSwitches || 0) > 0 ? 'text-red-600 font-bold' : 'text-emerald-600 font-bold'}">${sub.tabSwitches || 0} lần</strong></span>
              </div>
            </div>
            <div class="text-right bg-indigo-50 border border-indigo-100 p-4 rounded-xl shrink-0">
              <div class="text-3xl font-extrabold text-indigo-700 font-mono">${res.totalScore} <span class="text-sm font-normal text-slate-400">/ ${res.maxTotal || 10}</span></div>
              <div class="text-xs font-bold text-indigo-600 mt-0.5">Xếp loại: ${res.rank}</div>
            </div>
          </div>

          ${!canViewAnswers ? `
            <!-- Cảnh báo khóa đáp án -->
            <div class="p-5 bg-amber-50 border border-amber-200 rounded-2xl flex items-center space-x-3 text-amber-900 shadow-xs">
              <div class="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 font-bold text-lg">
                <i class="fa-solid fa-lock"></i>
              </div>
              <div>
                <div class="font-bold text-xs sm:text-sm">Chế độ bảo mật: Đáp án & Lời giải chi tiết đang tạm khóa</div>
                <p class="text-[11px] sm:text-xs text-amber-700 mt-0.5">Giáo viên hiện đang tạm khóa quyền xem đáp án đúng và file PDF lời giải chi tiết cho đề này. Bạn chỉ có thể xem điểm và phiếu trả lời của mình.</p>
              </div>
            </div>
          ` : ''}

          <!-- VÙNG HIỂN THỊ MỞ RỘNG: PHIẾU ĐIỂM + TRÌNH XEM PDF ĐÁP ÁN GỐC -->
          <div class="flex flex-col ${showPdf ? 'lg:flex-row items-start' : 'items-center'} gap-6">
            <!-- Phiếu chấm điểm và đối chiếu đáp án -->
            <div class="${showPdf ? 'w-full lg:w-[420px] shrink-0' : 'w-full max-w-4xl mx-auto'}">
              ${answerSheetSummaryHtml}
            </div>

            ${showPdf ? `
              <!-- Trình xem PDF đáp án & lời giải chi tiết gốc (Hiển thị trực tiếp 100%) -->
              <div class="w-full flex-1 min-w-[340px] h-[calc(100vh-170px)] min-h-[750px] bg-slate-900 rounded-2xl border border-slate-700 shadow-xl overflow-hidden flex flex-col">
                <div class="px-4 py-2.5 bg-slate-800 text-white flex items-center justify-between text-xs font-bold shrink-0 border-b border-slate-700">
                  <span class="flex items-center truncate text-white"><i class="fa-solid fa-file-pdf text-red-400 mr-2 text-sm"></i>File PDF Đáp Án & Lời Giải Chi Tiết Của Giáo Viên</span>
                  <div class="flex items-center space-x-2 shrink-0">
                    <button onclick="App.openPdfModal('${exam.title} - Lời Giải PDF', '${solPdfUrl}', '${exam.id}_sol')" class="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-emerald-300 hover:text-white rounded text-[11px] font-semibold transition cursor-pointer flex items-center">
                      <i class="fa-solid fa-expand mr-1"></i>Toàn màn hình
                    </button>
                    <a href="${solPdfUrl}" target="_blank" class="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-indigo-300 hover:text-white rounded text-[11px] font-semibold transition flex items-center">
                      <i class="fa-solid fa-arrow-up-right-from-square mr-1"></i>Tab mới
                    </a>
                    <a href="${solPdfUrl}" download="${exam.id}_Dap_An.pdf" class="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 hover:text-white rounded text-[11px] font-semibold transition flex items-center">
                      <i class="fa-solid fa-download mr-1"></i>Tải về
                    </a>
                  </div>
                </div>
                <div class="flex-1 w-full h-full bg-slate-950 relative">
                  <object data="${solPdfUrl}#toolbar=1" type="application/pdf" class="w-full h-full border-0">
                    <iframe src="${solPdfUrl}#toolbar=1" class="w-full h-full border-0">
                      <div class="p-6 text-center text-slate-300">
                        <i class="fa-solid fa-file-pdf text-4xl mb-2 text-red-400"></i>
                        <p>Trình duyệt đang tải file PDF.</p>
                        <a href="${solPdfUrl}" target="_blank" class="mt-2 inline-block px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold">Mở PDF trong tab mới</a>
                      </div>
                    </iframe>
                  </object>
                </div>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Floating Scroll-To-Top Button (Hình tròn có mũi tên ở góc phải màn hình) -->
        <button onclick="App.scrollToTop()" class="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xl flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer border-2 border-white" title="Lên đầu trang">
          <i class="fa-solid fa-arrow-up text-lg"></i>
        </button>
      </div>
    `;
  },

  // --- VIEW: TRANG QUẢN TRỊ VIÊN / GIÁO VIÊN (ADMIN DASHBOARD) ---
  renderAdminDashboard(container) {
    const u = this.state.currentUser;
    const allClasses = [...new Set(this.state.students.map(s => s.className || '12'))];
    const activeStudentGrades = [...new Set(this.state.students.map(s => this.getStudentGrade(s)))].sort((a, b) => a - b);
    const filteredStudents = this.state.students.filter(s => {
      if (this.state.adminGradeFilter && this.state.adminGradeFilter !== 'ALL' && String(this.getStudentGrade(s)) !== String(this.state.adminGradeFilter)) return false;
      if (this.state.adminClassFilter === 'ALL') return true;
      return (s.className || '12') === this.state.adminClassFilter;
    });
    const examsList = this.state.exams;
    if (!this.state.adminMainTab) this.state.adminMainTab = 'main';
    const thMeta = this.getThemeMeta();
    const swatchHex = (this._lastAccentMeta && this._lastAccentMeta.primaryHex) || this.state.accentHex || '#4f46e5';

    container.innerHTML = `
      <div class="min-h-screen bg-slate-100 flex flex-col">
        <!-- Top Nav -->
        <header class="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30">
          <div class="w-full max-w-[97%] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <div class="flex items-center space-x-3 cursor-pointer" onclick="App.goHome()" title="Về trang chủ">
              <div class="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/25">
                <i class="fa-solid fa-chalkboard-user"></i>
              </div>
              <div>
                <span class="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Cổng Giáo Viên</span>
                <h1 class="text-base sm:text-lg font-bold leading-none">Khảo Thí Toán 6 – 12</h1>
              </div>
            </div>

            <div class="flex items-center space-x-2 sm:space-x-2.5">
              <!-- Nút Về Trang Chủ -->
              <button onclick="App.goHome()" class="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 border border-slate-700 shadow-xs cursor-pointer" title="Về trang chủ">
                <i class="fa-solid fa-house text-indigo-400"></i>
                <span class="hidden sm:inline">Trang chủ</span>
              </button>

              <!-- Chuyển nhanh Sáng/Tối & Bảng màu -->
              <button id="adminQuickThemeBtn" onclick="App.cycleTheme()" class="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition border border-slate-700 cursor-pointer" title="Chuyển nhanh chế độ: Sáng / Dịu mắt / Tối">
                <i class="fa-solid ${thMeta.icon} text-indigo-400"></i>
              </button>
              <button id="adminThemeHeaderBtn" onclick="App.showThemeModal()" class="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 border border-slate-700 cursor-pointer" title="Tùy chỉnh Sáng/Tối, Bộ màu & Độ tương phản">
                <span data-appearance-swatch-dot class="w-3.5 h-3.5 rounded-full border border-white/25 shrink-0" style="background:${swatchHex};"></span>
                <span class="hidden lg:inline">Giao diện</span>
              </button>

              <div class="h-6 w-px bg-slate-800 hidden sm:block"></div>

              <button id="adminProfileHeaderBtn" onclick="App.showAdminProfileModal()" class="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 border border-slate-700 cursor-pointer" title="Hồ sơ giáo viên, đổi tên hiển thị & mật khẩu">
                <i class="fa-solid fa-user-gear text-emerald-400"></i>
                <span class="hidden sm:inline">${u.fullName}</span>
              </button>
              <button onclick="App.logout()" class="p-2 text-slate-400 hover:text-red-400 rounded-lg hover:bg-white/5 transition cursor-pointer" title="Đăng xuất">
                <i class="fa-solid fa-right-from-bracket"></i>
              </button>
            </div>
          </div>
        </header>

        <!-- Main Body -->
        <main class="w-full max-w-[97%] mx-auto px-4 sm:px-6 py-8 flex-1 space-y-6">
          <!-- Thanh Điều Hướng Cổng Giáo Viên -->
          <div class="bg-white rounded-2xl p-2.5 border border-slate-200 shadow-sm">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <nav class="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <button
                  id="adminTabMainBtn"
                  onclick="App.setAdminMainTab('main')"
                  class="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${this.state.adminMainTab === 'main' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 ring-2 ring-indigo-500/25' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}"
                >
                  <i class="fa-solid fa-chart-pie"></i>
                  <span>Tổng Quan &amp; Sổ Điểm</span>
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-mono ${this.state.adminMainTab === 'main' ? 'bg-indigo-700 text-white' : 'bg-white text-slate-700 shadow-2xs'}">
                    ${examsList.length} đề
                  </span>
                </button>

                <button
                  id="adminTabStudentsBtn"
                  onclick="App.setAdminMainTab('students')"
                  class="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${this.state.adminMainTab === 'students' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 ring-2 ring-indigo-500/25' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}"
                >
                  <i class="fa-solid fa-users"></i>
                  <span>Quản Lý Học Sinh</span>
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-mono ${this.state.adminMainTab === 'students' ? 'bg-indigo-700 text-white' : 'bg-white text-slate-700 shadow-2xs'}">
                    ${this.state.students.length}
                  </span>
                </button>

                <button
                  id="adminTabExamsBtn"
                  onclick="App.setAdminMainTab('exams')"
                  class="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${this.state.adminMainTab === 'exams' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 ring-2 ring-indigo-500/25' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}"
                >
                  <i class="fa-solid fa-file-lines"></i>
                  <span>Quản Lý Đề Thi</span>
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-mono ${this.state.adminMainTab === 'exams' ? 'bg-indigo-700 text-white' : 'bg-white text-slate-700 shadow-2xs'}">
                    ${this.state.exams.length}
                  </span>
                </button>

                <button
                  id="adminTabHomeworksBtn"
                  onclick="App.setAdminMainTab('homeworks')"
                  class="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${this.state.adminMainTab === 'homeworks' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 ring-2 ring-indigo-500/25' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}"
                >
                  <i class="fa-solid fa-book-open"></i>
                  <span>Tài Liệu &amp; Chuyên Đề</span>
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-mono ${this.state.adminMainTab === 'homeworks' ? 'bg-indigo-700 text-white' : 'bg-white text-slate-700 shadow-2xs'}">
                    ${this.state.homeworks.length}
                  </span>
                </button>

                <button
                  id="adminTabSettingsBtn"
                  onclick="App.setAdminMainTab('settings')"
                  class="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${this.state.adminMainTab === 'settings' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 ring-2 ring-indigo-500/25' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}"
                >
                  <i class="fa-solid fa-sliders"></i>
                  <span>Cài Đặt &amp; Bảo Mật</span>
                </button>
              </nav>
            </div>

            <div class="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
              <div class="flex items-center space-x-2 text-slate-600 font-medium">
                <i class="fa-solid fa-circle-info text-indigo-500 text-xs"></i>
                <span>
                  ${this.state.adminMainTab === 'main' ? 'Theo dõi thống kê toàn hệ thống, sổ điểm tổng hợp qua các đợt kiểm tra và nhật ký nộp bài chi tiết.' : ''}
                  ${this.state.adminMainTab === 'students' ? 'Quản lý hồ sơ học sinh, xếp khối (Khối 6 – 12), cấp tài khoản mới, tra cứu liên hệ và đồng bộ mật khẩu.' : ''}
                  ${this.state.adminMainTab === 'exams' ? 'Quản lý đề thi theo Khối 6 – 12 và phân loại (GK1, CK1, GK2, CK2, Đề thi vào 10, Thi thử THPT QG), tải lên file PDF đề thi, đáp án và phân quyền dự thi.' : ''}
                  ${this.state.adminMainTab === 'homeworks' ? 'Quản lý kho tài liệu & chuyên đề theo Khối 6 – 12, tải lên file PDF và phân quyền truy cập cho học sinh.' : ''}
                  ${this.state.adminMainTab === 'settings' ? 'Cập nhật hồ sơ & mật khẩu Giáo viên, khôi phục qua email, phân quyền xem điểm và quản trị dữ liệu.' : ''}
                </span>
              </div>
              <div class="text-[11px] text-slate-400 hidden lg:block">
                Hệ thống Khảo thí Toán 6 – 12
              </div>
            </div>
          </div>

          ${this.state.adminMainTab === 'students' ? `
          <!-- Section 1: Quản Lý Học Sinh -->
          <section class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden" id="sectionStudentManagement">
            <div class="p-5 sm:p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-slate-50 via-white to-indigo-50/30">
              <div>
                <h3 class="text-lg font-bold text-slate-900 flex items-center">
                  <i class="fa-solid fa-users text-indigo-600 mr-2"></i>
                  Quản Lý Học Sinh (${this.state.students.length})
                </h3>
                <p class="text-xs text-slate-500 mt-0.5">Xếp khối học sinh (Khối 6 – 12), quản lý hồ sơ, liên hệ phụ huynh, tài khoản đăng nhập và lịch sử thi</p>
              </div>
              <div class="flex flex-wrap items-center gap-2.5">
                <button id="openBulkGradeModalBtn" onclick="App.showBulkGradeModal()" class="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold shadow-2xs transition flex items-center justify-center cursor-pointer">
                  <i class="fa-solid fa-layer-group mr-2"></i>Xếp Khối Học Sinh
                </button>
                <button onclick="App.showAddStudentModal()" class="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center justify-center cursor-pointer">
                  <i class="fa-solid fa-user-plus mr-2"></i>Thêm Học Sinh Mới
                </button>
              </div>
            </div>

            <!-- KPI Banner 4 Cards (Tham khảo quan-ly-hoc-sinh-thu-chi & quan-li-ban-hang) -->
            <div class="p-6 pb-2 grid grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div class="bg-indigo-50/60 p-4 rounded-2xl border border-indigo-100/80 flex items-center justify-between">
                <div>
                  <div class="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">Sĩ số học sinh</div>
                  <div class="text-2xl font-extrabold text-indigo-950 mt-1 font-mono">${this.state.students.length} <span class="text-xs font-normal text-slate-500">HS</span></div>
                </div>
                <div class="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <i class="fa-solid fa-users text-lg"></i>
                </div>
              </div>

              <div class="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100/80 flex items-center justify-between">
                <div>
                  <div class="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Đang hoạt động</div>
                  <div class="text-2xl font-extrabold text-emerald-950 mt-1 font-mono">${this.state.students.filter(s => s.status === 'active').length} <span class="text-xs font-normal text-slate-500">tài khoản</span></div>
                </div>
                <div class="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <i class="fa-solid fa-circle-check text-lg"></i>
                </div>
              </div>

              <div class="bg-blue-50/60 p-4 rounded-2xl border border-blue-100/80 flex items-center justify-between">
                <div>
                  <div class="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Đã tham gia thi</div>
                  <div class="text-2xl font-extrabold text-blue-950 mt-1 font-mono">${new Set(this.state.submissions.map(s => s.studentId)).size} <span class="text-xs font-normal text-slate-500">HS</span></div>
                </div>
                <div class="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <i class="fa-solid fa-graduation-cap text-lg"></i>
                </div>
              </div>

              <div class="bg-amber-50/60 p-4 rounded-2xl border border-amber-100/80 flex items-center justify-between">
                <div>
                  <div class="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Phân bổ khối &amp; lớp</div>
                  <div class="text-2xl font-extrabold text-amber-950 mt-1 font-mono">${activeStudentGrades.length} <span class="text-xs font-normal text-slate-500">khối</span> • ${allClasses.length} <span class="text-xs font-normal text-slate-500">lớp</span></div>
                </div>
                <div class="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <i class="fa-solid fa-school text-lg"></i>
                </div>
              </div>
            </div>

            <!-- Thanh Phân Khối 6 – 12 Cho Học Sinh -->
            <div class="px-6 pt-3 pb-2.5 border-y border-slate-100 bg-slate-50/70">
              ${this.renderExamGradePillsHtml(this.state.students, this.state.studentGradeFilter, 'App.onStudentFilterInput')}
            </div>

            <!-- Smart Search & Filter Toolbar (Tham khảo 2 web) -->
            <div class="p-6 pt-3 pb-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div class="flex-1 relative">
                <i class="fa-solid fa-magnifying-glass absolute left-3.5 top-3 text-slate-400 text-xs"></i>
                <input
                  id="studentSearchInput"
                  type="text"
                  oninput="App.onStudentFilterInput('query', this.value)"
                  placeholder="Tìm nhanh theo tên, mã HS, khối, lớp, số điện thoại, phụ huynh..."
                  value="${this.state.studentSearchQuery || ''}"
                  class="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-indigo-500 outline-none transition"
                />
              </div>

              <div class="flex flex-wrap items-center gap-2">
                <!-- Bộ lọc theo lớp -->
                <div class="flex items-center bg-slate-50 rounded-xl px-3 py-1.5 border border-slate-200 text-xs">
                  <span class="text-slate-400 mr-1.5 font-medium">Lớp:</span>
                  <select onchange="App.onStudentFilterInput('class', this.value)" class="bg-transparent font-bold text-slate-700 outline-none cursor-pointer">
                    <option value="ALL" ${(!this.state.studentClassFilter || this.state.studentClassFilter === 'ALL') ? 'selected' : ''}>Tất cả các lớp</option>
                    ${allClasses.map(c => `
                      <option value="${c}" ${this.state.studentClassFilter === c ? 'selected' : ''}>Lớp ${c}</option>
                    `).join('')}
                  </select>
                </div>

                <!-- Bộ lọc theo trạng thái -->
                <div class="flex items-center bg-slate-50 rounded-xl px-3 py-1.5 border border-slate-200 text-xs">
                  <span class="text-slate-400 mr-1.5 font-medium">Trạng thái:</span>
                  <select onchange="App.onStudentFilterInput('status', this.value)" class="bg-transparent font-bold text-slate-700 outline-none cursor-pointer">
                    <option value="ALL" ${(!this.state.studentStatusFilter || this.state.studentStatusFilter === 'ALL') ? 'selected' : ''}>Tất cả</option>
                    <option value="active" ${this.state.studentStatusFilter === 'active' ? 'selected' : ''}>Đang hoạt động</option>
                    <option value="locked" ${this.state.studentStatusFilter === 'locked' ? 'selected' : ''}>Đã khóa</option>
                  </select>
                </div>

                ${(this.state.studentSearchQuery || (this.state.studentGradeFilter && this.state.studentGradeFilter !== 'ALL') || (this.state.studentClassFilter && this.state.studentClassFilter !== 'ALL') || (this.state.studentStatusFilter && this.state.studentStatusFilter !== 'ALL')) ? `
                  <button onclick="App.resetStudentFilter()" class="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer" title="Đặt lại bộ lọc">
                    <i class="fa-solid fa-rotate-left"></i><span>Đặt lại</span>
                  </button>
                ` : ''}
              </div>
            </div>

            <!-- Table Container -->
            <div id="adminStudentTableContainer" class="overflow-x-auto">
              ${this.renderStudentTableHtml()}
            </div>
          </section>
          ` : ''}

          ${this.state.adminMainTab === 'exams' ? `
          <!-- Section 2: Quản Lý Đề Thi -->
          <section class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div class="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-slate-50 via-white to-indigo-50/30">
              <div>
                <h3 class="text-lg font-bold text-slate-900 flex items-center">
                  <i class="fa-solid fa-file-lines text-indigo-600 mr-2"></i>
                  Quản Lý Đề Thi &amp; Phân Quyền (${this.state.exams.length})
                </h3>
                <p class="text-xs text-slate-500 mt-0.5">Phân chia Khối 6 – 12 &amp; Phân loại (GK1, CK1, GK2, CK2, Đề thi vào 10, Thi thử THPT QG) • Bấm vào đề thi để cấu hình &amp; phân quyền</p>
              </div>
              <button onclick="App.showCreateExamModal()" class="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center justify-center shrink-0 cursor-pointer">
                <i class="fa-solid fa-cloud-arrow-up mr-2"></i>Thêm Đề Thi Mới
              </button>
            </div>

            <!-- Thanh Phân Khối 6-12, Phân Loại Đề & Tìm Kiếm -->
            <div class="p-5 sm:p-6 pt-4 pb-4 border-b border-slate-100 bg-slate-50/70 space-y-2.5">
              ${this.renderExamGradePillsHtml(this.state.exams, this.state.examGradeFilter, 'App.onExamFilterInput')}
              ${this.renderExamCategoryPillsHtml(this.state.exams, this.state.examGradeFilter, this.state.examCategoryFilter, 'App.onExamFilterInput')}

              <!-- Ô tìm kiếm + Lọc trạng thái -->
              <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <div class="flex-1 relative">
                  <i class="fa-solid fa-magnifying-glass absolute left-3.5 top-2.5 text-slate-400 text-xs"></i>
                  <input
                    id="adminExamSearchInput"
                    type="text"
                    oninput="App.onExamFilterInput('query', this.value)"
                    placeholder="Tìm tên đề thi, phân loại (GK1, CK1, GK2, CK2, Vào 10, THPT QG), tên file PDF đề/đáp án, đợt thi, mã đề..."
                    value="${this.state.examSearchQuery || ''}"
                    class="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:border-indigo-500 outline-none transition"
                  />
                </div>
                <select onchange="App.onExamFilterInput('status', this.value)" class="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500 cursor-pointer">
                  <option value="ALL" ${(!this.state.examStatusFilter || this.state.examStatusFilter === 'ALL') ? 'selected' : ''}>Tất cả trạng thái</option>
                  <option value="active" ${this.state.examStatusFilter === 'active' ? 'selected' : ''}>Đang mở thi</option>
                  <option value="inactive" ${this.state.examStatusFilter === 'inactive' ? 'selected' : ''}>Đã đóng</option>
                </select>
                <button onclick="App.resetExamFilter()" class="px-3.5 py-2 bg-slate-200/80 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0">
                  <i class="fa-solid fa-rotate-left"></i><span>Đặt lại</span>
                </button>
              </div>
            </div>

            <!-- Danh sách Đề thi chia 2 cột -->
            <div id="adminExamListContainer" class="p-5 sm:p-6">
              ${this.renderAdminExamGridHtml()}
            </div>
          </section>
          ` : ''}

          ${this.state.adminMainTab === 'homeworks' ? `
          <!-- Section 3: Tài Liệu & Chuyên Đề -->
          <section class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div class="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-slate-50 via-white to-indigo-50/30">
              <div>
                <h3 class="text-lg font-bold text-slate-900 flex items-center">
                  <i class="fa-solid fa-book-open text-indigo-600 mr-2"></i>
                  Tài Liệu &amp; Chuyên Đề (${this.state.homeworks.length})
                </h3>
                <p class="text-xs text-slate-500 mt-0.5">Phân chia theo Khối 6 – 12 • Tải lên tài liệu PDF chuyên đề, bài tập tự luyện và phân quyền học sinh</p>
              </div>
              <button onclick="App.showAddHomeworkModal()" class="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center justify-center cursor-pointer">
                <i class="fa-solid fa-file-circle-plus mr-2"></i>Thêm Tài Liệu Mới
              </button>
            </div>

            <!-- Thanh Phân Khối 6 – 12 & Tìm Kiếm Tài Liệu -->
            <div class="p-5 sm:p-6 pt-4 pb-4 border-b border-slate-100 bg-slate-50/70 space-y-2.5">
              ${this.renderExamGradePillsHtml(this.state.homeworks, this.state.hwGradeFilter, 'App.onHwFilterInput')}

              <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-2 border-t border-slate-200/70">
                <div class="flex-1 relative">
                  <i class="fa-solid fa-magnifying-glass absolute left-3.5 top-2.5 text-slate-400 text-xs"></i>
                  <input
                    id="adminHwSearchInput"
                    type="text"
                    oninput="App.onHwFilterInput('query', this.value)"
                    placeholder="Tìm tên chuyên đề, mô tả, khối lớp (Khối 6 – 12), tên file PDF, mã tài liệu..."
                    value="${this.state.hwSearchQuery || ''}"
                    class="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:border-indigo-500 outline-none transition"
                  />
                </div>
                <button onclick="App.resetHwFilter()" class="px-3.5 py-2 bg-slate-200/80 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0">
                  <i class="fa-solid fa-rotate-left"></i><span>Đặt lại</span>
                </button>
              </div>
            </div>

            <div id="adminHwListContainer" class="p-5 sm:p-6">
              ${this.renderAdminHwGridHtml()}
            </div>
          </section>
          ` : ''}

          ${this.state.adminMainTab === 'settings' ? `
          <!-- Section 4: Cài Đặt & Bảo Mật -->
          <section class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div class="p-5 sm:p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-slate-50 via-white to-indigo-50/30">
              <div>
                <h3 class="text-lg font-bold text-slate-900 flex items-center">
                  <i class="fa-solid fa-sliders text-indigo-600 mr-2"></i>
                  Cài Đặt &amp; Bảo Mật Hệ Thống
                </h3>
                <p class="text-xs text-slate-500 mt-0.5">Quản lý tài khoản Giáo viên (tên hiển thị, mật khẩu, email khôi phục), quyền xem điểm học sinh và dữ liệu</p>
              </div>
              <div class="flex items-center space-x-2 text-xs text-indigo-700 font-semibold bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100">
                <i class="fa-solid fa-shield-halved text-indigo-600"></i>
                <span>Đồng bộ bảo mật toàn hệ thống</span>
              </div>
            </div>

            <div class="p-5 sm:p-6 space-y-6">

            <!-- Khối Tài Khoản Giáo Viên: Đổi Tên, Đổi Mật Khẩu & Gửi Link Đặt Lại Về Email -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-5 pb-6 border-b border-slate-200">
              <!-- Card A: Đổi Tên Hiển Thị & Tài Khoản Đăng Nhập -->
              <form onsubmit="event.preventDefault(); App.handleAdminProfileSave();" class="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-4">
                <div class="space-y-3.5">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-2.5">
                      <div class="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                        <i class="fa-solid fa-user-tie text-sm"></i>
                      </div>
                      <div>
                        <h4 class="text-sm font-extrabold text-slate-900">Hồ Sơ Giáo Viên &amp; Tên Hiển Thị</h4>
                        <p class="text-[11px] text-slate-500">Cập nhật họ tên hiển thị trên cổng và tên tài khoản đăng nhập</p>
                      </div>
                    </div>
                  </div>

                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label class="block text-xs font-bold text-slate-700 mb-1">Tên hiển thị của Giáo viên *</label>
                      <input type="text" id="inlineAdminFullName" required value="${(this.state.admin && this.state.admin.fullName) || u.fullName}" placeholder="VD: Thầy Huỳnh Thanh Chí" class="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-800 focus:border-indigo-600 outline-none">
                    </div>
                    <div>
                      <label class="block text-xs font-bold text-slate-700 mb-1">Tên đăng nhập (Username) *</label>
                      <input type="text" id="inlineAdminUsername" required value="${(this.state.admin && this.state.admin.username) || 'admin'}" placeholder="admin" class="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-mono font-bold text-indigo-700 focus:border-indigo-600 outline-none">
                    </div>
                  </div>

                  <div class="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between gap-2 text-xs">
                    <div class="flex items-center space-x-2 text-slate-600 min-w-0">
                      <i class="fa-solid fa-envelope-circle-check text-emerald-600"></i>
                      <span class="truncate">Email nhận link khôi phục mật khẩu: <strong class="font-mono text-slate-900">${this.ADMIN_RECOVERY_EMAIL}</strong></span>
                    </div>
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">Cố định</span>
                  </div>
                </div>

                <div class="pt-1 flex justify-end">
                  <button type="submit" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition inline-flex items-center gap-1.5 cursor-pointer">
                    <i class="fa-solid fa-floppy-disk"></i><span>Lưu Hồ Sơ Giáo Viên</span>
                  </button>
                </div>
              </form>

              <!-- Card B: Đổi Mật Khẩu & Đặt Lại Mật Khẩu Qua Email -->
              <form onsubmit="event.preventDefault(); App.handleAdminPasswordSave();" class="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-4">
                <div class="space-y-3.5">
                  <div class="flex items-center justify-between gap-2">
                    <div class="flex items-center space-x-2.5">
                      <div class="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                        <i class="fa-solid fa-key text-sm"></i>
                      </div>
                      <div>
                        <h4 class="text-sm font-extrabold text-slate-900">Đổi Mật Khẩu &amp; Khôi Phục Qua Email</h4>
                        <p class="text-[11px] text-slate-500">Đổi mật khẩu trực tiếp hoặc gửi link đặt lại mật khẩu về email</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1">Mật khẩu hiện tại *</label>
                    <input type="password" id="inlineAdminOldPass" required placeholder="Nhập mật khẩu đang sử dụng" class="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-mono focus:border-indigo-600 outline-none">
                  </div>

                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label class="block text-xs font-bold text-slate-700 mb-1">Mật khẩu mới *</label>
                      <input type="password" id="inlineAdminNewPass" required placeholder="Ít nhất 3 ký tự" class="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-mono focus:border-indigo-600 outline-none">
                    </div>
                    <div>
                      <label class="block text-xs font-bold text-slate-700 mb-1">Xác nhận mật khẩu mới *</label>
                      <input type="password" id="inlineAdminConfirmPass" required placeholder="Nhập lại mật khẩu mới" class="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-mono focus:border-indigo-600 outline-none">
                    </div>
                  </div>
                </div>

                <div class="pt-1 flex flex-wrap items-center justify-between gap-2">
                  <button type="button" onclick="App.requestAdminPasswordReset()" class="px-3.5 py-2 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer">
                    <i class="fa-solid fa-paper-plane"></i><span>Gửi link đặt lại về ${this.ADMIN_RECOVERY_EMAIL}</span>
                  </button>
                  <button type="submit" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition inline-flex items-center gap-1.5 cursor-pointer">
                    <i class="fa-solid fa-shield-halved"></i><span>Cập Nhật Mật Khẩu</span>
                  </button>
                </div>
              </form>
            </div>

            <!-- Khối Giao Diện, Bộ Màu Tùy Ý & Độ Tương Phản -->
            <div class="pb-6 border-b border-slate-200">
              <div class="flex items-center justify-between mb-3.5">
                <h4 class="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <i class="fa-solid fa-palette text-indigo-600"></i>
                  <span>Giao Diện Sáng / Tối, Bộ Màu Tùy Chỉnh &amp; Độ Tương Phản</span>
                </h4>
              </div>
              <div class="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-slate-50/40">
                ${this.renderAppearanceControlsHtml('settings')}
              </div>
            </div>

            <div>
              <h4 class="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <i class="fa-solid fa-user-graduate text-indigo-600"></i><span>Phân Quyền Hiển Thị Cho Học Sinh</span>
              </h4>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <!-- Cấu hình 1: Cho phép xem điểm bản thân -->
              <div class="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between space-y-3">
                <div class="flex items-start justify-between">
                  <div>
                    <h4 class="text-xs font-bold text-slate-800">1. Xem Điểm Bản Thân</h4>
                    <p class="text-[11px] text-slate-500 mt-1">Học sinh được tra cứu kết quả bài làm của chính mình.</p>
                  </div>
                  <span class="text-xs font-bold px-2 py-0.5 rounded-full ${this.state.settings.allowStudentViewOwnScore ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}">
                    ${this.state.settings.allowStudentViewOwnScore ? 'Đang Mở' : 'Đang Khóa'}
                  </span>
                </div>
                <button onclick="App.toggleSetting('allowStudentViewOwnScore')" class="w-full py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer ${this.state.settings.allowStudentViewOwnScore ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'}">
                  <i class="fa-solid ${this.state.settings.allowStudentViewOwnScore ? 'fa-lock-open' : 'fa-lock'}"></i>
                  <span>${this.state.settings.allowStudentViewOwnScore ? 'Khóa Quyền Xem Điểm' : 'Mở Cho Xem Điểm'}</span>
                </button>
              </div>

              <!-- Cấu hình 2: Bảng điểm cả lớp để so sánh -->
              <div class="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between space-y-3">
                <div class="flex items-start justify-between">
                  <div>
                    <h4 class="text-xs font-bold text-slate-800">2. Bảng Điểm Cả Lớp</h4>
                    <p class="text-[11px] text-slate-500 mt-1">Cho phép học sinh xem bảng xếp hạng lớp để đối chiếu năng lực.</p>
                  </div>
                  <span class="text-xs font-bold px-2 py-0.5 rounded-full ${this.state.settings.allowStudentViewClassBoard ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200 text-slate-600'}">
                    ${this.state.settings.allowStudentViewClassBoard ? 'Cho Phép' : 'Chỉ Xem Riêng'}
                  </span>
                </div>
                <button onclick="App.toggleSetting('allowStudentViewClassBoard')" class="w-full py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer ${this.state.settings.allowStudentViewClassBoard ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'}">
                  <i class="fa-solid fa-chart-simple"></i>
                  <span>${this.state.settings.allowStudentViewClassBoard ? 'Khóa Bảng Lớp' : 'Mở Bảng So Sánh'}</span>
                </button>
              </div>

              <!-- Cấu hình 3: Ẩn danh thông tin học sinh khác -->
              <div class="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between space-y-3">
                <div class="flex items-start justify-between">
                  <div>
                    <h4 class="text-xs font-bold text-slate-800">3. Ẩn Danh Bạn Khác</h4>
                    <p class="text-[11px] text-slate-500 mt-1">Che tên/mã bạn khác (VD "Học sinh ẩn danh #1"), giữ nguyên điểm.</p>
                  </div>
                  <span class="text-xs font-bold px-2 py-0.5 rounded-full ${this.state.settings.anonymizeOtherStudents ? 'bg-purple-100 text-purple-800' : 'bg-amber-100 text-amber-800'}">
                    ${this.state.settings.anonymizeOtherStudents ? 'Đang Ẩn Danh' : 'Hiện Tên Thật'}
                  </span>
                </div>
                <button onclick="App.toggleSetting('anonymizeOtherStudents')" class="w-full py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer ${this.state.settings.anonymizeOtherStudents ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'}">
                  <i class="fa-solid ${this.state.settings.anonymizeOtherStudents ? 'fa-user-secret' : 'fa-users'}"></i>
                  <span>${this.state.settings.anonymizeOtherStudents ? 'Tắt Ẩn Danh (Tên Thật)' : 'Bật Ẩn Danh'}</span>
                </button>
              </div>

              <!-- Cấu hình 4: Bật/Tắt hiển thị đáp án đúng & lời giải chi tiết -->
              <div class="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between space-y-3">
                <div class="flex items-start justify-between">
                  <div>
                    <h4 class="text-xs font-bold text-slate-800">4. Đáp Án & Lời Giải</h4>
                    <p class="text-[11px] text-slate-500 mt-1">Cho phép học sinh xem đáp án đúng (A/B/C/D) và lời giải sau khi nộp.</p>
                  </div>
                  <span class="text-xs font-bold px-2 py-0.5 rounded-full ${this.state.settings.allowStudentViewAnswers ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}">
                    ${this.state.settings.allowStudentViewAnswers ? 'Đang Mở' : 'Đang Khóa'}
                  </span>
                </div>
                <button onclick="App.toggleSetting('allowStudentViewAnswers')" class="w-full py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer ${this.state.settings.allowStudentViewAnswers ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'}">
                  <i class="fa-solid ${this.state.settings.allowStudentViewAnswers ? 'fa-eye' : 'fa-eye-slash'}"></i>
                  <span>${this.state.settings.allowStudentViewAnswers ? 'Khóa Đáp Án & Lời Giải' : 'Mở Cho Xem Đáp Án'}</span>
                </button>
              </div>
            </div>
            </div>
            </div>
          </section>
          ` : ''}

          ${this.state.adminMainTab === 'main' ? `
          <!-- Tổng Quan & Sổ Điểm -->
          <div class="space-y-4">
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div onclick="App.setAdminMainTab('students')" class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-300 hover:shadow-md transition cursor-pointer group">
                <div class="text-xs font-semibold text-slate-500 uppercase flex items-center justify-between">
                  <span>Học sinh</span>
                  <i class="fa-solid fa-arrow-right text-[10px] text-slate-400 group-hover:text-indigo-600 transition"></i>
                </div>
                <div class="text-2xl font-bold text-slate-900 mt-1 font-mono">${this.state.students.length} <span class="text-xs font-normal text-slate-400">HS</span></div>
              </div>
              <div onclick="App.setAdminMainTab('exams')" class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-300 hover:shadow-md transition cursor-pointer group">
                <div class="text-xs font-semibold text-slate-500 uppercase flex items-center justify-between">
                  <span>Đề thi</span>
                  <i class="fa-solid fa-arrow-right text-[10px] text-slate-400 group-hover:text-indigo-600 transition"></i>
                </div>
                <div class="text-2xl font-bold text-indigo-600 mt-1 font-mono">${this.state.exams.length} <span class="text-xs font-normal text-slate-400">đề</span></div>
              </div>
              <div onclick="App.setAdminMainTab('homeworks')" class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-300 hover:shadow-md transition cursor-pointer group">
                <div class="text-xs font-semibold text-slate-500 uppercase flex items-center justify-between">
                  <span>Tài liệu &amp; Chuyên đề</span>
                  <i class="fa-solid fa-arrow-right text-[10px] text-slate-400 group-hover:text-indigo-600 transition"></i>
                </div>
                <div class="text-2xl font-bold text-blue-600 mt-1 font-mono">${this.state.homeworks.length} <span class="text-xs font-normal text-slate-400">tài liệu</span></div>
              </div>
              <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div class="text-xs font-semibold text-slate-500 uppercase">Lượt nộp bài</div>
                <div class="text-2xl font-bold text-emerald-600 mt-1 font-mono">${this.state.submissions.length} <span class="text-xs font-normal text-slate-400">lượt</span></div>
              </div>
            </div>

            <!-- Thanh thao tác nhanh -->
            <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div class="flex items-center space-x-2 text-xs text-slate-600 font-semibold">
                <i class="fa-solid fa-bolt text-amber-500"></i>
                <span>Thao tác nhanh:</span>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <button onclick="App.setAdminMainTab('students'); App.showAddStudentModal();" class="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-indigo-200 cursor-pointer">
                  <i class="fa-solid fa-user-plus"></i><span>Thêm học sinh</span>
                </button>
                <button onclick="App.setAdminMainTab('exams'); App.showCreateExamModal();" class="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-emerald-200 cursor-pointer">
                  <i class="fa-solid fa-cloud-arrow-up"></i><span>Thêm đề thi</span>
                </button>
                <button onclick="App.setAdminMainTab('homeworks'); App.showAddHomeworkModal();" class="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-blue-200 cursor-pointer">
                  <i class="fa-solid fa-file-circle-plus"></i><span>Thêm tài liệu</span>
                </button>
                <button onclick="App.setAdminMainTab('settings');" class="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-purple-200 cursor-pointer">
                  <i class="fa-solid fa-sliders"></i><span>Cài đặt &amp; bảo mật</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Sổ Điểm Tổng Hợp & Nhật Ký Nộp Bài -->
          <section class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div class="p-5 sm:p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-slate-50 via-white to-indigo-50/30">
              <div>
                <div class="flex items-center flex-wrap gap-2">
                  <h3 class="text-lg font-bold text-slate-900 flex items-center">
                    <i class="fa-solid fa-table-cells text-indigo-600 mr-2"></i>
                    Sổ Điểm Tổng Hợp &amp; Nhật Ký Nộp Bài
                  </h3>
                  <span class="text-xs bg-indigo-50 text-indigo-700 font-bold px-2.5 py-0.5 rounded-full border border-indigo-100">
                    ${examsList.length} đề thi • ${filteredStudents.length} học sinh
                  </span>
                </div>
                <p class="text-xs text-slate-500 mt-1">Theo dõi điểm số các đề thi, điểm trung bình và phân loại học lực của học sinh</p>
              </div>

              <div class="flex flex-wrap items-center gap-2.5">
                <div class="flex items-center bg-white rounded-xl px-3 py-1.5 border border-slate-200 text-xs">
                  <span class="text-slate-500 mr-1.5 font-medium">Khối:</span>
                  <select onchange="App.filterAdminGrade(this.value)" class="bg-transparent font-bold text-indigo-700 outline-none cursor-pointer">
                    <option value="ALL" ${(!this.state.adminGradeFilter || this.state.adminGradeFilter === 'ALL') ? 'selected' : ''}>Tất cả khối</option>
                    ${[6, 7, 8, 9, 10, 11, 12].map(g => `
                      <option value="${g}" ${String(this.state.adminGradeFilter) === String(g) ? 'selected' : ''}>Khối ${g}</option>
                    `).join('')}
                  </select>
                </div>

                <div class="flex items-center bg-white rounded-xl px-3 py-1.5 border border-slate-200 text-xs">
                  <span class="text-slate-500 mr-1.5 font-medium">Lớp:</span>
                  <select onchange="App.filterAdminGradebook(this.value)" class="bg-transparent font-bold text-slate-700 outline-none cursor-pointer">
                    <option value="ALL" ${this.state.adminClassFilter === 'ALL' ? 'selected' : ''}>Tất cả các lớp</option>
                    ${allClasses.map(c => `
                      <option value="${c}" ${this.state.adminClassFilter === c ? 'selected' : ''}>Lớp ${c}</option>
                    `).join('')}
                  </select>
                </div>

                <div class="bg-slate-100 p-1 rounded-xl border border-slate-200 flex text-xs font-semibold">
                  <button onclick="App.setAdminViewTab('matrix')" class="px-3 py-1.5 rounded-lg transition cursor-pointer ${this.state.adminViewTab === 'matrix' ? 'bg-white shadow-xs text-indigo-600 font-bold' : 'text-slate-600 hover:text-slate-900'}">
                    <i class="fa-solid fa-table-list mr-1"></i>Sổ Điểm Tổng Hợp
                  </button>
                  <button onclick="App.setAdminViewTab('log')" class="px-3 py-1.5 rounded-lg transition cursor-pointer ${this.state.adminViewTab === 'log' ? 'bg-white shadow-xs text-indigo-600 font-bold' : 'text-slate-600 hover:text-slate-900'}">
                    <i class="fa-solid fa-clock-rotate-left mr-1"></i>Nhật Ký Nộp Bài
                  </button>
                </div>

                <button onclick="App.exportMatrixCSV()" class="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center cursor-pointer">
                  <i class="fa-solid fa-file-excel mr-1.5"></i>Xuất Bảng Điểm (.CSV)
                </button>
              </div>
            </div>

            ${this.state.adminViewTab === 'matrix' ? `
              <!-- CHẾ ĐỘ 1: BẢNG ĐIỂM MA TRẬN TỔNG HỢP (THEO ĐỢT 1, ĐỢT 2, ĐỢT 3...) -->
              <div class="matrix-scroll-container overflow-x-auto max-h-[72vh] overflow-y-auto border border-slate-200 rounded-2xl shadow-xs">
                <table class="min-w-full text-left text-sm border-separate border-spacing-0">
                  <thead class="sticky top-0 z-30 shadow-xs">
                    <!-- Hàng 1: Tiêu đề cột cố định khi cuộn danh sách học sinh -->
                    <tr class="bg-slate-100 text-xs uppercase tracking-wider text-slate-600 font-bold">
                      <th class="px-4 py-3 text-center font-bold w-12 bg-slate-100 border-b border-slate-200">STT</th>
                      <th class="px-4 py-3 font-bold font-mono bg-slate-100 border-b border-slate-200">Mã HS</th>
                      <th class="px-5 py-3 font-bold bg-slate-100 border-b border-slate-200">Họ và Tên</th>
                      <th class="px-4 py-3 text-center font-bold bg-slate-100 border-b border-slate-200">Khối / Lớp</th>
                      ${examsList.map((ex) => `
                        <th class="px-4 py-3 text-center font-bold min-w-[125px] bg-slate-100 border-b border-slate-200">
                          <div class="text-indigo-900 font-extrabold">K${ex.grade || 12} • ${this.getExamCategoryMeta(this.inferExamCategory(ex)).short}</div>
                          <div class="text-[10px] text-slate-500 font-normal truncate max-w-[130px] mx-auto" title="${ex.title}">${ex.title}</div>
                        </th>
                      `).join('')}
                      <th class="px-4 py-3 text-center font-bold bg-indigo-100/70 text-indigo-900 border-b border-slate-200">Điểm TB</th>
                      <th class="px-4 py-3 text-center font-bold bg-slate-100 border-b border-slate-200">Số Đề</th>
                      <th class="px-4 py-3 text-center font-bold bg-slate-100 border-b border-slate-200">Xếp Loại</th>
                    </tr>

                    <!-- Hàng 2: ĐIỂM TRUNG BÌNH TOÀN LỚP NẰM Ở TRÊN CÙNG CỦA BẢNG -->
                    <tr class="bg-indigo-50/95 text-xs font-bold text-slate-700 shadow-2xs">
                      <td colspan="4" class="px-5 py-2.5 text-right uppercase tracking-wider text-indigo-900 bg-indigo-50/95 border-b-2 border-indigo-200">
                        <i class="fa-solid fa-chart-column mr-1.5 text-indigo-600"></i>Điểm TB Toàn Lớp:
                      </td>
                      ${examsList.map(ex => {
                        const subs = filteredStudents.map(s => this.state.submissions.find(x => x.studentId === s.studentId && x.examId === ex.id)).filter(Boolean);
                        const avg = subs.length > 0 ? (subs.reduce((a, b) => a + Number(b.scoreResult.totalScore), 0) / subs.length).toFixed(2) : '--';
                        const pct = Math.round((subs.length / (filteredStudents.length || 1)) * 100);
                        return `
                          <td class="px-4 py-2.5 text-center font-mono bg-indigo-50/95 border-b-2 border-indigo-200">
                            <div class="text-indigo-900 font-extrabold text-sm">${avg}đ</div>
                            <div class="text-[10px] text-slate-500 font-normal">${subs.length}/${filteredStudents.length} HS (${pct}%)</div>
                          </td>
                        `;
                      }).join('')}
                      <td class="px-4 py-2.5 text-center font-mono font-extrabold text-sm text-indigo-950 bg-indigo-100/80 border-b-2 border-indigo-200">
                        ${(() => {
                          const allAvgs = filteredStudents.map(s => {
                            const subs = this.state.submissions.filter(x => x.studentId === s.studentId);
                            return subs.length > 0 ? (subs.reduce((a, b) => a + Number(b.scoreResult.totalScore), 0) / subs.length) : null;
                          }).filter(x => x !== null);
                          return allAvgs.length > 0 ? (allAvgs.reduce((a, b) => a + b, 0) / allAvgs.length).toFixed(2) + 'đ' : '--';
                        })()}
                      </td>
                      <td colspan="2" class="px-4 py-2.5 text-center text-indigo-800 bg-indigo-50/95 border-b-2 border-indigo-200 text-xs">
                        Hoàn thành: ${Math.round((filteredStudents.filter(s => examsList.every(ex => this.state.submissions.some(sub => sub.studentId === s.studentId && sub.examId === ex.id))).length / (filteredStudents.length || 1)) * 100)}% đủ đợt
                      </td>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100 bg-white">
                    ${filteredStudents.map((s, stt) => {
                      const examScores = examsList.map(ex => {
                        const sub = this.state.submissions.find(x => x.studentId === s.studentId && x.examId === ex.id);
                        return sub ? { hasSub: true, score: Number(sub.scoreResult.totalScore), subId: sub.id, subDate: sub.submittedAt } : { hasSub: false };
                      });
                      const validScores = examScores.filter(x => x.hasSub).map(x => x.score);
                      const avg = validScores.length > 0 ? (validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(2) : null;
                      
                      let rankBadge = '<span class="text-xs text-slate-400">Chưa thi</span>';
                      if (avg !== null) {
                        const num = Number(avg);
                        if (num >= 9.0) rankBadge = '<span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">Xuất sắc</span>';
                        else if (num >= 8.0) rankBadge = '<span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">Giỏi</span>';
                        else if (num >= 6.5) rankBadge = '<span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">Khá</span>';
                        else if (num >= 5.0) rankBadge = '<span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">Trung bình</span>';
                        else rankBadge = '<span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">Yếu</span>';
                      }

                      return `
                        <tr class="hover:bg-slate-50/80 transition">
                          <td class="px-4 py-3.5 text-center text-xs text-slate-400 font-semibold">${stt + 1}</td>
                          <td class="px-4 py-3.5 font-mono font-bold text-indigo-700 text-xs">${s.studentId}</td>
                          <td class="px-5 py-3.5 font-bold text-slate-800 text-sm whitespace-nowrap">
                            <button onclick="App.showStudentDetailModal('${s.studentId}')" class="hover:text-indigo-600 text-left transition inline-flex items-center space-x-1.5 font-bold cursor-pointer" title="Bấm để xem chi tiết học sinh">
                              <span>${s.fullName}</span>
                              <i class="fa-solid fa-chart-line text-[10px] text-indigo-400"></i>
                            </button>
                          </td>
                          <td class="px-4 py-3.5 text-center whitespace-nowrap">
                            <span class="px-2 py-0.5 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">K${this.getStudentGrade(s)}</span>
                            <span class="px-2 py-0.5 rounded-md text-xs font-bold bg-slate-100 text-slate-600 ml-1">${s.className || '12'}</span>
                          </td>
                          ${examScores.map(es => {
                            if (!es.hasSub) {
                              return `
                                <td class="px-4 py-3.5 text-center">
                                  <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold text-slate-400 bg-slate-50 border border-dashed border-slate-200" title="Chưa nộp bài">--</span>
                                </td>
                              `;
                            }
                            const sc = es.score;
                            let colorClass = 'bg-rose-50 text-rose-700 border-rose-200';
                            if (sc >= 9.0) colorClass = 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-xs';
                            else if (sc >= 8.0) colorClass = 'bg-indigo-50 text-indigo-700 border-indigo-200';
                            else if (sc >= 6.5) colorClass = 'bg-blue-50 text-blue-700 border-blue-200';
                            else if (sc >= 5.0) colorClass = 'bg-amber-50 text-amber-700 border-amber-200';

                            return `
                              <td class="px-4 py-3.5 text-center">
                                <button onclick="App.viewSubmissionDetail('${es.subId}')" 
                                  class="px-2.5 py-1 rounded-lg border font-mono font-extrabold text-xs ${colorClass} hover:scale-105 transition" 
                                  title="Bấm để xem bài làm chi tiết (Nộp: ${new Date(es.subDate).toLocaleDateString('vi-VN')})">
                                  ${sc.toFixed(2)}
                                </button>
                              </td>
                            `;
                          }).join('')}
                          <td class="px-4 py-3.5 text-center bg-indigo-50/30">
                            ${avg !== null ? `
                              <span class="font-mono font-extrabold text-sm text-indigo-900">${avg}</span>
                            ` : `<span class="text-slate-300 font-mono">--</span>`}
                          </td>
                          <td class="px-4 py-3.5 text-center text-xs font-semibold text-slate-600">
                            ${validScores.length}/${examsList.length}
                          </td>
                          <td class="px-4 py-3.5 text-center">
                            ${rankBadge}
                          </td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              </div>
            ` : `
              <!-- CHẾ ĐỘ 2: NHẬT KÝ LƯỢT NỘP CHI TIẾT TỪNG PHẦN (LOG VIEW) -->
              <div class="overflow-x-auto max-h-[72vh] overflow-y-auto border border-slate-200 rounded-2xl shadow-xs">
                <table class="min-w-full text-left text-sm border-separate border-spacing-0">
                  <thead class="sticky top-0 z-20 bg-slate-100 text-xs uppercase tracking-wider text-slate-600 font-bold shadow-xs">
                    <tr>
                      <th class="px-5 py-3.5 font-bold bg-slate-100 border-b border-slate-200">Mã HS</th>
                      <th class="px-5 py-3.5 font-bold bg-slate-100 border-b border-slate-200">Học Sinh</th>
                      <th class="px-5 py-3.5 font-bold bg-slate-100 border-b border-slate-200">Đề Thi</th>
                      <th class="px-3 py-3.5 font-bold text-center bg-slate-100 border-b border-slate-200">Lần Thi</th>
                      <th class="px-3 py-3.5 font-bold text-center bg-slate-100 border-b border-slate-200">Giám Sát</th>
                      <th class="px-4 py-3.5 font-bold text-center bg-slate-100 border-b border-slate-200">Phần I</th>
                      <th class="px-4 py-3.5 font-bold text-center bg-slate-100 border-b border-slate-200">Phần II</th>
                      <th class="px-4 py-3.5 font-bold text-center bg-slate-100 border-b border-slate-200">Phần III</th>
                      <th class="px-4 py-3.5 font-bold text-center bg-slate-100 border-b border-slate-200">Tổng Điểm</th>
                      <th class="px-5 py-3.5 font-bold text-right bg-slate-100 border-b border-slate-200">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    ${this.state.submissions
                      .filter(sub => {
                        const st = this.state.students.find(x => x.studentId === sub.studentId);
                        if (this.state.adminGradeFilter && this.state.adminGradeFilter !== 'ALL') {
                          if (!st || String(this.getStudentGrade(st)) !== String(this.state.adminGradeFilter)) return false;
                        }
                        if (this.state.adminClassFilter === 'ALL') return true;
                        return st && (st.className || '12') === this.state.adminClassFilter;
                      })
                      .map(sub => `
                        <tr class="hover:bg-slate-50/80 transition">
                          <td class="px-5 py-4 font-mono font-bold text-indigo-700">${sub.studentId}</td>
                          <td class="px-5 py-4 font-bold text-slate-800">
                            <button onclick="App.showStudentDetailModal('${sub.studentId}')" class="hover:text-indigo-600 text-left transition font-bold cursor-pointer">
                              ${sub.studentName}
                            </button>
                          </td>
                          <td class="px-5 py-4 text-xs text-slate-600 truncate max-w-xs">${sub.examTitle}</td>
                          <td class="px-3 py-4 text-center font-bold text-xs text-indigo-700">Lần ${sub.attemptNumber || 1}</td>
                          <td class="px-3 py-4 text-center">
                            ${(sub.tabSwitches || 0) > 0 ? `
                              <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-700 border border-red-200" title="Đã chuyển tab hoặc rời giao diện">
                                <i class="fa-solid fa-triangle-exclamation mr-1"></i>${sub.tabSwitches} lần
                              </span>
                            ` : `
                              <span class="text-emerald-600 text-xs font-medium inline-flex items-center gap-1">
                                <i class="fa-solid fa-check"></i>Nghiêm túc
                              </span>
                            `}
                          </td>
                          <td class="px-4 py-4 text-center font-mono text-xs font-semibold">${sub.scoreResult.part1.score}đ</td>
                          <td class="px-4 py-4 text-center font-mono text-xs font-semibold">${sub.scoreResult.part2.score}đ</td>
                          <td class="px-4 py-4 text-center font-mono text-xs font-semibold">${sub.scoreResult.part3.score}đ</td>
                          <td class="px-4 py-4 text-center">
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold ${sub.scoreResult.totalScore >= 8 ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}">
                              ${sub.scoreResult.totalScore}đ
                            </span>
                          </td>
                          <td class="px-5 py-4 text-right">
                            <button onclick="App.viewSubmissionDetail('${sub.id}')" class="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer">
                              <i class="fa-solid fa-eye"></i><span>Chi tiết</span>
                            </button>
                          </td>
                        </tr>
                      `).join('')}
                  </tbody>
                </table>
              </div>
            `}
          </section>
          ` : ''}
        </main>

        <!-- Floating Scroll-To-Top Button (Hình tròn có mũi tên ở góc phải màn hình) -->
        <button onclick="App.scrollToTop()" class="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xl flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer border-2 border-white" title="Lên đầu trang">
          <i class="fa-solid fa-arrow-up text-lg"></i>
        </button>
      </div>
    `;
  },

  // --- HÀM CHUYỂN TAB ĐA NHIỆM CHO GIÁO VIÊN & HỌC SINH ---
  setAdminMainTab(tab) {
    this.state.adminMainTab = tab;
    this.render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  setStudentMainTab(tab) {
    this.state.studentMainTab = tab;
    this.render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  // Modal cập nhật file PDF Đề Thi, PDF Lời Giải & Bảng Đáp Án Chấm Điểm 3 Phần
  showUpdatePdfModal(examId, keepDraft = false) {
    const exam = this.state.exams.find(e => e.id === examId);
    if (!exam) return;
    if (!keepDraft || !this.state.answerKeyDraft) {
      this.initAnswerKeyDraft(exam);
    }

    const old = document.getElementById('updatePdfModal');
    if (old) old.remove();

    const modal = document.createElement('div');
    modal.id = 'updatePdfModal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto';
    modal.innerHTML = `
      <div class="bg-white rounded-3xl p-6 max-w-3xl w-full shadow-2xl space-y-4 my-8 max-h-[92vh] overflow-y-auto">
        <div class="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 class="font-extrabold text-slate-900 text-base flex items-center">
            <i class="fa-solid fa-file-pdf text-indigo-600 mr-2"></i>Cập Nhật PDF Đề Thi, Lời Giải &amp; Bảng Đáp Án
          </h3>
          <button onclick="document.getElementById('updatePdfModal').remove()" class="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer"><i class="fa-solid fa-xmark"></i></button>
        </div>

        <p class="text-xs text-slate-600">Đề thi: <strong>${exam.title}</strong></p>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <!-- 1. Cập nhật PDF Đề Thi -->
          <div class="border border-slate-200 rounded-2xl p-3.5 bg-slate-50 space-y-2">
            <div class="flex items-center justify-between gap-2">
              <span class="text-xs font-bold text-slate-800 flex items-center shrink-0">
                <i class="fa-solid fa-file-pdf text-red-500 mr-1.5"></i>1. PDF Đề Thi
              </span>
              <span class="text-[11px] font-mono text-slate-500 truncate" title="${exam.pdf_name || exam.pdf_url || ''}">${exam.pdf_name || exam.pdf_url || 'Chưa có'}</span>
            </div>
            <div class="border-2 border-dashed border-indigo-200 rounded-xl p-3 text-center bg-white hover:bg-indigo-50/50 transition cursor-pointer">
              <input type="file" id="changeQuestionPdfInput" accept=".pdf,application/pdf" class="hidden" onchange="App.handleDirectPdfUpdate(event, '${examId}', 'question')">
              <label for="changeQuestionPdfInput" class="cursor-pointer block">
                <i class="fa-solid fa-cloud-arrow-up text-xl text-indigo-600 mb-0.5"></i>
                <div class="text-xs font-bold text-slate-800">Tải PDF Đề Thi mới</div>
                <div class="text-[10px] text-slate-400">Lưu trực tiếp vào trình duyệt</div>
              </label>
            </div>
          </div>

          <!-- 2. Cập nhật PDF Đáp Án & Lời Giải -->
          <div class="border border-slate-200 rounded-2xl p-3.5 bg-emerald-50/50 space-y-2">
            <div class="flex items-center justify-between gap-2">
              <span class="text-xs font-bold text-slate-800 flex items-center shrink-0">
                <i class="fa-solid fa-file-circle-check text-emerald-600 mr-1.5"></i>2. PDF Lời Giải
              </span>
              <span class="text-[11px] font-mono text-slate-500 truncate" title="${exam.solution_pdf_name || exam.solution_pdf_url || ''}">${exam.solution_pdf_name || exam.solution_pdf_url || 'Chưa có'}</span>
            </div>
            <div class="border-2 border-dashed border-emerald-200 rounded-xl p-3 text-center bg-white hover:bg-emerald-50/50 transition cursor-pointer">
              <input type="file" id="changeSolutionPdfInput" accept=".pdf,application/pdf" class="hidden" onchange="App.handleDirectPdfUpdate(event, '${examId}', 'solution')">
              <label for="changeSolutionPdfInput" class="cursor-pointer block">
                <i class="fa-solid fa-cloud-arrow-up text-xl text-emerald-600 mb-0.5"></i>
                <div class="text-xs font-bold text-slate-800">Tải PDF Đáp Án &amp; Lời Giải</div>
                <div class="text-[10px] text-slate-400">Hiển thị sau khi học sinh nộp bài</div>
              </label>
            </div>
          </div>
        </div>

        <!-- 3. Bảng Đáp Án Chấm Điểm Tự Động -->
        <div id="answerKeyEditorHost">
          ${this.renderAnswerKeyEditorHtml()}
        </div>

        <div class="pt-2 flex items-center justify-end gap-2">
          <button type="button" onclick="document.getElementById('updatePdfModal').remove()" class="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer">Đóng</button>
          <button type="button" onclick="App.saveExamAnswerKey('${examId}')" class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition inline-flex items-center gap-1.5 cursor-pointer">
            <i class="fa-solid fa-floppy-disk"></i><span>Lưu Bảng Đáp Án</span>
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  },

  async handleDirectPdfUpdate(event, examId, type = 'question') {
    const file = event.target.files[0];
    if (!file) return;

    const exam = this.state.exams.find(e => e.id === examId);
    if (!exam) return;

    if (type === 'question') {
      exam.pdf_name = file.name;
      if (typeof PDFStorage !== 'undefined') {
        await PDFStorage.savePdf(examId, file);
        exam.pdf_url = 'idb:' + examId;
      }
    } else {
      exam.solution_pdf_name = file.name;
      if (typeof PDFStorage !== 'undefined') {
        await PDFStorage.savePdf(examId + '_sol', file);
        exam.solution_pdf_url = 'idb:' + examId + '_sol';
      }
    }

    this.saveData();
    this.render();
    this.showUpdatePdfModal(examId, true);
    this.notify(
      `Đã cập nhật thành công file PDF ${type === 'question' ? 'Đề Thi' : 'Đáp Án & Lời Giải'} "${file.name}" cho đề "${exam.title}".`,
      'success',
      'Cập nhật file PDF thành công'
    );
  },

  // --- QUẢN LÝ ĐỀ THI 2 CỘT, BỘ LỌC KHỐI 6-12, LOẠI ĐỀ & PHÂN QUYỀN DỰ THI ---
  renderAdminExamGridHtml() {
    const gradeFilter = this.state.examGradeFilter || 'ALL';
    const catFilter = this.state.examCategoryFilter || 'ALL';
    const statusFilter = this.state.examStatusFilter || 'ALL';
    const query = this.state.examSearchQuery || '';

    const filtered = this.state.exams.filter(ex => {
      if (gradeFilter !== 'ALL' && String(ex.grade || 12) !== String(gradeFilter)) return false;
      if (catFilter !== 'ALL' && (ex.category || this.inferExamCategory(ex)) !== catFilter) return false;
      if (statusFilter === 'active' && !ex.is_active) return false;
      if (statusFilter === 'inactive' && ex.is_active) return false;
      return this.matchExamSearch(ex, query);
    });

    if (filtered.length === 0) {
      return `
        <div class="bg-slate-50 rounded-2xl p-8 text-center border border-dashed border-slate-200 text-slate-500 text-xs">
          <i class="fa-solid fa-magnifying-glass text-2xl text-slate-300 mb-2"></i>
          <p class="font-semibold">Không tìm thấy đề thi phù hợp với bộ lọc khối lớp / phân loại đề / từ khóa tìm kiếm.</p>
          <button onclick="App.resetExamFilter()" class="mt-2.5 px-3.5 py-1.5 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold hover:bg-indigo-100 transition cursor-pointer">
            <i class="fa-solid fa-rotate-left mr-1"></i>Đặt lại bộ lọc
          </button>
        </div>
      `;
    }

    return `
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        ${filtered.map(ex => {
          let accessIcon = 'fa-users';
          let accessLabel = 'Tất cả học sinh';
          let accessBadgeClass = 'bg-indigo-50 text-indigo-700 border-indigo-200';
          if (!ex.allowed_all) {
            if (ex.access_type === 'grade') {
              accessIcon = 'fa-layer-group';
              const gList = (ex.allowed_grades && ex.allowed_grades.length) ? ex.allowed_grades.join(', ') : (ex.grade || 12);
              accessLabel = `Theo khối: ${gList}`;
              accessBadgeClass = 'bg-blue-50 text-blue-700 border-blue-200';
            } else {
              accessIcon = 'fa-user-check';
              accessLabel = `Chỉ định: ${(ex.allowed_students || []).length} học sinh`;
              accessBadgeClass = 'bg-amber-50 text-amber-700 border-amber-200';
            }
          }
          const qFile = ex.pdf_name || ex.pdf_url || 'Chưa có';
          const sFile = ex.solution_pdf_name || ex.solution_pdf_url || '';
          const catMeta = this.getExamCategoryMeta(ex.category || this.inferExamCategory(ex));

          return `
            <div class="rounded-2xl border border-slate-200 bg-white hover:border-indigo-300 hover:shadow-md transition flex flex-col justify-between p-5 space-y-3.5">
              <div class="space-y-2.5">
                <div class="flex items-center justify-between gap-2">
                  <div class="flex items-center flex-wrap gap-1.5">
                    <span class="px-2.5 py-0.5 rounded-lg text-xs font-extrabold bg-indigo-600 text-white">Khối ${ex.grade || 12}</span>
                    <span class="px-2 py-0.5 rounded-lg text-[11px] font-bold border inline-flex items-center gap-1 ${catMeta.badge}">
                      <i class="fa-solid ${catMeta.icon}"></i><span>${catMeta.label}</span>
                    </span>
                    <span class="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">${ex.roundLabel || 'Đợt 1'}</span>
                    <span class="px-2 py-0.5 rounded-lg text-[11px] font-mono font-semibold bg-slate-50 text-slate-500 border border-slate-200">${ex.id}</span>
                    <span class="text-xs text-slate-500 font-medium inline-flex items-center"><i class="fa-regular fa-clock mr-1 text-slate-400"></i>${ex.time_minutes || 90}p</span>
                  </div>
                  <button onclick="App.toggleExamActive('${ex.id}')" class="px-2.5 py-1 rounded-full text-[11px] font-bold transition inline-flex items-center gap-1.5 cursor-pointer shrink-0 ${ex.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100' : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'}" title="Bấm để Đóng / Mở đề thi">
                    <span class="w-1.5 h-1.5 rounded-full ${ex.is_active ? 'bg-emerald-500' : 'bg-slate-400'}"></span>
                    <span>${ex.is_active ? 'Đang mở' : 'Đã đóng'}</span>
                  </button>
                </div>

                <!-- Vùng bấm trực tiếp vào đề thi để cấu hình Phân quyền / Khối / Loại đề / Đợt -->
                <div onclick="App.showExamAccessModal('${ex.id}')" class="group cursor-pointer rounded-xl p-2.5 -mx-2.5 hover:bg-indigo-50/50 transition" title="Bấm vào đề thi để phân quyền ai được thi, đổi khối lớp, phân loại đề hoặc đợt thi">
                  <div class="flex items-start justify-between gap-2">
                    <h4 class="font-bold text-slate-900 group-hover:text-indigo-700 text-sm sm:text-base leading-snug line-clamp-2 transition">${ex.title}</h4>
                    <span class="text-indigo-600 opacity-60 group-hover:opacity-100 transition text-xs shrink-0 mt-0.5"><i class="fa-solid fa-sliders"></i></span>
                  </div>

                  <div class="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border font-bold ${accessBadgeClass}">
                      <i class="fa-solid ${accessIcon}"></i><span>${accessLabel}</span>
                    </span>
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 text-slate-600 border border-slate-200 font-mono">
                      P1:${ex.part1 ? ex.part1.length : 0} • P2:${ex.part2 ? ex.part2.length : 0} • P3:${ex.part3 ? ex.part3.length : 0}
                    </span>
                  </div>

                  <div class="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
                    <div class="truncate text-slate-600 bg-red-50/50 border border-red-100 rounded-lg px-2 py-1" title="File đề: ${qFile}">
                      <i class="fa-solid fa-file-pdf text-red-500 mr-1"></i><span class="text-slate-400">Đề:</span> <strong class="font-mono text-slate-700">${qFile}</strong>
                    </div>
                    <div class="truncate text-slate-600 bg-emerald-50/50 border border-emerald-100 rounded-lg px-2 py-1" title="File đáp án: ${sFile || 'Chưa có'}">
                      <i class="fa-solid fa-file-shield text-emerald-600 mr-1"></i><span class="text-slate-400">ĐA:</span> <strong class="font-mono text-slate-700">${sFile || 'Chưa có'}</strong>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Các nút thao tác sắp xếp gọn gàng theo lưới 2 hàng cân đối -->
              <div class="pt-3 border-t border-slate-100 space-y-1.5">
                <div class="grid grid-cols-2 gap-2">
                  <button onclick="App.previewAdminPdf('${ex.id}')" class="px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 transition cursor-pointer whitespace-nowrap" title="Xem trực tiếp file PDF đề thi">
                    <i class="fa-solid fa-file-pdf"></i><span>Xem PDF Đề</span>
                  </button>
                  ${ex.solution_pdf_url ? `
                    <button onclick="App.previewAdminSolutionPdf('${ex.id}')" class="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 transition cursor-pointer whitespace-nowrap" title="Xem trực tiếp file PDF đáp án và lời giải">
                      <i class="fa-solid fa-file-shield"></i><span>Xem PDF Đáp Án</span>
                    </button>
                  ` : `
                    <button onclick="App.showUpdatePdfModal('${ex.id}')" class="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 text-slate-600 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 transition cursor-pointer whitespace-nowrap">
                      <i class="fa-solid fa-cloud-arrow-up"></i><span>Up PDF Đáp Án</span>
                    </button>
                  `}
                </div>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  <button onclick="App.showExamAccessModal('${ex.id}')" class="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1 transition cursor-pointer whitespace-nowrap" title="Chọn ai được phép thi đề này">
                    <i class="fa-solid fa-user-check"></i><span>Phân quyền</span>
                  </button>
                  <button onclick="App.toggleExamViewAnswers('${ex.id}')" class="px-2.5 py-1.5 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1 transition cursor-pointer whitespace-nowrap ${ex.allow_view_answers !== false ? 'bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700' : 'bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700'}" title="Bật/Tắt cho phép học sinh xem đáp án & lời giải PDF">
                    <i class="fa-solid ${ex.allow_view_answers !== false ? 'fa-eye' : 'fa-eye-slash'}"></i><span>${ex.allow_view_answers !== false ? 'Mở ĐA' : 'Khóa ĐA'}</span>
                  </button>
                  <button onclick="App.showUpdatePdfModal('${ex.id}')" class="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1 transition cursor-pointer whitespace-nowrap" title="Cập nhật file PDF đề thi, lời giải và bảng đáp án chấm điểm">
                    <i class="fa-solid fa-file-arrow-up"></i><span>PDF &amp; ĐA</span>
                  </button>
                  <button onclick="App.deleteExam('${ex.id}')" class="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 border border-red-100 text-red-600 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1 transition cursor-pointer whitespace-nowrap" title="Xóa đề thi này">
                    <i class="fa-solid fa-trash-can"></i><span>Xóa</span>
                  </button>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  onExamFilterInput(field, val) {
    if (field === 'query') {
      this.state.examSearchQuery = val;
      const container = document.getElementById('adminExamListContainer');
      if (container) {
        container.innerHTML = this.renderAdminExamGridHtml();
        return;
      }
    }
    if (field === 'grade') {
      this.state.examGradeFilter = val;
      if (val !== 'ALL' && this.state.examCategoryFilter !== 'ALL') {
        const hasCat = this.state.exams.some(e => String(e.grade || 12) === String(val) && (e.category || this.inferExamCategory(e)) === this.state.examCategoryFilter);
        if (!hasCat) this.state.examCategoryFilter = 'ALL';
      }
    }
    if (field === 'category') this.state.examCategoryFilter = val;
    if (field === 'status') this.state.examStatusFilter = val;
    this.render();
  },

  resetExamFilter() {
    this.state.examSearchQuery = '';
    this.state.examGradeFilter = 'ALL';
    this.state.examCategoryFilter = 'ALL';
    this.state.examStatusFilter = 'ALL';
    this.render();
  },

  // Modal khi bấm vào Đề thi: Phân quyền cho ai thi (Tất cả / Theo khối 6-12 / Từng học sinh) + Sửa thông tin đề
  showExamAccessModal(examId) {
    const exam = this.state.exams.find(e => e.id === examId);
    if (!exam) return;

    const existingModal = document.getElementById('examAccessModal');
    if (existingModal) existingModal.remove();

    const currentMode = exam.allowed_all ? 'all' : (exam.access_type === 'grade' ? 'grade' : 'custom');
    const selectedGrades = Array.isArray(exam.allowed_grades) && exam.allowed_grades.length ? exam.allowed_grades.map(Number) : [Number(exam.grade || 12)];
    const selectedStudents = new Set(Array.isArray(exam.allowed_students) ? exam.allowed_students : []);

    const modal = document.createElement('div');
    modal.id = 'examAccessModal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm';
    modal.innerHTML = `
      <div class="bg-white rounded-3xl max-w-2xl w-full max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        <!-- Header cố định -->
        <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50/70 via-white to-slate-50 shrink-0">
          <div>
            <h3 class="font-extrabold text-slate-900 text-base sm:text-lg flex items-center gap-2">
              <i class="fa-solid fa-user-shield text-indigo-600"></i>
              <span>Cấu Hình Đề Thi & Phân Quyền Dự Thi</span>
            </h3>
            <p class="text-xs text-slate-500 mt-0.5">Mã đề: <span class="font-mono font-bold text-indigo-600">${exam.id}</span> • Chọn khối lớp, đợt thi và đối tượng được phép làm bài</p>
          </div>
          <button type="button" onclick="document.getElementById('examAccessModal').remove()" class="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer">
            <i class="fa-solid fa-xmark text-base"></i>
          </button>
        </div>

        <!-- Body cuộn mượt -->
        <form id="examAccessForm" onsubmit="event.preventDefault(); App.handleExamAccessSubmit('${exam.id}');" class="p-6 overflow-y-auto flex-1 space-y-4 text-xs">
          <div>
            <label class="block font-bold text-slate-700 mb-1">Tên đề thi</label>
            <input type="text" id="accessExamTitle" required value="${exam.title.replace(/"/g, '&quot;')}" class="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:border-indigo-500 outline-none">
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label class="block font-bold text-slate-700 mb-1">Khối lớp (6 – 12)</label>
              <select id="accessExamGrade" class="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-bold text-indigo-700 outline-none focus:border-indigo-500 cursor-pointer">
                ${[6, 7, 8, 9, 10, 11, 12].map(g => `<option value="${g}" ${Number(exam.grade || 12) === g ? 'selected' : ''}>Khối ${g}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">Phân loại đề</label>
              <select id="accessExamCategory" onchange="App.syncGradeByCategory(this.value, 'accessExamGrade')" class="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-bold text-slate-800 outline-none focus:border-indigo-500 cursor-pointer">
                ${this.EXAM_CATEGORIES.map(c => `<option value="${c.id}" ${(exam.category || this.inferExamCategory(exam)) === c.id ? 'selected' : ''}>${c.label}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">Đợt thi / Kỳ thi</label>
              <input type="text" id="accessExamRound" value="${(exam.roundLabel || 'Đợt 1').replace(/"/g, '&quot;')}" placeholder="VD: Đợt 1, HK1..." class="w-full px-3 py-2 border border-slate-200 rounded-xl font-semibold text-slate-800 outline-none focus:border-indigo-500">
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">Thời gian (phút)</label>
              <input type="number" id="accessExamTime" min="5" value="${exam.time_minutes || 90}" class="w-full px-3 py-2 border border-slate-200 rounded-xl font-semibold text-slate-800 outline-none focus:border-indigo-500">
            </div>
          </div>

          <!-- Chọn chế độ phân quyền: Tất cả / Theo khối / Từng học sinh -->
          <div class="space-y-2.5 pt-1">
            <label class="block font-bold text-slate-800 text-xs flex items-center gap-1.5">
              <i class="fa-solid fa-key text-indigo-600"></i>
              <span>Quyền tham gia bài thi (Cho phép ai được thi?)</span>
            </label>
            <input type="hidden" id="accessExamModeInput" value="${currentMode}">
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button type="button" id="accessModeBtn_all" onclick="App.onAccessModeChange('all')" class="p-3 rounded-xl border text-left transition cursor-pointer ${currentMode === 'all' ? 'border-indigo-600 bg-indigo-50/80 ring-2 ring-indigo-500/20' : 'border-slate-200 bg-white hover:bg-slate-50'}">
                <div class="font-extrabold text-slate-900 flex items-center gap-1.5">
                  <i class="fa-solid fa-users text-indigo-600"></i><span>Tất cả học sinh</span>
                </div>
                <div class="text-[11px] text-slate-500 mt-0.5">Mở cho toàn bộ học sinh trong hệ thống</div>
              </button>

              <button type="button" id="accessModeBtn_grade" onclick="App.onAccessModeChange('grade')" class="p-3 rounded-xl border text-left transition cursor-pointer ${currentMode === 'grade' ? 'border-indigo-600 bg-indigo-50/80 ring-2 ring-indigo-500/20' : 'border-slate-200 bg-white hover:bg-slate-50'}">
                <div class="font-extrabold text-slate-900 flex items-center gap-1.5">
                  <i class="fa-solid fa-layer-group text-blue-600"></i><span>Theo khối lớp</span>
                </div>
                <div class="text-[11px] text-slate-500 mt-0.5">Chỉ học sinh thuộc các khối được chọn</div>
              </button>

              <button type="button" id="accessModeBtn_custom" onclick="App.onAccessModeChange('custom')" class="p-3 rounded-xl border text-left transition cursor-pointer ${currentMode === 'custom' ? 'border-indigo-600 bg-indigo-50/80 ring-2 ring-indigo-500/20' : 'border-slate-200 bg-white hover:bg-slate-50'}">
                <div class="font-extrabold text-slate-900 flex items-center gap-1.5">
                  <i class="fa-solid fa-user-check text-amber-600"></i><span>Chỉ định học sinh</span>
                </div>
                <div class="text-[11px] text-slate-500 mt-0.5">Chọn đích danh từng học sinh được thi</div>
              </button>
            </div>
          </div>

          <!-- Khung chọn Khối 6-12 (hiện khi mode = grade) -->
          <div id="accessGradePanel" class="${currentMode === 'grade' ? '' : 'hidden'} p-4 rounded-2xl bg-blue-50/50 border border-blue-200 space-y-2">
            <div class="font-bold text-blue-900">Chọn các khối lớp được phép dự thi:</div>
            <div class="flex flex-wrap gap-2">
              ${[6, 7, 8, 9, 10, 11, 12].map(g => `
                <label class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-blue-200 cursor-pointer hover:bg-blue-50 font-bold text-slate-700">
                  <input type="checkbox" name="accessGradeCheck" value="${g}" ${selectedGrades.includes(g) ? 'checked' : ''} class="rounded text-indigo-600">
                  <span>Khối ${g}</span>
                </label>
              `).join('')}
            </div>
          </div>

          <!-- Khung chọn Từng Học Sinh (hiện khi mode = custom) -->
          <div id="accessCustomPanel" class="${currentMode === 'custom' ? '' : 'hidden'} p-4 rounded-2xl bg-amber-50/40 border border-amber-200 space-y-2.5">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div class="font-bold text-slate-800">
                Danh sách học sinh được quyền thi (<span id="accessSelectedCount" class="text-indigo-600 font-extrabold">${selectedStudents.size}</span>/${this.state.students.length} HS)
              </div>
              <div class="flex items-center gap-1.5">
                <button type="button" onclick="App.toggleAllAccessStudents(true)" class="px-2.5 py-1 bg-white hover:bg-indigo-50 border border-slate-200 rounded-lg text-[11px] font-bold text-indigo-700 cursor-pointer">Chọn tất cả</button>
                <button type="button" onclick="App.toggleAllAccessStudents(false)" class="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 cursor-pointer">Bỏ chọn</button>
              </div>
            </div>

            <div class="relative">
              <i class="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-slate-400 text-xs"></i>
              <input type="text" oninput="App.filterAccessModalStudents(this.value)" placeholder="Lọc nhanh tên học sinh, mã HS, lớp..." class="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500">
            </div>

            <div class="max-h-48 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white">
              ${this.state.students.map(st => {
                const stGrade = this.getStudentGrade(st);
                return `
                <label class="access-student-row flex items-center justify-between px-3 py-2 hover:bg-indigo-50/40 cursor-pointer" data-search="${(st.fullName + ' ' + st.studentId + ' khối ' + stGrade + ' k' + stGrade + ' ' + (st.className || '')).toLowerCase()}">
                  <div class="flex items-center gap-2.5 min-w-0">
                    <input type="checkbox" name="accessStudentCheck" value="${st.studentId}" onchange="App.updateAccessSelectedCounter()" ${selectedStudents.has(st.studentId) ? 'checked' : ''} class="rounded text-indigo-600">
                    <div class="truncate">
                      <span class="font-bold text-slate-800">${st.fullName}</span>
                      <span class="text-[11px] font-mono text-indigo-600 ml-1.5">${st.studentId}</span>
                    </div>
                  </div>
                  <span class="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold text-[11px] shrink-0">Khối ${stGrade} • Lớp ${st.className || '12'}</span>
                </label>
              `;
              }).join('')}
            </div>
          </div>

          <!-- Tùy chọn nhanh trạng thái đề & đáp án -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <label class="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/60 cursor-pointer">
              <input type="checkbox" id="accessExamIsActive" ${exam.is_active ? 'checked' : ''} class="rounded text-emerald-600">
              <span class="font-bold text-slate-700">Đang mở đề cho học sinh làm bài</span>
            </label>
            <label class="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/60 cursor-pointer">
              <input type="checkbox" id="accessExamAllowAnswers" ${exam.allow_view_answers !== false ? 'checked' : ''} class="rounded text-indigo-600">
              <span class="font-bold text-slate-700">Cho phép xem đáp án & lời giải PDF</span>
            </label>
          </div>
        </form>

        <!-- Footer cố định -->
        <div class="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2 shrink-0">
          <button type="button" onclick="document.getElementById('examAccessModal').remove()" class="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-700 cursor-pointer">Hủy</button>
          <button type="submit" form="examAccessForm" class="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition inline-flex items-center gap-1.5 cursor-pointer">
            <i class="fa-solid fa-floppy-disk"></i><span>Lưu Cấu Hình & Phân Quyền</span>
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  },

  onAccessModeChange(mode) {
    const input = document.getElementById('accessExamModeInput');
    if (input) input.value = mode;
    ['all', 'grade', 'custom'].forEach(m => {
      const btn = document.getElementById('accessModeBtn_' + m);
      if (!btn) return;
      btn.className = 'p-3 rounded-xl border text-left transition cursor-pointer ' + (
        m === mode ? 'border-indigo-600 bg-indigo-50/80 ring-2 ring-indigo-500/20' : 'border-slate-200 bg-white hover:bg-slate-50'
      );
    });
    const gradePanel = document.getElementById('accessGradePanel');
    const customPanel = document.getElementById('accessCustomPanel');
    if (gradePanel) gradePanel.classList.toggle('hidden', mode !== 'grade');
    if (customPanel) customPanel.classList.toggle('hidden', mode !== 'custom');
  },

  updateAccessSelectedCounter() {
    const countEl = document.getElementById('accessSelectedCount');
    if (!countEl) return;
    const checked = document.querySelectorAll('#examAccessModal input[name="accessStudentCheck"]:checked').length;
    countEl.textContent = checked;
  },

  toggleAllAccessStudents(selectAll) {
    document.querySelectorAll('#examAccessModal .access-student-row').forEach(row => {
      if (row.style.display === 'none') return;
      const cb = row.querySelector('input[name="accessStudentCheck"]');
      if (cb) cb.checked = selectAll;
    });
    this.updateAccessSelectedCounter();
  },

  filterAccessModalStudents(query) {
    const q = (query || '').toLowerCase().trim();
    document.querySelectorAll('#examAccessModal .access-student-row').forEach(row => {
      const text = row.getAttribute('data-search') || '';
      row.style.display = (!q || text.includes(q)) ? '' : 'none';
    });
  },

  handleExamAccessSubmit(examId) {
    const exam = this.state.exams.find(e => e.id === examId);
    if (!exam) return;

    const title = document.getElementById('accessExamTitle').value.trim();
    const grade = parseInt(document.getElementById('accessExamGrade').value, 10) || 12;
    const category = document.getElementById('accessExamCategory')?.value || exam.category || 'GK1';
    const roundLabel = document.getElementById('accessExamRound').value.trim() || 'Đợt 1';
    const time = parseInt(document.getElementById('accessExamTime').value, 10) || 90;
    const mode = document.getElementById('accessExamModeInput').value || 'all';
    const isActive = document.getElementById('accessExamIsActive').checked;
    const allowAnswers = document.getElementById('accessExamAllowAnswers').checked;

    const checkedGrades = Array.from(document.querySelectorAll('#examAccessModal input[name="accessGradeCheck"]:checked')).map(cb => parseInt(cb.value, 10));
    const checkedStudents = Array.from(document.querySelectorAll('#examAccessModal input[name="accessStudentCheck"]:checked')).map(cb => cb.value);

    if (mode === 'grade' && checkedGrades.length === 0) {
      this.notify('Vui lòng chọn ít nhất 1 khối lớp được phép dự thi!', 'warning', 'Thiếu thông tin phân quyền');
      return;
    }

    exam.title = title || exam.title;
    exam.grade = grade;
    exam.category = category;
    exam.roundLabel = roundLabel;
    exam.time_minutes = time;
    exam.is_active = isActive;
    exam.allow_view_answers = allowAnswers;
    exam.access_type = mode;
    exam.allowed_all = mode === 'all';
    exam.allowed_grades = mode === 'grade' ? checkedGrades : [grade];
    exam.allowed_students = mode === 'custom' ? checkedStudents : (exam.allowed_students || []);

    this.saveData();
    const modal = document.getElementById('examAccessModal');
    if (modal) modal.remove();
    this.render();
  },

  // --- QUẢN LÝ BẢNG HỌC SINH, XẾP KHỐI & TÌM KIẾM BỘ LỌC ---
  renderStudentTableHtml() {
    const query = (this.state.studentSearchQuery || '').toLowerCase().trim();
    const gradeFilter = this.state.studentGradeFilter || 'ALL';
    const classFilter = this.state.studentClassFilter || 'ALL';
    const statusFilter = this.state.studentStatusFilter || 'ALL';

    const filtered = this.state.students.filter(st => {
      const stGrade = this.getStudentGrade(st);
      if (gradeFilter !== 'ALL' && String(stGrade) !== String(gradeFilter)) return false;
      if (classFilter !== 'ALL' && (st.className || '12A1') !== classFilter) return false;
      if (statusFilter !== 'ALL') {
        const isActive = st.status === 'active';
        if (statusFilter === 'active' && !isActive) return false;
        if (statusFilter === 'locked' && isActive) return false;
      }
      if (query) {
        const matchId = (st.studentId || '').toLowerCase().includes(query);
        const matchName = (st.fullName || '').toLowerCase().includes(query);
        const matchPhone = (st.phone || '').toLowerCase().includes(query);
        const matchClass = (st.className || '').toLowerCase().includes(query);
        const matchGrade = (`khối ${stGrade} k${stGrade} lớp ${stGrade}`).includes(query);
        const matchParent = (st.parentName || '').toLowerCase().includes(query);
        const matchNotes = (st.notes || '').toLowerCase().includes(query);
        if (!matchId && !matchName && !matchPhone && !matchClass && !matchGrade && !matchParent && !matchNotes) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      return `
        <div class="p-12 text-center text-slate-400 bg-white">
          <i class="fa-solid fa-user-slash text-3xl mb-2 text-slate-300"></i>
          <p class="text-sm font-semibold">Không tìm thấy học sinh nào phù hợp với bộ lọc.</p>
          <button onclick="App.resetStudentFilter()" class="mt-3 px-3.5 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-bold transition cursor-pointer">
            <i class="fa-solid fa-rotate-left mr-1"></i>Đặt lại bộ lọc
          </button>
        </div>
      `;
    }

    return `
      <div class="max-h-[520px] overflow-y-auto overflow-x-auto rounded-xl border border-slate-200/80 shadow-2xs">
        <table class="min-w-full divide-y divide-slate-200 text-sm">
          <thead class="bg-slate-100 text-xs uppercase tracking-wider text-slate-600 font-bold sticky top-0 z-10 shadow-2xs">
            <tr>
              <th class="w-12 px-3 py-3.5 font-bold text-center whitespace-nowrap bg-slate-100">STT</th>
              <th class="w-28 px-3 py-3.5 font-bold text-center whitespace-nowrap bg-slate-100">Mã Học Sinh</th>
              <th class="px-5 py-3.5 font-bold text-left whitespace-nowrap bg-slate-100">Họ và Tên Học Sinh</th>
              <th class="w-28 px-3 py-3.5 font-bold text-center whitespace-nowrap bg-slate-100">Xếp Khối</th>
              <th class="w-24 px-3 py-3.5 font-bold text-center whitespace-nowrap bg-slate-100">Lớp</th>
              <th class="w-40 px-4 py-3.5 font-bold text-center whitespace-nowrap bg-slate-100">Lượt nộp &amp; Điểm TB</th>
              <th class="w-24 px-3 py-3.5 font-bold text-center whitespace-nowrap bg-slate-100">Trạng thái</th>
              <th class="w-36 px-4 py-3.5 font-bold text-center whitespace-nowrap bg-slate-100">Thao tác</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 bg-white">
            ${filtered.map((st, idx) => {
              const studentSubs = this.state.submissions.filter(s => s.studentId === st.studentId);
              const validScores = studentSubs.map(s => Number(s.scoreResult.totalScore));
              const avg = validScores.length > 0 ? (validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(1) : '--';
              const nameParts = (st.fullName || '').trim().split(' ').filter(Boolean);
              const initials = nameParts.length >= 2 ? (nameParts[nameParts.length - 2][0] + nameParts[nameParts.length - 1][0]).toUpperCase() : (st.fullName ? st.fullName.substring(0, 2).toUpperCase() : 'HS');
              const isActive = st.status === 'active';
              const curGrade = this.getStudentGrade(st);

              return `
                <tr class="hover:bg-indigo-50/30 transition group">
                  <td class="px-3 py-3.5 text-center align-middle font-mono text-xs font-semibold text-slate-500 whitespace-nowrap">${idx + 1}</td>
                  <td class="px-3 py-3.5 text-center align-middle whitespace-nowrap">
                    <button type="button" onclick="App.showStudentDetailModal('${st.studentId}')" class="inline-block font-mono font-bold text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-100 text-xs transition cursor-pointer" title="Bấm để xem hồ sơ & mật khẩu học sinh">
                      ${st.studentId}
                    </button>
                  </td>
                  <td class="px-5 py-3.5 text-left align-middle min-w-[240px]">
                    <div onclick="App.showStudentDetailModal('${st.studentId}')" class="flex items-center space-x-3 cursor-pointer" title="Bấm để xem hồ sơ, mật khẩu & lịch sử thi">
                      <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                        ${initials}
                      </div>
                      <div class="min-w-0">
                        <div class="font-bold text-slate-900 group-hover:text-indigo-600 flex items-center gap-1.5 transition text-left">
                          <span>${st.fullName}</span>
                          <i class="fa-solid fa-chart-line text-[10px] text-indigo-400 group-hover:text-indigo-600 transition"></i>
                        </div>
                        <div class="text-[11px] text-slate-400 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 mt-0.5">
                          ${st.phone ? `<span class="flex items-center gap-1 text-slate-600"><i class="fa-solid fa-phone text-[10px] text-slate-400"></i>${st.phone}</span>` : ''}
                          ${st.parentName ? `<span class="flex items-center gap-1 text-slate-500"><i class="fa-solid fa-user-group text-[10px] text-slate-400"></i>${st.parentName}</span>` : ''}
                          ${st.notes ? `<span class="truncate max-w-[200px] text-slate-400 italic" title="${st.notes}">• ${st.notes}</span>` : ''}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td class="px-3 py-3.5 text-center align-middle whitespace-nowrap">
                    <select aria-label="Xếp khối học sinh ${st.fullName}" onchange="App.updateStudentGrade('${st.studentId}', this.value)" class="student-grade-select px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 outline-none cursor-pointer transition" title="Chọn để xếp khối nhanh cho học sinh">
                      ${[6, 7, 8, 9, 10, 11, 12].map(g => `<option value="${g}" ${g === curGrade ? 'selected' : ''}>Khối ${g}</option>`).join('')}
                    </select>
                  </td>
                  <td class="px-3 py-3.5 text-center align-middle whitespace-nowrap">
                    <span class="inline-block px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200/60">
                      ${st.className || '12A1'}
                    </span>
                  </td>
                  <td class="px-4 py-3.5 text-center align-middle whitespace-nowrap">
                    <div class="inline-flex items-center justify-center gap-1.5 text-xs">
                      <span class="font-bold text-slate-800">${studentSubs.length} lượt</span>
                      <span class="text-slate-300">•</span>
                      <span class="font-bold font-mono ${avg !== '--' ? (Number(avg) >= 8 ? 'text-emerald-600' : (Number(avg) >= 5 ? 'text-blue-600' : 'text-amber-600')) : 'text-slate-400'}">ĐTB: ${avg}</span>
                    </div>
                  </td>
                  <td class="px-3 py-3.5 text-center align-middle whitespace-nowrap">
                    <span class="inline-flex items-center justify-center" title="${isActive ? 'Đang hoạt động' : 'Đã khóa'}">
                      <span class="student-status-dot w-3 h-3 rounded-full ${isActive ? 'bg-emerald-500 ring-4 ring-emerald-500/20' : 'bg-red-500 ring-4 ring-red-500/20'}" aria-label="${isActive ? 'Đang hoạt động' : 'Đã khóa'}"></span>
                    </span>
                  </td>
                  <td class="px-4 py-3.5 text-center align-middle whitespace-nowrap">
                    <div class="inline-flex items-center justify-center gap-1.5">
                      <!-- Nút SỬA THÔNG TIN -->
                      <button onclick="App.showEditStudentModal('${st.studentId}')" class="h-8 px-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer border border-indigo-200/60 shadow-2xs" title="Chỉnh sửa tài khoản & mật khẩu học sinh">
                        <i class="fa-solid fa-user-pen"></i><span>Sửa</span>
                      </button>
                      <!-- Nút Khóa / Mở -->
                      <button onclick="App.toggleStudentStatus('${st.studentId}')" class="w-8 h-8 inline-flex items-center justify-center text-xs ${isActive ? 'text-slate-500 hover:text-amber-700 hover:bg-amber-50' : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'} transition rounded-lg hover:bg-slate-100 cursor-pointer" title="${isActive ? 'Khóa tài khoản này' : 'Mở khóa tài khoản'}">
                        <i class="fa-solid ${isActive ? 'fa-lock' : 'fa-lock-open'}"></i>
                      </button>
                      <!-- Nút Xóa -->
                      <button onclick="App.deleteStudent('${st.studentId}')" class="w-8 h-8 inline-flex items-center justify-center text-xs text-red-500 hover:text-red-700 transition rounded-lg hover:bg-red-50 cursor-pointer" title="Xóa học sinh">
                        <i class="fa-solid fa-trash-can"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  onStudentFilterInput(field, val) {
    if (field === 'query') {
      this.state.studentSearchQuery = val;
      const container = document.getElementById('adminStudentTableContainer');
      if (container) {
        container.innerHTML = this.renderStudentTableHtml();
        return;
      }
    }
    if (field === 'grade') this.state.studentGradeFilter = val;
    if (field === 'class') this.state.studentClassFilter = val;
    if (field === 'status') this.state.studentStatusFilter = val;
    this.render();
  },

  resetStudentFilter() {
    this.state.studentSearchQuery = '';
    this.state.studentGradeFilter = 'ALL';
    this.state.studentClassFilter = 'ALL';
    this.state.studentStatusFilter = 'ALL';
    this.render();
  },

  updateStudentGrade(studentId, newGrade) {
    const st = this.state.students.find(s => s.studentId === studentId);
    const g = parseInt(newGrade, 10);
    if (!st || !Number.isInteger(g) || g < 6 || g > 12) return;
    st.grade = g;
    st.updatedAt = new Date().toISOString();
    if (this.state.currentUser && this.state.currentUser.studentId === studentId) {
      this.state.currentUser.grade = g;
      sessionStorage.setItem('thpt_current_user', JSON.stringify(this.state.currentUser));
    }
    this.saveData();
    this.render();
  },

  // --- MỤC XẾP KHỐI CHO HỌC SINH (HÀNG LOẠT / THEO LỚP / NHÓM) ---
  showBulkGradeModal() {
    const existing = document.getElementById('bulkGradeModal');
    if (existing) existing.remove();

    const defaultTargetGrade = (this.state.studentGradeFilter && this.state.studentGradeFilter !== 'ALL')
      ? Number(this.state.studentGradeFilter)
      : 12;
    const allClasses = [...new Set(this.state.students.map(s => s.className || '12A1'))];

    const modal = document.createElement('div');
    modal.id = 'bulkGradeModal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-fade-in';
    modal.innerHTML = `
      <div class="bg-white rounded-3xl max-w-2xl w-full max-h-[88vh] flex flex-col border border-slate-200 shadow-2xl overflow-hidden">
        <div class="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50/70 via-white to-slate-50 flex items-center justify-between shrink-0">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm">
              <i class="fa-solid fa-layer-group text-base"></i>
            </div>
            <div>
              <h3 class="font-extrabold text-base text-slate-900">Xếp Khối Cho Học Sinh (Khối 6 – 12)</h3>
              <p class="text-xs text-slate-500 mt-0.5">Chọn học sinh hoặc cả lớp để phân vào khối tương ứng phục vụ mở đề &amp; chuyên đề</p>
            </div>
          </div>
          <button type="button" onclick="document.getElementById('bulkGradeModal').remove()" class="text-slate-400 hover:text-slate-600 cursor-pointer w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 transition">
            <i class="fa-solid fa-xmark text-base"></i>
          </button>
        </div>

        <form id="bulkGradeForm" onsubmit="event.preventDefault(); App.handleBulkGradeSubmit();" class="p-6 space-y-4 text-xs overflow-y-auto flex-1">
          <!-- Chọn khối đích -->
          <div class="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200 space-y-2.5">
            <label class="block font-extrabold text-indigo-950 text-xs uppercase tracking-wider">
              <i class="fa-solid fa-bullseye text-indigo-600 mr-1.5"></i>1. Chọn khối lớp cần xếp vào *
            </label>
            <input type="hidden" id="bulkTargetGradeInput" value="${defaultTargetGrade}">
            <div class="grid grid-cols-4 sm:grid-cols-7 gap-2" id="bulkTargetGradeButtons">
              ${[6, 7, 8, 9, 10, 11, 12].map(g => `
                <button type="button" data-grade="${g}" onclick="App.selectBulkTargetGrade(${g})" class="bulk-target-grade-btn py-2 px-2 rounded-xl font-bold text-xs border transition cursor-pointer ${g === defaultTargetGrade ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:bg-indigo-50'}">
                  Khối ${g}
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Bộ lọc chọn học sinh -->
          <div class="space-y-2.5">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <span class="font-extrabold text-slate-800 uppercase tracking-wider">
                <i class="fa-solid fa-user-check text-indigo-600 mr-1.5"></i>2. Chọn học sinh áp dụng (<span id="bulkGradeSelectedCount">0</span> đã chọn)
              </span>
              <div class="flex items-center gap-2">
                <button type="button" onclick="App.toggleAllBulkGradeStudents(true)" class="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold cursor-pointer">Chọn tất cả đang lọc</button>
                <button type="button" onclick="App.toggleAllBulkGradeStudents(false)" class="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold cursor-pointer">Bỏ chọn</button>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div class="sm:col-span-1 relative">
                <i class="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-slate-400"></i>
                <input type="text" id="bulkGradeSearchInput" oninput="App.filterBulkGradeStudents()" placeholder="Tìm tên, mã HS..." class="w-full pl-8 pr-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-500">
              </div>
              <select id="bulkGradeFilterCurGrade" onchange="App.filterBulkGradeStudents()" class="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 outline-none cursor-pointer">
                <option value="ALL">Tất cả khối hiện tại</option>
                ${[6, 7, 8, 9, 10, 11, 12].map(g => `<option value="${g}">Đang ở Khối ${g}</option>`).join('')}
              </select>
              <select id="bulkGradeFilterClass" onchange="App.filterBulkGradeStudents()" class="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 outline-none cursor-pointer">
                <option value="ALL">Tất cả các lớp</option>
                ${allClasses.map(c => `<option value="${c}">Lớp ${c}</option>`).join('')}
              </select>
            </div>

            <div class="max-h-60 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-2xl bg-white">
              ${this.state.students.map(st => {
                const g = this.getStudentGrade(st);
                return `
                  <label class="bulk-grade-student-row flex items-center justify-between px-3.5 py-2.5 hover:bg-indigo-50/40 cursor-pointer" data-grade="${g}" data-class="${st.className || '12A1'}" data-search="${(st.fullName + ' ' + st.studentId + ' ' + (st.className || '')).toLowerCase()}">
                    <div class="flex items-center gap-2.5 min-w-0">
                      <input type="checkbox" name="bulkGradeStudentCheck" value="${st.studentId}" onchange="App.updateBulkGradeCounter()" class="rounded text-indigo-600">
                      <div class="truncate">
                        <span class="font-bold text-slate-900">${st.fullName}</span>
                        <span class="font-mono text-indigo-600 ml-1.5">${st.studentId}</span>
                      </div>
                    </div>
                    <div class="flex items-center gap-1.5 shrink-0">
                      <span class="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 font-bold">Khối ${g}</span>
                      <span class="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold">Lớp ${st.className || '12A1'}</span>
                    </div>
                  </label>
                `;
              }).join('')}
            </div>
          </div>
        </form>

        <div class="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2.5 shrink-0">
          <button type="button" onclick="document.getElementById('bulkGradeModal').remove()" class="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold rounded-xl text-xs transition cursor-pointer">
            Hủy
          </button>
          <button type="submit" form="bulkGradeForm" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-200 transition inline-flex items-center gap-1.5 cursor-pointer">
            <i class="fa-solid fa-floppy-disk"></i><span>Lưu Xếp Khối</span>
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  },

  selectBulkTargetGrade(g) {
    const inp = document.getElementById('bulkTargetGradeInput');
    if (inp) inp.value = String(g);
    document.querySelectorAll('#bulkGradeModal .bulk-target-grade-btn').forEach(btn => {
      const active = Number(btn.getAttribute('data-grade')) === Number(g);
      btn.className = 'bulk-target-grade-btn py-2 px-2 rounded-xl font-bold text-xs border transition cursor-pointer ' + (
        active ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:bg-indigo-50'
      );
    });
  },

  filterBulkGradeStudents() {
    const q = (document.getElementById('bulkGradeSearchInput')?.value || '').toLowerCase().trim();
    const gFilter = document.getElementById('bulkGradeFilterCurGrade')?.value || 'ALL';
    const cFilter = document.getElementById('bulkGradeFilterClass')?.value || 'ALL';
    document.querySelectorAll('#bulkGradeModal .bulk-grade-student-row').forEach(row => {
      const matchQ = !q || (row.getAttribute('data-search') || '').includes(q);
      const matchG = gFilter === 'ALL' || row.getAttribute('data-grade') === String(gFilter);
      const matchC = cFilter === 'ALL' || row.getAttribute('data-class') === cFilter;
      row.style.display = (matchQ && matchG && matchC) ? '' : 'none';
    });
  },

  toggleAllBulkGradeStudents(selectAll) {
    document.querySelectorAll('#bulkGradeModal .bulk-grade-student-row').forEach(row => {
      if (row.style.display === 'none') return;
      const cb = row.querySelector('input[name="bulkGradeStudentCheck"]');
      if (cb) cb.checked = selectAll;
    });
    this.updateBulkGradeCounter();
  },

  updateBulkGradeCounter() {
    const el = document.getElementById('bulkGradeSelectedCount');
    if (!el) return;
    el.textContent = document.querySelectorAll('#bulkGradeModal input[name="bulkGradeStudentCheck"]:checked').length;
  },

  handleBulkGradeSubmit() {
    const targetGrade = parseInt(document.getElementById('bulkTargetGradeInput')?.value || '12', 10);
    const checkedIds = Array.from(document.querySelectorAll('#bulkGradeModal input[name="bulkGradeStudentCheck"]:checked')).map(cb => cb.value);
    if (!Number.isInteger(targetGrade) || targetGrade < 6 || targetGrade > 12) return;
    if (checkedIds.length === 0) {
      this.notify('Vui lòng tích chọn ít nhất 1 học sinh để xếp khối!', 'warning', 'Chưa chọn học sinh');
      return;
    }

    const idSet = new Set(checkedIds);
    const now = new Date().toISOString();
    this.state.students.forEach(st => {
      if (idSet.has(st.studentId)) {
        st.grade = targetGrade;
        st.updatedAt = now;
      }
    });
    if (this.state.currentUser && idSet.has(this.state.currentUser.studentId)) {
      this.state.currentUser.grade = targetGrade;
      sessionStorage.setItem('thpt_current_user', JSON.stringify(this.state.currentUser));
    }

    this.saveData();
    document.getElementById('bulkGradeModal')?.remove();
    this.render();
    this.notify(`Đã xếp ${checkedIds.length} học sinh vào Khối ${targetGrade} thành công!`, 'success', 'Xếp khối thành công');
  },

  // --- CẤP TÀI KHOẢN HỌC SINH MỚI (MODAL NÂNG CẤP) ---
  showAddStudentModal() {
    const nextIdx = this.state.students.length + 1;
    const defaultCode = `HS2027` + String(nextIdx).padStart(2, '0');
    const defaultGrade = (this.state.studentGradeFilter && this.state.studentGradeFilter !== 'ALL')
      ? Number(this.state.studentGradeFilter)
      : 12;

    const modal = document.createElement('div');
    modal.id = 'addStudentModal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-fade-in';
    modal.innerHTML = `
      <div class="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8">
        <div class="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50/70 via-white to-slate-50 flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm">
              <i class="fa-solid fa-user-plus text-base"></i>
            </div>
            <div>
              <h3 class="font-extrabold text-base text-slate-900">Thêm Học Sinh Mới</h3>
              <p class="text-xs text-slate-500 mt-0.5">Khởi tạo hồ sơ học sinh, xếp khối (Khối 6 – 12), mật khẩu và liên hệ</p>
            </div>
          </div>
          <button onclick="document.getElementById('addStudentModal').remove()" class="text-slate-400 hover:text-slate-600 cursor-pointer w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 transition">
            <i class="fa-solid fa-xmark text-base"></i>
          </button>
        </div>

        <form onsubmit="event.preventDefault(); App.handleAddStudentSubmit();" class="p-6 space-y-4 text-sm">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Mã Học Sinh *</label>
              <input type="text" id="newStudentId" required value="${defaultCode}" placeholder="VD: HS202705" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono font-bold uppercase text-indigo-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none">
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Họ và Tên Học Sinh *</label>
              <input type="text" id="newStudentName" required placeholder="VD: Hoàng Gia Bảo" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none">
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Xếp khối (6 – 12) *</label>
              <select id="newStudentGrade" onchange="App.syncClassFromGradeSelect(this.value, 'newStudentClass')" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-bold text-indigo-700 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none cursor-pointer">
                ${[6, 7, 8, 9, 10, 11, 12].map(g => `<option value="${g}" ${g === defaultGrade ? 'selected' : ''}>Khối ${g}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Lớp / Nhóm học *</label>
              <input type="text" id="newStudentClass" value="${defaultGrade}A1" oninput="App.syncGradeFromClassInput(this.value, 'newStudentGrade')" required placeholder="VD: 12A1, Ca 1..." class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none">
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Mật khẩu cấp *</label>
              <input type="text" id="newStudentPass" value="123" required class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none">
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Số điện thoại / Zalo</label>
              <input type="tel" id="newStudentPhone" placeholder="VD: 0912345678" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none">
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Họ tên Phụ huynh</label>
              <input type="text" id="newStudentParent" placeholder="VD: Bác Nam (Bố)" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none">
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Ghi chú của giáo viên</label>
            <input type="text" id="newStudentNotes" placeholder="VD: Học sinh khá, cần củng cố hình học không gian..." class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none">
          </div>

          <div class="pt-4 border-t border-slate-200 flex justify-end space-x-2.5">
            <button type="button" onclick="document.getElementById('addStudentModal').remove()" class="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition cursor-pointer">
              Hủy
            </button>
            <button type="submit" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-200 transition flex items-center gap-1.5 cursor-pointer">
              <i class="fa-solid fa-user-plus"></i>Cấp Tài Khoản
            </button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modal);
  },

  handleAddStudentSubmit() {
    const id = document.getElementById('newStudentId').value.trim().toUpperCase();
    const name = document.getElementById('newStudentName').value.trim();
    const gradeVal = parseInt(document.getElementById('newStudentGrade')?.value || '12', 10);
    const grade = (Number.isInteger(gradeVal) && gradeVal >= 6 && gradeVal <= 12) ? gradeVal : 12;
    const cls = document.getElementById('newStudentClass').value.trim();
    const pass = document.getElementById('newStudentPass').value.trim();
    const phone = (document.getElementById('newStudentPhone')?.value || '').trim();
    const parent = (document.getElementById('newStudentParent')?.value || '').trim();
    const notes = (document.getElementById('newStudentNotes')?.value || '').trim();

    if (!id || !name) {
      this.notify('Vui lòng nhập đầy đủ Mã học sinh và Họ tên!', 'warning', 'Thiếu thông tin bắt buộc');
      return;
    }

    if (this.state.students.some(s => s.studentId === id)) {
      this.notify('Mã học sinh này đã tồn tại trên hệ thống!', 'error', 'Trùng mã học sinh');
      return;
    }

    this.state.students.push({
      studentId: id,
      fullName: name,
      grade: grade,
      className: cls || `${grade}A1`,
      password: pass || '123',
      phone: phone,
      parentName: parent,
      notes: notes,
      status: 'active',
      createdAt: new Date().toISOString(),
      allowedExams: ['EXAM-2027-01'],
      allowedHomeworks: ['HW-2027-01']
    });

    this.saveData();
    const modal = document.getElementById('addStudentModal');
    if (modal) modal.remove();
    this.render();
    this.notify(`Đã cấp thành công tài khoản cho học sinh: ${name} (Mã: ${id} • Khối ${grade}).`, 'success', 'Cấp tài khoản thành công');
  },

  // --- CHỈNH SỬA TÀI KHOẢN & THÔNG TIN HỌC SINH (ADMIN EDIT MODAL) ---
  showEditStudentModal(studentId) {
    const student = this.state.students.find(s => s.studentId === studentId);
    if (!student) {
      this.notify('Không tìm thấy hồ sơ học sinh trong hệ thống!', 'error', 'Không tìm thấy dữ liệu');
      return;
    }
    const curGrade = this.getStudentGrade(student);

    const modal = document.createElement('div');
    modal.id = 'editStudentModal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-fade-in';
    modal.innerHTML = `
      <div class="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8">
        <div class="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50/70 via-white to-slate-50 flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm">
              <i class="fa-solid fa-user-pen text-base"></i>
            </div>
            <div>
              <h3 class="font-extrabold text-base text-slate-900">Chỉnh Sửa Hồ Sơ Học Sinh</h3>
              <p class="text-xs text-slate-500 mt-0.5">Mã hiện tại: <span class="font-mono text-indigo-600 font-bold">${student.studentId}</span> • Khối ${curGrade}</p>
            </div>
          </div>
          <button onclick="document.getElementById('editStudentModal').remove()" class="text-slate-400 hover:text-slate-600 cursor-pointer w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 transition">
            <i class="fa-solid fa-xmark text-base"></i>
          </button>
        </div>

        <form onsubmit="event.preventDefault(); App.handleEditStudentSubmit('${student.studentId}');" class="p-6 space-y-4 text-sm">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Mã Học Sinh <span class="text-indigo-600 font-normal">(Định danh)</span> *</label>
              <input type="text" id="editStudentId" required value="${student.studentId}" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono font-bold uppercase text-indigo-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none">
              <p class="text-[11px] text-amber-600 mt-1"><i class="fa-solid fa-circle-info mr-1"></i>Đổi mã sẽ tự động cập nhật đồng bộ các bài thi cũ.</p>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Họ và Tên Học Sinh *</label>
              <input type="text" id="editStudentName" required value="${student.fullName}" placeholder="Nguyễn Văn An" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none">
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Xếp khối (6 – 12) *</label>
              <select id="editStudentGrade" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-bold text-indigo-700 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none cursor-pointer">
                ${[6, 7, 8, 9, 10, 11, 12].map(g => `<option value="${g}" ${g === curGrade ? 'selected' : ''}>Khối ${g}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Lớp / Nhóm học *</label>
              <input type="text" id="editStudentClass" required value="${student.className || '12A1'}" placeholder="12A1" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none">
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>Mật khẩu tài khoản *</span>
                <button type="button" onclick="const p=document.getElementById('editStudentPass');p.value='123';p.type='text';const ic=document.getElementById('editStudentPassEyeIcon');if(ic)ic.className='fa-solid fa-eye-slash text-xs';" class="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer">Đặt lại '123'</button>
              </label>
              <div class="relative">
                <input type="password" id="editStudentPass" required value="${student.password || '123'}" class="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-300 font-mono text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none">
                <button type="button" id="toggleEditStudentPassBtn" onclick="App.toggleInputPassword('editStudentPass', 'editStudentPassEyeIcon')" class="absolute inset-y-0 right-0 px-3 flex items-center text-slate-400 hover:text-indigo-600 cursor-pointer" title="Bấm để xem hoặc ẩn mật khẩu">
                  <i id="editStudentPassEyeIcon" class="fa-solid fa-eye text-xs"></i>
                </button>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Số điện thoại / Zalo</label>
              <input type="tel" id="editStudentPhone" value="${student.phone || ''}" placeholder="0912345678" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none">
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Họ tên Phụ huynh / Liên hệ</label>
              <input type="text" id="editStudentParent" value="${student.parentName || ''}" placeholder="Bác Nam (Phụ huynh)" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none">
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Trạng thái tài khoản</label>
              <select id="editStudentStatus" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none cursor-pointer">
                <option value="active" ${student.status === 'active' ? 'selected' : ''}>Đang hoạt động (Được phép đăng nhập)</option>
                <option value="locked" ${student.status !== 'active' ? 'selected' : ''}>Đã khóa (Không thể đăng nhập)</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Ghi chú của giáo viên</label>
              <input type="text" id="editStudentNotes" value="${student.notes || ''}" placeholder="VD: Học sinh cần chú ý hình học không gian..." class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none">
            </div>
          </div>

          <div class="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button type="button" onclick="App.deleteStudent('${student.studentId}')" class="text-xs font-bold text-red-600 hover:text-red-700 hover:underline flex items-center gap-1 cursor-pointer">
              <i class="fa-solid fa-trash-can"></i>Xóa học sinh này
            </button>
            <div class="flex items-center space-x-2.5 w-full sm:w-auto">
              <button type="button" onclick="document.getElementById('editStudentModal').remove()" class="flex-1 sm:flex-none px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition cursor-pointer">
                Hủy
              </button>
              <button type="submit" class="flex-1 sm:flex-none px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-200 transition flex items-center justify-center gap-1.5 cursor-pointer">
                <i class="fa-solid fa-floppy-disk"></i>Lưu Thay Đổi
              </button>
            </div>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modal);
  },

  handleEditStudentSubmit(originalId) {
    const newId = document.getElementById('editStudentId').value.trim().toUpperCase();
    const name = document.getElementById('editStudentName').value.trim();
    const gradeVal = parseInt(document.getElementById('editStudentGrade')?.value || '12', 10);
    const grade = (Number.isInteger(gradeVal) && gradeVal >= 6 && gradeVal <= 12) ? gradeVal : 12;
    const cls = document.getElementById('editStudentClass').value.trim();
    const pass = document.getElementById('editStudentPass').value.trim();
    const phone = document.getElementById('editStudentPhone').value.trim();
    const parent = document.getElementById('editStudentParent').value.trim();
    const status = document.getElementById('editStudentStatus').value;
    const notes = document.getElementById('editStudentNotes').value.trim();

    if (!newId || !name) {
      this.notify('Vui lòng nhập đầy đủ Mã học sinh và Họ tên!', 'warning', 'Thiếu thông tin bắt buộc');
      return;
    }

    if (newId !== originalId && this.state.students.some(s => s.studentId === newId)) {
      this.notify(`Mã học sinh "${newId}" đã tồn tại! Vui lòng chọn mã khác.`, 'error', 'Trùng mã học sinh');
      return;
    }

    const student = this.state.students.find(s => s.studentId === originalId);
    if (!student) return;

    // Đồng bộ sang submissions, exams và homeworks nếu đổi mã học sinh
    if (newId !== originalId) {
      this.state.submissions.forEach(sub => {
        if (sub.studentId === originalId) {
          sub.studentId = newId;
          sub.studentName = name;
        }
      });
      this.state.exams.forEach(ex => {
        if (ex.allowed_students) {
          ex.allowed_students = ex.allowed_students.map(sid => sid === originalId ? newId : sid);
        }
      });
      (this.state.homeworks || []).forEach(hw => {
        if (hw.allowedStudents) {
          hw.allowedStudents = hw.allowedStudents.map(sid => sid === originalId ? newId : sid);
        }
      });
      if (this.state.currentUser && this.state.currentUser.studentId === originalId) {
        this.state.currentUser.studentId = newId;
        this.state.currentUser.fullName = name;
        sessionStorage.setItem('thpt_current_user', JSON.stringify(this.state.currentUser));
      }
    }

    student.studentId = newId;
    student.fullName = name;
    student.grade = grade;
    student.className = cls || `${grade}A1`;
    student.password = pass || '123';
    student.phone = phone;
    student.parentName = parent;
    student.status = status;
    student.notes = notes;
    student.updatedAt = new Date().toISOString();

    if (this.state.currentUser && this.state.currentUser.studentId === newId) {
      this.state.currentUser = { ...this.state.currentUser, ...student };
      sessionStorage.setItem('thpt_current_user', JSON.stringify(this.state.currentUser));
    }

    this.saveData();
    const modal = document.getElementById('editStudentModal');
    if (modal) modal.remove();
    this.render();
    this.notify(`Đã cập nhật thông tin học sinh "${name}" (${newId} • Khối ${grade}) thành công!`, 'success', 'Lưu hồ sơ thành công');
  },

  // --- HỌC SINH TỰ CHỈNH SỬA HỒ SƠ & MẬT KHẨU CÁ NHÂN ---
  showStudentSelfEditModal() {
    const u = this.state.currentUser;
    if (!u || u.role !== 'student') return;
    const currentStudent = this.state.students.find(s => s.studentId === u.studentId) || u;

    const modal = document.createElement('div');
    modal.id = 'selfEditStudentModal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-fade-in';
    modal.innerHTML = `
      <div class="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden my-8">
        <div class="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50/70 via-white to-slate-50 flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm">
              <i class="fa-solid fa-user-gear"></i>
            </div>
            <div>
              <h3 class="font-extrabold text-base text-slate-900">Hồ Sơ Cá Nhân &amp; Đổi Mật Khẩu</h3>
              <p class="text-xs text-slate-500 mt-0.5">Tài khoản học sinh: <span class="font-mono text-indigo-600 font-bold">${currentStudent.studentId}</span></p>
            </div>
          </div>
          <button onclick="document.getElementById('selfEditStudentModal').remove()" class="text-slate-400 hover:text-slate-600 cursor-pointer w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 transition">
            <i class="fa-solid fa-xmark text-base"></i>
          </button>
        </div>

        <form onsubmit="event.preventDefault(); App.handleStudentSelfEditSubmit();" class="p-6 space-y-4 text-sm">
          <div class="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs flex justify-between items-center">
            <div>Mã học sinh: <strong class="font-mono text-indigo-700">${currentStudent.studentId}</strong></div>
            <div>Khối <strong class="text-indigo-700">${this.getStudentGrade(currentStudent)}</strong> • Lớp <strong class="text-slate-800">${currentStudent.className || '12'}</strong></div>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Họ và Tên Học Sinh *</label>
            <input type="text" id="selfEditName" required value="${currentStudent.fullName}" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none">
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Số điện thoại / Zalo</label>
            <input type="tel" id="selfEditPhone" value="${currentStudent.phone || ''}" placeholder="0912345678" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none">
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Mật khẩu mới (Để đăng nhập lần sau) *</label>
            <input type="text" id="selfEditPass" required value="${currentStudent.password || '123'}" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none">
          </div>

          <div class="pt-3 border-t border-slate-200 flex justify-end space-x-2.5">
            <button type="button" onclick="document.getElementById('selfEditStudentModal').remove()" class="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition cursor-pointer">
              Hủy
            </button>
            <button type="submit" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-200 transition flex items-center gap-1.5 cursor-pointer">
              <i class="fa-solid fa-floppy-disk"></i>Lưu Thay Đổi
            </button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modal);
  },

  handleStudentSelfEditSubmit() {
    const u = this.state.currentUser;
    if (!u || u.role !== 'student') return;

    const name = document.getElementById('selfEditName').value.trim();
    const phone = document.getElementById('selfEditPhone').value.trim();
    const pass = document.getElementById('selfEditPass').value.trim();

    if (!name || !pass) {
      this.notify('Vui lòng nhập đầy đủ Họ tên và Mật khẩu!', 'warning', 'Thiếu thông tin bắt buộc');
      return;
    }

    const student = this.state.students.find(s => s.studentId === u.studentId);
    if (student) {
      student.fullName = name;
      student.phone = phone;
      student.password = pass;
      student.passwordChangedByStudent = true;
      student.lastPasswordChange = new Date().toISOString();
      student.updatedAt = new Date().toISOString();
    }

    // Cascade cập nhật họ tên sang tất cả bài thi cũ để đồng bộ 100%
    this.state.submissions.forEach(sub => {
      if (sub.studentId === u.studentId) {
        sub.studentName = name;
      }
    });

    u.fullName = name;
    u.phone = phone;
    u.password = pass;
    sessionStorage.setItem('thpt_current_user', JSON.stringify(u));

    this.saveData();
    const modal = document.getElementById('selfEditStudentModal');
    if (modal) modal.remove();
    this.render();
    this.notify('Đã cập nhật thông tin cá nhân và mật khẩu thành công! Mật khẩu mới đã được đồng bộ với hệ thống giáo viên.', 'success', 'Cập nhật hồ sơ thành công');
  },

  toggleStudentStatus(id) {
    const s = this.state.students.find(x => x.studentId === id);
    if (s) {
      s.status = s.status === 'active' ? 'locked' : 'active';
      this.saveData();
      this.render();
    }
  },

  deleteStudent(id) {
    const st = this.state.students.find(x => x.studentId === id);
    this.confirmDialog(
      `Bạn có chắc chắn muốn xóa tài khoản học sinh ${st ? `"${st.fullName}" (${id})` : id} khỏi hệ thống?`,
      () => {
        this.state.students = this.state.students.filter(x => x.studentId !== id);
        this.saveData();
        document.getElementById('editStudentModal')?.remove();
        this.render();
      },
      {
        type: 'danger',
        title: 'Xóa tài khoản học sinh?',
        confirmText: 'Xóa học sinh',
        cancelText: 'Hủy'
      }
    );
  },

  // --- BỘ CÔNG CỤ BẢNG ĐÁP ÁN CHẤM ĐIỂM TỰ ĐỘNG 3 PHẦN CHO ĐỀ PDF ---
  initAnswerKeyDraft(exam = null) {
    if (exam) {
      this.state.answerKeyDraft = {
        p1: (exam.part1 || []).map(q => (q.correct_answer || '').trim().toUpperCase()),
        p2: (exam.part2 || []).map(q => {
          const obj = { a: null, b: null, c: null, d: null };
          (q.statements || q.items || []).forEach(st => {
            const k = st.sub_id || st.key;
            if (k && st.correct !== undefined && st.correct !== null) obj[k] = Boolean(st.correct);
          });
          return obj;
        }),
        p3: (exam.part3 || []).map(q => (q.correct_answer !== undefined && q.correct_answer !== null) ? String(q.correct_answer) : '')
      };
    } else {
      this.state.answerKeyDraft = {
        p1: Array(12).fill(''),
        p2: Array.from({ length: 4 }, () => ({ a: null, b: null, c: null, d: null })),
        p3: Array(6).fill('')
      };
    }
    return this.state.answerKeyDraft;
  },

  parseQuickP1String(raw, currentP1 = []) {
    const nextP1 = [...currentP1];
    const str = String(raw || '').trim();
    if (!str) return { nextP1, matched: 0 };

    let matched = 0;
    const pairRegex = /(\d{1,2})\s*[:.\-=)]?\s*([A-Da-d])(?![A-Za-z])/g;
    let m;
    while ((m = pairRegex.exec(str)) !== null) {
      const idx = parseInt(m[1], 10) - 1;
      if (idx >= 0 && idx < 50) {
        while (nextP1.length <= idx) nextP1.push('');
        nextP1[idx] = m[2].toUpperCase();
        matched++;
      }
    }

    if (matched === 0) {
      const letters = str.toUpperCase().match(/[A-D]/g) || [];
      letters.slice(0, 50).forEach((ch, idx) => {
        while (nextP1.length <= idx) nextP1.push('');
        nextP1[idx] = ch;
        matched++;
      });
    }
    return { nextP1, matched };
  },

  buildPartsFromDraft(draft) {
    const d = draft || { p1: [], p2: [], p3: [] };
    return {
      part1: (d.p1 || []).map((ans, idx) => ({
        id: idx + 1,
        correct_answer: (ans || '').trim().toUpperCase()
      })),
      part2: (d.p2 || []).map((obj, idx) => ({
        id: idx + 1,
        statements: ['a', 'b', 'c', 'd'].map(sub => ({
          sub_id: sub,
          correct: Boolean(obj && obj[sub])
        }))
      })),
      part3: (d.p3 || []).map((ans, idx) => ({
        id: idx + 1,
        correct_answer: String(ans ?? '').trim()
      }))
    };
  },

  countAnswerKeyCompletion(draft = this.state.answerKeyDraft) {
    const d = draft || { p1: [], p2: [], p3: [] };
    const total = d.p1.length + d.p2.length + d.p3.length;
    const filledP1 = d.p1.filter(Boolean).length;
    const filledP2 = d.p2.filter(o => o && ['a', 'b', 'c', 'd'].every(k => o[k] === true || o[k] === false)).length;
    const filledP3 = d.p3.filter(v => String(v ?? '').trim().length > 0).length;
    return { filled: filledP1 + filledP2 + filledP3, total };
  },

  refreshAnswerKeyEditor() {
    const host = document.getElementById('answerKeyEditorHost');
    if (host) host.innerHTML = this.renderAnswerKeyEditorHtml();
  },

  resizeAnswerKeyDraft(part, val) {
    const d = this.state.answerKeyDraft || this.initAnswerKeyDraft();
    const maxMap = { p1: 50, p2: 20, p3: 30 };
    const n = Math.max(0, Math.min(maxMap[part] || 50, parseInt(val, 10) || 0));
    if (part === 'p1') {
      d.p1 = Array.from({ length: n }, (_, i) => d.p1[i] || '');
    } else if (part === 'p2') {
      d.p2 = Array.from({ length: n }, (_, i) => d.p2[i] || { a: null, b: null, c: null, d: null });
    } else if (part === 'p3') {
      d.p3 = Array.from({ length: n }, (_, i) => d.p3[i] ?? '');
    }
    this.refreshAnswerKeyEditor();
  },

  setDraftP1(idx, opt) {
    const d = this.state.answerKeyDraft;
    if (!d) return;
    d.p1[idx] = d.p1[idx] === opt ? '' : opt;
    this.refreshAnswerKeyEditor();
  },

  setDraftP2(idx, sub, boolVal) {
    const d = this.state.answerKeyDraft;
    if (!d || !d.p2[idx]) return;
    d.p2[idx][sub] = d.p2[idx][sub] === boolVal ? null : boolVal;
    this.refreshAnswerKeyEditor();
  },

  setDraftP3(idx, val) {
    const d = this.state.answerKeyDraft;
    if (!d) return;
    d.p3[idx] = String(val ?? '').trim();
    const badge = document.getElementById('answerKeyProgressBadge');
    if (badge) {
      const c = this.countAnswerKeyCompletion(d);
      badge.textContent = `Đã nhập ${c.filled}/${c.total} câu`;
    }
  },

  applyQuickP1Input() {
    const inp = document.getElementById('quickP1Input');
    if (!inp) return;
    const d = this.state.answerKeyDraft || this.initAnswerKeyDraft();
    const { nextP1, matched } = this.parseQuickP1String(inp.value, d.p1);
    if (matched > 0) {
      d.p1 = nextP1;
      this.refreshAnswerKeyEditor();
    }
  },

  fillSampleAnswerKey() {
    this.initAnswerKeyDraft(SAMPLE_EXAM_2027);
    this.refreshAnswerKeyEditor();
  },

  renderAnswerKeyEditorHtml() {
    const d = this.state.answerKeyDraft || this.initAnswerKeyDraft();
    const comp = this.countAnswerKeyCompletion(d);

    return `
      <div class="border border-slate-200 rounded-2xl p-4 bg-slate-50 space-y-3.5 text-xs">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="font-bold text-slate-800 flex items-center gap-1.5">
            <i class="fa-solid fa-table-list text-indigo-600"></i>
            <span>3. Bảng Đáp Án Chấm Điểm Tự Động (3 Phần)</span>
            <span id="answerKeyProgressBadge" class="ml-1 px-2 py-0.5 rounded-full text-[11px] font-mono ${comp.filled === comp.total && comp.total > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800'}">Đã nhập ${comp.filled}/${comp.total} câu</span>
          </div>
          <button type="button" onclick="App.fillSampleAnswerKey()" class="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer">
            <i class="fa-solid fa-bolt mr-1"></i>Điền mẫu thử
          </button>
        </div>

        <!-- Chỉnh số câu mỗi phần & nhập nhanh Phần I -->
        <div class="grid grid-cols-3 sm:grid-cols-6 gap-2 items-end bg-white p-2.5 rounded-xl border border-slate-200">
          <div>
            <label class="block text-[10px] font-bold text-slate-500 mb-0.5">Số câu P.I</label>
            <input type="number" min="0" max="50" value="${d.p1.length}" onchange="App.resizeAnswerKeyDraft('p1', this.value)" class="w-full px-2 py-1 border border-slate-200 rounded-lg font-mono font-bold text-indigo-700 text-center">
          </div>
          <div>
            <label class="block text-[10px] font-bold text-slate-500 mb-0.5">Số câu P.II</label>
            <input type="number" min="0" max="20" value="${d.p2.length}" onchange="App.resizeAnswerKeyDraft('p2', this.value)" class="w-full px-2 py-1 border border-slate-200 rounded-lg font-mono font-bold text-emerald-700 text-center">
          </div>
          <div>
            <label class="block text-[10px] font-bold text-slate-500 mb-0.5">Số câu P.III</label>
            <input type="number" min="0" max="30" value="${d.p3.length}" onchange="App.resizeAnswerKeyDraft('p3', this.value)" class="w-full px-2 py-1 border border-slate-200 rounded-lg font-mono font-bold text-amber-700 text-center">
          </div>
          <div class="col-span-3 flex gap-1.5">
            <input type="text" id="quickP1Input" placeholder="Dán nhanh P.I: 1C 2D 3A... hoặc CDAC..." onkeydown="if(event.key==='Enter'){event.preventDefault();App.applyQuickP1Input();}" class="flex-1 px-2.5 py-1 border border-slate-200 rounded-lg font-mono text-xs">
            <button type="button" onclick="App.applyQuickP1Input()" class="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-[11px] shrink-0 cursor-pointer">Điền P.I</button>
          </div>
        </div>

        <div class="max-h-72 overflow-y-auto space-y-3 pr-1">
          ${d.p1.length > 0 ? `
            <div class="space-y-1.5">
              <div class="text-[11px] font-bold text-indigo-800 uppercase">Phần I — Trắc nghiệm 4 lựa chọn (${d.p1.length} câu • 0.25đ/câu)</div>
              <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
                ${d.p1.map((ans, idx) => `
                  <div class="flex items-center justify-between bg-white px-2 py-1.5 rounded-lg border border-slate-200">
                    <span class="font-mono font-bold text-slate-600 text-[11px]">C${idx + 1}</span>
                    <div class="flex gap-1">
                      ${['A', 'B', 'C', 'D'].map(opt => `
                        <button type="button" onclick="App.setDraftP1(${idx}, '${opt}')" class="w-5 h-5 rounded text-[10px] font-bold border transition cursor-pointer ${ans === opt ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-indigo-50'}">${opt}</button>
                      `).join('')}
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          ${d.p2.length > 0 ? `
            <div class="space-y-1.5">
              <div class="text-[11px] font-bold text-emerald-800 uppercase">Phần II — Đúng / Sai (${d.p2.length} câu • tối đa 1.0đ/câu)</div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                ${d.p2.map((obj, idx) => `
                  <div class="bg-white p-2 rounded-lg border border-slate-200 flex items-center justify-between gap-2">
                    <span class="font-mono font-bold text-slate-700 text-[11px] shrink-0">Câu ${idx + 1}</span>
                    <div class="flex flex-wrap gap-1.5">
                      ${['a', 'b', 'c', 'd'].map(sub => `
                        <span class="inline-flex items-center gap-0.5 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                          <b class="font-mono text-[10px] text-slate-600">${sub})</b>
                          <button type="button" onclick="App.setDraftP2(${idx}, '${sub}', true)" class="px-1.5 py-0.2 rounded text-[10px] font-bold cursor-pointer ${obj[sub] === true ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:bg-emerald-50'}">Đ</button>
                          <button type="button" onclick="App.setDraftP2(${idx}, '${sub}', false)" class="px-1.5 py-0.2 rounded text-[10px] font-bold cursor-pointer ${obj[sub] === false ? 'bg-rose-600 text-white' : 'text-slate-500 hover:bg-rose-50'}">S</button>
                        </span>
                      `).join('')}
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          ${d.p3.length > 0 ? `
            <div class="space-y-1.5">
              <div class="text-[11px] font-bold text-amber-800 uppercase">Phần III — Trả lời ngắn (${d.p3.length} câu • 0.5đ/câu, tối đa 4 ký tự)</div>
              <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1.5">
                ${d.p3.map((val, idx) => `
                  <div class="bg-white px-2 py-1.5 rounded-lg border border-slate-200 flex items-center gap-1.5">
                    <span class="font-mono font-bold text-slate-600 text-[11px]">C${idx + 1}</span>
                    <input type="text" maxlength="8" value="${String(val ?? '').replace(/"/g, '&quot;')}" oninput="App.setDraftP3(${idx}, this.value)" placeholder="VD: 1.5" class="w-full min-w-0 px-1.5 py-0.5 border border-slate-200 rounded font-mono font-bold text-center text-xs text-slate-800">
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  },

  saveExamAnswerKey(examId) {
    const exam = this.state.exams.find(e => e.id === examId);
    if (!exam) return;
    const parts = this.buildPartsFromDraft(this.state.answerKeyDraft);
    exam.part1 = parts.part1;
    exam.part2 = parts.part2;
    exam.part3 = parts.part3;
    this.saveData();
    document.getElementById('updatePdfModal')?.remove();
    this.render();
    this.notify(`Đã lưu bảng đáp án (${parts.part1.length} câu P.I • ${parts.part2.length} câu P.II • ${parts.part3.length} câu P.III) cho đề "${exam.title}".`, 'success', 'Lưu đáp án thành công');
  },

  showCreateExamModal() {
    this.state.tempSelectedPdfFile = null;
    this.state.tempSelectedSolutionPdfFile = null;
    this.initAnswerKeyDraft(null);

    const modal = document.createElement('div');
    modal.id = 'createExamModal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto';
    modal.innerHTML = `
      <div class="bg-white rounded-3xl p-6 sm:p-7 max-w-3xl w-full border border-slate-200 shadow-2xl space-y-4 my-8 max-h-[92vh] overflow-y-auto">
        <div class="flex items-center justify-between border-b border-slate-100 pb-3.5">
          <div>
            <h3 class="font-extrabold text-slate-900 text-lg flex items-center">
              <i class="fa-solid fa-file-pdf text-red-500 mr-2"></i>Đăng Tải Đề Thi PDF Mới
            </h3>
            <p class="text-xs text-slate-500 mt-0.5">Tải lên file PDF đề thi, file PDF lời giải (tùy chọn) và nhập bảng đáp án chấm điểm tự động</p>
          </div>
          <button onclick="document.getElementById('createExamModal').remove()" class="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer"><i class="fa-solid fa-xmark text-base"></i></button>
        </div>

        <form onsubmit="event.preventDefault(); App.handleCreateExamSubmit();" class="space-y-4 text-xs">
          <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div class="sm:col-span-3">
              <label class="block font-bold text-slate-700 mb-1">Tên đề thi</label>
              <input type="text" id="newExamTitle" required placeholder="VD: Đề Kiểm Tra Giữa Kì 1 Toán 12 / Đề Thi Thử THPT QG — Mã 102" class="w-full px-3.5 py-2 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:border-indigo-500 outline-none">
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">Thời gian (phút)</label>
              <input type="number" id="newExamTime" value="90" min="5" class="w-full px-3 py-2 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:border-indigo-500 outline-none">
            </div>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label class="block font-bold text-slate-700 mb-1">Khối lớp (6 – 12)</label>
              <select id="newExamGrade" class="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-bold text-indigo-700 outline-none focus:border-indigo-500 cursor-pointer">
                ${[6, 7, 8, 9, 10, 11, 12].map(g => `<option value="${g}" ${g === 12 ? 'selected' : ''}>Khối ${g}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">Phân loại đề</label>
              <select id="newExamCategory" onchange="App.syncGradeByCategory(this.value, 'newExamGrade')" class="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-bold text-slate-800 outline-none focus:border-indigo-500 cursor-pointer">
                ${this.EXAM_CATEGORIES.map(c => `<option value="${c.id}" ${c.id === 'GK1' ? 'selected' : ''}>${c.label}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">Đợt thi / Kỳ thi</label>
              <input type="text" id="newExamRound" value="Đợt 1" placeholder="VD: GK1 • Đợt 1..." class="w-full px-3 py-2 border border-slate-200 rounded-xl font-semibold text-slate-800 outline-none focus:border-indigo-500">
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">Quyền dự thi</label>
              <select id="newExamAccess" onchange="App.onNewExamAccessChange(this.value)" class="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-semibold text-slate-700 outline-none focus:border-indigo-500 cursor-pointer">
                <option value="all">Tất cả học sinh</option>
                <option value="grade">Theo khối lớp đã chọn</option>
                <option value="custom">Chỉ học sinh được chọn</option>
              </select>
            </div>
          </div>

          <div id="newExamCustomStudentsBox" class="hidden p-3.5 rounded-2xl bg-amber-50/50 border border-amber-200 space-y-2 text-xs">
            <div class="font-bold text-slate-800">Chọn học sinh được quyền tham gia đề thi này:</div>
            <div class="max-h-36 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white">
              ${this.state.students.map(st => `
                <label class="flex items-center justify-between px-3 py-1.5 hover:bg-indigo-50/40 cursor-pointer">
                  <span class="flex items-center gap-2">
                    <input type="checkbox" name="newExamStudentCheck" value="${st.studentId}" class="rounded text-indigo-600">
                    <span class="font-bold text-slate-800">${st.fullName}</span>
                    <span class="font-mono text-indigo-600 text-[11px]">${st.studentId}</span>
                  </span>
                  <span class="text-[11px] text-slate-500">Khối ${this.getStudentGrade(st)} • Lớp ${st.className || '12'}</span>
                </label>
              `).join('')}
            </div>
          </div>

          <!-- 1. UPLOAD FILE PDF ĐỀ THI -->
          <div class="border border-slate-200 rounded-2xl p-4 bg-slate-50 space-y-2">
            <div class="flex items-center justify-between">
              <label class="text-xs font-bold text-slate-800 flex items-center">
                <i class="fa-solid fa-file-pdf text-red-500 mr-1.5"></i>1. File PDF Đề Thi *:
              </label>
              <span class="text-[11px] text-slate-400">Hiển thị trực tiếp trong phòng thi</span>
            </div>

            <div class="flex flex-col sm:flex-row gap-2">
              <input type="file" id="pdfFileInput" accept=".pdf,application/pdf" class="hidden" onchange="App.handlePdfFileSelect(event)">
              <button type="button" onclick="document.getElementById('pdfFileInput').click()" class="px-4 py-2 bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 rounded-xl font-bold text-xs shadow-sm transition flex items-center justify-center shrink-0 cursor-pointer">
                <i class="fa-solid fa-arrow-up-from-bracket mr-2"></i>Chọn File PDF Đề Thi
              </button>
              <input type="text" id="newExamPdfUrl" placeholder="Hoặc dán đường dẫn trực tiếp tới file .pdf..." class="flex-1 px-3 py-2 border rounded-xl font-mono text-xs bg-white">
            </div>
            <div id="pdfSelectedBadge" class="text-xs text-emerald-600 font-semibold hidden"></div>
          </div>

          <!-- 2. UPLOAD FILE PDF ĐÁP ÁN & LỜI GIẢI CHI TIẾT -->
          <div class="border border-slate-200 rounded-2xl p-4 bg-emerald-50/40 space-y-2">
            <div class="flex items-center justify-between">
              <label class="text-xs font-bold text-slate-800 flex items-center">
                <i class="fa-solid fa-file-circle-check text-emerald-600 mr-1.5"></i>2. File PDF Đáp Án &amp; Lời Giải Chi Tiết (Tùy chọn):
              </label>
              <span class="text-[11px] text-slate-400">Học sinh xem sau khi nộp bài</span>
            </div>

            <div class="flex flex-col sm:flex-row gap-2">
              <input type="file" id="solutionPdfFileInput" accept=".pdf,application/pdf" class="hidden" onchange="App.handleSolutionPdfFileSelect(event)">
              <button type="button" onclick="document.getElementById('solutionPdfFileInput').click()" class="px-4 py-2 bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50 rounded-xl font-bold text-xs shadow-sm transition flex items-center justify-center shrink-0 cursor-pointer">
                <i class="fa-solid fa-file-arrow-up mr-2"></i>Chọn File PDF Đáp Án
              </button>
              <input type="text" id="newExamSolutionPdfUrl" placeholder="Hoặc dán đường dẫn file PDF đáp án..." class="flex-1 px-3 py-2 border rounded-xl font-mono text-xs bg-white">
            </div>
            <div id="solutionPdfSelectedBadge" class="text-xs text-emerald-700 font-semibold hidden"></div>
          </div>

          <!-- 3. BẢNG ĐÁP ÁN CHẤM ĐIỂM TỰ ĐỘNG -->
          <div id="answerKeyEditorHost">
            ${this.renderAnswerKeyEditorHtml()}
          </div>

          <div class="pt-3 flex space-x-2">
            <button type="submit" class="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center cursor-pointer">
              <i class="fa-solid fa-check mr-2"></i>Xuất Bản Đề Thi PDF
            </button>
            <button type="button" onclick="document.getElementById('createExamModal').remove()" class="px-5 py-3 bg-slate-100 rounded-xl font-semibold text-slate-700 cursor-pointer">
              Đóng
            </button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modal);
  },

  handlePdfFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    this.state.tempSelectedPdfFile = file;
    document.getElementById('newExamPdfUrl').value = 'File cục bộ: ' + file.name;
    const badge = document.getElementById('pdfSelectedBadge');
    badge.innerHTML = `<i class="fa-solid fa-circle-check text-emerald-500 mr-1"></i>Đã chọn file PDF Đề: <strong>${file.name}</strong> (${(file.size / 1024 / 1024).toFixed(2)} MB) — Lưu trực tiếp vào trình duyệt!`;
    badge.classList.remove('hidden');

    const titleEl = document.getElementById('newExamTitle');
    if (titleEl && !titleEl.value.trim()) {
      titleEl.value = file.name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ').trim();
    }
    const gradeMatch = file.name.match(/(?:toan|khoi|lop)[_\-\s]*(1[0-2]|[6-9])\b/i);
    const gradeEl = document.getElementById('newExamGrade');
    if (gradeMatch && gradeEl) gradeEl.value = gradeMatch[1];
  },

  handleSolutionPdfFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    this.state.tempSelectedSolutionPdfFile = file;
    document.getElementById('newExamSolutionPdfUrl').value = 'File cục bộ: ' + file.name;
    const badge = document.getElementById('solutionPdfSelectedBadge');
    badge.innerHTML = `<i class="fa-solid fa-circle-check text-emerald-600 mr-1"></i>Đã chọn file PDF Đáp án: <strong>${file.name}</strong> (${(file.size / 1024 / 1024).toFixed(2)} MB) — Lưu trực tiếp vào trình duyệt!`;
    badge.classList.remove('hidden');
  },

  onNewExamAccessChange(mode) {
    const box = document.getElementById('newExamCustomStudentsBox');
    if (box) box.classList.toggle('hidden', mode !== 'custom');
  },

  async handleCreateExamSubmit(skipBlankConfirm = false) {
    const title = document.getElementById('newExamTitle').value.trim();
    const inputUrl = document.getElementById('newExamPdfUrl').value.trim();
    if (!this.state.tempSelectedPdfFile && (!inputUrl || inputUrl.startsWith('File cục bộ:'))) {
      this.notify('Vui lòng chọn file PDF đề thi từ máy tính hoặc nhập đường dẫn file PDF!', 'warning', 'Chưa có file PDF đề thi');
      return;
    }

    const comp = this.countAnswerKeyCompletion();
    if (!skipBlankConfirm && comp.total > 0 && comp.filled < comp.total) {
      this.confirmDialog(
        `Bảng đáp án mới điền ${comp.filled}/${comp.total} câu (còn ${comp.total - comp.filled} câu trống).\nBạn vẫn muốn xuất bản đề thi ngay bây giờ? (Có thể bổ sung sau tại nút PDF & ĐA)`,
        () => this.handleCreateExamSubmit(true),
        {
          type: 'warning',
          title: 'Chưa điền đủ bảng đáp án',
          confirmText: 'Vẫn xuất bản',
          cancelText: 'Điền tiếp đáp án'
        }
      );
      return;
    }

    const grade = parseInt(document.getElementById('newExamGrade')?.value, 10) || 12;
    const category = document.getElementById('newExamCategory')?.value || 'GK1';
    const roundLabel = (document.getElementById('newExamRound')?.value || '').trim() || 'Đợt 1';
    const time = parseInt(document.getElementById('newExamTime').value, 10) || 90;
    const accessMode = document.getElementById('newExamAccess')?.value || 'all';
    const checkedStudents = Array.from(document.querySelectorAll('#createExamModal input[name="newExamStudentCheck"]:checked')).map(cb => cb.value);
    const examId = 'EXAM-' + Date.now();

    let finalPdfUrl = inputUrl;
    let finalPdfName = inputUrl;
    if (this.state.tempSelectedPdfFile && typeof PDFStorage !== 'undefined') {
      await PDFStorage.savePdf(examId, this.state.tempSelectedPdfFile);
      finalPdfUrl = 'idb:' + examId;
      finalPdfName = this.state.tempSelectedPdfFile.name;
    }

    let finalSolutionPdfUrl = '';
    let finalSolutionPdfName = '';
    if (this.state.tempSelectedSolutionPdfFile && typeof PDFStorage !== 'undefined') {
      await PDFStorage.savePdf(examId + '_sol', this.state.tempSelectedSolutionPdfFile);
      finalSolutionPdfUrl = 'idb:' + examId + '_sol';
      finalSolutionPdfName = this.state.tempSelectedSolutionPdfFile.name;
    } else {
      const inputSolUrl = document.getElementById('newExamSolutionPdfUrl').value.trim();
      if (inputSolUrl && !inputSolUrl.startsWith('File cục bộ:')) {
        finalSolutionPdfUrl = inputSolUrl;
        finalSolutionPdfName = inputSolUrl;
      }
    }

    const parts = this.buildPartsFromDraft(this.state.answerKeyDraft);

    const finalExam = {
      id: examId,
      title: title,
      description: `Cấu trúc ${parts.part1.length} câu Phần I, ${parts.part2.length} câu Phần II, ${parts.part3.length} câu Phần III.`,
      grade: grade,
      category: category,
      roundLabel: roundLabel,
      time_minutes: time,
      is_active: true,
      allow_view_answers: true,
      access_type: accessMode,
      allowed_all: accessMode === 'all',
      allowed_grades: [grade],
      allowed_students: accessMode === 'custom' ? checkedStudents : [],
      pdf_url: finalPdfUrl,
      pdf_name: finalPdfName,
      solution_pdf_url: finalSolutionPdfUrl,
      solution_pdf_name: finalSolutionPdfName,
      part1: parts.part1,
      part2: parts.part2,
      part3: parts.part3
    };

    this.state.exams.unshift(finalExam);
    this.saveData();
    this.state.tempSelectedPdfFile = null;
    this.state.tempSelectedSolutionPdfFile = null;
    document.getElementById('createExamModal')?.remove();
    this.render();
    this.notify(`Đã xuất bản đề thi PDF "${title}" thành công!`, 'success', 'Xuất bản đề thi thành công');
  },

  toggleExamActive(id) {
    const ex = this.state.exams.find(e => e.id === id);
    if (ex) {
      ex.is_active = !ex.is_active;
      this.saveData();
      this.render();
    }
  },

  toggleExamViewAnswers(id) {
    const ex = this.state.exams.find(e => e.id === id);
    if (ex) {
      ex.allow_view_answers = ex.allow_view_answers === false ? true : false;
      this.saveData();
      this.render();
    }
  },

  toggleSolutionPdfInDetail(subId) {
    this.state.hideSolutionPdfInDetail = !this.state.hideSolutionPdfInDetail;
    this.viewSubmissionDetail(subId);
  },

  deleteExam(id) {
    const ex = this.state.exams.find(e => e.id === id);
    this.confirmDialog(
      `Bạn có chắc chắn muốn xóa đề thi ${ex ? `"${ex.title}"` : id} khỏi hệ thống?`,
      () => {
        this.state.exams = this.state.exams.filter(e => e.id !== id);
        if (typeof PDFStorage !== 'undefined') {
          PDFStorage.deletePdf(id);
          PDFStorage.deletePdf(id + '_sol');
        }
        this.saveData();
        this.render();
      },
      {
        type: 'danger',
        title: 'Xóa đề thi?',
        confirmText: 'Xóa đề thi',
        cancelText: 'Hủy'
      }
    );
  },

  setAdminViewTab(tab) {
    this.state.adminViewTab = tab;
    this.render();
  },

  filterAdminGrade(g) {
    this.state.adminGradeFilter = g;
    this.render();
  },

  filterAdminGradebook(cls) {
    this.state.adminClassFilter = cls;
    this.render();
  },

  exportMatrixCSV() {
    const exams = this.state.exams;
    const students = this.state.students.filter(s => {
      if (this.state.adminGradeFilter && this.state.adminGradeFilter !== 'ALL' && String(this.getStudentGrade(s)) !== String(this.state.adminGradeFilter)) return false;
      if (this.state.adminClassFilter === 'ALL') return true;
      return (s.className || '12') === this.state.adminClassFilter;
    });

    let header = ["STT", "Mã Học Sinh", "Họ và Tên", "Khối", "Lớp"];
    exams.forEach((ex, idx) => {
      const label = ex.roundLabel || `Đợt ${idx + 1}`;
      header.push(`${label} - ${ex.title.replace(/"/g, '""')}`);
    });
    header.push("Số Đợt Đã Thi", "Điểm Trung Bình", "Xếp Loại");

    let csv = header.map(h => `"${h}"`).join(',') + '\n';

    students.forEach((s, stt) => {
      let row = [stt + 1, s.studentId, s.fullName, `Khối ${this.getStudentGrade(s)}`, s.className || '12'];
      let scores = [];

      exams.forEach(ex => {
        const sub = this.state.submissions.find(x => x.studentId === s.studentId && x.examId === ex.id);
        if (sub && sub.scoreResult) {
          const sc = Number(sub.scoreResult.totalScore);
          scores.push(sc);
          row.push(sc.toFixed(2));
        } else {
          row.push('Chưa thi');
        }
      });

      const count = scores.length;
      const avg = count > 0 ? (scores.reduce((a, b) => a + b, 0) / count).toFixed(2) : '--';
      let rank = '--';
      if (count > 0) {
        const numAvg = Number(avg);
        if (numAvg >= 9.0) rank = 'Xuất sắc';
        else if (numAvg >= 8.0) rank = 'Giỏi';
        else if (numAvg >= 6.5) rank = 'Khá';
        else if (numAvg >= 5.0) rank = 'Trung bình';
        else rank = 'Yếu';
      }

      row.push(`"${count}/${exams.length}"`, avg, `"${rank}"`);
      csv += row.map(v => typeof v === 'string' && !v.startsWith('"') ? `"${v}"` : v).join(',') + '\n';
    });

    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Bang_Diem_Tong_Hop_Cac_Dot_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  toggleSetting(key) {
    if (this.state.settings && typeof this.state.settings[key] !== 'undefined') {
      this.state.settings[key] = !this.state.settings[key];
      this.saveData();
      this.render();
    }
  },

  setStudentScoreTab(tab) {
    this.state.studentScoreTab = tab;
    this.render();
  },

  async openPdfModal(title, pdfUrl, storageId = null) {
    let finalUrl = pdfUrl || 'de-toan-12-le-thanh-tong.pdf';
    if (storageId && typeof PDFStorage !== 'undefined') {
      const idbUrl = await PDFStorage.getPdfBlobUrl(storageId);
      if (idbUrl) finalUrl = idbUrl;
    } else if (pdfUrl && pdfUrl.startsWith('idb:') && typeof PDFStorage !== 'undefined') {
      const key = pdfUrl.replace('idb:', '');
      const idbUrl = await PDFStorage.getPdfBlobUrl(key);
      if (idbUrl) finalUrl = idbUrl;
    }

    const old = document.getElementById('previewPdfModal');
    if (old) old.remove();

    const modal = document.createElement('div');
    modal.id = 'previewPdfModal';
    modal.className = 'fixed inset-0 z-50 flex flex-col bg-slate-900/85 backdrop-blur-sm p-2 sm:p-5 transition-all';
    modal.innerHTML = `
      <div class="bg-slate-900 rounded-2xl shadow-2xl flex-1 flex flex-col overflow-hidden border border-slate-700 max-w-6xl w-full mx-auto">
        <!-- Header -->
        <div class="px-5 py-3.5 bg-slate-800 border-b border-slate-700 flex items-center justify-between text-white shrink-0">
          <div class="flex items-center space-x-3 truncate">
            <span class="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
              <i class="fa-solid fa-file-pdf"></i>
            </span>
            <div class="truncate">
              <h3 class="text-sm font-bold text-white truncate">${title}</h3>
              <p class="text-[11px] text-slate-400 truncate">Tệp nguồn: <span class="font-mono text-indigo-300">${pdfUrl || 'IndexedDB'}</span></p>
            </div>
          </div>
          <div class="flex items-center space-x-2 shrink-0">
            <a href="${finalUrl}" target="_blank" class="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs text-indigo-300 hover:text-white flex items-center transition cursor-pointer" title="Mở trong tab mới">
              <i class="fa-solid fa-arrow-up-right-from-square mr-1.5"></i>Tab Mới
            </a>
            <a href="${finalUrl}" download="Tai_Lieu_${Date.now()}.pdf" class="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs text-white flex items-center transition cursor-pointer" title="Tải về máy tính">
              <i class="fa-solid fa-download mr-1.5"></i>Tải Về
            </a>
            <button onclick="document.getElementById('previewPdfModal').remove()" class="w-8 h-8 rounded-lg bg-slate-700 hover:bg-red-600 text-white flex items-center justify-center transition cursor-pointer">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>

        <!-- PDF Viewer Object & Iframe -->
        <div class="flex-1 w-full h-full bg-slate-950 relative">
          <object data="${finalUrl}#toolbar=1" type="application/pdf" class="w-full h-full border-0">
            <iframe src="${finalUrl}#toolbar=1" class="w-full h-full border-0">
              <div class="p-8 text-center text-slate-300">
                <i class="fa-solid fa-file-pdf text-4xl text-red-500 mb-3"></i>
                <p class="text-sm font-semibold">Trình duyệt không hỗ trợ nhúng trực tiếp plugin PDF.</p>
                <a href="${finalUrl}" target="_blank" class="mt-3 inline-block px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold">Mở PDF trong tab mới</a>
              </div>
            </iframe>
          </object>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  },

  async previewAdminPdf(examId) {
    const exam = this.state.exams.find(e => e.id === examId);
    if (!exam) return;
    await this.openPdfModal(exam.title + ' — Đề Thi PDF', exam.pdf_url, exam.id);
  },

  async previewAdminSolutionPdf(examId) {
    const exam = this.state.exams.find(e => e.id === examId);
    if (!exam) return;
    await this.openPdfModal(exam.title + ' — Đáp Án & Lời Giải Chi Tiết PDF', exam.solution_pdf_url, exam.id + '_sol');
  },

  setSubmissionDetailViewMode(mode, subId) {
    this.state.submissionDetailViewMode = mode;
    this.viewSubmissionDetail(subId);
  },

  toggleStudentPassReveal(studentId) {
    const st = this.state.students.find(s => s.studentId === studentId);
    const valEl = document.getElementById('detailStudentPassValue');
    const iconEl = document.getElementById('detailStudentPassIcon');
    if (!st || !valEl) return;
    const isMasked = valEl.getAttribute('data-masked') !== 'false';
    valEl.setAttribute('data-masked', isMasked ? 'false' : 'true');
    valEl.textContent = isMasked ? (st.password || '123') : '••••••';
    if (iconEl) iconEl.className = `fa-solid ${isMasked ? 'fa-eye-slash' : 'fa-eye'} text-[11px] text-indigo-600`;
  },

  toggleInputPassword(inputId, iconId) {
    const inp = document.getElementById(inputId);
    const ic = document.getElementById(iconId);
    if (!inp) return;
    const show = inp.type === 'password';
    inp.type = show ? 'text' : 'password';
    if (ic) ic.className = `fa-solid ${show ? 'fa-eye-slash' : 'fa-eye'} text-xs`;
  },

  showStudentDetailModal(studentId) {
    const student = this.state.students.find(s => s.studentId === studentId);
    if (!student) return;

    const subs = this.state.submissions
      .filter(s => s.studentId === studentId)
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

    const totalAttempts = subs.length;
    const validScores = subs.map(s => Number(s.scoreResult.totalScore));
    const avgScore = validScores.length > 0 ? (validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(2) : '--';
    const maxScore = validScores.length > 0 ? Math.max(...validScores).toFixed(2) : '--';
    const totalViolations = subs.reduce((a, b) => a + (b.tabSwitches || 0), 0);

    const modal = document.createElement('div');
    modal.id = 'studentDetailModal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto';
    modal.innerHTML = `
      <div class="bg-white rounded-3xl p-6 sm:p-7 max-w-4xl w-full max-h-[88vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        <!-- Header -->
        <div class="flex items-start justify-between border-b pb-4 flex-shrink-0">
          <div class="flex items-center space-x-3.5">
            <div class="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-md shadow-indigo-200">
              <i class="fa-solid fa-user-graduate"></i>
            </div>
            <div>
              <div class="flex items-center space-x-2">
                <h3 class="text-lg sm:text-xl font-extrabold text-slate-900">${student.fullName}</h3>
                <span class="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-indigo-100 text-indigo-800">${student.studentId}</span>
                <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${student.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}">
                  <span class="w-2 h-2 rounded-full ${student.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'}"></span>
                  <span>${student.status === 'active' ? 'Đang hoạt động' : 'Đã khóa'}</span>
                </span>
              </div>
              <p class="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span>Khối: <strong class="text-indigo-700">Khối ${this.getStudentGrade(student)}</strong></span>
                <span>• Lớp: <strong class="text-slate-700">${student.className || '12'}</strong></span>
                <span class="inline-flex items-center gap-1.5">
                  <span>• Mật khẩu:</span>
                  <button type="button" id="toggleDetailPassBtn" onclick="App.toggleStudentPassReveal('${student.studentId}')" class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-mono font-bold text-xs transition cursor-pointer" title="Bấm để xem hoặc ẩn mật khẩu học sinh">
                    <span id="detailStudentPassValue" data-masked="true">••••••</span>
                    <i id="detailStudentPassIcon" class="fa-solid fa-eye text-[11px] text-indigo-600"></i>
                  </button>
                  ${student.passwordChangedByStudent ? `
                    <span class="text-[11px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-semibold inline-flex items-center gap-1" title="Học sinh đã đổi mật khẩu">
                      <i class="fa-solid fa-check"></i>HS đã tự đổi mật khẩu
                    </span>
                  ` : ''}
                </span>
                ${student.phone ? `<span>• SĐT: <strong class="text-slate-700">${student.phone}</strong></span>` : ''}
                ${student.parentName ? `<span>• Phụ huynh: <strong class="text-slate-700">${student.parentName}</strong></span>` : ''}
              </p>
            </div>
          </div>
          <div class="flex items-center space-x-2">
            <button onclick="document.getElementById('studentDetailModal').remove(); App.showEditStudentModal('${student.studentId}');" class="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-indigo-200 cursor-pointer shadow-2xs" title="Chỉnh sửa tài khoản & thông tin học sinh">
              <i class="fa-solid fa-user-pen"></i><span>Sửa thông tin</span>
            </button>
            <button onclick="document.getElementById('studentDetailModal').remove()" class="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>

        <!-- Quick Metrics -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 flex-shrink-0">
          <div class="bg-indigo-50/60 p-4 rounded-2xl border border-indigo-100">
            <div class="text-[11px] font-bold text-indigo-700 uppercase">Lượt thi đã nộp</div>
            <div class="text-2xl font-extrabold text-indigo-900 mt-1">${totalAttempts}</div>
          </div>
          <div class="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100">
            <div class="text-[11px] font-bold text-emerald-700 uppercase">Điểm Trung Bình</div>
            <div class="text-2xl font-extrabold text-emerald-900 mt-1 font-mono">${avgScore}</div>
          </div>
          <div class="bg-blue-50/60 p-4 rounded-2xl border border-blue-100">
            <div class="text-[11px] font-bold text-blue-700 uppercase">Điểm Cao Nhất</div>
            <div class="text-2xl font-extrabold text-blue-900 mt-1 font-mono">${maxScore}</div>
          </div>
          <div class="${totalViolations > 0 ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-200'} p-4 rounded-2xl border">
            <div class="text-[11px] font-bold ${totalViolations > 0 ? 'text-red-700' : 'text-slate-600'} uppercase">Giám sát vi phạm</div>
            <div class="text-2xl font-extrabold ${totalViolations > 0 ? 'text-red-700' : 'text-slate-800'} mt-1">
              ${totalViolations} <span class="text-xs font-normal text-slate-500">lần rời tab</span>
            </div>
          </div>
        </div>

        <!-- Detailed Exam Rounds Table -->
        <div class="flex-1 min-h-0 flex flex-col space-y-2.5">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 flex-shrink-0">
            <h4 class="text-sm font-bold text-slate-800 flex items-center">
              <i class="fa-solid fa-clock-rotate-left mr-2 text-indigo-600"></i>Lịch Sử & Chi Tiết Các Đợt Thi Của Học Sinh
            </h4>
            <div>
              ${subs.length > 4 ? `
                <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 inline-flex items-center gap-1.5 shadow-2xs">
                  <i class="fa-solid fa-arrows-up-down text-[10px] text-indigo-600"></i>Hiển thị 4 lần • Cuộn để xem tiếp (${subs.length} lượt thi)
                </span>
              ` : `
                <span class="text-xs text-slate-400 font-medium">${subs.length} lượt thi đã nộp</span>
              `}
            </div>
          </div>

          ${subs.length === 0 ? `
            <div class="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              Học sinh này chưa nộp bài thi nào trên hệ thống.
            </div>
          ` : `
            <div class="overflow-y-auto overflow-x-auto rounded-2xl border border-slate-200 shadow-inner max-h-[268px] flex-1">
              <table class="min-w-full divide-y divide-slate-200 text-left text-xs">
                <thead class="bg-slate-100 text-slate-600 uppercase font-bold sticky top-0 z-10 shadow-2xs">
                  <tr>
                    <th class="px-4 py-3 bg-slate-100">Đề Thi</th>
                    <th class="px-3 py-3 text-center bg-slate-100">Lần Thi</th>
                    <th class="px-3 py-3 text-center bg-slate-100">Giám Sát</th>
                    <th class="px-4 py-3 bg-slate-100">Thời Gian Nộp</th>
                    <th class="px-3 py-3 text-center bg-slate-100">P1 (3đ)</th>
                    <th class="px-3 py-3 text-center bg-slate-100">P2 (4đ)</th>
                    <th class="px-3 py-3 text-center bg-slate-100">P3 (3đ)</th>
                    <th class="px-3 py-3 text-center font-bold bg-slate-100">Tổng Điểm</th>
                    <th class="px-4 py-3 text-right bg-slate-100">Thao Tác</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 bg-white">
                  ${subs.map(sub => {
                    const score = Number(sub.scoreResult.totalScore);
                    return `
                      <tr class="hover:bg-slate-50 transition">
                        <td class="px-4 py-3.5">
                          <div class="font-bold text-slate-900">${sub.examTitle}</div>
                          <div class="text-[10px] text-slate-400 font-mono">${sub.examId}</div>
                        </td>
                        <td class="px-3 py-3.5 text-center font-bold text-indigo-700">Lần ${sub.attemptNumber || 1}</td>
                        <td class="px-3 py-3.5 text-center">
                          ${(sub.tabSwitches || 0) > 0 ? `
                            <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                              <i class="fa-solid fa-triangle-exclamation mr-1"></i>${sub.tabSwitches} lần
                            </span>
                          ` : `
                            <span class="text-emerald-600 font-medium inline-flex items-center gap-1">
                              <i class="fa-solid fa-check"></i>Nghiêm túc
                            </span>
                          `}
                        </td>
                        <td class="px-4 py-3.5 text-slate-500">${new Date(sub.submittedAt).toLocaleString('vi-VN')}</td>
                        <td class="px-3 py-3.5 text-center font-mono">${sub.scoreResult.part1.score}đ</td>
                        <td class="px-3 py-3.5 text-center font-mono">${sub.scoreResult.part2.score}đ</td>
                        <td class="px-3 py-3.5 text-center font-mono">${sub.scoreResult.part3.score}đ</td>
                        <td class="px-3 py-3.5 text-center">
                          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full font-bold font-mono text-xs ${score >= 8.0 ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}">
                            ${score.toFixed(2)} / 10
                          </span>
                        </td>
                        <td class="px-4 py-3.5 text-right">
                          <button onclick="document.getElementById('studentDetailModal').remove(); App.viewSubmissionDetail('${sub.id}');" class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs shadow-xs transition inline-flex items-center justify-center cursor-pointer">
                            <i class="fa-solid fa-file-lines mr-1.5"></i>Xem Bài Làm
                          </button>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>

        <div class="pt-3 border-t border-slate-100 flex items-center justify-between flex-shrink-0">
          <span class="text-xs text-slate-500 font-medium">
            Tổng số: <strong>${subs.length}</strong> bài thi đã ghi nhận
          </span>
          <button onclick="document.getElementById('studentDetailModal').remove()" class="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs transition cursor-pointer">
            Đóng cửa sổ
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  },

  showAddHomeworkModal() {
    this.state.tempSelectedHwFile = null;
    const defaultGrade = (this.state.hwGradeFilter && this.state.hwGradeFilter !== 'ALL') ? Number(this.state.hwGradeFilter) : 12;
    const modal = document.createElement('div');
    modal.id = 'addHomeworkModal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-fade-in';
    modal.innerHTML = `
      <div class="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8">
        <div class="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50/70 via-white to-slate-50 flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm">
              <i class="fa-solid fa-book-open text-base"></i>
            </div>
            <div>
              <h3 class="font-extrabold text-slate-900 text-base">Thêm Tài Liệu &amp; Chuyên Đề Mới</h3>
              <p class="text-xs text-slate-500 mt-0.5">Phân chia theo Khối 6 – 12, lưu trực tiếp PDF và phân quyền học sinh</p>
            </div>
          </div>
          <button onclick="document.getElementById('addHomeworkModal').remove()" class="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer transition"><i class="fa-solid fa-xmark text-base"></i></button>
        </div>

        <form onsubmit="event.preventDefault(); App.handleAddHomeworkSubmit();" class="p-6 space-y-4 text-sm">
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Khối lớp (6 – 12) *</label>
              <select id="newHwGrade" class="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-indigo-700 bg-white focus:border-indigo-600 outline-none cursor-pointer">
                ${[6, 7, 8, 9, 10, 11, 12].map(g => `<option value="${g}" ${g === defaultGrade ? 'selected' : ''}>Khối ${g}</option>`).join('')}
              </select>
            </div>
            <div class="sm:col-span-2">
              <label class="block text-xs font-bold text-slate-700 mb-1">Quyền truy cập *</label>
              <select id="newHwAccess" onchange="const box = document.getElementById('newHwStudentPickBox'); if (box) box.classList.toggle('hidden', this.value !== 'selected');" class="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold bg-white focus:border-indigo-600 outline-none cursor-pointer">
                <option value="all">Toàn bộ học sinh</option>
                <option value="grade">Theo khối lớp của tài liệu</option>
                <option value="selected">Chỉ định nhóm học sinh</option>
              </select>
            </div>
          </div>

          <div id="newHwStudentPickBox" class="hidden p-3 rounded-xl bg-slate-50 border border-slate-200 max-h-36 overflow-y-auto space-y-1.5">
            <div class="text-[11px] font-bold text-slate-600 mb-1">Chọn học sinh được xem tài liệu:</div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              ${this.state.students.map(s => `
                <label class="flex items-center space-x-2 text-xs bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 cursor-pointer hover:border-indigo-300">
                  <input type="checkbox" name="newHwStudentPick" value="${s.studentId}" checked class="rounded text-indigo-600">
                  <span class="truncate font-semibold text-slate-700">${s.fullName}</span>
                  <span class="text-[10px] font-mono text-slate-400">(K${this.getStudentGrade(s)} • ${s.className || '12'})</span>
                </label>
              `).join('')}
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Tên chuyên đề / tài liệu *</label>
            <input type="text" id="newHwTitle" required placeholder="VD: Chuyên đề Toán 11 — Hàm số Mũ & Lôgarit" class="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-semibold focus:border-indigo-600 outline-none">
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Mô tả tóm tắt</label>
            <textarea id="newHwDesc" rows="2" placeholder="Tóm tắt lý thuyết, dạng bài và câu hỏi rèn luyện..." class="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs focus:border-indigo-600 outline-none"></textarea>
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">File PDF chuyên đề từ máy tính</label>
            <div class="border-2 border-dashed border-indigo-200 rounded-xl p-4 text-center bg-indigo-50/40 hover:bg-indigo-50/80 transition cursor-pointer">
              <input type="file" id="newHwFileInput" accept=".pdf" class="hidden" onchange="App.handleHwFileSelect(event)">
              <label for="newHwFileInput" class="cursor-pointer block">
                <i class="fa-solid fa-cloud-arrow-up text-2xl text-indigo-600 mb-1"></i>
                <div class="text-xs font-bold text-slate-800">Bấm vào đây để chọn file PDF</div>
                <div id="newHwFileBadge" class="text-[11px] text-slate-500 mt-1">Lưu trực tiếp vào trình duyệt (IndexedDB), học sinh xem ngay</div>
              </label>
            </div>
          </div>

          <div class="pt-3 border-t border-slate-100 flex justify-end space-x-2.5">
            <button type="button" onclick="document.getElementById('addHomeworkModal').remove()" class="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer transition">Hủy</button>
            <button type="submit" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-200 transition inline-flex items-center gap-1.5 cursor-pointer">
              <i class="fa-solid fa-file-circle-plus"></i><span>Tải Lên Tài Liệu</span>
            </button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modal);
  },

  renderAdminHwGridHtml() {
    const gFilter = this.state.hwGradeFilter || 'ALL';
    const q = this.state.hwSearchQuery || '';
    const filtered = (this.state.homeworks || []).filter(hw => {
      if (gFilter !== 'ALL' && String(hw.grade || 12) !== String(gFilter)) return false;
      return this.matchHwSearch(hw, q);
    });

    if (filtered.length === 0) {
      return `
        <div class="bg-slate-50 rounded-2xl p-8 text-center border border-dashed border-slate-200 text-slate-500 text-xs">
          <i class="fa-solid fa-folder-open text-2xl text-slate-300 mb-2"></i>
          <p class="font-semibold">${this.state.homeworks.length === 0 ? 'Chưa có tài liệu hoặc chuyên đề nào. Hãy tải lên file PDF đầu tiên!' : `Không có tài liệu nào phù hợp${gFilter !== 'ALL' ? ` trong Khối ${gFilter}` : ''}.`}</p>
        </div>
      `;
    }

    return `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        ${filtered.map(hw => {
          const curGrade = Number(hw.grade || 12);
          const accessBadge = (hw.allowedAll || hw.accessType === 'all')
            ? '<span class="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg"><i class="fa-solid fa-users mr-1"></i>Tất cả học sinh</span>'
            : (hw.accessType === 'grade'
              ? `<span class="text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-lg"><i class="fa-solid fa-layer-group mr-1"></i>Học sinh Khối ${curGrade}</span>`
              : `<span class="text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-lg"><i class="fa-solid fa-user-lock mr-1"></i>${(hw.allowedStudents || []).length} học sinh</span>`);
          return `
            <div class="p-5 rounded-2xl border border-slate-200 bg-white hover:border-indigo-200 hover:shadow-md transition flex flex-col justify-between space-y-3">
              <div class="space-y-2.5">
                <div class="flex items-center justify-between gap-2">
                  <div class="flex flex-wrap items-center gap-1.5">
                    <span class="px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-indigo-600 text-white shadow-2xs">
                      Khối ${curGrade}
                    </span>
                    <span class="px-2 py-0.5 rounded-lg text-[10px] font-mono text-slate-500 bg-slate-100">
                      ${hw.id}
                    </span>
                    <span class="text-[11px] text-slate-400 font-mono">• ${hw.dateAdded || 'Hôm nay'}</span>
                  </div>
                  <div class="flex items-center gap-1 text-[11px] text-slate-500">
                    <span class="hidden sm:inline font-medium">Chuyển khối:</span>
                    <select aria-label="Đổi khối tài liệu" onchange="App.updateHomeworkGrade('${hw.id}', this.value)" class="px-2 py-0.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-white text-[11px] font-bold text-indigo-700 outline-none cursor-pointer">
                      ${[6, 7, 8, 9, 10, 11, 12].map(g => `<option value="${g}" ${g === curGrade ? 'selected' : ''}>K${g}</option>`).join('')}
                    </select>
                  </div>
                </div>

                <div class="flex items-start space-x-3">
                  <div class="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-100 text-base">
                    <i class="fa-solid fa-file-pdf"></i>
                  </div>
                  <div class="flex-1 min-w-0">
                    <h4 class="font-bold text-slate-900 text-sm truncate" title="${hw.title}">${hw.title}</h4>
                    <p class="text-xs text-slate-500 mt-0.5 line-clamp-2">${hw.description}</p>
                    <div class="mt-1.5 text-[11px] text-slate-400 font-mono truncate">
                      <span>${hw.fileName || 'Chuyen_De.pdf'}</span> • <span>${hw.fileSize || '2 MB'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <span class="text-[11px] font-semibold">
                  ${accessBadge}
                </span>
                <div class="flex items-center space-x-2">
                  <button onclick="App.openPdfModal('${hw.title}', '${hw.pdfUrl}', '${hw.id}')" class="px-3 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-bold flex items-center transition cursor-pointer">
                    <i class="fa-solid fa-file-pdf mr-1.5"></i>Xem PDF
                  </button>
                  <button onclick="App.deleteHomework('${hw.id}')" class="px-2.5 py-1.5 bg-red-50 border border-red-100 text-red-600 hover:bg-red-100 rounded-xl text-xs font-bold transition cursor-pointer">
                    <i class="fa-solid fa-trash-can mr-1"></i>Xóa
                  </button>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  onHwFilterInput(field, val) {
    if (field === 'query') {
      this.state.hwSearchQuery = val;
      const container = document.getElementById('adminHwListContainer');
      if (container) {
        container.innerHTML = this.renderAdminHwGridHtml();
        return;
      }
    }
    if (field === 'grade') this.state.hwGradeFilter = val;
    this.render();
  },

  resetHwFilter() {
    this.state.hwSearchQuery = '';
    this.state.hwGradeFilter = 'ALL';
    this.render();
  },

  updateHomeworkGrade(hwId, newGrade) {
    const hw = this.state.homeworks.find(h => h.id === hwId);
    if (!hw) return;
    hw.grade = parseInt(newGrade, 10) || 12;
    this.saveData();
    this.render();
  },

  handleHwFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    this.state.tempSelectedHwFile = file;
    const badge = document.getElementById('newHwFileBadge');
    if (badge) {
      badge.innerHTML = `<span class="text-emerald-600 font-bold inline-flex items-center gap-1"><i class="fa-solid fa-check"></i>Đã chọn: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)</span>`;
    }
  },

  async handleAddHomeworkSubmit() {
    const title = document.getElementById('newHwTitle').value.trim();
    const desc = document.getElementById('newHwDesc').value.trim();
    const grade = parseInt(document.getElementById('newHwGrade')?.value || '12', 10) || 12;
    const accessType = document.getElementById('newHwAccess')?.value || 'all';
    const pickedIds = Array.from(document.querySelectorAll('input[name="newHwStudentPick"]:checked')).map(el => el.value);
    const file = this.state.tempSelectedHwFile;
    const hwId = 'HW-' + Date.now();

    let pdfUrl = 'dethi_toan_thpt_2027_ma101.pdf';
    let fileName = `Chuyen_De_Khoi_${grade}.pdf`;
    let fileSize = '2.5 MB';

    if (file) {
      fileName = file.name;
      fileSize = (file.size / 1024 / 1024).toFixed(1) + ' MB';
      if (typeof PDFStorage !== 'undefined') {
        await PDFStorage.savePdf(hwId, file);
        pdfUrl = 'idb:' + hwId;
      }
    }

    const newHw = {
      id: hwId,
      title: title,
      grade: grade,
      description: desc || 'Tài liệu và bài tập rèn luyện chuyên đề.',
      pdfUrl: pdfUrl,
      fileName: fileName,
      fileSize: fileSize,
      dateAdded: new Date().toISOString().split('T')[0],
      accessType: accessType,
      allowedAll: accessType === 'all',
      allowedStudents: accessType === 'selected' ? pickedIds : this.state.students.map(s => s.studentId)
    };

    this.state.homeworks.unshift(newHw);
    this.saveData();
    this.state.tempSelectedHwFile = null;
    const m = document.getElementById('addHomeworkModal');
    if (m) m.remove();
    this.render();
    this.notify(`Đã thêm tài liệu chuyên đề "${title}" (Khối ${grade}) thành công!`, 'success', 'Thêm tài liệu thành công');
  },

  deleteHomework(hwId) {
    const hw = this.state.homeworks.find(h => h.id === hwId);
    if (!hw) return;
    this.confirmDialog(
      `Bạn có chắc chắn muốn xóa tài liệu "${hw.title}" khỏi hệ thống?`,
      () => {
        this.state.homeworks = this.state.homeworks.filter(h => h.id !== hwId);
        if (typeof PDFStorage !== 'undefined') {
          PDFStorage.deletePdf(hwId);
        }
        this.saveData();
        this.render();
      },
      {
        type: 'danger',
        title: 'Xóa tài liệu chuyên đề?',
        confirmText: 'Xóa tài liệu',
        cancelText: 'Hủy'
      }
    );
  },

  exportResultsCSV() {
    let csv = "Mã Học Sinh,Họ và Tên,Đề Thi,Thời Gian Nộp,Rời Tab,Phần I,Phần II,Phần III,Tổng Điểm,Xếp Loại\n";
    this.state.submissions.forEach(s => {
      csv += `"${s.studentId}","${s.studentName}","${s.examTitle}","${new Date(s.submittedAt).toLocaleString('vi-VN')}",${s.tabSwitches || 0},${s.scoreResult.part1.score},${s.scoreResult.part2.score},${s.scoreResult.part3.score},${s.scoreResult.totalScore},"${s.scoreResult.rank}"\n`;
    });

    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Bang_Diem_Toan_2027_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  // --- CÀI ĐẶT HỒ SƠ GIÁO VIÊN, ĐỔI MẬT KHẨU & KHÔI PHỤC QUA EMAIL ---
  handleAdminProfileSave(prefix = 'inline') {
    const fullName = (document.getElementById(`${prefix}AdminFullName`)?.value || '').trim();
    const username = (document.getElementById(`${prefix}AdminUsername`)?.value || '').trim();
    if (!fullName || !username) {
      this.notify('Vui lòng nhập đầy đủ Tên hiển thị và Tên đăng nhập của Giáo viên!', 'warning', 'Thiếu thông tin bắt buộc');
      return false;
    }

    this.state.admin = {
      ...(this.state.admin || INITIAL_SEED_DATA.admin),
      fullName,
      username,
      role: 'admin',
      email: this.ADMIN_RECOVERY_EMAIL
    };

    if (this.state.currentUser && this.state.currentUser.role === 'admin') {
      this.state.currentUser = { ...this.state.admin };
      sessionStorage.setItem('thpt_current_user', JSON.stringify(this.state.currentUser));
    }

    this.saveData();
    this.render();
    this.notify(`Đã cập nhật hồ sơ Giáo viên: ${fullName} (Tài khoản: ${username}).`, 'success', 'Cập nhật hồ sơ thành công');
    return true;
  },

  handleAdminPasswordSave(prefix = 'inline') {
    const oldPass = document.getElementById(`${prefix}AdminOldPass`)?.value || '';
    const newPass = document.getElementById(`${prefix}AdminNewPass`)?.value || '';
    const confirmPass = document.getElementById(`${prefix}AdminConfirmPass`)?.value || '';
    const currentPass = (this.state.admin && this.state.admin.password) || INITIAL_SEED_DATA.admin.password;

    if (oldPass !== currentPass) {
      this.notify('Mật khẩu hiện tại không chính xác! Nếu quên mật khẩu, hãy dùng nút gửi link đặt lại mật khẩu về email.', 'error', 'Sai mật khẩu hiện tại');
      return false;
    }
    if (newPass.trim().length < 3) {
      this.notify('Mật khẩu mới cần có ít nhất 3 ký tự!', 'warning', 'Mật khẩu quá ngắn');
      return false;
    }
    if (newPass !== confirmPass) {
      this.notify('Mật khẩu xác nhận không khớp với mật khẩu mới!', 'error', 'Mật khẩu không khớp');
      return false;
    }

    this.state.admin = {
      ...(this.state.admin || INITIAL_SEED_DATA.admin),
      password: newPass,
      passwordChangedAt: new Date().toISOString(),
      role: 'admin',
      email: this.ADMIN_RECOVERY_EMAIL
    };

    if (this.state.currentUser && this.state.currentUser.role === 'admin') {
      this.state.currentUser = { ...this.state.admin };
      sessionStorage.setItem('thpt_current_user', JSON.stringify(this.state.currentUser));
    }

    this.saveData();
    this.render();
    this.notify('Đã đổi mật khẩu Giáo viên thành công! Vui lòng sử dụng mật khẩu mới cho lần đăng nhập tiếp theo.', 'success', 'Đổi mật khẩu thành công');
    return true;
  },

  showAdminProfileModal() {
    const existing = document.getElementById('adminProfileModal');
    if (existing) existing.remove();
    const adminAcc = this.state.admin || INITIAL_SEED_DATA.admin;

    const modal = document.createElement('div');
    modal.id = 'adminProfileModal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-fade-in';
    modal.innerHTML = `
      <div class="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8">
        <div class="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-emerald-50/70 via-white to-slate-50 flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm">
              <i class="fa-solid fa-user-gear text-base"></i>
            </div>
            <div>
              <h3 class="font-extrabold text-base text-slate-900">Hồ Sơ &amp; Mật Khẩu Giáo Viên</h3>
              <p class="text-xs text-slate-500 mt-0.5">Đổi tên hiển thị, tài khoản đăng nhập hoặc mật khẩu quản trị</p>
            </div>
          </div>
          <button onclick="document.getElementById('adminProfileModal').remove()" class="text-slate-400 hover:text-slate-600 cursor-pointer w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 transition">
            <i class="fa-solid fa-xmark text-base"></i>
          </button>
        </div>

        <form onsubmit="event.preventDefault(); App.handleAdminModalSubmit();" class="p-6 space-y-4 text-sm">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Tên hiển thị của Giáo viên *</label>
              <input type="text" id="modalAdminFullName" required value="${adminAcc.fullName || 'Thầy Huỳnh Thanh Chí'}" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-800 text-xs focus:border-indigo-600 outline-none">
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Tên đăng nhập (Username) *</label>
              <input type="text" id="modalAdminUsername" required value="${adminAcc.username || 'admin'}" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono font-bold text-indigo-700 text-xs focus:border-indigo-600 outline-none">
            </div>
          </div>

          <div class="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2 text-xs">
            <span class="text-slate-600"><i class="fa-solid fa-envelope text-emerald-600 mr-1.5"></i>Email khôi phục mật khẩu: <strong class="font-mono text-slate-900">${this.ADMIN_RECOVERY_EMAIL}</strong></span>
            <button type="button" onclick="document.getElementById('adminProfileModal')?.remove(); App.requestAdminPasswordReset();" class="text-indigo-600 hover:text-indigo-800 font-bold hover:underline cursor-pointer shrink-0">
              Gửi link đặt lại MK
            </button>
          </div>

          <div class="pt-2 border-t border-slate-100 space-y-3">
            <div class="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span><i class="fa-solid fa-key text-indigo-600 mr-1.5"></i>Đổi mật khẩu quản trị</span>
              <span class="text-[11px] font-normal text-slate-400">Để trống nếu chỉ muốn đổi tên</span>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">Mật khẩu hiện tại</label>
              <input type="password" id="modalAdminOldPass" placeholder="Nhập mật khẩu hiện tại nếu muốn đổi mật khẩu" class="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-mono focus:border-indigo-600 outline-none">
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1">Mật khẩu mới</label>
                <input type="password" id="modalAdminNewPass" placeholder="Ít nhất 3 ký tự" class="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-mono focus:border-indigo-600 outline-none">
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1">Xác nhận mật khẩu mới</label>
                <input type="password" id="modalAdminConfirmPass" placeholder="Nhập lại mật khẩu mới" class="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-mono focus:border-indigo-600 outline-none">
              </div>
            </div>
          </div>

          <div class="pt-3 border-t border-slate-100 flex justify-end space-x-2.5">
            <button type="button" onclick="document.getElementById('adminProfileModal').remove()" class="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition cursor-pointer">
              Hủy
            </button>
            <button type="submit" class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-200 transition inline-flex items-center gap-1.5 cursor-pointer">
              <i class="fa-solid fa-floppy-disk"></i><span>Lưu Thay Đổi</span>
            </button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modal);
  },

  handleAdminModalSubmit() {
    const fullName = (document.getElementById('modalAdminFullName')?.value || '').trim();
    const username = (document.getElementById('modalAdminUsername')?.value || '').trim();
    const oldPass = document.getElementById('modalAdminOldPass')?.value || '';
    const newPass = document.getElementById('modalAdminNewPass')?.value || '';
    const confirmPass = document.getElementById('modalAdminConfirmPass')?.value || '';

    if (!fullName || !username) {
      this.notify('Vui lòng nhập đầy đủ Tên hiển thị và Tên đăng nhập!', 'warning', 'Thiếu thông tin');
      return;
    }

    const wantsPassChange = Boolean(oldPass || newPass || confirmPass);
    if (wantsPassChange) {
      const currentPass = (this.state.admin && this.state.admin.password) || INITIAL_SEED_DATA.admin.password;
      if (oldPass !== currentPass) {
        this.notify('Mật khẩu hiện tại không chính xác!', 'error', 'Sai mật khẩu hiện tại');
        return;
      }
      if (newPass.trim().length < 3) {
        this.notify('Mật khẩu mới cần có ít nhất 3 ký tự!', 'warning', 'Mật khẩu quá ngắn');
        return;
      }
      if (newPass !== confirmPass) {
        this.notify('Mật khẩu xác nhận không khớp với mật khẩu mới!', 'error', 'Mật khẩu không khớp');
        return;
      }
    }

    this.state.admin = {
      ...(this.state.admin || INITIAL_SEED_DATA.admin),
      fullName,
      username,
      ...(wantsPassChange ? { password: newPass, passwordChangedAt: new Date().toISOString() } : {}),
      role: 'admin',
      email: this.ADMIN_RECOVERY_EMAIL
    };

    if (this.state.currentUser && this.state.currentUser.role === 'admin') {
      this.state.currentUser = { ...this.state.admin };
      sessionStorage.setItem('thpt_current_user', JSON.stringify(this.state.currentUser));
    }

    this.saveData();
    document.getElementById('adminProfileModal')?.remove();
    this.render();
    this.notify(
      wantsPassChange
        ? `Đã cập nhật hồ sơ (${fullName}) và mật khẩu quản trị thành công!`
        : `Đã cập nhật hồ sơ Giáo viên: ${fullName} (Tài khoản: ${username}).`,
      'success',
      'Lưu cài đặt thành công'
    );
  },

  async hashResetToken(token) {
    const str = String(token || '');
    if (window.crypto && window.crypto.subtle && window.TextEncoder) {
      const buf = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    let h1 = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h1 ^= str.charCodeAt(i);
      h1 = Math.imul(h1, 0x01000193) >>> 0;
    }
    return h1.toString(16).padStart(8, '0');
  },

  // shortcut: reset token hash lives in browser localStorage and sends email via FormSubmit AJAX; move token store to a server DB when backend auth is added
  requestAdminPasswordReset() {
    const targetEmail = this.ADMIN_RECOVERY_EMAIL;
    this.confirmDialog(
      `Hệ thống sẽ tạo liên kết đặt lại mật khẩu một lần (hiệu lực 15 phút) và gửi trực tiếp về hộp thư ${targetEmail}.`,
      async () => {
        const bytes = new Uint8Array(16);
        if (window.crypto && window.crypto.getRandomValues) {
          window.crypto.getRandomValues(bytes);
        } else {
          for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
        }
        const token = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
        const tokenHash = await this.hashResetToken(token);
        const expiresAt = Date.now() + 15 * 60 * 1000;
        localStorage.setItem('thpt_admin_reset_token', JSON.stringify({ tokenHash, expiresAt }));

        const baseUrl = `${window.location.origin}${window.location.pathname}`;
        const resetUrl = `${baseUrl}?reset_admin_token=${token}`;
        const adminAcc = this.state.admin || INITIAL_SEED_DATA.admin;

        try {
          const res = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(targetEmail)}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              _subject: '[Khảo Thí Toán 6 – 12] Liên kết đặt lại mật khẩu Giáo viên',
              _template: 'box',
              _captcha: 'false',
              He_thong: 'Hệ Thống Khảo Thí & Luyện Đề Toán 6 – 12',
              Tai_khoan_Giao_vien: `${adminAcc.fullName} (${adminAcc.username})`,
              Lien_ket_dat_lai_mat_khau: resetUrl,
              Thoi_han_hieu_luc: '15 phút (chỉ sử dụng 1 lần trên trình duyệt đã yêu cầu)',
              Thoi_gian_yeu_cau: new Date().toLocaleString('vi-VN')
            })
          });

          const data = await res.json().catch(() => ({}));
          const ok = data.success === true || data.success === 'true';
          if (ok) {
            this.notify(
              `Đã gửi liên kết đặt lại mật khẩu về hộp thư ${targetEmail}! Vui lòng kiểm tra Hộp thư đến (hoặc mục Spam/Quảng cáo) và mở liên kết trong vòng 15 phút.`,
              'success',
              'Đã gửi liên kết về Email'
            );
          } else if (/activate|activation/i.test(data.message || '')) {
            this.notify(
              `Dịch vụ gửi mail vừa gửi thư xác nhận kích hoạt lần đầu tới ${targetEmail}. Vui lòng mở hộp thư ${targetEmail}, bấm nút "Activate Form" một lần duy nhất, sau đó bấm gửi lại để nhận link đặt mật khẩu.`,
              'info',
              'Kích hoạt nhận email lần đầu'
            );
          } else {
            this.notify(
              data.message || `Không thể gửi email tới ${targetEmail} lúc này. Vui lòng thử lại sau ít phút!`,
              'error',
              'Chưa gửi được email'
            );
          }
        } catch (err) {
          this.notify(
            `Không thể kết nối dịch vụ gửi email tới ${targetEmail}. Vui lòng kiểm tra kết nối mạng (hoặc tắt trình chặn quảng cáo nếu có) rồi thử lại!`,
            'error',
            'Lỗi kết nối gửi email'
          );
        }
      },
      {
        type: 'info',
        title: 'Gửi link đặt lại mật khẩu qua Email?',
        icon: 'fa-paper-plane',
        confirmText: 'Gửi link ngay',
        cancelText: 'Hủy'
      }
    );
  },

  async checkPasswordResetUrl() {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('reset_admin_token');
    if (!token) return;

    if (window.history && window.history.replaceState) {
      window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
    }

    let record = null;
    try {
      record = JSON.parse(localStorage.getItem('thpt_admin_reset_token') || 'null');
    } catch (_) {
      record = null;
    }

    const incomingHash = await this.hashResetToken(token);
    if (!record || !record.tokenHash || record.tokenHash !== incomingHash || Date.now() > Number(record.expiresAt || 0)) {
      localStorage.removeItem('thpt_admin_reset_token');
      this.notify(
        `Liên kết đặt lại mật khẩu không hợp lệ, đã được sử dụng hoặc đã quá hạn 15 phút. Vui lòng yêu cầu gửi lại liên kết mới về ${this.ADMIN_RECOVERY_EMAIL}!`,
        'error',
        'Liên kết không hợp lệ hoặc hết hạn'
      );
      return;
    }

    this.showResetAdminPasswordModal(token);
  },

  showResetAdminPasswordModal(token) {
    const existing = document.getElementById('resetAdminPasswordModal');
    if (existing) existing.remove();
    const adminAcc = this.state.admin || INITIAL_SEED_DATA.admin;

    const modal = document.createElement('div');
    modal.id = 'resetAdminPasswordModal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-fade-in';
    modal.innerHTML = `
      <div class="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden my-8">
        <div class="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-emerald-50/80 via-white to-indigo-50/40 flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm">
              <i class="fa-solid fa-key text-base"></i>
            </div>
            <div>
              <h3 class="font-extrabold text-base text-slate-900">Đặt Lại Mật Khẩu Giáo Viên</h3>
              <p class="text-xs text-slate-500 mt-0.5">Xác thực từ liên kết email ${this.ADMIN_RECOVERY_EMAIL}</p>
            </div>
          </div>
          <button onclick="document.getElementById('resetAdminPasswordModal').remove()" class="text-slate-400 hover:text-slate-600 cursor-pointer w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 transition">
            <i class="fa-solid fa-xmark text-base"></i>
          </button>
        </div>

        <form id="resetAdminPasswordForm" class="p-6 space-y-4 text-sm">
          <div class="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
            <span class="text-slate-600">Tài khoản: <strong class="text-slate-900">${adminAcc.fullName}</strong></span>
            <span class="font-mono font-bold text-indigo-700">${adminAcc.username}</span>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Mật khẩu quản trị mới *</label>
            <input type="password" id="resetAdminNewPass" required placeholder="Nhập mật khẩu mới (tối thiểu 3 ký tự)" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-xs focus:border-emerald-600 outline-none">
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Xác nhận mật khẩu mới *</label>
            <input type="password" id="resetAdminConfirmPass" required placeholder="Nhập lại mật khẩu mới" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-xs focus:border-emerald-600 outline-none">
          </div>

          <div class="pt-3 border-t border-slate-100 flex justify-end space-x-2.5">
            <button type="button" onclick="document.getElementById('resetAdminPasswordModal').remove()" class="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition cursor-pointer">
              Hủy
            </button>
            <button type="submit" class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-200 transition inline-flex items-center gap-1.5 cursor-pointer">
              <i class="fa-solid fa-check"></i><span>Lưu Mật Khẩu Mới</span>
            </button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modal);
    const form = modal.querySelector('#resetAdminPasswordForm');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleResetAdminPasswordSubmit(token);
      });
    }
    modal.querySelector('#resetAdminNewPass')?.focus();
  },

  async handleResetAdminPasswordSubmit(token) {
    let record = null;
    try {
      record = JSON.parse(localStorage.getItem('thpt_admin_reset_token') || 'null');
    } catch (_) {
      record = null;
    }

    const incomingHash = await this.hashResetToken(token);
    if (!record || record.tokenHash !== incomingHash || Date.now() > Number(record.expiresAt || 0)) {
      localStorage.removeItem('thpt_admin_reset_token');
      document.getElementById('resetAdminPasswordModal')?.remove();
      this.notify('Liên kết đặt lại mật khẩu đã hết hạn hoặc không còn hiệu lực!', 'error', 'Liên kết hết hạn');
      return;
    }

    const newPass = document.getElementById('resetAdminNewPass')?.value || '';
    const confirmPass = document.getElementById('resetAdminConfirmPass')?.value || '';

    if (newPass.trim().length < 3) {
      this.notify('Mật khẩu mới cần có ít nhất 3 ký tự!', 'warning', 'Mật khẩu quá ngắn');
      return;
    }
    if (newPass !== confirmPass) {
      this.notify('Mật khẩu xác nhận không khớp với mật khẩu mới!', 'error', 'Mật khẩu không khớp');
      return;
    }

    this.state.admin = {
      ...(this.state.admin || INITIAL_SEED_DATA.admin),
      password: newPass,
      passwordChangedAt: new Date().toISOString(),
      role: 'admin',
      email: this.ADMIN_RECOVERY_EMAIL
    };
    localStorage.removeItem('thpt_admin_reset_token');

    if (this.state.currentUser && this.state.currentUser.role === 'admin') {
      this.state.currentUser = { ...this.state.admin };
      sessionStorage.setItem('thpt_current_user', JSON.stringify(this.state.currentUser));
    }

    this.saveData();
    document.getElementById('resetAdminPasswordModal')?.remove();
    this.render();
    if (!this.state.currentUser) {
      this.switchLoginTab('admin');
      const passInput = document.getElementById('loginAdminPass');
      if (passInput) {
        passInput.value = '';
        passInput.focus();
      }
    }
    this.notify('Đặt lại mật khẩu Giáo viên thành công! Bạn có thể sử dụng mật khẩu mới ngay bây giờ.', 'success', 'Đặt lại mật khẩu hoàn tất');
  }
};

if (typeof window !== 'undefined') {
  window.App = App;
  window.addEventListener('DOMContentLoaded', () => App.init());
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = App;
}
