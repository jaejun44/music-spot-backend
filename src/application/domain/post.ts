import { PostWithAuthor } from "../contracts/post-repo.contract.js";

/** 작성자의 비밀번호 해시·이메일이 빠진, 외부에 내보내도 안전한 게시글 표현 */
export type PublicPost = {
  id: number;
  title: string;
  content: string;
  author: { id: number; username: string };
  createdAt: Date;
};

/**
 * 게시글에는 작성자(User)가 통째로 붙어 온다. 그대로 내보내면 비밀번호 해시와 이메일이 샌다.
 * 게시글을 밖으로 내보낼 때는 반드시 이 함수를 거친다.
 */
export const toPublicPost = (post: PostWithAuthor): PublicPost => ({
  id: post.id,
  title: post.title,
  content: post.content,
  author: { id: post.author.id, username: post.author.username },
  createdAt: post.createdAt,
});
