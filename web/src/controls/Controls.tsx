/**
 * Input controls for the interactive plates.
 *
 * All of them are thin wrappers over native inputs, so keyboard support,
 * accessibility and mobile behaviour come for free. Filters and sliders sit in
 * one row above the chart, per the interaction rules.
 */

import { type ReactNode, useId } from 'react';

/** A labelled slider showing its current value. */
export function Slider({
  label,
  value,
  min,
  max,
  step = 0.01,
  onChange,
  format = (v) => v.toFixed(2),
  hint,
}: {
  readonly label: string;
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly step?: number;
  readonly onChange: (value: number) => void;
  readonly format?: (value: number) => string;
  readonly hint?: string;
}) {
  const id = useId();
  return (
    <div style={{ display: 'grid', gap: 2, minWidth: 0 }}>
      <label
        htmlFor={id}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 8,
          fontSize: 12,
          color: 'var(--text-secondary)',
        }}
      >
        <span>{label}</span>
        <span className="num" style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
          {format(value)}
        </span>
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: 'var(--series-1)', margin: 0 }}
      />
      {hint && (
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{hint}</span>
      )}
    </div>
  );
}

/** A segmented control for a small set of mutually exclusive options. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  readonly label: string;
  readonly value: T;
  readonly options: ReadonlyArray<{ readonly value: T; readonly label: string }>;
  readonly onChange: (value: T) => void;
}) {
  return (
    <fieldset style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}>
      <legend style={{ fontSize: 12, color: 'var(--text-secondary)', padding: 0, marginBottom: 4 }}>
        {label}
      </legend>
      <div
        style={{
          display: 'inline-flex',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius)',
          overflow: 'hidden',
        }}
      >
        {options.map((option, i) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              aria-pressed={active}
              style={{
                appearance: 'none',
                border: 0,
                borderLeft: i === 0 ? 0 : '1px solid var(--border-strong)',
                background: active ? 'var(--series-1)' : 'var(--surface-1)',
                color: active ? '#fff' : 'var(--text-secondary)',
                font: 'inherit',
                fontSize: 12,
                fontWeight: active ? 600 : 400,
                padding: '5px 11px',
                cursor: 'pointer',
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/** A checkbox toggle. */
export function Toggle({
  label,
  checked,
  onChange,
  hint,
}: {
  readonly label: string;
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
  readonly hint?: string;
}) {
  const id = useId();
  return (
    <div style={{ display: 'grid', gap: 2 }}>
      <label htmlFor={id} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13 }}>
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          style={{ accentColor: 'var(--series-1)', margin: 0 }}
        />
        <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
      </label>
      {hint && <span style={{ fontSize: 11, color: 'var(--text-muted)', paddingLeft: 24 }}>{hint}</span>}
    </div>
  );
}

/** The row that holds a plate's controls, above its chart. */
export function ControlRow({ children }: { readonly children: ReactNode }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(186px, 1fr))',
        gap: '14px 22px',
        padding: '14px 0 18px',
        borderBottom: 'var(--rule)',
        marginBottom: 18,
      }}
    >
      {children}
    </div>
  );
}

/** A reset button for returning a plate to its defaults. */
export function ResetButton({ onClick }: { readonly onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        appearance: 'none',
        background: 'var(--surface-1)',
        border: '1px solid var(--border-strong)',
        borderRadius: 'var(--radius)',
        color: 'var(--text-secondary)',
        font: 'inherit',
        fontSize: 12,
        padding: '5px 11px',
        cursor: 'pointer',
        justifySelf: 'start',
        alignSelf: 'end',
      }}
    >
      Reset
    </button>
  );
}
