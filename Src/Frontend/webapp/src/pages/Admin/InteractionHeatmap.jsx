import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DeckGL from "@deck.gl/react";
import { HeatmapLayer } from "@deck.gl/aggregation-layers";
import { Map } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { secureAxios } from "../../config/axiosConfig";
import "../../css/pages/volunteer.css";

const PITTSBURGH_VIEW_STATE = {
  longitude: -79.9959,
  latitude: 40.4406,
  zoom: 11.8,
  pitch: 0,
  bearing: 0,
};

export default function InteractionHeatmap({ userData, onLogout }) {
  const navigate = useNavigate();
  const [interactions, setInteractions] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [pointsRes, countRes] = await Promise.all([
          secureAxios.get("/api/interactions"),
          secureAxios.get("/api/interactions/count"),
        ]);

        const rawInteractions =
          pointsRes?.data?.interactions ||
          (Array.isArray(pointsRes?.data) ? pointsRes.data : []);

        setInteractions(rawInteractions);
        setTotalCount(Number(countRes?.data?.count ?? rawInteractions.length ?? 0));
      } catch (err) {
        console.error("Failed to load heatmap data:", err);
        setError("Failed to load interaction map data.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const heatmapData = useMemo(() => {
    return interactions
      .map((item) => {
        const latitude = Number(item.latitude);
        const longitude = Number(item.longitude);
        const weight = Number(item.intensity ?? 1);

        return {
          latitude,
          longitude,
          weight: Number.isFinite(weight) && weight > 0 ? weight : 1,
        };
      })
      .filter(
        (item) =>
          Number.isFinite(item.latitude) &&
          Number.isFinite(item.longitude)
      );
  }, [interactions]);

  const layers = useMemo(() => {
    if (!heatmapData.length) return [];

    return [
      new HeatmapLayer({
        id: "interaction-heatmap",
        data: heatmapData,
        getPosition: (d) => [d.longitude, d.latitude],
        getWeight: (d) => d.weight,
        radiusPixels: 40,
        intensity: 1,
        threshold: 0.03,
        aggregation: "SUM",
      }),
    ];
  }, [heatmapData]);

  return (
    <div className="volunteer-page">
      <div className="nav-bar">
        <div>
          <img src="/Untitled.png" alt="Logo" className="nav-logo" />
          <div className="nav-welcome">
            <h2>Interaction Heatmap</h2>
          </div>
        </div>
        <div className="nav-right-group">
          <button className="nav-btn" onClick={() => navigate(-1)}>Back</button>
        </div>
      </div>
      <div className="volunteer-dashboard-container" style={{ flexDirection: 'column', padding: '30px 40px', gap: '20px' }}>
        <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#f6b800', margin: '0 0 10px 0' }}>Total interactions: {totalCount}</p>
        {loading && <p>Loading map data...</p>}
        {error && <p style={{ color: "red" }}>{error}</p>}
        <div
          style={{
            height: "calc(100vh - 200px)",
            width: "100%",
            borderRadius: "12px",
            overflow: "hidden",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            position: "relative",
          }}
        >
          <DeckGL
            initialViewState={PITTSBURGH_VIEW_STATE}
            controller={true}
            layers={layers}
            style={{ width: "100%", height: "100%" }}
          >
            <Map
              mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
              style={{ width: "100%", height: "100%" }}
            />
          </DeckGL>
        </div>
      </div>

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
          // GPS location logging will be implemented here
          navigator.geolocation.getCurrentPosition(async (position) => {
            await secureAxios.post("/api/interactions/log", {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            });
            setShowPopup(true);
            setTimeout(() => setShowPopup(false), 1500);
          });
        }}
        onMouseOver={(e) => e.target.style.backgroundColor = '#002d5f'}
        onMouseOut={(e) => e.target.style.backgroundColor = '#003e7e'}
      >
        📍 Log Interaction
      </button>

      {showPopup && (
        <div style={{
          position: 'fixed',
          bottom: '70px',
          right: '30px',
          backgroundColor: '#27ae60',
          color: '#ffffff',
          padding: '8px 16px',
          borderRadius: '6px',
          fontSize: '14px',
          fontWeight: 'bold',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
          zIndex: '1001',
          opacity: showPopup ? 1 : 0,
          transition: 'opacity 0.5s ease',
        }}>
          Interaction logged!
        </div>
      )}
    </div>
  );
}