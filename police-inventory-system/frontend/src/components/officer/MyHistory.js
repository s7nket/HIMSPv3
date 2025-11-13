import React, { useState, useEffect } from 'react';
import { officerAPI } from '../../utils/api';
import { toast } from 'react-toastify';

// Helper function to format date/time
const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString('en-IN');
};

// Calculates the duration of use
const calculateDuration = (issuedDate, returnedDate) => {
  if (!returnedDate) return 'Pending Return';
  
  const issued = new Date(issuedDate);
  const returned = new Date(returnedDate);
  
  let diffMs = returned.getTime() - issued.getTime();
  let diffMins = Math.round(diffMs / 60000); // ms to minutes
  
  if (diffMins < 60) {
    return `${diffMins} minutes`;
  }
  
  let diffHours = (diffMins / 60).toFixed(1);
  if (diffHours < 24) {
    return `${diffHours} hours`;
  }
  
  let diffDays = (diffHours / 24).toFixed(1);
  if (diffDays < 7) {
    return `${diffDays} days`;
  }
  
  let diffWeeks = (diffDays / 7).toFixed(1);
  return `${diffWeeks} weeks`;
};

// Helper function to create the date range for the header
const formatDateRange = (entry) => {
  const issued = new Date(entry.issuedDate).toLocaleDateString('en-IN');
  const returned = entry.returnedDate 
    ? new Date(entry.returnedDate).toLocaleDateString('en-IN') 
    : 'Present';
  return `${issued} – ${returned}`;
};

const MyHistory = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null); 

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const response = await officerAPI.getMyHistory();
      if (response.data.success) {
        setHistory(response.data.data.history);
      }
    } catch (error) {
      toast.error('Failed to fetch equipment history');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // Inline styles to match the grid layout from ViewInventory/ReturnEquipment
  const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' };
  const itemStyle = { fontSize: '14px', color: 'var(--text-secondary)' };
  const labelStyle = { display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-light)', textTransform: 'uppercase', marginBottom: '4px' };
  const valueStyle = { color: 'var(--text-primary)', fontWeight: '500' };
  const subHeaderStyle = { fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '12px', marginTop: '8px' };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading your history...</p>
      </div>
    );
  }

  return (
    <div className="my-history">
      <div className="management-header">
        <div>
            <h3>My Equipment History</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
                A complete log of all equipment items you have used.
            </p>
        </div>
      </div>

      {history.length === 0 ? (
        <div className="no-data">
          <h3>No History Found</h3>
          <p>You have no equipment usage history on file.</p>
        </div>
      ) : (
        <div className="requests-list"> {/* Reusing the list class from OfficerDashboard.css */}
          {history.map((entry) => {
            const isExpanded = expandedId === entry._id;
            const isCompleted = entry.status === 'Completed';

            return (
              // Reusing 'request-card' class gives us the white box, shadow, and border
              <div key={entry.recordId || entry._id} className="request-card" style={{ transition: 'all 0.2s ease' }}>
                
                {/* --- HEADER (Always Visible) --- */}
                {/* Added cursor pointer and hover effect inline */}
                <div 
                  className="request-header" 
                  onClick={() => handleToggle(entry._id)}
                  style={{ 
                    cursor: 'pointer', 
                    borderBottom: isExpanded ? '1px solid var(--border-color)' : 'none',
                    background: isExpanded ? 'var(--bg-hover)' : 'var(--bg-table-header)'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div className="request-id" style={{ fontSize: '16px', marginBottom: '4px' }}>
                      {entry.equipmentPoolName}
                    </div>
                    <span style={{ fontSize: '13px', color: 'var(--text-light)' }}>
                       ID: {entry.itemUniqueId} • {formatDateRange(entry)}
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className={`badge badge-${isCompleted ? 'success' : 'warning'}`}>
                        {isCompleted ? 'Returned' : 'In Possession'}
                    </span>
                    {/* Simple Chevron Icon */}
                    <span style={{ color: 'var(--text-light)', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                      ▼
                    </span>
                  </div>
                </div>
                
                {/* --- DETAILS (Expandable) --- */}
                {isExpanded && (
                  <div className="request-details" style={{ animation: 'fadeIn 0.3s ease' }}>
                    
                    <h5 style={subHeaderStyle}>Context & Condition</h5>
                    <div style={gridStyle}>
                      <div style={itemStyle}>
                        <span style={labelStyle}>Reason for Issue</span>
                        <span style={valueStyle}>{entry.purpose}</span>
                      </div>
                      <div style={itemStyle}>
                        <span style={labelStyle}>Condition Issued</span>
                        <span style={valueStyle}>{entry.conditionAtIssue}</span>
                      </div>
                      
                      {isCompleted && (
                        <>
                          <div style={itemStyle}>
                            <span style={labelStyle}>Return Remarks</span>
                            <span style={valueStyle}>{entry.remarks || 'N/A'}</span>
                          </div>
                          <div style={itemStyle}>
                            <span style={labelStyle}>Condition Returned</span>
                            <span style={valueStyle}>{entry.conditionAtReturn || 'N/A'}</span>
                          </div>
                        </>
                      )}
                    </div>

                    <h5 style={subHeaderStyle}>Timeline & Custody</h5>
                    <div style={gridStyle}>
                      <div style={itemStyle}>
                        <span style={labelStyle}>Requested</span>
                        <span style={valueStyle}>{formatDateTime(entry.requestDate)}</span>
                      </div>
                      <div style={itemStyle}>
                        <span style={labelStyle}>Issued By</span>
                        <span style={valueStyle}>{entry.issuedBy?.fullName || 'N/A'}</span>
                      </div>
                      <div style={itemStyle}>
                        <span style={labelStyle}>Approved On</span>
                        <span style={valueStyle}>{formatDateTime(entry.issuedDate)}</span>
                      </div>
                      <div style={itemStyle}>
                        <span style={labelStyle}>Returned On</span>
                        <span style={valueStyle}>{formatDateTime(entry.returnedDate)}</span>
                      </div>
                      <div style={itemStyle}>
                        <span style={labelStyle}>Received By</span>
                        <span style={valueStyle}>{entry.returnedTo?.fullName || 'N/A'}</span>
                      </div>
                      <div style={itemStyle}>
                        <span style={labelStyle}>Total Duration</span>
                        <span style={{...valueStyle, color: 'var(--color-primary)'}}>{calculateDuration(entry.issuedDate, entry.returnedDate)}</span>
                      </div>
                    </div>
                    
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyHistory;