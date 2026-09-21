import type { JSX } from 'react';
import type { CaracolOutfit, CaracolStateView } from '../shared/caracol';
import { CaracolMedallion } from './CaracolAvatar';

// O mapa do Brasil e a legenda ficam fora de CaracolGame.tsx, que abre o socket
// no import, para os tokens e o Blooper poderem ser testados em node.

export interface GeoFeature {
  properties?: { name?: string; sigla?: string };
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };
}

export interface GeoFeatureCollection {
  features: GeoFeature[];
}

const MAP_BOUNDS = { minLon: -74, maxLon: -34, minLat: -34, maxLat: 6 };

export function BrazilMap({ state, geoJson }: { state: CaracolStateView; geoJson: GeoFeatureCollection | null }): JSX.Element {
  const width = 760;
  const height = 570;
  const target = state.world.snail.targetAccountId ? state.players.find((player) => player.accountId === state.world.snail.targetAccountId) : null;
  // Com Blooper o servidor nem manda a posição: sem token e sem rota.
  const { lat: snailLat, lon: snailLon } = state.world.snail;
  const snailPoint = snailLat === null || snailLon === null ? null : project(snailLat, snailLon, width, height);
  const targetPoint = target && snailPoint ? project(target.city.lat, target.city.lon, width, height) : null;
  return <div className="caracol-map-frame" role="img" aria-label="Mapa do Brasil com o caracol, jogadores online, jogadores offline e mortos"><svg className="caracol-map" viewBox={`0 0 ${width} ${height}`} aria-hidden="true"><rect width={width} height={height} className="map-paper" />{geoJson?.features.map((feature) => <path key={feature.properties?.sigla ?? feature.properties?.name} d={featurePath(feature, width, height)} className="state-shape"><title>{feature.properties?.name ?? feature.properties?.sigla}</title></path>)}{snailPoint && targetPoint && <line x1={snailPoint.x} y1={snailPoint.y} x2={targetPoint.x} y2={targetPoint.y} className="snail-route" />}{state.players.map((player) => { const point = project(player.city.lat, player.city.lon, width, height); const isTarget = player.accountId === state.world.snail.targetAccountId; return <g key={player.accountId} className={`map-player ${player.isYou ? 'map-player-you' : ''} ${isTarget ? 'map-player-target' : ''} ${player.alive ? '' : 'map-player-dead'}`} transform={`translate(${point.x} ${point.y})`}><circle cx="0" cy="0" r={player.isYou || isTarget ? 9 : 6} className="map-player-halo" />{player.alive ? mapPlayerAvatar(player.outfit) : mapDeadAvatar()}<title>{player.nickname} · {player.alive ? `${player.city.name} · ${player.city.uf}` : `morta em ${player.city.name} · ${player.city.uf}`}</title>{(player.isYou || isTarget || !player.alive) && <text x="11" y="-11">{player.nickname}</text>}</g>; })}{snailPoint && <g className="snail-token" transform={`translate(${snailPoint.x - 18} ${snailPoint.y - 20})`}>{mapSnailAvatar(state.world.snail.outfit)}<title>Caracol vestido</title></g>}</svg>{state.world.snail.hidden && <div className="map-ink" aria-hidden="true">tinta do Blooper · caracol escondido</div>}{!geoJson && <div className="map-loading">Desenhando o Brasil…</div>}</div>;
}

export function CaracolMapLegend({ snailOutfit }: { snailOutfit: CaracolOutfit }): JSX.Element {
  return <div className="caracol-map-legend"><span><i className="legend-dot legend-you" /> você</span><span><i className="legend-dot legend-target" /> alvo atual</span><span><i className="legend-dot legend-other" /> jogadores</span><span><i className="legend-skull" aria-hidden="true">☠</i> mortos</span><span className="legend-snail"><CaracolMedallion wearer="snail" outfit={snailOutfit} size={24} label="caracol vestido" /> caracol</span></div>;
}

function mapPlayerAvatar(outfit: CaracolOutfit): JSX.Element {
  return <g className="map-avatar-player"><circle cx="0" cy="-8" r="4" className="map-avatar-skin" /><path d="M-5 -3 Q0 -7 5 -3 L5 5 L-5 5 Z" className={`map-avatar-shirt ${outfit.shirt ?? 'default'}`} /><path d="M-5 5 L0 5 L-1 12 L-5 12 Z M0 5 L5 5 L5 12 L1 12 Z" className={`map-avatar-pants ${outfit.pants ?? 'default'}`} />{outfit.watch && <circle cx="5" cy="2" r="1.6" className={`map-avatar-watch ${outfit.watch}`} />}{outfit.glasses && <path d="M-4 -9 H4" className={`map-avatar-glasses ${outfit.glasses}`} />}{outfit.cap && <path d="M-5 -12 Q0 -17 5 -12 L5 -10 H-5 Z" className={`map-avatar-cap ${outfit.cap}`} />}</g>;
}

function mapDeadAvatar(): JSX.Element {
  return <g className="map-dead-avatar"><path d="M-6 0 V-4 A6 6 0 0 1 6 -4 V0 L4 5 H-4 Z" /><circle cx="-2.5" cy="-2" r="1.1" /><circle cx="2.5" cy="-2" r="1.1" /><path d="M-3 2 H3" /></g>;
}

function mapSnailAvatar(outfit: CaracolStateView['world']['snail']['outfit']): JSX.Element {
  return <g className="map-avatar-snail"><ellipse cx="18" cy="21" rx="16" ry="4" className="map-snail-shadow" /><path d="M3 19 C2 8 8 3 17 5 C25 6 31 12 31 20 Z" className="map-snail-shell" /><path d="M5 19 C5 14 7 11 11 10 C16 9 19 13 19 19 Z" className="map-snail-body" /><path d="M9 7 L9 1 M16 6 L17 0" className="map-snail-antenna" /><circle cx="9" cy="1" r="1.5" className="map-snail-eye" /><circle cx="17" cy="0" r="1.5" className="map-snail-eye" />{outfit.pants && <path d="M6 16 Q12 13 19 16 L19 21 H6 Z" className={`map-snail-pants ${outfit.pants}`} />}{outfit.shirt && <path d="M7 12 Q12 9 18 12 L19 18 H6 Z" className={`map-snail-shirt ${outfit.shirt}`} />}{outfit.watch && <circle cx="19" cy="15" r="1.7" className={`map-snail-watch ${outfit.watch}`} />}{outfit.glasses && <path d="M6 8 H19" className={`map-snail-glasses ${outfit.glasses}`} />}{outfit.cap && <path d="M5 7 Q12 1 20 6 L21 8 H5 Z" className={`map-snail-cap ${outfit.cap}`} />}</g>;
}

function project(lat: number, lon: number, width: number, height: number): { x: number; y: number } {
  return { x: ((lon - MAP_BOUNDS.minLon) / (MAP_BOUNDS.maxLon - MAP_BOUNDS.minLon)) * width, y: ((MAP_BOUNDS.maxLat - lat) / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat)) * height };
}

function featurePath(feature: GeoFeature, width: number, height: number): string {
  const polygons = feature.geometry.type === 'MultiPolygon' ? feature.geometry.coordinates as number[][][][] : [feature.geometry.coordinates as number[][][]];
  return polygons.map((polygon) => polygon.map((ring) => ring.map((coordinate, index) => { const lon = coordinate[0] ?? 0; const lat = coordinate[1] ?? 0; const point = project(lat, lon, width, height); return `${index === 0 ? 'M' : 'L'}${point.x.toFixed(2)} ${point.y.toFixed(2)}`; }).join(' ') + ' Z').join(' ')).join(' ');
}
