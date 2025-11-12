import React, { useState, useEffect } from 'react';
import { officerAPI } from '../../utils/api';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext'; // 1. Import useAuth

const ReturnEquipment = ({ onEquipmentReturned }) => {
  const { user } = useAuth(); // 2. Get user from context
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
              policeStation={user?.policeStation} // 3. Pass policeStation
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

// ======== 🟢 MODIFIED THIS COMPONENT 🟢 ========
const IssuedEquipmentCard = ({ equipment, onReturn, onRefresh, policeStation }) => { // 4. Accept policeStation
  const isOverdue = equipment.issuedTo.expectedReturnDate && 
    new Date(equipment.issuedTo.expectedReturnDate) < new Date();

  const daysHeld = Math.floor(
    (new Date() - new Date(equipment.issuedTo.issuedDate)) / (1000 * 60 * 60 * 24)
  );
  
  const [showMaintModal, setShowMaintModal] = useState(false);
  const [showLostModal, setShowLostModal] = useState(false); // 1. Added state for new modal

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
            {/* 2. Button styles updated for clarity */}
            <button
              onClick={() => onReturn(equipment)}
              className={`btn btn-sm ${isOverdue ? 'btn-danger' : 'btn-warning'}`}
            >
              {isOverdue ? 'Return Overdue' : 'Return Equipment'}
            </button>
            <button
              onClick={() => setShowMaintModal(true)}
              className="btn btn-sm btn-outline-secondary" // Changed style
            >
              Report Issue
            </button>
            {/* 3. Added new "Report Lost" button */}
            <button
              onClick={() => setShowLostModal(true)}
              className="btn btn-sm btn-danger"
            >
              Report Lost
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
            onRefresh(); 
          }}
        />
      )}

      {/* 4. Added new LostModal renderer */}
      {showLostModal && (
        <LostModal
          equipment={equipment}
          policeStation={policeStation} // 5. Pass policeStation to LostModal
          onClose={() => setShowLostModal(false)}
          onSuccess={() => {
            setShowLostModal(false);
            toast.success('Lost equipment report submitted successfully!');
            onRefresh();
          }}
        />
      )}
    </>
  );
};

// ======== 🟢 MODIFIED THIS COMPONENT 🟢 ========
const ReturnModal = ({ equipment, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    reason: '',
    priority: 'Medium',
    condition: equipment?.condition || 'Good',
    // --- FIR fields removed from here ---
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // 5. Simplified handleSubmit: It now *only* handles "Return"
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!formData.reason) {
      toast.error('Reason for return is required.');
      setLoading(false);
      return;
    }

    try {
      await officerAPI.createRequest({
        poolId: equipment.poolId,
        uniqueId: equipment._id, // Use equipment._id as that's what the parent passes
        requestType: 'Return', // Hardcoded as "Return"
        reason: formData.reason,
        priority: formData.priority,
        condition: formData.condition
      });
      toast.success('Return request submitted successfully');

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
              required
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
            {/* 6. "Lost" option removed from dropdown */}
            <select name="condition" value={formData.condition} onChange={handleChange}>
              <option>Excellent</option>
              <option>Good</option>
              <option>Fair</option>
              <option>Poor</option>
            </select>
          </div>
    
          {/* 7. FIR section removed from this modal */}
          
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Submitting...' : 'Submit'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};


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

// ======== 泙 8. NEW COMPONENT ADDED (NOW MODIFIED) 泙 ========
// ======== 泙 8. NEW COMPONENT (NOW WITH ADVANCED VALIDATION) 泙 ========
const LostModal = ({ equipment, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    reason: '', // This is the "description"
    firNumber: '',
    firDate: '',
    policeStation: '', 
    dateOfLoss: '',
    placeOfLoss: '',
    dutyAtTimeOfLoss: '',
    remedialActionTaken: '',
    condition: 'Lost', // Hardcoded
    priority: 'Urgent' // Hardcoded
  });
  const [loading, setLoading] = useState(false);
  // 1. Add state to hold validation errors
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // 2. Clear the specific error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  // 3. Create a comprehensive validation function
  const validateForm = () => {
    const { 
      reason, firNumber, firDate, policeStation, dateOfLoss, 
      placeOfLoss, dutyAtTimeOfLoss, remedialActionTaken 
    } = formData;
    
    const newErrors = {};
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Set to end of today to allow today's date

    // --- Date of Loss Validation ---
    let lossDate;
    if (!dateOfLoss) {
      newErrors.dateOfLoss = 'Date of Loss is required.';
    } else {
      lossDate = new Date(dateOfLoss);
      if (isNaN(lossDate.getTime())) {
        newErrors.dateOfLoss = 'Invalid date format.';
      } else if (lossDate > today) {
        newErrors.dateOfLoss = 'Date of Loss cannot be in the future.';
      }
    }

    // --- Place of Loss Validation ---
    if (!placeOfLoss || placeOfLoss.trim().length < 5) {
      newErrors.placeOfLoss = 'Must be at least 5 characters long.';
    }

    // --- Police Station Validation ---
    if (!policeStation || policeStation.trim().length < 5) {
      newErrors.policeStation = 'Must be at least 5 characters long.';
    }

    // --- Duty Validation ---
    if (!dutyAtTimeOfLoss || dutyAtTimeOfLoss.trim().length < 5) {
      newErrors.dutyAtTimeOfLoss = 'Must be at least 5 characters long.';
    }
    
    // --- FIR Number Validation (e.g., 123/2025) ---
    const firRegex = /^\d{1,5}\/\d{4}$/;
    if (!firNumber) {
      newErrors.firNumber = 'FIR Number is required.';
    } else if (!firRegex.test(firNumber)) {
      newErrors.firNumber = 'Format must be XXX/YYYY (e.g., 123/2025).';
    }

    // --- FIR Date Validation ---
    if (!firDate) {
      newErrors.firDate = 'FIR Date is required.';
    } else {
      const firDateObj = new Date(firDate);
      if (isNaN(firDateObj.getTime())) {
        newErrors.firDate = 'Invalid date format.';
      } else if (firDateObj > today) {
        newErrors.firDate = 'FIR Date cannot be in the future.';
      } else if (lossDate && firDateObj < lossDate) {
        // Cross-field validation
        newErrors.firDate = 'FIR Date cannot be before the Date of Loss.';
      }
    }

    // --- Remedial Action Validation ---
    if (!remedialActionTaken || remedialActionTaken.trim().length < 10) {
      newErrors.remedialActionTaken = 'Please describe the action taken (min 10 chars).';
    }
    
    // --- Description (Reason) Validation ---
    if (!reason || reason.trim().length < 10) {
      newErrors.reason = 'Please describe the incident (min 10 chars).';
    }
    
    setErrors(newErrors);
    // Return true if newErrors object is empty (no errors)
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 4. Run validation first
    if (!validateForm()) {
      toast.error('Please correct the errors in the form.');
      return; // Stop submission
    }
    
    // If validation passes, proceed with submission
    setLoading(true);
    try {
      await officerAPI.createRequest({
        poolId: equipment.poolId,
        uniqueId: equipment._id,
        requestType: 'Lost',
        condition: 'Lost',
        priority: 'Urgent',
        ...formData // Send all form data
      });
      onSuccess(); // Will show toast in parent
    } catch (error) {
      // The API interceptor in api.js will handle the toast
      console.error('Failed to submit lost report', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Report Lost Item: {equipment.name}</h3>
          <button onClick={onClose} className="close-btn">&times;</button>
        </div>

        <form onSubmit={handleSubmit} noValidate> {/* noValidate disables browser validation */}
          <div className="modal-body">
            <div className="equipment-summary">
              <p>{equipment.model} - ID: {equipment.serialNumber}</p>
            </div>

            <div className="form-note form-note-danger">
              <p><strong>Warning:</strong> Reporting an item as lost is a serious matter and will require an official investigation.</p>
            </div>

            {/* 5. Add error display spans under each input */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Date of Loss <span className="required">*</span></label>
                <input
                  type="date"
                  name="dateOfLoss"
                  value={formData.dateOfLoss}
                  onChange={handleChange}
                  className={`form-control ${errors.dateOfLoss ? 'is-invalid' : ''}`}
                  required
                />
                {errors.dateOfLoss && <span className="error-text">{errors.dateOfLoss}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Place of Loss <span className="required">*</span></label>
                <input
                  type="text"
                  name="placeOfLoss"
                  value={formData.placeOfLoss}
                  onChange={handleChange}
                  className={`form-control ${errors.placeOfLoss ? 'is-invalid' : ''}`}
                  placeholder="e.g., Sector 17 Market"
                  required
                />
                {errors.placeOfLoss && <span className="error-text">{errors.placeOfLoss}</span>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Police Station <span className="required">*</span></label>
                <input
                  type="text"
                  name="policeStation"
                  value={formData.policeStation}
                  onChange={handleChange}
                  className={`form-control ${errors.policeStation ? 'is-invalid' : ''}`}
                  placeholder="e.g., Central Station"
                  required
                />
                {errors.policeStation && <span className="error-text">{errors.policeStation}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Duty at Time of Loss <span className="required">*</span></label>
                <input
                  type="text"
                  name="dutyAtTimeOfLoss"
                  value={formData.dutyAtTimeOfLoss}
                  onChange={handleChange}
                  className={`form-control ${errors.dutyAtTimeOfLoss ? 'is-invalid' : ''}`}
                  placeholder="e.g., Night Patrol, Checkpoint"
                  required
                />
                {errors.dutyAtTimeOfLoss && <span className="error-text">{errors.dutyAtTimeOfLoss}</span>}
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">FIR Number <span className="required">*</span></label>
                <input
                  type="text"
                  name="firNumber"
                  value={formData.firNumber}
                  onChange={handleChange}
                  className={`form-control ${errors.firNumber ? 'is-invalid' : ''}`}
                  placeholder="e.g., 123/2025"
                  required
                />
                {errors.firNumber && <span className="error-text">{errors.firNumber}</span>}
              </div>
              <div className="form-group">
                  <label className="form-label">FIR Date <span className="required">*</span></label>
                  <input
                    type="date"
                    name="firDate"
                    value={formData.firDate}
                    onChange={handleChange}
                    className={`form-control ${errors.firDate ? 'is-invalid' : ''}`}
                    required
                  />
                  {errors.firDate && <span className="error-text">{errors.firDate}</span>}
                </div>
            </div>
            
            <div className="form-group">
              <label className="form-label">Remedial Action Taken <span className="required">*</span></label>
              <textarea
                name="remedialActionTaken"
                value={formData.remedialActionTaken}
                onChange={handleChange}
                className={`form-control ${errors.remedialActionTaken ? 'is-invalid' : ''}`}
                rows="3"
                placeholder="Describe actions taken after the loss (e.g., 'Searched the area', 'Informed duty officer')"
                required
              />
              {errors.remedialActionTaken && <span className="error-text">{errors.remedialActionTaken}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Description of Incident <span className="required">*</span></label>
              <textarea
                name="reason" // This is the 'description'
                value={formData.reason}
                onChange={handleChange}
                className={`form-control ${errors.reason ? 'is-invalid' : ''}`}
                rows="3"
                placeholder="Describe how the item was lost (min 10 chars)"
                required
              />
              {errors.reason && <span className="error-text">{errors.reason}</span>}
            </div>
            
          </div>
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-danger" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Lost Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReturnEquipment;