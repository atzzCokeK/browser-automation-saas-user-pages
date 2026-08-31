"use client";

import { useEffect } from "react";
import styles from "@/styles/notification-bar.module.css";

type Props = {
  message: string;
  onClose?: () => void;
  duration?: number;
};

export default function NotificationBar({ message, onClose, duration = 4000 }: Props) {
  // 出しっぱなしにならないよう、一定時間で自動的に閉じる。
  useEffect(() => {
    if (!onClose) return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [message, onClose, duration]);

  return (
    <div className={styles.bar} role="status">
      <svg
        className={styles.icon}
        width="18"
        height="18"
        viewBox="0 0 18 18"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="9" cy="9" r="8" fill="currentColor" />
        <path
          d="M5.5 9.2l2.4 2.4 4.6-5"
          stroke="white"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className={styles.message}>{message}</span>
      {onClose && (
        <button
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          aria-label="通知を閉じる"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path
              d="M1.5 1.5l9 9M10.5 1.5l-9 9"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
