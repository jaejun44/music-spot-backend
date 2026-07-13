import { z } from "zod";

export const postIdParamSchema = z.object({
  id: z.coerce
    .number("게시글 ID는 숫자여야 합니다.")
    .int("게시글 ID는 정수여야 합니다.")
    .positive("게시글 ID는 1 이상이어야 합니다."),
});

export const postListQuerySchema = z.object({
  page: z.coerce
    .number("페이지는 숫자여야 합니다.")
    .int()
    .positive("페이지는 1 이상이어야 합니다.")
    .default(1),
  size: z.coerce
    .number("size는 숫자여야 합니다.")
    .int()
    .positive()
    .max(30, "한 번에 최대 30개까지 조회할 수 있습니다.")
    .default(10),
});

export const writePostDataSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "제목을 입력해주세요.")
    .max(60, "제목은 최대 60자입니다."),
  // 상한이 없으면 게시글 하나로 DB를 채울 수 있다.
  content: z
    .string()
    .trim()
    .min(1, "내용을 입력해주세요.")
    .max(2000, "내용은 최대 2000자입니다."),
});

export type PostIdParam = z.infer<typeof postIdParamSchema>;
export type PostListQuery = z.infer<typeof postListQuerySchema>;
export type WritePostData = z.infer<typeof writePostDataSchema>;
