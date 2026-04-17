import { useEffect, useMemo, useState } from "react";
import DeckGL from "@deck.gl/react";
import { HeatmapLayer } from "@deck.gl/aggregation-layers";
import { Map } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { secureAxios } from "../../config/axiosConfig";

const PITTSBURGH_VIEW_STATE = {
  longitude: -79.9959,
  latitude: 40.4406,
  zoom: 11.8,
  pitch: 0,
  bearing: 0,
};

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
    <div style={{ padding: "20px" }}>
      <h2>Interaction Heatmap</h2>
      <p>Total interactions: {totalCount}</p>

      {loading && <p>Loading map data...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      <div
        style={{
          height: "600px",
          width: "100%",
          borderRadius: "12px",
          overflow: "hidden",
          border: "1px solid #ddd",
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
  );
}