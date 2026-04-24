import React, { useState, useEffect, useCallback } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { publicAxios } from "../../config/axiosConfig";
import { useNavigate } from "react-router-dom";
import "../../index.css";

const VolunteerCalendar = ({ userData, onLogout }) => {
  const navigate = useNavigate();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [allUpcomingRounds, setAllUpcomingRounds] = useState([]);
  const [roundsForSelectedDate, setRoundsForSelectedDate] = useState([]);
  const [showRoundsModal, setShowRoundsModal] = useState(false);
  const [allRoundsError, setAllRoundsError] = useState("");

  const loadAllUpcomingRounds = useCallback(async () => {
    if (!userData || !userData.userId) return;

    try {
      const r = await publicAxios.get("/api/rounds/all", {
        params: {
          authenticated: true,
          userId: userData.userId,
          userRole: "VOLUNTEER"
        }
      });

      const d = r.data;

      if (d.status === "success") {
        const nonCancelledRounds = (d.rounds || []).filter(
          round => round.status !== "CANCELLED" && round.status !== "CANCELED"
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
      await loadAllUpcomingRounds();
      handleDateClick(selectedDate);
    } catch (e) {
      alert(e.response?.data?.message || e.message);
    }
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);

    const ds = date.toISOString().split("T")[0];

    const filteredRounds = allUpcomingRounds.filter((r) => {
      const rs = r.startTime.split("T")[0];
      return rs === ds;
    });

    setRoundsForSelectedDate(filteredRounds);
    setShowRoundsModal(true);
  };

  const highlightDates = ({ date, view }) => {
    if (view !== "month") return null;

    const ds = date.toISOString().split("T")[0];

    const hasRound = allUpcomingRounds.some((r) => {
      const rs = r.startTime.split("T")[0];
      return rs === ds;
    });

    return hasRound ? "highlight-day" : null;
  };

  useEffect(() => {
    loadAllUpcomingRounds();
  }, [loadAllUpcomingRounds]);

  return (
    <>
        <header className="store-header">
        <div className="cargo-header">
            <img src="/Untitled.png" alt="Logo" className="store-logo" />
            <h2 className="cargo-title">Volunteer Calendar</h2>
        </div>

        <button onClick={() => navigate('/')} className="manage-btn">
            Back to Dashboard
        </button>
        </header>

      <div className="volunteer-dashboard-container">
        <div
          style={{
            width: "100%",
            padding: "40px",
            display: "flex",
            justifyContent: "center"
          }}
        >
          <div
            style={{
              backgroundColor: "#1a2332",
              borderRadius: "12px",
              padding: "24px",
              border: "1px solid rgba(255, 255, 255, 0.05)",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)"
            }}
          >
            <h2>
              <strong>Select a date to see rounds</strong>
            </h2>

            {allRoundsError && <p className="error-text">{allRoundsError}</p>}

            <div
                style={{
                    display: "flex",
                    justifyContent: "center",
                    width: "100%",
                    marginTop: "100px",
                    transform: 'scale(1.3)'
                }}
                >
                <Calendar
                    onClickDay={handleDateClick}
                    tileClassName={highlightDates}
                />
                </div>
          </div>
        </div>

        {showRoundsModal && (
          <div className="rounds-modal">
            <div className="rounds-modal-content">
              <h3>Rounds on {selectedDate.toDateString()}</h3>

              {roundsForSelectedDate.length === 0 && (
                <p>No rounds scheduled for this date.</p>
              )}

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
                    <button onClick={() => signupForRound(r.roundId, "VOLUNTEER")}>
                      Sign Up
                    </button>
                  ) : (
                    <p style={{ color: "red" }}>No slots available.</p>
                  )}
                </div>
              ))}

              <button
                className="close-modal-btn"
                onClick={() => setShowRoundsModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default VolunteerCalendar;