import { IPostRepo } from "../contracts/post-repo.contract.js";
import { toPublicPost } from "../domain/post.js";
import {
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from "../../shared/exceptions/business.exception.js";
import {
  TechnicalException,
  TechnicalExceptionCode,
} from "../../shared/exceptions/technical.exception.js";

export const createPostService = (
  findMany: IPostRepo["findMany"],
  findById: IPostRepo["findById"],
  create: IPostRepo["create"],
  deleteById: IPostRepo["deleteById"],
) => {
  // 커뮤니티 글 목록 (최신순, 로그인 없이도 볼 수 있다)
  const getPosts = async ({ page, size }: { page: number; size: number }) => {
    const { posts, total } = await findMany({
      skip: (page - 1) * size,
      take: size,
    });

    const totalPages = Math.ceil(total / size);

    return {
      posts: posts.map(toPublicPost),
      total,
      page,
      size,
      totalPages,
      hasNext: page < totalPages,
    };
  };

  // 글 상세
  const getPost = async (postId: number) => {
    const post = await findById(postId);
    if (!post) {
      throw new NotFoundException("존재하지 않는 게시글입니다.");
    }

    return toPublicPost(post);
  };

  // 글 작성 (로그인 필수 — authorId는 미들웨어가 검증한 토큰에서 나온다)
  const writePost = async (params: {
    title: string;
    content: string;
    authorId: number;
  }) => {
    try {
      const post = await create(params);

      return toPublicPost(post);
    } catch (err) {
      // 토큰은 유효한데 그 사용자가 DB에 없다(탈퇴/DB 초기화). 내부 제약 위반을 그대로 흘리지 않는다.
      if (
        err instanceof TechnicalException &&
        err.code === TechnicalExceptionCode.AUTHOR_NOT_FOUND
      ) {
        throw new UnauthorizedException(
          "로그인 정보가 유효하지 않습니다. 다시 로그인 해주세요.",
        );
      }

      throw err;
    }
  };

  // 글 삭제 (작성자 본인만)
  const deletePost = async ({
    postId,
    userId,
  }: {
    postId: number;
    userId: number;
  }) => {
    const post = await findById(postId);
    if (!post) {
      throw new NotFoundException("존재하지 않는 게시글입니다.");
    }

    // 삭제 전에 주인을 확인한다. 토큰만 있으면 남의 글도 지울 수 있게 되는 순간 커뮤니티는 끝난다.
    if (post.authorId !== userId) {
      throw new ForbiddenException("내가 쓴 글만 삭제할 수 있습니다.");
    }

    await deleteById(postId);
  };

  return { getPosts, getPost, writePost, deletePost };
};

export type PostServiceType = ReturnType<typeof createPostService>;
