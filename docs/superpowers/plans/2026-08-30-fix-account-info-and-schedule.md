# Fix Account Info Validation And Schedule Check-in Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chụp ảnh đúng thông tin tài khoản thật từ AgentRouter Console (xác thực dữ liệu người dùng thật, không fallback dữ liệu giả) và thiết lập lịch tự động chạy vào 12h trưa hàng ngày theo giờ Nhật (JST).

**Architecture:** 
1. Tách module trích xuất & giải mã thông tin session (`id`, `username`, `group`, `role`) từ Go gob cookie và bổ sung logic truy vấn chính xác API `/api/user/self` với header `New-Api-User` tương ứng.
2. Thiết lập quy trình check-in: inject session cookie + localStorage `user` đúng với `id` thật để mở trang Console thật `https://agentrouter.org/console/personal`, kiểm tra tính hợp lệ của dữ liệu trước khi chụp và gửi ảnh qua Telegram.
3. Cập nhật GitHub Actions workflow `checkin.yml` với cron `0 3 * * *` (03:00 UTC = 12:00 JST / 10:00 ICT) và hỗ trợ phút lẻ chống nghẽn nếu cần.

**Tech Stack:** TypeScript, Node.js (test runner), Playwright, GitHub Actions

**Spec:** Yêu cầu từ người dùng:
- Gửi đúng thông tin từng account, kiểm tra thật kỹ trước khi gửi.
- Tự động chạy và gửi báo cáo vào lúc 12:00 trưa hàng ngày (giờ Nhật JST).

## Global Constraints

- Không đọc, ghi hoặc commit token bí mật, API key lên git công khai.
- Giữ type safety với TypeScript, tuân thủ Clean Code.
- Đảm bảo toàn bộ test pass trước khi hoàn tất.

---

### Task 1: Xây dựng module giải mã chính xác Session Gorilla/Gob và trích xuất User Profile

**Files:**
- Create: `src/sessionParser.ts`
- Create: `tests/sessionParser.test.ts`
- Modify: `src/checkin.ts`

**Interfaces:**
- Produces: `extractUserFromCookie(cookieVal: string): { username: string; id: number; role?: number; status?: number; group?: string }`
- Produces: `decodeGobInteger(buffer: Buffer, offset: number): { value: number; bytesRead: number }`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/sessionParser.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { extractUserFromCookie } from '../src/sessionParser.js';

describe('sessionParser tests', () => {
  it('giải mã đúng User ID và username từ session cookie Gob', () => {
    // Cookie mẫu chứa int id = 474137 (hoặc gob bytes tương ứng) và username github_474137
    const sampleCookie = '1787988978|DX8EAQL_gAABEAEQAAD-AUT_gAAGBnN0cmluZwwNAAtvYXV0aF9zdGF0ZQZzdHJpbmcM_4sA_4hleUp1SWpvaWRGSkdiMHREZVRCWlkxZHJJaXdpYlNJNklteHZaMmx1SWl3aWRTSTZNQ3dpWlNJNk1UYzROems0T1RVM05uMC5jOTZmNjQxYjE2NjFkYjVjNWZmNGVmMTYzODcxOWJjYzVlYjIyYmRkMTZhZDk4MzE5OWVmMGIwYTc0MzE2NmY4BnN0cmluZwwEAAJpZANpbnQEBQD9DngyBnN0cmluZwwKAAh1c2VybmFtZQZzdHJpbmcMDwANZ2l0aHViXzQ3NDEzNwZzdHJpbmcMBgAEcm9sZQNpbnQEAgACBnN0cmluZwwIAAZzdGF0dXMDaW50BAIAAgZzdHJpbmcMBwAFZ3JvdXAGc3RyaW5nDAkAB2RlZmF1bHQ=|placeholder';
    const user = extractUserFromCookie(sampleCookie);
    assert.strictEqual(user.username, 'github_474137');
    assert.strictEqual(user.id, 474137);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL do chưa có file `src/sessionParser.ts`

- [ ] **Step 3: Write implementation**

Tạo `src/sessionParser.ts` với hàm giải mã chuẩn `gob` int/uint và bóc tách `id`, `username`, `role`, `status`, `group`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

---

### Task 2: Cập nhật quy trình kiểm tra dữ liệu thật & chụp ảnh trong `src/checkin.ts`

**Files:**
- Modify: `src/checkin.ts`
- Modify: `src/renderPersonalPage.ts`
- Test: `tests/checkin.test.ts`

**Interfaces:**
- Consumes: `extractUserFromCookie` from `src/sessionParser.ts`
- Produces: `checkinSingleAccount(account: AccountItem, browser: Browser): Promise<CheckinResult>`

- [ ] **Step 1: Viết test kiểm tra logic xác thực dữ liệu trước khi gửi**

Bổ sung test trong `tests/checkin.test.ts` kiểm tra trạng thái báo cáo khi thông tin hợp lệ hoặc không hợp lệ.

- [ ] **Step 2: Cập nhật `src/checkin.ts`**

- Gọi API `/api/user/self` với đúng `New-Api-User: String(user.id)`.
- Thiết lập `localStorage` với user profile thật trước khi mở trang.
- Kiểm tra tính hợp lệ: nếu không lấy được thông tin số dư/quota từ API thật, đánh dấu thất bại hoặc thử fetch qua route thật của web, không fallback tạo ảnh ảo với dữ liệu giả.

- [ ] **Step 3: Run test**

Run: `npm test`
Expected: PASS

---

### Task 3: Cấu hình lịch chạy tự động vào 12h trưa giờ Nhật (JST)

**Files:**
- Modify: `.github/workflows/checkin.yml`
- Modify: `README.md`

- [ ] **Step 1: Cập nhật cron trong `.github/workflows/checkin.yml`**

12h trưa JST (UTC+9) = 03:00 UTC (hoặc đặt phút lẻ như `0 3 * * *` / `5 3 * * *` để tránh nghẽn tải hệ thống GitHub Actions).

```yaml
on:
  schedule:
    # 03:00 UTC = 12:00 JST (12h trưa Nhật Bản) / 10:00 ICT (Việt Nam)
    - cron: '0 3 * * *'
  workflow_dispatch:
```

- [ ] **Step 2: Cập nhật tài liệu `README.md`**

Cập nhật ghi chú thời gian chạy tự động thành 12:00 trưa JST (10:00 sáng ICT).

---

### Task 4: Kiểm thử tích hợp và nghiệm thu

- [ ] **Step 1: Chạy toàn bộ test suite**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 2: Chạy thử luồng checkin cục bộ (Dry Run/Real Run)**

Kiểm tra terminal log và ảnh chụp xem đúng thông tin từng account hay chưa.
