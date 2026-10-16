import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Badge, Button } from './ui';
import { Icon } from './Icon';

export const CAGAYAN_DISTRICTS: Record<string, readonly string[]> = {
  'District 1': [
    'Alcala',
    'Amulung',
    'Aparri',
    'Baggao',
    'Buguey',
    'Camalaniugan',
    'Gattaran',
    'Gonzaga',
    'Lal-lo',
    'Santa Ana',
    'Santa Teresita',
  ],
  'District 2': [
    'Abulug',
    'Allacapan',
    'Ballesteros',
    'Calayan',
    'Claveria',
    'Lasam',
    'Pamplona',
    'Piat',
    'Rizal',
    'Sanchez-Mira',
    'Santa Praxedes',
    'Santo Niño',
  ],
  'District 3': [
    'Enrile',
    'Iguig',
    'Peñablanca',
    'Solana',
    'Tuao',
    'Tuguegarao City',
  ],
} as const;

export const CAGAYAN_MUNICIPALITIES: readonly string[] = Object.values(CAGAYAN_DISTRICTS).flat().sort();

export function getDistrict(municipality: string): string {
  for (const [district, list] of Object.entries(CAGAYAN_DISTRICTS)) {
    if (list.includes(municipality)) {
      return district;
    }
  }
  return 'Unknown';
}

function IndeterminateCheckbox({
  checked,
  indeterminate,
  onChange,
  disabled,
  'aria-label': ariaLabel,
}: {
  checked: boolean;
  indeterminate: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  'aria-label'?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={onChange}
      aria-label={ariaLabel}
    />
  );
}

function getBadgeLabel(selected: string[], districts: Record<string, readonly string[]>, all: readonly string[]): string {
  if (selected.length === all.length && all.length > 0) {
    return `All Municipalities (${all.length})`;
  }
  if (selected.length === 0) {
    return '0 selected';
  }
  for (const [districtName, list] of Object.entries(districts)) {
    const districtLgus = list.filter((m) => all.includes(m));
    if (
      districtLgus.length > 0 &&
      selected.length === districtLgus.length &&
      districtLgus.every((m) => selected.includes(m))
    ) {
      return `${districtName} (${districtLgus.length})`;
    }
  }
  return `${selected.length} selected`;
}

export interface MunicipalityFilterProps {
  value: string[];
  onChange: (next: string[]) => void;
  availableMunicipalities?: readonly string[] | string[];
}

export function MunicipalityFilter({
  value,
  onChange,
  availableMunicipalities = CAGAYAN_MUNICIPALITIES,
}: MunicipalityFilterProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [collapsedDistricts, setCollapsedDistricts] = useState<Record<string, boolean>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchId = useId();

  const availableSet = useMemo(() => new Set(availableMunicipalities), [availableMunicipalities]);

  const activeDistricts = useMemo(() => {
    const entries: { district: string; municipalities: string[] }[] = [];
    for (const [district, list] of Object.entries(CAGAYAN_DISTRICTS)) {
      const lgus = list.filter((m) => availableSet.has(m));
      if (lgus.length > 0) {
        entries.push({ district, municipalities: lgus });
      }
    }
    return entries;
  }, [availableSet]);

  const allAvailable = useMemo(() => activeDistricts.flatMap((d) => d.municipalities), [activeDistricts]);

  // Handle click outside, focusout & Escape key
  useEffect(() => {
    if (!open) return;
    const container = containerRef.current;
    if (!container) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (container && !container.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setSearch('');
        triggerRef.current?.focus();
      }
    };
    const handleFocusOut = (e: FocusEvent) => {
      if (container && !container.contains(e.relatedTarget as Node)) {
        setOpen(false);
        setSearch('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    container.addEventListener('focusout', handleFocusOut);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      container.removeEventListener('focusout', handleFocusOut);
    };
  }, [open]);

  const isSearching = search.trim().length > 0;

  const filteredDistricts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return activeDistricts;
    return activeDistricts
      .map((d) => ({
        ...d,
        municipalities: d.municipalities.filter((m) => m.toLowerCase().includes(q)),
      }))
      .filter((d) => d.municipalities.length > 0);
  }, [activeDistricts, search]);

  const allFiltered = useMemo(() => filteredDistricts.flatMap((d) => d.municipalities), [filteredDistricts]);

  const toggleMuni = (m: string) => {
    if (value.includes(m)) {
      onChange(value.filter((v) => v !== m));
    } else {
      onChange([...value, m]);
    }
  };

  const toggleDistrict = (targetLgus: string[]) => {
    const allSelected = targetLgus.every((m) => value.includes(m));
    if (allSelected) {
      onChange(value.filter((m) => !targetLgus.includes(m)));
    } else {
      const merged = new Set([...value, ...targetLgus]);
      onChange(Array.from(merged));
    }
  };

  const handleSelectAll = () => {
    if (isSearching) {
      onChange(Array.from(new Set([...value, ...allFiltered])));
    } else {
      onChange([...allAvailable]);
    }
  };

  const handleClearAll = () => {
    if (isSearching) {
      onChange(value.filter((m) => !allFiltered.includes(m)));
    } else {
      onChange([]);
    }
  };

  const toggleCollapse = (district: string) => {
    setCollapsedDistricts((prev) => ({
      ...prev,
      [district]: !prev[district],
    }));
  };

  const handleToggleOpen = () => {
    setOpen((prev) => {
      if (prev) {
        setSearch('');
      }
      return !prev;
    });
  };

  const badgeLabel = getBadgeLabel(value, CAGAYAN_DISTRICTS, allAvailable);
  const isAllSelected = value.length === allAvailable.length && allAvailable.length > 0;

  return (
    <div className="muni-filter-wrap" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        className={`btn btn-secondary muni-filter-trigger ${open ? 'active' : ''}`}
        onClick={handleToggleOpen}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Icon name="map-point" size={16} />
        <span>Municipalities</span>
        <Badge tone={isAllSelected ? 'neutral' : value.length === 0 ? 'warn' : 'info'}>
          {badgeLabel}
        </Badge>
        <span className={`muni-arrow ${open ? 'muni-arrow-up' : ''}`} aria-hidden="true">
          ▾
        </span>
      </button>

      {open ? (
        <div className="muni-filter-popover" role="dialog" aria-label="Filter municipalities and districts">
          <div className="muni-filter-header">
            <span className="muni-filter-title">Filter by Location</span>
            <div className="muni-filter-actions">
              <Button variant="quiet" className="btn-sm" onClick={handleSelectAll}>
                {isSearching ? 'Select Matching' : 'Select All'}
              </Button>
              <Button variant="quiet" className="btn-sm" onClick={handleClearAll}>
                {isSearching ? 'Clear Matching' : 'Clear All'}
              </Button>
            </div>
          </div>

          <div className="muni-search-wrap">
            <input
              id={searchId}
              className="input muni-search-input"
              type="search"
              placeholder="Search 29 LGUs…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search municipalities"
              autoFocus
            />
          </div>

          <div className="muni-filter-body">
            {filteredDistricts.length === 0 ? (
              <p className="muted small center-text">No municipalities match "{search}".</p>
            ) : (
              filteredDistricts.map(({ district, municipalities }) => {
                const totalInDistrict = CAGAYAN_DISTRICTS[district]?.filter((m) => availableSet.has(m)) ?? [];
                const targetLgus = isSearching ? municipalities : totalInDistrict;
                const selectedInTarget = targetLgus.filter((m) => value.includes(m));
                const allSelected = targetLgus.length > 0 && selectedInTarget.length === targetLgus.length;
                const someSelected = selectedInTarget.length > 0;
                const isIndeterminate = someSelected && !allSelected;
                const isCollapsed = !isSearching && !!collapsedDistricts[district];

                return (
                  <div key={district} className="muni-district-group">
                    <div className="muni-district-header">
                      <label className="muni-district-title">
                        <IndeterminateCheckbox
                          checked={allSelected}
                          indeterminate={isIndeterminate}
                          onChange={() => toggleDistrict(targetLgus)}
                          aria-label={`Select ${isSearching ? 'matching' : 'all'} LGUs in ${district}`}
                        />
                        <span>{district}</span>
                        <span className="muted small">
                          ({selectedInTarget.length}/{targetLgus.length}
                          {isSearching ? ' matching' : ''})
                        </span>
                      </label>
                      <button
                        type="button"
                        className="muni-district-toggle"
                        onClick={() => toggleCollapse(district)}
                        aria-expanded={!isCollapsed}
                        aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} ${district}`}
                      >
                        {isCollapsed ? 'Show LGUs ▾' : 'Hide LGUs ▴'}
                      </button>
                    </div>

                    {!isCollapsed ? (
                      <div className="muni-district-list">
                        {municipalities.map((m) => (
                          <label key={m} className="check">
                            <input
                              type="checkbox"
                              checked={value.includes(m)}
                              onChange={() => toggleMuni(m)}
                            />
                            <span>{m}</span>
                          </label>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
