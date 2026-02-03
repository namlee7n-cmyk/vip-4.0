```markdown
# Game Tài Xỉu + Thị trường Cổ phiếu (Full Rewrite) — Browser (Client-only)

Hướng dẫn nhanh:
1. Tạo thư mục (ví dụ `tx-stock-game`) trên máy tính.
2. Tạo các file theo đường dẫn & nội dung đã cung cấp:
   - index.html
   - css/styles.css
   - js/config.js
   - js/storage.js
   - js/auth.js
   - js/game/dice.js
   - js/game/ai.js
   - js/game/stocks.js
   - js/admin.js
   - js/ui/stockChart.js
   - js/main.js
   - assets/bowl-open.mp3 (tùy chọn)
3. Mở `index.html` bằng Chrome/Edge/Firefox — game chạy ngay, không cần server.

Tính năng chính:
- Tài Xỉu:
  - Chén che khi xúc; xúc xong chén vẫn đóng -> bạn BẤM CHÉN để mở.
  - Thời gian xúc: mặc định 3 phút (config.js), DEV_MODE=true để test nhanh.
  - Mức cược: 20k,50k,100k,200k,500k.
  - Tỉ lệ cho người chơi: thắng 39%, thua 51%, hoà 10% (config trong js/config.js).
  - AI players đặt cược, được xử lý thắng/thua như player.
- Cổ phiếu:
  - >10 mã, giá khởi điểm >= 500,000,000, supply mặc định 100.
  - Mỗi lần cập nhật (mặc định 5 phút, DEV_MODE giảm) thay đổi giá ±20%, ghi lịch sử OHLC.
  - Biểu đồ nến + volume bằng Lightweight Charts (client CDN).
  - Mua tối thiểu 30 cổ phiếu; mua một mã chỉ được 1 lần cho tới khi bán hết (bannedBuys).
  - Mỗi mã supply = 100, nếu mua hết ai khác phải chờ bán.
  - AI mua/bán tự động (heuristic), cập nhật theo chu kỳ.
  - Nếu admin set phá sản: trừ 200,000,000 cho từng holder của mã đó.
- Admin:
  - Bí mật: gõ `admindzvailon` khi đang dùng web để hiện admin panel.
  - Pass1 = `0987654321` (mở panel), Pass2 = `zxcvbnm` (cho phép chức năng).
  - Tạo mã nạp (<=200k, 1 lần / user), huỷ mã.
  - Tăng/giảm giá cổ phiếu, phá sản.
  - Trợ lý AI Admin: panel placeholder để hiển thị cảnh báo (bạn có thể mở rộng).
- Tài khoản & Lịch sử:
  - Đăng ký / đăng nhập client-side (localStorage).
  - Lịch sử giao dịch lưu trong localStorage.
- Lưu ý bảo mật:
  - Đây là demo client-only — tất cả logic & dữ liệu có thể thay đổi qua DevTools.
  - Nếu bạn muốn production: cần backend (Node + DB), server-signed transactions, WebSockets cho realtime.

Cấu hình:
- js/config.js chỉnh:
  - DEV_MODE (true/false)
  - ROLL_SECONDS (giây)
  - STOCK_INTERVAL_SECONDS
  - STOCK_AI_ACTION_SECONDS
  - DICE.WIN_RATE / LOSE_RATE

Muốn tôi tiếp:
- Push repo lên GitHub (tôi sẽ hướng dẫn).
- Tạo zip toàn bộ file (hướng dẫn tạo zip).
- Bổ sung: animations nâng cao, âm thanh, AI admin detect hack, thống kê kỹ thuật (EMA, RSI), hoặc di chuyển logic lên server.
```
