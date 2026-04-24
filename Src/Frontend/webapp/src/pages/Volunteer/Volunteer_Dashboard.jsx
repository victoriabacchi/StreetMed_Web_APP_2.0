import React, { useState, useEffect, useCallback } from "react";
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

  // Compact available round card
  compactRoundCard: {
    backgroundColor: '#1a2844',
    borderRadius: '10px',
    padding: '14px',
    width: '100%',
    minHeight: '100px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
    color: '#ffffff',
    fontFamily: "'Courier New', Courier, monospace",
    border: '1px solid rgba(255, 255, 255, 0.1)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    textAlign: 'left',
    cursor: 'pointer',
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
    gap: '12px',
    backgroundColor: '#1a2332',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
    padding: '16px',
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

  availableRoundsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    backgroundColor: '#1a2332',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
    padding: '16px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    marginBottom: '20px',
  },
};

const Volunteer_Dashboard = ({ userData, onLogout }) => {
  const navigate = useNavigate();

  // Local storage key scoped per user
  const hiddenRoundsStorageKey = userData?.userId
    ? `hiddenAvailableRoundIds_${userData.userId}`
    : "hiddenAvailableRoundIds";

  // Rounds states
  const [hiddenAvailableRoundIds, setHiddenAvailableRoundIds] = useState(() => {
    try {
      const saved = localStorage.getItem("hiddenAvailableRoundIds");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [myUpcomingRounds, setMyUpcomingRounds] = useState([]);
  const [myPastRounds, setMyPastRounds] = useState([]);
  const [myRoundsError, setMyRoundsError] = useState("");
  const [allUpcomingRounds, setAllUpcomingRounds] = useState([]);
  const [allRoundsError, setAllRoundsError] = useState("");
  const [fullViewModalOpen, setFullViewModalOpen] = useState(false);
  const [selectedRoundDetails, setSelectedRoundDetails] = useState(null);
  const [, setRoundOrders] = useState([]);

  // Orders states
  const [myAssignments, setMyAssignments] = useState([]);
  const [ordersError, setOrdersError] = useState("");
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  // Order modal
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Section toggles
  const [showPastRounds, setShowPastRounds] = useState(false);
  const [showCompletedOrders, setShowCompletedOrders] = useState(false);

  // Special Order Request states
  const [specialName, setSpecialName] = useState("");
  const [specialItems, setSpecialItems] = useState("");
  const [specialDetails, setSpecialDetails] = useState("");
  const [isSubmittingSpecialOrder, setIsSubmittingSpecialOrder] = useState(false);

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
      await loadMyRounds();
      await loadAllUpcomingRounds();

      // Refresh modal details if currently open
      if (selectedRoundDetails?.roundId === roundId) {
        const refreshed = await publicAxios.get(`/api/rounds/${roundId}`, {
          params: { authenticated: true, userId: userData.userId, userRole: "VOLUNTEER" }
        });
        if (refreshed.data.status === "success") {
          setSelectedRoundDetails(refreshed.data.round);
        }
      }
    } catch (e) {
      alert(e.response?.data?.message || e.message);
    }
  };

  const openFullViewModal = async (roundId) => {
    try {
      const r = await publicAxios.get(`/api/rounds/${roundId}`, {
        params: { authenticated: true, userId: userData.userId, userRole: "VOLUNTEER" }
      });
  
      if (r.data.status === "success") {
        const round = r.data.round;
        setSelectedRoundDetails(round);
        setFullViewModalOpen(true);
  
        // Only try to load orders if user is already signed up
        if (round.userSignedUp) {
          try {
            const ordersRes = await publicAxios.get(`/api/rounds/${roundId}/orders`, {
              params: { authenticated: true, userId: userData.userId, userRole: "VOLUNTEER" }
            });
  
            if (ordersRes.data.status === "success") {
              setRoundOrders(ordersRes.data.orders || []);
            }
          } catch (ordersError) {
            console.error("Could not load round orders:", ordersError);
            setRoundOrders([]);
          }
        } else {
          setRoundOrders([]);
        }
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

  // Submit special order request
  const submitSpecialOrder = async () => {
    if (!specialName.trim() || !specialItems.trim()) {
      alert("Please fill in both Name and Items Needed fields.");
      return;
    }

    setIsSubmittingSpecialOrder(true);
    try {
      const payload = {
        authenticated: true,
        userId: userData.userId,
        deliveryAddress: "N/A",
        phoneNumber: "N/A",
        notes: `Requested for: ${specialName}\nDetails: ${specialDetails}`,
        items: [
          {
            itemName: specialItems,
            quantity: 1,
            size: null,
            isCustom: true
          }
        ]
      };

      const response = await secureAxios.post('/api/orders/create', payload);

      if (response.data.status === "success") {
        alert("Special order request submitted successfully!");
        setSpecialName("");
        setSpecialItems("");
        setSpecialDetails("");
      } else {
        alert(response.data.message || "Failed to submit special order request");
      }
    } catch (error) {
      console.error("Error submitting special order:", error);
      alert(error.response?.data?.message || "Failed to submit special order request");
    } finally {
      setIsSubmittingSpecialOrder(false);
    }
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

  useEffect(() => {
    try {
      const saved = localStorage.getItem(hiddenRoundsStorageKey);
      setHiddenAvailableRoundIds(saved ? JSON.parse(saved) : []);
    } catch {
      setHiddenAvailableRoundIds([]);
    }
  }, [hiddenRoundsStorageKey]);

  useEffect(() => {
    localStorage.setItem(
      hiddenRoundsStorageKey,
      JSON.stringify(hiddenAvailableRoundIds)
    );
  }, [hiddenAvailableRoundIds, hiddenRoundsStorageKey]);

  const activeAssignments = myAssignments.filter(
    a => a.status !== 'COMPLETED' && a.status !== 'CANCELLED'
  );
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

  // Helpers for showing rounds
  const getVolunteerCapacity = (round) =>
    round.maxVolunteers ?? round.volunteerCapacity ?? round.maxSignupCount ?? 0;

  const getCurrentVolunteerCount = (round) =>
    round.currentVolunteerCount ?? round.currentSignupCount ?? 0;

  const getWaitlistCapacity = (round) =>
    round.waitlistCapacity ?? 0;

  const getWaitlistCount = (round) =>
    round.currentWaitlistCount ?? 0;

  const isRoundOpenForSignup = (round) => {
    if (typeof round.openForSignup === "boolean") return round.openForSignup;
    const capacity = getVolunteerCapacity(round);
    const current = getCurrentVolunteerCount(round);
    return capacity > 0 && current < capacity;
  };

  const isRoundOpenForWaitlist = (round) => {
    const waitlistCapacity = getWaitlistCapacity(round);
    const waitlistCount = getWaitlistCount(round);
    return !isRoundOpenForSignup(round) && waitlistCapacity > waitlistCount;
  };

  const hideRoundFromDashboard = (roundId) => {
    setHiddenAvailableRoundIds((prev) => [...new Set([...prev, roundId])]);
  };

  const unhideAllRounds = () => {
    setHiddenAvailableRoundIds([]);
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

  const availableRounds = allUpcomingRounds
  .filter((r) => {
    const isCancelled = r.status === "CANCELLED" || r.status === "CANCELED";
    const isSignedUp = r.userSignedUp;
    const isHidden = hiddenAvailableRoundIds.includes(r.roundId);

    const showAsAvailable = isRoundOpenForSignup(r);

    return !isCancelled && !isSignedUp && !isHidden && showAsAvailable;
  })
  .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

  const renderAvailableRoundCard = (r) => {
    const openForSignup = isRoundOpenForSignup(r);
  
    return (
      <button
        key={r.roundId}
        type="button"
        onClick={() => openFullViewModal(r.roundId)}
        style={{
          ...embeddedStyles.compactRoundCard,
          position: 'relative' // needed for absolute positioning
        }}
      >
        <div>
          <h3
            style={{
              color: '#f6b800',
              fontSize: '15px',
              fontWeight: 'bold',
              margin: '0 0 8px 0'
            }}
          >
            {r.title}
          </h3>
  
          <p
            style={{
              color: '#cccccc',
              fontSize: '12px',
              margin: 0
            }}
          >
            {new Date(r.startTime).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric'
            })}{" "}
            •{" "}
            {new Date(r.startTime).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>
  
        {/* Status badge */}
        <span
          style={{
            fontSize: '11px',
            fontWeight: 'bold',
            padding: '4px 8px',
            borderRadius: '10px',
            backgroundColor: openForSignup ? '#27ae60' : '#999',
            color: openForSignup ? '#fff' : '#333',
            alignSelf: 'flex-start',
            marginTop: '10px'
          }}
        >
          {openForSignup ? 'OPEN' : 'FULL'}
        </span>
  
        {/* Bottom-right "View →" */}
        <span
          style={{
            position: 'absolute',
            bottom: '10px',
            right: '12px',
            fontSize: '12px',
            color: '#aaa'
          }}
        >
          View →
        </span>
      </button>
    );
  };

  // Render a single round card with embedded styles
  const renderRoundCard = (r) => (
    <div key={r.roundId} style={getRoundCardStyle(r.signupStatus)}>
      {r.signupStatus && (
        <span style={getStatusBadgeStyle(r.signupStatus)}>
          {r.signupStatus === 'CONFIRMED' ? '✓ ' : ''}{r.signupStatus}
        </span>
      )}

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

      <div style={embeddedStyles.ordersCount}>
        <span style={{ color: '#888' }}>Orders: </span>
        <span style={{ color: '#fff' }}>{r.currentOrderCount || 0} / {r.orderCapacity || 20}</span>
      </div>

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

          {/* Special Order Request */}
          <div style={{ marginBottom: '30px' }}>
            <h2><strong>🛒 Special Order Request</strong></h2>
            <div style={{
              backgroundColor: '#1a2332',
              borderRadius: '12px',
              padding: '20px',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div>
                  <label style={{
                    display: 'block',
                    color: '#f6b800',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    marginBottom: '5px'
                  }}>
                    Name*
                  </label>
                  <input
                    type="text"
                    value={specialName}
                    onChange={(e) => setSpecialName(e.target.value)}
                    placeholder="text"
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      backgroundColor: '#2a3441',
                      color: '#ffffff',
                      fontSize: '14px',
                      fontFamily: "'Courier New', Courier, monospace"
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    color: '#f6b800',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    marginBottom: '5px'
                  }}>
                    Items Needed*
                  </label>
                  <input
                    type="text"
                    value={specialItems}
                    onChange={(e) => setSpecialItems(e.target.value)}
                    placeholder="text"
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      backgroundColor: '#2a3441',
                      color: '#ffffff',
                      fontSize: '14px',
                      fontFamily: "'Courier New', Courier, monospace"
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    color: '#f6b800',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    marginBottom: '5px'
                  }}>
                    Details/Notes
                  </label>
                  <textarea
                    value={specialDetails}
                    onChange={(e) => setSpecialDetails(e.target.value)}
                    placeholder="text"
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      backgroundColor: '#2a3441',
                      color: '#ffffff',
                      fontSize: '14px',
                      fontFamily: "'Courier New', Courier, monospace",
                      resize: 'vertical'
                    }}
                  />
                </div>

                <button
                  onClick={submitSpecialOrder}
                  disabled={isSubmittingSpecialOrder}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: isSubmittingSpecialOrder ? '#555' : '#ff6b00',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: isSubmittingSpecialOrder ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    fontFamily: "'Courier New', Courier, monospace",
                    alignSelf: 'flex-start'
                  }}
                >
                  {isSubmittingSpecialOrder ? 'Submitting...' : 'Submit Special Order'}
                </button>
              </div>
            </div>
          </div>

          {/* My Upcoming Rounds */}
          <h2><strong>My Upcoming Rounds</strong></h2>
          {myRoundsError && <p className="error-text">{myRoundsError}</p>}
          <div style={embeddedStyles.roundsCardsContainer}>
            {myUpcomingRounds.length === 0 ? (
              <p style={{ color: '#aaa', padding: '20px', textAlign: 'center', width: '100%' }}>
                No upcoming rounds yet.
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

          <div className="volunteer-right-panel">
            <br />
            <br />

            {/* OUTER CONTAINER*/}
            <div style={{
              backgroundColor: '#1a2332',
              borderRadius: '16px',
              padding: '20px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.05)'
            }}>

              {/* HEADER BAR*/}
              <div style={{
                backgroundColor: '#0d3b73',
                borderRadius: '12px',
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '16px',
                position: 'relative'
              }}>
              
                <span style={{ marginLeft: '10px' }}>
                  <strong>Available Rounds</strong>
                </span>

                <span style={{ fontSize: '14px', color: '#ccc' }}>
                  ({availableRounds.length} available)
                </span>

                {hiddenAvailableRoundIds.length > 0 && (
                  <button
                    onClick={unhideAllRounds}
                    style={{
                      marginLeft: 'auto',
                      padding: '6px 12px',
                      fontSize: '12px',
                      backgroundColor: '#3498db',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    Show Hidden
                  </button>
                )}
              </div>

              {/* CONTENT AREA */}
              <div style={embeddedStyles.availableRoundsContainer}>
                {availableRounds.length === 0 ? (
                  <div style={embeddedStyles.emptyState}>
                    <p style={embeddedStyles.emptyStateText}>No open rounds right now</p>
                    <p style={embeddedStyles.emptyStateSubtext}>
                      Check back later for new round opportunities
                    </p>
                  </div>
                ) : (
                  availableRounds.map((r) => renderAvailableRoundCard(r))
                )}
              </div>

            </div>
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

              <p>
                <strong>Volunteers:</strong> {getCurrentVolunteerCount(selectedRoundDetails)} / {getVolunteerCapacity(selectedRoundDetails)}
              </p>

              {!isRoundOpenForSignup(selectedRoundDetails) && (
                <p>
                  <strong>Waitlist:</strong> {getWaitlistCount(selectedRoundDetails)} / {getWaitlistCapacity(selectedRoundDetails)}
                </p>
              )}

              <p><strong>Order Capacity:</strong> {selectedRoundDetails.currentOrderCount || 0}/{selectedRoundDetails.orderCapacity || 20}</p>
              <p><strong>Already Signed Up?</strong> {selectedRoundDetails.userSignedUp ? "Yes" : "No"}</p>

              {!selectedRoundDetails.userSignedUp && isRoundOpenForSignup(selectedRoundDetails) && (
                <button
                  className="close-modal-btn"
                  style={{ marginRight: '10px', backgroundColor: '#27ae60' }}
                  onClick={() => signupForRound(selectedRoundDetails.roundId, "VOLUNTEER")}
                >
                  Sign Up
                </button>
              )}

              {!selectedRoundDetails.userSignedUp &&
                !isRoundOpenForSignup(selectedRoundDetails) &&
                isRoundOpenForWaitlist(selectedRoundDetails) && (
                  <button
                    className="close-modal-btn"
                    style={{ marginRight: '10px', backgroundColor: '#f6b800', color: '#333' }}
                    onClick={() => signupForRound(selectedRoundDetails.roundId, "VOLUNTEER")}
                  >
                    Join Waitlist
                  </button>
              )}

              {!selectedRoundDetails.userSignedUp && (
                <button
                  className="close-modal-btn"
                  style={{ marginRight: '10px', backgroundColor: '#555' }}
                  onClick={() => {
                    hideRoundFromDashboard(selectedRoundDetails.roundId);
                    closeFullViewModal();
                  }}
                >
                  Hide
                </button>
              )}

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
          onClick={() => {
            navigator.geolocation.getCurrentPosition(async (position) => {
              await secureAxios.post("/api/interactions/log", {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
              });
            });
          }}
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