import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { buildPaymentPdfFileName } from '../services/fileSlug';

import { mockPaymentBillingInfo, mockPaymentItems, mockQuoteItems, mockInvoices, mockPaymentHistory, mockQuotes, mockAdditionalQuotes } from '../services/mockData';
import {
  FileCheck,
  Scale,
  CreditCard,
  Receipt,
  Plus,
  Trash2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  User,
  Building2,
  DollarSign,
  Wallet,
  Info
} from 'lucide-react';

interface PaymentPageProps {
  projectId: string;
  selectedProject?: any;
  mockDataEnabled?: boolean;
  setActiveTab?: (tab: string) => void;
}

// ---------- Interfaces ----------

interface AcceptanceRow {
  item_code: string;
  item_name: string;
  unit: string;
  contract_quantity: number;
  unit_price: number;
  actual_quantity: number;
  note: string;
  isExtra?: boolean;
}

interface InvoiceRow {
  so_hd: string;
  ngay: string;
  ten_ncc: string;
  loai: 'Vật tư' | 'Nhân công' | 'Máy thi công' | 'Quản lý';
  truoc_thue: number;
  thue_suat: number;
  isExtra?: boolean;
}

interface BillingMeta {
  project_name: string;
  client_name: string;
  contract_code: string;
  bank_account: string;
  bank_name: string;
  advance_deduction: number;
  additional_value: number;
  contractor_name?: string;
  contract_date?: string;
}

type TabKey = 'nghiem_thu' | 'quyet_toan' | 'de_nghi_tt' | 'bang_ke';

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'nghiem_thu', label: 'Nghiệm thu khối lượng', icon: <FileCheck size={14} /> },
  { key: 'quyet_toan', label: 'Quyết toán A-B', icon: <Scale size={14} /> },
  { key: 'de_nghi_tt', label: 'Đề nghị thanh toán', icon: <CreditCard size={14} /> },
  { key: 'bang_ke', label: 'Bảng kê hóa đơn GTGT', icon: <Receipt size={14} /> },
];

const EMPTY_ACCEPTANCE_ROW = (): AcceptanceRow => ({
  item_code: '', item_name: '', unit: '', contract_quantity: 0, unit_price: 0, actual_quantity: 0, note: '', isExtra: true,
});

const EMPTY_INVOICE_ROW = (): InvoiceRow => ({
  so_hd: '', ngay: '', ten_ncc: '', loai: 'Vật tư', truoc_thue: 0, thue_suat: 0.1, isExtra: false,
});

// ---- Cấu hình Style Hệ thống Thiết kế Starbucks ----
const panelStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  padding: '28px',
  boxShadow: '0px 0px 0.5px 0px rgba(0,0,0,0.14), 0px 1px 1px 0px rgba(0,0,0,0.24)',
};

const labelStyle: React.CSSProperties = {
  fontSize: '1.15rem',
  fontWeight: '700',
  color: 'rgba(0, 0, 0, 0.87)',
  textTransform: 'uppercase',
  letterSpacing: '0.325px',
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

const thStyle: React.CSSProperties = {
  padding: '12px 8px',
  fontSize: '1.15rem',
  fontWeight: '700',
  textTransform: 'uppercase',
  color: '#ffffff',
  backgroundColor: '#1E3932',
};

const tdStyle: React.CSSProperties = {
  padding: '10px 8px',
  fontSize: '1.25rem',
  color: 'rgba(0, 0, 0, 0.87)',
  borderBottom: '1px solid #edebe9',
  verticalAlign: 'middle',
};

const fmtVND = (n: number) => (isNaN(n) ? '0' : Math.round(n).toLocaleString('vi-VN'));

const getShortDate = (dateStr?: string) => {
  if (!dateStr) return '';
  const clean = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  return clean.trim().slice(0, 10);
};

export const PaymentPage: React.FC<PaymentPageProps> = ({ projectId, selectedProject, mockDataEnabled, setActiveTab: setParentActiveTab }) => {
  const [history, setHistory] = useState<any[]>([]);
  const [quoteItems, setQuoteItems] = useState<any[]>([]);
  const [hasQuote, setHasQuote] = useState(false);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [selectedQuoteProject, setSelectedQuoteProject] = useState<string | null>(null);
  const [dataSourceLabel, setDataSourceLabel] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('nghiem_thu');

  const [acceptanceDraft, setAcceptanceDraft] = useState<AcceptanceRow[]>([]);
  const [acceptanceSaved, setAcceptanceSaved] = useState<AcceptanceRow[]>([]);
  const [acceptanceSavedAt, setAcceptanceSavedAt] = useState<string>('');

  const [billingMeta, setBillingMeta] = useState<BillingMeta>({
    project_name: '', client_name: '', contract_code: '', bank_account: '', bank_name: '', advance_deduction: 0, additional_value: 0,
    contractor_name: '', contract_date: '',
  });

  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);

  const loadPaymentInfo = async () => {
    setLoading(true);
    setError('');
    try {
      if (mockDataEnabled) {
        setHistory(mockPaymentHistory || []);

        const allMockQuotes = ([...(mockQuotes || []), ...(mockAdditionalQuotes || [])] as any[])
          .filter(q => String(q.project_id) === String(projectId) || String(q.project_info?.project_id) === String(projectId));

        const signed = allMockQuotes.find(q => !!q.contract_signed || !!q.project_info?.contract_signed) || null;

        if (signed) {
          setQuoteItems(signed.items || signed.project_info?.items || []);
          setHasQuote(true);
          setSelectedQuoteId((signed && (signed.quote_id || signed.id || signed.project_info?.quote_id || signed.project_info?.id)) || null);
          setSelectedQuoteProject((signed && (signed.project_id || signed.project_info?.project_id || signed.project_info?.project_name)) || null);
          setDataSourceLabel('signed-mock-quote');
          setBillingMeta((prev) => ({
            ...prev,
            project_name: signed.project_info?.project_name || selectedProject?.name || prev.project_name || '',
            client_name: signed.project_info?.client_name || selectedProject?.clientName || prev.client_name || '',
            contract_code: signed.project_info?.contract_code || selectedProject?.contract_code || prev.contract_code || '',
            contractor_name: signed.project_info?.contractor_name || selectedProject?.contractorName || prev.contractor_name || '',
            contract_date: getShortDate(signed.project_info?.start_date || prev.contract_date || ''),
            advance_deduction: signed.project_info?.advance_deduction || prev.advance_deduction || 0,
            additional_value: signed.project_info?.additional_value || prev.additional_value || 0,
          }));
        } else {
          setQuoteItems([]);
          setHasQuote(false);
          setSelectedQuoteId(null);
          setSelectedQuoteProject(null);
          setDataSourceLabel('none');
          setBillingMeta((prev) => ({
            ...prev,
            project_name: selectedProject?.name || mockPaymentBillingInfo?.project_name || prev.project_name || '',
            client_name: selectedProject?.clientName || mockPaymentBillingInfo?.client_name || prev.client_name || '',
            contract_code: selectedProject?.contract_code || mockPaymentBillingInfo?.contract_code || prev.contract_code || '',
            bank_account: mockPaymentBillingInfo?.bank_account || prev.bank_account || '',
            bank_name: mockPaymentBillingInfo?.bank_name || prev.bank_name || '',
            advance_deduction: mockPaymentBillingInfo?.advance_deduction || prev.advance_deduction || 0,
            additional_value: mockPaymentBillingInfo?.additional_value || prev.additional_value || 0,
          }));
        }

        setInvoices(mockInvoices || []);
      } else {
        const res = await api.getPayments(projectId);
        if (res) {
          setHistory(res.history || []);

          if (Array.isArray(res.quoteItems) && res.quoteItems.length > 0 && res.hasQuote === true) {
            setQuoteItems(res.quoteItems);
            setHasQuote(true);
            setSelectedQuoteId((res as any).quote_id || (res as any).quoteId || null);
            setSelectedQuoteProject((res as any).projectInfo?.project_name || null);
            setDataSourceLabel('api-quote');
          } else {
            const signedEntry = Array.isArray(res.history) ? (res.history as any[]).find(h => !!h.contract_signed || !!h.project_info?.contract_signed) : null;
            if (signedEntry) {
              setQuoteItems(signedEntry.items || []);
              setHasQuote(true);
              setSelectedQuoteId((signedEntry && (signedEntry.quote_id || signedEntry.id || signedEntry.project_info?.quote_id || signedEntry.project_info?.id)) || null);
              setSelectedQuoteProject((signedEntry && (signedEntry.project_id || signedEntry.project_info?.project_name)) || null);
              setDataSourceLabel('api-history-signed');
            } else {
              setQuoteItems([]);
              setHasQuote(false);
              setSelectedQuoteId(null);
              setSelectedQuoteProject(null);
              setDataSourceLabel('none');
            }
          }

          if (res.projectInfo) {
            setBillingMeta((prev) => ({
              ...prev,
              project_name: res.projectInfo.project_name || selectedProject?.name || prev.project_name || '',
              client_name: res.projectInfo.client_name || selectedProject?.clientName || selectedProject?.client_name || prev.client_name || '',
              contract_code: res.projectInfo.contract_code || selectedProject?.contract_code || selectedProject?.contractCode || prev.contract_code || '',
              contractor_name: res.projectInfo.contractor_name || selectedProject?.contractorName || selectedProject?.contractor_name || prev.contractor_name || '',
              contract_date: getShortDate(res.projectInfo.start_date || selectedProject?.startDate || selectedProject?.start_date || prev.contract_date || ''),
              advance_deduction: res.projectInfo.advance_deduction || 0,
              additional_value: res.projectInfo.additional_value || 0,
              bank_account: res.projectInfo.bank_account || prev.bank_account || '',
              bank_name: res.projectInfo.bank_name || prev.bank_name || '',
            }));
          } else if (selectedProject) {
            setBillingMeta((prev) => ({
              ...prev,
              project_name: selectedProject.name || selectedProject.project_name || prev.project_name || '',
              client_name: selectedProject.clientName || selectedProject.client_name || prev.client_name || '',
              contract_code: selectedProject.contract_code || selectedProject.contractCode || prev.contract_code || '',
              contractor_name: selectedProject.contractorName || selectedProject.contractor_name || prev.contractor_name || '',
              contract_date: getShortDate(selectedProject.startDate || selectedProject.start_date || prev.contract_date || ''),
            }));
          }

          setInvoices(res.invoices || []);
        } else {
          setHistory([]);
          setQuoteItems([]);
          setHasQuote(false);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi khi tải thông tin hồ sơ thanh toán');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    setHistory([]);
    setQuoteItems([]);
    setHasQuote(false);
    loadPaymentInfo();
  }, [projectId, selectedProject, mockDataEnabled]);

  useEffect(() => {
    if (quoteItems && quoteItems.length > 0) {
      const seeded: AcceptanceRow[] = quoteItems.map((q: any) => ({
        item_code: q.item_code,
        item_name: q.item_name,
        unit: q.unit,
        contract_quantity: q.quoted_quantity ?? 0,
        unit_price: q.original_unit_price ?? 0,
        actual_quantity: q.quoted_quantity ?? 0,
        note: '',
        isExtra: false,
      }));
      setAcceptanceDraft(seeded);
      setAcceptanceSaved(seeded);
    } else {
      setAcceptanceDraft([]);
      setAcceptanceSaved([]);
    }
  }, [quoteItems]);

  useEffect(() => {
    if (mockDataEnabled) loadDemoData();
  }, [mockDataEnabled, quoteItems]);

  const loadDemoData = () => {
    const allMockQuotes = ([...(mockQuotes || []), ...(mockAdditionalQuotes || [])] as any[]);
    const signed = allMockQuotes.find(q => String(q.project_id) === String(projectId) && (q.contract_signed || q.project_info?.contract_signed));

    if (signed) {
      setBillingMeta((prev) => ({
        ...prev,
        project_name: signed.project_info?.project_name || prev.project_name || '',
        client_name: signed.project_info?.client_name || prev.client_name || '',
        contract_code: signed.project_info?.contract_code || prev.contract_code || '',
        contractor_name: signed.project_info?.contractor_name || prev.contractor_name || '',
        contract_date: signed.project_info?.start_date || prev.contract_date || '',
        bank_account: prev.bank_account || mockPaymentBillingInfo?.bank_account || '',
        bank_name: prev.bank_name || mockPaymentBillingInfo?.bank_name || '',
        advance_deduction: signed.project_info?.advance_deduction || mockPaymentBillingInfo?.advance_deduction || 0,
        additional_value: signed.project_info?.additional_value || mockPaymentBillingInfo?.additional_value || 0,
      }));
      setDataSourceLabel('signed-mock-quote');
    } else {
      setBillingMeta({
        project_name: mockPaymentBillingInfo?.project_name || '',
        client_name: mockPaymentBillingInfo?.client_name || '',
        contract_code: mockPaymentBillingInfo?.contract_code || '',
        bank_account: mockPaymentBillingInfo?.bank_account || '',
        bank_name: mockPaymentBillingInfo?.bank_name || '',
        advance_deduction: mockPaymentBillingInfo?.advance_deduction || 0,
        additional_value: mockPaymentBillingInfo?.additional_value || 0,
        contractor_name: 'Công ty Xây dựng Đông Dương',
        contract_date: '2026-06-01',
      });
      setDataSourceLabel('mock-billing-fallback');
    }

    setInvoices(mockInvoices);

    const itemsSource = (quoteItems && quoteItems.length > 0)
      ? quoteItems
      : (signed ? (signed.items || signed.project_info?.items || []) : (mockQuoteItems || []));

    if (itemsSource && itemsSource.length > 0) {
      const seeded: AcceptanceRow[] = itemsSource.map((q: any) => {
        const paymentItem = (mockPaymentItems || []).find((it: any) => it.item_code === q.item_code);
        return {
          item_code: q.item_code,
          item_name: q.item_name,
          unit: q.unit,
          contract_quantity: q.quoted_quantity ?? 0,
          unit_price: q.original_unit_price ?? 0,
          actual_quantity: paymentItem ? paymentItem.quantity : q.quoted_quantity ?? 0,
          note: '',
          isExtra: false,
        };
      });
      setAcceptanceDraft(seeded);
      setAcceptanceSaved(seeded);
      setAcceptanceSavedAt(new Date().toLocaleString('vi-VN'));
    } else {
      setAcceptanceDraft([]);
      setAcceptanceSaved([]);
    }
  };

  const updateAcceptanceRow = (idx: number, field: keyof AcceptanceRow, value: any) => {
    setAcceptanceDraft((prev) => {
      const next = [...prev];
      const targetRow = next[idx];

      if (field === 'actual_quantity' && !targetRow.isExtra) {
        const targetCode = targetRow.item_code;
        const targetName = targetRow.item_name;
        const newQty = parseFloat(value) || 0;
        const limit = targetRow.contract_quantity;

        if (newQty > limit) {
          const companionVarIdx = next.findIndex((row, i) =>
            i !== idx &&
            !!row.isExtra &&
            ((targetCode && row.item_code === targetCode) || (!targetCode && row.item_name === targetName))
          );

          if (companionVarIdx !== -1) {
            next[idx] = { ...targetRow, actual_quantity: limit };
            next[companionVarIdx] = { ...next[companionVarIdx], actual_quantity: newQty - limit };
            return next;
          }
        } else {
          const companionVarIdx = next.findIndex((row, i) =>
            i !== idx &&
            !!row.isExtra &&
            ((targetCode && row.item_code === targetCode) || (!targetCode && row.item_name === targetName))
          );
          if (companionVarIdx !== -1) {
            next[idx] = { ...targetRow, actual_quantity: newQty };
            next[companionVarIdx] = { ...next[companionVarIdx], actual_quantity: 0 };
            return next;
          }
        }
      }

      next[idx] = { ...targetRow, [field]: value };
      return next;
    });
  };

  const addAcceptanceRow = () => setAcceptanceDraft((prev) => [...prev, EMPTY_ACCEPTANCE_ROW()]);
  const removeAcceptanceRow = (idx: number) => setAcceptanceDraft((prev) => prev.filter((_, i) => i !== idx));

  const saveAcceptance = () => {
    setAcceptanceSaved(acceptanceDraft);
    setAcceptanceSavedAt(new Date().toLocaleString('vi-VN'));
    setSuccess('Đã lưu biên bản nghiệm thu khối lượng thành công.');
    setError('');
  };

  const acceptanceDirty = useMemo(
    () => JSON.stringify(acceptanceDraft) !== JSON.stringify(acceptanceSaved),
    [acceptanceDraft, acceptanceSaved]
  );

  const settlementRows = useMemo(() => {
    return acceptanceSaved.map((row) => {
      const contractValue = row.contract_quantity * row.unit_price;
      const actualValue = row.actual_quantity * row.unit_price;
      return { ...row, contractValue, actualValue, diffValue: actualValue - contractValue };
    });
  }, [acceptanceSaved]);

  const settlementTotals = useMemo(() => {
    const contractTotal = settlementRows.reduce((s, r) => s + r.contractValue, 0);
    const actualTotal = settlementRows.reduce((s, r) => s + r.actualValue, 0);
    const diffTotal = actualTotal - contractTotal;
    return { contractTotal, actualTotal, diffTotal };
  }, [settlementRows]);

  // === CÔNG THỨC KHỚP PDF ===
  // 1. KL hoàn thành = actualTotal
  // 2. Phát sinh    = additional_value
  // 3. Tạm ứng     = advance_deduction
  // 4. Cộng trước VAT = KL hoàn thành + Phát sinh - Tạm ứng
  // 5. VAT 10%     = Cộng trước VAT * 0.1
  // 6. TỔNG SAU VAT = Cộng trước VAT + VAT
  const paymentCalc = useMemo(() => {
    const contractValue = settlementTotals.actualTotal;
    const additional = billingMeta.additional_value || 0;
    const advanceDeduction = billingMeta.advance_deduction || 0;
    const subtotal = contractValue + additional - advanceDeduction;
    const vat = subtotal * 0.1;
    const totalPayment = subtotal + vat;
    return { contractValue, additional, advanceDeduction, subtotal, vat, totalPayment };
  }, [settlementTotals, billingMeta.additional_value, billingMeta.advance_deduction]);

  const updateInvoiceRow = (idx: number, field: keyof InvoiceRow, value: any) => {
    setInvoices((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const addInvoiceRow = () => setInvoices((prev) => [...prev, EMPTY_INVOICE_ROW()]);
  const removeInvoiceRow = (idx: number) => setInvoices((prev) => prev.filter((_, i) => i !== idx));

  const invoiceTotals = useMemo(() => {
    const truocThue = invoices.reduce((s, r) => s + (r.truoc_thue || 0), 0);
    const tienThue = invoices.reduce((s, r) => s + (r.truoc_thue || 0) * (r.thue_suat || 0), 0);
    return { truocThue, tienThue, tongTien: truocThue + tienThue };
  }, [invoices]);

  const handleGenerate = async () => {
    setError(''); setSuccess('');
    if (acceptanceDirty) {
      setError('Bạn vừa sửa khối lượng nghiệm thu nhưng chưa lưu. Vui lòng ấn "Lưu nghiệm thu" trước.');
      return;
    }
    if (!billingMeta.project_name || !billingMeta.client_name) {
      setError('Vui lòng nhập đầy đủ thông tin Tên công trình và Khách gửi bên A.');
      return;
    }

    setProcessing(true);
    try {
      const billingInfo = {
        project_name: billingMeta.project_name,
        client_name: billingMeta.client_name,
        contractor_name: billingMeta.contractor_name || '',
        contract_date: billingMeta.contract_date || '',
        contract_code: billingMeta.contract_code,
        bank_account: billingMeta.bank_account,
        bank_name: billingMeta.bank_name,
        advance_deduction: billingMeta.advance_deduction,
        additional_value: billingMeta.additional_value,
        contract_value: paymentCalc.contractValue,
        subtotal: paymentCalc.subtotal,
        vat: paymentCalc.vat,
        total_payment: paymentCalc.totalPayment,
      };

      const items = acceptanceSaved.map((row) => ({
        item_code: row.item_code,
        item_name: row.item_name,
        unit: row.unit,
        contract_quantity: row.contract_quantity,
        actual_quantity: row.actual_quantity,
        unit_price: row.unit_price,
        note: row.note,
        is_extra: !!row.isExtra,
      }));

      if (mockDataEnabled) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        setSuccess('Sinh bộ hồ sơ thanh toán mẫu thành công (Chế độ Mock Data)!');
      } else {
        await api.generatePayment(projectId, billingInfo, invoices, items);
        setSuccess('Sinh bộ hồ sơ thanh toán thành công! Đã tạo file Master Excel.');
      }
      await loadPaymentInfo();
    } catch (err: any) {
      setError(err.message || 'Lỗi khi sinh hồ sơ thanh toán');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <div style={{ color: 'rgba(0,0,0,0.58)', fontSize: '1.3rem', padding: '20px' }}>Đang nạp thông tin đề nghị thanh toán...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div>
        <h1 style={{ fontSize: '2.4rem', fontWeight: '800', color: '#006241', marginBottom: '6px', letterSpacing: '-0.16px' }}>Hồ sơ Đề nghị Thanh toán công trình</h1>
        <p style={{ fontSize: '1.3rem', color: 'rgba(0,0,0,0.58)', margin: 0 }}>Nghiệm thu khối lượng, quyết toán hợp đồng A-B, đề nghị thanh toán và bảng kê hóa đơn thuế GTGT đầu vào.</p>
      </div>

      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <div style={{ padding: '8px 12px', background: mockDataEnabled ? '#fff8e6' : '#eefaf5', border: '1px solid #e6e6e6', borderRadius: '8px', fontSize: '1rem' }}>
          <strong>Mode:</strong> {mockDataEnabled ? 'Mock Data' : 'API'}
        </div>
        <div style={{ padding: '8px 12px', background: '#f3f4f6', border: '1px solid #e6e6e6', borderRadius: '8px', fontSize: '1rem' }}>
          <strong>Signed Quote:</strong> {selectedQuoteId || '— none —'}
        </div>
        <div style={{ padding: '8px 12px', background: '#f7f7f9', border: '1px solid #e6e6e6', borderRadius: '8px', fontSize: '1rem' }}>
          <strong>Quote Project:</strong> {selectedQuoteProject || projectId || '— unknown —'}
        </div>
        <div style={{ padding: '8px 12px', background: '#f7f7f9', border: '1px solid #e6e6e6', borderRadius: '8px', fontSize: '1rem' }}>
          <strong>Source:</strong> {dataSourceLabel || 'fallback'}
        </div>
      </div>

      {error && (
        <div style={{ ...panelStyle, background: 'rgba(200, 32, 20, 0.05)', borderColor: '#c82014', borderLeft: '4px solid #c82014', color: '#c82014', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.3rem' }}>
          <AlertTriangle size={16} /> <span><strong>Lỗi hệ thống:</strong> {error}</span>
        </div>
      )}
      {success && (
        <div style={{ ...panelStyle, background: '#d4e9e2', borderColor: '#00754A', borderLeft: '4px solid #00754A', color: '#1E3932', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.3rem' }}>
          <CheckCircle2 size={16} color="#00754A" /> <span><strong>Thành công:</strong> {success}</span>
        </div>
      )}

      {!hasQuote && (
        <div style={{ ...panelStyle, background: '#faf6ee', borderColor: '#cba258', borderLeft: '4px solid #cba258', color: '#33433d', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', fontSize: '1.3rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Info size={16} color="#cba258" />
            <span>Chưa có Báo giá gốc cho dự án này. Hãy thiết lập Bảng báo giá trước để làm cơ sở đối chiếu khối lượng.</span>
          </div>
          {setParentActiveTab && (
            <button
              onClick={() => setParentActiveTab('quotes')}
              style={{
                padding: '6px 14px',
                backgroundColor: '#cba258',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                fontWeight: '700',
                cursor: 'pointer',
                fontSize: '1.2rem',
                marginLeft: '12px',
                whiteSpace: 'nowrap'
              }}
            >
              Thiết lập báo giá
            </button>
          )}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        <div style={panelStyle}>
          <div style={{
            display: 'flex',
            gap: '16px',
            marginBottom: '24px',
            borderBottom: '2px solid #edebe9',
            paddingBottom: '0px'
          }}>
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    padding: '12px 20px',
                    fontSize: '1.3rem',
                    fontWeight: '700',
                    color: isActive ? '#006241' : 'rgba(0, 0, 0, 0.58)',
                    border: 'none',
                    borderBottom: isActive ? '3px solid #006241' : '3px solid transparent',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    marginBottom: '-2px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {!hasQuote ? (
            <div style={{ ...panelStyle, maxWidth: '720px', margin: '24px auto', textAlign: 'center', padding: '40px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ backgroundColor: '#faf6ee', padding: '12px', borderRadius: '50%' }}><AlertTriangle size={36} color="#cba258" /></div>
              <h2 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#1E3932', margin: 0 }}>Chưa có Báo giá chốt để thực hiện Nghiệm thu / Thanh toán</h2>
              <p style={{ fontSize: '1.25rem', color: 'rgba(0,0,0,0.58)', margin: 0 }}>Hệ thống cần một <strong>Báo giá đã ký kết</strong> cho dự án này để tạo cấu trúc nghiệm thu, quyết toán và đề nghị thanh toán. Vui lòng chuyển sang phân hệ <strong>Báo giá</strong> để chọn / phê duyệt phiên bản báo giá.</p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                {setParentActiveTab && (
                  <button onClick={() => setParentActiveTab('quotes')} style={{ padding: '8px 18px', backgroundColor: '#cba258', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>Chuyển đến Báo giá</button>
                )}
              </div>
            </div>
          ) : (
            <>
              {activeTab === 'nghiem_thu' && (
                <AcceptanceTab
                  rows={acceptanceDraft} onUpdate={updateAcceptanceRow} onAdd={addAcceptanceRow}
                  onRemove={removeAcceptanceRow} onSave={saveAcceptance} dirty={acceptanceDirty} savedAt={acceptanceSavedAt}
                />
              )}

              {activeTab === 'quyet_toan' && (
                <SettlementTab rows={settlementRows} totals={settlementTotals} acceptanceDirty={acceptanceDirty} />
              )}

              {activeTab === 'de_nghi_tt' && (
                <PaymentRequestTab
                  meta={billingMeta} setMeta={setBillingMeta} calc={paymentCalc}
                  onSubmit={handleGenerate} processing={processing} acceptanceDirty={acceptanceDirty}
                />
              )}

              {activeTab === 'bang_ke' && (
                <InvoiceTab rows={invoices} onUpdate={updateInvoiceRow} onAdd={addInvoiceRow} onRemove={removeInvoiceRow} totals={invoiceTotals} />
              )}
            </>
          )}
        </div>

        <div style={panelStyle}>
          <h2 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#1E3932', marginBottom: '16px' }}>Lịch sử hồ sơ quyết toán đã phát hành</h2>
          {history.length === 0 ? (
            <div style={{ fontSize: '1.25rem', color: 'rgba(0,0,0,0.58)', textAlign: 'center', padding: '24px' }}>
              Chưa ghi nhận bộ hồ sơ đề nghị thanh toán nào được phát hành.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {history.map((hist, idx) => (
                <div
                  key={idx}
                  style={{ padding: '16px 20px', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #edebe9', display: 'flex', flexDirection: 'column', gap: '12px' }}
                >
                  <div>
                    <div style={{ fontWeight: '700', color: '#006241', fontSize: '1.35rem' }}>Hồ sơ đề nghị thanh toán đợt</div>
                    <span style={{ fontSize: '1.15rem', color: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}><Calendar size={12} /> {hist.createdAt}</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', borderTop: '1px solid #edebe9', paddingTop: '12px' }}>
                    <a href={hist.excelUrl} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '8px', fontSize: '1.2rem', fontWeight: '700', backgroundColor: '#ffffff', color: '#00754A', border: '1px solid #00754A', borderRadius: '50px', textDecoration: 'none' }}>
                      <FileSpreadsheet size={13} /> Excel Master
                    </a>
                    <a href={hist.pdfUrl} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '8px', fontSize: '1.2rem', fontWeight: '700', backgroundColor: '#c82014', color: '#ffffff', border: 'none', borderRadius: '50px', textDecoration: 'none' }}>
                      <FileText size={13} /> Bản PDF A4
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// =====================================================================================
// Tab 1: Nghiệm thu khối lượng
// =====================================================================================

const AcceptanceTab: React.FC<{
  rows: AcceptanceRow[];
  onUpdate: (idx: number, field: keyof AcceptanceRow, value: any) => void;
  onAdd: () => void;
  onRemove: (idx: number) => void;
  onSave: () => void;
  dirty: boolean;
  savedAt: string;
}> = ({ rows, onUpdate, onAdd, onRemove, onSave, dirty, savedAt }) => {
  const total = rows.reduce((s, r) => s + r.actual_quantity * r.unit_price, 0);

  const originalItems = rows
    .map((row, index) => ({ row, index }))
    .filter(x => !x.row.isExtra);

  const extraItems = rows
    .map((row, index) => ({ row, index }))
    .filter(x => x.row.isExtra);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #006241', paddingBottom: '12px', marginBottom: '8px' }}>
        <div>
          <h3 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#006241', margin: 0 }}>BIÊN BẢN NGHIỆM THU KHỐI LƯỢNG THỰC TẾ</h3>
        </div>
        {savedAt && <span style={{ fontSize: '1.15rem', color: 'rgba(0,0,0,0.4)', fontWeight: 500 }}>Lần lưu gần nhất: {savedAt}</span>}
      </div>

      <div style={{
        background: 'rgba(0, 117, 74, 0.04)',
        border: '1px solid rgba(0, 117, 74, 0.15)',
        borderRadius: '8px',
        padding: '14px 20px',
        color: '#1E3932',
        fontSize: '1.25rem',
        lineHeight: '1.6',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px'
      }}>
        <div style={{ fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px', color: '#006241' }}>
          💡 Hướng dẫn Nghiệm thu & Thanh toán:
        </div>
        <ul style={{ margin: 0, paddingLeft: '20px', color: 'rgba(0,0,0,0.7)' }}>
          <li><strong>Đồng bộ báo giá:</strong> Danh sách hạng mục ở đây được tự động tải từ <strong>Bản báo giá đã chốt/ký kết</strong> của dự án này.</li>
          <li><strong>Nhập khối lượng thực tế:</strong> Bạn chỉ cần điền số lượng hoàn thành thực tế vào cột <strong>KL Thực hiện</strong> và ghi chú (nếu có chênh lệch).</li>
          <li><strong>Hạng mục phát sinh:</strong> Đối với các đầu việc phát sinh ngoài hợp đồng gốc, nhấp nút <em>"Thêm dòng phát sinh công trường"</em> hoặc tích chọn ô <strong>Phát sinh</strong> để chỉnh sửa thông tin.</li>
        </ul>
      </div>

      {rows.length === 0 ? (
        <div style={{ fontSize: '1.3rem', color: 'rgba(0,0,0,0.58)', textAlign: 'center', padding: '32px' }}>Chưa có cấu trúc hạng mục nào. Thêm dòng phát sinh thi công hiện trường.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: '60px', textAlign: 'center' }}>STT</th>
                <th style={{ ...thStyle, textAlign: 'left' }}>Hạng mục công việc thi công</th>
                <th style={{ ...thStyle, width: '80px', textAlign: 'center' }}>ĐVT</th>
                <th style={{ ...thStyle, width: '110px', textAlign: 'right' }}>KL HĐ / PL</th>
                <th style={{ ...thStyle, width: '130px', textAlign: 'right' }}>Đơn giá gốc</th>
                <th style={{ ...thStyle, width: '130px', textAlign: 'right' }}>KL Thực hiện</th>
                <th style={{ ...thStyle, width: '140px', textAlign: 'right' }}>Thành tiền</th>
                <th style={{ ...thStyle, width: '100px', textAlign: 'center' }}>Phát sinh</th>
                <th style={{ ...thStyle, width: '180px', textAlign: 'left' }}>Ghi chú hiện trường</th>
                <th style={{ ...thStyle, width: '50px' }}></th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ backgroundColor: 'rgba(30, 57, 50, 0.08)' }}>
                <td colSpan={10} style={{ padding: '12px 14px', fontWeight: '800', color: '#1E3932', fontSize: '1.3rem', textAlign: 'left', borderBottom: '2px solid #006241' }}>
                  PHẦN I: HẠNG MỤC THEO HỢP ĐỒNG GỐC
                </td>
              </tr>
              {originalItems.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ ...tdStyle, textAlign: 'center', color: 'rgba(0,0,0,0.4)', padding: '24px' }}>
                    Không có hạng mục hợp đồng gốc.
                  </td>
                </tr>
              ) : (
                originalItems.map(({ row, index }, seqIdx) => {
                  const lineTotal = row.actual_quantity * row.unit_price;
                  const overContract = row.actual_quantity !== row.contract_quantity;

                  const hasCompanion = rows.some((r, i) =>
                    i !== index &&
                    !!r.isExtra &&
                    ((row.item_code && r.item_code === row.item_code) || (!row.item_code && r.item_name === row.item_name))
                  );

                  return (
                    <tr key={index} style={{ backgroundColor: seqIdx % 2 === 0 ? '#f9f9f9' : '#ffffff', borderBottom: '1px solid #edebe9' }}>
                      <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 'bold' }}>{seqIdx + 1}</td>
                      <td style={tdStyle}>
                        <strong>{row.item_name}</strong>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>{row.unit}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 500 }}>
                        {row.contract_quantity.toLocaleString('vi-VN')}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 500 }}>
                        {fmtVND(row.unit_price)}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                          <input
                            type="number"
                            style={{
                              ...inputStyle,
                              padding: '6px',
                              textAlign: 'right',
                              borderColor: overContract ? '#cba258' : '#d6dbde',
                              backgroundColor: overContract ? '#faf6ee' : '#ffffff',
                              width: '100px'
                            }}
                            value={row.actual_quantity}
                            onChange={(e) => onUpdate(index, 'actual_quantity', parseFloat(e.target.value) || 0)}
                          />
                          {hasCompanion && (
                            <span style={{ fontSize: '0.95rem', color: '#00754A', marginTop: '2px', fontWeight: 600, fontStyle: 'italic' }}>
                              💡 Tự tràn phát sinh
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '700', color: '#006241' }}>{fmtVND(lineTotal)}</td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <span style={{ color: 'rgba(0,0,0,0.3)', fontSize: '1.15rem' }}>—</span>
                      </td>
                      <td style={tdStyle}>
                        <input style={{ ...inputStyle, padding: '6px', width: '100%' }} value={row.note} placeholder={overContract ? 'Nêu nguyên nhân lệch...' : 'Ghi chú...'} onChange={(e) => onUpdate(index, 'note', e.target.value)} />
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <button type="button" onClick={() => onRemove(index)} style={{ background: 'rgba(239, 68, 68, 0.05)', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={13} /></button>
                      </td>
                    </tr>
                  );
                })
              )}

              <tr style={{ backgroundColor: 'rgba(203, 162, 88, 0.12)' }}>
                <td colSpan={10} style={{ padding: '12px 14px', fontWeight: '800', color: '#8c6212', fontSize: '1.3rem', textAlign: 'left', borderBottom: '2px solid #cba258' }}>
                  PHẦN II: HẠNG MỤC PHÁT SINH / BỔ SUNG (PHỤ LỤC)
                </td>
              </tr>
              {extraItems.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ ...tdStyle, textAlign: 'center', color: 'rgba(0,0,0,0.4)', padding: '24px' }}>
                    Chưa ghi nhận hạng mục phát sinh. Thêm dòng phát sinh công trường bên dưới.
                  </td>
                </tr>
              ) : (
                extraItems.map(({ row, index }, seqIdx) => {
                  const lineTotal = row.actual_quantity * row.unit_price;
                  return (
                    <tr key={index} style={{ backgroundColor: seqIdx % 2 === 0 ? '#fdfbf7' : '#ffffff', borderBottom: '1px solid #edebe9' }}>
                      <td style={{ ...tdStyle, textAlign: 'center', color: '#8c6212', fontWeight: 'bold' }}>PL.{seqIdx + 1}</td>
                      <td style={tdStyle}>
                        <input style={{ ...inputStyle, padding: '6px', width: '100%' }} value={row.item_name} placeholder="Tên hạng mục phát sinh mới..." onChange={(e) => onUpdate(index, 'item_name', e.target.value)} />
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <input style={{ ...inputStyle, padding: '6px', textAlign: 'center', width: '60px' }} value={row.unit} onChange={(e) => onUpdate(index, 'unit', e.target.value)} />
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 500 }}>
                        <input type="number" style={{ ...inputStyle, padding: '6px', textAlign: 'right', width: '80px' }} value={row.contract_quantity} onChange={(e) => onUpdate(index, 'contract_quantity', parseFloat(e.target.value) || 0)} />
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 500 }}>
                        <input type="number" style={{ ...inputStyle, padding: '6px', textAlign: 'right', width: '100px' }} value={row.unit_price} onChange={(e) => onUpdate(index, 'unit_price', parseFloat(e.target.value) || 0)} />
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <input type="number" style={{ ...inputStyle, padding: '6px', textAlign: 'right', width: '100px', borderColor: '#cba258', backgroundColor: '#fdfbf7' }} value={row.actual_quantity} onChange={(e) => onUpdate(index, 'actual_quantity', parseFloat(e.target.value) || 0)} />
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '700', color: '#cba258' }}>{fmtVND(lineTotal)}</td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={!!row.isExtra}
                          onChange={(e) => onUpdate(index, 'isExtra', e.target.checked)}
                          style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#cba258' }}
                        />
                      </td>
                      <td style={tdStyle}>
                        <input style={{ ...inputStyle, padding: '6px', width: '100%' }} value={row.note} placeholder="Ghi chú phát sinh..." onChange={(e) => onUpdate(index, 'note', e.target.value)} />
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <button type="button" onClick={() => onRemove(index)} style={{ background: 'rgba(239, 68, 68, 0.05)', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={13} /></button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot>
              <tr style={{ backgroundColor: 'rgba(0, 117, 74, 0.02)' }}>
                <td colSpan={5} style={{ ...tdStyle, textAlign: 'right', fontWeight: '700', textTransform: 'uppercase', padding: '14px' }}>TỔNG GIÁ TRỊ NGHIỆM THU THỰC TẾ (CHƯA VAT)</td>
                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '800', color: '#006241', fontSize: '1.45rem' }}>{fmtVND(total)}</td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
        <button
          type="button"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '8px 16px', borderRadius: '50px', backgroundColor: '#ffffff', color: '#00754A', border: '1px solid #00754A', fontWeight: '700', fontSize: '1.2rem', cursor: 'pointer' }}
          onClick={onAdd}
        >
          <Plus size={14} /> Thêm dòng phát sinh công trường
        </button>
        {dirty && (
          <button
            type="button"
            onClick={onSave}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '8px 16px', borderRadius: '50px', backgroundColor: '#00754A', color: '#ffffff', border: 'none', fontWeight: '700', fontSize: '1.2rem', cursor: 'pointer' }}
          >
            <CheckCircle2 size={14} /> Lưu nghiệm thu
          </button>
        )}
      </div>
    </div>
  );
};

// =====================================================================================
// Tab 2: Quyết toán A-B
// =====================================================================================

const SettlementTab: React.FC<{
  rows: any[];
  totals: { contractTotal: number; actualTotal: number; diffTotal: number };
  acceptanceDirty: boolean;
}> = ({ rows, totals, acceptanceDirty }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ borderBottom: '2px solid #006241', paddingBottom: '12px' }}>
        <h3 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#006241', margin: 0 }}>BẢNG QUYẾT TOÁN HỢP ĐỒNG A-B</h3>
      </div>

      {acceptanceDirty && (
        <div style={{ fontSize: '1.2rem', color: '#cba258', background: '#faf6ee', padding: '10px 16px', borderRadius: '8px', fontWeight: 600 }}>
          ⚠️ Số liệu khớp với bản lưu gần nhất. Để cập nhật, vui lòng Lưu nghiệm thu ở tab trước.
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: '60px', textAlign: 'center' }}>STT</th>
              <th style={{ ...thStyle, textAlign: 'left' }}>Hạng mục công việc</th>
              <th style={{ ...thStyle, width: '90px', textAlign: 'right' }}>KL HĐ</th>
              <th style={{ ...thStyle, width: '140px', textAlign: 'right' }}>GT Hợp đồng</th>
              <th style={{ ...thStyle, width: '110px', textAlign: 'right' }}>KL Thực tế</th>
              <th style={{ ...thStyle, width: '140px', textAlign: 'right' }}>GT Thực tế</th>
              <th style={{ ...thStyle, width: '140px', textAlign: 'right' }}>Chênh lệch (VND)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#f9f9f9' : '#ffffff', borderBottom: '1px solid #edebe9' }}>
                <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 'bold' }}>{idx + 1}</td>
                <td style={tdStyle}>{r.item_name}{r.isExtra ? <span style={{ marginLeft: 8, fontSize: '1rem', color: '#8c6212', fontWeight: 700 }}>(Phát sinh)</span> : null}</td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>{r.contract_quantity.toLocaleString('vi-VN')}</td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>{fmtVND(r.contractValue)}</td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>{r.actual_quantity.toLocaleString('vi-VN')}</td>
                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: '#006241' }}>{fmtVND(r.actualValue)}</td>
                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: r.diffValue === 0 ? 'rgba(0,0,0,0.4)' : (r.diffValue > 0 ? '#00754A' : '#c82014') }}>{fmtVND(r.diffValue)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ backgroundColor: 'rgba(0, 117, 74, 0.05)' }}>
              <td colSpan={3} style={{ ...tdStyle, textAlign: 'right', fontWeight: 800, padding: '14px' }}>TỔNG CỘNG</td>
              <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800 }}>{fmtVND(totals.contractTotal)}</td>
              <td style={tdStyle}></td>
              <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800, color: '#006241', fontSize: '1.4rem' }}>{fmtVND(totals.actualTotal)}</td>
              <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800, color: totals.diffTotal === 0 ? 'rgba(0,0,0,0.4)' : (totals.diffTotal > 0 ? '#00754A' : '#c82014'), fontSize: '1.4rem' }}>{fmtVND(totals.diffTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

// =====================================================================================
// Tab 3: Đề nghị thanh toán – Format đúng PDF Ho_So_Thanh_Toan_*.pdf
// =====================================================================================

const PaymentRequestTab: React.FC<{
  meta: BillingMeta;
  setMeta: React.Dispatch<React.SetStateAction<BillingMeta>>;
  calc: { contractValue: number; additional: number; advanceDeduction: number; subtotal: number; vat: number; totalPayment: number };
  onSubmit: () => void;
  processing: boolean;
  acceptanceDirty: boolean;
}> = ({ meta, setMeta, calc, onSubmit, processing, acceptanceDirty }) => {
  const setText = (field: keyof BillingMeta) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setMeta((prev) => ({ ...prev, [field]: e.target.value }));

  const setNum = (field: keyof BillingMeta) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setMeta((prev) => ({ ...prev, [field]: parseFloat(e.target.value) || 0 }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #006241', paddingBottom: '12px' }}>
        <h3 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#006241', margin: 0 }}>
          VĂN BẢN ĐỀ NGHỊ THANH TOÁN GIAI ĐOẠN
        </h3>
        <span style={{ fontSize: '1rem', color: 'rgba(0,0,0,0.5)' }}>
          Số: — /ĐNTT &nbsp;·&nbsp; Ngày: {new Date().toLocaleDateString('vi-VN')}
        </span>
      </div>

      {/* Form nhập liệu */}
      <div style={{ background: '#fafaf8', padding: '20px', borderRadius: '8px', border: '1px solid #edebe9' }}>
        <div style={{ fontWeight: 800, color: '#1E3932', fontSize: '1.15rem', marginBottom: '14px' }}>
          📝 Thông tin văn bản (chỉnh sửa trực tiếp)
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
          <div>
            <label style={{ ...labelStyle, fontSize: '0.95rem' }}>Tên công trình *</label>
            <input style={{ ...inputStyle, width: '100%' }} value={meta.project_name} onChange={setText('project_name')} />
          </div>
          <div>
            <label style={{ ...labelStyle, fontSize: '0.95rem' }}>Mã hiệu / Số HĐ</label>
            <input style={{ ...inputStyle, width: '100%' }} value={meta.contract_code} onChange={setText('contract_code')} />
          </div>
          <div>
            <label style={{ ...labelStyle, fontSize: '0.95rem' }}>Chủ đầu tư (Kính gửi - Bên A) *</label>
            <input style={{ ...inputStyle, width: '100%' }} value={meta.client_name} onChange={setText('client_name')} />
          </div>
          <div>
            <label style={{ ...labelStyle, fontSize: '0.95rem' }}>Nhà thầu (Bên đề nghị - Bên B)</label>
            <input style={{ ...inputStyle, width: '100%' }} value={meta.contractor_name || ''} onChange={setText('contractor_name')} />
          </div>
          <div>
            <label style={{ ...labelStyle, fontSize: '0.95rem' }}>Ngày ký HĐ</label>
            <input type="date" style={{ ...inputStyle, width: '100%' }} value={meta.contract_date || ''} onChange={setText('contract_date')} />
          </div>
          <div>
            <label style={{ ...labelStyle, fontSize: '0.95rem' }}>Phát sinh bổ sung (VNĐ)</label>
            <input type="number" style={{ ...inputStyle, width: '100%' }} value={meta.additional_value} onChange={setNum('additional_value')} />
          </div>
          <div>
            <label style={{ ...labelStyle, fontSize: '0.95rem' }}>Tên ngân hàng</label>
            <input style={{ ...inputStyle, width: '100%' }} value={meta.bank_name} onChange={setText('bank_name')} />
          </div>
          <div>
            <label style={{ ...labelStyle, fontSize: '0.95rem' }}>Số tài khoản thụ hưởng</label>
            <input style={{ ...inputStyle, width: '100%' }} value={meta.bank_account} onChange={setText('bank_account')} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ ...labelStyle, fontSize: '0.95rem' }}>Khấu trừ tiền tạm ứng (VNĐ)</label>
            <input
              type="number"
              style={{ ...inputStyle, width: '100%', borderColor: '#c82014', backgroundColor: '#fef2f2' }}
              value={meta.advance_deduction}
              onChange={setNum('advance_deduction')}
            />
          </div>
        </div>
      </div>

      {/* Bản in preview khớp PDF */}
      <div style={{ background: '#ffffff', padding: '40px 48px', borderRadius: '8px', border: '1px solid #edebe9' }}>

        {/* Tiêu đề căn giữa */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1E3932', letterSpacing: '0.5px' }}>
            ĐỀ NGHỊ THANH TOÁN
          </div>
        </div>

        {/* Header 4 dòng */}
        <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', rowGap: '10px', marginBottom: '24px', fontSize: '1.2rem' }}>
          <div style={{ fontWeight: 700 }}>Kính gửi:</div>
          <div>{meta.client_name || '—'}</div>

          <div style={{ fontWeight: 700 }}>Dự án:</div>
          <div>{meta.project_name || '—'}</div>

          <div style={{ fontWeight: 700 }}>Bên đề nghị:</div>
          <div>{meta.contractor_name || '—'}</div>

          <div style={{ fontWeight: 700 }}>Căn cứ Hợp đồng số:</div>
          <div>
            {meta.contract_code || '—'}
            {meta.contract_date ? ` ký ngày ${meta.contract_date}` : ' ký ngày —'}
          </div>
        </div>

                   {/* Bảng 6 dòng khớp PDF */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, width: '60px', textAlign: 'center' }}>STT</th>
                  <th style={{ ...thStyle, textAlign: 'left' }}>Nội dung thanh toán</th>
                  <th style={{ ...thStyle, width: '220px', textAlign: 'right' }}>Giá trị (VNĐ)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>1</td>
                  <td style={tdStyle}>Giá trị KL hoàn thành thực tế (trước thuế)</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{fmtVND(calc.contractValue)}</td>
                </tr>
                <tr>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>2</td>
                  <td style={tdStyle}>Giá trị KL công việc phát sinh</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{fmtVND(calc.additional)}</td>
                </tr>
                <tr>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>3</td>
                  <td style={tdStyle}>Giảm trừ tiền tạm ứng đã nhận</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: '#c82014' }}>−{fmtVND(calc.advanceDeduction)}</td>
                </tr>
                <tr>
                  <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700 }}>4</td>
                  <td style={{ ...tdStyle, fontWeight: 700 }}>Cộng giá trị đề nghị thanh toán (trước VAT)</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800, color: '#006241' }}>{fmtVND(calc.subtotal)}</td>
                </tr>
                <tr>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>5</td>
                  <td style={tdStyle}>Thuế GTGT (10%)</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{fmtVND(calc.vat)}</td>
                </tr>
                {/* Dòng 6: TỔNG CỘNG – đồng nhất màu với các dòng nội dung thanh toán */}
                <tr style={{ backgroundColor: 'rgba(0, 117, 74, 0.04)' }}>
                  <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 800 }}>6</td>
                  <td style={{ ...tdStyle, fontWeight: 800, fontSize: '1.2rem', color: 'rgba(0,0,0,0.87)' }}>
                    TỔNG CỘNG TIỀN ĐỀ NGHỊ THANH TOÁN (SAU VAT)
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800, color: '#006241', fontSize: '1.4rem' }}>
                    {fmtVND(calc.totalPayment)}
                  </td>
                </tr>
              </tbody>
            </table>


        {/* Hình thức thanh toán */}
        <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', rowGap: '8px', marginBottom: '32px', fontSize: '1.2rem' }}>
          <div style={{ fontWeight: 700 }}>Hình thức thanh toán:</div>
          <div>Chuyển khoản</div>
          <div style={{ fontWeight: 700 }}>Tài khoản thụ hưởng:</div>
          <div>
            {meta.bank_account || '—'}
            {meta.bank_name ? ` tại ${meta.bank_name}` : ' tại —'}
          </div>
        </div>

        {/* Khối ký tên 3 cột */}
        <div style={{ display: 'flex', gap: '24px', marginTop: '40px' }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontWeight: 800, textTransform: 'uppercase' }}>Người lập</div>
            <div style={{ fontSize: '0.95rem', color: 'rgba(0,0,0,0.6)', fontStyle: 'italic' }}>(Ký tên)</div>
            <div style={{ height: '90px', marginTop: '8px' }} />
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontWeight: 800, textTransform: 'uppercase' }}>Kế toán trưởng</div>
            <div style={{ fontSize: '0.95rem', color: 'rgba(0,0,0,0.6)', fontStyle: 'italic' }}>(Ký tên)</div>
            <div style={{ height: '90px', marginTop: '8px' }} />
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontWeight: 800, textTransform: 'uppercase' }}>Đại diện Bên B</div>
            <div style={{ fontSize: '0.95rem', color: 'rgba(0,0,0,0.6)', fontStyle: 'italic' }}>(Ký tên, đóng dấu)</div>
            <div style={{ height: '90px', marginTop: '8px' }} />
          </div>
        </div>
      </div>

            {acceptanceDirty && (
        <div style={{ fontSize: '1.2rem', color: '#c82014', background: 'rgba(200, 32, 20, 0.05)', padding: '10px 16px', borderRadius: '8px', fontWeight: 600 }}>
          ⚠️ Tab Nghiệm thu đang có thay đổi chưa lưu — Vui lòng nhấn nút lưu nghiệm thu trước khi chạy engine xuất file.
        </div>
      )}

      {/* Hàng chứa cảnh báo + nút Xuất PDF ở góc phải */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
        <button
          data-testid="generate-payment"
          type="button"
          disabled={processing}
          onClick={onSubmit}
          title={`Tên file: ${buildPaymentPdfFileName(meta.project_name)}`}
          style={{
            padding: '8px 18px',
            backgroundColor: '#00754A',
            color: '#ffffff',
            border: 'none',
            borderRadius: '50px',
            fontSize: '1.15rem',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s',
            boxShadow: '0 2px 8px rgba(0,117,74,0.18)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1E3932')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#00754A')}
        >
          <FileText size={14} /> {processing ? 'Đang xuất...' : 'Xuất PDF'}
        </button>
      </div>
    </div>
  );
};


// =====================================================================================
// Tab 4: Bảng kê hóa đơn GTGT
// =====================================================================================

const LOAI_CHI_PHI: InvoiceRow['loai'][] = ['Vật tư', 'Nhân công', 'Máy thi công', 'Quản lý'];

const InvoiceTab: React.FC<{
  rows: InvoiceRow[];
  onUpdate: (idx: number, field: keyof InvoiceRow, value: any) => void;
  onAdd: () => void;
  onRemove: (idx: number) => void;
  totals: { truocThue: number; tienThue: number; tongTien: number };
}> = ({ rows, onUpdate, onAdd, onRemove, totals }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ borderBottom: '2px solid #006241', paddingBottom: '12px', marginBottom: '8px' }}>
        <h3 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#006241', margin: 0 }}>BẢNG KÊ DANH MỤC HÓA ĐƠN GTGT ĐẦU VÀO ĐỐI ỨNG</h3>
      </div>

      {rows.length === 0 ? (
        <div style={{ fontSize: '1.3rem', color: 'rgba(0,0,0,0.58)', textAlign: 'center', padding: '32px' }}>Chưa ghi nhận hóa đơn đầu vào nào. Nhấp "Thêm hóa đơn đầu vào" để lập bảng đối soát kế toán.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: '110px' }}>Số Hóa Đơn</th>
                <th style={{ ...thStyle, width: '130px' }}>Ngày phát hành</th>
                <th style={thStyle}>Tên nhà cung cấp vật tư/nhân công</th>
                <th style={{ ...thStyle, width: '130px' }}>Phân loại chi phí</th>
                <th style={{ ...thStyle, width: '120px', textAlign: 'right' }}>Giá trị trước thuế</th>
                <th style={{ ...thStyle, width: '90px', textAlign: 'right' }}>Thuế suất</th>
                <th style={{ ...thStyle, width: '90px', textAlign: 'center' }}>Phát sinh</th>
                <th style={{ ...thStyle, width: '110px', textAlign: 'right' }}>Tiền thuế VAT</th>
                <th style={{ ...thStyle, width: '130px', textAlign: 'right' }}>Tổng thanh toán</th>
                <th style={{ ...thStyle, width: '50px' }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const tienThue = (row.truoc_thue || 0) * (row.thue_suat || 0);
                const tongTien = (row.truoc_thue || 0) + tienThue;
                return (
                  <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#f9f9f9' : '#ffffff', borderBottom: '1px solid #edebe9' }}>
                    <td style={tdStyle}>
                      <input style={{ ...inputStyle, padding: '6px' }} value={row.so_hd} onChange={(e) => onUpdate(idx, 'so_hd', e.target.value)} placeholder="001293..." />
                    </td>
                    <td style={tdStyle}>
                      <input type="date" style={{ ...inputStyle, padding: '5px' }} value={row.ngay} onChange={(e) => onUpdate(idx, 'ngay', e.target.value)} />
                    </td>
                    <td style={tdStyle}>
                      <input style={{ ...inputStyle, padding: '6px' }} value={row.ten_ncc} onChange={(e) => onUpdate(idx, 'ten_ncc', e.target.value)} placeholder="Công ty bê tông, tổ đội nhân công..." />
                    </td>
                    <td style={tdStyle}>
                      <select style={{ ...inputStyle, padding: '6px', cursor: 'pointer' }} value={row.loai} onChange={(e) => onUpdate(idx, 'loai', e.target.value)}>
                        {LOAI_CHI_PHI.map((l) => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </td>
                    <td style={tdStyle}>
                      <input type="number" style={{ ...inputStyle, padding: '6px', textAlign: 'right' }} value={row.truoc_thue} onChange={(e) => onUpdate(idx, 'truoc_thue', parseFloat(e.target.value) || 0)} />
                    </td>
                    <td style={tdStyle}>
                      <input type="number" step="0.01" style={{ ...inputStyle, padding: '6px', textAlign: 'right' }} value={row.thue_suat} onChange={(e) => onUpdate(idx, 'thue_suat', parseFloat(e.target.value) || 0)} />
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={!!row.isExtra}
                        onChange={(e) => onUpdate(idx, 'isExtra', e.target.checked)}
                        style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#00754A' }}
                      />
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 500 }}>{fmtVND(tienThue)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '700', color: '#006241' }}>{fmtVND(tongTien)}</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <button type="button" onClick={() => onRemove(idx)} style={{ background: 'rgba(239, 68, 68, 0.05)', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={13} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ backgroundColor: 'rgba(0, 117, 74, 0.02)', fontWeight: '750' }}>
                <td colSpan={4} style={{ ...tdStyle, textAlign: 'right', padding: '14px' }}>TỔNG CỘNG BẢNG KÊ ĐỐI SOÁT HÓA ĐƠN</td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>{fmtVND(totals.truocThue)}</td>
                <td style={tdStyle} />
                <td style={tdStyle} />
                <td style={{ ...tdStyle, textAlign: 'right' }}>{fmtVND(totals.tienThue)}</td>
                <td style={{ ...tdStyle, textAlign: 'right', color: '#006241', fontSize: '1.4rem' }}>{fmtVND(totals.tongTien)}</td>
                <td style={tdStyle} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <button
        type="button" onClick={onAdd}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '8px 16px', borderRadius: '50px', backgroundColor: '#ffffff', color: '#00754A', border: '1px solid #00754A', fontWeight: '700', fontSize: '1.2rem', cursor: 'pointer', alignSelf: 'flex-start', marginTop: '12px' }}
      >
        <Plus size={14} /> Thêm hóa đơn đầu vào mới
      </button>
    </div>
  );
};
