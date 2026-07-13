# Music Spot 백엔드 — 작업 가이드

스프린트 미션 7. 랜딩 페이지(`music-spot-landing`)에 붙는 서버 API를 만들고 Render에 배포한다.

## 문서 작성 가이드

- 한글로 작성합니다.
- 문서는 200줄 이하로 완성합니다.

## 코드 작성 가이드

- 함수 내부에 논리 단위로 주석을 답니다.
- 주석은 짧고 간결한 한 문장으로, **왜 그렇게 했는지**를 씁니다. 코드를 읽으면 아는 사실(무엇을 하는지)은 쓰지 않습니다.
- 사용자에게 보이는 모든 메시지는 한글로 씁니다.

## 아키텍처 — 헥사고날 (포트 & 어댑터)

의존성은 **항상 안쪽(application)을 향한다.** 바깥 레이어를 안쪽에서 import하면 안 된다.

```
inbound/          바깥 → 안: HTTP 요청을 받는 어댑터
  controllers/    라우팅. zod로 입력을 검증하고 서비스를 호출한다. 비즈니스 로직 금지.
  schemas/        zod 스키마. 요청 본문·파라미터의 형태를 정의한다.
  middlewares/    인증(auth), 에러 처리(error)

application/      핵심. 프레임워크도 DB도 모른다.
  services/       비즈니스 규칙. 인터페이스(contract)만 주입받는다.
  contracts/      repo 인터페이스 (IUserRepo, IRoomRepo)
  domain/         순수 함수 규칙 (normalizeEmail, toPublicUser)

outbound/         안 → 바깥: DB에 나가는 어댑터
  repos/          Prisma 구현체. contract를 구현한다.

shared/           모든 레이어가 쓰는 공용
  config/env.ts   환경변수 검증 (시작 시 1회, 실패하면 즉시 종료)
  contracts/      IJwtUtil, IHashUtil
  utils/          jwt, bcrypt 구현체
  exceptions/     BusinessException, TechnicalException

bootstrap.ts      조립 공장. 구체 구현을 아는 유일한 곳 (repo → service → controller)
index.ts          express 앱 + 미들웨어 + 라우터 마운트
```

### DI 방식

클래스가 아니라 **팩토리 함수 + 클로저**를 쓴다.

```ts
export const createRoomService = (
  findAll: IRoomRepo["findAll"],
  findById: IRoomRepo["findById"],
) => {
  const getRooms = async () => { ... };
  return { getRooms };
};
export type RoomServiceType = ReturnType<typeof createRoomService>;
```

서비스는 **구현체가 아니라 인터페이스의 메서드 타입**을 인자로 받는다. 그래야 테스트에서 `jest.fn<IRoomRepo["findAll"]>()`을 그대로 꽂을 수 있다.

## 반드시 지킬 규약

### 1. 주입받는 것에는 계약서가 있어야 한다

의존성으로 주입되는 모든 함수·객체는 `contracts/`에 인터페이스가 있어야 한다. 없으면 **작업을 중단하고 알린다.**

### 2. 에러는 두 종류뿐이다

|                      | 용도                                           | 응답                                         |
| -------------------- | ---------------------------------------------- | -------------------------------------------- |
| `BusinessException`  | 사용자가 이해하고 고칠 수 있는 문제            | `statusCode` + `message` 그대로 노출         |
| `TechnicalException` | 시스템 내부 사정 (DB 제약 위반, JWT 서명 오류) | 500 + 뭉뚱그린 메시지, 서버 로그에 원본 기록 |

`BusinessException` 하위 클래스로 상태코드를 표현한다. 새 상태코드가 필요하면 클래스를 추가한다.

- `BadRequestException` 400 — 입력값 검증 실패
- `UnauthorizedException` 401 — 토큰 없음·만료·위조, 로그인 실패
- `NotFoundException` 404 — 없는 리소스
- `ConflictException` 409 — 이메일 중복

**TechnicalException을 그대로 밖으로 흘리지 않는다.** repo에서 던진 것은 service에서 잡아 BusinessException으로 번역한다. (예: Prisma `P2002` → `EMAIL_DUPLICATED` → `ConflictException("이미 가입된 이메일입니다.")`)

### 3. 비밀번호 해시는 절대 응답에 넣지 않는다

`User`를 밖으로 내보낼 때는 **반드시** `toPublicUser()`를 거친다. `prismaClient.user.findUnique()` 결과를 그대로 `res.json()` 하면 해시가 새어나간다. 테스트로 막아두었으니 깨뜨리지 말 것.

### 4. 로그인 실패 메시지는 갈라놓지 않는다

"없는 계정"과 "비밀번호 틀림"은 **같은 메시지·같은 상태코드**로 응답한다. 메시지가 갈리면 그 이메일의 가입 여부를 알아내는 통로가 된다.

### 5. 환경변수는 `shared/config/env.ts`를 통해서만 읽는다

`process.env.X`를 코드 여기저기서 직접 읽지 않는다. env.ts가 시작 시 zod로 검증하고 실패하면 서버를 죽인다(fail fast). 런타임 한복판에서 `undefined`인 JWT_SECRET으로 서명하는 사고를 막기 위함이다.

## 서비스 코드 작성 가이드 (TDD)

`application/services/` 코드를 쓸 때:

1. 구현하려는 기능의 **해피패스만** 테스트로 먼저 쓴다. 실패시킨다.
2. 해피패스를 통과하는 최소한의 서비스 코드를 쓴다.
3. **개발자에게 검토를 요청한다.**
4. 합의되면, 다음으로 **가장 크리티컬한 실패 케이스 2개**를 제안하고 어떤 것을 테스트할지 의논한다.
5. 합의된 것만 테스트로 쓰고, 통과하도록 서비스를 고친다.

테스트는 `*.service.test.ts`로 구현체 옆에 둔다. 가짜 의존성은 `jest.fn<IUserRepo["findUserByEmail"]>()`처럼 **계약 타입으로** 만든다.

실패 케이스에서 최소한 이건 확인한다: 에러가 났을 때 **토큰을 발급하지 않았는지**, **DB에 쓰지 않았는지**.

## 명령어

작업이 끝나면 **반드시** 아래 둘을 실행한다.

```bash
npm run type     # tsc --noEmit — 타입 검사
npm test         # jest — 전체 테스트
```

테스트가 깨지면:

- **새로 쓴 테스트**가 깨졌다 → 직접 고친다.
- **기존 테스트**가 깨졌다 → **작업을 중단하고** 원인을 분석해 간단히 알린다. 기존 테스트를 지우거나 완화해서 통과시키지 않는다.

그 밖의 명령어:

```bash
npm run dev              # tsx watch — 개발 서버
npm run seed             # prisma/data/rooms.json → DB (sourceUrl 기준 upsert. 여러 번 실행해도 안전)
npx tsx scripts/build-rooms.ts <csv경로>   # 크롤링 CSV → prisma/data/rooms.json 재생성
npx prisma migrate dev   # 스키마 변경 → 마이그레이션 생성
npx prisma studio        # DB GUI
```

## 연습실 데이터

연습실 576곳은 **크롤링 데이터를 정제해 시드**한다. 손으로 넣지 않는다.

- 원본 CSV는 저장소 밖(`~/Desktop/Music-Spot/musicspot_app/data`)에 있고 배포 서버에는 없다.
- `scripts/build-rooms.ts`가 정제해 `prisma/data/rooms.json`을 만들고, **이 JSON만 커밋**한다. seed는 JSON만 읽는다.
- 정제 규칙: spacecloud 출처만(mule은 월세 매물 광고라 제외) · 악기/보컬 카테고리만(댄스 전용 스튜디오 제외) · 이름+주소·URL 중복 제거 · 주소에서 `sido`/`gungu` 파싱(실패한 행은 버린다).
- 카테고리는 `합주실` / `음악연습실` 두 가지로 줄여 검색 필터로 쓴다.

## 배포 (Render) 시 주의

- `src/generated/prisma`는 **gitignore 대상**이다. 빌드 커맨드에 `prisma generate`가 없으면 배포가 깨진다. (`npm run build`에 포함되어 있음)
- 스키마를 바꿨으면 Render 배포 시 `prisma migrate deploy`가 돌아야 한다. `migrate dev`는 배포 환경에서 쓰지 않는다.
- 무료 플랜은 15분 무요청 시 잠든다. 프론트가 `/health`로 깨우므로 이 엔드포인트를 없애지 말 것.
- 새 오리진에서 프론트를 띄우면 Render의 `CORS_ORIGIN` 환경변수에 추가해야 한다.

## 프론트엔드 (`music-spot-landing`)

FSD(Feature-Sliced Design) 구조를 쓰는 **별도 저장소**다. 백엔드 구조와 섞지 않는다.

화면에 살아 있는 기능은 **회원가입 · 주변 연습실 검색 · 커뮤니티** 셋뿐이다. 메뉴에 다른 항목을 늘리지 않는다.

응답 형태를 바꾸면 프론트가 깨진다. 바꿀 때는 양쪽을 같이 고친다.

| 엔드포인트                                             | 응답                                                         |
| ------------------------------------------------------ | ------------------------------------------------------------ |
| `POST /api/auth/signup`·`signin`                       | `{ token, user }`                                            |
| `GET /api/users/me`                                    | `{ me }`                                                     |
| `GET /api/rooms?sido&gungu&category&keyword&page&size` | `{ rooms, total, page, size, totalPages, hasNext }`          |
| `GET /api/rooms/regions`                               | `{ regions: [{ sido, count, gungus: [{ gungu, count }] }] }` |
| `GET /api/rooms/:id`                                   | `{ room }`                                                   |
| `GET /api/posts?page&size`                             | `{ posts, total, page, size, totalPages, hasNext }`          |
| `POST /api/posts` (인증) · `GET /api/posts/:id`        | `{ post }`                                                   |
| 에러                                                   | `{ message }`                                                |

게시글의 작성자는 **`toPublicPost()`를 거쳐** `{ id, username }`만 나간다. `include: { author: true }` 결과를 그대로 `res.json()` 하면 비밀번호 해시가 샌다.
