import React, { FormEvent } from "react";
import { Trash2, X } from "lucide-react";
import { Banner } from "../../types";

interface AdminBannersTabProps {
  banners: Banner[];
  handleDeleteBanner: (id: string) => void;
  isCreatingBanner: boolean;
  setIsCreatingBanner: (creating: boolean) => void;
  bannerError: string | null;
  newBannerData: {
    title: string;
    subtitle: string;
    badge: string;
  };
  setNewBannerData: React.Dispatch<
    React.SetStateAction<{
      title: string;
      subtitle: string;
      badge: string;
    }>
  >;
  handleCreateBanner: (e: FormEvent) => void;
}

export function AdminBannersTab({
  banners,
  handleDeleteBanner,
  isCreatingBanner,
  setIsCreatingBanner,
  bannerError,
  newBannerData,
  setNewBannerData,
  handleCreateBanner,
}: AdminBannersTabProps) {
  return (
    <div className="space-y-6">
      {banners.length === 0 ? (
        <div className="py-16 text-center bg-app-surface border border-dashed border-app-border rounded-2xl p-6">
          <p className="text-xs text-app-muted font-mono">
            Рекламные баннеры не настроены.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {banners.map((banner) => (
            <div
              key={banner.id}
              className="p-6 rounded-2xl bg-app-surface border border-app-border space-y-3 relative shadow-sm"
            >
              <button
                onClick={() => handleDeleteBanner(banner.id)}
                className="absolute top-4 right-4 p-1.5 text-app-muted hover:text-rose-500 transition-colors cursor-pointer"
                title="Удалить"
              >
                <Trash2 size={15} />
              </button>
              {banner.badge && (
                <span className="inline-block px-2.5 py-0.5 bg-app-badge text-app-primary font-mono text-[10px] font-bold rounded-full uppercase tracking-wider border border-app-border">
                  {banner.badge}
                </span>
              )}
              <h3 className="text-base font-bold text-app-primary tracking-tight">
                {banner.title}
              </h3>
              {banner.subtitle && (
                <p className="text-xs text-app-muted leading-relaxed">
                  {banner.subtitle}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Banner Modal */}
      {isCreatingBanner && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-app-surface border border-app-border rounded-3xl p-6 text-app-primary space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-app-border pb-3">
              <h3 className="text-sm font-semibold font-mono">Создать баннер</h3>
              <button
                onClick={() => setIsCreatingBanner(false)}
                className="text-app-muted hover:text-app-primary cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            {bannerError && (
              <p className="text-xs text-rose-400 font-mono">{bannerError}</p>
            )}
            <form onSubmit={handleCreateBanner} className="space-y-3 font-sans">
              <input
                type="text"
                value={newBannerData.title}
                onChange={(e) =>
                  setNewBannerData((p) => ({ ...p, title: e.target.value }))
                }
                placeholder="Заголовок *"
                className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2 text-xs text-app-primary focus:outline-none"
              />
              <input
                type="text"
                value={newBannerData.subtitle}
                onChange={(e) =>
                  setNewBannerData((p) => ({ ...p, subtitle: e.target.value }))
                }
                placeholder="Подзаголовок"
                className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2 text-xs text-app-primary focus:outline-none"
              />
              <input
                type="text"
                value={newBannerData.badge}
                onChange={(e) =>
                  setNewBannerData((p) => ({ ...p, badge: e.target.value }))
                }
                placeholder="Текст бейджа (напр. АКЦИЯ, НОВИНКА)"
                className="w-full bg-app-card border border-app-border rounded-xl px-3.5 py-2 text-xs text-app-primary focus:outline-none font-mono"
              />
              <button
                type="submit"
                className="w-full py-2.5 bg-app-accent text-app-accent-fg font-mono font-bold text-xs rounded-xl hover:opacity-90 uppercase cursor-pointer"
              >
                Сохранить баннер
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
