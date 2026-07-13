// /health가 보여줄 현황. "지금 얼마나 쓰고 있나"를 한 번의 왕복으로 가져온다.
export type Usage = {
  rooms: number; // 전체 연습실 (크롤링 시드 + 직접 등록)
  registeredRooms: number; // 사용자가 직접 등록한 곳 — B2B 지표
  roomsWithPhotos: number; // 그중 사진이 붙은 곳 (용량을 먹는 주범)
  posts: number;
  users: number;
  databaseBytes: number; // 현재 DB가 차지하는 실제 용량
};

export interface IStatsRepo {
  getUsage: () => Promise<Usage>;
}
