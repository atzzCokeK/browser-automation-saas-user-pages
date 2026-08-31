import styles from "@/styles/notification-bar.module.css";

type Props = {
  message: string;
};

export default function NotificationBar({ message }: Props) {
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
    </div>
  );
}
