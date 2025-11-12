import React, { useState, useEffect } from 'react';
import { equipmentAPI } from '../../utils/api';
import { toast } from 'react-toastify';

const MaintenanceLog = () => {
  const [maintenanceItems, setMaintenanceItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);

  const [showRepairModal, setShowRepairModal] = useState(false);
  const [showWriteOffModal, setShowWriteOffModal] = useState(false);
  const [showRecoverModal, setShowRecoverModal] = useState(false);
  
  // 1. ======== 🟢 ADDED STATE FOR NEW MODAL 🟢 ========
  const [showLostDetailsModal, setShowLostDetailsModal] = useState(false);

  useEffect(() => {
    fetchMaintenanceItems();
  }, []);

  const fetchMaintenanceItems = async () => {
    try {
      setLoading(true);
      const response = await equipmentAPI.getMaintenanceItems();
      if (response.data.success) {
        setMaintenanceItems(response.data.data.items);
      }
    } catch (error) {
      toast.error('Failed to fetch maintenance list');
    } finally {
      setLoading(false);
    }
  };

  // 3. ======== 🟢 UPDATED 🟢 ========
  const handleSuccess = () => {
    setSelectedItem(null);
    setShowRepairModal(false);
    setShowWriteOffModal(false);
    setShowRecoverModal(false);
    setShowLostDetailsModal(false); // <-- Add this
    fetchMaintenanceItems();
  };

  // 4. ======== 🟢 UPDATED 🟢 ========
  const handleCloseModals = () => {
    setSelectedItem(null);
    setShowRepairModal(false);
    setShowWriteOffModal(false);
    setShowRecoverModal(false);
    setShowLostDetailsModal(false); // <-- Add this
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading items under maintenance...</p>
      </div>
    );
  }

  return (
    <>
      <div className="maintenance-log">
        <div className="management-header">
          <h3>Maintenance Log</h3>
          <p>Items currently out of service, awaiting repair, or pending investigation.</p>
        </div>

        {maintenanceItems.length === 0 ? (
          <div className="no-data">
            <p>No items are currently under maintenance.</p>
          </div>
        ) : (
          <div className="inventory-table">
            <table className="table">
              <thead>
                <tr>
                  <th>Item ID</th>
                  <th>Pool Name</th>
                  <th>Problem Reported</th>
                  <th>Status</th>
                  <th>Condition</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {maintenanceItems.map((item) => {
                  const lastMaintLog = (item.maintenanceHistory && item.maintenanceHistory.length > 0) 
                    ? item.maintenanceHistory[item.maintenanceHistory.length - 1] 
                    : null;
                  const problemReason = lastMaintLog?.reason || 'N/A';
                  const isLostItem = problemReason.startsWith("ITEM REPORTED LOST");

                  const lostReport = (isLostItem && item.lostHistory && item.lostHistory.length > 0)
                    ? item.lostHistory[item.lostHistory.length - 1]
                    : null;

                  return (
                    <tr key={item.uniqueId}>
                      <td><strong>{item.uniqueId}</strong></td>
                      <td>{item.poolName}</td>
                      <td title={problemReason}>
                        {isLostItem
                          ? `LOST: FIR #${lostReport?.firNumber || 'N/A'}`
                          : `${problemReason.substring(0, 70)}...`}
                      </td>
                      <td>
                        {isLostItem ? (
                          <span className="badge badge-danger">Lost (Pending)</span>
                        ) : (
                          <span className="badge badge-warning">Maintenance</span>
                        )}
                      </td>
                      <td>
                        <span className="badge badge-secondary">{item.condition}</span>
                      </td>
                      <td>
                        {/* 5. ======== 🟢 UPDATED ACTIONS 🟢 ======== */}
                        {isLostItem ? (
                          <>
                            {/* THIS IS THE NEW BUTTON */}
                            <button
                              onClick={() => { setSelectedItem(item); setShowLostDetailsModal(true); }}
                              className="btn btn-sm btn-info"
                            >
                              View Details
                            </button>
                            <button
                              onClick={() => { setSelectedItem(item); setShowWriteOffModal(true); }}
                              className="btn btn-sm btn-danger"
                            >
                              Write Off
                            </button>
                            <button
                              onClick={() => { setSelectedItem(item); setShowRecoverModal(true); }}
                              className="btn btn-sm btn-success"
                            >
                              Mark Recovered
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => { setSelectedItem(item); setShowRepairModal(true); }}
                            className="btn btn-sm btn-success"
                          >
                            Complete Repair
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showRepairModal && selectedItem && (
        <CompleteRepairModal
          item={selectedItem}
          onClose={handleCloseModals}
          onSuccess={handleSuccess}
        />
      )}
      
      {showWriteOffModal && selectedItem && (
        <WriteOffModal
          item={selectedItem}
          onClose={handleCloseModals}
          onSuccess={handleSuccess}
        />
      )}
      
      {showRecoverModal && selectedItem && (
        <RecoverItemModal
          item={selectedItem}
          onClose={handleCloseModals}
          onSuccess={handleSuccess}
        />
      )}

      {/* 6. ======== 🟢 RENDER THE NEW MODAL 🟢 ======== */}
      {showLostDetailsModal && selectedItem && (
        <LostRequestDetailsModal
          item={selectedItem}
          onClose={handleCloseModals}
        />
      )}
    </>
  );
};


// ... (CompleteRepairModal is unchanged) ...
const CompleteRepairModal = ({ item, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    description: '',
    condition: 'Good',
    cost: ''
  });
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const problemReportEntry = (item.maintenanceHistory && item.maintenanceHistory.length > 0) 
    ? item.maintenanceHistory[item.maintenanceHistory.length - 1] 
    : null;
  let problemReason = problemReportEntry?.reason || 'No description provided.';

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.description.length < 5) {
      toast.error('Please describe the repair actions taken.');
      return;
    }
    
    setLoading(true);
    try {
      const payload = {
        poolId: item.poolId,
        uniqueId: item.uniqueId,
        description: formData.description,
        condition: formData.condition,
        cost: formData.cost || 0
      };

      await equipmentAPI.completeMaintenance(payload);
      toast.success(`Item ${item.uniqueId} has been repaired and is now Available.`);
      onSuccess();
    } catch (error) {
      toast.error('Failed to complete repair.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Complete Repair for: {item.uniqueId}</h3>
          <button onClick={onClose} className="close-btn">&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            
            <div className="form-group">
              <label className="form-label">Problem Reported by Officer</label>
              <textarea
                className="form-control"
                rows="3"
                value={problemReason}
                readOnly
              />
            </div>
            
            <button 
              type="button" 
              className="btn btn-sm btn-outline-info" 
              onClick={() => setShowHistory(!showHistory)}
              style={{ marginBottom: '1rem' }}
            >
              {showHistory ? 'Hide' : 'Show'} Full Item History
            </button>

            {showHistory && (
              <div className="item-history-details" style={{ 
                  maxHeight: '300px',
                  overflowY: 'auto',
                  marginBottom: '1rem', 
                  padding: '1rem', 
                  border: '1px solid #ddd', 
                  borderRadius: '5px',
                  backgroundColor: '#f9f9f9'
                }}>

                <h5 style={{ marginTop: 0, borderBottom: '1px solid #ccc', paddingBottom: '5px' }}>
                  Usage History
                </h5>
                {(item.usageHistory && item.usageHistory.length > 0) ? (
                  <ul style={{ listStyleType: 'none', paddingLeft: 0, fontSize: '0.9rem' }}>
                    {[...item.usageHistory].sort((a, b) => new Date(b.issuedDate) - new Date(a.issuedDate)).map((entry, index) => (
                      <li key={`use-${index}`} style={{ marginBottom: '10px', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>
                        <strong>{new Date(entry.issuedDate).toLocaleDateString()} - {entry.returnedDate ? new Date(entry.returnedDate).toLocaleDateString() : 'Issued'}</strong>
                        <br />
                        Issued to: {entry.officerName || 'N/A'}
                        <br />
                        Return Condition: {entry.conditionAtReturn || 'N/A'}
                        <br />
                        Remarks: {entry.remarks || 'N/A'}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No usage history found.</p>
                )}

                <h5 style={{ marginTop: '1rem', borderBottom: '1px solid #ccc', paddingBottom: '5px' }}>
                  Maintenance History
                </h5>
                {(item.maintenanceHistory && item.maintenanceHistory.length > 0) ? (
                  <ul style={{ listStyleType: 'none', paddingLeft: 0, fontSize: '0.9rem' }}>
                    {[...item.maintenanceHistory].sort((a, b) => new Date(b.reportedDate) - new Date(a.reportedDate)).map((entry, index) => (
                      <li key={`maint-${index}`} style={{ marginBottom: '10px', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>
                        <strong>Reported: {new Date(entry.reportedDate).toLocaleDateString()}</strong>
                        <br />
                        Problem: {entry.reason || 'N/A'}
                        {entry.fixedDate && (
                          <>
                            <br />
                            Fixed: {new Date(entry.fixedDate).toLocaleDateString()}
                            <br />
                            Action: {entry.action || 'N/A'}
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No maintenance history found.</p>
                )}
              </div>
            )}
            
            <div className="form-group">
              <label className="form-label">Repair Actions Taken <span className="required">*</span></label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="form-control"
                rows="3"
                placeholder="e.g., 'Replaced firing pin, cleaned and tested.'"
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">New Condition</label>
                <select
                  name="condition"
                  value={formData.condition}
                  onChange={handleChange}
                  className="form-control"
                >
                  <option value="Good">Good</option>
                  <option value="Excellent">Excellent</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Cost of Repair (Optional)</label>
                <input
                  type="number"
                  name="cost"
                  value={formData.cost}
                  onChange={handleChange}
                  className="form-control"
                  placeholder="e.g., 500"
                />
              </div>
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-success" disabled={loading}>
              {loading ? 'Saving...' : 'Complete Repair'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


// ... (WriteOffModal is unchanged) ...
const WriteOffModal = ({ item, onClose, onSuccess }) => {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  
  const lostReport = (item.lostHistory && Array.isArray(item.lostHistory) && item.lostHistory.length > 0)
    ? item.lostHistory[item.lostHistory.length - 1]
    : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (notes.length < 10) {
      toast.error('Please provide final report notes (min 10 chars).');
      return;
    }
    
    setLoading(true);
    try {
      const payload = {
        poolId: item.poolId,
        uniqueId: item.uniqueId,
        notes: notes,
      };
      await equipmentAPI.writeOffLost(payload);
      toast.success(`Item ${item.uniqueId} has been written off as Lost.`);
      onSuccess();
    } catch (error) {
      toast.error('Failed to write off item.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Write Off Lost Item: {item.uniqueId}</h3>
          <button onClick={onClose} className="close-btn">&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-note form-note-danger">
              <p><strong>Warning:</strong> This action is final. It will permanently mark the item as 'Lost' and close the investigation.</p>
            </div>

            <button 
              type="button" 
              className="btn btn-sm btn-outline-info" 
              onClick={() => setShowDetails(!showDetails)}
              style={{ marginBottom: '1rem' }}
              disabled={!lostReport} 
            >
              {showDetails ? 'Hide' : 'Show'} Officer's Full Report
            </button>
            
            {showDetails && !lostReport && (
              <div className="form-note form-note-warning" style={{marginBottom: '1rem'}}>
                <p>Could not find the original officer's report details for this item. This may be an older entry.</p>
              </div>
            )}
            
            {showDetails && lostReport && (
              <div className="officer-report-details" style={{ 
                  maxHeight: '300px',
                  overflowY: 'auto',
                  marginBottom: '1rem', 
                  padding: '1rem', 
                  border: '1px solid #ddd', 
                  borderRadius: '5px',
                  backgroundColor: '#f9f9f9'
                }}>
                
                <h5 style={{ marginTop: 0, borderBottom: '1px solid #ccc', paddingBottom: '5px' }}>
                  Original Lost Item Report
                </h5>
                
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Date of Loss</label>
                    <input type="text" className="form-control" value={lostReport.dateOfLoss ? new Date(lostReport.dateOfLoss).toLocaleDateString() : 'N/A'} readOnly />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Place of Loss</label>
                    <input type="text" className="form-control" value={lostReport.placeOfLoss || 'N/A'} readOnly />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">FIR Number</label>
                    <input type="text" className="form-control" value={lostReport.firNumber || 'N/A'} readOnly />
                  </div>
                  <div className="form-group">
                    <label className="form-label">FIR Date</label>
                    <input type="text" className="form-control" value={lostReport.firDate ? new Date(lostReport.firDate).toLocaleDateString() : 'N/A'} readOnly />
                  </div>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Police Station</label>
                        <input type="text" className="form-control" value={lostReport.policeStation || 'N/A'} readOnly />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Duty at Time of Loss</label>
                        <input type="text" className="form-control" value={lostReport.dutyAtTimeOfLoss || 'N/A'} readOnly />
                    </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Remedial Action Taken (by Officer)</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    value={lostReport.remedialActionTaken || 'N/A'}
                    readOnly
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Incident Description (by Officer)</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    value={lostReport.description || 'N/A'}
                    readOnly
                  />
                </div>
              </div>
            )}
            
            <div className="form-group">
              <label className="form-label">Admin: Final Report / Write-Off Notes <span className="required">*</span></label>
              <textarea
                name="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="form-control"
                rows="3"
                placeholder="e.g., 'Investigation concluded, item unrecoverable. Approved for write-off.'"
                required
              />
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-danger" disabled={loading}>
              {loading ? 'Saving...' : 'Confirm Write-Off'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


// ... (RecoverItemModal is unchanged) ...
const RecoverItemModal = ({ item, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    notes: '',
    condition: 'Good',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.notes.length < 5) {
      toast.error('Please describe how the item was recovered.');
      return;
    }
    
    setLoading(true);
    try {
      const payload = {
        poolId: item.poolId,
        uniqueId: item.uniqueId,
        notes: formData.notes,
        condition: formData.condition,
      };

      await equipmentAPI.markAsRecovered(payload);
      toast.success(`Item ${item.uniqueId} has been recovered.`);
      onSuccess();
    } catch (error) {
      toast.error('Failed to mark item as recovered.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Mark Item as Recovered: {item.uniqueId}</h3>
          <button onClick={onClose} className="close-btn">&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            
            <div className="form-group">
              <label className="form-label">Recovery Notes <span className="required">*</span></label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                className="form-control"
                rows="3"
                placeholder="e.g., 'Item found during search of Sector 17.'"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Current Condition of Item</label>
              <select
                name="condition"
                value={formData.condition}
                onChange={handleChange}
                className="form-control"
              >
                <option value="Excellent">Excellent</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
                <option value="Poor">Poor (Will require maintenance)</option>
              </select>
            </div>

            <div className="form-note">
              <p>If condition is 'Excellent', 'Good', or 'Fair', the item will become 'Available'. If 'Poor', it will remain in 'Maintenance' for repair.</p>
            </div>

          </div>
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-success" disabled={loading}>
              {loading ? 'Saving...' : 'Mark as Recovered'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


// 7. ======== 🟢 ADDED THIS ENTIRE NEW COMPONENT 🟢 ========
// This is adapted from ProcessRequests.js to work with the 'item' prop
const LostRequestDetailsModal = ({ item, onClose }) => {
  
  // 1. Get the lost report SAFELY
  const lostReport = (item.lostHistory && Array.isArray(item.lostHistory) && item.lostHistory.length > 0)
    ? item.lostHistory[item.lostHistory.length - 1]
    : null;

  // 2. Add the date formatter
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  // 3. Add a loading/error state
  if (!lostReport) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Report Details Not Found</h3>
            <button onClick={onClose} className="close-btn">&times;</button>
          </div>
          <div className="modal-body">
            <p>The original officer's report details could not be found for this item. This may be an older entry.</p>
          </div>
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 4. Main modal body (adapted to use 'item' and 'lostReport')
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Lost Item Report Details</h3>
          <button onClick={onClose} className="close-btn">&times;</button>
        </div>
        
        <div className="modal-body">
          <div className="officer-report-details" style={{ 
              maxHeight: '70vh',
              overflowY: 'auto',
              padding: '10px'
            }}>
            
            <h5 style={{ marginTop: 0, borderBottom: '1px solid #ccc', paddingBottom: '5px' }}>
              Item Information
            </h5>
            
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Item Pool</label>
                <input type="text" className="form-control" value={item.poolName || 'N/A'} readOnly />
              </div>
              <div className="form-group">
                <label className="form-label">Item Unique ID</label>
                <input type="text" className="form-control" value={item.uniqueId || 'N/A'} readOnly />
              </div>
            </div>

            <h5 style={{ marginTop: '1rem', borderBottom: '1px solid #ccc', paddingBottom: '5px' }}>
              Incident Details
            </h5>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Date of Loss</label>
                <input type="text" className="form-control" value={formatDate(lostReport.dateOfLoss)} readOnly />
              </div>
              <div className="form-group">
                <label className="form-label">Place of Loss</label>
                <input type="text" className="form-control" value={lostReport.placeOfLoss || 'N/A'} readOnly />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Police Station</label>
                <input type="text" className="form-control" value={lostReport.policeStation || 'N/A'} readOnly />
              </div>
              <div className="form-group">
                <label className="form-label">Duty at Time of Loss</label>
                <input type="text" className="form-control" value={lostReport.dutyAtTimeOfLoss || 'N/A'} readOnly />
              </div>
            </div>

            <h5 style={{ marginTop: '1rem', borderBottom: '1px solid #ccc', paddingBottom: '5px' }}>
              Official Report
            </h5>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">FIR Number</label>
                <input type="text" className="form-control" value={lostReport.firNumber || 'N/A'} readOnly />
              </div>
              <div className="form-group">
                <label className="form-label">FIR Date</label>
                <input type="text" className="form-control" value={formatDate(lostReport.firDate)} readOnly />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Remedial Action Taken (by Officer)</label>
              <textarea
                className="form-control"
                rows="3"
                value={lostReport.remedialActionTaken || 'N/A'}
                readOnly
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Incident Description (by Officer)</label>
              <textarea
                className="form-control"
                rows="3"
                value={lostReport.description || 'N/A'}
                readOnly
              />
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
// ==========================================================


export default MaintenanceLog;