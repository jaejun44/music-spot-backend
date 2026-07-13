import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client";
import { IUserRepo } from "../../application/contracts/user-repo.contract.js";
import {
  TechnicalException,
  TechnicalExceptionCode,
} from "../../shared/exceptions/technical.exception.js";
import { prismaClient } from "./prismaClient.js";

export const createUserRepo = (): IUserRepo => {
  // 이메일로 사용자 조회
  const findUserByEmail: IUserRepo["findUserByEmail"] = async (email) => {
    return prismaClient.user.findUnique({ where: { email } });
  };

  // ID로 사용자 조회
  const findUserById: IUserRepo["findUserById"] = async (id) => {
    return prismaClient.user.findUnique({ where: { id } });
  };

  // 사용자 생성
  const createUser: IUserRepo["createUser"] = async (params) => {
    try {
      const newUser = await prismaClient.user.create({
        data: {
          email: params.email,
          password: params.password,
          username: params.username,
        },
      });

      return newUser;
    } catch (err) {
      // P2002 = unique 제약 위반. 동시에 같은 이메일로 가입 요청이 들어온 경우다.
      if (err instanceof PrismaClientKnownRequestError) {
        if (err.code === "P2002") {
          throw new TechnicalException(
            err.message,
            TechnicalExceptionCode.EMAIL_DUPLICATED,
            err,
          );
        }
      }

      throw err;
    }
  };

  return { findUserByEmail, findUserById, createUser };
};
