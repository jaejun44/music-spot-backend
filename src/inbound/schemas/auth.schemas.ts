import { z } from "zod";

export const signInDataSchema = z.object({
  email: z.email("이메일 형식이 올바르지 않습니다."),
  password: z.string().min(4, "비밀번호는 최소 4자 이상입니다."),
});

export const signUpDataSchema = z.object({
  email: z.email("이메일 형식이 올바르지 않습니다."),
  password: z
    .string()
    .min(4, "비밀번호는 최소 4자 이상입니다.")
    .max(72, "비밀번호는 최대 72자입니다."), // bcrypt가 72바이트까지만 처리한다
  username: z
    .string()
    .trim()
    .min(1, "활동명은 최소 1자 이상입니다.")
    .max(20, "활동명은 최대 20자입니다."),
});

export type SignInData = z.infer<typeof signInDataSchema>;
export type SignUpData = z.infer<typeof signUpDataSchema>;
