# 학습 루프 (unknown → verified KB)

상담챗/검토가 **모르는 성분·주제**를 만났을 때, 그것이 데이터로 남아 **검증을 거쳐 KB에 반영**되고 툴이 계속 좋아지게 하는 반자동 루프입니다.

## 왜 완전 자동이 아닌가
규제 판정은 틀리면 **통관 반려·리콜**로 이어집니다. 그래서 미검증 AI 조사 결과를 곧바로 authoritative KB에 쓰지 않습니다. AI 조사는 **초안**이고, 1차 출처 대조·검증을 거친 것만 큐레이션 KB로 승격합니다.

## 루프 4단계

1. **포착 (자동)** — 상담챗이 근거를 못 찾으면(`no-context`):
   - 서버 로그에 `[consult-unknown] <질문>` (프로덕션에서도 남음)
   - `data/knowledge/learning-queue.json`에 누적 (쓰기 가능한 로컬/개발 fs에서). `src/lib/learning-queue.ts`
   - 사용자에게는 정직한 "확인 필요" + AI 추론(미검증) 힌트를 이미 제공

2. **우선순위 (조회)** — `pnpm learn:report`
   - 미커버 주제를 빈도순으로 정렬해 다음 조사 대상을 뽑음

3. **조사 + 검증 (사람 주도)** — 큐의 pending 항목을 리서치 에이전트로 조사:
   - fda.gov.tw / law.moj.gov.tw 1차 출처 대조, 수치는 근거 있을 때만, UNVERIFIED 표시
   - 필요 시 다각 검증(adversarial)

4. **편입 + 배포** — 검증된 것만 KB로:
   - `src/lib/knowledge-verdicts.ts`에 판정 추가 (필요 시 새 category)
   - `verdictSurfacedCategories`(compliance.ts) 등록 + `data/knowledge/term-registry.json`에 용어·별칭 추가
   - `pnpm build:terms && pnpm build:knowledge-seed && pnpm export:knowledge-playbooks`
   - 검증: `pnpm validate:knowledge` (0) · `pnpm audit:knowledge-verdicts` (0) · `pnpm test:consult-coverage` · `pnpm check:knowledge-drift` (0)
   - 큐 항목 status를 `ingested`로, 커밋 → 자동 배포

## 커버리지 회귀 방지
`pnpm test:consult-coverage` (CI, smoke 뒤) — 흔한 성분 30개가 항상 KB 근거로 잡히는지 검사. 커버리지가 떨어지면 사용자가 겪기 전에 CI가 잡음.

## 프로덕션 포착의 한계
Vercel 서버리스는 파일 쓰기가 안 되므로(읽기전용), 프로덕션 미상은 **서버 로그**(`[consult-unknown]`)로만 남습니다. 로컬/개발에서는 큐 파일에 누적됩니다. 진짜 크로스-디바이스 집계가 필요하면 Supabase 쓰기(운영자 시크릿)로 큐를 옮기면 됩니다.

## 예시 (실제 1회 패스)
`폴리글루타믹애씨드`(PGA)가 상담챗에서 no-context → 큐 기록 → 조사(대만 화장품/식품 규제) → 검증 → `polyglutamic-acid` 용어+판정 편입 → 갭 닫힘. `learn:report`에서 `ingested`로 이동.
