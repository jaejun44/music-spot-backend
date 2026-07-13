import { BusinessException } from "../exceptions/business.exception.js";

/**
 * 던져질 것으로 기대되는 BusinessException을 잡아서 돌려준다.
 *
 * `service().catch((e) => e as BusinessException)`으로 잡으면
 * 타입이 `성공값 | BusinessException` 유니온이 되어 err.statusCode에 접근할 수 없다.
 * (Jest는 통과해도 tsc가 막는다.)
 */
export const catchBusinessException = async (
  run: () => Promise<unknown>,
): Promise<BusinessException> => {
  try {
    await run();
  } catch (err) {
    if (err instanceof BusinessException) {
      return err;
    }
    // 기대한 것과 다른 에러다. 삼키지 말고 그대로 터뜨린다.
    throw err;
  }

  throw new Error("BusinessException이 발생할 것으로 기대했지만 성공했습니다.");
};
