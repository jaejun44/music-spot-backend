import { z } from "zod";

export const roomIdParamSchema = z.object({
  id: z.coerce
    .number("연습실 ID는 숫자여야 합니다.")
    .int("연습실 ID는 정수여야 합니다.")
    .positive("연습실 ID는 1 이상이어야 합니다."),
});

// 빈 문자열(?sido=)은 "선택 안 함"이지 잘못된 값이 아니다. undefined로 바꿔 검색 조건에서 빼버린다.
const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .transform((value) => value || undefined)
    .optional();

export const roomSearchQuerySchema = z.object({
  sido: optionalText(20, "지역명이 너무 깁니다."),
  gungu: optionalText(20, "지역명이 너무 깁니다."),
  category: z
    .enum(["합주실", "음악연습실"], "카테고리는 합주실 또는 음악연습실입니다.")
    .optional(),
  keyword: optionalText(50, "검색어는 최대 50자입니다."),
  page: z.coerce
    .number("페이지는 숫자여야 합니다.")
    .int()
    .positive("페이지는 1 이상이어야 합니다.")
    .default(1),
  // 한 번에 수백 건을 요청해 DB를 통째로 훑는 일이 없도록 상한을 둔다.
  size: z.coerce
    .number("size는 숫자여야 합니다.")
    .int()
    .positive()
    .max(48, "한 번에 최대 48곳까지 조회할 수 있습니다.")
    .default(12),
});

// 빈 문자열로 온 선택 항목은 "입력 안 함"이다. null로 바꿔 DB에 그대로 넣는다.
const optionalField = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .transform((value) => value || null)
    .nullish()
    .transform((value) => value ?? null);

export const registerRoomDataSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "연습실 이름을 입력해주세요.")
    .max(60, "이름은 최대 60자입니다."),
  // 지역(sido·gungu)은 받지 않는다. 서버가 이 주소에서 뽑아낸다.
  address: z
    .string()
    .trim()
    .min(5, "주소를 입력해주세요. (예: 서울 마포구 동교동 155-20)")
    .max(120, "주소는 최대 120자입니다."),
  category: z.enum(
    ["합주실", "음악연습실"],
    "종류는 합주실 또는 음악연습실입니다.",
  ),
  pricePerHour: z.coerce
    .number("시간당 요금은 숫자여야 합니다.")
    .int()
    .min(0, "시간당 요금은 0원 이상이어야 합니다.")
    .max(1_000_000, "시간당 요금이 너무 큽니다.")
    .nullish()
    .transform((value) => value ?? null),
  phone: optionalField(20, "전화번호는 최대 20자입니다."),
  hours: optionalField(40, "영업시간은 최대 40자입니다."),
});

export type RoomIdParam = z.infer<typeof roomIdParamSchema>;
export type RoomSearchQuery = z.infer<typeof roomSearchQuerySchema>;
export type RegisterRoomData = z.infer<typeof registerRoomDataSchema>;
