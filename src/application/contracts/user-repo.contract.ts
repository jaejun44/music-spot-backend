import { User } from "../../generated/prisma/client.js";

export interface IUserRepo {
  findUserByEmail: (email: string) => Promise<User | null>;
  findUserById: (id: number) => Promise<User | null>;
  createUser: (params: {
    email: string;
    password: string;
    username: string;
  }) => Promise<User>;
}
