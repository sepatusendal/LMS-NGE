/** Small brand-matched illustrations for each announcement type — same
 * organic-blob + flat-shape language as the login page and the teacher
 * "Hari Ini" empty state (see WelcomeIllustration / RelaxIllustration),
 * so a pengumuman card reads as part of the product, not a bolted-on
 * banner ad. */

export function InfoIllustration({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        fill="#4b60ac"
        fillOpacity="0.12"
        d="M79.5,-33.4C93.5,-15.3,93.7,17.3,78.6,39.6C63.5,61.9,33.1,73.9,4.6,71.8C-23.9,69.7,-50.5,53.5,-64.9,29.6C-79.3,5.7,-81.5,-25.9,-67.3,-45.9C-53.1,-65.9,-22.5,-74.3,4.2,-76.4C30.9,-78.5,65.5,-51.5,79.5,-33.4Z"
        transform="translate(70 70)"
      />
      <rect x="34" y="40" width="62" height="48" rx="12" fill="#ffffff" />
      <rect x="34" y="40" width="62" height="48" rx="12" stroke="#4b60ac" strokeOpacity="0.15" strokeWidth="2" />
      <circle cx="65" cy="60" r="9" fill="#4b60ac" />
      <path d="M65 55.5 v6 M65 65.2 v0.4" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
      <rect x="42" y="76" width="28" height="4" rx="2" fill="#4b60ac" fillOpacity="0.18" />
      <rect x="42" y="83" width="18" height="4" rx="2" fill="#4b60ac" fillOpacity="0.18" />
      <path d="M96 52 L106 45" stroke="#4b60ac" strokeOpacity="0.3" strokeWidth="3" strokeLinecap="round" />
      <g fill="#eda100">
        <circle cx="104" cy="34" r="3" />
        <circle cx="30" cy="94" r="2.4" />
      </g>
    </svg>
  );
}

export function SuccessIllustration({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        fill="#1baf7a"
        fillOpacity="0.12"
        d="M76.6,-30.5C88.9,-11.8,86.5,17.4,71.2,37.9C55.9,58.4,27.9,70.2,1.6,68.9C-24.8,67.6,-49.6,53.2,-63.4,31.7C-77.3,10.2,-80.2,-18.4,-67.5,-38.1C-54.8,-57.8,-27.4,-68.5,-0.9,-67.9C25.6,-67.4,64.3,-49.2,76.6,-30.5Z"
        transform="translate(70 70)"
      />
      <circle cx="70" cy="64" r="27" fill="#1baf7a" />
      <path
        d="M58 64 L67 73 L84 54"
        stroke="#ffffff"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path d="M55 88 L46 104 L60 99 L70 110 L80 99 L94 104 L85 88 Z" fill="#1baf7a" fillOpacity="0.35" />
      <g fill="#eda100">
        <circle cx="108" cy="46" r="3" />
        <circle cx="26" cy="52" r="2.4" />
        <circle cx="100" cy="96" r="2.4" />
      </g>
      <g fill="#f15c5d">
        <circle cx="32" cy="90" r="2.6" />
      </g>
    </svg>
  );
}

export function CelebrationIllustration({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        fill="#f15c5d"
        fillOpacity="0.12"
        d="M74.9,-27.9C92.7,-8.4,99.6,21.6,87.4,42.9C75.2,64.2,43.9,76.8,13.6,76.3C-16.7,75.9,-46,62.4,-61.9,39.6C-77.9,16.8,-80.5,-15.3,-67.1,-36.5C-53.7,-57.7,-24.4,-68.1,1.8,-68.8C28,-69.6,57.1,-47.4,74.9,-27.9Z"
        transform="translate(70 70)"
      />
      <rect x="52" y="68" width="36" height="32" rx="4" fill="#f15c5d" />
      <rect x="46" y="58" width="48" height="14" rx="4" fill="#eda100" />
      <rect x="66" y="58" width="8" height="42" fill="#ffffff" fillOpacity="0.55" />
      <path d="M70 58 C58 46 58 34 70 28 C64 40 66 50 70 58 Z" fill="#eda100" />
      <g strokeLinecap="round">
        <rect x="26" y="34" width="6" height="6" rx="1.5" fill="#4b60ac" transform="rotate(18 29 37)" />
        <rect x="102" y="30" width="6" height="6" rx="1.5" fill="#1baf7a" transform="rotate(-12 105 33)" />
        <circle cx="34" cy="60" r="3.2" fill="#eda100" />
        <circle cx="108" cy="58" r="3" fill="#4b60ac" />
        <rect x="96" y="78" width="5" height="5" rx="1.2" fill="#f15c5d" transform="rotate(24 98 80)" />
        <circle cx="24" cy="86" r="2.6" fill="#1baf7a" />
      </g>
    </svg>
  );
}

export function MaintenanceIllustration({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        fill="#eda100"
        fillOpacity="0.14"
        d="M78.3,-32.6C90.9,-13.3,90.9,17.6,76.4,38.6C61.9,59.6,32.9,70.7,4.7,68.9C-23.5,67.1,-47,52.4,-61.8,30.7C-76.6,9,-82.7,-19.7,-71.4,-40.1C-60.1,-60.5,-31.5,-72.6,-3,-72.1C25.5,-71.6,65.7,-51.9,78.3,-32.6Z"
        transform="translate(70 70)"
      />
      <circle cx="55" cy="80" r="16" fill="none" stroke="#eda100" strokeWidth="7" />
      <circle cx="55" cy="80" r="4" fill="#eda100" />
      <rect x="51" y="56" width="8" height="14" rx="2" fill="#eda100" />
      <rect x="43" y="60" width="6" height="8" rx="2" fill="#eda100" transform="rotate(-30 46 64)" />
      <rect x="61" y="60" width="6" height="8" rx="2" fill="#eda100" transform="rotate(30 64 64)" />
      <path
        d="M92 44 c6 -6 16 -6 22 0 l-7 3 l4 4 l-3 7 l-4 -4 l-3 7 c-6 -6 -6 -16 0 -22 Z"
        fill="#4b60ac"
        transform="translate(-5 24) rotate(20 92 60)"
      />
      <g stroke="#eda100" strokeWidth="2.5" strokeLinecap="round">
        <path d="M100 30 l6 -6" />
        <path d="M108 40 l8 -2" />
        <path d="M100 50 l7 5" />
      </g>
    </svg>
  );
}
