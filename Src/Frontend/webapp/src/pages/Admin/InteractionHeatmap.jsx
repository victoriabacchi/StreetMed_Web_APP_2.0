import { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { secureAxios } from "../../config/axiosConfig";

function HeatLayer({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!map || !points.length) return;

    const circles = points.map(([lat, lng]) =>
      L.circle([lat, lng], {
        radius: 15,
        color: "red",
        fillColor: "red",
        fillOpacity: 0.1,
        stroke: false,
      }).addTo(map)
    );

    return () => circles.forEach(c => map.removeLayer(c));
  }, [map, points]);

  return null;
}

function FitToPittsburghBounds() {
  const map = useMap();
  useEffect(() => {
    const bounds = L.latLngBounds(
      [40.36, -80.10],
      [40.52, -79.86]
    );
    map.setMaxBounds(bounds.pad(0.2));
    map.fitBounds(bounds);
  }, [map]);
  return null;
}

export default function InteractionHeatmap() {
  const [interactions, setInteractions] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        const [pointsRes, countRes] = await Promise.all([
          secureAxios.get("/api/interactions"),
          secureAxios.get("/api/interactions/count"),
        ]);
        setInteractions(pointsRes.data.interactions || []);
        setTotalCount(countRes.data.count || 0);
      } catch (err) {
        console.error("Failed to load heatmap data:", err);
        setError("Failed to load interaction map data.");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const heatPoints = useMemo(() => {
    return interactions
      .filter(p => typeof p.latitude === "number" && typeof p.longitude === "number")
      .map(p => [p.latitude, p.longitude]);
  }, [interactions]);

  return (
    <div style={{ padding: "20px" }}>
      <h2>Interaction Heatmap</h2>
      <p>Total interactions: {totalCount}</p>
      {loading && <p>Loading map data...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
      <div style={{ height: "600px", width: "100%", borderRadius: "12px", overflow: "hidden" }}>
        <MapContainer
          center={[40.4406, -79.9959]}
          zoom={12}
          minZoom={11}
          maxZoom={17}
          scrollWheelZoom={true}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitToPittsburghBounds />
          {heatPoints.length > 0 && <HeatLayer points={heatPoints} />}
        </MapContainer>
      </div>
    </div>
  );
}