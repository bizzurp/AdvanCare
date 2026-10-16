// Solar Linear icons (480 Design, CC BY 4.0) — see src/assets/icons/ATTRIBUTION.md.
// Sources are local, trusted SVG files that use currentColor.
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

export function Icon({ name, size = 24, className = '' }: { name: IconName; size?: number; className?: string }) {
  return (
    <span
      className={`icon ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: icons[name] ?? '' }}
    />
  );
}
