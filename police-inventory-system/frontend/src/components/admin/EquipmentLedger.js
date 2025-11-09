import React, { useState, useEffect } from 'react';
import { equipmentAPI } from '../../utils/api';
import { toast } from 'react-toastify';

const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString('en-IN');
};

const EquipmentLedger = () => {
  const [pools, setPools] = useState([]);
  const [selectedPool, setSelectedPool] = useState(null);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [historyData, setHistoryData] = useState(null);
  const [loadingPools, setLoadingPools] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    fetchPools();
  }, []);

  const fetchPools = async () => {
    try {
      setLoadingPools(true);
      const response = await equipmentAPI.getEquipmentPools();
      if (response.data.success) {
        setPools(response.data.data.pools);
      }
    } catch (error) {
      toast.error('Failed to fetch equipment pools');
    } finally {
      setLoadingPools(false);
    }
  };

  const handlePoolChange = (e) => {
    const poolId = e.target.value;
    if (!poolId) {
      setSelectedPool(null);
      setSelectedItemId('');
      setHistoryData(null);
      return;
    }
    const pool = pools.find(p => p._id === poolId);
    setSelectedPool(pool);
    setSelectedItemId('');
    setHistoryData(null);
  };

  const handleItemChange = async (e) => {
    const uniqueId = e.target.value;
    setSelectedItemId(uniqueId);

    if (!uniqueId) {
      setHistoryData(null);
      return;
    }

    try {
      setLoadingHistory(true);
      const response = await equipmentAPI.getItemHistory(selectedPool._id, uniqueId);
      if (response.data.success) {
        setHistoryData(response.data.data); 
      }
    } catch (error) {
      toast.error('Failed to fetch item history');
      setHistoryData(null);
    } finally {
      setLoadingHistory(false);
    }
  };

  return (
    <div className="equipment-ledger">
      <div className="management-header">
        <h3>Equipment Ledger</h3>
        <p>Select a pool and item to view its complete history.</p>
        <div className="search-filters">
          <select
            onChange={handlePoolChange}
            value={selectedPool?._id || ''}
            className="form-control"
            disabled={loadingPools}
          >
            <option value="">-- Select an Equipment Pool --</option>
            {pools.map(pool => (
              <option key={pool._id} value={pool._id}>
                {pool.poolName} ({pool.model})
              </option>
            ))}
          </select>

          <select
            onChange={handleItemChange}
            value={selectedItemId}
            className="form-control"
            disabled={!selectedPool}
          >
            <option value="">-- Select an Item ID --</option>
            {selectedPool?.items.map(item => (
              <option key={item.uniqueId} value={item.uniqueId}>
                {item.uniqueId} ({item.status})
              </option>
            ))}
          </select>
        </div>
      </div>

      {loadingHistory ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading item history...</p>
        </div>
      ) : historyData && (
        <div className="history-details">
          <div className="dashboard-card">
            <h4>Usage History for {historyData.uniqueId}</h4>
            {historyData.usageHistory.length === 0 ? (
              <p>No usage history found for this item.</p>
            ) : (
              <div className="inventory-table">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Officer</th>
                      <th>Issued</th>
                      <th>Reason (Issue)</th>
                      <th>Returned</th>
                      <th>Reason (Return)</th>
                      <th>Condition (Return)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyData.usageHistory.map(entry => (
                      <tr key={entry._id}>
                        <td>{entry.userId?.fullName || entry.officerName || 'Unknown'}</td>
                        <td>{formatDateTime(entry.issuedDate)}</td>
                        <td title={entry.purpose}>{entry.purpose || 'N/A'}</td>
                        <td>
                          {entry.returnedDate 
                            ? formatDateTime(entry.returnedDate) 
                            : <span className="badge badge-warning">Still Issued</span>
                          }
                        </td>
                        <td title={entry.remarks}>{entry.remarks || 'N/A'}</td>
                        <td>
                          {entry.conditionAtReturn 
                            ? <span className={`badge badge-${entry.conditionAtReturn === 'Good' || entry.conditionAtReturn === 'Excellent' ? 'success' : 'danger'}`}>
                                {entry.conditionAtReturn}
                              </span>
                            : 'N/A'
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="dashboard-card">
            <h4>Maintenance History for {historyData.uniqueId}</h4>
            {historyData.maintenanceHistory.length === 0 ? (
              <p>No maintenance history found for this item.</p>
            ) : (
              <div className="inventory-table">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date Reported</th>
                      <th>Reported By</th>
                      <th>Problem Reported</th>
                      <th>Date Fixed</th>
                      <th>Action Taken</th>
                      <th>Armorer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyData.maintenanceHistory.map(entry => (
                      <tr key={entry._id}>
                        <td>{formatDateTime(entry.reportedDate)}</td>
                        <td>{entry.reportedBy?.fullName || 'Unknown'}</td>
                        <td title={entry.reason || 'No issue recorded'}>
                          {entry.reason || <span className="text-muted">No issue noted</span>}
                        </td>
                        <td>{entry.fixedDate ? formatDateTime(entry.fixedDate) : <span className="badge badge-warning">Pending</span>}</td>
                        <td>{entry.action || <span className="text-muted">No action yet</span>}</td>
                        <td>{entry.fixedBy?.fullName || 'Unassigned'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="dashboard-card">
            <h4>Lost Weapons FIR History for {historyData.uniqueId}</h4>
            {historyData.lostHistory?.length ? (
              <div className="inventory-table">
                <table className="table">
                  <thead>
                    <tr>
                      <th>FIR Number</th>
                      <th>Police Station</th>
                      <th>FIR Date</th>
                      <th>Description</th>
                      <th>Filed By</th>
                      <th>Document</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyData.lostHistory.map((fir) => (
                      <tr key={fir._id}>
                        <td>{fir.firNumber}</td>
                        <td>{fir.policeStation}</td>
                        <td>{new Date(fir.firDate).toLocaleDateString()}</td>
                        <td>{fir.description || 'N/A'}</td>
                        <td>{fir.reportedBy?.fullName || 'Unknown'}</td>
                        <td>{fir.documentUrl ? <a href={fir.documentUrl} target="_blank" rel="noopener noreferrer">View</a> : 'No File'}</td>
                        <td>{fir.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>No FIR records found for this item.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EquipmentLedger;
