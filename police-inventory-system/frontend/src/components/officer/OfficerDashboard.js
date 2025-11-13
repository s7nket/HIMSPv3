import React, { useState, useEffect } from 'react';
import Navigation from '../common/Navigation';
import RequestEquipment from './RequestEquipment';
import ViewInventory from './ViewInventory';
import ReturnEquipment from './ReturnEquipment';
import MyHistory from './MyHistory';
import { officerAPI } from '../../utils/api';
import { toast } from 'react-toastify';
import './OfficerDashboard.css';

const OfficerDashboard = () => {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  const sections = [
    'dashboard',
    'requestEquipment',
    'viewInventory',
    'returnEquipment',
    'myRequests',
    'myHistory'
  ];

  useEffect(() => {
    if (activeSection === 'dashboard') {
      fetchDashboardData();
    }
  }, [activeSection]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await officerAPI.getDashboard();
      if (response.data.success) {
        setDashboardData(response.data.data);
      }
    } catch (error) {
      toast.error('Failed to fetch dashboard data');
      console.error('Dashboard fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderMainContent = () => {
    if (loading && activeSection === 'dashboard') {
      return (
        <div className="loading-state">
          <div className="spinner-large"></div>
          <p>Loading dashboard...</p>
        </div>
      );
    }

    switch (activeSection) {
      case 'dashboard':
        return <OfficerDashboardStats stats={dashboardData?.stats} recentActivity={dashboardData?.recentActivity} />;
      case 'requestEquipment':
        return <RequestEquipment onRequestSubmitted={fetchDashboardData} />;
      case 'viewInventory':
        return <ViewInventory />;
      case 'returnEquipment':
        return <ReturnEquipment onEquipmentReturned={fetchDashboardData} />;
      case 'myRequests':
        return <MyRequests />;
      case 'myHistory':
        return <MyHistory />;
      default:
        return <OfficerDashboardStats stats={dashboardData?.stats} recentActivity={dashboardData?.recentActivity} />;
    }
  };

  return (
    <div className="officer-dashboard">
      <Navigation 
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        sections={sections}
      />
      <div className="main-content">
        <div className="content-header">
          <h1>{formatSectionTitle(activeSection)}</h1>
        </div>
        <div className="content-body">
          {renderMainContent()}
        </div>
      </div>
    </div>
  );
};

const OfficerDashboardStats = ({ stats, recentActivity }) => {
  if (!stats) return null;

  return (
    <div className="dashboard-overview">
      <div className="stats-grid">
        <StatCard
          icon="📋"
          title="My Requests"
          value={stats.myRequests}
          subtitle={`${stats.pendingRequests} pending`}
          color="blue"
          urgent={stats.pendingRequests > 5}
        />
        <StatCard
          icon="🔧"
          title="Issued to Me"
          value={stats.myIssuedEquipment}
          subtitle="Currently in possession"
          color="purple"
        />
        <StatCard
          icon="✅"
          title="Available Pools"
          value={stats.availableEquipment}
          subtitle="Ready to request"
          color="green"
        />
      </div>

      {recentActivity && recentActivity.length > 0 && (
        <div className="dashboard-card">
          <h3>Recent Activity</h3>
          <div className="recent-activity">
            {recentActivity.map((request) => (
              <div key={request._id} className="activity-item">
                <div className="activity-info">
                  <div className="activity-title">
                    {request.poolId?.poolName || 'Request'}
                  </div>
                  <div className="activity-meta">
                    {request.requestType} • {new Date(request.createdAt).toLocaleString()}
                  </div>
                </div>
                <div className="activity-status">
                  <span className={`status-badge status-${request.status.toLowerCase()}`}>
                    {request.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const MyRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState(null);

  useEffect(() => {
    fetchRequests();
  }, [currentPage]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await officerAPI.getRequests({
        page: currentPage,
        limit: 10
      });

      if (response.data.success) {
        setRequests(response.data.data.requests);
        setTotalPages(response.data.data.pagination.pages);
      }
    } catch (error) {
      toast.error('Failed to fetch requests');
      console.error('Fetch requests error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRequestClick = (requestId) => {
    setSelectedRequestId(requestId);
    setShowCancelModal(true);
  };

  const confirmCancelRequest = async () => {
    try {
      await officerAPI.cancelRequest(selectedRequestId);
      toast.success('Request cancelled successfully');
      fetchRequests();
      setShowCancelModal(false);
      setSelectedRequestId(null);
    } catch (error) {
      toast.error('Failed to cancel request');
    }
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner-large"></div>
        <p>Loading requests...</p>
      </div>
    );
  }

  return (
    <>
      <div className="my-requests">
        {requests.length === 0 ? (
          <div className="no-data">
            <h3>No Requests Found</h3>
            <p>You haven't made any equipment requests yet.</p>
          </div>
        ) : (
          <>
            <div className="requests-list">
              {requests.map((request) => (
                <div key={request._id} className="request-card">
                  <div className="request-header">
                    <div className="request-id">{request.requestId || `REQ-${request._id.substring(0, 6)}`}</div>
                    <span className={`status-badge status-${request.status.toLowerCase()}`}>
                      {request.status}
                    </span>
                  </div>

                  <div className="request-details">
                    <h4>{request.poolId?.poolName || 'Equipment Request'}</h4>
                    <p className="request-meta">
                      {request.poolId?.model} • {request.requestType} • {new Date(request.createdAt).toLocaleString()}
                    </p>
                    <p className="request-reason" style={{ marginTop: '8px', color: 'var(--text-secondary)' }}>"{request.reason}"</p>
                  </div>

                  {request.status === 'Pending' && (
                    <div className="request-actions">
                      <button
                        onClick={() => handleCancelRequestClick(request._id)}
                        className="btn btn-danger btn-sm"
                      >
                        Cancel Request
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="pagination">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="btn btn-secondary"
                >
                  Previous
                </button>
                <span>Page {currentPage} of {totalPages}</span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="btn btn-secondary"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {showCancelModal && (
        <CancelConfirmationModal
          onConfirm={confirmCancelRequest}
          onCancel={() => {
            setShowCancelModal(false);
            setSelectedRequestId(null);
          }}
        />
      )}
    </>
  );
};

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
    dashboard: 'Officer Dashboard',
    requestEquipment: 'Request Equipment',
    viewInventory: 'Equipment Inventory',
    returnEquipment: 'Return Equipment',
    myRequests: 'My Requests',
    myHistory: 'My Equipment History'
  };
  return titles[section] || section;
};

const CancelConfirmationModal = ({ onConfirm, onCancel }) => {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Cancel Request</h3>
          <button onClick={onCancel} className="close-btn">&times;</button>
        </div>
        <div className="modal-body">
          <p>Are you sure you want to cancel this request? This action cannot be undone.</p>
        </div>
        <div className="modal-footer">
          <button onClick={onCancel} className="btn btn-secondary">
            No, Keep It
          </button>
          <button onClick={onConfirm} className="btn btn-danger">
            Yes, Cancel Request
          </button>
        </div>
      </div>
    </div>
  );
};

export default OfficerDashboard;