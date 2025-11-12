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

  const handleCloseModals = () => {
    setShowApprovalModal(false);
    setShowRejectionModal(false);
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
              {/* ======== 🟢 ADDED THIS LINE 🟢 ======== */}
              <option value="Lost">Lost</option>
              {/* ======================================= */}
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
                        
                        {/* ======== 🟢 MODIFIED THIS BLOCK 🟢 ======== */}
                        {/* Always show the reason, as it's required for all request types */}
                        {request.reason && (
                          <p className="request-reason" title={request.reason}>
                            {request.reason}
                          </p>
                        )}
                        {/* ======================================= */}
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
    </>
  );
};

// ... (ApprovalModal, RejectionModal, and helper functions are unchanged) ...

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
          <div className="form-group">
            <label className="form-label">Officer's Reason</label>
            <textarea
              className="form-control"
              rows="2"
              value={request.reason}
              readOnly
            />
          </div>

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