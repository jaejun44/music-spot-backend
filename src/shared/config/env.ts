import "dotenv/config";
import { z } from "zod";

/**
 * 환경변수를 시작 시점에 한 번만 검증한다.
 * 값이 비어 있거나 형식이 틀리면 서버가 뜨기 전에 죽는다(fail fast).
 * 런타임 한복판에서 undefined JWT_SECRET으로 토큰을 서명하는 사고를 막기 위함이다.
 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL은 필수입니다."),
  JWT_SECRET: z.string().min(8, "JWT_SECRET은 최소 8자 이상이어야 합니다."),
  JWT_EXPIRES_IN: z.coerce.number().int().positive().default(3600),
  // 쉼표로 구분된 허용 오리진 목록. 비우면 모든 오리진을 허용한다(로컬 개발용).
  CORS_ORIGIN: z.string().default(""),
  // DB 용량 상한(MB). /health가 얼마나 찼는지 보여줄 때 기준으로 쓴다.
  // Render 무료 PostgreSQL이 1GB다. 유료로 올리면 이 값도 함께 올린다.
  STORAGE_LIMIT_MB: z.coerce.number().int().positive().default(1024),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("환경변수 설정이 올바르지 않습니다:");
  console.error(z.prettifyError(parsed.error));
  process.exit(1);
}

const raw = parsed.data;

export const env = {
  ...raw,
  isProduction: raw.NODE_ENV === "production",
  corsOrigins: raw.CORS_ORIGIN.split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0),
};

export type Env = typeof env;
