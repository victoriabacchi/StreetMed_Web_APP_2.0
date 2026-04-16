import React, { useState, useEffect, useCallback } from 'react';
import { secureAxios } from '../../config/axiosConfig';
import { useNavigate } from 'react-router-dom';
import '../../index.css'; 

function Round_Admin() {
  const navigate = useNavigate();
  const userData = JSON.parse(sessionStorage.getItem("auth_user")) || {};

  // Mobile detection state
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [activeTab, setActiveTab] = useState("viewRounds");
  const [rounds, setRounds] = useState([]);
  const [roundFilter, setRoundFilter] = useState("upcoming"); // Default to upcoming
  const [isLoading, setIsLoading] = useState(true); // Loading state
  const [newRound, setNewRound] = useState({
    title: "",
    description: "",
    startTime: "",
    endTime: "",
    location: "",
    maxParticipants: "",
    orderCapacity: "",
    teamLeadId: "",
    clinicianId: ""
  });
  const today = new Date().toISOString().slice(0, 16);
  const [message, setMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRound, setSelectedRound] = useState(null);
  const [modalTab, setModalTab] = useState("details");
  const [modalLotteryResult, setModalLotteryResult] = useState("");
  const [modalRoundDetails, setModalRoundDetails] = useState(null);
  const [roundOrders, setRoundOrders] = useState([]);
  const [editRoundData, setEditRoundData] = useState(null);
  const [editMessage, setEditMessage] = useState("");

  // Auto-dismiss success message after 30 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage("");
      }, 30000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Format datetime for input fields
  const formatDatetimeLocal = (dt) => {
    if (!dt) return "";
    return new Date(dt).toISOString().slice(0, 16);
  };

  // Format datetime for display (no seconds)
  const formatDisplayDateTime = (dt) => {
    if (!dt) return "N/A";
    const date = new Date(dt);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  // Fetch rounds function
  const fetchRounds = useCallback(async (filter) => {
    const filterToUse = filter || roundFilter;
    try {
      setIsLoading(true);
      const url = filterToUse === "all" ? `/api/admin/rounds/all` : `/api/admin/rounds/upcoming`;
      const response = await secureAxios.get(url, {
        params: {
          authenticated: true,
          adminUsername: userData.username
        }
      });
      if (response.data.status === "success") {
        setRounds(response.data.rounds || []);
        setMessage("");
      } else {
        setMessage(response.data.message || "Error fetching rounds");
      }
    } catch (error) {
      console.error(error);
      if (error.response?.data?.httpsRequired) {
        setMessage("Secure HTTPS connection required for admin operations.");
      } else {
        setMessage(error.response?.data?.message || error.message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [roundFilter, userData.username]);

  // Pre-load rounds on component mount
  useEffect(() => {
    fetchRounds("upcoming");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Create round
  const createRound = async () => {

    // Error messages for inputs
    if(newRound.maxParticipants < 5) {
      setMessage("Minimum participants must be at least 5.");
      return;
    }
    if(newRound.maxParticipants > 100) {
      setMessage("Maximum participants cannot exceed 100.");
      return;
    }
    if(newRound.orderCapacity > 100) {
      setMessage("Maximum orders cannot exceed 100.");
      return;
    }

    const start = new Date(newRound.startTime);
    const end = new Date(newRound.endTime);
    const now = new Date();
    if(start < now) {
      setMessage("Rounds cannot be scheduled in the past.");
      return;
    }
    if(start > end) {
      setMessage("End time must be after start time");
      return;
    }


    try {
      const payload = {
        authenticated: true,
        adminUsername: userData.username,
        title: newRound.title,
        description: newRound.description,
        startTime: newRound.startTime,
        endTime: newRound.endTime,
        location: newRound.location,
        maxParticipants: parseInt(newRound.maxParticipants, 10),
        orderCapacity: parseInt(newRound.orderCapacity, 10) || 20
      };
      if (!newRound.teamLeadId || newRound.teamLeadId.trim() !== "") {
        const tid = parseInt(newRound.teamLeadId, 10);
        if (!isNaN(tid)) payload.teamLeadId = tid;
      }
      if (!newRound.clinicianId || newRound.clinicianId.trim() !== "") {
        const cid = parseInt(newRound.clinicianId, 10);
        if (!isNaN(cid)) payload.clinicianId = cid;
      }

      const response = await secureAxios.post('/api/admin/rounds/create', payload);
      if (response.data.status === "success") {
        setSuccessMessage("Round created successfully! ID: " + response.data.roundId);
        setNewRound({
          title: "",
          description: "",
          startTime: "",
          endTime: "",
          location: "",
          maxParticipants: "",
          orderCapacity: "20",
          teamLeadId: "",
          clinicianId: ""
        });
        fetchRounds();
      } else {
        setMessage(response.data.message || "Error creating round");
      }
    } catch (error) {
      console.error(error);
      if (error.response?.data?.httpsRequired) {
        setMessage("Secure HTTPS connection required for admin operations.");
      } else {
        setMessage(error.response?.data?.message || error.message);
      }
    }
  };

  // Cancel round
  const cancelRoundById = async (roundId, e) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to cancel Round #${roundId}?`)) {
      return;
    }
    try {
      const response = await secureAxios.put(`/api/admin/rounds/${roundId}/cancel`, {
        authenticated: true,
        adminUsername: userData.username
      });
      if (response.data.status === "success") {
        setMessage("Round cancelled successfully!");
        fetchRounds();
      } else {
        setMessage(response.data.message || "Error cancelling round");
      }
    } catch (error) {
      console.error(error);
      if (error.response?.data?.httpsRequired) {
        setMessage("Secure HTTPS connection required for admin operations.");
      } else {
        setMessage(error.response?.data?.message || error.message);
      }
    }
  };

  // Fetch orders for a round
  const fetchRoundOrders = async (roundId) => {
    try {
      const response = await secureAxios.get(`/api/admin/rounds/${roundId}/order-status`, {
        params: {
          authenticated: true,
          adminUsername: userData.username
        }
      });
      if (response.data.status === "success") {
        setRoundOrders(response.data.orders || []);
      }
    } catch (error) {
      console.error(error);
      setRoundOrders([]);
    }
  };

  // Auto-assign orders
  const autoAssignOrders = async () => {
    try {
      const response = await secureAxios.post('/api/admin/rounds/auto-assign-orders', {
        authenticated: true,
        adminUsername: userData.username
      });
      if (response.data.status === "success") {
        setMessage(response.data.message);
        fetchRounds();
      } else {
        setMessage(response.data.message || "Error auto-assigning orders");
      }
    } catch (error) {
      console.error(error);
      setMessage(error.response?.data?.message || error.message);
    }
  };

  // Modal functions
  const openModal = (round) => {
    setSelectedRound(round);
    setModalOpen(true);
    setModalTab("details");
    setModalLotteryResult("");
    setModalRoundDetails(null);
    setRoundOrders([]);
    setEditRoundData(null);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedRound(null);
    setModalTab("details");
    setEditRoundData(null);
  };

  // Switch to edit mode
  const startEditMode = () => {
    setEditRoundData({
      roundId: selectedRound.roundId,
      title: selectedRound.title || "",
      description: selectedRound.description || "",
      startTime: formatDatetimeLocal(selectedRound.startTime),
      endTime: formatDatetimeLocal(selectedRound.endTime),
      location: selectedRound.location || "",
      maxParticipants: selectedRound.maxParticipants || "",
      orderCapacity: selectedRound.orderCapacity || 20,
      status: selectedRound.status || ""
    });
    setModalTab("edit");
  };

  // Update round
  const updateRoundFromModal = async () => {
    setEditMessage("");
    if(editRoundData.maxParticipants < 5) {
      setEditMessage("Minimum participants must be at least 5.");
      return;
    }
    if(editRoundData.maxParticipants > 100) {
      setEditMessage("Maximum participants cannot exceed 100.");
      return;
    }

    if(editRoundData.orderCapacity > 100) {
      setEditMessage("Maximum orders cannot exceed 100.");
      return;
    }
    const start = new Date(editRoundData.startTime);
    const end = new Date(editRoundData.endTime);
    const now = new Date();
    if(start < now) {
      setEditMessage("Rounds cannot be scheduled in the past.");
      return;
    }
    if(start > end) {
      setEditMessage("End time must be after start time");
      return;
    }

    try {
      const payload = {
        authenticated: true,
        adminUsername: userData.username,
        title: editRoundData.title,
        description: editRoundData.description,
        startTime: editRoundData.startTime,
        endTime: editRoundData.endTime,
        location: editRoundData.location,
        maxParticipants: parseInt(editRoundData.maxParticipants, 10),
        orderCapacity: parseInt(editRoundData.orderCapacity, 10) || 20,
        status: editRoundData.status
      };
      const response = await secureAxios.put(`/api/admin/rounds/${editRoundData.roundId}`, payload);
      if (response.data.status === "success") {
        setMessage("Round updated successfully!");
        setSelectedRound({
          ...selectedRound,
          ...editRoundData,
          startTime: editRoundData.startTime,
          endTime: editRoundData.endTime
        });
        setModalTab("details");
        setEditRoundData(null);
        fetchRounds();
      } else {
        setMessage(response.data.message || "Error updating round");
      }
    } catch (error) {
      console.error(error);
      if (error.response?.data?.httpsRequired) {
        setMessage("Secure HTTPS connection required for admin operations.");
      } else {
        setMessage(error.response?.data?.message || error.message);
      }
    }
  };

  // Run lottery
  const runLotteryForModal = async () => {
    try {
      const response = await secureAxios.post(`/api/admin/rounds/${selectedRound.roundId}/lottery`, {
        authenticated: true,
        adminUsername: userData.username
      });
      if (response.data.status === "success") {
        setModalLotteryResult("Lottery completed! Selected: " + response.data.selectedVolunteers);
      } else {
        setModalLotteryResult(response.data.message || "Error running lottery");
      }
    } catch (error) {
      console.error(error);
      setModalLotteryResult(error.response?.data?.message || error.message);
    }
  };

  // Fetch signups
  const fetchModalSignups = async () => {
    try {
      const response = await secureAxios.get(`/api/admin/rounds/${selectedRound.roundId}`, {
        params: {
          authenticated: true,
          adminUsername: userData.username
        }
      });
      if (response.data.status === "success") {
        setModalRoundDetails(response.data);
      }
    } catch (error) {
      console.error(error);
      setMessage(error.response?.data?.message || error.message);
    }
  };

  // Confirm/Reject signups
  const confirmSignup = async (signupId) => {
    try {
      const response = await secureAxios.put(`/api/admin/rounds/signup/${signupId}/confirm`, {
        authenticated: true,
        adminUsername: userData.username,
        adminId: userData.userId
      });
      if (response.data.status === "success") {
        setMessage("Signup confirmed!");
        fetchModalSignups();
      } else {
        setMessage(response.data.message || "Error confirming signup");
      }
    } catch (error) {
      console.error(error);
      setMessage(error.response?.data?.message || error.message);
    }
  };

  const rejectSignup = async (signupId) => {
    try {
      const response = await secureAxios.delete(`/api/admin/rounds/signup/${signupId}`, {
        data: {
          authenticated: true,
          adminUsername: userData.username,
          adminId: userData.userId
        }
      });
      if (response.data.status === "success") {
        setMessage("Signup rejected!");
        fetchModalSignups();
      } else {
        setMessage(response.data.message || "Error rejecting signup");
      }
    } catch (error) {
      console.error(error);
      setMessage(error.response?.data?.message || error.message);
    }
  };

  // Handle filter change
  const handleFilterChange = (filter) => {
    setRoundFilter(filter);
    fetchRounds(filter);
  };

  return (
    <div className="rounds-container">
      {/* NAVBAR - Zero CSS classes, pure inline */}
      <div style={{
        display: isMobile ? 'block' : 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#f6b800',
        padding: '12px 20px',
        margin: '16px',
        borderRadius: '12px'
      }}>
        <div style={{
          textAlign: isMobile ? 'center' : 'left',
          marginBottom: isMobile ? '10px' : '0'
        }}>
          <img src="/Untitled.png" alt="SMG logo" style={{ width: '45px', height: '45px', objectFit: 'contain' }} />
        </div>

        <div style={{
          display: isMobile ? 'block' : 'flex',
          flexDirection: 'row',
          gap: '8px'
        }}>
          <button
            onClick={() => {
              setActiveTab("viewRounds");
              fetchRounds();
            }}
            style={{
              display: 'block',
              width: isMobile ? '100%' : 'auto',
              textAlign: 'center',
              padding: '12px 16px',
              marginBottom: isMobile ? '8px' : '0',
              borderRadius: '8px',
              border: 'none',
              fontSize: '14px',
              fontWeight: '700',
              fontFamily: 'Courier New, monospace',
              cursor: 'pointer',
              backgroundColor: activeTab === "viewRounds" ? '#003295' : 'transparent',
              color: activeTab === "viewRounds" ? '#ffffff' : '#003295'
            }}
          >
            View Rounds
          </button>
          <button
            onClick={() => setActiveTab("createRound")}
            style={{
              display: 'block',
              width: isMobile ? '100%' : 'auto',
              textAlign: 'center',
              padding: '12px 16px',
              marginBottom: isMobile ? '8px' : '0',
              borderRadius: '8px',
              border: 'none',
              fontSize: '14px',
              fontWeight: '700',
              fontFamily: 'Courier New, monospace',
              cursor: 'pointer',
              backgroundColor: activeTab === "createRound" ? '#003295' : 'transparent',
              color: activeTab === "createRound" ? '#ffffff' : '#003295'
            }}
          >
            Create Round
          </button>
          <button 
            onClick={autoAssignOrders}
            style={{
              display: 'block',
              width: isMobile ? '100%' : 'auto',
              textAlign: 'center',
              padding: '12px 16px',
              marginBottom: isMobile ? '8px' : '0',
              borderRadius: '8px',
              border: 'none',
              fontSize: '14px',
              fontWeight: '700',
              fontFamily: 'Courier New, monospace',
              cursor: 'pointer',
              backgroundColor: 'transparent',
              color: '#003295'
            }}
          >
            Auto-Assign Orders
          </button>
        </div>

        <div style={{ marginTop: isMobile ? '8px' : '0' }}>
          <button 
            onClick={() => navigate("/")}
            style={{
              display: 'block',
              width: isMobile ? '100%' : 'auto',
              textAlign: 'center',
              padding: '12px 16px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '14px',
              fontWeight: '700',
              fontFamily: 'Courier New, monospace',
              cursor: 'pointer',
              backgroundColor: 'rgba(0, 50, 149, 0.1)',
              color: '#003295'
            }}
          >
            ← Dashboard
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="success-banner">
          <strong>✓ {successMessage}</strong>
        </div>
      )}

      <h1 className="rounds-title">Rounds Administration</h1>

      {message && <p className="status-msg">{message}</p>}

      {/* MAIN CONTENT */}
      <div className="rounds-section">
        {activeTab === "viewRounds" && (
          <>
            <div className="section-header">
              <h2>View Rounds</h2>
              <div className="header-actions">
                <div className="btn-group">
                  <button
                    className={`chip ${roundFilter === "upcoming" ? "selected" : ""}`}
                    onClick={() => handleFilterChange("upcoming")}
                  >
                    Upcoming
                  </button>
                  <button
                    className={`chip ${roundFilter === "all" ? "selected" : ""}`}
                    onClick={() => handleFilterChange("all")}
                  >
                    All
                  </button>
                </div>
                <button 
                  className="refresh-btn"
                  onClick={() => fetchRounds()}
                  disabled={isLoading}
                >
                  {isLoading ? 'Loading...' : 'Refresh'}
                </button>
              </div>
            </div>

            <div className="table-wrapper">
              {isLoading ? (
                <div className="loading-container">Loading rounds...</div>
              ) : rounds.length === 0 ? (
                <div className="empty-state">
                  No {roundFilter === "upcoming" ? "upcoming" : ""} rounds found.
                </div>
              ) : (
                <table className="table rounds-table">
                  <thead>
                    <tr>
                      <th className="table-header-cell">ID</th>
                      <th className="table-header-cell">Title</th>
                      <th className="table-header-cell">Start Time</th>
                      <th className="table-header-cell">Location</th>
                      <th className="table-header-cell">Participants</th>
                      <th className="table-header-cell">Orders</th>
                      <th className="table-header-cell">Status</th>
                      <th className="table-header-cell">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rounds.map((round) => (
                      <tr 
                        key={round.roundId} 
                        onClick={() => openModal(round)}
                        className="rounds-table-row"
                      >
                        <td className="table-cell">{round.roundId}</td>
                        <td className="table-cell">{round.title || 'Untitled'}</td>
                        <td className="table-cell">{formatDisplayDateTime(round.startTime)}</td>
                        <td className="table-cell">{round.location || 'N/A'}</td>
                        <td className="table-cell">
                          <span className="capacity-badge">
                            {round.currentParticipants || 0}/{round.maxParticipants || 0}
                          </span>
                        </td>
                        <td className="table-cell">
                          <span className="capacity-badge orders">
                            {round.currentOrderCount || 0}/{round.orderCapacity || 20}
                          </span>
                        </td>
                        <td className="table-cell">
                          <span className={`status-badge-round status-${round.status?.toLowerCase().replace('_', '-')}`}>
                            {round.status?.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="table-cell">
                          {round.status !== 'CANCELLED' && round.status !== 'COMPLETED' && (
                            <button
                              className="action-btn cancel"
                              onClick={(e) => cancelRoundById(round.roundId, e)}
                            >
                              Cancel
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* CREATE ROUND TAB */}
        {activeTab === "createRound" && (
          <>
            <h2 className="form-title">Create New Round</h2>
            <div className="form-wrapper">
              <div className="form-card">
                <div className="form-group">
                  <label>Title *</label>
                  <input
                    className="input"
                    type="text"
                    placeholder="Enter round title"
                    value={newRound.title}
                    onChange={(e) => setNewRound({ ...newRound, title: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <input
                    className="input"
                    type="text"
                    placeholder="Enter description"
                    value={newRound.description}
                    onChange={(e) => setNewRound({ ...newRound, description: e.target.value })}
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Start Time *</label>
                    <input
                      className="input"
                      type="datetime-local"
                      value={newRound.startTime}
                      min = {today}
                      onChange={(e) => setNewRound({ ...newRound, startTime: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>End Time *</label>
                    <input
                      className="input"
                      type="datetime-local"
                      value={newRound.endTime}
                      min = {today}
                      onChange={(e) => setNewRound({ ...newRound, endTime: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Location *</label>
                  <input
                    className="input"
                    type="text"
                    placeholder="Enter location"
                    value={newRound.location}
                    onChange={(e) => setNewRound({ ...newRound, location: e.target.value })}
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Max Participants *</label>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      max="100"
                      placeholder="e.g., 10"
                      value={newRound.maxParticipants || ""}
                      onChange={(e) => {
                        setNewRound({ ...newRound, maxParticipants: e.target.value });
                      }}
                      onKeyDown={(e) => {
                        if (e.key === '-' || e.key === 'e') e.preventDefault();
                      }}
                    />
                  </div>
                  <div className="form-group">
                    <label>Order Capacity</label>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      max="100"
                      placeholder="Default: 20"
                      value={newRound.orderCapacity || ""}
                      onChange={(e) => {
                        setNewRound({ ...newRound, orderCapacity: e.target.value });
                      }}
                      onKeyDown={(e) => {
                        if(e.key === '-' || e.key === 'e') e.preventDefault();
                      }}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Team Lead ID (optional)</label>
                    <input
                      className="input"
                      type="text"
                      placeholder="User ID"
                      value={newRound.teamLeadId}
                      onChange={(e) => setNewRound({ ...newRound, teamLeadId: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Clinician ID (optional)</label>
                    <input
                      className="input"
                      type="text"
                      placeholder="User ID"
                      value={newRound.clinicianId}
                      onChange={(e) => setNewRound({ ...newRound, clinicianId: e.target.value })}
                    />
                  </div>
                </div>
                <button className="action-btn submit" onClick={createRound}>
                  Create Round
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* MODAL */}
      {modalOpen && selectedRound && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Round #{selectedRound.roundId}: {selectedRound.title}</h2>
              <button className="modal-close-btn" onClick={closeModal}>×</button>
            </div>

            <div className="modal-tabs">
              <button
                className={`modal-tab ${modalTab === "details" ? "active" : ""}`}
                onClick={() => setModalTab("details")}
              >
                Details
              </button>
              <button
                className={`modal-tab ${modalTab === "edit" ? "active" : ""}`}
                onClick={startEditMode}
              >
                Edit
              </button>
              <button
                className={`modal-tab ${modalTab === "signups" ? "active" : ""}`}
                onClick={() => {
                  setModalTab("signups");
                  fetchModalSignups();
                }}
              >
                Sign-ups
              </button>
              <button
                className={`modal-tab ${modalTab === "orders" ? "active" : ""}`}
                onClick={() => {
                  setModalTab("orders");
                  fetchRoundOrders(selectedRound.roundId);
                }}
              >
                Orders
              </button>
              <button
                className={`modal-tab ${modalTab === "lottery" ? "active" : ""}`}
                onClick={() => setModalTab("lottery")}
              >
                Lottery
              </button>
            </div>

            <div className="modal-body">
              {/* EDIT MESSAGE */}
              {editMessage && (
                <p className="error-text">{editMessage}</p>
              )}
              {/* DETAILS TAB */}
              {modalTab === "details" && (
                <div className="details-grid">
                  <div className="detail-item">
                    <span className="detail-label">Round ID</span>
                    <span className="detail-value">{selectedRound.roundId}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Status</span>
                    <span className={`status-badge-round status-${selectedRound.status?.toLowerCase().replace('_', '-')}`}>
                      {selectedRound.status?.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="detail-item full-width">
                    <span className="detail-label">Description</span>
                    <span className="detail-value">{selectedRound.description || "No description"}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Start Time</span>
                    <span className="detail-value">{formatDisplayDateTime(selectedRound.startTime)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">End Time</span>
                    <span className="detail-value">{formatDisplayDateTime(selectedRound.endTime)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Location</span>
                    <span className="detail-value">{selectedRound.location || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Max Participants</span>
                    <span className="detail-value">{selectedRound.maxParticipants || 0}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Order Capacity</span>
                    <span className="detail-value">
                      {selectedRound.currentOrderCount || 0} / {selectedRound.orderCapacity || 20}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Available Slots</span>
                    <span className="detail-value">
                      {(selectedRound.orderCapacity || 20) - (selectedRound.currentOrderCount || 0)}
                    </span>
                  </div>
                  <div className="detail-actions">
                    <button className="action-btn edit" onClick={startEditMode}>
                      ✏️ Edit Round
                    </button>
                  </div>
                </div>
              )}
              
              {/* EDIT TAB */}
              {modalTab === "edit" && editRoundData && (
                <div className="edit-form">
                  <div className="form-group">
                    <label>Title</label>
                    <input
                      className="input"
                      type="text"
                      value={editRoundData.title}
                      onChange={(e) => setEditRoundData({ ...editRoundData, title: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Description</label>
                    <input
                      className="input"
                      type="text"
                      value={editRoundData.description}
                      onChange={(e) => setEditRoundData({ ...editRoundData, description: e.target.value })}
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Start Time</label>
                      <input
                        className="input"
                        type="datetime-local"
                        value={editRoundData.startTime}
                        min = {today}
                        onChange={(e) => setEditRoundData({ ...editRoundData, startTime: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>End Time</label>
                      <input
                        className="input"
                        type="datetime-local"
                        value={editRoundData.endTime}
                        min = {today}
                        onChange={(e) => setEditRoundData({ ...editRoundData, endTime: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Location</label>
                    <input
                      className="input"
                      type="text"
                      value={editRoundData.location}
                      onChange={(e) => setEditRoundData({ ...editRoundData, location: e.target.value })}
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Max Participants</label>
                      <input
                        className="input"
                        type="number"
                        min="0"
                        max="100"
                        value={editRoundData.maxParticipants || ""}
                        onChange={(e) => {
                          setEditRoundData({ ...editRoundData, maxParticipants: e.target.value });
                          setEditMessage("");
                        }}
                        onKeyDown={(e) => {
                          if(e.key === '-' || e.key === 'e') e.preventDefault();
                        }}
                      />
                    </div>
                    <div className="form-group">
                      <label>Order Capacity</label>
                      <input
                        className="input"
                        type="number"
                        min="0"
                        max="100"
                        value={editRoundData.orderCapacity || ""}
                        onChange={(e) => {
                          setEditRoundData({ ...editRoundData, orderCapacity: e.target.value });
                          setEditMessage("");
                        }}
                        onKeyDown={(e) => {
                          if(e.key === '-' || e.key === 'e') e.preventDefault();
                        }}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select
                      className="input"
                      value={editRoundData.status}
                      onChange={(e) => setEditRoundData({ ...editRoundData, status: e.target.value })}
                    >
                      <option value="SCHEDULED">SCHEDULED</option>
                      <option value="IN_PROGRESS">IN PROGRESS</option>
                      <option value="COMPLETED">COMPLETED</option>
                      <option value="CANCELLED">CANCELLED</option>
                    </select>
                  </div>
                  <div className="form-actions">
                    <button className="action-btn cancel" onClick={() => setModalTab("details")}>
                      Cancel
                    </button>
                    <button className="action-btn submit" onClick={updateRoundFromModal}>
                      Save Changes
                    </button>
                  </div>
                </div>
              )}

              {/* LOTTERY TAB */}
              {modalTab === "lottery" && (
                <div className="lottery-section">
                  <p>Run the lottery to randomly select volunteers for this round.</p>
                  <button className="action-btn submit" onClick={runLotteryForModal}>
                    🎲 Run Lottery
                  </button>
                  {modalLotteryResult && <p className="lottery-result">{modalLotteryResult}</p>}
                </div>
              )}

              {/* SIGN-UPS TAB */}
              {modalTab === "signups" && (
                <div className="signups-section">
                  {modalRoundDetails?.signups?.length > 0 ? (
                    <div className="table-wrapper">
                      <table className="table">
                        <thead>
                          <tr>
                            <th className="table-header-cell">ID</th>
                            <th className="table-header-cell">Volunteer</th>
                            <th className="table-header-cell">Status</th>
                            <th className="table-header-cell">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {modalRoundDetails.signups.map((signup) => (
                            <tr key={signup.signupId}>
                              <td className="table-cell">{signup.signupId}</td>
                              <td className="table-cell">
                                {signup.firstName
                                  ? `${signup.firstName} ${signup.lastName || ""}`
                                  : signup.username || "N/A"}
                              </td>
                              <td className="table-cell">
                                <span className={`signup-status ${signup.status?.toLowerCase()}`}>
                                  {signup.status}
                                </span>
                              </td>
                              <td className="table-cell">
                                <button
                                  className="action-btn small confirm"
                                  onClick={() => confirmSignup(signup.signupId)}
                                >
                                  ✓
                                </button>
                                <button
                                  className="action-btn small cancel"
                                  onClick={() => rejectSignup(signup.signupId)}
                                >
                                  ✕
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="empty-state">No sign-ups yet.</p>
                  )}
                </div>
              )}

              {/* ORDERS TAB */}
              {modalTab === "orders" && (
                <div className="orders-section">
                  <p className="order-summary">
                    <strong>Orders:</strong> {roundOrders.length} / {selectedRound.orderCapacity || 20}
                  </p>
                  {roundOrders?.length > 0 ? (
                    <div className="table-wrapper">
                      <table className="table">
                        <thead>
                          <tr>
                            <th className="table-header-cell">Order ID</th>
                            <th className="table-header-cell">User</th>
                            <th className="table-header-cell">Status</th>
                            <th className="table-header-cell">Address</th>
                          </tr>
                        </thead>
                        <tbody>
                          {roundOrders.map((order) => (
                            <tr key={order.orderId}>
                              <td className="table-cell">{order.orderId}</td>
                              <td className="table-cell">
                                {order.userId === -1 ? "Guest" : `User #${order.userId}`}
                              </td>
                              <td className="table-cell">
                                <span className={`status-badge-round status-${order.status?.toLowerCase()}`}>
                                  {order.status}
                                </span>
                              </td>
                              <td className="table-cell">{order.deliveryAddress || 'N/A'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="empty-state">No orders assigned to this round yet.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* INLINE STYLES */}
      <style>{`
        /* Stats Bar */
        .rounds-stats-bar {
          display: flex;
          gap: 15px;
          margin: 0 16px 20px;
          padding: 15px 20px;
          background-color: #1a2332;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.08);
        }

        .rounds-stat-item {
          flex: 1;
          text-align: center;
        }

        .rounds-stat-value {
          font-size: 24px;
          font-weight: 700;
          color: #ffffff;
        }

        .rounds-stat-value.scheduled { color: #3b82f6; }
        .rounds-stat-value.in-progress { color: #f59e0b; }
        .rounds-stat-value.completed { color: #10b981; }
        .rounds-stat-value.cancelled { color: #ef4444; }

        .rounds-stat-label {
          font-size: 12px;
          color: #aaaaaa;
          margin-top: 4px;
        }

        /* Header Actions */
        .header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .refresh-btn {
          background-color: #2196f3;
          color: #fff;
          border: none;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .refresh-btn:hover {
          background-color: #1976d2;
        }

        .refresh-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Table Rows */
        .rounds-table-row {
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .rounds-table-row:hover {
          background-color: rgba(255,255,255,0.05) !important;
        }

        /* Capacity Badge */
        .capacity-badge {
          display: inline-block;
          padding: 4px 10px;
          background-color: rgba(59, 130, 246, 0.2);
          color: #60a5fa;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }

        .capacity-badge.orders {
          background-color: rgba(245, 158, 11, 0.2);
          color: #fbbf24;
        }

        /* Status Badge - Rounds */
        .status-badge-round {
          display: inline-block;
          padding: 5px 12px;
          border-radius: 20px;
          font-weight: 600;
          font-size: 11px;
          text-transform: uppercase;
          text-align: center;
          min-width: 80px;
        }

        .status-badge-round.status-scheduled {
          background-color: #3b82f6;
          color: #ffffff;
        }

        .status-badge-round.status-in-progress {
          background-color: #f59e0b;
          color: #333333;
        }

        .status-badge-round.status-completed {
          background-color: #10b981;
          color: #ffffff;
        }

        .status-badge-round.status-cancelled {
          background-color: #ef4444;
          color: #ffffff;
        }

        .status-badge-round.status-pending {
          background-color: rgba(245, 189, 70, 0.9);
          color: #333333;
        }

        .status-badge-round.status-processing {
          background-color: rgba(0, 174, 255, 0.8);
          color: #ffffff;
        }

        /* Action Buttons */
        .action-btn {
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .action-btn.submit {
          background-color: #10b981;
          color: #ffffff;
        }

        .action-btn.submit:hover {
          background-color: #059669;
        }

        .action-btn.cancel {
          background-color: #ef4444;
          color: #ffffff;
        }

        .action-btn.cancel:hover {
          background-color: #dc2626;
        }

        .action-btn.edit {
          background-color: #3b82f6;
          color: #ffffff;
        }

        .action-btn.edit:hover {
          background-color: #2563eb;
        }

        .action-btn.small {
          padding: 4px 10px;
          font-size: 12px;
          margin-right: 6px;
        }

        .action-btn.confirm {
          background-color: #10b981;
          color: #ffffff;
        }

        /* Signup Status */
        .signup-status {
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
        }

        .signup-status.confirmed {
          background-color: rgba(16, 185, 129, 0.2);
          color: #10b981;
        }

        .signup-status.pending {
          background-color: rgba(245, 158, 11, 0.2);
          color: #f59e0b;
        }

        /* Lottery Section */
        .lottery-section {
          text-align: center;
          padding: 30px;
        }

        .lottery-section p {
          color: #cccccc;
          margin-bottom: 20px;
        }

        .lottery-result {
          margin-top: 20px;
          padding: 15px;
          background-color: rgba(16, 185, 129, 0.1);
          border: 1px solid #10b981;
          border-radius: 8px;
          color: #10b981;
        }

        /* Order Summary */
        .order-summary {
          color: #ffffff;
          margin-bottom: 15px;
          padding: 10px 15px;
          background-color: rgba(255,255,255,0.05);
          border-radius: 8px;
        }

        .order-summary strong {
          color: #f6b800;
        }

        /* Loading & Empty States */
        .loading-container {
          padding: 40px;
          text-align: center;
          color: #aaaaaa;
        }

        .empty-state {
          padding: 40px;
          text-align: center;
          color: #888888;
          font-size: 14px;
        }

        /* Modal Improvements */
        .modal-container {
          background: #1a2332;
          max-width: 700px;
        }

        .modal-header h2 {
          color: #f6b800;
          font-size: 18px;
        }

        .detail-item {
          background-color: rgba(255,255,255,0.03);
          padding: 12px;
          border-radius: 8px;
        }

        .detail-label {
          color: #888888;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .detail-value {
          color: #ffffff;
          font-size: 14px;
          margin-top: 4px;
        }

        .detail-actions {
          grid-column: 1 / -1;
          margin-top: 10px;
          padding-top: 15px;
          border-top: 1px solid rgba(255,255,255,0.1);
        }

        /* Form Improvements */
        .form-group label {
          color: #cccccc;
        }

        .form-actions {
          display: flex;
          gap: 12px;
          margin-top: 20px;
        }

        .form-actions .action-btn {
          flex: 1;
          padding: 12px;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .rounds-stats-bar {
            flex-wrap: wrap;
            gap: 10px;
            margin: 0 12px 16px;
            padding: 12px 16px;
            background-color: #1a2332 !important;
          }

          .rounds-stat-item {
            flex: 1 1 30%;
            min-width: 80px;
          }

          .rounds-stat-value {
            font-size: 20px;
          }

          .rounds-stat-label {
            font-size: 11px;
          }

          .header-actions {
            flex-direction: column;
            width: 100%;
            gap: 10px;
          }

          .btn-group {
            width: 100%;
            justify-content: center;
          }

          .refresh-btn {
            width: 100%;
          }

          .section-header {
            flex-direction: column;
            gap: 12px;
          }

          .section-header h2 {
            text-align: center;
            margin-bottom: 8px;
          }
        }

        @media (max-width: 480px) {
          .rounds-stats-bar {
            margin: 0 10px 12px;
            padding: 10px 12px;
            gap: 8px;
          }

          .rounds-stat-item {
            flex: 1 1 45%;
          }

          .rounds-stat-value {
            font-size: 18px;
          }

          .rounds-stat-label {
            font-size: 10px;
          }
        }
      `}</style>
    </div>
  );
}

export default Round_Admin;