"use client";

import { useCallback, useMemo } from "react";
import Map, { useControl } from "react-map-gl/maplibre";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { HexagonLayer } from "@deck.gl/aggregation-layers";
import { ScatterplotLayer } from "@deck.gl/layers";
import type { PickingInfo } from "@deck.gl/core";
import { MapPin, X } from "lucide-react";
import "maplibre-gl/dist/maplibre-gl.css";
import { itemsToMapPoints, type MapRecordPoint } from "@/lib/workbench-intelligence-map-data";
import type {
  IntelligenceCityPlace,
  IntelligenceItem,
  IntelligenceLocationCard,
  IntelligenceWorldMapPoint,
} from "@/lib/workbench-intelligence-types";
import { cn } from "@/lib/cn";

const MAP_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
const DEFAULT_VIEW = { longitude: 10, latitude: 20, zoom: 1.2, pitch: 0, bearing: 0 };

type Props = {
  points: IntelligenceWorldMapPoint[];
  locations: IntelligenceLocationCard[];
  cityPlaces: IntelligenceCityPlace[];
  items: IntelligenceItem[];
  activePlaceId: string | null;
  selectedCountry: string | null;
  onSelectPlace: (placeId: string | null) => void;
};

function DeckOverlay({ layers }: { layers: Parameters<MapboxOverlay["setProps"]>[0]["layers"] }) {
  const overlay = useControl<MapboxOverlay>(() => new MapboxOverlay({ interleaved: true }));
  overlay.setProps({ layers });
  return null;
}

export default function IntelligenceGlobalMap({
  points,
  locations,
  cityPlaces,
  items,
  activePlaceId,
  selectedCountry,
  onSelectPlace,
}: Props) {
  const recordPoints = useMemo(() => itemsToMapPoints(items), [items]);

  const markerPoints = useMemo(
    () => points.filter((p) => p.kind === "country" || p.kind === "continent" || p.kind === "diaspora"),
    [points],
  );

  const floatingCards = useMemo(() => {
    return [...locations]
      .filter((loc) => loc.kind !== "city" && loc.recordCount > 0)
      .sort((a, b) => b.recordCount - a.recordCount)
      .slice(0, 4);
  }, [locations]);

  const visibleCities = useMemo(() => {
    if (!selectedCountry) return [];
    return cityPlaces.filter((c) => c.country === selectedCountry).slice(0, 8);
  }, [cityPlaces, selectedCountry]);

  const handlePick = useCallback(
    (info: PickingInfo) => {
      if (info.object && "placeId" in info.object) {
        const placeId = (info.object as IntelligenceWorldMapPoint).placeId;
        onSelectPlace(activePlaceId === placeId ? null : placeId);
      }
    },
    [activePlaceId, onSelectPlace],
  );

  const hexLayer = useMemo(
    () =>
      new HexagonLayer<MapRecordPoint>({
        id: "hex-density",
        data: recordPoints,
        pickable: false,
        extruded: false,
        radius: 350000,
        coverage: 0.85,
        elevationScale: 0,
        getPosition: (d) => [d.longitude, d.latitude],
        getColorWeight: (d) => d.weight,
        colorRange: [
          [240, 249, 244],
          [187, 220, 204],
          [120, 180, 150],
          [45, 120, 90],
          [15, 61, 46],
        ],
        opacity: 0.55,
      }),
    [recordPoints],
  );

  const scatterLayer = useMemo(
    () =>
      new ScatterplotLayer<IntelligenceWorldMapPoint>({
        id: "place-markers",
        data: markerPoints,
        pickable: true,
        stroked: true,
        filled: true,
        radiusScale: 6,
        radiusMinPixels: 6,
        radiusMaxPixels: 28,
        lineWidthMinPixels: 1,
        getPosition: (d) => [d.longitude, d.latitude],
        getRadius: (d) => Math.max(8, Math.sqrt(d.count) * 5),
        getFillColor: (d) => {
          const active = d.placeId === activePlaceId;
          if (active) return [15, 61, 46, 230];
          if (d.kind === "diaspora") return [120, 80, 40, 190];
          if (d.kind === "continent") return [60, 120, 100, 160];
          return [15, 61, 46, 180];
        },
        getLineColor: [255, 255, 255, 220],
        onClick: handlePick,
        updateTriggers: {
          getFillColor: [activePlaceId],
        },
      }),
    [markerPoints, activePlaceId, handlePick],
  );

  const activeLabel =
    points.find((p) => p.placeId === activePlaceId)?.label ??
    locations.find((l) => l.placeId === activePlaceId)?.label ??
    null;

  return (
    <section className="ri-dash-map-panel" aria-label="Global location intelligence">
      <div className="ri-dash-map-panel__head">
        <div>
          <h2>Global location intelligence</h2>
          <p>Hex density shows archive coverage worldwide. Tap a marker to filter records by place.</p>
        </div>
      </div>

      <div className="ri-dash-map-stage">
        <Map
          initialViewState={DEFAULT_VIEW}
          mapStyle={MAP_STYLE}
          style={{ width: "100%", height: "100%" }}
          attributionControl={false}
          reuseMaps
          maxZoom={8}
          minZoom={0.5}
          scrollZoom={false}
          dragRotate={false}
          touchPitch={false}
        >
          <DeckOverlay layers={[hexLayer, scatterLayer]} />
        </Map>

        {floatingCards.length ? (
          <div className="ri-dash-floating-cards" aria-live="polite">
            {floatingCards.map((card, index) => (
              <button
                key={card.placeId}
                type="button"
                className={cn(
                  "ri-dash-float-card",
                  activePlaceId === card.placeId && "is-active",
                )}
                style={{
                  left: `${8 + (index % 2) * 42}%`,
                  top: `${12 + Math.floor(index / 2) * 42}%`,
                }}
                onClick={() => onSelectPlace(activePlaceId === card.placeId ? null : card.placeId)}
              >
                <span className="ri-dash-float-card__icon">
                  <MapPin size={14} aria-hidden />
                </span>
                <span className="ri-dash-float-card__label">{card.label}</span>
                <strong>{card.recordCount.toLocaleString()}</strong>
                <span className="ri-dash-float-card__meta">{card.openAccessPercent}% open access</span>
              </button>
            ))}
          </div>
        ) : null}

        {activeLabel ? (
          <button type="button" className="ri-map__clear" onClick={() => onSelectPlace(null)}>
            <X size={14} aria-hidden />
            Clear filter · {activeLabel}
          </button>
        ) : null}
      </div>

      {selectedCountry && visibleCities.length ? (
        <div className="ri-cities ri-cities--map">
          <h4 className="ri-cities__title">Cities & places in {selectedCountry}</h4>
          <div className="ri-cities__grid">
            {visibleCities.map((city) => (
              <button
                key={city.placeId}
                type="button"
                className={cn("ri-city-chip", activePlaceId === city.placeId && "is-active")}
                onClick={() => onSelectPlace(activePlaceId === city.placeId ? null : city.placeId)}
              >
                <strong>{city.label}</strong>
                <span>{city.recordCount} records</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
