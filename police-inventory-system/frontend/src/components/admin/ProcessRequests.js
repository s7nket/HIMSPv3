import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../utils/api';
import { toast } from 'react-toastify';
import { Check, X, Eye, AlertCircle } from 'lucide-react'; // Import icons

const ProcessRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Debouncing states
  const [liveStatusFilter, setLiveStatusFilter] = useState('Pending');
  const [liveTypeFilter, setLiveTypeFilter] = useState('');
  const [debouncedStatusFilter, setDebouncedStatusFilter] = useState('Pending');
  const [debouncedTypeFilter, setDebouncedTypeFilter] = useState('');

  // Modal states
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [showLostDetailsModal, setShowLostDetailsModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  // Debouncing effect
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedStatusFilter(liveStatusFilter);
      setDebouncedTypeFilter(liveTypeFilter);
      setCurrentPage(1); // Reset page on filter change
    }, 500);
    return () => clearTimeout(handler);
  }, [liveStatusFilter, liveTypeFilter]);

  // Data fetching effect
  useEffect(() => {
    fetchRequests();
  }, [currentPage, debouncedStatusFilter, debouncedTypeFilter]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getRequests({
        page: currentPage,
        limit: 10,
        status: debouncedStatusFilter,
        requestType: debouncedTypeFilter
      });

      if (response.data.success) {
        setRequests(response.data.data.requests);
        setTotalPages(response.data.data.pagination.pages);
      }
    } catch (error) {
      toast.error('Failed to fetch requests');
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
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

  const handleViewLostDetailsClick = (request) => {
    setSelectedRequest(request);
    setShowLostDetailsModal(true);
  };

  const handleCloseModals = () => {
    setShowApprovalModal(false);
    setShowRejectionModal(false);
    setShowLostDetailsModal(false);
    setSelectedRequest(null);
  };

  if (loading && isInitialLoad) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading requests...</p>
      </div>
    );
  }

  return (
    <>
      <div className="um-container">
        <div className="um-header">
          <h2>Process Requests</h2>
          {/* No button needed here */}
        </div>

        <div className="um-controls">
            <select
              value={liveStatusFilter}
              onChange={(e) => setLiveStatusFilter(e.target.value)}
              className="um-filter-select"
            >
              <option value="">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            <select
              value={liveTypeFilter}
              onChange={(e) => setLiveTypeFilter(e.target.value)}
              className="um-filter-select"
            >
              <option value="">All Types</option>
              <option value="Issue">Issue</option>
              <option value="Return">Return</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Lost">Lost</option>
            </select>
        </div>

        {requests.length === 0 && !loading ? (
          <div className="um-empty-state">
            <p>No requests found matching your criteria.</p>
          </div>
        ) : (
          <>
            <div className={`um-table-wrapper ${loading ? 'um-loading' : ''}`}>
              <table className="um-table">
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
                      <td><code>{request.requestId || request._id.slice(-8).toUpperCase()}</code></td>
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
                          {request.poolId?.poolName || 'N/A'}
                        </strong>
                        {request.reason && (
                          <p title={request.reason} style={{ fontSize: '13px', color: '#5c5c5c', marginTop: '4px' }}>
                            {request.reason.substring(0, 50)}...
                          </p>
                        )}
                      </td>
                      <td>
                        <span className={`um-badge ${
                          request.requestType === 'Issue' ? 'um-badge-blue' :
                          request.requestType === 'Return' ? 'um-badge-warn' :
                          'um-badge-red'
                        }`}>
                          {request.requestType}
                        </span>
                      </td>
                      <td>
                        <span className={`um-badge ${
                          request.priority === 'Urgent' ? 'um-badge-red' :
                          request.priority === 'High' ? 'um-badge-warn' :
                          'um-badge-gray'
                        }`}>
                          {request.priority}
                        </span>
                      </td>
                      <td>{new Date(request.createdAt).toLocaleString()}</td>
                      <td>
                        <span className={`um-badge ${
                          request.status === 'Pending' ? 'um-badge-warn' :
                          request.status === 'Approved' ? 'um-badge-green' :
                          request.status === 'Rejected' ? 'um-badge-red' :
                          'um-badge-gray'
                        }`}>
                          {request.status}
                        </span>
                      </td>
                      <td className="um-actions-cell">
                        {request.status === 'Pending' && (
                          <>
                            <button
                              onClick={() => handleApproveClick(request)}
                              className="btn-action btn-action-success"
                            >
                              <Check size={16} /> Approve
                            </button>
                            <button
                              onClick={() => handleRejectClick(request)}
                              className="btn-action btn-action-danger"
                            >
                              <X size={16} /> Reject
                            </button>
                            {request.requestType === 'Lost' && (
                              <button
                                onClick={() => handleViewLostDetailsClick(request)}
                                className="btn-action btn-action-secondary"
                              >
                                <Eye size={16} /> View
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
              <div className="um-pagination">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1 || loading}
                  className="btn btn-secondary"
                >
                  Previous
                </button>
                <span className="um-page-info">Page {currentPage} of {totalPages}</span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages || loading}
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

      {showLostDetailsModal && selectedRequest && (
        <LostRequestDetailsModal
          request={selectedRequest}
          onClose={handleCloseModals}
        />
      )}
    </>
  );
};

// --- Re-skinned Modals ---

const ApprovalModal = ({ request, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    notes: '',
    condition: request.condition || 'Good' 
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

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
    <div className="um-modal-overlay" onClick={onClose}>
      <div className="um-modal-content um-modal-content-small" onClick={(e) => e.stopPropagation()}>
        <div className="um-modal-header">
          <h3>Approve Request</h3>
          <button onClick={onClose} className="um-modal-close">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="um-modal-form">
          {request.requestType === 'Lost' ? (
            <div className="um-form-section" style={{ borderColor: 'var(--color-danger)', background: 'var(--color-danger-bg)'}}>
              <p style={{ color: 'var(--color-danger-text)', margin: 0 }}>
                <strong>Warning:</strong> You are approving a "Lost" report. This will move the item to the Maintenance Log for investigation.
              </p>
            </div>
          ) : (
            <div className="um-form-group">
              <label className="um-form-label">Officer's Reason</label>
              <textarea className="form-control" rows="2" value={request.reason} readOnly disabled />
            </div>
          )}

          {(request.requestType === 'Return' || request.requestType === 'Maintenance') && (
            <div className="um-form-group">
              <label className="um-form-label">Officer Reported Condition</label>
              <select name="condition" value={formData.condition} onChange={handleChange} className="um-form-group select">
                <option value="Excellent">Excellent</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
                <option value="Poor">Poor</option>
                <option value="Out of Service">Out of Service</option>
              </select>
              <span className="um-field-hint">Confirm the condition before approving.</span>
            </div>
          )}

          <div className="um-form-group">
            <label className="um-form-label">Approval Notes (Optional)</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              className="form-control"
              rows="3"
              placeholder="Add any additional notes for this approval..."
            />
          </div>
        </form>
        <div className="um-modal-actions">
          <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
          <button type="submit" className="btn btn-success" disabled={loading} onClick={handleSubmit}>
            {loading ? 'Approving...' : 'Approve Request'}
          </button>
        </div>
      </div>
    </div>
  );
};

const RejectionModal = ({ request, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({ reason: '', adminNotes: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

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
    <div className="um-modal-overlay" onClick={onClose}>
      <div className="um-modal-content um-modal-content-small" onClick={(e) => e.stopPropagation()}>
        <div className="um-modal-header">
          <h3>Reject Request</h3>
          <button onClick={onClose} className="um-modal-close">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="um-modal-form">
          <div className="um-form-group">
            <label className="um-form-label">Officer's Reason for Request</label>
            <textarea className="form-control" rows="2" value={request.reason} readOnly disabled />
          </div>
          <div className="um-form-group">
            <label className="um-form-label">Reason for Rejection *</label>
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
        </form>
        <div className="um-modal-actions">
          <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
          <button type="submit" className="btn btn-danger" disabled={loading} onClick={handleSubmit}>
            {loading ? 'Rejecting...' : 'Reject Request'}
          </button>
        </div>
      </div>
    </div>
  );
};

const LostRequestDetailsModal = ({ request, onClose }) => {
  const formatDate = (dateString) => (dateString ? new Date(dateString).toLocaleDateString() : 'N/A');

  return (
    <div className="um-modal-overlay" onClick={onClose}>
      <div className="um-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="um-modal-header">
          <h3>Lost Item Report Details</h3>
          <button onClick={onClose} className="um-modal-close">&times;</button>
        </div>
        <div className="um-modal-form">
          <div className="um-form-section">
            <h4>Item & Officer Information</h4>
            <div className="um-form-row">
              <div className="um-form-group">
                <label className="um-form-label">Officer Name</label>
                <input type="text" className="form-control" value={request.requestedBy?.fullName || 'N/A'} readOnly disabled />
              </div>
              <div className="um-form-group">
                <label className="um-form-label">Officer ID</label>
                <input type="text" className="form-control" value={request.requestedBy?.officerId || 'N/A'} readOnly disabled />
              </div>
            </div>
            <div className="um-form-row">
              <div className="um-form-group">
                <label className="um-form-label">Item Pool</label>
                <input type="text" className="form-control" value={request.poolId?.poolName || 'N/A'} readOnly disabled />
              </div>
              <div className="um-form-group">
                <label className="um-form-label">Item Unique ID</label>
                <input type="text" className="form-control" value={request.assignedUniqueId || 'N/A'} readOnly disabled />
              </div>
            </div>
          </div>

          <div className="um-form-section">
            <h4>Incident Details</h4>
            <div className="um-form-row">
              <div className="um-form-group">
                <label className="um-form-label">Date of Loss</label>
                <input type="text" className="form-control" value={formatDate(request.dateOfLoss)} readOnly disabled />
              </div>
              <div className="um-form-group">
                <label className="um-form-label">Place of Loss</label>
                <input type="text" className="form-control" value={request.placeOfLoss || 'N/A'} readOnly disabled />
              </div>
            </div>
            <div className="um-form-row">
              <div className="um-form-group">
                <label className="um-form-label">Police Station</label>
                <input type="text" className="form-control" value={request.policeStation || 'N/A'} readOnly disabled />
              </div>
              <div className="um-form-group">
                <label className="um-form-label">Duty at Time of Loss</label>
                <input type="text" className="form-control" value={request.dutyAtTimeOfLoss || 'N/A'} readOnly disabled />
              </div>
            </div>
          </div>

          <div className="um-form-section">
            <h4>Official Report</h4>
            <div className="um-form-row">
              <div className="um-form-group">
                <label className="um-form-label">FIR Number</label>
                <input type="text" className="form-control" value={request.firNumber || 'N/A'} readOnly disabled />
              </div>
              <div className="um-form-group">
                <label className="um-form-label">FIR Date</label>
                <input type="text" className="form-control" value={formatDate(request.firDate)} readOnly disabled />
              </div>
            </div>
            <div className="um-form-group">
              <label className="um-form-label">Remedial Action Taken (by Officer)</label>
              <textarea className="form-control" rows="3" value={request.remedialActionTaken || 'N/A'} readOnly disabled />
            </div>
            <div className="um-form-group">
              <label className="um-form-label">Incident Description (by Officer)</label>
              <textarea className="form-control" rows="3" value={request.reason || 'N/A'} readOnly disabled />
            </div>
          </div>
        </div>
        <div className="um-modal-actions">
          <button type="button" onClick={onClose} className="btn btn-secondary">Close</button>
        </div>
      </div>
    </div>
  );
};

export default ProcessRequests;