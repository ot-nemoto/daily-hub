type Props = {
  className?: string;
};

export function AppIcon({ className }: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
    >
      <line
        x1="8.25"
        y1="7.5"
        x2="6"
        y2="21.75"
        stroke="black"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="15.75"
        y1="7.5"
        x2="18"
        y2="21.75"
        stroke="black"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <polyline
        points="3,7.5 9.75,7.5 12,3.75 14.25,7.5 21,7.5"
        fill="none"
        stroke="black"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line
        x1="8.25"
        y1="12"
        x2="15.75"
        y2="12"
        stroke="black"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
    </svg>
  );
}
