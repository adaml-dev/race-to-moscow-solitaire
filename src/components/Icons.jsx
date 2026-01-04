import React from 'react';

// Styl bazowy dla wszystkich ikon
const iconStyle = { display: 'inline-block', verticalAlign: 'middle' };

export const TruckIcon = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={iconStyle}>
    <rect x="1" y="8" width="14" height="10" rx="1"/>
    <path d="M15 8v10h4l2-3v-4h-6z"/>
    <circle cx="5.5" cy="18" r="2"/>
    <circle cx="18.5" cy="18" r="2"/>
  </svg>
);

export const TrainIcon = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={iconStyle}>
    <rect x="4" y="4" width="16" height="14" rx="2"/>
    <path d="M4 11h16"/>
    <circle cx="9" cy="16" r="1" fill={color}/>
    <circle cx="15" cy="16" r="1" fill={color}/>
    <path d="M2 19l2-2"/>
    <path d="M20 19l2-2"/>
    <rect x="8" y="6" width="3" height="3" fill={color}/>
    <rect x="13" y="6" width="3" height="3" fill={color}/>
  </svg>
);

export const TankIcon = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={iconStyle}>
    <rect x="2" y="12" width="18" height="5" rx="1"/>
    <path d="M2 14h18"/>
    <rect x="8" y="8" width="10" height="4" rx="1"/>
    <line x1="18" y1="10" x2="22" y2="8"/>
    <circle cx="6" cy="17" r="1.5" fill={color}/>
    <circle cx="12" cy="17" r="1.5" fill={color}/>
    <circle cx="16" cy="17" r="1.5" fill={color}/>
  </svg>
);

export const AmmoIcon = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={iconStyle}>
    <path d="M12 2L4 8v8l8 6 8-6V8z" fill={color} fillOpacity="0.2"/>
    <path d="M12 2L4 8v8l8 6 8-6V8z"/>
    <path d="M12 8v8"/>
    <path d="M8 10l8 4"/>
    <path d="M8 14l8-4"/>
  </svg>
);

export const FuelIcon = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={iconStyle}>
    <rect x="6" y="4" width="10" height="16" rx="2"/>
    <rect x="6" y="4" width="10" height="7" fill={color} fillOpacity="0.3"/>
    <path d="M16 8h2a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2"/>
    <line x1="9" y1="20" x2="13" y2="20"/>
    <circle cx="18" cy="6" r="1" fill={color}/>
  </svg>
);

export const FoodIcon = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={iconStyle}>
    <path d="M6 4C6 4 4 7 4 11c0 2.5 2 4 4 4h8c2 0 4-1.5 4-4 0-4-2-7-2-7" fill={color} fillOpacity="0.2"/>
    <path d="M6 4C6 4 4 7 4 11c0 2.5 2 4 4 4h8c2 0 4-1.5 4-4 0-4-2-7-2-7"/>
    <path d="M8 15v4a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-4"/>
    <line x1="8" y1="7" x2="8" y2="9"/>
    <line x1="12" y1="6" x2="12" y2="8"/>
    <line x1="16" y1="7" x2="16" y2="9"/>
  </svg>
);

export const MedalIcon = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={iconStyle}>
    <circle cx="12" cy="15" r="6" fill={color} fillOpacity="0.2"/>
    <circle cx="12" cy="15" r="6"/>
    <path d="M12 9l1.5 3 3.5.5-2.5 2.5.5 3.5-3-1.5-3 1.5.5-3.5L7 13l3.5-.5z" fill={color}/>
    <path d="M8.5 9L7 3l5 2 5-2-1.5 6"/>
  </svg>
);

export const HaltIcon = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={iconStyle}>
    <polygon points="12 2 2 7 12 12 22 7 12 2" fill={color} fillOpacity="0.3"/>
    <path d="M12 2L2 7l10 5 10-5z"/>
    <path d="M2 17l10 5 10-5"/>
    <path d="M2 12l10 5 10-5"/>
  </svg>
);

export const SovietIcon = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={iconStyle}>
    <path d="M12 2l1.5 4.5h4.5l-3.5 3 1.5 4.5-4-3-4 3 1.5-4.5-3.5-3h4.5z"/>
    <path d="M8 14h8v2H8z"/>
    <rect x="10.5" y="16" width="3" height="6"/>
    <path d="M7 18h10v1.5H7z"/>
  </svg>
);

export const FortIcon = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={iconStyle}>
    <path d="M3 21h18"/>
    <path d="M5 21V9l2-2 2 2 2-2 2 2 2-2 2 2v12"/>
    <rect x="9" y="13" width="6" height="8" fill={color} fillOpacity="0.2"/>
    <rect x="11" y="15" width="2" height="3"/>
  </svg>
);

export const VictoryIcon = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={iconStyle}>
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
  </svg>
);

export const CombatIcon = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={iconStyle}>
    <path d="M14.5 3L21 9.5 12 18.5 5.5 12 14.5 3z"/>
    <line x1="8.5" y1="8.5" x2="15.5" y2="15.5"/>
    <circle cx="18" cy="6" r="3" fill={color} fillOpacity="0.3"/>
    <circle cx="6" cy="18" r="3" fill={color} fillOpacity="0.3"/>
  </svg>
);

export const SupplyBoxIcon = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={iconStyle}>
    <path d="M12 2l8 4v6.5c0 4.5-3.5 8-8 10.5-4.5-2.5-8-6-8-10.5V6z" fill={color} fillOpacity="0.2"/>
    <path d="M12 2l8 4v6.5c0 4.5-3.5 8-8 10.5-4.5-2.5-8-6-8-10.5V6z"/>
    <line x1="12" y1="8" x2="12" y2="14"/>
    <line x1="9" y1="11" x2="15" y2="11"/>
  </svg>
);

export const ArrowDownIcon = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={iconStyle}>
    <line x1="12" y1="5" x2="12" y2="19"/>
    <polyline points="19 12 12 19 5 12"/>
  </svg>
);

export const ArrowUpIcon = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={iconStyle}>
    <line x1="12" y1="19" x2="12" y2="5"/>
    <polyline points="5 12 12 5 19 12"/>
  </svg>
);

export const ArrowRightIcon = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={iconStyle}>
    <line x1="5" y1="12" x2="19" y2="12"/>
    <polyline points="12 5 19 12 12 19"/>
  </svg>
);

export const HandIcon = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={iconStyle}>
    <path d="M21.72 9.03C21.05 7.64 19.53 7 18 7h-2.69l.95-4.58c.1-1.3-1.04-2.42-2.34-2.42-1.34 0-2.42 1.08-2.42 2.42l-.24 1.15-3.3 3.3c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0l3-3V19c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2v-8c0-.69-.28-1.32-.78-1.97zM3 21h4V9H3v12z"/>
  </svg>
);

export const ToolIcon = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={iconStyle}>
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
  </svg>
);
