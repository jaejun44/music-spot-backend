import jwt from "jsonwebtoken";
import { IJwtUtil } from "../contracts/jwt-util.contract.js";
import {
  TechnicalException,
  TechnicalExceptionCode,
} from "../exceptions/technical.exception.js";
import { env } from "../config/env.js";

export const jwtUtil: IJwtUtil = {
  signJwt: (params) => {
    return jwt.sign(params.data, env.JWT_SECRET, {
      expiresIn: params.expiresIn,
    });
  },
  verifyJwt: (token) => {
    try {
      return jwt.verify(token, env.JWT_SECRET);
    } catch (err) {
      if (err instanceof Error && err.name === "TokenExpiredError") {
        throw new TechnicalException(
          err.message,
          TechnicalExceptionCode.TOKEN_EXPIRED,
          err,
        );
      }
      if (err instanceof Error && err.name === "JsonWebTokenError") {
        throw new TechnicalException(
          err.message,
          TechnicalExceptionCode.JWT_VERIFY_FAILED,
          err,
        );
      }

      throw err;
    }
  },
};

export const signJwt: IJwtUtil["signJwt"] = jwtUtil.signJwt;
export const verifyJwt: IJwtUtil["verifyJwt"] = jwtUtil.verifyJwt;
