"use client";

// 외부 지도 API 키 없이 동작하는 한국-대만 항로 시각화.
// 좌표는 지리적 배치를 단순화한 스키매틱 값이며, 나중에 Mapbox/Google Maps로
// 교체할 때는 이 컴포넌트만 같은 props 계약으로 갈아끼우면 됩니다.

import type { PlatformRequestState, PlatformShipmentRow, PlatformTransportMode } from "@/lib/platform-ops-store";

type PortCode = "ICN" | "PUS" | "TPE" | "KEL" | "KHH";

const ports: Record<PortCode, { x: number; y: number; label: string; side: "kr" | "tw" }> = {
  ICN: { x: 300, y: 74, label: "인천 ICN", side: "kr" },
  PUS: { x: 388, y: 128, label: "부산 PUS", side: "kr" },
  TPE: { x: 176, y: 300, label: "타이베이 TPE", side: "tw" },
  KEL: { x: 204, y: 316, label: "기륭 KEL", side: "tw" },
  KHH: { x: 148, y: 388, label: "가오슝 KHH", side: "tw" }
};

const stateProgress: Record<PlatformRequestState, number> = {
  requested: 0.04,
  quoted: 0.08,
  accepted: 0.12,
  booked: 0.18,
  in_transit: 0.55,
  customs_hold: 0.86,
  delivered: 1,
  cancelled: 0.04
};

const stateColor: Record<PlatformRequestState, string> = {
  requested: "#62736e",
  quoted: "#62736e",
  accepted: "#2f6d91",
  booked: "#2f6d91",
  in_transit: "#147b5c",
  customs_hold: "#a56c15",
  delivered: "#0c5a49",
  cancelled: "#b3443d"
};

function parseRoute(route: string): { origin: PortCode; destination: PortCode } | null {
  const match = route.toUpperCase().match(/([A-Z]{3})\s*(?:->|→)\s*([A-Z]{3})/);
  if (!match) return null;
  const [, origin, destination] = match;
  if (!(origin in ports) || !(destination in ports)) return null;
  return { origin: origin as PortCode, destination: destination as PortCode };
}

function routePath(origin: PortCode, destination: PortCode) {
  const from = ports[origin];
  const to = ports[destination];
  const midX = (from.x + to.x) / 2 - 46;
  const midY = (from.y + to.y) / 2;
  return { d: `M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`, from, to, midX, midY };
}

function pointOnQuad(from: { x: number; y: number }, control: { x: number; y: number }, to: { x: number; y: number }, t: number) {
  const mt = 1 - t;
  return {
    x: mt * mt * from.x + 2 * mt * t * control.x + t * t * to.x,
    y: mt * mt * from.y + 2 * mt * t * control.y + t * t * to.y
  };
}

type LogisticsMapProps = {
  shipments: PlatformShipmentRow[];
  selectedReference?: string | null;
  onSelect?: (reference: string) => void;
};

export function LogisticsMap({ shipments, selectedReference, onSelect }: LogisticsMapProps) {
  const drawable = shipments
    .map((shipment) => {
      const parsed = parseRoute(shipment.route);
      if (!parsed) return null;
      return { shipment, ...routePath(parsed.origin, parsed.destination) };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  return (
    <div className="logi-map" role="img" aria-label="한국-대만 선적 항로 지도">
      <svg viewBox="0 0 520 440" preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id="logi-sea" cx="50%" cy="45%" r="80%">
            <stop offset="0%" stopColor="#e9f2f5" />
            <stop offset="100%" stopColor="#d7e6ea" />
          </radialGradient>
        </defs>
        <rect x="0" y="0" width="520" height="440" rx="12" fill="url(#logi-sea)" />

        {/* 한반도 남부 (단순화) */}
        <path
          d="M 268 20 L 330 26 L 356 58 L 402 96 L 412 132 L 380 150 L 336 138 L 300 108 L 272 66 Z"
          fill="#eef3ee"
          stroke="#c4d4cd"
          strokeWidth="1.5"
        />
        <text x="330" y="52" className="logi-map-land">한국</text>

        {/* 중국 동해안 힌트 */}
        <path d="M 0 120 L 70 138 L 96 190 L 66 260 L 22 320 L 0 330 Z" fill="#eef3ee" stroke="#c4d4cd" strokeWidth="1.5" />
        <text x="22" y="182" className="logi-map-land">중국</text>

        {/* 대만 (단순화) */}
        <path
          d="M 186 288 L 214 306 L 210 352 L 176 406 L 148 400 L 136 350 L 152 306 Z"
          fill="#eef3ee"
          stroke="#c4d4cd"
          strokeWidth="1.5"
        />
        <text x="158" y="352" className="logi-map-land">대만</text>

        {/* 일본 규슈 힌트 */}
        <path d="M 462 118 L 508 130 L 520 170 L 496 208 L 458 186 L 450 146 Z" fill="#eef3ee" stroke="#c4d4cd" strokeWidth="1.5" />

        {drawable.map(({ shipment, d }) => {
          const active = shipment.reference === selectedReference;
          return (
            <path
              key={`route-${shipment.reference}`}
              d={d}
              fill="none"
              stroke={active ? stateColor[shipment.state] : "#9db4ac"}
              strokeWidth={active ? 2.6 : 1.6}
              strokeDasharray={shipment.mode === "air" ? "3 5" : "8 6"}
              className={active ? "logi-route active" : "logi-route"}
            />
          );
        })}

        {Object.entries(ports).map(([code, port]) => (
          <g key={code}>
            <circle cx={port.x} cy={port.y} r="5" fill="#123646" />
            <circle cx={port.x} cy={port.y} r="9" fill="none" stroke="#123646" strokeOpacity="0.25" strokeWidth="2" />
            <text x={port.x + (port.side === "kr" ? 12 : -12)} y={port.y + 4} textAnchor={port.side === "kr" ? "start" : "end"} className="logi-map-port">
              {port.label}
            </text>
          </g>
        ))}

        {drawable.map(({ shipment, from, to, midX, midY }) => {
          const progress = stateProgress[shipment.state] ?? 0.1;
          const point = pointOnQuad(from, { x: midX, y: midY }, to, progress);
          const active = shipment.reference === selectedReference;
          return (
            <g
              key={`marker-${shipment.reference}`}
              className="logi-marker"
              onClick={() => onSelect?.(shipment.reference)}
              role="button"
              aria-label={`${shipment.reference} 위치 보기`}
            >
              <circle cx={point.x} cy={point.y} r={active ? 9 : 7} fill={stateColor[shipment.state]} stroke="#ffffff" strokeWidth="2" />
              <text x={point.x} y={point.y + 3.5} textAnchor="middle" className="logi-marker-icon">
                {shipment.mode === "air" ? "✈" : "⚓"}
              </text>
              {active && (
                <text x={point.x} y={point.y - 14} textAnchor="middle" className="logi-marker-label">
                  {shipment.reference}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="logi-map-legend" aria-label="지도 범례">
        <span><i style={{ background: "#2f6d91" }} /> 예약·준비</span>
        <span><i style={{ background: "#147b5c" }} /> 운송중</span>
        <span><i style={{ background: "#a56c15" }} /> 통관 보류</span>
        <span><i style={{ background: "#0c5a49" }} /> 도착</span>
        <span className="logi-map-note">지도 API 키 없이 동작하는 항로 뷰</span>
      </div>
    </div>
  );
}

export type { PlatformShipmentRow, PlatformTransportMode };
