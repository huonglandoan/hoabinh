import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { api } from '../services/api';
import { mockQuotes, mockAdditionalQuotes } from '../services/mockData';
import {
    FileSpreadsheet,
    FileText,
    Info,
    Plus,
    Trash2,
    Calendar,
    MapPin,
    User,
    Building2,
    Check,
    AlertTriangle,
    PlusCircle,
    Sparkles,
    Layers,
    ClipboardList,
    Briefcase
} from 'lucide-react';

// ---- Styles matching PaymentPage.tsx ----

const thStyle: React.CSSProperties = {
    padding: '12px 8px',
    fontSize: '1.15rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#ffffff',
    backgroundColor: '#1E3932', // Nền bảng màu House Green (PaymentPage style)
};

const tdStyle: React.CSSProperties = {
    padding: '10px 8px',
    fontSize: '1.25rem',
    color: 'rgba(0, 0, 0, 0.87)',
    borderBottom: '1px solid #edebe9',
    verticalAlign: 'middle',
};

interface QuotesPageProps {
    selectedProject?: any;
    projectId?: string;
    mockDataEnabled?: boolean;
    setActiveTab?: (tab: string) => void;
}

// ---- Custom Form Input Field with Lucide Icon ----
const InputField: React.FC<{
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    type?: string;
    icon: React.ReactNode;
    required?: boolean;
}> = ({ label, value, onChange, placeholder, type = 'text', icon, required }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ fontSize: '1.2rem', fontWeight: '700', color: 'rgba(0, 0, 0, 0.70)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
        </label>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span style={{ position: 'absolute', left: '14px', color: 'rgba(0, 0, 0, 0.4)', display: 'flex', alignItems: 'center' }}>
                {icon}
            </span>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                required={required}
                style={{
                    width: '100%',
                    padding: '12px 14px 12px 40px',
                    borderRadius: '8px',
                    border: '1px solid #d6dbde',
                    fontSize: '1.35rem',
                    outline: 'none',
                    backgroundColor: '#ffffff',
                    transition: 'all 0.2s ease-in-out',
                }}
                onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#00754a';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0, 117, 74, 0.15)';
                }}
                onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#d6dbde';
                    e.currentTarget.style.boxShadow = 'none';
                }}
            />
        </div>
    </div>
);

const formatGeneratedAt = (ts?: string) => {
    if (!ts) return '';
    return ts.replace('T', ' ').slice(0, 19);
};

export const QuotesPage: React.FC<QuotesPageProps> = ({ selectedProject, mockDataEnabled }) => {
    const [subTab, setSubTab] = useState<'tao_bao_gia' | 'xem_chi_tiet'>('tao_bao_gia');
    const [loading, setLoading] = useState(true);
    const [historyItemsLoading, setHistoryItemsLoading] = useState(false);
    const [error, setError] = useState('');
    const [quotes, setQuotes] = useState<any[]>([]);
    const [selectedQuote, setSelectedQuote] = useState<any | null>(null);

    // Form fields
    const [name, setName] = useState('');
    const [location, setLocation] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [clientName, setClientName] = useState('');
    const [contractorName, setContractorName] = useState('');

    // State for temporary materials
    const [tempItems, setTempItems] = useState<any[]>([]);
    const [vatPercent, setVatPercent] = useState(''); // User-defined VAT % (empty by default)
    const [isVariationQuote, setIsVariationQuote] = useState(false);

    const projectId = selectedProject?.id;

    // Helper to format date string to YYYY-MM-DD for date inputs
    const getShortDate = (dateStr?: string) => {
        if (!dateStr) return '';
        const clean = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
        const trimmed = clean.trim();
        if (trimmed.includes('/')) {
            const parts = trimmed.split('/');
            if (parts.length === 3 && parts[2].length === 4) {
                return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
        }
        return trimmed.slice(0, 10);
    };

    // Helper to format date string to DD/MM/YYYY for Vietnamese text display
    const formatDateVN = (dateStr?: string) => {
        if (!dateStr) return 'Chưa cập nhật';
        const clean = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
        const trimmed = clean.trim();
        if (trimmed.includes('/')) {
            return trimmed;
        }
        const parts = trimmed.split('-');
        if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return dateStr;
    };

    // Sync form with selected project
    useEffect(() => {
        if (selectedProject) {
            setName(selectedProject.name || '');
            setLocation(selectedProject.location || '');
            setStartDate(getShortDate(selectedProject.start_date || selectedProject.startDate));
            setEndDate(getShortDate(selectedProject.expected_completion_date || selectedProject.endDate));
            setClientName(selectedProject.clientName || selectedProject.client_name || '');
            setContractorName(selectedProject.contractorName || selectedProject.contractor_name || '');
            setIsVariationQuote(false);
        } else {
            setName(''); setLocation(''); setStartDate(''); setEndDate(''); setClientName(''); setContractorName('');
            setIsVariationQuote(false);
        }
        setTempItems([]);
    }, [selectedProject]);

    // Load existing quotes
    const loadQuotes = useCallback(async () => {
        if (!projectId) return;
        setLoading(true); setError('');
        try {
            if (mockDataEnabled) {
                const main = (mockQuotes || []).filter(q => String(q.project_id) === String(projectId));
                const add = (mockAdditionalQuotes || []).filter(q => String(q.project_id) === String(projectId));
                const combined = [...main, ...add].sort((a: any, b: any) => {
                    const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
                    const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
                    return tb - ta;
                });

                const isSavedAsSigned = localStorage.getItem(`mock_contract_signed_${projectId}`) === 'true';
                const savedSignedVersion = localStorage.getItem(`mock_signed_version_${projectId}`);

                const mapped = combined.map((q: any) => {
                    const isQuoteSigned = q.contract_signed || q.project_info?.contract_signed || (isSavedAsSigned && (q.version === savedSignedVersion || q.quote_id === savedSignedVersion));
                    return {
                        ...q,
                        quote_id: q.quote_id || q.add_quote_id,
                        contract_signed: isQuoteSigned,
                        project_info: q.project_info ? {
                            ...q.project_info,
                            contract_signed: isQuoteSigned,
                            signed_version: isQuoteSigned ? (q.project_info.signed_version || q.version || 'v1') : undefined
                        } : {
                            project_name: selectedProject?.name || q.project_name || '',
                            location: selectedProject?.location || q.location || '',
                            client_name: selectedProject?.clientName || selectedProject?.client_name || q.client_name || '',
                            contractor_name: selectedProject?.contractorName || selectedProject?.contractor_name || q.contractor_name || '',
                            start_date: selectedProject?.startDate || selectedProject?.start_date || q.start_date || '',
                            expected_completion_date: selectedProject?.endDate || selectedProject?.expected_completion_date || q.expected_completion_date || '',
                            contract_signed: isQuoteSigned,
                            signed_version: isQuoteSigned ? (q.version || 'v1') : undefined
                        }
                    };
                });

                setQuotes(mapped);
                setSelectedQuote(mapped.length > 0 ? mapped[0] : null);
            } else {
                // Call real backend API
                const res = await api.getQuotes(projectId);
                const list: any[] = [];
                if (res.currentQuote) {
                    list.push({
                        ...res.currentQuote,
                        quote_id: res.currentQuote.quote_id || `Q-${projectId}-current`,
                        isCurrent: true,
                    });
                }
                if (res.history && res.history.length > 0) {
                    res.history.forEach((h: any) => {
                        list.push({
                            quote_id: h.fileName || `Q-${projectId}-${h.version}`,
                            version: `Bản ${h.version}${h.isVariation ? ' (Phát sinh)' : ''}`,
                            created_at: h.createdAt,
                            isHistoryFile: true,
                            fileName: h.fileName,
                            excelUrl: h.excelUrl,
                            pdfUrl: h.pdfUrl,
                            jsonUrl: h.jsonUrl,
                            project_name: res.currentQuote?.project_name || selectedProject?.name,
                            project_info: res.currentQuote?.project_info || {
                                project_name: selectedProject?.name,
                                location: selectedProject?.location,
                                client_name: selectedProject?.clientName || selectedProject?.client_name,
                                contractor_name: selectedProject?.contractorName || selectedProject?.contractor_name,
                                start_date: selectedProject?.startDate || selectedProject?.start_date,
                                expected_completion_date: selectedProject?.endDate || selectedProject?.expected_completion_date,
                            },
                        });
                    });
                }
                setQuotes(list);
                setSelectedQuote(list.length > 0 ? list[0] : null);
            }
        } catch (err: any) {
            setError(err.message || 'Lỗi khi tải báo giá');
        } finally {
            setLoading(false);
        }
    }, [projectId, mockDataEnabled, selectedProject]);

    useEffect(() => {
        if (!projectId) return;
        loadQuotes();
    }, [projectId, loadQuotes]);

    // Load historical quote items asynchronously on-demand
    useEffect(() => {
        if (selectedQuote && selectedQuote.isHistoryFile && !selectedQuote.items && !mockDataEnabled) {
            const loadHistoryItems = async () => {
                setHistoryItemsLoading(true);
                try {
                    const url = `http://localhost:3001${selectedQuote.jsonUrl}`;
                    const res = await fetch(url);
                    if (res.ok) {
                        const data = await res.json();
                        if (data && data.items) {
                            setSelectedQuote((prev: any) => {
                                if (prev && prev.quote_id === selectedQuote.quote_id) {
                                    return {
                                        ...prev,
                                        items: data.items,
                                        project_info: data.project_info || prev.project_info,
                                        subtotal: data.subtotal ?? prev.subtotal,
                                        vat_percent: data.vat_percent ?? prev.vat_percent,
                                        vat_amount: data.vat_amount ?? prev.vat_amount,
                                        total_contract_value: data.total_contract_value ?? prev.total_contract_value,
                                    };
                                }
                                return prev;
                            });
                        }
                    }
                } catch (e) {
                    console.error("Failed to load historical quote items", e);
                } finally {
                    setHistoryItemsLoading(false);
                }
            };
            loadHistoryItems();
        }
    }, [selectedQuote, mockDataEnabled]);

    // Inline item management helpers
    const addTempItem = () => {
        setTempItems(prev => {
            let maxNum = 0;
            prev.forEach(item => {
                if (item.item_code) {
                    const match = item.item_code.match(/^HM-?(\d+)$/);
                    if (match) {
                        const num = parseInt(match[1], 10);
                        if (num > maxNum) {
                            maxNum = num;
                        }
                    }
                }
            });
            const nextNum = maxNum + 1;
            const codeSuffix = String(nextNum).padStart(3, '0');
            return [
                ...prev,
                {
                    item_code: `HM-${codeSuffix}`,
                    item_name: '',
                    unit: 'm2',
                    quoted_quantity: 0,
                    original_unit_price: 0,
                    is_extra: false,
                }
            ];
        });
    };

    const updateTempItem = (idx: number, field: string, value: any) => {
        setTempItems(prev => {
            const next = [...prev];
            next[idx] = { ...next[idx], [field]: value };
            return next;
        });
    };

    const handleRemoveTempItem = (index: number) => {
        setTempItems(prev => prev.filter((_, i) => i !== index));
    };

    // Save/create new quote
    const handleCreateQuote = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            alert('Vui lòng điền tên dự án / báo giá!');
            return;
        }

        const newQuoteId = `Q-${projectId}-${Date.now().toString().slice(-4)}`;
        const quoteData = {
            project_info: {
                project_name: name,
                location: location,
                client_name: clientName,
                contractor_name: contractorName,
                start_date: startDate,
                expected_completion_date: endDate,
                vat_percent: parseFloat(vatPercent || '0'),
                is_variation_quote: isVariationQuote,
            },
            items: tempItems.map(it => ({
                item_code: it.item_code,
                item_name: it.item_name,
                unit: it.unit,
                quoted_quantity: it.quoted_quantity,
                original_unit_price: it.original_unit_price,
            }))
        };

        setLoading(true); setError('');
        try {
            if (mockDataEnabled) {
                const newGeneratedQuote = {
                    quote_id: newQuoteId,
                    project_id: projectId,
                    version: `Bản báo giá vừa tạo (${quotes.length + 1})`,
                    created_at: new Date().toISOString(),
                    project_name: name,
                    project_info: quoteData.project_info,
                    expected_completion_date: endDate,
                    items: [...tempItems]
                };
                setQuotes(prev => [newGeneratedQuote, ...prev]);
                setSelectedQuote(newGeneratedQuote);
                setTempItems([]);
                setIsVariationQuote(false);
                setSubTab('xem_chi_tiet');
            } else {
                await api.processQuote(projectId, quoteData, []);
                await loadQuotes();
                setTempItems([]);
                setIsVariationQuote(false);
                setSubTab('xem_chi_tiet');
            }
        } catch (err: any) {
            setError(err.message || 'Lỗi khi tạo báo giá');
        } finally {
            setLoading(false);
        }
    };

    // Sign quote handler
    const handleSignQuote = async () => {
        if (!projectId || !selectedQuote) return;

        const confirmSign = window.confirm(`Bạn có chắc chắn muốn phê duyệt và ký kết bản báo giá này (${selectedQuote.version || 'v1'}) không? Hành động này sẽ khóa phiên bản này và đồng bộ làm tệp Excel Master của dự án.`);
        if (!confirmSign) return;

        setLoading(true); setError('');
        try {
            if (mockDataEnabled) {
                const updatedQuotes = quotes.map(q => {
                    if (q.quote_id === selectedQuote.quote_id) {
                        return {
                            ...q,
                            project_info: {
                                ...q.project_info,
                                contract_signed: true,
                                signed_version: q.version || 'v1',
                                signed_at: new Date().toISOString()
                            }
                        };
                    }
                    return q;
                });
                setQuotes(updatedQuotes);
                setSelectedQuote((prev: any) => ({
                    ...prev,
                    project_info: {
                        ...prev?.project_info,
                        contract_signed: true,
                        signed_version: prev?.version || 'v1',
                        signed_at: new Date().toISOString()
                    }
                }));
                const prevItemsStr = localStorage.getItem(`mock_signed_items_${projectId}`);
                let finalSignedItems = selectedQuote.items || [];
                if (selectedQuote.project_info?.is_variation_quote && prevItemsStr) {
                    const prevItems = JSON.parse(prevItemsStr);
                    const prevCodes = new Set(prevItems.map((it: any) => it.item_code));
                    finalSignedItems = [...prevItems];
                    (selectedQuote.items || []).forEach((it: any) => {
                        let targetCode = it.item_code;
                        if (prevCodes.has(targetCode)) {
                            targetCode = `${targetCode}_PS`;
                        }
                        finalSignedItems.push({
                            ...it,
                            item_code: targetCode,
                            is_extra: true
                        });
                    });
                }
                localStorage.setItem(`mock_contract_signed_${projectId}`, 'true');
                localStorage.setItem(`mock_signed_version_${projectId}`, selectedQuote.version || selectedQuote.quote_id || 'v1');
                localStorage.setItem(`mock_signed_items_${projectId}`, JSON.stringify(finalSignedItems));
                alert(`Đã ký duyệt và chốt báo giá (${selectedQuote.version || 'v1'}) thành công! (Chế độ Demo)`);
            } else {
                const filename = selectedQuote.fileName || `baogia_${projectId}.json`;
                const version = selectedQuote.version || 'v1';
                await api.signQuote(projectId, version, filename);
                await loadQuotes();
                alert(`Đã ký duyệt và chốt báo giá thành công!`);
            }
        } catch (err: any) {
            setError(err.message || 'Lỗi khi ký báo giá');
        } finally {
            setLoading(false);
        }
    };

    // Calculate totals
    const totalAmount = useMemo(() => {
        if (!selectedQuote?.items) return 0;
        return selectedQuote.items.reduce((sum: number, item: any) => {
            const q = item.quoted_quantity ?? item.contract_quantity ?? 0;
            const p = item.original_unit_price ?? item.contract_unit_price ?? 0;
            return sum + (q * p);
        }, 0);
    }, [selectedQuote]);

    const tempTotalAmount = useMemo(() => {
        return tempItems.reduce((sum: number, item: any) => {
            return sum + ((item.quoted_quantity || 0) * (item.original_unit_price || 0));
        }, 0);
    }, [tempItems]);

    const removeVietnameseTones = (str: string) => {
        str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
        str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
        str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
        str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
        str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
        str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
        str = str.replace(/đ/g, "d");
        str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
        str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
        str = str.replace(/Ì|Í|Ị|Bỉ|Ĩ/g, "I");
        str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
        str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
        str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
        str = str.replace(/Đ/g, "D");
        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    };

    // Mock download helper for demo mode
    const handleMockDownload = (type: 'excel' | 'pdf') => {
        const title = type === 'excel' ? 'EXCEL BÁO GIÁ' : 'PDF BÁO GIÁ';
        const ext = type === 'excel' ? 'xlsx' : 'pdf';
        const quoteName = selectedQuote?.version || 'Bản nháp';
        
        let content = `==================================================\n`;
        content += `   BẢN XUẤT ${title} DEMO (CHẾ ĐỘ MOCK DATA)\n`;
        content += `==================================================\n\n`;
        content += `Dự án: ${name || 'N/A'}\n`;
        content += `Địa chỉ: ${location || 'N/A'}\n`;
        content += `Khách hàng bên A: ${clientName || 'N/A'}\n`;
        content += `Đơn vị thi công bên B: ${contractorName || 'N/A'}\n`;
        content += `Phiên bản: ${quoteName}\n`;
        content += `Ngày khởi tạo: ${selectedQuote?.created_at || new Date().toLocaleString()}\n`;
        content += `Trị giá: ${totalAmount.toLocaleString('vi-VN')} VND\n\n`;
        content += `DANH SÁCH HẠNG MỤC CÔNG VIỆC CHI TIẾT:\n`;
        
        if (selectedQuote?.items && selectedQuote.items.length > 0) {
            selectedQuote.items.forEach((it: any, idx: number) => {
                const q = it.quoted_quantity ?? it.contract_quantity ?? 0;
                const p = it.original_unit_price ?? it.contract_unit_price ?? 0;
                content += `${idx + 1}. [${it.item_code || 'N/A'}] ${it.item_name} | ĐVT: ${it.unit} | KL: ${q} | Đơn giá: ${p.toLocaleString('vi-VN')} đ | Thành tiền: ${(q * p).toLocaleString('vi-VN')} đ\n`;
            });
        } else {
            content += `(Không có hạng mục chi tiết)\n`;
        }
        
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        const cleanProjectName = removeVietnameseTones(name || 'du_an')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '');
            
        const cleanQuoteVersion = removeVietnameseTones(quoteName)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '');
            
        link.download = `baogia_${cleanProjectName}_${cleanQuoteVersion}.${ext}`;
        link.click();
        URL.revokeObjectURL(url);
    };

    // Download helpers
    const getDownloadLinks = () => {
        if (!selectedQuote) return { excel: '#', pdf: '#' };

        if (mockDataEnabled) {
            return { excel: '#', pdf: '#' };
        }

        if (selectedQuote.isHistoryFile) {
            const excelPath = selectedQuote.excelUrl.split('path=')[1] ? decodeURIComponent(selectedQuote.excelUrl.split('path=')[1]) : '';
            const pdfPath = selectedQuote.pdfUrl.split('path=')[1] ? decodeURIComponent(selectedQuote.pdfUrl.split('path=')[1]) : '';
            return {
                excel: api.getDownloadUrl(excelPath),
                pdf: api.getDownloadUrl(pdfPath)
            };
        } else {
            const isVar = !!selectedQuote.project_info?.is_variation_quote;
            const prefix = isVar ? 'baogia_phatsinh_' : 'baogia_';
            return {
                excel: api.getDownloadUrl(`master/${projectId}/${prefix}${projectId}.xlsx`),
                pdf: api.getDownloadUrl(`master/${projectId}/${prefix}${projectId}.pdf`)
            };
        }
    };

    const downloadUrls = getDownloadLinks();
    const isSigned = !!selectedQuote?.project_info?.contract_signed || !!selectedQuote?.contract_signed;
    const signedVersion = selectedQuote?.project_info?.signed_version || selectedQuote?.signed_version || 'v1';

    if (!selectedProject) {
        return (
            <div style={{ padding: '60px 40px', textAlign: 'center', color: '#64748b', fontSize: '1.4rem', background: '#fff', borderRadius: '12px', boxShadow: 'var(--shadow)', border: '1px solid var(--border-color)' }}>
                <Info size={44} style={{ marginBottom: '16px', color: '#94a3b8' }} />
                <h3 style={{ fontSize: '1.8rem', color: '#1e293b', fontWeight: '700', marginBottom: '8px' }}>Chưa chọn dự án</h3>
                <p>Vui lòng chọn dự án ở thanh bên trái để bắt đầu thiết lập báo giá.</p>
            </div>
        );
    }

    if (loading && quotes.length === 0) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', gap: '10px' }}>
                <span style={{ fontSize: '24px', animation: 'spin 1.5s linear infinite' }}>⚙️</span>
                <span style={{ fontSize: '1.4rem', color: '#64748b', fontWeight: '500' }}>Đang nạp dữ liệu báo giá...</span>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            <style>{`
                .project-form-grid {
                    display: grid;
                    grid-template-columns: repeat(12, 1fr);
                    gap: 20px;
                }
                .field-project-name { grid-column: span 7; }
                .field-location { grid-column: span 5; }
                .field-client { grid-column: span 4; }
                .field-contractor { grid-column: span 4; }
                .field-start-date { grid-column: span 2; }
                .field-end-date { grid-column: span 2; }

                .table-input {
                    width: 100%;
                    padding: 6px 10px;
                    border-radius: 8px;
                    border: 1px solid #d6dbde;
                    font-size: 1.25rem;
                    outline: none;
                    background-color: #ffffff;
                    transition: all 0.2s ease;
                    box-sizing: border-box;
                }
                .table-input:focus {
                    border-color: #00754a;
                    box-shadow: 0 0 0 3px rgba(0, 117, 74, 0.15);
                }

                @media (max-width: 1024px) {
                    .project-form-grid {
                        grid-template-columns: 1fr 1fr;
                    }
                    .field-project-name, .field-location, .field-client, .field-contractor { grid-column: span 2; }
                    .field-start-date, .field-end-date { grid-column: span 1; }
                }

                @media (max-width: 640px) {
                    .project-form-grid {
                        grid-template-columns: 1fr;
                    }
                    .field-project-name, .field-location, .field-client, .field-contractor, .field-start-date, .field-end-date { grid-column: span 1; }
                }
            `}</style>
            {/* Header Title */}
            <div>
                <h1 style={{ fontSize: '2.4rem', fontWeight: '800', color: '#006241', marginBottom: '6px', letterSpacing: '-0.16px' }}>Báo giá dự án công trình</h1>
                <p style={{ fontSize: '1.35rem', color: 'rgba(0,0,0,0.58)', margin: 0 }}>Lập dự toán, quản lý danh sách vật tư chi tiết và kết xuất hồ sơ báo giá chuyên nghiệp.</p>
            </div>

            {/* Error Message */}
            {error && (
                <div style={{ background: 'rgba(200, 32, 20, 0.05)', border: '1px solid #c82014', borderLeft: '4px solid #c82014', borderRadius: '8px', color: '#c82014', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.35rem', fontWeight: '500' }}>
                    <AlertTriangle size={16} /> <span>⚠️ {error}</span>
                </div>
            )}

            {/* Sub-Tab Navigation Header */}
            <div className="tab-container">
                <button
                    type="button"
                    className={`tab-btn ${subTab === 'tao_bao_gia' ? 'active' : ''}`}
                    onClick={() => setSubTab('tao_bao_gia')}
                >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <PlusCircle size={14} /> Lập báo giá mới
                    </span>
                </button>
                <button
                    type="button"
                    className={`tab-btn ${subTab === 'xem_chi_tiet' ? 'active' : ''}`}
                    onClick={() => setSubTab('xem_chi_tiet')}
                >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <FileText size={14} /> Xem báo giá đã lưu ({quotes.length})
                    </span>
                </button>
            </div>

            {/* Content Area */}
            <div>
                {/* SUB-TAB 1: FORM TẠO BÁO GIÁ MỚI */}
                {subTab === 'tao_bao_gia' && (
                    <form onSubmit={handleCreateQuote} style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                        {/* Project Info Card */}
                        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <h3 style={{ color: '#006241', fontSize: '1.7rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #edebe9', paddingBottom: '12px', margin: 0 }}>
                                <Briefcase size={20} /> Thông tin khách hàng & dự án
                            </h3>
                            <div className="project-form-grid">
                                <div className="field-project-name">
                                    <InputField label="Tên Dự Án / Báo Giá" value={name} onChange={setName} placeholder="Nhập tên dự án..." required icon={<Briefcase size={15} />} />
                                </div>
                                <div className="field-location">
                                    <InputField label="Địa Điểm Thi Công" value={location} onChange={setLocation} placeholder="Vị trí thi công..." icon={<MapPin size={15} />} />
                                </div>
                                <div className="field-client">
                                    <InputField label="Chủ Đầu Tư (Khách Hàng Bên A)" value={clientName} onChange={setClientName} placeholder="Tên đối tác..." icon={<User size={15} />} />
                                </div>
                                <div className="field-contractor">
                                    <InputField label="Đơn Vị Nhà Thầu (Bên B)" value={contractorName} onChange={setContractorName} placeholder="Đơn vị phụ trách chính..." icon={<Building2 size={15} />} />
                                </div>
                                <div className="field-start-date">
                                    <InputField label="Ngày Bắt Đầu" type="date" value={startDate} onChange={setStartDate} icon={<Calendar size={15} />} />
                                </div>
                                <div className="field-end-date">
                                    <InputField label="Ngày Kết Thúc Dự Kiến" type="date" value={endDate} onChange={setEndDate} icon={<Calendar size={15} />} />
                                </div>
                                <div style={{ gridColumn: 'span 12', display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px', padding: '12px 16px', background: '#fafafa', borderRadius: '8px', border: '1px solid #edebe9' }}>
                                    <input
                                        id="is-variation-quote-checkbox"
                                        type="checkbox"
                                        checked={isVariationQuote}
                                        onChange={e => setIsVariationQuote(e.target.checked)}
                                        style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#00754A' }}
                                    />
                                    <label htmlFor="is-variation-quote-checkbox" style={{ fontSize: '1.3rem', fontWeight: '700', color: '#1e293b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        Đây là báo giá bổ sung / phát sinh (Phụ lục hợp đồng)
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Items Entry Card */}
                        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #006241', paddingBottom: '12px' }}>
                                <h3 style={{ color: '#006241', fontSize: '1.7rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                                    <Layers size={20} /> Danh mục hạng mục vật tư dự toán
                                </h3>
                            </div>

                            {/* Temp Items Table */}
                            {tempItems.length > 0 ? (
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', margin: 0 }}>
                                        <thead>
                                            <tr>
                                                <th style={{ ...thStyle, width: '50px', textAlign: 'center' }}>STT</th>
                                                <th style={{ ...thStyle, width: '120px', textAlign: 'center' }}>MÃ HM</th>
                                                <th style={{ ...thStyle, textAlign: 'left' }}>HẠNG MỤC CÔNG VIỆC THIẾT KẾ</th>
                                                <th style={{ ...thStyle, width: '80px', textAlign: 'center' }}>ĐVT</th>
                                                <th style={{ ...thStyle, width: '120px', textAlign: 'right' }}>SỐ LƯỢNG</th>
                                                <th style={{ ...thStyle, width: '150px', textAlign: 'right' }}>ĐƠN GIÁ (VND)</th>
                                                <th style={{ ...thStyle, width: '160px', textAlign: 'right' }}>THÀNH TIỀN (VND)</th>
                                                <th style={{ ...thStyle, width: '50px' }}></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {tempItems.map((it, idx) => {
                                                const total = (it.quoted_quantity || 0) * (it.original_unit_price || 0);
                                                return (
                                                    <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#f9f9f9' : '#ffffff', borderBottom: '1px solid #edebe9' }}>
                                                        <td style={{ ...tdStyle, textAlign: 'center' }}>{idx + 1}</td>
                                                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                                                            <input
                                                                type="text"
                                                                className="table-input"
                                                                style={{ textAlign: 'center' }}
                                                                value={it.item_code}
                                                                onChange={e => updateTempItem(idx, 'item_code', e.target.value)}
                                                                placeholder="HM-01"
                                                            />
                                                        </td>
                                                        <td style={tdStyle}>
                                                            <input
                                                                type="text"
                                                                className="table-input"
                                                                placeholder="Tên hạng mục công việc / vật tư..."
                                                                value={it.item_name}
                                                                onChange={e => updateTempItem(idx, 'item_name', e.target.value)}
                                                                required
                                                            />
                                                        </td>
                                                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                                                            <input
                                                                type="text"
                                                                className="table-input"
                                                                style={{ textAlign: 'center' }}
                                                                placeholder="ĐVT"
                                                                value={it.unit}
                                                                onChange={e => updateTempItem(idx, 'unit', e.target.value)}
                                                            />
                                                        </td>
                                                        <td style={{ ...tdStyle, textAlign: 'right' }}>
                                                            <input
                                                                type="number"
                                                                className="table-input"
                                                                style={{ textAlign: 'right' }}
                                                                placeholder="0"
                                                                min="0"
                                                                value={it.quoted_quantity || ''}
                                                                onChange={e => updateTempItem(idx, 'quoted_quantity', parseFloat(e.target.value) || 0)}
                                                            />
                                                        </td>
                                                        <td style={{ ...tdStyle, textAlign: 'right' }}>
                                                            <input
                                                                type="number"
                                                                className="table-input"
                                                                style={{ textAlign: 'right' }}
                                                                placeholder="0"
                                                                min="0"
                                                                value={it.original_unit_price || ''}
                                                                onChange={e => updateTempItem(idx, 'original_unit_price', parseFloat(e.target.value) || 0)}
                                                            />
                                                        </td>
                                                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '700', color: '#006241' }}>
                                                            {total.toLocaleString('vi-VN')} ₫
                                                        </td>
                                                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveTempItem(idx)}
                                                                style={{ background: 'rgba(239, 68, 68, 0.05)', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', cursor: 'pointer' }}
                                                            >
                                                                <Trash2 size={13} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '50px 20px', background: '#f8fafc', border: '2px dashed #cbd5e1', borderRadius: '8px', color: 'rgba(0,0,0,0.58)', textAlign: 'center', gap: '12px' }}>
                                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'rgba(31, 78, 121, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1F4E79' }}>
                                        <Sparkles size={22} />
                                    </div>
                                    <div>
                                        <h4 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1F4E79', marginBottom: '4px' }}>Danh sách vật tư trống</h4>
                                        <p style={{ fontSize: '1.25rem', color: '#64748b', margin: 0 }}>Nhấp "Thêm hạng mục thiết kế" bên dưới để bắt đầu nhập chi tiết vật tư.</p>
                                    </div>
                                </div>
                            )}

                            {/* Button to add item at the bottom left */}
                            <button
                                type="button"
                                onClick={addTempItem}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '8px 16px',
                                    borderRadius: '50px',
                                    backgroundColor: '#ffffff',
                                    color: '#00754A',
                                    border: '1px solid #00754A',
                                    fontWeight: '700',
                                    fontSize: '1.2rem',
                                    cursor: 'pointer',
                                    alignSelf: 'flex-start',
                                    marginTop: '8px',
                                    marginBottom: '8px'
                                }}
                            >
                                <Plus size={14} /> Thêm hạng mục thiết kế
                            </button>

                            {/* Actions & Sum summary */}
                            {(() => {
                                const parsedVat = parseFloat(vatPercent) || 0;
                                const vatValue = tempTotalAmount * (parsedVat / 100);
                                const grandTotal = tempTotalAmount + vatValue;
                                
                                return (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px 24px', padding: '20px 24px', background: '#f2f0eb', borderRadius: '12px', border: '1px solid #edebe9', fontSize: '1.25rem', marginTop: '12px' }}>
                                        {parsedVat > 0 && (
                                            <>
                                                <div style={{ color: 'rgba(0,0,0,0.58)', fontWeight: '600' }}>Cộng tiền hàng:</div>
                                                <div style={{ textAlign: 'right', fontWeight: '700' }}>{tempTotalAmount.toLocaleString('vi-VN')} đ</div>
                                            </>
                                        )}

                                        <div style={{ color: 'rgba(0,0,0,0.58)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span>Thuế VAT:</span>
                                            <input
                                                type="number"
                                                className="table-input"
                                                style={{ padding: '4px 8px', width: '70px', textAlign: 'right', display: 'inline-block' }}
                                                value={vatPercent}
                                                onChange={e => setVatPercent(e.target.value)}
                                                placeholder="0"
                                            />
                                            <span>% (để trống nếu không có thuế)</span>
                                        </div>
                                        <div style={{ textAlign: 'right', fontWeight: '700' }}>
                                            {parsedVat > 0 ? `${vatValue.toLocaleString('vi-VN')} đ` : '0 đ'}
                                        </div>

                                        <div style={{ fontWeight: '800', paddingTop: '12px', borderTop: '2px solid #006241', fontSize: '1.35rem', color: '#1E3932' }}>
                                            TỔNG GIÁ TRỊ HỢP ĐỒNG (VND):
                                        </div>
                                        <div style={{ textAlign: 'right', fontWeight: '800', paddingTop: '12px', borderTop: '2px solid #006241', color: '#00754A', fontSize: '1.6rem' }}>
                                            {grandTotal.toLocaleString('vi-VN')} VNĐ
                                        </div>
                                    </div>
                                );
                            })()}

                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                                <button
                                    type="submit"
                                    className="btn"
                                    style={{ padding: '12px 32px', borderRadius: '50px', fontSize: '1.35rem', backgroundColor: '#00754a', boxShadow: '0 4px 10px rgba(0, 117, 74, 0.2)' }}
                                >
                                    TẠO BÁO GIÁ DỰ ÁN
                                </button>
                            </div>
                        </div>
                    </form>
                )}

                {/* SUB-TAB 2: XEM CHI TIẾT BÁO GIÁ ĐÃ LƯU & XUẤT FILE */}
                {subTab === 'xem_chi_tiet' && (
                    <div style={{ display: 'grid', gridTemplateColumns: quotes.length > 0 ? '300px 1fr' : '1fr', gap: '24px', alignItems: 'start' }}>
                        
                        {/* DANH SÁCH BẢN BÁO GIÁ BÊN TRÁI */}
                        {quotes.length > 0 && (
                            <div className="glass-panel" style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ fontWeight: '800', fontSize: '1.3rem', color: '#006241', textTransform: 'uppercase', borderBottom: '2px solid #006241', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <ClipboardList size={16} /> Phiên bản báo giá ({quotes.length})
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '70vh', overflowY: 'auto', paddingRight: '4px' }}>
                                    {quotes.map((q: any) => {
                                        const isSel = selectedQuote?.quote_id === q.quote_id;
                                        const totalVal = q.total_value ?? (q.items ? q.items.reduce((s: number, it: any) => s + ((it.quoted_quantity ?? it.contract_quantity ?? 0) * (it.original_unit_price ?? it.contract_unit_price ?? 0)), 0) : 0);
                                        const signedBadge = (q.project_info?.contract_signed || q.contract_signed);

                                        return (
                                            <div
                                                key={q.quote_id}
                                                onClick={() => setSelectedQuote(q)}
                                                style={{
                                                    cursor: 'pointer',
                                                    padding: '10px 12px',
                                                    borderRadius: '8px',
                                                    background: isSel ? '#f1fff7' : '#ffffff',
                                                    border: isSel ? '2px solid #006241' : '1px solid #edebe9',
                                                    boxShadow: isSel ? '0 2px 6px rgba(0, 98, 65, 0.06)' : 'none',
                                                    transition: 'all 0.15s ease',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '4px'
                                                }}
                                                onMouseEnter={e => {
                                                    if (!isSel) {
                                                        e.currentTarget.style.borderColor = '#94a3b8';
                                                    }
                                                }}
                                                onMouseLeave={e => {
                                                    if (!isSel) {
                                                        e.currentTarget.style.borderColor = '#edebe9';
                                                    }
                                                }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontWeight: '700', fontSize: '1.2rem', color: isSel ? '#006241' : '#1e293b' }}>
                                                        {q.version || 'Bản nháp'}
                                                    </span>
                                                    {signedBadge && (
                                                        <span style={{ backgroundColor: '#d4e9e2', color: '#006241', fontSize: '0.85rem', padding: '2px 4px', borderRadius: '4px', fontWeight: '700', textTransform: 'uppercase' }}>
                                                            Đã ký
                                                        </span>
                                                    )}
                                                </div>
                                                <div style={{ fontSize: '1.05rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <Calendar size={11} /> {q.created_at ? formatGeneratedAt(q.created_at) : '—'}
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed #e2e8f0', paddingTop: '4px', marginTop: '0px' }}>
                                                    <span style={{ fontSize: '1.05rem', color: '#64748b' }}>Trị giá:</span>
                                                    <span style={{ fontSize: '1.2rem', fontWeight: '700', color: '#006241' }}>
                                                        {totalVal.toLocaleString('vi-VN')} ₫
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* KHU VỰC HIỂN THỊ CHI TIẾT BÁO GIÁ ĐANG CHỌN */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {!selectedQuote ? (
                                <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                                    <Info size={40} style={{ marginBottom: '12px', color: '#cbd5e1' }} />
                                    <p style={{ margin: 0, fontSize: '1.4rem' }}>Dự án hiện chưa có bản báo giá nào. Vui lòng chuyển sang Tab "Lập báo giá mới" để thực hiện.</p>
                                </div>
                            ) : (
                                <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    {/* Quote Detail Header */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #edebe9', paddingBottom: '16px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '800', color: '#1e293b' }}>
                                                    BÁO GIÁ: {selectedQuote.version || 'Bản nháp'}
                                                </h2>
                                                {isSigned ? (
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#d4e9e2', color: '#006241', fontSize: '1.15rem', padding: '4px 10px', borderRadius: '20px', fontWeight: '700' }}>
                                                        <Check size={12} strokeWidth={3} /> ĐÃ KÝ KẾT HỢP ĐỒNG (Bản {signedVersion})
                                                    </span>
                                                ) : (
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#faf6ee', color: '#8c6b2d', fontSize: '1.15rem', padding: '4px 10px', borderRadius: '20px', fontWeight: '700', border: '1px solid rgba(203,162,88,0.2)' }}>
                                                        CHƯA PHÊ DUYỆT
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: '1.25rem', color: '#64748b' }}>
                                                Lập lúc: <strong>{selectedQuote.created_at ? formatGeneratedAt(selectedQuote.created_at) : '—'}</strong>
                                            </div>
                                        </div>

                                        {/* Action buttons */}
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            {!isSigned && (
                                                <button
                                                    onClick={handleSignQuote}
                                                    className="btn btn-secondary"
                                                    style={{
                                                        backgroundColor: 'rgba(0, 117, 74, 0.05)',
                                                        borderColor: '#00754a',
                                                        color: '#00754a',
                                                        fontSize: '1.25rem',
                                                        fontWeight: '700',
                                                        padding: '10px 16px',
                                                        borderRadius: '8px'
                                                    }}
                                                >
                                                    <Check size={15} /> Ký hợp đồng / Chốt báo giá
                                                </button>
                                            )}
                                            {mockDataEnabled ? (
                                                <button 
                                                    onClick={() => handleMockDownload('excel')}
                                                    style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #00754A', background: '#fff', color: '#00754A', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '1.25rem', transition: 'all 0.15s' }}
                                                    onMouseEnter={e => e.currentTarget.style.background = '#f1fff7'}
                                                    onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                                                >
                                                    <FileSpreadsheet size={15} /> Xuất Excel
                                                </button>
                                            ) : (
                                                <a href={downloadUrls.excel} download target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                                                    <button style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #00754A', background: '#fff', color: '#00754A', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '1.25rem', transition: 'all 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = '#f1fff7'} onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                                                        <FileSpreadsheet size={15} /> Xuất Excel
                                                    </button>
                                                </a>
                                            )}
                                            {mockDataEnabled ? (
                                                <button 
                                                    onClick={() => handleMockDownload('pdf')}
                                                    style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#c82014', color: '#fff', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '1.25rem', transition: 'all 0.15s' }}
                                                    onMouseEnter={e => e.currentTarget.style.background = '#a5160c'}
                                                    onMouseLeave={e => e.currentTarget.style.background = '#c82014'}
                                                >
                                                    <FileText size={15} /> Xuất PDF
                                                </button>
                                            ) : (
                                                <a href={downloadUrls.pdf} download target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                                                    <button style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#c82014', color: '#fff', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '1.25rem', transition: 'all 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = '#a5160c'} onMouseLeave={e => e.currentTarget.style.background = '#c82014'}>
                                                        <FileText size={15} /> Xuất PDF
                                                    </button>
                                                </a>
                                            )}
                                        </div>
                                    </div>

                                    {/* Virtual Landscape A4 PDF Document Sheet Preview */}
                                    <div style={{
                                        background: '#ffffff',
                                        border: '1px solid #d3d3d3',
                                        borderRadius: '4px',
                                        padding: '30px 40px',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                                        fontFamily: 'Arial, sans-serif',
                                        color: '#333333',
                                        overflowX: 'auto',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '20px'
                                    }}>
                                        {/* Doc Title */}
                                        <div style={{ borderBottom: '2px solid #1F4E79', paddingBottom: '10px' }}>
                                            <h2 style={{ margin: 0, fontSize: '2.0rem', fontWeight: '800', color: '#1F4E79', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                BẢNG BÁO GIÁ CHI TIẾT CÔNG TRÌNH
                                            </h2>
                                        </div>

                                        {/* Project Administrative Info Grid (matching PDF info_table) */}
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '1.3rem', lineHeight: '1.6' }}>
                                            <tbody>
                                                <tr>
                                                    <td style={{ width: '180px', padding: '4px 0', fontWeight: 'bold', color: '#1F4E79' }}>Dự án</td>
                                                    <td style={{ width: '15px', padding: '4px 0', fontWeight: 'bold' }}>:</td>
                                                    <td style={{ padding: '4px 0', color: '#333' }}>{selectedQuote.project_info?.project_name || selectedQuote.project_name || '—'}</td>
                                                </tr>
                                                <tr>
                                                    <td style={{ padding: '4px 0', fontWeight: 'bold', color: '#1F4E79' }}>Địa điểm</td>
                                                    <td style={{ padding: '4px 0', fontWeight: 'bold' }}>:</td>
                                                    <td style={{ padding: '4px 0', color: '#333' }}>{selectedQuote.project_info?.location || '—'}</td>
                                                </tr>
                                                <tr>
                                                    <td style={{ padding: '4px 0', fontWeight: 'bold', color: '#1F4E79' }}>Khách hàng (Bên A)</td>
                                                    <td style={{ padding: '4px 0', fontWeight: 'bold' }}>:</td>
                                                    <td style={{ padding: '4px 0', color: '#333' }}>{selectedQuote.project_info?.client_name || selectedQuote.project_info?.clientName || 'Chưa cập nhật'}</td>
                                                </tr>
                                                <tr>
                                                    <td style={{ padding: '4px 0', fontWeight: 'bold', color: '#1F4E79' }}>Đơn vị thi công (Bên B)</td>
                                                    <td style={{ padding: '4px 0', fontWeight: 'bold' }}>:</td>
                                                    <td style={{ padding: '4px 0', color: '#333' }}>{(selectedQuote.project_info?.contractor_name || selectedQuote.project_info?.contractorName || 'Chưa cập nhật').replace("Cty ", "Công ty ")}</td>
                                                </tr>
                                                <tr>
                                                    <td style={{ padding: '4px 0', fontWeight: 'bold', color: '#1F4E79' }}>Thời gian thi công</td>
                                                    <td style={{ padding: '4px 0', fontWeight: 'bold' }}>:</td>
                                                    <td style={{ padding: '4px 0', color: '#333' }}>
                                                        {formatDateVN(selectedQuote.project_info?.start_date)} đến {formatDateVN(selectedQuote.project_info?.expected_completion_date)}
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td style={{ padding: '4px 0', fontWeight: 'bold', color: '#1F4E79' }}>Phiên bản</td>
                                                    <td style={{ padding: '4px 0', fontWeight: 'bold' }}>:</td>
                                                    <td style={{ padding: '4px 0', color: '#333' }}>
                                                        {selectedQuote.version || 'v1'} (Cập nhật lúc: {selectedQuote.created_at ? formatGeneratedAt(selectedQuote.created_at) : '—'})
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>

                                        {/* Historical quote items loading indicator */}
                                        {historyItemsLoading ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: '12px' }}>
                                                <span style={{ fontSize: '28px', animation: 'spin 1.5s linear infinite' }}>⚙️</span>
                                                <span style={{ fontSize: '1.35rem', color: '#64748b', fontWeight: '500' }}>Đang nạp chi tiết các hạng mục...</span>
                                            </div>
                                        ) : (
                                            <>
                                                {/* Table of Quote Items */}
                                                {selectedQuote.items && selectedQuote.items.length > 0 ? (
                                                    <div style={{ border: '1px solid #D3D3D3', borderRadius: '4px', overflow: 'hidden', marginTop: '8px' }}>
                                                        <table style={{ width: '100%', borderCollapse: 'collapse', margin: 0, fontFamily: 'Arial, sans-serif' }}>
                                                            <thead>
                                                                <tr style={{ background: '#1F4E79', color: '#ffffff' }}>
                                                                    <th style={{ padding: '12px 14px', width: '50px', textAlign: 'center', fontSize: '1.2rem', fontWeight: '700', textTransform: 'uppercase', border: '1px solid #D3D3D3' }}>STT</th>
                                                                    <th style={{ padding: '12px 14px', width: '120px', textAlign: 'center', fontSize: '1.2rem', fontWeight: '700', textTransform: 'uppercase', border: '1px solid #D3D3D3' }}>Mã HM</th>
                                                                    <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: '1.2rem', fontWeight: '700', textTransform: 'uppercase', border: '1px solid #D3D3D3' }}>Hạng mục công việc</th>
                                                                    <th style={{ padding: '12px 14px', width: '80px', textAlign: 'center', fontSize: '1.2rem', fontWeight: '700', textTransform: 'uppercase', border: '1px solid #D3D3D3' }}>ĐVT</th>
                                                                    <th style={{ padding: '12px 14px', width: '100px', textAlign: 'right', fontSize: '1.2rem', fontWeight: '700', textTransform: 'uppercase', border: '1px solid #D3D3D3' }}>SL</th>
                                                                    <th style={{ padding: '12px 14px', width: '130px', textAlign: 'right', fontSize: '1.2rem', fontWeight: '700', textTransform: 'uppercase', border: '1px solid #D3D3D3' }}>Đơn giá</th>
                                                                    <th style={{ padding: '12px 14px', width: '150px', textAlign: 'right', fontSize: '1.2rem', fontWeight: '700', textTransform: 'uppercase', border: '1px solid #D3D3D3' }}>Thành tiền</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {selectedQuote.items.map((it: any, idx: number) => {
                                                                    const q = it.quoted_quantity ?? it.contract_quantity ?? 0;
                                                                    const p = it.original_unit_price ?? it.contract_unit_price ?? 0;
                                                                    const total = q * p;
                                                                    const status = it.approval_status || 'Chờ duyệt';
                                                                    if (status === 'Đã loại bỏ') return null;

                                                                    return (
                                                                        <tr key={idx} style={{ borderBottom: '1px solid #D3D3D3', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#EBF3FB' }}>
                                                                            <td style={{ padding: '12px 14px', textAlign: 'center', color: '#333333', fontSize: '1.3rem', border: '1px solid #D3D3D3' }}>{idx + 1}</td>
                                                                            <td style={{ padding: '12px 14px', textAlign: 'center', color: '#333333', fontSize: '1.3rem', border: '1px solid #D3D3D3' }}>{it.item_code}</td>
                                                                            <td style={{ padding: '12px 14px', color: '#333333', fontSize: '1.3rem', border: '1px solid #D3D3D3' }}>
                                                                                {it.item_name}
                                                                                {!!it.is_extra && (
                                                                                    <span style={{
                                                                                        marginLeft: '8px',
                                                                                        padding: '2px 6px',
                                                                                        borderRadius: '4px',
                                                                                        backgroundColor: '#fef3c7',
                                                                                        color: '#d97706',
                                                                                        fontSize: '1.1rem',
                                                                                        fontWeight: 'bold',
                                                                                        display: 'inline-block'
                                                                                    }}>
                                                                                        Phát sinh
                                                                                    </span>
                                                                                )}
                                                                            </td>
                                                                            <td style={{ padding: '12px 14px', textAlign: 'center', color: '#333333', fontSize: '1.3rem', border: '1px solid #D3D3D3' }}>{it.unit}</td>
                                                                            <td style={{ padding: '12px 14px', textAlign: 'right', color: '#333333', fontSize: '1.3rem', border: '1px solid #D3D3D3' }}>{(q || 0).toLocaleString('vi-VN')}</td>
                                                                            <td style={{ padding: '12px 14px', textAlign: 'right', color: '#333333', fontSize: '1.3rem', border: '1px solid #D3D3D3' }}>{(p || 0).toLocaleString('vi-VN')}</td>
                                                                            <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: '700', color: '#333333', fontSize: '1.3rem', border: '1px solid #D3D3D3' }}>{total.toLocaleString('vi-VN')} ₫</td>
                                                                        </tr>
                                                                    );
                                                                })}

                                                                {/* integrated totals rows formatted like PDF */}
                                                                {(() => {
                                                                    const detailVatPercent = selectedQuote.project_info?.vat_percent ?? selectedQuote.vat_percent ?? 0;
                                                                    const vatValue = totalAmount * (detailVatPercent / 100);
                                                                    const grandTotal = totalAmount + vatValue;

                                                                    if (detailVatPercent > 0) {
                                                                        return (
                                                                            <>
                                                                                <tr style={{ background: '#f8fafc', fontWeight: '700' }}>
                                                                                    <td colSpan={6} style={{ padding: '12px 14px', textAlign: 'right', fontSize: '1.3rem', color: '#475569', border: '1px solid #D3D3D3' }}>Cộng tiền hàng (VND)</td>
                                                                                    <td style={{ padding: '12px 14px', textAlign: 'right', fontSize: '1.3rem', color: '#1e293b', border: '1px solid #D3D3D3' }}>{totalAmount.toLocaleString('vi-VN')} ₫</td>
                                                                                </tr>
                                                                                <tr style={{ background: '#f8fafc', fontWeight: '700' }}>
                                                                                    <td colSpan={6} style={{ padding: '12px 14px', textAlign: 'right', fontSize: '1.3rem', color: '#475569', border: '1px solid #D3D3D3' }}>Thuế VAT ({detailVatPercent}%)</td>
                                                                                    <td style={{ padding: '12px 14px', textAlign: 'right', fontSize: '1.3rem', color: '#1e293b', border: '1px solid #D3D3D3' }}>{vatValue.toLocaleString('vi-VN')} ₫</td>
                                                                                </tr>
                                                                                <tr style={{ background: '#BDD7EE', fontWeight: '800' }}>
                                                                                    <td colSpan={6} style={{ padding: '12px 14px', textAlign: 'right', fontSize: '1.35rem', color: '#1F4E79', border: '1px solid #D3D3D3' }}>TỔNG GIÁ TRỊ HỢP ĐỒNG (VND)</td>
                                                                                    <td style={{ padding: '12px 14px', textAlign: 'right', fontSize: '1.45rem', color: '#1F4E79', border: '1px solid #D3D3D3' }}>{grandTotal.toLocaleString('vi-VN')} ₫</td>
                                                                                </tr>
                                                                            </>
                                                                        );
                                                                    } else {
                                                                        return (
                                                                            <tr style={{ background: '#BDD7EE', fontWeight: '800' }}>
                                                                                <td colSpan={6} style={{ padding: '12px 14px', textAlign: 'right', fontSize: '1.35rem', color: '#1F4E79', border: '1px solid #D3D3D3' }}>TỔNG GIÁ TRỊ HỢP ĐỒNG (VND)</td>
                                                                                <td style={{ padding: '12px 14px', textAlign: 'right', fontSize: '1.45rem', color: '#1F4E79', border: '1px solid #D3D3D3' }}>{totalAmount.toLocaleString('vi-VN')} ₫</td>
                                                                            </tr>
                                                                        );
                                                                    }
                                                                })()}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                ) : (
                                                    <div style={{ padding: '40px', background: '#faf6ee', border: '1px solid rgba(203,162,88,0.2)', borderRadius: '8px', color: '#8c6b2d', textAlign: 'center', fontSize: '1.35rem', fontWeight: '500' }}>
                                                        ⚠️ Không tìm thấy chi tiết hạng mục cho bản báo giá này trong hệ thống.
                                                    </div>
                                                )}

                                                {/* PDF Signature Block */}
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', marginTop: '30px', textAlign: 'center', fontSize: '1.3rem', fontFamily: 'Arial, sans-serif' }}>
                                                    <div>
                                                        <p style={{ margin: 0, fontWeight: 'bold' }}>Đại diện Bên A</p>
                                                        <p style={{ margin: '4px 0 0 0', fontStyle: 'italic', color: '#666' }}>(Ký và ghi rõ họ tên)</p>
                                                    </div>
                                                    <div>
                                                        <p style={{ margin: 0, fontWeight: 'bold' }}>Đại diện Bên B</p>
                                                        <p style={{ margin: '4px 0 0 0', fontStyle: 'italic', color: '#666' }}>(Ký và ghi rõ họ tên)</p>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default QuotesPage;