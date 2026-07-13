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

export type RoomIdParam = z.infer<typeof roomIdParamSchema>;
export type RoomSearchQuery = z.infer<typeof roomSearchQuerySchema>;
