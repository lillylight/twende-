'use client';

import React, { useEffect, useRef, useCallback } from 'react';

export interface BusPosition {
  id: string;
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  operatorName: string;
  registrationPlate: string;
  isCompliant: boolean;
  isOverSpeed: boolean;
}

export interface LiveFleetMapProps {
  positions: BusPosition[];
  onBusSelect?: (busId: string) => void;
  googleTilesApiKey?: string;
  className?: string;
}

function getBusColor(bus: BusPosition): string {
  if (!bus.isCompliant) return '#E24B4A'; // danger red
  if (bus.isOverSpeed) return '#EF9F27'; // amber
  return '#0F6E56'; // primary teal
}

function LiveFleetMapInner({
  positions,
  onBusSelect,
  googleTilesApiKey,
  className,
}: LiveFleetMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<InstanceType<typeof import('cesium').Viewer> | null>(null);
  const entitiesRef = useRef<Map<string, InstanceType<typeof import('cesium').Entity>>>(new Map());

  // Initialize Cesium viewer
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let viewer: InstanceType<typeof import('cesium').Viewer> | null = null;

    async function init() {
      const Cesium = await import('cesium');

      // Set Cesium base URL and default access token
      (window as Record<string, unknown>).CESIUM_BASE_URL = '/cesium/';
      Cesium.Ion.defaultAccessToken = '';

      if (!containerRef.current) return;

      viewer = new Cesium.Viewer(containerRef.current, {
        timeline: false,
        animation: false,
        homeButton: false,
        geocoder: false,
        sceneModePicker: false,
        baseLayerPicker: false,
        navigationHelpButton: false,
        fullscreenButton: false,
        infoBox: false,
        selectionIndicator: true,
        scene3DOnly: true,
      });

      viewerRef.current = viewer;

      // Add Google Photorealistic 3D Tiles if key provided
      if (googleTilesApiKey) {
        try {
          const tileset = await Cesium.Cesium3DTileset.fromUrl(
            `https://tile.googleapis.com/v1/3dtiles/root.json?key=${googleTilesApiKey}`
          );
          viewer.scene.primitives.add(tileset);
        } catch (err) {
          console.warn('Failed to load Google 3D Tiles:', err);
        }
      }

      // Fly to Zambia by default (centered on Lusaka)
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(28.2833, -15.3875, 500000),
        duration: 0,
      });

      // Click handler for selecting buses
      viewer.screenSpaceEventHandler.setInputAction(
        (movement: { position: { x: number; y: number } }) => {
          const picked = viewer?.scene.pick(
            new Cesium.Cartesian2(movement.position.x, movement.position.y)
          );
          if (Cesium.defined(picked) && picked?.id?.id) {
            onBusSelect?.(picked.id.id);
          }
        },
        Cesium.ScreenSpaceEventType.LEFT_CLICK
      );
    }

    init();

    return () => {
      if (viewer && !viewer.isDestroyed()) {
        viewer.destroy();
      }
      viewerRef.current = null;
      entitiesRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleTilesApiKey]);

  // Update bus entity positions
  useEffect(() => {
    if (!viewerRef.current) return;

    async function updateEntities() {
      const Cesium = await import('cesium');
      const viewer = viewerRef.current;
      if (!viewer) return;

      const currentIds = new Set(positions.map((p) => p.id));

      // Remove entities no longer in positions
      for (const [id, entity] of entitiesRef.current) {
        if (!currentIds.has(id)) {
          viewer.entities.remove(entity);
          entitiesRef.current.delete(id);
        }
      }

      // Add or update entities
      for (const bus of positions) {
        const color = getBusColor(bus);
        const cesiumColor = Cesium.Color.fromCssColorString(color);
        const position = Cesium.Cartesian3.fromDegrees(bus.lng, bus.lat, 0);

        const existing = entitiesRef.current.get(bus.id);

        if (existing) {
          // Update position and properties
          existing.position = new Cesium.ConstantPositionProperty(position);
          if (existing.point) {
            existing.point.color = new Cesium.ConstantProperty(cesiumColor);
          }
          if (existing.label) {
            existing.label.text = new Cesium.ConstantProperty(
              `${bus.operatorName}\n${bus.registrationPlate} | ${Math.round(bus.speed)} km/h`
            );
          }
        } else {
          // Create new entity
          const entity = viewer.entities.add({
            id: bus.id,
            position,
            point: {
              pixelSize: 14,
              color: cesiumColor,
              outlineColor: Cesium.Color.WHITE,
              outlineWidth: 2,
            },
            label: {
              text: `${bus.operatorName}\n${bus.registrationPlate} | ${Math.round(bus.speed)} km/h`,
              font: '12px sans-serif',
              fillColor: Cesium.Color.WHITE,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              outlineWidth: 2,
              outlineColor: Cesium.Color.BLACK,
              verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
              pixelOffset: new Cesium.Cartesian2(0, -18),
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
            },
          });
          entitiesRef.current.set(bus.id, entity);
        }
      }
    }

    updateEntities();
  }, [positions]);

  // Fly-to on bus select (exposed via ref or callback)
  const flyToBus = useCallback(async (busId: string) => {
    const Cesium = await import('cesium');
    const viewer = viewerRef.current;
    if (!viewer) return;

    const entity = entitiesRef.current.get(busId);
    if (!entity) return;

    viewer.flyTo(entity, {
      offset: new Cesium.HeadingPitchRange(
        Cesium.Math.toRadians(0),
        Cesium.Math.toRadians(-45),
        5000
      ),
    });
  }, []);

  // Re-trigger fly when onBusSelect fires externally
  useEffect(() => {
    if (onBusSelect) {
      // Expose flyToBus on the container for external control
      const el = containerRef.current;
      if (el) {
        (el as unknown as Record<string, unknown>).__flyToBus = flyToBus;
      }
    }
  }, [flyToBus, onBusSelect]);

  return (
    <div
      ref={containerRef}
      className={className ?? 'h-[600px] w-full rounded-xl overflow-hidden border border-gray-200'}
    />
  );
}

// Dynamic import wrapper to disable SSR
import dynamic from 'next/dynamic';

export const LiveFleetMap = dynamic(() => Promise.resolve(LiveFleetMapInner), {
  ssr: false,
  loading: () => (
    <div className="flex h-[600px] w-full items-center justify-center rounded-xl border border-gray-200 bg-gray-50">
      <div className="text-sm text-gray-400">Loading 3D Map...</div>
    </div>
  ),
});
