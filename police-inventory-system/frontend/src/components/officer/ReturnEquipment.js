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
      
      {showMaintModal && (
        <MaintenanceModal
          equipment={equipment}
          onClose={() => setShowMaintModal(false)}
          onSuccess={() => {
            setShowMaintModal(false);
            toast.success('Maintenance request submitted successfully!');
            onRefresh(); // Use onRefresh prop directly
          }}
        />
      )}
    </>
  );
};

const ReturnModal = ({ equipment, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    reason: '',
    priority: 'Medium',
    condition: equipment?.condition || 'Good',
    firNumber: '',
    firDate: '',
    description: '',
    documentFile: null
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    setFormData(prev => ({ ...prev, documentFile: e.target.files[0] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (formData.condition === 'Lost') {
        if (!formData.firNumber || !formData.firDate) {
          toast.error('FIR Number and Date are required for lost weapon report.');
          setLoading(false);
          return;
        }

        const lostData = new FormData();
        lostData.append('poolId', equipment.poolId);
        // Use equipment._id as that's what the parent passes
        lostData.append('uniqueId', equipment._id); 
        lostData.append('firNumber', formData.firNumber);
        lostData.append('firDate', formData.firDate);
        lostData.append('description', formData.description);
        if (formData.documentFile) lostData.append('documentUrl', formData.documentFile);

        await officerAPI.reportLostWeapon(lostData);
        toast.success('Lost weapon FIR submitted successfully');
      } else {
        await officerAPI.createRequest({
          poolId: equipment.poolId,
          // Use equipment._id as that's what the parent passes
          uniqueId: equipment._id,
          requestType: 'Return',
          reason: formData.reason,
          priority: formData.priority,
          condition: formData.condition
        });
        toast.success('Return request submitted successfully');
      }

      onSuccess?.();
      onClose?.();
    } catch (error) {
      console.error('Return submission error:', error);
      toast.error('Failed to process return.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Return Equipment</h3>
          <button onClick={onClose} className="close-btn">×</button>
        </div>
    
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label>Reason for Return</label>
            <textarea
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              placeholder="Enter reason for returning equipment"
              required={formData.condition !== 'Lost'}
            />
          </div>
    
          <div className="form-group">
            <label>Priority</label>
            <select name="priority" value={formData.priority} onChange={handleChange}>
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
              <option>Urgent</option>
            </select>
          </div>
    
          <div className="form-group">
            <label>Condition</label>
            <select name="condition" value={formData.condition} onChange={handleChange}>
              <option>Excellent</option>
              <option>Good</option>
              <option>Fair</option>
              <option>Poor</option>
              <option>Lost</option>
            </select>
          </div>
    
          {/* 🔹 FIR section appears only when "Lost" is selected */}
          {formData.condition === 'Lost' && (
            <div className="lost-fir-section">
              <h4>Lost Weapon FIR Details</h4>
              <input type="text" name="firNumber" placeholder="FIR Number (e.g., 123/2025)" value={formData.firNumber} onChange={handleChange} required />
              <input type="date" name="firDate" value={formData.firDate} onChange={handleChange} required />
              <textarea name="description" placeholder="Brief description of the loss" value={formData.description} onChange={handleChange}></textarea>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} />
            </div>
          )}
          
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Submitting...' : 'Submit'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};


// ======== 🟢 THIS COMPONENT IS FIXED 🟢 ========
const MaintenanceModal = ({ equipment, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    reason: '', // This is the "problem description"
    priority: 'High', // Default to High for safety
    condition: 'Poor' // Default to Poor
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    // ======== 泙 THIS IS THE FIX 泙 ========
    // It was 'e.g.target.name', corrected to 'e.target.name'
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