import React, { useState, useEffect } from 'react';
// ======== 🟢 MODIFIED 🟢 ========
import { officerAPI, handleApiError, equipmentAPI } from '../../utils/api'; 
import { toast } from 'react-toastify';
// ======== 🟢 MODIFIED 🟢 ========
import ItemHistoryModal from './ItemHistoryModal'; // Import the new modal

// ... (RequestEquipment component setup is unchanged) ...

const RequestEquipment = ({ onRequestSubmitted }) => {
  const [pools, setPools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedPool, setSelectedPool] = useState(null);
  
  const [requestData, setRequestData] = useState({
    reason: '', 
    priority: 'Medium',
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
    // ... (this function is unchanged)
    try {
      setLoading(true);
      const response = await officerAPI.getAuthorizedEquipmentPools({
        category: categoryFilter,
        search: searchTerm
      });
      
      if (response.data.success) {
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
    // ... (this function is unchanged)
    const { name, value } = e.target;
    setRequestData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  const handleOpenModal = (pool) => {
    // ... (this function is unchanged)
    setSelectedPool(pool);
    setRequestData({
      reason: '',
      priority: 'Medium',
      expectedDuration: '',
      notes: ''
    });
    setShowRequestModal(true);
  };

  const handleSubmitRequest = async (e) => {
    // ... (this function is unchanged)
    e.preventDefault();

    if (!selectedPool || !selectedPool._id) {
      return toast.error('Please select an equipment pool before submitting.');
    }
    
    if (!requestData.reason.trim() || requestData.reason.trim().length < 10) { 
      return toast.error('Reason for request must be at least 10 characters long.');
    }

    const payload = {
      poolId: selectedPool._id,
      poolName: selectedPool.poolName,
      reason: requestData.reason,
      priority: requestData.priority,
      expectedDuration: requestData.expectedDuration,
    };
    
    if (requestData.notes) {
        payload.notes = requestData.notes;
    }

    try {
      await officerAPI.requestEquipmentFromPool(payload);
      toast.success('Equipment request submitted successfully!');
      setShowRequestModal(false);
      setRequestData({
        reason: '',
        priority: 'Medium',
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
      toast.error(errorMessage); 
    }
  };

  const filteredPools = pools.filter(pool => pool.availableCount > 0);

  const PoolStatusMessage = () => {
    // ... (this function is unchanged)
    if (loading) return <p className="status-text">Loading authorized equipment pools...</p>;
    if (pools.length === 0 && !categoryFilter && !searchTerm) return <p className="status-text no-pools">No equipment pools are currently authorized for your designation.</p>;
    if (pools.length === 0) return <p className="status-text no-pools">No pools found matching your filters.</p>;
    if (filteredPools.length === 0) return <p className="status-text all-issued">All authorized equipment for this filter is currently issued or under maintenance.</p>;
    return null;
  };

  return (
    <div className="request-equipment-section">
      {/* ... (filter bar and pool list JSX is unchanged) ... */}
      <h3>Request Equipment</h3>
      
      <div className="filter-bar">
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
              <p>Category: {pool.category} | Manufacturer: {pool.manufacturer || 'N/A'}</p>
            </div>
            
            <div className="pool-summary-stats">
              <span className="stat-item available">
                <strong>{pool.availableCount}</strong> Available
              </span>
              <span className="stat-item issued">
                <strong>{pool.issuedCount}</strong> Currently Issued
              </span>
              <span className="stat-item maintenance">
                <strong>{pool.maintenanceCount}</strong> In Maintenance
              </span>
              <span className="stat-item total">
                <strong>{pool.totalQuantity}</strong> Total
              </span>
            </div>
            
            <div className="pool-actions">
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
        // ======== 🟢 MODIFIED 🟢 ========
        // Pass all modal functions to the new RequestModal component
        <RequestModal
          pool={selectedPool}
          requestData={requestData}
          onClose={() => setShowRequestModal(false)}
          onSubmit={handleSubmitRequest}
          onInputChange={handleInputChange}
        />
      )}
    </div>
  );
};

// ======== 🟢 NEW COMPONENT 🟢 ========
// We've extracted the modal logic into its own component
// to manage the new history-fetching state.

const RequestModal = ({ pool, requestData, onClose, onSubmit, onInputChange }) => {
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [availableItems, setAvailableItems] = useState([]);
  const [showItems, setShowItems] = useState(false);

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedUniqueId, setSelectedUniqueId] = useState(null);

  // Function to fetch the full pool details and filter for available items
  const fetchAvailableItems = async () => {
    setLoadingDetails(true);
    try {
      const response = await officerAPI.getEquipmentDetails(pool._id);
      if (response.data.success) {
        const items = response.data.data.equipment.items;
        setAvailableItems(items.filter(item => item.status === 'Available'));
        setShowItems(true);
      } else {
        toast.error('Could not load item details.');
      }
    } catch (error) {
      toast.error('Failed to fetch item details.');
    } finally {
      setLoadingDetails(false);
    }
  };

  // Handler to open the item history modal
  const handleViewHistory = (uniqueId) => {
    setSelectedUniqueId(uniqueId);
    setShowHistoryModal(true);
  };

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Request from Pool: {pool.poolName}</h3>
            <p>Available: {pool.availableCount}</p>
          </div>
          
          <form onSubmit={onSubmit}>
            <div className="modal-body">
              <div className="form-group">
                <label>Reason / Purpose <span className="required">*</span></label>
                <textarea
                  name="reason" 
                  value={requestData.reason} 
                  onChange={onInputChange}
                  placeholder="e.g., Patrol duty, Special assignment... (min 10 characters)"
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
                    onChange={onInputChange}
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
                    onChange={onInputChange}
                    placeholder="e.g., 7 days, 1 month"
                  />
                </div>
              </div>

              {/* ======== 🟢 NEW HISTORY SECTION 🟢 ======== */}
              <div className="detail-section">
                {!showItems ? (
                  <button 
                    type="button" 
                    className="btn btn-secondary btn-sm"
                    onClick={fetchAvailableItems}
                    disabled={loadingDetails}
                  >
                    {loadingDetails ? 'Loading Items...' : 'View Available Item History'}
                  </button>
                ) : (
                  <>
                    <label>Available Items ({availableItems.length})</label>
                    <div className="item-history-list">
                      {availableItems.length === 0 ? (
                        <p>No specific items are listed as available.</p>
                      ) : (
                        availableItems.map(item => (
                          <div key={item.uniqueId} className="item-history-row">
                            <span>
                              <strong>ID:</strong> {item.uniqueId} | <strong>Condition:</strong> {item.condition}
                            </span>
                            <button 
                              type="button" 
                              className="btn btn-info btn-sm"
                              onClick={() => handleViewHistory(item.uniqueId)}
                            >
                              View History
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
              {/* ===================================== */}

            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
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

      {/* This will show the ItemHistoryModal when a uniqueId is selected */}
      {showHistoryModal && (
        <ItemHistoryModal
          poolId={pool._id}
          uniqueId={selectedUniqueId}
          onClose={() => setShowHistoryModal(false)}
        />
      )}
    </>
  );
};


export default RequestEquipment;