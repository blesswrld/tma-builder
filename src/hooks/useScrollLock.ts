import { useEffect } from "react";

let lockCount = 0;
let originalPaddingRight = "";

/**
 * Universal hook to lock body scrolling when any modal, drawer or lightbox is open.
 * Handles nested modals, scrollbar jumping prevention, and clean restoration.
 */
export function useScrollLock(lock: boolean = true) {
  useEffect(() => {
    if (!lock) return;

    if (lockCount === 0) {
      originalPaddingRight = document.body.style.paddingRight;

      // Prevent content shift when scrollbar disappears
      const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
      if (scrollBarWidth > 0) {
        document.body.style.paddingRight = `${scrollBarWidth}px`;
      }

      document.body.style.overflow = "hidden";
    }

    lockCount++;

    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) {
        document.body.style.overflow = "";
        document.body.style.paddingRight = originalPaddingRight || "";
      }
    };
  }, [lock]);
}
