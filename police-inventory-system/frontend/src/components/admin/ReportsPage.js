import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../utils/api';
import { toast } from 'react-toastify';

const ReportsPage = () => {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // ======== 🟢 1. GET TODAY'S DATE FOR VALIDATION 🟢 ========
  const today = new Date().toISOString().split('T')[0];

  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: today
  });

  useEffect(() => {
    fetchReports();
  }, []); // Only fetch on initial load

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getReports(dateRange);

      if (response.data.success) {
        setReportData(response.data.data);
      }
    } catch (error) {
      toast.error('Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (e) => {
    setDateRange({
      ...dateRange,
      [e.target.name]: e.target.value
    });
  };

  const handleGenerateReport = () => {
    fetchReports();
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading reports...</p>
      </div>
    );
  }

  return (
    <div className="um-container">
      <div className="um-header">
        <h2>Reports</h2>
      </div>

      <div className="um-controls" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '16px' }}>
          <div className="um-form-group" style={{ marginBottom: 0 }}>
            <label className="um-form-label">Start Date</label>
            <input
              type="date"
              name="startDate"
              value={dateRange.startDate}
              onChange={handleDateChange}
              className="form-control"
              // ======== 🟢 2. ADDED VALIDATION 🟢 ========
              max={dateRange.endDate || today} // Cannot be after end date or today
            />
          </div>
          <div className="um-form-group" style={{ marginBottom: 0 }}>
            <label className="um-form-label">End Date</label>
            <input
              type="date"
              name="endDate"
              value={dateRange.endDate}
              onChange={handleDateChange}
              className="form-control"
              // ======== 🟢 3. ADDED VALIDATION 🟢 ========
              min={dateRange.startDate} // Cannot be before start date
              max={today} // Cannot be in the future
            />
          </div>
        </div>
        <button
          onClick={handleGenerateReport}
          className="btn btn-primary"
          style={{ alignSelf: 'flex-end' }}
        >
          Generate Report
        </button>
      </div>

      {reportData && (
        <div className="um-modal-form"> {/* Re-using modal form padding */}
          <div className="um-form-section">
            <h3>Requests Summary</h3>
            <div className="um-stats-grid">
              {reportData.requestsSummary.map((item) => (
                <div key={item._id} className="um-stat-item">
                  <span>{item._id}</span>
                  <strong>{item.count}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="um-form-section">
            <h3>Equipment Status</h3>
            <div className="um-stats-grid">
              {reportData.equipmentSummary.map((item) => (
                <div key={item._id} className={`um-stat-item ${
                  item._id === 'Available' ? 'success' :
                  item._id === 'Issued' ? 'warn' :
                  item._id === 'Lost' ? 'danger' : 'gray'
                }`}>
                  <span>{item._id}</span>
                  <strong>{item.count}</strong>
                </div>
              ))}
            </div>
          </div>

          {/* "Top Active Officers" section is now removed */}

          <div className="um-form-section">
            <p style={{ textAlign: 'center', color: '#5c5c5c', margin: 0 }}>
              Report generated for period: 
              <strong> {new Date(reportData.dateRange.startDate).toLocaleDateString()}</strong> to 
              <strong> {new Date(reportData.dateRange.endDate).toLocaleDateString()}</strong>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsPage;