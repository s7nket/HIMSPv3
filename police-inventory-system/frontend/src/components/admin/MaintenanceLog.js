import React, { useState, useEffect } from 'react';
import { equipmentAPI } from '../../utils/api';
import { toast } from 'react-toastify';

const MaintenanceLog = () => {
  const [maintenanceItems, setMaintenanceItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);

  // 1. Use separate state for each modal
  const [showRepairModal, setShowRepairModal] = useState(false);
  const [showWriteOffModal, setShowWriteOffModal] = useState(false);
  const [showRecoverModal, setShowRecoverModal] = useState(false);

  useEffect(() => {
    fetchMaintenanceItems();
  }, []);

  // 2. Fetch from the correct 'maintenance-items' route
  const fetchMaintenanceItems = async () => {
    try {
      setLoading(true);
      // This route is designed to get all items with status: 'Maintenance'
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

  // 3. Close all modals and refresh the list
  const handleSuccess = () => {
    setSelectedItem(null);
    setShowRepairModal(false);
    setShowWriteOffModal(false);
    setShowRecoverModal(false);
    fetchMaintenanceItems(); // Refresh the list
  };

  // 4. Close all modals without refreshing
  const handleCloseModals = () => {
    setSelectedItem(null);
    setShowRepairModal(false);
    setShowWriteOffModal(false);
    setShowRecoverModal(false);
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
                  // 5. Check if item is Lost or just for Maintenance
                  // The backend flags lost items by starting the reason with "ITEM REPORTED LOST"
                  const lastMaintLog = item.maintenanceHistory[item.maintenanceHistory.length - 1];
                  const problemReason = lastMaintLog?.reason || 'N/A';
                  const isLostItem = problemReason.startsWith("ITEM REPORTED LOST");

                  // 6. Get Lost details if they exist
                  const lostReport = isLostItem && item.lostHistory?.length > 0
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
                        {/* 7. Show different buttons based on item type */}
                        {isLostItem ? (
                          <>
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

      {/* 8. Render all three possible modals */}
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
    </>
  );
};

// --- This is the modal for completing a REPAIR ---
const CompleteRepairModal = ({ item, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    description: '',
    condition: 'Good',
    cost: ''
  });
  const [loading, setLoading] = useState(false);

  const problemReportEntry = item.maintenanceHistory[item.maintenanceHistory.length - 1];
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


// --- 9. NEW MODAL for Writing Off a Lost Item ---
const WriteOffModal = ({ item, onClose, onSuccess }) => {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const lostReport = item.lostHistory[item.lostHistory.length - 1];

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

            <div className="form-group">
              <label className="form-label">Officer's Report (Read-only)</label>
              <textarea
                className="form-control"
                rows="4"
                value={`FIR: ${lostReport.firNumber} on ${new Date(lostReport.firDate).toLocaleDateString()}\nPolice Station: ${lostReport.policeStation}\nIncident: ${lostReport.description}`}
                readOnly
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Final Report / Write-Off Notes <span className="required">*</span></label>
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

// --- 10. NEW MODAL for Marking a Lost Item as Recovered ---
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


export default MaintenanceLog;