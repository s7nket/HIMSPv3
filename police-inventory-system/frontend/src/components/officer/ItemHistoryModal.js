import React, { useState, useEffect } from 'react';
import { equipmentAPI } from '../../utils/api';
import { toast } from 'react-toastify';

// A simple helper to format dates
const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString();
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
      <div className="modal-content equipment-details-modal" onClick={(e) => e.stopPropagation()}>
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

              <div className="detail-section">
                <h4>Usage History</h4>
                {history.usageHistory.length === 0 ? (
                  <p>No usage history for this item.</p>
                ) : (
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Officer</th>
                        <th>Issued</th>
                        <th>Returned</th>
                        <th>Condition (Return)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.usageHistory.map(entry => (
                        <tr key={entry._id}>
                          <td>{entry.officerName}</td>
                          <td>{formatDateTime(entry.issuedDate)}</td>
                          <td>{formatDateTime(entry.returnedDate)}</td>
                          <td>{entry.conditionAtReturn || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              
              <div className="detail-section">
                <h4>Maintenance History</h4>
                {history.maintenanceHistory.length === 0 ? (
                  <p>No maintenance history for this item.</p>
                ) : (
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.maintenanceHistory.map(entry => (
                        <tr key={entry._id}>
                          <td>{new Date(entry.date).toLocaleDateString()}</td>
                          <td>{entry.type}</td>
                          <td>{entry.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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