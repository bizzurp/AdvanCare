import { useRef, useState } from 'react';
import { addDays, toDateInput } from '../screens/requestUtils';
import { Icon } from './Icon';
import { Button, TextField } from './ui';

function dayLabel(d: Date, i: number) {
  if (i === 0) return 'Today';
  if (i === 1) return 'Tomorrow';
  return d.toLocaleDateString('en-PH', { weekday: 'long' });
}

/** "Choose a day" — three nearest days plus an "Other date" picker. */
export function DayPicker({ value, onChange, startOffset = 0, label = 'Choose a day', error }: { value: string; onChange: (v: string) => void; startOffset?: number; label?: string; error?: string }) {
  const today = new Date();
  const days = [0, 1, 2].map((i) => addDays(today, i + startOffset));
  const isQuick = days.some((d) => toDateInput(d) === value);
  const [other, setOther] = useState(!isQuick && !!value);
  return (
    <div className="stack gap-12">
      <h2 className="t-section" id="day-h">
        {label}
      </h2>
      <div className="grid-3" role="radiogroup" aria-labelledby="day-h">
        {days.map((d, i) => {
          const v = toDateInput(d);
          return (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={value === v && !other}
              className="chip"
              style={{ minHeight: 56 }}
              onClick={() => {
                setOther(false);
                onChange(v);
              }}
            >
              <span className="sub">{dayLabel(d, i + startOffset)}</span>
              {`${d.getDate()} ${d.toLocaleDateString('en-PH', { month: 'short' })}`}
            </button>
          );
        })}
      </div>
      {other ? (
        <TextField label="Other date" type="date" min={toDateInput(addDays(today, startOffset))} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <button type="button" className="link-btn" onClick={() => setOther(true)}>
          Pick another date
        </button>
      )}
      {error && (
        <span className="field-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

export function TimePicker({
  slots,
  value,
  onChange,
  isDisabled,
  label = 'Available times',
  error,
}: {
  slots: string[];
  value: string;
  onChange: (v: string) => void;
  isDisabled?: (slot: string) => boolean;
  label?: string;
  error?: string;
}) {
  return (
    <div className="stack gap-12">
      <h2 className="t-section" id="time-h">
        {label}
      </h2>
      <div className="grid-3" role="radiogroup" aria-labelledby="time-h">
        {slots.map((s) => {
          const disabled = isDisabled?.(s) ?? false;
          return (
            <button key={s} type="button" role="radio" aria-checked={value === s} className="chip" disabled={disabled} onClick={() => onChange(s)} aria-label={disabled ? `${s}, unavailable` : s}>
              {s}
            </button>
          );
        })}
      </div>
      {error && (
        <span className="field-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

// ---------------- Attachment (25 / Attachment options) ----------------
export interface AttachmentMeta {
  name: string;
  size: number;
  type: string;
}

const IMAGE_TYPES = ['image/jpeg', 'image/png'];
const MAX_IMAGE = 5 * 1024 * 1024;
const MAX_PDF = 10 * 1024 * 1024;

/** In-memory file handles (not persisted); drafts store only metadata. */
export const attachmentFiles = new Map<string, File>();

export function validateAttachment(f: File, imagesOnly = false): string | null {
  const isImg = IMAGE_TYPES.includes(f.type);
  const isPdf = f.type === 'application/pdf';
  if (!isImg && !(isPdf && !imagesOnly)) return imagesOnly ? 'Choose a JPG or PNG photo.' : 'Choose a JPG, PNG, or PDF file.';
  if (isImg && f.size > MAX_IMAGE) return 'Photos must be 5 MB or smaller.';
  if (isPdf && f.size > MAX_PDF) return 'PDF files must be 10 MB or smaller.';
  return null;
}

export function AttachmentPicker({
  draftKey,
  value,
  onChange,
  imagesOnly = false,
  label,
}: {
  draftKey: string;
  value?: AttachmentMeta;
  onChange: (m?: AttachmentMeta) => void;
  imagesOnly?: boolean;
  label: string;
}) {
  const camera = useRef<HTMLInputElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const file = attachmentFiles.get(draftKey);
  const preview = file && IMAGE_TYPES.includes(file.type) ? URL.createObjectURL(file) : null;

  const accept = (files: FileList | null) => {
    const f = files?.[0];
    setOpen(false);
    if (!f) return; // cancelled — keep previous attachment
    const err = validateAttachment(f, imagesOnly);
    if (err) {
      setError(err);
      return;
    }
    setError('');
    attachmentFiles.set(draftKey, f);
    onChange({ name: f.name, size: f.size, type: f.type });
  };

  return (
    <div className="stack gap-12">
      <input ref={camera} type="file" accept="image/jpeg,image/png" capture="environment" hidden onChange={(e) => accept(e.target.files)} />
      <input ref={picker} type="file" accept={imagesOnly ? 'image/jpeg,image/png' : 'image/jpeg,image/png,application/pdf'} hidden onChange={(e) => accept(e.target.files)} />
      {value ? (
        <div className="card row gap-12">
          {preview ? (
            <img src={preview} alt="" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 10 }} onLoad={() => URL.revokeObjectURL(preview)} />
          ) : (
            <span className="icon-tile lg">
              <Icon name="document-text" />
            </span>
          )}
          <div className="grow">
            <div className="t-medium" style={{ overflowWrap: 'anywhere' }}>
              {value.name}
            </div>
            <div className="t-caption t-muted">
              {(value.size / 1024 / 1024).toFixed(1)} MB{!file ? ' · re-attach after reopening the app' : ''}
            </div>
          </div>
          <button
            type="button"
            className="link-btn"
            onClick={() => {
              attachmentFiles.delete(draftKey);
              onChange(undefined);
            }}
          >
            Remove
          </button>
        </div>
      ) : open ? (
        <div className="card stack gap-12" role="group" aria-label="Add an attachment">
          <p className="t-medium">{label}</p>
          <Button onClick={() => camera.current?.click()}>
            <Icon name="camera" size={20} /> Take a photo
          </Button>
          <Button variant="secondary" onClick={() => picker.current?.click()}>
            Choose a file
          </Button>
          <button type="button" className="link-btn" style={{ alignSelf: 'center' }} onClick={() => setOpen(false)}>
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="card stack gap-8"
          style={{ alignItems: 'center', padding: '28px 16px', borderStyle: 'solid', cursor: 'pointer', width: '100%' }}
          onClick={() => setOpen(true)}
        >
          <Icon name="camera" className="t-teal" />
          <span className="t-teal t-medium">Take a photo or upload a file</span>
          <span className="t-caption t-muted">{imagesOnly ? 'JPG or PNG · Up to 5 MB' : 'JPG or PNG up to 5 MB · PDF up to 10 MB'}</span>
        </button>
      )}
      {error && (
        <span className="field-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
