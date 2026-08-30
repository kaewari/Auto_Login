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
- `TELEGRAM_BOT_TOKEN`: Token bot Telegram từ `@BotFather`.
- `TELEGRAM_CHAT_ID`: Chat ID nhận tin nhắn từ `@userinfobot`.

### 3. Cơ chế hoạt động & Lịch chạy
- GitHub Actions tự động kích hoạt vào **11:00 UTC (20:00 JST - 8h tối Nhật Bản / 18:00 ICT - 6h tối Việt Nam)** hàng ngày.
- Mở trực tiếp trang cá nhân thật `https://ps.air-outer.com/console/personal` bằng session đã xác thực, tự động lấy số dư thực tế theo thời gian thực (real-time).
- Script duyệt tuần tự qua từng account (nghỉ 3s giữa các account để tránh rate limit).
- Gửi tin nhắn báo cáo trạng thái & số dư thật kèm ảnh chụp màn hình riêng biệt cho từng account qua **Telegram bot**.
- Tự động lưu toàn bộ ảnh chụp màn hình vào mục **Artifacts** của GitHub Actions để có thể tải và xem lại bất cứ lúc nào.
