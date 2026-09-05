import React, { useState, useEffect } from 'react';
import { Download, Check } from 'lucide-react';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// Global cached prompt so early window events are not lost
declare global {
  interface Window {
    __deferredPWAInstallPrompt?: BeforeInstallPromptEvent | null;
  }
}

export interface InstallButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'compact' | 'outline' | 'icon';
  showIcon?: boolean;
  label?: string;
  tooltipText?: string;
  onInstalled?: () => void;
}

/**
 * InstallButton component:
 * Отображается ТОЛЬКО если приложение еще НЕ установлено как PWA
 * И браузер поддерживает событие beforeinstallprompt (инициирован deferredPrompt).
 */
export const InstallButton: React.FC<InstallButtonProps> = ({
  className = '',
  variant = 'primary',
  showIcon = true,
  label = 'Установить приложение',
  tooltipText = 'Установить приложение',
  children,
  onClick,
  onInstalled,
  title: _title,
  ...rest
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(() => {
    if (typeof window !== 'undefined' && window.__deferredPWAInstallPrompt) {
      return window.__deferredPWAInstallPrompt;
    }
    return null;
  });

  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    return isStandalone;
  });

  const [isInstalling, setIsInstalling] = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);

  useEffect(() => {
    // Check if already running in standalone mode
    const checkStandalone = () => {
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      setIsInstalled(isStandalone);
    };

    checkStandalone();

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsInstalled(true);
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleMediaChange);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent browser default mini-infobar
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      window.__deferredPWAInstallPrompt = promptEvent;
      setDeferredPrompt(promptEvent);
    };

    const handlePromptReady = () => {
      if (window.__deferredPWAInstallPrompt) {
        setDeferredPrompt(window.__deferredPWAInstallPrompt);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      window.__deferredPWAInstallPrompt = null;
      setJustInstalled(true);
      if (onInstalled) {
        onInstalled();
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('pwa:prompt-ready', handlePromptReady);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleMediaChange);
      }
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('pwa:prompt-ready', handlePromptReady);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [onInstalled]);

  // Mandatory rule:
  // Отображается ТОЛЬКО в том случае, если приложение еще не установлено как PWA
  // И браузер поддерживает событие beforeinstallprompt (deferredPrompt !== null)
  if (isInstalled || !deferredPrompt) {
    return null;
  }

  const handleInstallClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (onClick) {
      onClick(e);
    }

    if (!deferredPrompt) return;

    try {
      setIsInstalling(true);
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;

      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
        window.__deferredPWAInstallPrompt = null;
        setJustInstalled(true);
        if (onInstalled) {
          onInstalled();
        }
      }
    } catch (err) {
      console.warn('[PWA] Ошибка вызова prompt установки:', err);
    } finally {
      setIsInstalling(false);
    }
  };

  // Icon-only minimalist variant for top headers
  if (variant === 'icon') {
    return (
      <div className="relative group inline-flex items-center">
        <button
          id="pwa-install-button"
          type="button"
          onClick={handleInstallClick}
          disabled={isInstalling}
          aria-label={tooltipText || label}
          className={`p-2 w-9 h-9 bg-app-card hover:bg-app-hover border border-app-border text-app-primary rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
          {...rest}
        >
          {justInstalled ? (
            <Check size={15} className="text-emerald-500 shrink-0" />
          ) : (
            <Download size={15} className={`text-app-primary shrink-0 transition-transform group-hover:translate-y-0.5 ${isInstalling ? 'animate-bounce text-indigo-400' : ''}`} />
          )}
        </button>
        {/* Floating Tooltip (Single custom styled tooltip) */}
        <span className="pointer-events-none absolute top-full mt-2 right-0 px-2.5 py-1 bg-neutral-900 text-neutral-100 border border-neutral-700 text-[11px] font-sans font-medium rounded-lg shadow-xl whitespace-nowrap opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-150 z-50">
          {tooltipText || label}
        </span>
      </div>
    );
  }

  // Base styling variants
  let variantClasses = 'bg-white hover:bg-neutral-100 text-neutral-950 shadow-md font-bold';
  if (variant === 'secondary') {
    variantClasses = 'bg-app-card hover:bg-app-hover text-app-primary border border-app-border font-medium';
  } else if (variant === 'outline') {
    variantClasses = 'border border-white/20 hover:bg-white/10 text-white font-medium';
  } else if (variant === 'compact') {
    variantClasses = 'bg-app-card hover:bg-app-hover text-app-primary border border-app-border text-xs px-2.5 py-1.5 font-medium';
  }

  const sizeClasses = variant === 'compact' ? 'h-7 px-2 text-xs' : 'h-9 px-3.5 text-xs sm:text-sm';

  return (
    <button
      id="pwa-install-button"
      type="button"
      onClick={handleInstallClick}
      disabled={isInstalling}
      aria-label={tooltipText || label}
      className={`inline-flex items-center justify-center gap-2 rounded-xl transition-all cursor-pointer font-mono select-none disabled:opacity-50 disabled:cursor-not-allowed ${sizeClasses} ${variantClasses} ${className}`}
      {...rest}
    >
      {showIcon && (
        justInstalled ? (
          <Check size={14} className="text-emerald-500 shrink-0" />
        ) : (
          <Download size={14} className={`shrink-0 ${isInstalling ? 'animate-bounce' : ''}`} />
        )
      )}
      <span>{children || label}</span>
    </button>
  );
};

export default InstallButton;
