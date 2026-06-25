# LabelPass

대만향 수출 라벨과 화장품 성분을 1차 검토하는 RegTech 워크스페이스입니다.

## 지금 구현된 것

- 대만 화장품 중심의 성분 스크리닝
- 라벨 필수 기재사항 점검
- 효능/광고 표현 위험 탐지
- 보관함, 규제 업데이트, 전문가 검수, 통관 보조 흐름
- TFDA 오픈데이터 수집 스크립트

## 실행

```bash
pnpm install
pnpm dev
```

## 공식 데이터 수집

```bash
pnpm fetch:tfda
pnpm build:rules
pnpm test:rules
pnpm build:supabase-seed
```

수집 결과는 `data/tfda/` 아래에 저장됩니다. 앱 판정 로직은 `data/rules/tw-cosmetics-rules.json`의 정규화 룰셋을 읽습니다.

## 검증

```bash
pnpm exec tsc --noEmit
pnpm test:rules
pnpm build
pnpm smoke:api
```

`pnpm smoke:api`는 `pnpm dev`가 실행 중일 때 로컬 검사 API를 호출합니다.

## Supabase / Vercel / GitHub 준비

- `supabase/schema.sql`: 기본 테이블, 인덱스, RLS 활성화
- `supabase/seed.sql`: TFDA 공식 데이터 1,081개 룰 적재용 seed
- `supabase/config.toml`: 로컬 Supabase 프로젝트 설정
- `vercel.json`: Vercel 배포 설정
- `.github/workflows/ci.yml`: 타입 검사와 빌드 CI
- `docs/deployment-runbook.md`: 로그인 후 GitHub/Supabase/Vercel 연결 순서

외부 프로젝트 생성은 Supabase/Vercel/GitHub 로그인 또는 액세스 토큰이 필요합니다.
