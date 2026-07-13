import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { PostServiceType } from "../../application/services/post.service.js";
import {
  postIdParamSchema,
  postListQuerySchema,
  writePostDataSchema,
} from "../schemas/post.schemas.js";
import { AuthMiddlewareType } from "../middlewares/auth.middleware.js";
import { BadRequestException } from "../../shared/exceptions/business.exception.js";

export const createPostController = (
  getPosts: PostServiceType["getPosts"],
  getPost: PostServiceType["getPost"],
  writePost: PostServiceType["writePost"],
  deletePost: PostServiceType["deletePost"],
  authMiddleware: AuthMiddlewareType,
) => {
  const router = Router();

  // GET /api/posts?page=1&size=10 — 목록은 로그인 없이 누구나 본다.
  router.get("/", async (req: Request, res: Response, next: NextFunction) => {
    const { success, data, error } = postListQuerySchema.safeParse(req.query);
    if (!success) {
      throw new BadRequestException(z.prettifyError(error));
    }

    const result = await getPosts(data);

    res.json(result);
  });

  // POST /api/posts — 글쓰기는 로그인해야 한다.
  router.post(
    "/",
    authMiddleware,
    async (req: Request, res: Response, next: NextFunction) => {
      const { success, data, error } = writePostDataSchema.safeParse(req.body);
      if (!success) {
        throw new BadRequestException(z.prettifyError(error));
      }

      // 작성자는 요청 본문이 아니라 토큰에서 가져온다. 남의 이름으로 글을 쓸 수 없어야 한다.
      const post = await writePost({ ...data, authorId: req.userId! });

      res.status(201).json({ post });
    },
  );

  // GET /api/posts/:id
  router.get(
    "/:id",
    async (req: Request, res: Response, next: NextFunction) => {
      const { success, data, error } = postIdParamSchema.safeParse(req.params);
      if (!success) {
        throw new BadRequestException(z.prettifyError(error));
      }

      const post = await getPost(data.id);

      res.json({ post });
    },
  );

  // DELETE /api/posts/:id — 작성자 본인만. 누가 지우는지는 요청이 아니라 토큰이 정한다.
  router.delete(
    "/:id",
    authMiddleware,
    async (req: Request, res: Response, next: NextFunction) => {
      const { success, data, error } = postIdParamSchema.safeParse(req.params);
      if (!success) {
        throw new BadRequestException(z.prettifyError(error));
      }

      await deletePost({ postId: data.id, userId: req.userId! });

      res.json({ message: "글을 삭제했습니다." });
    },
  );

  return { router };
};
