// frontend/src/components/Flags.jsx
import React from 'react';

// 🔥 PRAVA HRVATSKA ZASTAVA
export const HrFlag = ({ className = "w-5 h-5 rounded-sm" }) => (
  <svg className={className} viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
    <rect width="800" height="600" fill="#ffffff"/>
    <rect y="0" width="800" height="200" fill="#e32636"/>
    <rect y="400" width="800" height="200" fill="#172b5b"/>
    
    {/* ŠAHOVNICA */}
    <g transform="translate(400, 300) scale(0.8)">
      <rect x="-50" y="-55" width="100" height="110" fill="#ffffff" stroke="#e32636" strokeWidth="2"/>
      
      {/* Red 1 - crveno počinje */}
      <rect x="-45" y="-50" width="22.5" height="27.5" fill="#e32636"/>
      <rect x="-22.5" y="-50" width="22.5" height="27.5" fill="#ffffff"/>
      <rect x="0" y="-50" width="22.5" height="27.5" fill="#e32636"/>
      <rect x="22.5" y="-50" width="22.5" height="27.5" fill="#ffffff"/>
      
      {/* Red 2 - bijelo počinje */}
      <rect x="-45" y="-22.5" width="22.5" height="27.5" fill="#ffffff"/>
      <rect x="-22.5" y="-22.5" width="22.5" height="27.5" fill="#e32636"/>
      <rect x="0" y="-22.5" width="22.5" height="27.5" fill="#ffffff"/>
      <rect x="22.5" y="-22.5" width="22.5" height="27.5" fill="#e32636"/>
      
      {/* Red 3 - crveno počinje */}
      <rect x="-45" y="5" width="22.5" height="27.5" fill="#e32636"/>
      <rect x="-22.5" y="5" width="22.5" height="27.5" fill="#ffffff"/>
      <rect x="0" y="5" width="22.5" height="27.5" fill="#e32636"/>
      <rect x="22.5" y="5" width="22.5" height="27.5" fill="#ffffff"/>
      
      {/* Red 4 - bijelo počinje */}
      <rect x="-45" y="32.5" width="22.5" height="27.5" fill="#ffffff"/>
      <rect x="-22.5" y="32.5" width="22.5" height="27.5" fill="#e32636"/>
      <rect x="0" y="32.5" width="22.5" height="27.5" fill="#ffffff"/>
      <rect x="22.5" y="32.5" width="22.5" height="27.5" fill="#e32636"/>
    </g>
  </svg>
);

// 🔥 ENGLESKA ZASTAVA
export const EnFlag = ({ className = "w-5 h-5 rounded-sm" }) => (
  <svg className={className} viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
    <rect width="800" height="600" fill="#ffffff"/>
    <rect x="360" y="0" width="80" height="600" fill="#e32636"/>
    <rect x="0" y="260" width="800" height="80" fill="#e32636"/>
  </svg>
);

// 🔥 NJEMAČKA ZASTAVA
export const DeFlag = ({ className = "w-5 h-5 rounded-sm" }) => (
  <svg className={className} viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
    <rect y="0" width="800" height="200" fill="#000000"/>
    <rect y="200" width="800" height="200" fill="#dd0000"/>
    <rect y="400" width="800" height="200" fill="#ffce00"/>
  </svg>
);