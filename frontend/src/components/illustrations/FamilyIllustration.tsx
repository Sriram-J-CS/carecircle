import React from 'react';

export const FamilyIllustration: React.FC<{ className?: string }> = ({ className = 'w-72 h-72' }) => {
  return (
    <svg
      viewBox="0 0 360 320"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Illustration of elder with family support circle"
      role="img"
    >
      {/* Background Soft Aura */}
      <circle cx="180" cy="160" r="140" fill="#F1EBDF" />
      <circle cx="180" cy="160" r="120" fill="#E6F2EF" opacity="0.8" />

      {/* Left relative (Daughter/Son) */}
      <circle cx="120" cy="130" r="28" fill="#FBF8F3" stroke="#12302F" strokeWidth="2.5" />
      <path
        d="M85 220C85 180 100 165 120 165C140 165 155 180 155 220"
        fill="#1E7F7B"
        stroke="#12302F"
        strokeWidth="2.5"
      />

      {/* Right relative (Doctor / Family Member) */}
      <circle cx="240" cy="130" r="28" fill="#FBF8F3" stroke="#12302F" strokeWidth="2.5" />
      <path
        d="M205 220C205 180 220 165 240 165C260 165 275 180 275 220"
        fill="#3F8F5B"
        stroke="#12302F"
        strokeWidth="2.5"
      />

      {/* Center Elder (Forefront) */}
      <circle cx="180" cy="145" r="32" fill="#F1EBDF" stroke="#12302F" strokeWidth="3" />
      {/* Hair */}
      <path
        d="M152 145C152 125 164 115 180 115C196 115 208 125 208 145C204 132 192 128 180 128C168 128 156 132 152 145Z"
        fill="#A6B3B2"
        stroke="#12302F"
        strokeWidth="2"
      />
      {/* Glasses */}
      <circle cx="172" cy="146" r="8" stroke="#12302F" strokeWidth="2" fill="none" />
      <circle cx="188" cy="146" r="8" stroke="#12302F" strokeWidth="2" fill="none" />
      <path d="M174 162C177 165 183 165 186 162" stroke="#12302F" strokeWidth="2" strokeLinecap="round" />

      {/* Elder Body */}
      <path
        d="M140 230C140 190 158 178 180 178C202 178 220 190 220 230"
        fill="#0F5C5A"
        stroke="#12302F"
        strokeWidth="3"
      />

      {/* Protective circle connection lines */}
      <path
        d="M120 195C140 205 160 208 180 208C200 208 220 205 240 195"
        stroke="#D9922B"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="4 4"
      />

      {/* Floating Heart */}
      <path
        d="M180 82C175 75 165 77 165 84C165 92 180 100 180 100C180 100 195 92 195 84C195 77 185 75 180 82Z"
        fill="#C8553D"
        stroke="#12302F"
        strokeWidth="1.5"
      />
    </svg>
  );
};
