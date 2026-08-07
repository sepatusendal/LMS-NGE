export function TimeOfDayIllustration({ hour, className }: { hour: number; className?: string }) {
  if (hour >= 4 && hour < 11) {
    // Morning — sun with a book
    return (
      <svg className={className} viewBox="0 0 100 100" fill="none">
        <circle cx="50" cy="38" r="20" fill="#eda100" />
        <g stroke="#eda100" strokeWidth="3" strokeLinecap="round">
          <line x1="50" y1="6" x2="50" y2="0" />
          <line x1="78" y1="16" x2="83" y2="11" />
          <line x1="22" y1="16" x2="17" y2="11" />
          <line x1="88" y1="38" x2="94" y2="38" />
          <line x1="12" y1="38" x2="6" y2="38" />
        </g>
        <rect x="24" y="70" width="52" height="8" rx="3" fill="#ffffff" fillOpacity="0.35" />
        <path d="M30 70 L30 56 Q42 50 50 56 L50 70 Z" fill="#ffffff" />
        <path d="M70 70 L70 56 Q58 50 50 56 L50 70 Z" fill="#ffffff" fillOpacity="0.85" />
      </svg>
    );
  }
  if (hour >= 11 && hour < 15) {
    // Midday — bright sun, high in the sky
    return (
      <svg className={className} viewBox="0 0 100 100" fill="none">
        <circle cx="50" cy="30" r="17" fill="#eda100" />
        <g stroke="#eda100" strokeWidth="3" strokeLinecap="round">
          <line x1="50" y1="4" x2="50" y2="-1" />
          <line x1="72" y1="12" x2="76" y2="8" />
          <line x1="28" y1="12" x2="24" y2="8" />
          <line x1="80" y1="30" x2="86" y2="30" />
          <line x1="20" y1="30" x2="14" y2="30" />
        </g>
        <rect x="20" y="72" width="60" height="7" rx="3" fill="#ffffff" fillOpacity="0.3" />
        <circle cx="34" cy="64" r="9" fill="#ffffff" />
        <circle cx="50" cy="60" r="12" fill="#ffffff" fillOpacity="0.9" />
        <circle cx="67" cy="65" r="8" fill="#ffffff" fillOpacity="0.8" />
      </svg>
    );
  }
  if (hour >= 15 && hour < 18) {
    // Afternoon/sunset
    return (
      <svg className={className} viewBox="0 0 100 100" fill="none">
        <circle cx="50" cy="45" r="18" fill="#f15c5d" />
        <path d="M14 62 H86" stroke="#ffffff" strokeOpacity="0.4" strokeWidth="3" strokeLinecap="round" />
        <path d="M20 72 H80" stroke="#ffffff" strokeOpacity="0.25" strokeWidth="3" strokeLinecap="round" />
        <path d="M40 90 L40 76 Q50 70 60 76 L60 90 Z" fill="#ffffff" />
      </svg>
    );
  }
  // Night — moon and stars
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none">
      <path d="M62 20 A24 24 0 1 0 62 68 A19 19 0 1 1 62 20 Z" fill="#f4d47c" />
      <g fill="#ffffff">
        <circle cx="24" cy="24" r="2" />
        <circle cx="18" cy="42" r="1.5" />
        <circle cx="32" cy="52" r="1.5" />
        <circle cx="14" cy="60" r="1.5" />
      </g>
      <rect x="24" y="78" width="52" height="7" rx="3" fill="#ffffff" fillOpacity="0.25" />
    </svg>
  );
}
