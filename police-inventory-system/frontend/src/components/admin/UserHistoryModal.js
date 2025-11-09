import React, { useState, useEffect } from 'react';
import { equipmentAPI } from '../../utils/api';
import { toast } from 'react-toastify';

// A simple helper to format dates
const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString('en-IN');
};

const ItemHistoryModal = ({ poolId, uniqueId, onClose }) => {
  const [timeline, setTimeline] = useState([]); 
  const [itemDetails, setItemDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const response = await equipmentAPI.getItemHistory(poolId, uniqueId);
        if (response.data.success) {
          setTimeline(response.data.data.timeline || []); 
          setItemDetails({
            currentStatus: response.data.data.currentStatus,
            currentCondition: response.data.data.currentCondition
          });
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

  // This function renders the correct badge for the condition
  const renderCondition = (entry) => {
    if (entry.eventType === 'Issue') {
      return `(at issue: ${entry.condition})`;
    }
    if (entry.eventType === 'Return') {
      const isGood = entry.condition === 'Good' || entry.condition === 'Excellent';
      return (
        <span className={`badge badge-${isGood ? 'success' : 'danger'}`}>
          {entry.condition}
        </span>
      );
    }
    // for Maintenance
    return `(${entry.condition})`; // e.g., (Repair)
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      {/* 🟢 Make modal wider to fit new columns */}
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
          ) : !itemDetails ? (
            <p>Could not load history.</p>
          ) : (
            <>
              <div className="detail-section">
                <h4>Current Status</h4>
                <div className="detail-grid">
                  <div className="detail-item">
                    <strong>Status:</strong> {itemDetails.currentStatus}
                  </div>
                  <div className="detail-item">
                    <strong>Condition:</strong> {itemDetails.currentCondition}
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h4>Item Timeline</h4>
                {timeline.length === 0 ? ( 
                  <p>No history found for this item. (Brand New)</p>
                ) : (
                  // 🟢 MODIFIED: Use a standard table for more columns
                  <div className="inventory-table">
                    <table className="table table-sm">
                      {/* ======== 🟢 MODIFIED THIS SECTION 🟢 ======== */}
                      <thead>
                        <tr>
                          <th>Date & Time</th>
                          <th>Event</th>
                          <th>Officer / Performed By</th>
                          <th>Reason / Details</th>
                          <th>Condition</th>
                        </tr>
                      </thead>
                      <tbody>
                        {timeline.map(entry => (
                          <tr key={entry._id}>
                            <td>{formatDateTime(entry.eventDate)}</td>
                            <td>
                              <span className={`badge badge-${
                                entry.eventType === 'Issue' ? 'info' :
                                entry.eventType === 'Return' ? 'success' : 'warning'
                              }`}>
                                {entry.eventType}
                              </span>
                            </td>
                            {/* This is the Officer/Admin name */}
                            <td>{entry.actor || 'N/A'}</td>
                            {/* This is the Reason/Description */}
                            <td title={entry.reason}>{entry.reason || 'N/A'}</td>
                            {/* This is the Condition */}
                            <td>{renderCondition(entry)}</td>
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