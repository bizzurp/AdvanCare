// Solar Linear icons (480 Design, CC BY 4.0) — see src/assets/icons/ATTRIBUTION.md.
const sources = import.meta.glob('../assets/icons/*.svg', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

const icons: Record<string, string> = {};
for (const [path, svg] of Object.entries(sources)) icons[path.split('/').pop()!.replace('.svg', '')] = svg;

export type IconName =
  | 'alt-arrow-left'
  | 'calendar'
  | 'chart-square'
  | 'document-medicine'
  | 'stethoscope'
  | 'user-heart'
  | 'wallet'
  | 'alt-arrow-right'
  | 'check-circle'
  | 'document-text'
  | 'eye'
  | 'home-angle'
  | 'map-point'
  | 'menu-dots'
  | 'record-circle'
  | 'shield-check'
  | 'user-rounded'
  | 'users-group-rounded';

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return <span className="icon" style={{ width: size, height: size }} aria-hidden="true" dangerouslySetInnerHTML={{ __html: icons[name] ?? '' }} />;
}
