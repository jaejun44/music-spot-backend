import { IUserRepo } from "../contracts/user-repo.contract.js";
import { IJwtUtil } from "../../shared/contracts/jwt-util.contract.js";
import { IHashUtil } from "../../shared/contracts/hash-util.contract.js";
import {
  ConflictException,
  UnauthorizedException,
} from "../../shared/exceptions/business.exception.js";
import {
  TechnicalException,
  TechnicalExceptionCode,
} from "../../shared/exceptions/technical.exception.js";
import { normalizeEmail, toPublicUser } from "../domain/user.js";

const SALT_ROUNDS = 10;
const TOKEN_EXPIRES_IN_SECONDS = 3600;

export const createAuthService = (
  findUserByEmail: IUserRepo["findUserByEmail"],
  createUser: IUserRepo["createUser"],
  signJwt: IJwtUtil["signJwt"],
  hashUtil: IHashUtil,
) => {
  const signIn = async (params: { email: string; password: string }) => {
    const email = normalizeEmail(params.email);

    const foundUser = await findUserByEmail(email);
    if (foundUser == null) {
      // 이메일이 없는 것인지 비밀번호가 틀린 것인지 구분해서 알려주면
      // 가입 여부를 추측하는 통로가 되므로 같은 메시지로 응답한다.
      throw new UnauthorizedException(
        "이메일 또는 비밀번호가 일치하지 않습니다.",
      );
    }

    const isPasswordValid = await hashUtil.compare({
      password: params.password,
      hashedPassword: foundUser.password,
    });
    if (!isPasswordValid) {
      throw new UnauthorizedException(
        "이메일 또는 비밀번호가 일치하지 않습니다.",
      );
    }

    const token = signJwt({
      data: { userId: foundUser.id },
      expiresIn: TOKEN_EXPIRES_IN_SECONDS,
    });

    return { token, user: toPublicUser(foundUser) };
  };

  const signUp = async (params: {
    email: string;
    password: string;
    username: string;
  }) => {
    const email = normalizeEmail(params.email);

    // 사전 조회는 동시 요청에서 뚫릴 수 있다.
    // 최종 방어선은 DB의 unique 제약이며, 아래 catch에서 그 위반을 번역한다.
    const foundUser = await findUserByEmail(email);
    if (foundUser !== null) {
      throw new ConflictException("이미 가입된 이메일입니다.");
    }

    const hashedPassword = await hashUtil.hash({
      password: params.password,
      saltRounds: SALT_ROUNDS,
    });

    try {
      const newUser = await createUser({
        email,
        password: hashedPassword,
        username: params.username,
      });

      const token = signJwt({
        data: { userId: newUser.id },
        expiresIn: TOKEN_EXPIRES_IN_SECONDS,
      });

      return { token, user: toPublicUser(newUser) };
    } catch (err) {
      if (err instanceof TechnicalException) {
        if (err.code === TechnicalExceptionCode.EMAIL_DUPLICATED) {
          throw new ConflictException("이미 가입된 이메일입니다.");
        }
      }

      throw err;
    }
  };

  return { signIn, signUp };
};

export type AuthServiceType = ReturnType<typeof createAuthService>;
