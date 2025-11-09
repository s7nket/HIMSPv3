import React, { useState, useEffect } from 'react';
import Navigation from '../common/Navigation';
import { useAuth } from '../../context/AuthContext';
import UserManagement from './UserManagement';
import EquipmentManagement from './EquipmentManagement';
import ProcessRequests from './ProcessRequests';
import ReportsPage from './ReportsPage';
import MaintenanceLog from './MaintenanceLog'; // 🟢 ADDED THIS IMPORT
import { adminAPI } from '../../utils/api';
import { toast } from 'react-toastify';
// UI/UX Enhancement: The CSS file is the primary source of the new design.
import './AdminDashboard.css';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  const sections = [
    'dashboard',
    'userManagement',
    'equipmentManagement',
    'processRequests',
    'reports',
    'maintenanceLog' // 🟢 ADDED THIS
  ];

  useEffect(() => {
    console.log('AdminDashboard rendered. User role:', user?.role);
    if (activeSection === 'dashboard') {
      fetchDashboardData();
    }
  }, [activeSection, user]);

  const fetchDashboardData = async () => {
    /* UI/UX Enhancement: The 'loading' state is now styled 
      globally via .loading-state in AdminDashboard.css.
      Toast notifications are also styled via the new theme.
    */
    try {
      setLoading(true);
      const response = await adminAPI.getDashboard();
      if (response.data.success) {
        setDashboardData(response.data.data);
      }
    } catch (error) {
      toast.error('Failed to fetch dashboard data');
      console.error('Dashboard fetch error:', error);
      console.error('Full Error Object:', error.response || error.message || error);
    } finally {
      setLoading(false);
    }
  };

  const renderMainContent = () => {
    if (loading && activeSection === 'dashboard') {
      return (
        /* UI/UX Enhancement: This component is now styled by .loading-state */
        <div className="loading-state">
          <div className="spinner-large"></div>
          <p>Loading dashboard...</p>
        </div>
      );
    }

    switch (activeSection) {
      case 'dashboard':
        return <DashboardStats data={dashboardData} />;
      case 'userManagement':
        return <UserManagement />;
      case 'equipmentManagement':
        return <EquipmentManagement />;
      case 'processRequests':
        return <ProcessRequests />;
      case 'reports':
        return <ReportsPage />;
      // ======== 🟢 ADDED THIS CASE 🟢 ========
      case 'maintenanceLog':
        return <MaintenanceLog />;
      default:
        return <DashboardStats data={dashboardData} />;
    }
  };

  if (user && user.role !== 'admin') {
    // ... (access denied logic is unchanged)
  }

  return (
    <div className="admin-dashboard">
      <Navigation
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        sections={sections}
      />

      <div className="main-content">
        <div className="content-header">
          {/* UI/UX Enhancement: Header is styled by .content-header in CSS */}
          <h1>{formatSectionTitle(activeSection)}</h1>
        </div>

        <div className="content-body">
          {renderMainContent()}
        </div>
      </div>
    </div>
  );
};

// ... (DashboardStats component is unchanged) ...
const DashboardStats = ({ data }) => {
  if (!data) return null;
  const pendingRequestsValue = typeof data.stats.pendingRequests === 'object' && data.stats.pendingRequests !== null
    ? 1
    : data.stats.pendingRequests;
  const isUrgent = typeof pendingRequestsValue === 'number' ? pendingRequestsValue > 10 : false;

  return (
    <div className="dashboard-overview">
      <div className="stats-grid">
        <StatCard
          icon="👥"
          title="Total Users"
          value={data.stats.totalUsers}
          subtitle={`${data.stats.totalOfficers} officers`}
          color="blue"
        />
        <StatCard
          icon="🛡️"
          title="Total Equipment"
          value={data.stats.totalEquipment}
          subtitle={`${data.stats.availableEquipment} available`}
          color="green"
        />
        <StatCard
          icon="⏳"
          title="Pending Requests"
          value={pendingRequestsValue}
          subtitle={`${data.stats.requestsThisMonth} this month`}
          color="orange"
          urgent={isUrgent}
        />
        <StatCard
          icon="📤"
          title="Issued Equipment"
          value={data.stats.issuedEquipment}
          subtitle="Currently in use"
          color="primary"
        />
      </div>
      <div className="dashboard-sections">
        {data.equipmentCategories && data.equipmentCategories.length > 0 && (
          <div className="dashboard-card">
            <h3>Equipment Categories</h3>
            <div className="category-grid">
              {data.equipmentCategories.map((category) => (
                <div key={category._id} className="category-item">
                  <span className="category-name">{category._id}</span>
                  <span className="category-count">{category.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {data.recentRequests && data.recentRequests.length > 0 && (
          <div className="dashboard-card">
            <h3>Recent Requests</h3>
            <div className="recent-requests">
              {data.recentRequests.map((request) => (
                <div key={request._id} className="request-item">
                  <div className="request-info">
                    <div className="request-title">
                      {request.equipmentId?.name || request.poolId?.poolName}
                    </div>
                    <div className="request-meta">
                      {request.requestedBy?.fullName} • {request.requestType}
                    </div>
                  </div>
                  <div className="request-status">
                    <span className={`status-badge status-${request.status.toLowerCase()}`}>
                      {request.status}
                    </span>
                    <span className="request-date">
                      {new Date(request.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


// ... (StatCard component is unchanged) ...
const StatCard = ({ icon, title, value, subtitle, color, urgent }) => (
  <div className={`stat-card ${color} ${urgent ? 'urgent' : ''}`}>
    <div className="stat-icon">{icon}</div>
    <div className="stat-content">
      <div className="stat-value">{value}</div>
      <div className="stat-title">{title}</div>
      <div className="stat-subtitle">{subtitle}</div>
    </div>
  </div>
);


const formatSectionTitle = (section) => {
  const titles = {
    dashboard: 'Dashboard Overview',
    userManagement: 'User Management',
    equipmentManagement: 'Equipment Management',
    processRequests: 'Process Requests',
    reports: 'Reports & Analytics',
    maintenanceLog: 'Maintenance Log' // 🟢 ADDED THIS
  };
  return titles[section] || section;
};

export default AdminDashboard;