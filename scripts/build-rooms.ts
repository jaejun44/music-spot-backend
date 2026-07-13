/**
 * 크롤링 CSV → 시드용 JSON 정제 스크립트.
 *
 * 크롤링 원본은 저장소 밖(로컬 데이터 폴더)에 있고 배포 서버에는 없다.
 * 그래서 정제 결과만 prisma/data/rooms.json으로 저장소에 커밋하고, seed는 그 JSON만 읽는다.
 *
 * 실행: npx tsx scripts/build-rooms.ts <csv경로>
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { parse } from "csv-parse/sync";

const DEFAULT_CSV =
  "/Users/jaejunlee/Desktop/Music-Spot/musicspot_app/data/rooms_merged.csv";
const OUTPUT = resolve(import.meta.dirname, "../prisma/data/rooms.json");

// 광역시·도 표기가 제각각이라(서울 / 서울특별시) 짧은 이름으로 통일한다.
const SIDO_ALIASES: Record<string, string> = {
  서울: "서울",
  서울특별시: "서울",
  경기: "경기",
  경기도: "경기",
  인천: "인천",
  인천광역시: "인천",
  부산: "부산",
  부산광역시: "부산",
  대구: "대구",
  대구광역시: "대구",
  대전: "대전",
  대전광역시: "대전",
  광주: "광주",
  광주광역시: "광주",
  울산: "울산",
  울산광역시: "울산",
  세종: "세종",
  세종특별자치시: "세종",
  강원: "강원",
  강원도: "강원",
  강원특별자치도: "강원",
  충북: "충북",
  충청북도: "충북",
  충남: "충남",
  충청남도: "충남",
  전북: "전북",
  전라북도: "전북",
  전북특별자치도: "전북",
  전남: "전남",
  전라남도: "전남",
  경북: "경북",
  경상북도: "경북",
  경남: "경남",
  경상남도: "경남",
  제주: "제주",
  제주특별자치도: "제주",
};

// 제목·옵션에 이 단어가 있으면 밴드 합주가 가능한 방으로 본다(드럼/앰프가 있어야 나오는 단어들).
const BAND_KEYWORDS = ["합주", "밴드", "드럼"];

type CsvRow = Record<string, string>;

type SeedRoom = {
  name: string;
  address: string;
  sido: string;
  gungu: string;
  category: string;
  pricePerHour: number | null;
  imageUrl: string | null;
  phone: string | null;
  rating: number | null;
  reviewCount: number | null;
  hours: string | null;
  sourceUrl: string;
};

/** 음악 연습실만 남긴다. 댄스 태그가 붙은 다목적 스튜디오는 합주/밴드/드럼을 내세운 곳만 통과시킨다. */
const isMusicRoom = (row: CsvRow) => {
  const category = row.category ?? "";
  const isMusic =
    category.includes("악기연습실") || category.includes("보컬연습실");
  if (!isMusic) return false;

  const isDanceStudio = category.includes("댄스연습실");
  return !isDanceStudio || BAND_KEYWORDS.some((kw) => row.title.includes(kw));
};

/** "서울특별시 마포구 동교동 155-20" → { sido: "서울", gungu: "마포구" } */
const parseRegion = (address: string) => {
  const [first, second] = address.trim().split(/\s+/);
  const sido = SIDO_ALIASES[first ?? ""];
  // 주소 칸에 상호명이 들어온 행이 섞여 있어(예: "서울대입구 연습실[봉천-낙성대]") 형태로 걸러낸다.
  if (!sido || !second || !/(구|시|군)$/.test(second)) return null;

  return { sido, gungu: second };
};

/** "시간당 4,000원~ / 패키지 18,000원~" → 4000. 시간당 요금이 없는 곳은 null로 두고 화면에서 "가격 문의"로 보여준다. */
const parsePricePerHour = (priceInfo: string) => {
  const matched = priceInfo.match(/시간당\s*([\d,]+)/);
  if (!matched) return null;

  return Number(matched[1].replace(/,/g, ""));
};

/** 전화 칸에 카카오톡 링크가 들어온 행이 있어, 전화번호 형태가 아니면 버린다. */
const parsePhone = (raw: string) => {
  const phone = raw.trim().replace(/\s+/g, "-");
  return /^\d{2,4}-\d{3,4}-\d{4}$/.test(phone) ? phone : null;
};

/** "4.29 (17건)" → { rating: 4.29, reviewCount: 17 } */
const parseRating = (raw: string) => {
  const matched = raw.match(/([\d.]+)\s*\((\d+)건\)/);
  if (!matched) return { rating: null, reviewCount: null };

  return { rating: Number(matched[1]), reviewCount: Number(matched[2]) };
};

/** 공백·기호를 지운 이름+주소를 중복 판단 키로 쓴다. "홍대 합주실"과 "홍대합주실"을 같은 곳으로 본다. */
const dedupeKey = (row: CsvRow) =>
  `${row.title}|${row.address}`.toLowerCase().replace(/[^가-힣a-z0-9|]/g, "");

const toSeedRoom = (
  row: CsvRow,
  region: { sido: string; gungu: string },
): SeedRoom => {
  const { rating, reviewCount } = parseRating(row.rating ?? "");
  const blob = `${row.title} ${row.options ?? ""}`;

  return {
    name: row.title.trim(),
    address: row.address.trim(),
    ...region,
    // 크롤링 카테고리(“보컬연습실, 악기연습실, 연습실”)는 그대로 쓰기엔 길고 겹친다. 두 종류로 줄여 검색 필터로 쓴다.
    category: BAND_KEYWORDS.some((kw) => blob.includes(kw))
      ? "합주실"
      : "음악연습실",
    pricePerHour: parsePricePerHour(row.price_info ?? ""),
    imageUrl: row.image_url?.trim() || null,
    phone: parsePhone(row.phone ?? ""),
    rating,
    reviewCount,
    hours: row.hours?.trim() || null,
    sourceUrl: row.url.trim(),
  };
};

const main = () => {
  const csvPath = process.argv[2] ?? DEFAULT_CSV;
  const rows: CsvRow[] = parse(readFileSync(csvPath), {
    columns: true,
    bom: true,
    skip_empty_lines: true,
  });

  const stats = {
    total: rows.length,
    notSpacecloud: 0,
    notMusic: 0,
    badAddress: 0,
    duplicated: 0,
  };
  const seen = new Set<string>();
  const rooms: SeedRoom[] = [];

  for (const row of rows) {
    // mule은 시간 단위 대관이 아니라 월세 매물 광고라 "연습실 검색" 결과에 섞이면 안 된다.
    if (row.source !== "spacecloud") {
      stats.notSpacecloud++;
      continue;
    }
    if (!isMusicRoom(row)) {
      stats.notMusic++;
      continue;
    }

    const region = parseRegion(row.address ?? "");
    if (!region) {
      stats.badAddress++;
      continue;
    }

    // 같은 공간이 여러 번 크롤링된 행이 있어 이름+주소로 한 번, 원본 URL로 한 번 걸러낸다.
    const key = dedupeKey(row);
    if (seen.has(key) || seen.has(row.url)) {
      stats.duplicated++;
      continue;
    }
    seen.add(key);
    seen.add(row.url);

    rooms.push(toSeedRoom(row, region));
  }

  // 후기가 많은 곳이 앞에 오면 첫 화면이 덜 허전하다.
  rooms.sort((a, b) => (b.reviewCount ?? 0) - (a.reviewCount ?? 0));

  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, `${JSON.stringify(rooms, null, 2)}\n`);

  const bandRooms = rooms.filter((room) => room.category === "합주실").length;
  console.log(
    [
      `원본 ${stats.total}행`,
      `→ mule 제외 ${stats.notSpacecloud}`,
      `비음악 제외 ${stats.notMusic}`,
      `주소불량 제외 ${stats.badAddress}`,
      `중복 제외 ${stats.duplicated}`,
      `→ 최종 ${rooms.length}곳 (합주실 ${bandRooms} / 음악연습실 ${rooms.length - bandRooms})`,
    ].join("\n"),
  );
};

main();
