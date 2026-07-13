import { jest, describe, test, expect } from "@jest/globals";
import { createPostService } from "./post.service.js";
import type {
  IPostRepo,
  PostWithAuthor,
} from "../contracts/post-repo.contract.js";
import { BusinessException } from "../../shared/exceptions/business.exception.js";
import {
  TechnicalException,
  TechnicalExceptionCode,
} from "../../shared/exceptions/technical.exception.js";
import { catchBusinessException } from "../../shared/testing/catch-error.js";

const 게시글 = (id: number, title: string): PostWithAuthor => ({
  id,
  title,
  content: "드럼 칠 사람 구합니다.",
  authorId: 1,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  author: {
    id: 1,
    email: "rocker@musicspot.com",
    password: "$2b$10$해시값",
    username: "락스타",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
  },
});

describe("커뮤니티 글 목록(getPosts)", () => {
  test("글 목록과 페이지 정보를 돌려준다", async () => {
    const findMany = jest.fn<IPostRepo["findMany"]>().mockResolvedValue({
      posts: [게시글(1, "합주 멤버 구해요"), 게시글(2, "드럼 팝니다")],
      total: 2,
    });
    const findById = jest.fn<IPostRepo["findById"]>();
    const create = jest.fn<IPostRepo["create"]>();
    const deleteById = jest.fn<IPostRepo["deleteById"]>();
    const { getPosts } = createPostService(
      findMany,
      findById,
      create,
      deleteById,
    );

    const result = await getPosts({ page: 1, size: 10 });

    expect(result.posts).toHaveLength(2);
    expect(result.posts[0].title).toBe("합주 멤버 구해요");
    expect(result.posts[0].author).toEqual({ id: 1, username: "락스타" });
    expect(result).toMatchObject({
      total: 2,
      page: 1,
      totalPages: 1,
      hasNext: false,
    });
    expect(findMany).toHaveBeenCalledWith({ skip: 0, take: 10 });
  });

  test("목록 응답에 작성자의 비밀번호 해시와 이메일이 섞이지 않는다", async () => {
    const findMany = jest
      .fn<IPostRepo["findMany"]>()
      .mockResolvedValue({ posts: [게시글(1, "합주 멤버 구해요")], total: 1 });
    const findById = jest.fn<IPostRepo["findById"]>();
    const create = jest.fn<IPostRepo["create"]>();
    const deleteById = jest.fn<IPostRepo["deleteById"]>();
    const { getPosts } = createPostService(
      findMany,
      findById,
      create,
      deleteById,
    );

    const result = await getPosts({ page: 1, size: 10 });

    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("$2b$10$해시값");
    expect(serialized).not.toContain("rocker@musicspot.com");
  });

  test("글이 없으면 빈 목록을 돌려준다 (에러가 아니다)", async () => {
    const findMany = jest
      .fn<IPostRepo["findMany"]>()
      .mockResolvedValue({ posts: [], total: 0 });
    const findById = jest.fn<IPostRepo["findById"]>();
    const create = jest.fn<IPostRepo["create"]>();
    const deleteById = jest.fn<IPostRepo["deleteById"]>();
    const { getPosts } = createPostService(
      findMany,
      findById,
      create,
      deleteById,
    );

    const result = await getPosts({ page: 1, size: 10 });

    expect(result.posts).toEqual([]);
    expect(result.hasNext).toBe(false);
  });
});

describe("커뮤니티 글 상세(getPost)", () => {
  test("존재하는 id면 글을 돌려준다", async () => {
    const findMany = jest.fn<IPostRepo["findMany"]>();
    const findById = jest
      .fn<IPostRepo["findById"]>()
      .mockResolvedValue(게시글(1, "합주 멤버 구해요"));
    const create = jest.fn<IPostRepo["create"]>();
    const deleteById = jest.fn<IPostRepo["deleteById"]>();
    const { getPost } = createPostService(
      findMany,
      findById,
      create,
      deleteById,
    );

    const post = await getPost(1);

    expect(post.title).toBe("합주 멤버 구해요");
    expect(post.author).toEqual({ id: 1, username: "락스타" });
    expect(JSON.stringify(post)).not.toContain("$2b$10$해시값");
  });

  test("없는 id면 404를 던진다", async () => {
    const findMany = jest.fn<IPostRepo["findMany"]>();
    const findById = jest.fn<IPostRepo["findById"]>().mockResolvedValue(null);
    const create = jest.fn<IPostRepo["create"]>();
    const deleteById = jest.fn<IPostRepo["deleteById"]>();
    const { getPost } = createPostService(
      findMany,
      findById,
      create,
      deleteById,
    );

    const err = await catchBusinessException(() => getPost(999));

    expect(err).toBeInstanceOf(BusinessException);
    expect(err.message).toBe("존재하지 않는 게시글입니다.");
    expect(err.statusCode).toBe(404);
  });
});

describe("커뮤니티 글 작성(writePost)", () => {
  test("작성한 글을 돌려준다", async () => {
    const findMany = jest.fn<IPostRepo["findMany"]>();
    const findById = jest.fn<IPostRepo["findById"]>();
    const create = jest
      .fn<IPostRepo["create"]>()
      .mockResolvedValue(게시글(1, "합주 멤버 구해요"));
    const deleteById = jest.fn<IPostRepo["deleteById"]>();
    const { writePost } = createPostService(
      findMany,
      findById,
      create,
      deleteById,
    );

    const post = await writePost({
      title: "합주 멤버 구해요",
      content: "드럼 칠 사람 구합니다.",
      authorId: 1,
    });

    expect(post.id).toBe(1);
    expect(post.author).toEqual({ id: 1, username: "락스타" });
    expect(create).toHaveBeenCalledWith({
      title: "합주 멤버 구해요",
      content: "드럼 칠 사람 구합니다.",
      authorId: 1,
    });
    expect(JSON.stringify(post)).not.toContain("$2b$10$해시값");
  });

  test("토큰은 유효하지만 작성자가 DB에 없으면 401로 번역한다 (내부 제약 위반을 노출하지 않는다)", async () => {
    const findMany = jest.fn<IPostRepo["findMany"]>();
    const findById = jest.fn<IPostRepo["findById"]>();
    const create = jest
      .fn<IPostRepo["create"]>()
      .mockRejectedValue(
        new TechnicalException(
          "Foreign key constraint failed on the field: `authorId`",
          TechnicalExceptionCode.AUTHOR_NOT_FOUND,
        ),
      );
    const deleteById = jest.fn<IPostRepo["deleteById"]>();
    const { writePost } = createPostService(
      findMany,
      findById,
      create,
      deleteById,
    );

    const err = await catchBusinessException(() =>
      writePost({ title: "제목", content: "내용", authorId: 999 }),
    );

    expect(err).toBeInstanceOf(BusinessException);
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe(
      "로그인 정보가 유효하지 않습니다. 다시 로그인 해주세요.",
    );
    // Prisma 내부 메시지가 사용자에게 새어나가면 안 된다.
    expect(err.message).not.toContain("Foreign key");
  });
});

describe("커뮤니티 글 삭제(deletePost)", () => {
  test("작성자 본인이면 글을 지운다", async () => {
    const findMany = jest.fn<IPostRepo["findMany"]>();
    const findById = jest
      .fn<IPostRepo["findById"]>()
      .mockResolvedValue(게시글(1, "합주 멤버 구해요")); // authorId: 1
    const create = jest.fn<IPostRepo["create"]>();
    const deleteById = jest.fn<IPostRepo["deleteById"]>();
    const { deletePost } = createPostService(
      findMany,
      findById,
      create,
      deleteById,
    );

    await deletePost({ postId: 1, userId: 1 });

    expect(deleteById).toHaveBeenCalledWith(1);
  });

  test("남의 글이면 403을 던지고 DB에서 지우지 않는다", async () => {
    const findMany = jest.fn<IPostRepo["findMany"]>();
    const findById = jest
      .fn<IPostRepo["findById"]>()
      .mockResolvedValue(게시글(1, "합주 멤버 구해요")); // authorId: 1
    const create = jest.fn<IPostRepo["create"]>();
    const deleteById = jest.fn<IPostRepo["deleteById"]>();
    const { deletePost } = createPostService(
      findMany,
      findById,
      create,
      deleteById,
    );

    const err = await catchBusinessException(() =>
      deletePost({ postId: 1, userId: 999 }),
    );

    expect(err).toBeInstanceOf(BusinessException);
    expect(err.statusCode).toBe(403);
    expect(err.message).toBe("내가 쓴 글만 삭제할 수 있습니다.");
    // 권한 검사가 통과하지 못했으면 DB에 손을 대서는 안 된다.
    expect(deleteById).not.toHaveBeenCalled();
  });

  test("없는 글이면 404를 던지고 DB에서 지우지 않는다", async () => {
    const findMany = jest.fn<IPostRepo["findMany"]>();
    const findById = jest.fn<IPostRepo["findById"]>().mockResolvedValue(null);
    const create = jest.fn<IPostRepo["create"]>();
    const deleteById = jest.fn<IPostRepo["deleteById"]>();
    const { deletePost } = createPostService(
      findMany,
      findById,
      create,
      deleteById,
    );

    const err = await catchBusinessException(() =>
      deletePost({ postId: 999, userId: 1 }),
    );

    expect(err.statusCode).toBe(404);
    expect(deleteById).not.toHaveBeenCalled();
  });
});
