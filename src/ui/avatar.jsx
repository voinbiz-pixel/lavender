import React from 'react'
import { LEAF, SWATCH } from './leaves.js'

// A person's avatar: their leaf on their colour, in a raised circle.
export function Avatar({ avatar, size = 88, raised = true, style }) {
  const leaf = LEAF[avatar?.leaf] || LEAF.bud
  const sw = SWATCH[avatar?.color] || SWATCH.lavender
  return (
    <span aria-hidden style={{ width: size, height: size, borderRadius: size / 2, display: 'grid', placeItems: 'center', flex: 'none', background: sw.bg, boxShadow: raised ? `${-size / 14}px ${-size / 14}px ${size / 6}px var(--hi), ${size / 12}px ${size / 12}px ${size / 5.5}px var(--lo)` : 'none', transition: 'background-color 0.5s ease', ...style }}>
      <svg viewBox="0 0 256 256" width={size * 0.62} height={size * 0.62} style={{ display: 'block' }}>
        <path fill={sw.fg} fillRule="evenodd" d={leaf.d} style={{ transition: 'fill 0.5s ease' }} />
      </svg>
    </span>
  )
}
