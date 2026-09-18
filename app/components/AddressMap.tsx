"use client";

import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Correção dos ícones padrão do Leaflet no Next.js
const customIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// Componente para re-centralizar o mapa
function RecenterMap({ coords }: { coords: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(coords, 16);
  }, [coords, map]);
  return null;
}

// Marcador Arrastável no Mapa
function DraggableMarker({
  position,
  setPosition,
  onDragEnd,
}: {
  position: [number, number];
  setPosition: (pos: [number, number]) => void;
  onDragEnd: (lat: number, lng: number) => void;
}) {
  const mapEvents = useMapEvents({
    dragend() {
      const center = mapEvents.getCenter();
      setPosition([center.lat, center.lng]);
      onDragEnd(center.lat, center.lng);
    },
  });

  return (
    <Marker
      position={position}
      icon={customIcon}
      draggable={true}
      eventHandlers={{
        dragend(e) {
          const marker = e.target;
          const pos = marker.getLatLng();
          setPosition([pos.lat, pos.lng]);
          onDragEnd(pos.lat, pos.lng);
        },
      }}
    />
  );
}

interface AddressMapProps {
  position: [number, number];
  setPosition: (pos: [number, number]) => void;
  onDragEnd: (lat: number, lng: number) => void;
}

export default function AddressMap({ position, setPosition, onDragEnd }: AddressMapProps) {
  return (
    <MapContainer center={position} zoom={15} style={{ height: "100%", width: "100%" }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <RecenterMap coords={position} />
      <DraggableMarker position={position} setPosition={setPosition} onDragEnd={onDragEnd} />
    </MapContainer>
  );
}