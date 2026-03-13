import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { secureAxios } from '../../config/axiosConfig';
import '../../index.css'; 

const AdminOrders = ({ userData }) => {
  const navigate = useNavigate();

  // ============= STATE MANAGEMENT =============
  const [allOrders, setAllOrders] = useState([]); // Keep ALL orders for stats
  const [filteredOrders, setFilteredOrders] = useState([]); // Filtered orders for display
  const [ordersError, setOrdersError] = useState('');
  const [orderFilter, setOrderFilter] = useState("PENDING");
  const [isLoading, setIsLoading] = useState(true); // Start as loading
  const [, setRoundCapacities] = useState({});
  const [availableRounds, setAvailableRounds] = useState([]);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedOrderForAssign, setSelectedOrderForAssign] = useState(null);
  const [selectedRoundId, setSelectedRoundId] = useState('');
  const [unassignedOrders, setUnassignedOrders] = useState([]);
  const [assignError, setAssignError] = useState('');
  
  // Order Detail Modal State
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState(null);

  // ============= COMPUTED STATS (from allOrders) =============
  const stats = {
    total: allOrders.length,
    pending: allOrders.filter(o => o.status === 'PENDING').length,
    processing: allOrders.filter(o => o.status === 'PROCESSING').length,
    completed: allOrders.filter(o => o.status === 'COMPLETED').length,
    cancelled: allOrders.filter(o => o.status === 'CANCELLED').length,
    unassigned: unassignedOrders.length
  };

  // ============= API FUNCTIONS =============
  
  // Load available rounds for assignment dropdown
  const loadAvailableRounds = async () => {
    try {
      const response = await secureAxios.get('/api/admin/rounds/upcoming', {
        params: {
          authenticated: true,
          adminUsername: userData.username
        }
      });
      
      if (response.data.status === "success") {
        setAvailableRounds(response.data.rounds || []);
      }
    } catch (error) {
      console.error("Error loading rounds:", error);
    }
  };

  // Load unassigned orders count
  const loadUnassignedOrders = useCallback(async () => {
    try {
      const response = await secureAxios.get('/api/admin/rounds/orders/unassigned', {
        params: {
          authenticated: true,
          adminUsername: userData.username
        }
      });
      
      if (response.data.status === "success") {
        setUnassignedOrders(response.data.orders || []);
      }
    } catch (error) {
      console.error("Error loading unassigned orders:", error);
    }
  }, [userData.username]);

  // Load round capacity information
  const loadRoundCapacity = async (roundId) => {
    try {
      const response = await secureAxios.get(`/api/orders/rounds/${roundId}/capacity`, {
        params: {
          authenticated: "true",
          userRole: "ADMIN"
        }
      });
      
      if (response.data.status === "success") {
        setRoundCapacities(prev => ({
          ...prev,
          [roundId]: response.data.summary
        }));
      }
    } catch (error) {
      console.error(`Error loading capacity for round ${roundId}:`, error);
    }
  };

  // Main function to load ALL orders
  const loadOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      setOrdersError('');
      
      const response = await secureAxios.get('/api/orders/all', {
        params: {
          authenticated: true,
          userId: userData.userId,
          userRole: "ADMIN"
        }
      });
      
      if (response.data.status === "success") {
        const fetched = response.data.orders || [];
        
        // Store ALL orders for stats calculation
        setAllOrders(fetched);
        
        // Apply current filter for display
        const filtered = orderFilter === "ALL" 
          ? fetched 
          : fetched.filter(o => o.status === orderFilter);
        setFilteredOrders(filtered);
        
        // Load round capacities for all unique rounds
        const uniqueRounds = [...new Set(fetched.map(o => o.roundId).filter(Boolean))];
        for (const roundId of uniqueRounds) {
          loadRoundCapacity(roundId);
        }
        
        // Load unassigned orders count
        loadUnassignedOrders();
      } else {
        setOrdersError(response.data.message || "Failed to load orders");
      }
    } catch (error) {
      console.error("Error loading orders:", error);
      if (error.response?.data?.httpsRequired) {
        setOrdersError("Secure HTTPS connection required for admin operations.");
      } else {
        setOrdersError(error.response?.data?.message || error.message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [userData.userId, loadUnassignedOrders, orderFilter]);

  // ============= ORDER ACTIONS =============

  // Open order detail modal
  const openDetailModal = (order) => {
    setSelectedOrderDetail(order);
    setDetailModalOpen(true);
  };

  // Open assignment modal
  const openAssignModal = (order, e) => {
    if (e) e.stopPropagation();
    setSelectedOrderForAssign(order);
    setSelectedRoundId(order.roundId || '');
    setAssignModalOpen(true);
    loadAvailableRounds();
  };

  // Assign order to a round
  const assignOrderToRound = async () => {

    if (!selectedOrderForAssign) return;

    const selectedRound = availableRounds.find(r => r.roundId === parseInt(selectedRoundId));

    if(selectedRound) {
      const currentOrders = selectedRound.currentOrderCount || 0;
      const maxOrders = selectedRound.orderCapacity || 20;
      if(currentOrders >= maxOrders) {
        setAssignError(`This round is full. Maximum orders allowed: ${maxOrders}`);
        return;
      }

      if(currentOrders < 0) {
        setAssignError("Order count cannot be negative.");
        return;
      }
    }

    setAssignError('');

    if (!selectedOrderForAssign) return;
    
    try {
      const response = await secureAxios.put(
        `/api/admin/rounds/orders/${selectedOrderForAssign.orderId}/assign-round`,
        {
          authenticated: true,
          adminUsername: userData.username,
          roundId: selectedRoundId ? parseInt(selectedRoundId) : null
        }
      );
      
      if (response.data.status === "success") {
        alert(response.data.message);
        setAssignModalOpen(false);
        loadOrders();
      } else {
        alert(response.data.message || "Failed to assign order");
      }
    } catch (error) {
      console.error("Error assigning order:", error);
      alert(error.response?.data?.message || error.message);
    }
  };

  // Cancel an order
  const cancelOrder = async (orderId, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Are you sure you want to cancel order ${orderId}?`)) {
      return;
    }
    
    try {
      const response = await secureAxios.post(`/api/orders/${orderId}/cancel`, {
        authenticated: true,
        userId: userData.userId,
        userRole: "ADMIN"
      });
      
      if (response.data.status === "success") {
        alert("Order cancelled successfully");
        loadOrders();
        setDetailModalOpen(false);
      } else {
        alert(response.data.message || "Failed to cancel order");
      }
    } catch (error) {
      console.error("Error cancelling order:", error);
      alert(error.response?.data?.message || error.message);
    }
  };

  // Update order status
  const updateOrderStatus = async (orderId, newStatus, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Update order ${orderId} to ${newStatus}?`)) {
      return;
    }
    
    try {
      const response = await secureAxios.put(`/api/orders/${orderId}/status`, {
        authenticated: true,
        userId: userData.userId,
        userRole: "ADMIN",
        status: newStatus
      });
      
      if (response.data.status === "success") {
        alert("Order status updated successfully");
        loadOrders();
        setDetailModalOpen(false);
      } else {
        alert(response.data.message || "Failed to update order");
      }
    } catch (error) {
      console.error("Error updating order:", error);
      alert(error.response?.data?.message || error.message);
    }
  };

  // Delete an order permanently
  const deleteOrder = async (orderId, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Are you sure you want to DELETE order ${orderId}? This action cannot be undone.`)) {
      return;
    }
    
    try {
      const response = await secureAxios.delete(`/api/orders/${orderId}`, {
        params: {
          authenticated: true,
          userId: userData.userId,
          userRole: "ADMIN"
        }
      });
      
      if (response.data.status === "success") {
        alert("Order deleted successfully");
        loadOrders();
        setDetailModalOpen(false);
      } else {
        alert(response.data.message || "Failed to delete order");
      }
    } catch (error) {
      console.error("Error deleting order:", error);
      alert(error.response?.data?.message || error.message);
    }
  };

  // ============= UTILITY FUNCTIONS =============

  // Calculate order age
  const getOrderAge = (requestTime) => {
    if (!requestTime) return 'Unknown';
    const now = new Date();
    const orderTime = new Date(requestTime);
    const diffMs = now - orderTime;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) return `${diffMins} mins`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d`;
  };

  // Format date for display
  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Handle filter change - apply filter to existing allOrders
  const handleFilterChange = (status) => {
    setOrderFilter(status);
    const filtered = status === "ALL" 
      ? allOrders 
      : allOrders.filter(o => o.status === status);
    setFilteredOrders(filtered);
  };

  // Get order type display
  const getOrderTypeDisplay = (order) => {
    if (order.userId === -1) {
      return 'GUEST';
    }
    return order.orderType || 'CLIENT';
  };

  // ============= EFFECTS =============
  
  // Initial load - get all orders once
  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // ============= RENDER =============
  
  return (
    <div className="page-container">
      {/* HEADER SECTION */}
      <header className="site-header">
        <div className="header-content">
          <div className="logo-container">
            <img src="/Untitled.png" alt="Logo" className="logo" />
            <span className="site-title">Order Management - Admin</span>
          </div>
          <div className="header-right">
            <span className="user-info">
              Logged in as: {userData.username} (Admin)
            </span>
            <button
              className="manage-btn"
              onClick={() => navigate('/')}
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </header>
  
      <main className="main-content">
        {/* STATISTICS BAR - Uses allOrders for accurate counts */}
        <div className="stats-bar">
          <div className="stat-item">
            <div className="stat-value">{isLoading ? '-' : stats.total}</div>
            <div className="stat-label">Total Orders</div>
          </div>
          <div className="stat-item">
            <div className="stat-value stat-pending">{isLoading ? '-' : stats.pending}</div>
            <div className="stat-label">Pending</div>
          </div>
          <div className="stat-item">
            <div className="stat-value stat-processing">{isLoading ? '-' : stats.processing}</div>
            <div className="stat-label">Processing</div>
          </div>
          <div className="stat-item">
            <div className="stat-value stat-completed">{isLoading ? '-' : stats.completed}</div>
            <div className="stat-label">Completed</div>
          </div>
          <div className="stat-item">
            <div className="stat-value stat-cancelled">{isLoading ? '-' : stats.cancelled}</div>
            <div className="stat-label">Cancelled</div>
          </div>
          <div className="stat-item">
            <div className="stat-value stat-unassigned">{isLoading ? '-' : stats.unassigned}</div>
            <div className="stat-label">Unassigned</div>
          </div>
        </div>

        {/* ORDERS CARD */}
        <div className="orders-card">
          <div className="orders-header">
            <h2 className="orders-title">All Orders</h2>
            <button
              className="manage-btn"
              onClick={loadOrders}
              disabled={isLoading}
            >
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
  
          {/* FILTER BUTTONS */}
          <div className="orders-filterGroup">
            {["ALL", "PENDING", "PROCESSING", "COMPLETED", "CANCELLED"].map(status => (
              <button
                key={status}
                className={`filter-btn ${orderFilter === status ? "active" : ""}`}
                onClick={() => handleFilterChange(status)}
                disabled={isLoading}
              >
                {status.charAt(0) + status.slice(1).toLowerCase()}
                {status !== "ALL" && ` (${allOrders.filter(o => o.status === status).length})`}
              </button>
            ))}
          </div>
  
          {/* ERROR MESSAGE */}
          {ordersError && (
            <div className="error-message">
              Error: {ordersError}
            </div>
          )}
  
          {/* ORDERS TABLE */}
          <div className="table-scroll">
            {isLoading ? (
              <div className="loading-container">
                Loading orders...
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="empty-state">
                No {orderFilter.toLowerCase()} orders found.
              </div>
            ) : (
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Status</th>
                    <th>Age</th>
                    <th>Type</th>
                    <th>User</th>
                    <th>Items</th>
                    <th>Address</th>
                    <th>Round</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr 
                      key={order.orderId}
                      onClick={() => openDetailModal(order)}
                      style={{ cursor: 'pointer' }}
                      className="cargo-row"
                    >
                      <td>{order.orderId}</td>
                      <td>
                        <span className={`status-badge status-${order.status.toLowerCase()}`}>
                          {order.status}
                        </span>
                      </td>
                      <td>{getOrderAge(order.requestTime)}</td>
                      <td>{getOrderTypeDisplay(order)}</td>
                      <td>{order.userId === -1 ? 'Guest' : `User #${order.userId}`}</td>
                      <td>
                        <div className="order-items-cell">
                          {order.orderItems && order.orderItems.slice(0, 3).map((item, idx) => (
                            <span key={idx} className={`order-item-tag ${item.isCustom ? 'custom' : ''}`}>
                              {item.itemName}
                              {item.size && ` [${item.size}]`}
                              ({item.quantity})
                              {item.isCustom && <span className="custom-indicator">CUSTOM</span>}
                              {item.description && <span title="Has notes" style={{marginLeft:'4px'}}>✏️</span>}
                            </span>
                          ))}
                          {order.orderItems && order.orderItems.length > 3 && (
                            <span className="order-item-tag more">+{order.orderItems.length - 3} more</span>
                          )}
                        </div>
                      </td>
                      <td className="address-cell">{order.deliveryAddress || 'N/A'}</td>
                      <td>
                        {order.roundId ? (
                          <span className="round-info">
                            Round #{order.roundId}
                          </span>
                        ) : (
                          <span className="unassigned-label">Unassigned</span>
                        )}
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="manage-btn assign-btn"
                            onClick={(e) => openAssignModal(order, e)}
                            title="Assign to Round"
                          >
                            Assign
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          
          {/* SUMMARY FOOTER */}
          {!isLoading && (
            <div className="summary-footer">
              <div>
                <strong>Showing:</strong> {filteredOrders.length} orders
                {orderFilter !== "ALL" && ` (filtered by ${orderFilter.toLowerCase()})`}
              </div>
              <div className="timestamp">
                Last updated: {new Date().toLocaleTimeString()}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ORDER DETAIL MODAL */}
      {detailModalOpen && selectedOrderDetail && (
        <div className="modal-overlay" onClick={() => setDetailModalOpen(false)}>
          <div className="modal-content order-detail-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setDetailModalOpen(false)}>×</button>
            
            <h2 className="modal-title">Order #{selectedOrderDetail.orderId}</h2>
            
            <div className="order-detail-grid">
              {/* Status Section */}
              <div className="detail-section">
                <h4>Status</h4>
                <span className={`status-badge status-${selectedOrderDetail.status.toLowerCase()}`}>
                  {selectedOrderDetail.status}
                </span>
              </div>

              {/* Order Info */}
              <div className="detail-section">
                <h4>Order Information</h4>
                <div className="detail-row">
                  <span className="detail-label">Order Type:</span>
                  <span className="detail-value">{getOrderTypeDisplay(selectedOrderDetail)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">User:</span>
                  <span className="detail-value">
                    {selectedOrderDetail.userId === -1 ? 'Guest' : `User #${selectedOrderDetail.userId}`}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Created:</span>
                  <span className="detail-value">{formatDateTime(selectedOrderDetail.requestTime)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Age:</span>
                  <span className="detail-value">{getOrderAge(selectedOrderDetail.requestTime)}</span>
                </div>
              </div>

              {/* Contact Info */}
              <div className="detail-section">
                <h4>Contact & Delivery</h4>
                <div className="detail-row">
                  <span className="detail-label">Phone:</span>
                  <span className="detail-value">{selectedOrderDetail.phoneNumber || 'N/A'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Address:</span>
                  <span className="detail-value">{selectedOrderDetail.deliveryAddress || 'N/A'}</span>
                </div>
              </div>

              {/* Round Info */}
              <div className="detail-section">
                <h4>Assignment</h4>
                <div className="detail-row">
                  <span className="detail-label">Round:</span>
                  <span className="detail-value">
                    {selectedOrderDetail.roundId ? `Round #${selectedOrderDetail.roundId}` : 'Unassigned'}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Volunteer:</span>
                  <span className="detail-value">
                    {selectedOrderDetail.assignedVolunteerId 
                      ? `Volunteer #${selectedOrderDetail.assignedVolunteerId}` 
                      : 'Not assigned'}
                  </span>
                </div>
              </div>

              {/* Order Items */}
              <div className="detail-section full-width">
                <h4>Order Items ({selectedOrderDetail.orderItems?.length || 0})</h4>
                <div className="order-items-list">
                  {selectedOrderDetail.orderItems && selectedOrderDetail.orderItems.map((item, idx) => (
                    <div key={idx} className={`order-item-detail ${item.isCustom ? 'custom' : ''}`}>
                      <div className="item-info">
                        <span className="item-name">{item.itemName}</span>
                        {item.size && <span className="item-size">[{item.size}]</span>}
                        <span className="item-qty">× {item.quantity}</span>
                        {item.description && (
                          <div className="item-notes">Notes: {item.description}</div>
                        )}
                      </div>
                      {item.isCustom && <span className="custom-badge">CUSTOM REQUEST</span>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              {selectedOrderDetail.notes && (
                <div className="detail-section full-width">
                  <h4>Notes</h4>
                  <p className="order-notes">{selectedOrderDetail.notes}</p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="modal-actions order-detail-actions">
              <button
                className="manage-btn assign-btn"
                onClick={(e) => {
                  setDetailModalOpen(false);
                  openAssignModal(selectedOrderDetail, e);
                }}
              >
                Assign to Round
              </button>
              
              {selectedOrderDetail.status === "PENDING" && (
                <>
                  <button
                    className="manage-btn process-btn"
                    onClick={(e) => updateOrderStatus(selectedOrderDetail.orderId, 'PROCESSING', e)}
                  >
                    Mark Processing
                  </button>
                  <button
                    className="manage-btn cancel-btn"
                    onClick={(e) => cancelOrder(selectedOrderDetail.orderId, e)}
                  >
                    Cancel Order
                  </button>
                </>
              )}
              
              {selectedOrderDetail.status === "PROCESSING" && (
                <>
                  <button
                    className="manage-btn complete-btn"
                    onClick={(e) => updateOrderStatus(selectedOrderDetail.orderId, 'COMPLETED', e)}
                  >
                    Mark Completed
                  </button>
                  <button
                    className="manage-btn cancel-btn"
                    onClick={(e) => cancelOrder(selectedOrderDetail.orderId, e)}
                  >
                    Cancel Order
                  </button>
                </>
              )}
              
              {(selectedOrderDetail.status === "COMPLETED" || selectedOrderDetail.status === "CANCELLED") && (
                <button
                  className="manage-btn delete-btn"
                  onClick={(e) => deleteOrder(selectedOrderDetail.orderId, e)}
                >
                  Delete Order
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ASSIGN ORDER MODAL */}
      {assignModalOpen && selectedOrderForAssign && (
        <div className="modal-overlay" onClick={() => setAssignModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setAssignModalOpen(false)}>×</button>
            <h2 className="modal-title">Assign Order #{selectedOrderForAssign.orderId}</h2>
            
            <div className="modal-field">
              <label>
                <strong>Current Round:</strong> 
                {selectedOrderForAssign.roundId ? 
                  ` Round #${selectedOrderForAssign.roundId}` : 
                  ' Unassigned'}
              </label>
            </div>
            
            <div className="modal-field">
              <label><strong>Select New Round:</strong></label>
              <select 
                className="cargo-input"
                value={selectedRoundId} 
                onChange={e => setSelectedRoundId(e.target.value)}
              >
                {assignError && (
                  <div className="validation-error">
                    {assignError}
                  </div>
                )}
                <option value="">-- Unassign from Round --</option>
                {availableRounds.map(round => (
                  <option key={round.roundId} value={round.roundId}>
                    Round #{round.roundId} - {round.title} 
                    ({round.currentOrderCount || 0}/{round.orderCapacity || 20} orders)
                    - {new Date(round.startTime).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="modal-actions">
              <button 
                className="cargo-button secondary"
                onClick={() => setAssignModalOpen(false)}
              >
                Cancel
              </button>
              <button 
                className="cargo-button primary"
                onClick={assignOrderToRound}
              >
                Assign Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INLINE STYLES FOR NEW COMPONENTS */}
      <style>{`
        /* Consistent Status Badges */
        .status-badge {
          display: inline-block;
          padding: 6px 14px;
          border-radius: 20px;
          font-weight: 600;
          font-size: 12px;
          text-transform: uppercase;
          text-align: center;
          min-width: 90px;
        }
        
        .status-badge.status-pending {
          background-color: rgba(245, 189, 70, 0.9);
          color: #333;
        }
        
        .status-badge.status-processing {
          background-color: rgba(0, 174, 255, 0.8);
          color: #fff;
        }
        
        .status-badge.status-completed {
          background-color: rgba(46, 204, 56, 0.9);
          color: #fff;
        }
        
        .status-badge.status-cancelled {
          background-color: rgba(231, 76, 60, 0.8);
          color: #fff;
        }

        /* Order Items Cell - Dark Theme */
        .order-items-cell {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          max-width: 300px;
        }
        
        .order-item-tag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          background-color: var(--bg-dark-tertiary, #212c46);
          border: 1px solid var(--border-dark, #3a5070);
          border-radius: 4px;
          font-size: 11px;
          color: var(--text-on-dark, #fff);
        }
        
        .order-item-tag.custom {
          background-color: rgba(255, 152, 0, 0.2);
          border-color: #ff9800;
        }
        
        .order-item-tag .custom-indicator {
          color: #ff9800;
          font-weight: 700;
          font-size: 10px;
          margin-left: 4px;
        }
        
        .order-item-tag.more {
          background-color: var(--bg-dark-hover, #2a3f5f);
          font-style: italic;
        }
        
        .address-cell {
          max-width: 150px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /* Order Detail Modal */
        .order-detail-modal {
          max-width: 700px;
          background-color: var(--bg-dark-secondary, #1a2332);
          color: var(--text-on-dark, #fff);
        }
        
        .order-detail-modal .modal-title {
          color: var(--primary-gold, #f6b800);
          border-bottom: 1px solid var(--border-dark, #3a5070);
          padding-bottom: 15px;
          margin-bottom: 20px;
        }
        
        .order-detail-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        
        .detail-section {
          background-color: var(--bg-dark-tertiary, #212c46);
          border-radius: 8px;
          padding: 15px;
        }
        
        .detail-section.full-width {
          grid-column: 1 / -1;
        }
        
        .detail-section h4 {
          color: var(--primary-gold, #f6b800);
          margin: 0 0 12px 0;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 6px 0;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        
        .detail-row:last-child {
          border-bottom: none;
        }
        
        .detail-label {
          color: var(--text-on-dark-muted, #aaa);
          font-size: 13px;
        }
        
        .detail-value {
          color: var(--text-on-dark, #fff);
          font-size: 13px;
          font-weight: 500;
        }

        /* Order Items in Detail Modal */
        .order-items-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .order-item-detail {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 12px;
          background-color: var(--bg-dark-secondary, #1a2332);
          border-radius: 6px;
          border: 1px solid var(--border-dark, #3a5070);
        }
        
        .order-item-detail.custom {
          border-color: #ff9800;
          background-color: rgba(255, 152, 0, 0.1);
        }
        
        .order-item-detail .item-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .order-item-detail .item-name {
          font-weight: 500;
          color: var(--text-on-dark, #fff);
        }
        
        .order-item-detail .item-size {
          color: var(--info, #3498db);
          font-size: 12px;
        }
        
        .order-item-detail .item-qty {
          color: var(--text-on-dark-muted, #aaa);
          font-size: 13px;
        }
        .order-item-detail .item-notes {
          color: var(--text-on-dark-muted, #bbb);
          font-size: 12px;
          margin-left: 16px;
          font-style: italic;
        }
        
        .order-item-detail .custom-badge {
          background-color: #ff9800;
          color: #333;
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 700;
        }
        
        .order-notes {
          background-color: #1a2332;
          padding: 12px;
          border-radius: 6px;
          color: #ffffff !important;
          font-size: 13px;
          line-height: 1.5;
          white-space: pre-wrap;
        }

        /* Summary Footer Fix */
        .summary-footer {
          color: #ffffff !important;
        }
        
        .summary-footer strong {
          color: #ffffff !important;
        }
        
        .summary-footer .timestamp {
          color: #aaaaaa !important;
        }

        /* Order Detail Actions */
        .order-detail-actions {
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid var(--border-dark, #3a5070);
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          justify-content: center;
        }
        
        .order-detail-actions .manage-btn {
          min-width: 120px;
        }

        /* Button Colors */
        .assign-btn {
          background-color: #2196f3 !important;
          color: #fff !important;
        }
        
        .process-btn {
          background-color: #00bcd4 !important;
          color: #fff !important;
        }
        
        .complete-btn {
          background-color: #4caf50 !important;
          color: #fff !important;
        }
        
        .cancel-btn {
          background-color: #ff5722 !important;
          color: #fff !important;
        }
        
        .delete-btn {
          background-color: #f44336 !important;
          color: #fff !important;
        }

        /* Stats Colors */
        .stat-pending { color: #f6b800; }
        .stat-processing { color: #00bcd4; }
        .stat-completed { color: #4caf50; }
        .stat-cancelled { color: #f44336; }
        .stat-unassigned { color: #ff9800; }

        /* Responsive */
        @media (max-width: 768px) {
          .order-detail-grid {
            grid-template-columns: 1fr;
          }
          
          .order-detail-actions {
            flex-direction: column;
          }
          
          .order-detail-actions .manage-btn {
            width: 100%;
          }
        }
        .validation-error {
          margin-top: 10px;
          padding: 8px 12px;
          border-radius: 6px;
          background-color: rgba(244, 67, 54, 0.15);
          border: 1px solid #f44336;
          color: #ffb3b3;
          font-size: 13px;
        }
      `}</style>
    </div>
  );
};

export default AdminOrders;