import { IUserRepo } from "../contracts/user-repo.contract.js";
import { NotFoundException } from "../../shared/exceptions/business.exception.js";
import { toPublicUser } from "../domain/user.js";

export const createUserService = (findUserById: IUserRepo["findUserById"]) => {
  const getMe = async (userId: number) => {
    const user = await findUserById(userId);
    if (!user) {
      // 토큰은 유효한데 유저가 없다 = 탈퇴했거나 DB가 초기화된 경우
      throw new NotFoundException("존재하지 않는 유저입니다.");
    }

    return toPublicUser(user);
  };

  return { getMe };
};

export type UserServiceType = ReturnType<typeof createUserService>;
