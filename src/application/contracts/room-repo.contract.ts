import { Room } from "../../generated/prisma/client.js";

export interface IRoomRepo {
  findAll: () => Promise<Room[]>;
  findById: (id: number) => Promise<Room | null>;
}
