import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { mockProgressPlan, mockProgressLog, mockProgressReport, mockProgressHistory, mockQuotes, mockProjects, mockProgressReportDA1, mockProgressHistoryDA1 } from '../services/mockData';
import { 
  TrendingUp, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  FileSpreadsheet, 
  Layers, 
  Activity, 
  Clock, 
  MapPin, 
  FileDown, 
  LayoutDashboard, 
  ClipboardEdit, 
  SlidersHorizontal,
  ChevronRight,
  User,
  StickyNote,
  Send,
  Eye,
  EyeOff,
  FileJson
} from 'lucide-react';

interface ProgressPageProps {
  projectId: string;
  mockDataEnabled?: boolean;
  setActiveTab?: (tab: string) => void;
}

const parseDate = (dStr: any) => {
  if (!dStr) return null;
  if (typeof dStr === 'string' && dStr.includes('/')) {
    const parts = dStr.split('/');
    if (parts.length === 3) {
      return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
    }
  }
  if (typeof dStr === 'string' && dStr.includes('-')) {
    const parts = dStr.split('-');
    if (parts.length === 3) {
      return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    }
  }
  return new Date(dStr);
};

const formatDateVN = (dateStr?: string) => {
  if (!dateStr) return 'Chưa cập nhật';
  if (dateStr.includes('/')) return dateStr;
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

// ---- Thống nhất quy chuẩn Design System Starbucks ----
const panelStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  padding: '24px',
  boxShadow: '0px 0px 0.5px 0px rgba(0,0,0,0.14), 0px 1px 1px 0px rgba(0,0,0,0.24)',
};

const labelStyle: React.CSSProperties = {
  fontSize: '1.15rem',
  fontWeight: '700',
  color: 'rgba(0,0,0,0.87)',
  textTransform: 'uppercase',
  letterSpacing: '0.325px'
};

const inputStyle: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: '8px',
  border: '1px solid #d6dbde',
  fontSize: '1.25rem',
  outline: 'none',
  backgroundColor: '#ffffff',
  transition: 'all 0.2s ease',
};

const subTabStyle = (isActive: boolean): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  padding: '12px 20px',
  borderRadius: '0px', // Khử bo góc của viên thuốc
  border: 'none',
  borderBottom: isActive ? '3px solid #006241' : '3px solid transparent', 
  backgroundColor: 'transparent', // Luôn để nền trong suốt
  color: isActive ? '#006241' : 'rgba(0, 0, 0, 0.58)', // Active thì chữ chuyển sang màu xanh chủ đạo
  fontSize: '1.3rem',
  fontWeight: '700',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  outline: 'none',
  marginBottom: '-2px'
});

export const ProgressPage: React.FC<ProgressPageProps> = ({ projectId, mockDataEnabled, setActiveTab }) => {
  const [data, setData] = useState<any>(null);
  const [contractSigned, setContractSigned] = useState<boolean>(false);
  const [signedVersion, setSignedVersion] = useState<string>('');
  const [hasPlan, setHasPlan] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);

  const [activeSubView, setActiveSubView] = useState<'dashboard' | 'report'>('dashboard');
  const [filterFlag, setFilterFlag] = useState('Tất cả');
  const [planInput, setPlanInput] = useState('');
  const [logInput, setLogInput] = useState('');
  const [todayStr, setTodayStr] = useState("2026-06-23");
  const [showLogModal, setShowLogModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);

  const [formItems, setFormItems] = useState<Record<string, {
    actual_quantity: number;
    actual_end_date: string;
    delay_reason: string;
    site_notes: string;
  }>>({});
  const [reporter, setReporter] = useState('');
  const [generalNotes, setGeneralNotes] = useState('');
  const [showSummary, setShowSummary] = useState(false);
  const [useRawJson, setUseRawJson] = useState(false);

  const loadProgressInfo = async () => {
    setLoading(true);
    setError('');
    try {
      if (mockDataEnabled) {
        const hasLocalStorageSigned = localStorage.getItem(`mock_contract_signed_${projectId}`) === 'true';
        const signedQuoteInMock = mockQuotes.find(q => String(q.project_id) === String(projectId) && (q.contract_signed || q.project_info?.contract_signed));
        
        if (hasLocalStorageSigned || signedQuoteInMock) {
          setContractSigned(true);
          const version = localStorage.getItem(`mock_signed_version_${projectId}`) || signedQuoteInMock?.version || 'v1';
          setSignedVersion(String(version));
          
          let reportData: any = null;
          let hasPlanVal = true;
          let historyVal: any[] = [];

          if (projectId === 'PHC') {
            reportData = JSON.parse(JSON.stringify(mockProgressReport));
            historyVal = mockProgressHistory;
          } else if (projectId === 'DA1') {
            reportData = JSON.parse(JSON.stringify(mockProgressReportDA1));
            historyVal = mockProgressHistoryDA1;
          } else {
            const quote: any = signedQuoteInMock || mockQuotes.find(q => String(q.project_id) === String(projectId));
            const items = quote ? (quote.items || []) : [];
            const proj = mockProjects.find(p => String(p.id) === String(projectId));
            const projectName = proj?.name || quote?.project_info?.project_name || `Dự án ${projectId}`;
            const expectedCompletionDate = proj?.expected_completion_date || quote?.project_info?.expected_completion_date || "2026-06-30";
            const startDate = proj?.start_date || quote?.project_info?.start_date || "2026-06-01";

            reportData = {
              project_info: {
                project_name: projectName,
                contract_code: proj?.contract_code || quote?.project_info?.contract_code || "HĐ-DEMO-" + projectId,
                contract_signed: true,
                signed_version: String(version),
                start_date: startDate,
                expected_completion_date: expectedCompletionDate
              },
              as_of_date: new Date().toISOString().split('T')[0],
              items: items.map((it: any) => ({
                item_code: it.item_code,
                item_name: it.item_name,
                unit: it.unit || 'm2',
                milestone_name: "Mốc tổng thể",
                planned_quantity: it.quoted_quantity || 0,
                actual_quantity: 0,
                variance_quantity: -(it.quoted_quantity || 0),
                percent_complete: 0,
                planned_start_date: startDate,
                planned_end_date: expectedCompletionDate,
                actual_start_date: null,
                actual_end_date: null,
                delay_days: 0,
                flag: "Xanh",
                site_notes: "",
                delay_reason: "",
                unit_price: it.original_unit_price || 0,
                planned_value: (it.quoted_quantity || 0) * (it.original_unit_price || 0),
                earned_value: 0
              })),
              milestones: [
                {
                  milestone_name: "Mốc tổng thể",
                  planned_end_date: expectedCompletionDate,
                  percent_complete: 0,
                  flag: "Xanh",
                  max_delay_days: 0,
                  item_count: items.length,
                  planned_value: items.reduce((sum: number, it: any) => sum + (it.quoted_quantity || 0) * (it.original_unit_price || 0), 0),
                  earned_value: 0
                }
              ],
              project_percent_complete: 0
            };
            historyVal = [];
          }

          // Check localStorage for any newly signed variation items and dynamically merge them in memory
          const savedItemsStr = localStorage.getItem(`mock_signed_items_${projectId}`);
          if (savedItemsStr && reportData) {
            const savedItems = JSON.parse(savedItemsStr);
            const reportItems = reportData.items || [];
            const reportCodes = new Set(reportItems.map((it: any) => it.item_code));

            savedItems.forEach((it: any) => {
              if (!reportCodes.has(it.item_code)) {
                reportItems.push({
                  item_code: it.item_code,
                  item_name: it.item_name,
                  unit: it.unit || 'm2',
                  milestone_name: "Mốc tổng thể",
                  planned_quantity: it.quoted_quantity || 0,
                  actual_quantity: 0,
                  variance_quantity: -(it.quoted_quantity || 0),
                  percent_complete: 0,
                  planned_start_date: reportData.project_info?.start_date || "2026-06-01",
                  planned_end_date: reportData.project_info?.expected_completion_date || "2026-06-30",
                  actual_start_date: null,
                  actual_end_date: null,
                  delay_days: 0,
                  flag: "Xanh",
                  site_notes: "",
                  delay_reason: "",
                  unit_price: it.original_unit_price || 0,
                  planned_value: (it.quoted_quantity || 0) * (it.original_unit_price || 0),
                  earned_value: 0,
                  is_variation: true
                });
              }
            });
            reportData.items = reportItems;
          }

          setData(reportData);
          setHasPlan(hasPlanVal);
          setHistory(historyVal);
          setWarnings([]);
        } else {
          setContractSigned(false);
          setSignedVersion('');
          setData(null);
          setHasPlan(false);
          setHistory([]);
          setWarnings([]);
        }
      } else {
        const res = await api.getProgress(projectId);
        setContractSigned(!!res.contract_signed);
        setSignedVersion(res.signed_version || '');
        setData(res.currentReport);
        setHasPlan(res.hasPlan);
        setHistory(res.history);
        setWarnings(res.currentReport?.warnings || []);
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi khi tải thông tin tiến độ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    setData(null);
    setHistory([]);
    loadProgressInfo();
    if (mockDataEnabled) {
      handleDemoPlan();
      handleDemoLog();
    } else {
      setPlanInput(''); setLogInput(''); setReporter(''); setGeneralNotes('');
      setShowSummary(false); setTodayStr(new Date().toISOString().split('T')[0]);
    }
  }, [projectId, mockDataEnabled]);

  useEffect(() => {
    if (data && data.items) {
      const initialForm: Record<string, any> = {};
      data.items.forEach((item: any) => {
        if (!item.actual_end_date && item.percent_complete < 100) {
          initialForm[item.item_code] = {
            actual_quantity: item.actual_quantity || 0,
            actual_end_date: '',
            delay_reason: item.delay_reason || '',
            site_notes: item.site_notes || ''
          };
        }
      });
      setFormItems(initialForm);
    }
  }, [data]);

  const handleDemoPlan = () => { setPlanInput(JSON.stringify(mockProgressPlan, null, 2)); };
  const handleDemoLog = () => { setLogInput(JSON.stringify(mockProgressLog, null, 2)); setTodayStr("2026-06-23"); };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSuccess(''); setProcessing(true);
    try {
      let parsedPlan;
      try { parsedPlan = JSON.parse(planInput); } catch { throw new Error('Dữ liệu Kế hoạch JSON không hợp lệ.'); }
      if (mockDataEnabled) {
        await new Promise(resolve => setTimeout(resolve, 500));
        setSuccess('Đã lưu Kế hoạch tiến độ mẫu thành công (Chế độ Mock Data)!');
      } else {
        await api.saveProgressPlan(projectId, parsedPlan);
        setSuccess('Đã lưu Kế hoạch tiến độ thành công!');
      }
      setShowPlanModal(false);
      await loadProgressInfo();
    } catch (err: any) {
      setError(err.message || 'Lỗi khi lưu kế hoạch');
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdateProgressRaw = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSuccess(''); setWarnings([]); setProcessing(true);
    try {
      let parsedLog;
      try { parsedLog = JSON.parse(logInput); } catch { throw new Error('Dữ liệu Nhật ký JSON không hợp lệ.'); }
      if (mockDataEnabled) {
        await new Promise(resolve => setTimeout(resolve, 500));
        setSuccess(`Đã cập nhật Nhật ký hiện trường mẫu thành công (Chế độ Mock Data)!`);
      } else {
        const res = await api.updateProgress(projectId, parsedLog, todayStr);
        setSuccess(`Đã cập nhật Nhật ký hiện trường thành công! Hệ thống đã tính lại tiến độ.`);
        if (res.warnings && res.warnings.length > 0) setWarnings(res.warnings);
      }
      setShowLogModal(false);
      await loadProgressInfo();
      setTimeout(() => { setActiveSubView('dashboard'); setError(''); setSuccess(''); }, 1500);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi cập nhật nhật ký tiến độ');
    } finally {
      setProcessing(false);
    }
  };

  const handleVisualSubmit = async () => {
    setError(''); setSuccess(''); setWarnings([]); setProcessing(true);
    try {
      const finalItems = activeItems.map((item: any) => {
        const fields = formItems[item.item_code] || {
          actual_quantity: item.actual_quantity || 0, actual_end_date: '', delay_reason: '', site_notes: ''
        };
        return {
          item_code: item.item_code,
          actual_quantity: Number(fields.actual_quantity) || 0,
          actual_end_date: fields.actual_end_date || null,
          delay_reason: fields.delay_reason || '',
          site_notes: fields.site_notes || ''
        };
      });

      const payload = { items: finalItems, reporter: reporter, general_notes: generalNotes };
      if (mockDataEnabled) {
        await new Promise(resolve => setTimeout(resolve, 500));
        setSuccess(`Đã gửi báo cáo tiến độ mẫu thành công (Chế độ Mock Data)!`);
      } else {
        const res = await api.updateProgress(projectId, payload, todayStr);
        setSuccess(`Đã gửi báo cáo tiến độ thành công! Excel Master đã cập nhật.`);
        if (res.warnings && res.warnings.length > 0) setWarnings(res.warnings);
      }
      setShowLogModal(false); setShowSummary(false);
      await loadProgressInfo();
      setTimeout(() => { setActiveSubView('dashboard'); setError(''); setSuccess(''); }, 1500);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi gửi báo cáo tiến độ');
    } finally {
      setProcessing(false);
    }
  };

  const updateFormItem = (code: string, key: string, val: any) => {
    setFormItems(prev => ({ ...prev, [code]: { ...prev[code], [key]: val } }));
  };

  const stats = (() => {
    if (!data || !data.items) {
      return {
        percentComplete: 0, completedCount: 0, totalCount: 0, delayedCount: 0,
        redCount: 0, yellowCount: 0, greenCount: 0, maxDelayDays: 0,
        maxDelayItemCode: '', maxDelayItemName: '', remainingDays: 7
      };
    }
    const items = data.items;
    const totalCount = items.length;
    const completedCount = items.filter((i: any) => i.percent_complete >= 100 || i.actual_end_date).length;
    const redCount = items.filter((i: any) => i.flag === 'Đỏ').length;
    const yellowCount = items.filter((i: any) => i.flag === 'Vàng').length;
    const greenCount = items.filter((i: any) => i.flag === 'Xanh').length;
    const delayedCount = redCount + yellowCount;

    let maxDelayDays = 0; let maxDelayItemCode = ''; let maxDelayItemName = '';
    items.forEach((i: any) => {
      if (i.delay_days > maxDelayDays) {
        maxDelayDays = i.delay_days; maxDelayItemCode = i.item_code; maxDelayItemName = i.item_name;
      }
    });

    if (maxDelayDays === 0 && data.milestones) {
      data.milestones.forEach((ms: any) => { if (ms.max_delay_days > maxDelayDays) maxDelayDays = ms.max_delay_days; });
    }

    let remainingDays = 7;
    if (data.project_info?.expected_completion_date || data.project_info?.endDate) {
      const pEnd = parseDate(data.project_info?.expected_completion_date || data.project_info?.endDate);
      const parsedToday = parseDate(todayStr) || new Date();
      if (pEnd) {
        const diffMs = pEnd.getTime() - parsedToday.getTime();
        remainingDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      }
    } else if (mockDataEnabled) {
      remainingDays = 7;
    }

    return { percentComplete: data.project_percent_complete || (totalCount > 0 ? (completedCount / totalCount) * 100 : 0), completedCount, totalCount, delayedCount, redCount, yellowCount, greenCount, maxDelayDays, maxDelayItemCode, maxDelayItemName, remainingDays };
  })();

  const ganttBounds = (() => {
    if (!data || !data.items || data.items.length === 0) return null;
    let minTime = Infinity; let maxTime = -Infinity;
    const getDTime = (dateStr: any) => { const parsed = parseDate(dateStr); return parsed ? parsed.getTime() : null; };
    const parsedToday = parseDate(todayStr) || new Date(); const todayTime = parsedToday.getTime();

    minTime = Math.min(minTime, todayTime); maxTime = Math.max(maxTime, todayTime);
    data.items.forEach((item: any) => {
      const pStart = getDTime(item.planned_start_date); const pEnd = getDTime(item.planned_end_date);
      const aStart = getDTime(item.actual_start_date); const aEnd = getDTime(item.actual_end_date) || (aStart ? todayTime : null);
      if (pStart) minTime = Math.min(minTime, pStart); if (pEnd) maxTime = Math.max(maxTime, pEnd);
      if (aStart) minTime = Math.min(minTime, aStart); if (aEnd) maxTime = Math.max(maxTime, aEnd);
    });

    const padding = 2 * 24 * 60 * 60 * 1000;
    minTime -= padding; maxTime += padding;
    return { minTime, maxTime, totalSpan: maxTime - minTime, todayTime };
  })();

  const filteredItems = data ? data.items.filter((item: any) => filterFlag === 'Tất cả' || item.flag === filterFlag) : [];
  const activeItems = data ? data.items.filter((item: any) => !item.actual_end_date && item.percent_complete < 100) : [];
  const delayedMeetingItems = data ? data.items.filter((item: any) => item.delay_days > 0) : [];

  const renderDailyLogTabContent = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Subbar selector */}
        <div style={{ ...panelStyle, padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Calendar size={16} color="#00754A" />
            <span style={{ fontSize: '1.3rem', fontWeight: '700', color: 'rgba(0,0,0,0.6)' }}>NGÀY GHI NHẬN NHẬT KÝ:</span>
            <input
              type="date" value={todayStr}
              onChange={(e) => setTodayStr(e.target.value)} required
              style={{ ...inputStyle, padding: '6px 12px', fontSize: '1.25rem', width: 'auto' }}
            />
          </div>
        </div>

        {useRawJson ? (
          <div style={panelStyle}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#006241', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}><FileJson size={16} /> Cấu trúc đầu vào Nhật ký JSON</h3>
            <form onSubmit={handleUpdateProgressRaw} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <textarea
                rows={12} placeholder='{"items": [{"item_code": "HM-001", "actual_quantity": 300, "actual_end_date": null}]}'
                value={logInput} onChange={(e) => setLogInput(e.target.value)} required
                style={{ width: '100%', fontFamily: 'monospace', fontSize: '1.25rem', border: '1px solid #d6dbde', borderRadius: '8px', padding: '14px', outline: 'none' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #edebe9', paddingTop: '16px' }}>
                <button type="button" style={{ padding: '8px 20px', backgroundColor: '#ffffff', color: '#666666', border: '1px solid #d6dbde', borderRadius: '50px', fontSize: '1.25rem', fontWeight: '600', cursor: 'pointer' }} onClick={() => setActiveSubView('dashboard')}>Thoát</button>
                <button type="submit" style={{ padding: '8px 24px', backgroundColor: '#00754A', color: '#ffffff', border: 'none', borderRadius: '50px', fontSize: '1.25rem', fontWeight: '700', cursor: 'pointer' }} disabled={processing}>
                  {processing ? 'Engine xử lý...' : 'Cập nhật & Tính toán'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {activeItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px', color: 'rgba(0,0,0,0.58)', background: '#ffffff', borderRadius: '12px', border: '2px dashed #edebe9', fontSize: '1.35rem' }}>
                  <CheckCircle2 size={32} color="#00754A" style={{ marginBottom: '8px' }} />
                  <div>Tất cả các hạng mục trong kế hoạch thi công đã hoàn thành 100%!</div>
                </div>
              ) : (
                activeItems.map((item: any) => {
                  const fields = formItems[item.item_code] || { actual_quantity: item.actual_quantity || 0, actual_end_date: '', delay_reason: '', site_notes: '' };
                  const isRed = item.flag === 'Đỏ'; const isYellow = item.flag === 'Vàng';
                  const flagLabel = isRed ? 'Trễ Đỏ' : isYellow ? 'Nguy cơ Vàng' : 'An toàn Xanh';
                  let flagBadgeStyle: React.CSSProperties = { fontSize: '1.05rem', fontWeight: '700', padding: '4px 10px', borderRadius: '8px' };
                  
                  if (isRed) flagBadgeStyle = { ...flagBadgeStyle, backgroundColor: 'rgba(200, 32, 20, 0.08)', color: '#c82014' };
                  else if (isYellow) flagBadgeStyle = { ...flagBadgeStyle, backgroundColor: '#faf6ee', color: '#cba258' };
                  else flagBadgeStyle = { ...flagBadgeStyle, backgroundColor: '#d4e9e2', color: '#1E3932' };

                  const currentQty = Number(fields.actual_quantity) || 0;
                  const computedPercent = Math.min(100, (currentQty / item.planned_quantity) * 100);

                  return (
                    <div key={item.item_code} style={{ ...panelStyle, borderLeft: `5px solid ${isRed ? '#c82014' : isYellow ? '#cba258' : '#00754A'}`, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontSize: '1.1rem', color: '#65757d', fontWeight: '700' }}>{item.item_code}</span>
                          <h4 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1E3932', margin: '2px 0 0 0' }}>{item.item_name}</h4>
                        </div>
                        <span style={flagBadgeStyle}>{flagLabel}</span>
                      </div>

                      <div style={{ fontSize: '1.2rem', color: 'rgba(0,0,0,0.58)', display: 'flex', gap: '20px', flexWrap: 'wrap', backgroundColor: '#f2f0eb', padding: '10px 14px', borderRadius: '8px', fontWeight: 500 }}>
                        <span>Khối lượng HĐ: <strong style={{ color: '#000000' }}>{item.planned_quantity} {item.unit}</strong></span>
                        <span>Đã lũy kế: <strong style={{ color: '#00754A' }}>{item.actual_quantity} {item.unit} ({item.percent_complete.toFixed(0)}%)</strong></span>
                        <span>Hạn bàn giao: <strong style={{ color: '#000000' }}>{formatDateVN(item.planned_end_date)}</strong></span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 32px', borderTop: '1px solid #edebe9', paddingTop: '16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={labelStyle}>Sản lượng nghiệm thu hôm nay ({item.unit})</label>
                            <input
                              type="number" value={fields.actual_quantity}
                              onChange={(e) => updateFormItem(item.item_code, 'actual_quantity', parseFloat(e.target.value) || 0)}
                              style={inputStyle}
                            />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={labelStyle}>Phân loại nguyên nhân trễ (Nếu có)</label>
                            <select
                              value={fields.delay_reason} onChange={(e) => updateFormItem(item.item_code, 'delay_reason', e.target.value)}
                              style={{ ...inputStyle, cursor: 'pointer' }}
                            >
                              <option value="">-- Tiến độ đúng hạn (Không có) --</option>
                              <option value="Chờ vật tư">Chờ bên A cấp vật tư</option>
                              <option value="Thay đổi thiết kế">Thay đổi bản vẽ thiết kế</option>
                              <option value="Thiếu nhân công">Thiếu hụt tổ đội nhân công</option>
                              <option value="Thời tiết">Điều kiện bất lợi thời tiết</option>
                              <option value="Lý do khác">Lý do bất khả kháng khác...</option>
                            </select>
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={labelStyle}>Ngày hoàn thành thực tế</label>
                            <input
                              type="date" value={fields.actual_end_date}
                              onChange={(e) => updateFormItem(item.item_code, 'actual_end_date', e.target.value)}
                              style={inputStyle}
                            />
                            <span style={{ fontSize: '1.1rem', color: 'rgba(0,0,0,0.4)', fontStyle: 'italic' }}>* Chỉ điền khi hạng mục đã kết thúc hoàn chỉnh nghiệm thu</span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={labelStyle}>Ghi chú nhật ký hiện trường</label>
                            <input
                              type="text" placeholder="Tình hình thi công chi tiết, thiết bị máy móc..."
                              value={fields.site_notes} onChange={(e) => updateFormItem(item.item_code, 'site_notes', e.target.value)}
                              style={inputStyle}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Bar preview */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid #edebe9', paddingTop: '12px', marginTop: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', color: 'rgba(0,0,0,0.58)', fontWeight: 600 }}>
                          <span>Dự phóng lũy kế: <strong style={{ color: '#006241' }}>{computedPercent.toFixed(0)}%</strong></span>
                          {item.delay_days > 0 && <span style={{ color: '#c82014' }}>Trễ {item.delay_days} ngày công</span>}
                        </div>
                        <div style={{ width: '100%', height: '8px', background: '#edebe9', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${computedPercent}%`, height: '100%', background: isRed ? '#c82014' : isYellow ? '#cba258' : '#00754A', transition: 'width 0.3s ease' }} />
                        </div>
                      </div>

                    </div>
                  );
                })
              )}
            </div>

           {/* 📝 Khối Tổng hợp thông tin chung hiện trường chuẩn Starbucks Design System */}
<div style={panelStyle}>
  <h4 style={{ 
    fontSize: '1.45rem', 
    fontWeight: '850', 
    color: '#006241', // Màu Starbucks Green chủ đạo
    textTransform: 'uppercase', 
    letterSpacing: '0.5px', 
    borderBottom: '1px solid #edebe9', 
    paddingBottom: '10px', 
    margin: '0 0 20px 0' 
  }}>
    Tổng hợp thông tin chung hiện trường
  </h4>
  
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
    
    {/* Ô nhập họ tên Cán bộ phụ trách */}
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <label style={labelStyle}>Cán bộ kỹ thuật / Kỹ sư giám sát *</label>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <User 
          size={16} 
          color="#666666" 
          style={{ position: 'absolute', left: '14px', pointerEvents: 'none' }} 
        />
        <input
          type="text" 
          placeholder="Họ tên người lập báo cáo ca..."
          value={reporter} 
          onChange={(e) => setReporter(e.target.value)}
          style={{ ...inputStyle, paddingLeft: '40px', width: '100%' }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = '#00754A'; // Đổi màu viền tương tác
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0, 117, 74, 0.1)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = '#d6dbde';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
      </div>
    </div>

    {/* Ô nhập Nhận xét chung công trường */}
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <label style={labelStyle}>Nhận xét diễn biến công trường hôm nay</label>
      <div style={{ position: 'relative', display: 'flex' }}>
        <StickyNote 
          size={16} 
          color="#666666" 
          style={{ 
            position: 'absolute', 
            left: '14px', 
            top: '12px', // Cố định icon ở đỉnh 12px
            pointerEvents: 'none' 
          }} 
        />
        <textarea
          rows={2} 
          placeholder="Tình hình điều phối nhân lực ra ca, biến động thời tiết mưa/nắng ảnh hưởng tiến độ, công tác an toàn lao động..."
          value={generalNotes} 
          onChange={(e) => setGeneralNotes(e.target.value)}
          style={{ 
            ...inputStyle, 
            paddingLeft: '40px', 
            paddingTop: '10px', 
            width: '100%', 
            resize: 'vertical',
            fontFamily: 'inherit',
            lineHeight: '1.5'
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = '#00754A';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0, 117, 74, 0.1)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = '#d6dbde';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
      </div>
    </div>

  </div>
</div>

            {/* Action Bar */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #edebe9', paddingTop: '20px' }}>
              <button type="button" style={{ padding: '10px 24px', backgroundColor: '#ffffff', color: '#666666', border: '1px solid #d6dbde', borderRadius: '50px', fontSize: '1.25rem', fontWeight: '600', cursor: 'pointer' }} onClick={() => setActiveSubView('dashboard')}>Hủy</button>
              <button
                type="button" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 24px', backgroundColor: '#ffffff', color: '#00754A', border: '1px solid #00754A', borderRadius: '50px', fontSize: '1.25rem', fontWeight: '700', cursor: 'pointer' }}
                onClick={() => setShowSummary(!showSummary)}
              >
                {showSummary ? <EyeOff size={14} /> : <Eye size={14} />}
                {showSummary ? 'Ẩn tóm tắt hồ sơ' : 'Xem tóm tắt nhật ký'}
              </button>
              <button
                type="button" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 28px', backgroundColor: '#00754A', color: '#ffffff', border: 'none', borderRadius: '50px', fontSize: '1.25rem', fontWeight: '700', cursor: 'pointer' }}
                onClick={handleVisualSubmit} disabled={processing || activeItems.length === 0}
                onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <Send size={14} /> {processing ? 'Đang truyền tệp...' : 'Xác nhận & Gửi cập nhật'}
              </button>
            </div>

            {/* Visual Pre-submission Summary view */}
            {showSummary && (
              <div style={{ ...panelStyle, background: '#faf6ee', border: '1px solid #cba258', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#1E3932', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '8px', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Activity size={16} color="#cba258" /> Kiểm tra dữ liệu nhật ký đẩy lên Excel Master
                </h3>
                <div style={{ fontSize: '1.25rem', color: 'rgba(0,0,0,0.6)' }}>
                  Người phụ trách: <strong style={{ color: '#000000' }}>{reporter || '(Chưa điền)'}</strong> &nbsp;·&nbsp; Ngày lập báo cáo: <b>{formatDateVN(todayStr)}</b>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {activeItems.map((item: any) => {
                    const fields = formItems[item.item_code] || {};
                    const isRed = item.flag === 'Đỏ'; const isYellow = item.flag === 'Vàng';
                    const bulletColor = isRed ? '#c82014' : isYellow ? '#cba258' : '#00754A';

                    return (
                      <div key={item.item_code} style={{ padding: '12px 16px', background: '#ffffff', border: '1px solid #edebe9', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: '700', color: '#1E3932', fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ color: bulletColor }}>●</span>
                            <span>{item.item_code} – {item.item_name}</span>
                          </div>
                          <div style={{ fontSize: '1.2rem', color: 'rgba(0,0,0,0.58)', marginTop: '4px' }}>
                            Sản lượng thay đổi: {item.actual_quantity} → <strong style={{ color: '#00754A' }}>{fields.actual_quantity || 0} {item.unit}</strong> &nbsp;·&nbsp; 
                            Dự kiến đạt: {Math.min(100, ((fields.actual_quantity || 0) / item.planned_quantity) * 100).toFixed(0)}% hạng mục
                          </div>
                          {fields.delay_reason && <div style={{ fontSize: '1.15rem', color: '#c82014', marginTop: '4px', fontWeight: '700' }}>Nguyên nhân chậm: {fields.delay_reason}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    );
  };

  if (loading) {
    return <div style={{ color: 'rgba(0,0,0,0.58)', fontSize: '1.3rem', padding: '20px' }}>Đang kết nối engine tính toán tiến độ...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', position: 'relative' }}>

      {/* Main Header Block */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #edebe9', paddingBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '2.4rem', fontWeight: '800', color: '#006241', marginBottom: '6px', letterSpacing: '-0.16px' }}>
            {data?.project_info?.project_name || "Theo dõi tiến độ thi công công trình"}
          </h1>
          <p style={{ fontSize: '1.3rem', color: 'rgba(0,0,0,0.58)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}>
        <MapPin size={13} color="#00754A" /> 
        Nhật ký cập nhật cơ sở dữ liệu · Mã hợp đồng chính thức:{' '}
        {/* SỬA: Lấy từ data động, nếu chưa có thì fallback về mã hợp đồng trong file mockProgressReport gốc */}
        {data?.project_info?.contract_code || mockProgressReport.project_info.contract_code}
      </p>
        </div>
      </div>

      {/* Message Boxes */}
      {error && (
        <div style={{ ...panelStyle, background: 'rgba(200, 32, 20, 0.05)', borderColor: '#c82014', borderLeft: '4px solid #c82014', color: '#c82014', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.3rem' }}>
          <AlertTriangle size={16} /> <span><strong>Lỗi hệ thống:</strong> {error}</span>
        </div>
      )}
      {success && (
        <div style={{ ...panelStyle, background: '#d4e9e2', borderColor: '#00754A', borderLeft: '4px solid #00754A', color: '#1E3932', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.3rem' }}>
          <CheckCircle2 size={16} color="#00754A" /> <span><strong>Hành động thành công:</strong> {success}</span>
        </div>
      )}

      {/* Sub tabs view controller */}
      {contractSigned && (
        <div style={{ display: 'flex', gap: '12px', backgroundColor: '#f2f0eb', padding: '6px', borderRadius: '50px', width: 'fit-content', border: '1px solid #edebe9' }}>
          <button type="button" onClick={() => setActiveSubView('dashboard')} style={subTabStyle(activeSubView === 'dashboard')}>
            <LayoutDashboard size={15} />  Dashboard
          </button>
          <button type="button" onClick={() => setActiveSubView('report')} style={subTabStyle(activeSubView === 'report')}>
            <ClipboardEdit size={15} /> Nhật ký hiện trường 
          </button>
        </div>
      )}

      {/* Main Content Area Routing */}
      {!contractSigned ? (
        <div style={{ ...panelStyle, maxWidth: '600px', margin: '32px auto', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', padding: '40px' }}>
          <div style={{ backgroundColor: '#faf6ee', padding: '16px', borderRadius: '50%' }}><AlertTriangle size={36} color="#cba258" /></div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#1E3932', margin: 0 }}>Hồ sơ Báo giá gốc chưa được ký kết</h2>
          <p style={{ fontSize: '1.35rem', color: 'rgba(0,0,0,0.58)', lineHeight: 1.6, margin: 0 }}>
            Hệ thống quản lý tiến độ thi công yêu cầu một bản **Báo giá chi tiết** hợp lệ ở trạng thái phê duyệt hợp đồng. Vui lòng chuyển sang phân hệ **Báo giá dự án**, lựa chọn phiên bản báo giá từ danh sách lịch sử và nhấp chọn nút **"Phê duyệt & Ký kết"** để thiết lập mốc tiến độ ban đầu.
          </p>
        </div>
      ) : data ? (
        activeSubView === 'dashboard' ? (
          <>
            {/* Dashboard Overview Widgets */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
              <div style={panelStyle}>
                <span style={{ fontSize: '1.15rem', color: 'rgba(0,0,0,0.58)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tiến độ tổng gộp</span>
                <div style={{ fontSize: '3.2rem', fontWeight: '800', color: '#006241', margin: '8px 0' }}>{stats.percentComplete.toFixed(0)}%</div>
                <span style={{ fontSize: '1.2rem', color: '#666666', fontWeight: 500 }}>Đạt {stats.completedCount}/{stats.totalCount} hạng mục xong</span>
              </div>

              <div style={panelStyle}>
                <span style={{ fontSize: '1.15rem', color: 'rgba(0,0,0,0.58)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Hạng mục chậm trễ</span>
                <div style={{ fontSize: '3.2rem', fontWeight: '800', color: '#c82014', margin: '8px 0' }}>{stats.delayedCount}</div>
                <span style={{ fontSize: '1.2rem', color: '#666666', fontWeight: 500, display: 'flex', gap: '8px' }}>
                  <span style={{ color: '#c82014' }}>● Đỏ: {stats.redCount}</span>
                  <span style={{ color: '#cba258' }}>● Vàng: {stats.yellowCount}</span>
                </span>
              </div>

              <div style={panelStyle}>
                <span style={{ fontSize: '1.15rem', color: 'rgba(0,0,0,0.58)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Số ngày lệch biên lớn nhất</span>
                <div style={{ fontSize: '3.2rem', fontWeight: '800', color: '#c82014', margin: '8px 0' }}>{stats.maxDelayDays} <span style={{ fontSize: '1.4rem', fontWeight: 600 }}>ngày</span></div>
                <div style={{ fontSize: '1.15rem', color: '#666666', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', fontWeight: 500 }}>
                  Code: {stats.maxDelayItemCode || 'Không có'}
                </div>
              </div>

              <div style={panelStyle}>
                <span style={{ fontSize: '1.15rem', color: 'rgba(0,0,0,0.58)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Thời gian còn lại</span>
                <div style={{ fontSize: '3.2rem', fontWeight: '800', color: '#00754A', margin: '8px 0' }}>{stats.remainingDays} <span style={{ fontSize: '1.4rem', fontWeight: 600 }}>ngày</span></div>
                <span style={{ fontSize: '1.2rem', color: '#666666', fontWeight: 500 }}>Đến hạn mốc đóng văn phòng</span>
              </div>
            </div>

            {/* Milestone Status section */}
            <div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: '800', color: 'rgba(0,0,0,0.6)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '14px' }}>Giám sát trạng thái theo mốc nghiệm thu</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
                {data.milestones?.map((ms: any, idx: number) => {
                  const isRed = ms.flag === 'Đỏ'; const isYellow = ms.flag === 'Vàng';
                  let milestoneColor = '#00754A';
                  let badgeStyle: React.CSSProperties = { fontSize: '1.1rem', fontWeight: '700', padding: '3px 8px', borderRadius: '6px' };
                  
                  if (isRed) { milestoneColor = '#c82014'; badgeStyle = { ...badgeStyle, backgroundColor: 'rgba(200, 32, 20, 0.08)', color: '#c82014' }; }
                  else if (isYellow) { milestoneColor = '#cba258'; badgeStyle = { ...badgeStyle, backgroundColor: '#faf6ee', color: '#cba258' }; }
                  else { badgeStyle = { ...badgeStyle, backgroundColor: '#d4e9e2', color: '#1E3932' }; }

                  return (
                    <div key={idx} style={panelStyle}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div>
                          <h4 style={{ fontSize: '1.45rem', fontWeight: '700', color: '#1E3932', margin: 0 }}>{ms.milestone_name}</h4>
                          <span style={{ fontSize: '1.15rem', color: '#666666', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}><Calendar size={12} /> Hạn chót: {formatDateVN(ms.planned_end_date)}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '12px 0 6px 0' }}>
                        <span style={{ fontSize: '2.2rem', fontWeight: '800', color: milestoneColor }}>{ms.percent_complete.toFixed(0)}%</span>
                        <span style={badgeStyle}>
                          {isRed ? `Trễ ${ms.max_delay_days} ngày` : isYellow ? `Nguy cơ trễ` : 'Đúng tiến độ'}
                        </span>
                      </div>
                      <div style={{ width: '100%', height: '8px', background: '#edebe9', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${ms.percent_complete}%`, height: '100%', background: milestoneColor, transition: 'width 0.3s' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Items Matrix list table */}
            <div style={panelStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #edebe9', paddingBottom: '14px', marginBottom: '14px' }}>
                <h2 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#1E3932', margin: 0 }}>Chi tiết cấu trúc hạng mục thi công</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <SlidersHorizontal size={14} color="#00754A" />
                  <span style={{ fontSize: '1.25rem', color: 'rgba(0,0,0,0.58)', fontWeight: '600' }}>Bộ lọc cờ:</span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {[
                      { id: 'Tất cả', label: `Toàn bộ (${stats.totalCount})`, color: '#666666', bg: '#f4f4f4' },
                      { id: 'Đỏ', label: `🔴 Trễ Đỏ (${stats.redCount})`, color: '#c82014', bg: 'rgba(200, 32, 20, 0.05)' },
                      { id: 'Vàng', label: `🟡 Nguy Cơ (${stats.yellowCount})`, color: '#cba258', bg: '#faf6ee' },
                      { id: 'Xanh', label: `🟢 Xanh Đạt (${stats.greenCount})`, color: '#00754A', bg: '#d4e9e2' },
                    ].map(p => {
                      const isActive = filterFlag === p.id;
                      return (
                        <button
                          key={p.id} onClick={() => setFilterFlag(p.id)}
                          style={{
                            padding: '6px 14px', borderRadius: '50px', fontSize: '1.15rem', fontWeight: '700', cursor: 'pointer',
                            border: isActive ? `1px solid ${p.color}` : '1px solid #d6dbde',
                            backgroundColor: isActive ? p.color : '#ffffff',
                            color: isActive ? '#ffffff' : 'rgba(0,0,0,0.87)',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#1E3932', color: '#ffffff' }}>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '1.15rem', textTransform: 'uppercase' }}>Hạng mục thi công</th>
                      <th style={{ width: '60px', padding: '12px', textAlign: 'center', fontSize: '1.15rem', textTransform: 'uppercase' }}>Đơn vị tính</th>
                      <th style={{ width: '90px', padding: '12px', textAlign: 'right', fontSize: '1.15rem', textTransform: 'uppercase' }}>KL hợp đồng</th>
                      <th style={{ width: '90px', padding: '12px', textAlign: 'right', fontSize: '1.15rem', textTransform: 'uppercase' }}>Lũy kế thực tế</th>
                      <th style={{ width: '160px', padding: '12px', fontSize: '1.15rem', textTransform: 'uppercase' }}>% Hoàn thành</th>
                      <th style={{ width: '110px', padding: '12px', textAlign: 'center', fontSize: '1.15rem', textTransform: 'uppercase' }}>Biên độ lệch</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '1.15rem', textTransform: 'uppercase' }}>Nhật ký lý do hiện trường</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', color: 'rgba(0,0,0,0.58)', padding: '32px', fontSize: '1.3rem' }}>Không có hạng mục nào tương ứng với bộ lọc cờ cảnh báo.</td>
                      </tr>
                    ) : (
                      filteredItems.map((item: any, idx: number) => {
                        const isRed = item.flag === 'Đỏ'; const isYellow = item.flag === 'Vàng';
                        const bulletColor = isRed ? '#c82014' : isYellow ? '#cba258' : '#00754A';

                        return (
                          <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#f9f9f9' : '#ffffff', borderBottom: '1px solid #edebe9' }}>
                            <td style={{ padding: '12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ color: bulletColor, fontSize: '14px' }}>●</span>
                                <div>
                                  <div style={{ fontWeight: '700', color: '#1E3932', fontSize: '1.3rem' }}>{item.item_name}</div>
                                  <span style={{ fontSize: '1.1rem', color: '#65757d', fontWeight: '600' }}>{item.item_code}</span>
                                </div>
                              </div>
                            </td>
                            <td style={{ textAlign: 'center', padding: '30px', color: '#444444', fontSize: '1.25rem' }}>{item.unit}</td>
                            <td style={{ textAlign: 'right', padding: '12px', color: 'rgba(0,0,0,0.87)', fontSize: '1.25rem', fontWeight: 500 }}>{item.planned_quantity.toLocaleString('vi-VN')}</td>
                            <td style={{ textAlign: 'right', padding: '12px', color: '#006241', fontSize: '1.25rem', fontWeight: '700' }}>{item.actual_quantity.toLocaleString('vi-VN')}</td>
                            <td style={{ padding: '12px', verticalAlign: 'middle' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ fontSize: '1.15rem', fontWeight: '700', color: '#1E3932' }}>{item.percent_complete.toFixed(0)}%</span>
                                <div style={{ width: '100%', height: '6px', background: '#edebe9', borderRadius: '3px', overflow: 'hidden' }}>
                                  <div style={{ width: `${item.percent_complete}%`, height: '100%', background: bulletColor }} />
                                </div>
                              </div>
                            </td>
                            <td style={{ textAlign: 'center', padding: '12px', fontWeight: '700', fontSize: '1.2rem', color: item.delay_days > 0 ? '#c82014' : '#00754A' }}>
                              {item.delay_days > 0 ? `Trễ ${item.delay_days} ngày` : 'Đúng hạn'}
                            </td>
                            <td style={{ fontSize: '1.2rem', color: 'rgba(0,0,0,0.6)', padding: '12px' }}>
                              {item.delay_reason || item.site_notes || '—'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>


{/* Sơ đồ Gantt - Hệ trục dóng ngày lên mốc thời gian chính chuẩn chỉnh */}
{ganttBounds && (
  <div style={panelStyle}>
    <div style={{ marginBottom: '24px' }}>
      <h2 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#006241', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 4px 0' }}>
        Biểu đồ tiến độ Gantt công trình
      </h2>
      <p style={{ fontSize: '1.2rem', color: 'rgba(0,0,0,0.58)', margin: 0 }}>
        Thanh mốc thời gian chính tổng hợp các ngày bắt đầu/kết thúc của hạng mục. Người dùng dóng thẳng mắt lên trên để xem ngày.
      </p>
    </div>

    <div style={{ position: 'relative', padding: '40px 0 12px 0', overflowX: 'auto', backgroundColor: '#ffffff' }}>
      
      {/* 📌 THANH MỐC THỜI GIAN CHÍNH - Nơi tập hợp tất cả các điểm mốc ngày của dự án */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', marginBottom: '20px', borderBottom: '2px solid #edebe9', paddingBottom: '12px' }}>
        <span style={{ fontSize: '1.15rem', fontWeight: '700', color: 'rgba(0,0,0,0.6)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
          Hạng mục công việc
        </span>
        
        <div style={{ position: 'relative', height: '24px', color: '#1E3932', fontWeight: '700', fontSize: '1.1rem' }}>
          {/* 1. Mốc đầu dự án */}
          <span style={{ position: 'absolute', left: '0', transform: 'translateX(0)' }}>
            {formatDateVN(new Date(ganttBounds.minTime).toISOString().split('T')[0])}
          </span>

          {/* 2. Các điểm mốc dóng hàng động lập lịch từ các hạng mục */}
          {(() => {
            const uniqueTimes = new Set<number>();
            // Thu thập các mốc ngày biên để đẩy lên trục chính
            data.items.forEach((item: any) => {
              const pStart = parseDate(item.planned_start_date);
              const pEnd = parseDate(item.planned_end_date);
              if (pStart) uniqueTimes.add(pStart.getTime());
              if (pEnd) uniqueTimes.add(pEnd.getTime());
            });

            return Array.from(uniqueTimes).map((time) => {
              const leftPct = ((time - ganttBounds.minTime) / ganttBounds.totalSpan) * 100;
              // Bỏ qua điểm đầu và cuối tối đa để tránh đè chữ
              if (leftPct > 5 && leftPct < 95) {
                return (
                  <div key={time} style={{ position: 'absolute', left: `${leftPct}%`, transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: '1.05rem', color: '#666666', fontWeight: '600' }}>
                      {formatDateVN(new Date(time).toISOString().split('T')[0]).slice(0, 5)}
                    </span>
                    {/* Vạch chia nhỏ trên thước đo dóng xuống */}
                    <div style={{ width: '1px', height: '4px', backgroundColor: '#cbd5e1', marginTop: '2px' }} />
                  </div>
                );
              }
              return null;
            });
          })()}

          {/* 3. Mốc cuối dự án */}
          <span style={{ position: 'absolute', right: '0', transform: 'translateX(0)' }}>
            {formatDateVN(new Date(ganttBounds.maxTime).toISOString().split('T')[0])}
          </span>
        </div>
      </div>

      {/* ĐƯỜNG DÓNG NÉT ĐỨT "HÔM NAY" XUYÊN SUỐT */}
      {(() => {
        const todayLeft = ((ganttBounds.todayTime - ganttBounds.minTime) / ganttBounds.totalSpan) * 100;
        if (todayLeft < 0 || todayLeft > 100) return null;
        const todayRatio = todayLeft / 100; 

        return (
          <div style={{ 
            position: 'absolute', 
            top: '48px', 
            bottom: '55px', 
            left: `calc(260px + (100% - 260px) * ${todayRatio})`, 
            width: '2px', 
            borderLeft: '2px dashed #c82014', 
            zIndex: 10, 
            pointerEvents: 'none' 
          }}>
            <span style={{ 
              position: 'absolute', 
              top: '-22px', 
              left: '-32px', 
              background: '#c82014', 
              color: '#ffffff', 
              padding: '2px 8px', 
              borderRadius: '4px', 
              fontSize: '1.0rem', 
              fontWeight: '750', 
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 4px rgba(200,32,20,0.15)'
            }}>
              Hôm nay
            </span>
          </div>
        );
      })()}

      {/* Danh sách đồ họa các hàng tiến độ - Giữ phẳng sạch sẽ tuyệt đối không chữ bám đuôi */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {data.items.map((item: any) => {
          const safeGetTime = (dateStr: any) => {
            const parsed = parseDate(dateStr);
            return parsed && !isNaN(parsed.getTime()) ? parsed.getTime() : null;
          };

          const minTime = ganttBounds.minTime;
          const totalSpan = ganttBounds.totalSpan;

          // Tính toán vị trí Kế hoạch
          const pStart = safeGetTime(item.planned_start_date);
          const pEnd = safeGetTime(item.planned_end_date);
          const planLeft = pStart ? ((pStart - minTime) / totalSpan) * 100 : 0;
          const planRight = pEnd ? ((pEnd - minTime) / totalSpan) * 100 : 100;
          const planWidth = Math.max(3, planRight - planLeft);

          // Tính toán vị trí Thực tế
          const aStart = safeGetTime(item.actual_start_date);
          const aEnd = safeGetTime(item.actual_end_date) || safeGetTime(todayStr) || ganttBounds.todayTime;
          const actualLeft = aStart ? ((aStart - minTime) / totalSpan) * 100 : null;
          const actualRight = aStart && aEnd ? ((aEnd - minTime) / totalSpan) * 100 : null;
          const actualWidth = actualLeft !== null && actualRight !== null ? Math.max(3, actualRight - actualLeft) : null;
          
          const isRed = item.flag === 'Đỏ'; 
          const isYellow = item.flag === 'Vàng';
          const colorActual = isRed ? '#c82014' : isYellow ? '#cba258' : '#00754A';

          return (
            <div key={item.item_code} style={{ display: 'grid', gridTemplateColumns: '260px 1fr', alignItems: 'center', gap: '16px', borderBottom: '1px solid #f8f9fa', paddingBottom: '8px' }}>
              
              {/* Khối chữ thông tin danh mục bên lề trái */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1E3932', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={item.item_name}>
                  {item.item_name}
                </span>
                <span style={{ fontSize: '1.05rem', color: '#65757d', fontWeight: '600', marginTop: '1px' }}>
                  {item.item_code} · Đạt {item.percent_complete.toFixed(0)}%
                </span>
              </div>

              {/* Khối đồ họa dải thanh bên lề phải - Sạch sẽ không chứa text chữ bám đuôi */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', width: '100%', position: 'relative' }}>
                
                {/* Tầng 1: Thanh KẾ HOẠCH (Xám nhạt) */}
                <div style={{ position: 'relative', height: '10px', width: '100%' }}>
                  {item.planned_start_date && (
                    <div 
                      style={{
                        position: 'absolute', top: 0, bottom: 0,
                        left: `${planLeft}%`, width: `${planWidth}%`,
                        backgroundColor: '#e2e8f0', borderRadius: '4px', border: '1px solid #cbd5e1'
                      }} 
                      title={`Kế hoạch HĐ: ${formatDateVN(item.planned_start_date)} → ${formatDateVN(item.planned_end_date)}`}
                    />
                  )}
                </div>

                {/* Tầng 2: Thanh THỰC TẾ (Màu hệ Flag tiến độ) */}
                <div style={{ position: 'relative', height: '10px', width: '100%' }}>
                  {actualLeft !== null && actualWidth !== null ? (
                    <div 
                      style={{
                        position: 'absolute', top: 0, bottom: 0,
                        left: `${actualLeft}%`, width: `${actualWidth}%`,
                        backgroundColor: colorActual, borderRadius: '4px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.08)'
                      }} 
                      title={`Thực tế công trường: ${formatDateVN(item.actual_start_date)} → ${item.actual_end_date ? formatDateVN(item.actual_end_date) : 'Đang thi công'}`}
                    />
                  ) : (
                    <span style={{ fontSize: '1.1rem', color: 'rgba(0,0,0,0.25)', fontStyle: 'italic', paddingLeft: `${planLeft}%` }}>
                      Chưa ghi nhận tiến độ ca
                    </span>
                  )}
                </div>

              </div>

            </div>
          );
        })}
      </div>

      {/* Khối chú giải màu sắc dưới chân bảng vẽ */}
      <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', fontSize: '1.2rem', color: 'rgba(0,0,0,0.58)', borderTop: '1px solid #edebe9', paddingTop: '16px', marginTop: '24px', fontWeight: 600 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ display: 'inline-block', width: '16px', height: '10px', background: '#e2e8f0', border: '1px solid #cbd5e1', borderRadius: '3px' }}></span> Kế hoạch hợp đồng gốc
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ display: 'inline-block', width: '16px', height: '10px', background: '#00754A', borderRadius: '3px' }}></span> Đúng tiến độ (Xanh)
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ display: 'inline-block', width: '16px', height: '10px', background: '#cba258', borderRadius: '3px' }}></span> Chậm ngắn hạn (Vàng trễ 1-3 ngày)
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ display: 'inline-block', width: '16px', height: '10px', background: '#c82014', borderRadius: '3px' }}></span> Trễ nghiêm trọng (Đỏ trễ &gt;3 ngày)
        </span>
      </div>

    </div>
  </div>
)}
          {/* ⚠️ Khối danh mục hạng mục cần họp điều phối xử lý gấp */}
{delayedMeetingItems.length > 0 && (
  <div style={{ 
    ...panelStyle, 
    borderLeft: '4px solid #c82014', // Viền đỏ Semantic cảnh báo
    backgroundColor: 'rgba(200, 32, 20, 0.01)', 
    padding: '24px'
  }}>
    <h3 style={{ 
      fontSize: '1.45rem', 
      fontWeight: '800', 
      color: '#c82014', 
      textTransform: 'uppercase', 
      letterSpacing: '0.325px', 
      marginBottom: '16px', 
      display: 'flex', 
      alignItems: 'center', 
      gap: '8px' 
    }}>
      <AlertTriangle size={16} /> Danh mục hạng mục cần họp điều phối xử lý gấp
    </h3>
    
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {delayedMeetingItems.map((item: any, idx: number) => {
        const isRed = item.flag === 'Đỏ';
        const itemAlertColor = isRed ? '#c82014' : '#cba258';
        
        return (
          <div 
            key={idx} 
            style={{ 
              padding: '16px 20px', 
              background: '#ffffff', 
              border: '1px solid #edebe9', 
              borderRadius: '8px', 
              fontSize: '1.25rem', 
              lineHeight: '1.6', 
              color: 'rgba(0,0,0,0.87)',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '4px', 
                fontSize: '1.1rem', 
                fontWeight: '700', 
                padding: '2px 8px', 
                borderRadius: '6px',
                backgroundColor: isRed ? 'rgba(200, 32, 20, 0.06)' : 'rgba(203, 162, 88, 0.08)',
                color: itemAlertColor
              }}>
                <Clock size={12} /> {isRed ? 'BÁO ĐỘNG ĐỎ' : 'NGUY CƠ VÀNG'}
              </span>
              
              <strong style={{ color: '#1E3932', fontSize: '1.3rem' }}>
                {item.item_code} – {item.item_name}
              </strong>
            </div>

            <div style={{ marginTop: '6px', color: 'rgba(0,0,0,0.6)' }}>
              Biên độ lệch: Trễ <strong style={{ color: '#c82014' }}>{item.delay_days} ngày</strong> công · Sản lượng hiện trường đạt: <strong style={{ color: '#000000' }}>{item.actual_quantity}/{item.planned_quantity} {item.unit}</strong>
            </div>

            <div style={{ 
              marginTop: '8px', 
              padding: '10px 14px', 
              backgroundColor: '#f9f9f9', 
              borderRadius: '6px', 
              fontSize: '1.2rem',
              borderLeft: `3px solid ${itemAlertColor}`
            }}>
              <span style={{ fontWeight: '700', color: 'rgba(0,0,0,0.6)' }}>Biện pháp / Nguyên nhân khắc phục:</span>{' '}
              <span style={{ color: '#222222', fontWeight: 500 }}>
                {item.delay_reason || 'Chưa thiết lập báo cáo giải trình tiến độ từ hiện trường'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  </div>
)}

{/* 🛠️ Cụm nút hành động chân trang (Bottom action rows strip) */}
<div style={{ 
  display: 'flex', 
  gap: '16px', 
  justifyContent: 'flex-start', 
  alignItems: 'center',
  borderTop: '1px solid #edebe9',
  paddingTop: '20px',
  marginTop: '8px'
}}>
  {/* Nút hành động chính - Cập nhật tiến độ (Màu Green Accent) */}
  <button
    type="button"
    onClick={() => {
      setActiveSubView('report');
      setUseRawJson(false);
    }}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      padding: '12px 28px',
      borderRadius: '50px', // Thiết kế bo tròn viên thuốc
      backgroundColor: '#00754A', // Green Accent chính
      color: '#ffffff',
      border: 'none',
      fontWeight: '700',
      fontSize: '1.3rem',
      cursor: 'pointer',
      boxShadow: '0 4px 12px rgba(0, 117, 74, 0.15)',
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
    }}
    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1E3932'} // Hover chuyển màu House Green
    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#00754A'}
    onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'} // Hiệu ứng nén nút
    onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
  >
    <ClipboardEdit size={15} /> Ghi nhật ký tiến độ hôm nay
  </button>

  {/* Nút xuất tệp phụ - Outlined Style */}
  <a
    href={api.getDownloadUrl(`master/${projectId}/progress_report.pdf`)}
    target="_blank" 
    rel="noreferrer"
    style={{ 
      display: 'inline-flex', 
      alignItems: 'center', 
      gap: '8px', 
      padding: '11px 24px', 
      borderRadius: '50px', 
      backgroundColor: '#ffffff', 
      color: '#c82014', 
      border: '1px solid #c82014', // Outlined đỏ viền mảnh
      fontWeight: '700', 
      fontSize: '1.3rem', 
      cursor: 'pointer', 
      textDecoration: 'none',
      transition: 'all 0.2s ease' 
    }}
    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(200, 32, 20, 0.04)'}
    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
    onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
    onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
  >
    <FileDown size={15} /> Bản in báo cáo PDF
  </a>
</div>
          </>
        ) : renderDailyLogTabContent()
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {!hasPlan ? (
            <div style={{ ...panelStyle, textAlign: 'center', padding: '48px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <TrendingUp size={36} color="#666666" />
              <div>
                <h3 style={{ fontSize: '1.6rem', fontWeight: '800' }}>Hệ thống chưa thiết lập kế hoạch thi công</h3>
                <p style={{ fontSize: '1.3rem', color: 'rgba(0,0,0,0.58)' }}>Khởi tạo bảng phân chia mốc thời gian (Plan Matrix) để kích hoạt hệ thống đo lường tự động.</p>
              </div>
              <button style={{ padding: '10px 24px', backgroundColor: '#00754A', color: '#ffffff', border: 'none', borderRadius: '50px', fontSize: '1.25rem', fontWeight: '700', cursor: 'pointer' }} onClick={() => { handleDemoPlan(); setShowPlanModal(true); }}>
                Khởi tạo Kế hoạch mới
              </button>
            </div>
          ) : (
            <div style={{ ...panelStyle, textAlign: 'center', padding: '48px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <Calendar size={36} color="#666666" />
              <div>
                <h3 style={{ fontSize: '1.6rem', fontWeight: '800' }}>Hồ sơ tiến độ sẵn sàng, chờ nhập dữ liệu ca</h3>
                <p style={{ fontSize: '1.3rem', color: 'rgba(0,0,0,0.58)' }}>Đẩy khối lượng nghiệm thu thực tế hàng ngày để phân tích đường gân tiến độ.</p>
              </div>
              <button style={{ padding: '10px 24px', backgroundColor: '#00754A', color: '#ffffff', border: 'none', borderRadius: '50px', fontSize: '1.25rem', fontWeight: '700', cursor: 'pointer' }} onClick={() => { handleDemoLog(); setShowLogModal(true); setUseRawJson(false); }}>
                Cập nhật nhật ký hôm nay
              </button>
            </div>
          )}
        </div>
      )}

      {/* --- MODAL DIALOG: KHỞI TẠO KẾ HOẠCH --- */}
      {showPlanModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ ...panelStyle, width: '520px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#006241', margin: 0 }}>Cấu trúc thiết lập Kế hoạch tiến độ (JSON)</h3>
            <form onSubmit={handleSavePlan} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <textarea
                rows={12} placeholder='{"project_info": {...}, "milestones": [...], "items": [...]}'
                value={planInput} onChange={(e) => setPlanInput(e.target.value)} required
                style={{ width: '100%', fontFamily: 'monospace', fontSize: '1.25rem', border: '1px solid #d6dbde', borderRadius: '8px', padding: '12px', outline: 'none' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" style={{ padding: '8px 18px', backgroundColor: '#ffffff', color: '#666666', border: '1px solid #d6dbde', borderRadius: '50px', fontSize: '1.25rem', cursor: 'pointer' }} onClick={() => setShowPlanModal(false)}>Hủy</button>
                <button type="submit" style={{ padding: '8px 22px', backgroundColor: '#00754A', color: '#ffffff', border: 'none', borderRadius: '50px', fontSize: '1.25rem', fontWeight: '700', cursor: 'pointer' }} disabled={processing}>
                  {processing ? 'Engine đang chạy...' : 'Lưu kế hoạch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lịch sử báo cáo đã phát hành */}
      {history.length > 0 && (
        <div style={panelStyle}>
          <h2 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#1E3932', marginBottom: '16px' }}>Lịch sử kết xuất báo cáo tiến độ công trình</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {history.map((hist, idx) => (
              <div
                key={idx}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #edebe9' }}
              >
                <div>
                  <div style={{ fontWeight: '700', color: '#006241', fontSize: '1.35rem' }}>{hist.label || `Báo cáo ca ${hist.fileName?.split('_')[2] || 'tiến độ'}`}</div>
                  <span style={{ fontSize: '1.15rem', color: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}><Calendar size={12} /> {hist.createdAt}</span>
                </div>
                <div style={{ display: 'flex', gap: '12px', fontSize: '16px' }}>
                  <a href={hist.excelUrl} target="_blank" rel="noreferrer" title="Tải bảng Excel Master" style={{ textDecoration: 'none' }}><FileSpreadsheet size={16} color="#00754A" /></a>
                  <a href={hist.pdfUrl} target="_blank" rel="noreferrer" title="Mở file báo cáo PDF" style={{ textDecoration: 'none' }}><FileDown size={16} color="#c82014" /></a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};