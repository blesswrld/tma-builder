import React from "react";

interface TelegramIconProps {
  className?: string;
  size?: number;
  variant?: "color" | "plain";
}

export const TelegramIcon: React.FC<TelegramIconProps> = ({
  className = "shrink-0",
  size = 18,
  variant = "color"
}) => {
  if (variant === "plain") {
    return (
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="currentColor"
        className={className}
        aria-hidden="true"
      >
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.197 1.006.128.832.927z" />
      </svg>
    );
  }

  // Official Telegram Brand Icon (Clean circular badge with crisp white paper airplane)
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="12" fill="#229ED9" />
      <path
        d="M5.4 11.96C8.6 10.57 10.74 9.65 11.82 9.2C14.9 7.92 15.54 7.7 15.96 7.69C16.05 7.69 16.26 7.71 16.39 7.82C16.5 7.91 16.53 8.04 16.54 8.13C16.56 8.25 16.54 8.44 16.53 8.58C16.33 10.66 15.45 15.84 15.01 18.2C14.82 19.2 14.45 19.53 14.1 19.56C13.32 19.63 12.73 19.05 11.98 18.56C10.8 17.78 10.14 17.3 8.99 16.54C7.67 15.67 8.53 15.19 9.28 14.41C9.48 14.21 12.87 11.12 12.93 10.85C12.94 10.82 12.94 10.7 12.87 10.64C12.8 10.58 12.7 10.6 12.62 10.62C12.51 10.64 10.76 11.8 7.37 14.09C6.87 14.43 6.42 14.6 6.01 14.59C5.57 14.58 4.71 14.34 4.07 14.13C3.29 13.88 2.67 13.74 2.72 13.31C2.75 13.09 3.05 12.86 3.63 12.63L5.4 11.96Z"
        fill="white"
      />
    </svg>
  );
};
