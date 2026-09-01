/** Brand-matched illustrations for each announcement type — same organic-
 * blob + flat-shape language as the login page and the teacher "Hari Ini"
 * empty state (WelcomeIllustration / RelaxIllustration), dialed up with
 * gradients + soft shadow so a pengumuman reads as a designed product
 * moment, not a bolted-on banner ad. Each ships a `<defs>` block, so every
 * instance on a page needs a unique id suffix — pass `uid` when more than
 * one of the same type could render at once (banner list + popup). */

function useIds(uid: string) {
  return {
    blob: `blob-${uid}`,
    badge: `badge-${uid}`,
    shadow: `shadow-${uid}`,
    ring: `ring-${uid}`,
  };
}

export function InfoIllustration({ className, uid = "info" }: { className?: string; uid?: string }) {
  const id = useIds(uid);
  return (
    <svg className={className} viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id={id.blob} cx="50%" cy="42%" r="65%">
          <stop offset="0%" stopColor="#6b83c9" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#4b60ac" stopOpacity="0.05" />
        </radialGradient>
        <linearGradient id={id.badge} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6b83c9" />
          <stop offset="100%" stopColor="#3d4f92" />
        </linearGradient>
        <filter id={id.shadow} x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="6" stdDeviation="7" floodColor="#4b60ac" floodOpacity="0.22" />
        </filter>
      </defs>

      <path
        fill={`url(#${id.blob})`}
        d="M84.5,-38.4C103.5,-15.3,103.7,20.3,86.6,45.6C69.5,70.9,35.1,85.9,3.6,83.8C-27.9,81.7,-56.5,62.5,-72.9,35.6C-89.3,8.7,-93.5,-25.9,-77.3,-49.9C-61.1,-73.9,-24.5,-87.3,7.2,-88.4C38.9,-89.5,65.5,-61.5,84.5,-38.4Z"
        transform="translate(80 78) scale(0.72)"
      />

      <g filter={`url(#${id.shadow})`}>
        <rect x="42" y="48" width="76" height="56" rx="16" fill="#ffffff" />
      </g>
      <rect x="42" y="48" width="76" height="56" rx="16" fill="none" stroke="#4b60ac" strokeOpacity="0.12" />

      <circle cx="80" cy="72" r="13" fill={`url(#${id.badge})`} />
      <path d="M80 66 v9 M80 79.5 v0.6" stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round" />

      <rect x="54" y="90" width="34" height="4.5" rx="2.25" fill="#4b60ac" fillOpacity="0.16" />
      <rect x="54" y="98" width="22" height="4.5" rx="2.25" fill="#4b60ac" fillOpacity="0.16" />

      <path d="M118 62 L131 52" stroke="#4b60ac" strokeOpacity="0.25" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M28 108 L18 116" stroke="#eda100" strokeOpacity="0.4" strokeWidth="3" strokeLinecap="round" />

      <g fill="#eda100">
        <circle cx="126" cy="38" r="3.4" />
        <circle cx="30" cy="46" r="2.4" />
      </g>
      <g fill="#f15c5d">
        <circle cx="122" cy="112" r="2.6" />
      </g>
    </svg>
  );
}

export function SuccessIllustration({ className, uid = "success" }: { className?: string; uid?: string }) {
  const id = useIds(uid);
  return (
    <svg className={className} viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id={id.blob} cx="50%" cy="42%" r="65%">
          <stop offset="0%" stopColor="#2fd39a" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#1baf7a" stopOpacity="0.05" />
        </radialGradient>
        <linearGradient id={id.badge} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2fd39a" />
          <stop offset="100%" stopColor="#149463" />
        </linearGradient>
        <filter id={id.shadow} x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="7" stdDeviation="8" floodColor="#1baf7a" floodOpacity="0.3" />
        </filter>
      </defs>

      <path
        fill={`url(#${id.blob})`}
        d="M81.6,-34.5C100.9,-13.8,98.5,20.4,80.2,42.9C61.9,65.4,27.9,76.2,-4.4,74.9C-36.8,73.6,-67.6,60.2,-80.4,35.7C-93.3,11.2,-88.2,-24.4,-70.5,-47.1C-52.8,-69.8,-22.4,-79.5,4.1,-79.9C30.6,-80.4,62.3,-55.2,81.6,-34.5Z"
        transform="translate(80 78) scale(0.72)"
      />

      <circle cx="80" cy="70" r="7" fill="none" stroke="#1baf7a" strokeOpacity="0.15" strokeWidth="14" />

      <g filter={`url(#${id.shadow})`}>
        <circle cx="80" cy="70" r="30" fill={`url(#${id.badge})`} />
      </g>
      <path
        d="M67 70 L76 79 L94 59"
        stroke="#ffffff"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      <path d="M64 96 L54 114 L69 108 L80 120 L91 108 L106 114 L96 96 Z" fill="#1baf7a" fillOpacity="0.28" />

      <g fill="#eda100">
        <circle cx="122" cy="46" r="3.6" />
        <circle cx="24" cy="56" r="2.6" />
        <circle cx="114" cy="106" r="2.6" />
      </g>
      <g fill="#f15c5d">
        <circle cx="30" cy="98" r="3" />
      </g>
      <g fill="#4b60ac">
        <circle cx="118" cy="86" r="2.2" />
      </g>
    </svg>
  );
}

export function CelebrationIllustration({ className, uid = "celebration" }: { className?: string; uid?: string }) {
  const id = useIds(uid);
  return (
    <svg className={className} viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id={id.blob} cx="50%" cy="40%" r="65%">
          <stop offset="0%" stopColor="#f68789" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#f15c5d" stopOpacity="0.05" />
        </radialGradient>
        <linearGradient id={id.badge} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f68789" />
          <stop offset="100%" stopColor="#e14446" />
        </linearGradient>
        <linearGradient id={id.ring} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ffc94d" />
          <stop offset="100%" stopColor="#eda100" />
        </linearGradient>
        <filter id={id.shadow} x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="7" stdDeviation="7" floodColor="#c94647" floodOpacity="0.25" />
        </filter>
      </defs>

      <path
        fill={`url(#${id.blob})`}
        d="M79.4,-31.2C101.9,-9.9,113.6,24.6,99.9,49C86.1,73.4,47,87.7,7.9,86.1C-31.1,84.5,-70.2,66.9,-84.9,37.4C-99.6,7.9,-89.9,-33.6,-65.5,-56.1C-41.1,-78.6,-2,-82.1,25.5,-70.9C53,-59.7,56.9,-52.5,79.4,-31.2Z"
        transform="translate(80 80) scale(0.72)"
      />

      <g filter={`url(#${id.shadow})`}>
        <rect x="56" y="78" width="40" height="34" rx="5" fill={`url(#${id.badge})`} />
      </g>
      <rect x="48" y="66" width="56" height="16" rx="5" fill={`url(#${id.ring})`} />
      <rect x="72" y="66" width="10" height="46" fill="#ffffff" fillOpacity="0.4" />
      <path
        d="M76 66 C60 52 62 36 76 28 C68 42 70 54 76 66 Z"
        fill={`url(#${id.ring})`}
      />

      <g strokeLinecap="round">
        <rect x="24" y="36" width="7" height="7" rx="1.6" fill="#4b60ac" transform="rotate(18 27.5 39.5)" />
        <rect x="116" y="30" width="7" height="7" rx="1.6" fill="#1baf7a" transform="rotate(-12 119.5 33.5)" />
        <circle cx="34" cy="66" r="3.6" fill="#eda100" />
        <circle cx="122" cy="62" r="3.4" fill="#4b60ac" />
        <rect x="108" y="88" width="6" height="6" rx="1.4" fill="#f15c5d" transform="rotate(24 111 91)" />
        <circle cx="24" cy="94" r="3" fill="#1baf7a" />
        <path d="M40 108 q4 6 10 4" stroke="#eda100" strokeWidth="2.4" fill="none" />
        <path d="M120 104 q-4 6 -10 5" stroke="#4b60ac" strokeWidth="2.4" fill="none" opacity="0.6" />
      </g>
    </svg>
  );
}

export function MaintenanceIllustration({ className, uid = "maintenance" }: { className?: string; uid?: string }) {
  const id = useIds(uid);
  return (
    <svg className={className} viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id={id.blob} cx="50%" cy="42%" r="65%">
          <stop offset="0%" stopColor="#ffc94d" stopOpacity="0.24" />
          <stop offset="100%" stopColor="#eda100" stopOpacity="0.06" />
        </radialGradient>
        <linearGradient id={id.badge} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffc94d" />
          <stop offset="100%" stopColor="#c97f00" />
        </linearGradient>
        <filter id={id.shadow} x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="6" stdDeviation="7" floodColor="#a3730a" floodOpacity="0.25" />
        </filter>
      </defs>

      <path
        fill={`url(#${id.blob})`}
        d="M83.4,-36.3C104.6,-15.7,110.6,20.9,94.9,47.4C79.2,73.9,41.8,90.3,4.7,88.4C-32.4,86.5,-64.7,66.3,-79.7,36.2C-94.6,6.1,-92.1,-33.9,-70.9,-58.1C-49.7,-82.3,-9.7,-90.6,20.9,-84.6C51.5,-78.6,62.2,-56.9,83.4,-36.3Z"
        transform="translate(80 80) scale(0.72)"
      />

      <g filter={`url(#${id.shadow})`}>
        <circle cx="62" cy="90" r="19" fill="none" stroke={`url(#${id.badge})`} strokeWidth="8" />
      </g>
      <circle cx="62" cy="90" r="4.5" fill="#eda100" />
      <rect x="57" y="60" width="10" height="17" rx="2.5" fill={`url(#${id.badge})`} />
      <rect x="46" y="65" width="8" height="9" rx="2" fill={`url(#${id.badge})`} transform="rotate(-30 50 69.5)" />
      <rect x="70" y="65" width="8" height="9" rx="2" fill={`url(#${id.badge})`} transform="rotate(30 74 69.5)" />

      <g transform="translate(88 42) rotate(18)">
        <path
          d="M0 12 c7 -8 20 -8 27 0 l-9 3.5 l5 5 l-3.5 9 l-5 -5 l-3.5 9 c-7 -8 -7 -20 0 -27 Z"
          fill="#4b60ac"
          fillOpacity="0.85"
        />
      </g>

      <g stroke="#eda100" strokeWidth="2.8" strokeLinecap="round">
        <path d="M114 36 l7 -7" />
        <path d="M124 48 l9 -2.5" />
        <path d="M114 60 l8 6" />
      </g>
      <g fill="#f15c5d">
        <circle cx="30" cy="52" r="2.8" />
      </g>
    </svg>
  );
}
