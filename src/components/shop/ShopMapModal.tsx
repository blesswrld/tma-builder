import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, MapPin, Clock, Phone, Navigation, ExternalLink } from 'lucide-react';
import { InteractiveMap } from '../map/InteractiveMap';
import { getExternalMapLinks, localizeToRussian } from '../../lib/russianGeo';

export interface ShopMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  shop: {
    name: string;
    address?: string | null;
    workingHours?: string | null;
    phone?: string | null;
    isOpen?: boolean;
    logoUrl?: string | null;
  };
}

export const ShopMapModal: React.FC<ShopMapModalProps> = ({
  isOpen,
  onClose,
  shop
}) => {
  if (!isOpen) return null;

  const address = localizeToRussian(shop.address || 'Грозный, бульвар Эсамбаева, 8');
  const mapLinks = getExternalMapLinks({
    address,
    shopName: shop.name
  });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/85 backdrop-blur-md"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-2xl bg-app-modal border border-app-border rounded-3xl overflow-hidden shadow-2xl z-10 flex flex-col max-h-[90vh] text-app-primary"
        >
          {/* Header */}
          <div className="px-5 py-4 bg-app-modal-header border-b border-app-border flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <MapPin size={17} />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-app-primary truncate font-mono">
                  {shop.name}
                </h3>
                <div className="flex items-center gap-2 text-xs text-app-muted min-w-0">
                  <span className="truncate">{address}</span>
                  {shop.isOpen !== false ? (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shrink-0 font-medium">
                      Открыто
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 shrink-0 font-medium">
                      Закрыто
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-app-card hover:bg-app-hover text-app-muted hover:text-app-primary border border-app-border flex items-center justify-center transition-colors cursor-pointer shrink-0"
              aria-label="Закрыть"
              title="Закрыть"
            >
              <X size={16} />
            </button>
          </div>

          {/* Interactive Map (Seamless container without nested border cutouts) */}
          <div className="relative w-full h-[380px] sm:h-[420px] bg-app-card overflow-hidden">
            <InteractiveMap
              address={address}
              shopName={shop.name}
              shopLogo={shop.logoUrl || undefined}
              height="100%"
              showNavigationButtons={false}
              className="rounded-none border-0"
            />
          </div>

          {/* Details & Fast Actions Footer */}
          <div className="p-4 bg-app-modal-header border-t border-app-border flex flex-col gap-3 shrink-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {shop.workingHours && (
                <div className="flex items-center gap-2 text-app-secondary">
                  <Clock size={14} className="text-app-muted shrink-0" />
                  <span className="font-mono text-[11px]">{shop.workingHours}</span>
                </div>
              )}
              {shop.phone && (
                <div className="flex items-center gap-2 text-app-secondary">
                  <Phone size={14} className="text-app-muted shrink-0" />
                  <a 
                    href={`tel:${shop.phone}`} 
                    className="hover:text-emerald-600 dark:hover:text-emerald-400 font-mono text-[11px] underline transition-colors"
                  >
                    {shop.phone}
                  </a>
                </div>
              )}
            </div>

            {/* Quick Action Navigation Buttons */}
            <div className="flex items-center gap-2 pt-1">
              <a
                href={mapLinks.yandex}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-mono font-medium flex items-center justify-center gap-1.5 transition-all shadow-xs"
              >
                <span>Маршрут в Яндекс Карты</span>
                <ExternalLink size={12} />
              </a>
              <a
                href={mapLinks.twoGis}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-medium flex items-center justify-center gap-1.5 transition-all shadow-xs"
              >
                <span>Открыть в 2ГИС</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ShopMapModal;
