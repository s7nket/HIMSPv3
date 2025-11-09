import React, { useState, useEffect } from 'react';
import { equipmentAPI } from '../../utils/api';
import { toast } from 'react-toastify';

const MaintenanceLog = () => {
  const [maintenanceItems, setMaintenanceItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    fetchMaintenanceItems();
  }, []);

  const fetchMaintenanceItems = async () => {
    try {
      setLoading(true);
      const response = await equipmentAPI.getEquipmentPools();
      if (response.data.success) {
        const pools = response.data.data.pools;
        const itemsToRepair = [];

        pools.forEach(pool => {
          pool.items.forEach(item => {
            if (item.status === 'Maintenance') {
              itemsToRepair.push({
                ...item,
                poolId: pool._id,
                poolName: pool.poolName
              });
            }
          });
        });
        setMaintenanceItems(itemsToRepair);
      }
    } catch (error) {
      toast.error('Failed to fetch maintenance list');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (item) => {
    setSelectedItem(item);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setSelectedItem(null);
    setShowModal(false);
  };

  const handleSuccess = () => {
    handleCloseModal();
    fetchMaintenanceItems(); // Refresh the list
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
          <p>Items currently out of service and awaiting repair.</p>
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
                  <th>Condition</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {maintenanceItems.map((item) => {
                  const problemReport = item.maintenanceHistory[item.maintenanceHistory.length - 1];
                  
                  // ======== 泙 MODIFIED THIS BLOCK 泙 ========
                  // The field for the problem is 'reason', not 'description'.
                  // Removed the prefix-stripping logic as it's not needed.
                  let reason = problemReport?.reason || 'N/A';
                  // =======================================

                  return (
                    <tr key={item.uniqueId}>
                      <td><strong>{item.uniqueId}</strong></td>
                      <td>{item.poolName}</td>
                      {/* Use the corrected 'reason' variable */}
                      <td title={reason}>
                        {/* Show first 70 chars, or all if shorter */}
                        {reason.length > 70 ? `${reason.substring(0, 70)}...` : reason}
                      </td>
                      <td>
                        <span className="badge badge-danger">{item.condition}</span>
                      </td>
                      <td>
                        <button
                          onClick={() => handleOpenModal(item)}
                          className="btn btn-sm btn-success"
                        >
                          Complete Repair
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && selectedItem && (
        <CompleteRepairModal
          item={selectedItem}
          onClose={handleCloseModal}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
};

// --- This is the modal for completing a repair ---
const CompleteRepairModal = ({ item, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    description: '',
    condition: 'Good', // Default to Good after repair
    cost: ''
  });
  const [loading, setLoading] = useState(false);

  // ======== 泙 MODIFIED THIS BLOCK 泙 ========
  // Get the original problem report and clean it for display
  const problemReportEntry = item.maintenanceHistory[item.maintenanceHistory.length - 1];
  // The field is 'reason', not 'description'.
  let problemReason = problemReportEntry?.reason || 'No description provided.';
  // =======================================

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
        description: formData.description, // This is correct (it's the admin's repair notes)
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
                // Use the corrected 'problemReason' variable
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

export default MaintenanceLog;