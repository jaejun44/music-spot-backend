export interface IJwtUtil {
  signJwt: (params: {
    data: string | Buffer | object;
    expiresIn: number;
  }) => string;
  verifyJwt: (token: string) => string | Buffer | object;
}
