import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, MapPin, Search, Check, Building2, Map, Globe } from 'lucide-react';
import { InteractiveMap } from '../map/InteractiveMap';
import { useScrollLock } from '../../hooks/useScrollLock';
import { 
  RUSSIAN_POPULAR_CITIES, 
  searchRussianAddressSuggestions,
  localizeToRussian,
  AddressSuggestion,
  RussianCity
} from '../../lib/russianGeo';

export interface AdminMapPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAddress: string;
  onSelectAddress: (address: string, coords?: { lat: number; lng: number }) => void;
}

export const AdminMapPickerModal: React.FC<AdminMapPickerModalProps> = ({
  isOpen,
  onClose,
  currentAddress,
  onSelectAddress
}) => {
  const [selectedAddress, setSelectedAddress] = useState<string>(
    localizeToRussian(currentAddress || 'Грозный, бульвар Эсамбаева, 8')
  );
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCountryFilter, setSelectedCountryFilter] = useState<'all' | 'ru' | 'kz' | 'by'>('all');

  // Filter cities by selected country tab
  const filteredCities = useMemo(() => {
    if (selectedCountryFilter === 'all') {
      // Pick top cities from each region
      const topRu = RUSSIAN_POPULAR_CITIES.filter((c) => c.countryCode === 'ru').slice(0, 8);
      const topKz = RUSSIAN_POPULAR_CITIES.filter((c) => c.countryCode === 'kz').slice(0, 4);
      const topBy = RUSSIAN_POPULAR_CITIES.filter((c) => c.countryCode === 'by').slice(0, 3);
      return [...topRu, ...topKz, ...topBy];
    }
    return RUSSIAN_POPULAR_CITIES.filter((c) => c.countryCode === selectedCountryFilter);
  }, [selectedCountryFilter]);

  useScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    setIsSearching(true);
    const results = await searchRussianAddressSuggestions(query);
    setSuggestions(results);
    setIsSearching(false);
  };

  const handleSelectSuggestion = (item: AddressSuggestion) => {
    const cleanLabel = localizeToRussian(item.label);
    setSelectedAddress(cleanLabel);
    setSelectedCoords({ lat: item.lat, lng: item.lng });
    setSuggestions([]);
    setSearchQuery('');
  };

  const handleQuickCityClick = (city: RussianCity) => {
    const fullAddress = city.country === 'Россия' 
      ? `${city.name}, ${city.region}` 
      : `${city.name}, ${city.region}, ${city.country}`;
    setSelectedAddress(fullAddress);
    setSelectedCoords({ lat: city.lat, lng: city.lng });
    setSuggestions([]);
    setSearchQuery('');
  };

  const handleMapLocationChange = (data: { lat: number; lng: number; address: string }) => {
    const localized = localizeToRussian(data.address);
    setSelectedAddress(localized);
    setSelectedCoords({ lat: data.lat, lng: data.lng });
  };

  const handleApply = () => {
    onSelectAddress(localizeToRussian(selectedAddress), selectedCoords);
    onClose();
  };

  const modalContent = (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-xs z-[9999]"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          className="relative w-full max-w-3xl bg-app-modal border border-app-border rounded-3xl overflow-hidden shadow-2xl z-[10000] flex flex-col max-h-[92vh] text-app-primary"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-5 py-4 bg-app-modal-header border-b border-app-border flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Map size={17} />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-app-primary font-mono truncate">
                  Выбор адреса на карте
                </h3>
                <p className="text-xs text-app-muted truncate">
                  Поиск по городам и адресам РФ, Казахстана, Беларуси. Перетащите метку к входу заведения
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-app-card hover:bg-app-hover text-app-muted hover:text-app-primary border border-app-border flex items-center justify-center transition-colors cursor-pointer shrink-0"
              title="Закрыть"
            >
              <X size={16} />
            </button>
          </div>

          {/* Search & City Filters */}
          <div className="p-3.5 bg-app-surface/60 border-b border-app-border space-y-2.5 shrink-0">
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-app-muted pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Поиск по городам, улицам и номерам домов (РФ, Казахстан, Беларусь)..."
                className="w-full bg-app-input border border-app-border focus:border-emerald-500/60 rounded-xl pl-10 pr-4 py-2.5 text-xs text-app-primary placeholder:text-app-muted outline-none font-sans transition-colors"
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
              )}
            </div>

            {/* Suggestions Dropdown */}
            {suggestions.length > 0 && (
              <div className="bg-app-modal border border-app-border rounded-xl overflow-hidden shadow-2xl divide-y divide-app-border text-xs max-h-56 overflow-y-auto">
                {suggestions.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectSuggestion(item)}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-app-hover text-app-secondary hover:text-app-primary flex items-center justify-between gap-2 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <MapPin size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <div className="truncate">
                        <span className="font-semibold text-app-primary block truncate">{item.title}</span>
                        {item.subtitle && (
                          <span className="text-[11px] text-app-muted block truncate">{item.subtitle}</span>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 shrink-0">
                      Выбрать
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Country Selector & Popular Cities Quick Chips */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar text-[11px] font-mono">
                <span className="text-app-muted text-[10px] uppercase shrink-0 mr-1 font-semibold">Страна:</span>
                {[
                  { id: 'all', label: 'Все' },
                  { id: 'ru', label: 'Россия (₽)' },
                  { id: 'kz', label: 'Казахстан (₸)' },
                  { id: 'by', label: 'Беларусь (Br)' }
                ].map((ctry) => (
                  <button
                    key={ctry.id}
                    type="button"
                    onClick={() => setSelectedCountryFilter(ctry.id as any)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer shrink-0 ${
                      selectedCountryFilter === ctry.id
                        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 font-bold'
                        : 'bg-app-card hover:bg-app-hover text-app-muted hover:text-app-primary border border-app-border'
                    }`}
                  >
                    {ctry.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar text-[11px] font-mono">
                <span className="text-app-muted text-[10px] uppercase shrink-0 mr-1 font-semibold">Города:</span>
                {filteredCities.map((c) => (
                  <button
                    key={`${c.countryCode}_${c.name}`}
                    type="button"
                    onClick={() => handleQuickCityClick(c)}
                    className="px-2.5 py-1 rounded-lg bg-app-card hover:bg-app-hover text-app-secondary hover:text-app-primary border border-app-border shrink-0 transition-colors cursor-pointer"
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Interactive Map Picker */}
          <div className="relative w-full h-[360px] sm:h-[420px] flex-1">
            <InteractiveMap
              address={selectedAddress}
              lat={selectedCoords?.lat}
              lng={selectedCoords?.lng}
              editable={true}
              height="100%"
              showNavigationButtons={false}
              onLocationChange={handleMapLocationChange}
            />
          </div>

          {/* Selected Address & Confirm Footer */}
          <div className="p-4 bg-app-modal-header border-t border-app-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
            <div className="min-w-0">
              <span className="text-[10px] font-mono text-app-muted uppercase tracking-wider block font-semibold">
                Выбранный адрес:
              </span>
              <p className="text-xs sm:text-sm font-semibold text-emerald-600 dark:text-emerald-400 truncate mt-0.5">
                {selectedAddress || 'Точка не выбрана'}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-app-card hover:bg-app-hover text-app-secondary hover:text-app-primary border border-app-border text-xs font-mono transition-colors cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs font-mono transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 cursor-pointer"
              >
                <Check size={14} />
                <span>Применить адрес</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};

export default AdminMapPickerModal;
