import React, { useState, useEffect } from 'react';
import { equipmentAPI } from '../../utils/api';
import { toast } from 'react-toastify';
// ======== 🟢 1. FIXED THE IMPORT 🟢 ========
import { Eye, Wrench, Check, Trash2, RotateCcw } from 'lucide-react'; // Replaced 'Tool' with 'Wrench'

const MaintenanceLog = () => {
  const [maintenanceItems, setMaintenanceItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);

  const [showRepairModal, setShowRepairModal] = useState(false);
  const [showWriteOffModal, setShowWriteOffModal] = useState(false);
  const [showRecoverModal, setShowRecoverModal] = useState(false);
  
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

  const handleSuccess = () => {
    setSelectedItem(null);
    setShowRepairModal(false);
    setShowWriteOffModal(false);
    setShowRecoverModal(false);
    setShowLostDetailsModal(false);
    fetchMaintenanceItems();
  };

  const handleCloseModals = () => {
    setSelectedItem(null);
    setShowRepairModal(false);
    setShowWriteOffModal(false);
    setShowRecoverModal(false);
    setShowLostDetailsModal(false);
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
      {/* Using um-container for consistent UI from AdminDashboard.css */}
      <div className="um-container">
        <div className="um-header">
          <h2>Maintenance Log</h2>
          {/* No "create" button needed here */}
        </div>

        {maintenanceItems.length === 0 ? (
          <div className="um-empty-state">
            <p>No items are currently under maintenance.</p>
          </div>
        ) : (
          <div className="um-table-wrapper">
            <table className="um-table">
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
                      <td><code>{item.uniqueId}</code></td>
                      <td>{item.poolName}</td>
                      <td title={problemReason}>
                        {isLostItem
                          ? `LOST: FIR #${lostReport?.firNumber || 'N/A'}`
                          : `${problemReason.substring(0, 70)}...`}
                      </td>
                      <td>
                        {isLostItem ? (
                          <span className="um-badge um-badge-red">Lost (Pending)</span>
                        ) : (
                          <span className="um-badge um-badge-warn">Maintenance</span>
                        )}
                      </td>
                      <td>
                        <span className="um-badge um-badge-gray">{item.condition}</span>
                      </td>
                      <td className="um-actions-cell">
                        {isLostItem ? (
                          <>
                            <button
                              onClick={() => { setSelectedItem(item); setShowLostDetailsModal(true); }}
                              className="btn-action btn-action-secondary" // Use 'secondary' for view
                            >
                              <Eye size={16} /> Details
                            </button>
                            <button
                              onClick={() => { setSelectedItem(item); setShowWriteOffModal(true); }}
                              className="btn-action btn-action-danger"
                            >
                              <Trash2 size={16} /> Write Off
                            </button>
                            <button
                              onClick={() => { setSelectedItem(item); setShowRecoverModal(true); }}
                              className="btn-action btn-action-success"
                            >
                              <RotateCcw size={16} /> Recover
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => { setSelectedItem(item); setShowRepairModal(true); }}
                            className="btn-action btn-action-success"
                          >
                            {/* ======== 🟢 2. FIXED THE ICON 🟢 ======== */}
                            <Wrench size={16} /> Repair
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

      {/* --- Modals (now using um-modal styles) --- */}
      
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

      {showLostDetailsModal && selectedItem && (
        <LostRequestDetailsModal
          item={selectedItem}
          onClose={handleCloseModals}
        />
      )}
    </>
  );
};


// --- Re-skinned Modals ---

const CompleteRepairModal = ({ item, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({ description: '', condition: 'Good', cost: '' });
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const problemReason = item.maintenanceHistory[item.maintenanceHistory.length - 1]?.reason || 'No description provided.';

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.description.length < 5) return toast.error('Please describe the repair actions taken.');
    setLoading(true);
    try {
      await equipmentAPI.completeMaintenance({
        poolId: item.poolId, uniqueId: item.uniqueId, ...formData, cost: formData.cost || 0
      });
      toast.success(`Item ${item.uniqueId} has been repaired and is now Available.`);
      onSuccess();
    } catch (error) {
      toast.error('Failed to complete repair.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="um-modal-overlay" onClick={onClose}>
      <div className="um-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="um-modal-header">
          <h3>Complete Repair for: {item.uniqueId}</h3>
          <button onClick={onClose} className="um-modal-close">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="um-modal-form">
          <div className="um-form-group">
            <label className="um-form-label">Problem Reported by Officer</label>
            <textarea className="form-control" rows="3" value={problemReason} readOnly disabled />
          </div>
          
          <button type="button" className="btn btn-secondary" onClick={() => setShowHistory(!showHistory)} style={{ marginBottom: '1rem', background: '#f6f8fa' }}>
            {showHistory ? 'Hide' : 'Show'} Full Item History
          </button>

          {showHistory && (
            <div className="um-item-list-container">
              <h5>Usage History</h5>
              {(item.usageHistory && item.usageHistory.length > 0) ? (
                item.usageHistory.slice().sort((a, b) => new Date(b.issuedDate) - new Date(a.issuedDate)).map((entry, index) => (
                  <div key={`use-${index}`} className="um-item-row" style={{flexDirection: 'column', alignItems: 'flex-start', gap: '4px'}}>
                    <span><strong>{new Date(entry.issuedDate).toLocaleDateString()} - {entry.returnedDate ? new Date(entry.returnedDate).toLocaleDateString() : 'Issued'}</strong></span>
                    <small>Issued to: {entry.officerName || 'N/A'} | Return Condition: {entry.conditionAtReturn || 'N/A'}</small>
                  </div>
                ))
              ) : <p style={{padding: '10px', textAlign: 'center'}}>No usage history found.</p>}
            </div>
          )}
          
          <div className="um-form-group">
            <label className="um-form-label">Repair Actions Taken *</label>
            <textarea name="description" value={formData.description} onChange={handleChange} className="form-control" rows="3" placeholder="e.g., 'Replaced firing pin, cleaned and tested.'" required />
          </div>

          <div className="um-form-row">
            <div className="um-form-group">
              <label className="um-form-label">New Condition</label>
              <select name="condition" value={formData.condition} onChange={handleChange} className="form-control">
                <option value="Good">Good</option>
                <option value="Excellent">Excellent</option>
              </select>
            </div>
            <div className="um-form-group">
              <label className="um-form-label">Cost of Repair (Optional)</label>
              <input type="number" name="cost" value={formData.cost} onChange={handleChange} className="form-control" placeholder="e.g., 500" />
            </div>
          </div>
        </form>
        <div className="um-modal-actions">
          <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
          <button type="submit" className="btn btn-success" disabled={loading} onClick={handleSubmit}>
            {loading ? 'Saving...' : 'Complete Repair'}
          </button>
        </div>
      </div>
    </div>
  );
};


const WriteOffModal = ({ item, onClose, onSuccess }) => {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const lostReport = (item.lostHistory && Array.isArray(item.lostHistory) && item.lostHistory.length > 0) ? item.lostHistory[item.lostHistory.length - 1] : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (notes.length < 10) return toast.error('Please provide final report notes (min 10 chars).');
    setLoading(true);
    try {
      await equipmentAPI.writeOffLost({ poolId: item.poolId, uniqueId: item.uniqueId, notes: notes });
      toast.success(`Item ${item.uniqueId} has been written off as Lost.`);
      onSuccess();
    } catch (error) {
      toast.error('Failed to write off item.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="um-modal-overlay" onClick={onClose}>
      <div className="um-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="um-modal-header">
          <h3>Write Off Lost Item: {item.uniqueId}</h3>
          <button onClick={onClose} className="um-modal-close">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="um-modal-form">
          <div className="um-form-section" style={{ borderColor: 'var(--color-danger)', background: 'var(--color-danger-bg)'}}>
            <p style={{ color: 'var(--color-danger-text)', margin: 0 }}>
              <strong>Warning:</strong> This action is final. It will permanently mark the item as 'Lost' and close the investigation.
            </p>
          </div>

          <button type="button" className="btn btn-secondary" onClick={() => setShowDetails(!showDetails)} style={{ marginBottom: '1rem', background: '#f6f8fa' }} disabled={!lostReport}>
            {showDetails ? 'Hide' : 'Show'} Officer's Full Report
          </button>
          
          {showDetails && !lostReport && <p>Could not find the original officer's report details.</p>}
          
          {showDetails && lostReport && (
            <div className="um-form-section">
              <div className="um-form-row">
                <div className="um-form-group"><label className="um-form-label">Date of Loss</label><input type="text" className="form-control" value={lostReport.dateOfLoss ? new Date(lostReport.dateOfLoss).toLocaleDateString() : 'N/A'} readOnly disabled /></div>
                <div className="um-form-group"><label className="um-form-label">Place of Loss</label><input type="text" className="form-control" value={lostReport.placeOfLoss || 'N/A'} readOnly disabled /></div>
              </div>
              <div className="um-form-row">
                <div className="um-form-group"><label className="um-form-label">FIR Number</label><input type="text" className="form-control" value={lostReport.firNumber || 'N/A'} readOnly disabled /></div>
                <div className="um-form-group"><label className="um-form-label">FIR Date</label><input type="text" className="form-control" value={lostReport.firDate ? new Date(lostReport.firDate).toLocaleDateString() : 'N/A'} readOnly disabled /></div>
              </div>
              <div className="um-form-group"><label className="um-form-label">Incident Description</label><textarea className="form-control" rows="2" value={lostReport.description || 'N/A'} readOnly disabled /></div>
            </div>
          )}
          
          <div className="um-form-group">
            <label className="um-form-label">Admin: Final Report / Write-Off Notes *</label>
            <textarea name="notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="form-control" rows="3" placeholder="e.g., 'Investigation concluded, item unrecoverable. Approved for write-off.'" required />
          </div>
        </form>
        <div className="um-modal-actions">
          <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
          <button type="submit" className="btn btn-danger" disabled={loading} onClick={handleSubmit}>
            {loading ? 'Saving...' : 'Confirm Write-Off'}
          </button>
        </div>
      </div>
    </div>
  );
};


const RecoverItemModal = ({ item, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({ notes: '', condition: 'Good' });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.notes.length < 5) return toast.error('Please describe how the item was recovered.');
    setLoading(true);
    try {
      await equipmentAPI.markAsRecovered({ poolId: item.poolId, uniqueId: item.uniqueId, ...formData });
      toast.success(`Item ${item.uniqueId} has been recovered.`);
      onSuccess();
    } catch (error) {
      toast.error('Failed to mark item as recovered.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="um-modal-overlay" onClick={onClose}>
      <div className="um-modal-content um-modal-content-small" onClick={(e) => e.stopPropagation()}>
        <div className="um-modal-header">
          <h3>Mark Item as Recovered: {item.uniqueId}</h3>
          <button onClick={onClose} className="um-modal-close">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="um-modal-form">
          <div className="um-form-group">
            <label className="um-form-label">Recovery Notes *</label>
            <textarea name="notes" value={formData.notes} onChange={handleChange} className="form-control" rows="3" placeholder="e.g., 'Item found during search of Sector 17.'" required />
          </div>
          <div className="um-form-group">
            <label className="um-form-label">Current Condition of Item</label>
            <select name="condition" value={formData.condition} onChange={handleChange} className="form-control">
              <option value="Excellent">Excellent</option>
              <option value="Good">Good</option>
              <option value="Fair">Fair</option>
              <option value="Poor">Poor (Will require maintenance)</option>
            </select>
          </div>
          <span className="um-field-hint">If 'Poor', item will remain in Maintenance. Otherwise, it will become 'Available'.</span>
        </form>
        <div className="um-modal-actions">
          <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
          <button type="submit" className="btn btn-success" disabled={loading} onClick={handleSubmit}>
            {loading ? 'Saving...' : 'Mark as Recovered'}
          </button>
        </div>
      </div>
    </div>
  );
};


const LostRequestDetailsModal = ({ item, onClose }) => {
  const lostReport = (item.lostHistory && Array.isArray(item.lostHistory) && item.lostHistory.length > 0) ? item.lostHistory[item.lostHistory.length - 1] : null;
  const formatDate = (dateString) => (dateString ? new Date(dateString).toLocaleDateString() : 'N/A');

  if (!lostReport) {
    return (
      <div className="um-modal-overlay" onClick={onClose}>
        <div className="um-modal-content um-modal-content-small" onClick={(e) => e.stopPropagation()}>
          <div className="um-modal-header">
            <h3>Report Details Not Found</h3>
            <button onClick={onClose} className="um-modal-close">&times;</button>
          </div>
          <div className="um-modal-body-centered">
            <p>The original officer's report details could not be found for this item. This may be an older entry.</p>
          </div>
          <div className="um-modal-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary">Close</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="um-modal-overlay" onClick={onClose}>
      <div className="um-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="um-modal-header">
          <h3>Lost Item Report Details</h3>
          <button onClick={onClose} className="um-modal-close">&times;</button>
        </div>
        <div className="um-modal-form">
          <div className="um-form-section">
            <h4>Item Information</h4>
            <div className="um-form-row">
              <div className="um-form-group"><label className="um-form-label">Item Pool</label><input type="text" className="form-control" value={item.poolName || 'N/A'} readOnly disabled /></div>
              <div className="um-form-group"><label className="um-form-label">Item Unique ID</label><input type="text" className="form-control" value={item.uniqueId || 'N/A'} readOnly disabled /></div>
            </div>
          </div>
          <div className="um-form-section">
            <h4>Incident Details</h4>
            <div className="um-form-row">
              <div className="um-form-group"><label className="um-form-label">Date of Loss</label><input type="text" className="form-control" value={formatDate(lostReport.dateOfLoss)} readOnly disabled /></div>
              <div className="um-form-group"><label className="um-form-label">Place of Loss</label><input type="text" className="form-control" value={lostReport.placeOfLoss || 'N/A'} readOnly disabled /></div>
            </div>
            <div className="um-form-row">
              <div className="um-form-group"><label className="um-form-label">Police Station</label><input type="text" className="form-control" value={lostReport.policeStation || 'N/A'} readOnly disabled /></div>
              <div className="um-form-group"><label className="um-form-label">Duty at Time of Loss</label><input type="text" className="form-control" value={lostReport.dutyAtTimeOfLoss || 'N/A'} readOnly disabled /></div>
            </div>
          </div>
          <div className="um-form-section">
            <h4>Official Report</h4>
            <div className="um-form-row">
              <div className="um-form-group"><label className="um-form-label">FIR Number</label><input type="text" className="form-control" value={lostReport.firNumber || 'N/A'} readOnly disabled /></div>
              <div className="um-form-group"><label className="um-form-label">FIR Date</label><input type="text" className="form-control" value={formatDate(lostReport.firDate)} readOnly disabled /></div>
            </div>
            <div className="um-form-group"><label className="um-form-label">Remedial Action Taken</label><textarea className="form-control" rows="3" value={lostReport.remedialActionTaken || 'N/A'} readOnly disabled /></div>
            <div className="um-form-group"><label className="um-form-label">Incident Description</label><textarea className="form-control" rows="3" value={lostReport.description || 'N/A'} readOnly disabled /></div>
          </div>
        </div>
        <div className="um-modal-actions">
          <button type="button" onClick={onClose} className="btn btn-secondary">Close</button>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceLog;