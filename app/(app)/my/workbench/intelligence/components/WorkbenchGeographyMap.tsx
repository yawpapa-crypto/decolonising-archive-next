"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ComposableMap, Geographies, Geography, Graticule, Sphere } from "react-simple-maps";
import { Globe2, MapPin, X } from "lucide-react";
import {
  coverageFillColor,
  normaliseCountry,
  type GeographicCountryCoverage,
  type UserGeographicCoverage,
} from "@/lib/intelligence/geography-shared";
import { cn } from "@/lib/cn";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

type Props = {
  selectedCountry: string | null;
  selectedRegion?: string | null;
  onSelectCountry: (country: string | null) => void;
  onSelectRegion?: (region: string | null) => void;
};

function RegionBars({
  regions,
  selectedRegion,
  onSelectRegion,
}: {
  regions: UserGeographicCoverage["regions"];
  selectedRegion?: string | null;
  onSelectRegion?: (region: string | null) => void;
}) {
  if (!regions.length) return null;
  const max = Math.max(1, ...regions.map((entry) => entry.count));
  const interactive = Boolean(onSelectRegion);

  return (
    <section className="ri-panel ri-region-bars" aria-label="Region coverage">
      <h3 className="ri-section-title">Region coverage</h3>
      <ul className="ri-dist-list">
        {regions.slice(0, 10).map((entry) => {
          const active = selectedRegion === entry.region;
          return (
            <li key={entry.region} className={cn("ri-dist-row", interactive && "ri-dist-row--interactive", active && "is-active")}>
              {interactive ? (
                <button
                  type="button"
                  className="ri-dist-row__button"
                  onClick={() => onSelectRegion?.(active ? null : entry.region)}
                >
                  <div className="ri-dist-row__head">
                    <span className="ri-dist-row__label">{entry.region}</span>
                    <span className="ri-dist-row__meta">{entry.count}</span>
                  </div>
                  <div className="ri-dist-row__track" aria-hidden="true">
                    <span
                      className="ri-dist-row__fill"
                      style={{ width: `${Math.max(8, (entry.count / max) * 100)}%` }}
                    />
                  </div>
                </button>
              ) : (
                <>
                  <div className="ri-dist-row__head">
                    <span className="ri-dist-row__label">{entry.region}</span>
                    <span className="ri-dist-row__meta">{entry.count}</span>
                  </div>
                  <div className="ri-dist-row__track" aria-hidden="true">
                    <span
                      className="ri-dist-row__fill"
                      style={{ width: `${Math.max(8, (entry.count / max) * 100)}%` }}
                    />
                  </div>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function CountryListFallback({
  countries,
  selectedCountry,
  onSelectCountry,
}: {
  countries: GeographicCountryCoverage[];
  selectedCountry: string | null;
  onSelectCountry: (country: string | null) => void;
}) {
  if (!countries.length) {
    return (
      <div className="ri-geo-empty">
        <Globe2 size={28} aria-hidden />
        <p>No geographic metadata yet. Save records with country or region fields to populate the map.</p>
      </div>
    );
  }

  return (
    <ul className="ri-geo-country-list">
      {countries.map((entry) => (
        <li key={entry.country}>
          <button
            type="button"
            className={cn("ri-geo-country-btn", selectedCountry === entry.country && "is-active")}
            onClick={() => onSelectCountry(selectedCountry === entry.country ? null : entry.country)}
          >
            <span>{entry.country}</span>
            <strong>{entry.count}</strong>
          </button>
        </li>
      ))}
    </ul>
  );
}

function CountrySidePanel({
  country,
  onClear,
}: {
  country: GeographicCountryCoverage;
  onClear: () => void;
}) {
  return (
    <aside className="ri-geo-side-panel" aria-label={`Records in ${country.country}`}>
      <div className="ri-geo-side-panel__head">
        <div>
          <p className="ri-eyebrow">Selected country</p>
          <h3>{country.country}</h3>
          <p className="ri-geo-side-panel__meta">
            {country.count} record{country.count === 1 ? "" : "s"}
            {country.iso3 ? ` · ${country.iso3}` : ""}
          </p>
        </div>
        <button type="button" className="ri-btn ri-btn--secondary" onClick={onClear} aria-label="Clear selection">
          <X size={16} aria-hidden />
        </button>
      </div>
      <ul className="ri-geo-record-list">
        {country.records.map((record) => (
          <li key={record.recordId}>
            <strong>{record.title}</strong>
            <span>
              {[record.year, record.source, record.region].filter(Boolean).join(" · ") || record.recordId}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}

export default function WorkbenchGeographyMap({
  selectedCountry,
  selectedRegion,
  onSelectCountry,
  onSelectRegion,
}: Props) {
  const [data, setData] = useState<UserGeographicCoverage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapFailed, setMapFailed] = useState(false);
  const [tooltip, setTooltip] = useState<{ label: string; count: number; x: number; y: number } | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/workbench/intelligence/geography", { cache: "no-store" });
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error ?? "Could not load geography data.");
        }
        const json = (await response.json()) as UserGeographicCoverage;
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load geography data.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    fetch(GEO_URL)
      .then((response) => {
        if (!response.ok) setMapFailed(true);
      })
      .catch(() => setMapFailed(true));
  }, []);

  const countryByName = useMemo(() => {
    const map = new Map<string, GeographicCountryCoverage>();
    for (const entry of data?.countries ?? []) {
      map.set(entry.country, entry);
    }
    return map;
  }, [data]);

  const countByIso3 = useMemo(() => {
    const map = new Map<string, GeographicCountryCoverage>();
    for (const entry of data?.countries ?? []) {
      if (entry.iso3) map.set(entry.iso3, entry);
    }
    return map;
  }, [data]);

  const maxCount = useMemo(
    () => Math.max(1, ...(data?.countries ?? []).map((entry) => entry.count)),
    [data],
  );

  const selectedEntry = useMemo(
    () => (data?.countries ?? []).find((entry) => entry.country === selectedCountry) ?? null,
    [data, selectedCountry],
  );

  const resolveCountryEntry = useCallback(
    (geo: { properties: { name?: string; iso_a3?: string } }) => {
      const iso3 = geo.properties.iso_a3;
      if (iso3 && iso3 !== "-99" && countByIso3.has(iso3)) {
        return countByIso3.get(iso3)!;
      }
      const normalized = normaliseCountry(geo.properties.name);
      if (normalized && countryByName.has(normalized)) {
        return countryByName.get(normalized)!;
      }
      return null;
    },
    [countByIso3, countryByName],
  );

  const handleGeographyClick = useCallback(
    (geo: { properties: { name?: string; iso_a3?: string } }) => {
      const entry = resolveCountryEntry(geo);
      if (!entry) {
        onSelectCountry(null);
        return;
      }
      onSelectCountry(selectedCountry === entry.country ? null : entry.country);
    },
    [onSelectCountry, resolveCountryEntry, selectedCountry],
  );

  if (loading) {
    return (
      <section className="ri-panel ri-geo-map ri-geo-map--loading" aria-busy="true">
        <p>Loading geographic coverage…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="ri-panel ri-geo-map" role="alert">
        <p>{error}</p>
        <CountryListFallback countries={[]} selectedCountry={selectedCountry} onSelectCountry={onSelectCountry} />
      </section>
    );
  }

  const countries = data?.countries ?? [];
  const hasGeo = countries.length > 0;

  return (
    <section className="ri-geo-layout" aria-label="Geographic coverage">
      <div className="ri-panel ri-geo-map">
        <div className="ri-panel__head">
          <div>
            <p className="ri-eyebrow">Geography</p>
            <h2 className="ri-section-shell__title">Geographic coverage map</h2>
          </div>
          {hasGeo ? (
            <p className="ri-geo-map__legend">
              <MapPin size={14} aria-hidden /> Darker green = more saved records
            </p>
          ) : null}
        </div>

        {!hasGeo ? (
          <CountryListFallback countries={[]} selectedCountry={selectedCountry} onSelectCountry={onSelectCountry} />
        ) : mapFailed ? (
          <CountryListFallback
            countries={countries}
            selectedCountry={selectedCountry}
            onSelectCountry={onSelectCountry}
          />
        ) : (
          <div className="ri-geo-map__canvas-wrap">
            <ComposableMap
              projection="geoEqualEarth"
              projectionConfig={{ scale: 145 }}
              className="ri-geo-map__canvas"
            >
              <Sphere id="sphere" fill="#f7faf8" stroke="#dce7e1" strokeWidth={0.4} />
              <Graticule stroke="#e4ece7" strokeWidth={0.35} />
              <Geographies geography={GEO_URL}>
                {({ geographies }) =>
                  geographies.map((geo) => {
                    const entry = resolveCountryEntry(geo);
                    const count = entry?.count ?? 0;
                    const isSelected = Boolean(entry && selectedCountry === entry.country);

                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        onMouseEnter={(event) => {
                          if (!entry) return;
                          setTooltip({
                            label: entry.country,
                            count: entry.count,
                            x: event.clientX,
                            y: event.clientY,
                          });
                        }}
                        onMouseMove={(event) => {
                          if (!entry) return;
                          setTooltip({
                            label: entry.country,
                            count: entry.count,
                            x: event.clientX,
                            y: event.clientY,
                          });
                        }}
                        onMouseLeave={() => setTooltip(null)}
                        onClick={() => handleGeographyClick(geo)}
                        style={{
                          default: {
                            fill: coverageFillColor(count, maxCount, isSelected),
                            stroke: "#ffffff",
                            strokeWidth: 0.4,
                            outline: "none",
                            cursor: entry ? "pointer" : "default",
                          },
                          hover: {
                            fill: entry ? "#0f3d2e" : coverageFillColor(count, maxCount, false),
                            stroke: "#ffffff",
                            strokeWidth: 0.5,
                            outline: "none",
                          },
                          pressed: {
                            fill: "#0b2f24",
                            outline: "none",
                          },
                        }}
                        aria-label={
                          entry ? `${entry.country}: ${entry.count} records` : (geo.properties.name as string)
                        }
                      />
                    );
                  })
                }
              </Geographies>
            </ComposableMap>

            {tooltip ? (
              <div
                className="ri-geo-tooltip"
                style={{ left: tooltip.x + 12, top: tooltip.y + 12 }}
                role="tooltip"
              >
                <strong>{tooltip.label}</strong>
                <span>{tooltip.count} record{tooltip.count === 1 ? "" : "s"}</span>
              </div>
            ) : null}
          </div>
        )}

        <div className="ri-geo-mobile-list" aria-label="Country list">
          <CountryListFallback
            countries={countries}
            selectedCountry={selectedCountry}
            onSelectCountry={onSelectCountry}
          />
        </div>
      </div>

      <div className="ri-geo-side">
        <RegionBars
          regions={data?.regions ?? []}
          selectedRegion={selectedRegion}
          onSelectRegion={onSelectRegion}
        />
        {selectedEntry ? (
          <CountrySidePanel country={selectedEntry} onClear={() => onSelectCountry(null)} />
        ) : (
          <section className="ri-panel ri-geo-side-panel ri-geo-side-panel--empty">
            <h3 className="ri-section-title">Country records</h3>
            <p className="ri-empty-note">Click a shaded country to filter your records and view sources here.</p>
          </section>
        )}
      </div>
    </section>
  );
}
