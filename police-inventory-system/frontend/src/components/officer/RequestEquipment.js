import React, { useState, useEffect } from 'react';
// FIX 1: Import handleApiError to fix the ESLint warning/runtime issue
import { officerAPI, handleApiError } from '../../utils/api'; 
import { toast } from 'react-toastify';

const RequestEquipment = ({ onRequestSubmitted }) => {
  const [pools, setPools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedPool, setSelectedPool] = useState(null);
  
  // ======== 🛑 FIX 2 (Secondary) 🛑 ========
  // Changed default priority from "Normal" to "Medium" to match the select options
  const [requestData, setRequestData] = useState({
    reason: '', 
    priority: 'Medium', // <-- Changed from 'Normal'
    expectedDuration: '',
    notes: ''
  });
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const categories = [
    'Firearm', 'Ammunition', 'Protective Gear', 'Communication Device',
    'Vehicle', 'Tactical Equipment', 'Less-Lethal Weapon', 'Forensic Equipment',
    'Medical Supplies', 'Office Equipment', 'Other'
  ];

  useEffect(() => {
    fetchAuthorizedPools();
  }, [categoryFilter, searchTerm]);

  const fetchAuthorizedPools = async () => {
    try {
      setLoading(true);
      const response = await officerAPI.getAuthorizedEquipmentPools({
        category: categoryFilter,
        search: searchTerm
      });
      
      if (response.data.success) {
        // Only show pools with available items
        const availablePools = response.data.data.pools.filter(pool => pool.availableCount > 0);
        setPools(availablePools);
      }
    } catch (error) {
      console.error('Error fetching authorized pools:', error);
      toast.error(handleApiError(error, 'Failed to load equipment pools.'));
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setRequestData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  const handleOpenModal = (pool) => {
    setSelectedPool(pool);
    // Resetting requestData with the correct 'reason' field and 'Medium' priority
    setRequestData({
      reason: '',
      priority: 'Medium', // <-- Changed from 'Normal'
      expectedDuration: '',
      notes: ''
    });
    setShowRequestModal(true);
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();

    if (!selectedPool || !selectedPool._id) {
      return toast.error('Please select an equipment pool before submitting.');
    }
    
    // FIX 3: Validation check uses the correct 'reason' field and checks for min length (e.g., 10 chars)
    if (!requestData.reason.trim() || requestData.reason.trim().length < 10) { 
      return toast.error('Reason for request must be at least 10 characters long.');
    }

    // ======== 🛑 FIX 1 (Main) 🛑 ========
    // Added 'poolName' to the payload to satisfy backend validation
    const payload = {
      poolId: selectedPool._id,
      poolName: selectedPool.poolName, // <-- Added this required field
      reason: requestData.reason,
      priority: requestData.priority,
      expectedDuration: requestData.expectedDuration,
    };
    
    if (requestData.notes) {
        payload.notes = requestData.notes;
    }

    try {
      // FIX 4: Ensure the correct payload is sent (already done in previous step)
      await officerAPI.requestEquipmentFromPool(payload);
      
      toast.success('Equipment request submitted successfully!');
      
      setShowRequestModal(false);
      setRequestData({
        reason: '',
        priority: 'Medium', // <-- Changed from 'Normal'
        expectedDuration: '',
        notes: ''
      });
      setSelectedPool(null);
      
      fetchAuthorizedPools(); 
      if (onRequestSubmitted) {
        onRequestSubmitted();
      }

    } catch (error) {
      const errorMessage = handleApiError(error, 'Failed to submit request.');
      console.error('Submit request error:', error);
      // This will now show the specific error message from the server (e.g., 'Validation failed: reason is required')
      toast.error(errorMessage); 
    }
  };

  const filteredPools = pools.filter(pool => pool.availableCount > 0);

  const PoolStatusMessage = () => {
    if (loading) return <p className="status-text">Loading authorized equipment pools...</p>;
    if (pools.length === 0) return <p className="status-text no-pools">No equipment pools authorized for your designation.</p>;
    if (filteredPools.length === 0) return <p className="status-text all-issued">All authorized equipment is currently issued or under maintenance.</p>;
    return null;
  };


  return (
    <div className="request-equipment-section">
      <h3>Request Equipment</h3>
      
      <div className="filter-bar">
        {/* Category Filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="filter-select"
        >
          <option value="">All Categories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        
        {/* Search Bar */}
        <input
          type="text"
          placeholder="Search by name, model, or manufacturer..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="filter-search"
        />
      </div>

      <div className="equipment-pool-list">
        <PoolStatusMessage />

        {filteredPools.map(pool => (
          <div key={pool._id} className="pool-card">
            <div className="pool-info">
              <h4>{pool.poolName} ({pool.model})</h4>
              <p>Category: {pool.category} | Manufacturer: {pool.manufacturer}</p>
            </div>
            <div className="pool-stats">
              <span className="available-count">
                Available: <strong>{pool.availableCount}</strong> / {pool.totalQuantity}
              </span>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => handleOpenModal(pool)}
                disabled={pool.availableCount === 0}
              >
                Request
              </button>
            </div>
          </div>
        ))}
      </div>

      {showRequestModal && selectedPool && (
        <div className="modal-overlay" onClick={() => setShowRequestModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Request from Pool: {selectedPool.poolName}</h3>
              <p>Available: {selectedPool.availableCount}</p>
            </div>
            <form onSubmit={handleSubmitRequest}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Reason / Purpose <span className="required">*</span></label>
                  <textarea
                    // FIX 5: Correcting form binding to 'reason'
                    name="reason" 
                    value={requestData.reason} 
                    onChange={handleInputChange}
                    placeholder="e.g., Patrol duty, Special assignment, Training exercise... (min 10 characters)"
                    rows="3"
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Urgency / Priority</label>
                    <select
                      name="priority"
                      value={requestData.priority}
                      onChange={handleInputChange}
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Expected Duration</label>
                    <input
                      type="text"
                      name="expectedDuration"
                      value={requestData.expectedDuration}
                      onChange={handleInputChange}
                      placeholder="e.g., 7 days, 1 month"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Additional Notes</label>
                  <textarea
                    name="notes"
                    value={requestData.notes}
                    onChange={handleInputChange}
                    placeholder="Any additional information..."
                    rows="2"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowRequestModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestEquipment;