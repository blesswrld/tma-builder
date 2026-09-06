import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { 
  MapPin, 
  Navigation, 
  Layers, 
  Globe,
  Compass,
  Plus, 
  Minus, 
  LocateFixed, 
  Check,
  ExternalLink
} from 'lucide-react';
import { 
  geocodeRussianAddress, 
  reverseGeocodeRussian, 
  calculateDistanceKm, 
  formatDistanceString,
  getExternalMapLinks,
  localizeToRussian
} from '../../lib/russianGeo';

export interface InteractiveMapProps {
  address?: string;
  lat?: number;
  lng?: number;
  zoom?: number;
  shopName?: string;
  shopLogo?: string;
  editable?: boolean;
  height?: string | number;
  className?: string;
  onLocationChange?: (coords: { lat: number; lng: number; address: string }) => void;
  showNavigationButtons?: boolean;
}

export type TileLayerType = 'streets' | 'satellite' | 'hybrid';

const TILE_SERVERS = {
  streets: {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap',
    maxZoom: 19
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Esri Satellite',
    maxZoom: 18
  },
  hybrid: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    overlayUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    overlayOpacity: 0.5,
    attribution: 'Esri & OpenStreetMap',
    maxZoom: 18
  }
};

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  address = 'Грозный, бульвар Эсамбаева, 8',
  lat: propLat,
  lng: propLng,
  zoom = 16,
  shopName = 'Заведение',
  shopLogo,
  editable = false,
  height = '100%',
  className = '',
  onLocationChange,
  showNavigationButtons = true
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const baseLayerRef = useRef<L.TileLayer | null>(null);
  const overlayLayerRef = useRef<L.TileLayer | null>(null);

  const [activeLayer, setActiveLayer] = useState<TileLayerType>('streets');
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number }>({
    lat: propLat || 43.3200,
    lng: propLng || 45.6902
  });
  const [currentAddress, setCurrentAddress] = useState<string>(localizeToRussian(address));
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [distance, setDistance] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocating, setIsLocating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Initialize or geocode address if explicit coordinates are not provided
  useEffect(() => {
    let isCancelled = false;

    async function initCoords() {
      const cleanAddr = localizeToRussian(address);
      if (propLat && propLng) {
        setCurrentCoords({ lat: propLat, lng: propLng });
        setCurrentAddress(cleanAddr);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const res = await geocodeRussianAddress(cleanAddr);
      if (!isCancelled && res) {
        setCurrentCoords({ lat: res.lat, lng: res.lng });
        setCurrentAddress(localizeToRussian(res.formattedAddress || cleanAddr));
      }
      if (!isCancelled) {
        setIsLoading(false);
      }
    }

    initCoords();

    return () => {
      isCancelled = true;
    };
  }, [address, propLat, propLng]);

  // Create custom marker icon
  const createMarkerIcon = useCallback((isDraggable: boolean) => {
    const html = `
      <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-full cursor-pointer select-none">
        <span class="absolute w-10 h-10 rounded-full bg-emerald-500/25 animate-ping"></span>
        <div class="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-neutral-900 border-2 border-emerald-500 shadow-[0_8px_25px_rgba(16,185,129,0.5)] text-emerald-400">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
          </svg>
        </div>
        ${isDraggable ? '<span class="absolute -bottom-5 px-1.5 py-0.5 bg-neutral-950/95 text-[10px] text-white font-mono rounded whitespace-nowrap border border-emerald-500/30 shadow-md">Перетащите метку</span>' : ''}
      </div>
    `;

    return L.divIcon({
      html,
      className: 'custom-map-pin',
      iconSize: [0, 0],
      iconAnchor: [0, 0]
    });
  }, []);

  // Update map layer implementation
  const applyTileLayer = useCallback((layerType: TileLayerType, map: L.Map) => {
    // Remove old base layer
    if (baseLayerRef.current) {
      map.removeLayer(baseLayerRef.current);
      baseLayerRef.current = null;
    }
    // Remove old overlay layer
    if (overlayLayerRef.current) {
      map.removeLayer(overlayLayerRef.current);
      overlayLayerRef.current = null;
    }

    const cfg = TILE_SERVERS[layerType];
    const newBase = L.tileLayer(cfg.url, {
      maxZoom: cfg.maxZoom,
      subdomains: 'abc'
    }).addTo(map);
    baseLayerRef.current = newBase;

    // If hybrid, also add labels overlay
    if (layerType === 'hybrid' && 'overlayUrl' in cfg) {
      const newOverlay = L.tileLayer((cfg as any).overlayUrl, {
        maxZoom: cfg.maxZoom,
        subdomains: 'abcd',
        pane: 'overlayPane'
      }).addTo(map);
      overlayLayerRef.current = newOverlay;
    }
  }, []);

  // Initialize Leaflet map
  useEffect(() => {
    if (!containerRef.current || isLoading) return;

    if (!mapInstanceRef.current) {
      const map = L.map(containerRef.current, {
        center: [currentCoords.lat, currentCoords.lng],
        zoom,
        zoomControl: false,
        attributionControl: false
      });

      applyTileLayer(activeLayer, map);

      // Add Custom Marker
      const marker = L.marker([currentCoords.lat, currentCoords.lng], {
        icon: createMarkerIcon(editable),
        draggable: editable
      }).addTo(map);

      marker.bindPopup(`
        <div class="p-2 text-neutral-900 font-sans">
          <p class="font-bold text-sm text-neutral-900">${shopName}</p>
          <p class="text-xs text-neutral-600 mt-1">${currentAddress}</p>
        </div>
      `);

      if (editable) {
        marker.on('dragend', async () => {
          const pos = marker.getLatLng();
          const newLat = Number(pos.lat.toFixed(6));
          const newLng = Number(pos.lng.toFixed(6));
          setCurrentCoords({ lat: newLat, lng: newLng });

          const newAddress = await reverseGeocodeRussian(newLat, newLng);
          const localizedAddr = localizeToRussian(newAddress);
          setCurrentAddress(localizedAddr);
          if (onLocationChange) {
            onLocationChange({ lat: newLat, lng: newLng, address: localizedAddr });
          }
        });

        map.on('click', async (e: L.LeafletMouseEvent) => {
          const newLat = Number(e.latlng.lat.toFixed(6));
          const newLng = Number(e.latlng.lng.toFixed(6));
          marker.setLatLng([newLat, newLng]);
          setCurrentCoords({ lat: newLat, lng: newLng });

          const newAddress = await reverseGeocodeRussian(newLat, newLng);
          const localizedAddr = localizeToRussian(newAddress);
          setCurrentAddress(localizedAddr);
          if (onLocationChange) {
            onLocationChange({ lat: newLat, lng: newLng, address: localizedAddr });
          }
        });
      }

      markerRef.current = marker;
      mapInstanceRef.current = map;

      setTimeout(() => {
        map.invalidateSize();
      }, 200);
    } else {
      mapInstanceRef.current.setView([currentCoords.lat, currentCoords.lng], zoom);
      if (markerRef.current) {
        markerRef.current.setLatLng([currentCoords.lat, currentCoords.lng]);
      }
    }
  }, [isLoading, currentCoords.lat, currentCoords.lng, zoom, editable, shopName, currentAddress, createMarkerIcon, onLocationChange, applyTileLayer, activeLayer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Handle Layer Switching
  const handleLayerChange = (layerType: TileLayerType) => {
    setActiveLayer(layerType);
    if (mapInstanceRef.current) {
      applyTileLayer(layerType, mapInstanceRef.current);
    }
  };

  // Geolocation Handler ("Где я")
  const handleFindMyLocation = () => {
    if (!navigator.geolocation) {
      alert('Геолокация не поддерживается вашим браузером');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;
        setUserLocation({ lat: userLat, lng: userLng });

        const km = calculateDistanceKm(userLat, userLng, currentCoords.lat, currentCoords.lng);
        setDistance(formatDistanceString(km));

        if (mapInstanceRef.current) {
          if (!userMarkerRef.current) {
            const userIcon = L.divIcon({
              html: `
                <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2">
                  <span class="absolute w-8 h-8 rounded-full bg-blue-500/35 animate-ping"></span>
                  <div class="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-lg"></div>
                </div>
              `,
              className: 'user-location-pin',
              iconSize: [0, 0]
            });

            const uMarker = L.marker([userLat, userLng], { icon: userIcon }).addTo(mapInstanceRef.current);
            uMarker.bindPopup('<span class="text-xs font-sans font-bold text-neutral-900">Вы находитесь здесь</span>');
            userMarkerRef.current = uMarker;
          } else {
            userMarkerRef.current.setLatLng([userLat, userLng]);
          }

          const bounds = L.latLngBounds([
            [userLat, userLng],
            [currentCoords.lat, currentCoords.lng]
          ]);
          mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
        }
        setIsLocating(false);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setIsLocating(false);
        alert('Не удалось определить геопозицию. Разрешите доступ к геолокации в настройках браузера.');
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  const handleRecenterShop = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([currentCoords.lat, currentCoords.lng], zoom, { animate: true });
      if (markerRef.current) {
        markerRef.current.openPopup();
      }
    }
  };

  const mapLinks = getExternalMapLinks({
    address: currentAddress,
    lat: currentCoords.lat,
    lng: currentCoords.lng,
    shopName
  });

  const handleCopyAddress = () => {
    navigator.clipboard?.writeText(currentAddress);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div 
      className={`relative w-full rounded-2xl overflow-hidden border border-app-border bg-app-card flex flex-col select-none ${className}`}
      style={{ height: typeof height === 'number' ? `${height}px` : height }}
    >
      {/* Map Container Viewport */}
      <div 
        ref={containerRef} 
        className="w-full flex-1 relative min-h-[220px]"
        style={{ zIndex: 1 }}
      />

      {/* Loading Overlay */}
      {isLoading && (
        <div 
          className="absolute inset-0 bg-app-card/85 backdrop-blur-xs flex items-center justify-center"
          style={{ zIndex: 99999 }}
        >
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
            <span className="text-xs font-mono text-app-muted">Загрузка карты РФ...</span>
          </div>
        </div>
      )}

      {/* Top Floating Controls Bar */}
      <div 
        className="absolute top-3 left-3 flex items-center pointer-events-none gap-2"
        style={{ zIndex: 9999 }}
      >
        {/* Layer Switcher Pills: Схема / Спутник / Гибрид */}
        <div className="pointer-events-auto flex items-center p-1 rounded-xl bg-app-card/95 dark:bg-zinc-900/95 backdrop-blur-md border border-app-border shadow-2xl text-[11px] font-mono">
          <button
            type="button"
            onClick={() => handleLayerChange('streets')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeLayer === 'streets' 
                ? 'bg-emerald-500 text-neutral-950 font-bold shadow-md shadow-emerald-500/30' 
                : 'text-app-secondary hover:text-app-primary hover:bg-app-hover'
            }`}
          >
            <Layers size={13} className={activeLayer === 'streets' ? 'text-neutral-950' : 'text-app-muted'} />
            <span>Схема</span>
          </button>
          <button
            type="button"
            onClick={() => handleLayerChange('satellite')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeLayer === 'satellite' 
                ? 'bg-emerald-500 text-neutral-950 font-bold shadow-md shadow-emerald-500/30' 
                : 'text-app-secondary hover:text-app-primary hover:bg-app-hover'
            }`}
          >
            <Globe size={13} className={activeLayer === 'satellite' ? 'text-neutral-950' : 'text-app-muted'} />
            <span>Спутник</span>
          </button>
          <button
            type="button"
            onClick={() => handleLayerChange('hybrid')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeLayer === 'hybrid' 
                ? 'bg-emerald-500 text-neutral-950 font-bold shadow-md shadow-emerald-500/30' 
                : 'text-app-secondary hover:text-app-primary hover:bg-app-hover'
            }`}
          >
            <Compass size={13} className={activeLayer === 'hybrid' ? 'text-neutral-950' : 'text-app-muted'} />
            <span>Гибрид</span>
          </button>
        </div>

        {/* Distance Badge (if user location is determined) */}
        {distance && (
          <div className="pointer-events-auto hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-app-card/95 dark:bg-zinc-900/95 border border-emerald-500/40 backdrop-blur-md text-emerald-600 dark:text-emerald-400 text-xs font-mono font-bold shadow-2xl">
            <Navigation size={12} className="rotate-45 text-emerald-600 dark:text-emerald-400" />
            <span>В {distance} от вас</span>
          </div>
        )}
      </div>

      {/* Floating Map Zoom & Action Controls in the Top-Right Corner */}
      <div 
        className="absolute top-3 right-3 flex flex-col items-center gap-2 pointer-events-auto"
        style={{ zIndex: 9999 }}
      >
        {/* Zoom Controls */}
        <div className="flex flex-col rounded-xl bg-app-card/95 dark:bg-zinc-900/95 backdrop-blur-md border border-app-border shadow-2xl overflow-hidden">
          <button
            type="button"
            onClick={() => mapInstanceRef.current?.zoomIn()}
            aria-label="Приблизить"
            title="Приблизить"
            className="w-9 h-9 flex items-center justify-center text-app-secondary hover:text-app-primary hover:bg-app-hover transition-all cursor-pointer active:scale-95"
          >
            <Plus size={16} />
          </button>
          <div className="h-[1px] w-5 mx-auto bg-app-border" />
          <button
            type="button"
            onClick={() => mapInstanceRef.current?.zoomOut()}
            aria-label="Отдалить"
            title="Отдалить"
            className="w-9 h-9 flex items-center justify-center text-app-secondary hover:text-app-primary hover:bg-app-hover transition-all cursor-pointer active:scale-95"
          >
            <Minus size={16} />
          </button>
        </div>

        {/* Recenter on Shop & GPS Geolocation */}
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            onClick={handleRecenterShop}
            aria-label="Центрировать на метке"
            title="Показать заведение на карте"
            className="w-9 h-9 rounded-xl bg-app-card/95 dark:bg-zinc-900/95 hover:bg-app-hover backdrop-blur-md border border-app-border text-emerald-600 dark:text-emerald-400 flex items-center justify-center transition-all shadow-2xl cursor-pointer active:scale-95"
          >
            <MapPin size={17} />
          </button>
          <button
            type="button"
            onClick={handleFindMyLocation}
            disabled={isLocating}
            aria-label="Моё местоположение"
            title="Моё местоположение (где я)"
            className={`w-9 h-9 rounded-xl bg-app-card/95 dark:bg-zinc-900/95 hover:bg-app-hover backdrop-blur-md border border-app-border flex items-center justify-center transition-all shadow-2xl cursor-pointer active:scale-95 ${
              isLocating ? 'text-indigo-500 animate-pulse' : 'text-app-secondary hover:text-app-primary'
            }`}
          >
            <LocateFixed size={17} className={isLocating ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Helper Banner when editing */}
      {editable && (
        <div 
          className="absolute bottom-3 left-3 right-3 pointer-events-none flex justify-center"
          style={{ zIndex: 9999 }}
        >
          <div className="px-3 py-1.5 rounded-xl bg-app-card/95 dark:bg-zinc-900/95 backdrop-blur-md border border-app-border shadow-2xl text-[11px] font-mono text-app-primary flex items-center gap-1.5 pointer-events-auto">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="truncate">Кликните по карте или перетащите метку для точного адреса</span>
          </div>
        </div>
      )}

      {/* Bottom Bar: Address & Quick Navigation External Links (shown in client view) */}
      {showNavigationButtons && (
        <div 
          className="p-3 bg-app-modal-header border-t border-app-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 text-app-primary"
          style={{ zIndex: 10 }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <MapPin size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="text-xs font-medium text-app-primary truncate">{currentAddress}</span>
            <button
              type="button"
              onClick={handleCopyAddress}
              className="text-[11px] font-mono text-app-secondary hover:text-app-primary px-2 py-0.5 rounded bg-app-card hover:bg-app-hover border border-app-border shrink-0 transition-colors cursor-pointer flex items-center gap-1"
              title="Скопировать адрес"
            >
              {isCopied ? <Check size={11} className="text-emerald-600 dark:text-emerald-400" /> : null}
              <span>{isCopied ? 'Скопировано' : 'Копия'}</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
            <a
              href={mapLinks.yandex}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-mono font-medium transition-all flex items-center gap-1 shadow-xs"
            >
              <span>Яндекс Карты</span>
              <ExternalLink size={11} />
            </a>
            <a
              href={mapLinks.twoGis}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-mono font-medium transition-all flex items-center gap-1 shadow-xs"
            >
              <span>2ГИС</span>
              <ExternalLink size={11} />
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default InteractiveMap;
