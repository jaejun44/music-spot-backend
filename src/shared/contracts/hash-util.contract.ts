export interface IHashUtil {
  hash: (params: { password: string; saltRounds: number }) => Promise<string>;
  compare: (params: {
    password: string;
    hashedPassword: string;
  }) => Promise<boolean>;
}
