import { Comment, Post, User } from "../../generated/prisma/client.js";

// 목록·상세 모두 작성자 이름과 좋아요·댓글 수를 함께 보여준다.
// likes에는 "지금 보는 사람이 누른 좋아요"만 담긴다(0개 또는 1개). 비로그인이면 항상 빈 배열이다.
export type PostWithMeta = Post & {
  author: User;
  _count: { comments: number; likes: number };
  likes: { userId: number }[];
};

// 상세는 댓글까지 함께 읽는다. 화면을 그리는 데 왕복이 한 번이면 충분하다.
export type PostDetail = PostWithMeta & {
  comments: (Comment & { author: User })[];
};

export type CommentWithAuthor = Comment & { author: User };

export interface IPostRepo {
  findMany: (params: {
    skip: number;
    take: number;
    viewerId?: number; // 좋아요 눌렀는지 판단할 사람. 비로그인이면 없다.
  }) => Promise<{ posts: PostWithMeta[]; total: number }>;
  findById: (id: number, viewerId?: number) => Promise<PostDetail | null>;
  create: (params: {
    title: string;
    content: string;
    authorId: number;
  }) => Promise<PostDetail>;
  update: (params: {
    id: number;
    title: string;
    content: string;
  }) => Promise<PostDetail>;
  deleteById: (id: number) => Promise<void>;
}

export interface ICommentRepo {
  findById: (id: number) => Promise<Comment | null>;
  create: (params: {
    postId: number;
    authorId: number;
    content: string;
  }) => Promise<CommentWithAuthor>;
  deleteById: (id: number) => Promise<void>;
}

export interface ILikeRepo {
  // 눌렀으면 취소하고, 안 눌렀으면 누른다. 결과와 총 개수를 함께 돌려준다.
  toggle: (params: {
    postId: number;
    userId: number;
  }) => Promise<{ liked: boolean; likeCount: number }>;
}
