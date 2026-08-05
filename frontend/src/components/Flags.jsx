// frontend/src/components/Flags.jsx
import React from 'react';

// 🔥 HRVATSKA ZASTAVA
export const HrFlag = ({ className = "w-5 h-5 rounded-sm" }) => (
  <svg className={className} viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
    <rect width="800" height="600" fill="#ffffff" />
    <rect y="0" width="800" height="200" fill="#e32636" />
    <rect y="400" width="800" height="200" fill="#172b5b" />
    <g transform="translate(400,300)">
      {/* Grb - pojednostavljen */}
      <rect x="-40" y="-50" width="80" height="100" fill="#ffffff" stroke="#e32636" strokeWidth="2"/>
      <rect x="-35" y="-45" width="70" height="90" fill="#e32636" stroke="#172b5b" strokeWidth="1"/>
      {/* Polja na grbu */}
      <rect x="-35" y="-45" width="23" height="30" fill="#ffffff"/>
      <rect x="-12" y="-45" width="23" height="30" fill="#172b5b"/>
      <rect x="12" y="-45" width="23" height="30" fill="#e32636"/>
      <rect x="-35" y="-15" width="23" height="30" fill="#172b5b"/>
      <rect x="-12" y="-15" width="23" height="30" fill="#e32636"/>
      <rect x="12" y="-15" width="23" height="30" fill="#ffffff"/>
      <rect x="-35" y="15" width="23" height="30" fill="#e32636"/>
      <rect x="-12" y="15" width="23" height="30" fill="#ffffff"/>
      <rect x="12" y="15" width="23" height="30" fill="#172b5b"/>
      {/* Šahovnica u sredini */}
      <rect x="-12" y="15" width="23" height="15" fill="#172b5b"/>
      <rect x="12" y="-15" width="23" height="15" fill="#e32636"/>
    </g>
  </svg>
);

// 🔥 ENGLESKA ZASTAVA
export const EnFlag = ({ className = "w-5 h-5 rounded-sm" }) => (
  <svg className={className} viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
    <rect width="800" height="600" fill="#ffffff"/>
    <rect x="360" y="0" width="80" height="600" fill="#e32636"/>
    <rect x="0" y="260" width="800" height="80" fill="#e32636"/>
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

// 🔥 BOSANSKA ZASTAVA (AKO TREBA)
export const BaFlag = ({ className = "w-5 h-5 rounded-sm" }) => (
  <svg className={className} viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
    <rect width="800" height="600" fill="#002395"/>
    <rect y="200" width="800" height="200" fill="#f9e300"/>
    <rect y="400" width="800" height="200" fill="#c10023"/>
    <polygon points="0,0 400,300 0,600" fill="#f9e300" opacity="0.3"/>
    <circle cx="400" cy="300" r="60" fill="#ffffff"/>
    <polygon points="400,240 415,285 460,285 425,310 435,355 400,330 365,355 375,310 340,285 385,285" fill="#f9e300"/>
  </svg>
);

// 🔥 SRPSKA ZASTAVA (AKO TREBA)
export const SrFlag = ({ className = "w-5 h-5 rounded-sm" }) => (
  <svg className={className} viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
    <rect y="0" width="800" height="200" fill="#c10023"/>
    <rect y="200" width="800" height="200" fill="#ffffff"/>
    <rect y="400" width="800" height="200" fill="#172b5b"/>
    <g transform="translate(400,300)">
      <circle cx="0" cy="0" r="50" fill="#ffffff" stroke="#c10023" strokeWidth="3"/>
      <polygon points="0,-35 10,-15 35,-15 15,-5 20,15 0,5 -20,15 -15,-5 -35,-15 -10,-15" fill="#c10023"/>
    </g>
  </svg>
);