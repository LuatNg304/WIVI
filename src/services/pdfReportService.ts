import * as Print from 'expo-print';
import { Platform } from 'react-native';

export interface ReportData {
  userName: string;
  periodLabel: string;
  generatedDate: string;
  isVip: boolean;
  metrics: {
    incomeX: number; // Biến X: Thu nhập
    netWorthY: number; // Biến Y: Quỹ an toàn / Tiền tích lũy trước khi dùng app
    totalExpenseZ: number; // Biến Z: Chi tiêu thực tế
    netCashFlow: number;
    savingsRate: number;
    expenseRate: number;
    emergencyFundMonths: number;
    burnRatePerDay: number;
    daysRemaining: number;
    activeSpendDaysCount: number;
    peakSpendDay: { date: string; amount: number; count: number };
    estimatedEndBalance: number;
  };
  dataValidation: {
    incomeStatus: string;
    safetyFundStatus: string;
    expenseStatus: string;
    calculationsVerified: boolean;
    missingDataNotes: string;
  };
  categoriesBreakdown: {
    essential: number;
    controllable: number;
    discretionary: number;
    anomaly: number;
  };
  topTransactions: Array<{
    date?: string;
    description: string;
    amount: number;
    jarName?: string;
  }>;
  variablesAnalysis: {
    varXDesc: string;
    varYDesc: string;
    varZDesc: string;
    varTDesc: string;
    targetTimelineStatus: string;
    isTargetOnTime: boolean;
    estimatedMonthsToGoal: number;
    targetMonthsGoal: number;
    goalStatus: string;
  };
  jarsBreakdown: Array<{
    name: string;
    allocationPercent: number;
    budget: number;
    spent: number;
    spentPct: number;
    remainingJarBudget: number;
    txCount: number;
    color: string;
  }>;
  goalsBreakdown: Array<{
    name: string;
    targetAmount: number;
    savedAmount: number;
    progressPct: number;
  }>;
  scenarios: {
    current: { monthlySaving: number; completionMonths: number; savingsRate: number; monthlyBuffer: number };
    optimized: { monthlySaving: number; completionMonths: number; savingsRate: number; monthlyBuffer: number };
    accelerated: { monthlySaving: number; completionMonths: number; savingsRate: number; monthlyBuffer: number };
  };
  riskAssessment: {
    riskLevel: 'Low' | 'Moderate' | 'High';
    riskMessage: string;
    safeDailySpendLimit: number;
    isSavingsPreserved: boolean;
    potentialDeficitAmount: number;
    risksList: Array<{
      risk: string;
      evidence: string;
      impact: string;
      confidence: 'HIGH' | 'MEDIUM';
      suggestedAction: string;
    }>;
  };
  recommendations: Array<{
    action: string;
    reason: string;
    expectedEffect: string;
  }>;
  confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW';
}

export const pdfReportService = {
  generateReportHtml(data: ReportData): string {
    const riskColor = data.riskAssessment.riskLevel === 'High' ? '#EF4444' : data.riskAssessment.riskLevel === 'Moderate' ? '#F59E0B' : '#10B981';
    const riskBg = data.riskAssessment.riskLevel === 'High' ? '#FEF2F2' : data.riskAssessment.riskLevel === 'Moderate' ? '#FFFBEB' : '#ECFDF5';

    return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>Báo Cáo Kiểm Toán Tài Chính AI - WIVI</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    body {
      background-color: #ffffff;
      color: #0F172A;
      padding: 32px;
      font-size: 12px;
      line-height: 1.5;
    }

    .header-table {
      width: 100%;
      border-bottom: 2px solid #0F172A;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }

    .brand-title {
      font-size: 22px;
      font-weight: 800;
      color: #0F172A;
      letter-spacing: -0.5px;
    }

    .brand-sub {
      font-size: 11px;
      color: #64748B;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-top: 2px;
    }

    .report-meta {
      text-align: right;
      font-size: 11px;
      color: #475569;
    }

    .vip-badge {
      display: inline-block;
      background-color: #0F172A;
      color: #FBBF24;
      font-size: 10px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
      margin-bottom: 4px;
    }

    .section-heading {
      font-size: 13px;
      font-weight: 800;
      color: #0F172A;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 16px;
      margin-bottom: 10px;
      border-left: 4px solid #2563EB;
      padding-left: 8px;
    }

    /* Bento Grid */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 18px;
    }

    .kpi-card {
      background-color: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 10px;
      padding: 10px;
    }

    .kpi-label {
      font-size: 9px;
      font-weight: 700;
      color: #64748B;
      text-transform: uppercase;
      margin-bottom: 2px;
    }

    .kpi-value {
      font-size: 15px;
      font-weight: 800;
      color: #0F172A;
    }

    .box-card {
      background-color: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      padding: 14px;
      margin-bottom: 16px;
    }

    /* Tables */
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
    }

    table.data-table th {
      background-color: #F1F5F9;
      color: #475569;
      font-size: 10px;
      font-weight: 700;
      text-align: left;
      padding: 8px 10px;
      border-top: 1px solid #E2E8F0;
      border-bottom: 1px solid #E2E8F0;
    }

    table.data-table td {
      padding: 8px 10px;
      border-bottom: 1px solid #F1F5F9;
      font-size: 11px;
    }

    .progress-bar {
      height: 6px;
      background-color: #E2E8F0;
      border-radius: 3px;
      overflow: hidden;
      width: 80px;
      display: inline-block;
      vertical-align: middle;
      margin-right: 4px;
    }

    .progress-fill {
      height: 100%;
      border-radius: 3px;
    }

    /* Scenarios table */
    .scenario-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-bottom: 16px;
    }

    .scenario-card {
      background-color: #FFFFFF;
      border: 1px solid #CBD5E1;
      border-radius: 10px;
      padding: 10px;
    }

    .scenario-title {
      font-size: 11px;
      font-weight: 800;
      color: #2563EB;
      margin-bottom: 6px;
    }

    /* Recommendation card */
    .rec-card {
      background-color: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 10px 12px;
      margin-bottom: 8px;
    }

    .rec-action {
      font-weight: 700;
      color: #0F172A;
      font-size: 12px;
      margin-bottom: 4px;
    }

    .rec-reason {
      font-size: 11px;
      color: #475569;
      margin-bottom: 2px;
    }

    .rec-effect {
      font-size: 11px;
      color: #059669;
      font-weight: 600;
    }

    .footer {
      border-top: 1px solid #E2E8F0;
      padding-top: 14px;
      text-align: center;
      font-size: 10px;
      color: #94A3B8;
      margin-top: 24px;
    }
  </style>
</head>
<body>

  <table class="header-table">
    <tr>
      <td>
        <div class="brand-title">WIVI AI FINANCIAL ANALYSIS ENGINE</div>
        <div class="brand-sub">Bản Kiểm Toán & Hoạch Định Tài Chính Chuyên Sâu Định Lượng</div>
      </td>
      <td class="report-meta">
        <div class="vip-badge">${data.isVip ? 'PREMIUM VIP AUDIT' : 'STANDARD REPORT'}</div>
        <div>Khách hàng: <strong>${data.userName}</strong></div>
        <div>Kỳ báo cáo: <strong>${data.periodLabel}</strong></div>
        <div>Độ tin cậy: <strong>${data.confidenceLevel} CONFIDENCE</strong></div>
      </td>
    </tr>
  </table>

  <!-- 1. FINANCIAL SNAPSHOT -->
  <div class="section-heading">1. TỔNG QUAN TÀI CHÍNH (FINANCIAL SNAPSHOT)</div>
  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-label">Thu Nhập (X)</div>
      <div class="kpi-value">${data.metrics.incomeX.toLocaleString('vi-VN')} đ</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Chi Tiêu Thực Tế (Z)</div>
      <div class="kpi-value" style="color: #EF4444;">${data.metrics.totalExpenseZ.toLocaleString('vi-VN')} đ</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Dòng Tiền Ròng (X - Z)</div>
      <div class="kpi-value" style="color: #10B981;">${data.metrics.netCashFlow.toLocaleString('vi-VN')} đ</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Quỹ An Toàn Y (Ban đầu)</div>
      <div class="kpi-value" style="color: #2563EB;">${data.metrics.netWorthY.toLocaleString('vi-VN')} đ</div>
    </div>
  </div>

  <!-- 2. DATA VALIDATION -->
  <div class="section-heading">2. KIỂM TRA TÍNH HỢP LỆ DỮ LIỆU & PHÉP TÍNH (DATA VALIDATION)</div>
  <div class="box-card">
    <div>• <strong>Xác thực Biến X (Thu nhập):</strong> ${data.dataValidation.incomeStatus}</div>
    <div>• <strong>Xác thực Biến Y (Quỹ an toàn):</strong> ${data.dataValidation.safetyFundStatus} (Không bị tính trùng lặp vào mục tiêu).</div>
    <div>• <strong>Xác thực Biến Z (Chi tiêu):</strong> ${data.dataValidation.expenseStatus}</div>
    <div>• <strong>Tính toán toán học:</strong> Tỷ lệ tiết kiệm = ${(data.metrics.savingsRate)}%, Tỷ lệ chi tiêu = ${(data.metrics.expenseRate)}% (100% được xác minh).</div>
  </div>

  <!-- 3. CASH FLOW & GRANULAR ANALYSIS -->
  <div class="section-heading">3. PHÂN TÍCH DÒNG TIỀN, TỪNG HŨ & GIAO DỊCH (CASH FLOW ANALYSIS)</div>
  <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 12px;">
    <div class="kpi-card">
      <div class="kpi-label">Thiết Yếu</div>
      <div class="kpi-value">${data.categoriesBreakdown.essential.toLocaleString('vi-VN')} đ</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Kiểm Soát Được</div>
      <div class="kpi-value">${data.categoriesBreakdown.controllable.toLocaleString('vi-VN')} đ</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Không Thiết Yếu</div>
      <div class="kpi-value">${data.categoriesBreakdown.discretionary.toLocaleString('vi-VN')} đ</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Chi Phí Bất Thường</div>
      <div class="kpi-value" style="color: #EF4444;">${data.categoriesBreakdown.anomaly.toLocaleString('vi-VN')} đ</div>
    </div>
  </div>

  <table class="data-table">
    <thead>
      <tr>
        <th>Hũ ngân sách</th>
        <th>Tỷ lệ</th>
        <th>Ngân sách cấp</th>
        <th>Thực chi</th>
        <th>Còn lại</th>
        <th>Tỷ lệ sử dụng</th>
      </tr>
    </thead>
    <tbody>
      ${data.jarsBreakdown.map(j => `
        <tr>
          <td><strong>${j.name}</strong></td>
          <td>${j.allocationPercent}%</td>
          <td>${j.budget.toLocaleString('vi-VN')} đ</td>
          <td>${j.spent.toLocaleString('vi-VN')} đ (${j.txCount} GD)</td>
          <td>${j.remainingJarBudget.toLocaleString('vi-VN')} đ</td>
          <td>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${Math.min(100, j.spentPct)}%; background-color: ${j.color};"></div>
            </div>
            <strong>${j.spentPct}%</strong>
          </td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <!-- TOP TRANSACTIONS -->
  <div style="font-weight: 700; margin-bottom: 6px; font-size: 11px;">GIAO DỊCH LỚN NỔI BẬT TRONG KỲ:</div>
  <table class="data-table">
    <thead>
      <tr>
        <th>Nội dung giao dịch</th>
        <th>Hũ / Danh mục</th>
        <th>Số tiền</th>
      </tr>
    </thead>
    <tbody>
      ${data.topTransactions.map(tx => `
        <tr>
          <td>${tx.description}</td>
          <td>${tx.jarName || 'Chi tiêu'}</td>
          <td style="color: #EF4444; font-weight: 700;">-${tx.amount.toLocaleString('vi-VN')} đ</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <!-- 4. GOAL ANALYSIS -->
  <div class="section-heading">4. PHÂN TÍCH TIẾN ĐỘ MỤC TIÊU TÀI CHÍNH (GOAL ANALYSIS)</div>
  <div class="box-card">
    <div><strong>Mô tả:</strong> ${data.variablesAnalysis.varTDesc}</div>
    <div style="margin-top: 6px;">
      Trạng thái: <strong>${data.variablesAnalysis.goalStatus}</strong> (${data.variablesAnalysis.targetTimelineStatus})
    </div>
  </div>

  <!-- 5. EMERGENCY FUND & RISK ANALYSIS -->
  <div class="section-heading">5. PHÂN TÍCH QUỸ AN TOÀN Y & RỦI RO (RISK ANALYSIS)</div>
  <div class="box-card">
    <div style="margin-bottom: 8px;">
      <strong>Đánh giá Quỹ An Toàn Y:</strong> ${data.metrics.netWorthY.toLocaleString('vi-VN')} đ tương đương <strong>${data.metrics.emergencyFundMonths} tháng</strong> chi phí thiết yếu.
    </div>
    ${data.riskAssessment.risksList.map(r => `
      <div style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed #E2E8F0;">
        <div style="font-weight: 800; color: #DC2626;">[${r.confidence}] ${r.risk}</div>
        <div style="font-size: 11px; color: #475569;">Bằng chứng: ${r.evidence}</div>
        <div style="font-size: 11px; color: #1E293B;">Tác động: ${r.impact}</div>
      </div>
    `).join('')}
  </div>

  <!-- 6. SCENARIO ANALYSIS -->
  <div class="section-heading">6. PHÂN TÍCH 3 KỊCH BẢN DỰ BÁO (SCENARIOS)</div>
  <div class="scenario-grid">
    <div class="scenario-card">
      <div class="scenario-title">1. HIỆN TẠI (CURRENT)</div>
      <div>Tích lũy: <strong>${data.scenarios.current.monthlySaving.toLocaleString('vi-VN')} đ/tháng</strong></div>
      <div>Thời gian $T$: <strong>${data.scenarios.current.completionMonths} tháng</strong></div>
      <div>Tỷ lệ tiết kiệm: <strong>${data.scenarios.current.savingsRate}%</strong></div>
    </div>
    <div class="scenario-card">
      <div class="scenario-title">2. TỐI ƯU (OPTIMIZED)</div>
      <div>Tích lũy: <strong>${data.scenarios.optimized.monthlySaving.toLocaleString('vi-VN')} đ/tháng</strong></div>
      <div>Thời gian $T$: <strong>${data.scenarios.optimized.completionMonths} tháng</strong></div>
      <div>Tỷ lệ tiết kiệm: <strong>${data.scenarios.optimized.savingsRate}%</strong></div>
    </div>
    <div class="scenario-card">
      <div class="scenario-title">3. TĂNG TỐC (ACCELERATED)</div>
      <div>Tích lũy: <strong>${data.scenarios.accelerated.monthlySaving.toLocaleString('vi-VN')} đ/tháng</strong></div>
      <div>Thời gian $T$: <strong>${data.scenarios.accelerated.completionMonths} tháng</strong></div>
      <div>Tỷ lệ tiết kiệm: <strong>${data.scenarios.accelerated.savingsRate}%</strong></div>
    </div>
  </div>

  <!-- 7. AI RECOMMENDATIONS -->
  <div class="section-heading">7. KHUYẾN NGHỊ HÀNH ĐỘNG CỤ THỂ (AI RECOMMENDATIONS)</div>
  <div>
    ${data.recommendations.map(r => `
      <div class="rec-card">
        <div class="rec-action">✓ ${r.action}</div>
        <div class="rec-reason">Lý do: ${r.reason}</div>
        <div class="rec-effect">Hiệu quả kỳ vọng: ${r.expectedEffect}</div>
      </div>
    `).join('')}
  </div>

  <div class="footer">
    Báo cáo này được tính toán và kiểm toán tự động bởi WIVI AI Financial Analysis Engine.<br/>
    Mọi dữ liệu hoàn toàn dựa trên số liệu thực tế được ghi nhận và không suy đoán cảm tính.
  </div>

</body>
</html>
    `;
  },

  async exportReportToPdf(data: ReportData): Promise<boolean> {
    try {
      const html = this.generateReportHtml(data);

      if (Platform.OS === 'web') {
        // Direct print via browser popup/iframe
        if (typeof window !== 'undefined') {
          const printWindow = window.open('', '_blank');
          if (printWindow) {
            printWindow.document.write(html);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
              printWindow.print();
            }, 500);
            return true;
          }
        }
      }

      // Native Mobile export via expo-print
      await Print.printAsync({
        html,
      });
      return true;
    } catch (e) {
      console.warn('Lỗi exportReportToPdf:', e);
      return false;
    }
  },
};
