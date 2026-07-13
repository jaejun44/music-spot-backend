# Music Spot — 백엔드

밴드 연습실 매칭 서비스 [Music Spot](https://www.musicspotfest.com/) 랜딩 페이지의 백엔드 API 서버입니다.
스프린트 미션 6에서 만든 프론트엔드의 Mock 데이터를 걷어내고, 실제 PostgreSQL에 데이터를 저장하는 서버를 붙였습니다.

- **배포된 랜딩 페이지**: https://music-spot-landing.vercel.app
- **배포된 API**: https://music-spot-backend-2wcj.onrender.com
- **프론트엔드 저장소**: [music-spot-landing](https://github.com/jaejun44/music-spot-landing)

## 기술 스택

| 분류          | 사용 기술                         |
| ------------- | --------------------------------- |
| 런타임        | Node.js 24, TypeScript (ESM)      |
| 웹 프레임워크 | Express 5                         |
| 데이터베이스  | PostgreSQL 18                     |
| ORM           | Prisma 7 (`@prisma/adapter-pg`)   |
| 인증          | JSON Web Token, bcrypt            |
| 검증          | zod                               |
| 보안          | helmet, cors, express-rate-limit  |
| 테스트        | Jest + ts-jest (64개 통과)        |
| 배포          | Render (Web Service + PostgreSQL) |

## 아키텍처 — 헥사고날 (포트 & 어댑터)

의존성이 항상 안쪽(`application`)을 향합니다. 핵심 비즈니스 로직은 Express도 Prisma도 모릅니다.

```
src/
├── inbound/              HTTP 요청을 받는 어댑터
│   ├── controllers/      라우팅 + zod 검증 (auth, user, room)
│   ├── schemas/          요청 스키마
│   └── middlewares/      인증(JWT), 에러 처리
├── application/          핵심 — 프레임워크·DB를 모른다
│   ├── services/         비즈니스 규칙 (+ .test.ts)
│   ├── contracts/        repo 인터페이스 (IUserRepo, IRoomRepo)
│   └── domain/           순수 규칙 (normalizeEmail, toPublicUser)
├── outbound/repos/       Prisma 구현체
├── shared/               config(env), utils(jwt/bcrypt), exceptions
├── bootstrap.ts          조립 공장 (repo → service → controller)
└── index.ts              Express 앱
```

서비스는 구현체가 아니라 **인터페이스**를 주입받습니다. 그래서 테스트에서 DB 없이 가짜를 꽂아 검증할 수 있습니다.

## 빠른 시작

```bash
# 1. 의존성 설치
npm install

# 2. 환경변수 설정
cp .env.example .env    # DATABASE_URL, JWT_SECRET 채우기

# 3. 데이터베이스 준비
createdb music-spot
npx prisma migrate dev  # 테이블 생성
npm run seed            # 연습실 576곳 시드 (prisma/data/rooms.json)

# 4. 서버 실행
npm run dev             # http://localhost:3000
```

### 명령어

| 명령어          | 설명                                  |
| --------------- | ------------------------------------- |
| `npm run dev`   | 개발 서버 (파일 변경 시 자동 재시작)  |
| `npm run build` | `prisma generate` + TypeScript 컴파일 |
| `npm start`     | 프로덕션 서버                         |
| `npm test`      | Jest 테스트                           |
| `npm run type`  | 타입 검사                             |
| `npm run seed`  | 연습실 시드 (여러 번 실행해도 안전)   |

## 데이터 모델

```prisma
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique   // 소문자로 정규화해서 저장
  password  String             // bcrypt 해시 (평문 저장 안 함)
  username  String
  createdAt DateTime @default(now())
}

model Room {
  id           Int      @id @default(autoincrement())
  name         String   // "홍대 예쎄뮤직 연습실 합주실"
  address      String
  sido         String   // "서울"  — 지역 드롭다운 1단계
  gungu        String   // "마포구" — 지역 드롭다운 2단계
  category     String   // "합주실" | "음악연습실"
  pricePerHour Int?     // 시간당 요금. 패키지 요금만 있는 곳은 null
  imageUrl     String?
  phone        String?
  rating       Float?
  reviewCount  Int?
  hours        String?  // "0~24시"
  sourceUrl    String   @unique // 원본 상세 페이지. 재시드 시 중복을 막는 기준 키
  createdAt    DateTime @default(now())
}

model Post {
  id        Int      @id @default(autoincrement())
  title     String
  content   String
  authorId  Int      // User와 관계. 유저가 지워지면 글도 함께 지워진다
  createdAt DateTime @default(now())
}
```

연습실 576곳은 크롤링 데이터를 정제해 시드합니다. 자세한 규칙은 `CLAUDE.md`의 "연습실 데이터"를 보세요.

---

# API 문서

Base URL — 로컬 `http://localhost:3000` / 배포 `https://music-spot-backend-2wcj.onrender.com`

모든 요청·응답은 `application/json`입니다.

## 엔드포인트 요약

| 메서드 | 경로                 | 인증 | 설명                      |
| ------ | -------------------- | :--: | ------------------------- |
| GET    | `/health`            |      | 서버 상태 확인            |
| POST   | `/api/auth/signup`   |      | 회원가입                  |
| POST   | `/api/auth/signin`   |      | 로그인                    |
| POST   | `/api/auth/signout`  |      | 로그아웃                  |
| GET    | `/api/users/me`      |  🔒  | 내 정보 조회              |
| GET    | `/api/rooms`         |      | 연습실 검색 (지역·키워드) |
| GET    | `/api/rooms/regions` |      | 지역 목록 (드롭다운용)    |
| GET    | `/api/rooms/:id`     |      | 연습실 상세               |
| GET    | `/api/posts`         |      | 커뮤니티 글 목록          |
| POST   | `/api/posts`         |  🔒  | 글 작성                   |
| GET    | `/api/posts/:id`     |      | 글 상세                   |
| DELETE | `/api/posts/:id`     |  🔒  | 글 삭제 (작성자 본인만)   |

🔒 = `Authorization: Bearer <token>` 헤더 필요

---

## POST `/api/auth/signup` — 회원가입

가입에 성공하면 곧바로 토큰을 발급합니다.

**요청**

```json
{
  "email": "rocker@musicspot.com",
  "password": "1234",
  "username": "재준"
}
```

| 필드       | 타입   | 규칙                                                      |
| ---------- | ------ | --------------------------------------------------------- |
| `email`    | string | 이메일 형식. 대소문자를 구분하지 않습니다(소문자로 저장). |
| `password` | string | 4~72자                                                    |
| `username` | string | 1~20자                                                    |

**응답 `201 Created`**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { "id": 1, "email": "rocker@musicspot.com", "username": "재준" }
}
```

| 상태  | 상황        | 메시지                                            |
| ----- | ----------- | ------------------------------------------------- |
| `400` | 검증 실패   | `"✖ 이메일 형식이 올바르지 않습니다. → at email"` |
| `409` | 이메일 중복 | `"이미 가입된 이메일입니다."`                     |

---

## POST `/api/auth/signin` — 로그인

**요청**

```json
{ "email": "rocker@musicspot.com", "password": "1234" }
```

**응답 `200 OK`**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { "id": 1, "email": "rocker@musicspot.com", "username": "재준" }
}
```

토큰의 유효기간은 **1시간**입니다.

| 상태  | 상황                             | 메시지                                        |
| ----- | -------------------------------- | --------------------------------------------- |
| `400` | 검증 실패                        | zod 에러 메시지                               |
| `401` | 계정 없음 **또는** 비밀번호 틀림 | `"이메일 또는 비밀번호가 일치하지 않습니다."` |

> 두 경우의 메시지를 일부러 똑같이 맞췄습니다. 메시지가 갈리면 "그 이메일은 가입되어 있다"는 사실이 새어나갑니다.

---

## POST `/api/auth/signout` — 로그아웃

**응답 `200 OK`**

```json
{ "message": "로그아웃되었습니다." }
```

> JWT는 서버에 상태가 없어서 서버가 토큰을 무효화할 수 없습니다. 실제 로그아웃은 클라이언트가 저장된 토큰을 버리는 것으로 이뤄집니다.

---

## GET `/api/users/me` — 내 정보 조회 🔒

**요청 헤더**

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**응답 `200 OK`**

```json
{ "me": { "id": 1, "email": "rocker@musicspot.com", "username": "재준" } }
```

비밀번호 해시는 **어떤 응답에도 포함되지 않습니다.**

| 상태  | 상황          | 메시지                                           |
| ----- | ------------- | ------------------------------------------------ |
| `401` | 토큰 없음     | `"로그인이 필요합니다."`                         |
| `401` | 토큰 위조     | `"유효하지 않은 토큰입니다."`                    |
| `401` | 토큰 만료     | `"세션이 만료되었습니다. 다시 로그인 해주세요."` |
| `404` | 유저가 사라짐 | `"존재하지 않는 유저입니다."`                    |

---

## GET `/api/rooms` — 연습실 검색

랜딩의 "주변 연습실 검색"을 채우는 공개 API입니다. 필터는 모두 선택값이고, 비우면 전체를 뜻합니다.

**쿼리 파라미터**

| 이름       | 예시     | 설명                                     |
| ---------- | -------- | ---------------------------------------- |
| `sido`     | `서울`   | 시/도                                    |
| `gungu`    | `마포구` | 시·군·구                                 |
| `category` | `합주실` | `합주실` 또는 `음악연습실`               |
| `keyword`  | `드럼`   | 이름·주소를 대소문자 구분 없이 부분 검색 |
| `page`     | `1`      | 기본 1                                   |
| `size`     | `12`     | 기본 12, 최대 48                         |

**응답 `200 OK`** — 후기가 많은 곳부터 나옵니다.

```json
{
  "rooms": [
    {
      "id": 43,
      "name": "홍대 예쎄뮤직 연습실 합주실",
      "address": "서울특별시 마포구 서교동 380-47 지하",
      "sido": "서울",
      "gungu": "마포구",
      "category": "합주실",
      "pricePerHour": 6000,
      "imageUrl": "https://...",
      "phone": null,
      "rating": 5,
      "reviewCount": 38,
      "hours": "9~23시",
      "sourceUrl": "https://www.spacecloud.kr/space/10336",
      "createdAt": "2026-07-13T09:35:51.633Z"
    }
  ],
  "total": 19,
  "page": 1,
  "size": 12,
  "totalPages": 2,
  "hasNext": true
}
```

조건에 맞는 곳이 없으면 `total: 0`, 빈 배열을 돌려줍니다. (에러가 아닙니다)

---

## GET `/api/rooms/regions` — 지역 목록

지역 드롭다운을 채웁니다. 연습실이 없는 지역은 아예 나오지 않습니다.

**응답 `200 OK`** — 연습실이 많은 지역부터 나옵니다.

```json
{
  "regions": [
    {
      "sido": "서울",
      "count": 374,
      "gungus": [
        { "gungu": "마포구", "count": 57 },
        { "gungu": "서초구", "count": 46 }
      ]
    }
  ]
}
```

---

## GET `/api/rooms/:id` — 연습실 상세

**응답 `200 OK`** — `{ "room": { ...위 rooms 항목과 같은 형태 } }`

| 상태  | 상황             | 메시지                                     |
| ----- | ---------------- | ------------------------------------------ |
| `400` | id가 숫자가 아님 | `"✖ 연습실 ID는 숫자여야 합니다. → at id"` |
| `404` | 없는 id          | `"존재하지 않는 연습실입니다."`            |

---

## GET `/api/posts` — 커뮤니티 글 목록

최신순입니다. `page`(기본 1) · `size`(기본 10, 최대 30)를 받습니다.

**응답 `200 OK`**

```json
{
  "posts": [
    {
      "id": 2,
      "title": "홍대 합주 멤버 구합니다",
      "content": "기타/보컬 있고 드럼 구해요.",
      "author": { "id": 4, "username": "테스터" },
      "createdAt": "2026-07-13T09:43:48.997Z"
    }
  ],
  "total": 1,
  "page": 1,
  "size": 10,
  "totalPages": 1,
  "hasNext": false
}
```

작성자는 `{ id, username }`만 나갑니다. 이메일과 비밀번호 해시는 절대 포함되지 않습니다.

---

## POST `/api/posts` — 글 작성 🔒

**요청** — 작성자는 본문이 아니라 **토큰**에서 정해집니다. 남의 이름으로 글을 쓸 수 없습니다.

```json
{ "title": "합주 멤버 구합니다", "content": "드럼 칠 사람 찾아요." }
```

**응답 `201 Created`** — `{ "post": { ...위 목록 항목과 같은 형태 } }`

| 상태  | 상황                    | 메시지                                                |
| ----- | ----------------------- | ----------------------------------------------------- |
| `400` | 제목·내용 비었거나 초과 | `"제목을 입력해주세요."` (제목 60자·내용 2000자 제한) |
| `401` | 토큰 없음·만료          | `"로그인이 필요합니다."`                              |

---

## GET `/api/posts/:id` — 글 상세

**응답 `200 OK`** — `{ "post": { ... } }` / 없는 id면 `404 "존재하지 않는 게시글입니다."`

---

## DELETE `/api/posts/:id` — 글 삭제 🔒

**작성자 본인만** 지울 수 있습니다. 주인이 아니면 DB에 손도 대지 않고 거절합니다.

**응답 `200 OK`** — `{ "message": "글을 삭제했습니다." }`

| 상태  | 상황           | 메시지                               |
| ----- | -------------- | ------------------------------------ |
| `401` | 토큰 없음·만료 | `"로그인이 필요합니다."`             |
| `403` | 남의 글        | `"내가 쓴 글만 삭제할 수 있습니다."` |
| `404` | 없는 id        | `"존재하지 않는 게시글입니다."`      |

---

## 에러 응답 규약

모든 에러는 같은 형태입니다.

```json
{ "message": "사람이 읽을 수 있는 한글 메시지" }
```

| 상태  | 의미                                                            |
| ----- | --------------------------------------------------------------- |
| `400` | 입력값이 잘못됨 — 고쳐서 다시 보내면 된다                       |
| `401` | 인증 실패 — 로그인이 필요하거나 토큰이 유효하지 않다            |
| `404` | 없는 리소스 / 없는 엔드포인트                                   |
| `409` | 이미 존재함 (이메일 중복)                                       |
| `429` | 요청이 너무 잦음 (15분당 API 200회, 로그인 30회)                |
| `500` | 서버 내부 오류 — 상세 원인은 노출하지 않고 서버 로그에만 남긴다 |

---

# 점검하기

## Postman으로 API 점검

`postman/` 폴더의 파일 3개를 Postman에 Import합니다.

1. **Import** → `postman/music-spot.postman_collection.json` (컬렉션)
2. **Import** → `postman/music-spot.local.postman_environment.json` (로컬용 환경)
3. **Import** → `postman/music-spot.render.postman_environment.json` (배포용 환경)
4. 우측 상단에서 환경을 고른 뒤, 컬렉션 **Run** 버튼을 누릅니다.

요청 16개가 위에서 아래로 실행되며 **상태코드·응답 형식·비밀번호 미노출까지 자동으로 검증**됩니다.

- `5. 회원가입`이 실행할 때마다 새 이메일(`tester_<타임스탬프>@musicspot.com`)을 만듭니다. 중복 가입 에러 없이 몇 번이든 돌릴 수 있습니다.
- `8. 로그인`이 발급된 토큰을 환경변수 `token`에 자동 저장합니다. 이후 보호된 요청이 그 토큰을 씁니다. **토큰을 손으로 복사할 필요가 없습니다.**
- 성공/실패 케이스가 섞여 있습니다. 404·400·401·409가 나오는 요청은 **그게 나오는 것이 정상**입니다.

CLI로 한 번에 돌리려면:

```bash
npx newman run postman/music-spot.postman_collection.json \
  -e postman/music-spot.local.postman_environment.json
```

> Render 배포 환경으로 처음 실행하면 무료 플랜이 잠들어 있어 첫 응답까지 **최대 1분**이 걸릴 수 있습니다. `0. 헬스체크`가 느린 것은 정상이며, 그 다음부터는 빨라집니다.

## DBeaver로 데이터베이스 점검

### 로컬 PostgreSQL

DBeaver → **새 데이터베이스 연결** → **PostgreSQL** 선택 후:

| 항목     | 값                                  |
| -------- | ----------------------------------- |
| Host     | `localhost`                         |
| Port     | `5432`                              |
| Database | `music-spot`                        |
| Username | (본인 macOS 사용자명 / `.env`의 값) |
| Password | (`.env`의 값)                       |

`Test Connection` → `Finish`.

테이블은 **music-spot → Schemas → public → Tables** 아래에 있습니다.

### Render PostgreSQL (배포 DB)

Render 대시보드 → PostgreSQL 인스턴스 → **Connections** 탭에서 **External Database URL**을 복사합니다.
(서버가 쓰는 Internal URL은 Render 내부 네트워크 전용이라 외부에서 접속되지 않습니다.)

```
postgresql://<user>:<password>@<host>.oregon-postgres.render.com/<database>
```

DBeaver에서 PostgreSQL 연결을 만들 때 **URL 탭**에 위 주소를 붙여넣거나, 각 항목을 나눠 입력합니다.

| 항목                | 값                                                                |
| ------------------- | ----------------------------------------------------------------- |
| Host                | `<host>.oregon-postgres.render.com`                               |
| Port                | `5432`                                                            |
| Database            | External URL의 마지막 경로                                        |
| Username / Password | External URL에 포함된 값                                          |
| **SSL**             | **반드시 켤 것** — `SSL` 탭 → `Use SSL` 체크 → SSL mode `require` |

> SSL을 켜지 않으면 Render가 연결을 거부합니다.

### 확인해볼 만한 쿼리

```sql
-- 시드된 연습실이 576곳인지, 지역별로 몇 곳인지
SELECT sido, gungu, COUNT(*) FROM "Room" GROUP BY sido, gungu ORDER BY COUNT(*) DESC;

-- 가입한 사용자 (비밀번호가 bcrypt 해시로 저장됐는지 확인)
SELECT id, email, username, "createdAt", LEFT(password, 7) AS password_prefix
FROM "User" ORDER BY id;

-- 커뮤니티 글과 작성자
SELECT p.id, p.title, u.username, p."createdAt"
FROM "Post" p JOIN "User" u ON u.id = p."authorId" ORDER BY p."createdAt" DESC;
```

`password_prefix`가 `$2b$10$`로 시작하면 bcrypt 해시가 제대로 저장된 것입니다. 평문이 보이면 안 됩니다.

> 테이블 이름은 Prisma가 만든 그대로 **대문자로 시작**합니다. SQL에서 반드시 큰따옴표(`"User"`)로 감싸야 합니다.

## 테스트

```bash
npm test
```

서비스·도메인·인증 미들웨어에 대한 단위 테스트 **64개**가 있습니다. DB 없이 돌아갑니다 (가짜 의존성 주입).

| 파일                      | 검증 내용                                                                                                      |
| ------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `auth.service.test.ts`    | 로그인/회원가입 해피패스, 중복 이메일, 비밀번호 불일치, 동시 가입 경쟁, 해시·JWT·DB 실패 전파, 비밀번호 미노출 |
| `user.service.test.ts`    | 내 정보 조회, 유저 소멸 시 404, 비밀번호 미노출                                                                |
| `room.service.test.ts`    | 검색 조건 전달·페이지 계산, 빈 결과, 상세 404, 지역 집계 접기                                                  |
| `post.service.test.ts`    | 글 목록/상세/작성, 남의 글 삭제 시 403 + DB 미접근, 없는 글 404, 작성자 비밀번호·이메일 미노출                 |
| `auth.middleware.test.ts` | 토큰 추출, 위조·만료 구분, userId 없는 payload 거부                                                            |
| `user.test.ts` (domain)   | 이메일 정규화, 비밀번호 해시 제거                                                                              |

---

# 배포 (Render)

## 1. PostgreSQL 생성

Render → **New** → **PostgreSQL** → 생성 후 **Internal Database URL**을 복사합니다.

## 2. Web Service 생성

Render → **New** → **Web Service** → 이 저장소를 연결하고:

| 항목              | 값                                                                          |
| ----------------- | --------------------------------------------------------------------------- |
| Runtime           | Node                                                                        |
| Build Command     | `npm install && npm run build && npx prisma migrate deploy && npm run seed` |
| Start Command     | `npm start`                                                                 |
| Health Check Path | `/health`                                                                   |

## 3. 환경변수

| 키             | 값                                                                  |
| -------------- | ------------------------------------------------------------------- |
| `DATABASE_URL` | 1번에서 복사한 **Internal** Database URL                            |
| `JWT_SECRET`   | 긴 랜덤 문자열 (`openssl rand -base64 32`)                          |
| `NODE_ENV`     | `production`                                                        |
| `CORS_ORIGIN`  | Vercel 랜딩 페이지 주소 (예: https://music-spot-landing.vercel.app) |

> `PORT`는 Render가 자동으로 주입하므로 설정하지 않습니다.

## 배포 시 주의

- `src/generated/prisma`는 gitignore 대상입니다. 빌드할 때 `prisma generate`가 반드시 돌아야 하며, `npm run build`에 포함되어 있습니다.
- 무료 플랜은 15분간 요청이 없으면 잠듭니다. 랜딩 페이지가 열릴 때 `/health`를 미리 호출해 깨웁니다.
- 프론트엔드를 새 주소에 배포하면 `CORS_ORIGIN`에 그 주소를 추가해야 합니다.
