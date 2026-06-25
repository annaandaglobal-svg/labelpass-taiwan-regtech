# LabelPass 배포 실행 문서

기준일: 2026-06-25

## 현재 상태

- 로컬 앱: `http://127.0.0.1:3000`
- 빌드: `pnpm build` 통과
- 공식 규칙 검증: `pnpm test:rules` 통과
- API 스모크 테스트: `pnpm smoke:api` 통과
- Supabase/GitHub/Vercel 외부 프로젝트 생성: 로그인 또는 액세스 토큰 필요

## 로그인 후 1회 설정

### GitHub

1. `annaanda.global@gmail.com` 계정으로 GitHub에 로그인합니다.
2. 새 repository를 만듭니다.
   - 권장 이름: `labelpass-taiwan-regtech`
   - visibility: 초기 검증 전에는 private 권장
3. 로컬 저장소에 remote를 연결합니다.

```bash
git remote add origin https://github.com/<owner>/labelpass-taiwan-regtech.git
git push -u origin main
```

### Supabase

1. Supabase dashboard에서 새 프로젝트를 만듭니다.
   - 권장 이름: `labelpass-taiwan-regtech`
   - region: Taiwan 사용자가 많으면 Northeast Asia 계열 권장
2. SQL editor에서 `supabase/schema.sql`을 실행합니다.
3. seed가 필요하면 `supabase/seed.sql`을 실행합니다.
4. Project Settings > API에서 아래 값을 복사합니다.
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

### Vercel

1. Vercel에 로그인하고 GitHub repository를 import합니다.
2. Framework preset은 Next.js로 둡니다.
3. Environment Variables에 Supabase 값을 입력합니다.
4. 첫 배포 후 Production URL을 Supabase Auth redirect URL에 추가합니다.

## 배포 전 확인

```bash
pnpm install
pnpm exec tsc --noEmit
pnpm test:rules
pnpm build
```

로컬 서버가 켜져 있을 때:

```bash
pnpm smoke:api
```

## 데이터 갱신 절차

TFDA 공식 오픈데이터를 새로 가져올 때:

```bash
pnpm refresh:rules
pnpm test:rules
pnpm build:supabase-seed
```

검증이 통과하면 `data/rules/tw-cosmetics-rules.json`, `data/rules/manifest.json`, `supabase/seed.sql`을 함께 커밋합니다.

## 주의 사항

- `data/tfda/` 원본 다운로드 파일은 git에 올리지 않습니다.
- `SUPABASE_SERVICE_ROLE_KEY`는 Vercel server-side environment variable로만 넣고 브라우저에 노출하지 않습니다.
- 규칙 판정 API는 현재 `/api/review`에서 서버 실행되므로, 대형 규칙 JSON이 화면 번들에 포함되지 않습니다.
- 공식 프로젝트 생성은 2026-06-25 확인 기준으로 GitHub/Supabase/Vercel 로그인 화면에서 막혀 있습니다.
