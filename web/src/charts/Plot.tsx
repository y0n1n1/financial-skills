/**
 * The chart frame: margins, axes, gridlines, and the hover layer.
 *
 * Every plot in the gallery is built on this, so axis treatment, tick density and
 * tooltip behaviour are consistent by construction rather than by discipline.
 * Grid and axes are deliberately recessive — they orient the eye and then get out
 * of the way.
 */

import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useCallback,
  useId,
  useRef,
  useState,
} from 'react';

import { type LinearScale } from './scale';

export type Margins = { top: number; right: number; bottom: number; left: number };

export const DEFAULT_MARGINS: Margins = { top: 16, right: 20, bottom: 40, left: 56 };

export type PlotProps = {
  /** Overall SVG width in pixels. The plot scales within it. */
  readonly width?: number;
  readonly height?: number;
  readonly margins?: Partial<Margins>;
  readonly x: LinearScale;
  readonly y: LinearScale;
  readonly xLabel?: string;
  readonly yLabel?: string;
  /** Tick formatters. Default to plain numbers. */
  readonly formatX?: (value: number) => string;
  readonly formatY?: (value: number) => string;
  readonly xTicks?: number;
  readonly yTicks?: number;
  /** Suppress vertical gridlines, which bar charts rarely want. */
  readonly hideXGrid?: boolean;
  readonly hideYGrid?: boolean;
  /** Accessible description of what the plot shows. */
  readonly title: string;
  readonly children: ReactNode;
  /** Rendered above the marks, for crosshairs and annotations. */
  readonly overlay?: ReactNode;
  /** Called with domain coordinates as the pointer moves over the plot area. */
  readonly onHover?: (point: { x: number; y: number } | null) => void;
};

/**
 * An SVG plot area with axes.
 *
 * The SVG uses a viewBox and `width: 100%`, so it scales responsively without a
 * resize observer. Marks are passed as children in pixel space, having been
 * mapped through the scales the caller already holds.
 */
export function Plot({
  width = 720,
  height = 360,
  margins,
  x,
  y,
  xLabel,
  yLabel,
  formatX = (v) => `${v}`,
  formatY = (v) => `${v}`,
  xTicks = 6,
  yTicks = 5,
  hideXGrid = false,
  hideYGrid = false,
  title,
  children,
  overlay,
  onHover,
}: PlotProps) {
  const m = { ...DEFAULT_MARGINS, ...margins };
  const svgRef = useRef<SVGSVGElement>(null);
  const titleId = useId();

  const handleMove = useCallback(
    (event: ReactPointerEvent<SVGRectElement>) => {
      if (!onHover || !svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      // The SVG scales, so client pixels must be converted to viewBox units.
      const scaleX = width / rect.width;
      const scaleY = height / rect.height;
      const px = (event.clientX - rect.left) * scaleX;
      const py = (event.clientY - rect.top) * scaleY;
      onHover({ x: x.invert(px), y: y.invert(py) });
    },
    [onHover, width, height, x, y],
  );

  const handleLeave = useCallback(() => onHover?.(null), [onHover]);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`}
      // touchAction is pan-y, not none: the chart tracks the pointer for hover,
      // but a vertical scroll gesture that happens to start over it must still
      // scroll the page. Blocking it makes the page feel stuck on touch devices.
      style={{ width: '100%', height: 'auto', display: 'block', touchAction: 'pan-y' }}
      role="img"
      aria-labelledby={titleId}
    >
      <title id={titleId}>{title}</title>

      {/* Horizontal gridlines, one per y tick. */}
      {!hideYGrid &&
        y.ticks(yTicks).map((tick, i) => (
          <line
            key={`yg-${i}`}
            x1={m.left}
            x2={width - m.right}
            y1={y(tick)}
            y2={y(tick)}
            stroke="var(--grid)"
            strokeWidth={1}
            shapeRendering="crispEdges"
          />
        ))}

      {!hideXGrid &&
        x.ticks(xTicks).map((tick, i) => (
          <line
            key={`xg-${i}`}
            x1={x(tick)}
            x2={x(tick)}
            y1={m.top}
            y2={height - m.bottom}
            stroke="var(--grid)"
            strokeWidth={1}
            shapeRendering="crispEdges"
          />
        ))}

      {children}
      {overlay}

      {/* Axis lines sit above the marks so a fill never covers the baseline. */}
      <line
        x1={m.left}
        x2={width - m.right}
        y1={height - m.bottom}
        y2={height - m.bottom}
        stroke="var(--axis)"
        strokeWidth={1}
        shapeRendering="crispEdges"
      />

      {y.ticks(yTicks).map((tick, i) => (
        <text
          key={`yt-${i}`}
          x={m.left - 8}
          y={y(tick)}
          textAnchor="end"
          dominantBaseline="central"
          fontSize={11}
          fill="var(--text-muted)"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {formatY(tick)}
        </text>
      ))}

      {x.ticks(xTicks).map((tick, i) => (
        <text
          key={`xt-${i}`}
          x={x(tick)}
          y={height - m.bottom + 16}
          textAnchor="middle"
          fontSize={11}
          fill="var(--text-muted)"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {formatX(tick)}
        </text>
      ))}

      {xLabel && (
        <text
          x={m.left + (width - m.left - m.right) / 2}
          y={height - 4}
          textAnchor="middle"
          fontSize={11}
          fill="var(--text-secondary)"
        >
          {xLabel}
        </text>
      )}

      {yLabel && (
        <text
          transform={`rotate(-90) translate(${-(m.top + (height - m.top - m.bottom) / 2)} 12)`}
          textAnchor="middle"
          fontSize={11}
          fill="var(--text-secondary)"
        >
          {yLabel}
        </text>
      )}

      {/* Transparent capture rect, sized to the plot area, for the hover layer. */}
      {onHover && (
        <rect
          x={m.left}
          y={m.top}
          width={Math.max(0, width - m.left - m.right)}
          height={Math.max(0, height - m.top - m.bottom)}
          fill="transparent"
          onPointerMove={handleMove}
          onPointerLeave={handleLeave}
          style={{ cursor: 'crosshair' }}
        />
      )}
    </svg>
  );
}

/** Inner plot-area bounds implied by a width, height and margin set. */
export function plotArea(
  width: number,
  height: number,
  margins?: Partial<Margins>,
): { left: number; right: number; top: number; bottom: number } {
  const m = { ...DEFAULT_MARGINS, ...margins };
  return {
    left: m.left,
    right: width - m.right,
    top: m.top,
    bottom: height - m.bottom,
  };
}

export type TooltipRow = { readonly label: string; readonly value: string; readonly color?: string };

/**
 * A positioned tooltip.
 *
 * Rendered as absolutely positioned HTML rather than SVG, so it can use normal
 * text layout and never gets clipped by the SVG viewBox.
 */
export function Tooltip({
  rows,
  heading,
  style,
}: {
  readonly rows: readonly TooltipRow[];
  readonly heading?: string;
  readonly style?: CSSProperties;
}) {
  return (
    <div
      role="status"
      style={{
        position: 'absolute',
        pointerEvents: 'none',
        background: 'var(--surface-1)',
        border: '1px solid var(--border-strong)',
        borderRadius: 'var(--radius)',
        padding: '7px 9px',
        fontSize: 12,
        lineHeight: 1.45,
        boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
        minWidth: 112,
        zIndex: 5,
        ...style,
      }}
    >
      {heading && (
        <div style={{ fontWeight: 600, marginBottom: 3, color: 'var(--text-primary)' }}>
          {heading}
        </div>
      )}
      {rows.map((row) => (
        <div
          key={row.label}
          style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}
        >
          {row.color && (
            <span
              aria-hidden
              style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                background: row.color,
                flexShrink: 0,
              }}
            />
          )}
          <span style={{ color: 'var(--text-secondary)' }}>{row.label}</span>
          <span
            className="num"
            style={{ marginLeft: 'auto', color: 'var(--text-primary)', fontWeight: 500 }}
          >
            {row.value}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * A legend. Always present for two or more series, so identity is never
 * colour-alone.
 */
export function Legend({
  items,
}: {
  readonly items: ReadonlyArray<{ readonly label: string; readonly color: string; readonly dashed?: boolean }>;
}) {
  return (
    <ul
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '4px 16px',
        listStyle: 'none',
        margin: '10px 0 0',
        padding: 0,
        fontSize: 12,
        color: 'var(--text-secondary)',
      }}
    >
      {items.map((item) => (
        <li key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            aria-hidden
            style={{
              width: 14,
              height: item.dashed ? 0 : 8,
              borderRadius: 2,
              background: item.dashed ? 'transparent' : item.color,
              borderTop: item.dashed ? `2px dashed ${item.color}` : undefined,
              flexShrink: 0,
            }}
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

/**
 * Hook for a hover-tracked tooltip anchored in a relatively positioned wrapper.
 *
 * Returns the wrapper props and the current pointer position in client pixels,
 * which is what the tooltip needs for placement.
 */
export function useTooltipAnchor() {
  const [anchor, setAnchor] = useState<{ left: number; top: number } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect) return;
    setAnchor({ left: event.clientX - rect.left, top: event.clientY - rect.top });
  }, []);

  const onPointerLeave = useCallback(() => setAnchor(null), []);

  return { wrapperRef, anchor, onPointerMove, onPointerLeave };
}

/**
 * Place a tooltip near the pointer without letting it run off the right edge.
 *
 * Flips to the left of the cursor once it would overflow, which keeps long rows
 * readable on narrow screens.
 */
export function tooltipStyle(
  anchor: { left: number; top: number },
  containerWidth: number,
  estimatedWidth = 170,
): CSSProperties {
  const flip = anchor.left + estimatedWidth + 20 > containerWidth;
  return {
    left: flip ? undefined : anchor.left + 14,
    right: flip ? containerWidth - anchor.left + 14 : undefined,
    top: Math.max(0, anchor.top - 12),
  };
}
