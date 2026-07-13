import { Post, User } from "../../generated/prisma/client.js";

// 목록·상세 모두 작성자 이름을 함께 보여주므로 repo는 항상 작성자를 붙여서 돌려준다.
export type PostWithAuthor = Post & { author: User };

export interface IPostRepo {
  findMany: (params: {
    skip: number;
    take: number;
  }) => Promise<{ posts: PostWithAuthor[]; total: number }>;
  findById: (id: number) => Promise<PostWithAuthor | null>;
  create: (params: {
    title: string;
    content: string;
    authorId: number;
  }) => Promise<PostWithAuthor>;
  deleteById: (id: number) => Promise<void>;
}
