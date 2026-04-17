import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { secureAxios } from '../../config/axiosConfig';

import '../../index.css'; 

const Admin = ({ onLogout, userData }) => {
  const navigate = useNavigate();

  const [outOfStockCount, setOutOfStockCount] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [pendingAppsCount, setPendingAppsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAlerts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Use secureAxios for admin operations (HTTPS required)
      const itemsResp = await secureAxios.get('/api/cargo/items', {
        headers: {
          "Admin-Username": userData.username,
          "Authentication-Status": "true",
          "X-Auth-Token": userData.authToken || '',
        },
      });
  
      const listRaw = itemsResp.data;
      const items = Array.isArray(listRaw)
        ? listRaw
        : Array.isArray(listRaw.items)
        ? listRaw.items
        : [];
  
      const getQty = (it) =>
        it.totalQuantity ?? it.quantity ?? it.stock ?? 0;
  
      setOutOfStockCount(items.filter((i) => getQty(i) === 0).length);
  
      setLowStockCount(
        items.filter((i) => {
          const q = getQty(i);
          return q > 0 && q < 5;
        }).length
      );
  
      // Fetch orders using secure connection - FIX: Use actual role from userData
      const ordersResp = await secureAxios.get('/api/orders/all', {
        headers: {
          "Admin-Username": userData.username,
          "Authentication-Status": "true",
          "X-Auth-Token": userData.authToken || '',
        },
        params: {
          authenticated: true,
          userId: userData.userId,
          userRole: userData.role || "ADMIN", // FIX: Use actual role instead of hardcoded "VOLUNTEER"
        },
      });
      const orders = ordersResp.data.orders || [];
      setPendingOrdersCount(orders.filter((o) => o.status === "PENDING").length);
  
      // Fetch volunteer applications using secure connection
      const appsResp = await secureAxios.get('/api/volunteer/pending', {
        headers: {
          "Admin-Username": userData.username,
          "Authentication-Status": "true",
          "X-Auth-Token": userData.authToken || '',
        },
      });
      setPendingAppsCount((appsResp.data.data || []).length);
    } catch (e) {
      console.error("Failed to fetch alerts", e);
      setError(e.response?.data?.message || e.message);
      
      // Check if it's an HTTPS requirement error
      if (e.response?.data?.httpsRequired) {
        setError("Secure HTTPS connection required for admin operations. Please ensure you're using HTTPS.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [userData]);
  

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleLogout = () => {
    onLogout();
    navigate('/');
  };

  return (
    <div className="page-container">
      <header className="store-header" style={{ backgroundColor: '#0f1c38' }}>
        <img src="/Untitled.png" alt="Logo" className="store-logo" />
        <button className="logout-button" onClick={handleLogout}>
          Logout
        </button>
      </header>

      <main className="admin-dashboard">
        <section className="admin-left">
          <h1 className="admin-greeting">
            Hello, {userData.firstName || userData.username}
          </h1>

          {error && (
            <div style={{ 
              padding: '10px', 
              margin: '10px 0', 
              backgroundColor: '#ffebee', 
              color: '#c62828', 
              borderRadius: '4px' 
            }}>
              {error}
            </div>
          )}

          <div
            className="admin-card light-blue"
            onClick={() => navigate('/cargo_admin')}
          >
            <span className="card-text-blue">Manage Inventory</span>
          </div>

          <div
            className="admin-card light-yellow"
            onClick={() => navigate('/admin/orders')}
          >
            <span className="card-text-yellow">All Orders</span>
          </div>

          <div
            className="admin-card light-blue"
            onClick={() => navigate('/admin/applications')}
          >
            <span className="card-text-blue">Manage Volunteers</span>
          </div>

          <div
            className="admin-card light-yellow"
            onClick={() => navigate('/admin/users')}
          >
            <span className="card-text-yellow">Manage Users</span>
          </div>

          <div
            className="admin-card light-blue"
            onClick={() => navigate('/round_admin')}
          >
            <span className="card-text-blue">Manage Round</span>
          </div>

          <div
            className="admin-card light-yellow"
            onClick={() => navigate('/admin/feedback')}
          >
            <span className="card-text-yellow">View Feedback</span>
          </div>

          <div
            className="admin-card light-blue"
            onClick={() => navigate('/heatmap')}
          >
            <span className="card-text-blue">Interaction Heatmap</span>
          </div>
        </section>


        <section className="admin-right">
          <div className="alerts-card">
            <h2 className="alerts-title">Alerts</h2>
            <hr />
            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                Loading alerts...
              </div>
            ) : (
              <>
                <div className="alert-entry">
                  <span>Items out of stock</span>
                  <span className="card-badge red-badge">{outOfStockCount}</span>
                </div>
                <div className="alert-entry">
                  <span>Items running low</span>
                  <span className="card-badge yellow-badge">{lowStockCount}</span>
                </div>
                <div className="alert-entry">
                  <span>New orders</span>
                  <span className="card-badge blue-badge">{pendingOrdersCount}</span>
                </div>
                <div className="alert-entry">
                  <span>New volunteer applications</span>
                  <span className="card-badge blue-badge">{pendingAppsCount}</span>
                </div>
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Admin;