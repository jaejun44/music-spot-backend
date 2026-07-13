import { Router, Request, Response } from "express";
import { HealthServiceType } from "../../application/services/health.service.js";
import { env } from "../../shared/config/env.js";

export const createHealthController = (
  getHealth: HealthServiceType["getHealth"],
) => {
  const router = Router();

  /**
   * GET /health — 서버 상태 + 사용 현황(연습실 수, 직접 등록 수, DB 용량).
   *
   * Render의 상태 확인과 랜딩의 웜업 요청이 여기로 온다.
   * DB가 죽어도 200으로 답한다(본문의 status가 degraded가 된다).
   * 500을 주면 Render가 서버를 재시작하는데, DB 장애는 재시작으로 낫지 않는다.
   */
  router.get("/", async (req: Request, res: Response) => {
    const health = await getHealth();

    res.json({ ...health, env: env.NODE_ENV });
  });

  return { router };
};
