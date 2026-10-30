// App Controller chính cho Cổng Luyện Thi & Quản Lý Môn Toán THPT QG 2027
// Phong cách Azota & Interactive Test GDPT 2018 (Hỗ trợ Box-digit 4 ô, Palette câu hỏi, Confetti, Themes, IndexedDB PDF Storage)

if (typeof GradingSystem === 'undefined' && typeof require === 'function') {
  globalThis.GradingSystem = require('./grading.js');
}
if (typeof PDFStorage === 'undefined' && typeof require === 'function') {
  globalThis.PDFStorage = require('./pdf_storage.js');
}

const App = {
  ADMIN_RECOVERY_EMAIL: 'badaoqn132@gmail.com',
  PUBLIC_APP_URL: 'https://thanhchi113.github.io/thi-thu-toan/',
  SUPABASE_URL: 'https://uiyqdqucqplifcvukwul.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_eVPODZoNRLiGD8Ldl2VjAg_eC_KTKDg',
  SUPABASE_BUCKET: 'khao-thi-pdfs',
  DATA_SEED_VERSION: '2026-10-29-cap3-hs001-079-clean-v1',
  _pdfViewers: {},
  _deferredInstallPrompt: null,
  _enableNodeCloudTest: false,
  _memPdfCacheVer: {},

  ACCENT_PRESETS: [
    { id: 'indigo',  name: 'Chàm Cổ Điển',  hex: '#4f46e5' },
    { id: 'ocean',   name: 'Xanh Đại Dương', hex: '#0284c7' },
    { id: 'emerald', name: 'Ngọc Lục Bảo',   hex: '#059669' },
    { id: 'violet',  name: 'Tím Hoàng Gia',  hex: '#7c3aed' },
    { id: 'rose',    name: 'Đỏ Ruby',        hex: '#e11d48' },
    { id: 'teal',    name: 'Xanh Cổ Vịt',    hex: '#0d9488' },
    { id: 'amber',   name: 'Cam Hổ Phách',   hex: '#d97706' }
  ],

  EXAM_LAYOUT_MODES: [
    {
      id: 'top-sheet',
      name: 'Ô đáp án ở trên – Đề PDF bên dưới',
      shortLabel: 'Đáp án trên • Đề dưới',
      icon: 'fa-table-list',
      badge: 'Rõ đề • Kéo xuống xem PDF',
      desc: 'Ô điền đáp án xếp ngang gọn gàng ở phía trên (thu gọn được), kéo xuống xem Đề PDF toàn chiều rộng cực nét.'
    },
    {
      id: 'split',
      name: 'Chia đôi Trái – Phải',
      shortLabel: 'Đề trái • Đáp án phải',
      icon: 'fa-table-columns',
      badge: 'Mặc định',
      desc: 'Đề PDF nằm bên trái (68%), phiếu điền đáp án nằm bên phải (32%) song song trên màn hình lớn.'
    },
    {
      id: 'fast-entry',
      name: 'Thu gọn đề – Điền đáp án nhanh',
      shortLabel: 'Thu gọn đề • Điền nhanh',
      icon: 'fa-bolt',
      badge: 'Tốc độ cao',
      desc: 'Thu gọn khung đề PDF thành 1 thanh mỏng, mở rộng lưới ô đáp án ngang đa cột toàn màn hình để tích chọn cực nhanh.'
    },
    {
      id: 'bottom-sheet',
      name: 'Đề PDF ở trên – Ô đáp án bên dưới',
      shortLabel: 'Đề trên • Đáp án dưới',
      icon: 'fa-layer-group',
      badge: 'Đọc đề trước',
      desc: 'Đề PDF toàn chiều rộng ở phía trên, kéo xuống phía dưới để điền ô đáp án dạng lưới ngang.'
    }
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
    tabSwitchesCount: 0,      // Giám sát số lần rời tab / vi phạm
    screenshotCount: 0,       // Giám sát số lần chụp màn hình khi đang thi
    activeSectionTab: 'p1',   // 'all' | 'p1' | 'p2' | 'p3' | 'p4'
    mobileExamPane: 'both',   // 'pdf' | 'both' | 'sheet'
    examLayoutMode: 'split',  // 'split' | 'top-sheet' | 'fast-entry' | 'bottom-sheet'
    examPdfCollapsed: false,  // Thu gọn đề PDF để điền đáp án nhanh
    examSheetCollapsed: false,// Thu gọn ô đáp án để xem đề PDF rộng tối đa
    layoutPreviewMode: 'top-sheet',
    layoutPreviewDevice: 'desktop',
    layoutPreviewPdfCollapsed: false,
    layoutPreviewSampleAns: { 1: 'B', 2: 'D', 3: 'A' },
    layoutPreviewExamId: null,
    paletteFilter: 'all',     // 'all' | 'unanswered' | 'answered' | 'flagged'
    collapseAnswerSheetInDetail: false, // Thu gọn / Mở rộng bảng đáp án ngang khi xem PDF lời giải
    detailAnswerFilter: 'all', // 'all' | 'wrong' | 'correct'
    currentDetailSubId: null,
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
    adminGradebookSearch: '', // Tìm nhanh học sinh ở Sổ điểm tổng hợp & Nhật ký nộp bài
    adminRewardStudentSearch: '', // Tìm nhanh học sinh để cộng/trừ điểm thưởng
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

    // Cấu hình quyền xem điểm, so sánh Lớp/Khối, ẩn danh & giám sát chống thoát màn hình khi thi
    settings: {
      allowStudentViewOwnScore: true,    // Cho phép học sinh tra cứu điểm của bản thân
      allowStudentViewClassBoard: false, // Mặc định KHÓA: Học sinh chỉ có quyền xem bảng so sánh khi Admin mở
      studentCompareScope: 'both',       // 'both' (Lớp mình & Toàn khối) | 'class' (Chỉ Lớp mình) | 'grade' (Chỉ Toàn khối)
      anonymizeOtherStudents: true,      // Ẩn thông tin các bạn khác để bảo vệ sự riêng tư
      allowStudentViewAnswers: true,     // Cho phép học sinh xem đáp án & lời giải sau khi nộp
      warnOnExitExam: true,              // Cảnh báo & ghi nhận vi phạm khi thoát ra ngoài lúc đang thi (Điện thoại / App / Web)
      warnOnScreenshot: true,            // Phát âm thanh & cảnh báo khi học sinh chụp màn hình lúc đang thi
      rewardCatalog: null,               // Danh mục phần thưởng đổi điểm (null -> dùng DEFAULT_REWARD_CATALOG)
    },
    violationLogs: [],
    studentScoreTab: 'mine',             // 'mine' (Kết quả cá nhân) | 'classBoard' (So sánh Lớp / Khối)
    studentCompareMode: 'class',         // 'class' (Lớp của mình) | 'grade' (Toàn khối của mình)
    studentCompareExamFilter: 'ALL',     // 'ALL' (Điểm TB các đề trong khối) | examId cụ thể

    // Đồng bộ Đám mây Máy tính <-> Điện thoại (GitHub Repo + Google Apps Script 2 chiều)
    deletedIds: [],
    localStateUpdatedAt: 0,
    unsyncedAdminChanges: false,
    cloudSyncStatus: 'idle',             // 'idle' | 'syncing' | 'ok' | 'error'
    cloudLastSyncedAt: 0,
    cloudSyncMessage: '',
  },

  // Ép ô nhập Tài khoản đăng nhập luôn là chữ IN HOA (giữ nguyên vị trí con trỏ khi gõ trên điện thoại)
  forceUppercaseInput(el) {
    if (!el || typeof el.value !== 'string') return '';
    const upper = el.value.toUpperCase();
    if (el.value !== upper) {
      const start = el.selectionStart;
      const end = el.selectionEnd;
      el.value = upper;
      if (typeof start === 'number' && typeof end === 'number' && typeof el.setSelectionRange === 'function') {
        try { el.setSelectionRange(start, end); } catch (e) {}
      }
    }
    return upper;
  },

  isExamExitWarningEnabled() {
    return !(this.state.settings && this.state.settings.warnOnExitExam === false);
  },

  isScreenshotWarningEnabled() {
    return !(this.state.settings && this.state.settings.warnOnScreenshot === false);
  },

  isAnyExamGuardEnabled() {
    return this.isExamExitWarningEnabled() || this.isScreenshotWarningEnabled();
  },

  // Phát còi cảnh báo 3 nhịp bằng Web Audio API khi phát hiện chụp màn hình (không cần file âm thanh rời)
  playWarningAlarmSound() {
    try {
      const AudioCtx = (typeof window !== 'undefined') && (window.AudioContext || window.webkitAudioContext);
      if (!AudioCtx) return false;
      const ctx = this._warnAudioCtx && this._warnAudioCtx.state !== 'closed' ? this._warnAudioCtx : new AudioCtx();
      this._warnAudioCtx = ctx;
      if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
        ctx.resume().catch(() => {});
      }
      const now = ctx.currentTime || 0;
      [880, 620, 920].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + idx * 0.14);
        gain.gain.setValueAtTime(0.18, now + idx * 0.14);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.14 + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.14);
        osc.stop(now + idx * 0.14 + 0.13);
      });
      return true;
    } catch (_) {
      return false;
    }
  },

  isScreenshotShortcutEvent(e) {
    if (!e) return '';
    const key = String(e.key || '');
    const code = String(e.code || '');
    const keyCode = Number(e.keyCode || e.which || 0);
    if (key === 'PrintScreen' || code === 'PrintScreen' || keyCode === 44) {
      return 'Nhấn phím chụp màn hình (PrintScreen)';
    }
    if (e.metaKey && e.shiftKey && ['s', 'S', 'r', 'R', '3', '4', '5', '6'].includes(key)) {
      return 'Sử dụng tổ hợp phím chụp / quay màn hình hệ thống';
    }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && ['s', 'S'].includes(key)) {
      return 'Sử dụng tổ hợp chụp màn hình trình duyệt (Ctrl/Cmd + Shift + S)';
    }
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && ['p', 'P'].includes(key)) {
      return 'Sử dụng lệnh In / Xuất màn hình đề thi (Ctrl/Cmd + P)';
    }
    return '';
  },

  clearScreenshotShield() {
    if (typeof document !== 'undefined' && document.body) {
      document.body.classList.remove('exam-screenshot-shield');
    }
  },

  // shortcut: Mobile OS hardware screenshot keys (Power+VolDown on iOS/Android) are sandboxed from browser JS; mitigated via 3-finger touch detection + student ID watermark overlay, upgrade to a native Capacitor/Flutter wrapper if OS-level FLAG_SECURE is needed.
  recordScreenshotViolation(reason = 'Phát hiện thao tác chụp màn hình trong lúc làm bài thi') {
    if (!this.state.activeExam) return false;
    if (!this.isScreenshotWarningEnabled()) return false;
    if (this._suppressLeaveUntil && Date.now() < this._suppressLeaveUntil) return false;
    if (this._lastScreenshotWarnAt && (Date.now() - this._lastScreenshotWarnAt) < 900) return false;

    const nowTs = Date.now();
    this._lastScreenshotWarnAt = nowTs;
    this._lastViolationAt = nowTs; // Ngăn sự kiện blur ngay sau phím tắt chụp màn hình đếm trùng thành 2 lỗi

    this.state.screenshotCount = (this.state.screenshotCount || 0) + 1;
    this.state.tabSwitchesCount = (this.state.tabSwitchesCount || 0) + 1;
    const timeStr = new Date().toLocaleTimeString('vi-VN');
    if (!Array.isArray(this.state.violationLogs)) this.state.violationLogs = [];
    this.state.violationLogs.push({
      count: this.state.tabSwitchesCount,
      type: 'screenshot',
      screenshotCount: this.state.screenshotCount,
      time: timeStr,
      reason
    });

    if (typeof document !== 'undefined' && document.body) {
      document.body.classList.add('exam-screenshot-shield');
    }
    this.playWarningAlarmSound();
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try { navigator.vibrate([300, 100, 300, 100, 300]); } catch (_) {}
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      try { navigator.clipboard.writeText('Cảnh báo: Không được chụp màn hình trong giờ làm bài thi!').catch(() => {}); } catch (_) {}
    }
    if (typeof document !== 'undefined') {
      this.updateExamHeaderViolationBadge();
      this.showAntiCheatWarning('screenshot');
    }
    return true;
  },

  suppressAntiCheatTemporarily(ms = 1800) {
    this._suppressLeaveUntil = Date.now() + ms;
  },

  resetExamMonitorState() {
    this._examAwayActive = false;
    this._lastViolationAt = 0;
    this._lastScreenshotWarnAt = 0;
    this.clearScreenshotShield();
    if (this._blurCheckTimer) {
      clearTimeout(this._blurCheckTimer);
      this._blurCheckTimer = null;
    }
  },

  recordExamLeaveViolation(reason = 'Thoát khỏi màn hình bài thi trên thiết bị') {
    if (!this.state.activeExam) return false;
    if (!this.isExamExitWarningEnabled()) return false;
    if (this._suppressLeaveUntil && Date.now() < this._suppressLeaveUntil) return false;
    if (this._examAwayActive) return false;
    if (this._lastViolationAt && (Date.now() - this._lastViolationAt) < 1200) return false;

    this._examAwayActive = true;
    this._lastViolationAt = Date.now();
    this.state.tabSwitchesCount = (this.state.tabSwitchesCount || 0) + 1;
    const timeStr = new Date().toLocaleTimeString('vi-VN');
    if (!Array.isArray(this.state.violationLogs)) this.state.violationLogs = [];
    this.state.violationLogs.push({
      count: this.state.tabSwitchesCount,
      time: timeStr,
      reason
    });

    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try { navigator.vibrate([200, 100, 200]); } catch (e) {}
    }
    if (typeof document !== 'undefined') {
      this.updateExamHeaderViolationBadge();
    }
    return true;
  },

  handleExamReturnFocus() {
    if (this._blurCheckTimer) {
      clearTimeout(this._blurCheckTimer);
      this._blurCheckTimer = null;
    }
    if (!this.state.activeExam) {
      this._examAwayActive = false;
      return false;
    }
    if (!this._examAwayActive) return false;
    this._examAwayActive = false;
    if (this.isExamExitWarningEnabled() && (this.state.tabSwitchesCount || 0) > 0) {
      if (typeof document !== 'undefined') {
        this.showAntiCheatWarning();
      }
      return true;
    }
    return false;
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
      <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-nowrap sm:flex-wrap pb-0.5 sm:pb-0">
        <span class="text-[11px] font-bold text-slate-500 mr-1 inline-flex items-center gap-1 shrink-0">
          <i class="fa-solid fa-layer-group text-indigo-500"></i><span>Khối:</span>
        </span>
        <button type="button" onclick="${fnName}('grade', 'ALL')" class="h-8 px-3 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 inline-flex items-center ${curGrade === 'ALL' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}">
          Tất cả (${list.length})
        </button>
        ${[6, 7, 8, 9, 10, 11, 12].map(g => {
          const cnt = list.filter(e => Number(e.grade || 12) === g).length;
          const active = String(curGrade) === String(g);
          return `
            <button type="button" onclick="${fnName}('grade', '${g}')" class="h-8 px-3 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 inline-flex items-center gap-1.5 ${active ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}">
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
      <div class="flex items-center gap-1.5 pt-2 border-t border-slate-200/70 overflow-x-auto no-scrollbar flex-nowrap sm:flex-wrap pb-0.5 sm:pb-0">
        <span class="text-[11px] font-bold text-slate-500 mr-1 inline-flex items-center gap-1 shrink-0">
          <i class="fa-solid fa-tags text-indigo-500"></i><span>Loại${gFilter !== 'ALL' ? ` (K${gFilter})` : ''}:</span>
        </span>
        <button type="button" onclick="${fnName}('category', 'ALL')" class="h-8 px-3 rounded-xl text-[11px] font-bold transition cursor-pointer shrink-0 inline-flex items-center ${curCat === 'ALL' ? 'bg-slate-800 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}">
          Tất cả (${inGrade.length})
        </button>
        ${this.EXAM_CATEGORIES.map(c => {
          const cnt = inGrade.filter(e => (e.category || this.inferExamCategory(e)) === c.id).length;
          const active = curCat === c.id;
          return `
            <button type="button" onclick="${fnName}('category', '${c.id}')" class="h-8 px-3 rounded-xl text-[11px] font-bold transition cursor-pointer shrink-0 inline-flex items-center gap-1.5 ${active ? 'bg-slate-800 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}">
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
    this.initPwaSupport();
    this.loadAppearance();
    this.applyAppearance();
    this.loadData();
    this.checkSession();
    this.initGlobalEvents();
    this.render();
    this.checkPasswordResetUrl();
    this.syncFromCloud({ silent: true });
  },

  initPwaSupport() {
    if (typeof window === 'undefined') return;
    if (window.pdfjsLib && window.pdfjsLib.GlobalWorkerOptions) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }
    if ('serviceWorker' in navigator && /^https?:$/i.test(window.location.protocol)) {
      navigator.serviceWorker.register('./sw.js')
        .then((reg) => {
          if (reg && typeof reg.update === 'function') reg.update().catch(() => {});
        })
        .catch(() => {});
    }
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this._deferredInstallPrompt = e;
      if (document.getElementById('iosAppGuideModal')) {
        this.showIosAppModal(this._appGuideAutoOpened, this._appGuidePlatform);
      }
    });
    const params = new URLSearchParams(window.location.search);
    let urlChanged = false;
    const installTarget = (params.get('install') || '').toLowerCase();
    if (installTarget === 'ios' || installTarget === 'android' || installTarget === 'app') {
      params.delete('install');
      urlChanged = true;
      if (!this.isStandaloneApp()) {
        const targetPlatform = installTarget === 'android' ? 'android' : (installTarget === 'ios' ? 'ios' : null);
        setTimeout(() => this.showIosAppModal(true, targetPlatform), 150);
      }
    }
    if (urlChanged && window.history && window.history.replaceState) {
      const rest = params.toString();
      window.history.replaceState({}, document.title, window.location.pathname + (rest ? `?${rest}` : '') + window.location.hash);
    }
  },

  initGlobalEvents() {
    if (this._globalEventsBound) return;
    this._globalEventsBound = true;

    // Giám sát thoát màn hình trên điện thoại (App iOS / Android) & tự động tải đề mới khi mở lại App ngoài phòng thi
    document.addEventListener('visibilitychange', () => {
      if (!App.state.activeExam) {
        if (!document.hidden && Date.now() - (App.state.cloudLastSyncedAt || 0) > 8000) {
          App.syncFromCloud({ silent: true });
        }
        return;
      }
      if (document.hidden) {
        App.recordExamLeaveViolation('Thoát ra ngoài ứng dụng / chuyển màn hình khi đang thi');
      } else {
        App.handleExamReturnFocus();
      }
    });

    window.addEventListener('pagehide', () => {
      if (!App.state.activeExam) return;
      App.recordExamLeaveViolation('Thoát ứng dụng hoặc ẩn màn hình bài thi trên điện thoại');
    });

    window.addEventListener('pageshow', () => {
      if (!App.state.activeExam && Date.now() - (App.state.cloudLastSyncedAt || 0) > 8000) {
        App.syncFromCloud({ silent: true });
      }
      App.handleExamReturnFocus();
    });

    window.addEventListener('online', () => {
      if (!App.state.activeExam) {
        App.syncFromCloud({ silent: true });
      } else {
        App.flushPendingSubmissions();
      }
    });

    setInterval(() => {
      if (typeof document !== 'undefined' && !document.hidden && !App.state.activeExam) {
        App.syncFromCloud({ silent: true });
      }
    }, 25000);

    window.addEventListener('blur', () => {
      if (!App.state.activeExam || !App.isExamExitWarningEnabled()) return;
      if (App._blurCheckTimer) clearTimeout(App._blurCheckTimer);
      App._blurCheckTimer = setTimeout(() => {
        if (!App.state.activeExam || !App.isExamExitWarningEnabled()) return;
        const lostDocFocus = typeof document.hasFocus === 'function' ? !document.hasFocus() : false;
        if (document.hidden || lostDocFocus) {
          const recorded = App.recordExamLeaveViolation('Mở đa nhiệm / chuyển sang ứng dụng khác khi đang thi');
          if (recorded && !document.hidden) {
            App._examAwayActive = false;
            App.showAntiCheatWarning();
          }
        }
      }, 180);
    });

    window.addEventListener('focus', () => {
      App.handleExamReturnFocus();
    });

    // Giám sát chụp màn hình (PrintScreen, Win/Cmd+Shift+S, Ctrl+Shift+S, Ctrl+P, vuốt 3 ngón cảm ứng)
    const onScreenshotKey = (e) => {
      if (!App.state.activeExam || !App.isScreenshotWarningEnabled()) return;
      const shortcutReason = App.isScreenshotShortcutEvent(e);
      if (!shortcutReason) return;
      try { e.preventDefault(); } catch (_) {}
      App.recordScreenshotViolation(shortcutReason);
    };
    window.addEventListener('keydown', onScreenshotKey, true);
    window.addEventListener('keyup', onScreenshotKey, true);

    window.addEventListener('touchstart', (e) => {
      if (!App.state.activeExam || !App.isScreenshotWarningEnabled()) return;
      if (e.touches && e.touches.length >= 3) {
        App.recordScreenshotViolation('Thao tác 3 ngón chụp màn hình trên thiết bị cảm ứng');
      }
    }, { passive: true });

    window.addEventListener('beforeprint', () => {
      if (App.state.activeExam && App.isScreenshotWarningEnabled()) {
        App.recordScreenshotViolation('In hoặc xuất màn hình đề thi');
      }
    });

    // Tự động nhận diện ảnh đáp án khi Giáo viên nhấn Ctrl+V lúc đang mở bảng đáp án
    window.addEventListener('paste', (e) => {
      const host = document.getElementById('answerKeyEditorHost');
      if (!host) return;
      const items = Array.from((e.clipboardData && e.clipboardData.items) || []);
      const imgItem = items.find(it => it.type && it.type.startsWith('image/'));
      if (imgItem) {
        const file = imgItem.getAsFile();
        if (file) {
          e.preventDefault();
          App.recognizeAnswerKeyFromImage(file);
        }
        return;
      }
      const activeTag = ((document.activeElement && document.activeElement.tagName) || '').toUpperCase();
      if (activeTag !== 'INPUT' && activeTag !== 'TEXTAREA') {
        const pastedText = e.clipboardData && e.clipboardData.getData('text/plain');
        if (pastedText && pastedText.trim().length > 0) {
          e.preventDefault();
          App.applySmartAnswerKeyContent(pastedText, 'Văn bản dán Ctrl+V');
        }
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

    // Hệ thống Hộp lựa chọn <select> tùy chỉnh đồng bộ giao diện toàn web (thay thế popup mặc định của HĐH)
    document.addEventListener('mousedown', (e) => {
      const pop = document.getElementById('appCustomSelectMenu');
      if (pop && pop.contains(e.target)) return;
      const sel = e.target.closest && e.target.closest('select');
      if (sel && !sel.disabled && !sel.multiple) {
        e.preventDefault();
        sel.focus();
        App._selectDownAt = Date.now();
        App.toggleCustomSelectPopover(sel);
        return;
      }
      if (pop) App.closeCustomSelectPopover();
    });

    document.addEventListener('click', (e) => {
      const sel = e.target.closest && e.target.closest('select');
      if (sel && !sel.disabled && !sel.multiple) {
        e.preventDefault();
        if (!App._selectDownAt || Date.now() - App._selectDownAt > 250) {
          App.toggleCustomSelectPopover(sel);
        }
      }
    });

    document.addEventListener('keydown', (e) => {
      const pop = document.getElementById('appCustomSelectMenu');
      if (e.key === 'Escape' && pop) {
        e.preventDefault();
        App.closeCustomSelectPopover();
        return;
      }
      const active = document.activeElement;
      if (active && active.tagName === 'SELECT' && !active.disabled && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown')) {
        e.preventDefault();
        App.openCustomSelectPopover(active);
      }
    });

    window.addEventListener('resize', () => App.closeCustomSelectPopover());
    document.addEventListener('scroll', (e) => {
      const pop = document.getElementById('appCustomSelectMenu');
      if (!pop) return;
      if (e.target && e.target.closest && e.target.closest('#appCustomSelectMenu')) return;
      App.closeCustomSelectPopover();
    }, true);

    // Hệ thống Kéo & Thả File trực tiếp vào mọi ô tải lên (PDF, .TEX, .TXT, Ảnh OCR, Ảnh bài làm Tự luận)
    const hasDraggedFiles = (e) => {
      const dt = e && e.dataTransfer;
      if (!dt) return false;
      if (dt.files && dt.files.length > 0) return true;
      return Array.from(dt.types || []).includes('Files');
    };

    document.addEventListener('dragover', (e) => {
      if (!hasDraggedFiles(e)) return;
      e.preventDefault();
      const zone = e.target && e.target.closest ? e.target.closest('[data-drop-target]') : null;
      try { e.dataTransfer.dropEffect = zone ? 'copy' : 'none'; } catch (_) {}
      if (zone !== App._activeDropZoneEl) {
        if (App._activeDropZoneEl) App._activeDropZoneEl.classList.remove('is-dragover');
        App._activeDropZoneEl = zone;
        if (zone) zone.classList.add('is-dragover');
      }
    });

    document.addEventListener('dragleave', (e) => {
      if (!App._activeDropZoneEl) return;
      if (!e.relatedTarget || !App._activeDropZoneEl.contains(e.relatedTarget)) {
        App.clearActiveDropZone();
      }
    });

    document.addEventListener('drop', (e) => {
      if (!hasDraggedFiles(e)) return;
      e.preventDefault();
      e.stopPropagation();
      const zone = e.target && e.target.closest ? e.target.closest('[data-drop-target]') : null;
      App.clearActiveDropZone();
      if (zone && e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        App.handleDropZoneFiles(zone, e.dataTransfer.files);
      }
    });
  },

  clearActiveDropZone() {
    if (this._activeDropZoneEl) {
      this._activeDropZoneEl.classList.remove('is-dragover');
      this._activeDropZoneEl = null;
    }
  },

  doesFileMatchAccept(file, acceptStr) {
    if (!file) return false;
    const rawAccept = String(acceptStr || '').trim();
    if (!rawAccept) return true;
    const name = String(file.name || '').toLowerCase();
    const mime = String(file.type || '').toLowerCase();
    const tokens = rawAccept.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
    return tokens.some((tok) => {
      if (tok.startsWith('.')) {
        return name.endsWith(tok);
      }
      if (tok.endsWith('/*')) {
        const prefix = tok.slice(0, -1);
        if (mime && mime.startsWith(prefix)) return true;
        if (tok === 'image/*') return /\.(png|jpe?g|webp|gif|bmp)$/i.test(name);
        return false;
      }
      return Boolean(mime && mime === tok);
    });
  },

  describeAcceptedFormats(acceptStr) {
    const s = String(acceptStr || '').toLowerCase();
    if (s.includes('.tex') || s.includes('.txt')) return '.TXT hoặc .TEX';
    if (s.includes('.pdf')) return '.PDF';
    if (s.includes('image/*')) return 'Ảnh (.PNG, .JPG, .WEBP)';
    return acceptStr || 'hợp lệ';
  },

  dispatchFilesToInput(inputEl, files) {
    if (!inputEl || !files || !files.length) return false;
    const validFiles = inputEl.multiple ? Array.from(files) : [files[0]];
    if (/^p4ImgInput_/.test(inputEl.id || '')) {
      this.suppressAntiCheatTemporarily(4000);
    }
    let assignedNative = false;
    if (typeof DataTransfer !== 'undefined') {
      try {
        const dt = new DataTransfer();
        validFiles.forEach(f => dt.items.add(f));
        inputEl.files = dt.files;
        assignedNative = Boolean(inputEl.files && inputEl.files.length === validFiles.length);
      } catch (_) {}
    }
    if (assignedNative && typeof Event === 'function') {
      inputEl.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
    if (typeof inputEl.onchange === 'function') {
      inputEl.onchange({ target: { files: validFiles, value: '' } });
      return true;
    }
    return false;
  },

  handleDropZoneFiles(zoneEl, fileList, doc = (typeof document !== 'undefined' ? document : null)) {
    const files = Array.from(fileList || []);
    if (!zoneEl || !files.length || !doc) return false;
    const targetId = zoneEl.getAttribute('data-drop-target') || '';

    // Định tuyến thông minh trong khu vực Bảng Đáp Án (.TXT / .TEX / Ảnh OCR)
    if (targetId === 'ansKeyEditorSmart' || targetId === 'ansKeyFileInput' || targetId === 'ansKeyImageInput') {
      const txtTexFiles = files.filter(f => /\.(txt|tex)$/i.test(f.name || ''));
      const imgFiles = files.filter(f => this.doesFileMatchAccept(f, 'image/*') && !/\.(txt|tex)$/i.test(f.name || ''));
      let handled = false;
      if (txtTexFiles.length > 0) {
        const keyInp = doc.getElementById('ansKeyFileInput');
        if (keyInp) handled = this.dispatchFilesToInput(keyInp, [txtTexFiles[0]]) || handled;
      }
      if (imgFiles.length > 0 && !handled) {
        const imgInp = doc.getElementById('ansKeyImageInput');
        if (imgInp) handled = this.dispatchFilesToInput(imgInp, [imgFiles[0]]) || handled;
      }
      if (!handled) {
        this.notify(
          `Ô bảng đáp án chỉ nhận file .TXT, .TEX hoặc Ảnh chụp đáp án. File "${files[0].name}" không phù hợp!`,
          'warning',
          'Sai định dạng file kéo thả'
        );
      }
      return handled;
    }

    const inputEl = doc.getElementById(targetId);
    if (!inputEl) return false;

    const acceptAttr = inputEl.getAttribute('accept') || '';
    const matched = files.filter(f => this.doesFileMatchAccept(f, acceptAttr));

    // Hỗ trợ kéo thả đồng thời cả file PDF Đề thi + file .TXT/.TEX đáp án vào cùng hộp tạo đề
    const extraKeyFile = files.find(f => /\.(txt|tex)$/i.test(f.name || ''));
    const keyInpInModal = doc.getElementById('ansKeyFileInput');
    if (extraKeyFile && keyInpInModal && !acceptAttr.includes('.tex')) {
      this.dispatchFilesToInput(keyInpInModal, [extraKeyFile]);
      if (matched.length === 0) return true;
    }

    if (matched.length === 0) {
      this.notify(
        `Ô này chỉ nhận file ${this.describeAcceptedFormats(acceptAttr)}. File "${files[0].name}" không phù hợp!`,
        'warning',
        'Sai định dạng file kéo thả'
      );
      return false;
    }
    return this.dispatchFilesToInput(inputEl, matched);
  },

  closeCustomSelectPopover() {
    if (this._activeCustomSelectEl) {
      this._activeCustomSelectEl.classList.remove('ui-select-open');
      this._activeCustomSelectEl = null;
    }
    const existing = document.getElementById('appCustomSelectMenu');
    if (existing) existing.remove();
  },

  toggleCustomSelectPopover(selectEl) {
    if (this._activeCustomSelectEl === selectEl && document.getElementById('appCustomSelectMenu')) {
      this.closeCustomSelectPopover();
    } else {
      this.openCustomSelectPopover(selectEl);
    }
  },

  openCustomSelectPopover(selectEl) {
    if (!selectEl || selectEl.disabled) return;
    this.closeCustomSelectPopover();
    this._activeCustomSelectEl = selectEl;
    selectEl.classList.add('ui-select-open');

    const menu = document.createElement('div');
    menu.id = 'appCustomSelectMenu';
    menu.className = 'ui-select-popover';
    menu.setAttribute('role', 'listbox');

    const options = Array.from(selectEl.options || []);
    options.forEach((opt) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('role', 'option');
      const isSel = opt.value === selectEl.value;
      btn.setAttribute('aria-selected', isSel ? 'true' : 'false');
      btn.className = `ui-select-option ${isSel ? 'is-selected' : ''}`;
      btn.innerHTML = `
        <span class="truncate">${String(opt.textContent || '').replace(/</g, '&lt;')}</span>
        ${isSel ? '<i class="fa-solid fa-check text-[11px] shrink-0"></i>' : ''}
      `;
      btn.onclick = (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const changed = selectEl.value !== opt.value;
        selectEl.value = opt.value;
        this.closeCustomSelectPopover();
        if (changed) {
          selectEl.dispatchEvent(new Event('change', { bubbles: true }));
        }
      };
      menu.appendChild(btn);
    });

    document.body.appendChild(menu);

    const rect = selectEl.getBoundingClientRect();
    const minW = Math.max(rect.width, 176);
    menu.style.minWidth = `${Math.round(minW)}px`;
    menu.style.maxWidth = `${Math.min(360, window.innerWidth - 16)}px`;

    const menuRect = menu.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - 10;
    const topPos = (spaceBelow < menuRect.height && rect.top > menuRect.height + 12)
      ? Math.max(8, rect.top - menuRect.height - 6)
      : Math.min(window.innerHeight - menuRect.height - 8, rect.bottom + 6);
    const leftPos = Math.max(8, Math.min(rect.left, window.innerWidth - menuRect.width - 8));

    menu.style.top = `${Math.round(topPos)}px`;
    menu.style.left = `${Math.round(leftPos)}px`;

    const selItem = menu.querySelector('.ui-select-option.is-selected');
    if (selItem && typeof selItem.scrollIntoView === 'function') {
      selItem.scrollIntoView({ block: 'nearest' });
    }
  },

  showAntiCheatWarning(mode = null) {
    if (!this.state.activeExam || this.state.tabSwitchesCount <= 0) return;
    const latestLog = Array.isArray(this.state.violationLogs) && this.state.violationLogs.length
      ? this.state.violationLogs[this.state.violationLogs.length - 1]
      : { time: new Date().toLocaleTimeString('vi-VN'), reason: 'Thoát khỏi màn hình bài thi' };
    const isScreenshot = mode === 'screenshot' || latestLog.type === 'screenshot';
    if (isScreenshot && !this.isScreenshotWarningEnabled()) return;
    if (!isScreenshot && !this.isExamExitWarningEnabled()) return;

    const existing = document.getElementById('antiCheatModal');
    if (existing) existing.remove();

    this.updateExamHeaderViolationBadge();

    const count = this.state.tabSwitchesCount;
    const shotCount = this.state.screenshotCount || 0;

    const modal = document.createElement('div');
    modal.id = 'antiCheatModal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-red-950/80 backdrop-blur-md animate-fade-in';
    modal.style.zIndex = '95';
    modal.innerHTML = `
      <div class="dialog-card bg-white rounded-3xl p-5 sm:p-7 max-w-md w-full shadow-2xl text-center space-y-4 border-2 border-red-500">
        <div class="w-16 h-16 mx-auto rounded-2xl bg-red-100 text-red-600 flex items-center justify-center text-3xl shadow-inner border border-red-200">
          <i class="fa-solid ${isScreenshot ? 'fa-camera' : 'fa-triangle-exclamation'}"></i>
        </div>
        <div class="space-y-1.5">
          <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 text-[11px] font-extrabold uppercase tracking-wider">
            <i class="fa-solid ${isScreenshot ? 'fa-volume-high' : 'fa-mobile-screen-button'}"></i>
            <span>${isScreenshot ? 'Cảnh Báo Chống Chụp Màn Hình' : 'Cảnh Báo Quy Chế Phòng Thi'}</span>
          </span>
          <h3 class="text-base sm:text-lg font-extrabold text-slate-900">
            ${isScreenshot ? 'CẢNH BÁO VI PHẠM: PHÁT HIỆN CHỤP MÀN HÌNH!' : 'NHẮC NHỞ VI PHẠM: THOÁT KHỎI MÀN HÌNH THI!'}
          </h3>
          <p class="text-xs text-slate-600 leading-relaxed">
            ${isScreenshot
              ? `Hệ thống vừa phát hiện thao tác chụp / xuất màn hình (${latestLog.reason || 'Chụp màn hình'}) và đã tạm làm mờ đề thi cùng âm thanh cảnh báo.`
              : 'Hệ thống phát hiện bạn vừa thoát ra ngoài ứng dụng trên điện thoại hoặc rời khỏi màn hình trong lúc đang làm bài thi.'}
          </p>
        </div>
        <div class="bg-red-50 border border-red-200 rounded-2xl p-3.5 text-xs text-red-900 space-y-1.5 text-left">
          <div class="flex items-center justify-between gap-2">
            <span class="font-semibold text-red-800">Tổng số lần vi phạm đã ghi nhận:</span>
            <strong id="antiCheatCountValue" class="px-2.5 py-0.5 rounded-lg bg-red-600 text-white text-sm font-mono font-extrabold shrink-0">${count} lần</strong>
          </div>
          ${shotCount > 0 ? `
            <div class="flex items-center justify-between gap-2 text-[11px] text-red-800 font-bold">
              <span>Trong đó chụp màn hình:</span>
              <span id="antiCheatScreenshotCount" class="px-2 py-0.5 rounded bg-red-200/80 text-red-900 font-mono">${shotCount} lần</span>
            </div>
          ` : ''}
          <div class="flex items-center justify-between text-[11px] text-red-700">
            <span>Thời điểm phát hiện gần nhất:</span>
            <strong class="font-mono">${latestLog.time}</strong>
          </div>
          <div class="pt-1.5 border-t border-red-200/80 text-[11px] text-red-700 leading-snug">
            <i class="fa-solid fa-circle-exclamation mr-1"></i>Mọi thao tác chụp màn hình và rời phòng thi đều được lưu tự động vào biên bản nộp bài gửi Giáo viên (đồng thời mất điểm thưởng kỷ luật).
          </div>
        </div>
        <button type="button" id="antiCheatAckBtn" onclick="App.clearScreenshotShield(); document.getElementById('antiCheatModal')?.remove();" class="ui-btn-lg w-full bg-red-600 hover:bg-red-700 text-white shadow-md">
          <i class="fa-solid fa-shield-halved"></i>
          <span>Tôi Đã Hiểu &amp; Quay Lại Làm Bài</span>
        </button>
      </div>
    `;
    document.body.appendChild(modal);
  },

  updateExamHeaderViolationBadge() {
    const badge = document.getElementById('violationHeaderBadge');
    const guardBadge = document.getElementById('examGuardActiveBadge');
    const mobStuCode = document.getElementById('examHeaderMobStuCode');
    const count = this.state.tabSwitchesCount || 0;
    const shotCount = this.state.screenshotCount || 0;
    const guardEnabled = this.isAnyExamGuardEnabled();
    const activeWarn = count > 0 && guardEnabled;
    if (badge) {
      if (activeWarn) {
        badge.className = 'inline-flex items-center gap-1 bg-red-100 border border-red-300 px-1.5 sm:px-2 py-0.5 rounded-md text-red-700 font-bold text-[10px] sm:text-[11px] animate-pulse shrink-0 whitespace-nowrap';
        badge.innerHTML = `<i class="fa-solid ${shotCount > 0 ? 'fa-camera' : 'fa-triangle-exclamation'} text-red-600"></i><span>Vi phạm: ${count}${shotCount > 0 ? ` (Chụp: ${shotCount})` : ''}</span>`;
      } else {
        badge.className = 'hidden';
      }
    }
    if (mobStuCode) {
      mobStuCode.classList.toggle('hidden', activeWarn);
    }
    if (guardBadge) {
      guardBadge.classList.toggle('hidden', !(guardEnabled && count === 0));
    }
  },

  renderExamWatermarkHtml(u) {
    if (!this.isScreenshotWarningEnabled() || !u) return '';
    const stamp = `${u.studentId || 'HS'} • ${u.fullName || ''}`;
    return `
      <div class="exam-watermark-layer" aria-hidden="true">
        ${Array.from({ length: 18 }, () => `<div class="exam-watermark-item">${stamp}</div>`).join('')}
      </div>
    `;
  },

  REWARD_ICON_OPTIONS: [
    { value: 'fa-gift', label: 'Hộp quà thưởng' },
    { value: 'fa-circle-plus', label: 'Cộng điểm kiểm tra' },
    { value: 'fa-ticket', label: 'Phiếu miễn bài' },
    { value: 'fa-book', label: 'Tài liệu / Sách' },
    { value: 'fa-medal', label: 'Huy chương' },
    { value: 'fa-trophy', label: 'Cúp vinh danh' },
    { value: 'fa-crown', label: 'Vương miện xuất sắc' },
    { value: 'fa-pen-ruler', label: 'Dụng cụ học tập' }
  ],

  normalizeSearchText(str) {
    return String(str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase()
      .trim();
  },

  matchesStudentSearch(student, rawQuery) {
    const q = this.normalizeSearchText(rawQuery);
    if (!q) return true;
    if (!student) return false;
    const grade = this.getStudentGrade(student);
    const haystack = this.normalizeSearchText(
      `${student.studentId || ''} ${student.fullName || ''} ${student.className || ''} khoi ${grade} lop ${student.className || ''} k${grade}`
    );
    return haystack.includes(q);
  },

  escapeHtmlAttr(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  },

  DEFAULT_REWARD_CATALOG: [
    { id: 'RW-01', title: 'Cộng +0,5 điểm kiểm tra thường xuyên', cost: 60, icon: 'fa-circle-plus', desc: 'Áp dụng cộng điểm cho 1 bài kiểm tra miệng hoặc 15 phút trong học kì.', active: true },
    { id: 'RW-02', title: 'Phiếu miễn 1 bài tập về nhà', cost: 100, icon: 'fa-ticket', desc: 'Được miễn 1 lần bài tập về nhà tự chọn mà vẫn tính đủ chuyên cần.', active: true },
    { id: 'RW-03', title: 'Bộ tài liệu Bí kíp giải nhanh Toán', cost: 150, icon: 'fa-book', desc: 'Nhận chuyên đề công thức giải nhanh & mẹo bấm máy tính từ Giáo viên.', active: true },
    { id: 'RW-04', title: 'Quà tặng học tập (Bút / Sổ tay Toán)', cost: 220, icon: 'fa-gift', desc: 'Nhận trực tiếp phần quà dụng cụ học tập trên lớp từ Giáo viên.', active: true },
    { id: 'RW-05', title: 'Cộng +1,0 điểm thưởng / Quà đặc biệt', cost: 350, icon: 'fa-crown', desc: 'Vinh danh học sinh chăm chỉ đạt mốc tích lũy điểm xuất sắc.', active: true }
  ],

  getRewardCatalog() {
    const custom = this.state.settings && Array.isArray(this.state.settings.rewardCatalog)
      ? this.state.settings.rewardCatalog
      : null;
    const src = custom && custom.length > 0 ? custom : this.DEFAULT_REWARD_CATALOG;
    return src.map(r => ({
      id: String(r.id || 'RW'),
      title: String(r.title || 'Phần thưởng'),
      cost: Math.max(5, Math.round(Number(r.cost) || 50)),
      icon: String(r.icon || 'fa-gift'),
      desc: String(r.desc || ''),
      active: r.active !== false
    }));
  },

  calcSubmissionRewardPoints(sub) {
    if (!sub || !sub.scoreResult) return { basePoints: 0, cleanBonus: 0, screenshotPenalty: 0, total: 0 };
    const res = sub.scoreResult;
    const maxTotal = Number(res.maxTotal || 10) || 10;
    const pct = typeof res.percentage === 'number'
      ? res.percentage
      : (Number(res.totalScore || 0) / maxTotal) * 100;

    let basePoints = 0;
    if (pct >= 99.9) basePoints = 50;
    else if (pct >= 90) basePoints = 45;
    else if (pct >= 80) basePoints = 30;
    else if (pct >= 70) basePoints = 20;
    else if (pct >= 50) basePoints = 10;

    const shots = Number(sub.screenshotCount || 0);
    const leaves = Number(sub.tabSwitches || 0);
    const cleanBonus = (pct >= 50 && leaves === 0 && shots === 0) ? 5 : 0;
    const screenshotPenalty = shots > 0 ? shots * 5 : 0;
    const total = Math.max(0, basePoints + cleanBonus - screenshotPenalty);
    return { basePoints, cleanBonus, screenshotPenalty, total };
  },

  getStudentRewardStats(studentId) {
    const stu = (this.state.students || []).find(s => s && s.studentId === studentId)
      || (this.state.currentUser && this.state.currentUser.studentId === studentId ? this.state.currentUser : null);
    const subs = (this.state.submissions || []).filter(s => s && s.studentId === studentId && s.scoreResult);

    // Chống spam nộp bài rỗng: mỗi đề chỉ tính lượt làm đạt điểm tích lũy cao nhất
    const bestByExam = new Map();
    subs.forEach(sub => {
      const key = sub.examId || sub.id;
      const pts = this.calcSubmissionRewardPoints(sub);
      const prev = bestByExam.get(key);
      if (!prev || pts.total > prev.pts.total || (pts.total === prev.pts.total && Number(sub.scoreResult.totalScore || 0) > Number(prev.sub.scoreResult.totalScore || 0))) {
        bestByExam.set(key, { sub, pts });
      }
    });

    const examBreakdowns = Array.from(bestByExam.values());
    const earnedPoints = examBreakdowns.reduce((sum, item) => sum + item.pts.total, 0);
    const bonusPoints = Number(stu?.bonusPoints || 0);
    const redemptions = Array.isArray(stu?.redemptions) ? [...stu.redemptions] : [];
    const spentPoints = redemptions
      .filter(r => r && r.status !== 'rejected')
      .reduce((sum, r) => sum + Math.max(0, Number(r.cost || 0)), 0);

    const totalAccumulated = Math.max(0, earnedPoints + bonusPoints);
    const availablePoints = Math.max(0, totalAccumulated - spentPoints);

    let tier = { name: 'Tân Binh Luyện Đề', icon: 'fa-seedling', cls: 'bg-indigo-100 text-indigo-800 border-indigo-200' };
    if (totalAccumulated >= 300) tier = { name: 'Chiến Thần Toán Học', icon: 'fa-crown', cls: 'bg-amber-100 text-amber-800 border-amber-300' };
    else if (totalAccumulated >= 150) tier = { name: 'Bứt Phá Xuất Sắc', icon: 'fa-fire', cls: 'bg-rose-100 text-rose-800 border-rose-200' };
    else if (totalAccumulated >= 50) tier = { name: 'Học Sinh Chăm Chỉ', icon: 'fa-medal', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' };

    const activeRewards = this.getRewardCatalog().filter(r => r.active !== false).sort((a, b) => a.cost - b.cost);
    const nextReward = activeRewards.find(r => r.cost > availablePoints) || activeRewards[activeRewards.length - 1] || null;

    return {
      earnedPoints,
      bonusPoints,
      totalAccumulated,
      spentPoints,
      availablePoints,
      tier,
      examBreakdowns,
      redemptions,
      nextReward
    };
  },

  getPendingRedemptionsCount() {
    return (this.state.students || []).reduce((sum, s) => {
      const list = Array.isArray(s?.redemptions) ? s.redemptions : [];
      return sum + list.filter(r => r && r.status === 'pending').length;
    }, 0);
  },

  normalizeStudentRecord(s) {
    if (!s || typeof s !== 'object') return s;
    if (s.phone === undefined) s.phone = '';
    if (s.parentName === undefined) s.parentName = '';
    if (s.notes === undefined) s.notes = '';
    if (!s.status) s.status = 'active';
    s.bonusPoints = Number(s.bonusPoints || 0) || 0;
    s.redemptions = Array.isArray(s.redemptions) ? s.redemptions : [];
    s.grade = this.getStudentGrade(s);
    return s;
  },

  mergeStudentRecords(preferred, fallback) {
    const base = { ...(fallback || {}), ...(preferred || {}) };
    const rMap = new Map();
    const putRedemption = (r) => {
      if (!r || !r.id) return;
      const cur = rMap.get(r.id);
      if (!cur) {
        rMap.set(r.id, { ...r });
        return;
      }
      const curTime = Date.parse(cur.updatedAt || cur.createdAt || '') || 0;
      const incTime = Date.parse(r.updatedAt || r.createdAt || '') || 0;
      if (incTime > curTime || (cur.status === 'pending' && r.status && r.status !== 'pending')) {
        rMap.set(r.id, { ...r });
      }
    };
    (Array.isArray(fallback?.redemptions) ? fallback.redemptions : []).forEach(putRedemption);
    (Array.isArray(preferred?.redemptions) ? preferred.redemptions : []).forEach(putRedemption);
    base.redemptions = Array.from(rMap.values()).sort((a, b) =>
      String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
    );
    return this.normalizeStudentRecord(base);
  },

  normalizeExamRecord(ex) {
    if (!ex || typeof ex !== 'object') return ex;
    const sampleFallback = typeof SAMPLE_EXAM_2027 !== 'undefined' ? SAMPLE_EXAM_2027 : { part1: [], part2: [], part3: [] };
    const seedExams = (typeof INITIAL_SEED_DATA !== 'undefined' && INITIAL_SEED_DATA.exams) ? INITIAL_SEED_DATA.exams : [];
    delete ex.raw_tex;
    delete ex.html_exam_key;
    delete ex.solution_html_key;
    if (!ex.pdf_url || /^(tex:|idb_html:)/.test(ex.pdf_url)) ex.pdf_url = '';
    if (ex.solution_pdf_url && /^(tex:|idb_html:)/.test(ex.solution_pdf_url)) ex.solution_pdf_url = '';
    if (!Array.isArray(ex.part1)) ex.part1 = sampleFallback.part1;
    if (!Array.isArray(ex.part2)) ex.part2 = sampleFallback.part2;
    if (!Array.isArray(ex.part3)) ex.part3 = sampleFallback.part3;
    if (!Array.isArray(ex.part4)) ex.part4 = [];
    if (!ex.scoring || typeof ex.scoring !== 'object') {
      ex.scoring = { mode: 'equal', p1Total: null, p2Total: null, p3Total: null, p4Total: null };
    }
    if (ex.allow_view_answers === undefined) ex.allow_view_answers = true;
    if (!ex.grade) {
      const match = (ex.title + ' ' + (ex.pdf_url || '')).match(/(?:Toán|Khối|Lớp)\s*(1[0-2]|[6-9])/i);
      ex.grade = match ? parseInt(match[1], 10) : 12;
    }
    if (!ex.roundLabel) {
      const roundMatch = (ex.title || '').match(/Đợt\s*([0-9]+)/i);
      ex.roundLabel = roundMatch ? `Đợt ${roundMatch[1]}` : 'Đợt 1';
    }
    if (!ex.category || !this.EXAM_CATEGORIES.some(c => c.id === ex.category)) {
      const seedMatch = seedExams.find(se => se.id === ex.id);
      ex.category = (seedMatch && seedMatch.category) ? seedMatch.category : this.inferExamCategory(ex);
    }
    if (ex.allowed_all === undefined) ex.allowed_all = true;
    if (!ex.allowed_grades) ex.allowed_grades = [ex.grade || 12];
    if (!ex.allowed_students) ex.allowed_students = [];
    if (!ex.access_type) ex.access_type = ex.allowed_all ? 'all' : (ex.allowed_grades.length ? 'grade' : 'custom');
    return ex;
  },

  normalizeHomeworkRecord(hw) {
    if (!hw || typeof hw !== 'object') return hw;
    const seedHws = (typeof INITIAL_SEED_DATA !== 'undefined' && INITIAL_SEED_DATA.homeworks) ? INITIAL_SEED_DATA.homeworks : [];
    delete hw.htmlDocKey;
    if (!hw.pdfUrl || /^(tex:|idb_html:)/.test(hw.pdfUrl)) {
      hw.pdfUrl = '';
    }
    if (!hw.grade) {
      const seedHw = seedHws.find(sh => sh.id === hw.id);
      if (seedHw && seedHw.grade) {
        hw.grade = seedHw.grade;
      } else {
        const txt = `${hw.title || ''} ${hw.fileName || ''}`;
        const m = txt.match(/(?:Toán|Khối|Lớp)\s*(1[0-2]|[6-9])/i);
        hw.grade = m ? parseInt(m[1], 10) : (/vào\s*(?:lớp\s*)?10/i.test(txt) ? 9 : 12);
      }
    }
    if (!hw.accessType) hw.accessType = hw.allowedAll ? 'all' : 'selected';
    return hw;
  },

  // 1. Tải và đồng bộ dữ liệu với LocalStorage + Đám mây
  loadData() {
    const seedVersionKey = 'thpt_data_seed_version';
    if (localStorage.getItem(seedVersionKey) !== this.DATA_SEED_VERSION) {
      localStorage.removeItem('thpt_students');
      localStorage.removeItem('thpt_exams');
      localStorage.removeItem('thpt_homeworks');
      localStorage.removeItem('thpt_submissions');
      localStorage.removeItem('thpt_deleted_ids');
      localStorage.removeItem('thpt_local_updated_at');
      localStorage.removeItem('thpt_unsynced_admin_changes');
      try {
        const cur = JSON.parse(sessionStorage.getItem('thpt_current_user') || 'null');
        if (cur && cur.role === 'student' && !(INITIAL_SEED_DATA.students || []).some(s => s.studentId === cur.studentId)) {
          sessionStorage.removeItem('thpt_current_user');
        }
      } catch (e) {}
      if (typeof PDFStorage !== 'undefined' && typeof PDFStorage.clearAllPdfs === 'function') {
        PDFStorage.clearAllPdfs();
      }
      localStorage.setItem(seedVersionKey, this.DATA_SEED_VERSION);
    }

    const storedAdmin = localStorage.getItem('thpt_admin_account');
    const parsedAdmin = storedAdmin ? JSON.parse(storedAdmin) : {};
    this.state.admin = {
      ...INITIAL_SEED_DATA.admin,
      ...parsedAdmin,
      role: 'admin',
      email: this.ADMIN_RECOVERY_EMAIL
    };

    try {
      this.state.deletedIds = JSON.parse(localStorage.getItem('thpt_deleted_ids') || '[]') || [];
    } catch (_) {
      this.state.deletedIds = [];
    }
    this.state.localStateUpdatedAt = Number(localStorage.getItem('thpt_local_updated_at') || 0) || 0;
    this.state.unsyncedAdminChanges = localStorage.getItem('thpt_unsynced_admin_changes') === '1';

    const storedStudents = localStorage.getItem('thpt_students');
    const storedExams = localStorage.getItem('thpt_exams');
    const storedHomeworks = localStorage.getItem('thpt_homeworks');
    const storedSubmissions = localStorage.getItem('thpt_submissions');

    const stus = storedStudents ? JSON.parse(storedStudents) : (INITIAL_SEED_DATA.students || []).map(s => ({ ...s }));
    stus.forEach(s => this.normalizeStudentRecord(s));
    this.state.students = stus;

    const examsList = storedExams ? JSON.parse(storedExams) : (INITIAL_SEED_DATA.exams || []).map(e => ({ ...e }));
    examsList.forEach(ex => this.normalizeExamRecord(ex));
    this.state.exams = examsList;

    this.state.homeworks = storedHomeworks ? JSON.parse(storedHomeworks) : (INITIAL_SEED_DATA.homeworks || []).map(h => ({ ...h }));
    if (this.state.homeworks) {
      this.state.homeworks.forEach(hw => this.normalizeHomeworkRecord(hw));
    }

    this.state.submissions = storedSubmissions ? JSON.parse(storedSubmissions) : (INITIAL_SEED_DATA.submissions || []).map(s => ({ ...s }));

    const defaultSettings = {
      allowStudentViewOwnScore: true,
      allowStudentViewClassBoard: false,
      studentCompareScope: 'both',
      anonymizeOtherStudents: true,
      allowStudentViewAnswers: true,
      warnOnExitExam: true,
      warnOnScreenshot: true,
      rewardCatalog: null,
      peerCompareDefaultLockedV1: true
    };
    const storedSettings = localStorage.getItem('thpt_settings');
    this.state.settings = storedSettings ? { ...defaultSettings, ...JSON.parse(storedSettings) } : defaultSettings;
    if (!this.state.settings.peerCompareDefaultLockedV1) {
      this.state.settings.allowStudentViewClassBoard = false;
      this.state.settings.studentCompareScope = 'both';
      this.state.settings.peerCompareDefaultLockedV1 = true;
    }
    if (!['both', 'class', 'grade'].includes(this.state.settings.studentCompareScope)) {
      this.state.settings.studentCompareScope = 'both';
    }
    if (typeof this.state.settings.allowStudentViewAnswers === 'undefined') {
      this.state.settings.allowStudentViewAnswers = true;
    }
    if (typeof this.state.settings.warnOnExitExam === 'undefined') {
      this.state.settings.warnOnExitExam = true;
    }
    if (typeof this.state.settings.warnOnScreenshot === 'undefined') {
      this.state.settings.warnOnScreenshot = true;
    }

    this.saveData({ markAdminDirty: false, skipAutoPush: true });
  },

  markDeletedId(id) {
    const clean = String(id || '').trim();
    if (!clean) return;
    if (!Array.isArray(this.state.deletedIds)) this.state.deletedIds = [];
    if (!this.state.deletedIds.includes(clean)) {
      this.state.deletedIds.push(clean);
      if (this.state.deletedIds.length > 500) {
        this.state.deletedIds = this.state.deletedIds.slice(-500);
      }
    }
  },

  saveData(opts = {}) {
    if (opts && opts.markAdminDirty) {
      this.state.localStateUpdatedAt = Date.now();
      this.state.unsyncedAdminChanges = true;
    }
    if (typeof localStorage !== 'undefined') {
      try {
        if (this.state.admin) {
          localStorage.setItem('thpt_admin_account', JSON.stringify({
            ...this.state.admin,
            role: 'admin',
            email: this.ADMIN_RECOVERY_EMAIL
          }));
        }
        localStorage.setItem('thpt_students', JSON.stringify(this.state.students));
        const safeExams = (this.state.exams || []).map(e => ({
          ...e,
          pdf_url: (e.pdf_url && e.pdf_url.startsWith('data:')) ? '' : e.pdf_url
        }));
        localStorage.setItem('thpt_exams', JSON.stringify(safeExams));
        localStorage.setItem('thpt_homeworks', JSON.stringify(this.state.homeworks));
        localStorage.setItem('thpt_submissions', JSON.stringify(this.state.submissions));
        localStorage.setItem('thpt_settings', JSON.stringify(this.state.settings));
        localStorage.setItem('thpt_deleted_ids', JSON.stringify(this.state.deletedIds || []));
        localStorage.setItem('thpt_local_updated_at', String(this.state.localStateUpdatedAt || 0));
        localStorage.setItem('thpt_unsynced_admin_changes', this.state.unsyncedAdminChanges ? '1' : '0');
      } catch (e) {
        console.warn('LocalStorage limit, continuing in memory.', e);
      }
    }
    if (opts && opts.markAdminDirty && !opts.skipAutoPush) {
      this.scheduleAutoCloudPush();
    }
  },

  // --- LƯU TRỮ & ĐỒNG BỘ SERVER TỰ ĐỘNG 100% (SUPABASE POSTGRES + STORAGE CDN, 0 THAO TÁC) ---
  isServerSyncEnabled() {
    if (typeof window !== 'undefined') {
      if (window.__DISABLE_CLOUD_SYNC__ === true) return false;
      if (window.location && /(?:[?&])nosync=1(?:&|$)/.test(window.location.search || '')) return false;
    }
    return Boolean(
      this.SUPABASE_URL &&
      this.SUPABASE_PUBLISHABLE_KEY &&
      typeof fetch === 'function' &&
      (typeof window !== 'undefined' || this._enableNodeCloudTest)
    );
  },

  getSupabaseHeaders(extra = {}) {
    return {
      apikey: this.SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${this.SUPABASE_PUBLISHABLE_KEY}`,
      ...extra
    };
  },

  hasLocalOnlyPdf(item) {
    if (!item || typeof item !== 'object') return false;
    return [item.pdf_url, item.solution_pdf_url, item.pdfUrl]
      .some(u => typeof u === 'string' && u.startsWith('idb:'));
  },

  needsAutoServerUpload() {
    if (this.state.unsyncedAdminChanges) return true;
    if ((this.state.exams || []).some(ex => this.hasLocalOnlyPdf(ex))) return true;
    if ((this.state.homeworks || []).some(hw => this.hasLocalOnlyPdf(hw))) return true;
    return false;
  },

  getPdfCacheVersionMap() {
    if (typeof localStorage !== 'undefined') {
      try {
        return JSON.parse(localStorage.getItem('thpt_pdf_cache_ver') || '{}') || {};
      } catch (_) {}
    }
    return this._memPdfCacheVer || {};
  },

  setPdfCacheVersion(key, verStr) {
    if (!key) return;
    const map = this.getPdfCacheVersionMap();
    map[key] = String(verStr || '');
    this._memPdfCacheVer = map;
    if (typeof localStorage !== 'undefined') {
      try { localStorage.setItem('thpt_pdf_cache_ver', JSON.stringify(map)); } catch (_) {}
    }
  },

  async uploadPdfToServer(storageKey, blob) {
    if (!this.isServerSyncEnabled() || !blob) {
      throw new Error('Server sync unavailable');
    }
    const safeKey = String(storageKey || 'exam').replace(/[^a-zA-Z0-9_-]/g, '_');
    const objName = `${safeKey}_${Date.now()}.pdf`;
    const res = await fetch(`${this.SUPABASE_URL}/storage/v1/object/${this.SUPABASE_BUCKET}/${objName}`, {
      method: 'POST',
      headers: this.getSupabaseHeaders({
        'Content-Type': 'application/pdf',
        'x-upsert': 'true'
      }),
      body: blob
    });
    if (!res || !res.ok) {
      const errText = res && typeof res.text === 'function' ? await res.text().catch(() => '') : '';
      throw new Error(errText || `Upload PDF HTTP ${res ? res.status : 0}`);
    }
    const publicUrl = `${this.SUPABASE_URL}/storage/v1/object/public/${this.SUPABASE_BUCKET}/${objName}`;
    if (storageKey) this.setPdfCacheVersion(storageKey, publicUrl);
    return publicUrl;
  },

  async deleteServerPdfByUrl(url) {
    if (!this.isServerSyncEnabled() || !url) return;
    const prefix = `${this.SUPABASE_URL}/storage/v1/object/public/${this.SUPABASE_BUCKET}/`;
    const clean = String(url).trim();
    if (!clean.startsWith(prefix)) return;
    const objName = clean.slice(prefix.length).split('?')[0];
    if (!objName) return;
    try {
      await fetch(`${this.SUPABASE_URL}/storage/v1/object/${this.SUPABASE_BUCKET}/${objName}`, {
        method: 'DELETE',
        headers: this.getSupabaseHeaders()
      });
    } catch (_) {}
  },

  async resolvePdfSourceUrl(rawUrl, storageKey = null) {
    const urlStr = String(rawUrl || '').trim();
    if (!urlStr && !storageKey) return '';
    if (/^(blob:|data:application\/pdf)/i.test(urlStr)) return urlStr;

    const derivedKey = storageKey || (urlStr.startsWith('idb:') ? urlStr.slice(4) : '');
    const verMap = this.getPdfCacheVersionMap();

    // 1. Mở tức thì 0ms từ bộ nhớ đệm IndexedDB trên thiết bị nếu đúng phiên bản
    if (derivedKey && typeof PDFStorage !== 'undefined' && typeof PDFStorage.getPdfBlobUrl === 'function') {
      const expectedVer = (urlStr && !urlStr.startsWith('idb:')) ? urlStr : '';
      if (!expectedVer || !verMap[derivedKey] || verMap[derivedKey] === expectedVer) {
        const cachedBlobUrl = await PDFStorage.getPdfBlobUrl(derivedKey);
        if (cachedBlobUrl) return cachedBlobUrl;
      }
    }

    // 2. Tải từ Server Đám mây (Supabase Storage / HTTPS / pdfs/...) và tự động lưu đệm vào IndexedDB của điện thoại
    const isDirectPdfUrl = /^(\.\/)?pdfs\//i.test(urlStr) || (this.SUPABASE_URL && urlStr.startsWith(this.SUPABASE_URL));
    if (isDirectPdfUrl && typeof fetch === 'function') {
      const targetUrl = /^(\.\/)?pdfs\//i.test(urlStr) ? `./${urlStr.replace(/^\.\//, '')}` : urlStr;
      try {
        const res = await fetch(targetUrl);
        if (res && res.ok) {
          const rawBlob = await res.blob();
          const pdfBlob = rawBlob.type === 'application/pdf' ? rawBlob : new Blob([rawBlob], { type: 'application/pdf' });
          if (derivedKey && typeof PDFStorage !== 'undefined') {
            await PDFStorage.savePdf(derivedKey, pdfBlob);
            this.setPdfCacheVersion(derivedKey, urlStr);
          }
          if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
            return URL.createObjectURL(pdfBlob);
          }
          return targetUrl;
        }
      } catch (_) {}
    }

    if (!urlStr.startsWith('idb:')) {
      return urlStr;
    }
    return '';
  },

  async downloadHomeworkPdf(hwId) {
    const hw = (this.state.homeworks || []).find(h => h.id === hwId);
    if (!hw) return;
    const resolved = await this.resolvePdfSourceUrl(hw.pdfUrl, hw.id);
    if (!resolved) {
      this.notify('Không tải được file PDF của tài liệu này. Vui lòng kiểm tra kết nối mạng!', 'warning', 'Chưa tải được PDF');
      return;
    }
    if (typeof document !== 'undefined') {
      const a = document.createElement('a');
      a.href = resolved;
      a.download = hw.fileName || `${hw.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  },

  mergeCloudState(cloud) {
    if (!cloud || typeof cloud !== 'object') return { changed: false };

    const cloudUpdated = Number(cloud.updatedAt || 0);
    const localUpdated = Number(this.state.localStateUpdatedAt || 0);
    const hasCloudPayload = cloudUpdated > 0
      || (Array.isArray(cloud.exams) && cloud.exams.length > 0)
      || (Array.isArray(cloud.homeworks) && cloud.homeworks.length > 0)
      || (Array.isArray(cloud.submissions) && cloud.submissions.length > 0)
      || Boolean(cloud.hasStudentUpdates);
    if (!hasCloudPayload) return { changed: false };

    const mergedDeleted = [...new Set([
      ...(Array.isArray(this.state.deletedIds) ? this.state.deletedIds : []),
      ...(Array.isArray(cloud.deletedIds) ? cloud.deletedIds : [])
    ].map(x => String(x || '').trim()).filter(Boolean))].slice(-500);
    const delSet = new Set(mergedDeleted);
    this.state.deletedIds = mergedDeleted;

    const preferLocalAdmin = Boolean(this.state.unsyncedAdminChanges && localUpdated > cloudUpdated);

    // 1. Gộp Đề thi (giữ nguyên các đề cục bộ idb:... chờ tự động tải lên Server)
    if (Array.isArray(cloud.exams)) {
      const cloudExams = cloud.exams
        .filter(e => e && e.id && !delSet.has(e.id))
        .map(e => this.normalizeExamRecord({ ...e }));
      const localExams = (this.state.exams || [])
        .filter(e => e && e.id && !delSet.has(e.id))
        .map(e => this.normalizeExamRecord({ ...e }));

      if (preferLocalAdmin) {
        const seen = new Set(localExams.map(e => e.id));
        this.state.exams = [...localExams, ...cloudExams.filter(e => !seen.has(e.id))];
      } else {
        const cloudIds = new Set(cloudExams.map(e => e.id));
        const unsyncedLocalOnly = localExams.filter(e => !cloudIds.has(e.id) && this.hasLocalOnlyPdf(e));
        this.state.exams = [...unsyncedLocalOnly, ...cloudExams];
      }
    } else if (delSet.size > 0) {
      this.state.exams = (this.state.exams || []).filter(e => e && !delSet.has(e.id));
    }

    // 2. Gộp Tài liệu & Chuyên đề
    if (Array.isArray(cloud.homeworks)) {
      const cloudHws = cloud.homeworks
        .filter(h => h && h.id && !delSet.has(h.id))
        .map(h => this.normalizeHomeworkRecord({ ...h }));
      const localHws = (this.state.homeworks || [])
        .filter(h => h && h.id && !delSet.has(h.id))
        .map(h => this.normalizeHomeworkRecord({ ...h }));

      if (preferLocalAdmin) {
        const seen = new Set(localHws.map(h => h.id));
        this.state.homeworks = [...localHws, ...cloudHws.filter(h => !seen.has(h.id))];
      } else {
        const cloudIds = new Set(cloudHws.map(h => h.id));
        const unsyncedLocalOnly = localHws.filter(h => !cloudIds.has(h.id) && this.hasLocalOnlyPdf(h));
        this.state.homeworks = [...unsyncedLocalOnly, ...cloudHws];
      }
    } else if (delSet.size > 0) {
      this.state.homeworks = (this.state.homeworks || []).filter(h => h && !delSet.has(h.id));
    }

    // 3. Gộp Học sinh (ưu tiên bản ghi có updatedAt mới hơn)
    if (Array.isArray(cloud.students) && cloud.students.length > 0) {
      const localMap = new Map((this.state.students || []).filter(s => s && s.studentId && !delSet.has(s.studentId)).map(s => [s.studentId, s]));
      const nextStudents = [];
      const visited = new Set();

      cloud.students.forEach(cs => {
        if (!cs || !cs.studentId || delSet.has(cs.studentId)) return;
        visited.add(cs.studentId);
        const ls = localMap.get(cs.studentId);
        if (!ls) {
          nextStudents.push(this.normalizeStudentRecord({ ...cs }));
        } else {
          const cTime = Date.parse(cs.updatedAt || '') || 0;
          const lTime = Date.parse(ls.updatedAt || '') || 0;
          const preferLocal = lTime > cTime || (lTime === cTime && preferLocalAdmin);
          nextStudents.push(this.mergeStudentRecords(preferLocal ? ls : cs, preferLocal ? cs : ls));
        }
      });

      if (preferLocalAdmin) {
        localMap.forEach((ls, sid) => {
          if (!visited.has(sid) && !delSet.has(sid)) {
            nextStudents.push(this.normalizeStudentRecord({ ...ls }));
          }
        });
      }
      this.state.students = nextStudents;

      if (this.state.currentUser && this.state.currentUser.role === 'student') {
        const freshMe = this.state.students.find(s => s.studentId === this.state.currentUser.studentId);
        if (freshMe) {
          this.state.currentUser = { ...freshMe, role: 'student' };
          if (typeof sessionStorage !== 'undefined') {
            try { sessionStorage.setItem('thpt_current_user', JSON.stringify(this.state.currentUser)); } catch (_) {}
          }
        }
      }
    }

    // 4. Gộp Cài đặt quyền xem điểm & giám sát
    if (cloud.settings && typeof cloud.settings === 'object' && !preferLocalAdmin && cloudUpdated > 0) {
      this.state.settings = { ...this.state.settings, ...cloud.settings };
    }

    // 5. Gộp Lượt nộp bài (Union theo id, ưu tiên bản có updatedAt mới hơn hoặc đã chấm điểm Tự luận)
    if (Array.isArray(cloud.submissions)) {
      const subMap = new Map();
      (this.state.submissions || []).forEach(s => { if (s && s.id) subMap.set(s.id, s); });
      cloud.submissions.forEach(cs => {
        if (!cs || !cs.id) return;
        const cur = subMap.get(cs.id);
        if (!cur) {
          subMap.set(cs.id, cs);
        } else {
          const incTime = Date.parse(cs.updatedAt || cs.submittedAt || '') || 0;
          const curTime = Date.parse(cur.updatedAt || cur.submittedAt || '') || 0;
          const incGraded = cs.answers && cs.answers.part4Scores && Object.keys(cs.answers.part4Scores).length > 0;
          const curGraded = cur.answers && cur.answers.part4Scores && Object.keys(cur.answers.part4Scores).length > 0;
          if (incTime > curTime || (incGraded && !curGraded)) subMap.set(cs.id, cs);
        }
      });
      this.state.submissions = Array.from(subMap.values()).sort((a, b) =>
        String(b.submittedAt || '').localeCompare(String(a.submittedAt || ''))
      );
    }

    if (!preferLocalAdmin && cloudUpdated >= localUpdated) {
      this.state.localStateUpdatedAt = Math.max(localUpdated, cloudUpdated);
      if (!(this.state.exams || []).some(e => this.hasLocalOnlyPdf(e)) && !(this.state.homeworks || []).some(h => this.hasLocalOnlyPdf(h))) {
        this.state.unsyncedAdminChanges = false;
      }
    }

    this.saveData({ markAdminDirty: false, skipAutoPush: true });
    return { changed: true };
  },

  canSafelyAutoReRender() {
    if (typeof document === 'undefined' || this.state.activeExam) return false;
    if (document.querySelector('[id$="Modal"], #appSystemDialog')) return false;
    const active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return false;
    return true;
  },

  async fetchSupabaseServerSnapshot() {
    if (!this.isServerSyncEnabled()) return null;
    const headers = this.getSupabaseHeaders();
    const [stateRes, subsRes, stuRes] = await Promise.all([
      fetch(`${this.SUPABASE_URL}/rest/v1/khao_thi_state?id=eq.main&select=updated_at,deleted_ids,exams,homeworks,students,settings`, { headers, cache: 'no-store' }).catch(() => null),
      fetch(`${this.SUPABASE_URL}/rest/v1/khao_thi_submissions?select=id,payload&order=submitted_at.desc&limit=2000`, { headers, cache: 'no-store' }).catch(() => null),
      fetch(`${this.SUPABASE_URL}/rest/v1/khao_thi_student_updates?select=student_id,payload,updated_at`, { headers, cache: 'no-store' }).catch(() => null)
    ]);

    const stateRows = stateRes && stateRes.ok ? await stateRes.json().catch(() => []) : [];
    const subRows = subsRes && subsRes.ok ? await subsRes.json().catch(() => []) : [];
    const stuRows = stuRes && stuRes.ok ? await stuRes.json().catch(() => []) : [];

    const stateRow = Array.isArray(stateRows) && stateRows.length > 0 ? stateRows[0] : null;
    const updatedAt = Number(stateRow?.updated_at || 0);
    const submissions = Array.isArray(subRows)
      ? subRows.map(r => r && r.payload).filter(p => p && p.id)
      : [];
    const hasStuUpdates = Array.isArray(stuRows) && stuRows.length > 0;

    if (!updatedAt && !submissions.length && !hasStuUpdates) return null;

    let students = (updatedAt > 0 && Array.isArray(stateRow?.students) && stateRow.students.length > 0)
      ? stateRow.students.map(s => ({ ...s }))
      : (this.state.students || []).map(s => ({ ...s }));

    if (hasStuUpdates) {
      const updMap = new Map();
      stuRows.forEach(r => {
        if (r && r.student_id && r.payload && typeof r.payload === 'object') {
          updMap.set(r.student_id, r.payload);
        }
      });
      students = students.map(s => {
        const upd = s && updMap.get(s.studentId);
        if (!upd) return s;
        const uTime = Date.parse(upd.updatedAt || '') || 0;
        const sTime = Date.parse(s.updatedAt || '') || 0;
        return this.mergeStudentRecords(uTime >= sTime ? upd : s, uTime >= sTime ? s : upd);
      });
    }

    return {
      updatedAt,
      deletedIds: updatedAt > 0 && Array.isArray(stateRow?.deleted_ids) ? stateRow.deleted_ids : undefined,
      exams: updatedAt > 0 && Array.isArray(stateRow?.exams) ? stateRow.exams : undefined,
      homeworks: updatedAt > 0 && Array.isArray(stateRow?.homeworks) ? stateRow.homeworks : undefined,
      students: (updatedAt > 0 || hasStuUpdates) ? students : undefined,
      settings: updatedAt > 0 && stateRow?.settings ? stateRow.settings : undefined,
      submissions,
      hasStudentUpdates: hasStuUpdates
    };
  },

  async syncFromCloud({ silent = false, manual = false } = {}) {
    if (!this.isServerSyncEnabled()) return false;
    if (this._syncFromCloudPromise) return this._syncFromCloudPromise;

    const wasInitialSync = !this.state.cloudLastSyncedAt;
    this.state.cloudSyncStatus = 'syncing';
    if (manual && typeof document !== 'undefined') this.render();

    this._syncFromCloudPromise = (async () => {
      try {
        const prevExamCount = (this.state.exams || []).length;
        const snap = await this.fetchSupabaseServerSnapshot();
        let mergedAny = false;

        if (snap) {
          const r = this.mergeCloudState(snap);
          if (r.changed) mergedAny = true;
        }

        await this.flushPendingSubmissions();

        this.state.cloudLastSyncedAt = Date.now();
        this.state.cloudSyncStatus = 'ok';
        this.state.cloudSyncMessage = '';

        // Tự động đẩy lên Server mọi đề/chuyên đề cục bộ (idb:...) hoặc thay đổi của Giáo viên chưa lưu Server
        if (this.needsAutoServerUpload()) {
          this.pushAdminStateToCloud({ manual: false });
        }

        if (manual) {
          if (typeof document !== 'undefined' && !this.state.activeExam) this.render();
          const curCount = (this.state.exams || []).length;
          const diff = curCount - prevExamCount;
          this.notify(
            diff > 0
              ? `Đã tải thêm ${diff} đề thi mới! Hệ thống hiện có ${curCount} đề thi.`
              : `Đã cập nhật dữ liệu mới nhất (${curCount} đề thi trên hệ thống).`,
            'success',
            'Đồng bộ dữ liệu hoàn tất'
          );
        } else if ((mergedAny || wasInitialSync) && this.canSafelyAutoReRender()) {
          this.render();
        }
        return true;
      } catch (err) {
        this.state.cloudSyncStatus = 'error';
        this.state.cloudSyncMessage = String(err?.message || 'Lỗi kết nối máy chủ');
        if (manual) {
          if (typeof document !== 'undefined' && !this.state.activeExam) this.render();
          this.notify('Không thể kết nối máy chủ. Vui lòng kiểm tra mạng Internet và thử lại!', 'warning', 'Chưa tải được dữ liệu mới');
        }
        return false;
      } finally {
        this._syncFromCloudPromise = null;
      }
    })();

    return this._syncFromCloudPromise;
  },

  scheduleAutoCloudPush() {
    if (!this.isServerSyncEnabled() || typeof setTimeout !== 'function') return;
    if (this._autoCloudPushTimer) clearTimeout(this._autoCloudPushTimer);
    this._autoCloudPushTimer = setTimeout(() => {
      this._autoCloudPushTimer = null;
      this.pushAdminStateToCloud({ manual: false });
    }, 250);
  },

  async pushAdminStateToCloud({ manual = false } = {}) {
    if (!this.isServerSyncEnabled()) return false;
    if (this._pushCloudPromise) {
      this._queuedAnotherCloudPush = true;
      return this._pushCloudPromise;
    }

    this.state.cloudSyncStatus = 'syncing';
    if (manual && typeof document !== 'undefined') this.render();

    this._pushCloudPromise = (async () => {
      let ok = false;
      try {
        // Bảo vệ dữ liệu Server: nếu phiên hiện tại chưa tải trạng thái Server lần nào, gộp trước để không bao giờ ghi đè mất đề thi cũ
        if (!this.state.cloudLastSyncedAt) {
          const snap = await this.fetchSupabaseServerSnapshot().catch(() => null);
          if (snap) this.mergeCloudState(snap);
        }

        const uploadSlotIfNeeded = async (currentUrl, storageKey) => {
          const cur = String(currentUrl || '');
          if (!cur.startsWith('idb:')) return cur;
          if (typeof PDFStorage === 'undefined' || typeof PDFStorage.getPdfBlob !== 'function') return cur;
          const blob = await PDFStorage.getPdfBlob(storageKey);
          if (!blob) return cur;
          return await this.uploadPdfToServer(storageKey, blob);
        };

        for (const ex of (this.state.exams || [])) {
          if (ex.pdf_url) {
            ex.pdf_url = await uploadSlotIfNeeded(ex.pdf_url, ex.id);
          }
          if (ex.solution_pdf_url) {
            ex.solution_pdf_url = await uploadSlotIfNeeded(ex.solution_pdf_url, `${ex.id}_sol`);
          }
        }

        for (const hw of (this.state.homeworks || [])) {
          if (hw.pdfUrl) {
            hw.pdfUrl = await uploadSlotIfNeeded(hw.pdfUrl, hw.id);
          }
        }

        const nowTs = Date.now();
        this.state.localStateUpdatedAt = nowTs;
        const safeExams = (this.state.exams || []).map(e => ({
          ...e,
          pdf_url: (e.pdf_url && e.pdf_url.startsWith('data:')) ? '' : e.pdf_url
        }));

        const res = await fetch(`${this.SUPABASE_URL}/rest/v1/khao_thi_state?on_conflict=id`, {
          method: 'POST',
          headers: this.getSupabaseHeaders({
            'Content-Type': 'application/json',
            Prefer: 'resolution=merge-duplicates,return=minimal'
          }),
          body: JSON.stringify({
            id: 'main',
            updated_at: nowTs,
            deleted_ids: this.state.deletedIds || [],
            exams: safeExams,
            homeworks: this.state.homeworks || [],
            students: this.state.students || [],
            settings: this.state.settings || {},
            saved_at: new Date(nowTs).toISOString()
          })
        });

        if (!res || !res.ok) {
          const errText = res && typeof res.text === 'function' ? await res.text().catch(() => '') : '';
          throw new Error(errText || `Server Save HTTP ${res ? res.status : 0}`);
        }

        this.state.unsyncedAdminChanges = false;
        this.state.cloudLastSyncedAt = nowTs;
        this.state.cloudSyncStatus = 'ok';
        this.state.cloudSyncMessage = '';
        this.saveData({ markAdminDirty: false, skipAutoPush: true });

        if (this.canSafelyAutoReRender()) {
          this.render();
        }
        ok = true;
      } catch (err) {
        this.state.cloudSyncStatus = 'error';
        this.state.cloudSyncMessage = String(err?.message || 'Lỗi lưu máy chủ');
        if (this.canSafelyAutoReRender()) {
          this.render();
        }
      } finally {
        this._pushCloudPromise = null;
      }
      if (this._queuedAnotherCloudPush) {
        this._queuedAnotherCloudPush = false;
        return await this.pushAdminStateToCloud({ manual: false });
      }
      return ok;
    })();

    return this._pushCloudPromise;
  },

  getPendingSubmissionIds() {
    if (typeof localStorage === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem('thpt_pending_submissions') || '[]') || [];
    } catch (_) {
      return [];
    }
  },

  setPendingSubmissionIds(ids) {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem('thpt_pending_submissions', JSON.stringify([...new Set(ids)].slice(-200)));
    } catch (_) {}
  },

  async pushStudentSubmissionToCloud(submission, studentUpdate = null) {
    if (!this.isServerSyncEnabled()) return false;
    let ok = true;

    if (submission && submission.id) {
      try {
        const res = await fetch(`${this.SUPABASE_URL}/rest/v1/khao_thi_submissions?on_conflict=id`, {
          method: 'POST',
          headers: this.getSupabaseHeaders({
            'Content-Type': 'application/json',
            Prefer: 'resolution=merge-duplicates,return=minimal'
          }),
          body: JSON.stringify({
            id: submission.id,
            student_id: String(submission.studentId || 'HS'),
            exam_id: String(submission.examId || 'EXAM'),
            submitted_at: submission.submittedAt || new Date().toISOString(),
            payload: submission,
            updated_at: submission.updatedAt || new Date().toISOString()
          })
        });
        if (res && res.ok) {
          this.setPendingSubmissionIds(this.getPendingSubmissionIds().filter(id => id !== submission.id));
        } else {
          ok = false;
          this.setPendingSubmissionIds([...this.getPendingSubmissionIds(), submission.id]);
        }
      } catch (_) {
        ok = false;
        this.setPendingSubmissionIds([...this.getPendingSubmissionIds(), submission.id]);
      }
    }

    if (studentUpdate && studentUpdate.studentId) {
      try {
        const res = await fetch(`${this.SUPABASE_URL}/rest/v1/khao_thi_student_updates?on_conflict=student_id`, {
          method: 'POST',
          headers: this.getSupabaseHeaders({
            'Content-Type': 'application/json',
            Prefer: 'resolution=merge-duplicates,return=minimal'
          }),
          body: JSON.stringify({
            student_id: studentUpdate.studentId,
            payload: studentUpdate,
            updated_at: studentUpdate.updatedAt || new Date().toISOString()
          })
        });
        if (!res || !res.ok) ok = false;
      } catch (_) {
        ok = false;
      }
    }

    return ok;
  },

  async deleteStudentUpdateFromCloud(studentId) {
    if (!this.isServerSyncEnabled() || !studentId) return;
    try {
      await fetch(`${this.SUPABASE_URL}/rest/v1/khao_thi_student_updates?student_id=eq.${encodeURIComponent(studentId)}`, {
        method: 'DELETE',
        headers: this.getSupabaseHeaders()
      });
    } catch (_) {}
  },

  async flushPendingSubmissions() {
    if (!this.isServerSyncEnabled()) return;
    const pendingIds = this.getPendingSubmissionIds();
    if (!pendingIds.length) return;
    for (const subId of pendingIds) {
      const sub = (this.state.submissions || []).find(s => s.id === subId);
      if (sub) {
        await this.pushStudentSubmissionToCloud(sub);
      }
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
    if (typeof document === 'undefined') return;
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
              <button type="button" id="appDialogCancelBtn" class="ui-btn-lg bg-slate-100 hover:bg-slate-200 text-slate-700">
                ${cancelText}
              </button>
            ` : ''}
            <button type="button" id="appDialogConfirmBtn" class="ui-btn-lg w-full text-white shadow-md ${t.btn}">
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
    this.syncFromCloud({ silent: true });
    return true;
  },

  loginAdmin(username, password) {
    const adminAcc = this.state.admin || INITIAL_SEED_DATA.admin;
    const inputUser = String(username || '').trim().toUpperCase();
    const targetUser = String(adminAcc.username || 'ADMIN').trim().toUpperCase();
    if (inputUser === targetUser && password === adminAcc.password) {
      this.state.currentUser = { ...adminAcc, role: 'admin', email: this.ADMIN_RECOVERY_EMAIL };
      sessionStorage.setItem('thpt_current_user', JSON.stringify(this.state.currentUser));
      this.render();
      this.syncFromCloud({ silent: true });
      return true;
    }
    this.notify('Tên đăng nhập hoặc mật khẩu Quản trị không chính xác!', 'error', 'Đăng nhập thất bại');
    return false;
  },

  logout() {
    this.clearIntervalTimer();
    this.resetExamMonitorState();
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
      if (['split', 'top-sheet', 'fast-entry', 'bottom-sheet'].includes(saved.examLayoutMode)) {
        this.state.examLayoutMode = saved.examLayoutMode;
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
        fontSizeDelta: this.state.fontSizeDelta,
        examLayoutMode: this.getNormalizedExamLayoutMode()
      }));
    } catch (e) {}
  },

  applyAppearance() {
    if (typeof document === 'undefined') return;
    const th = this.state.theme || 'light';
    const ct = this.state.contrast || 'normal';
    document.documentElement.setAttribute('data-theme', th);
    document.documentElement.setAttribute('data-contrast', ct);
    document.body.setAttribute('data-theme', th);
    document.body.setAttribute('data-contrast', ct);
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

  // --- HỆ THỐNG BỐ CỤC ĐỀ PDF & Ô ĐIỀN ĐÁP ÁN + XEM TRƯỚC (PREVIEW) ---
  getNormalizedExamLayoutMode(mode = this.state.examLayoutMode) {
    return ['split', 'top-sheet', 'fast-entry', 'bottom-sheet'].includes(mode) ? mode : 'split';
  },

  getExamLayoutMeta(mode = this.state.examLayoutMode) {
    const norm = this.getNormalizedExamLayoutMode(mode);
    return this.EXAM_LAYOUT_MODES.find(m => m.id === norm) || this.EXAM_LAYOUT_MODES[1];
  },

  isWideAnswerSheet() {
    return Boolean(this.state.examPdfCollapsed) || this.getNormalizedExamLayoutMode() !== 'split';
  },

  isExamStackedFlowMode(mobMode = this.state.mobileExamPane) {
    const m = mobMode === 'pdf' || mobMode === 'sheet' ? mobMode : 'both';
    if (this.state.examPdfCollapsed || this.state.examSheetCollapsed || m !== 'both') return false;
    const layout = this.getNormalizedExamLayoutMode();
    return layout === 'top-sheet' || layout === 'bottom-sheet' || layout === 'fast-entry';
  },

  showExamLayoutModal(examId = '') {
    this.closeExamLayoutModal();
    const curMode = this.getNormalizedExamLayoutMode();
    this.state.layoutPreviewMode = curMode;
    this.state.layoutPreviewPdfCollapsed = (curMode === 'fast-entry');
    this.state.layoutPreviewExamId = examId ? String(examId).replace(/_sol$/, '') : '';
    if (!this.state.layoutPreviewSampleAns) {
      this.state.layoutPreviewSampleAns = { 1: 'B', 2: 'D', 3: 'A' };
    }
    if (!this.state.layoutPreviewDevice) {
      this.state.layoutPreviewDevice = (typeof window !== 'undefined' && window.innerWidth < 768) ? 'mobile' : 'desktop';
    }

    if (typeof document === 'undefined') return;
    const modal = document.createElement('div');
    modal.id = 'examLayoutModal';
    modal.className = 'fixed inset-0 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-fade-in';
    modal.style.zIndex = '95';
    modal.innerHTML = this.renderExamLayoutModalInner();
    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.closeExamLayoutModal();
    });
    document.body.appendChild(modal);
  },

  closeExamLayoutModal() {
    if (typeof document === 'undefined') return;
    const existing = document.getElementById('examLayoutModal');
    if (existing) existing.remove();
  },

  selectPreviewLayoutMode(mode) {
    const norm = this.getNormalizedExamLayoutMode(mode);
    this.state.layoutPreviewMode = norm;
    this.state.layoutPreviewPdfCollapsed = (norm === 'fast-entry');
    this.refreshExamLayoutModalDom();
  },

  setPreviewLayoutDevice(device) {
    this.state.layoutPreviewDevice = device === 'mobile' ? 'mobile' : 'desktop';
    this.refreshExamLayoutModalDom();
  },

  togglePreviewPdfCollapse() {
    this.state.layoutPreviewPdfCollapsed = !this.state.layoutPreviewPdfCollapsed;
    this.refreshExamLayoutModalDom();
  },

  pickPreviewSampleAns(qId, opt) {
    if (!this.state.layoutPreviewSampleAns) {
      this.state.layoutPreviewSampleAns = { 1: 'B', 2: 'D', 3: 'A' };
    }
    if (this.state.layoutPreviewSampleAns[qId] === opt) {
      delete this.state.layoutPreviewSampleAns[qId];
    } else {
      this.state.layoutPreviewSampleAns[qId] = opt;
    }
    this.refreshExamLayoutModalDom();
  },

  refreshExamLayoutModalDom() {
    if (typeof document === 'undefined') return;
    const modal = document.getElementById('examLayoutModal');
    if (modal) modal.innerHTML = this.renderExamLayoutModalInner();
  },

  applySelectedExamLayout(andStartExamId = '') {
    const chosen = this.getNormalizedExamLayoutMode(this.state.layoutPreviewMode);
    this.state.examLayoutMode = chosen;
    this.saveAppearance();

    if (this.state.activeExam) {
      this.state.examPdfCollapsed = Boolean(this.state.layoutPreviewPdfCollapsed);
      if (this.state.examPdfCollapsed) this.state.examSheetCollapsed = false;
      this.applyExamLayoutDom();
      this.closeExamLayoutModal();
      return;
    }

    this.closeExamLayoutModal();
    const targetExamId = String(andStartExamId || '').trim();
    if (targetExamId && this.state.currentUser && this.state.currentUser.role === 'student') {
      document.getElementById('previewPdfModal')?.remove();
      this.startExam(targetExamId);
      return;
    }

    this.render();
  },

  renderExamLayoutModalInner() {
    const pMode = this.getNormalizedExamLayoutMode(this.state.layoutPreviewMode);
    const activeSaved = this.getNormalizedExamLayoutMode(this.state.examLayoutMode);
    const pMeta = this.getExamLayoutMeta(pMode);
    const isMobPreview = this.state.layoutPreviewDevice === 'mobile';
    const pdfCollapsed = Boolean(this.state.layoutPreviewPdfCollapsed);
    const sampleAns = this.state.layoutPreviewSampleAns || { 1: 'B', 2: 'D', 3: 'A' };
    const targetExamId = this.state.layoutPreviewExamId || '';
    const targetExam = targetExamId ? (this.state.exams || []).find(e => e.id === targetExamId) : null;
    const canQuickStart = Boolean(
      !this.state.activeExam &&
      targetExam &&
      this.state.currentUser &&
      this.state.currentUser.role === 'student' &&
      this.isStudentAllowedExam(targetExam, this.state.currentUser)
    );

    const wideSheetInPreview = pdfCollapsed || pMode !== 'split';
    const sampleColsCls = isMobPreview
      ? 'grid-cols-1'
      : (wideSheetInPreview ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1');

    const sheetPreviewHtml = `
      <div class="bg-white border border-indigo-200 rounded-xl p-2.5 space-y-2 shadow-2xs">
        <div class="flex flex-wrap items-center justify-between gap-1.5 border-b border-slate-100 pb-1.5">
          <span class="text-[11px] font-extrabold text-indigo-700 flex items-center gap-1">
            <i class="fa-solid fa-pen-to-square"></i>
            <span>Ô Điền Đáp Án ${wideSheetInPreview ? '(Dàn ngang đa cột)' : '(Cột phải)'}</span>
          </span>
          <div class="flex items-center gap-1 text-[10px]">
            <span class="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">Đã làm 3/22</span>
            <button type="button" onclick="App.togglePreviewPdfCollapse()" class="px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer">
              ${pdfCollapsed ? 'Mở lại đề PDF' : 'Thu gọn đề'}
            </button>
          </div>
        </div>
        <div class="grid ${sampleColsCls} gap-1.5">
          ${[1, 2, 3].map(qNum => `
            <div class="p-1.5 rounded-lg bg-indigo-50/70 border border-indigo-100 flex items-center justify-between gap-1">
              <span class="text-[10px] font-extrabold text-slate-700">Câu ${qNum}</span>
              <div class="flex gap-1">
                ${['A', 'B', 'C', 'D'].map(opt => `
                  <button type="button" onclick="App.pickPreviewSampleAns(${qNum}, '${opt}')"
                    class="w-6 h-6 rounded-md text-[10px] font-extrabold border cursor-pointer transition ${sampleAns[qNum] === opt ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-indigo-50'}">${opt}</button>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    const pdfPreviewHtml = pdfCollapsed ? `
      <div class="bg-slate-900 text-indigo-100 rounded-xl px-3 py-2 border border-slate-700 flex items-center justify-between gap-2 text-[11px]">
        <span class="truncate flex items-center gap-1.5">
          <i class="fa-solid fa-compress text-amber-400"></i>
          <span>Đề thi PDF đang thu gọn để ưu tiên điền đáp án nhanh toàn màn hình</span>
        </span>
        <button type="button" onclick="App.togglePreviewPdfCollapse()" class="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold shrink-0 cursor-pointer">
          Mở lại đề PDF
        </button>
      </div>
    ` : `
      <div class="bg-slate-900 rounded-xl border border-slate-700 p-2.5 space-y-2 text-white">
        <div class="flex items-center justify-between text-[10px] text-slate-300 border-b border-slate-800 pb-1.5">
          <span class="font-bold text-white flex items-center gap-1.5"><i class="fa-solid fa-file-pdf text-red-400"></i>Mục Xem Đề PDF Gốc (100% sắc nét)</span>
          <span class="font-mono text-indigo-300">${pMode === 'top-sheet' ? 'Kéo xuống xem tiếp Trang 1 / 6' : 'Trang 1 / 6 • 100%'}</span>
        </div>
        <div class="bg-white text-slate-800 rounded-lg p-3 shadow space-y-1.5 text-[11px]">
          <div class="font-extrabold text-indigo-800 uppercase text-[10px] tracking-wide">ĐỀ KIỂM TRA MÔN TOÁN — PHẦN I. TRẮC NGHIỆM</div>
          <div class="font-semibold text-slate-800"><strong>Câu 1.</strong> Cho hàm số <i>y = f(x)</i> liên tục trên <b>R</b> có bảng xét dấu đạo hàm. Số điểm cực trị của hàm số là:</div>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-1 text-[10px] font-mono font-bold text-slate-600 pt-0.5">
            <span>A. 1</span><span>B. 2</span><span>C. 3</span><span>D. 4</span>
          </div>
          <div class="font-semibold text-slate-700 pt-1 border-t border-slate-100"><strong>Câu 2.</strong> Nghiệm của phương trình <span>log<sub>2</sub>(<i>x</i> &minus; 1) = 3</span> là: <span class="font-mono ml-1">A. x = 7 • B. x = 8 • C. x = 9 • D. x = 10</span></div>
        </div>
      </div>
    `;

    let stageLayoutHtml = '';
    if (pdfCollapsed) {
      stageLayoutHtml = `<div class="space-y-2">${pdfPreviewHtml}${sheetPreviewHtml}</div>`;
    } else if (pMode === 'top-sheet' || pMode === 'fast-entry') {
      stageLayoutHtml = `<div class="space-y-2">${sheetPreviewHtml}${pdfPreviewHtml}</div>`;
    } else if (pMode === 'bottom-sheet') {
      stageLayoutHtml = `<div class="space-y-2">${pdfPreviewHtml}${sheetPreviewHtml}</div>`;
    } else {
      stageLayoutHtml = isMobPreview
        ? `<div class="space-y-2">${pdfPreviewHtml}${sheetPreviewHtml}</div>`
        : `<div class="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-start"><div class="sm:col-span-7">${pdfPreviewHtml}</div><div class="sm:col-span-5">${sheetPreviewHtml}</div></div>`;
    }

    return `
      <div class="dialog-card bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 text-slate-800">
        <!-- Header -->
        <div class="px-4 sm:px-6 py-3.5 border-b border-slate-200 bg-gradient-to-r from-indigo-50/80 via-white to-slate-50 flex items-center justify-between gap-3 shrink-0">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shrink-0">
              <i class="fa-solid fa-table-columns text-base"></i>
            </div>
            <div class="min-w-0">
              <h3 class="text-sm sm:text-base font-extrabold text-slate-900 truncate">Xem Trước &amp; Chọn Cách Hiển Thị Đề PDF + Ô Đáp Án</h3>
              <p class="text-[11px] sm:text-xs text-slate-500 truncate">${targetExam ? `Đang xem cho đề: ${targetExam.title}` : 'Tùy chọn hiển thị đồng bộ thanh cuộn, thu gọn đề nhanh hoặc đặt ô đáp án ở trên'}</p>
            </div>
          </div>
          <button type="button" onclick="App.closeExamLayoutModal()" class="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer shrink-0" title="Đóng">
            <i class="fa-solid fa-xmark text-base"></i>
          </button>
        </div>

        <!-- Body -->
        <div class="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          <!-- 4 Thẻ chọn chế độ bố cục -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            ${this.EXAM_LAYOUT_MODES.map(item => {
              const selected = item.id === pMode;
              const isCurrent = item.id === activeSaved;
              return `
                <button type="button" id="layoutModeCard_${item.id}" onclick="App.selectPreviewLayoutMode('${item.id}')"
                  class="p-3 rounded-2xl border-2 text-left transition cursor-pointer flex flex-col justify-between gap-2 ${selected ? 'border-indigo-600 bg-indigo-50/70 shadow-sm' : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50'}">
                  <div class="space-y-1.5">
                    <div class="flex items-center justify-between gap-1.5">
                      <span class="w-8 h-8 rounded-xl ${selected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-indigo-600'} flex items-center justify-center shrink-0">
                        <i class="fa-solid ${item.icon} text-xs"></i>
                      </span>
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${isCurrent ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}">
                        ${isCurrent ? 'Đang dùng' : item.badge}
                      </span>
                    </div>
                    <div class="font-extrabold text-xs text-slate-900 leading-snug">${item.name}</div>
                    <p class="text-[11px] text-slate-500 leading-relaxed">${item.desc}</p>
                  </div>
                </button>
              `;
            }).join('')}
          </div>

          <!-- Khung Xem Trước Trực Quan (Interactive Live Preview) -->
          <div id="examLayoutPreviewStage" class="rounded-2xl border border-slate-200 bg-slate-100 p-3 sm:p-4 space-y-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="flex items-center gap-2 text-xs">
                <span class="px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-bold inline-flex items-center gap-1.5">
                  <i class="fa-solid fa-eye text-[11px]"></i><span>Xem trước trực tiếp</span>
                </span>
                <span class="font-extrabold text-slate-800">${pMeta.name}</span>
              </div>
              <div class="flex flex-wrap items-center gap-1.5">
                <button type="button" id="previewToggleCollapseBtn" onclick="App.togglePreviewPdfCollapse()"
                  class="px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer flex items-center gap-1 ${pdfCollapsed ? 'bg-amber-500 text-white border-amber-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}">
                  <i class="fa-solid ${pdfCollapsed ? 'fa-expand' : 'fa-compress'}"></i>
                  <span>${pdfCollapsed ? 'Đang thu gọn đề (Bấm mở lại)' : 'Thử thu gọn đề'}</span>
                </button>
                <div class="inline-flex rounded-xl bg-white border border-slate-200 p-0.5 text-[11px] font-bold">
                  <button type="button" onclick="App.setPreviewLayoutDevice('desktop')" class="px-2.5 py-1 rounded-lg cursor-pointer transition ${!isMobPreview ? 'bg-indigo-600 text-white' : 'text-slate-600'}">
                    <i class="fa-solid fa-desktop mr-1"></i>Máy tính
                  </button>
                  <button type="button" onclick="App.setPreviewLayoutDevice('mobile')" class="px-2.5 py-1 rounded-lg cursor-pointer transition ${isMobPreview ? 'bg-indigo-600 text-white' : 'text-slate-600'}">
                    <i class="fa-solid fa-mobile-screen mr-1"></i>Điện thoại
                  </button>
                </div>
              </div>
            </div>

            <div class="${isMobPreview ? 'max-w-[350px] mx-auto' : 'w-full'} transition-all">
              ${stageLayoutHtml}
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-4 sm:px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 shrink-0">
          <div class="text-xs text-slate-500">
            Đang chọn: <strong class="text-indigo-700">${pMeta.name}</strong>
          </div>
          <div class="grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-end gap-2 w-full sm:w-auto">
            <button type="button" onclick="App.closeExamLayoutModal()" class="ui-btn bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 px-4">
              Đóng
            </button>
            <button type="button" id="applyExamLayoutBtn" onclick="App.applySelectedExamLayout()" class="ui-btn bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm px-3 sm:px-4">
              <i class="fa-solid fa-check"></i>
              <span>Áp dụng bố cục</span>
            </button>
            ${canQuickStart ? `
              <button type="button" id="applyAndStartExamLayoutBtn" onclick="App.applySelectedExamLayout('${targetExam.id}')" class="col-span-2 sm:col-span-1 ui-btn bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm px-4">
                <i class="fa-solid fa-play text-[10px]"></i>
                <span>Áp dụng &amp; Vào làm bài ngay</span>
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  },

  // 4. Render Router chính
  render() {
    this.closeCustomSelectPopover();
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
      <div class="min-h-screen bg-slate-50 flex flex-col justify-center py-6 sm:py-12 sm:px-6 lg:px-8 relative text-slate-900">
        <!-- Thanh công cụ đồng bộ: gọn gàng trên điện thoại, ghim góc phải trên máy tính -->
        <div class="w-full max-w-md mx-auto px-4 mb-5 sm:mb-0 sm:w-auto sm:px-0 sm:fixed sm:top-4 sm:right-4 z-30 flex items-center justify-between sm:justify-end gap-1.5 sm:gap-2">
          <button type="button" id="loginIosAppBtn" onclick="App.showIosAppModal()" class="ui-btn bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex-1 sm:flex-initial min-w-0" title="Quét mã QR & Hướng dẫn tạo App trên điện thoại Android & iOS">
            <i class="fa-solid fa-qrcode shrink-0"></i>
            <span>Tạo App ĐT / QR</span>
          </button>
          <button type="button" id="loginLayoutBtn" onclick="App.showExamLayoutModal()" class="ui-btn bg-white border border-slate-200 shadow-xs hover:bg-indigo-50 text-indigo-700 shrink-0" title="Xem trước & chọn cách hiển thị Đề PDF và Ô điền đáp án">
            <i class="fa-solid fa-table-columns text-indigo-600 shrink-0"></i>
            <span>Bố cục thi</span>
          </button>
          <button type="button" id="loginQuickThemeBtn" onclick="App.cycleTheme()" class="ui-btn-icon sm:w-auto sm:px-3 bg-white border border-slate-200 shadow-xs hover:bg-slate-100 text-xs font-bold text-slate-700 sm:gap-1.5" title="Chuyển nhanh chế độ Sáng / Dịu mắt / Tối">
            <i class="fa-solid ${thMeta.icon} text-indigo-600"></i>
            <span class="hidden sm:inline">${thMeta.label}</span>
          </button>
          <button type="button" id="loginThemeBtn" onclick="App.showThemeModal()" class="ui-btn-icon sm:w-auto sm:px-3 bg-white border border-slate-200 shadow-xs hover:bg-slate-100 text-xs font-bold text-slate-700 sm:gap-1.5" title="Đổi bộ màu chủ đạo & mức độ tương phản">
            <span data-appearance-swatch-dot class="w-3.5 h-3.5 rounded-full border border-black/15 shrink-0" style="background:${swatchHex};"></span>
            <span class="hidden sm:inline">Bộ màu</span>
          </button>
        </div>

        <div class="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
          <div class="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-500/25 mb-3.5">
            <i class="fa-solid fa-graduation-cap text-2xl text-white"></i>
          </div>
          <h1 class="text-xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            KHẢO THÍ &amp; LUYỆN ĐỀ TOÁN 6 – 12
          </h1>
          <p class="mt-1.5 text-xs sm:text-sm font-semibold text-indigo-700">
            Kiểm tra định kì (GK1, CK1, GK2, CK2) • Đề thi vào 10 • Thi thử THPT QG
          </p>
        </div>

        <div class="mt-5 sm:mt-7 sm:mx-auto sm:w-full sm:max-w-md px-4">
          <div class="bg-white py-6 px-5 shadow-xl rounded-2xl border border-slate-200 sm:py-8 sm:px-10">
            <div class="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/80 mb-5">
              <button type="button" id="tabStudentBtn" onclick="App.switchLoginTab('student')" class="h-10 rounded-lg text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer ${activeTab === 'student' ? 'bg-indigo-600 text-white font-extrabold shadow-xs' : 'text-slate-600 hover:text-slate-900 font-semibold'}">
                <i class="fa-solid fa-user-graduate"></i><span>Học sinh</span>
              </button>
              <button type="button" id="tabAdminBtn" onclick="App.switchLoginTab('admin')" class="h-10 rounded-lg text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer ${activeTab === 'admin' ? 'bg-emerald-600 text-white font-extrabold shadow-xs' : 'text-slate-600 hover:text-slate-900 font-semibold'}">
                <i class="fa-solid fa-chalkboard-user"></i><span>Giáo viên</span>
              </button>
            </div>

            <!-- Form Học sinh -->
            <form id="studentLoginForm" onsubmit="event.preventDefault(); App.handleStudentLogin();" class="space-y-4 ${activeTab === 'student' ? '' : 'hidden'}">
              <div>
                <div class="flex items-center justify-between">
                  <label for="loginStudentId" class="block text-xs font-bold uppercase tracking-wider text-slate-700">Mã Học Sinh</label>
                  <span class="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">Tự động IN HOA</span>
                </div>
                <div class="mt-1.5 relative">
                  <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <i class="fa-solid fa-id-card"></i>
                  </div>
                  <input type="text" id="loginStudentId" placeholder="Nhập mã học sinh (VD: HS001)" required
                    autocapitalize="characters" autocomplete="username" spellcheck="false"
                    oninput="App.forceUppercaseInput(this)"
                    class="block w-full pl-10 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono font-bold tracking-wide input-uppercase">
                </div>
              </div>

              <div>
                <label for="loginStudentPass" class="block text-xs font-bold uppercase tracking-wider text-slate-700">Mật khẩu</label>
                <div class="mt-1.5 relative">
                  <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <i class="fa-solid fa-lock"></i>
                  </div>
                  <input type="password" id="loginStudentPass" placeholder="Nhập mật khẩu" required
                    autocomplete="current-password"
                    class="block w-full pl-10 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-medium">
                </div>
              </div>

              <button type="submit" class="ui-btn-lg w-full mt-2 text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm">
                <span>Đăng Nhập Cổng Học Sinh</span>
                <i class="fa-solid fa-arrow-right text-xs"></i>
              </button>
            </form>

            <!-- Form Giáo viên -->
            <form id="adminLoginForm" onsubmit="event.preventDefault(); App.handleAdminLogin();" class="space-y-4 ${activeTab === 'admin' ? '' : 'hidden'}">
              <div>
                <div class="flex items-center justify-between">
                  <label for="loginAdminUser" class="block text-xs font-bold uppercase tracking-wider text-slate-700">Tài khoản Giáo viên</label>
                  <span class="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">Tự động IN HOA</span>
                </div>
                <div class="mt-1.5 relative">
                  <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <i class="fa-solid fa-user-shield"></i>
                  </div>
                  <input type="text" id="loginAdminUser" placeholder="Nhập tên đăng nhập (VD: ADMIN)" required
                    autocapitalize="characters" autocomplete="username" spellcheck="false"
                    oninput="App.forceUppercaseInput(this)"
                    class="block w-full pl-10 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm font-mono font-bold tracking-wide input-uppercase">
                </div>
              </div>

              <div>
                <div class="flex items-center justify-between">
                  <label for="loginAdminPass" class="block text-xs font-bold uppercase tracking-wider text-slate-700">Mật khẩu Quản trị</label>
                  <button type="button" id="forgotAdminPassBtn" onclick="App.requestAdminPasswordReset()" class="text-xs font-bold text-emerald-700 hover:underline cursor-pointer">
                    Quên mật khẩu?
                  </button>
                </div>
                <div class="mt-1.5 relative">
                  <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <i class="fa-solid fa-key"></i>
                  </div>
                  <input type="password" id="loginAdminPass" placeholder="Nhập mật khẩu quản trị" required
                    autocomplete="current-password"
                    class="block w-full pl-10 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm font-medium">
                </div>
              </div>

              <button type="submit" class="ui-btn-lg w-full mt-2 text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm">
                <span>Đăng Nhập Cổng Giáo Viên</span>
                <i class="fa-solid fa-arrow-right text-xs"></i>
              </button>
            </form>
          </div>

          <!-- Hộp mở nhanh Mã QR & Hướng dẫn Tạo App cho Điện thoại Android & iOS -->
          <div class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button type="button" id="loginAndroidPromoCard" onclick="App.showIosAppModal(false, 'android')" class="w-full bg-white hover:bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-200 shadow-sm transition flex items-center justify-between gap-2.5 text-left cursor-pointer group">
              <div class="flex items-center gap-2.5 min-w-0">
                <div class="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <i class="fa-brands fa-android text-lg"></i>
                </div>
                <div class="min-w-0">
                  <div class="text-xs font-extrabold text-slate-900 truncate">Tạo App trên Android</div>
                  <p class="text-[11px] text-slate-500 mt-0.5 truncate">Samsung, Oppo, Xiaomi • 4 bước</p>
                </div>
              </div>
              <div class="w-8 h-8 rounded-xl bg-emerald-50 group-hover:bg-emerald-600 text-emerald-600 group-hover:text-white border border-emerald-200 flex items-center justify-center shrink-0 transition">
                <i class="fa-solid fa-qrcode text-sm"></i>
              </div>
            </button>

            <button type="button" id="loginIosPromoCard" onclick="App.showIosAppModal(false, 'ios')" class="w-full bg-white hover:bg-indigo-50/60 p-3.5 rounded-2xl border border-indigo-200 shadow-sm transition flex items-center justify-between gap-2.5 text-left cursor-pointer group">
              <div class="flex items-center gap-2.5 min-w-0">
                <div class="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <i class="fa-brands fa-apple text-lg"></i>
                </div>
                <div class="min-w-0">
                  <div class="text-xs font-extrabold text-slate-900 truncate">Tạo App trên iOS</div>
                  <p class="text-[11px] text-slate-500 mt-0.5 truncate">iPhone / iPad (Safari) • 4 bước</p>
                </div>
              </div>
              <div class="w-8 h-8 rounded-xl bg-indigo-50 group-hover:bg-indigo-600 text-indigo-600 group-hover:text-white border border-indigo-200 flex items-center justify-center shrink-0 transition">
                <i class="fa-solid fa-qrcode text-sm"></i>
              </div>
            </button>
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

    const baseTab = 'h-10 rounded-lg text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer';
    if (this.state.loginTab === 'student') {
      sBtn.className = `${baseTab} bg-indigo-600 text-white font-extrabold shadow-xs`;
      aBtn.className = `${baseTab} text-slate-600 hover:text-slate-900 font-semibold`;
      sForm.classList.remove('hidden');
      aForm.classList.add('hidden');
    } else {
      aBtn.className = `${baseTab} bg-emerald-600 text-white font-extrabold shadow-xs`;
      sBtn.className = `${baseTab} text-slate-600 hover:text-slate-900 font-semibold`;
      aForm.classList.remove('hidden');
      sForm.classList.add('hidden');
    }
  },

  async handleStudentLogin() {
    const idEl = document.getElementById('loginStudentId');
    const id = this.forceUppercaseInput(idEl);
    const pass = document.getElementById('loginStudentPass').value;
    const matchedLocal = this.state.students.some(
      x => x.studentId.trim().toUpperCase() === id.trim().toUpperCase() && x.password === pass
    );
    if (!matchedLocal) {
      await this.syncFromCloud({ silent: true });
    }
    this.loginStudent(id, pass);
  },

  handleAdminLogin() {
    const userEl = document.getElementById('loginAdminUser');
    const user = this.forceUppercaseInput(userEl);
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

  redeemReward(rewardId, skipConfirm = false) {
    const u = this.state.currentUser;
    if (!u || u.role !== 'student') return false;
    const reward = this.getRewardCatalog().find(r => r.id === rewardId && r.active !== false);
    if (!reward) {
      this.notify('Phần thưởng này hiện không khả dụng!', 'warning', 'Không thể đổi thưởng');
      return false;
    }
    const stats = this.getStudentRewardStats(u.studentId);
    if (stats.availablePoints < reward.cost) {
      this.notify(`Bạn hiện có ${stats.availablePoints} điểm, cần thêm ${reward.cost - stats.availablePoints} điểm nữa để đổi "${reward.title}".`, 'warning', 'Chưa đủ điểm tích lũy');
      return false;
    }
    if (skipConfirm || typeof document === 'undefined') {
      return this.executeRedeemReward(rewardId);
    }
    this.confirmDialog(
      `Bạn muốn dùng ${reward.cost} điểm tích lũy để đổi phần thưởng "${reward.title}"? Yêu cầu sẽ được gửi tới Giáo viên để trao thưởng.`,
      () => this.executeRedeemReward(rewardId),
      {
        type: 'info',
        title: 'Xác nhận đổi phần thưởng',
        icon: 'fa-gift',
        confirmText: `Đổi ngay (${reward.cost} điểm)`,
        cancelText: 'Để sau'
      }
    );
    return true;
  },

  executeRedeemReward(rewardId) {
    const u = this.state.currentUser;
    if (!u || u.role !== 'student') return false;
    const reward = this.getRewardCatalog().find(r => r.id === rewardId && r.active !== false);
    if (!reward) return false;
    const stats = this.getStudentRewardStats(u.studentId);
    if (stats.availablePoints < reward.cost) return false;

    const nowIso = new Date().toISOString();
    const redemption = {
      id: `RDM-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      rewardId: reward.id,
      rewardTitle: reward.title,
      cost: reward.cost,
      status: 'pending',
      createdAt: nowIso,
      updatedAt: nowIso
    };

    let student = (this.state.students || []).find(s => s.studentId === u.studentId);
    if (!student) {
      student = this.normalizeStudentRecord({ ...u });
      this.state.students.push(student);
    }
    if (!Array.isArray(student.redemptions)) student.redemptions = [];
    student.redemptions.unshift(redemption);
    student.updatedAt = nowIso;

    this.state.currentUser = { ...student, role: 'student' };
    if (typeof sessionStorage !== 'undefined') {
      try { sessionStorage.setItem('thpt_current_user', JSON.stringify(this.state.currentUser)); } catch (_) {}
    }

    this.saveData();
    this.pushStudentSubmissionToCloud(null, student);

    if (typeof confetti === 'function') {
      try { confetti({ particleCount: 90, spread: 65, origin: { y: 0.65 } }); } catch (_) {}
    }
    if (typeof document !== 'undefined') {
      this.render();
    }
    this.notify(`Đã đổi thành công "${reward.title}" (-${reward.cost} điểm)! Giáo viên đã nhận được yêu cầu trao thưởng của bạn.`, 'success', 'Đổi phần thưởng thành công');
    return true;
  },

  fulfillRewardRedemption(studentId, redemptionId) {
    const student = (this.state.students || []).find(s => s.studentId === studentId);
    if (!student || !Array.isArray(student.redemptions)) return false;
    const item = student.redemptions.find(r => r && r.id === redemptionId);
    if (!item) return false;
    const nowIso = new Date().toISOString();
    item.status = 'fulfilled';
    item.updatedAt = nowIso;
    student.updatedAt = nowIso;
    this.saveData({ markAdminDirty: true });
    this.pushStudentSubmissionToCloud(null, student);
    if (typeof document !== 'undefined') this.render();
    this.notify(`Đã xác nhận trao phần thưởng "${item.rewardTitle}" cho học sinh ${student.fullName}.`, 'success', 'Đã trao thưởng');
    return true;
  },

  rejectRewardRedemption(studentId, redemptionId) {
    const student = (this.state.students || []).find(s => s.studentId === studentId);
    if (!student || !Array.isArray(student.redemptions)) return false;
    const item = student.redemptions.find(r => r && r.id === redemptionId);
    if (!item) return false;
    const nowIso = new Date().toISOString();
    item.status = 'rejected';
    item.updatedAt = nowIso;
    student.updatedAt = nowIso;
    this.saveData({ markAdminDirty: true });
    this.pushStudentSubmissionToCloud(null, student);
    if (typeof document !== 'undefined') this.render();
    this.notify(`Đã hủy yêu cầu và hoàn lại +${item.cost} điểm cho học sinh ${student.fullName}.`, 'info', 'Đã hoàn điểm');
    return true;
  },

  adjustStudentBonusPoints(studentId, delta) {
    const student = (this.state.students || []).find(s => s.studentId === studentId);
    const numDelta = Math.round(Number(delta) || 0);
    if (!student || !numDelta) return false;
    const nowIso = new Date().toISOString();
    student.bonusPoints = (Number(student.bonusPoints || 0) || 0) + numDelta;
    student.updatedAt = nowIso;
    if (this.state.currentUser && this.state.currentUser.studentId === studentId) {
      this.state.currentUser = { ...student, role: this.state.currentUser.role };
    }
    this.saveData({ markAdminDirty: true });
    this.pushStudentSubmissionToCloud(null, student);
    if (typeof document !== 'undefined') this.render();
    this.notify(`${numDelta > 0 ? `Đã cộng +${numDelta} điểm` : `Đã trừ ${Math.abs(numDelta)} điểm`} thưởng cho ${student.fullName}.`, 'success', 'Cập nhật điểm thưởng');
    return true;
  },

  applyCustomStudentBonus(studentId, sign = 1, explicitAmount = null) {
    const inputEl = (explicitAmount === null && typeof document !== 'undefined')
      ? document.getElementById(`bonusAmt_${studentId}`)
      : null;
    const raw = explicitAmount !== null ? explicitAmount : inputEl?.value;
    const amount = Math.round(Math.abs(Number(raw) || 0));
    if (!amount || amount < 1) {
      this.notify('Vui lòng nhập số điểm hợp lệ (từ 1 điểm trở lên)!', 'warning', 'Số điểm chưa hợp lệ');
      return false;
    }
    return this.adjustStudentBonusPoints(studentId, sign >= 0 ? amount : -amount);
  },

  onAdminRewardStudentSearch(val) {
    this.state.adminRewardStudentSearch = String(val ?? '');
    if (typeof document === 'undefined') return;
    const tbody = document.getElementById('adminRewardStudentsTbody');
    if (tbody) tbody.innerHTML = this.renderAdminRewardStudentRowsHtml();
    const countEl = document.getElementById('adminRewardStudentCountBadge');
    if (countEl) {
      const matched = this.getFilteredRewardStudentRows().length;
      countEl.textContent = `${matched} / ${(this.state.students || []).length} HS`;
    }
    const clearBtn = document.getElementById('clearAdminRewardSearchBtn');
    if (clearBtn) clearBtn.classList.toggle('hidden', !this.state.adminRewardStudentSearch);
  },

  clearAdminRewardStudentSearch() {
    this.state.adminRewardStudentSearch = '';
    if (typeof document !== 'undefined') {
      const inp = document.getElementById('adminRewardStudentSearchInput');
      if (inp) {
        inp.value = '';
        inp.focus();
      }
      this.onAdminRewardStudentSearch('');
    }
  },

  handleAddRewardCatalogItem() {
    const titleEl = typeof document !== 'undefined' ? document.getElementById('newRewardTitle') : null;
    const costEl = typeof document !== 'undefined' ? document.getElementById('newRewardCost') : null;
    const iconEl = typeof document !== 'undefined' ? document.getElementById('newRewardIcon') : null;
    const descEl = typeof document !== 'undefined' ? document.getElementById('newRewardDesc') : null;
    const title = String(titleEl?.value || '').trim();
    const cost = Math.round(Number(costEl?.value || 0));
    const icon = String(iconEl?.value || 'fa-gift').trim() || 'fa-gift';
    const desc = String(descEl?.value || '').trim();
    if (!title || cost < 5) {
      this.notify('Vui lòng nhập tên phần thưởng và mức điểm đổi từ 5 điểm trở lên!', 'warning', 'Thiếu thông tin phần thưởng');
      return false;
    }
    const list = this.getRewardCatalog();
    list.push({
      id: `RW-${Date.now().toString(36).toUpperCase()}`,
      title,
      cost,
      icon,
      desc: desc || 'Phần thưởng khuyến khích học tập từ Giáo viên.',
      active: true
    });
    if (!this.state.settings) this.state.settings = {};
    this.state.settings.rewardCatalog = list;
    this.saveData({ markAdminDirty: true });
    if (typeof document !== 'undefined') this.render();
    this.notify(`Đã thêm phần thưởng "${title}" (${cost} điểm) vào cửa hàng đổi thưởng!`, 'success', 'Thêm phần thưởng thành công');
    return true;
  },

  showEditRewardModal(rewardId) {
    if (typeof document === 'undefined') return;
    const rw = this.getRewardCatalog().find(r => r.id === rewardId);
    if (!rw) return;

    document.getElementById('editRewardModal')?.remove();
    const modal = document.createElement('div');
    modal.id = 'editRewardModal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in';
    modal.innerHTML = `
      <div class="bg-white rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
        <div class="flex items-center justify-between border-b border-slate-100 pb-3">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <i class="fa-solid fa-pen-to-square"></i>
            </div>
            <div>
              <h3 class="text-sm sm:text-base font-extrabold text-slate-900">Chỉnh Sửa Phần Thưởng</h3>
              <p class="text-[11px] text-slate-500">Cập nhật trực tiếp không cần xóa &amp; tạo lại</p>
            </div>
          </div>
          <button type="button" onclick="document.getElementById('editRewardModal')?.remove()" class="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <form onsubmit="event.preventDefault(); App.handleEditRewardSubmit('${rw.id}');" class="space-y-3 text-xs">
          <div>
            <label for="editRewardTitle" class="block font-bold text-slate-700 mb-1">Tên phần thưởng *</label>
            <input type="text" id="editRewardTitle" required value="${this.escapeHtmlAttr(rw.title)}" placeholder="VD: Phiếu miễn 1 bài tập về nhà" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white font-semibold text-slate-900 outline-none focus:border-indigo-600">
          </div>

          <div class="grid grid-cols-2 gap-2.5">
            <div>
              <label for="editRewardCost" class="block font-bold text-slate-700 mb-1">Mức điểm đổi *</label>
              <input type="number" id="editRewardCost" required min="5" step="5" value="${rw.cost}" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white font-mono font-bold text-amber-700 outline-none focus:border-indigo-600">
            </div>
            <div>
              <label for="editRewardIcon" class="block font-bold text-slate-700 mb-1">Biểu tượng</label>
              <select id="editRewardIcon" class="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white font-semibold text-slate-800 outline-none focus:border-indigo-600 cursor-pointer">
                ${this.REWARD_ICON_OPTIONS.map(opt => `
                  <option value="${opt.value}" ${rw.icon === opt.value ? 'selected' : ''}>${opt.label}</option>
                `).join('')}
              </select>
            </div>
          </div>

          <div>
            <label for="editRewardDesc" class="block font-bold text-slate-700 mb-1">Mô tả chi tiết</label>
            <textarea id="editRewardDesc" rows="2" placeholder="Mô tả quyền lợi phần thưởng cho học sinh..." class="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 outline-none focus:border-indigo-600 resize-none">${this.escapeHtmlAttr(rw.desc || '')}</textarea>
          </div>

          <div class="pt-2 flex items-center justify-end gap-2">
            <button type="button" onclick="document.getElementById('editRewardModal')?.remove()" class="ui-btn px-4 bg-slate-100 hover:bg-slate-200 text-slate-700">
              <span>Hủy</span>
            </button>
            <button type="submit" id="saveEditRewardBtn" class="ui-btn px-4 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
              <i class="fa-solid fa-floppy-disk shrink-0"></i><span>Lưu Thay Đổi</span>
            </button>
          </div>
        </form>
      </div>
    `;
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
    document.body.appendChild(modal);
  },

  handleEditRewardSubmit(rewardId, customPayload = null) {
    const catalog = this.getRewardCatalog();
    const idx = catalog.findIndex(r => r.id === rewardId);
    if (idx === -1) return false;

    const title = String(customPayload ? customPayload.title : (typeof document !== 'undefined' ? document.getElementById('editRewardTitle')?.value : '') || '').trim();
    const cost = Math.round(Number(customPayload ? customPayload.cost : (typeof document !== 'undefined' ? document.getElementById('editRewardCost')?.value : 0)) || 0);
    const icon = String((customPayload ? customPayload.icon : (typeof document !== 'undefined' ? document.getElementById('editRewardIcon')?.value : '')) || catalog[idx].icon || 'fa-gift').trim();
    const desc = String(customPayload && customPayload.desc !== undefined ? customPayload.desc : (typeof document !== 'undefined' ? document.getElementById('editRewardDesc')?.value : catalog[idx].desc) || '').trim();

    if (!title || cost < 5) {
      this.notify('Vui lòng nhập tên phần thưởng và mức điểm đổi từ 5 điểm trở lên!', 'warning', 'Thông tin chưa hợp lệ');
      return false;
    }

    catalog[idx] = {
      ...catalog[idx],
      title,
      cost,
      icon,
      desc
    };
    if (!this.state.settings) this.state.settings = {};
    this.state.settings.rewardCatalog = catalog;
    this.saveData({ markAdminDirty: true });
    if (typeof document !== 'undefined') {
      document.getElementById('editRewardModal')?.remove();
      this.render();
    }
    this.notify(`Đã cập nhật phần thưởng "${title}" (${cost} điểm).`, 'success', 'Lưu phần thưởng thành công');
    return true;
  },

  toggleRewardCatalogItem(rewardId) {
    const list = this.getRewardCatalog().map(r => r.id === rewardId ? { ...r, active: !r.active } : r);
    if (!this.state.settings) this.state.settings = {};
    this.state.settings.rewardCatalog = list;
    this.saveData({ markAdminDirty: true });
    if (typeof document !== 'undefined') this.render();
  },

  deleteRewardCatalogItem(rewardId) {
    const list = this.getRewardCatalog().filter(r => r.id !== rewardId);
    if (!list.length) {
      this.notify('Cần giữ lại ít nhất 1 phần thưởng trong danh mục!', 'warning', 'Không thể xóa hết');
      return false;
    }
    if (!this.state.settings) this.state.settings = {};
    this.state.settings.rewardCatalog = list;
    this.saveData({ markAdminDirty: true });
    if (typeof document !== 'undefined') this.render();
    return true;
  },

  renderStudentRewardsSectionHtml(u, stats) {
    const catalog = this.getRewardCatalog().filter(r => r.active !== false).sort((a, b) => a.cost - b.cost);
    const nextGoal = stats.nextReward;
    const goalPct = nextGoal ? Math.min(100, Math.round((stats.availablePoints / Math.max(1, nextGoal.cost)) * 100)) : 100;

    return `
      <section class="space-y-5" id="studentRewardsSection">
        <!-- Thẻ tổng quan điểm tích lũy & tiến độ -->
        <div class="bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 rounded-2xl p-4 sm:p-6 text-white shadow-lg">
          <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div class="space-y-1.5">
              <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-xs font-extrabold">
                <i class="fa-solid ${stats.tier.icon}"></i>
                <span>Danh hiệu: ${stats.tier.name}</span>
              </div>
              <h3 class="text-xl sm:text-2xl font-extrabold flex items-center gap-2">
                <span>Kho Điểm Tích Lũy &amp; Đổi Phần Thưởng</span>
              </h3>
              <p class="text-xs sm:text-sm text-white/90">
                Làm đề đạt từ 5,0đ trở lên và giữ kỷ luật phòng thi (0 rời màn hình, 0 chụp màn hình) để tích sao đổi quà!
              </p>
            </div>
            <div class="grid grid-cols-3 gap-2 sm:gap-3 shrink-0">
              <div class="bg-white/15 backdrop-blur-xs rounded-xl p-2.5 sm:p-3 text-center border border-white/20">
                <div class="text-[11px] text-white/85 font-semibold">Khả dụng</div>
                <div id="studentAvailablePointsVal" class="text-xl sm:text-2xl font-extrabold font-mono inline-flex items-center justify-center gap-1">
                  <span>${stats.availablePoints}</span>
                  <i class="fa-solid fa-star text-sm text-amber-200"></i>
                </div>
              </div>
              <div class="bg-white/15 backdrop-blur-xs rounded-xl p-2.5 sm:p-3 text-center border border-white/20">
                <div class="text-[11px] text-white/85 font-semibold">Tổng tích lũy</div>
                <div class="text-xl sm:text-2xl font-extrabold font-mono">${stats.totalAccumulated}</div>
              </div>
              <div class="bg-white/15 backdrop-blur-xs rounded-xl p-2.5 sm:p-3 text-center border border-white/20">
                <div class="text-[11px] text-white/85 font-semibold">Đã đổi quà</div>
                <div class="text-xl sm:text-2xl font-extrabold font-mono">${stats.spentPoints}</div>
              </div>
            </div>
          </div>

          ${nextGoal ? `
            <div class="mt-4 pt-3.5 border-t border-white/20 space-y-1.5">
              <div class="flex items-center justify-between gap-2 text-xs font-bold">
                <span class="truncate">Mục tiêu tiếp theo: ${nextGoal.title} (${nextGoal.cost} điểm)</span>
                <span class="font-mono shrink-0">${stats.availablePoints >= nextGoal.cost ? 'Đủ điểm đổi!' : `Còn thiếu ${nextGoal.cost - stats.availablePoints} điểm`}</span>
              </div>
              <div class="w-full h-2.5 rounded-full bg-black/20 overflow-hidden">
                <div class="h-full rounded-full bg-white transition-all duration-300" style="width:${goalPct}%"></div>
              </div>
            </div>
          ` : ''}
        </div>

        <!-- Quy tắc cộng điểm minh bạch -->
        <div class="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-2.5">
          <div class="text-xs font-extrabold uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
            <i class="fa-solid fa-star text-amber-500"></i>
            <span>Bảng Quy Đổi Điểm Thưởng (Tính lượt điểm cao nhất của mỗi đề)</span>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
            <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <div class="font-bold text-slate-700">Đạt &ge; 5,0đ</div>
              <div class="font-extrabold text-indigo-600 font-mono mt-0.5 inline-flex items-center gap-1"><i class="fa-solid fa-star text-amber-500 text-[10px]"></i><span>+10 điểm</span></div>
            </div>
            <div class="p-2.5 rounded-xl bg-blue-50/60 border border-blue-200">
              <div class="font-bold text-blue-800">Khá &ge; 7,0đ</div>
              <div class="font-extrabold text-blue-700 font-mono mt-0.5 inline-flex items-center gap-1"><i class="fa-solid fa-star text-amber-500 text-[10px]"></i><span>+20 điểm</span></div>
            </div>
            <div class="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200">
              <div class="font-bold text-emerald-800">Giỏi &ge; 8,0đ</div>
              <div class="font-extrabold text-emerald-700 font-mono mt-0.5 inline-flex items-center gap-1"><i class="fa-solid fa-star text-amber-500 text-[10px]"></i><span>+30 điểm</span></div>
            </div>
            <div class="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200">
              <div class="font-bold text-amber-900">Xuất sắc &ge; 9,0đ</div>
              <div class="font-extrabold text-amber-700 font-mono mt-0.5 inline-flex items-center gap-1"><i class="fa-solid fa-star text-amber-500 text-[10px]"></i><span>+45–50 điểm</span></div>
            </div>
            <div class="col-span-2 sm:col-span-1 p-2.5 rounded-xl bg-purple-50/70 border border-purple-200">
              <div class="font-bold text-purple-900">0 Vi phạm / Chụp MH</div>
              <div class="font-extrabold text-purple-700 font-mono mt-0.5 inline-flex items-center gap-1"><i class="fa-solid fa-shield-heart text-purple-600 text-[10px]"></i><span>+5 điểm kỷ luật</span></div>
            </div>
          </div>
        </div>

        <!-- Danh sách Phần Thưởng -->
        <div class="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 class="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <i class="fa-solid fa-gift text-rose-500"></i>
                <span>Cửa Hàng Phần Thưởng (${catalog.length})</span>
              </h4>
              <p class="text-xs text-slate-500">Chọn phần thưởng khi đủ điểm tích lũy — Giáo viên sẽ xác nhận và trao thưởng trên lớp</p>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            ${catalog.map(rw => {
              const canRedeem = stats.availablePoints >= rw.cost;
              const pct = Math.min(100, Math.round((stats.availablePoints / Math.max(1, rw.cost)) * 100));
              return `
                <div class="rounded-2xl border ${canRedeem ? 'border-amber-300 bg-amber-50/30 shadow-xs' : 'border-slate-200 bg-slate-50/40'} p-4 flex flex-col justify-between gap-3">
                  <div class="space-y-2">
                    <div class="flex items-start justify-between gap-2">
                      <div class="w-10 h-10 rounded-xl ${canRedeem ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-600'} flex items-center justify-center text-base shrink-0 shadow-xs">
                        <i class="fa-solid ${rw.icon}"></i>
                      </div>
                      <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold font-mono ${canRedeem ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-white text-slate-700 border border-slate-200'} shrink-0">
                        <i class="fa-solid fa-star text-amber-500 text-[10px]"></i>
                        <span>${rw.cost} điểm</span>
                      </span>
                    </div>
                    <h5 class="text-sm font-extrabold text-slate-900 leading-snug">${rw.title}</h5>
                    <p class="text-xs text-slate-500 leading-relaxed">${rw.desc || ''}</p>
                  </div>
                  <div class="space-y-2 pt-1">
                    <div class="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                      <div class="h-full rounded-full ${canRedeem ? 'bg-emerald-500' : 'bg-indigo-500'}" style="width:${pct}%"></div>
                    </div>
                    <button
                      type="button"
                      id="redeemBtn_${rw.id}"
                      onclick="App.redeemReward('${rw.id}')"
                      ${canRedeem ? '' : 'disabled'}
                      class="ui-btn w-full ${canRedeem ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm' : 'bg-slate-200 text-slate-500 cursor-not-allowed'}"
                    >
                      <i class="fa-solid ${canRedeem ? 'fa-gift' : 'fa-lock'} shrink-0"></i>
                      <span>${canRedeem ? `Đổi Thưởng Ngay (-${rw.cost} điểm)` : `Cần thêm ${rw.cost - stats.availablePoints} điểm`}</span>
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Lịch sử đổi thưởng của học sinh -->
        <div class="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm space-y-3">
          <h4 class="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
            <i class="fa-solid fa-clock-rotate-left text-indigo-600"></i>
            <span>Lịch Sử Đổi Phần Thưởng Của Bạn (${stats.redemptions.length})</span>
          </h4>
          ${stats.redemptions.length === 0 ? `
            <div class="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              Bạn chưa đổi phần thưởng nào. Hãy hoàn thành các đề thi thật tốt để nhận phần thưởng đầu tiên!
            </div>
          ` : `
            <div class="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              ${stats.redemptions.map(r => {
                let badge = '<span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">Chờ GV trao thưởng</span>';
                if (r.status === 'fulfilled') badge = '<span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200"><i class="fa-solid fa-check mr-1"></i>Đã nhận thưởng</span>';
                else if (r.status === 'rejected') badge = '<span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">Đã hoàn điểm</span>';
                return `
                  <div class="p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-white">
                    <div class="min-w-0">
                      <div class="font-bold text-xs sm:text-sm text-slate-900">${r.rewardTitle}</div>
                      <div class="text-[11px] text-slate-500 mt-0.5">${new Date(r.createdAt).toLocaleString('vi-VN')} • Mức đổi: <strong class="font-mono text-amber-700">${r.cost} điểm</strong></div>
                    </div>
                    <div class="shrink-0">${badge}</div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>
      </section>
    `;
  },

  // --- VIEW: TRANG HỌC SINH (STUDENT PORTAL) ---
  renderStudentPortal(container) {
    const u = this.state.currentUser;
    const allowedExams = this.state.exams.filter(e => this.isStudentAllowedExam(e, u));
    const allowedHomeworks = this.state.homeworks.filter(h => this.isStudentAllowedHomework(h, u));
    const mySubmissions = this.state.submissions.filter(s => s.studentId === u.studentId);
    const rewardStats = this.getStudentRewardStats(u.studentId);
    if (!this.state.studentMainTab) this.state.studentMainTab = 'exams';
    const thMeta = this.getThemeMeta();
    const swatchHex = (this._lastAccentMeta && this._lastAccentMeta.primaryHex) || this.state.accentHex || '#4f46e5';

    container.innerHTML = `
      <div class="min-h-screen bg-slate-50 flex flex-col">
        <!-- Header -->
        <header class="bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 shadow-xs">
          <div class="w-full max-w-[97%] mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2">
            <div class="flex items-center space-x-2.5 sm:space-x-3 cursor-pointer min-w-0" onclick="App.goHome()" title="Về trang chủ">
              <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-200 shrink-0">
                <i class="fa-solid fa-graduation-cap text-sm sm:text-base"></i>
              </div>
              <div class="min-w-0">
                <span class="block text-[10px] sm:text-xs font-bold text-indigo-600 uppercase tracking-wider leading-tight truncate">Cổng Học Sinh</span>
                <h1 class="text-sm sm:text-lg font-extrabold text-slate-800 leading-tight truncate">Toán 6 – 12</h1>
              </div>
            </div>

            <div class="flex items-center gap-1 sm:gap-2 shrink-0">
              <!-- Nút Về Trang Chủ (ẩn trên điện thoại vì bấm vào logo đã về trang chủ) -->
              <button type="button" onclick="App.goHome()" class="hidden md:inline-flex ui-btn bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 shadow-xs" title="Về trang chủ">
                <i class="fa-solid fa-house"></i>
                <span>Trang chủ</span>
              </button>

              <!-- Nút Tải đề thi & tài liệu mới nhất cho điện thoại -->
              <button type="button" id="studentSyncBtn" onclick="App.syncFromCloud({ manual: true })" class="ui-btn-icon sm:w-auto sm:px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200 shadow-xs sm:gap-1.5" title="Tải đề thi & tài liệu mới nhất từ Giáo viên">
                <i class="fa-solid fa-arrows-rotate ${this.state.cloudSyncStatus === 'syncing' ? 'fa-spin' : ''} text-emerald-600"></i>
                <span class="hidden sm:inline">Tải đề mới</span>
              </button>

              <!-- Nút Xem trước & Chọn Bố cục Đề PDF + Ô điền đáp án ngay trên Trang Chủ -->
              <button type="button" id="studentLayoutBtn" onclick="App.showExamLayoutModal()" class="ui-btn-icon md:w-auto md:px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 shadow-xs md:gap-1.5" title="Xem trước & chọn cách hiển thị Đề PDF và Ô điền đáp án (${this.getExamLayoutMeta().shortLabel})">
                <i class="fa-solid ${this.getExamLayoutMeta().icon} text-indigo-600"></i>
                <span class="hidden md:inline">Bố cục: ${this.getExamLayoutMeta().shortLabel}</span>
              </button>

              <!-- Nút Quét QR / Tạo App Điện thoại (trên điện thoại đã có nút lớn ở Banner ngay bên dưới) -->
              <button type="button" id="studentIosAppBtn" onclick="App.showIosAppModal()" class="hidden sm:inline-flex ui-btn-icon md:w-auto md:px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs md:gap-1.5" title="Quét QR & Hướng dẫn tạo App trên điện thoại Android & iOS">
                <i class="fa-solid fa-qrcode"></i>
                <span class="hidden md:inline">App ĐT / QR</span>
              </button>

              <!-- Nút Chuyển Nhanh Sáng/Tối & Bảng Màu -->
              <button type="button" id="studentQuickThemeBtn" onclick="App.cycleTheme()" class="hidden sm:inline-flex ui-btn-icon bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-xs" title="Chuyển nhanh chế độ: Sáng / Dịu mắt / Tối">
                <i class="fa-solid ${thMeta.icon} text-indigo-600"></i>
              </button>
              <button type="button" id="studentThemeBtn" onclick="App.showThemeModal()" class="ui-btn-icon md:w-auto md:px-3 bg-white hover:bg-indigo-50 text-slate-700 text-xs font-bold border border-slate-200 shadow-xs md:gap-1.5" title="Tùy chỉnh Sáng/Tối, Bộ màu & Độ tương phản">
                <span data-appearance-swatch-dot class="w-3.5 h-3.5 rounded-full border border-black/15 shrink-0" style="background:${swatchHex};"></span>
                <span class="hidden md:inline">Giao diện</span>
              </button>

              <!-- Nút Hồ Sơ Cá Nhân / Đổi Mật Khẩu (trên điện thoại đã có nút lớn ngay dưới banner) -->
              <button type="button" onclick="App.showStudentSelfEditModal()" class="hidden sm:inline-flex ui-btn-icon lg:w-auto lg:px-3 bg-white hover:bg-indigo-50 text-indigo-700 text-xs font-bold border border-slate-200 shadow-xs lg:gap-1.5" title="Hồ sơ cá nhân & Đổi mật khẩu">
                <i class="fa-solid fa-user-pen text-indigo-600"></i>
                <span class="hidden lg:inline">Hồ sơ cá nhân</span>
              </button>

              <div class="h-6 w-px bg-slate-200 hidden sm:block"></div>

              <div class="text-right hidden sm:block">
                <div class="text-sm font-bold text-slate-800">${u.fullName}</div>
                <div class="text-xs text-slate-500">Mã HS: <span class="font-mono font-semibold text-indigo-600">${u.studentId}</span> • Khối ${this.getStudentGrade(u)} • Lớp ${u.className || '12'}</div>
              </div>
              <button type="button" onclick="App.logout()" class="ui-btn-icon bg-white hover:bg-red-50 text-slate-500 hover:text-red-600 border border-slate-200 shadow-xs" title="Đăng xuất">
                <i class="fa-solid fa-right-from-bracket"></i>
              </button>
            </div>
          </div>
        </header>

        <!-- Main Body -->
        <main class="w-full max-w-[97%] mx-auto px-3.5 sm:px-6 py-5 sm:py-8 flex-1 space-y-5 sm:space-y-6">
          <!-- Student Banner -->
          <div class="bg-gradient-to-r from-indigo-700 via-indigo-600 to-indigo-800 rounded-2xl p-4 sm:p-6 text-white shadow-xl relative overflow-hidden">
            <div class="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div class="inline-flex items-center space-x-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold mb-2.5">
                  <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Tài khoản đang hoạt động</span>
                </div>
                <h2 class="text-xl sm:text-3xl font-extrabold">Xin chào, ${u.fullName}!</h2>
                <p class="text-indigo-100 text-xs sm:text-sm mt-1">
                  Mã học sinh: <strong class="font-mono tracking-wider">${u.studentId}</strong> • Khối: <strong>Khối ${this.getStudentGrade(u)}</strong> • Lớp: <strong>${u.className || '12'}</strong>
                  ${u.phone ? ` • SĐT: <strong>${u.phone}</strong>` : ''}
                </p>
                <div class="mt-3.5 grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
                  <button type="button" onclick="App.showStudentSelfEditModal()" class="col-span-2 sm:col-span-1 ui-btn bg-white/20 hover:bg-white/30 text-white backdrop-blur-md border border-white/25 shadow-xs">
                    <i class="fa-solid fa-user-pen shrink-0"></i><span>Hồ sơ cá nhân &amp; Đổi mật khẩu</span>
                  </button>
                  <button type="button" id="studentBannerAndroidBtn" onclick="App.showIosAppModal(false, 'android')" class="ui-btn bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold shadow-sm">
                    <i class="fa-brands fa-android text-sm shrink-0"></i><span>Cài App Android</span>
                  </button>
                  <button type="button" id="studentBannerIosBtn" onclick="App.showIosAppModal(false, 'ios')" class="ui-btn bg-white text-indigo-700 hover:bg-indigo-50 font-extrabold shadow-sm">
                    <i class="fa-brands fa-apple text-sm shrink-0"></i><span>Cài App iOS</span>
                  </button>
                </div>
              </div>
              <div class="grid grid-cols-3 sm:flex gap-2 sm:gap-3">
                <div class="bg-white/10 backdrop-blur-md rounded-xl p-2.5 sm:p-3 text-center sm:min-w-[92px]">
                  <div class="text-[11px] sm:text-xs text-indigo-200 truncate">Đề mở</div>
                  <div class="text-xl sm:text-2xl font-bold font-mono">${allowedExams.length}</div>
                </div>
                <div class="bg-white/10 backdrop-blur-md rounded-xl p-2.5 sm:p-3 text-center sm:min-w-[92px]">
                  <div class="text-[11px] sm:text-xs text-indigo-200 truncate">Đã nộp</div>
                  <div class="text-xl sm:text-2xl font-bold font-mono">${mySubmissions.length}</div>
                </div>
                <button type="button" onclick="App.setStudentMainTab('rewards')" class="bg-amber-400/20 hover:bg-amber-400/30 border border-amber-300/40 backdrop-blur-md rounded-xl p-2.5 sm:p-3 text-center sm:min-w-[100px] transition cursor-pointer" title="Xem điểm tích lũy & đổi phần thưởng">
                  <div class="text-[11px] sm:text-xs text-amber-200 font-semibold truncate">Điểm thưởng</div>
                  <div class="text-xl sm:text-2xl font-extrabold font-mono text-amber-300 inline-flex items-center justify-center gap-1">
                    <span>${rewardStats.availablePoints}</span>
                    <i class="fa-solid fa-star text-sm text-amber-300"></i>
                  </div>
                </button>
              </div>
            </div>
          </div>

          <!-- Thanh Điều Hướng Cổng Học Sinh -->
          <div class="bg-white rounded-2xl p-2 sm:p-2.5 border border-slate-200 shadow-sm">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <nav class="grid grid-cols-2 sm:flex sm:flex-wrap items-stretch sm:items-center gap-1.5 sm:gap-2 w-full">
                <button
                  type="button"
                  id="studentTabExamsBtn"
                  onclick="App.setStudentMainTab('exams')"
                  class="ui-btn h-10 px-2 sm:px-3.5 min-w-0 ${this.state.studentMainTab === 'exams' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 ring-2 ring-indigo-500/25' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}"
                >
                  <i class="fa-solid fa-file-pen shrink-0"></i>
                  <span class="sm:hidden">Đề Thi</span>
                  <span class="hidden sm:inline">Đề Thi &amp; Kiểm Tra</span>
                  <span class="px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] font-mono shrink-0 ${this.state.studentMainTab === 'exams' ? 'bg-indigo-700 text-white' : 'bg-white text-slate-700 shadow-2xs'}">
                    ${allowedExams.length}<span class="hidden sm:inline"> đề</span>
                  </span>
                </button>

                <button
                  type="button"
                  id="studentTabHomeworksBtn"
                  onclick="App.setStudentMainTab('homeworks')"
                  class="ui-btn h-10 px-2 sm:px-3.5 min-w-0 ${this.state.studentMainTab === 'homeworks' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 ring-2 ring-indigo-500/25' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}"
                >
                  <i class="fa-solid fa-book-open shrink-0"></i>
                  <span class="sm:hidden">Tài Liệu</span>
                  <span class="hidden sm:inline">Tài Liệu &amp; Chuyên Đề</span>
                  <span class="px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] font-mono shrink-0 ${this.state.studentMainTab === 'homeworks' ? 'bg-indigo-700 text-white' : 'bg-white text-slate-700 shadow-2xs'}">
                    ${allowedHomeworks.length}
                  </span>
                </button>

                <button
                  type="button"
                  id="studentTabGradesBtn"
                  onclick="App.setStudentMainTab('grades')"
                  class="ui-btn h-10 px-2 sm:px-3.5 min-w-0 ${this.state.studentMainTab === 'grades' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 ring-2 ring-indigo-500/25' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}"
                >
                  <i class="fa-solid fa-chart-simple shrink-0"></i>
                  <span class="sm:hidden">Kết Quả</span>
                  <span class="hidden sm:inline">Kết Quả &amp; Xếp Hạng</span>
                  <span class="px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] font-mono shrink-0 ${this.state.studentMainTab === 'grades' ? 'bg-indigo-700 text-white' : 'bg-white text-slate-700 shadow-2xs'}">
                    ${mySubmissions.length}<span class="hidden sm:inline"> lượt</span>
                  </span>
                </button>

                <button
                  type="button"
                  id="studentTabRewardsBtn"
                  onclick="App.setStudentMainTab('rewards')"
                  class="ui-btn h-10 px-2 sm:px-3.5 min-w-0 ${this.state.studentMainTab === 'rewards' ? 'bg-amber-500 text-white shadow-md shadow-amber-200 ring-2 ring-amber-400/30' : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'}"
                >
                  <i class="fa-solid fa-gift shrink-0"></i>
                  <span class="sm:hidden">Đổi Thưởng</span>
                  <span class="hidden sm:inline">Tích Điểm &amp; Đổi Thưởng</span>
                  <span class="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] font-mono font-extrabold shrink-0 ${this.state.studentMainTab === 'rewards' ? 'bg-amber-700 text-white' : 'bg-white text-amber-800 shadow-2xs'}">
                    <span>${rewardStats.availablePoints}</span>
                    <i class="fa-solid fa-star text-[9px]"></i>
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
                  ${this.state.studentMainTab === 'rewards' ? 'Tích lũy điểm sao qua từng đề thi đạt kết quả tốt và đổi các phần thưởng khuyến khích từ Giáo viên.' : ''}
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
                <button type="button" onclick="App.syncFromCloud({ manual: true })" class="ui-btn bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs shrink-0 self-start sm:self-auto">
                  <i class="fa-solid fa-arrows-rotate ${this.state.cloudSyncStatus === 'syncing' ? 'fa-spin' : ''}"></i>
                  <span>Tải đề mới nhất</span>
                </button>
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
            <!-- 3. Kết Quả & So Sánh Lớp / Khối -->
            <section class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div class="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-gradient-to-r from-slate-50 via-white to-indigo-50/30">
                <div>
                  <h3 class="text-lg font-bold text-slate-900 flex items-center">
                    <i class="fa-solid fa-chart-simple text-indigo-600 mr-2"></i>
                    Kết Quả Làm Bài &amp; So Sánh Lớp / Khối
                  </h3>
                  <p class="text-xs text-slate-500 mt-0.5">Theo dõi điểm số cá nhân và đối chiếu kết quả trong phạm vi lớp hoặc khối của bạn khi Giáo viên mở quyền</p>
                </div>

                ${(this.state.settings && this.state.settings.allowStudentViewOwnScore) ? `
                  <div class="bg-slate-100 p-1 rounded-xl border border-slate-200 grid grid-cols-2 sm:flex text-xs font-semibold w-full sm:w-auto">
                    <button id="studentTabMineBtn" onclick="App.setStudentScoreTab('mine')" class="px-2.5 sm:px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center justify-center gap-1 min-w-0 ${this.state.studentScoreTab === 'mine' ? 'bg-white shadow-xs text-indigo-600 font-bold' : 'text-slate-600 hover:text-slate-900'}">
                      <i class="fa-solid fa-user shrink-0"></i><span class="truncate">Kết Quả Cá Nhân</span>
                    </button>
                    <button id="studentTabClassBoardBtn" onclick="App.setStudentScoreTab('classBoard')" class="px-2.5 sm:px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center justify-center gap-1 min-w-0 ${this.state.studentScoreTab === 'classBoard' ? 'bg-white shadow-xs text-indigo-600 font-bold' : 'text-slate-600 hover:text-slate-900'}">
                      <i class="fa-solid fa-ranking-star shrink-0"></i>
                      <span class="truncate">So Sánh Lớp / Khối</span>
                      ${!this.isStudentCompareAllowed() ? '<i class="fa-solid fa-lock text-[10px] text-slate-400 shrink-0" title="Đang khóa bởi Giáo viên"></i>' : ''}
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
              ` : (this.state.studentScoreTab === 'classBoard') ? `
                ${!this.isStudentCompareAllowed() ? `
                  <!-- Bảng so sánh đang khóa bởi Giáo viên -->
                  <div id="studentPeerCompareLockedBox" class="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center text-slate-800 space-y-3">
                    <div class="w-12 h-12 mx-auto rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xl font-bold shadow-xs">
                      <i class="fa-solid fa-lock"></i>
                    </div>
                    <h4 class="text-base font-bold text-slate-900">Bảng So Sánh Lớp / Khối Đang Khóa</h4>
                    <p class="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                      Học sinh chỉ có quyền xem bảng đối chiếu kết quả với <strong>Lớp của mình</strong> hoặc <strong>Toàn khối của mình</strong> khi Giáo viên mở quyền hiển thị.
                    </p>
                    <div class="pt-1">
                      <button type="button" onclick="App.setStudentScoreTab('mine')" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer inline-flex items-center gap-1.5">
                        <i class="fa-solid fa-arrow-left"></i><span>Quay lại Kết Quả Cá Nhân</span>
                      </button>
                    </div>
                  </div>
                ` : (() => {
                  const cmp = this.getStudentPeerComparison(u);
                  const scopeLabel = cmp.scope === 'class'
                    ? `Lớp ${cmp.myClass || ('K' + cmp.myGrade)}`
                    : `Toàn Khối ${cmp.myGrade}`;
                  return `
                    <!-- TAB 2: BẢNG SO SÁNH LỚP CỦA BẠN HOẶC TOÀN KHỐI CỦA BẠN -->
                    <div class="space-y-4" id="studentPeerCompareSection">
                      <!-- Thanh chọn phạm vi (Lớp mình / Toàn khối) & lọc đề thi -->
                      <div id="studentPeerCompareToolbar" class="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div class="flex flex-wrap items-center gap-2">
                          <span class="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                            <i class="fa-solid fa-users-viewfinder text-indigo-600"></i>
                            <span>Phạm vi so sánh:</span>
                          </span>
                          ${cmp.allowedScopes.length > 1 ? `
                            <div class="bg-white p-1 rounded-xl border border-slate-200 grid grid-cols-2 sm:inline-flex text-xs font-semibold shadow-2xs w-full sm:w-auto">
                              <button type="button" id="studentCompareScopeBtn_class" onclick="App.setStudentCompareMode('class')" class="px-2.5 sm:px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 min-w-0 ${cmp.scope === 'class' ? 'bg-indigo-600 text-white font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'}">
                                <i class="fa-solid fa-chalkboard-user shrink-0"></i>
                                <span class="truncate">Lớp (${cmp.myClass || ('K' + cmp.myGrade)})</span>
                              </button>
                              <button type="button" id="studentCompareScopeBtn_grade" onclick="App.setStudentCompareMode('grade')" class="px-2.5 sm:px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 min-w-0 ${cmp.scope === 'grade' ? 'bg-indigo-600 text-white font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'}">
                                <i class="fa-solid fa-layer-group shrink-0"></i>
                                <span class="truncate">Toàn Khối ${cmp.myGrade}</span>
                              </button>
                            </div>
                          ` : `
                            <span class="px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-bold inline-flex items-center gap-1.5">
                              <i class="fa-solid ${cmp.scope === 'class' ? 'fa-chalkboard-user' : 'fa-layer-group'}"></i>
                              <span>${cmp.scope === 'class' ? `Chỉ trong Lớp của bạn (${cmp.myClass || ('K' + cmp.myGrade)})` : `Chỉ trong Toàn Khối ${cmp.myGrade}`}</span>
                            </span>
                          `}
                        </div>

                        <div class="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 w-full md:w-auto">
                          <span class="text-xs font-semibold text-slate-500 shrink-0">Đề đối chiếu:</span>
                          <select id="studentCompareExamSelect" onchange="App.setStudentCompareExamFilter(this.value)" class="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 w-full sm:w-auto sm:min-w-[200px] min-w-0">
                            <option value="ALL" ${cmp.examFilter === 'ALL' ? 'selected' : ''}>Tổng hợp các đề (${cmp.allCohortExams.length} đề)</option>
                            ${cmp.allCohortExams.map((ex, idx) => `
                              <option value="${ex.id}" ${cmp.examFilter === ex.id ? 'selected' : ''}>${ex.roundLabel || ('Đợt ' + (idx + 1))} — ${ex.title}</option>
                            `).join('')}
                          </select>
                        </div>
                      </div>

                      <!-- 3 thẻ tóm tắt vị trí của học sinh trong Lớp / Khối -->
                      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div class="p-4 rounded-xl border border-indigo-200 bg-indigo-50/50 flex items-center justify-between">
                          <div>
                            <div class="text-[11px] font-bold uppercase tracking-wider text-indigo-700">Thứ hạng tại ${scopeLabel}</div>
                            <div class="text-xl font-extrabold text-indigo-950 font-mono mt-0.5">
                              ${cmp.myRank ? `#${cmp.myRank} <span class="text-xs font-semibold text-slate-500">/ ${cmp.rankedList.length} HS</span>` : `<span class="text-sm font-bold text-slate-500">Chưa có bài nộp</span>`}
                            </div>
                          </div>
                          <div class="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center text-base">
                            <i class="fa-solid fa-trophy"></i>
                          </div>
                        </div>

                        <div class="p-4 rounded-xl border border-slate-200 bg-white flex items-center justify-between">
                          <div>
                            <div class="text-[11px] font-bold uppercase tracking-wider text-slate-500">${cmp.examFilter === 'ALL' ? 'Điểm TB của bạn' : 'Điểm đề này của bạn'}</div>
                            <div class="text-xl font-extrabold text-slate-900 font-mono mt-0.5">
                              ${cmp.myEntry && cmp.myEntry.avg >= 0 ? `${cmp.myEntry.avg.toFixed(2)}đ` : '--'}
                            </div>
                          </div>
                          <div class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-base">
                            <i class="fa-solid fa-user-check"></i>
                          </div>
                        </div>

                        <div class="p-4 rounded-xl border border-slate-200 bg-white flex items-center justify-between">
                          <div>
                            <div class="text-[11px] font-bold uppercase tracking-wider text-slate-500">Mặt bằng ${scopeLabel}</div>
                            <div class="text-xl font-extrabold text-slate-900 font-mono mt-0.5">
                              ${cmp.cohortAvg !== null ? `${cmp.cohortAvg.toFixed(2)}đ` : '--'}
                              <span class="text-[11px] font-normal text-slate-500 ml-1">(${cmp.activeParticipants}/${cmp.rankedList.length} HS đã thi)</span>
                            </div>
                          </div>
                          <div class="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-base">
                            <i class="fa-solid fa-chart-line"></i>
                          </div>
                        </div>
                      </div>

                      ${this.state.settings.anonymizeOtherStudents ? `
                        <div class="p-3.5 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-900 flex items-center space-x-2.5">
                          <div class="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 font-bold">
                            <i class="fa-solid fa-user-secret"></i>
                          </div>
                          <div class="text-[11px] leading-relaxed">
                            <strong>Chế độ so sánh ẩn danh đang BẬT:</strong> Họ tên và mã số của các bạn khác trong <strong>${scopeLabel}</strong> đã được ẩn để bảo vệ quyền riêng tư. Bạn chỉ xem được điểm số và thứ hạng đối chiếu trong phạm vi ${scopeLabel}.
                          </div>
                        </div>
                      ` : ''}

                      <div class="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                        <div class="overflow-x-auto">
                          <table id="studentPeerCompareTable" class="min-w-full divide-y divide-slate-200 text-left text-sm">
                            <thead class="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                              <tr>
                                <th class="px-4 py-3.5 text-center font-bold w-14">Hạng</th>
                                <th class="px-4 py-3.5 font-bold font-mono">Mã HS</th>
                                <th class="px-5 py-3.5 font-bold">Học Sinh</th>
                                <th class="px-4 py-3.5 text-center font-bold">Khối / Lớp</th>
                                ${cmp.targetExams.map((ex, idx) => `
                                  <th class="px-4 py-3.5 text-center font-bold min-w-[100px]" title="${ex.title}">
                                    <div class="text-indigo-900 font-extrabold">${ex.roundLabel || ('Đợt ' + (idx + 1))}</div>
                                  </th>
                                `).join('')}
                                <th class="px-4 py-3.5 text-center font-bold bg-indigo-50/50 text-indigo-900">${cmp.examFilter === 'ALL' ? 'Điểm TB' : 'Điểm Đề'}</th>
                                <th class="px-4 py-3.5 text-center font-bold">Xếp Loại</th>
                              </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100">
                              ${cmp.rankedList.map((item, rIdx) => {
                                const isMe = item.student.studentId === u.studentId;
                                const isAnon = this.state.settings.anonymizeOtherStudents && !isMe;
                                const displayName = isMe ? `${u.fullName} (Bạn)` : (isAnon ? `Học sinh ẩn danh #${rIdx + 1}` : item.student.fullName);
                                const displayId = isMe ? u.studentId : (isAnon ? 'HS******' : item.student.studentId);
                                const avgStr = item.avg >= 0 ? item.avg.toFixed(2) : '--';

                                let rankMedal = '<span class="text-xs text-slate-400">--</span>';
                                if (item.rank === 1) rankMedal = '<span class="text-base" title="Hạng 1"><i class="fa-solid fa-medal text-amber-500"></i></span>';
                                else if (item.rank === 2) rankMedal = '<span class="text-base" title="Hạng 2"><i class="fa-solid fa-medal text-slate-400"></i></span>';
                                else if (item.rank === 3) rankMedal = '<span class="text-base" title="Hạng 3"><i class="fa-solid fa-medal text-amber-700"></i></span>';
                                else if (item.rank) rankMedal = `<span class="text-xs font-bold text-slate-500">#${item.rank}</span>`;

                                let rankBadge = '<span class="text-xs text-slate-400">--</span>';
                                if (item.avg >= 9.0) rankBadge = '<span class="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">Xuất sắc</span>';
                                else if (item.avg >= 8.0) rankBadge = '<span class="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800">Giỏi</span>';
                                else if (item.avg >= 6.5) rankBadge = '<span class="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">Khá</span>';
                                else if (item.avg >= 5.0) rankBadge = '<span class="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">Trung bình</span>';
                                else if (item.avg >= 0) rankBadge = '<span class="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">Yếu</span>';

                                return `
                                  <tr data-peer-student="${isAnon ? 'ANON' : item.student.studentId}" class="${isMe ? 'bg-indigo-50/70 border-y-2 border-indigo-400 font-bold' : 'hover:bg-slate-50/80'} transition">
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
                              }).join('')}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  `;
                })()}
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
                            <th class="px-4 py-3.5 font-semibold text-center">Phần I</th>
                            <th class="px-4 py-3.5 font-semibold text-center">Phần II</th>
                            <th class="px-4 py-3.5 font-semibold text-center">Phần III</th>
                            <th class="px-4 py-3.5 font-semibold text-center">Phần IV</th>
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
                                ${(sub.tabSwitches || 0) > 0 || (sub.screenshotCount || 0) > 0 ? `
                                  <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-700 border border-red-200" title="Đã ghi nhận rời màn hình hoặc chụp màn hình">
                                    <i class="fa-solid ${(sub.screenshotCount || 0) > 0 ? 'fa-camera' : 'fa-triangle-exclamation'} mr-1"></i>${sub.tabSwitches || sub.screenshotCount} lần${(sub.screenshotCount || 0) > 0 ? ` (${sub.screenshotCount} chụp)` : ''}
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
                              <td class="px-4 py-4 text-center font-mono text-xs font-semibold">
                                ${sub.scoreResult.part4 && sub.scoreResult.part4.totalQuestions > 0
                                  ? (sub.scoreResult.part4.pendingManual
                                    ? '<span class="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-sans font-bold">Chờ chấm</span>'
                                    : `${sub.scoreResult.part4.score}đ`)
                                  : '<span class="text-slate-300">—</span>'}
                              </td>
                              <td class="px-4 py-4 text-center">
                                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${sub.scoreResult.totalScore >= 8.0 ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}">
                                  ${sub.scoreResult.totalScore} / ${Number(sub.scoreResult.maxTotal || 10).toFixed(1)}
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

            ${this.state.studentMainTab === 'rewards' ? this.renderStudentRewardsSectionHtml(u, rewardStats) : ''}
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
    this.resetExamMonitorState();
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
      if (this.state.cloudSyncStatus === 'syncing' && !this.state.cloudLastSyncedAt) {
        return `
          <div class="bg-slate-50 rounded-2xl p-8 text-center border border-dashed border-slate-200 text-slate-600 text-xs space-y-2.5">
            <div class="w-11 h-11 mx-auto rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center">
              <i class="fa-solid fa-arrows-rotate fa-spin text-lg"></i>
            </div>
            <p class="font-bold text-slate-800">Đang tự động tải danh sách đề thi từ máy chủ...</p>
          </div>
        `;
      }
      const allExams = Array.isArray(this.state.exams) ? this.state.exams : [];
      const activeAll = allExams.filter(e => e && e.is_active);
      const stGrade = u ? this.getStudentGrade(u) : 12;
      let emptyTitle = 'Hiện tại chưa có đề thi nào đang mở trên hệ thống.';
      let emptyHint = 'Khi Giáo viên tải đề thi lên, đề sẽ tự động xuất hiện ngay tại đây.';
      if (activeAll.length > 0) {
        const openGrades = [...new Set(activeAll.map(e => 'Khối ' + (e.grade || 12)))].join(', ');
        emptyTitle = `Hệ thống hiện có ${activeAll.length} đề thi đang mở (${openGrades}), nhưng chưa mở quyền cho tài khoản ${u?.studentId || ''} (Khối ${stGrade} • Lớp ${u?.className || '12'}).`;
        emptyHint = 'Nhờ Giáo viên kiểm tra mục Phân quyền đề thi (chọn Tất cả học sinh hoặc đúng Khối lớp của bạn).';
      } else if (allExams.length > 0) {
        emptyTitle = `Hệ thống hiện có ${allExams.length} đề thi nhưng Giáo viên đang tạm đóng, chưa mở giờ làm bài.`;
        emptyHint = 'Bấm nút bên dưới để kiểm tra xem Giáo viên đã mở đề thi hay chưa.';
      }
      return `
        <div class="bg-slate-50 rounded-2xl p-7 sm:p-8 text-center border border-dashed border-slate-200 text-slate-600 text-xs space-y-2.5">
          <div class="w-11 h-11 mx-auto rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center">
            <i class="fa-solid ${activeAll.length > 0 ? 'fa-user-lock' : 'fa-cloud-arrow-down'} text-lg"></i>
          </div>
          <p class="font-bold text-slate-800 max-w-xl mx-auto leading-relaxed">${emptyTitle}</p>
          <p class="text-[11px] text-slate-500 max-w-lg mx-auto leading-relaxed">${emptyHint}</p>
          <div class="pt-1">
            <button type="button" id="studentEmptySyncBtn" onclick="App.syncFromCloud({ manual: true })" class="ui-btn bg-indigo-600 hover:bg-indigo-700 text-white px-4 shadow-sm">
              <i class="fa-solid fa-arrows-rotate ${this.state.cloudSyncStatus === 'syncing' ? 'fa-spin' : ''}"></i>
              <span>Tải Đề Thi Mới</span>
            </button>
          </div>
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
                <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
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
                  <div class="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    ${attemptsCount > 0 ? `<span class="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[11px]"><i class="fa-solid fa-rotate-right mr-1"></i>Đã thi ${attemptsCount} lần</span>` : ''}
                    <span class="inline-flex items-center font-semibold whitespace-nowrap"><i class="fa-regular fa-clock mr-1 text-slate-400"></i>${ex.time_minutes || 90} phút</span>
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

              <div class="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                ${attemptsCount > 0 ? `
                  <div class="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full sm:w-auto">
                    <button type="button" onclick="App.viewSubmissionDetail('${latestSub.id}')" class="ui-btn bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100">
                      <i class="fa-solid fa-eye shrink-0"></i><span>Xem lại (${latestSub.scoreResult.totalScore}đ)</span>
                    </button>
                    <button type="button" onclick="App.confirmRetakeExam('${ex.id}')" class="ui-btn text-white bg-amber-600 hover:bg-amber-700 shadow-xs">
                      <i class="fa-solid fa-rotate-right shrink-0"></i><span>Thi Lại (Lần ${attemptsCount + 1})</span>
                    </button>
                    <button type="button" onclick="App.showExamLayoutModal('${ex.id}')" class="col-span-2 sm:col-span-1 ui-btn bg-slate-50 hover:bg-indigo-50 text-indigo-700 border border-slate-200" title="Xem trước & chọn cách hiển thị Đề PDF và Ô điền đáp án">
                      <i class="fa-solid fa-table-columns shrink-0"></i><span>Bố cục thi</span>
                    </button>
                  </div>
                  <span class="text-[11px] text-slate-400 text-center sm:text-right">Gần nhất: ${new Date(latestSub.submittedAt).toLocaleDateString('vi-VN')}</span>
                ` : `
                  <div class="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
                    <button type="button" onclick="App.startExam('${ex.id}')" class="ui-btn px-3 sm:px-4 text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs">
                      <i class="fa-solid fa-play text-[10px] shrink-0"></i>
                      <span>Vào Làm Bài</span>
                    </button>
                    <button type="button" onclick="App.showExamLayoutModal('${ex.id}')" class="ui-btn bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-3" title="Xem trước & chọn bố cục Đề PDF và Ô đáp án trước khi thi">
                      <i class="fa-solid fa-table-columns shrink-0"></i>
                      <span class="sm:hidden">Bố cục thi</span>
                      <span class="hidden sm:inline">Xem trước bố cục</span>
                    </button>
                  </div>
                  <span class="text-[11px] text-slate-400 text-center sm:text-right">Chưa làm bài</span>
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

              <div class="mt-3 grid grid-cols-2 sm:flex items-center gap-2">
                <button type="button" onclick="App.openPdfModal('${hw.title}', '${hw.pdfUrl}', '${hw.id}')" class="ui-btn bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100">
                  <i class="fa-solid fa-eye"></i><span>Xem trực tiếp</span>
                </button>
                <button type="button" onclick="App.downloadHomeworkPdf('${hw.id}')" class="ui-btn bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/80">
                  <i class="fa-solid fa-download"></i><span>Tải về</span>
                </button>
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

    if (!Array.isArray(exam.part4)) exam.part4 = [];
    this.state.activeExam = exam;
    this.state.answers = { 
      part1: {}, 
      part2: {}, 
      part3: {},
      part4: {},
      flagged: {}
    };

    // Khởi tạo ô ký tự cho mỗi câu Phần III & khung bài làm Phần IV (Tự luận)
    const p3Boxes = this.getPart3BoxCount(exam);
    exam.part3.forEach(q => {
      this.state.answers.part3[q.id] = Array(p3Boxes).fill('');
    });
    exam.part4.forEach(q => {
      this.state.answers.part4[q.id] = { text: '', images: [] };
    });

    this.state.examStartTime = new Date();
    this.state.secondsLeft = (exam.time_minutes || 90) * 60;
    this.state.tabSwitchesCount = 0;
    this.state.screenshotCount = 0;
    this.state.violationLogs = [];
    this.resetExamMonitorState();
    this.state.activeSectionTab = exam.part1.length ? 'p1' : (exam.part2.length ? 'p2' : (exam.part3.length ? 'p3' : 'p4'));
    this.state.mobileExamPane = 'both';
    this.state.examPdfCollapsed = (this.getNormalizedExamLayoutMode() === 'fast-entry');
    this.state.examSheetCollapsed = false;
    this.state.paletteFilter = 'all';
    this.state.activePart3Target = { qId: 1, boxIdx: 0 };

    // Giải mã file PDF từ IndexedDB hoặc tự động tải từ Đám mây (GitHub / Google Drive) cho điện thoại
    this.state.resolvedPdfUrl = await this.resolvePdfSourceUrl(exam.pdf_url, exam.id);

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

  getSectionTabBtnClass(isActive, spanTwo = false) {
    return `${spanTwo ? 'col-span-2 sm:col-span-1 ' : ''}sm:flex-1 h-9 px-1 sm:px-1.5 rounded-lg text-center transition cursor-pointer whitespace-nowrap min-w-0 truncate ${isActive ? 'bg-indigo-600 text-white shadow font-bold' : 'text-slate-600 hover:bg-slate-50 font-semibold'}`;
  },

  getMobilePaneBtnClass(isActive) {
    return `min-w-0 h-11 sm:h-9 px-1 sm:px-2 rounded-xl text-[10px] sm:text-[11px] leading-tight font-bold transition flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 cursor-pointer whitespace-nowrap ${isActive ? 'bg-indigo-600 text-white shadow' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`;
  },

  setSectionTab(tab) {
    this.state.activeSectionTab = tab;
    if (this.state.examSheetCollapsed) {
      this.state.examSheetCollapsed = false;
      this.applyExamLayoutDom();
    }
    const hasP4 = Boolean(this.state.activeExam && Array.isArray(this.state.activeExam.part4) && this.state.activeExam.part4.length > 0);
    // Cập nhật tab active mà KHÔNG tải lại PDF
    ['all', 'p1', 'p2', 'p3', 'p4'].forEach(t => {
      const btn = document.getElementById(`sectionTabBtn_${t}`);
      if (btn) {
        btn.className = this.getSectionTabBtnClass(t === tab, hasP4 && t === 'all');
      }
    });
    const pane = document.getElementById('splitAnswerInputsContainer');
    if (pane && this.state.activeExam) {
      pane.innerHTML = this.renderAnswerSheetInputs(this.state.activeExam);
    }
  },

  setPaletteFilter(filter) {
    this.state.paletteFilter = filter;
    const body = document.getElementById('examProgressDrawerBody');
    if (body && this.state.activeExam) {
      body.innerHTML = this.renderPaletteMatrix(this.state.activeExam);
    }
  },

  formatShortAnsDisplay(val) {
    return String(val ?? '').replace(/\./g, ',');
  },

  getFlagButtonClasses(isFlagged) {
    return `flag-star-btn w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 cursor-pointer transition ${isFlagged ? 'is-flagged text-amber-500 bg-amber-50 border-amber-300 shadow-2xs' : 'text-slate-400 bg-white border-slate-200'}`;
  },

  toggleFlag(qType, qId) {
    if (!this.state.answers.flagged) this.state.answers.flagged = {};
    const key = `${qType}_${qId}`;
    if (this.state.answers.flagged[key]) {
      delete this.state.answers.flagged[key];
    } else {
      this.state.answers.flagged[key] = true;
    }
    this.refreshQuestionProgressDom(qType, qId);
    this.updateProgressUi();
  },

  scrollToQuestion(part, qId) {
    const drawer = document.getElementById('mobileDrawer');
    if (drawer && !drawer.classList.contains('hidden')) {
      this.toggleMobileDrawer();
    }
    if (this.state.mobileExamPane === 'pdf') {
      this.setMobileExamPane('sheet');
    }
    if (this.state.examSheetCollapsed) {
      this.state.examSheetCollapsed = false;
      this.applyExamLayoutDom();
    }
    if (this.state.activeSectionTab !== 'all') {
      this.setSectionTab(part);
    }
    setTimeout(() => {
      const el = document.getElementById(`row_${part}_${qId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-2', 'ring-indigo-500');
        setTimeout(() => el.classList.remove('ring-2', 'ring-indigo-500'), 1400);
      }
    }, 60);
  },

  getPart3BoxCount(ex) {
    const list = Array.isArray(ex && ex.part3) ? ex.part3 : [];
    const maxLen = list.reduce((m, q) => Math.max(m, String((q && q.correct_answer) || '').trim().length), 4);
    return Math.min(6, Math.max(4, maxLen));
  },

  getQuestionProgressState(part, qId) {
    const flaggedMap = (this.state.answers && this.state.answers.flagged) || {};
    const isFlagged = Boolean(flaggedMap[`${part}_${qId}`]);

    if (part === 'p1') {
      const val = (this.state.answers && this.state.answers.part1 && this.state.answers.part1[qId]) || '';
      return {
        status: val ? 'answered' : 'unanswered',
        label: val ? `Đã chọn ${val}` : 'Chưa chọn',
        shortVal: val || '—',
        isFlagged
      };
    }

    if (part === 'p2') {
      const ans = (this.state.answers && this.state.answers.part2 && this.state.answers.part2[qId]) || {};
      const subs = ['a', 'b', 'c', 'd'];
      const picked = subs.filter(k => ans[k] === true || ans[k] === false);
      const detail = subs.map(k => ans[k] === true ? `${k}:Đ` : (ans[k] === false ? `${k}:S` : `${k}:-`)).join(' ');
      if (picked.length === 4) {
        return { status: 'answered', label: 'Đủ 4/4 ý', shortVal: '4/4 ý', detail, isFlagged };
      }
      if (picked.length > 0) {
        return { status: 'partial', label: `Đã chọn ${picked.length}/4 ý`, shortVal: `${picked.length}/4 ý`, detail, isFlagged };
      }
      return { status: 'unanswered', label: 'Chưa chọn', shortVal: '0/4 ý', detail, isFlagged };
    }

    if (part === 'p3') {
      const arr = (this.state.answers && this.state.answers.part3 && this.state.answers.part3[qId]) || [];
      const raw = this.formatShortAnsDisplay(Array.isArray(arr) ? arr.join('') : String(arr || '')).trim();
      return {
        status: raw.length > 0 ? 'answered' : 'unanswered',
        label: raw.length > 0 ? `Đã điền: ${raw}` : 'Chưa điền',
        shortVal: raw || 'Trống',
        isFlagged
      };
    }

    const entry = (this.state.answers && this.state.answers.part4 && this.state.answers.part4[qId]) || {};
    const hasTxt = String(entry.text || '').trim().length > 0;
    const imgCount = Array.isArray(entry.images) ? entry.images.length : 0;
    const isAns = hasTxt || imgCount > 0;
    return {
      status: isAns ? 'answered' : 'unanswered',
      label: isAns ? (imgCount > 0 ? `Đã làm (${imgCount} ảnh)` : 'Đã nhập bài') : 'Chưa làm',
      shortVal: isAns ? 'Đã làm' : 'Trống',
      isFlagged
    };
  },

  calculateProgress() {
    const ex = this.state.activeExam;
    if (!ex) {
      return {
        answered: 0,
        partial: 0,
        unanswered: 22,
        flagged: 0,
        total: 22,
        percentage: 0,
        parts: {
          p1: { answered: 0, total: 12 },
          p2: { answered: 0, partial: 0, total: 4 },
          p3: { answered: 0, total: 6 },
          p4: { answered: 0, total: 0 }
        }
      };
    }

    let p1 = 0, p2 = 0, p2Partial = 0, p3 = 0, p4 = 0, flagged = 0;

    ex.part1.forEach(q => {
      const st = this.getQuestionProgressState('p1', q.id);
      if (st.status === 'answered') p1++;
      if (st.isFlagged) flagged++;
    });

    ex.part2.forEach(q => {
      const st = this.getQuestionProgressState('p2', q.id);
      if (st.status === 'answered') p2++;
      else if (st.status === 'partial') p2Partial++;
      if (st.isFlagged) flagged++;
    });

    ex.part3.forEach(q => {
      const st = this.getQuestionProgressState('p3', q.id);
      if (st.status === 'answered') p3++;
      if (st.isFlagged) flagged++;
    });

    const p4List = Array.isArray(ex.part4) ? ex.part4 : [];
    p4List.forEach(q => {
      const st = this.getQuestionProgressState('p4', q.id);
      if (st.status === 'answered') p4++;
      if (st.isFlagged) flagged++;
    });

    const answered = p1 + p2 + p3 + p4;
    const partial = p2Partial;
    const total = ex.part1.length + ex.part2.length + ex.part3.length + p4List.length;
    const unanswered = Math.max(0, total - answered - partial);
    const percentage = total > 0 ? Math.round((answered / total) * 100) : 0;

    return {
      answered,
      partial,
      unanswered,
      flagged,
      total,
      percentage,
      parts: {
        p1: { answered: p1, total: ex.part1.length },
        p2: { answered: p2, partial: p2Partial, total: ex.part2.length },
        p3: { answered: p3, total: ex.part3.length },
        p4: { answered: p4, total: p4List.length }
      }
    };
  },

  renderExamRoom(container) {
    const ex = this.state.activeExam;
    const u = this.state.currentUser;
    const progress = this.calculateProgress();
    const pdfSrc = this.state.resolvedPdfUrl || ex.pdf_url || '';
    const guardOn = this.isAnyExamGuardEnabled();
    const vCount = this.state.tabSwitchesCount || 0;
    const shotCount = this.state.screenshotCount || 0;
    const paneCls = this.getExamPaneClasses(this.state.mobileExamPane);
    const pdfCollapsed = Boolean(this.state.examPdfCollapsed);
    const layoutMeta = this.getExamLayoutMeta();

    container.innerHTML = `
      <div class="fixed inset-0 flex flex-col bg-slate-100 overflow-hidden select-none z-10">
        ${this.renderExamWatermarkHtml(u)}
        <!-- Top Sticky Header -->
        <header class="bg-white/95 backdrop-blur-md border-b border-slate-200 px-2.5 sm:px-6 py-2 flex items-center justify-between gap-2 shrink-0 z-30 shadow-xs sticky top-0">
          <div class="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
            <!-- Nút Về Trang Chủ -->
            <button type="button" onclick="App.confirmExitExam()" class="ui-btn-icon sm:w-auto sm:px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-indigo-600 border border-slate-200 text-xs font-bold shadow-xs sm:gap-1.5" title="Quay về trang chủ">
              <i class="fa-solid fa-house text-indigo-600"></i>
              <span class="hidden sm:inline">Trang chủ</span>
            </button>

            <div class="h-5 w-px bg-slate-200 hidden sm:block shrink-0"></div>

            <span class="hidden sm:flex w-9 h-9 rounded-xl bg-indigo-600 text-white items-center justify-center font-bold text-sm shadow-sm shrink-0">
              <i class="fa-solid fa-pen-ruler text-xs"></i>
            </span>
            <div class="min-w-0 flex-1">
              <h2 class="text-xs sm:text-sm font-bold text-slate-800 truncate">${ex.title}</h2>
              <div class="text-[11px] text-slate-500 flex items-center gap-x-1.5 overflow-hidden mt-0.5">
                <span class="hidden sm:inline truncate">Học sinh: <strong>${u.fullName}</strong> (${u.studentId})</span>
                <span id="examHeaderMobStuCode" class="${guardOn && vCount > 0 ? 'hidden' : ''} sm:hidden font-mono font-bold text-slate-700 truncate">${u.studentId}</span>
                <span class="text-indigo-600 font-bold shrink-0 whitespace-nowrap">${guardOn && vCount > 0 ? '' : '• '}Lần ${this.state.currentAttemptNumber || 1}</span>
                <span id="examGuardActiveBadge" class="${guardOn && vCount === 0 ? 'inline-flex' : 'hidden'} items-center gap-1 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md text-emerald-700 font-bold text-[10px] shrink-0" title="Đang bật cảnh báo chụp màn hình & thoát ứng dụng khi thi">
                  <i class="fa-solid fa-shield-halved"></i><span class="hidden sm:inline">Giám sát BẬT</span>
                </span>
                <span id="violationHeaderBadge" class="${guardOn && vCount > 0 ? 'inline-flex items-center gap-1 bg-red-100 border border-red-300 px-1.5 sm:px-2 py-0.5 rounded-md text-red-700 font-bold text-[10px] sm:text-[11px] animate-pulse shrink-0 whitespace-nowrap' : 'hidden'}">
                  <i class="fa-solid ${shotCount > 0 ? 'fa-camera' : 'fa-triangle-exclamation'} text-red-600"></i><span>Vi phạm: ${vCount}${shotCount > 0 ? ` (Chụp: ${shotCount})` : ''}</span>
                </span>
              </div>
            </div>
          </div>

          <!-- Controls & Actions -->
          <div class="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <!-- Nút Thu gọn đề để điền đáp án nhanh -->
            <button type="button" id="examCollapsePdfBtn" onclick="App.toggleExamPdfCollapse()" class="hidden md:inline-flex ui-btn ${pdfCollapsed ? 'bg-amber-500 hover:bg-amber-600 text-white border border-amber-600' : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'} shadow-xs toggle-exam-pdf-btn" title="Thu gọn khung đề PDF để mở rộng ô điền đáp án nhanh toàn màn hình">
              <i class="fa-solid ${pdfCollapsed ? 'fa-expand' : 'fa-compress'}"></i>
              <span>${pdfCollapsed ? 'Mở lại đề' : 'Thu gọn đề'}</span>
            </button>

            <!-- Nút Xem trước & Đổi cách hiển thị Đề PDF + Ô đáp án -->
            <button type="button" id="examLayoutSwitchBtn" onclick="App.showExamLayoutModal()" class="hidden sm:inline-flex ui-btn bg-white hover:bg-indigo-50 text-slate-700 border border-slate-200 shadow-xs" title="Đổi cách hiển thị Đề PDF và Ô điền đáp án (${layoutMeta.name})">
              <i class="fa-solid ${layoutMeta.icon} text-indigo-600 exam-layout-btn-icon"></i>
              <span class="hidden xl:inline exam-layout-btn-label">${layoutMeta.shortLabel}</span>
              <span class="xl:hidden">Bố cục</span>
            </button>

            <!-- Nút Xem Quá Trình Làm Bài (Desktop/Tablet) -->
            <button type="button" id="examProgressTriggerBtn" onclick="App.toggleMobileDrawer()" class="hidden sm:inline-flex ui-btn bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 shadow-xs" title="Xem quá trình đã làm, số câu đã tích chọn và câu còn bỏ trống">
              <i class="fa-solid fa-list-check text-indigo-600"></i>
              <span class="exam-header-progress-text">Quá trình: ${progress.answered}/${progress.total}</span>
            </button>

            <!-- Tải file PDF về máy (Desktop/Tablet) -->
            <a href="${pdfSrc}" download="De_Thi_${ex.id}.pdf" onclick="App.suppressAntiCheatTemporarily(2000)" class="hidden 2xl:inline-flex ui-btn bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200" title="Tải file PDF về máy nếu muốn in ấn">
              <i class="fa-solid fa-cloud-arrow-down text-indigo-600"></i>
              <span>Tải Đề</span>
            </a>

            <!-- Nút chỉnh cỡ chữ A- / A+ -->
            <div class="hidden lg:flex items-center h-[38px] bg-slate-100 rounded-xl p-0.5 border border-slate-200 text-xs">
              <button type="button" onclick="App.adjustFontSize(-1)" class="px-2.5 h-full rounded-lg text-slate-600 hover:text-indigo-600 font-bold cursor-pointer" title="Giảm cỡ chữ">A-</button>
              <button type="button" onclick="App.adjustFontSize(1)" class="px-2.5 h-full rounded-lg text-slate-600 hover:text-indigo-600 font-bold cursor-pointer" title="Tăng cỡ chữ">A+</button>
            </div>

            <!-- Nút đổi theme: Sáng / Dịu mắt / Tối & Bộ màu -->
            <button type="button" id="examQuickThemeBtn" onclick="App.cycleTheme()" class="ui-btn-icon bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200" title="Chuyển nhanh chế độ: Sáng / Dịu mắt / Tối">
              <i class="fa-solid fa-circle-half-stroke"></i>
            </button>
            <button type="button" id="examThemeBtn" onclick="App.showThemeModal()" class="hidden sm:inline-flex ui-btn-icon bg-slate-100 hover:bg-slate-200 text-indigo-600 border border-slate-200" title="Tùy chỉnh bộ màu & độ tương phản">
              <i class="fa-solid fa-palette"></i>
            </button>

            <!-- Timer Badge -->
            <div class="inline-flex items-center gap-1 h-[38px] bg-amber-50 border border-amber-200 px-2 sm:px-3 rounded-xl text-amber-900 font-mono font-bold text-xs sm:text-sm whitespace-nowrap">
              <i class="fa-regular fa-clock text-amber-600"></i>
              <span id="examTimer">--:--</span>
            </div>

            <!-- Nộp bài Button -->
            <button type="button" id="examTopSubmitBtn" onclick="App.confirmSubmitExam()" class="ui-btn bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm px-2.5 sm:px-4 shrink-0">
              <i class="fa-solid fa-paper-plane shrink-0"></i>
              <span>Nộp Bài</span>
            </button>
          </div>
        </header>

        <!-- Live Progress Bar -->
        <div class="w-full bg-slate-200 h-1 overflow-hidden shrink-0">
          <div class="exam-progress-bar" style="width: ${progress.percentage}%;"></div>
        </div>

        <!-- Thanh chuyển chế độ Đề PDF / Phiếu trả lời / Bố cục / Quá trình gọn gàng 5 cột không tràn trên Điện thoại -->
        <div class="lg:hidden bg-slate-900 border-b border-slate-800 px-1.5 py-1.5 grid grid-cols-5 gap-1 shrink-0 z-20">
          <button type="button" id="mobPaneBtn_pdf" onclick="App.setMobileExamPane('pdf')" class="${this.getMobilePaneBtnClass((this.state.mobileExamPane || 'both') === 'pdf')}">
            <i class="fa-solid fa-file-pdf text-red-400 text-xs"></i><span class="truncate max-w-full">Đề PDF</span>
          </button>
          <button type="button" id="mobPaneBtn_both" onclick="App.setMobileExamPane('both')" class="${this.getMobilePaneBtnClass((this.state.mobileExamPane || 'both') === 'both')}">
            <i class="fa-solid fa-table-columns text-indigo-300 text-xs"></i><span class="truncate max-w-full">Đề+Phiếu</span>
          </button>
          <button type="button" id="mobPaneBtn_sheet" onclick="App.setMobileExamPane('sheet')" class="${this.getMobilePaneBtnClass((this.state.mobileExamPane || 'both') === 'sheet')}">
            <i class="fa-solid fa-pen-to-square text-emerald-300 text-xs"></i><span class="truncate max-w-full">Phiếu <span class="exam-mobile-ans-short">${progress.answered}/${progress.total}</span></span>
          </button>
          <button type="button" id="mobLayoutSwitchBtn" onclick="App.showExamLayoutModal()" class="min-w-0 h-11 sm:h-9 px-1 sm:px-2 rounded-xl text-[10px] sm:text-[11px] leading-tight font-bold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 transition flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 cursor-pointer whitespace-nowrap" title="Đổi bố cục Đề & Đáp án">
            <i class="fa-solid fa-table-list text-xs"></i><span class="truncate max-w-full">Bố cục</span>
          </button>
          <button type="button" id="mobilePaletteTriggerBtn" onclick="App.toggleMobileDrawer()" class="min-w-0 h-11 sm:h-9 px-1 sm:px-2 rounded-xl text-[10px] sm:text-[11px] leading-tight font-bold bg-indigo-950/90 hover:bg-indigo-900 text-indigo-200 border border-indigo-700 transition flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 cursor-pointer whitespace-nowrap" title="Xem quá trình đã làm & câu đã tích chọn">
            <i class="fa-solid fa-list-check text-xs"></i><span id="mobilePaletteBtnText" class="truncate max-w-full">Quá trình</span>
          </button>
        </div>

        <!-- Main Exam Area: Đồng bộ thanh cuộn & linh hoạt đổi vị trí Đề PDF / Ô điền đáp án -->
        <div id="examMainWorkspace" onscroll="App.onExamWorkspaceScroll()" class="${paneCls.workspace}">
          ${this.renderSplitViewContent(ex)}
        </div>

        <!-- Modal / Drawer Xem Quá Trình Làm Bài (Dùng chung cho cả Máy tính & Điện thoại) -->
        <div id="mobileDrawerBackdrop" class="hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm transition" onclick="App.toggleMobileDrawer()"></div>
        <div id="mobileDrawer" class="hidden fixed inset-x-0 bottom-0 lg:inset-auto lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:w-[92vw] lg:max-w-3xl z-50 bg-white rounded-t-3xl lg:rounded-3xl shadow-2xl p-4 sm:p-6 border-t lg:border border-slate-200 max-h-[84vh] overflow-y-auto space-y-4 ios-safe-bottom">
          <div class="flex items-center justify-between border-b border-slate-100 pb-3">
            <div class="flex items-center space-x-2.5 min-w-0">
              <span class="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <i class="fa-solid fa-list-check text-base"></i>
              </span>
              <div class="min-w-0">
                <h3 class="font-extrabold text-slate-900 text-sm sm:text-base truncate">Quá Trình Làm Bài &amp; Trạng Thái Từng Câu</h3>
                <p class="text-[11px] text-slate-500">Chạm vào bất kỳ câu nào để nhảy thẳng tới câu đó trên phiếu trả lời</p>
              </div>
            </div>
            <button type="button" onclick="App.toggleMobileDrawer()" class="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 cursor-pointer">
              <i class="fa-solid fa-xmark text-sm"></i>
            </button>
          </div>
          <div id="examProgressDrawerBody" class="space-y-4">
            ${this.renderPaletteMatrix(ex)}
          </div>
        </div>
      </div>
    `;

    this.updateTimerDisplay();
    this.mountPdfViewer('examRoomPdfViewer', pdfSrc, { flowWithPage: this.isExamStackedFlowMode() });
  },

  toggleMobileDrawer() {
    const backdrop = document.getElementById('mobileDrawerBackdrop');
    const drawer = document.getElementById('mobileDrawer');
    if (backdrop && drawer) {
      const willOpen = drawer.classList.contains('hidden');
      if (willOpen && this.state.activeExam) {
        const body = document.getElementById('examProgressDrawerBody');
        if (body) body.innerHTML = this.renderPaletteMatrix(this.state.activeExam);
      }
      backdrop.classList.toggle('hidden');
      drawer.classList.toggle('hidden');
    }
  },

  getExamPaneClasses(mode = this.state.mobileExamPane) {
    const m = mode === 'pdf' || mode === 'sheet' ? mode : 'both';
    const layout = this.getNormalizedExamLayoutMode();
    const pdfCollapsed = Boolean(this.state.examPdfCollapsed) && m !== 'pdf';
    const sheetCollapsed = Boolean(this.state.examSheetCollapsed) && !pdfCollapsed && m !== 'sheet';

    if (pdfCollapsed) {
      return {
        workspace: 'flex-1 min-h-0 overflow-hidden flex flex-col w-full bg-slate-100',
        left: `${m === 'sheet' ? 'hidden lg:flex' : 'flex'} order-1 w-full shrink-0 border-b border-slate-200 bg-slate-900 flex-col`,
        right: 'flex h-full order-2 flex-1 min-h-0 w-full bg-white flex-col overflow-y-auto',
        sheetBody: 'flex-1 flex flex-col',
        pdfViewer: 'hidden',
        pdfBanner: 'flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-2 bg-indigo-950 border-t border-indigo-800/80 text-indigo-100 text-xs',
        pdfHeader: 'bg-slate-950 text-slate-300 text-xs px-2.5 sm:px-4 py-1.5 flex flex-wrap items-center justify-between gap-1.5 shrink-0'
      };
    }

    if (sheetCollapsed) {
      return {
        workspace: 'flex-1 min-h-0 overflow-hidden flex flex-col w-full bg-slate-100',
        right: `${m === 'pdf' ? 'hidden lg:flex' : 'flex'} order-1 w-full shrink-0 bg-white border-b border-slate-200 flex-col`,
        left: 'flex h-full order-2 flex-1 min-h-0 w-full bg-slate-900 flex-col',
        sheetBody: 'hidden',
        pdfViewer: 'flex-1 w-full h-full min-h-0 flex flex-col bg-slate-950',
        pdfBanner: 'hidden',
        pdfHeader: 'bg-slate-950 text-slate-300 text-xs px-2.5 sm:px-4 py-1.5 flex flex-wrap items-center justify-between gap-1.5 border-b border-slate-800 shrink-0'
      };
    }

    if (layout === 'top-sheet' || layout === 'fast-entry') {
      const onlyPdfMob = m === 'pdf';
      const onlySheetMob = m === 'sheet';
      const isUnifiedFlow = m === 'both';
      return {
        workspace: `${isUnifiedFlow ? 'overflow-y-auto overflow-x-hidden' : 'overflow-hidden lg:overflow-y-auto lg:overflow-x-hidden'} flex-1 min-h-0 flex flex-col w-full scroll-smooth bg-slate-100`,
        right: `${onlyPdfMob ? 'hidden lg:flex' : (onlySheetMob ? 'flex h-full lg:h-auto overflow-y-auto lg:overflow-visible' : 'flex')} order-1 w-full shrink-0 bg-white border-b-2 border-indigo-200 flex-col shadow-xs`,
        left: `${onlySheetMob ? 'hidden lg:flex' : (onlyPdfMob ? 'flex h-full lg:h-auto lg:min-h-[72vh]' : 'flex min-h-[72vh]')} order-2 w-full shrink-0 bg-slate-900 flex-col`,
        sheetBody: `${onlySheetMob ? 'flex-1 lg:flex-initial' : ''} flex flex-col`,
        pdfViewer: `${onlyPdfMob ? 'flex-1 lg:flex-initial w-full h-full lg:h-auto min-h-0' : 'w-full h-auto'} flex flex-col bg-slate-950`,
        pdfBanner: 'hidden',
        pdfHeader: `bg-slate-950 text-slate-300 text-xs px-2.5 sm:px-4 py-1.5 flex flex-wrap items-center justify-between gap-1.5 border-b border-slate-800 shrink-0 ${isUnifiedFlow ? 'sticky top-0 z-20' : ''}`
      };
    }

    if (layout === 'bottom-sheet') {
      const onlyPdfMob = m === 'pdf';
      const onlySheetMob = m === 'sheet';
      const isUnifiedFlow = m === 'both';
      return {
        workspace: `${isUnifiedFlow ? 'overflow-y-auto overflow-x-hidden' : 'overflow-hidden lg:overflow-y-auto lg:overflow-x-hidden'} flex-1 min-h-0 flex flex-col w-full scroll-smooth bg-slate-100`,
        left: `${onlySheetMob ? 'hidden lg:flex' : (onlyPdfMob ? 'flex h-full lg:h-auto lg:min-h-[68vh]' : 'flex min-h-[68vh]')} order-1 w-full shrink-0 border-b-2 border-indigo-200 bg-slate-900 flex-col`,
        right: `${onlyPdfMob ? 'hidden lg:flex' : (onlySheetMob ? 'flex h-full lg:h-auto overflow-y-auto lg:overflow-visible' : 'flex')} order-2 w-full shrink-0 bg-white flex-col`,
        sheetBody: `${onlySheetMob ? 'flex-1 lg:flex-initial' : ''} flex flex-col`,
        pdfViewer: `${onlyPdfMob ? 'flex-1 lg:flex-initial w-full h-full lg:h-auto min-h-0' : 'w-full h-auto'} flex flex-col bg-slate-950`,
        pdfBanner: 'hidden',
        pdfHeader: `bg-slate-950 text-slate-300 text-xs px-2.5 sm:px-4 py-1.5 flex flex-wrap items-center justify-between gap-1.5 border-b border-slate-800 shrink-0 ${isUnifiedFlow ? 'sticky top-0 z-20' : ''}`
      };
    }

    const leftMob = m === 'pdf' ? 'flex h-full' : (m === 'sheet' ? 'hidden' : 'flex h-[52%]');
    const rightMob = m === 'sheet' ? 'flex h-full' : (m === 'pdf' ? 'hidden' : 'flex h-[48%]');
    return {
      workspace: 'flex-1 min-h-0 overflow-hidden flex flex-col lg:flex-row w-full',
      left: `${leftMob} lg:flex order-1 lg:w-[68%] lg:h-full border-b lg:border-b-0 lg:border-r border-slate-200 bg-slate-900 flex-col min-h-0 split-pane-left`,
      right: `${rightMob} lg:flex order-2 lg:w-[32%] lg:h-full bg-white flex-col min-h-0 split-pane-right overflow-y-auto`,
      sheetBody: 'flex-1 flex flex-col',
      pdfViewer: 'flex-1 w-full h-full min-h-0 flex flex-col bg-slate-950',
      pdfBanner: 'hidden',
      pdfHeader: 'bg-slate-950 text-slate-300 text-xs px-2.5 sm:px-4 py-1.5 flex flex-wrap items-center justify-between gap-1.5 border-b border-slate-800 shrink-0'
    };
  },

  setMobileExamPane(mode) {
    const m = mode === 'pdf' || mode === 'sheet' ? mode : 'both';
    this.state.mobileExamPane = m;
    if (m === 'pdf' && this.state.examPdfCollapsed) this.state.examPdfCollapsed = false;
    if (m === 'sheet' && this.state.examSheetCollapsed) this.state.examSheetCollapsed = false;
    this.applyExamLayoutDom();
    ['pdf', 'both', 'sheet'].forEach(k => {
      const btn = document.getElementById(`mobPaneBtn_${k}`);
      if (btn) {
        btn.className = this.getMobilePaneBtnClass(k === m);
      }
    });
  },

  toggleExamPdfCollapse() {
    this.state.examPdfCollapsed = !this.state.examPdfCollapsed;
    if (this.state.examPdfCollapsed) {
      this.state.examSheetCollapsed = false;
      if (this.state.mobileExamPane === 'pdf') this.state.mobileExamPane = 'both';
    }
    this.applyExamLayoutDom();
  },

  toggleExamSheetCollapse() {
    this.state.examSheetCollapsed = !this.state.examSheetCollapsed;
    if (this.state.examSheetCollapsed) {
      this.state.examPdfCollapsed = false;
      if (this.state.mobileExamPane === 'sheet') this.state.mobileExamPane = 'both';
    }
    this.applyExamLayoutDom();
  },

  scrollExamWorkspaceTo(target) {
    if (typeof document === 'undefined') return;
    if (target === 'pdf' && this.state.examPdfCollapsed) {
      this.state.examPdfCollapsed = false;
      this.applyExamLayoutDom();
    }
    if (target === 'sheet' && this.state.examSheetCollapsed) {
      this.state.examSheetCollapsed = false;
      this.applyExamLayoutDom();
    }
    setTimeout(() => {
      const el = document.getElementById(target === 'pdf' ? 'examLeftPdfPane' : 'examRightSheetPane');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 30);
  },

  onExamWorkspaceScroll() {
    if (!this.isExamStackedFlowMode()) return;
    const ws = typeof document !== 'undefined' ? document.getElementById('examMainWorkspace') : null;
    if (ws) this.updatePdfPageInfoFromContainer('examRoomPdfViewer', ws);
  },

  applyExamLayoutDom() {
    if (typeof document === 'undefined') return;
    const cls = this.getExamPaneClasses(this.state.mobileExamPane);
    const pdfCollapsed = Boolean(this.state.examPdfCollapsed);
    const sheetCollapsed = Boolean(this.state.examSheetCollapsed) && !pdfCollapsed;
    const layoutMeta = this.getExamLayoutMeta();
    const isStacked = this.getNormalizedExamLayoutMode() !== 'split' && !pdfCollapsed && !sheetCollapsed;

    const ws = document.getElementById('examMainWorkspace');
    const leftEl = document.getElementById('examLeftPdfPane');
    const rightEl = document.getElementById('examRightSheetPane');
    const pdfHeaderEl = document.getElementById('examLeftPdfHeader');
    const pdfBannerEl = document.getElementById('examPdfCollapsedBanner');
    const pdfViewerEl = document.getElementById('examRoomPdfViewer');
    const sheetBodyEl = document.getElementById('examSheetBodyWrap');
    const sheetCollapsedHint = document.getElementById('examSheetCollapsedHint');

    if (ws) ws.className = cls.workspace;
    if (leftEl) leftEl.className = cls.left;
    if (rightEl) rightEl.className = cls.right;
    if (pdfHeaderEl) pdfHeaderEl.className = cls.pdfHeader;
    if (pdfBannerEl) pdfBannerEl.className = cls.pdfBanner;
    if (pdfViewerEl) pdfViewerEl.className = cls.pdfViewer;
    if (sheetBodyEl) sheetBodyEl.className = cls.sheetBody;
    if (sheetCollapsedHint) sheetCollapsedHint.classList.toggle('hidden', !sheetCollapsed);

    this.syncPdfViewerFlowMode('examRoomPdfViewer', this.isExamStackedFlowMode());

    document.querySelectorAll('.toggle-exam-pdf-btn').forEach(btn => {
      if (btn.id === 'examCollapsePdfBtn') {
        btn.className = `hidden md:inline-flex ui-btn ${pdfCollapsed ? 'bg-amber-500 hover:bg-amber-600 text-white border border-amber-600' : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'} shadow-xs toggle-exam-pdf-btn`;
      }
      btn.innerHTML = `<i class="fa-solid ${pdfCollapsed ? 'fa-expand' : 'fa-compress'}"></i><span>${pdfCollapsed ? 'Mở lại đề' : 'Thu gọn đề'}</span>`;
    });

    document.querySelectorAll('.toggle-exam-sheet-btn').forEach(btn => {
      btn.innerHTML = `<i class="fa-solid ${sheetCollapsed ? 'fa-chevron-down' : 'fa-chevron-up'}"></i><span>${sheetCollapsed ? 'Mở ô đáp án' : 'Thu gọn đáp án'}</span>`;
    });

    document.querySelectorAll('.exam-layout-btn-label').forEach(el => {
      el.textContent = layoutMeta.shortLabel;
    });
    document.querySelectorAll('.exam-layout-btn-icon').forEach(el => {
      el.className = `fa-solid ${layoutMeta.icon} text-indigo-600 exam-layout-btn-icon`;
    });

    const jumpPdfBtn = document.getElementById('sheetJumpToPdfBtn');
    if (jumpPdfBtn) {
      const showJumpPdf = isStacked && (this.getNormalizedExamLayoutMode() === 'top-sheet' || this.getNormalizedExamLayoutMode() === 'fast-entry');
      jumpPdfBtn.classList.toggle('hidden', !showJumpPdf);
    }
    const jumpSheetBtn = document.getElementById('pdfJumpToSheetBtn');
    if (jumpSheetBtn) {
      jumpSheetBtn.classList.toggle('hidden', !isStacked);
      const isTopSheet = this.getNormalizedExamLayoutMode() === 'top-sheet' || this.getNormalizedExamLayoutMode() === 'fast-entry';
      jumpSheetBtn.innerHTML = `<i class="fa-solid ${isTopSheet ? 'fa-angles-up' : 'fa-angles-down'} mr-1"></i><span>${isTopSheet ? 'Lên Ô đáp án' : 'Xuống Ô đáp án'}</span>`;
    }

    const inputsContainer = document.getElementById('splitAnswerInputsContainer');
    if (inputsContainer && this.state.activeExam) {
      inputsContainer.innerHTML = this.renderAnswerSheetInputs(this.state.activeExam);
    }

    if (!pdfCollapsed) {
      setTimeout(() => this.renderPdfPages('examRoomPdfViewer'), 60);
    }
  },

  // 1. Khung hiển thị Đề PDF & Ô điền đáp án linh hoạt (Split / Ô đáp án ở trên - PDF dưới / Thu gọn đề điền nhanh)
  renderSplitViewContent(ex) {
    const pdfSrc = this.state.resolvedPdfUrl || ex.pdf_url || '';
    const safeTitle = (ex.title || '').replace(/'/g, "\\'");
    const paneCls = this.getExamPaneClasses(this.state.mobileExamPane);
    const inStandalone = this.isStandaloneApp();
    const progress = this.calculateProgress();
    const remainCount = progress.total - progress.answered;
    const pdfCollapsed = Boolean(this.state.examPdfCollapsed);
    const sheetCollapsed = Boolean(this.state.examSheetCollapsed) && !pdfCollapsed;
    const normLayout = this.getNormalizedExamLayoutMode();
    const isStacked = normLayout !== 'split' && !pdfCollapsed && !sheetCollapsed;
    const isTopSheet = normLayout === 'top-sheet' || normLayout === 'fast-entry';

    const hasP4 = Array.isArray(ex.part4) && ex.part4.length > 0;

    return `
      <!-- Khung Xem Đề PDF Gốc -->
      <div id="examLeftPdfPane" class="${paneCls.left}">
        <div id="examLeftPdfHeader" class="${paneCls.pdfHeader}">
          <span class="flex items-center font-bold text-white min-w-0 truncate"><i class="fa-solid fa-file-pdf text-red-400 mr-1.5 shrink-0"></i><span class="truncate">Đề thi PDF gốc</span></span>
          <div class="flex flex-wrap items-center gap-1.5 sm:gap-2.5">
            <button type="button" id="pdfJumpToSheetBtn" onclick="App.scrollExamWorkspaceTo('sheet')" class="${isStacked ? 'inline-flex' : 'hidden'} px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] items-center cursor-pointer transition whitespace-nowrap">
              <i class="fa-solid ${isTopSheet ? 'fa-angles-up' : 'fa-angles-down'} mr-1"></i><span>${isTopSheet ? 'Lên Ô đáp án' : 'Xuống Ô đáp án'}</span>
            </button>
            <button type="button" onclick="App.toggleExamPdfCollapse()" class="toggle-exam-pdf-btn px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer transition whitespace-nowrap" title="Thu gọn hoặc mở lại khung đề PDF">
              <i class="fa-solid ${pdfCollapsed ? 'fa-expand' : 'fa-compress'}"></i><span>${pdfCollapsed ? 'Mở lại đề' : 'Thu gọn đề'}</span>
            </button>
            <a href="${pdfSrc}" download="De_Thi_${ex.id}.pdf" onclick="App.suppressAntiCheatTemporarily(2000)" class="px-1.5 py-0.5 rounded bg-slate-800/80 sm:bg-transparent text-xs text-indigo-300 hover:text-white inline-flex items-center whitespace-nowrap" title="Tải đề PDF">
              <i class="fa-solid fa-download sm:mr-1"></i><span class="hidden sm:inline">Tải về</span>
            </a>
            <button type="button" onclick="App.openPdfModal('${safeTitle}', '${pdfSrc}', '${ex.id}')" class="px-1.5 py-0.5 rounded bg-slate-800/80 sm:bg-transparent text-[11px] sm:text-xs text-emerald-400 hover:text-emerald-300 inline-flex items-center cursor-pointer whitespace-nowrap">
              <i class="fa-solid fa-expand mr-1"></i><span>Phóng to</span>
            </button>
            ${!inStandalone ? `
              <a href="${pdfSrc}" target="_blank" class="hidden sm:flex text-xs hover:text-white items-center whitespace-nowrap">
                <i class="fa-solid fa-arrow-up-right-from-square mr-1"></i>Tab mới
              </a>
            ` : ''}
          </div>
        </div>
        <div id="examPdfCollapsedBanner" class="${paneCls.pdfBanner}">
          <span class="min-w-0 truncate flex items-center gap-1.5">
            <i class="fa-solid fa-bolt text-amber-400 shrink-0"></i>
            <span class="truncate">Đề thi PDF đang thu gọn để ưu tiên điền đáp án nhanh</span>
          </span>
          <button type="button" onclick="App.toggleExamPdfCollapse()" class="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold shrink-0 cursor-pointer flex items-center gap-1 shadow-xs">
            <i class="fa-solid fa-expand text-[10px]"></i><span>Mở lại đề PDF</span>
          </button>
        </div>
        <div id="examRoomPdfViewer" class="${paneCls.pdfViewer}"></div>
      </div>

      <!-- Khung Ô Điền Đáp Án Trực Tuyến + Theo Dõi Quá Trình -->
      <div id="examRightSheetPane" class="${paneCls.right}">
        <div class="p-2 sm:p-3 border-b border-slate-200 bg-slate-50 sticky top-0 z-10 space-y-2">
          <!-- Thanh tóm tắt quá trình & công cụ thu gọn đề / đổi bố cục ngay trên ô đáp án -->
          <div class="flex flex-wrap items-center justify-between gap-2 bg-white border border-slate-200 rounded-xl px-2.5 py-2 shadow-2xs">
            <div class="min-w-0 flex items-center gap-2 text-xs">
              <span class="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <i class="fa-solid fa-chart-pie text-[11px]"></i>
              </span>
              <div class="min-w-0 truncate">
                <span class="font-extrabold text-slate-800 exam-sheet-done-text">Đã làm: ${progress.answered}/${progress.total} câu (${progress.percentage}%)</span>
                <span class="text-[11px] font-semibold ${remainCount > 0 ? 'text-amber-700' : 'text-emerald-700'} ml-1 exam-sheet-remain-text">• ${remainCount > 0 ? `Chưa xong: ${remainCount}` : 'Đã chọn đủ!'}</span>
              </div>
            </div>
            <div class="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
              <button type="button" id="sheetJumpToPdfBtn" onclick="App.scrollExamWorkspaceTo('pdf')" class="${isStacked && isTopSheet ? 'inline-flex' : 'hidden'} flex-1 sm:flex-initial justify-center px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[11px] font-bold cursor-pointer items-center gap-1 whitespace-nowrap" title="Kéo xuống mục xem Đề PDF bên dưới">
                <i class="fa-solid fa-angles-down"></i><span>Xem Đề PDF</span>
              </button>
              <button type="button" id="sheetCollapsePdfQuickBtn" onclick="App.toggleExamPdfCollapse()" class="toggle-exam-pdf-btn flex-1 sm:flex-initial justify-center px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-bold cursor-pointer inline-flex items-center gap-1 whitespace-nowrap" title="Thu gọn đề để điền đáp án nhanh">
                <i class="fa-solid ${pdfCollapsed ? 'fa-expand' : 'fa-compress'}"></i><span>${pdfCollapsed ? 'Mở lại đề' : 'Thu gọn đề'}</span>
              </button>
              <button type="button" id="sheetToggleSelfCollapseBtn" onclick="App.toggleExamSheetCollapse()" class="toggle-exam-sheet-btn flex-1 sm:flex-initial justify-center px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-[11px] font-bold cursor-pointer inline-flex items-center gap-1 whitespace-nowrap" title="Thu gọn hoặc mở rộng ô điền đáp án">
                <i class="fa-solid ${sheetCollapsed ? 'fa-chevron-down' : 'fa-chevron-up'}"></i><span>${sheetCollapsed ? 'Mở ô đáp án' : 'Thu gọn đáp án'}</span>
              </button>
              <button type="button" id="sheetProgressDetailBtn" onclick="App.toggleMobileDrawer()" class="flex-1 sm:flex-initial justify-center px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold cursor-pointer inline-flex items-center gap-1 shadow-xs whitespace-nowrap" title="Mở bảng chi tiết câu nào đã tích chọn hay chưa">
                <i class="fa-solid fa-list-check"></i><span>Quá trình</span>
              </button>
            </div>
          </div>

          <div id="examSheetCollapsedHint" class="${sheetCollapsed ? '' : 'hidden'} px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs flex flex-wrap items-center justify-between gap-2">
            <span><i class="fa-solid fa-circle-info mr-1"></i>Ô điền đáp án đang thu gọn để xem Đề PDF rộng tối đa.</span>
            <button type="button" onclick="App.toggleExamSheetCollapse()" class="font-extrabold underline cursor-pointer shrink-0">Mở lại điền đáp án</button>
          </div>

          <div class="grid ${hasP4 ? 'grid-cols-3 sm:flex' : 'grid-cols-4 sm:flex'} border border-slate-200 rounded-xl p-1 bg-white text-[10.5px] sm:text-xs font-bold gap-1">
            <button type="button" id="sectionTabBtn_all" onclick="App.setSectionTab('all')" class="${this.getSectionTabBtnClass(this.state.activeSectionTab === 'all', hasP4)}" title="Hiển thị liên thông tất cả các phần để điền đáp án nhanh">
              Tất cả (${progress.answered}/${progress.total})
            </button>
            <button type="button" id="sectionTabBtn_p1" onclick="App.setSectionTab('p1')" class="${this.getSectionTabBtnClass(this.state.activeSectionTab === 'p1')}">
              P.I (${progress.parts.p1.answered}/${ex.part1.length})
            </button>
            <button type="button" id="sectionTabBtn_p2" onclick="App.setSectionTab('p2')" class="${this.getSectionTabBtnClass(this.state.activeSectionTab === 'p2')}">
              P.II (${progress.parts.p2.answered}/${ex.part2.length})
            </button>
            <button type="button" id="sectionTabBtn_p3" onclick="App.setSectionTab('p3')" class="${this.getSectionTabBtnClass(this.state.activeSectionTab === 'p3')}">
              P.III (${progress.parts.p3.answered}/${ex.part3.length})
            </button>
            ${hasP4 ? `
              <button type="button" id="sectionTabBtn_p4" onclick="App.setSectionTab('p4')" class="${this.getSectionTabBtnClass(this.state.activeSectionTab === 'p4')}">
                P.IV (${progress.parts.p4.answered}/${ex.part4.length})
              </button>
            ` : ''}
          </div>
        </div>

        <div id="examSheetBodyWrap" class="${paneCls.sheetBody}">
          <div id="splitAnswerInputsContainer" class="p-3 sm:p-4 space-y-4 flex-1">
            ${this.renderAnswerSheetInputs(ex)}
          </div>

          <div class="p-3 sm:p-3.5 pt-2 border-t border-slate-200 bg-slate-50 ios-safe-bottom">
            <button type="button" id="sheetBottomSubmitBtn" onclick="App.confirmSubmitExam()" class="ui-btn-lg w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
              <i class="fa-solid fa-paper-plane"></i>
              <span>Nộp Bài &amp; Chấm Điểm Ngay</span>
            </button>
          </div>
        </div>
      </div>
    `;
  },

  // 2. Render Bảng theo dõi Quá trình làm bài (Hiển thị rõ số câu đã làm & từng câu đã tích chọn gì hay bỏ trống)
  renderPaletteMatrix(ex) {
    const progress = this.calculateProgress();
    const filter = this.state.paletteFilter || 'all';
    const matchFilter = (st) => {
      if (filter === 'answered') return st.status === 'answered';
      if (filter === 'unanswered') return st.status !== 'answered';
      if (filter === 'flagged') return st.isFlagged;
      return true;
    };

    const p1Filtered = ex.part1.filter(q => matchFilter(this.getQuestionProgressState('p1', q.id)));
    const p2Filtered = ex.part2.filter(q => matchFilter(this.getQuestionProgressState('p2', q.id)));
    const p3Filtered = ex.part3.filter(q => matchFilter(this.getQuestionProgressState('p3', q.id)));
    const p4List = Array.isArray(ex.part4) ? ex.part4 : [];
    const p4Filtered = p4List.filter(q => matchFilter(this.getQuestionProgressState('p4', q.id)));
    const totalShown = p1Filtered.length + p2Filtered.length + p3Filtered.length + p4Filtered.length;

    return `
      <div class="space-y-4">
        <!-- Thống kê tổng quan quá trình -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div class="p-2.5 rounded-xl bg-indigo-50 border border-indigo-100">
            <div class="text-[11px] text-slate-500 font-semibold">Đã làm đủ</div>
            <div class="text-base font-extrabold text-indigo-700 font-mono mt-0.5">${progress.answered}/${progress.total} <span class="text-[11px] font-sans font-bold">(${progress.percentage}%)</span></div>
          </div>
          <div class="p-2.5 rounded-xl bg-rose-50 border border-rose-100">
            <div class="text-[11px] text-slate-500 font-semibold">Chưa tích chọn</div>
            <div class="text-base font-extrabold text-rose-700 font-mono mt-0.5">${progress.unanswered} câu</div>
          </div>
          <div class="p-2.5 rounded-xl bg-amber-50 border border-amber-100">
            <div class="text-[11px] text-slate-500 font-semibold">Đang làm dở (P.II)</div>
            <div class="text-base font-extrabold text-amber-700 font-mono mt-0.5">${progress.partial} câu</div>
          </div>
          <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <div class="text-[11px] text-slate-500 font-semibold">Đánh dấu xem lại</div>
            <div class="text-base font-extrabold text-slate-800 font-mono mt-0.5">${progress.flagged} câu</div>
          </div>
        </div>

        <!-- Bộ lọc nhanh câu hỏi -->
        <div class="flex flex-wrap items-center gap-1.5">
          ${[
            { id: 'all', label: `Tất cả (${progress.total})`, icon: 'fa-border-all' },
            { id: 'unanswered', label: `Chưa xong (${progress.unanswered + progress.partial})`, icon: 'fa-circle-exclamation' },
            { id: 'answered', label: `Đã chọn (${progress.answered})`, icon: 'fa-circle-check' },
            { id: 'flagged', label: `Đánh dấu (${progress.flagged})`, icon: 'fa-star' }
          ].map(f => `
            <button type="button" onclick="App.setPaletteFilter('${f.id}')" class="px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center gap-1.5 ${filter === f.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}">
              <i class="fa-solid ${f.icon} text-[11px]"></i><span>${f.label}</span>
            </button>
          `).join('')}
        </div>

        ${totalShown === 0 ? `
          <div class="p-6 text-center rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-500 font-semibold">
            ${filter === 'unanswered' ? 'Tuyệt vời! Bạn đã tích chọn đầy đủ tất cả các câu hỏi trong đề.' : 'Không có câu hỏi nào khớp với bộ lọc hiện tại.'}
          </div>
        ` : ''}

        ${p1Filtered.length > 0 ? `
        <div class="space-y-2">
          <div class="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            <span>Phần I: Trắc nghiệm 4 lựa chọn</span>
            <span class="text-indigo-600">Đã chọn ${progress.parts.p1.answered}/${ex.part1.length} câu</span>
          </div>
          <div class="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-1.5">
            ${p1Filtered.map(q => {
              const st = this.getQuestionProgressState('p1', q.id);
              return `
                <button type="button" id="qmat_p1_${q.id}" onclick="App.scrollToQuestion('p1', ${q.id})"
                  class="q-matrix-btn !w-full !h-auto py-1.5 px-2 flex-col gap-0.5 ${st.status} ${st.isFlagged ? 'flagged' : ''}">
                  <span class="text-[10px] opacity-80 font-semibold">Câu ${q.id}</span>
                  <span class="font-mono font-extrabold text-xs">${st.status === 'answered' ? st.shortVal : 'Chưa chọn'}</span>
                </button>
              `;
            }).join('')}
          </div>
        </div>
        ` : ''}

        ${p2Filtered.length > 0 ? `
        <div class="space-y-2">
          <div class="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            <span>Phần II: Đúng / Sai (4 ý mỗi câu)</span>
            <span class="text-emerald-700">Đủ 4 ý: ${progress.parts.p2.answered}/${ex.part2.length} câu</span>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
            ${p2Filtered.map(q => {
              const st = this.getQuestionProgressState('p2', q.id);
              return `
                <button type="button" id="qmat_p2_${q.id}" onclick="App.scrollToQuestion('p2', ${q.id})"
                  class="q-matrix-btn !w-full !h-auto py-2 px-2.5 flex-col items-start gap-1 text-left ${st.status} ${st.isFlagged ? 'flagged' : ''}">
                  <div class="w-full flex items-center justify-between text-xs font-extrabold">
                    <span>Câu ${q.id}</span>
                    <span class="font-mono text-[11px]">${st.shortVal}</span>
                  </div>
                  <div class="font-mono text-[10px] opacity-90 truncate w-full">${st.detail}</div>
                </button>
              `;
            }).join('')}
          </div>
        </div>
        ` : ''}

        ${p3Filtered.length > 0 ? `
        <div class="space-y-2">
          <div class="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            <span>Phần III: Trả lời ngắn</span>
            <span class="text-amber-700">Đã điền ${progress.parts.p3.answered}/${ex.part3.length} câu</span>
          </div>
          <div class="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
            ${p3Filtered.map(q => {
              const st = this.getQuestionProgressState('p3', q.id);
              return `
                <button type="button" id="qmat_p3_${q.id}" onclick="App.scrollToQuestion('p3', ${q.id})"
                  class="q-matrix-btn !w-full !h-auto py-1.5 px-2 flex-col gap-0.5 ${st.status} ${st.isFlagged ? 'flagged' : ''}">
                  <span class="text-[10px] opacity-80 font-semibold">Câu ${q.id}</span>
                  <span class="font-mono font-extrabold text-xs truncate max-w-full">${st.shortVal}</span>
                </button>
              `;
            }).join('')}
          </div>
        </div>
        ` : ''}

        ${p4Filtered.length > 0 ? `
        <div class="space-y-2">
          <div class="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            <span>Phần IV: Tự luận</span>
            <span class="text-purple-700">Đã làm ${progress.parts.p4.answered}/${p4List.length} câu</span>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            ${p4Filtered.map(q => {
              const st = this.getQuestionProgressState('p4', q.id);
              return `
                <button type="button" id="qmat_p4_${q.id}" onclick="App.scrollToQuestion('p4', ${q.id})"
                  class="q-matrix-btn !w-full !h-auto py-1.5 px-2.5 flex-col gap-0.5 ${st.status} ${st.isFlagged ? 'flagged' : ''}">
                  <span class="text-[10px] opacity-80 font-semibold">Câu ${q.id} (TL)</span>
                  <span class="font-bold text-xs">${st.shortVal}</span>
                </button>
              `;
            }).join('')}
          </div>
        </div>
        ` : ''}
      </div>
    `;
  },

  getRowVisualClasses(part, st) {
    if (st.status === 'answered') {
      return {
        row: part === 'p4'
          ? 'p-3.5 bg-indigo-50 border border-indigo-200 rounded-2xl space-y-2.5 transition'
          : (part === 'p2' ? 'p-3 bg-indigo-50 border border-indigo-200 rounded-xl space-y-2 transition' : 'p-2.5 bg-indigo-50 rounded-xl border border-indigo-200 flex flex-wrap items-center justify-between gap-2 transition'),
        badge: 'px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] whitespace-nowrap'
      };
    }
    if (st.status === 'partial') {
      return {
        row: 'p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2 transition',
        badge: 'px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px] whitespace-nowrap'
      };
    }
    return {
      row: part === 'p4'
        ? 'p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5 transition'
        : (part === 'p2' ? 'p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 transition' : 'p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2 transition'),
      badge: 'px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-semibold text-[10px] whitespace-nowrap'
    };
  },

  // 3. Render Phiếu làm bài (Tự động chuyển sang Lưới Ngang Đa Cột tốc độ cao khi Thu gọn đề hoặc đặt Ô đáp án ở trên/dưới)
  renderAnswerSheetInputs(ex) {
    const wide = this.isWideAnswerSheet();
    const tab = this.state.activeSectionTab || 'p1';
    if (tab === 'all') {
      const blocks = ['p1', 'p2', 'p3', 'p4']
        .map(k => this.renderAnswerSheetPartBlock(ex, k, wide, true))
        .filter(Boolean);
      return blocks.length
        ? `<div class="space-y-5">${blocks.join('<hr class="border-slate-200">')}</div>`
        : `<div class="p-4 text-center text-xs text-slate-400 italic">Đề thi này chưa có câu hỏi.</div>`;
    }
    return this.renderAnswerSheetPartBlock(ex, tab, wide, false);
  },

  renderAnswerSheetPartBlock(ex, partKey, wide = false, skipEmpty = false) {
    if (partKey === 'p1') {
      if (ex.part1.length === 0) return skipEmpty ? '' : `<div class="p-4 text-center text-xs text-slate-400 italic">Đề thi này không có câu hỏi Phần I.</div>`;
      return `
        <div class="space-y-2.5">
          <div class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center justify-between gap-2">
            <span>Phần I: Chọn 1 trong 4 đáp án (${ex.part1.length} câu)</span>
            ${wide ? `<span class="text-[11px] font-semibold text-indigo-600 normal-case">Chế độ dàn ngang điền nhanh</span>` : ''}
          </div>
          <div class="${wide ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2' : 'space-y-2.5'}">
            ${ex.part1.map(q => {
              const curAns = this.state.answers.part1[q.id];
              const st = this.getQuestionProgressState('p1', q.id);
              const vis = this.getRowVisualClasses('p1', st);
              return `
                <div id="row_p1_${q.id}" class="${vis.row}">
                  <div class="flex items-center gap-1.5 min-w-0">
                    <button type="button" id="flag_btn_p1_${q.id}" aria-pressed="${st.isFlagged ? 'true' : 'false'}" onclick="App.toggleFlag('p1', ${q.id})" class="${this.getFlagButtonClasses(st.isFlagged)}" title="${st.isFlagged ? 'Bỏ đánh dấu Câu ' + q.id : 'Đánh dấu xem lại Câu ' + q.id}">
                      <i class="${st.isFlagged ? 'fa-solid' : 'fa-regular'} fa-star text-xs"></i>
                    </button>
                    <div class="flex flex-col min-w-0">
                      <span class="font-bold text-xs text-slate-800 whitespace-nowrap">Câu ${q.id}</span>
                      <span id="row_status_p1_${q.id}" class="${vis.badge} w-fit mt-0.5">${st.label}</span>
                    </div>
                  </div>
                  <div class="flex gap-1 sm:gap-1.5 shrink-0">
                    ${['A', 'B', 'C', 'D'].map(opt => `
                      <button type="button" id="split_btn_p1_${q.id}_${opt}" onclick="App.selectPart1Answer(${q.id}, '${opt}')" 
                        class="w-9 h-9 rounded-xl font-extrabold text-xs border transition cursor-pointer ${curAns === opt ? 'bg-indigo-600 border-indigo-600 text-white shadow' : 'bg-white border-slate-300 text-slate-700 hover:bg-indigo-50'}">
                        ${opt}
                      </button>
                    `).join('')}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }

    if (partKey === 'p2') {
      if (ex.part2.length === 0) return skipEmpty ? '' : `<div class="p-4 text-center text-xs text-slate-400 italic">Đề thi này không có câu hỏi Phần II.</div>`;
      return `
        <div class="space-y-3">
          <div class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Phần II: Chọn Đúng hoặc Sai (${ex.part2.length} câu)</div>
          <div class="${wide ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3' : 'space-y-4'}">
            ${ex.part2.map(q => {
              const st = this.getQuestionProgressState('p2', q.id);
              const vis = this.getRowVisualClasses('p2', st);
              return `
              <div id="row_p2_${q.id}" class="${vis.row}">
                <div class="flex items-center justify-between gap-2">
                  <div class="flex items-center gap-1.5">
                    <button type="button" id="flag_btn_p2_${q.id}" aria-pressed="${st.isFlagged ? 'true' : 'false'}" onclick="App.toggleFlag('p2', ${q.id})" class="${this.getFlagButtonClasses(st.isFlagged)}" title="${st.isFlagged ? 'Bỏ đánh dấu Câu ' + q.id : 'Đánh dấu xem lại Câu ' + q.id}">
                      <i class="${st.isFlagged ? 'fa-solid' : 'fa-regular'} fa-star text-xs"></i>
                    </button>
                    <span class="font-bold text-xs text-slate-800">Câu ${q.id} (4 ý):</span>
                  </div>
                  <span id="row_status_p2_${q.id}" class="${vis.badge}">${st.label}</span>
                </div>
                <div class="${wide ? 'grid grid-cols-1 gap-1.5' : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-2'}">
                  ${['a', 'b', 'c', 'd'].map(sub => {
                    const val = this.state.answers.part2[q.id]?.[sub];
                    return `
                      <div class="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs">
                        <span class="font-mono font-bold text-slate-700">Ý ${sub})</span>
                        <div class="flex gap-1.5">
                          <button type="button" id="split_tf_${q.id}_${sub}_true" onclick="App.selectPart2Answer(${q.id}, '${sub}', true)" class="tf-btn px-2.5 text-xs font-bold border cursor-pointer ${val === true ? 'selected-true' : 'bg-slate-50 text-slate-600 border-slate-200'}">Đúng</button>
                          <button type="button" id="split_tf_${q.id}_${sub}_false" onclick="App.selectPart2Answer(${q.id}, '${sub}', false)" class="tf-btn px-2.5 text-xs font-bold border cursor-pointer ${val === false ? 'selected-false' : 'bg-slate-50 text-slate-600 border-slate-200'}">Sai</button>
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            `;
            }).join('')}
          </div>
        </div>
      `;
    }

    if (partKey === 'p3') {
      if (ex.part3.length === 0) return skipEmpty ? '' : `<div class="p-4 text-center text-xs text-slate-400 italic">Đề thi này không có câu hỏi Phần III.</div>`;
      const p3Boxes = this.getPart3BoxCount(ex);
      const boxIndices = Array.from({ length: p3Boxes }, (_, idx) => idx);
      const keypadHtml = `
        <div class="${wide ? 'bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2' : 'mt-4 pt-3.5 border-t border-slate-200 space-y-2'}">
          <div class="text-[11px] text-slate-500 font-semibold text-center">Bàn phím số nhanh (Nhập <strong class="font-mono">,</strong> hoặc <strong class="font-mono">.</strong> đều hiển thị <strong class="font-mono">,</strong>):</div>
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
              { k: ',', l: ',' },
              { k: '.', l: '.' },
              { k: '0', l: '0' },
              { k: '/', l: '/' },
              { k: 'C', l: 'C' }
            ].map(btn => `
              <button type="button" onclick="App.handleKeypadPress('${btn.k}')" class="math-key ${['backspace', 'C', '-', '/', '.', ','].includes(btn.k) ? 'math-key-action' : ''}">
                ${btn.l}
              </button>
            `).join('')}
          </div>
          <div class="max-w-xs mx-auto">
            <button type="button" onclick="App.handleKeypadPress('enter')" class="w-full py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5">
              <span>Chuyển sang câu tiếp theo</span>
              <i class="fa-solid fa-arrow-down text-[11px]"></i>
            </button>
          </div>
        </div>
      `;

      const inputsGridHtml = `
        <div class="${wide ? 'grid grid-cols-1 md:grid-cols-2 gap-2.5' : 'space-y-3'}">
          ${ex.part3.map(q => {
            const digits = this.state.answers.part3[q.id] || Array(p3Boxes).fill('');
            const st = this.getQuestionProgressState('p3', q.id);
            const vis = this.getRowVisualClasses('p3', st);
            return `
              <div id="row_p3_${q.id}" class="${vis.row}">
                <div class="flex items-center gap-1.5 min-w-0">
                  <button type="button" id="flag_btn_p3_${q.id}" aria-pressed="${st.isFlagged ? 'true' : 'false'}" onclick="App.toggleFlag('p3', ${q.id})" class="${this.getFlagButtonClasses(st.isFlagged)}" title="${st.isFlagged ? 'Bỏ đánh dấu Câu ' + q.id : 'Đánh dấu xem lại Câu ' + q.id}">
                    <i class="${st.isFlagged ? 'fa-solid' : 'fa-regular'} fa-star text-xs"></i>
                  </button>
                  <div class="flex flex-col min-w-0">
                    <span class="font-bold text-xs text-slate-800 whitespace-nowrap">Câu ${q.id}</span>
                    <span id="row_status_p3_${q.id}" class="${vis.badge} w-fit mt-0.5">${st.label}</span>
                  </div>
                </div>
                <div class="flex ${p3Boxes > 4 ? 'gap-1' : 'gap-1.5 sm:gap-2'} ml-auto sm:ml-0 shrink-0">
                  ${boxIndices.map(boxIdx => {
                    const dispDigit = this.formatShortAnsDisplay(digits[boxIdx] || '');
                    return `
                      <input type="text" inputmode="decimal" autocomplete="off"
                        id="split_box_${q.id}_${boxIdx}"
                        value="${dispDigit}"
                        onfocus="App.state.activePart3Target = { qId: ${q.id}, boxIdx: ${boxIdx} }"
                        onkeydown="App.handleBoxKeyDown(event, ${q.id}, ${boxIdx}, 'split_box_')"
                        oninput="App.handleBoxInput(event, ${q.id}, ${boxIdx}, 'split_box_')"
                        class="box-digit ${p3Boxes > 4 ? '!w-8 !h-11 !text-lg sm:!w-9 sm:!h-12' : ''} ${dispDigit ? 'box-digit-filled' : ''}">
                    `;
                  }).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;

      return `
        <div class="space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="text-xs font-bold text-slate-500 uppercase tracking-wider">Phần III: Trả lời ngắn (${ex.part3.length} câu)</div>
            <div class="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-2.5 py-1 flex items-center gap-1.5">
              <i class="fa-solid fa-circle-info text-amber-600 shrink-0"></i>
              <span>Nhập dấu <strong>,</strong> hay dấu <strong>.</strong> đều tự hiển thị dấu <strong>,</strong> (VD: <code class="font-mono font-bold">12,5</code>).</span>
            </div>
          </div>
          ${wide ? `
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
              <div class="lg:col-span-8">${inputsGridHtml}</div>
              <div class="lg:col-span-4">${keypadHtml}</div>
            </div>
          ` : `
            ${inputsGridHtml}
            ${keypadHtml}
          `}
        </div>
      `;
    }

    if (partKey === 'p4') {
      const p4List = Array.isArray(ex.part4) ? ex.part4 : [];
      if (p4List.length === 0) return skipEmpty ? '' : `<div class="p-4 text-center text-xs text-slate-400 italic">Đề thi này không có Phần IV (Tự luận).</div>`;
      return `
        <div class="space-y-3">
          <div class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Phần IV: Tự Luận (${p4List.length} câu • Nhập bài giải hoặc chụp ảnh giấy làm bài)</div>
          <div class="${wide ? 'grid grid-cols-1 lg:grid-cols-2 gap-3.5' : 'space-y-4'}">
            ${p4List.map(q => {
              const entry = (this.state.answers.part4 && this.state.answers.part4[q.id]) || { text: '', images: [] };
              const qMax = +GradingSystem.getQuestionMaxPoints(ex, 'part4', q).toFixed(2);
              const imgs = Array.isArray(entry.images) ? entry.images : [];
              const st = this.getQuestionProgressState('p4', q.id);
              const vis = this.getRowVisualClasses('p4', st);
              return `
                <div id="row_p4_${q.id}" data-drop-target="p4ImgInput_${q.id}" class="${vis.row}">
                  <div class="flex flex-wrap items-center justify-between gap-2">
                    <div class="flex items-center gap-1.5">
                      <button type="button" id="flag_btn_p4_${q.id}" aria-pressed="${st.isFlagged ? 'true' : 'false'}" onclick="App.toggleFlag('p4', ${q.id})" class="${this.getFlagButtonClasses(st.isFlagged)}" title="${st.isFlagged ? 'Bỏ đánh dấu Câu ' + q.id : 'Đánh dấu xem lại Câu ' + q.id}">
                        <i class="${st.isFlagged ? 'fa-solid' : 'fa-regular'} fa-star text-xs"></i>
                      </button>
                      <span class="font-extrabold text-xs text-slate-800">Câu ${q.id} (Tự luận):</span>
                    </div>
                    <div class="flex items-center gap-1.5">
                      <span id="row_status_p4_${q.id}" class="${vis.badge}">${st.label}</span>
                      <span class="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-mono font-bold text-[11px]">${qMax} điểm</span>
                    </div>
                  </div>
                  <textarea rows="3" placeholder="Trình bày lời giải tóm tắt hoặc ghi kết quả cuối cùng của Câu ${q.id}..." oninput="App.handlePart4TextInput(${q.id}, this.value)" class="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-800 focus:border-indigo-500 outline-none">${String(entry.text || '').replace(/</g, '&lt;')}</textarea>
                  <div class="flex flex-wrap items-center justify-between gap-2">
                    <input type="file" id="p4ImgInput_${q.id}" accept="image/*" multiple class="hidden" onchange="App.handlePart4ImageSelect(event, ${q.id})">
                    <button type="button" onclick="App.suppressAntiCheatTemporarily(90000); document.getElementById('p4ImgInput_${q.id}').click();" class="ui-btn px-3 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs">
                      <i class="fa-solid fa-camera"></i><span>Chụp / Kéo thả ảnh bài giải</span>
                    </button>
                    <span class="text-[11px] text-slate-400 font-mono">${imgs.length} ảnh đính kèm</span>
                  </div>
                  ${imgs.length > 0 ? `
                    <div class="grid grid-cols-3 gap-2 pt-1">
                      ${imgs.map((src, idx) => `
                        <div class="relative group rounded-xl overflow-hidden border border-slate-200 bg-white aspect-square">
                          <img src="${src}" alt="Bài làm câu ${q.id}" onclick="App.previewFullImage('${src}')" class="w-full h-full object-cover cursor-pointer">
                          <button type="button" onclick="App.removePart4Image(${q.id}, ${idx})" class="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-600 text-white text-[10px] flex items-center justify-center shadow cursor-pointer" title="Xóa ảnh">
                            <i class="fa-solid fa-xmark"></i>
                          </button>
                        </div>
                      `).join('')}
                    </div>
                  ` : ''}
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }
    return '';
  },

  handlePart4TextInput(qId, val) {
    if (!this.state.answers.part4) this.state.answers.part4 = {};
    if (!this.state.answers.part4[qId]) this.state.answers.part4[qId] = { text: '', images: [] };
    this.state.answers.part4[qId].text = val;
    this.refreshQuestionProgressDom('p4', qId);
    this.updateProgressUi();
  },

  async compressImageFile(file, maxWidth = 1200, quality = 0.72) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const scale = img.width > maxWidth ? maxWidth / img.width : 1;
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => resolve(ev.target.result);
        img.src = ev.target.result;
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  },

  async handlePart4ImageSelect(event, qId) {
    this._suppressLeaveUntil = Date.now() + 1500;
    const files = Array.from((event.target && event.target.files) || []);
    if (!files.length) return;
    if (!this.state.answers.part4) this.state.answers.part4 = {};
    if (!this.state.answers.part4[qId]) this.state.answers.part4[qId] = { text: '', images: [] };
    for (const f of files.slice(0, 4)) {
      const dataUrl = await this.compressImageFile(f);
      if (dataUrl) this.state.answers.part4[qId].images.push(dataUrl);
    }
    this.refreshQuestionProgressDom('p4', qId);
    this.updateProgressUi();
    const pane = document.getElementById('splitAnswerInputsContainer');
    if (pane && this.state.activeExam) pane.innerHTML = this.renderAnswerSheetInputs(this.state.activeExam);
  },

  removePart4Image(qId, imgIdx) {
    const entry = this.state.answers.part4 && this.state.answers.part4[qId];
    if (!entry || !Array.isArray(entry.images)) return;
    entry.images.splice(imgIdx, 1);
    this.refreshQuestionProgressDom('p4', qId);
    this.updateProgressUi();
    const pane = document.getElementById('splitAnswerInputsContainer');
    if (pane && this.state.activeExam) pane.innerHTML = this.renderAnswerSheetInputs(this.state.activeExam);
  },

  previewFullImage(src) {
    const old = document.getElementById('fullImagePreviewModal');
    if (old) old.remove();
    const modal = document.createElement('div');
    modal.id = 'fullImagePreviewModal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm';
    modal.style.zIndex = '98';
    modal.onclick = () => modal.remove();
    modal.innerHTML = `
      <div class="relative max-w-4xl max-h-[90vh] w-full flex flex-col items-center">
        <img src="${src}" alt="Ảnh phóng to" class="max-h-[84vh] max-w-full rounded-2xl shadow-2xl object-contain bg-white">
        <button type="button" class="mt-3 ui-btn bg-white text-slate-800 px-4">Đóng ảnh</button>
      </div>
    `;
    document.body.appendChild(modal);
  },

  handleBoxInput(event, qId, boxIdx, prefix = 'split_box_') {
    const p3Boxes = this.getPart3BoxCount(this.state.activeExam);
    if (!Array.isArray(this.state.answers.part3[qId]) || this.state.answers.part3[qId].length < p3Boxes) {
      const prev = Array.isArray(this.state.answers.part3[qId]) ? this.state.answers.part3[qId] : [];
      this.state.answers.part3[qId] = Array.from({ length: p3Boxes }, (_, i) => this.formatShortAnsDisplay(prev[i] || ''));
    }

    // Mọi dấu "." khi gõ hoặc dán đều tự chuyển sang hiển thị dấu ","
    const sanitize = (str) => String(str || '').replace(/[\u2212\u2013\u2014]/g, '-').replace(/\./g, ',').replace(/[^0-9,\-/]/g, '');
    const rawTarget = String(event.target.value || '');
    const cleanTarget = sanitize(rawTarget);
    const prevChar = this.formatShortAnsDisplay(this.state.answers.part3[qId][boxIdx] || '');

    // 1. Xóa ký tự trong ô hiện tại
    if (rawTarget === '') {
      this.state.answers.part3[qId][boxIdx] = '';
      event.target.value = '';
      event.target.classList.remove('box-digit-filled');
      this.refreshQuestionProgressDom('p3', qId);
      this.updateProgressUi();
      return;
    }

    // 2. Dán hoặc nhập chuỗi nhiều ký tự (VD: "12,5" hoặc "-0.5") -> tự đổi "." thành "," và rải sang các ô kế tiếp
    const insertedStr = typeof event.data === 'string' ? sanitize(event.data) : '';
    const isMultiPaste = event.inputType === 'insertFromPaste' || insertedStr.length > 1 || (prevChar === '' && cleanTarget.length > 1);
    if (isMultiPaste && cleanTarget.length > 1) {
      const seq = insertedStr.length > 1 ? insertedStr : cleanTarget;
      const startIdx = (seq.length > (p3Boxes - boxIdx) && seq.length <= p3Boxes) ? 0 : boxIdx;
      for (let i = 0; i < seq.length && (startIdx + i) < p3Boxes; i++) {
        const ch = seq[i];
        this.state.answers.part3[qId][startIdx + i] = ch;
        const inp = typeof document !== 'undefined' ? document.getElementById(`${prefix}${qId}_${startIdx + i}`) : null;
        if (inp) {
          inp.value = ch;
          inp.classList.add('box-digit-filled');
        }
      }
      const nextFocusIdx = Math.min(p3Boxes - 1, startIdx + seq.length);
      const nextEl = typeof document !== 'undefined' ? document.getElementById(`${prefix}${qId}_${nextFocusIdx}`) : null;
      if (nextEl) nextEl.focus();
      this.refreshQuestionProgressDom('p3', qId);
      this.updateProgressUi();
      return;
    }

    // 3. Gõ 1 ký tự (gõ "." hoặc "," đều hiển thị ",")
    let val = '';
    if (typeof event.data === 'string' && event.data.length > 0) {
      const typed = sanitize(event.data).slice(-1);
      if (!typed) {
        event.target.value = prevChar;
        return;
      }
      val = typed;
    } else {
      if (!cleanTarget) {
        event.target.value = prevChar;
        return;
      }
      val = cleanTarget.slice(-1);
    }

    event.target.value = val;
    this.state.answers.part3[qId][boxIdx] = val;

    if (val) {
      event.target.classList.add('box-digit-filled');
      if (boxIdx < p3Boxes - 1) {
        const nextInput = typeof document !== 'undefined' ? document.getElementById(`${prefix}${qId}_${boxIdx + 1}`) : null;
        if (nextInput) nextInput.focus();
      }
    } else {
      event.target.classList.remove('box-digit-filled');
    }

    this.refreshQuestionProgressDom('p3', qId);
    this.updateProgressUi();
  },

  handleBoxKeyDown(event, qId, boxIdx, prefix = 'split_box_') {
    const p3Boxes = this.getPart3BoxCount(this.state.activeExam);
    if (event.key === 'Backspace' && !event.target.value && boxIdx > 0) {
      const prevInput = document.getElementById(`${prefix}${qId}_${boxIdx - 1}`);
      if (prevInput) {
        prevInput.focus();
        prevInput.value = '';
        prevInput.classList.remove('box-digit-filled');
        if (this.state.answers.part3[qId]) this.state.answers.part3[qId][boxIdx - 1] = '';
        this.refreshQuestionProgressDom('p3', qId);
        this.updateProgressUi();
      }
    } else if (event.key === 'ArrowLeft' && boxIdx > 0) {
      event.preventDefault();
      document.getElementById(`${prefix}${qId}_${boxIdx - 1}`)?.focus();
    } else if (event.key === 'ArrowRight' && boxIdx < p3Boxes - 1) {
      event.preventDefault();
      document.getElementById(`${prefix}${qId}_${boxIdx + 1}`)?.focus();
    }
  },

  handleKeypadPress(key) {
    const p3Boxes = this.getPart3BoxCount(this.state.activeExam);
    const { qId, boxIdx } = this.state.activePart3Target || { qId: 1, boxIdx: 0 };
    if (!Array.isArray(this.state.answers.part3[qId]) || this.state.answers.part3[qId].length < p3Boxes) {
      const prev = Array.isArray(this.state.answers.part3[qId]) ? this.state.answers.part3[qId] : [];
      this.state.answers.part3[qId] = Array.from({ length: p3Boxes }, (_, i) => prev[i] || '');
    }

    const targetInput = typeof document !== 'undefined' ? document.getElementById(`split_box_${qId}_${boxIdx}`) : null;

    if (key === 'backspace') {
      this.state.answers.part3[qId][boxIdx] = '';
      if (targetInput) { targetInput.value = ''; targetInput.classList.remove('box-digit-filled'); }
      if (boxIdx > 0) {
        this.state.activePart3Target.boxIdx = boxIdx - 1;
        const prev = typeof document !== 'undefined' ? document.getElementById(`split_box_${qId}_${boxIdx - 1}`) : null;
        if (prev) prev.focus();
      }
    } else if (key === 'C') {
      this.state.answers.part3[qId] = Array(p3Boxes).fill('');
      for (let b = 0; b < p3Boxes; b++) {
        const inp = typeof document !== 'undefined' ? document.getElementById(`split_box_${qId}_${b}`) : null;
        if (inp) { inp.value = ''; inp.classList.remove('box-digit-filled'); }
      }
      this.state.activePart3Target.boxIdx = 0;
      const first = typeof document !== 'undefined' ? document.getElementById(`split_box_${qId}_0`) : null;
      if (first) first.focus();
    } else if (key === 'enter') {
      const maxP3 = this.state.activeExam?.part3?.length || 6;
      if (qId < maxP3) {
        this.state.activePart3Target = { qId: qId + 1, boxIdx: 0 };
        const next = typeof document !== 'undefined' ? document.getElementById(`split_box_${qId + 1}_0`) : null;
        if (next) next.focus();
      }
    } else {
      const normKey = key === '.' ? ',' : key;
      this.state.answers.part3[qId][boxIdx] = normKey;
      if (targetInput) { targetInput.value = normKey; targetInput.classList.add('box-digit-filled'); }
      if (boxIdx < p3Boxes - 1) {
        this.state.activePart3Target.boxIdx = boxIdx + 1;
        const next = typeof document !== 'undefined' ? document.getElementById(`split_box_${qId}_${boxIdx + 1}`) : null;
        if (next) next.focus();
      }
    }

    this.refreshQuestionProgressDom('p3', qId);
    this.updateProgressUi();
  },

  selectPart1Answer(qId, choice) {
    const nextChoice = this.state.answers.part1[qId] === choice ? '' : choice;
    if (nextChoice) {
      this.state.answers.part1[qId] = nextChoice;
    } else {
      delete this.state.answers.part1[qId];
    }
    this.updatePart1AnswerUI(qId, nextChoice);
    this.refreshQuestionProgressDom('p1', qId);
    this.updateProgressUi();
  },

  updatePart1AnswerUI(qId, choice) {
    ['A', 'B', 'C', 'D'].forEach(opt => {
      const btn = typeof document !== 'undefined' ? document.getElementById(`split_btn_p1_${qId}_${opt}`) : null;
      if (btn) {
        if (opt === choice) {
          btn.className = 'w-9 h-9 rounded-xl font-extrabold text-xs border transition cursor-pointer bg-indigo-600 border-indigo-600 text-white shadow';
        } else {
          btn.className = 'w-9 h-9 rounded-xl font-extrabold text-xs border transition cursor-pointer bg-white border-slate-300 text-slate-700 hover:bg-indigo-50';
        }
      }
    });
  },

  selectPart2Answer(qId, subId, boolVal) {
    if (!this.state.answers.part2[qId]) this.state.answers.part2[qId] = {};
    const cur = this.state.answers.part2[qId][subId];
    const nextVal = cur === boolVal ? undefined : boolVal;
    if (nextVal === undefined) {
      delete this.state.answers.part2[qId][subId];
      if (Object.keys(this.state.answers.part2[qId]).length === 0) {
        delete this.state.answers.part2[qId];
      }
    } else {
      this.state.answers.part2[qId][subId] = nextVal;
    }
    this.updatePart2AnswerUI(qId, subId, nextVal);
    this.refreshQuestionProgressDom('p2', qId);
    this.updateProgressUi();
  },

  updatePart2AnswerUI(qId, subId, boolVal) {
    if (typeof document === 'undefined') return;
    const sTrue = document.getElementById(`split_tf_${qId}_${subId}_true`);
    const sFalse = document.getElementById(`split_tf_${qId}_${subId}_false`);
    if (sTrue && sFalse) {
      if (boolVal === true) {
        sTrue.className = 'tf-btn px-2.5 text-xs font-bold border cursor-pointer selected-true';
        sFalse.className = 'tf-btn px-2.5 text-xs font-bold border cursor-pointer bg-slate-50 text-slate-600 border-slate-200';
      } else if (boolVal === false) {
        sFalse.className = 'tf-btn px-2.5 text-xs font-bold border cursor-pointer selected-false';
        sTrue.className = 'tf-btn px-2.5 text-xs font-bold border cursor-pointer bg-slate-50 text-slate-600 border-slate-200';
      } else {
        sTrue.className = 'tf-btn px-2.5 text-xs font-bold border cursor-pointer bg-slate-50 text-slate-600 border-slate-200';
        sFalse.className = 'tf-btn px-2.5 text-xs font-bold border cursor-pointer bg-slate-50 text-slate-600 border-slate-200';
      }
    }
  },

  refreshQuestionProgressDom(part, qId) {
    if (typeof document === 'undefined') return;
    const st = this.getQuestionProgressState(part, qId);
    const vis = this.getRowVisualClasses(part, st);

    const rowEl = document.getElementById(`row_${part}_${qId}`);
    if (rowEl) rowEl.className = vis.row;

    const statusEl = document.getElementById(`row_status_${part}_${qId}`);
    if (statusEl) {
      statusEl.className = part === 'p1' || part === 'p3' ? `${vis.badge} w-fit mt-0.5` : vis.badge;
      statusEl.textContent = st.label;
    }

    const flagBtn = document.getElementById(`flag_btn_${part}_${qId}`);
    if (flagBtn) {
      flagBtn.className = this.getFlagButtonClasses(st.isFlagged);
      flagBtn.setAttribute('aria-pressed', st.isFlagged ? 'true' : 'false');
      flagBtn.title = st.isFlagged ? `Bỏ đánh dấu Câu ${qId}` : `Đánh dấu xem lại Câu ${qId}`;
      flagBtn.innerHTML = `<i class="${st.isFlagged ? 'fa-solid' : 'fa-regular'} fa-star text-xs"></i>`;
    }

    const qmatEl = document.getElementById(`qmat_${part}_${qId}`);
    if (qmatEl) {
      qmatEl.classList.remove('answered', 'unanswered', 'partial', 'flagged');
      qmatEl.classList.add(st.status);
      if (st.isFlagged) qmatEl.classList.add('flagged');
    }
  },

  updatePaletteMatrixButton(part, qId) {
    this.refreshQuestionProgressDom(part, qId);
  },

  updateProgressUi() {
    if (typeof document === 'undefined') return;
    const p = this.calculateProgress();
    const remainCount = p.total - p.answered;

    const bar = document.querySelector('.exam-progress-bar');
    if (bar) bar.style.width = `${p.percentage}%`;

    document.querySelectorAll('.exam-header-progress-text').forEach(el => {
      el.textContent = `Quá trình: ${p.answered}/${p.total}`;
    });
    document.querySelectorAll('.exam-sheet-done-text').forEach(el => {
      el.textContent = `Đã làm: ${p.answered}/${p.total} câu (${p.percentage}%)`;
    });
    document.querySelectorAll('.exam-sheet-remain-text').forEach(el => {
      el.textContent = `• ${remainCount > 0 ? `Chưa xong: ${remainCount}` : 'Đã chọn đủ!'}`;
      el.className = `text-[11px] font-semibold ${remainCount > 0 ? 'text-amber-700' : 'text-emerald-700'} ml-1 exam-sheet-remain-text`;
    });
    document.querySelectorAll('.exam-progress-counter').forEach(el => {
      el.textContent = `Đã làm: ${p.answered}/${p.total} câu (${p.percentage}%)`;
    });
    document.querySelectorAll('.exam-mobile-ans-short').forEach(el => {
      el.textContent = `${p.answered}/${p.total}`;
    });
    document.querySelectorAll('.exam-mobile-drawer-count').forEach(el => {
      el.textContent = `${p.answered}/${p.total} câu`;
    });

    // Cập nhật tiến độ ngay trên nhãn các tab Tất cả / P.I / P.II / P.III / P.IV
    const tabMap = {
      all: `Tất cả (${p.answered}/${p.total})`,
      p1: `P.I (${p.parts.p1.answered}/${p.parts.p1.total})`,
      p2: `P.II (${p.parts.p2.answered}/${p.parts.p2.total})`,
      p3: `P.III (${p.parts.p3.answered}/${p.parts.p3.total})`,
      p4: `P.IV (${p.parts.p4.answered}/${p.parts.p4.total})`
    };
    Object.keys(tabMap).forEach(k => {
      const btn = document.getElementById(`sectionTabBtn_${k}`);
      if (btn) btn.textContent = tabMap[k];
    });

    // Nếu bảng Quá trình làm bài đang mở thì cập nhật luôn nội dung
    const drawer = document.getElementById('mobileDrawer');
    const drawerBody = document.getElementById('examProgressDrawerBody');
    if (drawer && !drawer.classList.contains('hidden') && drawerBody && this.state.activeExam) {
      drawerBody.innerHTML = this.renderPaletteMatrix(this.state.activeExam);
    }
  },

  confirmSubmitExam() {
    const p = this.calculateProgress();
    const remain = p.total - p.answered;
    const detailWarn = [];
    if (p.unanswered > 0) detailWarn.push(`${p.unanswered} câu chưa tích chọn`);
    if (p.partial > 0) detailWarn.push(`${p.partial} câu Phần II mới chọn dở`);
    this.confirmDialog(
      `Bạn đã hoàn thành đủ ${p.answered}/${p.total} câu hỏi${detailWarn.length ? ` (còn ${detailWarn.join(', ')})` : ''}.\nBạn có chắc chắn muốn nộp bài ngay bây giờ?`,
      () => this.submitExam(),
      {
        type: remain > 0 ? 'warning' : 'success',
        title: 'Xác nhận nộp bài thi?',
        icon: 'fa-paper-plane',
        confirmText: 'Nộp bài ngay',
        cancelText: 'Kiểm tra lại'
      }
    );
  },

  submitExam(force = false) {
    this.clearIntervalTimer();
    this.resetExamMonitorState();
    document.getElementById('antiCheatModal')?.remove();

    // Khôi phục cuộn trang bình thường
    document.body.classList.remove('in-exam');
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';

    const formattedP3Answers = {};
    Object.keys(this.state.answers.part3).forEach(k => {
      const arr = this.state.answers.part3[k];
      formattedP3Answers[k] = this.formatShortAnsDisplay(Array.isArray(arr) ? arr.join('').trim() : String(arr).trim());
    });

    const evaluatedAnswers = {
      ...this.state.answers,
      part3: formattedP3Answers
    };

    const result = GradingSystem.grade(evaluatedAnswers, this.state.activeExam);
    const duration = Math.floor((new Date() - this.state.examStartTime) / 1000);

    const prevEarnedPoints = this.getStudentRewardStats(this.state.currentUser.studentId).earnedPoints;
    const safeStuSuffix = String(this.state.currentUser.studentId || 'HS').replace(/[^A-Za-z0-9]/g, '');
    const nowIso = new Date().toISOString();
    const submission = {
      id: `SUB-${Date.now()}-${safeStuSuffix}`,
      examId: this.state.activeExam.id,
      examTitle: this.state.activeExam.title,
      studentId: this.state.currentUser.studentId,
      studentName: this.state.currentUser.fullName,
      submittedAt: nowIso,
      updatedAt: nowIso,
      durationTakenSeconds: duration,
      tabSwitches: this.state.tabSwitchesCount,
      screenshotCount: this.state.screenshotCount || 0,
      violationLogs: Array.isArray(this.state.violationLogs) ? [...this.state.violationLogs] : [],
      attemptNumber: this.state.currentAttemptNumber || 1,
      scoreResult: result,
      answers: JSON.parse(JSON.stringify(evaluatedAnswers))
    };

    this.state.submissions.unshift(submission);
    const updatedRewardStats = this.getStudentRewardStats(this.state.currentUser.studentId);
    const gainedPoints = Math.max(0, updatedRewardStats.earnedPoints - prevEarnedPoints);
    this.saveData();
    this.pushStudentSubmissionToCloud(submission);

    this.state.activeExam = null;
    this.render();

    if (typeof confetti === 'function' && (result.percentage ?? 0) >= 65) {
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 }
      });
    }

    this.showScoreModal(submission, gainedPoints, updatedRewardStats.availablePoints);
  },

  showScoreModal(sub, gainedPoints = 0, availablePoints = null) {
    const res = sub.scoreResult;
    const availPts = availablePoints !== null ? availablePoints : this.getStudentRewardStats(sub.studentId).availablePoints;
    const modal = document.createElement('div');
    modal.id = 'scoreModal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in';
    modal.innerHTML = `
      <div class="bg-white rounded-3xl p-5 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-5">
        <div class="w-20 h-20 mx-auto rounded-full ${(res.percentage ?? 0) >= 80 ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'} flex items-center justify-center text-4xl shadow-inner">
          <i class="fa-solid fa-trophy"></i>
        </div>

        <div>
          <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Kết quả bài thi</span>
          <h3 class="text-xl font-extrabold text-slate-900">${sub.examTitle}</h3>
          <p class="text-xs text-slate-500 mt-1">
            Giám sát phòng thi:
            <strong class="${(sub.tabSwitches || 0) > 0 || (sub.screenshotCount || 0) > 0 ? 'text-red-600' : 'text-emerald-600'}">
              ${sub.tabSwitches || 0} lần vi phạm${(sub.screenshotCount || 0) > 0 ? ` (${sub.screenshotCount} lần chụp màn hình)` : ''}
            </strong>
          </p>
        </div>

        <div class="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2">
          <div class="text-4xl font-extrabold text-indigo-600 font-mono">${res.totalScore} <span class="text-base text-slate-400 font-normal">/ ${res.maxTotal || 10}</span></div>
          <div class="text-xs font-bold uppercase ${(res.percentage ?? 0) >= 80 ? 'text-emerald-600' : 'text-indigo-600'}">Xếp loại: ${res.rank}</div>
          <div class="pt-2 border-t border-slate-200/80 flex items-center justify-center gap-2 flex-wrap">
            <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold ${gainedPoints > 0 ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-slate-100 text-slate-700 border border-slate-200'}">
              <i class="fa-solid fa-star text-amber-500"></i>
              <span>${gainedPoints > 0 ? `+${gainedPoints} điểm thưởng mới` : `Tổng khả dụng: ${availPts} điểm`}</span>
            </span>
            <button type="button" onclick="document.getElementById('scoreModal')?.remove(); App.setStudentMainTab('rewards');" class="text-xs font-extrabold text-amber-700 hover:text-amber-900 underline inline-flex items-center gap-1 cursor-pointer">
              <i class="fa-solid fa-gift text-[11px]"></i>
              <span>Đổi phần thưởng (${availPts} điểm)</span>
            </button>
          </div>
        </div>

        <div class="grid ${res.part4 && res.part4.totalQuestions > 0 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'} gap-2 text-xs">
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
          ${res.part4 && res.part4.totalQuestions > 0 ? `
            <div class="bg-purple-50/60 p-2.5 rounded-xl border border-purple-100">
              <div class="text-slate-500 font-medium">Phần IV (TL)</div>
              <div class="font-bold text-purple-700 text-sm mt-0.5">${res.part4.pendingManual ? 'Chờ chấm' : `${res.part4.score} / ${res.part4.maxScore}đ`}</div>
            </div>
          ` : ''}
        </div>
        ${res.part4 && res.part4.totalQuestions > 0 && res.part4.pendingManual ? `
          <div class="text-[11px] text-purple-700 bg-purple-50 border border-purple-200 rounded-xl px-3 py-2">
            <i class="fa-solid fa-pen-fancy mr-1"></i>Phần IV (Tự luận — tối đa ${res.part4.maxScore}đ) đã lưu bài làm và sẽ cộng vào tổng điểm sau khi Giáo viên chấm.
          </div>
        ` : ''}

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

  toggleSubmissionAnswerCollapse() {
    this.state.collapseAnswerSheetInDetail = !this.state.collapseAnswerSheetInDetail;
    const isCollapsed = Boolean(this.state.collapseAnswerSheetInDetail);
    const body = typeof document !== 'undefined' ? document.getElementById('submissionAnswerBody') : null;
    const hint = typeof document !== 'undefined' ? document.getElementById('collapsedAnswerHintBar') : null;
    if (body) body.classList.toggle('hidden', isCollapsed);
    if (hint) hint.classList.toggle('hidden', !isCollapsed);
    if (typeof document !== 'undefined') {
      document.querySelectorAll('.toggle-sub-answer-btn').forEach(btn => {
        btn.innerHTML = isCollapsed
          ? '<i class="fa-solid fa-chevron-down"></i><span>Mở rộng bảng đáp án</span>'
          : '<i class="fa-solid fa-chevron-up"></i><span>Thu gọn bảng đáp án</span>';
      });
    }
  },

  setDetailAnswerFilter(filter) {
    this.state.detailAnswerFilter = filter || 'all';
    if (this.state.collapseAnswerSheetInDetail) {
      this.state.collapseAnswerSheetInDetail = false;
      const body = typeof document !== 'undefined' ? document.getElementById('submissionAnswerBody') : null;
      const hint = typeof document !== 'undefined' ? document.getElementById('collapsedAnswerHintBar') : null;
      if (body) body.classList.remove('hidden');
      if (hint) hint.classList.add('hidden');
      if (typeof document !== 'undefined') {
        document.querySelectorAll('.toggle-sub-answer-btn').forEach(btn => {
          btn.innerHTML = '<i class="fa-solid fa-chevron-up"></i><span>Thu gọn bảng đáp án</span>';
        });
      }
    }

    const sub = this.state.submissions.find(s => s.id === this.state.currentDetailSubId);
    if (!sub) return;
    const exam = this.state.exams.find(e => e.id === sub.examId) || SAMPLE_EXAM_2027;
    const res = sub.scoreResult || GradingSystem.grade(sub.answers || {}, exam);
    const isStudent = this.state.currentUser && this.state.currentUser.role === 'student';
    const canViewAnswers = !isStudent || (exam.allow_view_answers !== false && (this.state.settings && this.state.settings.allowStudentViewAnswers !== false));

    const inner = typeof document !== 'undefined' ? document.getElementById('submissionAnswerBodyInner') : null;
    if (inner) {
      inner.innerHTML = this.renderSubmissionAnswerSheetBody(exam, sub, res, canViewAnswers, isStudent);
    }
    ['all', 'wrong', 'correct'].forEach(f => {
      const btn = typeof document !== 'undefined' ? document.getElementById(`detailFilterBtn_${f}`) : null;
      if (btn) {
        btn.className = `px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${f === this.state.detailAnswerFilter ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'}`;
      }
    });
  },

  scrollToSolutionPdf() {
    const pdfSec = typeof document !== 'undefined' ? document.getElementById('submissionSolutionPdfSection') : null;
    if (pdfSec) {
      pdfSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  },

  renderSubmissionAnswerSheetBody(exam, sub, res, canViewAnswers, isStudent) {
    const filter = canViewAnswers ? (this.state.detailAnswerFilter || 'all') : 'all';
    const p4List = Array.isArray(exam.part4) ? exam.part4 : [];

    const p1Items = exam.part1.filter(q => {
      if (filter === 'all') return true;
      const isOk = Boolean((res.part1.details[q.id] || {}).isCorrect);
      return filter === 'correct' ? isOk : !isOk;
    });

    const p2Items = exam.part2.filter(q => {
      if (filter === 'all') return true;
      const det = res.part2.details[q.id] || { correctStatementsCount: 0 };
      const isFullOk = det.correctStatementsCount === 4;
      return filter === 'correct' ? isFullOk : !isFullOk;
    });

    const p3Items = exam.part3.filter(q => {
      if (filter === 'all') return true;
      const isOk = Boolean((res.part3.details[q.id] || {}).isCorrect);
      return filter === 'correct' ? isOk : !isOk;
    });

    const p4Items = p4List.filter(q => {
      if (filter === 'all') return true;
      const qMax = +GradingSystem.getQuestionMaxPoints(exam, 'part4', q).toFixed(2);
      const curManual = sub.answers && sub.answers.part4Scores && sub.answers.part4Scores[q.id];
      const isFullOk = GradingSystem.hasNum(curManual) && Number(curManual) >= qMax;
      return filter === 'correct' ? isFullOk : !isFullOk;
    });

    const totalVisible = p1Items.length + p2Items.length + p3Items.length + p4Items.length;
    if (totalVisible === 0) {
      return `
        <div class="p-6 text-center rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 font-semibold">
          ${filter === 'wrong' ? 'Xuất sắc! Không có câu sai hoặc bỏ trống nào.' : 'Không có câu hỏi nào khớp với bộ lọc đã chọn.'}
        </div>
      `;
    }

    return `
      <div class="space-y-4">
        ${p1Items.length > 0 ? `
        <!-- Phần I: Dạng lưới ngang gọn gàng -->
        <div class="space-y-2">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h4 class="font-bold text-xs sm:text-sm text-indigo-900 flex items-center">
              <span class="w-5 h-5 rounded-md bg-indigo-100 text-indigo-700 inline-flex items-center justify-center mr-1.5 text-[11px] font-extrabold">I</span>
              Phần I: Trắc nghiệm 4 lựa chọn
            </h4>
            <span class="text-[11px] bg-indigo-50 text-indigo-700 font-bold px-2.5 py-0.5 rounded-full border border-indigo-100">
              ${res.part1.score}/${res.part1.maxScore}đ (${res.part1.correctCount}/${exam.part1.length} câu đúng)
            </span>
          </div>
          <div class="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-9 lg:grid-cols-12 gap-1.5 font-mono">
            ${p1Items.map(q => {
              const det = res.part1.details[q.id] || {};
              const userChoice = det.userAnswer || '';
              const isCorrect = Boolean(det.isCorrect);
              const pts = +(det.scoreEarned || 0).toFixed(2);
              const cardCls = canViewAnswers
                ? (isCorrect ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200')
                : 'bg-slate-50 border-slate-200';
              return `
                <div class="p-2 rounded-xl border ${cardCls} flex flex-col justify-between">
                  <div class="flex items-center justify-between text-[10px]">
                    <span class="font-extrabold text-slate-600">C${q.id}</span>
                    ${canViewAnswers ? `
                      <span class="font-bold ${isCorrect ? 'text-emerald-700' : 'text-rose-600'}">
                        <i class="fa-solid ${isCorrect ? 'fa-check' : 'fa-xmark'}"></i>${isCorrect ? `+${pts}` : '0'}
                      </span>
                    ` : ''}
                  </div>
                  ${canViewAnswers ? (
                    isCorrect ? `
                      <div class="mt-1 text-center font-extrabold text-sm text-emerald-700">${userChoice}</div>
                    ` : `
                      <div class="mt-1 flex items-center justify-center gap-1 font-extrabold text-xs">
                        <span class="${userChoice ? 'text-rose-600 line-through' : 'text-slate-400 italic font-sans text-[10px]'}">${userChoice || 'Trống'}</span>
                        <i class="fa-solid fa-arrow-right text-[9px] text-slate-400"></i>
                        <span class="text-emerald-700 text-sm">${q.correct_answer}</span>
                      </div>
                    `
                  ) : `
                    <div class="mt-1 text-center font-extrabold ${userChoice ? 'text-indigo-700 text-sm' : 'text-slate-400 italic font-sans text-[10px]'}">${userChoice || 'Trống'}</div>
                  `}
                </div>
              `;
            }).join('')}
          </div>
        </div>
        ` : ''}

        ${p2Items.length > 0 ? `
        <!-- Phần II: Trắc nghiệm Đúng/Sai dạng thẻ ngang -->
        <div class="space-y-2 pt-2 border-t border-slate-100">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h4 class="font-bold text-xs sm:text-sm text-indigo-900 flex items-center">
              <span class="w-5 h-5 rounded-md bg-emerald-100 text-emerald-700 inline-flex items-center justify-center mr-1.5 text-[11px] font-extrabold">II</span>
              Phần II: Trắc nghiệm Đúng / Sai
            </h4>
            <span class="text-[11px] bg-emerald-50 text-emerald-700 font-bold px-2.5 py-0.5 rounded-full border border-emerald-100">
              ${res.part2.score}/${res.part2.maxScore}đ
            </span>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5">
            ${p2Items.map(q => {
              const qAns = (sub.answers && sub.answers.part2 && sub.answers.part2[q.id]) || {};
              const stList = q.statements || q.items || [];
              const det = res.part2.details[q.id] || { correctStatementsCount: 0, scoreEarned: 0 };
              const earned = +(det.scoreEarned || 0).toFixed(2);
              return `
                <div class="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <div class="flex items-center justify-between font-bold text-slate-800">
                    <span>Câu ${q.id}</span>
                    <span class="text-[11px] text-indigo-700 font-mono">Đúng ${det.correctStatementsCount}/4 ý (+${earned}đ)</span>
                  </div>
                  <div class="grid grid-cols-4 gap-1 font-mono">
                    ${stList.map(st => {
                      const subId = st.sub_id || st.key;
                      const userVal = qAns[subId];
                      const isMatch = userVal === st.correct;
                      return `
                        <div class="py-1.5 px-1 rounded-lg border text-center ${canViewAnswers ? (isMatch ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900') : 'bg-white border-slate-200 text-slate-800'}">
                          <div class="font-bold text-[11px]">${subId}) ${userVal === true ? 'Đ' : (userVal === false ? 'S' : '-')}</div>
                          ${canViewAnswers ? `<div class="text-[9px] text-slate-500 font-sans mt-0.5">ĐA: <strong>${st.correct ? 'Đ' : 'S'}</strong></div>` : ''}
                        </div>
                      `;
                    }).join('')}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
        ` : ''}

        ${p3Items.length > 0 ? `
        <!-- Phần III: Trả lời ngắn dạng ngang -->
        <div class="space-y-2 pt-2 border-t border-slate-100">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h4 class="font-bold text-xs sm:text-sm text-indigo-900 flex items-center">
              <span class="w-5 h-5 rounded-md bg-amber-100 text-amber-700 inline-flex items-center justify-center mr-1.5 text-[11px] font-extrabold">III</span>
              Phần III: Trả lời ngắn
            </h4>
            <span class="text-[11px] bg-amber-50 text-amber-700 font-bold px-2.5 py-0.5 rounded-full border border-amber-100">
              ${res.part3.score}/${res.part3.maxScore}đ (${res.part3.correctCount}/${exam.part3.length} câu đúng)
            </span>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 font-mono">
            ${p3Items.map(q => {
              const det = res.part3.details[q.id] || {};
              const userVal = this.formatShortAnsDisplay(det.userAnswer || '');
              const corrVal = this.formatShortAnsDisplay(q.correct_answer || '');
              const isMatch = Boolean(det.isCorrect);
              const pts = +(det.scoreEarned || 0).toFixed(2);
              const cardCls = canViewAnswers
                ? (isMatch ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200')
                : 'bg-slate-50 border-slate-200';
              return `
                <div class="p-2.5 rounded-xl border ${cardCls} text-xs space-y-1">
                  <div class="flex items-center justify-between">
                    <span class="font-extrabold text-slate-700">Câu ${q.id}</span>
                    ${canViewAnswers ? `
                      <span class="text-[11px] font-bold ${isMatch ? 'text-emerald-700' : 'text-rose-600'}">
                        <i class="fa-solid ${isMatch ? 'fa-check' : 'fa-xmark'}"></i> ${isMatch ? `+${pts}đ` : '0đ'}
                      </span>
                    ` : ''}
                  </div>
                  <div class="text-[11px] font-sans text-slate-600 flex items-center justify-between gap-1">
                    <span>Bạn điền:</span>
                    <strong class="font-mono ${userVal ? (canViewAnswers ? (isMatch ? 'text-emerald-700' : 'text-rose-600') : 'text-indigo-700') : 'text-slate-400 italic font-sans'}">${userVal || 'Trống'}</strong>
                  </div>
                  ${canViewAnswers ? `
                    <div class="text-[11px] font-sans text-slate-600 flex items-center justify-between gap-1 border-t border-slate-200/60 pt-1">
                      <span>Đáp án:</span>
                      <strong class="font-mono text-emerald-700">${corrVal}</strong>
                    </div>
                  ` : ''}
                </div>
              `;
            }).join('')}
          </div>
        </div>
        ` : ''}

        ${p4Items.length > 0 ? `
        <!-- Phần IV: Tự luận dạng ngang 2 cột -->
        <div class="space-y-2.5 pt-2 border-t border-slate-100">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h4 class="font-bold text-xs sm:text-sm text-purple-900 flex items-center">
              <span class="w-5 h-5 rounded-md bg-purple-100 text-purple-700 inline-flex items-center justify-center mr-1.5 text-[11px] font-extrabold">IV</span>
              Phần IV: Tự luận (${p4List.length} câu)
            </h4>
            <span class="text-[11px] ${res.part4.pendingManual ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-purple-50 text-purple-700 border border-purple-100'} font-bold px-2.5 py-0.5 rounded-full">
              ${res.part4.pendingManual ? `Chờ chấm (${res.part4.gradedCount}/${p4List.length} câu) • Tối đa ${res.part4.maxScore}đ` : `${res.part4.score}/${res.part4.maxScore}đ`}
            </span>
          </div>
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
            ${p4Items.map(q => {
              const rawEntry = (sub.answers && sub.answers.part4 && sub.answers.part4[q.id]) || {};
              const userTxt = typeof rawEntry === 'object' ? (rawEntry.text || '') : String(rawEntry || '');
              const imgs = typeof rawEntry === 'object' && Array.isArray(rawEntry.images) ? rawEntry.images : [];
              const qMax = +GradingSystem.getQuestionMaxPoints(exam, 'part4', q).toFixed(2);
              const curManual = sub.answers && sub.answers.part4Scores && sub.answers.part4Scores[q.id];
              const hasGraded = GradingSystem.hasNum(curManual);
              return `
                <div class="p-3.5 bg-purple-50 rounded-xl border border-purple-100 space-y-2.5 text-xs">
                  <div class="flex items-center justify-between font-bold text-slate-800">
                    <span>Câu ${q.id} (Tối đa ${qMax}đ):</span>
                    <span class="font-mono ${hasGraded ? 'text-purple-700' : 'text-amber-600'}">${hasGraded ? `+${+Number(curManual).toFixed(2)} / ${qMax}đ` : 'Chờ Giáo viên chấm'}</span>
                  </div>
                  <div class="p-2.5 rounded-lg bg-white border border-slate-200 text-slate-700 whitespace-pre-wrap">${userTxt ? userTxt.replace(/</g, '&lt;') : '<span class="italic text-slate-400">Học sinh không nhập văn bản</span>'}</div>
                  ${imgs.length > 0 ? `
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      ${imgs.map(src => `
                        <img src="${src}" alt="Ảnh bài làm" onclick="App.previewFullImage('${src}')" class="w-full h-28 object-cover rounded-lg border border-slate-200 cursor-pointer hover:opacity-90">
                      `).join('')}
                    </div>
                  ` : ''}
                  ${canViewAnswers && q.correct_answer ? `
                    <div class="text-[11px] bg-emerald-50 border border-emerald-200 text-emerald-800 px-2.5 py-1.5 rounded-lg">
                      <strong>Đáp số / Gợi ý chấm:</strong> ${String(q.correct_answer).replace(/</g, '&lt;')}
                    </div>
                  ` : ''}
                  ${!isStudent ? `
                    <div class="pt-2 border-t border-purple-200/70 flex flex-wrap items-center justify-between gap-2">
                      <div class="flex items-center gap-1.5">
                        <label class="font-bold text-purple-900">Chấm điểm:</label>
                        <input type="number" step="0.05" min="0" max="${qMax}" id="manualP4Score_${q.id}" value="${hasGraded ? curManual : ''}" placeholder="0 - ${qMax}" class="w-24 px-2.5 py-1 rounded-lg border border-purple-300 bg-white font-mono font-bold text-purple-800 text-center">
                        <span class="text-slate-500 font-mono">/ ${qMax}đ</span>
                      </div>
                      <div class="flex items-center gap-1">
                        <button type="button" onclick="document.getElementById('manualP4Score_${q.id}').value='0'" class="px-2 py-1 rounded-md bg-white border border-slate-200 text-slate-600 font-bold hover:bg-slate-100 cursor-pointer">0đ</button>
                        <button type="button" onclick="document.getElementById('manualP4Score_${q.id}').value='${+(qMax * 0.5).toFixed(2)}'" class="px-2 py-1 rounded-md bg-white border border-purple-200 text-purple-700 font-bold hover:bg-purple-50 cursor-pointer">50%</button>
                        <button type="button" onclick="document.getElementById('manualP4Score_${q.id}').value='${qMax}'" class="px-2 py-1 rounded-md bg-purple-600 text-white font-bold hover:bg-purple-700 cursor-pointer">Đủ (${qMax}đ)</button>
                      </div>
                    </div>
                  ` : ''}
                </div>
              `;
            }).join('')}
          </div>
          ${!isStudent ? `
            <div class="pt-1 flex justify-end">
              <button type="button" onclick="App.saveManualPart4Grades('${sub.id}')" class="ui-btn bg-purple-600 hover:bg-purple-700 text-white px-4 shadow-sm">
                <i class="fa-solid fa-floppy-disk"></i><span>Lưu Điểm Tự Luận &amp; Cập Nhật Tổng Điểm</span>
              </button>
            </div>
          ` : ''}
        </div>
        ` : ''}
      </div>
    `;
  },

  async viewSubmissionDetail(subId) {
    const sub = this.state.submissions.find(s => s.id === subId);
    if (!sub) return;
    this.state.currentDetailSubId = subId;

    // Khôi phục cuộn trang
    document.body.classList.remove('in-exam');
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';

    const exam = this.state.exams.find(e => e.id === sub.examId) || SAMPLE_EXAM_2027;
    const res = GradingSystem.grade(sub.answers || {}, exam);
    sub.scoreResult = res;
    const isStudent = this.state.currentUser && this.state.currentUser.role === 'student';
    const canViewAnswers = !isStudent || (exam.allow_view_answers !== false && (this.state.settings && this.state.settings.allowStudentViewAnswers !== false));

    const solPdfUrl = exam.solution_pdf_url
      ? (await this.resolvePdfSourceUrl(exam.solution_pdf_url, exam.id + '_sol'))
      : '';

    const showPdf = canViewAnswers && solPdfUrl && !this.state.hideSolutionPdfInDetail;
    const p4List = Array.isArray(exam.part4) ? exam.part4 : [];
    const isCollapsed = Boolean(this.state.collapseAnswerSheetInDetail);
    const curFilter = canViewAnswers ? (this.state.detailAnswerFilter || 'all') : 'all';

    const container = document.getElementById('app');
    container.innerHTML = `
      <div class="min-h-screen bg-slate-50 flex flex-col">
        <!-- Top Fixed Taskbar -->
        <header class="bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 shadow-xs">
          <div class="w-full max-w-[98%] mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-2">
            <div class="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
              <button type="button" onclick="App.goHome()" class="px-2.5 sm:px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 shadow-xs cursor-pointer shrink-0 whitespace-nowrap" title="Quay về trang chủ">
                <i class="fa-solid fa-house"></i>
                <span class="hidden sm:inline">Trang chủ</span>
              </button>
              <div class="h-5 w-px bg-slate-200 shrink-0"></div>
              <span class="text-xs sm:text-sm font-bold text-slate-800 truncate">Chi tiết: ${sub.examTitle}</span>
            </div>

            <div class="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
              <button type="button" onclick="App.toggleSubmissionAnswerCollapse()" class="toggle-sub-answer-btn hidden md:inline-flex px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition items-center gap-1.5 cursor-pointer whitespace-nowrap" title="Thu gọn hoặc mở rộng bảng đáp án ngang">
                <i class="fa-solid ${isCollapsed ? 'fa-chevron-down' : 'fa-chevron-up'}"></i>
                <span>${isCollapsed ? 'Mở rộng bảng đáp án' : 'Thu gọn bảng đáp án'}</span>
              </button>

              ${solPdfUrl ? `
                <button type="button" onclick="App.toggleSolutionPdfInDetail('${subId}')" class="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center cursor-pointer shadow-xs whitespace-nowrap ${this.state.hideSolutionPdfInDetail ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'}" title="Ẩn hoặc hiện file PDF lời giải chi tiết">
                  <i class="fa-solid ${this.state.hideSolutionPdfInDetail ? 'fa-file-pdf' : 'fa-eye-slash'} mr-1"></i>
                  <span class="sm:hidden">${this.state.hideSolutionPdfInDetail ? 'Hiện PDF' : 'Ẩn PDF'}</span>
                  <span class="hidden sm:inline">${this.state.hideSolutionPdfInDetail ? 'Hiện PDF Lời Giải' : 'Ẩn PDF Lời Giải'}</span>
                </button>
              ` : ''}

              ${!isStudent ? `
                <button type="button" onclick="App.toggleExamViewAnswers('${exam.id}'); setTimeout(() => App.viewSubmissionDetail('${subId}'), 100);" class="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center cursor-pointer whitespace-nowrap ${exam.allow_view_answers !== false ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-300 hover:bg-amber-100'}" title="Bật/Tắt quyền cho học sinh xem đáp án và file lời giải của đề này">
                  <i class="fa-solid ${exam.allow_view_answers !== false ? 'fa-eye' : 'fa-eye-slash'} sm:mr-1.5"></i>
                  <span class="hidden sm:inline">${exam.allow_view_answers !== false ? 'Học sinh: Mở xem đáp án' : 'Học sinh: Khóa xem đáp án'}</span>
                </button>
              ` : ''}

              <button type="button" onclick="window.print()" class="text-xs bg-white border border-slate-200 px-2.5 sm:px-3 py-1.5 rounded-lg shadow-xs font-semibold text-slate-700 hover:bg-slate-50 transition flex items-center cursor-pointer whitespace-nowrap" title="In kết quả">
                <i class="fa-solid fa-print sm:mr-1.5"></i><span class="hidden sm:inline">In kết quả</span>
              </button>
            </div>
          </div>
        </header>

        <div class="py-5 px-3 sm:px-6 flex-1 w-full max-w-[98%] mx-auto space-y-5">
          <!-- Banner tóm tắt điểm số & Học sinh -->
          <div class="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <span class="text-xs font-bold uppercase tracking-wider text-indigo-600">Chi Tiết Bài Làm &amp; Đáp Án</span>
              <h2 class="text-lg sm:text-xl font-extrabold text-slate-900">${sub.examTitle}</h2>
              <div class="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span>Học sinh: <strong>${sub.studentName}</strong> (${sub.studentId})</span>
                <span>• <strong class="text-indigo-600">Lần thi: ${sub.attemptNumber || 1}</strong></span>
                <span>• Nộp lúc: ${new Date(sub.submittedAt).toLocaleString('vi-VN')}</span>
                <span>• Giám sát phòng thi: <strong class="${(sub.tabSwitches || 0) > 0 || (sub.screenshotCount || 0) > 0 ? 'text-red-600 font-bold' : 'text-emerald-600 font-bold'}">${sub.tabSwitches || 0} lần${(sub.screenshotCount || 0) > 0 ? ` (${sub.screenshotCount} lần chụp MH)` : ''}</strong></span>
              </div>
            </div>
            <div class="text-left sm:text-right bg-indigo-50 border border-indigo-100 px-4 py-3 rounded-xl shrink-0 w-full sm:w-auto flex sm:block items-center justify-between gap-2">
              <div class="text-2xl sm:text-3xl font-extrabold text-indigo-700 font-mono">${res.totalScore} <span class="text-sm font-normal text-slate-400">/ ${res.maxTotal || 10}</span></div>
              <div class="text-xs font-bold text-indigo-600 sm:mt-0.5">Xếp loại: ${res.rank}</div>
            </div>
          </div>

          ${!canViewAnswers ? `
            <!-- Cảnh báo khóa đáp án -->
            <div class="p-4 sm:p-5 bg-amber-50 border border-amber-200 rounded-2xl flex items-center space-x-3 text-amber-900 shadow-xs">
              <div class="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 font-bold text-lg">
                <i class="fa-solid fa-lock"></i>
              </div>
              <div>
                <div class="font-bold text-xs sm:text-sm">Chế độ bảo mật: Đáp án &amp; Lời giải chi tiết đang tạm khóa</div>
                <p class="text-[11px] sm:text-xs text-amber-700 mt-0.5">Giáo viên hiện đang tạm khóa quyền xem đáp án đúng và file PDF lời giải chi tiết cho đề này. Bạn chỉ có thể xem điểm và phiếu trả lời của mình.</p>
              </div>
            </div>
          ` : ''}

          <!-- PHẦN TRÊN: BẢNG ĐỐI CHIẾU ĐÁP ÁN DẠNG NGANG (CÓ THỂ THU GỌN / MỞ RỘNG) -->
          <div id="submissionAnswerCard" class="w-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div class="px-3.5 sm:px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <i class="fa-solid fa-table-cells text-indigo-600"></i>
                  <span>Bảng Đáp Án &amp; Kết Quả</span>
                </span>
                ${exam.part1.length > 0 ? `<span class="px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-[11px] font-bold font-mono">P.I: ${res.part1.score}/${res.part1.maxScore}đ</span>` : ''}
                ${exam.part2.length > 0 ? `<span class="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-[11px] font-bold font-mono">P.II: ${res.part2.score}/${res.part2.maxScore}đ</span>` : ''}
                ${exam.part3.length > 0 ? `<span class="px-2 py-0.5 rounded-full bg-amber-50 border border-amber-100 text-amber-700 text-[11px] font-bold font-mono">P.III: ${res.part3.score}/${res.part3.maxScore}đ</span>` : ''}
                ${p4List.length > 0 ? `<span class="px-2 py-0.5 rounded-full bg-purple-50 border border-purple-100 text-purple-700 text-[11px] font-bold font-mono">P.IV: ${res.part4.pendingManual ? 'Chờ chấm' : `${res.part4.score}/${res.part4.maxScore}đ`}</span>` : ''}
              </div>

              <div class="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
                ${canViewAnswers ? `
                  <div class="grid grid-cols-3 sm:inline-flex items-center rounded-xl bg-white border border-slate-200 p-0.5 w-full sm:w-auto">
                    <button type="button" id="detailFilterBtn_all" onclick="App.setDetailAnswerFilter('all')" class="px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${curFilter === 'all' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'}">Tất cả</button>
                    <button type="button" id="detailFilterBtn_wrong" onclick="App.setDetailAnswerFilter('wrong')" class="px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${curFilter === 'wrong' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'}">Sai / Trống</button>
                    <button type="button" id="detailFilterBtn_correct" onclick="App.setDetailAnswerFilter('correct')" class="px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${curFilter === 'correct' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'}">Câu đúng</button>
                  </div>
                ` : ''}

                ${showPdf ? `
                  <button type="button" onclick="App.scrollToSolutionPdf()" class="flex-1 sm:flex-initial justify-center px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap">
                    <i class="fa-solid fa-angles-down"></i>
                    <span>PDF Lời Giải</span>
                  </button>
                ` : ''}

                <button type="button" id="toggleSubmissionAnswerBtn" onclick="App.toggleSubmissionAnswerCollapse()" class="toggle-sub-answer-btn flex-1 sm:flex-initial justify-center px-2.5 sm:px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-xs whitespace-nowrap">
                  <i class="fa-solid ${isCollapsed ? 'fa-chevron-down' : 'fa-chevron-up'}"></i>
                  <span>${isCollapsed ? 'Mở bảng đáp án' : 'Thu gọn đáp án'}</span>
                </button>
              </div>
            </div>

            <div id="collapsedAnswerHintBar" class="${isCollapsed ? '' : 'hidden'} px-4 sm:px-5 py-2.5 bg-indigo-50 text-indigo-800 text-xs flex flex-wrap items-center justify-between gap-2">
              <span><i class="fa-solid fa-circle-info mr-1.5"></i>Bảng đáp án đang được thu gọn để ưu tiên không gian xem PDF lời giải bên dưới.</span>
              <button type="button" onclick="App.toggleSubmissionAnswerCollapse()" class="font-extrabold underline cursor-pointer shrink-0">Mở lại ngay</button>
            </div>

            <div id="submissionAnswerBody" class="${isCollapsed ? 'hidden' : ''} p-4 sm:p-5">
              <div id="submissionAnswerBodyInner">
                ${this.renderSubmissionAnswerSheetBody(exam, sub, res, canViewAnswers, isStudent)}
              </div>
            </div>
          </div>

          ${showPdf ? `
            <!-- PHẦN DƯỚI (TOÀN CHIỀU RỘNG): ĐỒNG BỘ 1 THANH CUỘN CHUNG VỚI TRANG XEM PDF LỜI GIẢI CHI TIẾT -->
            <div id="submissionSolutionPdfSection" class="w-full min-h-[520px] bg-slate-900 rounded-2xl border border-slate-700 shadow-xl flex flex-col">
              <div class="px-3 sm:px-4 py-2.5 bg-slate-800 rounded-t-2xl text-white flex flex-wrap items-center justify-between gap-2 text-xs font-bold shrink-0 border-b border-slate-700 sticky top-14 z-20">
                <span class="flex items-center min-w-0 truncate text-white"><i class="fa-solid fa-file-pdf text-red-400 mr-2 text-sm shrink-0"></i><span class="truncate">File PDF Đáp Án &amp; Lời Giải Chi Tiết</span></span>
                <div class="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <button type="button" onclick="document.getElementById('submissionAnswerCard')?.scrollIntoView({ behavior: 'smooth', block: 'start' })" class="px-2 sm:px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-amber-300 hover:text-white rounded text-[11px] font-semibold transition cursor-pointer flex items-center whitespace-nowrap">
                    <i class="fa-solid fa-angles-up mr-1"></i>Bảng đáp án
                  </button>
                  <button type="button" onclick="App.openPdfModal('${(exam.title || '').replace(/'/g, "\\'")} - Lời Giải PDF', '${solPdfUrl}', '${exam.id}_sol')" class="px-2 sm:px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-emerald-300 hover:text-white rounded text-[11px] font-semibold transition cursor-pointer flex items-center whitespace-nowrap">
                    <i class="fa-solid fa-expand mr-1"></i>Toàn màn hình
                  </button>
                  ${!this.isStandaloneApp() ? `
                    <a href="${solPdfUrl}" target="_blank" class="hidden sm:flex px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-indigo-300 hover:text-white rounded text-[11px] font-semibold transition items-center whitespace-nowrap">
                      <i class="fa-solid fa-arrow-up-right-from-square mr-1"></i>Tab mới
                    </a>
                  ` : ''}
                  <a href="${solPdfUrl}" download="${exam.id}_Dap_An.pdf" class="px-2 sm:px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 hover:text-white rounded text-[11px] font-semibold transition flex items-center whitespace-nowrap">
                    <i class="fa-solid fa-download mr-1"></i>Tải về
                  </a>
                </div>
              </div>
              <div id="submissionSolPdfViewer" class="w-full h-auto flex flex-col bg-slate-950 rounded-b-2xl"></div>
            </div>
          ` : ''}
        </div>

        <!-- Floating Scroll-To-Top Button -->
        <button type="button" onclick="App.scrollToTop()" class="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xl flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer border-2 border-white" title="Lên đầu trang">
          <i class="fa-solid fa-arrow-up text-lg"></i>
        </button>
      </div>
    `;

    if (showPdf) {
      this.mountPdfViewer('submissionSolPdfViewer', solPdfUrl, { flowWithPage: true });
    }
  },

  saveManualPart4Grades(subId) {
    const sub = this.state.submissions.find(s => s.id === subId);
    if (!sub) return;
    const exam = this.state.exams.find(e => e.id === sub.examId) || SAMPLE_EXAM_2027;
    const p4List = Array.isArray(exam.part4) ? exam.part4 : [];
    if (!sub.answers) sub.answers = { part1: {}, part2: {}, part3: {}, part4: {}, part4Scores: {} };
    if (!sub.answers.part4Scores) sub.answers.part4Scores = {};

    p4List.forEach(q => {
      const inp = document.getElementById('manualP4Score_' + q.id);
      if (!inp) return;
      const raw = String(inp.value ?? '').trim().replace(',', '.');
      if (raw !== '' && !isNaN(Number(raw))) {
        const qMax = GradingSystem.getQuestionMaxPoints(exam, 'part4', q);
        sub.answers.part4Scores[q.id] = +Math.max(0, Math.min(qMax, Number(raw))).toFixed(3);
      } else {
        delete sub.answers.part4Scores[q.id];
      }
    });

    sub.scoreResult = GradingSystem.grade(sub.answers, exam);
    sub.updatedAt = new Date().toISOString();
    this.saveData({ markAdminDirty: true });
    this.pushStudentSubmissionToCloud(sub);
    this.notify(`Đã cập nhật điểm Tự luận! Tổng điểm mới: ${sub.scoreResult.totalScore}/${sub.scoreResult.maxTotal}đ.`, 'success', 'Lưu điểm Tự luận');
    this.viewSubmissionDetail(subId);
  },

  getFilteredRewardStudentRows() {
    const q = this.state.adminRewardStudentSearch || '';
    return (this.state.students || [])
      .filter(s => this.matchesStudentSearch(s, q))
      .map(s => ({
        student: s,
        stats: this.getStudentRewardStats(s.studentId)
      }))
      .sort((a, b) => b.stats.availablePoints - a.stats.availablePoints || b.stats.totalAccumulated - a.stats.totalAccumulated);
  },

  renderAdminRewardStudentRowsHtml(precomputedRows = null) {
    const rows = Array.isArray(precomputedRows) ? precomputedRows : this.getFilteredRewardStudentRows();
    if (rows.length === 0) {
      return `
        <tr>
          <td colspan="7" class="px-4 py-8 text-center text-xs text-slate-400">
            <i class="fa-solid fa-magnifying-glass mr-1.5"></i>Không tìm thấy học sinh nào khớp với từ khóa tìm kiếm.
          </td>
        </tr>
      `;
    }
    return rows.map(({ student, stats }) => `
      <tr class="hover:bg-slate-50/80">
        <td class="px-4 py-3 font-mono font-bold text-indigo-700 whitespace-nowrap">${student.studentId}</td>
        <td class="px-4 py-3 font-bold text-slate-800 whitespace-nowrap">
          ${student.fullName}
          <span class="text-slate-400 font-normal ml-1">(K${this.getStudentGrade(student)} • ${student.className || '12'})</span>
        </td>
        <td class="px-3 py-3 text-center font-mono font-semibold text-slate-700 whitespace-nowrap">
          <span class="inline-flex items-center gap-1"><span>${stats.earnedPoints}</span><i class="fa-solid fa-star text-[10px] text-amber-500"></i></span>
        </td>
        <td class="px-3 py-3 text-center font-mono font-semibold whitespace-nowrap ${stats.bonusPoints >= 0 ? 'text-emerald-700' : 'text-red-600'}">
          ${stats.bonusPoints > 0 ? `+${stats.bonusPoints}` : stats.bonusPoints}
        </td>
        <td class="px-3 py-3 text-center font-mono text-slate-500 whitespace-nowrap">${stats.spentPoints}</td>
        <td class="px-3 py-3 text-center whitespace-nowrap">
          <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 font-mono font-extrabold">
            <span>${stats.availablePoints}</span>
            <i class="fa-solid fa-star text-[10px] text-amber-600"></i>
          </span>
        </td>
        <td class="px-4 py-2.5 text-right whitespace-nowrap">
          <div class="inline-flex items-center justify-end gap-1.5">
            <input
              type="number"
              id="bonusAmt_${student.studentId}"
              min="1"
              max="1000"
              step="5"
              value="10"
              aria-label="Số điểm cộng trừ cho ${this.escapeHtmlAttr(student.fullName)}"
              class="w-14 h-8 px-1.5 rounded-lg border border-slate-300 bg-white text-center font-mono font-bold text-xs text-slate-800 outline-none focus:border-indigo-600"
            >
            <button type="button" onclick="App.applyCustomStudentBonus('${student.studentId}', 1)" class="h-8 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center gap-1 cursor-pointer shadow-2xs" title="Cộng điểm thưởng theo ô nhập">
              <i class="fa-solid fa-plus text-[10px]"></i><span>Cộng</span>
            </button>
            <button type="button" onclick="App.applyCustomStudentBonus('${student.studentId}', -1)" class="h-8 px-2.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs inline-flex items-center gap-1 cursor-pointer" title="Trừ điểm thưởng theo ô nhập">
              <i class="fa-solid fa-minus text-[10px]"></i><span>Trừ</span>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  },

  renderAdminRewardsSectionHtml() {
    const catalog = this.getRewardCatalog();
    const allRedemptions = [];
    (this.state.students || []).forEach(s => {
      (Array.isArray(s?.redemptions) ? s.redemptions : []).forEach(r => {
        if (r && r.id) {
          allRedemptions.push({
            ...r,
            studentId: s.studentId,
            studentName: s.fullName,
            className: s.className || '12',
            grade: this.getStudentGrade(s)
          });
        }
      });
    });
    allRedemptions.sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
    });

    const studentRows = this.getFilteredRewardStudentRows();

    return `
      <section class="space-y-5" id="sectionAdminRewards">
        <!-- 1. Duyệt & Trao thưởng cho học sinh -->
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div class="p-4 sm:p-6 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 bg-gradient-to-r from-amber-50/70 via-white to-orange-50/40">
            <div>
              <h3 class="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <i class="fa-solid fa-gift text-amber-600"></i>
                <span>Yêu Cầu Đổi Phần Thưởng Từ Học Sinh (${allRedemptions.length})</span>
              </h3>
              <p class="text-xs text-slate-500 mt-0.5">Xác nhận khi đã trao quà trên lớp hoặc hoàn điểm lại cho học sinh</p>
            </div>
          </div>

          <div class="p-4 sm:p-6">
            ${allRedemptions.length === 0 ? `
              <div class="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Hiện chưa có yêu cầu đổi phần thưởng nào từ học sinh.
              </div>
            ` : `
              <div class="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                ${allRedemptions.map(r => `
                  <div class="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white">
                    <div class="min-w-0 space-y-0.5">
                      <div class="flex flex-wrap items-center gap-1.5">
                        <span class="font-extrabold text-xs sm:text-sm text-slate-900">${r.studentName}</span>
                        <span class="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-mono text-[11px] font-bold">${r.studentId} • K${r.grade} (${r.className})</span>
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-mono text-[11px] font-extrabold">
                          <span>-${r.cost}</span>
                          <i class="fa-solid fa-star text-[9px] text-amber-600"></i>
                        </span>
                      </div>
                      <div class="text-xs font-bold text-indigo-700">${r.rewardTitle}</div>
                      <div class="text-[11px] text-slate-400">${new Date(r.createdAt).toLocaleString('vi-VN')}</div>
                    </div>
                    <div class="flex flex-wrap items-center gap-2 shrink-0">
                      ${r.status === 'pending' ? `
                        <button type="button" onclick="App.fulfillRewardRedemption('${r.studentId}', '${r.id}')" class="ui-btn bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs">
                          <i class="fa-solid fa-check shrink-0"></i><span>Đã Trao Thưởng</span>
                        </button>
                        <button type="button" onclick="App.rejectRewardRedemption('${r.studentId}', '${r.id}')" class="ui-btn bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-600 border border-slate-200">
                          <i class="fa-solid fa-rotate-left shrink-0"></i><span>Hoàn Điểm</span>
                        </button>
                      ` : r.status === 'fulfilled' ? `
                        <span class="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <i class="fa-solid fa-check mr-1"></i>Đã trao thưởng
                        </span>
                      ` : `
                        <span class="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          Đã hoàn điểm
                        </span>
                      `}
                    </div>
                  </div>
                `).join('')}
              </div>
            `}
          </div>
        </div>

        <!-- 2. Cấu hình danh mục Phần thưởng -->
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-4">
          <div>
            <h4 class="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <i class="fa-solid fa-store text-indigo-600"></i>
              <span>Quản Lý Danh Mục Phần Thưởng (${catalog.length})</span>
            </h4>
            <p class="text-xs text-slate-500">Thêm phần thưởng mới, chỉnh sửa trực tiếp hoặc ẩn/hiện phần thưởng học sinh được đổi (tự động đồng bộ Server)</p>
          </div>

          <form onsubmit="event.preventDefault(); App.handleAddRewardCatalogItem();" class="grid grid-cols-1 sm:grid-cols-12 gap-2.5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <input type="text" id="newRewardTitle" required placeholder="Tên phần thưởng (VD: Miễn 1 bài tập về nhà)" class="sm:col-span-4 px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold outline-none focus:border-indigo-600 min-w-0">
            <input type="number" id="newRewardCost" required min="5" step="5" value="80" placeholder="Số điểm" class="sm:col-span-2 px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-mono font-bold text-amber-700 outline-none focus:border-indigo-600 min-w-0">
            <select id="newRewardIcon" aria-label="Biểu tượng phần thưởng" class="sm:col-span-2 px-2.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 outline-none focus:border-indigo-600 min-w-0 cursor-pointer">
              ${this.REWARD_ICON_OPTIONS.map(opt => `<option value="${opt.value}">${opt.label}</option>`).join('')}
            </select>
            <input type="text" id="newRewardDesc" placeholder="Mô tả ngắn (không bắt buộc)" class="sm:col-span-2 px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs outline-none focus:border-indigo-600 min-w-0">
            <button type="submit" class="sm:col-span-2 ui-btn bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs">
              <i class="fa-solid fa-plus shrink-0"></i><span>Thêm Quà</span>
            </button>
          </form>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            ${catalog.map(rw => `
              <div class="p-3.5 rounded-xl border ${rw.active !== false ? 'border-slate-200 bg-white' : 'border-slate-200 bg-slate-50 opacity-70'} flex flex-col justify-between gap-2.5">
                <div>
                  <div class="flex items-center justify-between gap-2">
                    <div class="inline-flex items-center gap-1.5">
                      <span class="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs border border-indigo-100 shrink-0">
                        <i class="fa-solid ${rw.icon}"></i>
                      </span>
                      <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 text-xs font-extrabold font-mono">
                        <i class="fa-solid fa-star text-[10px] text-amber-600"></i>
                        <span>${rw.cost} điểm</span>
                      </span>
                    </div>
                    <span class="text-[11px] font-bold ${rw.active !== false ? 'text-emerald-600' : 'text-slate-400'}">${rw.active !== false ? 'Đang mở' : 'Đang ẩn'}</span>
                  </div>
                  <div class="font-bold text-xs sm:text-sm text-slate-900 mt-2">${rw.title}</div>
                  <p class="text-[11px] text-slate-500 mt-0.5">${rw.desc || ''}</p>
                </div>
                <div class="grid grid-cols-3 gap-1.5 pt-1">
                  <button type="button" id="editRewardBtn_${rw.id}" onclick="App.showEditRewardModal('${rw.id}')" class="ui-btn px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200">
                    <i class="fa-solid fa-pen-to-square shrink-0"></i><span>Sửa</span>
                  </button>
                  <button type="button" onclick="App.toggleRewardCatalogItem('${rw.id}')" class="ui-btn px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200">
                    <i class="fa-solid ${rw.active !== false ? 'fa-eye-slash' : 'fa-eye'} shrink-0"></i>
                    <span>${rw.active !== false ? 'Ẩn' : 'Hiện'}</span>
                  </button>
                  <button type="button" onclick="App.deleteRewardCatalogItem('${rw.id}')" class="ui-btn px-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200">
                    <i class="fa-solid fa-trash-can shrink-0"></i><span>Xóa</span>
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- 3. Bảng điểm tích lũy học sinh & Thưởng nóng -->
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div class="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <h4 class="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <i class="fa-solid fa-ranking-star text-emerald-600"></i>
                  <span>Bảng Tích Điểm Học Sinh &amp; Cộng / Trừ Điểm Nhanh</span>
                </h4>
                <span id="adminRewardStudentCountBadge" class="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold font-mono">
                  ${studentRows.length} / ${(this.state.students || []).length} HS
                </span>
              </div>
              <p class="text-xs text-slate-500 mt-0.5">Tìm nhanh học sinh theo tên, mã HS hoặc lớp để cộng / trừ số điểm tùy chỉnh</p>
            </div>

            <div class="relative w-full md:w-80 shrink-0">
              <i class="fa-solid fa-magnifying-glass absolute left-3.5 top-2.5 text-slate-400 text-xs pointer-events-none"></i>
              <input
                type="text"
                id="adminRewardStudentSearchInput"
                value="${this.escapeHtmlAttr(this.state.adminRewardStudentSearch || '')}"
                oninput="App.onAdminRewardStudentSearch(this.value)"
                placeholder="Tìm tên, mã HS (VD: HS001), lớp..."
                class="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-indigo-500 outline-none transition"
              >
              <button
                type="button"
                id="clearAdminRewardSearchBtn"
                onclick="App.clearAdminRewardStudentSearch()"
                class="${this.state.adminRewardStudentSearch ? '' : 'hidden'} absolute right-2 top-1.5 w-6 h-6 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer"
                title="Xóa tìm kiếm"
              >
                <i class="fa-solid fa-xmark text-xs"></i>
              </button>
            </div>
          </div>

          <div class="overflow-x-auto max-h-[65vh] overflow-y-auto">
            <table class="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead class="bg-slate-50 text-slate-600 uppercase font-bold sticky top-0 z-10">
                <tr>
                  <th class="px-4 py-3 bg-slate-50">Mã HS</th>
                  <th class="px-4 py-3 bg-slate-50">Họ và Tên</th>
                  <th class="px-3 py-3 text-center bg-slate-50">Từ Đề Thi</th>
                  <th class="px-3 py-3 text-center bg-slate-50">GV Cộng/Trừ</th>
                  <th class="px-3 py-3 text-center bg-slate-50">Đã Đổi</th>
                  <th class="px-3 py-3 text-center bg-slate-50">Khả Dụng</th>
                  <th class="px-4 py-3 text-right bg-slate-50">Số Điểm Cộng / Trừ</th>
                </tr>
              </thead>
              <tbody id="adminRewardStudentsTbody" class="divide-y divide-slate-100 bg-white">
                ${this.renderAdminRewardStudentRowsHtml(studentRows)}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    `;
  },

  getFilteredGradebookStudents() {
    return (this.state.students || []).filter(s => {
      if (this.state.adminGradeFilter && this.state.adminGradeFilter !== 'ALL' && String(this.getStudentGrade(s)) !== String(this.state.adminGradeFilter)) return false;
      if (this.state.adminClassFilter && this.state.adminClassFilter !== 'ALL' && (s.className || '12') !== this.state.adminClassFilter) return false;
      if (this.state.adminGradebookSearch && !this.matchesStudentSearch(s, this.state.adminGradebookSearch)) return false;
      return true;
    });
  },

  onAdminGradebookSearch(val) {
    this.state.adminGradebookSearch = String(val ?? '');
    if (typeof document === 'undefined') return;
    const filteredStudents = this.getFilteredGradebookStudents();
    const examsList = this.state.exams || [];
    const contentEl = document.getElementById('adminGradebookContentContainer');
    if (contentEl) {
      contentEl.innerHTML = this.renderAdminGradebookContentHtml(filteredStudents, examsList);
    }
    const badgeEl = document.getElementById('adminGradebookSummaryBadge');
    if (badgeEl) {
      badgeEl.textContent = `${examsList.length} đề thi • ${filteredStudents.length} học sinh`;
    }
    const clearBtn = document.getElementById('clearAdminGradebookSearchBtn');
    if (clearBtn) {
      clearBtn.classList.toggle('hidden', !this.state.adminGradebookSearch);
    }
  },

  clearAdminGradebookSearch() {
    this.state.adminGradebookSearch = '';
    if (typeof document !== 'undefined') {
      const inp = document.getElementById('adminGradebookSearchInput');
      if (inp) {
        inp.value = '';
        inp.focus();
      }
      this.onAdminGradebookSearch('');
    }
  },

  renderAdminGradebookContentHtml(filteredStudents = null, examsList = null) {
    const stuList = Array.isArray(filteredStudents) ? filteredStudents : this.getFilteredGradebookStudents();
    const exList = Array.isArray(examsList) ? examsList : (this.state.exams || []);

    if (this.state.adminViewTab === 'matrix') {
      return `
        <!-- CHẾ ĐỘ 1: BẢNG ĐIỂM MA TRẬN TỔNG HỢP (THEO ĐỢT 1, ĐỢT 2, ĐỢT 3...) -->
        <div class="matrix-scroll-container overflow-x-auto max-h-[72vh] overflow-y-auto border-t border-slate-200">
          <table class="min-w-full text-left text-sm border-separate border-spacing-0">
            <thead class="sticky top-0 z-30 shadow-xs">
              <tr class="bg-slate-100 text-xs uppercase tracking-wider text-slate-600 font-bold">
                <th class="px-4 py-3 text-center font-bold w-12 bg-slate-100 border-b border-slate-200">STT</th>
                <th class="px-4 py-3 font-bold font-mono bg-slate-100 border-b border-slate-200">Mã HS</th>
                <th class="px-5 py-3 font-bold bg-slate-100 border-b border-slate-200">Họ và Tên</th>
                <th class="px-4 py-3 text-center font-bold bg-slate-100 border-b border-slate-200">Khối / Lớp</th>
                ${exList.map((ex) => `
                  <th class="px-4 py-3 text-center font-bold min-w-[125px] bg-slate-100 border-b border-slate-200">
                    <div class="text-indigo-900 font-extrabold">K${ex.grade || 12} • ${this.getExamCategoryMeta(this.inferExamCategory(ex)).short}</div>
                    <div class="text-[10px] text-slate-500 font-normal truncate max-w-[130px] mx-auto" title="${this.escapeHtmlAttr(ex.title)}">${ex.title}</div>
                  </th>
                `).join('')}
                <th class="px-4 py-3 text-center font-bold bg-indigo-100/70 text-indigo-900 border-b border-slate-200">Điểm TB</th>
                <th class="px-4 py-3 text-center font-bold bg-slate-100 border-b border-slate-200">Số Đề</th>
                <th class="px-4 py-3 text-center font-bold bg-slate-100 border-b border-slate-200">Xếp Loại</th>
              </tr>

              <tr class="bg-indigo-50/95 text-xs font-bold text-slate-700 shadow-2xs">
                <td colspan="4" class="px-5 py-2.5 text-right uppercase tracking-wider text-indigo-900 bg-indigo-50/95 border-b-2 border-indigo-200">
                  <i class="fa-solid fa-chart-column mr-1.5 text-indigo-600"></i>Điểm TB Nhóm Đang Xem:
                </td>
                ${exList.map(ex => {
                  const subs = stuList.map(s => this.state.submissions.find(x => x.studentId === s.studentId && x.examId === ex.id)).filter(Boolean);
                  const avg = subs.length > 0 ? (subs.reduce((a, b) => a + Number(b.scoreResult.totalScore), 0) / subs.length).toFixed(2) : '--';
                  const pct = Math.round((subs.length / (stuList.length || 1)) * 100);
                  return `
                    <td class="px-4 py-2.5 text-center font-mono bg-indigo-50/95 border-b-2 border-indigo-200">
                      <div class="text-indigo-900 font-extrabold text-sm">${avg}đ</div>
                      <div class="text-[10px] text-slate-500 font-normal">${subs.length}/${stuList.length} HS (${pct}%)</div>
                    </td>
                  `;
                }).join('')}
                <td class="px-4 py-2.5 text-center font-mono font-extrabold text-sm text-indigo-950 bg-indigo-100/80 border-b-2 border-indigo-200">
                  ${(() => {
                    const allAvgs = stuList.map(s => {
                      const subs = this.state.submissions.filter(x => x.studentId === s.studentId);
                      return subs.length > 0 ? (subs.reduce((a, b) => a + Number(b.scoreResult.totalScore), 0) / subs.length) : null;
                    }).filter(x => x !== null);
                    return allAvgs.length > 0 ? (allAvgs.reduce((a, b) => a + b, 0) / allAvgs.length).toFixed(2) + 'đ' : '--';
                  })()}
                </td>
                <td colspan="2" class="px-4 py-2.5 text-center text-indigo-800 bg-indigo-50/95 border-b-2 border-indigo-200 text-xs">
                  ${exList.length > 0
                    ? `Hoàn thành: ${Math.round((stuList.filter(s => exList.every(ex => this.state.submissions.some(sub => sub.studentId === s.studentId && sub.examId === ex.id))).length / (stuList.length || 1)) * 100)}% đủ đợt`
                    : 'Chưa có đề thi'}
                </td>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 bg-white">
              ${stuList.length === 0 ? `
                <tr>
                  <td colspan="${7 + exList.length}" class="px-5 py-10 text-center text-xs text-slate-400">
                    <i class="fa-solid fa-magnifying-glass mr-1.5"></i>Không tìm thấy học sinh phù hợp với bộ lọc / từ khóa tìm kiếm.
                  </td>
                </tr>
              ` : stuList.map((s, stt) => {
                const examScores = exList.map(ex => {
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
                      ${validScores.length}/${exList.length}
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
      `;
    }

    const logSubs = (this.state.submissions || []).filter(sub => {
      const st = (this.state.students || []).find(x => x.studentId === sub.studentId);
      if (this.state.adminGradeFilter && this.state.adminGradeFilter !== 'ALL') {
        if (!st || String(this.getStudentGrade(st)) !== String(this.state.adminGradeFilter)) return false;
      }
      if (this.state.adminClassFilter && this.state.adminClassFilter !== 'ALL') {
        if (!st || (st.className || '12') !== this.state.adminClassFilter) return false;
      }
      if (this.state.adminGradebookSearch) {
        if (st) return this.matchesStudentSearch(st, this.state.adminGradebookSearch);
        const fallbackHaystack = this.normalizeSearchText(`${sub.studentId || ''} ${sub.studentName || ''} ${sub.examTitle || ''}`);
        return fallbackHaystack.includes(this.normalizeSearchText(this.state.adminGradebookSearch));
      }
      return true;
    });

    return `
      <!-- CHẾ ĐỘ 2: NHẬT KÝ LƯỢT NỘP CHI TIẾT TỪNG PHẦN (LOG VIEW) -->
      <div class="overflow-x-auto max-h-[72vh] overflow-y-auto border-t border-slate-200">
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
              <th class="px-4 py-3.5 font-bold text-center bg-slate-100 border-b border-slate-200">Phần IV</th>
              <th class="px-4 py-3.5 font-bold text-center bg-slate-100 border-b border-slate-200">Tổng Điểm</th>
              <th class="px-5 py-3.5 font-bold text-right bg-slate-100 border-b border-slate-200">Thao tác</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 bg-white">
            ${logSubs.length === 0 ? `
              <tr>
                <td colspan="11" class="px-5 py-10 text-center text-xs text-slate-400">
                  <i class="fa-solid fa-magnifying-glass mr-1.5"></i>Chưa có lượt nộp bài nào khớp với bộ lọc / từ khóa tìm kiếm.
                </td>
              </tr>
            ` : logSubs.map(sub => `
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
                  ${(sub.tabSwitches || 0) > 0 || (sub.screenshotCount || 0) > 0 ? `
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-700 border border-red-200" title="Đã ghi nhận rời màn hình hoặc chụp màn hình">
                      <i class="fa-solid ${(sub.screenshotCount || 0) > 0 ? 'fa-camera' : 'fa-triangle-exclamation'} mr-1"></i>${sub.tabSwitches || sub.screenshotCount} lần${(sub.screenshotCount || 0) > 0 ? ` (${sub.screenshotCount} chụp)` : ''}
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
                <td class="px-4 py-4 text-center font-mono text-xs font-semibold">
                  ${sub.scoreResult.part4 && sub.scoreResult.part4.totalQuestions > 0
                    ? (sub.scoreResult.part4.pendingManual
                      ? '<span class="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-sans font-bold">Chờ chấm</span>'
                      : `${sub.scoreResult.part4.score}đ`)
                    : '<span class="text-slate-300">—</span>'}
                </td>
                <td class="px-4 py-4 text-center">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold ${sub.scoreResult.totalScore >= 8 ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}">
                    ${sub.scoreResult.totalScore}đ
                  </span>
                </td>
                <td class="px-5 py-4 text-right">
                  <button onclick="App.viewSubmissionDetail('${sub.id}')" class="px-3 py-1.5 ${sub.scoreResult.part4 && sub.scoreResult.part4.pendingManual ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'} rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer">
                    <i class="fa-solid ${sub.scoreResult.part4 && sub.scoreResult.part4.pendingManual ? 'fa-pen-nib' : 'fa-eye'}"></i><span>${sub.scoreResult.part4 && sub.scoreResult.part4.pendingManual ? 'Chấm TL' : 'Chi tiết'}</span>
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  // --- VIEW: TRANG QUẢN TRỊ VIÊN / GIÁO VIÊN (ADMIN DASHBOARD) ---
  renderAdminDashboard(container) {
    const u = this.state.currentUser;
    const pendingRedemptions = this.getPendingRedemptionsCount();
    const allClasses = [...new Set(this.state.students.map(s => s.className || '12'))];
    const activeStudentGrades = [...new Set(this.state.students.map(s => this.getStudentGrade(s)))].sort((a, b) => a - b);
    const filteredStudents = this.getFilteredGradebookStudents();
    const examsList = this.state.exams;
    if (!this.state.adminMainTab) this.state.adminMainTab = 'main';
    const thMeta = this.getThemeMeta();
    const swatchHex = (this._lastAccentMeta && this._lastAccentMeta.primaryHex) || this.state.accentHex || '#4f46e5';
    const isCloudSyncing = this.state.cloudSyncStatus === 'syncing';

    container.innerHTML = `
      <div class="min-h-screen bg-slate-100 flex flex-col">
        <!-- Top Nav -->
        <header class="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30">
          <div class="w-full max-w-[97%] mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2">
            <div class="flex items-center space-x-2.5 sm:space-x-3 cursor-pointer min-w-0" onclick="App.goHome()" title="Về trang chủ">
              <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/25 shrink-0">
                <i class="fa-solid fa-chalkboard-user text-sm sm:text-base"></i>
              </div>
              <div class="min-w-0">
                <span class="block text-[10px] sm:text-xs font-bold text-indigo-400 uppercase tracking-wider leading-tight">Cổng Giáo Viên</span>
                <h1 class="text-sm sm:text-lg font-extrabold leading-tight truncate">Toán 6 – 12</h1>
              </div>
            </div>

            <div class="flex items-center gap-1 sm:gap-2 shrink-0">
              <!-- Chỉ báo tự động lưu Server (không cần bấm nút) -->
              <span id="adminAutoCloudBadge" class="hidden lg:inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-[11px] font-bold border ${isCloudSyncing ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30' : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'}" title="Mọi đề thi, file PDF và cài đặt được tự động lưu lên máy chủ ngay khi tải lên">
                <i class="fa-solid ${isCloudSyncing ? 'fa-spinner fa-spin' : 'fa-cloud-arrow-up'}"></i>
                <span>${isCloudSyncing ? 'Đang tự động lưu...' : 'Tự động lưu Server'}</span>
              </span>

              <!-- Nút Về Trang Chủ (ẩn trên điện thoại vì bấm vào logo đã về trang chủ) -->
              <button type="button" onclick="App.goHome()" class="hidden md:inline-flex ui-btn bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 shadow-xs" title="Về trang chủ">
                <i class="fa-solid fa-house text-indigo-400"></i>
                <span>Trang chủ</span>
              </button>

              <!-- Nút Xem trước & Chọn Bố cục Đề PDF + Ô Đáp Án -->
              <button type="button" id="adminLayoutBtn" onclick="App.showExamLayoutModal()" class="hidden sm:inline-flex ui-btn-icon md:w-auto md:px-3 bg-slate-800 hover:bg-slate-700 text-indigo-300 text-xs font-bold border border-slate-700 shadow-xs md:gap-1.5" title="Xem trước & chọn bố cục hiển thị Đề PDF và Ô điền đáp án">
                <i class="fa-solid ${this.getExamLayoutMeta().icon} text-indigo-400"></i>
                <span class="hidden md:inline">Bố cục thi</span>
              </button>

              <!-- Nút Quét QR Tạo App Điện Thoại (Android & iOS) cho Học Sinh -->
              <button type="button" id="adminIosAppBtn" onclick="App.showIosAppModal()" class="ui-btn-icon md:w-auto md:px-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold border border-indigo-500 shadow-xs md:gap-1.5" title="Hiển thị mã QR để học sinh quét tạo App trên điện thoại Android & iOS">
                <i class="fa-solid fa-qrcode"></i>
                <span class="hidden md:inline">App ĐT / QR</span>
              </button>

              <!-- Chuyển nhanh Sáng/Tối & Bảng màu -->
              <button type="button" id="adminQuickThemeBtn" onclick="App.cycleTheme()" class="hidden sm:inline-flex ui-btn-icon bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700" title="Chuyển nhanh chế độ: Sáng / Dịu mắt / Tối">
                <i class="fa-solid ${thMeta.icon} text-indigo-400"></i>
              </button>
              <button type="button" id="adminThemeHeaderBtn" onclick="App.showThemeModal()" class="ui-btn-icon lg:w-auto lg:px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 lg:gap-1.5" title="Tùy chỉnh Sáng/Tối, Bộ màu & Độ tương phản">
                <span data-appearance-swatch-dot class="w-3.5 h-3.5 rounded-full border border-white/25 shrink-0" style="background:${swatchHex};"></span>
                <span class="hidden lg:inline">Giao diện</span>
              </button>

              <div class="h-6 w-px bg-slate-800 hidden sm:block"></div>

              <button type="button" id="adminProfileHeaderBtn" onclick="App.showAdminProfileModal()" class="ui-btn-icon sm:w-auto sm:px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 sm:gap-1.5" title="Hồ sơ giáo viên, đổi tên hiển thị & mật khẩu">
                <i class="fa-solid fa-user-gear text-emerald-400"></i>
                <span class="hidden sm:inline">${u.fullName}</span>
              </button>
              <button type="button" onclick="App.logout()" class="ui-btn-icon bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400 border border-slate-700" title="Đăng xuất">
                <i class="fa-solid fa-right-from-bracket"></i>
              </button>
            </div>
          </div>
        </header>

        <!-- Main Body -->
        <main class="w-full max-w-[97%] mx-auto px-3.5 sm:px-6 py-5 sm:py-8 flex-1 space-y-5 sm:space-y-6">
          <!-- Thanh Điều Hướng Cổng Giáo Viên -->
          <div class="bg-white rounded-2xl p-2 sm:p-2.5 border border-slate-200 shadow-sm">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <nav class="grid grid-cols-2 sm:flex sm:flex-wrap items-stretch sm:items-center gap-1.5 sm:gap-2 w-full">
                <button
                  type="button"
                  id="adminTabMainBtn"
                  onclick="App.setAdminMainTab('main')"
                  class="ui-btn h-10 px-2.5 sm:px-3.5 min-w-0 ${this.state.adminMainTab === 'main' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 ring-2 ring-indigo-500/25' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}"
                >
                  <i class="fa-solid fa-chart-pie shrink-0"></i>
                  <span class="sm:hidden">Sổ Điểm</span>
                  <span class="hidden sm:inline">Tổng Quan &amp; Sổ Điểm</span>
                  <span class="px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] font-mono shrink-0 ${this.state.adminMainTab === 'main' ? 'bg-indigo-700 text-white' : 'bg-white text-slate-700 shadow-2xs'}">
                    ${examsList.length}<span class="hidden sm:inline"> đề</span>
                  </span>
                </button>

                <button
                  type="button"
                  id="adminTabStudentsBtn"
                  onclick="App.setAdminMainTab('students')"
                  class="ui-btn h-10 px-2.5 sm:px-3.5 min-w-0 ${this.state.adminMainTab === 'students' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 ring-2 ring-indigo-500/25' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}"
                >
                  <i class="fa-solid fa-users shrink-0"></i>
                  <span class="sm:hidden">Học Sinh</span>
                  <span class="hidden sm:inline">Quản Lý Học Sinh</span>
                  <span class="px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] font-mono shrink-0 ${this.state.adminMainTab === 'students' ? 'bg-indigo-700 text-white' : 'bg-white text-slate-700 shadow-2xs'}">
                    ${this.state.students.length}
                  </span>
                </button>

                <button
                  type="button"
                  id="adminTabExamsBtn"
                  onclick="App.setAdminMainTab('exams')"
                  class="ui-btn h-10 px-2.5 sm:px-3.5 min-w-0 ${this.state.adminMainTab === 'exams' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 ring-2 ring-indigo-500/25' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}"
                >
                  <i class="fa-solid fa-file-lines shrink-0"></i>
                  <span class="sm:hidden">Đề Thi</span>
                  <span class="hidden sm:inline">Quản Lý Đề Thi</span>
                  <span class="px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] font-mono shrink-0 ${this.state.adminMainTab === 'exams' ? 'bg-indigo-700 text-white' : 'bg-white text-slate-700 shadow-2xs'}">
                    ${this.state.exams.length}
                  </span>
                </button>

                <button
                  type="button"
                  id="adminTabHomeworksBtn"
                  onclick="App.setAdminMainTab('homeworks')"
                  class="ui-btn h-10 px-2.5 sm:px-3.5 min-w-0 ${this.state.adminMainTab === 'homeworks' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 ring-2 ring-indigo-500/25' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}"
                >
                  <i class="fa-solid fa-book-open shrink-0"></i>
                  <span class="sm:hidden">Tài Liệu</span>
                  <span class="hidden sm:inline">Tài Liệu &amp; Chuyên Đề</span>
                  <span class="px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] font-mono shrink-0 ${this.state.adminMainTab === 'homeworks' ? 'bg-indigo-700 text-white' : 'bg-white text-slate-700 shadow-2xs'}">
                    ${this.state.homeworks.length}
                  </span>
                </button>

                <button
                  type="button"
                  id="adminTabRewardsBtn"
                  onclick="App.setAdminMainTab('rewards')"
                  class="ui-btn h-10 px-2.5 sm:px-3.5 min-w-0 ${this.state.adminMainTab === 'rewards' ? 'bg-amber-500 text-white shadow-md shadow-amber-200 ring-2 ring-amber-400/30' : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'}"
                >
                  <i class="fa-solid fa-gift shrink-0"></i>
                  <span class="sm:hidden">Đổi Thưởng</span>
                  <span class="hidden sm:inline">Tích Điểm &amp; Thưởng</span>
                  ${pendingRedemptions > 0 ? `
                    <span class="px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] font-mono font-extrabold shrink-0 bg-red-600 text-white">
                      ${pendingRedemptions}
                    </span>
                  ` : ''}
                </button>

                <button
                  type="button"
                  id="adminTabSettingsBtn"
                  onclick="App.setAdminMainTab('settings')"
                  class="ui-btn h-10 px-2.5 sm:px-3.5 min-w-0 ${this.state.adminMainTab === 'settings' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 ring-2 ring-indigo-500/25' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}"
                >
                  <i class="fa-solid fa-sliders shrink-0"></i>
                  <span class="sm:hidden">Cài Đặt</span>
                  <span class="hidden sm:inline">Cài Đặt &amp; Bảo Mật</span>
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
                  ${this.state.adminMainTab === 'rewards' ? 'Duyệt trao phần thưởng, quản lý kho quà đổi điểm và cộng điểm khuyến khích cho học sinh.' : ''}
                  ${this.state.adminMainTab === 'settings' ? 'Cập nhật hồ sơ & mật khẩu Giáo viên, khôi phục qua email, phân quyền xem điểm và quản trị dữ liệu.' : ''}
                </span>
              </div>
              <div class="text-[11px] text-slate-400 hidden lg:block">
                Hệ thống Khảo thí Toán 6 – 12
              </div>
            </div>
          </div>

          ${this.state.adminMainTab === 'rewards' ? this.renderAdminRewardsSectionHtml() : ''}

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
              <div class="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
                <button type="button" id="openBulkGradeModalBtn" onclick="App.showBulkGradeModal()" class="ui-btn bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 shadow-2xs">
                  <i class="fa-solid fa-layer-group"></i><span>Xếp Khối HS</span>
                </button>
                <button type="button" onclick="App.showAddStudentModal()" class="ui-btn bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
                  <i class="fa-solid fa-user-plus"></i><span>Thêm Học Sinh</span>
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
              <div class="flex flex-wrap items-center gap-2">
                <button type="button" id="quickToggleWarnExitExamsBtn" onclick="App.toggleSetting('warnOnExitExam')" class="ui-btn ${this.isExamExitWarningEnabled() ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200'}" title="Bật/Tắt cảnh báo khi học sinh dùng điện thoại thoát ra ngoài lúc đang thi">
                  <i class="fa-solid ${this.isExamExitWarningEnabled() ? 'fa-shield-halved text-rose-600' : 'fa-shield text-slate-400'}"></i>
                  <span>Cảnh báo thoát App: ${this.isExamExitWarningEnabled() ? 'BẬT' : 'TẮT'}</span>
                </button>
                <button type="button" onclick="App.showCreateExamModal()" class="ui-btn bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm px-4">
                  <i class="fa-solid fa-cloud-arrow-up"></i><span>Thêm Đề Thi Mới</span>
                </button>
              </div>
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
                      <label class="block text-xs font-bold text-slate-700 mb-1">Tên đăng nhập (Username — IN HOA) *</label>
                      <input type="text" id="inlineAdminUsername" required value="${String((this.state.admin && this.state.admin.username) || 'ADMIN').toUpperCase()}" placeholder="ADMIN" autocapitalize="characters" spellcheck="false" oninput="App.forceUppercaseInput(this)" class="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-mono font-bold text-indigo-700 focus:border-indigo-600 outline-none input-uppercase">
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

                <div class="pt-1 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-between gap-2">
                  <button type="button" onclick="App.requestAdminPasswordReset()" class="w-full sm:w-auto px-3.5 py-2 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition inline-flex items-center justify-center gap-1.5 cursor-pointer text-center">
                    <i class="fa-solid fa-paper-plane shrink-0"></i><span class="truncate">Gửi link đặt lại về ${this.ADMIN_RECOVERY_EMAIL}</span>
                  </button>
                  <button type="submit" class="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition inline-flex items-center justify-center gap-1.5 cursor-pointer">
                    <i class="fa-solid fa-shield-halved shrink-0"></i><span>Cập Nhật Mật Khẩu</span>
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

            <!-- Khối Giám Sát Phòng Thi & Cảnh Báo Thoát Ứng Dụng Trên Điện Thoại -->
            <div class="pb-6 border-b border-slate-200">
              <h4 class="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <i class="fa-solid fa-mobile-screen-button text-rose-600"></i><span>Giám Sát Phòng Thi Trên Điện Thoại &amp; Trình Duyệt</span>
              </h4>
              <div class="p-4 sm:p-5 rounded-2xl border ${this.isExamExitWarningEnabled() ? 'border-rose-200 bg-rose-50/50' : 'border-slate-200 bg-slate-50/60'} flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div class="space-y-1.5">
                  <div class="flex flex-wrap items-center gap-2">
                    <h5 class="text-sm font-extrabold text-slate-900">Cảnh Báo &amp; Nhắc Vi Phạm Khi Thoát Ra Ngoài Lúc Đang Thi</h5>
                    <span id="warnOnExitStatusPill" class="px-2.5 py-0.5 rounded-full text-xs font-bold ${this.isExamExitWarningEnabled() ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-slate-200 text-slate-600'}">
                      ${this.isExamExitWarningEnabled() ? 'Đang Bật Giám Sát' : 'Đang Tắt'}
                    </span>
                  </div>
                  <p class="text-xs text-slate-600 leading-relaxed max-w-3xl">
                    Khi bật: Nếu học sinh thi trên điện thoại (App iOS / Safari / Chrome) hoặc máy tính mà vuốt ra màn hình chính, chuyển sang ứng dụng khác (Zalo, Camera, trình duyệt...), mở đa nhiệm hoặc rời tab khi đang làm bài, hệ thống sẽ lập tức <strong>rung cảnh báo, hiện bảng nhắc vi phạm quy chế</strong> và <strong>cộng số lần vi phạm vào sổ điểm gửi Giáo viên</strong>.
                  </p>
                </div>
                <div class="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
                  <input type="checkbox" class="ui-switch switch-rose shrink-0" ${this.isExamExitWarningEnabled() ? 'checked' : ''} onchange="App.toggleSetting('warnOnExitExam')" aria-label="Bật tắt cảnh báo thoát màn hình">
                  <button type="button" id="toggleWarnOnExitExamBtn" onclick="App.toggleSetting('warnOnExitExam')" class="ui-btn px-3 sm:px-4 flex-1 sm:flex-initial min-w-0 ${this.isExamExitWarningEnabled() ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm' : 'bg-slate-800 hover:bg-slate-900 text-white shadow-sm'}">
                    <i class="fa-solid ${this.isExamExitWarningEnabled() ? 'fa-shield-halved' : 'fa-power-off'} shrink-0"></i>
                    <span>${this.isExamExitWarningEnabled() ? 'Tắt Cảnh Báo Thoát Màn Hình' : 'Bật Cảnh Báo Thoát Màn Hình'}</span>
                  </button>
                </div>
              </div>

              <div class="mt-3 p-4 sm:p-5 rounded-2xl border ${this.isScreenshotWarningEnabled() ? 'border-amber-200 bg-amber-50/50' : 'border-slate-200 bg-slate-50/60'} flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div class="space-y-1.5">
                  <div class="flex flex-wrap items-center gap-2">
                    <h5 class="text-sm font-extrabold text-slate-900">Phát Còi Cảnh Báo &amp; Che Đề Khi Học Sinh Chụp Màn Hình</h5>
                    <span id="warnOnScreenshotStatusPill" class="px-2.5 py-0.5 rounded-full text-xs font-bold ${this.isScreenshotWarningEnabled() ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-slate-200 text-slate-600'}">
                      ${this.isScreenshotWarningEnabled() ? 'Đang Bật Chống Chụp' : 'Đang Tắt'}
                    </span>
                  </div>
                  <p class="text-xs text-slate-600 leading-relaxed max-w-3xl">
                    Khi bật: Phát hiện phím <strong>PrintScreen, Win/Cmd + Shift + S, Ctrl + Shift + S, Ctrl + P</strong> hoặc <strong>thao tác 3 ngón chụp màn hình cảm ứng</strong> sẽ phát <strong>âm thanh còi cảnh báo, làm mờ đề thi tức thì, đóng dấu chìm mã học sinh</strong> và lưu số lần chụp vào biên bản nộp bài.
                  </p>
                </div>
                <div class="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
                  <input type="checkbox" class="ui-switch switch-rose shrink-0" ${this.isScreenshotWarningEnabled() ? 'checked' : ''} onchange="App.toggleSetting('warnOnScreenshot')" aria-label="Bật tắt cảnh báo chụp màn hình">
                  <button type="button" id="toggleWarnOnScreenshotBtn" onclick="App.toggleSetting('warnOnScreenshot')" class="ui-btn px-3 sm:px-4 flex-1 sm:flex-initial min-w-0 ${this.isScreenshotWarningEnabled() ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm' : 'bg-slate-800 hover:bg-slate-900 text-white shadow-sm'}">
                    <i class="fa-solid ${this.isScreenshotWarningEnabled() ? 'fa-camera' : 'fa-power-off'} shrink-0"></i>
                    <span>${this.isScreenshotWarningEnabled() ? 'Tắt Cảnh Báo Chụp Màn Hình' : 'Bật Cảnh Báo Chụp Màn Hình'}</span>
                  </button>
                </div>
              </div>
            </div>

            <div>
              <h4 class="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <i class="fa-solid fa-user-graduate text-indigo-600"></i><span>Phân Quyền Hiển Thị Cho Học Sinh</span>
              </h4>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <!-- Cấu hình 1: Cho phép xem điểm bản thân -->
              <div class="p-4 rounded-xl border ${this.state.settings.allowStudentViewOwnScore ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200 bg-slate-50/60'} flex flex-col justify-between space-y-3">
                <div class="space-y-2">
                  <div class="flex items-start justify-between gap-2">
                    <h4 class="text-xs font-bold text-slate-800">1. Xem Điểm Bản Thân</h4>
                    <input type="checkbox" class="ui-switch switch-emerald" ${this.state.settings.allowStudentViewOwnScore ? 'checked' : ''} onchange="App.toggleSetting('allowStudentViewOwnScore')" aria-label="Cho phép học sinh xem điểm bản thân">
                  </div>
                  <div class="flex items-center gap-1.5">
                    <span class="text-[11px] font-bold px-2 py-0.5 rounded-full ${this.state.settings.allowStudentViewOwnScore ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}">
                      ${this.state.settings.allowStudentViewOwnScore ? 'Đang Mở' : 'Đang Khóa'}
                    </span>
                  </div>
                  <p class="text-[11px] text-slate-500 leading-relaxed">Học sinh được tra cứu kết quả bài làm của chính mình.</p>
                </div>
                <button type="button" onclick="App.toggleSetting('allowStudentViewOwnScore')" class="ui-btn w-full ${this.state.settings.allowStudentViewOwnScore ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'}">
                  <i class="fa-solid ${this.state.settings.allowStudentViewOwnScore ? 'fa-lock-open' : 'fa-lock'}"></i>
                  <span>${this.state.settings.allowStudentViewOwnScore ? 'Khóa Quyền Xem Điểm' : 'Mở Cho Xem Điểm'}</span>
                </button>
              </div>

              <!-- Cấu hình 2: So sánh kết quả Lớp / Khối (chỉ mở khi Admin cho phép) -->
              <div class="p-4 rounded-xl border ${this.state.settings.allowStudentViewClassBoard ? 'border-indigo-300 bg-indigo-50/40' : 'border-slate-200 bg-slate-50/60'} flex flex-col justify-between space-y-3">
                <div class="space-y-2">
                  <div class="flex items-start justify-between gap-2">
                    <h4 class="text-xs font-bold text-slate-800">2. So Sánh Lớp / Khối</h4>
                    <input type="checkbox" id="togglePeerCompareSwitch" class="ui-switch" ${this.state.settings.allowStudentViewClassBoard ? 'checked' : ''} onchange="App.toggleSetting('allowStudentViewClassBoard')" aria-label="Mở quyền so sánh kết quả lớp hoặc khối">
                  </div>
                  <div class="flex flex-wrap items-center gap-1.5">
                    <span id="peerCompareStatusBadge" class="text-[11px] font-bold px-2 py-0.5 rounded-full ${this.state.settings.allowStudentViewClassBoard ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200 text-slate-600'}">
                      ${this.state.settings.allowStudentViewClassBoard ? 'Đang Mở Cho Xem' : 'Đang Khóa'}
                    </span>
                  </div>
                  <p class="text-[11px] text-slate-500 leading-relaxed">Học sinh chỉ xem được khi Admin mở, và chỉ đối chiếu trong <strong>Lớp mình</strong> hoặc <strong>Toàn khối mình</strong>.</p>
                  <div class="pt-1 space-y-1">
                    <div class="text-[10px] font-bold uppercase tracking-wider text-slate-500">Phạm vi cho phép khi mở:</div>
                    <div class="grid grid-cols-3 gap-1 bg-white p-1 rounded-xl border border-slate-200 text-[11px] font-bold">
                      <button type="button" id="compareScopePill_both" onclick="App.setStudentCompareScope('both')" class="py-1 px-1.5 rounded-lg transition cursor-pointer ${(!this.state.settings.studentCompareScope || this.state.settings.studentCompareScope === 'both') ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'}">Lớp &amp; Khối</button>
                      <button type="button" id="compareScopePill_class" onclick="App.setStudentCompareScope('class')" class="py-1 px-1.5 rounded-lg transition cursor-pointer ${this.state.settings.studentCompareScope === 'class' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'}">Chỉ Lớp</button>
                      <button type="button" id="compareScopePill_grade" onclick="App.setStudentCompareScope('grade')" class="py-1 px-1.5 rounded-lg transition cursor-pointer ${this.state.settings.studentCompareScope === 'grade' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'}">Chỉ Khối</button>
                    </div>
                  </div>
                </div>
                <button type="button" id="togglePeerCompareBtn" onclick="App.toggleSetting('allowStudentViewClassBoard')" class="ui-btn w-full ${this.state.settings.allowStudentViewClassBoard ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'}">
                  <i class="fa-solid ${this.state.settings.allowStudentViewClassBoard ? 'fa-lock' : 'fa-unlock-keyhole'}"></i>
                  <span>${this.state.settings.allowStudentViewClassBoard ? 'Khóa Bảng So Sánh' : 'Mở Bảng So Sánh'}</span>
                </button>
              </div>

              <!-- Cấu hình 3: Ẩn danh thông tin học sinh khác -->
              <div class="p-4 rounded-xl border ${this.state.settings.anonymizeOtherStudents ? 'border-purple-200 bg-purple-50/30' : 'border-slate-200 bg-slate-50/60'} flex flex-col justify-between space-y-3">
                <div class="space-y-2">
                  <div class="flex items-start justify-between gap-2">
                    <h4 class="text-xs font-bold text-slate-800">3. Ẩn Danh Bạn Khác</h4>
                    <input type="checkbox" class="ui-switch switch-purple" ${this.state.settings.anonymizeOtherStudents ? 'checked' : ''} onchange="App.toggleSetting('anonymizeOtherStudents')" aria-label="Ẩn danh tên học sinh khác">
                  </div>
                  <div class="flex items-center gap-1.5">
                    <span class="text-[11px] font-bold px-2 py-0.5 rounded-full ${this.state.settings.anonymizeOtherStudents ? 'bg-purple-100 text-purple-800' : 'bg-amber-100 text-amber-800'}">
                      ${this.state.settings.anonymizeOtherStudents ? 'Đang Ẩn Danh' : 'Hiện Tên Thật'}
                    </span>
                  </div>
                  <p class="text-[11px] text-slate-500 leading-relaxed">Che tên/mã bạn khác (VD "Học sinh ẩn danh #1"), giữ nguyên điểm.</p>
                </div>
                <button type="button" onclick="App.toggleSetting('anonymizeOtherStudents')" class="ui-btn w-full ${this.state.settings.anonymizeOtherStudents ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'}">
                  <i class="fa-solid ${this.state.settings.anonymizeOtherStudents ? 'fa-user-secret' : 'fa-users'}"></i>
                  <span>${this.state.settings.anonymizeOtherStudents ? 'Tắt Ẩn Danh (Tên Thật)' : 'Bật Ẩn Danh'}</span>
                </button>
              </div>

              <!-- Cấu hình 4: Bật/Tắt hiển thị đáp án đúng & lời giải chi tiết -->
              <div class="p-4 rounded-xl border ${this.state.settings.allowStudentViewAnswers ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200 bg-slate-50/60'} flex flex-col justify-between space-y-3">
                <div class="space-y-2">
                  <div class="flex items-start justify-between gap-2">
                    <h4 class="text-xs font-bold text-slate-800">4. Đáp Án &amp; Lời Giải</h4>
                    <input type="checkbox" class="ui-switch switch-emerald" ${this.state.settings.allowStudentViewAnswers ? 'checked' : ''} onchange="App.toggleSetting('allowStudentViewAnswers')" aria-label="Cho phép xem đáp án và lời giải">
                  </div>
                  <div class="flex items-center gap-1.5">
                    <span class="text-[11px] font-bold px-2 py-0.5 rounded-full ${this.state.settings.allowStudentViewAnswers ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}">
                      ${this.state.settings.allowStudentViewAnswers ? 'Đang Mở' : 'Đang Khóa'}
                    </span>
                  </div>
                  <p class="text-[11px] text-slate-500 leading-relaxed">Cho phép học sinh xem đáp án đúng (A/B/C/D) và lời giải sau khi nộp.</p>
                </div>
                <button type="button" onclick="App.toggleSetting('allowStudentViewAnswers')" class="ui-btn w-full ${this.state.settings.allowStudentViewAnswers ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'}">
                  <i class="fa-solid ${this.state.settings.allowStudentViewAnswers ? 'fa-eye' : 'fa-eye-slash'}"></i>
                  <span>${this.state.settings.allowStudentViewAnswers ? 'Khóa Đáp Án &amp; Lời Giải' : 'Mở Cho Xem Đáp Án'}</span>
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
                <button onclick="App.showIosAppModal(false, 'android');" class="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-teal-200 cursor-pointer">
                  <i class="fa-brands fa-android"></i><span>Hướng dẫn App Android / iOS</span>
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
                  <span id="adminGradebookSummaryBadge" class="text-xs bg-indigo-50 text-indigo-700 font-bold px-2.5 py-0.5 rounded-full border border-indigo-100">
                    ${examsList.length} đề thi • ${filteredStudents.length} học sinh
                  </span>
                </div>
                <p class="text-xs text-slate-500 mt-1">Theo dõi điểm số các đề thi, điểm trung bình và phân loại học lực của học sinh</p>
              </div>

              <div class="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                <div class="flex-1 sm:flex-initial flex items-center bg-white rounded-xl pl-3 pr-1.5 py-1 border border-slate-200 text-xs min-w-0">
                  <span class="text-slate-500 mr-1.5 font-medium shrink-0">Khối:</span>
                  <select id="adminGradeFilterSelect" onchange="App.filterAdminGrade(this.value)" class="bg-transparent font-bold text-indigo-700 outline-none cursor-pointer py-0.5 pl-1 w-full min-w-0">
                    <option value="ALL" ${(!this.state.adminGradeFilter || this.state.adminGradeFilter === 'ALL') ? 'selected' : ''}>Tất cả khối</option>
                    ${[6, 7, 8, 9, 10, 11, 12].map(g => `
                      <option value="${g}" ${String(this.state.adminGradeFilter) === String(g) ? 'selected' : ''}>Khối ${g}</option>
                    `).join('')}
                  </select>
                </div>

                <div class="flex-1 sm:flex-initial flex items-center bg-white rounded-xl pl-3 pr-1.5 py-1 border border-slate-200 text-xs min-w-0">
                  <span class="text-slate-500 mr-1.5 font-medium shrink-0">Lớp:</span>
                  <select id="adminClassFilterSelect" onchange="App.filterAdminGradebook(this.value)" class="bg-transparent font-bold text-slate-700 outline-none cursor-pointer py-0.5 pl-1 w-full min-w-0">
                    <option value="ALL" ${this.state.adminClassFilter === 'ALL' ? 'selected' : ''}>Tất cả các lớp</option>
                    ${allClasses.map(c => `
                      <option value="${c}" ${this.state.adminClassFilter === c ? 'selected' : ''}>Lớp ${c}</option>
                    `).join('')}
                  </select>
                </div>

                <button type="button" id="quickTogglePeerCompareBtn" onclick="App.toggleSetting('allowStudentViewClassBoard')" class="w-full sm:w-auto justify-center px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer ${this.state.settings.allowStudentViewClassBoard ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600 shadow-xs' : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'}" title="Bật/tắt cho phép học sinh so sánh điểm trong Lớp hoặc Khối của mình">
                  <i class="fa-solid ${this.state.settings.allowStudentViewClassBoard ? 'fa-ranking-star' : 'fa-lock'}"></i>
                  <span>${this.state.settings.allowStudentViewClassBoard ? 'So sánh HS: Đang Mở' : 'So sánh HS: Đang Khóa'}</span>
                </button>

                <div class="bg-slate-100 p-1 rounded-xl border border-slate-200 grid grid-cols-2 sm:flex text-xs font-semibold w-full sm:w-auto">
                  <button onclick="App.setAdminViewTab('matrix')" class="px-2.5 sm:px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center justify-center gap-1 min-w-0 ${this.state.adminViewTab === 'matrix' ? 'bg-white shadow-xs text-indigo-600 font-bold' : 'text-slate-600 hover:text-slate-900'}">
                    <i class="fa-solid fa-table-list shrink-0"></i><span class="truncate">Sổ Điểm Tổng Hợp</span>
                  </button>
                  <button onclick="App.setAdminViewTab('log')" class="px-2.5 sm:px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center justify-center gap-1 min-w-0 ${this.state.adminViewTab === 'log' ? 'bg-white shadow-xs text-indigo-600 font-bold' : 'text-slate-600 hover:text-slate-900'}">
                    <i class="fa-solid fa-clock-rotate-left shrink-0"></i><span class="truncate">Nhật Ký Nộp Bài</span>
                  </button>
                </div>

                <button onclick="App.exportMatrixCSV()" class="w-full sm:w-auto justify-center px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center cursor-pointer">
                  <i class="fa-solid fa-file-excel mr-1.5"></i>Xuất Bảng Điểm (.CSV)
                </button>
              </div>
            </div>

            <!-- Thanh tìm kiếm học sinh ở Sổ Điểm Tổng Hợp & Nhật Ký Nộp Bài -->
            <div class="px-4 sm:px-6 py-3 bg-slate-50/70 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <div class="relative flex-1 max-w-xl">
                <i class="fa-solid fa-magnifying-glass absolute left-3.5 top-2.5 text-slate-400 text-xs pointer-events-none"></i>
                <input
                  type="text"
                  id="adminGradebookSearchInput"
                  value="${this.escapeHtmlAttr(this.state.adminGradebookSearch || '')}"
                  oninput="App.onAdminGradebookSearch(this.value)"
                  placeholder="Tìm học sinh theo tên, mã HS (VD: HS001), lớp, khối..."
                  class="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:border-indigo-500 outline-none transition"
                >
                <button
                  type="button"
                  id="clearAdminGradebookSearchBtn"
                  onclick="App.clearAdminGradebookSearch()"
                  class="${this.state.adminGradebookSearch ? '' : 'hidden'} absolute right-2 top-1.5 w-6 h-6 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer"
                  title="Xóa từ khóa tìm kiếm"
                >
                  <i class="fa-solid fa-xmark text-xs"></i>
                </button>
              </div>
              <div class="text-[11px] text-slate-500 hidden md:flex items-center gap-1.5">
                <i class="fa-solid fa-lightbulb text-amber-500"></i>
                <span>Hỗ trợ tìm có dấu hoặc không dấu (VD: gõ "quoc viet" hoặc "HS001")</span>
              </div>
            </div>

            <div id="adminGradebookContentContainer">
              ${this.renderAdminGradebookContentHtml(filteredStudents, examsList)}
            </div>
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
            <div data-drop-target="changeQuestionPdfInput" class="border-2 border-dashed border-indigo-200 rounded-xl p-3 text-center bg-white hover:bg-indigo-50/50 transition cursor-pointer">
              <input type="file" id="changeQuestionPdfInput" accept=".pdf,application/pdf" class="hidden" onchange="App.handleDirectPdfUpdate(event, '${examId}', 'question')">
              <label for="changeQuestionPdfInput" class="cursor-pointer block">
                <i class="fa-solid fa-cloud-arrow-up text-xl text-indigo-600 mb-0.5"></i>
                <div class="text-xs font-bold text-slate-800">Kéo thả hoặc bấm tải PDF Đề Thi mới</div>
                <div class="text-[10px] text-slate-400">Hỗ trợ thả trực tiếp file .PDF vào ô này</div>
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
            <div data-drop-target="changeSolutionPdfInput" class="border-2 border-dashed border-emerald-200 rounded-xl p-3 text-center bg-white hover:bg-emerald-50/50 transition cursor-pointer">
              <input type="file" id="changeSolutionPdfInput" accept=".pdf,application/pdf" class="hidden" onchange="App.handleDirectPdfUpdate(event, '${examId}', 'solution')">
              <label for="changeSolutionPdfInput" class="cursor-pointer block">
                <i class="fa-solid fa-cloud-arrow-up text-xl text-emerald-600 mb-0.5"></i>
                <div class="text-xs font-bold text-slate-800">Kéo thả hoặc bấm tải PDF Lời Giải</div>
                <div class="text-[10px] text-slate-400">Hỗ trợ thả trực tiếp file .PDF vào ô này</div>
              </label>
            </div>
          </div>
        </div>

        <!-- 3. Bảng Đáp Án Chấm Điểm Tự Động -->
        <div id="answerKeyEditorHost" data-drop-target="ansKeyEditorSmart">
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

    const slotKey = type === 'question' ? examId : `${examId}_sol`;
    const oldUrl = type === 'question' ? exam.pdf_url : exam.solution_pdf_url;

    if (typeof PDFStorage !== 'undefined') {
      await PDFStorage.savePdf(slotKey, file);
    }
    if (oldUrl && !String(oldUrl).startsWith('idb:')) {
      this.deleteServerPdfByUrl(oldUrl);
    }

    let uploadedUrl = '';
    if (this.isServerSyncEnabled()) {
      uploadedUrl = await this.uploadPdfToServer(slotKey, file).catch(() => '');
    }
    const finalUrl = uploadedUrl || (typeof PDFStorage !== 'undefined' ? ('idb:' + slotKey) : '');
    if (finalUrl) this.setPdfCacheVersion(slotKey, finalUrl);

    if (type === 'question') {
      exam.pdf_name = file.name;
      exam.pdf_url = finalUrl;
    } else {
      exam.solution_pdf_name = file.name;
      exam.solution_pdf_url = finalUrl;
    }

    this.saveData({ markAdminDirty: true, skipAutoPush: true });
    await this.pushAdminStateToCloud({ manual: false });
    this.render();
    if (document.getElementById('updatePdfModal')) {
      this.showUpdatePdfModal(examId, true);
    }
    this.notify(
      `Đã cập nhật và tự động lưu lên máy chủ file PDF ${type === 'question' ? 'Đề Thi' : 'Đáp Án & Lời Giải'} "${file.name}" cho đề "${exam.title}".`,
      'success',
      'Đã tự động lưu PDF lên máy chủ'
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
          const isLocalOnly = this.hasLocalOnlyPdf(ex);

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
                    ${isLocalOnly
                      ? `<span class="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 inline-flex items-center gap-1" title="Hệ thống đang tự động lưu file PDF đề thi này lên máy chủ đám mây"><i class="fa-solid fa-spinner fa-spin text-[10px]"></i><span>Đang lưu Server</span></span>`
                      : `<span class="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1" title="Đã tự động lưu trên máy chủ đám mây, học sinh xem ngay trên mọi điện thoại"><i class="fa-solid fa-cloud-arrow-up text-[10px]"></i><span>Đã lưu Server</span></span>`}
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
                      P1:${ex.part1 ? ex.part1.length : 0} • P2:${ex.part2 ? ex.part2.length : 0} • P3:${ex.part3 ? ex.part3.length : 0}${ex.part4 && ex.part4.length > 0 ? ` • P4:${ex.part4.length} TL` : ''} • ${GradingSystem.computeExamMaxSummary(ex).maxTotal}đ
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

              <!-- Các nút thao tác sắp xếp gọn gàng theo lưới cân đối không tràn trên điện thoại -->
              <div class="pt-3 border-t border-slate-100 space-y-2">
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button type="button" onclick="App.previewAdminPdf('${ex.id}')" class="ui-btn bg-red-50 hover:bg-red-100 border border-red-200 text-red-700" title="Xem trực tiếp file PDF đề thi">
                    <i class="fa-solid fa-file-pdf shrink-0"></i><span>Xem PDF Đề</span>
                  </button>
                  <button type="button" onclick="App.showExamLayoutModal('${ex.id}')" class="ui-btn bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700" title="Xem trước & chọn cách hiển thị Đề PDF và Ô điền đáp án">
                    <i class="fa-solid fa-table-columns shrink-0"></i><span class="sm:hidden">Bố cục thi</span><span class="hidden sm:inline">Xem trước bố cục</span>
                  </button>
                  ${ex.solution_pdf_url ? `
                    <button type="button" onclick="App.previewAdminSolutionPdf('${ex.id}')" class="col-span-2 sm:col-span-1 ui-btn bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700" title="Xem trực tiếp file PDF đáp án và lời giải">
                      <i class="fa-solid fa-file-shield shrink-0"></i><span>PDF Đáp Án</span>
                    </button>
                  ` : `
                    <button type="button" onclick="App.showUpdatePdfModal('${ex.id}')" class="col-span-2 sm:col-span-1 ui-btn bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 text-slate-600">
                      <i class="fa-solid fa-cloud-arrow-up shrink-0"></i><span>Up PDF ĐA</span>
                    </button>
                  `}
                </div>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button type="button" onclick="App.showExamAccessModal('${ex.id}')" class="ui-btn bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700" title="Chọn ai được phép thi đề này">
                    <i class="fa-solid fa-user-check shrink-0"></i><span>Phân quyền</span>
                  </button>
                  <button type="button" onclick="App.toggleExamViewAnswers('${ex.id}')" class="ui-btn ${ex.allow_view_answers !== false ? 'bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700' : 'bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700'}" title="Bật/Tắt cho phép học sinh xem đáp án & lời giải PDF">
                    <i class="fa-solid ${ex.allow_view_answers !== false ? 'fa-eye' : 'fa-eye-slash'} shrink-0"></i><span>${ex.allow_view_answers !== false ? 'Mở ĐA' : 'Khóa ĐA'}</span>
                  </button>
                  <button type="button" onclick="App.showUpdatePdfModal('${ex.id}')" class="ui-btn bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700" title="Cập nhật file PDF đề thi, lời giải và bảng đáp án chấm điểm">
                    <i class="fa-solid fa-file-arrow-up shrink-0"></i><span>PDF &amp; ĐA</span>
                  </button>
                  <button type="button" onclick="App.deleteExam('${ex.id}')" class="ui-btn bg-red-50 hover:bg-red-100 border border-red-100 text-red-600" title="Xóa đề thi này">
                    <i class="fa-solid fa-trash-can shrink-0"></i><span>Xóa</span>
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
            <label class="ui-check-card flex items-center justify-between gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/60 cursor-pointer transition">
              <span class="font-bold text-slate-700 text-xs">Đang mở đề cho học sinh làm bài</span>
              <input type="checkbox" id="accessExamIsActive" ${exam.is_active ? 'checked' : ''} class="ui-switch switch-emerald">
            </label>
            <label class="ui-check-card flex items-center justify-between gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/60 cursor-pointer transition">
              <span class="font-bold text-slate-700 text-xs">Cho phép xem đáp án &amp; lời giải PDF</span>
              <input type="checkbox" id="accessExamAllowAnswers" ${exam.allow_view_answers !== false ? 'checked' : ''} class="ui-switch">
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

    this.saveData({ markAdminDirty: true });
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
    this.saveData({ markAdminDirty: true });
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

    this.saveData({ markAdminDirty: true });
    document.getElementById('bulkGradeModal')?.remove();
    this.render();
    this.notify(`Đã xếp ${checkedIds.length} học sinh vào Khối ${targetGrade} thành công!`, 'success', 'Xếp khối thành công');
  },

  // --- CẤP TÀI KHOẢN HỌC SINH MỚI (MODAL NÂNG CẤP) ---
  showAddStudentModal() {
    const maxNum = this.state.students.reduce((mx, s) => {
      const m = String(s.studentId || '').match(/^HS(\d+)$/i);
      return m ? Math.max(mx, parseInt(m[1], 10)) : mx;
    }, 0);
    const defaultCode = 'HS' + String(maxNum + 1).padStart(3, '0');
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
              <label class="block text-xs font-bold text-slate-700 mb-1">Mã Học Sinh (Tự động IN HOA) *</label>
              <input type="text" id="newStudentId" required value="${defaultCode}" placeholder="VD: HS080" autocapitalize="characters" spellcheck="false" oninput="App.forceUppercaseInput(this)" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono font-bold input-uppercase text-indigo-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none">
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
      allowedExams: [],
      allowedHomeworks: []
    });

    this.saveData({ markAdminDirty: true });
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
              <label class="block text-xs font-bold text-slate-700 mb-1">Mã Học Sinh <span class="text-indigo-600 font-normal">(IN HOA)</span> *</label>
              <input type="text" id="editStudentId" required value="${student.studentId}" autocapitalize="characters" spellcheck="false" oninput="App.forceUppercaseInput(this)" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono font-bold input-uppercase text-indigo-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none">
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

    if (newId !== originalId) {
      this.markDeletedId(originalId);
    }
    this.deleteStudentUpdateFromCloud(originalId);
    if (newId !== originalId) this.deleteStudentUpdateFromCloud(newId);
    this.saveData({ markAdminDirty: true });
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
    if (student) this.pushStudentSubmissionToCloud(null, student);
    const modal = document.getElementById('selfEditStudentModal');
    if (modal) modal.remove();
    this.render();
    this.notify('Đã cập nhật thông tin cá nhân và mật khẩu thành công! Mật khẩu mới đã được đồng bộ với hệ thống giáo viên.', 'success', 'Cập nhật hồ sơ thành công');
  },

  toggleStudentStatus(id) {
    const s = this.state.students.find(x => x.studentId === id);
    if (s) {
      s.status = s.status === 'active' ? 'locked' : 'active';
      s.updatedAt = new Date().toISOString();
      this.saveData({ markAdminDirty: true });
      this.render();
    }
  },

  deleteStudent(id) {
    const st = this.state.students.find(x => x.studentId === id);
    this.confirmDialog(
      `Bạn có chắc chắn muốn xóa tài khoản học sinh ${st ? `"${st.fullName}" (${id})` : id} khỏi hệ thống?`,
      () => {
        this.state.students = this.state.students.filter(x => x.studentId !== id);
        this.markDeletedId(id);
        this.deleteStudentUpdateFromCloud(id);
        this.saveData({ markAdminDirty: true });
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

  // --- BỘ CÔNG CỤ BẢNG ĐÁP ÁN (.TXT / .TEX / DÁN ẢNH CTRL+V) & THANG ĐIỂM 3-4 PHẦN ---
  parseDraftNum(v) {
    if (v === null || v === undefined) return null;
    const s = String(v).trim().replace(',', '.');
    return s !== '' && !isNaN(Number(s)) && Number(s) >= 0 ? Number(s) : null;
  },

  initAnswerKeyDraft(exam = null) {
    if (exam) {
      const sc = exam.scoring || {};
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
        p3: (exam.part3 || []).map(q => (q.correct_answer !== undefined && q.correct_answer !== null) ? String(q.correct_answer) : ''),
        p4: (exam.part4 || []).map(q => (q.correct_answer !== undefined && q.correct_answer !== null) ? String(q.correct_answer) : ''),
        scoring: {
          mode: sc.mode === 'custom' ? 'custom' : 'equal',
          p1Total: GradingSystem.hasNum(sc.p1Total) ? String(sc.p1Total) : '',
          p2Total: GradingSystem.hasNum(sc.p2Total) ? String(sc.p2Total) : '',
          p3Total: GradingSystem.hasNum(sc.p3Total) ? String(sc.p3Total) : '',
          p4Total: GradingSystem.hasNum(sc.p4Total) ? String(sc.p4Total) : ''
        },
        qPoints: {
          p1: (exam.part1 || []).map(q => GradingSystem.hasNum(q.points) ? String(q.points) : ''),
          p2: (exam.part2 || []).map(q => GradingSystem.hasNum(q.points) ? String(q.points) : ''),
          p3: (exam.part3 || []).map(q => GradingSystem.hasNum(q.points) ? String(q.points) : ''),
          p4: (exam.part4 || []).map(q => GradingSystem.hasNum(q.points) ? String(q.points) : '')
        },
        ocrMeta: null
      };
    } else {
      this.state.answerKeyDraft = {
        p1: Array(12).fill(''),
        p2: Array.from({ length: 4 }, () => ({ a: null, b: null, c: null, d: null })),
        p3: Array(6).fill(''),
        p4: [],
        scoring: {
          mode: 'equal',
          p1Total: '',
          p2Total: '',
          p3Total: '',
          p4Total: ''
        },
        qPoints: {
          p1: Array(12).fill(''),
          p2: Array(4).fill(''),
          p3: Array(6).fill(''),
          p4: []
        },
        ocrMeta: null
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
    const d = draft || { p1: [], p2: [], p3: [], p4: [] };
    const sc = d.scoring || {};
    const qp = d.qPoints || {};
    const toPts = (arr, idx) => this.parseDraftNum(arr && arr[idx]);

    return {
      scoring: {
        mode: sc.mode === 'custom' ? 'custom' : 'equal',
        p1Total: this.parseDraftNum(sc.p1Total),
        p2Total: this.parseDraftNum(sc.p2Total),
        p3Total: this.parseDraftNum(sc.p3Total),
        p4Total: this.parseDraftNum(sc.p4Total)
      },
      part1: (d.p1 || []).map((ans, idx) => {
        const pts = toPts(qp.p1, idx);
        return {
          id: idx + 1,
          correct_answer: (ans || '').trim().toUpperCase(),
          ...(pts !== null ? { points: pts } : {})
        };
      }),
      part2: (d.p2 || []).map((obj, idx) => {
        const pts = toPts(qp.p2, idx);
        return {
          id: idx + 1,
          statements: ['a', 'b', 'c', 'd'].map(sub => ({
            sub_id: sub,
            correct: Boolean(obj && obj[sub])
          })),
          ...(pts !== null ? { points: pts } : {})
        };
      }),
      part3: (d.p3 || []).map((ans, idx) => {
        const pts = toPts(qp.p3, idx);
        return {
          id: idx + 1,
          correct_answer: String(ans ?? '').trim(),
          ...(pts !== null ? { points: pts } : {})
        };
      }),
      part4: (d.p4 || []).map((ans, idx) => {
        const pts = toPts(qp.p4, idx);
        return {
          id: idx + 1,
          correct_answer: String(ans ?? '').trim(),
          ...(pts !== null ? { points: pts } : {})
        };
      })
    };
  },

  countAnswerKeyCompletion(draft = this.state.answerKeyDraft) {
    const d = draft || { p1: [], p2: [], p3: [], p4: [] };
    const total = (d.p1 || []).length + (d.p2 || []).length + (d.p3 || []).length;
    const filledP1 = (d.p1 || []).filter(Boolean).length;
    const filledP2 = (d.p2 || []).filter(o => o && ['a', 'b', 'c', 'd'].every(k => o[k] === true || o[k] === false)).length;
    const filledP3 = (d.p3 || []).filter(v => String(v ?? '').trim().length > 0).length;
    return { filled: filledP1 + filledP2 + filledP3, total, p4Count: (d.p4 || []).length };
  },

  updateDraftTotalScoreBadge() {
    const badge = document.getElementById('answerKeyTotalPointsBadge');
    if (!badge) return;
    const preview = this.buildPartsFromDraft(this.state.answerKeyDraft);
    const sum = GradingSystem.computeExamMaxSummary(preview);
    badge.textContent = `Tổng điểm: ${sum.maxTotal}đ`;
  },

  refreshAnswerKeyEditor() {
    const host = document.getElementById('answerKeyEditorHost');
    if (host) host.innerHTML = this.renderAnswerKeyEditorHtml();
  },

  resizeAnswerKeyDraft(part, val) {
    const d = this.state.answerKeyDraft || this.initAnswerKeyDraft();
    if (!d.qPoints) d.qPoints = { p1: [], p2: [], p3: [], p4: [] };
    if (!d.p4) d.p4 = [];
    const maxMap = { p1: 50, p2: 20, p3: 30, p4: 20 };
    const n = Math.max(0, Math.min(maxMap[part] || 50, parseInt(val, 10) || 0));
    if (part === 'p1') {
      d.p1 = Array.from({ length: n }, (_, i) => d.p1[i] || '');
      d.qPoints.p1 = Array.from({ length: n }, (_, i) => (d.qPoints.p1 && d.qPoints.p1[i]) ?? '');
    } else if (part === 'p2') {
      d.p2 = Array.from({ length: n }, (_, i) => d.p2[i] || { a: null, b: null, c: null, d: null });
      d.qPoints.p2 = Array.from({ length: n }, (_, i) => (d.qPoints.p2 && d.qPoints.p2[i]) ?? '');
    } else if (part === 'p3') {
      d.p3 = Array.from({ length: n }, (_, i) => d.p3[i] ?? '');
      d.qPoints.p3 = Array.from({ length: n }, (_, i) => (d.qPoints.p3 && d.qPoints.p3[i]) ?? '');
    } else if (part === 'p4') {
      d.p4 = Array.from({ length: n }, (_, i) => d.p4[i] ?? '');
      d.qPoints.p4 = Array.from({ length: n }, (_, i) => (d.qPoints.p4 && d.qPoints.p4[i]) ?? '');
    }
    this.refreshAnswerKeyEditor();
  },

  setDraftScoringMode(mode) {
    const d = this.state.answerKeyDraft || this.initAnswerKeyDraft();
    if (!d.scoring) d.scoring = { mode: 'equal', p1Total: '', p2Total: '', p3Total: '', p4Total: '' };
    const nextMode = mode === 'custom' ? 'custom' : 'equal';
    if (nextMode === 'custom' && d.scoring.mode !== 'custom') {
      this.distributeSectionPointsToCustom(false);
    }
    d.scoring.mode = nextMode;
    this.refreshAnswerKeyEditor();
  },

  setDraftSectionTotal(partKey, val) {
    const d = this.state.answerKeyDraft || this.initAnswerKeyDraft();
    if (!d.scoring) d.scoring = { mode: 'equal', p1Total: '', p2Total: '', p3Total: '', p4Total: '' };
    d.scoring[partKey + 'Total'] = String(val ?? '').trim();
    this.updateDraftTotalScoreBadge();
  },

  setDraftQuestionPoints(part, idx, val) {
    const d = this.state.answerKeyDraft || this.initAnswerKeyDraft();
    if (!d.qPoints) d.qPoints = { p1: [], p2: [], p3: [], p4: [] };
    if (!Array.isArray(d.qPoints[part])) d.qPoints[part] = [];
    d.qPoints[part][idx] = String(val ?? '').trim();
    this.updateDraftTotalScoreBadge();
  },

  distributeSectionPointsToCustom(shouldRefresh = true) {
    const d = this.state.answerKeyDraft || this.initAnswerKeyDraft();
    if (!d.qPoints) d.qPoints = { p1: [], p2: [], p3: [], p4: [] };
    const sc = d.scoring || {};
    const fillPart = (pKey, defaultPerQ) => {
      const len = (d[pKey] || []).length;
      if (len === 0) { d.qPoints[pKey] = []; return; }
      const secTot = this.parseDraftNum(sc[pKey + 'Total']);
      const perQ = secTot !== null ? +(secTot / len).toFixed(3) : defaultPerQ;
      d.qPoints[pKey] = Array.from({ length: len }, (_, i) => {
        const cur = this.parseDraftNum(d.qPoints[pKey] && d.qPoints[pKey][i]);
        return (!shouldRefresh && cur !== null) ? String(cur) : String(perQ);
      });
    };
    fillPart('p1', 0.25);
    fillPart('p2', 1.0);
    fillPart('p3', 0.5);
    fillPart('p4', 1.0);
    if (shouldRefresh) this.refreshAnswerKeyEditor();
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

  setDraftP3(idx, val, inputEl = null) {
    const d = this.state.answerKeyDraft;
    if (!d) return;
    const normalized = this.formatShortAnsDisplay(val);
    if (inputEl && inputEl.value !== normalized) {
      inputEl.value = normalized;
    }
    d.p3[idx] = normalized.trim();
    const badge = typeof document !== 'undefined' ? document.getElementById('answerKeyProgressBadge') : null;
    if (badge) {
      const c = this.countAnswerKeyCompletion(d);
      badge.textContent = `Đã nhập ${c.filled}/${c.total} câu TN${c.p4Count > 0 ? ` • ${c.p4Count} TL` : ''}`;
    }
  },

  setDraftP4(idx, val) {
    const d = this.state.answerKeyDraft;
    if (!d) return;
    if (!Array.isArray(d.p4)) d.p4 = [];
    d.p4[idx] = String(val ?? '').trim();
  },

  applyQuickP1Input() {
    const inp = document.getElementById('quickP1Input');
    if (!inp) return;
    const d = this.state.answerKeyDraft || this.initAnswerKeyDraft();
    const { nextP1, matched } = this.parseQuickP1String(inp.value, d.p1);
    if (matched > 0) {
      d.p1 = nextP1;
      if (!d.qPoints) d.qPoints = { p1: [], p2: [], p3: [], p4: [] };
      d.qPoints.p1 = Array.from({ length: d.p1.length }, (_, i) => (d.qPoints.p1 && d.qPoints.p1[i]) ?? '');
      this.refreshAnswerKeyEditor();
    }
  },

  fillSampleAnswerKey() {
    this.initAnswerKeyDraft(SAMPLE_EXAM_2027);
    this.refreshAnswerKeyEditor();
  },

  // --- BỘ PARSER ĐÁP ÁN TỪ FILE .TEX, FILE .TXT & ẢNH DÁN CTRL+V (OCR) ---
  extractLatexBraceGroups(str, startIdx, maxGroups = 4) {
    const isEscaped = (s, pos) => {
      let bs = 0;
      for (let k = pos - 1; k >= 0 && s[k] === '\\'; k--) bs++;
      return (bs % 2) === 1;
    };
    const groups = [];
    let i = startIdx;
    const n = str.length;
    while (i < n && groups.length < maxGroups) {
      while (i < n && /\s/.test(str[i])) i++;
      if (groups.length === 0 && str[i] === '[') {
        let bDepth = 1;
        i++;
        while (i < n && bDepth > 0) {
          if (!isEscaped(str, i)) {
            if (str[i] === '[') bDepth++;
            else if (str[i] === ']') bDepth--;
          }
          i++;
        }
        while (i < n && /\s/.test(str[i])) i++;
      }
      if (str[i] !== '{') break;
      let depth = 1;
      const contentStart = i + 1;
      i++;
      while (i < n && depth > 0) {
        if (!isEscaped(str, i)) {
          if (str[i] === '{') depth++;
          else if (str[i] === '}') depth--;
        }
        i++;
      }
      if (depth === 0) {
        groups.push(str.slice(contentStart, i - 1));
      }
    }
    return { groups, endIdx: i };
  },

  stripLatexCommandWithArg(str, cmdName) {
    const re = new RegExp('\\\\' + cmdName + '(?![a-zA-Z])', 'g');
    let out = '';
    let last = 0;
    let m;
    while ((m = re.exec(str)) !== null) {
      out += str.slice(last, m.index);
      const { groups, endIdx } = this.extractLatexBraceGroups(str, m.index + m[0].length, 1);
      last = groups.length > 0 ? endIdx : (m.index + m[0].length);
      re.lastIndex = last;
    }
    out += str.slice(last);
    return out;
  },

  cleanLatexShortAnswer(raw, keepReadableText = false) {
    let s = String(raw ?? '').trim();
    if (!s) return '';
    s = s
      .replace(/\\(?:displaystyle|textstyle|left|right)\b/g, '')
      .replace(/\\d?frac\s*\{\s*([^{}]+?)\s*\}\s*\{\s*([^{}]+?)\s*\}/g, '$1/$2')
      .replace(/\{,\}/g, ',')
      .replace(/\\[,;!quad\s]+/g, ' ')
      .replace(/\$/g, '')
      .replace(/\\(?:text|mathrm|textbf)\s*\{([^{}]*)\}/g, '$1')
      .replace(/[\u2212\u2013\u2014]/g, '-')
      .trim();
    if (!keepReadableText) {
      s = s.replace(/\s+/g, '').replace(/,/g, '.');
    } else {
      s = s.replace(/\s+/g, ' ');
    }
    return s;
  },

  parseTexAnswerKey(rawTex) {
    const noComments = String(rawTex || '').normalize('NFC').replace(/(^|[^\\])%[^\r\n]*/g, '$1');
    const p1 = [];
    const p2 = [];
    const p3 = [];
    const p4 = [];
    const qPoints = { p1: [], p2: [], p3: [], p4: [] };
    const sectionTotals = { p1Total: null, p2Total: null, p3Total: null, p4Total: null };
    let hasCustomQuestionPoints = false;

    // Quét tiêu đề các Phần và tổng điểm từng phần nếu có trong file .tex
    const secMarkers = [];
    const secRegex = /(?:PHẦN|PHAN)\s*(IV|III|II|I|[1-4])(?![IV0-9])([^\r\n]{0,160})|(?:\\section\*?|\bMỤC\b|\bPHẦN\b)[^\r\n]{0,40}?(TỰ\s*LUẬN)([^\r\n]{0,120})/gi;
    let sm;
    while ((sm = secRegex.exec(noComments)) !== null) {
      let secKey = null;
      if (sm[3]) {
        secKey = 'p4';
      } else {
        const tok = String(sm[1] || '').toUpperCase();
        if (tok === 'I' || tok === '1') secKey = 'p1';
        else if (tok === 'II' || tok === '2') secKey = 'p2';
        else if (tok === 'III' || tok === '3') secKey = 'p3';
        else if (tok === 'IV' || tok === '4') secKey = 'p4';
      }
      if (secKey) {
        secMarkers.push({ pos: sm.index, sec: secKey });
        const tail = (sm[2] || sm[4] || '');
        const ptM = tail.match(/(\d+(?:[.,]\d+)?)\s*(?:điểm|diem|đ(?![a-zA-ZÀ-ỹ]))/i);
        if (ptM) {
          sectionTotals[secKey + 'Total'] = Number(ptM[1].replace(',', '.'));
        }
      }
    }

    const sectionAtPos = (pos) => {
      let cur = null;
      for (const mk of secMarkers) {
        if (mk.pos <= pos) cur = mk.sec;
        else break;
      }
      return cur;
    };

    const envRegex = /\\begin\{(ex|bt|vd|cauhoi)\}([\s\S]*?)\\end\{\1\}/gi;
    let em;
    let envCount = 0;
    while ((em = envRegex.exec(noComments)) !== null) {
      envCount++;
      const envName = em[1].toLowerCase();
      const fullBody = em[2];
      const stem = this.stripLatexCommandWithArg(this.stripLatexCommandWithArg(fullBody, 'loigiai'), 'huongdan');
      const sec = sectionAtPos(em.index);

      const qPtMatch = stem.slice(0, 180).match(/[\[(]\s*(\d+(?:[.,]\d+)?)\s*(?:điểm|diem|đ(?![a-zA-ZÀ-ỹ]))\s*[\])]/i);
      const qPtVal = qPtMatch ? String(Number(qPtMatch[1].replace(',', '.'))) : '';
      if (qPtVal) hasCustomQuestionPoints = true;

      const tfMatch = /\\choiceTF\w*(?![a-zA-Z])/.exec(stem);
      const mcMatch = /\\(?:choice|motcot|haicot|boncot)(?!TF)(?![a-zA-Z])/.exec(stem);
      const saMatch = /\\shortans(?![a-zA-Z])/.exec(stem) || /\\shortans(?![a-zA-Z])/.exec(fullBody);

      if (tfMatch) {
        const { groups } = this.extractLatexBraceGroups(stem, tfMatch.index + tfMatch[0].length, 4);
        const obj = { a: false, b: false, c: false, d: false };
        ['a', 'b', 'c', 'd'].forEach((sub, idx) => {
          obj[sub] = /\\True(?![a-zA-Z])/.test(groups[idx] || '');
        });
        p2.push(obj);
        qPoints.p2.push(qPtVal);
      } else if (mcMatch) {
        const { groups } = this.extractLatexBraceGroups(stem, mcMatch.index + mcMatch[0].length, 4);
        const letters = ['A', 'B', 'C', 'D'];
        let ans = '';
        groups.forEach((grp, idx) => {
          if (/\\True(?![a-zA-Z])/.test(grp || '')) ans = letters[idx];
        });
        p1.push(ans);
        qPoints.p1.push(qPtVal);
      } else if (saMatch) {
        const src = /\\shortans(?![a-zA-Z])/.test(stem) ? stem : fullBody;
        const mLocal = /\\shortans(?![a-zA-Z])/.exec(src);
        const { groups } = this.extractLatexBraceGroups(src, mLocal.index + mLocal[0].length, 1);
        p3.push(this.cleanLatexShortAnswer(groups[0] || '', false));
        qPoints.p3.push(qPtVal);
      } else if (envName === 'bt' || sec === 'p4' || sec === 'p3' || /\\dapso(?![a-zA-Z])/.test(fullBody)) {
        const dsMatch = /\\dapso(?![a-zA-Z])/.exec(fullBody);
        let dsVal = '';
        if (dsMatch) {
          const { groups } = this.extractLatexBraceGroups(fullBody, dsMatch.index + dsMatch[0].length, 1);
          dsVal = this.cleanLatexShortAnswer(groups[0] || '', sec !== 'p3');
        }
        if (sec === 'p3') {
          p3.push(dsVal);
          qPoints.p3.push(qPtVal);
        } else {
          p4.push(dsVal);
          qPoints.p4.push(qPtVal);
        }
      }
    }

    if (envCount === 0 || (p1.length + p2.length + p3.length + p4.length === 0)) {
      const tabularPlain = noComments
        .replace(/\\(?:hline|toprule|midrule|bottomrule)\b/g, ' ')
        .replace(/\\cline\{[^{}]*\}/g, ' ')
        .replace(/\{,\}/g, ',')
        .replace(/\\(?:textbf|textit|textrm|mathrm|mathbf)\s*\{([^{}]*)\}/g, '$1')
        .replace(/\$/g, '')
        .replace(/&/g, '   ')
        .replace(/\\\\/g, '\n');
      return this.parseTextAnswerKey(tabularPlain);
    }

    return {
      p1,
      p2,
      p3,
      p4,
      qPoints,
      sectionTotals,
      hasCustomQuestionPoints,
      hasExplicitSections: true
    };
  },

  parseTextAnswerKey(rawText) {
    const normalized = String(rawText || '')
      .normalize('NFC')
      .replace(/[\u2212\u2013\u2014]/g, '-')
      .replace(/\r\n?/g, '\n');
    const lines = normalized.split('\n').map(l => l.trim()).filter(Boolean);

    const p1Map = new Map();
    const p2List = [];
    const p2Counters = { a: 0, b: 0, c: 0, d: 0 };
    const p3RawItems = [];
    const p4RawItems = [];
    const qPointsMap = { p1: new Map(), p2: new Map(), p3: new Map(), p4: new Map() };
    const sectionTotals = { p1Total: null, p2Total: null, p3Total: null, p4Total: null };
    let hasCustomQuestionPoints = false;
    let hasExplicitSections = false;
    let currentSec = null;

    const ensureP2 = (idx) => {
      while (p2List.length <= idx) {
        p2List.push({ a: null, b: null, c: null, d: null });
      }
      return p2List[idx];
    };

    const isTrueToken = (tok) => /^(?:Đúng|Dung|Đ|Ð|đ|D|True|T)$/i.test(String(tok || '').trim());

    const detectSection = (line) => {
      let sec = null;
      if (/^(?:PHẦN|PHAN|PART|MỤC)\s*(?:IV|4)(?![0-9I])\b/i.test(line) || /^(?:[IV1-4]+[.\s:\-]*)?TỰ\s*LUẬN\b/i.test(line)) {
        sec = 'p4';
      } else if (/^(?:PHẦN|PHAN|PART|MỤC)\s*(?:III|3)(?![0-9I])\b/i.test(line) || /TRẢ\s*LỜI\s*NGẮN/i.test(line)) {
        sec = 'p3';
      } else if (/^(?:PHẦN|PHAN|PART|MỤC)\s*(?:II|2)(?![0-9I])\b/i.test(line) || /ĐÚNG\s*[\/\-]?\s*SAI/i.test(line)) {
        sec = 'p2';
      } else if (/^(?:PHẦN|PHAN|PART|MỤC)\s*(?:I|1)(?![0-9IV])\b/i.test(line) || /TRẮC\s*NGHIỆM\s*(?:NHIỀU|4)\s*(?:PHƯƠNG\s*ÁN|LỰA\s*CHỌN)/i.test(line)) {
        sec = 'p1';
      }
      if (sec) {
        hasExplicitSections = true;
        const ptM = line.match(/(\d+(?:[.,]\d+)?)\s*(?:điểm|diem|đ(?![a-zA-ZÀ-ỹ]))/i);
        if (ptM) sectionTotals[sec + 'Total'] = Number(ptM[1].replace(',', '.'));
      }
      return sec;
    };

    for (let li = 0; li < lines.length; li++) {
      const line = lines[li];
      const secHeader = detectSection(line);
      if (secHeader) {
        currentSec = secHeader;
        // Nếu dòng tiêu đề không chứa đáp án ngay phía sau dấu ':' thì chuyển sang dòng kế tiếp
        const afterColon = line.includes(':') ? line.split(':').slice(1).join(':').trim() : '';
        if (!afterColon || /^(?:trắc|tự|câu|gồm|\d+\s*(?:câu|điểm))/i.test(afterColon)) {
          continue;
        }
      }

      // 1. Kiểm tra bảng ngang 2 dòng: Dòng trên "Câu | 1 | 2 | 3...", dòng dưới "Đáp án | A | C | D..." hoặc số trả lời ngắn
      if (li + 1 < lines.length && currentSec !== 'p2' && currentSec !== 'p4') {
        const cleanTop = line.replace(/^(?:Câu\s*hỏi|Câu|Bài|Mã\s*câu)\b\s*[:|.\-]?\s*/i, '').trim();
        const topTokens = cleanTop.split(/[\s|\t,;]+/).filter(Boolean);
        if (topTokens.length >= 2 && topTokens.every(t => /^\d{1,2}$/.test(t))) {
          const nextLine = lines[li + 1];
          if (!detectSection(nextLine)) {
            const cleanBot = nextLine.replace(/^(?:Đáp\s*án|ĐA|DA|Chọn|Kết\s*quả|KQ)\b\s*[:|.\-]?\s*/i, '').trim();
            const botTokens = cleanBot.split(/[\s|\t;]+/).filter(Boolean);
            if (botTokens.length === topTokens.length) {
              if (currentSec !== 'p3' && botTokens.every(t => /^[A-Da-d]$/.test(t))) {
                topTokens.forEach((numStr, k) => {
                  const qNum = parseInt(numStr, 10);
                  if (qNum >= 1 && qNum <= 50) p1Map.set(qNum, botTokens[k].toUpperCase());
                });
                li++;
                continue;
              }
              if (currentSec !== 'p1' && botTokens.every(t => /^-?\d+(?:[.,/]\d+)?$/.test(t))) {
                topTokens.forEach((numStr, k) => {
                  const qNum = parseInt(numStr, 10);
                  p3RawItems.push({ num: qNum, val: botTokens[k].replace(',', '.'), pt: '' });
                });
                li++;
                continue;
              }
            }
          }
        }
      }

      // 2. Xử lý Phần IV (Tự luận) khi đang ở mục Phần IV
      if (currentSec === 'p4') {
        const p4Match = line.match(/^(?:Câu|Bài)?\s*(\d{1,2})\s*(?:[\[(]\s*(\d+(?:[.,]\d+)?)\s*(?:điểm|diem|đ)?\s*[\])])?\s*[:.)\-]\s*(.*)$/i);
        if (p4Match) {
          const qNum = parseInt(p4Match[1], 10);
          let rest = p4Match[3].trim();
          let pt = p4Match[2] ? String(Number(p4Match[2].replace(',', '.'))) : '';
          const inlinePt = rest.match(/^[\[(]\s*(\d+(?:[.,]\d+)?)\s*(?:điểm|diem|đ)?\s*[\])]\s*[:.\-]?\s*(.*)$/i);
          if (!pt && inlinePt) {
            pt = String(Number(inlinePt[1].replace(',', '.')));
            rest = inlinePt[2].trim();
          }
          if (pt) hasCustomQuestionPoints = true;
          p4RawItems.push({ num: qNum, val: rest, pt });
          continue;
        }
      }

      // 3. Kiểm tra định dạng Phần II có kí hiệu ý a), b), c), d) (hỗ trợ cả danh sách dọc & bảng nhiều cột OCR)
      if (currentSec === null || currentSec === 'p2') {
        const subMatches = [];
        const subRegex = /(?:^|[\s,;|(\[])([a-dA-D])\s*[).:\-]\s*(Đúng|Dung|Đ|Ð|đ|D|Sai|S|True|T|False|F)(?=$|[\s,;.|)\]])/gi;
        let sm;
        while ((sm = subRegex.exec(line)) !== null) {
          subMatches.push({ sub: sm[1].toLowerCase(), val: isTrueToken(sm[2]) });
        }
        if (subMatches.length > 0) {
          const explicitQ = line.match(/^(?:Câu\s*)?(\d{1,2})\s*[:.)\-]/i);
          const uniqueSubs = new Set(subMatches.map(x => x.sub));
          if (explicitQ && subMatches.length <= 4 && uniqueSubs.size === subMatches.length) {
            const rawQNum = parseInt(explicitQ[1], 10);
            const qIdx = rawQNum >= 5 ? (p2List.length) : Math.max(0, rawQNum - 1);
            const target = ensureP2(qIdx);
            subMatches.forEach(item => {
              target[item.sub] = item.val;
              p2Counters[item.sub] = Math.max(p2Counters[item.sub], qIdx + 1);
            });
            const qPtM = line.match(/[\[(]\s*(\d+(?:[.,]\d+)?)\s*(?:điểm|diem|đ)\s*[\])]/i);
            if (qPtM) {
              hasCustomQuestionPoints = true;
              qPointsMap.p2.set(qIdx, String(Number(qPtM[1].replace(',', '.'))));
            }
          } else {
            subMatches.forEach(item => {
              const targetIdx = p2Counters[item.sub];
              const target = ensureP2(targetIdx);
              target[item.sub] = item.val;
              p2Counters[item.sub] = targetIdx + 1;
            });
          }
          continue;
        }

        // Định dạng gọn Phần II: "1. ĐSĐS" hoặc "Câu 2: Đ-S-Đ-Đ"
        const compactRegex = /(?:Câu\s*)?(\d{1,2})\s*[:.)\-]\s*([ĐÐđDdSsTtFf](?:[\s\-/,]*[ĐÐđDdSsTtFf]){3})(?=$|[\s,;|])/g;
        let cm;
        let matchedCompact = false;
        while ((cm = compactRegex.exec(line)) !== null) {
          const chars = cm[2].replace(/[\s\-/,]/g, '');
          if (chars.length === 4 && (currentSec === 'p2' || /[ĐÐđSsTtFf]/.test(chars))) {
            const rawQNum = parseInt(cm[1], 10);
            const qIdx = rawQNum >= 5 ? p2List.length : Math.max(0, rawQNum - 1);
            const target = ensureP2(qIdx);
            ['a', 'b', 'c', 'd'].forEach((sub, idx) => {
              target[sub] = isTrueToken(chars[idx]);
              p2Counters[sub] = Math.max(p2Counters[sub], qIdx + 1);
            });
            matchedCompact = true;
          }
        }
        if (matchedCompact) continue;
      }

      // 4. Kiểm tra Phần III (Trả lời ngắn): "1: 12,5   2: -0,5" hoặc "Câu 1 (0,5đ): 3.25"
      if (currentSec === 'p3') {
        const p3Regex = /(?:Câu\s*)?(\d{1,2})\s*(?:[\[(]\s*(\d+(?:[.,]\d+)?)\s*(?:điểm|diem|đ)?\s*[\])])?\s*[:.=)\-]\s*(-?\d+(?:[.,/]\d+)?)(?=$|[\s,;|])/gi;
        let pm;
        let matchedP3 = false;
        while ((pm = p3Regex.exec(line)) !== null) {
          const pt = pm[2] ? String(Number(pm[2].replace(',', '.'))) : '';
          if (pt) hasCustomQuestionPoints = true;
          p3RawItems.push({ num: parseInt(pm[1], 10), val: pm[3].replace(',', '.'), pt });
          matchedP3 = true;
        }
        if (matchedP3) continue;
      }

      // 5. Kiểm tra Phần I (1.A 2.C 3B...) hoặc tự phân loại P1 vs P3 khi không có tiêu đề phần
      if (currentSec === 'p1' || currentSec === null) {
        const mcRegex = /(?:Câu\s*)?(\d{1,2})\s*(?:[\[(]\s*(\d+(?:[.,]\d+)?)\s*(?:điểm|diem|đ)?\s*[\])])?\s*[:.\-=)]?\s*([A-Da-d])(?![A-Za-z0-9.,/])/g;
        let mm;
        let mcMatched = 0;
        while ((mm = mcRegex.exec(line)) !== null) {
          const qNum = parseInt(mm[1], 10);
          if (qNum >= 1 && qNum <= 50) {
            p1Map.set(qNum, mm[3].toUpperCase());
            if (mm[2]) {
              hasCustomQuestionPoints = true;
              qPointsMap.p1.set(qNum - 1, String(Number(mm[2].replace(',', '.'))));
            }
            mcMatched++;
          }
        }
        if (mcMatched > 0) continue;

        if (currentSec === null) {
          const numAnsRegex = /(?:Câu\s*)(\d{1,2})\s*[:.=)\-]\s*(-?\d+(?:[.,/]\d+)?)(?=$|[\s,;|])/gi;
          let nm;
          let numMatched = 0;
          while ((nm = numAnsRegex.exec(line)) !== null) {
            p3RawItems.push({ num: parseInt(nm[1], 10), val: nm[2].replace(',', '.'), pt: '' });
            numMatched++;
          }
          if (numMatched > 0) continue;
        }
      }
    }

    // Fallback chuỗi liền "ABCDDCBA..." cho Phần I nếu chưa khớp câu nào
    if (p1Map.size === 0 && p2List.length === 0 && p3RawItems.length === 0 && p4RawItems.length === 0) {
      const compactLetters = normalized.replace(/\s+/g, '');
      if (/^[A-Da-d]{2,50}$/.test(compactLetters)) {
        Array.from(compactLetters.toUpperCase()).forEach((ch, idx) => p1Map.set(idx + 1, ch));
      }
    }

    // Dựng mảng p1, p2, p3, p4 chuẩn
    const maxP1 = p1Map.size > 0 ? Math.max(...p1Map.keys()) : 0;
    const p1 = Array.from({ length: maxP1 }, (_, i) => p1Map.get(i + 1) || '');
    const qp1 = Array.from({ length: maxP1 }, (_, i) => qPointsMap.p1.get(i) || '');

    const p2 = p2List;
    const qp2 = Array.from({ length: p2.length }, (_, i) => qPointsMap.p2.get(i) || '');

    const normalizeNumberedList = (items) => {
      if (items.length === 0) return { vals: [], pts: [] };
      const nums = items.map(x => x.num);
      const minN = Math.min(...nums);
      const base = minN >= 5 ? minN : 1;
      const maxIdx = Math.min(39, Math.max(...nums.map(n => n - base)));
      const vals = Array(maxIdx + 1).fill('');
      const pts = Array(maxIdx + 1).fill('');
      items.forEach(it => {
        const idx = it.num - base;
        if (idx >= 0 && idx < 40) {
          vals[idx] = it.val;
          if (it.pt) pts[idx] = it.pt;
        }
      });
      return { vals, pts };
    };

    const normP3 = normalizeNumberedList(p3RawItems);
    const normP4 = normalizeNumberedList(p4RawItems);

    return {
      p1,
      p2,
      p3: normP3.vals,
      p4: normP4.vals,
      qPoints: {
        p1: qp1,
        p2: qp2,
        p3: normP3.pts,
        p4: normP4.pts
      },
      sectionTotals,
      hasCustomQuestionPoints,
      hasExplicitSections
    };
  },

  applyParsedAnswerKeyToDraft(parsed, options = {}) {
    const d = this.state.answerKeyDraft || this.initAnswerKeyDraft();
    if (!d.scoring) d.scoring = { mode: 'equal', p1Total: '', p2Total: '', p3Total: '', p4Total: '' };
    if (!d.qPoints) d.qPoints = { p1: [], p2: [], p3: [], p4: [] };

    const merge = Boolean(options.merge);
    const fullOverwrite = options.sourceType === 'tex' || (!merge && parsed.hasExplicitSections);
    const p1Count = (parsed.p1 || []).filter(Boolean).length;
    const p2Count = (parsed.p2 || []).filter(o => o && ['a', 'b', 'c', 'd'].some(k => o[k] !== null)).length;
    const p3Count = (parsed.p3 || []).filter(v => String(v ?? '').trim() !== '').length;
    const p4Count = (parsed.p4 || []).length;
    const totalMatched = p1Count + p2Count + p3Count + p4Count;

    if (totalMatched === 0) {
      return { totalMatched: 0, summaryText: '' };
    }

    if (fullOverwrite) {
      d.p1 = parsed.p1 || [];
      d.p2 = parsed.p2 || [];
      d.p3 = parsed.p3 || [];
      d.p4 = parsed.p4 || [];
      d.qPoints = {
        p1: (parsed.qPoints && parsed.qPoints.p1) || Array(d.p1.length).fill(''),
        p2: (parsed.qPoints && parsed.qPoints.p2) || Array(d.p2.length).fill(''),
        p3: (parsed.qPoints && parsed.qPoints.p3) || Array(d.p3.length).fill(''),
        p4: (parsed.qPoints && parsed.qPoints.p4) || Array(d.p4.length).fill('')
      };
    } else {
      if (parsed.p1 && parsed.p1.length > 0) {
        d.p1 = parsed.p1;
        d.qPoints.p1 = (parsed.qPoints && parsed.qPoints.p1) || Array(d.p1.length).fill('');
      }
      if (parsed.p2 && parsed.p2.length > 0) {
        d.p2 = parsed.p2;
        d.qPoints.p2 = (parsed.qPoints && parsed.qPoints.p2) || Array(d.p2.length).fill('');
      }
      if (parsed.p3 && parsed.p3.length > 0) {
        d.p3 = parsed.p3;
        d.qPoints.p3 = (parsed.qPoints && parsed.qPoints.p3) || Array(d.p3.length).fill('');
      }
      if (parsed.p4 && parsed.p4.length > 0) {
        d.p4 = parsed.p4;
        d.qPoints.p4 = (parsed.qPoints && parsed.qPoints.p4) || Array(d.p4.length).fill('');
      }
    }

    const st = parsed.sectionTotals || {};
    ['p1Total', 'p2Total', 'p3Total', 'p4Total'].forEach(k => {
      if (GradingSystem.hasNum(st[k])) d.scoring[k] = String(st[k]);
    });
    if (parsed.hasCustomQuestionPoints) {
      d.scoring.mode = 'custom';
      this.distributeSectionPointsToCustom(false);
    }

    const segs = [];
    if (d.p1.length > 0 && p1Count > 0) segs.push(`${p1Count} câu P.I`);
    if (d.p2.length > 0 && p2Count > 0) segs.push(`${p2Count} câu P.II`);
    if (d.p3.length > 0 && p3Count > 0) segs.push(`${p3Count} câu P.III`);
    if (d.p4.length > 0 && p4Count > 0) segs.push(`${p4Count} câu P.IV (Tự luận)`);

    return { totalMatched, summaryText: segs.join(' • ') };
  },

  applySmartAnswerKeyContent(content, sourceLabel = 'Dữ liệu', options = {}) {
    const str = String(content || '');
    const isTex = options.forceTex || /\\begin\{(?:ex|bt|vd|cauhoi|tabular)\}|\\choice|\\shortans/i.test(str);
    const parsed = isTex ? this.parseTexAnswerKey(str) : this.parseTextAnswerKey(str);
    const res = this.applyParsedAnswerKeyToDraft(parsed, {
      merge: Boolean(options.merge),
      sourceType: isTex ? 'tex' : 'txt'
    });
    this.refreshAnswerKeyEditor();
    if (res.totalMatched > 0) {
      this.notify(`Đã tự động điền ${res.summaryText} từ ${sourceLabel}!`, 'success', 'Nhập đáp án tự động');
    } else {
      this.notify(`Không tìm thấy mẫu đáp án chuẩn trong ${sourceLabel}. Vui lòng kiểm tra định dạng!`, 'warning', 'Chưa nhận diện được đáp án');
    }
    return res;
  },

  handleAnswerKeyFileUpload(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const isTex = /\.tex$/i.test(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      this.applySmartAnswerKeyContent(String(reader.result || ''), `file ${file.name}`, {
        forceTex: isTex,
        merge: false
      });
    };
    reader.readAsText(file, 'utf-8');
    event.target.value = '';
  },

  loadTesseractEngine() {
    if (typeof window !== 'undefined' && window.Tesseract) {
      return Promise.resolve(window.Tesseract);
    }
    if (this._tesseractPromise) return this._tesseractPromise;
    this._tesseractPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
      script.async = true;
      script.onload = () => window.Tesseract ? resolve(window.Tesseract) : reject(new Error('Tesseract load failed'));
      script.onerror = () => {
        this._tesseractPromise = null;
        reject(new Error('Không tải được thư viện nhận diện ảnh OCR. Vui lòng kiểm tra kết nối mạng!'));
      };
      document.head.appendChild(script);
    });
    return this._tesseractPromise;
  },

  preprocessImageForOcr(fileOrBlob) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(fileOrBlob);
      const img = new Image();
      img.onload = () => {
        const w = img.naturalWidth || img.width || 600;
        const h = img.naturalHeight || img.height || 400;
        const scale = w < 1200 ? Math.min(2.2, 2200 / Math.max(w, 1)) : Math.min(1.5, 2600 / Math.max(w, h, 1));
        const cw = Math.max(1, Math.round(w * scale));
        const ch = Math.max(1, Math.round(h * scale));

        const canvas = document.createElement('canvas');
        canvas.width = cw;
        canvas.height = ch;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, cw, ch);
        ctx.drawImage(img, 0, 0, cw, ch);

        const imgData = ctx.getImageData(0, 0, cw, ch);
        const px = imgData.data;
        for (let i = 0; i < px.length; i += 4) {
          const lum = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
          const boosted = lum > 205 ? 255 : (lum < 115 ? Math.max(0, (lum - 115) * 0.5 + 30) : lum);
          px[i] = boosted;
          px[i + 1] = boosted;
          px[i + 2] = boosted;
          px[i + 3] = 255;
        }
        ctx.putImageData(imgData, 0, 0);

        // Ảnh preview nhỏ gọn hiển thị trong khung đáp án
        const prevScale = Math.min(1, 560 / Math.max(w, 1));
        const prevCanvas = document.createElement('canvas');
        prevCanvas.width = Math.max(1, Math.round(w * prevScale));
        prevCanvas.height = Math.max(1, Math.round(h * prevScale));
        prevCanvas.getContext('2d').drawImage(img, 0, 0, prevCanvas.width, prevCanvas.height);
        const previewUrl = prevCanvas.toDataURL('image/jpeg', 0.78);
        URL.revokeObjectURL(url);

        canvas.toBlob((blob) => {
          resolve({ processedBlob: blob || fileOrBlob, previewUrl });
        }, 'image/png');
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Không đọc được dữ liệu hình ảnh từ bộ nhớ tạm.'));
      };
      img.src = url;
    });
  },

  async recognizeAnswerKeyFromImage(fileOrBlob) {
    const d = this.state.answerKeyDraft || this.initAnswerKeyDraft();
    d.ocrMeta = {
      status: 'running',
      progress: 8,
      message: 'Đang xử lý độ tương phản ảnh & tải bộ nhận diện OCR...',
      previewUrl: '',
      rawText: '',
      summary: ''
    };
    this.refreshAnswerKeyEditor();

    try {
      const { processedBlob, previewUrl } = await this.preprocessImageForOcr(fileOrBlob);
      d.ocrMeta.previewUrl = previewUrl;
      d.ocrMeta.progress = 20;
      this.refreshAnswerKeyEditor();

      const Tesseract = await this.loadTesseractEngine();
      const { data } = await Tesseract.recognize(processedBlob, 'vie+eng', {
        logger: (m) => {
          if (m && typeof m.progress === 'number' && d.ocrMeta && d.ocrMeta.status === 'running') {
            const pct = Math.min(98, Math.max(20, Math.round(20 + m.progress * 78)));
            d.ocrMeta.progress = pct;
            const bar = document.getElementById('ocrProgressBarFill');
            const txt = document.getElementById('ocrProgressStatusText');
            if (bar) bar.style.width = pct + '%';
            if (txt) txt.textContent = `Đang nhận diện chữ trong ảnh (${pct}%)...`;
          }
        }
      });

      const rawText = String((data && data.text) || '').trim();
      const parsed = this.parseTextAnswerKey(rawText);
      const applied = this.applyParsedAnswerKeyToDraft(parsed, { merge: true });

      d.ocrMeta = {
        status: 'done',
        progress: 100,
        previewUrl,
        rawText,
        summary: applied.totalMatched > 0
          ? `Đã tự động điền: ${applied.summaryText} (Có thể dán tiếp ảnh phần khác để gộp thêm)`
          : 'Chưa tách tự động được đáp án từ ảnh này — hãy mở "Xem/Sửa văn bản OCR" bên dưới để kiểm tra.'
      };
      this.refreshAnswerKeyEditor();

      if (applied.totalMatched > 0) {
        this.notify(`Nhận diện ảnh thành công: ${applied.summaryText}!`, 'success', 'Nhận diện ảnh đáp án (Ctrl+V)');
      } else {
        this.notify('Ảnh đã quét xong nhưng chưa rõ cấu trúc đáp án. Bạn có thể chỉnh văn bản OCR và bấm Áp dụng lại.', 'warning', 'Cần kiểm tra kết quả OCR');
      }
    } catch (err) {
      d.ocrMeta = {
        status: 'error',
        progress: 0,
        previewUrl: (d.ocrMeta && d.ocrMeta.previewUrl) || '',
        rawText: '',
        summary: (err && err.message) || 'Lỗi nhận diện ảnh.'
      };
      this.refreshAnswerKeyEditor();
      this.notify(d.ocrMeta.summary, 'danger', 'Lỗi nhận diện ảnh');
    }
  },

  handleAnswerKeyImageSelect(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    this.suppressAntiCheatTemporarily(1000);
    this.recognizeAnswerKeyFromImage(file);
    event.target.value = '';
  },

  reapplyOcrTextEditor() {
    const ta = document.getElementById('ocrRawTextEditor');
    if (!ta) return;
    const d = this.state.answerKeyDraft || this.initAnswerKeyDraft();
    if (d.ocrMeta) d.ocrMeta.rawText = ta.value;
    const res = this.applySmartAnswerKeyContent(ta.value, 'văn bản OCR đã chỉnh sửa', { merge: true });
    if (d.ocrMeta && res.totalMatched > 0) {
      d.ocrMeta.summary = `Đã cập nhật: ${res.summaryText}`;
      this.refreshAnswerKeyEditor();
    }
  },

  renderAnswerKeyEditorHtml() {
    const d = this.state.answerKeyDraft || this.initAnswerKeyDraft();
    if (!Array.isArray(d.p4)) d.p4 = [];
    if (!d.scoring) d.scoring = { mode: 'equal', p1Total: '', p2Total: '', p3Total: '', p4Total: '' };
    if (!d.qPoints) d.qPoints = { p1: [], p2: [], p3: [], p4: [] };

    const comp = this.countAnswerKeyCompletion(d);
    const previewExam = this.buildPartsFromDraft(d);
    const maxSum = GradingSystem.computeExamMaxSummary(previewExam);
    const isCustomPts = d.scoring.mode === 'custom';
    const partLabelCount = d.p4.length > 0 ? '4 Phần — Có Tự Luận' : '3 Phần';

    return `
      <div class="border border-slate-200 rounded-2xl p-4 bg-slate-50 space-y-3.5 text-xs">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="font-bold text-slate-800 flex flex-wrap items-center gap-1.5">
            <i class="fa-solid fa-table-list text-indigo-600"></i>
            <span>3. Bảng Đáp Án &amp; Thang Điểm (${partLabelCount})</span>
            <span id="answerKeyProgressBadge" class="px-2 py-0.5 rounded-full text-[11px] font-mono ${comp.filled === comp.total && comp.total > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800'}">Đã nhập ${comp.filled}/${comp.total} câu TN${comp.p4Count > 0 ? ` • ${comp.p4Count} TL` : ''}</span>
            <span id="answerKeyTotalPointsBadge" class="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-extrabold bg-amber-100 text-amber-800 border border-amber-200">Tổng điểm: ${maxSum.maxTotal}đ</span>
          </div>
          <button type="button" onclick="App.fillSampleAnswerKey()" class="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer">
            <i class="fa-solid fa-bolt mr-1"></i>Điền mẫu thử
          </button>
        </div>

        <!-- Thanh công cụ Kéo thả / Tải File .TXT, .TEX hoặc Dán ảnh Ctrl+V -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-white p-3 rounded-xl border border-indigo-100 shadow-2xs">
          <div id="ansKeyTxtTexDropZone" data-drop-target="ansKeyFileInput" class="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-indigo-50/50 border border-dashed border-indigo-300 hover:bg-indigo-50 transition">
            <div class="min-w-0">
              <div class="font-bold text-indigo-900 flex items-center gap-1.5">
                <i class="fa-solid fa-file-code text-indigo-600"></i>
                <span>Kéo thả hoặc tải file .TXT / .TEX</span>
              </div>
              <div class="text-[10px] text-slate-500 mt-0.5">Thả trực tiếp file vào ô này • Tự bóc <code class="font-mono">\\True</code>, <code class="font-mono">\\choiceTF</code>, <code class="font-mono">\\shortans</code>, <code class="font-mono">\\dapso</code></div>
            </div>
            <input type="file" id="ansKeyFileInput" accept=".txt,.tex,text/plain,application/x-tex" class="hidden" onchange="App.handleAnswerKeyFileUpload(event)">
            <button type="button" onclick="document.getElementById('ansKeyFileInput').click()" class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-[11px] shrink-0 cursor-pointer inline-flex items-center gap-1.5 shadow-2xs">
              <i class="fa-solid fa-upload"></i><span>Tải .TXT / .TEX</span>
            </button>
          </div>

          <div id="ansKeyImageDropZone" data-drop-target="ansKeyImageInput" tabindex="0" class="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-emerald-50/60 border border-dashed border-emerald-300 hover:bg-emerald-50 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200 outline-none transition" title="Kéo thả ảnh vào ô này hoặc chụp màn hình rồi nhấn Ctrl+V">
            <div class="min-w-0">
              <div class="font-bold text-emerald-900 flex items-center gap-1.5">
                <i class="fa-solid fa-paste text-emerald-600"></i>
                <span>Kéo thả ảnh hoặc nhấn <kbd class="px-1.5 py-0.5 bg-white border border-emerald-300 rounded font-mono text-[10px] shadow-2xs">Ctrl + V</kbd></span>
              </div>
              <div class="text-[10px] text-emerald-700 mt-0.5">Thả ảnh đáp án vào đây hoặc dán trực tiếp để tự nhận diện OCR</div>
            </div>
            <input type="file" id="ansKeyImageInput" accept="image/*" class="hidden" onchange="App.handleAnswerKeyImageSelect(event)">
            <button type="button" onclick="document.getElementById('ansKeyImageInput').click()" class="px-2.5 py-1.5 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg font-bold text-[11px] shrink-0 cursor-pointer inline-flex items-center gap-1">
              <i class="fa-solid fa-image"></i><span>Chọn ảnh</span>
            </button>
          </div>
        </div>

        ${d.ocrMeta ? `
          <div class="p-3 rounded-xl border ${d.ocrMeta.status === 'error' ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-white border-emerald-200 text-slate-800'} space-y-2">
            <div class="flex items-center gap-3">
              ${d.ocrMeta.previewUrl ? `<img src="${d.ocrMeta.previewUrl}" alt="Ảnh đáp án vừa dán" onclick="App.previewFullImage('${d.ocrMeta.previewUrl}')" class="w-16 h-12 object-cover rounded-lg border border-slate-200 shrink-0 cursor-pointer">` : ''}
              <div class="flex-1 min-w-0 space-y-1">
                ${d.ocrMeta.status === 'running' ? `
                  <div id="ocrProgressStatusText" class="text-[11px] font-bold text-indigo-700 flex items-center gap-1.5">
                    <i class="fa-solid fa-spinner fa-spin"></i><span>${d.ocrMeta.message || 'Đang nhận diện ảnh...'}</span>
                  </div>
                  <div class="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div id="ocrProgressBarFill" class="h-full bg-indigo-600 transition-all duration-200" style="width:${d.ocrMeta.progress || 10}%"></div>
                  </div>
                ` : `
                  <div class="text-[11px] font-bold ${d.ocrMeta.status === 'error' ? 'text-rose-700' : 'text-emerald-700'} flex items-center gap-1.5">
                    <i class="fa-solid ${d.ocrMeta.status === 'error' ? 'fa-triangle-exclamation' : 'fa-circle-check'}"></i>
                    <span>${d.ocrMeta.summary}</span>
                  </div>
                `}
              </div>
            </div>
            ${d.ocrMeta.status === 'done' ? `
              <details class="text-[11px]">
                <summary class="cursor-pointer font-bold text-indigo-600 hover:underline select-none">Xem / Chỉnh văn bản OCR nhận diện được &amp; Áp dụng lại</summary>
                <div class="mt-2 space-y-1.5">
                  <textarea id="ocrRawTextEditor" rows="3" class="w-full p-2 border border-slate-200 rounded-lg font-mono text-[11px] bg-slate-50">${String(d.ocrMeta.rawText || '').replace(/</g, '&lt;')}</textarea>
                  <div class="flex justify-end">
                    <button type="button" onclick="App.reapplyOcrTextEditor()" class="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-[11px] cursor-pointer">
                      <i class="fa-solid fa-rotate mr-1"></i>Phân tích lại văn bản OCR
                    </button>
                  </div>
                </div>
              </details>
            ` : ''}
          </div>
        ` : ''}

        <!-- Chỉnh số câu mỗi phần (3 hoặc 4 phần) & nhập nhanh Phần I -->
        <div class="grid grid-cols-2 sm:grid-cols-7 gap-2 items-end bg-white p-2.5 rounded-xl border border-slate-200">
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
          <div>
            <label class="block text-[10px] font-bold text-purple-700 mb-0.5" title="Nhập > 0 nếu đề có Phần IV Tự luận">Số câu P.IV (TL)</label>
            <input type="number" min="0" max="20" value="${d.p4.length}" onchange="App.resizeAnswerKeyDraft('p4', this.value)" class="w-full px-2 py-1 border border-purple-200 bg-purple-50/40 rounded-lg font-mono font-bold text-purple-700 text-center">
          </div>
          <div class="col-span-2 sm:col-span-3 flex gap-1.5">
            <input type="text" id="quickP1Input" placeholder="Dán nhanh P.I: 1C 2D 3A... hoặc CDAC..." onkeydown="if(event.key==='Enter'){event.preventDefault();App.applyQuickP1Input();}" class="flex-1 min-w-0 px-2.5 py-1 border border-slate-200 rounded-lg font-mono text-xs">
            <button type="button" onclick="App.applyQuickP1Input()" class="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-[11px] shrink-0 cursor-pointer">Điền P.I</button>
          </div>
        </div>

        <!-- Cấu hình thang điểm: Mặc định THPT QG / Chia đều theo phần / Điểm riêng từng câu -->
        <div class="bg-white p-3 rounded-xl border border-slate-200 space-y-2.5">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="font-bold text-slate-800 flex items-center gap-1.5">
              <i class="fa-solid fa-sliders text-amber-600"></i>
              <span>Cách tính điểm (bỏ trống tổng phần = mặc định THPT QG môn Toán)</span>
            </div>
            <div class="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-100">
              <button type="button" onclick="App.setDraftScoringMode('equal')" class="px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${!isCustomPts ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-800'}">Chia đều / Mặc định THPT QG</button>
              <button type="button" onclick="App.setDraftScoringMode('custom')" class="px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${isCustomPts ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-800'}">Nhập điểm riêng từng câu</button>
            </div>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <label class="block text-[10px] font-bold text-indigo-700 mb-0.5">Tổng điểm Phần I</label>
              <input type="text" inputmode="decimal" value="${d.scoring.p1Total}" oninput="App.setDraftSectionTotal('p1', this.value)" placeholder="Mặc định: ${+(d.p1.length * 0.25).toFixed(2)}đ" class="w-full px-2.5 py-1 border border-slate-200 rounded-lg font-mono text-xs text-slate-800">
            </div>
            <div>
              <label class="block text-[10px] font-bold text-emerald-700 mb-0.5">Tổng điểm Phần II</label>
              <input type="text" inputmode="decimal" value="${d.scoring.p2Total}" oninput="App.setDraftSectionTotal('p2', this.value)" placeholder="Mặc định: ${+(d.p2.length * 1.0).toFixed(2)}đ" class="w-full px-2.5 py-1 border border-slate-200 rounded-lg font-mono text-xs text-slate-800">
            </div>
            <div>
              <label class="block text-[10px] font-bold text-amber-700 mb-0.5">Tổng điểm Phần III</label>
              <input type="text" inputmode="decimal" value="${d.scoring.p3Total}" oninput="App.setDraftSectionTotal('p3', this.value)" placeholder="Mặc định: ${+(d.p3.length * 0.5).toFixed(2)}đ" class="w-full px-2.5 py-1 border border-slate-200 rounded-lg font-mono text-xs text-slate-800">
            </div>
            <div>
              <label class="block text-[10px] font-bold text-purple-700 mb-0.5">Tổng điểm Phần IV (TL)</label>
              <input type="text" inputmode="decimal" value="${d.scoring.p4Total}" oninput="App.setDraftSectionTotal('p4', this.value)" ${d.p4.length === 0 ? 'disabled' : ''} placeholder="${d.p4.length > 0 ? `Mặc định: ${+(d.p4.length * 1.0).toFixed(2)}đ` : 'Chưa bật P.IV'}" class="w-full px-2.5 py-1 border border-slate-200 rounded-lg font-mono text-xs ${d.p4.length === 0 ? 'bg-slate-100 text-slate-400' : 'text-slate-800'}">
            </div>
          </div>

          <div class="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500">
            <span>Mặc định THPT QG: P.I = 0,25đ/câu • P.II = 1,0đ/câu (lũy tiến 1 ý 10%, 2 ý 25%, 3 ý 50%, 4 ý 100%) • P.III = 0,5đ/câu • P.IV = 1,0đ/câu.</span>
            ${isCustomPts ? `
              <button type="button" onclick="App.distributeSectionPointsToCustom(true)" class="text-indigo-600 font-bold hover:underline cursor-pointer shrink-0">
                <i class="fa-solid fa-arrows-split-up-and-left mr-1"></i>Chia đều từ tổng phần vào từng câu
              </button>
            ` : ''}
          </div>
        </div>

        <div class="max-h-80 overflow-y-auto space-y-3 pr-1">
          ${d.p1.length > 0 ? `
            <div class="space-y-1.5">
              <div class="text-[11px] font-bold text-indigo-800 uppercase">Phần I — Trắc nghiệm 4 lựa chọn (${d.p1.length} câu • Tổng ${maxSum.p1Max}đ)</div>
              <div class="grid grid-cols-1 sm:grid-cols-2 ${isCustomPts ? 'md:grid-cols-3' : 'md:grid-cols-4'} gap-1.5">
                ${d.p1.map((ans, idx) => `
                  <div class="flex items-center justify-between gap-1.5 bg-white px-2 py-1.5 rounded-lg border border-slate-200">
                    <span class="font-mono font-bold text-slate-600 text-[11px] shrink-0">C${idx + 1}</span>
                    <div class="flex gap-1">
                      ${['A', 'B', 'C', 'D'].map(opt => `
                        <button type="button" onclick="App.setDraftP1(${idx}, '${opt}')" class="w-5 h-5 rounded text-[10px] font-bold border transition cursor-pointer ${ans === opt ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-indigo-50'}">${opt}</button>
                      `).join('')}
                    </div>
                    ${isCustomPts ? `
                      <input type="text" inputmode="decimal" value="${(d.qPoints.p1 && d.qPoints.p1[idx]) ?? ''}" oninput="App.setDraftQuestionPoints('p1', ${idx}, this.value)" placeholder="0.25" title="Điểm Câu ${idx + 1}" class="w-12 px-1 py-0.5 border border-indigo-200 bg-indigo-50/40 rounded font-mono text-[10px] font-bold text-center text-indigo-800">
                    ` : ''}
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          ${d.p2.length > 0 ? `
            <div class="space-y-1.5">
              <div class="text-[11px] font-bold text-emerald-800 uppercase">Phần II — Đúng / Sai (${d.p2.length} câu • Tổng ${maxSum.p2Max}đ)</div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                ${d.p2.map((obj, idx) => `
                  <div class="bg-white p-2 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-1.5">
                    <span class="font-mono font-bold text-slate-700 text-[11px] shrink-0">Câu ${idx + 1}</span>
                    <div class="flex flex-wrap gap-1">
                      ${['a', 'b', 'c', 'd'].map(sub => `
                        <span class="inline-flex items-center gap-0.5 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                          <b class="font-mono text-[10px] text-slate-600">${sub})</b>
                          <button type="button" onclick="App.setDraftP2(${idx}, '${sub}', true)" class="px-1.5 py-0.2 rounded text-[10px] font-bold cursor-pointer ${obj[sub] === true ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:bg-emerald-50'}">Đ</button>
                          <button type="button" onclick="App.setDraftP2(${idx}, '${sub}', false)" class="px-1.5 py-0.2 rounded text-[10px] font-bold cursor-pointer ${obj[sub] === false ? 'bg-rose-600 text-white' : 'text-slate-500 hover:bg-rose-50'}">S</button>
                        </span>
                      `).join('')}
                    </div>
                    ${isCustomPts ? `
                      <input type="text" inputmode="decimal" value="${(d.qPoints.p2 && d.qPoints.p2[idx]) ?? ''}" oninput="App.setDraftQuestionPoints('p2', ${idx}, this.value)" placeholder="1.0" title="Điểm Câu ${idx + 1}" class="w-12 px-1 py-0.5 border border-emerald-200 bg-emerald-50/40 rounded font-mono text-[10px] font-bold text-center text-emerald-800">
                    ` : ''}
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          ${d.p3.length > 0 ? `
            <div class="space-y-1.5">
              <div class="text-[11px] font-bold text-amber-800 uppercase">Phần III — Trả lời ngắn (${d.p3.length} câu • Tổng ${maxSum.p3Max}đ • Gõ dấu , hoặc . đều hiển thị dấu ,)</div>
              <div class="grid grid-cols-2 sm:grid-cols-3 ${isCustomPts ? 'md:grid-cols-4' : 'md:grid-cols-6'} gap-1.5">
                ${d.p3.map((val, idx) => `
                  <div class="bg-white px-2 py-1.5 rounded-lg border border-slate-200 flex items-center gap-1.5">
                    <span class="font-mono font-bold text-slate-600 text-[11px] shrink-0">C${idx + 1}</span>
                    <input type="text" inputmode="decimal" maxlength="12" value="${this.formatShortAnsDisplay(val ?? '').replace(/"/g, '&quot;')}" oninput="App.setDraftP3(${idx}, this.value, this)" placeholder="VD: 1,5" class="w-full min-w-0 px-1.5 py-0.5 border border-slate-200 rounded font-mono font-bold text-center text-xs text-slate-800">
                    ${isCustomPts ? `
                      <input type="text" inputmode="decimal" value="${(d.qPoints.p3 && d.qPoints.p3[idx]) ?? ''}" oninput="App.setDraftQuestionPoints('p3', ${idx}, this.value)" placeholder="0.5" title="Điểm Câu ${idx + 1}" class="w-12 shrink-0 px-1 py-0.5 border border-amber-200 bg-amber-50/40 rounded font-mono text-[10px] font-bold text-center text-amber-800">
                    ` : ''}
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          ${d.p4.length > 0 ? `
            <div class="space-y-1.5">
              <div class="text-[11px] font-bold text-purple-800 uppercase">Phần IV — Tự luận (${d.p4.length} câu • Tổng ${maxSum.p4Max}đ • Học sinh nhập lời giải hoặc chụp ảnh bài làm)</div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                ${d.p4.map((val, idx) => `
                  <div class="bg-white px-2.5 py-1.5 rounded-lg border border-purple-200 flex items-center gap-2">
                    <span class="font-mono font-bold text-purple-800 text-[11px] shrink-0">TL ${idx + 1}</span>
                    <input type="text" value="${String(val ?? '').replace(/"/g, '&quot;')}" oninput="App.setDraftP4(${idx}, this.value)" placeholder="Đáp số / Gợi ý chấm (tùy chọn)..." class="flex-1 min-w-0 px-2 py-0.5 border border-slate-200 rounded text-xs text-slate-800">
                    ${isCustomPts ? `
                      <input type="text" inputmode="decimal" value="${(d.qPoints.p4 && d.qPoints.p4[idx]) ?? ''}" oninput="App.setDraftQuestionPoints('p4', ${idx}, this.value)" placeholder="1.0" title="Điểm Câu Tự luận ${idx + 1}" class="w-14 shrink-0 px-1.5 py-0.5 border border-purple-300 bg-purple-50/50 rounded font-mono text-[10px] font-bold text-center text-purple-800">
                    ` : ''}
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  },

  buildExamStructureDesc(parts) {
    const segs = [
      `${parts.part1.length} câu Phần I`,
      `${parts.part2.length} câu Phần II`,
      `${parts.part3.length} câu Phần III`
    ];
    if (parts.part4 && parts.part4.length > 0) {
      segs.push(`${parts.part4.length} câu Phần IV (Tự luận)`);
    }
    const maxSum = GradingSystem.computeExamMaxSummary(parts);
    return `Cấu trúc ${segs.join(', ')} • Tổng ${maxSum.maxTotal} điểm.`;
  },

  saveExamAnswerKey(examId) {
    const exam = this.state.exams.find(e => e.id === examId);
    if (!exam) return;
    const parts = this.buildPartsFromDraft(this.state.answerKeyDraft);
    exam.part1 = parts.part1;
    exam.part2 = parts.part2;
    exam.part3 = parts.part3;
    exam.part4 = parts.part4;
    exam.scoring = parts.scoring;
    exam.description = this.buildExamStructureDesc(parts);

    // Tự động chấm lại các bài đã nộp của đề này theo bảng đáp án & thang điểm mới
    const nowIso = new Date().toISOString();
    this.state.submissions.forEach(sub => {
      if (sub.examId === examId) {
        sub.scoreResult = GradingSystem.grade(sub.answers || {}, exam);
        sub.updatedAt = nowIso;
        this.pushStudentSubmissionToCloud(sub);
      }
    });

    this.saveData({ markAdminDirty: true });
    document.getElementById('updatePdfModal')?.remove();
    this.render();
    const p4Note = parts.part4.length > 0 ? ` • ${parts.part4.length} câu P.IV (Tự luận)` : '';
    this.notify(`Đã lưu đáp án & thang điểm (${parts.part1.length} câu P.I • ${parts.part2.length} câu P.II • ${parts.part3.length} câu P.III${p4Note}) cho đề "${exam.title}".`, 'success', 'Lưu đáp án thành công');
  },

  cleanupUnusedPreuploads() {
    if (this._preuploadedExamPdfPromise) {
      const p = this._preuploadedExamPdfPromise;
      this._preuploadedExamPdfPromise = null;
      p.then(u => { if (u) this.deleteServerPdfByUrl(u); }).catch(() => {});
    }
    if (this._preuploadedSolPdfPromise) {
      const p = this._preuploadedSolPdfPromise;
      this._preuploadedSolPdfPromise = null;
      p.then(u => { if (u) this.deleteServerPdfByUrl(u); }).catch(() => {});
    }
  },

  showCreateExamModal() {
    this.cleanupUnusedPreuploads();
    this.state.tempSelectedPdfFile = null;
    this.state.tempSelectedSolutionPdfFile = null;
    this._examPdfUploadToken = null;
    this._solPdfUploadToken = null;
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
            <p class="text-xs text-slate-500 mt-0.5">Tải lên là tự động lưu trực tiếp trên máy chủ đám mây, học sinh mở điện thoại xem ngay</p>
          </div>
          <button onclick="App.cleanupUnusedPreuploads(); document.getElementById('createExamModal')?.remove()" class="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer"><i class="fa-solid fa-xmark text-base"></i></button>
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
          <div id="questionPdfDropZone" data-drop-target="pdfFileInput" class="border-2 border-dashed border-indigo-200 rounded-2xl p-4 bg-slate-50/80 hover:bg-indigo-50/30 transition space-y-2">
            <div class="flex flex-wrap items-center justify-between gap-1">
              <label class="text-xs font-bold text-slate-800 flex items-center">
                <i class="fa-solid fa-file-pdf text-red-500 mr-1.5"></i>1. File PDF Đề Thi *:
              </label>
              <span class="text-[11px] font-medium text-indigo-600"><i class="fa-solid fa-hand-pointer mr-1"></i>Kéo thả trực tiếp file .PDF vào ô này hoặc chọn file</span>
            </div>

            <div class="flex flex-col sm:flex-row gap-2">
              <input type="file" id="pdfFileInput" accept=".pdf,application/pdf" class="hidden" onchange="App.handlePdfFileSelect(event)">
              <button type="button" onclick="document.getElementById('pdfFileInput').click()" class="px-4 py-2 bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 rounded-xl font-bold text-xs shadow-sm transition flex items-center justify-center shrink-0 cursor-pointer">
                <i class="fa-solid fa-arrow-up-from-bracket mr-2"></i>Chọn / Kéo Thả PDF Đề Thi
              </button>
              <input type="text" id="newExamPdfUrl" placeholder="Kéo thả file .pdf vào đây hoặc dán đường dẫn..." class="flex-1 px-3 py-2 border rounded-xl font-mono text-xs bg-white">
            </div>
            <div id="pdfSelectedBadge" class="text-xs text-emerald-600 font-semibold hidden"></div>
          </div>

          <!-- 2. UPLOAD FILE PDF ĐÁP ÁN & LỜI GIẢI CHI TIẾT -->
          <div id="solutionPdfDropZone" data-drop-target="solutionPdfFileInput" class="border-2 border-dashed border-emerald-200 rounded-2xl p-4 bg-emerald-50/40 hover:bg-emerald-50/70 transition space-y-2">
            <div class="flex flex-wrap items-center justify-between gap-1">
              <label class="text-xs font-bold text-slate-800 flex items-center">
                <i class="fa-solid fa-file-circle-check text-emerald-600 mr-1.5"></i>2. File PDF Đáp Án &amp; Lời Giải Chi Tiết (Tùy chọn):
              </label>
              <span class="text-[11px] font-medium text-emerald-700"><i class="fa-solid fa-hand-pointer mr-1"></i>Kéo thả trực tiếp file .PDF vào ô này</span>
            </div>

            <div class="flex flex-col sm:flex-row gap-2">
              <input type="file" id="solutionPdfFileInput" accept=".pdf,application/pdf" class="hidden" onchange="App.handleSolutionPdfFileSelect(event)">
              <button type="button" onclick="document.getElementById('solutionPdfFileInput').click()" class="px-4 py-2 bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50 rounded-xl font-bold text-xs shadow-sm transition flex items-center justify-center shrink-0 cursor-pointer">
                <i class="fa-solid fa-file-arrow-up mr-2"></i>Chọn / Kéo Thả PDF Đáp Án
              </button>
              <input type="text" id="newExamSolutionPdfUrl" placeholder="Kéo thả file .pdf đáp án vào đây hoặc dán đường dẫn..." class="flex-1 px-3 py-2 border rounded-xl font-mono text-xs bg-white">
            </div>
            <div id="solutionPdfSelectedBadge" class="text-xs text-emerald-700 font-semibold hidden"></div>
          </div>

          <!-- 3. BẢNG ĐÁP ÁN CHẤM ĐIỂM TỰ ĐỘNG -->
          <div id="answerKeyEditorHost" data-drop-target="ansKeyEditorSmart">
            ${this.renderAnswerKeyEditorHtml()}
          </div>

          <div class="pt-3 flex space-x-2">
            <button type="submit" id="createExamSubmitBtn" class="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center cursor-pointer">
              <i class="fa-solid fa-check mr-2"></i>Xuất Bản Đề Thi PDF
            </button>
            <button type="button" onclick="App.cleanupUnusedPreuploads(); document.getElementById('createExamModal')?.remove()" class="px-5 py-3 bg-slate-100 rounded-xl font-semibold text-slate-700 cursor-pointer">
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

    if (this._preuploadedExamPdfPromise) {
      const oldP = this._preuploadedExamPdfPromise;
      oldP.then(u => { if (u) this.deleteServerPdfByUrl(u); }).catch(() => {});
    }

    this.state.tempSelectedPdfFile = file;
    const sizeMb = (file.size / 1024 / 1024).toFixed(2);
    const badge = document.getElementById('pdfSelectedBadge');
    const urlInput = document.getElementById('newExamPdfUrl');

    const titleEl = document.getElementById('newExamTitle');
    if (titleEl && !titleEl.value.trim()) {
      titleEl.value = file.name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ').trim();
    }
    const gradeMatch = file.name.match(/(?:toan|khoi|lop)[_\-\s]*(1[0-2]|[6-9])\b/i);
    const gradeEl = document.getElementById('newExamGrade');
    if (gradeMatch && gradeEl) gradeEl.value = gradeMatch[1];

    if (this.isServerSyncEnabled()) {
      const token = Symbol('examPdf');
      this._examPdfUploadToken = token;
      if (urlInput) urlInput.value = 'Đang tự động lưu lên máy chủ: ' + file.name;
      if (badge) {
        badge.innerHTML = `<i class="fa-solid fa-spinner fa-spin text-indigo-600 mr-1"></i>Đã chọn: <strong>${file.name}</strong> (${sizeMb} MB) — Đang tự động lưu lên máy chủ...`;
        badge.classList.remove('hidden');
      }
      this._preuploadedExamPdfPromise = this.uploadPdfToServer('EXAM_Q_' + Date.now(), file)
        .then((serverUrl) => {
          if (this._examPdfUploadToken === token) {
            const inp = document.getElementById('newExamPdfUrl');
            if (inp) inp.value = serverUrl;
            const b = document.getElementById('pdfSelectedBadge');
            if (b) b.innerHTML = `<i class="fa-solid fa-cloud-arrow-up text-emerald-600 mr-1"></i>Đã tự động lưu PDF lên máy chủ: <strong>${file.name}</strong> (${sizeMb} MB)!`;
          }
          return serverUrl;
        })
        .catch(() => {
          if (this._examPdfUploadToken === token) {
            const inp = document.getElementById('newExamPdfUrl');
            if (inp) inp.value = 'File cục bộ: ' + file.name;
            const b = document.getElementById('pdfSelectedBadge');
            if (b) b.innerHTML = `<i class="fa-solid fa-circle-check text-amber-600 mr-1"></i>Đã lưu tạm vào máy (${sizeMb} MB) — Tự động đồng bộ lên máy chủ ngay khi có mạng!`;
          }
          return '';
        });
    } else {
      this._preuploadedExamPdfPromise = null;
      if (urlInput) urlInput.value = 'File cục bộ: ' + file.name;
      if (badge) {
        badge.innerHTML = `<i class="fa-solid fa-circle-check text-emerald-500 mr-1"></i>Đã chọn file PDF Đề: <strong>${file.name}</strong> (${sizeMb} MB)`;
        badge.classList.remove('hidden');
      }
    }
  },

  handleSolutionPdfFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (this._preuploadedSolPdfPromise) {
      const oldP = this._preuploadedSolPdfPromise;
      oldP.then(u => { if (u) this.deleteServerPdfByUrl(u); }).catch(() => {});
    }

    this.state.tempSelectedSolutionPdfFile = file;
    const sizeMb = (file.size / 1024 / 1024).toFixed(2);
    const badge = document.getElementById('solutionPdfSelectedBadge');
    const urlInput = document.getElementById('newExamSolutionPdfUrl');

    if (this.isServerSyncEnabled()) {
      const token = Symbol('solPdf');
      this._solPdfUploadToken = token;
      if (urlInput) urlInput.value = 'Đang tự động lưu lên máy chủ: ' + file.name;
      if (badge) {
        badge.innerHTML = `<i class="fa-solid fa-spinner fa-spin text-indigo-600 mr-1"></i>Đã chọn PDF Đáp án: <strong>${file.name}</strong> (${sizeMb} MB) — Đang tự động lưu lên máy chủ...`;
        badge.classList.remove('hidden');
      }
      this._preuploadedSolPdfPromise = this.uploadPdfToServer('EXAM_SOL_' + Date.now(), file)
        .then((serverUrl) => {
          if (this._solPdfUploadToken === token) {
            const inp = document.getElementById('newExamSolutionPdfUrl');
            if (inp) inp.value = serverUrl;
            const b = document.getElementById('solutionPdfSelectedBadge');
            if (b) b.innerHTML = `<i class="fa-solid fa-cloud-arrow-up text-emerald-600 mr-1"></i>Đã tự động lưu PDF Đáp án lên máy chủ: <strong>${file.name}</strong> (${sizeMb} MB)!`;
          }
          return serverUrl;
        })
        .catch(() => {
          if (this._solPdfUploadToken === token) {
            const inp = document.getElementById('newExamSolutionPdfUrl');
            if (inp) inp.value = 'File cục bộ: ' + file.name;
            const b = document.getElementById('solutionPdfSelectedBadge');
            if (b) b.innerHTML = `<i class="fa-solid fa-circle-check text-amber-600 mr-1"></i>Đã lưu tạm vào máy (${sizeMb} MB) — Tự động đồng bộ lên máy chủ ngay khi có mạng!`;
          }
          return '';
        });
    } else {
      this._preuploadedSolPdfPromise = null;
      if (urlInput) urlInput.value = 'File cục bộ: ' + file.name;
      if (badge) {
        badge.innerHTML = `<i class="fa-solid fa-circle-check text-emerald-600 mr-1"></i>Đã chọn file PDF Đáp án: <strong>${file.name}</strong> (${sizeMb} MB)`;
        badge.classList.remove('hidden');
      }
    }
  },

  onNewExamAccessChange(mode) {
    const box = document.getElementById('newExamCustomStudentsBox');
    if (box) box.classList.toggle('hidden', mode !== 'custom');
  },

  async handleCreateExamSubmit(skipBlankConfirm = false) {
    if (this._creatingExamInProgress) return;
    const title = document.getElementById('newExamTitle').value.trim();
    const inputUrl = document.getElementById('newExamPdfUrl').value.trim();
    const isPlaceholderUrl = inputUrl.startsWith('File cục bộ:') || inputUrl.startsWith('Đang tự động lưu lên máy chủ:');
    if (!this.state.tempSelectedPdfFile && (!inputUrl || isPlaceholderUrl)) {
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

    this._creatingExamInProgress = true;
    const submitBtn = document.getElementById('createExamSubmitBtn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Đang tự động lưu đề thi lên máy chủ...';
    }

    try {
      const grade = parseInt(document.getElementById('newExamGrade')?.value, 10) || 12;
      const category = document.getElementById('newExamCategory')?.value || 'GK1';
      const roundLabel = (document.getElementById('newExamRound')?.value || '').trim() || 'Đợt 1';
      const time = parseInt(document.getElementById('newExamTime').value, 10) || 90;
      const accessMode = document.getElementById('newExamAccess')?.value || 'all';
      const checkedStudents = Array.from(document.querySelectorAll('#createExamModal input[name="newExamStudentCheck"]:checked')).map(cb => cb.value);
      const examId = 'EXAM-' + Date.now();

      let finalPdfUrl = inputUrl;
      let finalPdfName = inputUrl;
      if (this.state.tempSelectedPdfFile) {
        finalPdfName = this.state.tempSelectedPdfFile.name;
        if (typeof PDFStorage !== 'undefined') {
          await PDFStorage.savePdf(examId, this.state.tempSelectedPdfFile);
        }
        let serverUrl = '';
        if (this._preuploadedExamPdfPromise) {
          serverUrl = await this._preuploadedExamPdfPromise;
        } else if (this.isServerSyncEnabled()) {
          serverUrl = await this.uploadPdfToServer(examId, this.state.tempSelectedPdfFile).catch(() => '');
        }
        finalPdfUrl = serverUrl || (typeof PDFStorage !== 'undefined' ? ('idb:' + examId) : '');
        if (finalPdfUrl) this.setPdfCacheVersion(examId, finalPdfUrl);
      }

      let finalSolutionPdfUrl = '';
      let finalSolutionPdfName = '';
      if (this.state.tempSelectedSolutionPdfFile) {
        finalSolutionPdfName = this.state.tempSelectedSolutionPdfFile.name;
        if (typeof PDFStorage !== 'undefined') {
          await PDFStorage.savePdf(examId + '_sol', this.state.tempSelectedSolutionPdfFile);
        }
        let serverSolUrl = '';
        if (this._preuploadedSolPdfPromise) {
          serverSolUrl = await this._preuploadedSolPdfPromise;
        } else if (this.isServerSyncEnabled()) {
          serverSolUrl = await this.uploadPdfToServer(examId + '_sol', this.state.tempSelectedSolutionPdfFile).catch(() => '');
        }
        finalSolutionPdfUrl = serverSolUrl || (typeof PDFStorage !== 'undefined' ? ('idb:' + examId + '_sol') : '');
        if (finalSolutionPdfUrl) this.setPdfCacheVersion(examId + '_sol', finalSolutionPdfUrl);
      } else {
        const inputSolUrl = document.getElementById('newExamSolutionPdfUrl').value.trim();
        if (inputSolUrl && !inputSolUrl.startsWith('File cục bộ:') && !inputSolUrl.startsWith('Đang tự động lưu lên máy chủ:')) {
          finalSolutionPdfUrl = inputSolUrl;
          finalSolutionPdfName = inputSolUrl;
        }
      }

      const parts = this.buildPartsFromDraft(this.state.answerKeyDraft);

      const finalExam = {
        id: examId,
        title: title,
        description: this.buildExamStructureDesc(parts),
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
        scoring: parts.scoring,
        part1: parts.part1,
        part2: parts.part2,
        part3: parts.part3,
        part4: parts.part4
      };

      this.state.exams.unshift(finalExam);
      this.saveData({ markAdminDirty: true, skipAutoPush: true });
      this.state.tempSelectedPdfFile = null;
      this.state.tempSelectedSolutionPdfFile = null;
      this._preuploadedExamPdfPromise = null;
      this._preuploadedSolPdfPromise = null;
      await this.pushAdminStateToCloud({ manual: false });
      document.getElementById('createExamModal')?.remove();
      this.render();
      this.notify(`Đã xuất bản và tự động lưu đề thi "${title}" lên máy chủ đám mây! Học sinh xem được ngay trên mọi điện thoại.`, 'success', 'Đã tự động lưu đề thi lên Server');
    } finally {
      this._creatingExamInProgress = false;
    }
  },

  toggleExamActive(id) {
    const ex = this.state.exams.find(e => e.id === id);
    if (ex) {
      ex.is_active = !ex.is_active;
      this.saveData({ markAdminDirty: true });
      this.render();
    }
  },

  toggleExamViewAnswers(id) {
    const ex = this.state.exams.find(e => e.id === id);
    if (ex) {
      ex.allow_view_answers = ex.allow_view_answers === false ? true : false;
      this.saveData({ markAdminDirty: true });
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
        if (ex) {
          this.deleteServerPdfByUrl(ex.pdf_url);
          this.deleteServerPdfByUrl(ex.solution_pdf_url);
        }
        this.markDeletedId(id);
        this.saveData({ markAdminDirty: true });
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
    const students = this.getFilteredGradebookStudents();

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
      this.saveData({ markAdminDirty: true });
      this.render();
    }
  },

  isStudentCompareAllowed() {
    return Boolean(
      this.state.settings &&
      this.state.settings.allowStudentViewOwnScore !== false &&
      this.state.settings.allowStudentViewClassBoard === true
    );
  },

  getAllowedCompareScopes() {
    const cfg = (this.state.settings && this.state.settings.studentCompareScope) || 'both';
    if (cfg === 'class') return ['class'];
    if (cfg === 'grade') return ['grade'];
    return ['class', 'grade'];
  },

  setStudentCompareScope(scope) {
    const valid = ['both', 'class', 'grade'].includes(scope) ? scope : 'both';
    if (!this.state.settings) this.state.settings = {};
    this.state.settings.studentCompareScope = valid;
    if (valid === 'class') this.state.studentCompareMode = 'class';
    else if (valid === 'grade') this.state.studentCompareMode = 'grade';
    this.saveData({ markAdminDirty: true });
    this.render();
  },

  setStudentCompareMode(mode) {
    const allowed = this.getAllowedCompareScopes();
    this.state.studentCompareMode = allowed.includes(mode) ? mode : allowed[0];
    this.render();
  },

  setStudentCompareExamFilter(examId) {
    this.state.studentCompareExamFilter = examId || 'ALL';
    this.render();
  },

  // Tính bảng so sánh kết quả: Học sinh CHỈ được so với Lớp mình hoặc Toàn khối mình khi Admin mở
  getStudentPeerComparison(student, requestedScope = null, examFilterId = null) {
    const myGrade = student ? this.getStudentGrade(student) : 12;
    const myClass = student ? String(student.className || '').trim() : '';
    const allowedScopes = this.getAllowedCompareScopes();
    if (!student || !this.isStudentCompareAllowed()) {
      return {
        allowed: false,
        scope: allowedScopes[0] || 'class',
        allowedScopes,
        myGrade,
        myClass,
        peerStudents: [],
        allCohortExams: [],
        targetExams: [],
        examFilter: 'ALL',
        rankedList: [],
        myRank: null,
        myEntry: null,
        cohortAvg: null,
        activeParticipants: 0
      };
    }

    const desiredScope = requestedScope || this.state.studentCompareMode || 'class';
    const scope = allowedScopes.includes(desiredScope) ? desiredScope : allowedScopes[0];

    const peerStudents = (this.state.students || []).filter(st => {
      if (this.getStudentGrade(st) !== myGrade) return false;
      if (scope === 'class') {
        return String(st.className || '').trim() === myClass;
      }
      return true;
    });

    const peerIds = new Set(peerStudents.map(st => st.studentId));
    const allCohortExams = (this.state.exams || []).filter(ex => {
      if ((Number(ex.grade) || 12) === myGrade) return true;
      return (this.state.submissions || []).some(sub => sub.examId === ex.id && peerIds.has(sub.studentId));
    });

    const rawExamFilter = examFilterId || this.state.studentCompareExamFilter || 'ALL';
    const examFilter = (rawExamFilter !== 'ALL' && allCohortExams.some(ex => ex.id === rawExamFilter))
      ? rawExamFilter
      : 'ALL';
    const targetExams = examFilter === 'ALL'
      ? allCohortExams
      : allCohortExams.filter(ex => ex.id === examFilter);

    const rawRanked = peerStudents.map(st => {
      const examScores = targetExams.map(ex => {
        const sub = (this.state.submissions || []).find(x => x.studentId === st.studentId && x.examId === ex.id);
        return sub && sub.scoreResult ? Number(sub.scoreResult.totalScore) : null;
      });
      const valid = examScores.filter(x => x !== null && !Number.isNaN(x));
      const avg = valid.length > 0 ? (valid.reduce((a, b) => a + b, 0) / valid.length) : -1;
      return { student: st, examScores, avg, completed: valid.length, rank: null };
    }).sort((a, b) => b.avg - a.avg || b.completed - a.completed || String(a.student.studentId).localeCompare(String(b.student.studentId)));

    // Gán thứ hạng chuẩn đồng hạng (chỉ xếp hạng các học sinh đã có bài nộp)
    let prevScoreKey = null;
    let prevRank = 0;
    let activeCount = 0;
    rawRanked.forEach((item) => {
      if (item.avg >= 0) {
        activeCount++;
        const scoreKey = item.avg.toFixed(4);
        if (scoreKey === prevScoreKey) {
          item.rank = prevRank;
        } else {
          item.rank = activeCount;
          prevRank = activeCount;
          prevScoreKey = scoreKey;
        }
      } else {
        item.rank = null;
      }
    });

    const myEntry = rawRanked.find(item => item.student.studentId === student.studentId) || null;
    const activeEntries = rawRanked.filter(item => item.avg >= 0);
    const cohortAvg = activeEntries.length > 0
      ? (activeEntries.reduce((sum, item) => sum + item.avg, 0) / activeEntries.length)
      : null;

    return {
      allowed: true,
      scope,
      allowedScopes,
      myGrade,
      myClass,
      peerStudents,
      allCohortExams,
      targetExams,
      examFilter,
      rankedList: rawRanked,
      myRank: myEntry ? myEntry.rank : null,
      myEntry,
      cohortAvg,
      activeParticipants: activeEntries.length
    };
  },

  setStudentScoreTab(tab) {
    this.state.studentScoreTab = tab;
    this.render();
  },

  async openPdfModal(title, pdfUrl, storageId = null) {
    const finalUrl = await this.resolvePdfSourceUrl(pdfUrl, storageId);
    if (!finalUrl) {
      this.notify('Mục này hiện chưa có file PDF đính kèm (hoặc Giáo viên chưa đồng bộ file PDF lên Đám mây)!', 'warning', 'Chưa có file PDF');
      return;
    }

    const old = document.getElementById('previewPdfModal');
    if (old) old.remove();

    const modal = document.createElement('div');
    modal.id = 'previewPdfModal';
    modal.className = 'fixed inset-0 z-50 flex flex-col bg-slate-900/85 backdrop-blur-sm p-2 sm:p-5 transition-all';
    modal.innerHTML = `
      <div class="bg-slate-900 rounded-2xl shadow-2xl flex-1 flex flex-col overflow-hidden border border-slate-700 max-w-6xl w-full mx-auto">
        <!-- Header -->
        <div class="px-3 sm:px-5 py-2.5 sm:py-3.5 bg-slate-800 border-b border-slate-700 flex items-center justify-between gap-2 text-white shrink-0">
          <div class="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
            <span class="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
              <i class="fa-solid fa-file-pdf"></i>
            </span>
            <div class="min-w-0 truncate">
              <h3 class="text-xs sm:text-sm font-bold text-white truncate">${title}</h3>
              <p class="text-[11px] text-slate-400 truncate hidden sm:block">Tệp nguồn: <span class="font-mono text-indigo-300">${pdfUrl || 'IndexedDB'}</span></p>
            </div>
          </div>
          <div class="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button type="button" id="pdfModalLayoutBtn" onclick="App.showExamLayoutModal('${String(storageId || '').replace(/_sol$/, '')}')" class="px-2.5 sm:px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white flex items-center gap-1.5 transition cursor-pointer shadow-xs whitespace-nowrap" title="Xem trước & đổi cách hiển thị Đề PDF và Ô điền đáp án">
              <i class="fa-solid fa-table-columns"></i>
              <span class="hidden sm:inline">Bố cục Đề &amp; Đáp án</span>
              <span class="sm:hidden">Bố cục</span>
            </button>
            ${!this.isStandaloneApp() ? `
              <a href="${finalUrl}" target="_blank" class="hidden sm:flex px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs text-indigo-300 hover:text-white items-center transition cursor-pointer whitespace-nowrap" title="Mở trong tab mới">
                <i class="fa-solid fa-arrow-up-right-from-square mr-1.5"></i>Tab Mới
              </a>
            ` : ''}
            <a href="${finalUrl}" download="Tai_Lieu_${Date.now()}.pdf" class="px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs text-white flex items-center transition cursor-pointer whitespace-nowrap" title="Tải về máy">
              <i class="fa-solid fa-download sm:mr-1.5"></i><span class="hidden sm:inline">Tải Về</span>
            </a>
            <button onclick="document.getElementById('previewPdfModal').remove()" class="w-8 h-8 rounded-lg bg-slate-700 hover:bg-red-600 text-white flex items-center justify-center transition cursor-pointer shrink-0">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>

        <!-- Trình xem PDF đa trang trực tiếp trong App -->
        <div id="modalPdfViewer" class="flex-1 w-full h-full min-h-0 flex flex-col bg-slate-950"></div>
      </div>
    `;
    document.body.appendChild(modal);
    this.mountPdfViewer('modalPdfViewer', finalUrl);
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
                          ${(sub.tabSwitches || 0) > 0 || (sub.screenshotCount || 0) > 0 ? `
                            <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                              <i class="fa-solid ${(sub.screenshotCount || 0) > 0 ? 'fa-camera' : 'fa-triangle-exclamation'} mr-1"></i>${sub.tabSwitches || sub.screenshotCount} lần${(sub.screenshotCount || 0) > 0 ? ` (${sub.screenshotCount} chụp)` : ''}
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

  cleanupUnusedHwPreupload() {
    if (this._preuploadedHwPdfPromise) {
      const p = this._preuploadedHwPdfPromise;
      this._preuploadedHwPdfPromise = null;
      p.then(u => { if (u) this.deleteServerPdfByUrl(u); }).catch(() => {});
    }
  },

  showAddHomeworkModal() {
    this.cleanupUnusedHwPreupload();
    this.state.tempSelectedHwFile = null;
    this._hwPdfUploadToken = null;
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
              <p class="text-xs text-slate-500 mt-0.5">Phân chia theo Khối 6 – 12, tự động lưu lên máy chủ và phân quyền học sinh</p>
            </div>
          </div>
          <button onclick="App.cleanupUnusedHwPreupload(); document.getElementById('addHomeworkModal')?.remove()" class="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer transition"><i class="fa-solid fa-xmark text-base"></i></button>
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
            <div id="newHwDropZone" data-drop-target="newHwFileInput" class="border-2 border-dashed border-indigo-200 rounded-xl p-4 text-center bg-indigo-50/40 hover:bg-indigo-50/80 transition cursor-pointer">
              <input type="file" id="newHwFileInput" accept=".pdf,application/pdf" class="hidden" onchange="App.handleHwFileSelect(event)">
              <label for="newHwFileInput" class="cursor-pointer block">
                <i class="fa-solid fa-cloud-arrow-up text-2xl text-indigo-600 mb-1"></i>
                <div class="text-xs font-bold text-slate-800">Kéo thả file PDF vào ô này hoặc bấm để chọn file</div>
                <div id="newHwFileBadge" class="text-[11px] text-slate-500 mt-1">Tự động lưu trực tiếp lên máy chủ đám mây, học sinh xem ngay trên mọi thiết bị</div>
              </label>
            </div>
          </div>

          <div class="pt-3 border-t border-slate-100 flex justify-end space-x-2.5">
            <button type="button" onclick="App.cleanupUnusedHwPreupload(); document.getElementById('addHomeworkModal')?.remove()" class="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer transition">Hủy</button>
            <button type="submit" id="addHomeworkSubmitBtn" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-200 transition inline-flex items-center gap-1.5 cursor-pointer">
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
    this.saveData({ markAdminDirty: true });
    this.render();
  },

  handleHwFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (this._preuploadedHwPdfPromise) {
      const oldP = this._preuploadedHwPdfPromise;
      oldP.then(u => { if (u) this.deleteServerPdfByUrl(u); }).catch(() => {});
    }
    this.state.tempSelectedHwFile = file;
    const sizeMb = (file.size / 1024 / 1024).toFixed(2);
    const badge = document.getElementById('newHwFileBadge');
    const titleEl = document.getElementById('newHwTitle');
    if (titleEl && !titleEl.value.trim()) {
      titleEl.value = file.name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ').trim();
    }
    if (this.isServerSyncEnabled()) {
      const token = Symbol('hwPdf');
      this._hwPdfUploadToken = token;
      if (badge) {
        badge.innerHTML = `<span class="text-indigo-600 font-bold inline-flex items-center gap-1"><i class="fa-solid fa-spinner fa-spin"></i>Đã chọn: ${file.name} (${sizeMb} MB) — Đang tự động lưu lên máy chủ...</span>`;
      }
      this._preuploadedHwPdfPromise = this.uploadPdfToServer('HW_' + Date.now(), file)
        .then((serverUrl) => {
          if (this._hwPdfUploadToken === token) {
            const b = document.getElementById('newHwFileBadge');
            if (b) b.innerHTML = `<span class="text-emerald-600 font-bold inline-flex items-center gap-1"><i class="fa-solid fa-cloud-arrow-up"></i>Đã tự động lưu lên máy chủ: ${file.name} (${sizeMb} MB)</span>`;
          }
          return serverUrl;
        })
        .catch(() => {
          if (this._hwPdfUploadToken === token) {
            const b = document.getElementById('newHwFileBadge');
            if (b) b.innerHTML = `<span class="text-amber-600 font-bold inline-flex items-center gap-1"><i class="fa-solid fa-check"></i>Đã lưu tạm vào máy: ${file.name} (${sizeMb} MB) — Tự động đồng bộ khi có mạng</span>`;
          }
          return '';
        });
    } else {
      this._preuploadedHwPdfPromise = null;
      if (badge) {
        badge.innerHTML = `<span class="text-emerald-600 font-bold inline-flex items-center gap-1"><i class="fa-solid fa-check"></i>Đã chọn: ${file.name} (${sizeMb} MB)</span>`;
      }
    }
  },

  async handleAddHomeworkSubmit() {
    if (this._addingHwInProgress) return;
    const title = document.getElementById('newHwTitle').value.trim();
    const desc = document.getElementById('newHwDesc').value.trim();
    const grade = parseInt(document.getElementById('newHwGrade')?.value || '12', 10) || 12;
    const accessType = document.getElementById('newHwAccess')?.value || 'all';
    const pickedIds = Array.from(document.querySelectorAll('input[name="newHwStudentPick"]:checked')).map(el => el.value);
    const file = this.state.tempSelectedHwFile;
    if (!file) {
      this.notify('Vui lòng chọn file PDF chuyên đề/tài liệu từ máy tính trước khi tải lên!', 'warning', 'Chưa chọn file PDF');
      return;
    }

    this._addingHwInProgress = true;
    const submitBtn = document.getElementById('addHomeworkSubmitBtn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i><span>Đang lưu máy chủ...</span>';
    }

    try {
      const hwId = 'HW-' + Date.now();
      let fileName = file.name;
      let fileSize = (file.size / 1024 / 1024).toFixed(1) + ' MB';

      if (typeof PDFStorage !== 'undefined') {
        await PDFStorage.savePdf(hwId, file);
      }

      let serverUrl = '';
      if (this._preuploadedHwPdfPromise) {
        serverUrl = await this._preuploadedHwPdfPromise;
      } else if (this.isServerSyncEnabled()) {
        serverUrl = await this.uploadPdfToServer(hwId, file).catch(() => '');
      }
      const pdfUrl = serverUrl || (typeof PDFStorage !== 'undefined' ? ('idb:' + hwId) : '');
      if (pdfUrl) this.setPdfCacheVersion(hwId, pdfUrl);

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
      this.saveData({ markAdminDirty: true, skipAutoPush: true });
      this.state.tempSelectedHwFile = null;
      this._preuploadedHwPdfPromise = null;
      await this.pushAdminStateToCloud({ manual: false });
      const m = document.getElementById('addHomeworkModal');
      if (m) m.remove();
      this.render();
      this.notify(`Đã thêm và tự động lưu tài liệu chuyên đề "${title}" (Khối ${grade}) lên máy chủ!`, 'success', 'Đã tự động lưu tài liệu lên Server');
    } finally {
      this._addingHwInProgress = false;
    }
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
        this.deleteServerPdfByUrl(hw.pdfUrl);
        this.markDeletedId(hwId);
        this.saveData({ markAdminDirty: true });
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
    const username = (document.getElementById(`${prefix}AdminUsername`)?.value || '').trim().toUpperCase();
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
              <label class="block text-xs font-bold text-slate-700 mb-1">Tên đăng nhập (Username — IN HOA) *</label>
              <input type="text" id="modalAdminUsername" required value="${String(adminAcc.username || 'ADMIN').toUpperCase()}" autocapitalize="characters" spellcheck="false" oninput="App.forceUppercaseInput(this)" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono font-bold text-indigo-700 text-xs focus:border-indigo-600 outline-none input-uppercase">
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
  },

  // --- HỖ TRỢ QUÉT QR & HƯỚNG DẪN TẠO APP TRÊN ĐIỆN THOẠI ANDROID & iOS (iPHONE / iPAD) ---
  // shortcut: Mobile browsers require user-initiated PWA install or Add to Home Screen; QR opens ?install=android|ios to open the matching guide tab
  getRecommendedAppUrl(loc = (typeof window !== 'undefined' ? window.location : null), platform = 'ios') {
    const pTag = platform === 'android' ? 'android' : 'ios';
    const fallback = `${this.PUBLIC_APP_URL}?install=${pTag}`;
    if (!loc || !loc.protocol || loc.protocol === 'file:') {
      return { url: fallback, isFallbackPublic: true };
    }
    const host = String(loc.hostname || '').toLowerCase();
    if (!host || host === 'localhost' || host === '127.0.0.1' || host === '[::1]') {
      return { url: fallback, isFallbackPublic: true };
    }
    const cleanPath = String(loc.pathname || '/');
    const base = `${loc.origin}${cleanPath}`;
    return { url: `${base}?install=${pTag}`, isFallbackPublic: false };
  },

  isIosDevice(uaStr) {
    const ua = String(uaStr !== undefined ? uaStr : (typeof navigator !== 'undefined' ? navigator.userAgent : ''));
    if (/iPad|iPhone|iPod/i.test(ua)) return true;
    if (uaStr === undefined && typeof navigator !== 'undefined' && navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) {
      return true;
    }
    return false;
  },

  isAndroidDevice(uaStr) {
    const ua = String(uaStr !== undefined ? uaStr : (typeof navigator !== 'undefined' ? navigator.userAgent : ''));
    return /Android/i.test(ua);
  },

  isInAppWebView(uaStr) {
    const ua = String(uaStr !== undefined ? uaStr : (typeof navigator !== 'undefined' ? navigator.userAgent : ''));
    return /Zalo|FBAN|FBAV|Messenger|Instagram|Line|TikTok/i.test(ua);
  },

  isStandaloneApp() {
    if (typeof window === 'undefined') return false;
    return Boolean(
      (window.navigator && window.navigator.standalone === true) ||
      (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)
    );
  },

  buildQrSvgHtml(targetUrl) {
    const cleanUrl = String(targetUrl || this.PUBLIC_APP_URL).trim() || this.PUBLIC_APP_URL;
    if (typeof qrcode === 'function') {
      try {
        const qr = qrcode(0, 'M');
        qr.addData(cleanUrl);
        qr.make();
        return qr.createSvgTag({ cellSize: 5, margin: 2, scalable: true })
          .replace('<svg ', '<svg id="iosGeneratedQrSvg" class="w-full h-full block" ');
      } catch (_) {}
    }
    return `
      <div class="p-4 text-center text-xs text-slate-600 space-y-2">
        <i class="fa-solid fa-qrcode text-3xl text-indigo-600"></i>
        <div class="font-bold">Mở liên kết trực tiếp trên trình duyệt:</div>
        <div class="font-mono text-[11px] break-all text-indigo-700">${cleanUrl}</div>
      </div>
    `;
  },

  updateIosQrUrl(rawVal) {
    const pTag = this._appGuidePlatform === 'android' ? 'android' : 'ios';
    const clean = String(rawVal || '').trim() || `${this.PUBLIC_APP_URL}?install=${pTag}`;
    const box = document.getElementById('iosQrSvgContainer');
    if (box) box.innerHTML = this.buildQrSvgHtml(clean);
  },

  async copyIosAppUrl() {
    const inp = document.getElementById('iosAppUrlInput');
    const btn = document.getElementById('copyIosAppUrlBtn');
    const pTag = this._appGuidePlatform === 'android' ? 'android' : 'ios';
    const url = (inp && inp.value.trim()) || `${this.PUBLIC_APP_URL}?install=${pTag}`;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      } else if (inp) {
        inp.select();
        document.execCommand('copy');
      }
      if (btn) {
        btn.innerHTML = '<i class="fa-solid fa-check"></i><span>Đã sao chép!</span>';
        setTimeout(() => {
          if (document.body.contains(btn)) {
            btn.innerHTML = '<i class="fa-regular fa-copy"></i><span>Sao chép link</span>';
          }
        }, 2000);
      }
    } catch (_) {}
  },

  async triggerNativeInstallPrompt() {
    if (!this._deferredInstallPrompt) return;
    try {
      this._deferredInstallPrompt.prompt();
      await this._deferredInstallPrompt.userChoice;
      this._deferredInstallPrompt = null;
      this.closeIosAppModal();
    } catch (_) {}
  },

  closeIosAppModal() {
    document.getElementById('iosAppGuideModal')?.remove();
  },

  switchAppGuideTab(platform) {
    const next = platform === 'android' ? 'android' : 'ios';
    this.showIosAppModal(Boolean(this._appGuideAutoOpened), next);
  },

  showIosAppModal(autoOpened = false, preferredPlatform = null) {
    this.closeIosAppModal();
    const isIos = this.isIosDevice();
    const isAndroid = this.isAndroidDevice();
    const activePlatform = (preferredPlatform === 'android' || preferredPlatform === 'ios')
      ? preferredPlatform
      : (this._appGuidePlatform || (isAndroid ? 'android' : 'ios'));
    this._appGuidePlatform = activePlatform;
    this._appGuideAutoOpened = Boolean(autoOpened);

    const isAndroidTab = activePlatform === 'android';
    const rec = this.getRecommendedAppUrl(undefined, activePlatform);
    const inWebView = this.isInAppWebView();
    const standalone = this.isStandaloneApp();
    const isOnMobileCurrent = (isAndroidTab && isAndroid) || (!isAndroidTab && isIos);

    const statusBadge = standalone
      ? `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200"><i class="fa-solid fa-circle-check text-emerald-600"></i>Đang sử dụng trực tiếp trong App</span>`
      : (isAndroidTab
        ? (isAndroid
          ? `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200"><i class="fa-brands fa-android text-emerald-700"></i>Đã mở trên Android • Làm Bước 2 &amp; 3 để cài App</span>`
          : `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200"><i class="fa-solid fa-camera text-emerald-600"></i>Dùng điện thoại Android quét mã QR bên dưới</span>`)
        : (isIos
          ? `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200"><i class="fa-brands fa-apple text-indigo-700"></i>Đã mở trên iPhone/iPad • Làm Bước 2 &amp; 3 để tạo App</span>`
          : `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-800 border border-sky-200"><i class="fa-solid fa-camera text-sky-600"></i>Mở Camera iPhone/iPad quét mã QR bên dưới</span>`));

    const modal = document.createElement('div');
    modal.id = 'iosAppGuideModal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto animate-fade-in';
    modal.innerHTML = `
      <div class="dialog-card bg-white rounded-3xl max-w-3xl w-full max-h-[92dvh] border border-slate-200 shadow-2xl flex flex-col overflow-hidden">
        <!-- Header -->
        <div class="px-5 py-4 border-b border-slate-200 ${isAndroidTab ? 'bg-gradient-to-r from-emerald-50/80 via-white to-slate-50' : 'bg-gradient-to-r from-indigo-50/80 via-white to-slate-50'} flex items-center justify-between gap-3 shrink-0">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-10 h-10 rounded-2xl ${isAndroidTab ? 'bg-emerald-600' : 'bg-indigo-600'} text-white flex items-center justify-center shadow-sm shrink-0">
              <i class="fa-brands ${isAndroidTab ? 'fa-android' : 'fa-apple'} text-xl"></i>
            </div>
            <div class="min-w-0">
              <h3 class="text-sm sm:text-base font-extrabold text-slate-900 truncate">Quét Mã QR &amp; Hướng Dẫn Tạo App Trên Điện Thoại (Android &amp; iOS)</h3>
              <p class="text-[11px] sm:text-xs text-slate-500 truncate">Cài biểu tượng App ra Màn hình chính • Xem đề PDF đa trang &amp; nộp đáp án trực tiếp</p>
            </div>
          </div>
          <button type="button" onclick="App.closeIosAppModal()" class="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer shrink-0" title="Đóng">
            <i class="fa-solid fa-xmark text-base"></i>
          </button>
        </div>

        <!-- Body -->
        <div class="p-4 sm:p-6 overflow-y-auto space-y-4 text-slate-800">
          <!-- Thanh chuyển đổi Android / iOS -->
          <div class="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200">
            <button type="button" id="appGuideTab_android" onclick="App.switchAppGuideTab('android')"
              class="py-2.5 px-3 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer ${isAndroidTab ? 'bg-emerald-600 text-white font-extrabold shadow-xs' : 'text-slate-600 hover:text-slate-900 font-bold'}">
              <i class="fa-brands fa-android text-base"></i>
              <span>Điện thoại Android</span>
            </button>
            <button type="button" id="appGuideTab_ios" onclick="App.switchAppGuideTab('ios')"
              class="py-2.5 px-3 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer ${!isAndroidTab ? 'bg-indigo-600 text-white font-extrabold shadow-xs' : 'text-slate-600 hover:text-slate-900 font-bold'}">
              <i class="fa-brands fa-apple text-base"></i>
              <span>iPhone / iPad (iOS)</span>
            </button>
          </div>

          ${autoOpened && !standalone ? `
            <div class="p-3.5 rounded-2xl ${isAndroidTab ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-indigo-50 border-indigo-200 text-indigo-900'} border flex items-start gap-3 text-xs">
              <i class="fa-solid fa-wand-magic-sparkles ${isAndroidTab ? 'text-emerald-600' : 'text-indigo-600'} text-base mt-0.5"></i>
              <div>
                <div class="font-extrabold">Bạn vừa mở liên kết cài đặt từ Mã QR!</div>
                <p class="mt-0.5">
                  ${isAndroidTab
                    ? 'Thực hiện ngay <strong>Bước 2</strong> và <strong>Bước 3</strong> bên dưới trên trình duyệt <strong>Google Chrome</strong> (hoặc bấm nút <em>Cài đặt App ngay</em> nếu hiện) để đưa ứng dụng <strong>Khảo Thí Toán</strong> ra Màn hình chính.'
                    : 'Thực hiện ngay <strong>Bước 2</strong> và <strong>Bước 3</strong> bên dưới trên trình duyệt <strong>Safari</strong> để đưa ứng dụng <strong>Khảo Thí Toán</strong> ra Màn hình chính điện thoại.'}
                </p>
              </div>
            </div>
          ` : ''}

          ${inWebView ? `
            <div class="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 flex items-start gap-3 text-xs text-amber-900">
              <i class="fa-solid fa-triangle-exclamation text-amber-600 text-base mt-0.5"></i>
              <div>
                <div class="font-extrabold">Lưu ý quan trọng: Bạn đang mở trong ứng dụng trung gian (Zalo / Messenger)</div>
                <p class="mt-0.5">
                  ${isAndroidTab
                    ? 'Hãy nhấn biểu tượng <strong>ba chấm</strong> ở góc trên bên phải màn hình và chọn <strong>"Mở bằng trình duyệt" (Mở bằng Chrome)</strong> để hiện tính năng <em>Cài đặt ứng dụng</em> trên Android.'
                    : 'Hãy nhấn biểu tượng <strong>ba chấm (...)</strong> ở góc trên bên phải màn hình và chọn <strong>"Mở bằng Safari"</strong> để hiện chức năng <em>Thêm vào Màn hình chính</em> của iOS.'}
                </p>
              </div>
            </div>
          ` : ''}

          <div class="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
            <!-- Cột Trái: Mã QR & Liên kết -->
            <div class="md:col-span-5 ${isOnMobileCurrent && !standalone ? 'order-2 md:order-1' : 'order-1'} bg-slate-50 rounded-2xl p-4 border border-slate-200 flex flex-col items-center text-center space-y-3">
              ${statusBadge}

              <div id="iosQrSvgContainer" class="w-48 h-48 sm:w-52 sm:h-52 bg-white p-3 rounded-2xl border-2 ${isAndroidTab ? 'border-emerald-200' : 'border-indigo-100'} shadow-sm flex items-center justify-center">
                ${this.buildQrSvgHtml(rec.url)}
              </div>

              <div class="w-full text-left space-y-1.5">
                <label for="iosAppUrlInput" class="block text-[11px] font-bold text-slate-600">Liên kết tạo App ${isAndroidTab ? 'Android' : 'iOS'}:</label>
                <input type="text" id="iosAppUrlInput" value="${rec.url}" oninput="App.updateIosQrUrl(this.value)"
                  class="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-[11px] font-mono text-slate-800 focus:border-indigo-600 outline-none">
                <button type="button" id="copyIosAppUrlBtn" onclick="App.copyIosAppUrl()"
                  class="w-full py-2 px-3 rounded-xl ${isAndroidTab ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'} text-white text-xs font-bold transition inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-xs">
                  <i class="fa-regular fa-copy"></i><span>Sao chép link</span>
                </button>
                ${this._deferredInstallPrompt ? `
                  <button type="button" id="directInstallAppBtn" onclick="App.triggerNativeInstallPrompt()"
                    class="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-extrabold transition inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-sm">
                    <i class="fa-solid fa-download"></i><span>Cài đặt App ngay trên thiết bị này (1 chạm)</span>
                  </button>
                ` : ''}
                ${rec.isFallbackPublic ? `
                  <p class="text-[10px] text-slate-500 leading-snug pt-0.5">
                    <i class="fa-solid fa-circle-info ${isAndroidTab ? 'text-emerald-600' : 'text-indigo-500'} mr-1"></i>Đang tự động dùng địa chỉ trực tuyến công khai để điện thoại quét được ngay.
                  </p>
                ` : ''}
              </div>
            </div>

            <!-- Cột Phải: Hướng dẫn 4 bước theo nền tảng đang chọn -->
            <div class="md:col-span-7 ${isOnMobileCurrent && !standalone ? 'order-1 md:order-2' : 'order-2'} space-y-3">
              ${isAndroidTab ? `
                <div class="text-xs font-extrabold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                  <i class="fa-brands fa-android text-sm"></i>
                  <span>Hướng dẫn 4 bước tạo App trên điện thoại Android</span>
                </div>

                ${this._deferredInstallPrompt ? `
                  <div class="p-3.5 rounded-2xl bg-emerald-50 border-2 border-emerald-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <div class="font-extrabold text-emerald-900">Thiết bị này hỗ trợ cài App tự động 1 chạm!</div>
                      <p class="text-emerald-700 mt-0.5">Bấm nút bên cạnh để cài trực tiếp mà không cần mở menu thủ công.</p>
                    </div>
                    <button type="button" onclick="App.triggerNativeInstallPrompt()" class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold shrink-0 cursor-pointer inline-flex items-center gap-1.5 shadow-xs">
                      <i class="fa-solid fa-download"></i><span>Cài Đặt Ngay</span>
                    </button>
                  </div>
                ` : ''}

                <div class="space-y-2.5 text-xs" id="androidStepsContainer">
                  <div class="p-3 rounded-2xl bg-white border border-slate-200 flex items-start gap-3 shadow-2xs">
                    <span class="w-7 h-7 rounded-xl bg-emerald-600 text-white font-extrabold flex items-center justify-center shrink-0">1</span>
                    <div>
                      <div class="font-extrabold text-slate-900 flex flex-wrap items-center gap-1.5">
                        <span>Quét mã QR hoặc mở link bằng Google Chrome</span>
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[11px]"><i class="fa-brands fa-chrome"></i>Chrome</span>
                      </div>
                      <p class="text-slate-600 mt-0.5 leading-relaxed">Dùng <strong>Máy ảnh / Zalo QR</strong> trên điện thoại Android (Samsung, Oppo, Xiaomi, Vivo, Realme...) quét mã QR và mở trang bằng trình duyệt <strong>Google Chrome</strong> hoặc <strong>Samsung Internet</strong>.</p>
                    </div>
                  </div>

                  <div class="p-3 rounded-2xl bg-white border-2 border-emerald-200 flex items-start gap-3 shadow-2xs">
                    <span class="w-7 h-7 rounded-xl bg-emerald-600 text-white font-extrabold flex items-center justify-center shrink-0">2</span>
                    <div>
                      <div class="font-extrabold text-slate-900 flex flex-wrap items-center gap-1.5">
                        <span>Nhấn biểu tượng Menu ba chấm ở góc trình duyệt</span>
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[11px]"><i class="fa-solid fa-ellipsis-vertical"></i>Menu</span>
                      </div>
                      <p class="text-slate-600 mt-0.5 leading-relaxed">Chạm vào biểu tượng <strong>ba chấm dọc</strong> ở góc trên bên phải của <strong>Chrome</strong> <em>(hoặc biểu tượng 3 gạch ngang <i class="fa-solid fa-bars mx-0.5"></i> ở góc dưới bên phải nếu dùng Samsung Internet)</em>.</p>
                    </div>
                  </div>

                  <div class="p-3 rounded-2xl bg-white border-2 border-emerald-200 flex items-start gap-3 shadow-2xs">
                    <span class="w-7 h-7 rounded-xl bg-emerald-600 text-white font-extrabold flex items-center justify-center shrink-0">3</span>
                    <div>
                      <div class="font-extrabold text-slate-900 flex flex-wrap items-center gap-1.5">
                        <span>Chọn "Cài đặt ứng dụng" hoặc "Thêm vào Màn hình chính"</span>
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold text-[11px]"><i class="fa-solid fa-mobile-screen-button"></i>Install App</span>
                      </div>
                      <p class="text-slate-600 mt-0.5 leading-relaxed">Nhấn vào mục <strong>"Cài đặt ứng dụng"</strong> <em>(Install app)</em> hoặc <strong>"Thêm vào Màn hình chính"</strong>, sau đó chọn <strong>"Cài đặt"</strong> trong hộp xác nhận hiện ra.</p>
                    </div>
                  </div>

                  <div class="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-start gap-3">
                    <span class="w-7 h-7 rounded-xl bg-emerald-600 text-white font-extrabold flex items-center justify-center shrink-0">4</span>
                    <div>
                      <div class="font-extrabold text-slate-900">Mở App Khảo Thí Toán từ Màn hình chính</div>
                      <p class="text-slate-600 mt-0.5 leading-relaxed">Sau vài giây, biểu tượng <strong>Khảo Thí Toán</strong> xuất hiện ngay trên Màn hình chính điện thoại như một ứng dụng độc lập. Mở App toàn màn hình để xem đề PDF và làm bài thi!</p>
                    </div>
                  </div>
                </div>
              ` : `
                <div class="text-xs font-extrabold uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                  <i class="fa-brands fa-apple text-sm"></i>
                  <span>Hướng dẫn 4 bước tạo App trên iPhone / iPad (iOS)</span>
                </div>

                <div class="space-y-2.5 text-xs" id="iosStepsContainer">
                  <div class="p-3 rounded-2xl bg-white border border-slate-200 flex items-start gap-3 shadow-2xs">
                    <span class="w-7 h-7 rounded-xl bg-indigo-600 text-white font-extrabold flex items-center justify-center shrink-0">1</span>
                    <div>
                      <div class="font-extrabold text-slate-900">Quét mã QR bằng Camera mở trong Safari</div>
                      <p class="text-slate-600 mt-0.5 leading-relaxed">Mở ứng dụng <strong>Camera</strong> mặc định trên iPhone/iPad, hướng vào mã QR bên cạnh và chạm vào thông báo hiện ra để mở bằng trình duyệt <strong>Safari</strong>.</p>
                    </div>
                  </div>

                  <div class="p-3 rounded-2xl bg-white border-2 border-indigo-200 flex items-start gap-3 shadow-2xs">
                    <span class="w-7 h-7 rounded-xl bg-indigo-600 text-white font-extrabold flex items-center justify-center shrink-0">2</span>
                    <div>
                      <div class="font-extrabold text-slate-900 flex flex-wrap items-center gap-1.5">
                        <span>Nhấn biểu tượng Chia sẻ (Share)</span>
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold text-[11px]"><i class="fa-solid fa-arrow-up-from-bracket"></i>Share</span>
                      </div>
                      <p class="text-slate-600 mt-0.5 leading-relaxed">Chạm vào nút <strong>Chia sẻ</strong> (ô vuông có mũi tên hướng lên) nằm ở thanh công cụ dưới cùng của Safari trên iPhone (hoặc góc trên bên phải trên iPad).</p>
                    </div>
                  </div>

                  <div class="p-3 rounded-2xl bg-white border-2 border-indigo-200 flex items-start gap-3 shadow-2xs">
                    <span class="w-7 h-7 rounded-xl bg-indigo-600 text-white font-extrabold flex items-center justify-center shrink-0">3</span>
                    <div>
                      <div class="font-extrabold text-slate-900 flex flex-wrap items-center gap-1.5">
                        <span>Chọn "Thêm vào Màn hình chính"</span>
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[11px]"><i class="fa-regular fa-square-plus"></i>Add to Home Screen</span>
                      </div>
                      <p class="text-slate-600 mt-0.5 leading-relaxed">Cuộn danh sách menu xuống dưới, chọn <strong>"Thêm vào Màn hình chính"</strong>, sau đó nhấn chữ <strong>"Thêm" (Add)</strong> ở góc trên bên phải màn hình.</p>
                    </div>
                  </div>

                  <div class="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-200 flex items-start gap-3">
                    <span class="w-7 h-7 rounded-xl bg-emerald-600 text-white font-extrabold flex items-center justify-center shrink-0">4</span>
                    <div>
                      <div class="font-extrabold text-slate-900">Mở App Khảo Thí Toán — Xem Đề PDF &amp; Nộp Bài</div>
                      <p class="text-slate-600 mt-0.5 leading-relaxed">Biểu tượng <strong>Khảo Thí Toán</strong> xuất hiện ngay trên Màn hình chính. Học sinh mở App toàn màn hình, vuốt xem trọn bộ đề PDF nhiều trang, điền phiếu trả lời và bấm <strong>Nộp Bài</strong> chấm điểm tức thì!</p>
                    </div>
                  </div>
                </div>
              `}

              <!-- Tóm tắt quyền lợi khi dùng trên App -->
              <div class="grid grid-cols-3 gap-2 pt-1 text-center text-[11px] font-bold">
                <div class="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
                  <i class="fa-solid fa-file-pdf text-red-500 block text-sm mb-1"></i>Xem PDF đa trang
                </div>
                <div class="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
                  <i class="fa-solid fa-table-cells text-indigo-600 block text-sm mb-1"></i>Đề + Phiếu linh hoạt
                </div>
                <div class="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
                  <i class="fa-solid fa-paper-plane text-emerald-600 block text-sm mb-1"></i>Nộp &amp; Chấm ngay
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer / Thanh chỉ dẫn trực tiếp trên trình duyệt điện thoại -->
        <div class="px-5 py-3 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2 shrink-0 ios-safe-bottom">
          ${isAndroid && !standalone && isAndroidTab ? `
            <div class="text-xs font-bold text-emerald-700 flex items-center gap-2">
              <i class="fa-solid fa-arrow-up animate-bounce text-emerald-600"></i>
              <span>Nhấn nút <i class="fa-solid fa-ellipsis-vertical mx-0.5"></i> góc trên phải Chrome &rarr; chọn "Cài đặt ứng dụng"</span>
            </div>
          ` : (isIos && !standalone && !isAndroidTab ? `
            <div class="text-xs font-bold text-indigo-700 flex items-center gap-2">
              <i class="fa-solid fa-arrow-down animate-bounce text-indigo-600"></i>
              <span>Nhấn nút <i class="fa-solid fa-arrow-up-from-bracket mx-0.5"></i> ở thanh dưới Safari &rarr; chọn "Thêm vào Màn hình chính"</span>
            </div>
          ` : `
            <span class="text-[11px] text-slate-500"><i class="fa-solid fa-mobile-screen-button text-indigo-600 mr-1"></i>Hỗ trợ tạo App độc lập trên cả điện thoại Android &amp; iOS (iPhone / iPad)</span>
          `)}
          <button type="button" onclick="App.closeIosAppModal()" class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold cursor-pointer ml-auto">
            Đã hiểu &amp; Đóng
          </button>
        </div>
      </div>
    `;
    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.closeIosAppModal();
    });
    document.body.appendChild(modal);
  },

  // --- TRÌNH XEM ĐỀ PDF ĐA TRANG (PDF.JS CANVAS) TỐI ƯU CHO APP iOS & MỌI TRÌNH DUYỆT ---
  normalizeExternalPdfUrl(rawUrl) {
    const u = String(rawUrl || '').trim();
    const driveMatch = u.match(/drive\.google\.com\/file\/d\/([^/?#]+)/i);
    if (driveMatch) {
      return { embedUrl: `https://drive.google.com/file/d/${driveMatch[1]}/preview`, isExternalEmbed: true };
    }
    return { embedUrl: u, isExternalEmbed: false };
  },

  renderPdfFallbackHtml(url) {
    const safeUrl = String(url || '');
    const inStandalone = this.isStandaloneApp();
    return `
      <object data="${safeUrl}#toolbar=1&navpanes=0" type="application/pdf" class="w-full h-full flex-1 border-0">
        <iframe src="${safeUrl}#toolbar=1&navpanes=0" class="w-full h-full flex-1 border-0">
          <div class="p-6 text-center text-slate-300 space-y-2">
            <i class="fa-solid fa-file-pdf text-3xl text-red-400"></i>
            <p class="text-xs">Không thể hiển thị trực tiếp tệp PDF này.</p>
            ${!inStandalone ? `<a href="${safeUrl}" target="_blank" class="inline-block px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold">Mở PDF</a>` : ''}
          </div>
        </iframe>
      </object>
    `;
  },

  getPdfViewerFlowClasses(containerId, flowWithPage = false) {
    if (flowWithPage) {
      const stickyOffset = containerId === 'submissionSolPdfViewer' ? 'sticky top-[98px] z-10' : 'sticky top-[33px] z-10';
      return {
        toolbar: `bg-slate-900/95 backdrop-blur-xs border-b border-slate-800 px-3 py-1.5 flex items-center justify-between text-xs text-slate-200 shrink-0 ${stickyOffset}`,
        scroll: 'pdf-viewer-scroll pdf-viewer-flow w-full h-auto overflow-visible p-2 sm:p-4 space-y-3 bg-slate-900 rounded-b-2xl'
      };
    }
    return {
      toolbar: 'bg-slate-900/95 border-b border-slate-800 px-3 py-1.5 flex items-center justify-between text-xs text-slate-200 shrink-0',
      scroll: 'pdf-viewer-scroll flex-1 w-full h-full min-h-0 overflow-auto p-2 sm:p-4 space-y-3 bg-slate-900'
    };
  },

  syncPdfViewerFlowMode(containerId, flowWithPage = false) {
    if (this._pdfViewers && this._pdfViewers[containerId]) {
      this._pdfViewers[containerId].flowWithPage = Boolean(flowWithPage);
    }
    if (typeof document === 'undefined') return;
    const cls = this.getPdfViewerFlowClasses(containerId, flowWithPage);
    const toolbarEl = document.getElementById(`${containerId}_toolbar`);
    const scrollEl = document.getElementById(`${containerId}_scroll`);
    if (toolbarEl) toolbarEl.className = cls.toolbar;
    if (scrollEl) scrollEl.className = cls.scroll;
  },

  updatePdfPageInfoFromContainer(containerId, scrollParent) {
    if (typeof document === 'undefined') return;
    const vState = this._pdfViewers && this._pdfViewers[containerId];
    const scrollEl = document.getElementById(`${containerId}_scroll`);
    const infoEl = document.getElementById(`${containerId}_pageInfo`);
    if (!vState || !vState.pdfDoc || !scrollEl || !infoEl) return;
    const pages = scrollEl.querySelectorAll('[data-pdf-page]');
    if (!pages.length) return;
    const refTop = scrollParent && scrollParent !== window
      ? scrollParent.getBoundingClientRect().top + scrollParent.clientHeight * 0.35
      : (typeof window !== 'undefined' ? window.innerHeight * 0.35 : 240);
    let cur = 1;
    pages.forEach(p => {
      if (p.getBoundingClientRect().top <= refTop) cur = Number(p.getAttribute('data-pdf-page')) || cur;
    });
    infoEl.textContent = `Trang ${cur} / ${vState.pdfDoc.numPages}`;
  },

  async mountPdfViewer(containerId, pdfUrl, options = {}) {
    if (typeof document === 'undefined') return;
    const host = document.getElementById(containerId);
    if (!host) return;
    const flowWithPage = Boolean(options && options.flowWithPage);

    if (!pdfUrl) {
      host.innerHTML = `<div class="flex-1 w-full h-full min-h-[240px] flex items-center justify-center p-6 text-center text-slate-400 text-xs">Chưa có file PDF đính kèm cho đề này.</div>`;
      return;
    }

    const norm = this.normalizeExternalPdfUrl(pdfUrl);
    if (norm.isExternalEmbed || typeof window === 'undefined' || !window.pdfjsLib) {
      host.innerHTML = `<div class="flex-1 w-full ${flowWithPage ? 'min-h-[78vh]' : 'h-full'} flex flex-col">${this.renderPdfFallbackHtml(norm.embedUrl)}</div>`;
      return;
    }

    const flowCls = this.getPdfViewerFlowClasses(containerId, flowWithPage);
    host.innerHTML = `
      <div id="${containerId}_toolbar" class="${flowCls.toolbar}">
        <div class="flex items-center gap-1.5 font-mono text-[11px]">
          <i class="fa-regular fa-file-lines text-indigo-400"></i>
          <span id="${containerId}_pageInfo">Đang tải đề PDF...</span>
        </div>
        <div class="flex items-center gap-1">
          <button type="button" onclick="App.zoomPdfViewer('${containerId}', -0.2)" class="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center cursor-pointer" title="Thu nhỏ">
            <i class="fa-solid fa-magnifying-glass-minus text-[11px]"></i>
          </button>
          <span id="${containerId}_zoomPct" class="min-w-[44px] text-center font-mono font-bold text-[11px] text-indigo-300">100%</span>
          <button type="button" onclick="App.zoomPdfViewer('${containerId}', 0.2)" class="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center cursor-pointer" title="Phóng to">
            <i class="fa-solid fa-magnifying-glass-plus text-[11px]"></i>
          </button>
          <button type="button" onclick="App.zoomPdfViewer('${containerId}', 'fit')" class="px-2 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-200 cursor-pointer" title="Vừa khít khung nhìn">
            Vừa khít
          </button>
        </div>
      </div>
      <div id="${containerId}_scroll" class="${flowCls.scroll}">
        <div class="py-12 text-center text-slate-400 text-xs space-y-2">
          <i class="fa-solid fa-spinner fa-spin text-2xl text-indigo-400"></i>
          <div>Đang dựng các trang PDF sắc nét...</div>
        </div>
      </div>
    `;

    try {
      if (window.pdfjsLib.GlobalWorkerOptions && !window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      }
      const loadingTask = window.pdfjsLib.getDocument(norm.embedUrl);
      const pdfDoc = await loadingTask.promise;
      this._pdfViewers[containerId] = {
        pdfDoc,
        zoomFactor: 1.0,
        url: norm.embedUrl,
        flowWithPage,
        renderToken: 0
      };
      await this.renderPdfPages(containerId);

      const scrollEl = document.getElementById(`${containerId}_scroll`);
      if (scrollEl) {
        scrollEl.addEventListener('scroll', () => {
          const pages = scrollEl.querySelectorAll('[data-pdf-page]');
          if (!pages.length) return;
          const mid = scrollEl.scrollTop + scrollEl.clientHeight * 0.35;
          let cur = 1;
          pages.forEach(p => {
            if (p.offsetTop <= mid) cur = Number(p.getAttribute('data-pdf-page')) || cur;
          });
          const infoEl = document.getElementById(`${containerId}_pageInfo`);
          if (infoEl) infoEl.textContent = `Trang ${cur} / ${pdfDoc.numPages}`;
        }, { passive: true });
      }
      if (containerId === 'submissionSolPdfViewer' && typeof window !== 'undefined' && !this._solWinScrollBound) {
        this._solWinScrollBound = true;
        window.addEventListener('scroll', () => {
          if (document.getElementById('submissionSolPdfViewer_scroll')) {
            this.updatePdfPageInfoFromContainer('submissionSolPdfViewer', window);
          }
        }, { passive: true });
      }
    } catch (_) {
      const stillHost = document.getElementById(containerId);
      if (stillHost) {
        stillHost.innerHTML = `<div class="flex-1 w-full ${flowWithPage ? 'min-h-[78vh]' : 'h-full'} flex flex-col">${this.renderPdfFallbackHtml(norm.embedUrl)}</div>`;
      }
    }
  },

  async renderPdfPages(containerId) {
    const vState = this._pdfViewers[containerId];
    const scrollEl = document.getElementById(`${containerId}_scroll`);
    if (!vState || !vState.pdfDoc || !scrollEl) return;

    const token = ++vState.renderToken;
    const pdfDoc = vState.pdfDoc;
    const total = pdfDoc.numPages;

    const zoomEl = document.getElementById(`${containerId}_zoomPct`);
    if (zoomEl) zoomEl.textContent = `${Math.round(vState.zoomFactor * 100)}%`;
    const infoEl = document.getElementById(`${containerId}_pageInfo`);
    if (infoEl) infoEl.textContent = `Trang 1 / ${total}`;

    const rawWidth = scrollEl.clientWidth || (typeof window !== 'undefined' ? Math.min(window.innerWidth - 16, 860) : 760);
    const availWidth = Math.max(260, rawWidth - 20);
    const dpr = Math.min((typeof window !== 'undefined' && window.devicePixelRatio) || 1, 2);

    scrollEl.innerHTML = '';
    for (let pageNum = 1; pageNum <= total; pageNum++) {
      if (vState.renderToken !== token || !document.body.contains(scrollEl)) return;
      const page = await pdfDoc.getPage(pageNum);
      if (vState.renderToken !== token || !document.body.contains(scrollEl)) return;

      const baseVp = page.getViewport({ scale: 1 });
      const fitScale = Math.min(1.85, Math.max(0.42, availWidth / baseVp.width));
      const cssScale = fitScale * vState.zoomFactor;
      const renderVp = page.getViewport({ scale: cssScale * dpr });

      const wrap = document.createElement('div');
      wrap.setAttribute('data-pdf-page', String(pageNum));
      wrap.className = 'w-full overflow-x-auto';

      const canvas = document.createElement('canvas');
      canvas.className = 'pdf-page-canvas';
      canvas.width = Math.floor(renderVp.width);
      canvas.height = Math.floor(renderVp.height);
      canvas.style.width = `${Math.floor(baseVp.width * cssScale)}px`;
      canvas.style.height = `${Math.floor(baseVp.height * cssScale)}px`;
      wrap.appendChild(canvas);
      scrollEl.appendChild(wrap);

      const ctx = canvas.getContext('2d', { alpha: false });
      await page.render({ canvasContext: ctx, viewport: renderVp }).promise;
    }
  },

  zoomPdfViewer(containerId, action) {
    const vState = this._pdfViewers[containerId];
    if (!vState) return;
    if (action === 'fit') {
      vState.zoomFactor = 1.0;
    } else {
      vState.zoomFactor = Math.max(0.6, Math.min(2.6, Math.round((vState.zoomFactor + Number(action || 0)) * 100) / 100));
    }
    this.renderPdfPages(containerId);
  }
};

if (typeof window !== 'undefined') {
  window.App = App;
  window.addEventListener('DOMContentLoaded', () => App.init());
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = App;
}
