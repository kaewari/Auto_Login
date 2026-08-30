# AgentRouter Multi-Account 12:00 PM Daily Check-in & Screenshot

Hệ thống tự động hóa điểm danh / nhận thưởng $25 hàng ngày trên [AgentRouter Console](https://agentrouter.org/console/personal) cho **1 hoặc nhiều tài khoản** bằng Playwright, chụp ảnh màn hình trang cá nhân và gửi báo cáo Telegram Bot.

---

## ⚡ Tính năng nổi bật
- ⏰ **Tự động kích hoạt 12:00 PM hàng ngày** (Cron GitHub Actions `0 5 * * *` = 12:00 ICT trưa).
- 🔑 **Hỗ trợ Multi-Account không giới hạn**: Duyệt tuần tự an toàn từng tài khoản.
- 💰 **Nhận thưởng $25 & Cập nhật số dư Real-Time**: Truy vấn hạn mức trực tiếp từ session.
- 📸 **Chụp ảnh màn hình tại `https://agentrouter.org/console/personal`**: Tự động vượt WAF/AliyunCaptcha.
- 📲 **Báo cáo chi tiết qua Telegram**: Gửi từng ảnh chụp màn hình kèm thông tin ID, Username, Số dư của từng tài khoản riêng biệt + tin nhắn tổng hợp.
- 📦 **Lưu trữ Artifacts**: Ảnh chụp màn hình được upload tự động lên GitHub Actions trong 7 ngày.

---

## 🚀 Hướng dẫn sử dụng

### 1. Đăng nhập và xuất Session cho từng tài khoản
Chạy lệnh kèm tên định danh cho từng account:

```bash
# Đăng nhập account 1
npm run login -- Account_1

# Đăng nhập account 2
npm run login -- Account_2
```

- Sau khi đăng nhập thành công qua trình duyệt, session sẽ tự động được lưu vào `accounts.json`.
- Terminal sẽ xuất chuỗi **Base64 tổng hợp**.

### 2. Cài đặt GitHub Repository Secrets
Tạo repository GitHub (Private), vào **Settings > Secrets and variables > Actions** thêm các biến:
- `STORAGE_STATE_BASE64`: Dán chuỗi Base64 tổng hợp (chứa toàn bộ accounts).
- `TELEGRAM_BOT_TOKEN`: Token bot Telegram từ `@BotFather`.
- `TELEGRAM_CHAT_ID`: Chat ID nhận tin nhắn từ `@userinfobot`.

### 3. Kiểm thử & Chạy thủ công
```bash
# Chạy toàn bộ test suite
npm test

# Chạy trực tiếp tiến trình check-in local
npm run checkin
```
