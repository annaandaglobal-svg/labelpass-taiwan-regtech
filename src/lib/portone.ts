// PortOne 결제 연동 준비 계층.
// 실제 키가 없으면 mock 결제 세션으로 흐름을 이어가고, 키가 채워지면
// 같은 API 계약 위에서 PortOne 서버 SDK 호출로 교체할 수 있게 유지합니다.
// 환경변수 값은 어디에도 출력하지 않고 존재 여부만 노출합니다.

export type PaymentProvider = "portone" | "mock_demo";

export type PortoneReadiness = {
  provider: PaymentProvider;
  storeIdPresent: boolean;
  channelKeyPresent: boolean;
  apiSecretPresent: boolean;
  webhookSecretPresent: boolean;
  requiredEnv: string[];
  warnings: string[];
};

export type CheckoutSession = {
  ok: true;
  provider: PaymentProvider;
  paymentId: string;
  status: "paid" | "pending";
  amountUsd: number;
  title: string;
  caseId: string;
  message: string;
};

const REQUIRED_ENV = ["PORTONE_STORE_ID", "PORTONE_CHANNEL_KEY", "PORTONE_API_SECRET", "PORTONE_WEBHOOK_SECRET"] as const;

export function portoneReadiness(): PortoneReadiness {
  const storeIdPresent = Boolean(process.env.PORTONE_STORE_ID);
  const channelKeyPresent = Boolean(process.env.PORTONE_CHANNEL_KEY);
  const apiSecretPresent = Boolean(process.env.PORTONE_API_SECRET);
  const webhookSecretPresent = Boolean(process.env.PORTONE_WEBHOOK_SECRET);
  const allPresent = storeIdPresent && channelKeyPresent && apiSecretPresent && webhookSecretPresent;

  const warnings: string[] = [];
  if (!allPresent) {
    warnings.push("PortOne 환경변수가 모두 설정되기 전까지 결제는 mock 데모 모드로 동작합니다.");
  } else {
    warnings.push("PortOne 키는 감지됐지만 서버 SDK 호출은 아직 연결 전이라 mock 세션으로 응답합니다.");
  }

  return {
    provider: allPresent ? "portone" : "mock_demo",
    storeIdPresent,
    channelKeyPresent,
    apiSecretPresent,
    webhookSecretPresent,
    requiredEnv: [...REQUIRED_ENV],
    warnings
  };
}

export function createCheckoutSession(input: { caseId: string; title: string; amountUsd: number }): CheckoutSession {
  const readiness = portoneReadiness();
  const paymentId = `pay-${input.caseId.slice(0, 12)}-${Date.now().toString(36)}`;

  // mock 데모: 즉시 결제 완료 상태를 돌려서 상담방이 열리는 흐름을 끝까지 보여줍니다.
  // PortOne 연동 시: 여기서 결제창용 사전등록(payment pre-register)을 만들고
  // status: "pending" + 결제창 파라미터를 돌려준 뒤, 웹훅에서 완료 처리합니다.
  return {
    ok: true,
    provider: readiness.provider,
    paymentId,
    status: "paid",
    amountUsd: input.amountUsd,
    title: input.title,
    caseId: input.caseId,
    message:
      readiness.provider === "mock_demo"
        ? "mock 결제가 완료 처리됐습니다. 실제 결제는 PortOne 키 설정 후 활성화됩니다."
        : "PortOne 키가 감지됐지만 SDK 연동 전이라 mock 결제로 완료 처리했습니다."
  };
}
