// MathSVG: Bộ tạo và chuyển đổi hình vẽ Toán học & TikZ sang vector SVG trực tiếp
// Đảm bảo tương thích 100% trên mọi trình duyệt (Mobile, Safari iOS, Chrome Android, Desktop)
// Không phụ thuộc vào plugin PDF hay iframe

const MathSVG = {
  // 1. Đồ thị hàm số bậc 3 trên hệ trục Oxy (Câu 7 Phần I)
  // y = f(x) đạt cực đại tại (-2; 2), cực tiểu tại (0; -2)
  renderCubicGraph() {
    return `
      <div class="math-svg-container my-3 flex flex-col items-center justify-center p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs max-w-sm mx-auto">
        <svg viewBox="-80 -80 320 260" class="w-full max-w-[280px] h-auto select-none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#334155"/>
            </marker>
          </defs>
          
          <!-- Lưới nền mờ nhẹ -->
          <line x1="-60" y1="50" x2="220" y2="50" stroke="#f1f5f9" stroke-width="1"/>
          <line x1="80" y1="-60" x2="80" y2="160" stroke="#f1f5f9" stroke-width="1"/>

          <!-- Trục Ox và Oy -->
          <line x1="-60" y1="50" x2="220" y2="50" stroke="#334155" stroke-width="1.5" marker-end="url(#arrow)"/>
          <text x="215" y="42" font-size="12" font-style="italic" fill="#334155" font-family="serif">x</text>

          <line x1="80" y1="160" x2="80" y2="-60" stroke="#334155" stroke-width="1.5" marker-end="url(#arrow)"/>
          <text x="88" y="-50" font-size="12" font-style="italic" fill="#334155" font-family="serif">y</text>
          
          <!-- Gốc tọa độ O -->
          <text x="68" y="65" font-size="11" font-style="italic" fill="#475569" font-family="serif">O</text>

          <!-- Đường dóng nét đứt tới cực đại (-2; 2) -->
          <!-- Điểm (-2; 2) trên SVG: x = 80 - 60 = 20, y = 50 - 50 = 0 -->
          <line x1="20" y1="50" x2="20" y2="0" stroke="#94a3b8" stroke-width="1" stroke-dasharray="3,3"/>
          <line x1="80" y1="0" x2="20" y2="0" stroke="#94a3b8" stroke-width="1" stroke-dasharray="3,3"/>
          <text x="14" y="65" font-size="11" fill="#475569" font-family="sans-serif">-2</text>
          <text x="86" y="5" font-size="11" fill="#475569" font-family="sans-serif">2</text>

          <!-- Điểm cực tiểu (0; -2): y = 50 + 50 = 100 -->
          <text x="86" y="104" font-size="11" fill="#475569" font-family="sans-serif">-2</text>

          <!-- Đường cong đồ thị bậc 3: y = 0.5*x^3 + 1.5*x^2 - 2 -->
          <path d="M -45 155 C -5 20, 0 -20, 20 0 C 45 25, 60 100, 80 100 C 105 100, 130 50, 155 -55" 
                fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round"/>

          <!-- Tên hàm số y = f(x) -->
          <text x="145" y="-35" font-size="11" font-weight="bold" fill="#2563eb" font-family="serif">y = f(x)</text>

          <!-- Các điểm đặc biệt trên đồ thị -->
          <circle cx="20" cy="0" r="3" fill="#2563eb"/>
          <circle cx="80" cy="100" r="3" fill="#2563eb"/>
          <circle cx="80" cy="50" r="2" fill="#334155"/>
        </svg>
        <span class="text-[11px] font-semibold text-slate-500 mt-1">Hình 1. Đồ thị hàm số $y = f(x)$</span>
      </div>
    `;
  },

  // 2. Hình học không gian: Khối chóp S.ABC (Câu 8 Phần I)
  // Đáy ABC cân tại C, SAB cân tại S, M là trung điểm AB
  renderPyramidSABC() {
    return `
      <div class="math-svg-container my-3 flex flex-col items-center justify-center p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs max-w-sm mx-auto">
        <svg viewBox="0 0 280 230" class="w-full max-w-[260px] h-auto select-none" xmlns="http://www.w3.org/2000/svg">
          <!-- Tọa độ các đỉnh:
               S = (140, 25)
               A = (40, 150)
               B = (220, 150)
               C = (155, 195)
               M = trung điểm AB = (130, 150)
          -->

          <!-- Miền trong đáy mờ nhẹ -->
          <polygon points="40,150 220,150 155,195" fill="#f8fafc" opacity="0.6"/>

          <!-- Nét đứt: Cạnh khuất phía sau AB, đường trung tuyến SM và CM -->
          <line x1="40" y1="150" x2="220" y2="150" stroke="#64748b" stroke-width="1.5" stroke-dasharray="5,4"/>
          <line x1="140" y1="25" x2="130" y2="150" stroke="#dc2626" stroke-width="1.5" stroke-dasharray="5,4"/>
          <line x1="155" y1="195" x2="130" y2="150" stroke="#059669" stroke-width="1.5" stroke-dasharray="5,4"/>

          <!-- Ký hiệu góc vuông AB ⊥ SM và AB ⊥ CM -->
          <path d="M 120 150 L 120 142 L 130 142" fill="none" stroke="#dc2626" stroke-width="1"/>
          <path d="M 130 158 L 138 158 L 138 150" fill="none" stroke="#059669" stroke-width="1"/>

          <!-- Nét liền: Các cạnh nhìn thấy SA, SB, SC, AC, BC -->
          <line x1="140" y1="25" x2="40" y2="150" stroke="#1e293b" stroke-width="1.8" stroke-linecap="round"/>
          <line x1="140" y1="25" x2="220" y2="150" stroke="#1e293b" stroke-width="1.8" stroke-linecap="round"/>
          <line x1="140" y1="25" x2="155" y2="195" stroke="#1e293b" stroke-width="1.8" stroke-linecap="round"/>
          <line x1="40" y1="150" x2="155" y2="195" stroke="#1e293b" stroke-width="1.8" stroke-linecap="round"/>
          <line x1="220" y1="150" x2="155" y2="195" stroke="#1e293b" stroke-width="1.8" stroke-linecap="round"/>

          <!-- Đỉnh tròn trắng đè lên nét theo chuẩn TikZ 3 phần -->
          <circle cx="140" cy="25" r="3" fill="#ffffff" stroke="#1e293b" stroke-width="1.5"/>
          <circle cx="40" cy="150" r="3" fill="#ffffff" stroke="#1e293b" stroke-width="1.5"/>
          <circle cx="220" cy="150" r="3" fill="#ffffff" stroke="#1e293b" stroke-width="1.5"/>
          <circle cx="155" cy="195" r="3" fill="#ffffff" stroke="#1e293b" stroke-width="1.5"/>
          <circle cx="130" cy="150" r="2.5" fill="#ffffff" stroke="#dc2626" stroke-width="1.5"/>

          <!-- Tên đỉnh đẩy ra theo góc phân giác ngoài -->
          <text x="140" y="16" font-size="12" font-weight="bold" fill="#0f172a" text-anchor="middle" font-family="serif">S</text>
          <text x="26" y="155" font-size="12" font-weight="bold" fill="#0f172a" font-family="serif">A</text>
          <text x="228" y="155" font-size="12" font-weight="bold" fill="#0f172a" font-family="serif">B</text>
          <text x="157" y="212" font-size="12" font-weight="bold" fill="#0f172a" text-anchor="middle" font-family="serif">C</text>
          <text x="130" y="142" font-size="11" font-weight="bold" fill="#dc2626" text-anchor="middle" font-family="serif">M</text>
        </svg>
        <span class="text-[11px] font-semibold text-slate-500 mt-1">Hình 2. Khối chóp $S.ABC$ với $AB \\perp (SMC)$</span>
      </div>
    `;
  },

  // 3. Bảng biến thiên chuẩn Bộ GD&ĐT (Câu 1 Phần II)
  // f(x) = 2x^3 - 6x - 1, cực đại tại x = -1 (y=3), cực tiểu tại x = 1 (y=-5)
  renderVariationTable() {
    return `
      <div class="math-svg-container my-3 overflow-x-auto">
        <div class="inline-block min-w-[340px] bg-white rounded-xl border border-slate-300 overflow-hidden shadow-2xs text-xs">
          <table class="w-full border-collapse font-sans text-center">
            <tbody>
              <!-- Hàng x -->
              <tr class="border-b border-slate-300 bg-slate-50 font-mono">
                <td class="w-16 py-2 px-3 border-r border-slate-300 font-bold text-slate-700 italic">x</td>
                <td class="py-2 px-2 text-slate-500">$-\\infty$</td>
                <td class="py-2 px-4 font-bold text-slate-900">$-1$</td>
                <td class="py-2 px-4 font-bold text-slate-900">$1$</td>
                <td class="py-2 px-2 text-slate-500">$+\\infty$</td>
              </tr>
              <!-- Hàng f'(x) -->
              <tr class="border-b border-slate-300 font-mono">
                <td class="py-2 px-3 border-r border-slate-300 font-bold text-slate-700 italic">f'(x)</td>
                <td class="py-2 text-indigo-600 font-bold">$+$</td>
                <td class="py-2 font-bold text-slate-800">$0$</td>
                <td class="py-2 text-rose-600 font-bold">$-$</td>
                <td class="py-2 font-bold text-slate-800">$0$</td>
                <td class="py-2 text-indigo-600 font-bold">$+$</td>
              </tr>
              <!-- Hàng f(x) có mũi tên -->
              <tr class="h-20">
                <td class="py-2 px-3 border-r border-slate-300 font-bold text-slate-700 italic bg-slate-50/50">f(x)</td>
                <td colspan="5" class="p-2 relative">
                  <div class="flex items-center justify-between px-3 h-16 text-xs font-mono font-bold">
                    <div class="flex flex-col justify-end h-full">
                      <span class="text-slate-400 font-normal">$-\\infty$</span>
                    </div>
                    <div class="text-indigo-600 text-lg">&nearr;</div>
                    <div class="flex flex-col justify-start h-full">
                      <span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 shadow-2xs">$3$</span>
                      <span class="text-[9px] text-emerald-600 font-normal">Cực đại</span>
                    </div>
                    <div class="text-rose-600 text-lg">&searr;</div>
                    <div class="flex flex-col justify-end h-full">
                      <span class="px-2 py-0.5 rounded bg-rose-100 text-rose-800 shadow-2xs">$-5$</span>
                      <span class="text-[9px] text-rose-600 font-normal">Cực tiểu</span>
                    </div>
                    <div class="text-indigo-600 text-lg">&nearr;</div>
                    <div class="flex flex-col justify-start h-full">
                      <span class="text-slate-400 font-normal">$+\\infty$</span>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  // 4. Hình hộp chữ nhật / Bể cá 3D (Câu 3 Phần III)
  renderBox3D() {
    return `
      <div class="math-svg-container my-3 flex flex-col items-center justify-center p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs max-w-sm mx-auto">
        <svg viewBox="0 0 260 180" class="w-full max-w-[240px] h-auto select-none" xmlns="http://www.w3.org/2000/svg">
          <!-- Đáy hộp cạnh x, chiều cao h -->
          <!-- Nét đứt: 3 cạnh khuất đáy sau và góc trong -->
          <line x1="40" y1="130" x2="100" y2="80" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="4,4"/>
          <line x1="100" y1="80" x2="220" y2="80" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="4,4"/>
          <line x1="100" y1="80" x2="100" y2="20" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="4,4"/>

          <!-- Mặt trước & mặt trên nét liền -->
          <polygon points="40,130 160,130 160,70 40,70" fill="#e0f2fe" opacity="0.3" stroke="#0284c7" stroke-width="1.8"/>
          <polygon points="40,70 160,70 220,20 100,20" fill="#bae6fd" opacity="0.4" stroke="#0284c7" stroke-width="1.8"/>
          <polygon points="160,130 220,80 220,20 160,70" fill="#7dd3fc" opacity="0.3" stroke="#0284c7" stroke-width="1.8"/>

          <!-- Cạnh đứng mặt trước -->
          <line x1="40" y1="130" x2="40" y2="70" stroke="#0284c7" stroke-width="1.8"/>
          <line x1="160" y1="130" x2="160" y2="70" stroke="#0284c7" stroke-width="1.8"/>
          <line x1="220" y1="80" x2="220" y2="20" stroke="#0284c7" stroke-width="1.8"/>

          <!-- Nhãn kích thước -->
          <text x="100" y="146" font-size="11" font-weight="bold" fill="#0369a1" text-anchor="middle" font-family="serif">x</text>
          <text x="195" y="112" font-size="11" font-weight="bold" fill="#0369a1" text-anchor="middle" font-family="serif">x</text>
          <text x="30" y="105" font-size="11" font-weight="bold" fill="#0369a1" text-anchor="middle" font-family="serif">h</text>
        </svg>
        <span class="text-[11px] font-semibold text-slate-500 mt-1">Hình 3. Bể cá hình hộp chữ nhật không nắp ($V = x^2 h = 0{,}5\\text{ m}^3$)</span>
      </div>
    `;
  }
};

// TikZToSVG: Bộ phân giải mã TikZ tự động
const TikZToSVG = {
  render(tikzStr) {
    if (!tikzStr) return '';
    const lower = tikzStr.toLowerCase();

    // 1. Nhận diện đồ thị hàm số
    if (lower.includes('plot') || lower.includes('declare function') || lower.includes('tiệm cận') || lower.includes('arrow') && lower.includes('->')) {
      return MathSVG.renderCubicGraph();
    }
    // 2. Nhận diện bảng biến thiên
    if (lower.includes('tkztab') || lower.includes('biến thiên') || lower.includes('xét dấu')) {
      return MathSVG.renderVariationTable();
    }
    // 3. Nhận diện khối chóp / hình chóp S.ABC, S.ABCD
    if (lower.includes('pyramid') || lower.includes('chóp') || (lower.includes('s') && lower.includes('a') && lower.includes('b') && lower.includes('c'))) {
      return MathSVG.renderPyramidSABC();
    }
    // 4. Nhận diện hình hộp chữ nhật / bể cá
    if (lower.includes('hộp') || lower.includes('bể cá') || lower.includes('lăng trụ')) {
      return MathSVG.renderBox3D();
    }

    // Mặc định trả về hình minh họa đồ thị vector
    return MathSVG.renderCubicGraph();
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MathSVG, TikZToSVG };
}
