import { describe, test, expect } from "@jest/globals";
import { normalizeEmail, toPublicUser } from "./user.js";
import type { User } from "../../generated/prisma/client.js";

describe("normalizeEmail", () => {
  test("대문자를 소문자로 바꾼다", () => {
    expect(normalizeEmail("ASD@ASD.COM")).toBe("asd@asd.com");
  });

  test("앞뒤 공백을 제거한다", () => {
    expect(normalizeEmail("  asd@asd.com  ")).toBe("asd@asd.com");
  });

  test("공백과 대소문자가 섞여 있어도 같은 값으로 수렴한다", () => {
    expect(normalizeEmail(" Asd@Asd.Com ")).toBe(normalizeEmail("asd@asd.com"));
  });

  test("이미 정규화된 값은 그대로 둔다", () => {
    expect(normalizeEmail("asd@asd.com")).toBe("asd@asd.com");
  });

  test("빈 문자열은 빈 문자열로 남는다", () => {
    expect(normalizeEmail("")).toBe("");
  });

  test("공백만 있는 문자열은 빈 문자열이 된다", () => {
    expect(normalizeEmail("   ")).toBe("");
  });
});

describe("toPublicUser", () => {
  const user: User = {
    id: 1,
    email: "asd@asd.com",
    password: "hashed_password",
    username: "재준",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
  };

  test("id, email, username만 남긴다", () => {
    expect(toPublicUser(user)).toEqual({
      id: 1,
      email: "asd@asd.com",
      username: "재준",
    });
  });

  test("password 해시를 절대 포함하지 않는다", () => {
    const publicUser = toPublicUser(user);

    expect(publicUser).not.toHaveProperty("password");
    expect(Object.values(publicUser)).not.toContain("hashed_password");
  });

  test("JSON으로 직렬화해도 password가 새어나가지 않는다", () => {
    expect(JSON.stringify(toPublicUser(user))).not.toContain("hashed_password");
  });

  test("원본 객체를 변형하지 않는다", () => {
    toPublicUser(user);

    expect(user.password).toBe("hashed_password");
  });
});
