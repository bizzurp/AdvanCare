import React from 'react';

// Solar Linear icons (480 Design, CC BY 4.0)
const sources = import.meta.glob('../assets/icons/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const icons: Record<string, string> = {};
for (const [path, svg] of Object.entries(sources)) {
  const name = path.split('/').pop()!.replace('.svg', '');
  icons[name] = svg;
}

export type IconName =
  | 'alt-arrow-down'
  | 'alt-arrow-left'
  | 'alt-arrow-right'
  | 'arrow-right'
  | 'bus'
  | 'calendar'
  | 'car'
  | 'camera'
  | 'chart-square'
  | 'chart'
  | 'chat-round-dots'
  | 'check-circle'
  | 'document-medicine'
  | 'document-text'
  | 'eye'
  | 'heart-pulse'
  | 'home-angle'
  | 'hospital'
  | 'jeepney'
  | 'map-point-hospital'
  | 'map-point'
  | 'medical-kit'
  | 'menu-dots'
  | 'phone'
  | 'pie-chart'
  | 'record-circle'
  | 'shield-check'
  | 'stethoscope'
  | 'transmission'
  | 'tricycle'
  | 'user-heart'
  | 'user-rounded'
  | 'users-group-rounded'
  | 'wi-fi-router';

interface IconProps {
  name: IconName | string;
  size?: number;
  className?: string;
  color?: string;
}

export const Icon: React.FC<IconProps> = ({ name, size = 24, className = '', color }) => {
  const svgHtml = icons[name];
  
  if (!svgHtml) {
    return (
      <span
        className={`icon-svg ${className}`}
        style={{ width: size, height: size, display: 'inline-block' }}
        aria-hidden="true"
      />
    );
  }

  return (
    <span
      className={`icon-svg ${className}`}
      style={{
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: color || 'currentColor',
      }}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: svgHtml }}
    />
  );
};
