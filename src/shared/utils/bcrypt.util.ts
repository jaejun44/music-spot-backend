import bcrypt from "bcrypt";
import { IHashUtil } from "../contracts/hash-util.contract.js";

export const createBcryptUtil = (): IHashUtil => {
  const hash: IHashUtil["hash"] = async (params) => {
    return bcrypt.hash(params.password, params.saltRounds);
  };

  const compare: IHashUtil["compare"] = async (params) => {
    return bcrypt.compare(params.password, params.hashedPassword);
  };

  return { hash, compare };
};

export const bcryptUtil = createBcryptUtil();
