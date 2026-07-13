import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client";
import { IPostRepo } from "../../application/contracts/post-repo.contract.js";
import {
  TechnicalException,
  TechnicalExceptionCode,
} from "../../shared/exceptions/technical.exception.js";
import { prismaClient } from "./prismaClient.js";

export const createPostRepo = (): IPostRepo => {
  // 글 목록 (최신순)
  const findMany: IPostRepo["findMany"] = async ({ skip, take }) => {
    const [posts, total] = await prismaClient.$transaction([
      prismaClient.post.findMany({
        include: { author: true },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prismaClient.post.count(),
    ]);

    return { posts, total };
  };

  // 글 상세
  const findById: IPostRepo["findById"] = async (id) => {
    return prismaClient.post.findUnique({
      where: { id },
      include: { author: true },
    });
  };

  // 글 작성
  const create: IPostRepo["create"] = async (params) => {
    try {
      return await prismaClient.post.create({
        data: params,
        include: { author: true },
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

  // 글 삭제. 주인 확인은 service가 이미 끝냈다.
  const deleteById: IPostRepo["deleteById"] = async (id) => {
    await prismaClient.post.delete({ where: { id } });
  };

  return { findMany, findById, create, deleteById };
};
