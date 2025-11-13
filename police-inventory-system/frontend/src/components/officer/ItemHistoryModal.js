import React, { useState, useEffect } from 'react';
import { equipmentAPI } from '../../utils/api';
import { toast } from 'react-toastify';

// A simple helper to format dates
const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString('en-IN');
};

const ItemHistoryModal = ({ poolId, uniqueId, onClose }) => {
  const [history, setHistory] = useState(null); 
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const response = await equipmentAPI.getItemHistory(poolId, uniqueId);
        if (response.data.success) {
          setHistory(response.data.data); 
        } else {
          toast.error(response.data.message);
        }
      } catch (error) {
        toast.error('Failed to fetch item history');
      } finally {
        setLoading(false);
      }
    };
    
    fetchHistory();
  }, [poolId, uniqueId]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      {/* 🟢 Make modal wider */}
      <div className="modal-content modal-xl" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>History for Item: {uniqueId}</h3>
          <button onClick={onClose} className="close-btn">&times;</button>
        </div>
        <div className="modal-body">
          {loading ? (
            <div className="loading-container">
              <div className="spinner"></div>
              <p>Loading history...</p>
            </div>
          ) : !history ? (
            <p>Could not load history.</p>
          ) : (
            <>
              <div className="detail-section">
                <h4>Current Status</h4>
                <div className="detail-grid">
                  <div className="detail-item">
                    <strong>Status:</strong> {history.currentStatus}
                  </div>
                  <div className="detail-item">
                    <strong>Condition:</strong> {history.currentCondition}
                  </div>
                </div>
              </div>

              {/* ======== 🟢 USAGE HISTORY TABLE (MODIFIED) 🟢 ======== */}
              <div className="detail-section">
                <h4>Usage History</h4>
                {history.usageHistory.length === 0 ? (
                  <p>No usage history found for this item. (Brand New)</p>
                ) : (
                  <div className="inventory-table">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>Officer</th>
                          <th>Issued</th>
                          <th>Reason (Issue)</th>
                          <th>Returned</th>
                          <th>Reason (Return)</th>
                          <th>Condition (Return)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.usageHistory.map(entry => (
                          <tr key={entry._id}>
                            <td>{entry.officerName}</td>
                            <td>{formatDateTime(entry.issuedDate)}</td>
                            <td title={entry.purpose}>{entry.purpose || 'N/A'}</td>
                            <td>
                              {entry.returnedDate 
                                ? formatDateTime(entry.returnedDate) 
                                : <span className="badge badge-warning">Still Issued</span>
                              }
                            </td>
                            <td title={entry.remarks}>{entry.remarks || 'N/A'}</td>
                            <td>
                              {entry.conditionAtReturn 
                                ? <span className={`badge badge-${entry.conditionAtReturn === 'Good' || entry.conditionAtReturn === 'Excellent' ? 'success' : 'danger'}`}>
                                    {entry.conditionAtReturn}
                                  </span>
                                : 'N/A'
                              }
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              
              {/* ======== 🟢 MAINTENANCE HISTORY TABLE (MODIFIED) 🟢 ======== */}
              <div className="detail-section">
                <h4>Maintenance History</h4>
                {history.maintenanceHistory.length === 0 ? (
                  <p>No maintenance history for this item.</p>
                ) : (
                  <div className="inventory-table">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>Date Reported</th>
                          <th>Reported By</th>
                          <th>Problem Reported</th>
                          <th>Date Fixed</th>
                          <th>Action Taken</th>
                          <th>Armorer</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.maintenanceHistory.map(entry => (
                          <tr key={entry._id}>
                            <td>{formatDateTime(entry.reportedDate)}</td>
                            <td>{entry.reportedBy?.fullName || 'N/A'}</td>
                            <td title={entry.reason}>{entry.reason}</td>
                            <td>{entry.fixedDate ? formatDateTime(entry.fixedDate) : 'Pending'}</td>
                            <td>{entry.action}</td>
                            <td>{entry.fixedBy?.fullName || 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ItemHistoryModal;