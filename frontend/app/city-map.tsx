'use client';

import { Clock, Flag, Minus, Move, Plus } from 'lucide-react';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { architecture, buildingFrame, type Mark } from './architecture';
import { ATLAS_FRAMES, ATLAS_HEIGHT, ATLAS_WIDTH } from './architecture-frames';
import { FACTIONS, type Faction } from './catalog';
import { CITY_PLOTS, plotWidth } from './city-layout';
import { BUILDINGS, type Building, type City } from './game';
import Worksite from './worksite';
export function Heraldry({ mark }: { mark: Mark }) {
  return (
    <svg
      viewBox="0 0 32 36"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {mark === 'tree' ? (
        <>
          <path d="M16 29V9m0 8L8 12m8 5 8-5M16 22 6 17m10 5 10-5M10 29h12" />
          <path d="m16 3 3 5-3-1-3 1z" />
          <path d="m5 8 2 1m18-1 2 1M5 22l-2 2m24-2 2 2" />
        </>
      ) : mark === 'horse' ? (
        <>
          <path d="M8 28c1-8 10-9 8-14l-5 3-5-4 9-7 1-4 5 6 4 8-1 12z" />
          <path d="m18 9 3 8-4 8M12 12h1" />
        </>
      ) : mark === 'star' ? (
        <path d="m16 3 3 9 9-4-6 8 7 5-10-1-3 12-3-12-10 1 7-5-6-8 9 4z" />
      ) : mark === 'leaf' ? (
        <>
          <path d="M7 28C-2 11 16 6 26 3c0 19-8 26-19 25zM6 31 23 8m-7 11 8-1m-12 7-1-9" />
        </>
      ) : mark === 'hammer' ? (
        <>
          <path d="m7 7 5-4 15 15-5 5zM18 15 6 28l-3-3 12-13M20 24l6 6" />
        </>
      ) : mark === 'flame' ? (
        <path d="M16 32C-1 26 5 16 12 12l-1 9c7-5 3-12 9-18-1 11 9 13 8 22-1 5-6 7-12 7z" />
      ) : mark === 'eye' ? (
        <>
          <path d="M2 18c9-13 19-13 28 0-11 13-20 13-28 0z" />
          <path d="m16 8 3 10-3 10-3-10z" />
        </>
      ) : mark === 'wave' ? (
        <>
          <path d="M4 25q4-6 8 0t8 0 8 0M4 30q4-6 8 0t8 0 8 0M16 4v17H6zM19 8l7 13h-7z" />
        </>
      ) : mark === 'crown' ? (
        <>
          <path d="m5 10 7 6 4-11 4 11 7-6-3 16H8zM8 30h16" />
          <circle cx="16" cy="4" r="1" />
        </>
      ) : mark === 'mountain' ? (
        <>
          <path d="m2 27 10-20 7 12 4-9 7 17zM8 16l4 3 3-6M12 7l4-5 9 15" />
        </>
      ) : mark === 'sun' ? (
        <>
          <circle cx="16" cy="18" r="7" />
          <path d="M16 3v4m0 22v4M1 18h4m22 0h4M5 7l3 3m16 16 3 3M5 29l3-3M24 10l3-3" />
        </>
      ) : mark === 'horn' ? (
        <>
          <path d="M5 4c-3 14 5 24 20 26l3-8C15 23 7 17 5 4zM21 23l-2 6M7 15l5-3" />
        </>
      ) : (
        <>
          <path d="M7 30V12h18v18M5 12V5h5v4h4V5h4v4h4V5h5v7M3 30h26M13 30V20h6v10M11 15h1m8 0h1" />
        </>
      )}
    </svg>
  );
}
export function BuildingArt({
  type,
  level,
  faction = 'gondor',
  fit = false,
}: {
  type: Building;
  level: number;
  faction?: Faction;
  color?: string;
  fit?: boolean;
}) {
  const a = architecture(faction),
    frame = buildingFrame(type, level),
    [top, bottom] = ATLAS_FRAMES[a.theme][frame.column][frame.row],
    height = bottom - top,
    ratio = height / (ATLAS_WIDTH / 8);
  return (
    <div
      className={`architecture-sprite ${fit ? 'architecture-fitted' : ''} architecture-${type} architecture-level-${frame.row + 1}`}
      role="img"
      aria-label={`${BUILDINGS[type].name} — niveau ${level} — ${FACTIONS[faction].name}`}
      data-level={level}
      data-faction={faction}
      style={
        {
          '--banner-cloth': a.cloth,
          '--banner-metal': a.metal,
          ...(fit
            ? { width: `min(100%, ${145 / Math.max(1, ratio)}px)`, aspectRatio: 1 / ratio }
            : {}),
        } as CSSProperties
      }
    >
      <span
        className="architecture-paint"
        style={{
          backgroundImage: `url('${a.atlas}')`,
          height: fit ? '100%' : `${ratio * 100}%`,
          inset: fit ? '0' : 'auto 0 2%',
          backgroundSize: `800% ${(ATLAS_HEIGHT / height) * 100}%`,
          backgroundPosition: `${(frame.column * 100) / 7}% ${(top / (ATLAS_HEIGHT - height)) * 100}%`,
        }}
      />
      <span className={`architecture-standard standard-${type}`}>
        <Heraldry mark={a.mark} />
      </span>
    </div>
  );
}
export default function CityMap({
  city,
  selected,
  onSelect,
  faction,
}: {
  faction: Faction;
  city: City;
  selected: Building;
  onSelect: (b: Building) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null),
    previous = useRef({ id: city.id, levels: { ...city.levels } });
  const [zoom, setZoom] = useState(1),
    [completed, setCompleted] = useState<Building | null>(null);
  const a = architecture(faction);
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
  }, [city.id, zoom]);
  useEffect(() => {
    const changed =
      previous.current.id === city.id
        ? (Object.keys(city.levels) as Building[]).find(
            (b) => city.levels[b] > previous.current.levels[b],
          )
        : undefined;
    previous.current = { id: city.id, levels: { ...city.levels } };
    setCompleted(changed || null);
    if (changed) {
      const timer = setTimeout(() => setCompleted(null), 2400);
      return () => clearTimeout(timer);
    }
  }, [city.id, ...Object.values(city.levels)]);
  return (
    <div className={`game-city living-city faction-${faction}`}>
      <div className="scene-scroll" ref={scroller}>
        <div
          className={`scene-stage theme-${a.theme}`}
          style={
            {
              width: `${zoom * 100}%`,
              minWidth: 720 * zoom,
              '--banner-cloth': a.cloth,
              '--banner-metal': a.metal,
            } as CSSProperties
          }
        >
          <div
            className="city-foundation"
            role="img"
            aria-label={`Paysage de ${city.name} — ${a.label}`}
          />
          {(Object.keys(CITY_PLOTS[a.theme]) as Building[]).map((type) => {
            const [x, y] = CITY_PLOTS[a.theme][type],
              construction = city.build?.type === type,
              progress = construction
                ? Math.min(
                    100,
                    Math.max(
                      0,
                      Math.round(
                        ((Date.now() - city.build!.start) / (city.build!.end - city.build!.start)) *
                          100,
                      ),
                    ),
                  )
                : 0;
            return (
              <button
                key={type}
                className={`city-building living-building ${selected === type ? 'chosen' : ''} ${construction ? 'under-construction' : ''} ${completed === type ? 'upgrade-complete' : ''}`}
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  width: `${plotWidth(a.theme, type, city.levels[type])}%`,
                  zIndex: Math.floor(y),
                }}
                onClick={() => onSelect(type)}
                aria-label={`${BUILDINGS[type].name}, niveau ${city.levels[type]}`}
                aria-pressed={selected === type}
              >
                <span className="plot-shadow" />
                <BuildingArt type={type} level={city.levels[type]} faction={faction} />
                {construction && <Worksite theme={a.theme} />}
                <span className="building-label">
                  <span>{BUILDINGS[type].name}</span>
                  <b>Niv. {city.levels[type]}</b>
                </span>
                {construction && (
                  <span className="construction-badge">
                    <span>
                      <Clock size={11} /> Niv. {city.levels[type] + 1} en travaux <b>{progress}%</b>
                    </span>
                    <span className="site-progress">
                      <i style={{ width: `${progress}%` }} />
                    </span>
                  </span>
                )}
              </button>
            );
          })}
          <div className="city-banner" title={`${FACTIONS[faction].name} · ${a.name}`}>
            <Heraldry mark={a.mark} />
            <span>{FACTIONS[faction].name}</span>
          </div>
          <div className="map-cartouche">
            <Flag size={13} />
            {city.name}
            <span>•</span>
            {a.label}
          </div>
        </div>
      </div>
      <div className="map-controls">
        <span>
          <Move size={13} />
          Cliquez sur un bâtiment pour l’améliorer
        </span>
        <button
          onClick={() => setZoom((z) => Math.max(1, z - 0.25))}
          disabled={zoom === 1}
          aria-label="Dézoomer"
        >
          <Minus size={16} />
        </button>
        <button
          onClick={() => setZoom((z) => Math.min(1.75, z + 0.25))}
          disabled={zoom === 1.75}
          aria-label="Zoomer"
        >
          <Plus size={16} />
        </button>
      </div>
      <span className="sr-only" aria-live="polite">
        {completed ? `${BUILDINGS[completed].name} achevé : niveau ${city.levels[completed]}.` : ''}
      </span>
    </div>
  );
}
