import {
  CommentWithAuthor,
  PostDetail,
  PostWithMeta,
} from "../contracts/post-repo.contract.js";

/** 작성자의 비밀번호 해시·이메일이 빠진, 외부에 내보내도 안전한 표현 */
export type PublicAuthor = { id: number; username: string };

export type PublicComment = {
  id: number;
  content: string;
  author: PublicAuthor;
  createdAt: Date;
};

export type PublicPost = {
  id: number;
  title: string;
  content: string;
  author: PublicAuthor;
  createdAt: Date;
  updatedAt: Date;
  likeCount: number;
  commentCount: number;
  liked: boolean; // 지금 보는 사람이 좋아요를 눌렀는지. 비로그인이면 항상 false.
};

export type PublicPostDetail = PublicPost & { comments: PublicComment[] };

/**
 * 글·댓글에는 작성자(User)가 통째로 붙어 온다. 그대로 내보내면 비밀번호 해시와 이메일이 샌다.
 * 밖으로 내보낼 때는 반드시 이 함수들을 거친다.
 */
const toPublicAuthor = (author: { id: number; username: string }) => ({
  id: author.id,
  username: author.username,
});

export const toPublicComment = (comment: CommentWithAuthor): PublicComment => ({
  id: comment.id,
  content: comment.content,
  author: toPublicAuthor(comment.author),
  createdAt: comment.createdAt,
});

export const toPublicPost = (post: PostWithMeta): PublicPost => ({
  id: post.id,
  title: post.title,
  content: post.content,
  author: toPublicAuthor(post.author),
  createdAt: post.createdAt,
  updatedAt: post.updatedAt,
  likeCount: post._count.likes,
  commentCount: post._count.comments,
  // repo가 "내가 누른 좋아요"만 담아 주므로, 하나라도 있으면 누른 것이다.
  liked: post.likes.length > 0,
});

export const toPublicPostDetail = (post: PostDetail): PublicPostDetail => ({
  ...toPublicPost(post),
  comments: post.comments.map(toPublicComment),
});
