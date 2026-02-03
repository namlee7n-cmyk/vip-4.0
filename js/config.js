export const CONFIG = {
  DEV_MODE: true,            // true để test (thời gian ngắn); bật false cho production
  ROLL_SECONDS: 180,         // production 3 phút
  STOCK_INTERVAL_SECONDS: 300, // production 5 phút
  STOCK_AI_ACTION_SECONDS: 600, // production 10 phút
  MAX_HISTORY_POINTS: 500,
  DICE: {
    WIN_RATE: 39,            // % player win
    LOSE_RATE: 51,           // % player lose
    TIE_RATE: 10             // derived
  }
};
