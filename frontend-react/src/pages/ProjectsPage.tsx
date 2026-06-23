import React, { useState, useMemo, useEffect } from 'react';
import { api } from '../services/api';
import { mockProjects } from '../services/mockData'; // Import dữ liệu dự án mẫu
import { 
  LucideBriefcase, 
  MapPin, 
  Calendar, 
  Building2, 
  HardHat, 
  Search, 
  SlidersHorizontal, 
  Trash2, 
  Plus, 
  Check, 
  AlertTriangle,
  X
} from 'lucide-react';

interface ProjectsPageProps {
  projects: any[];
  selectedProject: any;
  setSelectedProject: (proj: any) => void;
  setActiveTab: (tab: string) => void;
  mockDataEnabled?: boolean; // Nhận prop mockDataEnabled từ cha truyền xuống
  refreshProjects?: () => Promise<void>;
}

const inputStyle: React.CSSProperties = { 
  padding: '10px 14px', 
  borderRadius: '8px', 
  width: '100%',
  border: '1px solid #d6dbde', 
  fontSize: '1.25rem',
  outline: 'none',
  backgroundColor: '#ffffff',
  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
};

const labelStyle: React.CSSProperties = { 
  fontSize: '1.15rem', 
  fontWeight: '700', 
  color: 'rgba(0, 0, 0, 0.87)', 
  textTransform: 'uppercase',
  letterSpacing: '0.325px' 
};

const panelStyle: React.CSSProperties = {
  backgroundColor: '#ffffff', 
  borderRadius: '12px', 
  padding: '24px',
  boxShadow: '0px 0px 0.5px 0px rgba(0,0,0,0.14), 0px 1px 1px 0px rgba(0,0,0,0.24)',
};

const Field: React.FC<{
  label: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}> = ({ label, type = 'text', placeholder, value, onChange, required }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
    <label style={labelStyle}>{label}</label>
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      style={inputStyle}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = '#00754A'; 
        e.currentTarget.style.boxShadow = '0 0 0 2px rgba(0, 117, 74, 0.1)';
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = '#d6dbde';
        e.currentTarget.style.boxShadow = 'none';
      }}
    />
  </div>
);

export const ProjectsPage: React.FC<ProjectsPageProps> = ({
  projects: initialProjects,
  selectedProject,
  setSelectedProject,
  setActiveTab,
  mockDataEnabled, 
  refreshProjects,
}) => {
  const [localProjects, setLocalProjects] = useState<any[]>(initialProjects);

  // Form State
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [clientName, setClientName] = useState('');
  const [contractorName, setContractorName] = useState('');

  // Control System States
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'alphabet'>('newest');
  const [projectToDelete, setProjectToDelete] = useState<any | null>(null);

  // ĐỒNG BỘ MOCK DATA HOẶC REAL DATA KHI PROP THAY ĐỔI
  useEffect(() => {
    if (mockDataEnabled) {
      const formattedMock = mockProjects.map(p => ({
        id: p.id,
        name: p.name,
        location: p.location,
        startDate: "2026-06-01",
        endDate: "2026-06-30",
        clientName: p.client_name,
        contractorName: p.contractor_name,
        status: 'Hoạt động'
      }));
      
      setLocalProjects(formattedMock);
      
      // Tự động chọn dự án đầu tiên nếu chưa chọn gì
      if (!selectedProject && formattedMock.length > 0) {
        setSelectedProject(formattedMock[0]);
      }
    } else {
      setLocalProjects(initialProjects);
    }
  }, [mockDataEnabled, initialProjects]);

  const resetForm = () => {
    setName(''); setLocation(''); setStartDate(''); setEndDate(''); setClientName(''); setContractorName('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Vui lòng nhập tên dự án trước khi thêm.');
      return;
    }
    setError('');

    if (mockDataEnabled) {
      const newProj = {
        id: Date.now(),
        name,
        location,
        startDate: startDate ? startDate.split('-').reverse().join('/') : 'Chưa cập nhật',
        endDate: endDate ? endDate.split('-').reverse().join('/') : 'Chưa cập nhật',
        clientName,
        contractorName,
        status: 'Hoạt động',
      };
      setLocalProjects((prev) => [newProj, ...prev]);
      setSelectedProject(newProj);
      resetForm();
      setActiveTab('quotes');
    } else {
      try {
        const created = await api.createProject({
          name,
          location,
          startDate,
          endDate,
          clientName,
          contractorName,
        });
        resetForm();
        if (refreshProjects) {
          await refreshProjects();
        }
        const normalizedCreated = {
          id: created.id || String(created.id),
          name: created.name,
          location: created.location,
          clientName: created.clientName || created.client_name || '',
          contractorName: created.contractorName || created.contractor_name || '',
          startDate: created.startDate || created.start_date || '',
          endDate: created.endDate || created.expected_completion_date || '',
          status: created.status || 'Hoạt động',
          raw: created,
        };
        setSelectedProject(normalizedCreated);
        setActiveTab('quotes');
      } catch (err: any) {
        setError(err.message || 'Lỗi khi khởi tạo dự án');
      }
    }
  };

  const handleDeleteConfirm = () => {
    if (!projectToDelete) return;
    setLocalProjects((prev) => prev.filter((p) => p.id !== projectToDelete.id));
    
    // Nếu dự án bị xóa đang được chọn, xóa trạng thái chọn ở Component cha
    if (selectedProject?.id === projectToDelete.id) {
      setSelectedProject(null);
    }
    setProjectToDelete(null);
  };

  const filteredAndSortedProjects = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    let result = term
      ? localProjects.filter(
          (p) =>
            p.name?.toLowerCase().includes(term) ||
            p.location?.toLowerCase().includes(term) ||
            p.clientName?.toLowerCase().includes(term)
        )
      : [...localProjects];

    if (sortBy === 'alphabet') {
      result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (sortBy === 'oldest') {
      result.sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));
    } else {
      result.sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));
    }
    return result;
  }, [localProjects, searchTerm, sortBy]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', position: 'relative' }}>
      
      {/* Khối Header */}
      <div>
        <h1 style={{ 
          fontSize: '2.4rem', 
          fontWeight: '800', 
          color: '#006241', 
          marginBottom: '6px',
          letterSpacing: '-0.16px'
        }}>
          Dự án Công trình
        </h1>
        <p style={{ fontSize: '1.3rem', color: 'rgba(0,0,0,0.58)', margin: 0 }}>
          Quản lý và thiết lập danh sách dự án. Dữ liệu chạy trực tiếp trên trình duyệt, sẵn sàng tích hợp xuất Excel.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '32px', alignItems: 'start' }}>
        
        {/* Khối bên trái */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Tìm kiếm & Bộ lọc */}
          <div style={{ ...panelStyle, display: 'flex', gap: '16px', padding: '16px 24px', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
              <Search size={16} color="#666666" style={{ position: 'absolute', left: '12px' }} />
              <input
                type="text"
                placeholder="Tìm theo tên dự án, địa điểm, chủ đầu tư..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ ...inputStyle, paddingLeft: '38px', fontSize: '1.3rem' }}
              />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #d6dbde', padding: '2px 12px', borderRadius: '8px', backgroundColor: '#ffffff' }}>
              <SlidersHorizontal size={14} color="#00754A" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                style={{
                  padding: '8px 0',
                  border: 'none',
                  background: 'transparent',
                  color: 'rgba(0,0,0,0.87)',
                  fontSize: '1.25rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="newest">Mới nhất</option>
                <option value="oldest">Cũ nhất</option>
                <option value="alphabet">Tên (A-Z)</option>
              </select>
            </div>
          </div>

          {/* Grid hiển thị danh sách các thẻ */}
          <div style={panelStyle}>
            <h2 style={{ fontSize: '1.6rem', fontWeight: '700', color: 'rgba(0,0,0,0.87)', marginBottom: '20px' }}>
              Danh sách đang quản lý ({filteredAndSortedProjects.length})
            </h2>

            {filteredAndSortedProjects.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(0,0,0,0.58)', fontSize: '1.3rem' }}>
                {searchTerm ? 'Không tìm thấy kết quả khớp.' : 'Chưa có dự án nào. Điền thông tin ở bảng bên phải để tạo mới.'}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                {filteredAndSortedProjects.map((proj) => (
                  <ProjectCard
                    key={proj.id}
                    proj={proj}
                    isSelected={selectedProject?.id === proj.id}
                    onSelect={() => setSelectedProject(proj)}
                    onDelete={() => setProjectToDelete(proj)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Khối Form tạo mới bên phải */}
        <div style={{ ...panelStyle, position: 'sticky', top: '100px' }}>
          <h2 style={{ fontSize: '1.6rem', fontWeight: '700', color: '#006241', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <LucideBriefcase size={18} /> Khởi tạo dự án mới
          </h2>
          
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Field label="Tên dự án *" placeholder="VD: Sửa chữa Văn phòng Tầng 3 - DPM" value={name} onChange={setName} required />
            {error && (
              <div style={{ fontSize: '1.15rem', color: '#c82014', marginTop: '-10px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
                <AlertTriangle size={12} /> {error}
              </div>
            )}

            <Field label="Địa điểm thi công" placeholder="VD: Tòa nhà DPM, TPHCM" value={location} onChange={setLocation} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Field label="Ngày bắt đầu" type="date" value={startDate} onChange={setStartDate} />
              <Field label="Ngày kết thúc" type="date" value={endDate} onChange={setEndDate} />
            </div>

            <div style={{ borderTop: '1px solid #edebe9', margin: '4px 0' }} />

            <Field label="Khách hàng (Bên A)" placeholder="VD: Công ty CP Phân bón Dầu khí" value={clientName} onChange={setClientName} />
            <Field label="Đơn vị Thi công (Bên B)" placeholder="VD: Nhà thầu Hòa Bình" value={contractorName} onChange={setContractorName} />

            <button 
              type="submit" 
              style={{ 
                width: '100%', 
                padding: '12px', 
                fontWeight: '700', 
                fontSize: '1.35rem',
                color: '#ffffff',
                backgroundColor: '#00754A', 
                border: 'none',
                borderRadius: '50px', 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                marginTop: '8px',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1E3932'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#00754A'}
              onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'} 
              onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <Plus size={16} /> Thêm vào danh sách tạm
            </button>
          </form>
        </div>
      </div>

      {/* Modal xác nhận xóa */}
      {projectToDelete && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000,
        }}>
          <div style={{ ...panelStyle, width: '420px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.6rem', fontWeight: '700', color: '#c82014', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={18} /> Gỡ bỏ công trình?
              </h3>
              <button onClick={() => setProjectToDelete(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 4 }}>
                <X size={18} color="#666666" />
              </button>
            </div>
            
            <p style={{ fontSize: '1.3rem', color: 'rgba(0,0,0,0.87)', margin: 0, lineHeight: 1.6 }}>
              Bạn có chắc chắn muốn loại bỏ dự án tạm thời <strong>"{projectToDelete.name}"</strong> khỏi phiên làm việc hiện tại không?
            </p>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '4px' }}>
              <button
                type="button"
                style={{ padding: '10px 18px', background: 'transparent', border: '1px solid #d6dbde', borderRadius: '50px', fontSize: '1.25rem', fontWeight: 600, cursor: 'pointer', color: '#666666' }}
                onClick={() => setProjectToDelete(null)}
              >
                Hủy lệnh
              </button>
              <button
                type="button"
                style={{ padding: '10px 18px', background: '#c82014', color: 'white', border: 'none', borderRadius: '50px', fontSize: '1.25rem', fontWeight: 600, cursor: 'pointer' }}
                onClick={handleDeleteConfirm}
                onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Component thẻ con
const ProjectCard: React.FC<{
  proj: any;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}> = ({ proj, isSelected, onSelect, onDelete }) => {
  const iconColor = '#00754A';

  return (
    <div
      style={{
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: '16px',
        borderRadius: '12px',
        border: isSelected ? '2px solid #00754A' : '1px solid #edebe9',
        background: isSelected ? 'rgba(0, 117, 74, 0.02)' : '#ffffff',
        boxShadow: isSelected ? '0 6px 24px rgba(0, 117, 74, 0.08)' : 'none',
        transition: 'all 0.25s ease',
      }}
    >
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '12px', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1E3932', margin: 0, lineHeight: 1.4, flex: 1 }}>
            {proj.name}
          </h3>
          <span style={{ 
            fontSize: '1.05rem', 
            fontWeight: '700', 
            backgroundColor: '#d4e9e2', 
            color: '#1E3932', 
            padding: '3px 8px', 
            borderRadius: '8px',
            whiteSpace: 'nowrap'
          }}>
            {proj.status}
          </span>
        </div>

        <div style={{ fontSize: '1.25rem', color: 'rgba(0,0,0,0.58)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <MapPin size={13} color={iconColor} />
            <span style={{ color: 'rgba(0,0,0,0.87)', fontWeight: 500 }}>{proj.location || 'Chưa cập nhật'}</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Calendar size={13} color={iconColor} />
            <span>{proj.startDate} → {proj.endDate}</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Building2 size={13} color={iconColor} />
            <span>Bên A: <strong style={{ color: 'rgba(0,0,0,0.87)' }}>{proj.clientName || 'Chưa cập nhật'}</strong></span>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <HardHat size={13} color={iconColor} />
            <span>Bên B: {proj.contractorName || 'Chưa cập nhật'}</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', borderTop: '1px solid #edebe9', paddingTop: '14px', alignItems: 'center' }}>
  <button
          style={{
            flex: 1,
            padding: '8px 16px',
            fontSize: '1.2rem',
            fontWeight: '700',
            borderRadius: '50px', 
            cursor: isSelected ? 'not-allowed' : 'pointer',
            backgroundColor: isSelected ? '#00754A' : 'transparent',
            color: isSelected ? '#ffffff' : '#00754A',
            border: isSelected ? 'none' : '1px solid #00754A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            transition: 'all 0.2s ease',
          }}
          onClick={onSelect}
          data-testid={"project-card"}
          disabled={isSelected}
        >
          {isSelected ? (
            <>
              <Check size={14} /> Đang chọn
            </>
          ) : (
            'Chọn làm việc'
          )}
        </button>

        <button
          type="button"
          style={{ 
            padding: '9px 12px', 
            borderRadius: '50%', 
            border: '1px solid rgba(239, 68, 68, 0.2)', 
            background: 'rgba(239, 68, 68, 0.06)', 
            color: '#ef4444', 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease'
          }}
          onClick={onDelete}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.06)'}
          onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.85)'}
          onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
          title="Xóa dự án"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
};