import Link from "next/link";
import {
  ArrowRight,
  ClipboardList,
  FileWarning,
  Handshake,
  PackageCheck,
  PlaneTakeoff,
  Ship,
  ShieldCheck,
  Truck
} from "lucide-react";
import { AdminRowActionDryRun } from "@/components/admin-row-action-dry-run";
import { getPlatformOpsSnapshot } from "@/lib/platform-ops-store";

type RequestState =
  | "requested"
  | "quoted"
  | "accepted"
  | "booked"
  | "in_transit"
  | "customs_hold"
  | "delivered"
  | "cancelled";

type TransportMode = "ocean" | "air";
type QueueTone = "ready" | "review" | "blocked" | "waiting";

type LogisticsCompany = {
  name: string;
  lane: string;
  modes: TransportMode[];
  strengths: string;
  sla: string;
  status: "preferred" | "quoting" | "standby";
};

type ShipmentRequest = {
  id: string;
  displayId?: string;
  product: string;
  importer: string;
  lane: string;
  state: RequestState;
  handoff: string;
  next: string;
};

type Shipment = {
  id?: string;
  reference: string;
  product: string;
  mode: TransportMode;
  carrier: string;
  tracking: string;
  vehicle: string;
  route: string;
  state: RequestState;
  eta: string;
  customs: string;
};

type ShipmentEvent = {
  time: string;
  title: string;
  location: string;
  detail: string;
  state: RequestState;
};

type ImportHandoff = {
  productType: "식품" | "화장품";
  lane: string;
  owner: string;
  documents: string;
  customsStep: string;
  next: string;
};

const stateTone: Record<RequestState, QueueTone> = {
  requested: "waiting",
  quoted: "review",
  accepted: "ready",
  booked: "ready",
  in_transit: "review",
  customs_hold: "blocked",
  delivered: "ready",
  cancelled: "blocked"
};

const stateLabels: Record<RequestState, string> = {
  requested: "요청",
  quoted: "견적",
  accepted: "수락",
  booked: "예약",
  in_transit: "운송중",
  customs_hold: "통관보류",
  delivered: "배송완료",
  cancelled: "취소"
};

const partnerLabels: Record<LogisticsCompany["status"], string> = {
  preferred: "우선 파트너",
  quoting: "견적 중",
  standby: "대기"
};

const fallbackLogisticsCompanies: LogisticsCompany[] = [
  {
    name: "Formosa Cold Chain",
    lane: "KR -> TW 냉장 식품",
    modes: ["ocean", "air"],
    strengths: "TFDA 검사 슬롯, reefer handoff, 보세창고 조율",
    sla: "4시간 내 견적",
    status: "preferred"
  },
  {
    name: "Taipei Beauty Forwarding",
    lane: "KR -> TW 화장품",
    modes: ["air"],
    strengths: "PIF dossier 수거, 화장품 통지 패킷, 샘플 통관",
    sla: "2시간 내 견적",
    status: "quoting"
  },
  {
    name: "Kaohsiung Trade Bridge",
    lane: "Busan -> Kaohsiung 해상",
    modes: ["ocean"],
    strengths: "CCC 코드 검토, 통관사 배정, 컨테이너 내륙운송",
    sla: "당일 견적",
    status: "standby"
  }
];

const fallbackShipmentRequests: ShipmentRequest[] = [
  {
    id: "LR-2408",
    product: "Soy protein snack multipack",
    importer: "Annaanda Global",
    lane: "Incheon -> Taoyuan",
    state: "quoted",
    handoff: "식품 수입검사",
    next: "냉장 항공 견적과 혼재 해상 견적을 비교합니다."
  },
  {
    id: "LR-2411",
    product: "Cica barrier cream launch kit",
    importer: "Taipei Select Retail",
    lane: "Seoul -> Taipei",
    state: "accepted",
    handoff: "화장품 PIF + 통지",
    next: "PIF 증빙 lock 후 항공 예약을 확정합니다."
  },
  {
    id: "LR-2415",
    product: "Shelf-stable tea beverage",
    importer: "Green Market TW",
    lane: "Busan -> Keelung",
    state: "customs_hold",
    handoff: "식품 첨가물 소명",
    next: "보존료 배합 설명서를 붙여 통관사 검토로 보냅니다."
  }
];

const fallbackActiveShipments: Shipment[] = [
  {
    reference: "SHP-TW-8831",
    product: "Cica barrier cream launch kit",
    mode: "air",
    carrier: "Korean Air Cargo",
    tracking: "KE-771-22910463",
    vehicle: "KE691",
    route: "ICN -> TPE",
    state: "booked",
    eta: "7월 2일 09:25",
    customs: "화장품 통지 패킷 사전 확인 완료"
  },
  {
    reference: "SHP-TW-8794",
    product: "Soy protein snack multipack",
    mode: "ocean",
    carrier: "Evergreen Marine",
    tracking: "EGLV-15684022",
    vehicle: "Ever Bliss / 084E",
    route: "PUS -> KEL",
    state: "in_transit",
    eta: "7월 8일 16:00",
    customs: "TFDA 검사 예약 요청 중"
  },
  {
    reference: "SHP-TW-8720",
    product: "Shelf-stable tea beverage",
    mode: "ocean",
    carrier: "Yang Ming",
    tracking: "YMLU-4409128",
    vehicle: "YM Continuity / 032S",
    route: "PUS -> KHH",
    state: "customs_hold",
    eta: "보류",
    customs: "배합비와 첨가물 신고 검토 중"
  }
];

const fallbackShipmentEvents: ShipmentEvent[] = [
  {
    time: "6월 27일 14:35",
    title: "통관사가 첨가물 소명을 요청",
    location: "Kaohsiung Customs",
    detail: "운영자가 식품 증빙팩과 배합 설명서를 수입자에게 배정했습니다.",
    state: "customs_hold"
  },
  {
    time: "6월 27일 11:20",
    title: "해상 컨테이너 부산 출항",
    location: "Busan Port",
    detail: "선박 추적을 켰고 TFDA 검사 슬롯은 잠정 상태입니다.",
    state: "in_transit"
  },
  {
    time: "6월 26일 18:10",
    title: "항공 예약 확정",
    location: "Incheon Cargo Terminal",
    detail: "도착 통관사와 수입자를 위한 화장품 PIF handoff를 봉인했습니다.",
    state: "booked"
  },
  {
    time: "6월 26일 09:45",
    title: "우선 물류 견적 수락",
    location: "LabelPass Admin",
    detail: "화장품 포워더 shortlist에서 운송사를 선택했습니다.",
    state: "accepted"
  }
];

const importHandoffs: ImportHandoff[] = [
  {
    productType: "식품",
    lane: "한국 식품 수출자 -> 대만 수입자 -> TFDA / Customs",
    owner: "식품 규제 운영자",
    documents: "배합비, 영양성분표, 알레르겐, 원산지증명, invoice, packing list",
    customsStep: "선박 도착 전 TFDA 검사 경로와 통관 신고 방식을 확정합니다.",
    next: "첨가물 증빙과 검사 예약으로 통관보류를 해소"
  },
  {
    productType: "화장품",
    lane: "K-beauty 브랜드 -> 대만 책임회사 -> 통관사",
    owner: "화장품 dossier 운영자",
    documents: "PIF 요약, GMP 증빙, INCI 리스트, 통지 기록, COA, invoice",
    customsStep: "항공 화물 release 전 책임회사와 통지 상태를 먼저 확인합니다.",
    next: "PIF 증빙과 수입자 권한이 잠기면 항공 예약"
  },
  {
    productType: "식품",
    lane: "냉장 식품 shipper -> cold-chain forwarder -> TFDA 검사 dock",
    owner: "콜드체인 물류 운영자",
    documents: "온도관리 계획, 위생증명, lot 목록, 검사 요청서",
    customsStep: "TFDA sampling window와 reefer custody 기록을 맞춥니다.",
    next: "온도 SLA와 보세창고 여력 기준으로 운송사 매칭"
  }
];

const requestStates: RequestState[] = [
  "requested",
  "quoted",
  "accepted",
  "booked",
  "in_transit",
  "customs_hold",
  "delivered",
  "cancelled"
];

function modesLabel(modes: TransportMode[]) {
  return modes.map((mode) => (mode === "ocean" ? "해상" : "항공")).join(" / ");
}

function ModeIcon({ mode }: { mode: TransportMode }) {
  return mode === "ocean" ? <Ship size={14} /> : <PlaneTakeoff size={14} />;
}

function nextShipmentStatus(state: RequestState) {
  if (state === "requested" || state === "accepted") return "booked";
  if (state === "booked") return "in_transit";
  if (state === "in_transit") return "customs_hold";
  if (state === "customs_hold") return "delivered";
  return state === "cancelled" ? "cancelled" : "delivered";
}

export default async function AdminLogisticsPage() {
  const snapshot = await getPlatformOpsSnapshot();
  const logisticsCompanies = snapshot.logisticsCompanies;
  const shipmentRequests = snapshot.shipmentRequests;
  const activeShipments = snapshot.activeShipments;
  const shipmentEvents = snapshot.shipmentEvents;
  const sourceLabel = snapshot.storage === "database" ? "Supabase 물류 데이터" : "운영 프리뷰 데이터";
  const activeRequestCount = shipmentRequests.filter((request) => !["delivered", "cancelled"].includes(request.state)).length;
  const customsHoldCount = activeShipments.filter((shipment) => shipment.state === "customs_hold").length;
  const inTransitCount = activeShipments.filter((shipment) => shipment.state === "in_transit" || shipment.state === "booked").length;

  return (
    <>
      <header className="admin-section-hero">
        <div>
          <p>물류사 매칭·선적 추적</p>
          <h1>대만 수입 선적을 검증된 물류사에 매칭하고, 항공·해상 tracking과 식품·화장품 통관 handoff를 한 화면에서 관리합니다.</h1>
        </div>
        <Link className="admin-secondary-action" href="/admin/reviews">
          수입 증빙 검토
          <ArrowRight size={16} />
        </Link>
      </header>

      <section className="admin-metrics" aria-label="물류 운영 상태 요약">
        <article className="admin-metric good">
          <span>진행 요청</span>
          <strong>{activeRequestCount}</strong>
          <small>요청, 견적, 수락, 예약, 운송중, 통관보류 상태</small>
        </article>
        <article className="admin-metric info">
          <span>추적 선적</span>
          <strong>{activeShipments.length}</strong>
          <small>선박, 항공편, 통관사, ETA를 운영자가 확인합니다.</small>
        </article>
        <article className="admin-metric warn">
          <span>예약·운송중</span>
          <strong>{inTransitCount}</strong>
          <small>대만으로 이동 중인 항공 화물과 해상 화물</small>
        </article>
        <article className="admin-metric danger">
          <span>통관보류</span>
          <strong>{customsHoldCount}</strong>
          <small>통관 release 전 식품 또는 화장품 증빙이 필요합니다.</small>
        </article>
      </section>

      <section className="admin-grid">
        <article className="admin-panel admin-panel-wide">
          <div className="admin-panel-head">
            <div>
              <span>파트너 매칭</span>
              <h2>물류사 shortlist</h2>
            </div>
            <Truck size={18} />
          </div>
          <div className="admin-table">
            <div className="admin-table-head">
              <span>회사</span>
              <span>방식</span>
              <span>상태</span>
              <span>운영 적합성</span>
            </div>
            {logisticsCompanies.map((company) => (
              <div key={company.name} className="admin-table-row">
                <span>
                  <b>{company.name}</b>
                  <small>{company.lane}</small>
                </span>
                <span>{modesLabel(company.modes)}</span>
                <span>{partnerLabels[company.status]}</span>
                <span>
                  <b>{company.sla}</b>
                  <small>{company.strengths}</small>
                </span>
              </div>
            ))}
          </div>
        </article>

        <article className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <span>요청 상태</span>
              <h2>선적 워크플로 큐</h2>
            </div>
            <ClipboardList size={18} />
          </div>
          <div className="admin-queue-list">
            {requestStates.map((state) => (
              <div key={state} className={`admin-queue-item ${stateTone[state]}`}>
                <span>{stateLabels[state]}</span>
                <b>
                  {shipmentRequests.filter((request) => request.state === state).length +
                    activeShipments.filter((shipment) => shipment.state === state).length}
                  건
                </b>
                <p>{state === "customs_hold" ? "통관사 또는 기관이 release 전 증빙을 요구합니다." : "물류 매칭과 선적 추적 화면에서 같이 보입니다."}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="admin-panel admin-panel-wide">
          <div className="admin-panel-head">
            <div>
              <span>추적 콘솔</span>
              <h2>항공·해상 선적 monitor</h2>
            </div>
            <Ship size={18} />
          </div>
          <div className="admin-table">
            <div className="admin-table-head">
              <span>선적</span>
              <span>방식</span>
              <span>상태</span>
              <span>Tracking</span>
            </div>
            {activeShipments.map((shipment) => (
              <div key={shipment.id ?? shipment.reference} className="admin-table-row">
                <span>
                  <b>{shipment.reference}</b>
                  <small>{shipment.product}</small>
                </span>
                <span>
                  <ModeIcon mode={shipment.mode} /> {shipment.mode === "ocean" ? "해상" : "항공"}
                </span>
                <span>{stateLabels[shipment.state]}</span>
                <span>
                  <b>{shipment.vehicle}</b>
                  <small>{shipment.carrier} / {shipment.tracking}</small>
                  <small>{shipment.route} / ETA {shipment.eta}</small>
                  <small>{shipment.customs}</small>
                  <details className="admin-ops-disclosure">
                    <summary>운영 작업</summary>
                    <AdminRowActionDryRun
                      action="shipment_status"
                      id={shipment.id}
                      status={nextShipmentStatus(shipment.state)}
                      requestId={`shipment-${shipment.id ?? shipment.reference}`}
                      note={`${shipment.reference} shipment ${shipment.state} to ${nextShipmentStatus(shipment.state)}`}
                      fallbackUuid="00000000-0000-4000-8000-000000000202"
                    />
                  </details>
                </span>
              </div>
            ))}
          </div>
        </article>

        <article className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <span>이벤트 타임라인</span>
              <h2>선적 이벤트</h2>
            </div>
            <FileWarning size={18} />
          </div>
          <div className="admin-queue-list">
            {shipmentEvents.map((event) => (
              <div key={`${event.time}-${event.title}`} className={`admin-queue-item ${stateTone[event.state]}`}>
                <span>{event.time}</span>
                <b>{event.title}</b>
                <p>{event.detail}</p>
                <small>{event.location} / {stateLabels[event.state]}</small>
              </div>
            ))}
          </div>
        </article>

        <article className="admin-panel admin-panel-wide">
          <div className="admin-panel-head">
            <div>
              <span>대만 수입 핸드오프</span>
              <h2>식품·화장품 통관 playbook</h2>
            </div>
            <Handshake size={18} />
          </div>
          <div className="admin-review-list">
            {importHandoffs.map((handoff) => (
              <div key={`${handoff.productType}-${handoff.lane}`} className="admin-review-card">
                <span>{handoff.productType}</span>
                <b>{handoff.lane}</b>
                <p>{handoff.customsStep}</p>
                <small>{handoff.documents}</small>
                <em>{handoff.owner} / {handoff.next}</em>
              </div>
            ))}
          </div>
        </article>

        <article className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <span>운영 컨트롤</span>
              <h2>Release 준비도</h2>
            </div>
            <ShieldCheck size={18} />
          </div>
          <div className="admin-chip-list">
            <span><PackageCheck size={14} /> 식품 검사 증빙</span>
            <span><ShieldCheck size={14} /> 화장품 PIF 패킷</span>
            <span><Truck size={14} /> 통관사 배정</span>
            <span><Ship size={14} /> 선박 tracking</span>
            <span><PlaneTakeoff size={14} /> 항공화물 tracking</span>
            <span><ClipboardList size={14} /> 배송완료 증빙 보관</span>
          </div>
          <p className="admin-note">
            현재 표시 소스: {sourceLabel}. logistics_matches, shipment_requests, shipments, shipment_events를 분리해 요청 단계, 예약, 운송, 통관보류, 배송완료, 취소 상태를 같은 흐름에서 확인합니다.
            {snapshot.warnings[0] ? ` ${snapshot.warnings[0]}` : ""}
          </p>
        </article>
      </section>
    </>
  );
}
