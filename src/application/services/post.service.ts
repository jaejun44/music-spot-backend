import {
  ICommentRepo,
  ILikeRepo,
  IPostRepo,
} from "../contracts/post-repo.contract.js";
import {
  toPublicComment,
  toPublicPost,
  toPublicPostDetail,
} from "../domain/post.js";
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
  update: IPostRepo["update"],
  deleteById: IPostRepo["deleteById"],
  findCommentById: ICommentRepo["findById"],
  createComment: ICommentRepo["create"],
  deleteCommentById: ICommentRepo["deleteById"],
  toggleLike: ILikeRepo["toggle"],
) => {
  // 커뮤니티 글 목록 (최신순, 로그인 없이도 볼 수 있다)
  // viewerId가 있으면 "내가 좋아요를 눌렀는지"까지 채워진다.
  const getPosts = async ({
    page,
    size,
    viewerId,
  }: {
    page: number;
    size: number;
    viewerId?: number;
  }) => {
    const { posts, total } = await findMany({
      skip: (page - 1) * size,
      take: size,
      viewerId,
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

  // 글 상세 (댓글 포함)
  const getPost = async (postId: number, viewerId?: number) => {
    const post = await findById(postId, viewerId);
    if (!post) {
      throw new NotFoundException("존재하지 않는 게시글입니다.");
    }

    return toPublicPostDetail(post);
  };

  // 글 작성 (로그인 필수 — authorId는 미들웨어가 검증한 토큰에서 나온다)
  const writePost = async (params: {
    title: string;
    content: string;
    authorId: number;
  }) => {
    try {
      const post = await create(params);

      return toPublicPostDetail(post);
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

  // 글 수정 (작성자 본인만)
  const editPost = async ({
    postId,
    userId,
    title,
    content,
  }: {
    postId: number;
    userId: number;
    title: string;
    content: string;
  }) => {
    const post = await findById(postId);
    if (!post) {
      throw new NotFoundException("존재하지 않는 게시글입니다.");
    }

    // 고치기 전에 주인을 확인한다. 토큰만 있으면 남의 글도 고칠 수 있게 되는 순간 커뮤니티는 끝난다.
    if (post.authorId !== userId) {
      throw new ForbiddenException("내가 쓴 글만 수정할 수 있습니다.");
    }

    const updated = await update({ id: postId, title, content });

    return toPublicPostDetail(updated);
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

    if (post.authorId !== userId) {
      throw new ForbiddenException("내가 쓴 글만 삭제할 수 있습니다.");
    }

    await deleteById(postId);
  };

  // 댓글 작성 (로그인 필수)
  const writeComment = async ({
    postId,
    authorId,
    content,
  }: {
    postId: number;
    authorId: number;
    content: string;
  }) => {
    // 없는 글에 댓글이 달리면 아무도 볼 수 없는 유령 댓글이 된다. 먼저 글을 확인한다.
    const post = await findById(postId);
    if (!post) {
      throw new NotFoundException("존재하지 않는 게시글입니다.");
    }

    const comment = await createComment({ postId, authorId, content });

    return toPublicComment(comment);
  };

  // 댓글 삭제 (작성자 본인만)
  const deleteComment = async ({
    commentId,
    userId,
  }: {
    commentId: number;
    userId: number;
  }) => {
    const comment = await findCommentById(commentId);
    if (!comment) {
      throw new NotFoundException("존재하지 않는 댓글입니다.");
    }

    if (comment.authorId !== userId) {
      throw new ForbiddenException("내가 쓴 댓글만 삭제할 수 있습니다.");
    }

    await deleteCommentById(commentId);
  };

  // 좋아요 토글 (누른 적 없으면 누르고, 이미 눌렀으면 취소한다)
  const likePost = async ({
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

    return toggleLike({ postId, userId });
  };

  return {
    getPosts,
    getPost,
    writePost,
    editPost,
    deletePost,
    writeComment,
    deleteComment,
    likePost,
  };
};

export type PostServiceType = ReturnType<typeof createPostService>;
