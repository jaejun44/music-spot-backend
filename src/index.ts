import express from "express";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { bootstrap } from "./bootstrap.js";
import { env } from "./shared/config/env.js";
import {
  errorMiddleware,
  notFoundMiddleware,
} from "./inbound/middlewares/error.middleware.js";

const { authRouter, userRouter, roomRouter, postRouter } = bootstrap();

const app = express();

// Render는 프록시 뒤에서 앱을 돌린다.
// 이 설정이 없으면 rate limit이 모든 요청을 같은 IP로 취급한다.
app.set("trust proxy", 1);

app.use(helmet());
app.use(
  cors({
    // CORS_ORIGIN이 비어 있으면(로컬 개발) 모든 오리진을 허용한다.
    origin: env.corsOrigins.length > 0 ? env.corsOrigins : true,
  }),
);
app.use(express.json());
app.use(morgan(env.isProduction ? "combined" : "dev"));

// 무료 플랜 서버를 지키기 위한 최소한의 방어선.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    message: "너무 많은 요청이 발생했습니다. 잠시 뒤에 다시 시도해주세요.",
  },
});

// 로그인·회원가입은 비밀번호 대입 공격의 표적이므로 더 좁게 잠근다.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    message: "로그인 시도가 너무 많습니다. 잠시 뒤에 다시 시도해주세요.",
  },
});

// 헬스체크는 Render의 슬립 해제(웜업)에도 쓰이므로 rate limit 앞에 둔다.
app.get("/health", (req, res) => {
  res.json({ status: "ok", env: env.NODE_ENV });
});

app.use("/api", apiLimiter);
app.use("/api/auth", authLimiter, authRouter);
app.use("/api/users", userRouter);
app.use("/api/rooms", roomRouter);
app.use("/api/posts", postRouter);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

app.listen(env.PORT, () => {
  console.log(`[${env.NODE_ENV}] 서버가 ${env.PORT} 포트에서 실행 중입니다.`);
});
