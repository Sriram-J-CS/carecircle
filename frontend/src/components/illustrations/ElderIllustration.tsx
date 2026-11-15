import React from 'react';

export const ElderIllustration: React.FC<{ className?: string }> = ({ className = 'w-64 h-64' }) => {
  return (
    <svg
      viewBox="0 0 320 320"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Illustration of an elder holding a health tablet"
      role="img"
    >
      {/* Background soft circle */}
      <circle cx="160" cy="160" r="140" fill="#E6F2EF" />
      {/* Warm accent background ring */}
      <circle cx="160" cy="160" r="120" stroke="#0F5C5A" strokeWidth="2" strokeDasharray="6 6" opacity="0.4" />

      {/* Elder Head */}
      <circle cx="160" cy="115" r="38" fill="#F1EBDF" stroke="#12302F" strokeWidth="3" />
      {/* Hair */}
      <path
        d="M130 115C130 95 142 80 160 80C178 80 190 95 190 115C186 100 174 95 160 95C146 95 134 100 130 115Z"
        fill="#A6B3B2"
        stroke="#12302F"
        strokeWidth="2.5"
      />
      {/* Glasses */}
      <circle cx="150" cy="116" r="10" stroke="#12302F" strokeWidth="2.5" fill="none" />
      <circle cx="170" cy="116" r="10" stroke="#12302F" strokeWidth="2.5" fill="none" />
      <line x1="160" y1="116" x2="160" y2="116" stroke="#12302F" strokeWidth="3" />
      {/* Smile */}
      <path d="M152 134C156 138 164 138 168 134" stroke="#12302F" strokeWidth="2.5" strokeLinecap="round" />

      {/* Body & Shawl */}
      <path
        d="M110 220C110 175 130 160 160 160C190 160 210 175 210 220L110 220Z"
        fill="#0F5C5A"
        stroke="#12302F"
        strokeWidth="3"
      />
      {/* Shawl fold */}
      <path
        d="M135 165L160 205L185 165"
        stroke="#E6F2EF"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Tablet held in hands */}
      <rect
        x="130"
        y="190"
        width="60"
        height="45"
        rx="6"
        fill="#FFFFFF"
        stroke="#12302F"
        strokeWidth="3"
      />
      {/* Heart on tablet screen */}
      <path
        d="M160 206C156 200 148 202 148 208C148 215 160 222 160 222C160 222 172 215 172 208C172 202 164 200 160 206Z"
        fill="#C8553D"
      />
      {/* Gentle hands */}
      <circle cx="128" cy="212" r="8" fill="#F1EBDF" stroke="#12302F" strokeWidth="2" />
      <circle cx="192" cy="212" r="8" fill="#F1EBDF" stroke="#12302F" strokeWidth="2" />
    </svg>
  );
};
