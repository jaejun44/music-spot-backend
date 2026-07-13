import type { Config } from "jest";

const config: Config = {
  // "type": "module" 프로젝트이므로 .ts를 ESM으로 취급한다.
  extensionsToTreatAsEsm: [".ts"],

  // 상대 import의 .js 확장자를 떼어내 ts-jest가 .ts 원본을 찾게 한다.
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },

  transform: {
    "^.+\\.tsx?$": ["ts-jest", { useESM: true }],
  },

  testEnvironment: "node",

  // JWT_SECRET 등 테스트에 필요한 환경변수를 미리 로드한다.
  setupFiles: ["dotenv/config"],

  clearMocks: true,
  coverageProvider: "v8",
};

export default config;
