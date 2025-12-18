import React from 'react';
import { LOGO_GRADIENT_ID } from '../constants';

export const Logo: React.FC<{ className?: string }> = ({ className = "w-16 h-16" }) => {
  return (
    <svg 
      className={className} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={LOGO_GRADIENT_ID} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FCD116" /> {/* Yellow */}
          <stop offset="50%" stopColor="#003893" /> {/* Blue */}
          <stop offset="100%" stopColor="#CE1126" /> {/* Red */}
        </linearGradient>
      </defs>
      
      {/* Newspaper Body - Glass effect outline with Gradient Fill opacity */}
      <path 
        d="M20 10H80C82.7614 10 85 12.2386 85 15V85C85 87.7614 82.7614 90 80 90H20C17.2386 90 15 87.7614 15 85V15C15 12.2386 17.2386 10 20 10Z" 
        fill={`url(#${LOGO_GRADIENT_ID})`} 
        fillOpacity="0.1"
        stroke={`url(#${LOGO_GRADIENT_ID})`} 
        strokeWidth="2"
      />

      {/* Headline Header */}
      <rect x="25" y="20" width="50" height="8" rx="2" fill={`url(#${LOGO_GRADIENT_ID})`} />

      {/* Image Placeholder on Newspaper */}
      <rect x="25" y="35" width="25" height="25" rx="2" fill={`url(#${LOGO_GRADIENT_ID})`} fillOpacity="0.8"/>

      {/* Text Lines */}
      <path d="M55 38H75" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <path d="M55 45H75" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <path d="M55 52H75" stroke="white" strokeWidth="2" strokeLinecap="round" />
      
      {/* Bottom Text Lines */}
      <path d="M25 70H75" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <path d="M25 78H75" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
};