import { z } from "zod";

export const roomIdParamSchema = z.object({
  id: z.coerce
    .number("연습실 ID는 숫자여야 합니다.")
    .int("연습실 ID는 정수여야 합니다.")
    .positive("연습실 ID는 1 이상이어야 합니다."),
});

export type RoomIdParam = z.infer<typeof roomIdParamSchema>;
