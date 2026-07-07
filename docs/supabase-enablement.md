# Supabase 적재·활성화 가이드

이 앱은 **Supabase 없이도 완전히 동작**합니다(지식은 번들 JSON, 검토 결과는 브라우저 localStorage).
아래는 실제 Supabase DB에 **지식을 적재**하고 **검토 결과를 클라우드에 영속화**하려는 경우의 단계입니다.

> ⚠️ 보안: 이 문서에는 **환경변수 이름만** 적습니다. 실제 값(DB URL·키·토큰)은 절대 저장소에 커밋하지 말고,
> Vercel 프로젝트 설정 또는 로컬 `.env.local`(gitignore됨)에만 넣으세요.

---

## 현재 상태 (자동으로 유지됨)
- 지식 용어 전체가 `data/knowledge/term-registry.json`(버전관리) → `term-index.json`으로 빌드되고,
  `supabase/knowledge-seed.sql`로 **자동 생성**됩니다.
- `pnpm check:knowledge-drift`가 **seed = registry 일치(드리프트 0)**를 보장합니다. 지식을 바꿀 때마다 seed가 갱신됩니다.
- 즉, **"Supabase 적재 준비 완료" 상태**이며, 아래는 실제 DB에 넣는 단계입니다.

---

## 1) 지식을 Supabase DB에 적재

필요 환경변수(값은 직접 입력):
- `SUPABASE_DB_URL` — Supabase Postgres 연결 문자열 (Project → Settings → Database → Connection string, `postgres://...`)
- (선택) `SUPABASE_EXPECTED_PROJECT_REF` — 실수로 다른 프로젝트에 적재하지 않도록 프로젝트 ref 확인용

절차(로컬에서):
```bash
# 0. 최초 1회: 스키마 마이그레이션 적용 (Supabase SQL editor에 supabase/migrations/*.sql 실행,
#    또는 supabase CLI: supabase db push)
# 1. 사전 점검 (연결·스키마·드리프트 확인, 실제 쓰기 없음)
SUPABASE_DB_URL='<값>' pnpm preflight:supabase-knowledge
# 2. 적재 (dry-run 먼저 권장)
SUPABASE_DB_URL='<값>' SUPABASE_APPLY_DRY_RUN=1 pnpm apply:supabase-knowledge   # 미리보기
SUPABASE_DB_URL='<값>' pnpm apply:supabase-knowledge                            # 실제 적재
# 3. 적재 검증
SUPABASE_DB_URL='<값>' pnpm verify:supabase-knowledge
```
적재 후 앱은 런타임에 Supabase를 **오버레이**로 병합합니다(실패 시 번들 JSON으로 자동 폴백).
런타임 오버레이를 켜려면 서버 환경에도 `SUPABASE_DB_URL`(또는 `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`)를 설정하세요.

---

## 2) 검토 결과(내 제품) 클라우드 영속화

Vercel 프로젝트 환경변수(값은 직접 입력):
- `SUPABASE_DB_URL`
- `LABELPASS_ENABLE_PUBLIC_REVIEW_ARCHIVE=1`
- `LABELPASS_ENABLE_PUBLIC_REVIEW_ARCHIVE_READ=1`
- `LABELPASS_ENABLE_PUBLIC_REVIEW_ARCHIVE_WRITE=1`
- (선택, 더 엄격히) `LABELPASS_REVIEW_ARCHIVE_TOKEN=<임의의 긴 비밀>` — 설정 시 공개 read/write 대신 토큰 인증

설정 후:
- 검토 콘솔·일괄 검토가 결과를 `products`/`reviews`/`findings` 테이블에 저장(브라우저별 `owner_key`로 격리).
- **내 제품**이 로드 시 이 브라우저의 저장분을 불러와 병합하고 **"클라우드 저장됨"** 배지를 표시합니다.
- 미설정 시에는 그대로 localStorage로 동작합니다(현재 기본값).

확인:
```bash
curl -s "https://<배포도메인>/api/reviews?owner_key=probe&limit=1"
# 활성화 전: {"storage":"disabled",...}  / 활성화 후: {"storage":"database","reviews":[...]}
```

---

## 3) 다기기·팀 동기화(로그인) — 다음 단계
`owner_key`는 브라우저별이라 기기 간 동기화는 안 됩니다. 진짜 다기기·팀 공유는 실제 인증이 필요합니다:
`@supabase/ssr` 도입 → `profiles`/`owner_id` 채우기 → 기존 `auth.uid()` 기반 RLS 정책(`supabase/migrations/…initial_schema.sql`)이 그대로 활성화 → 팀 배분·고객사 그룹핑까지 열립니다. (별도 개발 작업)

---

## 참고
- 스키마: `supabase/migrations/*.sql`, `supabase/schema.sql`
- 시드 생성: `pnpm build:knowledge-seed` (자동), 검증: `pnpm check:knowledge-drift`
- 앱 게이트: 지식 오버레이 = `SUPABASE_DB_URL` 존재 여부, 검토 아카이브 = 위 `LABELPASS_*` 플래그
