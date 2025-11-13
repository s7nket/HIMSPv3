import React, { useState, useEffect } from 'react';
import { officerAPI } from '../../utils/api';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';

const ReturnEquipment = ({ onEquipmentReturned }) => {
  const { user } = useAuth();
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
  
  const handleRefresh = () => {
    fetchIssuedEquipment();
    if (onEquipmentReturned) onEquipmentReturned();
  }

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading your issued equipment...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="management-header">
        <div>
            <h3>Equipment Issued to You</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
                Manage items currently in your possession.
            </p>
        </div>
      </div>

      {issuedEquipment.length === 0 ? (
        <div className="no-data">
          <h3>No Equipment Issued</h3>
          <p>You don't have any equipment currently assigned to you.</p>
        </div>
      ) : (
        <div className="equipment-pool-list">
          {issuedEquipment.map((equipment) => (
            <IssuedEquipmentCard
              key={equipment._id}
              equipment={equipment}
              onReturn={handleReturnRequest}
              onRefresh={handleRefresh}
              policeStation={user?.policeStation}
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
          onSuccess={handleRefresh}
        />
      )}
    </div>
  );
};

const IssuedEquipmentCard = ({ equipment, onReturn, onRefresh, policeStation }) => {
  const isOverdue = equipment.issuedTo.expectedReturnDate && 
    new Date(equipment.issuedTo.expectedReturnDate) < new Date();

  const daysHeld = Math.floor(
    (new Date() - new Date(equipment.issuedTo.issuedDate)) / (1000 * 60 * 60 * 24)
  );
  
  const [showMaintModal, setShowMaintModal] = useState(false);
  const [showLostModal, setShowLostModal] = useState(false);

  return (
    <>
      <div className={`equipment-card ${isOverdue ? 'overdue' : ''}`} style={isOverdue ? { borderColor: 'var(--color-danger)' } : {}}>
        <div className="pool-info">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <h4>{equipment.name}</h4>
            {isOverdue && <span className="badge badge-danger">Overdue</span>}
          </div>
          <p className="equipment-model">{equipment.model} • {equipment.category}</p>
          <p style={{ fontSize: '13px', color: 'var(--text-light)', marginTop: '4px' }}>Serial: {equipment.serialNumber}</p>
        </div>

        {/* Reuse pool-summary-stats but override grid to 3 columns for this specific card */}
        <div className="pool-summary-stats" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <div className="stat-item">
            <strong>{new Date(equipment.issuedTo.issuedDate).toLocaleDateString()}</strong> Issued
          </div>
          <div className="stat-item">
            <strong>{daysHeld}</strong> Days Held
          </div>
          <div className="stat-item" style={isOverdue ? { color: 'var(--color-danger-text)' } : {}}>
            <strong style={isOverdue ? { color: 'var(--color-danger-text)' } : {}}>
                {equipment.issuedTo.expectedReturnDate ? new Date(equipment.issuedTo.expectedReturnDate).toLocaleDateString() : 'N/A'}
            </strong> Return By
          </div>
        </div>

        <div className="equipment-actions">
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button
              onClick={() => onReturn(equipment)}
              className={`btn btn-sm ${isOverdue ? 'btn-danger' : 'btn-primary'}`}
            >
              Return
            </button>
            <button
              onClick={() => setShowMaintModal(true)}
              className="btn btn-sm btn-secondary"
            >
              Report Issue
            </button>
            <button
              onClick={() => setShowLostModal(true)}
              className="btn btn-sm btn-danger"
              style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca' }}
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

      {showLostModal && (
        <LostModal
          equipment={equipment}
          policeStation={policeStation}
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

const ReturnModal = ({ equipment, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    reason: '',
    priority: 'Medium',
    condition: equipment?.condition || 'Good',
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

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
        uniqueId: equipment._id,
        requestType: 'Return',
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
              className="form-control"
              placeholder="Enter reason for returning equipment"
              required
            />
          </div>
    
          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
                <label>Priority</label>
                <select name="priority" value={formData.priority} onChange={handleChange} className="form-control">
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
                <option>Urgent</option>
                </select>
            </div>
        
            <div className="form-group">
                <label>Condition</label>
                <select name="condition" value={formData.condition} onChange={handleChange} className="form-control">
                <option>Excellent</option>
                <option>Good</option>
                <option>Fair</option>
                <option>Poor</option>
                </select>
            </div>
          </div>
          
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Submitting...' : 'Submit Return'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const MaintenanceModal = ({ equipment, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    reason: '',
    priority: 'High',
    condition: 'Poor'
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
      await officerAPI.createRequest({
        poolId: equipment.poolId,
        uniqueId: equipment._id,
        requestType: 'Maintenance',
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
          <h3>Report Issue: {equipment.name}</h3>
          <button onClick={onClose} className="close-btn">&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div style={{ backgroundColor: 'var(--bg-table-header)', padding: '12px', borderRadius: '8px', marginBottom: '20px' }}>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>
                <strong>Model:</strong> {equipment.model} <br/> 
                <strong>ID:</strong> {equipment.serialNumber}
              </p>
            </div>

            <div className="form-group">
              <label>Problem Description <span style={{ color: 'var(--color-danger)' }}>*</span></label>
              <textarea
                name="reason"
                value={formData.reason}
                onChange={handleChange}
                className="form-control"
                rows="4"
                placeholder="Describe the problem (e.g., 'Sight is misaligned', 'Firing pin jams')"
                required
              />
            </div>

            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label>Urgency</label>
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
                <label>Current Condition</label>
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
          </div>
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-danger" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const LostModal = ({ equipment, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    reason: '',
    firNumber: '',
    firDate: '',
    policeStation: '', 
    dateOfLoss: '',
    placeOfLoss: '',
    dutyAtTimeOfLoss: '',
    remedialActionTaken: '',
    condition: 'Lost',
    priority: 'Urgent'
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = () => {
    const { 
      reason, firNumber, firDate, policeStation, dateOfLoss, 
      placeOfLoss, dutyAtTimeOfLoss, remedialActionTaken 
    } = formData;
    
    const newErrors = {};
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (!dateOfLoss) {
      newErrors.dateOfLoss = 'Date of Loss is required.';
    } else if (new Date(dateOfLoss) > today) {
      newErrors.dateOfLoss = 'Date of Loss cannot be in the future.';
    }

    if (!placeOfLoss || placeOfLoss.trim().length < 5) newErrors.placeOfLoss = 'Must be at least 5 characters long.';
    if (!policeStation || policeStation.trim().length < 5) newErrors.policeStation = 'Must be at least 5 characters long.';
    if (!dutyAtTimeOfLoss || dutyAtTimeOfLoss.trim().length < 5) newErrors.dutyAtTimeOfLoss = 'Must be at least 5 characters long.';
    
    const firRegex = /^\d{1,5}\/\d{4}$/;
    if (!firNumber) newErrors.firNumber = 'FIR Number is required.';
    else if (!firRegex.test(firNumber)) newErrors.firNumber = 'Format must be XXX/YYYY (e.g., 123/2025).';

    if (!firDate) newErrors.firDate = 'FIR Date is required.';
    else if (new Date(firDate) > today) newErrors.firDate = 'FIR Date cannot be in the future.';

    if (!remedialActionTaken || remedialActionTaken.trim().length < 10) newErrors.remedialActionTaken = 'Describe action taken (min 10 chars).';
    if (!reason || reason.trim().length < 10) newErrors.reason = 'Describe incident (min 10 chars).';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Please correct the errors in the form.');
      return;
    }
    setLoading(true);
    try {
      await officerAPI.createRequest({
        poolId: equipment.poolId,
        uniqueId: equipment._id,
        requestType: 'Lost',
        condition: 'Lost',
        priority: 'Urgent',
        ...formData
      });
      onSuccess();
    } catch (error) {
      console.error('Failed to submit lost report', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Report Lost Item: {equipment.name}</h3>
          <button onClick={onClose} className="close-btn">&times;</button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-body">
            <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px' }}>
              <strong>Warning:</strong> Reporting an item as lost is a serious matter and will require an official investigation.
            </div>

            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label>Date of Loss <span style={{ color: 'red' }}>*</span></label>
                <input
                  type="date"
                  name="dateOfLoss"
                  value={formData.dateOfLoss}
                  onChange={handleChange}
                  className={`form-control ${errors.dateOfLoss ? 'is-invalid' : ''}`}
                />
                {errors.dateOfLoss && <span style={{ color: 'red', fontSize: '12px' }}>{errors.dateOfLoss}</span>}
              </div>
              <div className="form-group">
                <label>Place of Loss <span style={{ color: 'red' }}>*</span></label>
                <input
                  type="text"
                  name="placeOfLoss"
                  value={formData.placeOfLoss}
                  onChange={handleChange}
                  className={`form-control ${errors.placeOfLoss ? 'is-invalid' : ''}`}
                  placeholder="e.g., Sector 17 Market"
                />
                {errors.placeOfLoss && <span style={{ color: 'red', fontSize: '12px' }}>{errors.placeOfLoss}</span>}
              </div>
            </div>

            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label>Police Station <span style={{ color: 'red' }}>*</span></label>
                <input
                  type="text"
                  name="policeStation"
                  value={formData.policeStation}
                  onChange={handleChange}
                  className={`form-control ${errors.policeStation ? 'is-invalid' : ''}`}
                  placeholder="e.g., Central Station"
                />
                {errors.policeStation && <span style={{ color: 'red', fontSize: '12px' }}>{errors.policeStation}</span>}
              </div>
              <div className="form-group">
                <label>Duty at Time of Loss <span style={{ color: 'red' }}>*</span></label>
                <input
                  type="text"
                  name="dutyAtTimeOfLoss"
                  value={formData.dutyAtTimeOfLoss}
                  onChange={handleChange}
                  className={`form-control ${errors.dutyAtTimeOfLoss ? 'is-invalid' : ''}`}
                  placeholder="e.g., Night Patrol"
                />
                {errors.dutyAtTimeOfLoss && <span style={{ color: 'red', fontSize: '12px' }}>{errors.dutyAtTimeOfLoss}</span>}
              </div>
            </div>
            
            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label>FIR Number <span style={{ color: 'red' }}>*</span></label>
                <input
                  type="text"
                  name="firNumber"
                  value={formData.firNumber}
                  onChange={handleChange}
                  className={`form-control ${errors.firNumber ? 'is-invalid' : ''}`}
                  placeholder="e.g., 123/2025"
                />
                {errors.firNumber && <span style={{ color: 'red', fontSize: '12px' }}>{errors.firNumber}</span>}
              </div>
              <div className="form-group">
                  <label>FIR Date <span style={{ color: 'red' }}>*</span></label>
                  <input
                    type="date"
                    name="firDate"
                    value={formData.firDate}
                    onChange={handleChange}
                    className={`form-control ${errors.firDate ? 'is-invalid' : ''}`}
                  />
                  {errors.firDate && <span style={{ color: 'red', fontSize: '12px' }}>{errors.firDate}</span>}
                </div>
            </div>
            
            <div className="form-group">
              <label>Remedial Action Taken <span style={{ color: 'red' }}>*</span></label>
              <textarea
                name="remedialActionTaken"
                value={formData.remedialActionTaken}
                onChange={handleChange}
                className={`form-control ${errors.remedialActionTaken ? 'is-invalid' : ''}`}
                rows="3"
                placeholder="Action taken after loss..."
              />
              {errors.remedialActionTaken && <span style={{ color: 'red', fontSize: '12px' }}>{errors.remedialActionTaken}</span>}
            </div>

            <div className="form-group">
              <label>Description of Incident <span style={{ color: 'red' }}>*</span></label>
              <textarea
                name="reason"
                value={formData.reason}
                onChange={handleChange}
                className={`form-control ${errors.reason ? 'is-invalid' : ''}`}
                rows="3"
                placeholder="Describe how the item was lost..."
              />
              {errors.reason && <span style={{ color: 'red', fontSize: '12px' }}>{errors.reason}</span>}
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