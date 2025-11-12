import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../utils/api';
import { toast } from 'react-toastify';

// ======== 🟢 1. NEW UNIFIED RANK DATA 🟢 ========
const RANKS_DATA = [
  // Senior Command
  { code: 'DGP', designation: 'Director General of Police (DGP)', category: 'Senior Command (DGP, SP, DCP)' },
  { code: 'ADGP', designation: 'Additional DGP (ADGP)', category: 'Senior Command (DGP, SP, DCP)' },
  { code: 'IGP', designation: 'Inspector General of Police (IGP)', category: 'Senior Command (DGP, SP, DCP)' },
  { code: 'DIGP', designation: 'Deputy IGP (DIGP)', category: 'Senior Command (DGP, SP, DCP)' },
  { code: 'SP', designation: 'Superintendent of Police (SP)', category: 'Senior Command (DGP, SP, DCP)' },
  { code: 'SSP', designation: 'Senior Superintendent of Police (SSP)', category: 'Senior Command (DGP, SP, DCP)' },
  { code: 'DCP', designation: 'Deputy Commissioner of Police (DCP)', category: 'Senior Command (DGP, SP, DCP)' },
  { code: 'ADDCP', designation: 'Additional DCP (ADDCP)', category: 'Senior Command (DGP, SP, DCP)' },
  { code: 'JCP', designation: 'Joint Commissioner of Police (JCP)', category: 'Senior Command (DGP, SP, DCP)' },
  
  // District Administrator
  { code: 'DSP', designation: 'Deputy Superintendent of Police (DSP)', category: 'District Administrator (DSP)' },

  // Police Station Officers
  { code: 'INSP', designation: 'Inspector (INSP)', category: 'Police Station Officers (PI, SI, PSI)' },
  { code: 'PI', designation: 'Police Inspector (PI)', category: 'Police Station Officers (PI, SI, PSI)' },
  { code: 'SI', designation: 'Sub-Inspector (SI)', category: 'Police Station Officers (PI, SI, PSI)' },
  { code: 'PSI', designation: 'Police Sub-Inspector (PSI)', category: 'Police Station Officers (PI, SI, PSI)' },
  { code: 'ASI', designation: 'Assistant Sub-Inspector (ASI)', category: 'Police Station Officers (PI, SI, PSI)' },
  
  // Police Station Staff
  { code: 'HC', designation: 'Head Constable (HC)', category: 'Police Station Staff (HC, PC)' },
  { code: 'PC', designation: 'Police Constable (PC)', category: 'Police Station Staff (HC, PC)' },

  // Other
  { code: 'IPS', designation: 'Indian Police Service (IPS)', category: 'Other' }
];

// Helper to group ranks for the <optgroup> dropdown
const GROUPED_RANKS = RANKS_DATA.reduce((acc, rank) => {
  const category = rank.category || 'Other';
  if (!acc[category]) {
    acc[category] = [];
  }
  acc[category].push(rank);
  return acc;
}, {});
// ================================================

// (State codes are unchanged)
const STATE_CODES = [
  { code: 'IND', name: 'All-India' }, { code: 'AP', name: 'Andhra Pradesh' },
  { code: 'AR', name: 'Arunachal Pradesh' }, { code: 'AS', name: 'Assam' },
  { code: 'BR', name: 'Bihar' }, { code: 'CG', name: 'Chhattisgarh' },
  { code: 'GA', name: 'Goa' }, { code: 'GJ', name: 'Gujarat' },
  { code: 'HR', name: 'Haryana' }, { code: 'HP', name: 'Himachal Pradesh' },
  { code: 'JH', name: 'Jharkhand' }, { code: 'KA', name: 'Karnataka' },
  { code: 'KL', name: 'Kerala' }, { code: 'MP', name: 'Madhya Pradesh' },
  { code: 'MH', name: 'Maharashtra' }, { code: 'MN', name: 'Manipur' },
  { code: 'ML', name: 'Meghalaya' }, { code: 'MZ', name: 'Mizoram' },
  { code: 'NL', name: 'Nagaland' }, { code: 'OD', name: 'Odisha' },
  { code: 'PB', name: 'Punjab' }, { code: 'RJ', name: 'Rajasthan' },
  { code: 'SK', name: 'Sikkim' }, { code: 'TN', name: 'Tamil Nadu' },
  { code: 'TG', name: 'Telangana' }, { code: 'TR', name: 'Tripura' },
  { code: 'UP', name: 'Uttar Pradesh' }, { code: 'UK', name: 'Uttarakhand' },
  { code: 'WB', name: 'West Bengal' }, { code: 'AN', name: 'Andaman & Nicobar' },
  { code: 'CH', name: 'Chandigarh' }, { code: 'DH', name: 'Dadra & Nagar Haveli' },
  { code: 'DD', name: 'Daman & Diu' }, { code: 'DL', name: 'Delhi' },
  { code: 'JK', name: 'Jammu & Kashmir' }, { code: 'LA', name: 'Ladakh' },
  { code: 'LD', name: 'Lakshadweep' }, { code: 'PY', name: 'Puducherry' }
];

// ======== 🟢 2. "TIME AGO" FUNCTION 🟢 ========
const calculateServiceDuration = (dateOfJoining) => {
  if (!dateOfJoining) return 'N/A';
  const joiningDate = new Date(dateOfJoining);
  if (isNaN(joiningDate.getTime())) return 'N/A';
  
  const now = new Date();
  if (joiningDate > now) return 'Joins in future';

  const seconds = Math.floor((now - joiningDate) / 1000);

  if (seconds < 60) return 'Just joined';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min${minutes > 1 ? 's' : ''}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours > 1 ? 's' : ''}`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days > 1 ? 's' : ''}`;
  
  if (days < 30.44) { 
    const weeks = Math.floor(days / 7);
    return `${weeks} wk${weeks > 1 ? 's' : ''}`;
  }
  const months = Math.floor(days / 30.44);
  if (months < 12) return `${months} mo${months > 1 ? 's' : ''}`;
  const years = (days / 365.25).toFixed(1);
  return `${parseFloat(years)} yrs`;
};
// =================================================

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [debouncedRoleFilter, setDebouncedRoleFilter] = useState('');
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  
  const [errors, setErrors] = useState({});

  const [officerIdParts, setOfficerIdParts] = useState({
    state: '',
    rankCode: '', // Auto-filled
    year: new Date().getFullYear().toString(),
    serial: ''
  });

  const [newUser, setNewUser] = useState({
    officerId: '',
    fullName: '',
    designation: '', // Master rank field
    email: '',
    dateOfJoining: '',
    password: '',
    rank: '' // Auto-filled category
  });

  // Validation functions
  const validateEmail = (email) => {
    const validDomains = ['police.gov.in', 'gov.in', 'state.gov.in'];
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!email) return 'Email is required';
    if (!emailPattern.test(email)) return 'Please enter a valid email address';
    const domain = email.split('@')[1];
    const isValidDomain = validDomains.some(validDomain => domain === validDomain || domain.endsWith('.' + validDomain));
    if (!isValidDomain) return 'Email must be from police.gov.in, gov.in, or state.gov.in domains';
    return '';
  };

  const validateOfficerIdParts = () => {
    const newErrors = {};
    if (!officerIdParts.state) newErrors.state = 'State is required';
    if (!newUser.designation) newErrors.designation = 'Designation is required';
    
    if (!officerIdParts.year) newErrors.year = 'Year is required';
    else {
      const year = parseInt(officerIdParts.year);
      const currentYear = new Date().getFullYear();
      if (year < 1947 || year > currentYear + 1) newErrors.year = `Year must be between 1947 and ${currentYear + 1}`;
    }
    if (!officerIdParts.serial) newErrors.serial = 'Serial number is required';
    else if (officerIdParts.serial.length < 1 || officerIdParts.serial.length > 6) newErrors.serial = 'Serial must be 1-6 digits';
    return newErrors;
  };

  const validateForm = () => {
    const newErrors = {};
    Object.assign(newErrors, validateOfficerIdParts());
    if (!newUser.fullName) newErrors.fullName = 'Full name is required';
    else if (newUser.fullName.length < 3) newErrors.fullName = 'Full name must be at least 3 characters';
    else if (newUser.fullName.length > 100) newErrors.fullName = 'Full name cannot exceed 100 characters';
    const emailError = validateEmail(newUser.email);
    if (emailError) newErrors.email = emailError;
    if (!newUser.dateOfJoining) newErrors.dateOfJoining = 'Date of joining is required';
    else if (new Date(newUser.dateOfJoining) > new Date()) newErrors.dateOfJoining = 'Date of joining cannot be in the future';
    if (!newUser.rank) newErrors.rank = 'Rank category is required (auto-filled from Designation)';
    if (!newUser.designation) newErrors.designation = 'Designation is required';
    if (!newUser.password) newErrors.password = 'Password is required';
    else if (newUser.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    return newErrors;
  };

  const generateOfficerId = () => {
    const { state, rankCode, year, serial } = officerIdParts;
    if (state && rankCode && year && serial) {
      const paddedSerial = serial.padStart(4, '0');
      return `${state}${rankCode}${year}${paddedSerial}`;
    }
    return '';
  };

  useEffect(() => {
    const generatedId = generateOfficerId();
    setNewUser(prev => ({ ...prev, officerId: generatedId }));
    
    if (generatedId) {
      setErrors(prev => ({ ...prev, state: '', year: '', serial: '', designation: '' }));
    }
  }, [officerIdParts]);

  // Debouncing hook
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setDebouncedRoleFilter(roleFilter);
      setCurrentPage(1);
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm, roleFilter]);

  // Fetch hook
  useEffect(() => {
    fetchUsers();
  }, [currentPage, debouncedSearchTerm, debouncedRoleFilter]); 

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getUsers({
        page: currentPage, limit: 10,
        search: debouncedSearchTerm,
        role: debouncedRoleFilter
      });
      if (response.data.success) {
        setUsers(response.data.data.users);
        setTotalPages(response.data.data.pagination.pages);
      }
    } catch (error) {
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    try {
      await adminAPI.updateUser(userId, { isActive: !currentStatus });
      toast.success(`User ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      fetchUsers();
    } catch (error) {
      toast.error('Failed to update user status');
    }
  };

  // Robust Error Handler
  const handleCreateUser = async (e) => {
    e.preventDefault();
    const formErrors = validateForm();
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      toast.error('Please fix the errors in the form.');
      return;
    }
    try {
      await adminAPI.createUser(newUser);
      toast.success('Officer created successfully!');
      setShowCreateModal(false);
      // Reset form
      setNewUser({ officerId: '', fullName: '', designation: '', email: '', dateOfJoining: '', password: '', rank: '' });
      setOfficerIdParts({ state: '', rankCode: '', year: new Date().getFullYear().toString(), serial: '' });
      setErrors({});
      fetchUsers();
    } catch (error) {
      let errorMsg = 'Failed to create officer.';
      if (error.response?.data?.errors) {
        const backendErrors = error.response.data.errors;
        if (Array.isArray(backendErrors)) {
            const parsedErrors = backendErrors.reduce((acc, err) => {
              const key = err.path || err.field || 'general'; 
              acc[key] = err.msg || err.message;
              return acc;
            }, {});
            setErrors(parsedErrors);
            errorMsg = backendErrors[0]?.msg || 'Please fix validation errors.';
        } else if (typeof backendErrors === 'object') {
          const parsedErrors = Object.keys(backendErrors).reduce((acc, key) => {
            acc[key] = backendErrors[key].message || 'Invalid value';
            return acc;
          }, {});
          setErrors(parsedErrors);
          errorMsg = Object.values(parsedErrors)[0] || 'Please fix validation errors.';
        }
      } else if (error.response?.data?.message) {
        errorMsg = error.response.data.message;
      }
      toast.error(errorMsg);
    }
  };

  const handleDeleteClick = (user) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const handleCloseModals = () => {
    setShowCreateModal(false);
    setShowDeleteModal(false);
    setSelectedUser(null);
    setErrors({});
  };

  const handleConfirmDelete = async () => {
    if (!selectedUser) return;
    try {
      await adminAPI.deleteUser(selectedUser._id);
      toast.success(`User ${selectedUser.fullName} has been permanently removed.`);
      handleCloseModals();
      fetchUsers(); 
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to remove user.');
      handleCloseModals();
    }
  };

  // New Smart Rank Handler
  const handleDesignationChange = (e) => {
    const selectedDesignation = e.target.value;
    const rankData = RANKS_DATA.find(r => r.designation === selectedDesignation);

    if (rankData) {
      setNewUser(prev => ({
        ...prev,
        designation: rankData.designation,
        rank: rankData.category
      }));
      setOfficerIdParts(prev => ({
        ...prev,
        rankCode: rankData.code
      }));
      setErrors(prev => ({ ...prev, designation: '', rank: '', rankCode: '' }));
    } else {
      setNewUser(prev => ({ ...prev, designation: '', rank: '' }));
      setOfficerIdParts(prev => ({ ...prev, rankCode: '' }));
    }
  };

  const handleInputChange = (field, value) => {
    setNewUser(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };
  const handleOfficerIdPartChange = (field, value) => {
    setOfficerIdParts(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  if (loading && isInitialLoad) {
    return (
      <div className="um-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="um-page">
      <div className="um-container">
        <div className="um-header">
          <h2>User Management</h2>
          <button 
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            + Create New Officer
          </button>
        </div>

        {/* Filters Section */}
        <div className="um-controls">
          <input
            type="text"
            placeholder="Search by name, email, or officer ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="um-search-input"
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="um-filter-select"
          >
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="officer">Officer</option>
          </select>
        </div>

        {/* Users Table */}
        <div className={`um-table-wrapper ${loading ? 'um-loading' : ''}`}>
          {users.length === 0 && !loading ? (
            <div className="um-empty-state">
              <p>No users found matching your criteria.</p>
            </div>
          ) : (
            <table className="um-table">
              {/* ======== 🟢 3. UPDATED TABLE HEADER 🟢 ======== */}
              <thead>
                <tr>
                  <th>Officer ID</th>
                  <th>Full Name</th>
                  <th>Email</th>
                  <th>Designation</th>
                  {/* <th>Rank</th> <-- REMOVED */}
                  <th>Service</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user._id}>
                    <td><code>{user.officerId}</code></td>
                    <td>{user.fullName}</td>
                    <td>{user.email}</td>
                    <td>
                      <span className="um-badge um-badge-blue">{user.designation}</span>
                    </td>
                    {/* <td>{user.rank}</td> <-- REMOVED */}
                    <td>{calculateServiceDuration(user.dateOfJoining)}</td>
                    <td>
                      <span className={`um-badge ${user.isActive ? 'um-badge-green' : 'um-badge-gray'}`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="um-actions-cell">
                      <button
                        className={`btn btn-action ${user.isActive ? 'btn-action-warn' : 'btn-action-success'}`}
                        onClick={() => handleToggleStatus(user._id, user.isActive)}
                      >
                        {user.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        className="btn btn-action btn-action-danger"
                        onClick={() => handleDeleteClick(user)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="um-pagination">
            <button
              className="btn btn-secondary"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1 || loading} 
            >
              Previous
            </button>
            <span className="um-page-info">
              Page {currentPage} of {totalPages}
            </span>
            <button
              className="btn btn-secondary"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages || loading}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="um-modal-overlay" onClick={handleCloseModals}>
          <div className="um-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="um-modal-header">
              <h3>Create New Officer</h3>
              <button className="um-modal-close" onClick={handleCloseModals}>×</button>
            </div>
            
            <form id="create-user-form" onSubmit={handleCreateUser} className="um-modal-form">
              {/* --- Officer ID Builder --- */}
              <div className="um-form-section">
                <h4>Officer ID Builder</h4>
                <div className="um-form-row" style={{gap: '8px'}}>
                  <div className="um-form-group" style={{flex: '1'}}>
                    <label>State *</label>
                    <select
                      value={officerIdParts.state}
                      onChange={(e) => handleOfficerIdPartChange('state', e.target.value)}
                      className={errors.state ? 'error' : ''}
                    >
                      <option value="">Select State</option>
                      {STATE_CODES.map(s => <option key={s.code} value={s.code}>{s.code} - {s.name}</option>)}
                    </select>
                    {errors.state && <span className="um-error-message">{errors.state}</span>}
                  </div>
                  
                  <div className="um-form-group" style={{flex: '0.7'}}>
                    <label>Rank Code</label>
                    <input
                      type="text"
                      value={officerIdParts.rankCode}
                      readOnly
                      placeholder="Auto"
                      className={errors.rankCode ? 'error' : ''}
                    />
                  </div>

                  <div className="um-form-group" style={{flex: '0.7'}}>
                    <label>Year *</label>
                    <input
                      type="number"
                      value={officerIdParts.year}
                      onChange={(e) => handleOfficerIdPartChange('year', e.target.value)}
                      placeholder="2024"
                      className={errors.year ? 'error' : ''}
                    />
                    {errors.year && <span className="um-error-message">{errors.year}</span>}
                  </div>

                  <div className="um-form-group" style={{flex: '0.7'}}>
                    <label>Serial *</label>
                    <input
                      type="number"
                      value={officerIdParts.serial}
                      onChange={(e) => handleOfficerIdPartChange('serial', e.target.value)}
                      placeholder="0001"
                      className={errors.serial ? 'error' : ''}
                    />
                    {errors.serial && <span className="um-error-message">{errors.serial}</span>}
                  </div>
                </div>
                <div className="um-officer-id-preview">
                  <span className="um-preview-label">Officer ID:</span>
                  <span className="um-preview-value">{newUser.officerId || 'STATE-RANK-YEAR-SERIAL'}</span>
                </div>
              </div>

              {/* --- Officer Details --- */}
              <div className="um-form-row">
                <div className="um-form-group">
                  <label>Full Name *</label>
                  <input type="text" value={newUser.fullName} onChange={(e) => handleInputChange('fullName', e.target.value)} className={errors.fullName ? 'error' : ''} />
                  {errors.fullName && <span className="um-error-message">{errors.fullName}</span>}
                </div>
                <div className="um-form-group">
                  <label>Email *</label>
                  <input type="email" value={newUser.email} onChange={(e) => handleInputChange('email', e.target.value)} className={errors.email ? 'error' : ''} />
                  {errors.email && <span className="um-error-message">{errors.email}</span>}
                  <span className="um-field-hint">Only @police.gov.in, @gov.in, or @state.gov.in</span>
                </div>
              </div>

              {/* --- Rank & Designation (Refactored) --- */}
              <div className="um-form-row">
                <div className="um-form-group">
                  <label>Designation *</label>
                  {/* This is now the master dropdown */}
                  <select
                    value={newUser.designation}
                    onChange={handleDesignationChange}
                    className={errors.designation ? 'error' : ''}
                  >
                    <option value="">Select Designation...</option>
                    {Object.entries(GROUPED_RANKS).map(([category, ranks]) => (
                      <optgroup label={category} key={category}>
                        {ranks.map(rank => (
                          <option key={rank.designation} value={rank.designation}>
                            {rank.designation}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  {errors.designation && <span className="um-error-message">{errors.designation}</span>}
                </div>
                <div className="um-form-group">
                  <label>Rank Category</label>
                  {/* This is now a disabled field, auto-filled */}
                  <input
                    type="text"
                    value={newUser.rank}
                    placeholder="Auto-filled from Designation"
                    readOnly
                    disabled
                  />
                </div>
              </div>

              {/* --- Joining Date & Password --- */}
              <div className="um-form-row">
                <div className="um-form-group">
                  <label>Date of Joining *</label>
                  <input type="date" value={newUser.dateOfJoining} onChange={(e) => handleInputChange('dateOfJoining', e.target.value)} max={new Date().toISOString().split('T')[0]} className={errors.dateOfJoining ? 'error' : ''} />
                  {errors.dateOfJoining && <span className="um-error-message">{errors.dateOfJoining}</span>}
                </div>
                <div className="um-form-group">
                  <label>Password *</label>
                  <input type="password" value={newUser.password} onChange={(e) => handleInputChange('password', e.target.value)} placeholder="Minimum 8 characters" className={errors.password ? 'error' : ''} />
                  {errors.password && <span className="um-error-message">{errors.password}</span>}
                </div>
              </div>
            </form>
            <div className="um-modal-actions">
              <button type="button" className="btn btn-secondary" onClick={handleCloseModals}>Cancel</button>
              <button type="submit" className="btn btn-primary" form="create-user-form">Create Officer</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (Unchanged) */}
      {showDeleteModal && selectedUser && (
        <div className="um-modal-overlay" onClick={handleCloseModals}>
          <div className="um-modal-content um-modal-content-small" onClick={(e) => e.stopPropagation()}>
            <div className="um-modal-body-centered">
              <svg className="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <h3>Are you sure?</h3>
              <p>
                This will permanently remove <strong>{selectedUser.fullName}</strong> ({selectedUser.officerId}). This action cannot be undone.
              </p>
            </div>
            <div className="um-modal-actions">
              <button type="button" className="btn btn-secondary" onClick={handleCloseModals}>
                Cancel
              </button>
              <button type="button" className="btn btn-danger" onClick={handleConfirmDelete}>
                Yes, Remove User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// (This wrapper is not actively used but kept from your file)
const CreateUserFormWrapper = ({ show, handleCloseModals, handleCreateUser, ...props }) => (
  <div className={`um-modal-overlay ${!show ? 'hidden' : ''}`} onClick={handleCloseModals}>
    <div className="um-modal-content" onClick={(e) => e.stopPropagation()}>
      <div className="um-modal-header">
        <h3>Create New Officer</h3>
        <button className="um-modal-close" onClick={handleCloseModals}>×</button>
      </div>
      <form id="create-user-form" onSubmit={handleCreateUser} className="um-modal-form">
      </form>
      <div className="um-modal-actions">
        <button type="button" className="btn btn-secondary" onClick={handleCloseModals}>Cancel</button>
        <button type="submit" className="btn btn-primary" form="create-user-form">Create Officer</button>
      </div>
    </div>
  </div>
);

export default UserManagement;