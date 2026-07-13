import { createAuthService } from "./application/services/auth.service.js";
import { createUserService } from "./application/services/user.service.js";
import { createRoomService } from "./application/services/room.service.js";
import { createPostService } from "./application/services/post.service.js";
import { createAuthController } from "./inbound/controllers/auth.controller.js";
import { createUserController } from "./inbound/controllers/user.controller.js";
import { createRoomController } from "./inbound/controllers/room.controller.js";
import { createPostController } from "./inbound/controllers/post.controller.js";
import { createAuthMiddleware } from "./inbound/middlewares/auth.middleware.js";
import { createUserRepo } from "./outbound/repos/user.repo.js";
import { createRoomRepo } from "./outbound/repos/room.repo.js";
import { createPostRepo } from "./outbound/repos/post.repo.js";
import { bcryptUtil } from "./shared/utils/bcrypt.util.js";
import { signJwt, verifyJwt } from "./shared/utils/jwt.util.js";

/**
 * 조립 공장.
 * 구체적인 구현(prisma repo, bcrypt, jsonwebtoken)을 알고 있는 유일한 곳이다.
 * 서비스는 인터페이스(contract)만 알기 때문에, 테스트에서는 여기 대신 가짜를 주입한다.
 *
 * 조립 순서: repo → service → controller
 */
export const bootstrap = () => {
  // outbound
  const { findUserByEmail, findUserById, createUser } = createUserRepo();
  const {
    search,
    findById,
    countByRegion,
    create: createRoom,
    deleteById: deleteRoomById,
  } = createRoomRepo();
  // 연습실 repo와 이름이 겹쳐(findById) 게시글 쪽은 이름을 바꿔 받는다.
  const {
    findMany: findPosts,
    findById: findPostById,
    create: createPost,
    deleteById: deletePostById,
  } = createPostRepo();

  // application
  const { signIn, signUp } = createAuthService(
    findUserByEmail,
    createUser,
    signJwt,
    bcryptUtil,
  );
  const { getMe } = createUserService(findUserById);
  const { searchRooms, getRoom, getRegions, registerRoom, deleteRoom } =
    createRoomService(
      search,
      findById,
      countByRegion,
      createRoom,
      deleteRoomById,
    );
  const { getPosts, getPost, writePost, deletePost } = createPostService(
    findPosts,
    findPostById,
    createPost,
    deletePostById,
  );

  // inbound
  const authMiddleware = createAuthMiddleware(verifyJwt);
  const { router: authRouter } = createAuthController(signIn, signUp);
  const { router: userRouter } = createUserController(getMe, authMiddleware);
  const { router: roomRouter } = createRoomController(
    searchRooms,
    getRoom,
    getRegions,
    registerRoom,
    deleteRoom,
    authMiddleware,
  );
  const { router: postRouter } = createPostController(
    getPosts,
    getPost,
    writePost,
    deletePost,
    authMiddleware,
  );

  return { authRouter, userRouter, roomRouter, postRouter };
};
