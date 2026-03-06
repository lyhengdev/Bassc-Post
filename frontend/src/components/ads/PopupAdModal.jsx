import { useEffect, useRef, useState } from 'react';
import { cn } from '../../utils';
import { BodyAd } from './BodyAd';

export function PopupAdModal({ ad, isOpen, onClose, onImpression, onClick }) {
  const [remaining, setRemaining] = useState(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const safeAd = ad || {};
  const popupSettings = safeAd.popupSettings || {};
  const autoCloseEnabled = popupSettings.autoClose ?? safeAd.autoClose ?? true;
  const autoCloseSeconds = Number.isFinite(popupSettings.autoCloseSeconds)
    ? popupSettings.autoCloseSeconds
    : Number.isFinite(safeAd.autoCloseSeconds)
      ? safeAd.autoCloseSeconds
      : parseInt(popupSettings.autoCloseSeconds || safeAd.autoCloseSeconds || 0, 10);
  const showCloseButton = popupSettings.showCloseButton ?? safeAd.showCloseButton ?? true;
  const backdropClickClose = popupSettings.backdropClickClose ?? safeAd.backdropClickClose ?? true;

  useEffect(() => {
    if (!ad) return undefined;
    if (!isOpen) return undefined;
    if (!autoCloseEnabled) return undefined;
    if (!autoCloseSeconds || autoCloseSeconds <= 0) return undefined;

    setRemaining(autoCloseSeconds);
    const intervalId = setInterval(() => {
      setRemaining((prev) => {
        if (prev === null) return prev;
        if (prev <= 1) {
          closeRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [ad, autoCloseSeconds, autoCloseEnabled, isOpen]);

  if (!ad) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center',
        isOpen ? 'pointer-events-auto' : 'pointer-events-none opacity-0'
      )}
      aria-hidden={!isOpen}
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={backdropClickClose ? onClose : undefined}
      />
      <div className="relative z-10 w-full max-w-md sm:max-w-lg mx-4">
        <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between gap-2">
          {typeof remaining === 'number' && remaining > 0 ? (
            <span className="rounded-full bg-white/90 text-dark-900 text-xs font-semibold px-3 py-1 shadow">
              Closing in {remaining}s
            </span>
          ) : (
            <span />
          )}
          {showCloseButton && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-white/90 text-dark-900 text-xs font-semibold px-3 py-1 shadow hover:bg-white"
            >
              Close
            </button>
          )}
        </div>
        <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-white dark:bg-dark-900">
          <BodyAd ad={ad} useNaturalHeight placementOverride="popup" onImpression={onImpression} onClick={onClick} />
        </div>
      </div>
    </div>
  );
}
