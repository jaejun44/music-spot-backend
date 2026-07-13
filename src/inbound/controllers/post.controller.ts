import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { PostServiceType } from "../../application/services/post.service.js";
import {
  commentIdParamSchema,
  editPostDataSchema,
  postIdParamSchema,
  postListQuerySchema,
  writeCommentDataSchema,
  writePostDataSchema,
} from "../schemas/post.schemas.js";
import {
  AuthMiddlewareType,
  OptionalAuthMiddlewareType,
} from "../middlewares/auth.middleware.js";
import { BadRequestException } from "../../shared/exceptions/business.exception.js";

export const createPostController = (
  getPosts: PostServiceType["getPosts"],
  getPost: PostServiceType["getPost"],
  writePost: PostServiceType["writePost"],
  editPost: PostServiceType["editPost"],
  deletePost: PostServiceType["deletePost"],
  writeComment: PostServiceType["writeComment"],
  deleteComment: PostServiceType["deleteComment"],
  likePost: PostServiceType["likePost"],
  authMiddleware: AuthMiddlewareType,
  optionalAuthMiddleware: OptionalAuthMiddlewareType,
) => {
  const router = Router();

  // GET /api/posts?page=1&size=10 — 목록은 로그인 없이 누구나 본다.
  // 다만 로그인했으면 "내가 좋아요를 눌렀는지"까지 채워 준다.
  router.get(
    "/",
    optionalAuthMiddleware,
    async (req: Request, res: Response, next: NextFunction) => {
      const { success, data, error } = postListQuerySchema.safeParse(req.query);
      if (!success) {
        throw new BadRequestException(z.prettifyError(error));
      }

      const result = await getPosts({ ...data, viewerId: req.userId });

      res.json(result);
    },
  );

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

  // GET /api/posts/:id — 댓글까지 함께 준다.
  router.get(
    "/:id",
    optionalAuthMiddleware,
    async (req: Request, res: Response, next: NextFunction) => {
      const { success, data, error } = postIdParamSchema.safeParse(req.params);
      if (!success) {
        throw new BadRequestException(z.prettifyError(error));
      }

      const post = await getPost(data.id, req.userId);

      res.json({ post });
    },
  );

  // PATCH /api/posts/:id — 작성자 본인만 수정한다.
  router.patch(
    "/:id",
    authMiddleware,
    async (req: Request, res: Response, next: NextFunction) => {
      const params = postIdParamSchema.safeParse(req.params);
      if (!params.success) {
        throw new BadRequestException(z.prettifyError(params.error));
      }

      const body = editPostDataSchema.safeParse(req.body);
      if (!body.success) {
        throw new BadRequestException(z.prettifyError(body.error));
      }

      const post = await editPost({
        postId: params.data.id,
        userId: req.userId!,
        ...body.data,
      });

      res.json({ post });
    },
  );

  // DELETE /api/posts/:id — 작성자 본인만. 댓글·좋아요도 함께 사라진다.
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

  // POST /api/posts/:id/comments — 댓글 작성 (로그인 필수)
  router.post(
    "/:id/comments",
    authMiddleware,
    async (req: Request, res: Response, next: NextFunction) => {
      const params = postIdParamSchema.safeParse(req.params);
      if (!params.success) {
        throw new BadRequestException(z.prettifyError(params.error));
      }

      const body = writeCommentDataSchema.safeParse(req.body);
      if (!body.success) {
        throw new BadRequestException(z.prettifyError(body.error));
      }

      const comment = await writeComment({
        postId: params.data.id,
        authorId: req.userId!,
        content: body.data.content,
      });

      res.status(201).json({ comment });
    },
  );

  // POST /api/posts/:id/like — 좋아요 토글 (로그인 필수)
  router.post(
    "/:id/like",
    authMiddleware,
    async (req: Request, res: Response, next: NextFunction) => {
      const { success, data, error } = postIdParamSchema.safeParse(req.params);
      if (!success) {
        throw new BadRequestException(z.prettifyError(error));
      }

      const result = await likePost({ postId: data.id, userId: req.userId! });

      res.json(result);
    },
  );

  return { router };
};

/**
 * 댓글 삭제는 글이 아니라 댓글 id로 지운다(/api/comments/:id).
 * 글 라우터에 매달면 "어느 글의 댓글인지"를 매번 확인해야 하는데, 댓글 id만으로 충분하다.
 */
export const createCommentController = (
  deleteComment: PostServiceType["deleteComment"],
  authMiddleware: AuthMiddlewareType,
) => {
  const router = Router();

  // DELETE /api/comments/:id — 작성자 본인만
  router.delete(
    "/:id",
    authMiddleware,
    async (req: Request, res: Response, next: NextFunction) => {
      const { success, data, error } = commentIdParamSchema.safeParse(
        req.params,
      );
      if (!success) {
        throw new BadRequestException(z.prettifyError(error));
      }

      await deleteComment({ commentId: data.id, userId: req.userId! });

      res.json({ message: "댓글을 삭제했습니다." });
    },
  );

  return { router };
};
