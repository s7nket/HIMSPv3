import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../utils/api';
import { toast } from 'react-toastify';

const ProcessRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('Pending');
  const [typeFilter, setTypeFilter] = useState('');
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  
  // 1. ADDED STATE for the new details modal
  const [showLostDetailsModal, setShowLostDetailsModal] = useState(false);
  
  const [selectedRequest, setSelectedRequest] = useState(null);

  useEffect(() => {
    fetchRequests();
  }, [currentPage, statusFilter, typeFilter]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getRequests({
        page: currentPage,
        limit: 10,
        status: statusFilter,
        requestType: typeFilter
      });

      if (response.data.success) {
        setRequests(response.data.data.requests);
        setTotalPages(response.data.data.pagination.pages);
      }
    } catch (error) {
      toast.error('Failed to fetch requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveClick = (request) => {
    setSelectedRequest(request);
    setShowApprovalModal(true);
  };

  const handleRejectClick = (request) => {
    setSelectedRequest(request);
    setShowRejectionModal(true);
  };

  // 2. ADDED HANDLER for the new modal
  const handleViewLostDetailsClick = (request) => {
    setSelectedRequest(request);
    setShowLostDetailsModal(true);
  };

  // 3. UPDATED handleCloseModals
  const handleCloseModals = () => {
    setShowApprovalModal(false);
    setShowRejectionModal(false);
    setShowLostDetailsModal(false); // <-- Add this line
    setSelectedRequest(null);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading requests...</p>
      </div>
    );
  }

  return (
    <>
      <div className="process-requests">
        <div className="management-header">
          <div className="search-filters">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="form-control"
            >
              <option value="">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="form-control"
            >
              <option value="">All Types</option>
              <option value="Issue">Issue</option>
              <option value="Return">Return</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Lost">Lost</option>
            </select>
          </div>
        </div>

        {requests.length === 0 ? (
          <div className="no-data">
            <p>No requests found.</p>
          </div>
        ) : (
          <>
            <div className="requests-table">
              <table className="table">
                <thead>
                  <tr>
                    <th>Request ID</th>
                    <th>Officer</th>
                    <th>Item & Reason</th>
                    <th>Type</th>
                    <th>Priority</th>
                    <th>Date & Time</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((request) => (
                    <tr key={request._id}>
                      <td>{request.requestId || request._id.slice(-8).toUpperCase()}</td>
                      <td>
                        {request.requestedBy ? (
                          <>
                            <strong>{request.requestedBy.fullName}</strong>
                            <br />
                            <small>{request.requestedBy.designation || 'N/A'}</small>
                          </>
                        ) : 'N/A'}
                      </td>
                      <td>
                        <strong>
                          {request.poolId?.poolName || request.poolName || request.equipmentId?.name || 'N/A'}
                        </strong>
                        
                        {request.reason && (
                          <p className="request-reason" title={request.reason}>
                            {request.reason}
                          </p>
                        )}
                      </td>
                      <td>
                        <span className={`badge badge-${request.requestType === 'Issue' ? 'info' : (request.requestType === 'Return' ? 'warning' : 'danger')}`}>
                          {request.requestType}
                        </span>
                      </td>
                      <td>
                        <span className={`badge badge-${getPriorityBadgeClass(request.priority)}`}>
                          {request.priority}
                        </span>
                      </td>
                      <td>{new Date(request.createdAt).toLocaleString()}</td>
                      <td>
                        <span className={`badge badge-${getStatusBadgeClass(request.status)}`}>
                          {request.status}
                        </span>
                      </td>
                      <td>
                        {/* 4. UPDATED ACTIONS cell */}
                        {request.status === 'Pending' && (
                          <>
                            <button
                              onClick={() => handleApproveClick(request)}
                              className="btn btn-sm btn-success"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleRejectClick(request)}
                              className="btn btn-sm btn-danger"
                            >
                              Reject
                            </button>
                            
                            {/* 5. ADDED conditional "View Details" button */}
                            {request.requestType === 'Lost' && (
                              <button
                                onClick={() => handleViewLostDetailsClick(request)}
                                className="btn btn-sm btn-info"
                              >
                                View Details
                              </button>
                            )}
                          </>
                        )}
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
      </div>

      {showApprovalModal && selectedRequest && (
        <ApprovalModal
          request={selectedRequest}
          onClose={handleCloseModals}
          onSuccess={() => {
            fetchRequests();
            handleCloseModals();
          }}
        />
      )}

      {showRejectionModal && selectedRequest && (
        <RejectionModal
          request={selectedRequest}
          onClose={handleCloseModals}
          onSuccess={() => {
            fetchRequests();
            handleCloseModals();
          }}
        />
      )}

      {/* 6. RENDER the new modal */}
      {showLostDetailsModal && selectedRequest && (
        <LostRequestDetailsModal
          request={selectedRequest}
          onClose={handleCloseModals}
        />
      )}
    </>
  );
};

// ... (ApprovalModal, RejectionModal, and helper functions are unchanged) ...
// ... (Scroll down to see the new modal added at the bottom) ...


const ApprovalModal = ({ request, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    notes: '',
    condition: request.condition || 'Good' 
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
      await adminAPI.approveRequest(request._id, formData);
      toast.success('Request approved successfully');
      onSuccess();
    } catch (error) {
      toast.error('Failed to approve request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Approve Request: {request.requestId || request._id.slice(-8).toUpperCase()}</h3>
          <button onClick={onClose} className="close-btn">&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">

            {/* 7. ADDED conditional check for "Lost" type */}
            {request.requestType === 'Lost' ? (
              <div className="form-note form-note-danger">
                <p><strong>Warning:</strong> You are approving a "Lost" report. Please review the officer's full details before proceeding. This will move the item to the Maintenance Log for investigation.</p>
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label">Officer's Reason</label>
                <textarea
                  className="form-control"
                  rows="2"
                  value={request.reason}
                  readOnly
                />
              </div>
            )}

            {(request.requestType === 'Return' || request.requestType === 'Maintenance') && (
              <div className="form-group">
                <label className="form-label">Officer Reported Condition</label>
                <select
                  name="condition"
                  value={formData.condition}
                  onChange={handleChange}
                  className="form-control"
                >
                  <option value="Excellent">Excellent</option>
                  <option value="Good">Good</option>
                  <option value="Fair">Fair</option>
                  <option value="Poor">Poor</option>
                  <option value="Out of Service">Out of Service</option>
                </select>
                <small>Confirm the condition before approving.</small>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Approval Notes (Optional)</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                className="form-control"
                rows="3"
                placeholder="Add any additional notes for this approval..."
              />
            </div>

          </div>
          <div className="modal-actions">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-success"
              disabled={loading}
            >
              {loading ? 'Approving...' : 'Approve Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const RejectionModal = ({ request, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    reason: '',
    adminNotes: ''
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

    if (!formData.reason.trim()) {
      toast.error('Rejection reason is required');
      return;
    }

    setLoading(true);

    try {
      await adminAPI.rejectRequest(request._id, formData);
      toast.success('Request rejected successfully');
      onSuccess();
    } catch (error) {
      toast.error('Failed to reject request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Reject Request: {request.requestId || request._id.slice(-8).toUpperCase()}</h3>
          <button onClick={onClose} className="close-btn">&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">

            <div className="form-group">
              <label className="form-label">Officer's Reason for Request</label>
              <textarea
                className="form-control"
                rows="2"
                value={request.reason}
                readOnly
              />
            </div>

            <div className="form-group">
              <label className="form-label">Reason for Rejection <span style={{ color: 'red' }}>*</span></label>
              <textarea
                name="reason"
                value={formData.reason}
                onChange={handleChange}
                className="form-control"
                rows="3"
                placeholder="Please provide a detailed reason for rejection..."
                required
              />
            </div>

          </div>
          <div className="modal-actions">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-danger"
              disabled={loading}
            >
              {loading ? 'Rejecting...' : 'Reject Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


// 8. ======== 泙 ADDED THIS ENTIRE NEW COMPONENT 泙 ========
const LostRequestDetailsModal = ({ request, onClose }) => {
  
  // Helper to format dates, handles nulls
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      {/* Make modal larger for all the details */}
      <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Lost Item Report Details</h3>
          <button onClick={onClose} className="close-btn">&times;</button>
        </div>
        
        <div className="modal-body">
          <div className="officer-report-details" style={{ 
              maxHeight: '70vh',
              overflowY: 'auto',
              padding: '10px'
            }}>
            
            <h5 style={{ marginTop: 0, borderBottom: '1px solid #ccc', paddingBottom: '5px' }}>
              Item & Officer Information
            </h5>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Officer Name</label>
                <input type="text" className="form-control" value={request.requestedBy?.fullName || 'N/A'} readOnly />
              </div>
              <div className="form-group">
                <label className="form-label">Officer ID</label>
                <input type="text" className="form-control" value={request.requestedBy?.officerId || 'N/A'} readOnly />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Item Pool</label>
                <input type="text" className="form-control" value={request.poolId?.poolName || 'N/A'} readOnly />
              </div>
              <div className="form-group">
                <label className="form-label">Item Unique ID</label>
                <input type="text" className="form-control" value={request.assignedUniqueId || 'N/A'} readOnly />
              </div>
            </div>

            <h5 style={{ marginTop: '1rem', borderBottom: '1px solid #ccc', paddingBottom: '5px' }}>
              Incident Details
            </h5>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Date of Loss</label>
                <input type="text" className="form-control" value={formatDate(request.dateOfLoss)} readOnly />
              </div>
              <div className="form-group">
                <label className="form-label">Place of Loss</label>
                <input type="text" className="form-control" value={request.placeOfLoss || 'N/A'} readOnly />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Police Station</label>
                <input type="text" className="form-control" value={request.policeStation || 'N/A'} readOnly />
              </div>
              <div className="form-group">
                <label className="form-label">Duty at Time of Loss</label>
                <input type="text" className="form-control" value={request.dutyAtTimeOfLoss || 'N/A'} readOnly />
              </div>
            </div>

            <h5 style={{ marginTop: '1rem', borderBottom: '1px solid #ccc', paddingBottom: '5px' }}>
              Official Report
            </h5>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">FIR Number</label>
                <input type="text" className="form-control" value={request.firNumber || 'N/A'} readOnly />
              </div>
              <div className="form-group">
                <label className="form-label">FIR Date</label>
                <input type="text" className="form-control" value={formatDate(request.firDate)} readOnly />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Remedial Action Taken (by Officer)</label>
              <textarea
                className="form-control"
                rows="3"
                value={request.remedialActionTaken || 'N/A'}
                readOnly
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Incident Description (by Officer)</label>
              <textarea
                className="form-control"
                rows="3"
                value={request.reason || 'N/A'}
                readOnly
              />
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
// ==========================================================


const getStatusBadgeClass = (status) => {
  const classes = {
    'Pending': 'warning',
    'Approved': 'success',
    'Rejected': 'danger',
    'Completed': 'info',
    'Cancelled': 'secondary'
  };
  return classes[status] || 'secondary';
};

const getPriorityBadgeClass = (priority) => {
  const classes = {
    'Low': 'info',
    'Medium': 'warning',
    'High': 'danger',
    'Urgent': 'danger'
  };
  return classes[priority] || 'secondary';
};

export default ProcessRequests;