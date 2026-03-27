import React, { useState, useEffect, useCallback } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { publicAxios, secureAxios } from "../../config/axiosConfig";
import { useNavigate } from "react-router-dom";
import '../../index.css'; 

// Embedded styles for round cards to prevent CSS conflicts
const embeddedStyles = {
  // Round card container
  roundCard: {
    backgroundColor: '#1a2844',
    borderRadius: '12px',
    padding: '18px',
    width: '280px',
    minHeight: 'auto',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
    color: '#ffffff',
    fontFamily: "'Courier New', Courier, monospace",
    border: '1px solid rgba(255, 255, 255, 0.1)',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    boxSizing: 'border-box',
    overflow: 'visible',
    position: 'relative',
    marginBottom: '10px',
  },
  
  // Confirmed status - add green left border
  roundCardConfirmed: {
    borderLeft: '4px solid #27ae60',
  },
  
  // Waitlisted status - add yellow left border
  roundCardWaitlisted: {
    borderLeft: '4px solid #f6b800',
  },
  
  // Status badge
  statusBadge: {
    display: 'inline-block',
    padding: '5px 14px',
    borderRadius: '14px',
    fontSize: '11px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: '8px',
    width: 'fit-content',
  },
  
  statusBadgeConfirmed: {
    backgroundColor: '#27ae60',
    color: '#ffffff',
  },
  
  statusBadgeWaitlisted: {
    backgroundColor: '#f6b800',
    color: '#333333',
  },
  
  // Card title
  cardTitle: {
    color: '#f6b800',
    fontSize: '16px',
    fontWeight: 'bold',
    margin: '0 0 6px 0',
  },
  
  // Card description
  cardDescription: {
    color: '#cccccc',
    fontSize: '13px',
    margin: '0 0 8px 0',
    lineHeight: '1.4',
  },
  
  // Card info row
  cardInfoRow: {
    color: '#ffffff',
    fontSize: '13px',
    margin: '4px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  
  // Card info icon
  cardIcon: {
    fontSize: '14px',
    width: '18px',
    textAlign: 'center',
  },
  
  // Orders count
  ordersCount: {
    color: '#aaaaaa',
    fontSize: '13px',
    marginTop: '8px',
    paddingTop: '8px',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
  },
  
  // View Details button
  viewDetailsBtn: {
    marginTop: '12px',
    backgroundColor: '#003e7e',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    padding: '10px 16px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    width: '100%',
    transition: 'background-color 0.2s ease',
    fontFamily: "'Courier New', Courier, monospace",
  },
  
  // Rounds cards container
  roundsCardsContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '16px',
    backgroundColor: '#1a2332',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
    padding: '20px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    marginBottom: '20px',
  },
  
  // Order card
  orderCard: {
    backgroundColor: '#1a2844',
    borderRadius: '12px',
    padding: '18px',
    width: '280px',
    minHeight: 'auto',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
    color: '#ffffff',
    fontFamily: "'Courier New', Courier, monospace",
    border: '1px solid rgba(255, 255, 255, 0.1)',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    boxSizing: 'border-box',
  },
  
  // Empty state
  emptyState: {
    padding: '24px',
    textAlign: 'center',
    backgroundColor: '#212c46',
    borderRadius: '8px',
    width: '100%',
    border: '1px dashed rgba(255, 255, 255, 0.2)',
  },
  
  emptyStateText: {
    color: '#ffffff',
    fontSize: '15px',
    margin: '0 0 8px 0',
  },
  
  emptyStateSubtext: {
    color: '#aaaaaa',
    fontSize: '13px',
    margin: '0',
  },
};

const Volunteer_Dashboard = ({ userData, onLogout }) => {
  const navigate = useNavigate();

  // Rounds states
  const [myUpcomingRounds, setMyUpcomingRounds] = useState([]);
  const [myPastRounds, setMyPastRounds] = useState([]);
  const [myRoundsError, setMyRoundsError] = useState("");
  const [allUpcomingRounds, setAllUpcomingRounds] = useState([]);
  const [allRoundsError, setAllRoundsError] = useState("");
  
  // Orders states
  const [myAssignments, setMyAssignments] = useState([]);
  const [ordersError, setOrdersError] = useState("");
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  
  // Calendar and modals
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [roundsForSelectedDate, setRoundsForSelectedDate] = useState([]);
  const [showRoundsModal, setShowRoundsModal] = useState(false);
  const [fullViewModalOpen, setFullViewModalOpen] = useState(false);
  const [selectedRoundDetails, setSelectedRoundDetails] = useState(null);
  const [, setRoundOrders] = useState([]);
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showPastRounds, setShowPastRounds] = useState(false);
  const [showCompletedOrders, setShowCompletedOrders] = useState(false);

  // Load volunteer's assignments
  const loadMyAssignments = useCallback(async () => {
    if (!userData || !userData.userId) return;
    setIsLoadingOrders(true);
    try {
      const response = await secureAxios.get('/api/orders/my-assignments', {
        headers: {
          'User-Id': userData.userId,
          'User-Role': 'VOLUNTEER',
          'Authentication-Status': 'true'
        }
      });
      
      if (response.data.status === "success") {
        setMyAssignments(response.data.assignments || []);
      } else {
        setOrdersError(response.data.message || "Failed to load assignments");
      }
    } catch (error) {
      console.error("Error loading assignments:", error);
      setOrdersError(error.response?.data?.message || error.message);
    } finally {
      setIsLoadingOrders(false);
    }
  }, [userData]);

  // Load my rounds
  const loadMyRounds = useCallback(async () => {
    if (!userData || !userData.userId) return;
    try {
      const r = await publicAxios.get('/api/rounds/my-rounds', {
        params: { authenticated: true, userId: userData.userId, userRole: "VOLUNTEER" }
      });
      const d = r.data;
      if (d.status === "success") {
        const upcoming = (d.upcomingRounds || []).filter(round => 
          round.status !== 'CANCELLED' && round.status !== 'CANCELED'
        );
        const past = (d.pastRounds || []).filter(round => 
          round.status !== 'CANCELLED' && round.status !== 'CANCELED'
        );
        
        setMyUpcomingRounds(upcoming);
        setMyPastRounds(past);
      } else {
        setMyRoundsError(d.message || "Failed to load my rounds");
      }
    } catch (e) {
      if (e.code === 'ERR_CERT_AUTHORITY_INVALID') {
        setMyRoundsError('Certificate error. Please accept the certificate and try again.');
      } else {
        setMyRoundsError(e.response?.data?.message || e.message);
      }
    }
  }, [userData]);

  const loadAllUpcomingRounds = useCallback(async () => {
    if (!userData || !userData.userId) return;
    try {
      const r = await publicAxios.get('/api/rounds/all', {
        params: { authenticated: true, userId: userData.userId, userRole: "VOLUNTEER" }
      });
      const d = r.data;
      if (d.status === "success") {
        const nonCancelledRounds = (d.rounds || []).filter(round => 
          round.status !== 'CANCELLED' && round.status !== 'CANCELED'
        );
        setAllUpcomingRounds(nonCancelledRounds);
      } else {
        setAllRoundsError(d.message || "Failed to load upcoming rounds");
      }
    } catch (e) {
      setAllRoundsError(e.response?.data?.message || e.message);
    }
  }, [userData]);

  const signupForRound = async (roundId, requestedRole = "VOLUNTEER") => {
    try {
      const r = await publicAxios.post(`/api/rounds/${roundId}/signup`, {
        authenticated: true,
        userId: userData.userId,
        userRole: "VOLUNTEER",
        requestedRole
      });
      alert(r.data.message);
      loadMyRounds();
      loadAllUpcomingRounds();
      handleDateClick(selectedDate);
    } catch (e) {
      alert(e.response?.data?.message || e.message);
    }
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
    const ds = date.toISOString().split("T")[0];
    const f = allUpcomingRounds.filter((r) => {
      const rs = r.startTime.split("T")[0];
      return rs === ds;
    });
    setRoundsForSelectedDate(f);
    setShowRoundsModal(true);
  };

  const highlightDates = ({ date, view }) => {
    if (view !== "month") return null;
    const ds = date.toISOString().split("T")[0];
    const f = allUpcomingRounds.some((r) => {
      const rs = r.startTime.split("T")[0];
      return rs === ds;
    });
    return f ? "highlight-day" : null;
  };

  const openFullViewModal = async (roundId) => {
    try {
      const r = await publicAxios.get(`/api/rounds/${roundId}`, {
        params: { authenticated: true, userId: userData.userId, userRole: "VOLUNTEER" }
      });
      if (r.data.status === "success") {
        setSelectedRoundDetails(r.data.round);
        setFullViewModalOpen(true);
      }
      
      const ordersRes = await publicAxios.get(`/api/rounds/${roundId}/orders`, {
        params: { authenticated: true, userId: userData.userId, userRole: "VOLUNTEER" }
      });
      if (ordersRes.data.status === "success") {
        setRoundOrders(ordersRes.data.orders || []);
      }
    } catch (e) {
      alert(e.response?.data?.message || e.message);
    }
  };

  const closeFullViewModal = () => {
    setFullViewModalOpen(false);
    setSelectedRoundDetails(null);
    setRoundOrders([]);
  };

  const handleCancelSignupFullView = async () => {
    if (!selectedRoundDetails) return;
    const s =
      (selectedRoundDetails.signupDetails && selectedRoundDetails.signupDetails.signupId) ||
      selectedRoundDetails.signupId;
    if (!s) {
      alert("No signup found for this round");
      return;
    }
    try {
      const r = await publicAxios.delete(`/api/rounds/signup/${s}`, {
        data: { authenticated: true, userId: userData.userId, userRole: "VOLUNTEER" }
      });
      alert(r.data.message);
      closeFullViewModal();
      loadMyRounds();
      loadAllUpcomingRounds();
    } catch (e) {
      alert(e.response?.data?.message || e.message);
    }
  };

  const openOrderFullView = (o) => {
    setSelectedOrder(o);
    setOrderModalOpen(true);
  };

  const closeOrderFullView = () => {
    setOrderModalOpen(false);
    setSelectedOrder(null);
  };

  useEffect(() => {
    if (!userData || !userData.userId) return;
    
    loadMyRounds();
    loadAllUpcomingRounds();
    loadMyAssignments();
    
    const interval = setInterval(() => {
      loadMyAssignments();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [userData, loadMyRounds, loadAllUpcomingRounds, loadMyAssignments]); 

  const activeAssignments = myAssignments.filter(a => a.status !== 'COMPLETED' && a.status !== 'CANCELLED');
  const completedAssignments = myAssignments.filter(a => a.status === 'COMPLETED');

  // Helper to get round card style
  const getRoundCardStyle = (signupStatus) => {
    let style = { ...embeddedStyles.roundCard };
    if (signupStatus === 'CONFIRMED') {
      style = { ...style, ...embeddedStyles.roundCardConfirmed };
    } else if (signupStatus === 'WAITLISTED') {
      style = { ...style, ...embeddedStyles.roundCardWaitlisted };
    }
    return style;
  };

  // Helper to get status badge style
  const getStatusBadgeStyle = (status) => {
    let style = { ...embeddedStyles.statusBadge };
    if (status === 'CONFIRMED') {
      style = { ...style, ...embeddedStyles.statusBadgeConfirmed };
    } else if (status === 'WAITLISTED') {
      style = { ...style, ...embeddedStyles.statusBadgeWaitlisted };
    }
    return style;
  };

  // Render a single round card with embedded styles
  const renderRoundCard = (r) => (
    <div key={r.roundId} style={getRoundCardStyle(r.signupStatus)}>
      {/* Status Badge */}
      {r.signupStatus && (
        <span style={getStatusBadgeStyle(r.signupStatus)}>
          {r.signupStatus === 'CONFIRMED' ? '✓ ' : ''}{r.signupStatus}
        </span>
      )}
      
      {/* Title */}
      <h3 style={embeddedStyles.cardTitle}>{r.title}</h3>
      
      {/* Description */}
      <p style={embeddedStyles.cardDescription}>{r.description}</p>
      
      {/* Location */}
      <div style={embeddedStyles.cardInfoRow}>
        <span style={embeddedStyles.cardIcon}>📍</span>
        <span>{r.location}</span>
      </div>
      
      {/* Date */}
      <div style={embeddedStyles.cardInfoRow}>
        <span style={embeddedStyles.cardIcon}>📅</span>
        <span>
          {new Date(r.startTime).toLocaleDateString('en-US', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric',
            year: 'numeric'
          })}
        </span>
      </div>
      
      {/* Time */}
      <div style={embeddedStyles.cardInfoRow}>
        <span style={embeddedStyles.cardIcon}>🕐</span>
        <span>
          {new Date(r.startTime).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })} - {new Date(r.endTime).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </span>
      </div>
      
      {/* Orders Count */}
      <div style={embeddedStyles.ordersCount}>
        <span style={{ color: '#888' }}>Orders: </span>
        <span style={{ color: '#fff' }}>{r.currentOrderCount || 0} / {r.orderCapacity || 20}</span>
      </div>
      
      {/* View Details Button */}
      <button 
        style={embeddedStyles.viewDetailsBtn}
        onClick={() => openFullViewModal(r.roundId)}
        onMouseOver={(e) => e.target.style.backgroundColor = '#002d5f'}
        onMouseOut={(e) => e.target.style.backgroundColor = '#003e7e'}
      >
        View Details
      </button>
    </div>
  );

  // Render a past round card
  const renderPastRoundCard = (r) => (
    <div key={r.roundId} style={embeddedStyles.roundCard}>
      <h3 style={embeddedStyles.cardTitle}>{r.title}</h3>
      <p style={embeddedStyles.cardDescription}>{r.description}</p>
      
      <div style={embeddedStyles.cardInfoRow}>
        <span style={embeddedStyles.cardIcon}>📍</span>
        <span>{r.location}</span>
      </div>
      
      <div style={embeddedStyles.cardInfoRow}>
        <span style={embeddedStyles.cardIcon}>📅</span>
        <span>
          {new Date(r.startTime).toLocaleDateString('en-US', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric',
            year: 'numeric'
          })}
        </span>
      </div>
      
      <div style={embeddedStyles.cardInfoRow}>
        <span style={embeddedStyles.cardIcon}>🕐</span>
        <span>
          {new Date(r.startTime).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })} - {new Date(r.endTime).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </span>
      </div>
    </div>
  );

  // Handle GPS logging
  const handleLogInteraction = async () => {
    try {
      // Request GPS permission
      if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser");
        return;
      }

      // Show loading state
      const button = event.currentTarget;
      const originalText = button.textContent;
      button.textContent = "📍 Getting location...";
      button.disabled = true;

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          const timestamp = new Date().toISOString();

          try {
            // Send GPS data to backend
            const response = await secureAxios.post('/api/interactions/log', {
              latitude,
              longitude,
              accuracy,
              authenticated: true,
              userId: userData.userId,
              userRole: 'VOLUNTEER',
              notes: `Logged at ${timestamp}`
            }, {
              headers: {
                'User-Id': userData.userId,
                'User-Role': 'VOLUNTEER',
                'Authentication-Status': 'true'
              }
            });

            if (response.data.status === 'success') {
              alert(`✓ Location logged successfully!\nLat: ${latitude.toFixed(6)}\nLon: ${longitude.toFixed(6)}\nTime: ${new Date(timestamp).toLocaleTimeString()}`);
              console.log('GPS Interaction logged:', response.data);
            } else {
              alert('Failed to log location: ' + (response.data.message || 'Unknown error'));
            }
          } catch (error) {
            console.error("Error logging interaction to backend:", error);
            alert('Error logging location: ' + (error.response?.data?.message || error.message));
          } finally {
            button.textContent = originalText;
            button.disabled = false;
          }
        },
        (error) => {
          button.textContent = originalText;
          button.disabled = false;
          
          let errorMessage = "Failed to get GPS location";
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = "GPS permission denied. Please enable location access in your browser settings.";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = "GPS location information is unavailable.";
              break;
            case error.TIMEOUT:
              errorMessage = "GPS request timed out. Please try again.";
              break;
          }
          alert(errorMessage);
          console.error("Geolocation error:", error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } catch (err) {
      console.error("Error in handleLogInteraction:", err);
      alert("Unexpected error: " + err.message);
    }
  };

  // Render order card
  const renderOrderCard = (assignment, isCompleted = false) => (
    <div 
      key={assignment.assignmentId} 
      style={{
        ...embeddedStyles.orderCard,
        borderLeft: isCompleted 
          ? '4px solid #27ae60' 
          : assignment.status === 'IN_PROGRESS' 
            ? '4px solid #3498db' 
            : '4px solid #f39c12'
      }}
    >
      {isCompleted && (
        <span style={{
          ...embeddedStyles.statusBadge,
          backgroundColor: '#27ae60',
          color: '#ffffff',
        }}>
          ✓ Completed
        </span>
      )}
      
      {!isCompleted && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h3 style={{ ...embeddedStyles.cardTitle, margin: 0 }}>Order #{assignment.orderId}</h3>
          <span style={{
            padding: '4px 10px',
            borderRadius: '10px',
            fontSize: '11px',
            fontWeight: 'bold',
            backgroundColor: assignment.status === 'ACCEPTED' ? '#fff3cd' : '#cce5ff',
            color: assignment.status === 'ACCEPTED' ? '#856404' : '#004085'
          }}>
            {assignment.status === 'IN_PROGRESS' ? 'IN PROGRESS' : assignment.status}
          </span>
        </div>
      )}
      
      {isCompleted && (
        <h3 style={embeddedStyles.cardTitle}>Order #{assignment.orderId}</h3>
      )}
      
      {assignment.roundId && (
        <p style={{ ...embeddedStyles.cardInfoRow, color: '#aaa' }}>
          <strong>Round #{assignment.roundId}</strong>
        </p>
      )}
      
      <p style={embeddedStyles.cardInfoRow}>
        <span style={{ color: '#888' }}>Items: </span>
        <span>{assignment.items?.map(i => {
          let itemText = `${i.itemName} (${i.quantity})`;
          if (i.size) itemText = `${i.itemName} [${i.size}] (${i.quantity})`;
          if (i.isCustom) itemText += ' 🛒';
          return itemText;
        }).join(', ')}</span>
      </p>
      
      <p style={embeddedStyles.cardInfoRow}>
        <span style={{ color: '#888' }}>Address: </span>
        <span>{assignment.deliveryAddress}</span>
      </p>
      
      <p style={embeddedStyles.cardInfoRow}>
        <span style={{ color: '#888' }}>Phone: </span>
        <span>{assignment.phoneNumber}</span>
      </p>
      
      {assignment.notes && (
        <p style={embeddedStyles.cardInfoRow}>
          <span style={{ color: '#888' }}>Notes: </span>
          <span>{assignment.notes}</span>
        </p>
      )}
      
      <button 
        style={{ ...embeddedStyles.viewDetailsBtn, marginTop: '10px' }}
        onClick={() => openOrderFullView(assignment)}
        onMouseOver={(e) => e.target.style.backgroundColor = '#002d5f'}
        onMouseOut={(e) => e.target.style.backgroundColor = '#003e7e'}
      >
        View Full Details
      </button>
    </div>
  );

  return (
    <>
      <header className="nav-bar">
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <img className="nav-logo" src="/Untitled.png" alt="Logo" />
          <span className="nav-welcome"><h2>Welcome Back, {userData.username}!</h2></span>
          <button className="nav-btn" style={{ marginLeft: "10px" }} onClick={() => navigate("/profile")}>
            Profile
          </button>
        </div>
        <div className="nav-right-group">
          <button className="nav-btn" onClick={() => navigate("/volunteer/orders")}>
            📦 Order Management
          </button>
          <button className="nav-btn" onClick={() => navigate("/cargo_volunteer")}>
            Cargo
          </button>
          <button className="nav-btn" onClick={onLogout}>
            Logout
          </button>
        </div>
      </header>

      <div className="volunteer-dashboard-container">
        <div className="volunteer-left-panel">
          <br />
          <br />
          
          {/* My Current Assignments */}
          <div style={{ marginBottom: '30px' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <strong>📋 My Current Assignments</strong>
              <span style={{ fontSize: '14px', color: '#ccc' }}>
                ({activeAssignments.length} active)
              </span>
              <button 
                onClick={loadMyAssignments}
                style={{
                  marginLeft: 'auto',
                  padding: '6px 12px',
                  fontSize: '12px',
                  backgroundColor: '#27ae60',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                🔄 Refresh
              </button>
            </h2>
            
            {ordersError && <p className="error-text">{ordersError}</p>}
            
            <div style={embeddedStyles.roundsCardsContainer}>
              {isLoadingOrders ? (
                <p style={{ color: '#ccc', padding: '20px', textAlign: 'center', width: '100%' }}>
                  Loading assignments...
                </p>
              ) : activeAssignments.length === 0 ? (
                <div style={embeddedStyles.emptyState}>
                  <p style={embeddedStyles.emptyStateText}>No active assignments</p>
                  {myUpcomingRounds.length === 0 ? (
                    <p style={embeddedStyles.emptyStateSubtext}>
                      Sign up for rounds to access orders
                    </p>
                  ) : (
                    <button 
                      onClick={() => navigate("/volunteer/orders")}
                      style={{
                        marginTop: '12px',
                        padding: '10px 20px',
                        backgroundColor: '#ff6b00',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '14px'
                      }}
                    >
                      Go to Order Queue →
                    </button>
                  )}
                </div>
              ) : (
                activeAssignments.map((assignment) => renderOrderCard(assignment, false))
              )}
            </div>
          </div>

          {/* My Upcoming Rounds */}
          <h2><strong>My Upcoming Rounds</strong></h2>
          {myRoundsError && <p className="error-text">{myRoundsError}</p>}
          <div style={embeddedStyles.roundsCardsContainer}>
            {myUpcomingRounds.length === 0 ? (
              <p style={{ color: '#aaa', padding: '20px', textAlign: 'center', width: '100%' }}>
                No upcoming rounds yet. Check the calendar to sign up!
              </p>
            ) : (
              myUpcomingRounds.map((r) => renderRoundCard(r))
            )}
          </div>

          {/* My Past Rounds */}
          <h2 onClick={() => setShowPastRounds(!showPastRounds)} style={{ cursor: "pointer" }}>
            <strong>My Past Rounds</strong>
            {showPastRounds ? " ▲ Hide all" : " ▼ View all"}
          </h2>
          {showPastRounds && (
            <div style={embeddedStyles.roundsCardsContainer}>
              {myPastRounds.length === 0 ? (
                <p style={{ color: '#aaa', padding: '20px', textAlign: 'center', width: '100%' }}>
                  No past rounds available.
                </p>
              ) : (
                myPastRounds.map((r) => renderPastRoundCard(r))
              )}
            </div>
          )}

          {/* Completed Orders */}
          <h2 onClick={() => setShowCompletedOrders(!showCompletedOrders)} style={{ cursor: "pointer" }}>
            <strong>Completed Orders</strong>
            {showCompletedOrders ? " ▲ Hide all" : " ▼ View all"}
            <span style={{ fontSize: '14px', color: '#ccc', marginLeft: '10px' }}>
              ({completedAssignments.length} total)
            </span>
          </h2>
          {showCompletedOrders && (
            <div style={embeddedStyles.roundsCardsContainer}>
              {completedAssignments.length === 0 ? (
                <p style={{ color: '#aaa', padding: '20px', textAlign: 'center', width: '100%' }}>
                  No completed orders yet.
                </p>
              ) : (
                completedAssignments.map((a) => renderOrderCard(a, true))
              )}
            </div>
          )}
        </div>

        {/* Vertical Divider */}
        <div className="vertical-line"></div>

        {/* Right Panel - Calendar */}
        <div className="volunteer-right-panel">
          <br /><br /><br />
          <h2><strong>Select a date to see rounds</strong></h2>
          <br /><br />
          {allRoundsError && <p className="error-text">{allRoundsError}</p>}
          <Calendar onClickDay={handleDateClick} tileClassName={highlightDates} />
          
          {/* Rounds Modal for Selected Date */}
          {showRoundsModal && (
            <div className="rounds-modal">
              <div className="rounds-modal-content">
                <h3>Rounds on {selectedDate.toDateString()}</h3>
                {roundsForSelectedDate.length === 0 && <p>No rounds scheduled for this date.</p>}
                {roundsForSelectedDate.map((r) => (
                  <div key={r.roundId} className="round-detail">
                    <h4>{r.title}</h4>
                    <p>{r.description}</p>
                    <p><strong>Location:</strong> {r.location}</p>
                    <p><strong>Start:</strong> {new Date(r.startTime).toLocaleString()}</p>
                    <p><strong>End:</strong> {new Date(r.endTime).toLocaleString()}</p>
                    <p><strong>Available Slots:</strong> {r.availableSlots}</p>
                    <p><strong>Order Capacity:</strong> {r.currentOrderCount || 0}/{r.orderCapacity || 20}</p>
                    <p><strong>Already Signed Up?</strong> {r.userSignedUp ? "Yes" : "No"}</p>
                    {r.userSignedUp ? (
                      <p style={{ color: "green" }}>You are already signed up.</p>
                    ) : r.openForSignup ? (
                      <button onClick={() => signupForRound(r.roundId, "VOLUNTEER")}>Sign Up</button>
                    ) : (
                      <p style={{ color: "red" }}>No slots available.</p>
                    )}
                  </div>
                ))}
                <button className="close-modal-btn" onClick={() => setShowRoundsModal(false)}>
                  Close
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Full View Modal for Round Details */}
        {fullViewModalOpen && selectedRoundDetails && (
          <div className="fullview-modal" onClick={closeFullViewModal}>
            <div className="fullview-modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>{selectedRoundDetails.title}</h2>
              <hr style={{ border: 'none', borderTop: '1px solid #ddd', margin: '15px 0' }} />
              <p><strong>Description:</strong> {selectedRoundDetails.description}</p>
              <p><strong>Location:</strong> {selectedRoundDetails.location}</p>
              <p><strong>Start:</strong> {new Date(selectedRoundDetails.startTime).toLocaleString()}</p>
              <p><strong>End:</strong> {new Date(selectedRoundDetails.endTime).toLocaleString()}</p>
              <p><strong>Available Slots:</strong> {selectedRoundDetails.availableSlots}</p>
              <p><strong>Order Capacity:</strong> {selectedRoundDetails.currentOrderCount || 0}/{selectedRoundDetails.orderCapacity || 20}</p>
              <p><strong>Already Signed Up?</strong> {selectedRoundDetails.userSignedUp ? "Yes" : "No"}</p>
              
              {selectedRoundDetails.userSignedUp &&
                (selectedRoundDetails.signupDetails || selectedRoundDetails.signupId) && (
                  <button className="cancel-signup-btn" onClick={handleCancelSignupFullView}>
                    Cancel Signup
                  </button>
                )}
              <button className="close-modal-btn" onClick={closeFullViewModal}>
                Close
              </button>
            </div>
          </div>
        )}

        {/* Full View Modal for Order Details */}
        {orderModalOpen && selectedOrder && (
          <div className="fullview-modal" onClick={closeOrderFullView}>
            <div className="fullview-modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>Order Full Details</h2>
              <hr style={{ border: 'none', borderTop: '1px solid #ddd', margin: '15px 0' }} />
              <p><strong>Order ID:</strong> {selectedOrder.orderId}</p>
              <p><strong>Status:</strong> {selectedOrder.status}</p>
              {selectedOrder.roundId && <p><strong>Round ID:</strong> {selectedOrder.roundId}</p>}
              <p><strong>Delivery Address:</strong> {selectedOrder.deliveryAddress}</p>
              <p><strong>Phone Number:</strong> {selectedOrder.phoneNumber}</p>
              <p><strong>Notes:</strong> {selectedOrder.notes || 'None'}</p>
              <p><strong>Order Time:</strong> {selectedOrder.requestTime ? new Date(selectedOrder.requestTime).toLocaleString() : "N/A"}</p>
              {selectedOrder.items && selectedOrder.items.length > 0 && (
                <div style={{ marginTop: '15px' }}>
                  <h4 style={{ marginBottom: '10px' }}>Items:</h4>
                  {selectedOrder.items.map((itm, idx) => (
                    <p key={idx} style={{ marginLeft: '10px' }}>
                      • {itm.itemName} - Quantity: {itm.quantity}
                      {itm.size && ` (Size: ${itm.size})`}
                      {itm.isCustom && ' [CUSTOM]'}
                    </p>
                  ))}
                </div>
              )}
              <button className="close-modal-btn" onClick={closeOrderFullView}>
                Close
              </button>
            </div>
          </div>
        )}

        {/* Log Interaction Button - Bottom Right */}
        <button
          style={{
            position: 'fixed',
            bottom: '30px',
            right: '30px',
            backgroundColor: '#003e7e',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            padding: '12px 24px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            fontFamily: "'Courier New', Courier, monospace",
            transition: 'background-color 0.2s ease',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
            zIndex: '1000'
          }}
          onClick={handleLogInteraction}
          onMouseOver={(e) => e.target.style.backgroundColor = '#002d5f'}
          onMouseOut={(e) => e.target.style.backgroundColor = '#003e7e'}
        >
          📍 Log Interaction
        </button>
      </div>
    </>
  );
};

export default Volunteer_Dashboard;