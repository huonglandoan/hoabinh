// Centralized Mock Data for T3 Engine System Testing

export const mockProjects = [
  {
    id: "PHC",
    name: "Sửa chữa văn phòng P.HC – Tầng 3, Tòa nhà DPM",
    location: "Tầng 3 Tòa nhà DPM, Cà Mau",
    client_name: "Ban QLDA DPM",
    contractor_name: "Công ty Xây dựng Đông Dương",
    contract_code: "12/2025/HĐ-XD",
    start_date: "2026-06-01",
    expected_completion_date: "2026-06-30",
    status: "in_progress",
    contract_value: 123200000
  },
  {
    id: "DA1",
    name: "Xây mới văn phòng A - Dự án DA1",
    location: "Quận 1, TP.HCM",
    client_name: "Công ty TNHH DA1",
    contractor_name: "Công ty CP XD Hòa Bình",
    contract_code: "DA1-2025-001",
    start_date: "2025-11-15",
    expected_completion_date: "2026-11-15",
    status: "planning",
    contract_value: 4200000000
  },
  {
    id: "PHC2",
    name: "Cải tạo khu thí nghiệm PHC2",
    location: "Khu CN, Cà Mau",
    client_name: "Ban QLDA Nông Nghiệp",
    contractor_name: "Công ty Xây dựng Đông Dương",
    contract_code: "PHC2-2026-007",
    start_date: "2026-05-01",
    expected_completion_date: "2026-09-01",
    status: "in_progress",
    contract_value: 980000000
  },
  {
    id: "HQ1",
    name: "Nâng cấp hệ thống điện HQ1",
    location: "Hà Nội",
    client_name: "Công ty Cổ phần HQ",
    contractor_name: "Nhà thầu điện Bắc Việt",
    contract_code: "HQ1-EL-2026",
    start_date: "2026-04-01",
    expected_completion_date: "2026-07-20",
    status: "delayed",
    contract_value: 650000000
  },
  {
    id: "SKB",
    name: "Thi công sửa chữa trường SKB",
    location: "Bình Dương",
    client_name: "UBND Huyện SK",
    contractor_name: "Công ty XD SK",
    contract_code: "SKB-2026-03",
    start_date: "2026-02-01",
    expected_completion_date: "2026-10-01",
    status: "on_hold",
    contract_value: 2150000000
  },
  {
    id: "OFF100",
    name: "Văn phòng 100m2 - Office Fitout",
    location: "TP. Đà Nẵng",
    client_name: "Công ty Startup 100",
    contractor_name: "Nội thất & XD A",
    contract_code: "OFF100-2026",
    start_date: "2026-06-10",
    expected_completion_date: "2026-07-05",
    status: "planning",
    contract_value: 85000000
  },
  {
    id: "WH01",
    name: "Kho lạnh WH01 - Mở rộng",
    location: "Long An",
    client_name: "Công ty Logistic Việt",
    contractor_name: "Công ty Cơ Khí Lạnh",
    contract_code: "WH01-EXP-2025",
    start_date: "2025-09-01",
    expected_completion_date: "2026-03-01",
    status: "completed",
    contract_value: 310000000
  },
  {
    id: "RESI",
    name: "Dự án nhà ở Resi Tower - Block B",
    location: "Thủ Đức, TP.HCM",
    client_name: "Tập đoàn Resi",
    contractor_name: "Liên danh XD Resi",
    contract_code: "RESI-B-2024",
    start_date: "2024-08-01",
    expected_completion_date: "2027-08-01",
    status: "in_progress",
    contract_value: 12500000000
  }
  ,
  {
    id: "PROJ_NEW",
    name: "Tên dự án mới - Demo PROJ_NEW",
    location: "Hạng mục mẫu, Hà Nội",
    client_name: "Khách hàng mẫu",
    contractor_name: "Nhà thầu mẫu",
    contract_code: "NEW-2026-001",
    start_date: "2026-06-23",
    expected_completion_date: "2026-12-31",
    status: "planning",
    contract_value: 100000000
  }
];

// SỬA: Đồng bộ ngày bắt đầu dự án sang tháng 6/2026 để khớp trục Gantt
export const mockQuoteProjectInfo = {
  project_name: "Sửa chữa văn phòng P.HC – Tầng 3, Tòa nhà DPM",
  location: "Tầng 3 Tòa nhà DPM, Cà Mau",
  start_date: "2026-06-01",
  expected_completion_date: "2026-06-30",
  client_name: "Ban QLDA DPM",
  contractor_name: "Công ty Xây dựng Đông Dương",
  contract_signed: true,
  signed_version: "v1"
};

export const mockQuoteItems = [
  { item_code: "HM-001", item_name: "Sơn lại tường trong nhà (2 lớp lót + 2 lớp phủ)", unit: "m2", quoted_quantity: 320, original_unit_price: 65000 },
  { item_code: "HM-002", item_name: "Thay trần thạch cao vuông 60x60", unit: "m2", quoted_quantity: 150, original_unit_price: 280000 },
  { item_code: "HM-003", item_name: "Lát sàn gạch ceramic 60x60", unit: "m2", quoted_quantity: 85, original_unit_price: 320000 },
  { item_code: "HM-004", item_name: "Thay cửa nhựa lõi thép - cửa đi 90x210", unit: "cái", quoted_quantity: 4, original_unit_price: 3800000 },
  { item_code: "HM-005", item_name: "Thay kính cửa sổ cường lực 8mm", unit: "m2", quoted_quantity: 18, original_unit_price: 750000 }
];

// richer quote data: multiple quotes per project + báo giá phát sinh (additional quotes)
export const mockQuotes = [
  {
    quote_id: "Q-PHC-001",
    project_id: "PHC",
    version: "Phiên bản Gốc (v1)",
    quote_type: "báo_giá_gốc",
    created_at: "2026-05-28T09:00:00",
    author: "Estimator A",
    notes: "Báo giá ban đầu cho toàn bộ hạng mục hoàn thiện",
    items: mockQuoteItems,
    total_value: 123200000,
    contract_signed: true,
    project_info: {
      project_name: "Sửa chữa văn phòng P.HC – Tầng 3, Tòa nhà DPM",
      location: "Tầng 3 Tòa nhà DPM, Cà Mau",
      client_name: "Ban QLDA DPM",
      contractor_name: "Công ty Xây dựng Đông Dương",
      start_date: "2026-06-01",
      expected_completion_date: "2026-06-30",
      contract_signed: true,
      signed_version: "Phiên bản Gốc (v1)"
    }
  },
  {
    quote_id: "Q-PHC-002",
    project_id: "PHC",
    version: "Phiên bản Sửa (v2)",
    quote_type: "báo_giá_sửa_đổi",
    created_at: "2026-06-08T10:30:00",
    author: "Estimator B",
    notes: "Hiệu chỉnh giá do thay đổi một vài vật liệu và tăng khối lượng sơn",
    items: [
      { item_code: "HM-001", item_name: "Sơn lại tường trong nhà", unit: "m2", quoted_quantity: 340, original_unit_price: 65000 },
      { item_code: "HM-002", item_name: "Trần thạch cao 60x60", unit: "m2", quoted_quantity: 150, original_unit_price: 280000 },
      { item_code: "HM-009", item_name: "Vệ sinh sau thi công", unit: "m2", quoted_quantity: 605, original_unit_price: 25000 }
    ],
    total_value: 130500000
  },
  // quotes for another project (DA1)
  {
    quote_id: "Q-DA1-001",
    project_id: "DA1",
    version: "Phiên bản Gốc (v1)",
    quote_type: "báo_giá_gốc",
    created_at: "2025-11-01",
    author: "Estimator C",
    notes: "Báo giá sơ bộ - chờ hoàn thiện hồ sơ thi công",
    items: [
      { item_code: "DA1-001", item_name: "Giai đoạn nền móng", unit: "ls", quoted_quantity: 1, original_unit_price: 1500000000 },
      { item_code: "DA1-002", item_name: "Kết cấu thô", unit: "ls", quoted_quantity: 1, original_unit_price: 2000000000 }
    ],
    total_value: 3500000000,
    contract_signed: true,
    project_info: {
      project_name: "Xây mới văn phòng A - Dự án DA1",
      location: "Quận 1, TP.HCM",
      client_name: "Công ty TNHH DA1",
      contractor_name: "Công ty CP XD Hòa Bình",
      start_date: "2025-11-15",
      expected_completion_date: "2026-11-15",
      contract_signed: true,
      signed_version: "Phiên bản Gốc (v1)",
      contract_code: "DA1-2025-001"
    }
  }
  ,
  // User-requested new project + quote demo entry
  {
    quote_id: "Q-NEW-001",
    project_id: "PROJ_NEW",
    version: "Phiên bản Gốc (v1)",
    quote_type: "báo_giá_gốc",
    created_at: "2026-06-23T09:00:00",
    author: "Demo Estimator",
    notes: "Báo giá mẫu cho PROJ_NEW",
    items: [
      { item_code: "MÃ-01", item_name: "Tên vật tư", unit: "Cái", quoted_quantity: 10, original_unit_price: 50000 }
    ],
    total_value: 500000
  }
];

export const mockAdditionalQuotes = [
  {
    add_quote_id: "AS-PHC-001",
    project_id: "PHC",
    related_quote_id: "Q-PHC-001",
    created_at: "2026-06-12T14:15:00",
    reason: "Phát sinh do thay đổi thiết kế kính vách",
    items: [
      { item_code: "HM-007", item_name: "Kính cửa sổ cường lực - phát sinh", unit: "m2", quoted_quantity: 8, original_unit_price: 800000 }
    ],
    status: "pending_approval",
    total_value: 6400000
  },
  {
    add_quote_id: "AS-PHC-002",
    project_id: "PHC",
    related_quote_id: "Q-PHC-002",
    created_at: "2026-06-18T09:45:00",
    reason: "Phát sinh công vệ sinh tăng khối lượng do mở rộng phạm vi bàn giao",
    items: [
      { item_code: "HM-009", item_name: "Vệ sinh sau thi công - phát sinh", unit: "m2", quoted_quantity: 200, original_unit_price: 25000 }
    ],
    status: "approved",
    approved_by: "PM Nguyễn",
    total_value: 5000000
  }
];

export const mockProgressPlan = {
  project_info: {
    project_name: "Sửa chữa văn phòng P.HC – Tầng 3, Tòa nhà DPM",
    contract_code: "12/2025/HĐ-XD"
  },
  milestones: [
    { milestone_name: "Mốc 1 - Phần hoàn thiện", planned_end_date: "2026-06-20" },
    { milestone_name: "Mốc 2 - Điện & cơ điện", planned_end_date: "2026-06-25" },
    { milestone_name: "Mốc 3 - Dọn dẹp & bàn giao", planned_end_date: "2026-06-30" }
  ],
  items: [
    { item_code: "HM-001", item_name: "Sơn tường trong nhà", unit: "m2", planned_quantity: 320, planned_start_date: "2026-06-05", planned_end_date: "2026-06-11", milestone_name: "Mốc 1 - Phần hoàn thiện" },
    { item_code: "HM-002", item_name: "Trần thạch cao 60x60", unit: "m2", planned_quantity: 150, planned_start_date: "2026-06-08", planned_end_date: "2026-06-18", milestone_name: "Mốc 1 - Phần hoàn thiện" },
    { item_code: "HM-003", item_name: "Lát sàn ceramic 60x60", unit: "m2", planned_quantity: 85, planned_start_date: "2026-06-10", planned_end_date: "2026-06-20", milestone_name: "Mốc 1 - Phần hoàn thiện" },
    { item_code: "HM-004", item_name: "Cửa nhựa lõi thép", unit: "cái", planned_quantity: 4, planned_start_date: "2026-06-12", planned_end_date: "2026-06-19", milestone_name: "Mốc 1 - Phần hoàn thiện" },
    { item_code: "HM-005", item_name: "Đèn LED chiếu sáng", unit: "bộ", planned_quantity: 24, planned_start_date: "2026-06-15", planned_end_date: "2026-06-21", milestone_name: "Mốc 2 - Điện & cơ điện" },
    { item_code: "HM-006", item_name: "Ổ cắm điện âm tường", unit: "cái", planned_quantity: 30, planned_start_date: "2026-06-16", planned_end_date: "2026-06-23", milestone_name: "Mốc 2 - Điện & cơ điện" },
    { item_code: "HM-007", item_name: "Kính cửa sổ cường lực", unit: "m2", planned_quantity: 18, planned_start_date: "2026-06-09", planned_end_date: "2026-06-15", milestone_name: "Mốc 1 - Phần hoàn thiện" },
    { item_code: "HM-008", item_name: "Sơn chống thấm Sika", unit: "m2", planned_quantity: 95, planned_start_date: "2026-06-10", planned_end_date: "2026-06-20", milestone_name: "Mốc 1 - Phần hoàn thiện" },
    { item_code: "HM-009", item_name: "Vệ sinh sau thi công", unit: "m2", planned_quantity: 605, planned_start_date: "2026-06-24", planned_end_date: "2026-06-29", milestone_name: "Mốc 3 - Dọn dẹp & bàn giao" },
    { item_code: "HM-010", item_name: "Vận chuyển vật liệu", unit: "ls", planned_quantity: 1, planned_start_date: "2026-06-25", planned_end_date: "2026-06-30", milestone_name: "Mốc 3 - Dọn dẹp & bàn giao" }
  ]
};

export const mockProgressLog = {
  items: [
    { item_code: "HM-001", actual_quantity: 280, actual_start_date: "2026-06-06", actual_end_date: null, site_notes: "Chậm tiến độ do thiếu thợ sơn", delay_reason: "Chờ vật tư" },
    { item_code: "HM-002", actual_quantity: 150, actual_start_date: "2026-06-08", actual_end_date: "2026-06-18", site_notes: "Hoàn thành lắp đặt nghiệm thu đạt", delay_reason: "" },
    { item_code: "HM-003", actual_quantity: 85, actual_start_date: "2026-06-10", actual_end_date: "2026-06-20", site_notes: "Đã lát xong gạch nền văn phòng", delay_reason: "" },
    { item_code: "HM-004", actual_quantity: 4, actual_start_date: "2026-06-12", actual_end_date: "2026-06-19", site_notes: "Lắp đặt kính khung nhôm xong", delay_reason: "" },
    { item_code: "HM-005", actual_quantity: 20, actual_start_date: "2026-06-15", actual_end_date: null, site_notes: "Thiếu chao đèn trang trí", delay_reason: "Chờ vật tư" },
    { item_code: "HM-006", actual_quantity: 30, actual_start_date: "2026-06-16", actual_end_date: "2026-06-23", site_notes: "Đấu nối ổ cắm xong", delay_reason: "" },
    { item_code: "HM-007", actual_quantity: 10, actual_start_date: "2026-06-09", actual_end_date: null, site_notes: "Đang đo vẽ lại kích thước kính vách", delay_reason: "Thay đổi thiết kế" },
    { item_code: "HM-008", actual_quantity: 95, actual_start_date: "2026-06-10", actual_end_date: "2026-06-20", site_notes: "Chống thấm khu vệ sinh xong", delay_reason: "" }
  ]
};

// SỬA: Đồng bộ ngày ký kết hóa đơn thanh toán
export const mockPaymentBillingInfo = {
  project_name: "Sửa chữa văn phòng P.HC – Tầng 3, Tòa nhà DPM",
  client_name: "Ban QLDA DPM",
  contractor_name: "Công ty Xây dựng Đông Dương",
  contract_code: "12/2025/HĐ-XD",
  contract_date: "2026-06-01",
  contract_value: 123200000,
  advance_pct: 20,
  retention_pct: 5,
  bank_account: '0123456789 (Vietcombank)',
  bank_name: 'Ngân hàng TMCP Ngoại thương Việt Nam - CN Cà Mau',
  advance_deduction: 24640000,
  additional_value: 0
};

export const mockPaymentInvoices = [
  { invoice_number: "HD-001", date: "2026-06-03", amount: 24640000, description: "Tạm ứng hợp đồng 20%" },
  { invoice_number: "HD-002", date: "2026-06-15", amount: 50000000, description: "Thanh toán đợt 1 khối lượng hoàn thành" }
];

export const mockInvoices = [
  { so_hd: "HD-001", ngay: "2026-06-03", ten_ncc: "Ban QLDA DPM", loai: "Vật tư" as const, truoc_thue: 24640000, thue_suat: 0.1 },
  { so_hd: "HD-002", ngay: "2026-06-15", ten_ncc: "Nhà cung ứng cát đá Hòa Bình", loai: "Vật tư" as const, truoc_thue: 50000000, thue_suat: 0.1 }
];

export const mockPaymentHistory = [
  {
    timestamp: '20260623_120000',
    createdAt: '2026-06-23 12:00:00',
    excelUrl: '#',
    pdfUrl: '#',
    csvUrl: '#',
  }
];

export const mockPaymentItems = [
  { item_code: "HM-001", quantity: 280, amount: 18200000, note: "Khối lượng sơn tường hoàn thành thực tế" },
  { item_code: "HM-002", quantity: 150, amount: 42000000, note: "Khối lượng trần thạch cao hoàn thành" },
  { item_code: "HM-003", quantity: 85, amount: 27200000, note: "Khối lượng lát sàn gạch xong" }
];

export const mockProfitAnalysis = {
  actual_revenue: 123200000,
  budget_revenue: 123200000,
  total_expenses: 74640000,
  invoices_count: 2,
  net_profit: 48560000,
  gross_profit: 48560000,
  net_margin: 39.4,
  profit_flag: "Xanh",
  expenses: {
    "Vật tư sơn & thạch cao": 45000000,
    "Nhân công lắp đặt & hoàn thiện": 20000000,
    "Phí quản lý & vận chuyển": 964000
  },
  overrun_reasons: [
    "Tiến độ hạng mục sơn tường chậm kéo dài làm tăng nhẹ chi phí quản lý ca hiện trường."
  ],
  delayed_items: [
    { name: "Sơn tường trong nhà (HM-001)", delay_days: 12 },
    { name: "Kính cửa sổ cường lực (HM-007)", delay_days: 8 }
  ]
};

export const mockProfitHistory = [
  {
    createdAt: "2026-06-23 10:30:00",
    excelUrl: "#",
    pdfUrl: "#"
  }
];

export const mockProgressReport = {
  project_info: {
    project_name: "Sửa chữa văn phòng P.HC – Tầng 3, Tòa nhà DPM",
    contract_code: "12/2025/HĐ-XD",
    contract_signed: true,
    signed_version: "v1",
    start_date: "2026-06-01",
    expected_completion_date: "2026-06-30"
  },
  as_of_date: "2026-06-23",
  items: [
    {
      item_code: "HM-001",
      item_name: "Sơn tường trong nhà",
      unit: "m2",
      milestone_name: "Mốc 1 - Phần hoàn thiện",
      planned_quantity: 320.0,
      actual_quantity: 280.0,
      variance_quantity: -40.0,
      percent_complete: 87.5,
      planned_start_date: "2026-06-05",
      planned_end_date: "2026-06-11",
      actual_start_date: "2026-06-06",
      actual_end_date: null,
      delay_days: 12,
      flag: "Đỏ",
      site_notes: "Chậm tiến độ do thiếu thợ sơn",
      delay_reason: "Chờ vật tư",
      unit_price: 65000.0,
      planned_value: 20800000.0,
      earned_value: 18200000.0
    },
    {
      item_code: "HM-002",
      item_name: "Trần thạch cao 60x60",
      unit: "m2",
      milestone_name: "Mốc 1 - Phần hoàn thiện",
      planned_quantity: 150.0,
      actual_quantity: 150.0,
      variance_quantity: 0.0,
      percent_complete: 100.0,
      planned_start_date: "2026-06-08",
      planned_end_date: "2026-06-18",
      actual_start_date: "2026-06-08",
      actual_end_date: "2026-06-18",
      delay_days: 0,
      flag: "Xanh",
      site_notes: "Hoàn thành lắp đặt nghiệm thu đạt",
      delay_reason: "",
      unit_price: 280000.0,
      planned_value: 42000000.0,
      earned_value: 42000000.0
    },
    {
      item_code: "HM-003",
      item_name: "Lát sàn ceramic 60x60",
      unit: "m2",
      milestone_name: "Mốc 1 - Phần hoàn thiện",
      planned_quantity: 85.0,
      actual_quantity: 85.0,
      variance_quantity: 0.0,
      percent_complete: 100.0,
      planned_start_date: "2026-06-10",
      planned_end_date: "2026-06-20",
      actual_start_date: "2026-06-10",
      actual_end_date: "2026-06-20",
      delay_days: 0,
      flag: "Xanh",
      site_notes: "Đã lát xong gạch nền văn phòng",
      delay_reason: "",
      unit_price: 320000.0,
      planned_value: 27200000.0,
      earned_value: 27200000.0
    },
    {
      item_code: "HM-004",
      item_name: "Cửa nhựa lõi thép",
      unit: "cái",
      milestone_name: "Mốc 1 - Phần hoàn thiện",
      planned_quantity: 4.0,
      actual_quantity: 4.0,
      variance_quantity: 0.0,
      percent_complete: 100.0,
      planned_start_date: "2026-06-12",
      planned_end_date: "2026-06-19",
      actual_start_date: "2026-06-12",
      actual_end_date: "2026-06-19",
      delay_days: 0,
      flag: "Xanh",
      site_notes: "Lắp đặt kính khung nhôm xong",
      delay_reason: "",
      unit_price: 3800000.0,
      planned_value: 15200000.0,
      earned_value: 15200000.0
    },
    {
      item_code: "HM-005",
      item_name: "Đèn LED chiếu sáng",
      unit: "bộ",
      milestone_name: "Mốc 2 - Điện & cơ điện",
      planned_quantity: 24.0,
      actual_quantity: 20.0,
      variance_quantity: -4.0,
      percent_complete: 83.33,
      planned_start_date: "2026-06-15",
      planned_end_date: "2026-06-21",
      actual_start_date: "2026-06-15",
      actual_end_date: null,
      delay_days: 2,
      flag: "Vàng",
      site_notes: "Thiếu chao đèn trang trí",
      delay_reason: "Chờ vật tư",
      unit_price: 750000.0,
      planned_value: 18000000.0,
      earned_value: 15000000.0
    },
    {
      item_code: "HM-006",
      item_name: "Ổ cắm điện âm tường",
      unit: "cái",
      milestone_name: "Mốc 2 - Điện & cơ điện",
      planned_quantity: 30.0,
      actual_quantity: 30.0,
      variance_quantity: 0.0,
      percent_complete: 100.0,
      planned_start_date: "2026-06-16",
      planned_end_date: "2026-06-23",
      actual_start_date: "2026-06-16",
      actual_end_date: "2026-06-23",
      delay_days: 0,
      flag: "Xanh",
      site_notes: "Đấu nối ổ cắm xong",
      delay_reason: "",
      unit_price: 150000.0,
      planned_value: 4500000.0,
      earned_value: 4500000.0
    },
    {
      item_code: "HM-007",
      item_name: "Kính cửa sổ cường lực",
      unit: "m2",
      milestone_name: "Mốc 1 - Phần hoàn thiện",
      planned_quantity: 18.0,
      actual_quantity: 10.0,
      variance_quantity: -8.0,
      percent_complete: 55.55,
      planned_start_date: "2026-06-09",
      planned_end_date: "2026-06-15",
      actual_start_date: "2026-06-09",
      actual_end_date: null,
      delay_days: 8,
      flag: "Đỏ",
      site_notes: "Đang đo vẽ lại kích thước kính vách",
      delay_reason: "Thay đổi thiết kế",
      unit_price: 750000.0,
      planned_value: 13500000.0,
      earned_value: 7500000.0
    },
    {
      item_code: "HM-008",
      item_name: "Sơn chống thấm Sika",
      unit: "m2",
      milestone_name: "Mốc 1 - Phần hoàn thiện",
      planned_quantity: 95.0,
      actual_quantity: 95.0,
      variance_quantity: 0.0,
      percent_complete: 100.0,
      planned_start_date: "2026-06-10",
      planned_end_date: "2026-06-20",
      actual_start_date: "2026-06-10",
      actual_end_date: "2026-06-20",
      delay_days: 0,
      flag: "Xanh",
      site_notes: "Chống thấm khu vệ sinh xong",
      delay_reason: "",
      unit_price: 120000.0,
      planned_value: 11400000.0,
      earned_value: 11400000.0
    },
    {
      item_code: "HM-009",
      item_name: "Vệ sinh sau thi công",
      unit: "m2",
      milestone_name: "Mốc 3 - Dọn dẹp & bàn giao",
      planned_quantity: 605.0,
      actual_quantity: 0.0,
      variance_quantity: -605.0,
      percent_complete: 0.0,
      planned_start_date: "2026-06-24",
      planned_end_date: "2026-06-29",
      actual_start_date: null,
      actual_end_date: null,
      delay_days: 0,
      flag: "Xanh",
      site_notes: "",
      delay_reason: "",
      unit_price: 25000.0,
      planned_value: 15125000.0,
      earned_value: 0.0
    },
    {
      item_code: "HM-010",
      item_name: "Vận chuyển vật liệu",
      unit: "ls",
      milestone_name: "Mốc 3 - Dọn dẹp & bàn giao",
      planned_quantity: 1.0,
      actual_quantity: 0.0,
      variance_quantity: -1.0,
      percent_complete: 0.0,
      planned_start_date: "2026-06-25",
      planned_end_date: "2026-06-30",
      actual_start_date: null,
      actual_end_date: null,
      delay_days: 0,
      flag: "Xanh",
      site_notes: "",
      delay_reason: "",
      unit_price: 5000000.0,
      planned_value: 5000000.0,
      earned_value: 0.0
    }
  ],
  milestones: [
    {
      milestone_name: "Mốc 1 - Phần hoàn thiện",
      planned_end_date: "2026-06-20",
      percent_complete: 92.85,
      flag: "Đỏ",
      max_delay_days: 12,
      item_count: 6,
      planned_value: 130000000.0,
      earned_value: 121500000.0
    },
    {
      milestone_name: "Mốc 2 - Điện & cơ điện",
      planned_end_date: "2026-06-25",
      percent_complete: 92.59,
      flag: "Vàng",
      max_delay_days: 2,
      item_count: 2,
      planned_value: 22500000.0,
      earned_value: 19500000.0
    },
    {
      milestone_name: "Mốc 3 - Dọn dẹp & bàn giao",
      planned_end_date: "2026-06-30",
      percent_complete: 0.0,
      flag: "Xanh",
      max_delay_days: 0,
      item_count: 2,
      planned_value: 20125000.0,
      earned_value: 0.0
    }
  ],
  delayed_items: [
    { item_code: "HM-001", item_name: "Sơn tường trong nhà", milestone_name: "Mốc 1 - Phần hoàn thiện", delay_days: 12, flag: "Đỏ", delay_reason: "Chờ vật tư" },
    { item_code: "HM-007", item_name: "Kính cửa sổ cường lực", milestone_name: "Mốc 1 - Phần hoàn thiện", delay_days: 8, flag: "Đỏ", delay_reason: "Thay đổi thiết kế" },
    { item_code: "HM-005", item_name: "Đèn LED chiếu sáng", milestone_name: "Mốc 2 - Điện & cơ điện", delay_days: 2, flag: "Vàng", delay_reason: "Chờ vật tư" }
  ],
  project_percent_complete: 50.6,
  total_planned_value: 172625000.0,
  total_earned_value: 141000000.0,
  spi_like: 0.816,
  thresholds: { yellow_days: 3, red_days: 7 },
  warnings: [],
  generated_at: "2026-06-23 11:52:13"
};

export const mockProgressHistory = [
  {
    fileName: "TienDo_PHC_20260623_115213.json",
    label: "Tiến độ PHC - 23/06/2026",
    createdAt: "2026-06-23 11:52:13",
    excelUrl: "#",
    pdfUrl: "#",
    csvUrl: "#",
    jsonUrl: "#"
  }
];

export const mockProgressReportDA1 = {
  project_info: {
    project_name: "Xây mới văn phòng A - Dự án DA1",
    contract_code: "DA1-2025-001",
    contract_signed: true,
    signed_version: "Phiên bản Gốc (v1)",
    start_date: "2025-11-15",
    expected_completion_date: "2026-11-15"
  },
  as_of_date: "2026-06-23",
  items: [
    {
      item_code: "DA1-001",
      item_name: "Giai đoạn nền móng",
      unit: "ls",
      milestone_name: "Mốc 1 - Nền móng",
      planned_quantity: 1.0,
      actual_quantity: 1.0,
      variance_quantity: 0.0,
      percent_complete: 100.0,
      planned_start_date: "2025-11-15",
      planned_end_date: "2026-02-15",
      actual_start_date: "2025-11-15",
      actual_end_date: "2026-02-14",
      delay_days: 0,
      flag: "Xanh",
      site_notes: "Hoàn thành đổ bê tông móng đúng hạn bàn giao",
      delay_reason: "",
      unit_price: 1500000000.0,
      planned_value: 1500000000.0,
      earned_value: 1500000000.0
    },
    {
      item_code: "DA1-002",
      item_name: "Kết cấu thô",
      unit: "ls",
      milestone_name: "Mốc 2 - Kết cấu thô",
      planned_quantity: 1.0,
      actual_quantity: 0.6,
      variance_quantity: -0.4,
      percent_complete: 60.0,
      planned_start_date: "2026-02-16",
      planned_end_date: "2026-08-16",
      actual_start_date: "2026-02-20",
      actual_end_date: null,
      delay_days: 10,
      flag: "Vàng",
      site_notes: "Đang thi công sàn tầng 4, chậm do thiếu thợ sắt thép",
      delay_reason: "Thiếu nhân công",
      unit_price: 2000000000.0,
      planned_value: 2000000000.0,
      earned_value: 1200000000.0
    }
  ],
  milestones: [
    {
      milestone_name: "Mốc 1 - Nền móng",
      planned_end_date: "2026-02-15",
      percent_complete: 100.0,
      flag: "Xanh",
      max_delay_days: 0,
      item_count: 1,
      planned_value: 1500000000.0,
      earned_value: 1500000000.0
    },
    {
      milestone_name: "Mốc 2 - Kết cấu thô",
      planned_end_date: "2026-08-16",
      percent_complete: 60.0,
      flag: "Vàng",
      max_delay_days: 10,
      item_count: 1,
      planned_value: 2000000000.0,
      earned_value: 1200000000.0
    }
  ],
  delayed_items: [
    { item_code: "DA1-002", item_name: "Kết cấu thô", milestone_name: "Mốc 2 - Kết cấu thô", delay_days: 10, flag: "Vàng", delay_reason: "Thiếu nhân công" }
  ],
  project_percent_complete: 77.1,
  total_planned_value: 3500000000.0,
  total_earned_value: 2700000000.0,
  spi_like: 0.771,
  thresholds: { yellow_days: 5, red_days: 15 },
  warnings: [],
  generated_at: "2026-06-23 12:00:00"
};

export const mockProgressHistoryDA1 = [
  {
    fileName: "TienDo_DA1_20260623_120000.json",
    label: "Tiến độ DA1 - 23/06/2026",
    createdAt: "2026-06-23 12:00:00",
    excelUrl: "#",
    pdfUrl: "#",
    csvUrl: "#",
    jsonUrl: "#"
  }
];