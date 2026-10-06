# BYTE BACK 방어전 2단계 저장점

현재 저장소는 **2단계: 자료를 코드 밖으로 이동** 상태입니다.

- 저장소: https://github.com/youmjjang/choi-bujang-secret-vault
- Production: https://choi-bujang-secret-vault-6trg.vercel.app
- 단계 설정: `aleph.config.json`의 `step: 2`

## 현재 동작

화면은 공개 정적 파일에서 메모를 읽지 않습니다. 브라우저는 `/api/notes`를 호출하고, Vercel 서버 함수가 학습용 Supabase의 `learning_notes` 테이블을 읽습니다.

서버 함수는 `SUPABASE_URL`과 `SUPABASE_SECRET_KEY`를 Vercel 환경변수에서만 읽습니다. 비밀키는 GitHub 파일, 정적 파일, 브라우저 응답에 넣지 않습니다.

`/data.json`은 현재 다음처럼 메모가 없는 상태를 유지합니다.

```json
{
  "notes": []
}
```

Supabase의 `learning_notes` 테이블에는 `owner_id uuid` 컬럼이 있고 `auth.users` 외래키는 걸지 않았습니다. RLS를 켜고 `anon`, `authenticated`에는 테이블 읽기 권한을 주지 않습니다. 서버의 `service_role`만 메모 조회에 필요한 권한을 사용합니다.

## 2단계에 남아 있는 약점

`/api/notes` 자체에는 아직 로그인이나 사용자별 접근 제어가 없습니다. 따라서 **2단계에서는 비로그인 사용자가 공개 API 주소를 직접 호출해 가상 메모를 읽을 수 있습니다.** 이 접근 제어는 다음 단계에서 추가할 대상입니다.

또한 1단계의 공개 Git 커밋과 과거 Vercel 배포가 남아 있으므로, 과거에 공개됐던 가상 메모를 완전히 회수했다고 표현하지 않습니다. 현재 최신 정적 파일에서 메모를 제거한 상태라고만 기록합니다.

## 확인 절차

최신 GitHub 파일에서 각 가상 메모 본문 문장을 검색했을 때 결과가 없어야 합니다. 로컬 저장소가 있다면 다음 형태로 확인할 수 있습니다.

```sh
git grep -n -F "<가상 메모 본문 한 문장>" HEAD -- .
```

Production 배포 뒤에는 다음을 확인합니다.

1. `/` 화면에 가상 메모 카드가 정상 표시되는지 확인합니다.
2. `/data.json`의 `notes`가 빈 배열인지 확인합니다.
3. `/api/notes`가 현재 단계에서는 가상 메모를 반환하는 공개 API인지 확인합니다.
4. 정적 파일과 최신 GitHub 파일에 가상 메모 본문이 남아 있지 않은지 확인합니다.

## 다시 실행하기

로컬 정적 빌드는 다음 명령으로 확인합니다.

```sh
npm run build -- --local
```

Vercel Production은 GitHub `main`의 최신 커밋을 배포합니다. `SUPABASE_URL`과 `SUPABASE_SECRET_KEY`는 Vercel 환경변수로만 설정합니다.

비밀번호, 토큰, 서버 전용 키, 실제 개인정보는 코드·로그·README·Git 커밋에 넣지 않습니다.
