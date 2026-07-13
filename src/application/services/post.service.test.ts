import { jest, describe, test, expect } from "@jest/globals";
import { createPostService } from "./post.service.js";
import type {
  ICommentRepo,
  ILikeRepo,
  IPostRepo,
  PostDetail,
  CommentWithAuthor,
} from "../contracts/post-repo.contract.js";
import { BusinessException } from "../../shared/exceptions/business.exception.js";
import {
  TechnicalException,
  TechnicalExceptionCode,
} from "../../shared/exceptions/technical.exception.js";
import { catchBusinessException } from "../../shared/testing/catch-error.js";

const 날짜 = new Date("2026-01-01T00:00:00.000Z");

const 작성자 = (id: number, username: string) => ({
  id,
  username,
  email: `${username}@musicspot.com`,
  password: "$2b$10$해시값",
  createdAt: 날짜,
});

const 댓글 = (id: number, content: string): CommentWithAuthor => ({
  id,
  content,
  postId: 1,
  authorId: 2,
  createdAt: 날짜,
  author: 작성자(2, "댓글러"),
});

const 게시글 = (
  id: number,
  title: string,
  overrides: Partial<PostDetail> = {},
): PostDetail => ({
  id,
  title,
  content: "드럼 칠 사람 구합니다.",
  authorId: 1,
  createdAt: 날짜,
  updatedAt: 날짜,
  author: 작성자(1, "락스타"),
  _count: { comments: 1, likes: 2 },
  likes: [], // 내가 누른 좋아요만 담긴다. 비어 있으면 아직 안 누른 것.
  comments: [댓글(10, "저 드럼 칩니다!")],
  ...overrides,
});

/** 서비스가 받는 9개의 의존성을 한 번에 만든다. 필요한 것만 갈아끼운다. */
const 서비스 = (overrides: Partial<Record<string, unknown>> = {}) => {
  const repos = {
    findMany: jest.fn<IPostRepo["findMany"]>(),
    findById: jest.fn<IPostRepo["findById"]>(),
    create: jest.fn<IPostRepo["create"]>(),
    update: jest.fn<IPostRepo["update"]>(),
    deleteById: jest.fn<IPostRepo["deleteById"]>(),
    findCommentById: jest.fn<ICommentRepo["findById"]>(),
    createComment: jest.fn<ICommentRepo["create"]>(),
    deleteCommentById: jest.fn<ICommentRepo["deleteById"]>(),
    toggleLike: jest.fn<ILikeRepo["toggle"]>(),
    ...overrides,
  } as {
    findMany: jest.Mock<IPostRepo["findMany"]>;
    findById: jest.Mock<IPostRepo["findById"]>;
    create: jest.Mock<IPostRepo["create"]>;
    update: jest.Mock<IPostRepo["update"]>;
    deleteById: jest.Mock<IPostRepo["deleteById"]>;
    findCommentById: jest.Mock<ICommentRepo["findById"]>;
    createComment: jest.Mock<ICommentRepo["create"]>;
    deleteCommentById: jest.Mock<ICommentRepo["deleteById"]>;
    toggleLike: jest.Mock<ILikeRepo["toggle"]>;
  };

  const service = createPostService(
    repos.findMany,
    repos.findById,
    repos.create,
    repos.update,
    repos.deleteById,
    repos.findCommentById,
    repos.createComment,
    repos.deleteCommentById,
    repos.toggleLike,
  );

  return { ...service, repos };
};

describe("커뮤니티 글 목록(getPosts)", () => {
  test("좋아요·댓글 수와 페이지 정보를 함께 돌려준다", async () => {
    const { getPosts, repos } = 서비스();
    repos.findMany.mockResolvedValue({
      posts: [게시글(1, "합주 멤버 구해요"), 게시글(2, "드럼 팝니다")],
      total: 2,
    });

    const result = await getPosts({ page: 1, size: 10, viewerId: 5 });

    expect(result.posts[0]).toMatchObject({
      title: "합주 멤버 구해요",
      author: { id: 1, username: "락스타" },
      likeCount: 2,
      commentCount: 1,
      liked: false,
    });
    expect(result).toMatchObject({ total: 2, page: 1, hasNext: false });
    // 좋아요 여부를 판단하려면 repo가 "누가 보는지"를 알아야 한다.
    expect(repos.findMany).toHaveBeenCalledWith({
      skip: 0,
      take: 10,
      viewerId: 5,
    });
  });

  test("내가 누른 좋아요가 있으면 liked가 true다", async () => {
    const { getPosts, repos } = 서비스();
    repos.findMany.mockResolvedValue({
      posts: [게시글(1, "합주 멤버 구해요", { likes: [{ userId: 5 }] })],
      total: 1,
    });

    const result = await getPosts({ page: 1, size: 10, viewerId: 5 });

    expect(result.posts[0].liked).toBe(true);
  });

  test("응답에 작성자의 비밀번호 해시와 이메일이 섞이지 않는다", async () => {
    const { getPosts, repos } = 서비스();
    repos.findMany.mockResolvedValue({
      posts: [게시글(1, "합주 멤버 구해요")],
      total: 1,
    });

    const serialized = JSON.stringify(await getPosts({ page: 1, size: 10 }));

    expect(serialized).not.toContain("$2b$10$해시값");
    expect(serialized).not.toContain("@musicspot.com");
  });
});

describe("커뮤니티 글 상세(getPost)", () => {
  test("댓글까지 함께 돌려준다", async () => {
    const { getPost, repos } = 서비스();
    repos.findById.mockResolvedValue(게시글(1, "합주 멤버 구해요"));

    const post = await getPost(1, 5);

    expect(post.comments).toEqual([
      {
        id: 10,
        content: "저 드럼 칩니다!",
        author: { id: 2, username: "댓글러" },
        createdAt: 날짜,
      },
    ]);
    expect(JSON.stringify(post)).not.toContain("$2b$10$해시값");
  });

  test("없는 id면 404를 던진다", async () => {
    const { getPost, repos } = 서비스();
    repos.findById.mockResolvedValue(null);

    const err = await catchBusinessException(() => getPost(999));

    expect(err).toBeInstanceOf(BusinessException);
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe("존재하지 않는 게시글입니다.");
  });
});

describe("커뮤니티 글 작성(writePost)", () => {
  test("작성한 글을 돌려준다", async () => {
    const { writePost, repos } = 서비스();
    repos.create.mockResolvedValue(게시글(1, "합주 멤버 구해요"));

    const post = await writePost({
      title: "합주 멤버 구해요",
      content: "드럼 칠 사람 구합니다.",
      authorId: 1,
    });

    expect(post.id).toBe(1);
    expect(post.likeCount).toBe(2);
    expect(JSON.stringify(post)).not.toContain("$2b$10$해시값");
  });

  test("토큰은 유효하지만 작성자가 DB에 없으면 401로 번역한다", async () => {
    const { writePost, repos } = 서비스();
    repos.create.mockRejectedValue(
      new TechnicalException(
        "Foreign key constraint failed on the field: `authorId`",
        TechnicalExceptionCode.AUTHOR_NOT_FOUND,
      ),
    );

    const err = await catchBusinessException(() =>
      writePost({ title: "제목", content: "내용", authorId: 999 }),
    );

    expect(err.statusCode).toBe(401);
    // Prisma 내부 메시지가 사용자에게 새어나가면 안 된다.
    expect(err.message).not.toContain("Foreign key");
  });
});

describe("커뮤니티 글 수정(editPost)", () => {
  test("작성자 본인이면 수정한다", async () => {
    const { editPost, repos } = 서비스();
    repos.findById.mockResolvedValue(게시글(1, "옛 제목")); // authorId: 1
    repos.update.mockResolvedValue(게시글(1, "새 제목"));

    const post = await editPost({
      postId: 1,
      userId: 1,
      title: "새 제목",
      content: "새 내용",
    });

    expect(repos.update).toHaveBeenCalledWith({
      id: 1,
      title: "새 제목",
      content: "새 내용",
    });
    expect(post.title).toBe("새 제목");
  });

  test("남의 글이면 403을 던지고 DB에 쓰지 않는다", async () => {
    const { editPost, repos } = 서비스();
    repos.findById.mockResolvedValue(게시글(1, "합주 멤버 구해요")); // authorId: 1

    const err = await catchBusinessException(() =>
      editPost({ postId: 1, userId: 999, title: "탈취", content: "탈취" }),
    );

    expect(err.statusCode).toBe(403);
    expect(err.message).toBe("내가 쓴 글만 수정할 수 있습니다.");
    // 권한 검사를 통과하지 못했으면 DB에 손을 대서는 안 된다.
    expect(repos.update).not.toHaveBeenCalled();
  });

  test("없는 글이면 404를 던지고 DB에 쓰지 않는다", async () => {
    const { editPost, repos } = 서비스();
    repos.findById.mockResolvedValue(null);

    const err = await catchBusinessException(() =>
      editPost({ postId: 999, userId: 1, title: "제목", content: "내용" }),
    );

    expect(err.statusCode).toBe(404);
    expect(repos.update).not.toHaveBeenCalled();
  });
});

describe("커뮤니티 글 삭제(deletePost)", () => {
  test("작성자 본인이면 지운다", async () => {
    const { deletePost, repos } = 서비스();
    repos.findById.mockResolvedValue(게시글(1, "합주 멤버 구해요"));

    await deletePost({ postId: 1, userId: 1 });

    expect(repos.deleteById).toHaveBeenCalledWith(1);
  });

  test("남의 글이면 403을 던지고 DB에서 지우지 않는다", async () => {
    const { deletePost, repos } = 서비스();
    repos.findById.mockResolvedValue(게시글(1, "합주 멤버 구해요"));

    const err = await catchBusinessException(() =>
      deletePost({ postId: 1, userId: 999 }),
    );

    expect(err.statusCode).toBe(403);
    expect(repos.deleteById).not.toHaveBeenCalled();
  });

  test("없는 글이면 404를 던진다", async () => {
    const { deletePost, repos } = 서비스();
    repos.findById.mockResolvedValue(null);

    const err = await catchBusinessException(() =>
      deletePost({ postId: 999, userId: 1 }),
    );

    expect(err.statusCode).toBe(404);
    expect(repos.deleteById).not.toHaveBeenCalled();
  });
});

describe("댓글 작성(writeComment)", () => {
  test("작성한 댓글을 돌려준다", async () => {
    const { writeComment, repos } = 서비스();
    repos.findById.mockResolvedValue(게시글(1, "합주 멤버 구해요"));
    repos.createComment.mockResolvedValue(댓글(10, "저 드럼 칩니다!"));

    const comment = await writeComment({
      postId: 1,
      authorId: 2,
      content: "저 드럼 칩니다!",
    });

    expect(comment).toEqual({
      id: 10,
      content: "저 드럼 칩니다!",
      author: { id: 2, username: "댓글러" },
      createdAt: 날짜,
    });
    expect(JSON.stringify(comment)).not.toContain("$2b$10$해시값");
  });

  test("없는 글에는 댓글을 달 수 없다 (404, DB에 쓰지 않는다)", async () => {
    const { writeComment, repos } = 서비스();
    repos.findById.mockResolvedValue(null);

    const err = await catchBusinessException(() =>
      writeComment({ postId: 999, authorId: 2, content: "댓글" }),
    );

    expect(err.statusCode).toBe(404);
    // 아무도 볼 수 없는 유령 댓글이 남으면 안 된다.
    expect(repos.createComment).not.toHaveBeenCalled();
  });
});

describe("댓글 삭제(deleteComment)", () => {
  test("작성자 본인이면 지운다", async () => {
    const { deleteComment, repos } = 서비스();
    repos.findCommentById.mockResolvedValue(댓글(10, "저 드럼 칩니다!")); // authorId: 2

    await deleteComment({ commentId: 10, userId: 2 });

    expect(repos.deleteCommentById).toHaveBeenCalledWith(10);
  });

  test("남의 댓글이면 403을 던지고 DB에서 지우지 않는다", async () => {
    const { deleteComment, repos } = 서비스();
    repos.findCommentById.mockResolvedValue(댓글(10, "저 드럼 칩니다!"));

    const err = await catchBusinessException(() =>
      deleteComment({ commentId: 10, userId: 999 }),
    );

    expect(err.statusCode).toBe(403);
    expect(err.message).toBe("내가 쓴 댓글만 삭제할 수 있습니다.");
    expect(repos.deleteCommentById).not.toHaveBeenCalled();
  });

  test("없는 댓글이면 404를 던진다", async () => {
    const { deleteComment, repos } = 서비스();
    repos.findCommentById.mockResolvedValue(null);

    const err = await catchBusinessException(() =>
      deleteComment({ commentId: 999, userId: 2 }),
    );

    expect(err.statusCode).toBe(404);
    expect(err.message).toBe("존재하지 않는 댓글입니다.");
    expect(repos.deleteCommentById).not.toHaveBeenCalled();
  });
});

describe("좋아요 토글(likePost)", () => {
  test("repo가 준 결과(눌림 여부 + 총 개수)를 그대로 돌려준다", async () => {
    const { likePost, repos } = 서비스();
    repos.findById.mockResolvedValue(게시글(1, "합주 멤버 구해요"));
    repos.toggleLike.mockResolvedValue({ liked: true, likeCount: 3 });

    const result = await likePost({ postId: 1, userId: 5 });

    expect(result).toEqual({ liked: true, likeCount: 3 });
    expect(repos.toggleLike).toHaveBeenCalledWith({ postId: 1, userId: 5 });
  });

  test("없는 글에는 좋아요를 누를 수 없다 (404, DB에 쓰지 않는다)", async () => {
    const { likePost, repos } = 서비스();
    repos.findById.mockResolvedValue(null);

    const err = await catchBusinessException(() =>
      likePost({ postId: 999, userId: 5 }),
    );

    expect(err.statusCode).toBe(404);
    expect(repos.toggleLike).not.toHaveBeenCalled();
  });
});
