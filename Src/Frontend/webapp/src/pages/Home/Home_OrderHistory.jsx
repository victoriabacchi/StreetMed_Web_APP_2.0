// Home_OrderHistory.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { secureAxios } from "../../config/axiosConfig";
import '../../index.css'; 

const Home_OrderHistory = ({ userId }) => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState("");
  const [cancellingOrderId, setCancellingOrderId] = useState(null);

  const baseURL = import.meta.env.VITE_SECURE_BASE_URL || import.meta.env.VITE_BASE_URL;

  // Get auth token from storage
  const getAuthToken = () => {
    const storedUser = sessionStorage.getItem("auth_user") || localStorage.getItem("auth_user");
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      return userData.authToken;
    }
    return null;
  };

  useEffect(() => {
    const fetchOrders = async () => {
      if (!userId || typeof userId !== "number") {
        setOrdersError("Order history is not available for guest users.");
        return;
      }
      
      try {
        setOrdersLoading(true);
        setOrdersError("");
        
        // Use secureAxios for authenticated order fetching
        const response = await secureAxios.get(
          `/api/orders/user/${userId}`,
          { 
            params: { 
              authenticated: true, 
              userRole: "CLIENT", 
              userId 
            },
            headers: {
              'X-Auth-Token': getAuthToken() || ''
            }
          }
        );
        
        if (response.data.status === "success") {
          const filtered = response.data.orders.filter((o) => o.status !== "CANCELLED");
          setOrders(filtered);
        } else {
          setOrdersError(response.data.message || "Failed to load orders.");
        }
      } catch (error) {
        console.error("Error fetching orders:", error);
        
        // Handle certificate errors
        if (error.code === 'ERR_CERT_AUTHORITY_INVALID') {
          setOrdersError("Certificate error. Please accept the certificate and try again.");
          window.dispatchEvent(new CustomEvent('certificate-error', { 
            detail: { url: baseURL }
          }));
        } else if (error.response?.status === 403 && error.response?.data?.httpsRequired) {
          setOrdersError("Secure connection required. Redirecting to HTTPS...");
          if (window.location.protocol !== 'https:') {
            setTimeout(() => {
              window.location.href = window.location.href.replace('http:', 'https:');
            }, 1500);
          }
        } else if (error.response?.status === 401) {
          setOrdersError("Authentication failed. Please login again.");
          setTimeout(() => {
            navigate('/login');
          }, 1500);
        } else {
          setOrdersError(error.response?.data?.message || "Failed to load orders.");
        }
      } finally {
        setOrdersLoading(false);
      }
    };

    fetchOrders();
  }, [userId, baseURL, navigate]);

  const handleCancelOrder = async (orderId) => {
    if (cancellingOrderId) return; // Prevent multiple cancellations
    
    setCancellingOrderId(orderId);
    try {
      const payload = { 
        authenticated: true, 
        userId, 
        userRole: "CLIENT" 
      };
      
      // Use secureAxios for authenticated order cancellation
      const response = await secureAxios.post(
        `/api/orders/${orderId}/cancel`,
        payload,
        {
          headers: {
            'X-Auth-Token': getAuthToken() || ''
          }
        }
      );
      
      if (response.data.status === "success") {
        // Refresh orders list by filtering out the cancelled order
        setOrders(orders.filter((order) => order.orderId !== orderId));
        // Show success message
        setOrdersError(""); // Clear any existing errors
        alert("Order cancelled successfully!");
      } else {
        alert(response.data.message || "Failed to cancel order.");
      }
    } catch (error) {
      console.error("Error cancelling order:", error);
      
      // Handle certificate errors
      if (error.code === 'ERR_CERT_AUTHORITY_INVALID') {
        alert("Certificate error. Please accept the certificate and try again.");
        window.dispatchEvent(new CustomEvent('certificate-error', { 
          detail: { url: baseURL }
        }));
      } else if (error.response?.status === 403 && error.response?.data?.httpsRequired) {
        alert("Secure connection required for order cancellation.");
        if (window.location.protocol !== 'https:') {
          window.location.href = window.location.href.replace('http:', 'https:');
        }
      } else if (error.response?.status === 401) {
        alert("Authentication failed. Please login again.");
        navigate('/login');
      } else {
        alert(error.response?.data?.message || "Failed to cancel order.");
      }
    } finally {
      setCancellingOrderId(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  const getStatusColor = (status) => {
    switch(status?.toUpperCase()) {
      case 'PENDING':
        return '#f39c12'; // Orange
      case 'PROCESSING':
        return '#3498db'; // Blue
      case 'COMPLETED':
        return '#27ae60'; // Green
      case 'CANCELLED':
        return '#e74c3c'; // Red
      default:
        return '#95a5a6'; // Gray
    }
  };

  return (
    <div className="orderHistory-container">
      <div className="orderHistory-header">
        <h2>Order History</h2>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* Security indicator */}
          {window.location.protocol === 'https:' && (
            <span style={{ fontSize: '12px', color: '#27ae60' }}>
              🔒 Secure
            </span>
          )}
          <button className="backButton" onClick={() => navigate("/")}>
            Back to Home
          </button>
        </div>
      </div>
      
      {ordersLoading && (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <p>Loading orders...</p>
        </div>
      )}
      
      {ordersError && (
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#fee', 
          border: '1px solid #fcc',
          borderRadius: '5px',
          marginBottom: '20px'
        }}>
          <p className="errorText">{ordersError}</p>
        </div>
      )}
      
      <div className="ordersList">
        {!ordersLoading && orders.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px',
            backgroundColor: '#f9f9f9',
            borderRadius: '8px'
          }}>
            <p style={{ fontSize: '18px', color: '#666' }}>No orders found.</p>
            <button 
              style={{
                marginTop: '20px',
                padding: '10px 20px',
                backgroundColor: '#3498db',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
              onClick={() => navigate("/")}
            >
              Make Your First Order
            </button>
          </div>
        ) : (
          orders.map((order, idx) => (
            <div key={idx} className="orderItem" style={{ position: 'relative' }}>
              {/* Status Badge */}
              <div style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                padding: '5px 10px',
                backgroundColor: getStatusColor(order.status),
                color: 'white',
                borderRadius: '15px',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                {order.status}
              </div>
              
              <p>
                <strong>Order ID:</strong> {order.orderId}
              </p>
              <p>
                <strong>Type:</strong> {order.orderType || "CLIENT"}
              </p>
              <p>
                <strong>Address:</strong> {order.deliveryAddress}
              </p>
              <p>
                <strong>Phone:</strong> {order.phoneNumber || "Not provided"}
              </p>
              <p>
                <strong>Notes:</strong> {order.notes || "No notes"}
              </p>
              <p>
                <strong>Order Time:</strong> {formatDate(order.requestTime)}
              </p>
              
              {order.orderItems && order.orderItems.length > 0 ? (
                <div style={{ marginTop: '10px' }}>
                  <p>
                    <strong>Total Items:</strong> {order.orderItems.length}
                  </p>
                  <ul className="orderItemsList">
                    {order.orderItems.map((item, iidx) => (
                      <li key={iidx} style={{ 
                        padding: '5px 0',
                        borderBottom: iidx < order.orderItems.length - 1 ? '1px solid #eee' : 'none'
                      }}>
                        <span style={{ fontWeight: '500' }}>{item.itemName}</span>
                        <span style={{ color: '#666', marginLeft: '10px' }}>
                          x {item.quantity}
                        </span>
                        {item.description && (
                          <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                            Notes: {item.description}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p style={{ fontStyle: 'italic', color: '#999' }}>
                  No items found for this order.
                </p>
              )}
              
              {/* Only show cancel button for PENDING orders */}
              {order.status === "PENDING" && (
                <button 
                  className="cancelOrderButton" 
                  onClick={() => handleCancelOrder(order.orderId)}
                  disabled={cancellingOrderId === order.orderId}
                  style={{
                    opacity: cancellingOrderId === order.orderId ? 0.6 : 1,
                    cursor: cancellingOrderId === order.orderId ? 'not-allowed' : 'pointer'
                  }}
                >
                  {cancellingOrderId === order.orderId ? "Cancelling..." : "Cancel Order"}
                </button>
              )}
              
              {/* Show message for non-cancellable orders */}
              {order.status === "PROCESSING" && (
                <p style={{ 
                  marginTop: '10px', 
                  fontSize: '12px', 
                  color: '#3498db',
                  fontStyle: 'italic' 
                }}>
                  Order is being processed and cannot be cancelled.
                </p>
              )}
              
              {order.status === "COMPLETED" && (
                <p style={{ 
                  marginTop: '10px', 
                  fontSize: '12px', 
                  color: '#27ae60',
                  fontStyle: 'italic' 
                }}>
                  Order has been completed.
                </p>
              )}
              
              <hr />
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Home_OrderHistory;