import React, { useState, useEffect } from 'react';
import { officerAPI } from '../../utils/api';
import { toast } from 'react-toastify';

const ViewInventory = () => {
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [categories, setCategories] = useState([]);
  const [selectedPool, setSelectedPool] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    fetchEquipment();
  }, [currentPage, categoryFilter, searchTerm]);

  const fetchEquipment = async () => {
    try {
      setLoading(true);
      const response = await officerAPI.getInventory({
        page: currentPage,
        limit: 15,
        category: categoryFilter,
        search: searchTerm
      });

      if (response.data.success) {
        setEquipment(response.data.data.equipment);
        setCategories(response.data.data.categories || []);
        setTotalPages(response.data.data.pagination.pages);
      }
    } catch (error) {
      toast.error('Failed to fetch equipment pools');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (poolId) => {
    try {
      const response = await officerAPI.getEquipmentDetails(poolId);
      if (response.data.success) {
        setSelectedPool(response.data.data.equipment);
        setShowDetailsModal(true);
      }
    } catch (error) {
      toast.error('Failed to fetch equipment pool details');
    }
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading authorized equipment pools...</p>
      </div>
    );
  }

  return (
    <div className="view-inventory">
      <div className="management-header">
        <div className="search-filters">
          <input
            type="text"
            placeholder="Search equipment pools..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="filter-search"
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="filter-select"
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          {equipment.length} pools found
        </div>
      </div>

      {equipment.length === 0 ? (
        <div className="no-data">
          <h3>No Results</h3>
          <p>No equipment pools found matching your criteria.</p>
        </div>
      ) : (
        <>
          <div className="inventory-table">
            <table className="table">
              <thead>
                <tr>
                  <th>Pool Name</th>
                  <th>Category</th>
                  <th>Model</th>
                  <th>Total</th>
                  <th>Available</th>
                  <th>Issued</th>
                  <th>Location</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {equipment.map((pool) => (
                  <tr key={pool._id}>
                    <td>
                      <strong>{pool.poolName}</strong>
                      <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>{pool.manufacturer}</div>
                    </td>
                    <td>{pool.category}</td>
                    <td>{pool.model}</td>
                    <td>{pool.totalQuantity}</td>
                    <td>
                      <span className={`badge badge-${
                        pool.availableCount > 10 ? 'success' :
                        pool.availableCount > 5 ? 'warning' : 'danger'
                      }`}>
                        {pool.availableCount}
                      </span>
                    </td>
                    <td>{pool.issuedCount}</td>
                    <td>{pool.location}</td>
                    <td>
                      <button
                        onClick={() => handleViewDetails(pool._id)}
                        className="btn btn-secondary btn-sm"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="btn btn-secondary"
              >
                Previous
              </button>
              <span>Page {currentPage} of {totalPages}</span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="btn btn-secondary"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {showDetailsModal && selectedPool && (
        <EquipmentDetailsModal
          pool={selectedPool}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedPool(null);
          }}
        />
      )}
    </div>
  );
};

const EquipmentDetailsModal = ({ pool, onClose }) => {
  // Helper style for grid items
  const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' };
  const itemStyle = { fontSize: '14px', color: 'var(--text-secondary)' };
  const labelStyle = { display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-light)', textTransform: 'uppercase', marginBottom: '4px' };
  const valueStyle = { color: 'var(--text-primary)', fontWeight: '500' };
  const sectionStyle = { backgroundColor: 'var(--bg-table-header)', padding: '16px', borderRadius: '8px', marginBottom: '20px' };
  const h4Style = { marginTop: 0, marginBottom: '12px', fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Pool Details: {pool.poolName}</h3>
          <button onClick={onClose} className="close-btn">&times;</button>
        </div>

        <div className="modal-body">
          
          {/* General Info Section */}
          <div style={sectionStyle}>
            <h4 style={h4Style}>Information</h4>
            <div style={gridStyle}>
              <div style={itemStyle}><span style={labelStyle}>Model</span><span style={valueStyle}>{pool.model}</span></div>
              <div style={itemStyle}><span style={labelStyle}>Category</span><span style={valueStyle}>{pool.category}</span></div>
              <div style={itemStyle}><span style={labelStyle}>Manufacturer</span><span style={valueStyle}>{pool.manufacturer}</span></div>
              <div style={itemStyle}><span style={labelStyle}>Location</span><span style={valueStyle}>{pool.location}</span></div>
            </div>
          </div>

          {/* Statistics Section */}
          <div style={sectionStyle}>
            <h4 style={h4Style}>Inventory Status</h4>
            <div style={gridStyle}>
              <div style={itemStyle}><span style={labelStyle}>Total Quantity</span><span style={valueStyle}>{pool.totalQuantity}</span></div>
              <div style={itemStyle}><span style={labelStyle}>Available</span>
                <span className={`badge badge-${
                    pool.availableCount > 10 ? 'success' :
                    pool.availableCount > 5 ? 'warning' : 'danger'
                }`} style={{ verticalAlign: 'middle', marginLeft: '4px' }}>
                    {pool.availableCount}
                </span>
              </div>
              <div style={itemStyle}><span style={labelStyle}>Issued</span><span style={valueStyle}>{pool.issuedCount}</span></div>
              <div style={itemStyle}><span style={labelStyle}>Maintenance</span><span style={{...valueStyle, color: 'var(--color-warning-text)'}}>{pool.maintenanceCount}</span></div>
              <div style={itemStyle}><span style={labelStyle}>Damaged/Lost</span><span style={{...valueStyle, color: 'var(--color-danger-text)'}}>{pool.damagedCount}</span></div>
            </div>
          </div>

          {/* Authorization & Meta */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div style={sectionStyle}>
                <h4 style={h4Style}>Authorized For</h4>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', color: 'var(--text-primary)' }}>
                    {pool.authorizedDesignations.map(d => <li key={d}>{d}</li>)}
                </ul>
            </div>
            <div style={sectionStyle}>
                <h4 style={h4Style}>Metadata</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={itemStyle}><span style={labelStyle}>Cost</span><span style={valueStyle}>{pool.totalCost ? `$${pool.totalCost}` : 'N/A'}</span></div>
                    <div style={itemStyle}><span style={labelStyle}>Supplier</span><span style={valueStyle}>{pool.supplier || 'N/A'}</span></div>
                </div>
            </div>
          </div>

          {pool.notes && (
            <div style={sectionStyle}>
              <h4 style={h4Style}>Notes</h4>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>{pool.notes}</p>
            </div>
          )}
        </div>
        
        <div className="modal-actions">
            <button onClick={onClose} className="btn btn-secondary">Close</button>
        </div>
      </div>
    </div>
  );
};

export default ViewInventory;