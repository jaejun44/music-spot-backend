import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client";
import {
  ICommentRepo,
  ILikeRepo,
  IPostRepo,
} from "../../application/contracts/post-repo.contract.js";
import { Prisma } from "../../generated/prisma/client.js";
import {
  TechnicalException,
  TechnicalExceptionCode,
} from "../../shared/exceptions/technical.exception.js";
import { prismaClient } from "./prismaClient.js";

/**
 * 목록·상세가 함께 쓰는 include.
 * viewerId가 있으면 그 사람이 누른 좋아요만 딸려온다(없으면 빈 배열). 그걸로 liked를 판단한다.
 * userId: -1처럼 없는 값을 넣어도 되지만, 비로그인일 때 굳이 조인할 이유가 없다.
 */
const postInclude = (viewerId?: number) =>
  ({
    author: true,
    _count: { select: { comments: true, likes: true } },
    // 비로그인이면 있을 수 없는 userId(-1)로 걸러 항상 빈 배열이 오게 한다.
    likes: { where: { userId: viewerId ?? -1 }, select: { userId: true } },
  }) satisfies Prisma.PostInclude;

const detailInclude = (viewerId?: number) =>
  ({
    ...postInclude(viewerId),
    // 댓글은 대화 순서대로 읽어야 한다. 최신순으로 뒤집으면 흐름이 끊긴다.
    comments: { include: { author: true }, orderBy: { createdAt: "asc" } },
  }) satisfies Prisma.PostInclude;

export const createPostRepo = (): IPostRepo => {
  // 글 목록 (최신순)
  const findMany: IPostRepo["findMany"] = async ({ skip, take, viewerId }) => {
    const [posts, total] = await prismaClient.$transaction([
      prismaClient.post.findMany({
        include: postInclude(viewerId),
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prismaClient.post.count(),
    ]);

    return { posts, total };
  };

  // 글 상세 (댓글 포함)
  const findById: IPostRepo["findById"] = async (id, viewerId) => {
    return prismaClient.post.findUnique({
      where: { id },
      include: detailInclude(viewerId),
    });
  };

  // 글 작성
  const create: IPostRepo["create"] = async (params) => {
    try {
      return await prismaClient.post.create({
        data: params,
        include: detailInclude(params.authorId),
      });
    } catch (err) {
      // P2003 = 외래키 제약 위반. 토큰의 userId가 가리키는 사용자가 사라진 경우다.
      if (
        err instanceof PrismaClientKnownRequestError &&
        err.code === "P2003"
      ) {
        throw new TechnicalException(
          err.message,
          TechnicalExceptionCode.AUTHOR_NOT_FOUND,
          err,
        );
      }

      throw err;
    }
  };

  // 글 수정. 주인 확인은 service가 이미 끝냈다.
  const update: IPostRepo["update"] = async ({ id, title, content }) => {
    return prismaClient.post.update({
      where: { id },
      data: { title, content },
      include: detailInclude(),
    });
  };

  // 글 삭제. 댓글·좋아요는 Cascade로 함께 지워진다.
  const deleteById: IPostRepo["deleteById"] = async (id) => {
    await prismaClient.post.delete({ where: { id } });
  };

  return { findMany, findById, create, update, deleteById };
};

export const createCommentRepo = (): ICommentRepo => {
  const findById: ICommentRepo["findById"] = async (id) => {
    return prismaClient.comment.findUnique({ where: { id } });
  };

  const create: ICommentRepo["create"] = async (params) => {
    return prismaClient.comment.create({
      data: params,
      include: { author: true },
    });
  };

  const deleteById: ICommentRepo["deleteById"] = async (id) => {
    await prismaClient.comment.delete({ where: { id } });
  };

  return { findById, create, deleteById };
};

export const createLikeRepo = (): ILikeRepo => {
  /**
   * 좋아요 토글.
   * 조회 → 분기 → 쓰기를 따로 하면 두 번 연타했을 때 둘 다 "없음"으로 읽고 둘 다 insert를 시도한다.
   * 한 트랜잭션에 묶고, 중복 키(P2002)는 "이미 눌렀다"는 뜻이므로 취소로 처리한다.
   */
  const toggle: ILikeRepo["toggle"] = async ({ postId, userId }) => {
    const liked = await prismaClient.$transaction(async (tx) => {
      const existing = await tx.like.findUnique({
        where: { postId_userId: { postId, userId } },
      });

      if (existing) {
        await tx.like.delete({ where: { postId_userId: { postId, userId } } });
        return false;
      }

      await tx.like.create({ data: { postId, userId } });
      return true;
    });

    const likeCount = await prismaClient.like.count({ where: { postId } });

    return { liked, likeCount };
  };

  return { toggle };
};
