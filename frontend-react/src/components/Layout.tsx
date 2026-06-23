import React, { useState } from 'react';
import { 
  LucideBriefcase,
  FileText, 
  TrendingUp, 
  CreditCard, 
  BarChart3, 
  FolderKanban, 
  MapPin, 
  RefreshCw, 
  Compass, 
  Calendar,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  projects: any[];
  selectedProject: any;
  setSelectedProject: (proj: any) => void;
  mockDataEnabled: boolean;
  setMockDataEnabled: (val: boolean) => void;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  activeTab,
  setActiveTab,
  projects,
  selectedProject,
  setSelectedProject,
  mockDataEnabled,
  setMockDataEnabled,
}) => {
  const [frapMenuOpen, setFrapMenuOpen] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);

  // Thay thế emoji bằng Lucide Icons đồng bộ hệ thống
  const tabs = [
    { id: 'projects', label: 'Quản lý dự án', icon: <FolderKanban size={18} /> },
    { id: 'quotes', label: 'Báo giá dự án', icon: <FileText size={18} /> },
    { id: 'progress', label: 'Theo dõi tiến độ thi công', icon: <TrendingUp size={18} /> },
    { id: 'payments', label: 'Nghiệm thu & hồ sơ đề nghị thanh toán', icon: <CreditCard size={18} /> },
    { id: 'profit', label: 'Phân tích lợi nhuận', icon: <BarChart3 size={18} /> },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-main)' }}>
      
      {/* SIDEBAR - Starbucks House Green [#1E3932] */}
      <aside style={{
        width: '280px',
        backgroundColor: '#1E3932', // Ép cứng màu House Green đặc trưng
        borderRight: '1px solid rgba(255, 255, 255, 0.06)',
        padding: '28px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '28px',
        position: 'fixed',
        top: 0,
        bottom: 0,
        left: 0,
        zIndex: 100
      }}>
        {/* Brand/Logo - Lander Tall serif fallback */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', paddingLeft: '8px' }}>
          <div style={{ backgroundColor: '#00754A', padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LucideBriefcase size={22} color="#ffffff" />
          </div>
          <div>
            <h2 style={{ 
              fontSize: '1.8rem', 
              fontWeight: '800', 
              fontFamily: 'var(--font-serif)', 
              color: '#ffffff', 
              letterSpacing: '-0.01em', // Negative tracking tự tin
              margin: 0 
            }}>
              T3 Engine
            </h2>
            <span style={{ fontSize: '1.1rem', color: 'rgba(255, 255, 255, 0.65)', fontWeight: 400 }}>Quản lý Công trình Excel</span>
          </div>
        </div>

        {/* Global Project Selector - Thẻ Card bo góc 12px rỗng mờ */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '8px', 
          padding: '16px', 
          background: 'rgba(255, 255, 255, 0.03)', 
          borderRadius: '12px', 
          border: '1px solid rgba(255, 255, 255, 0.08)' 
        }}>
          <label style={{ 
            fontSize: '1.0rem', 
            fontWeight: '700', 
            color: 'rgba(255, 255, 255, 0.6)', 
            textTransform: 'uppercase', 
            letterSpacing: '0.8px' 
          }}>
            Dự án đang chọn
          </label>
          <select 
            value={selectedProject ? selectedProject.id : ''} 
            onChange={(e) => {
              const proj = projects.find(p => p.id === Number(e.target.value) || p.id === e.target.value);
              setSelectedProject(proj || null);
            }}
            style={{ 
              width: '100%', 
              padding: '10px 12px', 
              borderRadius: '8px', 
              background: 'rgba(255, 255, 255, 0.06)', 
              border: '1px solid rgba(255, 255, 255, 0.12)', 
              color: '#ffffff', 
              fontSize: '1.25rem',
              cursor: 'pointer', 
              outline: 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <option value="" style={{ background: '#1E3932', color: 'white' }}>-- Chọn dự án master --</option>
            {projects.map(p => (
              <option key={p.id} value={p.id} style={{ background: '#1E3932', color: 'white' }}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Navigation Menu */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            const isDisabled = tab.id !== 'projects' && !selectedProject;
            
            return (
              <button
                key={tab.id}
                disabled={isDisabled}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '1.3rem',
                  fontWeight: isActive ? '600' : '500',
                  color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.75)',
                  backgroundColor: isActive ? '#00754A' : 'transparent', // Nút chính chuẩn Green Accent
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  opacity: isDisabled ? 0.4 : 1,
                  textAlign: 'left',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
                onMouseEnter={(e) => {
                  if (!isActive && !isDisabled) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', color: isActive ? '#ffffff' : 'rgba(255,255,255,0.6)' }}>
                  {tab.icon}
                </span>
                <span style={{ letterSpacing: '-0.1px' }}>{tab.label}</span>
              </button>
            );
          })}
        </nav>
        
        {/* Footer Sidebar */}
        <div style={{ marginTop: 'auto', paddingLeft: '8px', fontSize: '1.1rem', color: 'rgba(255, 255, 255, 0.4)' }}>
          <div style={{ fontWeight: '500' }}>T3 Engine v1.0</div>
          <div style={{ fontStyle: 'italic', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#00754A' }}></span>
            Đồng bộ Excel Master 100%
          </div>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <div style={{ flex: 1, marginLeft: '280px', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        
        {/* HEADER - Starbucks Ceramic/White shadow combo */}
        <header style={{
          height: '75px',
          backgroundColor: '#ffffff', // Đổi header sang nền trắng để phân tách khối
          borderBottom: '1px solid #edebe9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 40px',
          position: 'sticky',
          top: 0,
          zIndex: 90,
          // Đổ bóng siêu mịn đa tầng đúng cấu trúc Design System
          boxShadow: '0 0 0.5px rgba(0,0,0,0.14), 0 1px 2px rgba(0,0,0,0.08)'
        }}>
          {selectedProject ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ 
                backgroundColor: '#d4e9e2', // Xanh mint nhạt dịu mắt
                color: '#1E3932', 
                fontSize: '1.1rem', 
                fontWeight: '700', 
                padding: '4px 12px', 
                borderRadius: '12px',
                letterSpacing: '0.2px'
              }}>
                ĐANG CHẠY
              </span>
              <div>
                <h3 style={{ fontSize: '1.6rem', fontWeight: '700', color: '#222222', margin: 0, letterSpacing: '-0.2px' }}>
                  {selectedProject.name}
                </h3>
                <span style={{ fontSize: '1.2rem', color: '#666666', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                  <MapPin size={13} color="#00754A" /> {selectedProject.location}
                </span>
              </div>
            </div>
          ) : (
            <div style={{ color: '#cba258', fontSize: '1.35rem', fontWeight: '600', fontFamily: 'var(--font-serif)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Compass size={18} /> Vui lòng chọn hoặc tạo dự án mới ở cột bên trái để tiếp tục.
            </div>
          )}
          
          {/* Header Utilities */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <button 
              onClick={() => setMockDataEnabled(!mockDataEnabled)}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                cursor: 'pointer', 
                background: mockDataEnabled ? '#d4e9e2' : '#f4f4f4', 
                padding: '8px 16px', 
                borderRadius: '20px', 
                border: mockDataEnabled ? '1px solid #00754A' : '1px solid #e0e0e0',
                transition: 'all 0.2s ease',
                outline: 'none'
              }}
            >
              {mockDataEnabled ? (
                <ToggleRight size={20} color="#00754A" />
              ) : (
                <ToggleLeft size={20} color="#666666" />
              )}
              <span style={{ 
                fontSize: '1.2rem', 
                fontWeight: '600', 
                color: mockDataEnabled ? '#1E3932' : '#444444' 
              }}>
                Mock Data
              </span>
            </button>
            <span style={{ fontSize: '1.25rem', color: '#666666', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '500' }}>
              <Calendar size={15} color="#00754A" /> {new Date().toLocaleDateString('vi-VN')}
            </span>
            <button
              onClick={() => setDebugOpen(!debugOpen)}
              title="Toggle debug panel"
              style={{
                padding: '6px 10px',
                borderRadius: '8px',
                background: debugOpen ? '#ffe' : '#f4f4f4',
                border: '1px solid #e0e0e0',
                cursor: 'pointer'
              }}
            >
              Debug
            </button>
          </div>
        </header>

        {/* On-screen debug panel */}
        {debugOpen && (
          <div style={{ position: 'fixed', top: '90px', right: '24px', width: '420px', maxHeight: '60vh', overflow: 'auto', background: '#0f1724', color: '#e6eef5', padding: '12px', borderRadius: '8px', zIndex: 999 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <strong style={{ fontSize: '1rem' }}>DEBUG: selectedProject</strong>
              <button onClick={() => setDebugOpen(false)} style={{ background: 'transparent', border: 'none', color: '#e6eef5', cursor: 'pointer' }}>✖</button>
            </div>
            <div style={{ fontSize: '0.95rem', marginBottom: '8px' }}>
              <div><strong>computedProjectId:</strong> {selectedProject ? (selectedProject.id ?? selectedProject.raw?.id ?? selectedProject.contract_code ?? selectedProject.raw?.contract_code ?? '(none)') : '(none)'}</div>
              <div style={{ marginTop: '8px' }}><strong>projects.length:</strong> {projects?.length ?? 0}</div>
            </div>
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.82rem', lineHeight: '1.2', background: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: '6px' }}>{selectedProject ? JSON.stringify(selectedProject, null, 2) : 'null'}</pre>
          </div>
        )}

        {/* CONTENT AREA */}
        <main style={{ padding: '40px', flex: 1, backgroundColor: '#f2f0eb' }}> {/* Canvas nền kem ấm */}
          {children}
        </main>
      </div>

      {/* FLOATING FRAP BUTTON - Định vị chiều sâu */}
      <div className="frap-container" style={{ position: 'fixed', bottom: '32px', right: '32px', zIndex: 1000 }}>
        {frapMenuOpen && (
          <div className="frap-menu" style={{
            position: 'absolute',
            bottom: '65px',
            right: 0,
            width: '240px',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.04)',
            border: '1px solid #edebe9',
            padding: '8px 0',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <button 
              className="frap-menu-item" 
              onClick={() => { setMockDataEnabled(!mockDataEnabled); setFrapMenuOpen(false); }}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 16px', border: 'none', background: 'transparent', textAlign: 'left', fontSize: '1.2rem', cursor: 'pointer', color: '#222222' }}
            >
              <RefreshCw size={14} />
              <span>{mockDataEnabled ? 'Tắt Mock Data' : 'Bật Mock Data'}</span>
            </button>
            <button 
              className="frap-menu-item" 
              onClick={() => { window.location.reload(); }}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 16px', border: 'none', background: 'transparent', textAlign: 'left', fontSize: '1.2rem', cursor: 'pointer', color: '#222222' }}
            >
              <RefreshCw size={14} />
              <span>Tải lại dữ liệu</span>
            </button>
            {selectedProject && (
              <button 
                className="frap-menu-item" 
                onClick={() => {
                  setActiveTab('quotes');
                  setFrapMenuOpen(false);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 16px', border: 'none', background: 'transparent', textAlign: 'left', fontSize: '1.2rem', cursor: 'pointer', color: '#222222' }}
              >
                <FileText size={14} />
                <span>Xem báo giá dự án</span>
              </button>
            )}
            <div style={{ padding: '8px 16px', fontSize: '1.05rem', color: '#888888', fontStyle: 'italic', borderTop: '1px solid #edebe9', marginTop: '6px' }}>
              Have a nice day!
            </div>
          </div>
        )}
        <button 
          className="frap-btn" 
          onClick={() => setFrapMenuOpen(!frapMenuOpen)}
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            backgroundColor: '#006241',
            color: '#ffffff',
            border: 'none',
            fontSize: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 10px rgba(0,98,65,0.3)',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#00754A'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#006241'}
        >
          ☕
        </button>
      </div>
    </div>
  );
};