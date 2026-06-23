import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { ProjectsPage } from './pages/ProjectsPage';
import { QuotesPage } from './pages/QuotesPage';
import { ProgressPage } from './pages/ProgressPage';
import { PaymentPage } from './pages/PaymentPage';
import { ProfitAnalysisPage } from './pages/ProfitAnalysisPage';
import { api } from './services/api';
import { logger } from './services/logger';
import { mockProjects } from './services/mockData';

function App() {
  const [activeTab, setActiveTab] = useState('projects');
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mockDataEnabled, setMockDataEnabled] = useState(false);

  const loadProjects = async () => {
    try {
      const list = await api.getProjects();
      // Normalize incoming project objects to a stable shape used by the UI
      const normalized = (list || []).map((p: any) => ({
        id: p.id || p.projectId || p.code || String(p.contract_code || p.contractCode || p.contract_code || ''),
        name: p.name || p.project_name || p.title || '',
        location: p.location || p.address || p.location_name || '',
        clientName: p.client_name || p.clientName || p.client || '',
        contractorName: p.contractor_name || p.contractorName || p.contractor || '',
        startDate: p.start_date || p.startDate || p.start || '',
        endDate: p.expected_completion_date || p.endDate || p.end || '',
        contract_code: p.contract_code || p.contractCode || p.contract_code || '',
        status: p.status || 'unknown',
        raw: p
      }));
      setProjects(normalized);
      // Auto select first project if available and none selected yet
      if (normalized.length > 0 && !selectedProject) {
        setSelectedProject(normalized[0]);
      }
    } catch (err) {
      logger.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (mockDataEnabled) {
      // Normalize mock projects to same UI shape
      const formattedMock = mockProjects.map(p => ({
        id: p.id,
        name: p.name,
        location: p.location,
        clientName: p.client_name,
        contractorName: p.contractor_name,
        startDate: p.start_date || p.start_date || '',
        endDate: p.expected_completion_date || '',
        contract_code: p.contract_code || '',
        status: p.status || 'unknown',
        raw: p
      }));
      setProjects(formattedMock);
      setSelectedProject(formattedMock[0]);
    } else {
      loadProjects();
    }
  }, [mockDataEnabled]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-main)', color: 'white' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
          <span style={{ fontSize: '32px', animation: 'spin 2s linear infinite' }}>⚙️</span>
          <div>Đang khởi chạy hệ thống quản lý công trình T3...</div>
        </div>
      </div>
    );
  }

  // Active page selector
  const renderContent = () => {
    switch (activeTab) {
      case 'projects':
        return (
          <ProjectsPage
            projects={projects}
            selectedProject={selectedProject}
            setSelectedProject={setSelectedProject}
            refreshProjects={loadProjects}
            setActiveTab={setActiveTab}
            mockDataEnabled={mockDataEnabled}
          />
        );
      case 'quotes':
        return selectedProject ? <QuotesPage selectedProject={selectedProject} mockDataEnabled={mockDataEnabled} /> : null;
      case 'progress':
        return selectedProject ? <ProgressPage projectId={selectedProject.id} mockDataEnabled={mockDataEnabled} setActiveTab={setActiveTab} /> : null;
      case 'payments':
        return selectedProject ? <PaymentPage projectId={selectedProject.id} selectedProject={selectedProject} mockDataEnabled={mockDataEnabled} setActiveTab={setActiveTab} /> : null;
      case 'profit':
        return selectedProject ? <ProfitAnalysisPage projectId={selectedProject.id} mockDataEnabled={mockDataEnabled} /> : null;
      default:
        return <ProjectsPage projects={projects} selectedProject={selectedProject} setSelectedProject={setSelectedProject} refreshProjects={loadProjects} setActiveTab={setActiveTab} />;
    }
  };

  return (
    <Layout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      projects={projects}
      selectedProject={selectedProject}
      setSelectedProject={setSelectedProject}
      mockDataEnabled={mockDataEnabled}
      setMockDataEnabled={setMockDataEnabled}
    >
      {renderContent()}
    </Layout>
  );
}

export default App;
