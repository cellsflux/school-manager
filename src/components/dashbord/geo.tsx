"use client";

import React from "react";
import {
  ChoroplethChart,
  ChoroplethFeatureComponent,
  ChoroplethGraticule,
  ChoroplethTooltip,
} from "../charts/choropleth";
import * as topojson from "topojson-client";
import { PatternLines } from "@visx/pattern";
import type { Topology, GeometryCollection } from "topojson-specification";
import type { FeatureCollection, Geometry, Feature } from "geojson";

// npm install world-atlas (ou copie manuelle du fichier — voir note plus bas)
import worldTopology from "./geo.json";

// Type attendu par ChoroplethChart (properties sans `null`)
type ChoroplethFeatureProperties = {
  name?: string;
  id?: string | number;
  [key: string]: unknown;
};

type ChoroplethFeature = Feature<Geometry, ChoroplethFeatureProperties>;

const geojson = topojson.feature(
  worldTopology as unknown as Topology,
  (worldTopology as unknown as Topology).objects
    .countries as GeometryCollection,
) as unknown as FeatureCollection<Geometry, ChoroplethFeatureProperties>;

// Exemple de données de visiteurs par pays (id ISO numérique -> nombre de visiteurs)
const visitorsByCountry: Record<string, number> = {
  "840": 45200, // USA
  "124": 38900, // Canada
  "76": 21300, // Brésil
  "276": 6400, // Allemagne
  "180": 4100, // RDC (République Démocratique du Congo)
};

function getVisitorId(feature: ChoroplethFeature): string | undefined {
  return feature.id?.toString() ?? feature.properties?.id?.toString();
}

function getVisitorValue(
  feature: ChoroplethFeature,
  _index: number,
): number | undefined {
  const id = getVisitorId(feature);
  return id ? visitorsByCountry[id] : undefined;
}

// Échelle de bleu du plus clair (peu de visiteurs) au plus foncé (beaucoup)
function getVisitorColor(feature: ChoroplethFeature, index: number): string {
  const value = getVisitorValue(feature, index);
  if (value === undefined) return "transparent"; // laisse voir le pattern hachuré
  if (value > 40000) return "var(--chart-scale-01)";
  if (value > 25000) return "var(--chart-scale-02)";
  if (value > 15000) return "var(--chart-scale-03)";
  return "var(--chart-scale-04)";
}

// Pattern hachuré uniquement pour les pays SANS données (comme sur l'image)
function getVisitorPattern(feature: ChoroplethFeature): string | null {
  return getVisitorValue(feature, 0) === undefined ? "studio-choro-bg" : null;
}

export default function Geo() {
  return (
    <ChoroplethChart
      data={geojson}
      aspectRatio="16 / 9"
      animationDuration={1100}
    >
      <ChoroplethGraticule />
      <ChoroplethFeatureComponent
        getFeatureColor={getVisitorColor}
        getFeaturePattern={getVisitorPattern}
        patterns={
          <PatternLines
            id="studio-choro-bg"
            height={8}
            width={8}
            orientation={["diagonal"]}
            stroke="var(--muted-foreground)"
            strokeWidth={1}
          />
        }
      />
      <ChoroplethTooltip
        getFeatureValue={getVisitorValue}
        valueLabel="Visitors"
        content={({ feature, index }) => {
          const value = getVisitorValue(feature, index);
          return (
            <div
              style={{
                background: "var(--chart-tooltip-background)",
                color: "var(--chart-tooltip-foreground)",
                padding: "6px 10px",
                borderRadius: 6,
                fontSize: 12,
                lineHeight: 1.4,
              }}
            >
              <div style={{ fontWeight: 600 }}>
                {feature?.properties?.name ?? "—"}
              </div>
              <div style={{ color: "var(--chart-tooltip-muted)" }}>
                Visitors: {value !== undefined ? value.toLocaleString() : "N/A"}
              </div>
            </div>
          );
        }}
      />
    </ChoroplethChart>
  );
}
