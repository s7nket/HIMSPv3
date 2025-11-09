import React, { useState, useEffect } from 'react';
import { officerAPI } from '../../utils/api';
import { toast } from 'react-toastify';

const ReturnEquipment = ({ onEquipmentReturned }) => {
  const [issuedEquipment, setIssuedEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState(null);

  useEffect(() => {
    fetchIssuedEquipment();
  }, []);

  const fetchIssuedEquipment = async () => {
    try {
      setLoading(true);
      const response = await officerAPI.getIssuedEquipment();

      if (response.data.success) {
        setIssuedEquipment(response.data.data.equipment);
      }
    } catch (error) {
      toast.error('Failed to fetch issued equipment');
    } finally {
      setLoading(false);
    }
  };

  const handleReturnRequest = (equipment) => {
    setSelectedEquipment(equipment);
    setShowReturnModal(true);
  };
  
  // This function gets passed down to the card
  const handleRefresh = () => {
    fetchIssuedEquipment();
    if (onEquipmentReturned) onEquipmentReturned();
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading your issued equipment...</p>
      </div>
    );
  }

  return (
    <div className="return-equipment">
      <div className="return-header">
        <h3>Equipment Issued to You</h3>
        <p>Below are the equipment items currently assigned to you. Click "Return" to submit a return request or "Report Issue" for maintenance.</p>
      </div>

      {issuedEquipment.length === 0 ? (
        <div className="no-data">
          <p>You don't have any equipment issued to you.</p>
        </div>
      ) : (
        <div className="issued-equipment-grid">
          {issuedEquipment.map((equipment) => (
            <IssuedEquipmentCard
              key={equipment._id}
              equipment={equipment}
              onReturn={handleReturnRequest}
              onRefresh={handleRefresh} // Pass refresh down
            />
          ))}
        </div>
      )}

      {showReturnModal && selectedEquipment && (
        <ReturnModal
          equipment={selectedEquipment}
          onClose={() => {
            setShowReturnModal(false);
            setSelectedEquipment(null);
          }}
          onSuccess={handleRefresh} // Use refresh function
        />
      )}
    </div>
  );
};

const IssuedEquipmentCard = ({ equipment, onReturn, onRefresh }) => {
  const isOverdue = equipment.issuedTo.expectedReturnDate && 
    new Date(equipment.issuedTo.expectedReturnDate) < new Date();

  const daysHeld = Math.floor(
    (new Date() - new Date(equipment.issuedTo.issuedDate)) / (1000 * 60 * 60 * 24)
  );
  
  // ======== 🟢 ADDED THIS STATE 🟢 ========
  const [showMaintModal, setShowMaintModal] = useState(false);

  return (
    <>
      <div className={`equipment-card issued-card ${isOverdue ? 'overdue' : ''}`}>
        <div className="equipment-info">
          <h4>{equipment.name}</h4>
          <p className="equipment-model">{equipment.model}</p>
          <div className="equipment-details">
            <span className="equipment-category">{equipment.category}</span>
            <span className="equipment-serial">ID: {equipment.serialNumber}</span>
          </div>
          <div className="issue-details">
            <div className="issue-info">
              <strong>Issued:</strong> {new Date(equipment.issuedTo.issuedDate).toLocaleDateString()}
            </div>
            <div className="issue-info">
              <strong>Days Held:</strong> {daysHeld} days
            </div>
            {equipment.issuedTo.expectedReturnDate && (
              <div className={`issue-info ${isOverdue ? 'overdue-text' : ''}`}>
                <strong>Expected Return:</strong> {new Date(equipment.issuedTo.expectedReturnDate).toLocaleDateString()}
                {isOverdue && <span className="overdue-label">OVERDUE</span>}
              </div>
            )}
          </div>
        </div>

        <div className="equipment-actions">
          {/* ======== 🟢 MODIFIED THIS SECTION 🟢 ======== */}
          {/* Wrapped buttons in a container for better layout */}
          <div className="action-buttons-container">
            <button
              onClick={() => onReturn(equipment)}
              className={`btn btn-sm ${isOverdue ? 'btn-danger' : 'btn-warning'}`}
            >
              {isOverdue ? 'Return Overdue' : 'Return Equipment'}
            </button>
            <button
              onClick={() => setShowMaintModal(true)}
              className="btn btn-sm btn-outline-danger"
            >
              Report Issue
            </button>
          </div>
        </div>
      </div>
      
      {/* ======== 🟢 ADDED THIS MODAL 🟢 ======== */}
      {showMaintModal && (
        <MaintenanceModal
          equipment={equipment}
          onClose={() => setShowMaintModal(false)}
          onSuccess={() => {
            setShowMaintModal(false);
            toast.success('Maintenance request submitted successfully!');
            onRefresh(); // Refresh list after submitting
          }}
        />
      )}
    </>
  );
};

const ReturnModal = ({ equipment, onClose, onSuccess }) => {
  // ... (This component is unchanged from your file)
  const [formData, setFormData] = useState({
    reason: '',
    priority: 'Medium',
    condition: equipment.condition || 'Good'
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await officerAPI.createRequest({
        poolId: equipment.poolId,
        uniqueId: equipment._id,
        requestType: 'Return',
        ...formData
      });
      toast.success('Return request submitted successfully');
      onSuccess();
      onClose();
    } catch (error) {
      toast.error('Failed to submit return request');
    } finally {
      setLoading(false);
    }
  };

  const isOverdue = equipment.issuedTo.expectedReturnDate && 
    new Date(equipment.issuedTo.expectedReturnDate) < new Date();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Return Equipment</h3>
          <button onClick={onClose} className="close-btn">&times;</button>
        </div>
        {isOverdue && (
          <div className="overdue-notice">
            <strong>⚠️ This equipment is overdue for return!</strong>
            <p>Expected return date was: {new Date(equipment.issuedTo.expectedReturnDate).toLocaleDateString()}</p>
          </div>
        )}
        <div className="equipment-summary">
          <h4>{equipment.name}</h4>
          <p>{equipment.model} - ID: {equipment.serialNumber}</p>
          <p>Category: {equipment.category}</p>
          <p>Issued Date: {new Date(equipment.issuedTo.issuedDate).toLocaleDateString()}</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Reason for Return</label>
            <textarea
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              className="form-control"
              rows="3"
              placeholder="Please explain the reason for returning this equipment..."
              required
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select name="priority" value={formData.priority} onChange={handleChange} className="form-control">
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Current Condition</label>
              <select name="condition" value={formData.condition} onChange={handleChange} className="form-control">
                <option value="Excellent">Excellent</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
                <option value="Poor">Poor</option>
                <option value="Out of Service">Out of Service</option>
              </select>
            </div>
          </div>
          <div className="form-note">
            <p><strong>Note:</strong> This will create a return request that needs to be approved by an admin. 
            You will continue to have custody of the equipment until the return is processed.</p>
          </div>
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Return Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ======== 🟢 ADDED THIS NEW COMPONENT 🟢 ========
const MaintenanceModal = ({ equipment, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    reason: '', // This is the "problem description"
    priority: 'High', // Default to High for safety
    condition: 'Poor' // Default to Poor
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.reason.length < 10) {
      toast.error('Please describe the issue in detail (min 10 chars).');
      return;
    }
    setLoading(true);

    try {
      // This calls the same 'createRequest' route, but with a different type!
      await officerAPI.createRequest({
        poolId: equipment.poolId,
        uniqueId: equipment._id, // This is the uniqueId
        requestType: 'Maintenance', // This is the key change
        ...formData
      });
      onSuccess();
    } catch (error) {
      toast.error('Failed to submit maintenance request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Report Issue for: {equipment.name}</h3>
          <button onClick={onClose} className="close-btn">&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="equipment-summary">
              <p>{equipment.model} - ID: {equipment.serialNumber}</p>
            </div>

            <div className="form-group">
              <label className="form-label">Problem Description <span className="required">*</span></label>
              <textarea
                name="reason"
                value={formData.reason}
                onChange={handleChange}
                className="form-control"
                rows="4"
                placeholder="Describe the problem (e.g., 'Sight is misaligned', 'Firing pin jams', 'Radio battery not holding charge')"
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Urgency</label>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  className="form-control"
                >
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Current Condition</label>
                <select
                  name="condition"
                  value={formData.condition}
                  onChange={handleChange}
                  className="form-control"
                >
                  <option value="Fair">Fair</option>
                  <option value="Poor">Poor</option>
                  <option value="Out of Service">Out of Service</option>
                </select>
              </div>
            </div>
            <div className="form-note">
              <p>Submitting this will create a maintenance request. You are still responsible for the item until an admin processes the request.</p>
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-danger" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Maintenance Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReturnEquipment;