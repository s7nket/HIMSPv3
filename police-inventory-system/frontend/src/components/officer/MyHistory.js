import React, { useState, useEffect } from 'react';
import { officerAPI } from '../../utils/api';
import { toast } from 'react-toastify';

// Helper function to format date/time
const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString('en-IN'); // Indian-English locale
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

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading your history...</p>
      </div>
    );
  }

  return (
    <div className="my-history">
      <div className="inventory-header">
        <h3>My Equipment Usage History</h3>
        <p>A complete log of all equipment items you have used.</p>
      </div>

      {history.length === 0 ? (
        <div className="no-data">
          <p>You have no equipment usage history on file.</p>
        </div>
      ) : (
        <div className="history-list">
          {history.map((entry) => {
            const isExpanded = expandedId === entry._id;
            return (
              <div key={entry.recordId || entry._id} className="history-item">
                
                {/* --- COLLAPSED HEADER --- */}
                <div 
                  className={`history-item-header ${isExpanded ? 'expanded' : ''}`}
                  onClick={() => handleToggle(entry._id)}
                >
                  <div className="history-header-left">
                    <span className="history-item-title">
                      {entry.equipmentPoolName} ({entry.itemUniqueId})
                    </span>
                    <span className="history-item-daterange">
                      {formatDateRange(entry)}
                    </span>
                  </div>
                  <span className={`badge badge-${entry.status === 'Completed' ? 'success' : 'warning'}`}>
                    {entry.status}
                  </span>
                </div>
                
                {/* --- EXPANDED DETAILS --- */}
                {isExpanded && (
                  <div className="history-item-details">
                    
                    <h5 className="detail-subheader">Context & Condition</h5>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <strong>Reason for Issue:</strong> {entry.purpose}
                      </div>
                      <div className="detail-item">
                        <strong>Condition at Issue:</strong> {entry.conditionAtIssue}
                      </div>
                      
                      {/* ======== 🟢 MODIFIED THIS BLOCK 🟢 ======== */}
                      {/* Only show these fields if the item was returned/completed */}
                      {entry.status === 'Completed' && (
                        <>
                          <div className="detail-item">
                            <strong>Reason for Return:</strong> {entry.remarks || 'N/A'}
                          </div>
                          <div className="detail-item">
                            <strong>Condition at Return:</strong> {entry.conditionAtReturn || 'N/A'}
                          </div>
                        </>
                      )}
                    </div>

                    <h5 className="detail-subheader">Timeline & Chain of Custody</h5>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <strong>Requested:</strong> {formatDateTime(entry.requestDate)}
                      </div>
                      <div className="detail-item">
                        <strong>Issued (Approved):</strong> {formatDateTime(entry.issuedDate)}
                      </div>
                       <div className="detail-item">
                        <strong>Issued By:</strong> {entry.issuedBy?.fullName || 'N/A'}
                      </div>
                      <div className="detail-item">
                        <strong>Returned:</strong> {formatDateTime(entry.returnedDate)}
                      </div>
                      <div className="detail-item">
                        <strong>Returned To:</strong> {entry.returnedTo?.fullName || 'N/A'}
                      </div>
                      <div className="detail-item">
                        <strong>Duration Used:</strong> {calculateDuration(entry.issuedDate, entry.returnedDate)}
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