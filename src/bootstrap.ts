import { createAuthService } from "./application/services/auth.service.js";
import { createUserService } from "./application/services/user.service.js";
import { createRoomService } from "./application/services/room.service.js";
import { createPostService } from "./application/services/post.service.js";
import { createHealthService } from "./application/services/health.service.js";
import { createAuthController } from "./inbound/controllers/auth.controller.js";
import { createUserController } from "./inbound/controllers/user.controller.js";
import { createRoomController } from "./inbound/controllers/room.controller.js";
import {
  createPostController,
  createCommentController,
} from "./inbound/controllers/post.controller.js";
import { createHealthController } from "./inbound/controllers/health.controller.js";
import {
  createAuthMiddleware,
  createOptionalAuthMiddleware,
} from "./inbound/middlewares/auth.middleware.js";
import { createUserRepo } from "./outbound/repos/user.repo.js";
import { createRoomRepo } from "./outbound/repos/room.repo.js";
import {
  createPostRepo,
  createCommentRepo,
  createLikeRepo,
} from "./outbound/repos/post.repo.js";
import { createStatsRepo } from "./outbound/repos/stats.repo.js";
import { env } from "./shared/config/env.js";
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
    update: updatePost,
    deleteById: deletePostById,
  } = createPostRepo();
  const {
    findById: findCommentById,
    create: createComment,
    deleteById: deleteCommentById,
  } = createCommentRepo();
  const { toggle: toggleLike } = createLikeRepo();
  const { getUsage } = createStatsRepo();

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
  const {
    getPosts,
    getPost,
    writePost,
    editPost,
    deletePost,
    writeComment,
    deleteComment,
    likePost,
  } = createPostService(
    findPosts,
    findPostById,
    createPost,
    updatePost,
    deletePostById,
    findCommentById,
    createComment,
    deleteCommentById,
    toggleLike,
  );
  const { getHealth } = createHealthService(getUsage, env.STORAGE_LIMIT_MB);

  // inbound
  const authMiddleware = createAuthMiddleware(verifyJwt);
  // 커뮤니티 목록·상세는 비로그인도 봐야 하지만, 로그인했으면 좋아요 여부를 알려줘야 한다.
  const optionalAuthMiddleware = createOptionalAuthMiddleware(verifyJwt);
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
    editPost,
    deletePost,
    writeComment,
    deleteComment,
    likePost,
    authMiddleware,
    optionalAuthMiddleware,
  );
  const { router: commentRouter } = createCommentController(
    deleteComment,
    authMiddleware,
  );
  const { router: healthRouter } = createHealthController(getHealth);

  return {
    authRouter,
    userRouter,
    roomRouter,
    postRouter,
    commentRouter,
    healthRouter,
  };
};
