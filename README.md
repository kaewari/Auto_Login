# AgentRouter Multi-Account Auto Check-in Daily

Tool tự động điểm danh / nhận token hàng ngày trên [AgentRouter Console](https://agentrouter.org/console/token) cho **1 hoặc nhiều tài khoản** bằng Playwright và GitHub Actions.

---

## 🚀 Hướng dẫn sử dụng nhiều Account

### 1. Đăng nhập từng tài khoản trên máy local
Chạy lệnh kèm tên định danh cho từng account:

```bash
# Đăng nhập account 1
npm run login -- Acc1_Chinh

# Đăng nhập account 2
npm run login -- Acc2_Phu
```

- Sau mỗi lần đăng nhập thành công, script sẽ tự động lưu và cập nhật vào file `accounts.json` cục bộ.
- Terminal sẽ in ra **chuỗi Base64 tổng hợp** đại diện cho toàn bộ danh sách account.

### 2. Thiết lập GitHub Secrets
Đưa code lên GitHub Repository (Private), vào **Settings > Secrets and variables > Actions** thêm các secret:
- `STORAGE_STATE_BASE64`: Dán chuỗi Base64 tổng hợp (chứa toàn bộ danh sách account).
- `TELEGRAM_BOT_TOKEN`: (Tuỳ chọn) Token bot Telegram từ `@BotFather`.
- `TELEGRAM_CHAT_ID`: (Tuỳ chọn) Chat ID nhận tin nhắn từ `@userinfobot`.

### 3. Cơ chế hoạt động
- GitHub Actions tự động kích hoạt vào **05:00 UTC (12:00 ICT - 12h trưa Việt Nam / 14:00 JST)** hàng ngày.
- Mở trang cá nhân `https://agentrouter.org/console/personal` chụp ảnh toàn màn hình để gửi báo cáo.
- Script duyệt tuần tự qua từng account (nghỉ 3s giữa các account để tránh rate limit).
- Gộp báo cáo trạng thái & số dư của tất cả các account vào **1 tin nhắn Telegram duy nhất kèm ảnh chụp màn hình**.
