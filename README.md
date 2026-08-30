# AgentRouter & HoYoLAB Multi-Account 12:00 PM Daily Check-in

Hệ thống tự động hóa điểm danh hàng ngày vào **12:00 PM (12h trưa)** qua GitHub Actions:
1. **AgentRouter**: Nhận thưởng $25/ngày, chụp ảnh trang cá nhân `https://agentrouter.org/console/personal`, báo cáo số dư qua Telegram.
2. **HoYoLAB (Honkai: Star Rail & Zenless Zone Zero)**: Tự động check-in, trích xuất chi tiết số ngày điểm danh và tên/số lượng vật phẩm nhận được trong ngày.

---

## ⚡ Tính năng nổi bật
- ⏰ **Tự động kích hoạt 12:00 PM hàng ngày** (Cron GitHub Actions `0 5 * * *` = 12:00 ICT / 14:00 JST).
- 🎮 **Hỗ trợ Honkai: Star Rail & Zenless Zone Zero (ZZZ)**: Tự động gọi API check-in và lấy danh sách quà thưởng tháng.
- 🎁 **Báo cáo chi tiết vật phẩm**: Trả về tên vật phẩm, số lượng nhận được (Ví dụ: `Stellar Jade x20`, `Polychromes x20`, `Adventure Log x2`).
- 🔑 **Hỗ trợ Multi-Account không giới hạn**: Cho phép cấu hình nhiều tài khoản đồng thời qua Base64 secret.
- 📲 **Thông báo Telegram Bot**: Báo cáo trạng thái trực quan, chi tiết từng tài khoản.

---

## 🚀 Hướng dẫn thiết lập HoYoLAB

### 1. Đăng nhập hoặc cấu hình Cookie HoYoLAB
Có 2 cách:

#### Cách 1: Sử dụng CLI đăng nhập tự động
```bash
npm run login:hoyolab -- HoYoLAB_Main
```
Trình duyệt sẽ mở ra trang check-in HoYoLAB, sau khi đăng nhập xong script sẽ tự bắt cookie và in chuỗi Base64 ra màn hình.

#### Cách 2: Copy Cookie thủ công
Chỉ cần lấy `ltuid_v2` và `ltoken_v2` (hoặc chuỗi cookie từ trình duyệt) lưu vào file `hoyolab_accounts.json`:
```json
[
  {
    "name": "HoYoLAB_Main",
    "cookie": "ltuid_v2=197102412; ltoken_v2=v2_CAISDGM5...; account_id_v2=197102412;",
    "games": ["hkrpg", "zzz"]
  }
]
```

---

## ⚙️ Cài đặt GitHub Repository Secrets
Vào GitHub repo -> **Settings > Secrets and variables > Actions** thêm:
- `STORAGE_STATE_BASE64`: Chuỗi Base64 tài khoản AgentRouter.
- `HOYOLAB_ACCOUNTS_BASE64`: Chuỗi Base64 tài khoản HoYoLAB.
- `TELEGRAM_BOT_TOKEN`: Token bot Telegram từ `@BotFather`.
- `TELEGRAM_CHAT_ID`: Chat ID nhận tin nhắn từ `@userinfobot`.

---

## 🧪 Chạy thử nghiệm Local

```bash
# Chạy toàn bộ Unit / Integration Test
npm test

# Chạy check-in HoYoLAB trực tiếp
npm run checkin:hoyolab

# Chạy check-in AgentRouter trực tiếp
npm run checkin
```
