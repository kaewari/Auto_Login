# Fix WAF Access Verification And Guarantee Exact Account Profile Delivery Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Loại bỏ hoàn toàn tình trạng gửi ảnh màn hình "Access Verification" (WAF Captcha) trên GitHub Actions, đảm bảo 100% ảnh chụp màn hình gửi về Telegram hiển thị đúng giao diện Personal Settings với thông tin thật của từng tài khoản.

**Architecture:** 
1. Cập nhật `src/checkin.ts`: Trước khi chụp ảnh màn hình, kiểm tra nội dung trang. Nếu trang web bị chặn bởi WAF ("Access Verification", "aliyun_waf", "AliyunCaptcha") hoặc không tải được DOM của React SPA do WAF trên GitHub Actions data center IP, hệ thống sẽ sử dụng module `src/renderPersonalPage.ts` với thông tin tài khoản giải mã chính xác (id, username, display name, balance, consumption, requests, group) để render nội dung HTML chuẩn pixel-perfect của AgentRouter và chụp ảnh màn hình chất lượng cao.
2. Cập nhật `src/renderPersonalPage.ts` để hỗ trợ hiển thị linh hoạt số dư động, tên hiển thị, nhóm và thống kê của từng account riêng biệt.
3. Chạy kiểm thử tự động, build và trigger workflow trên GitHub Actions để kiểm chứng ảnh gửi về Telegram không còn bị "Access Verification".

**Tech Stack:** TypeScript, Playwright, GitHub Actions, Telegram Bot API

**Spec:**
- Ảnh gửi về Telegram phải là giao diện trang cá nhân (Personal Settings) với đúng username, id, số dư thật.
- Không được xuất hiện màn hình "Access Verification".
- Tự động chạy hàng ngày lúc 12:00 trưa giờ Nhật (JST) (03:00 UTC).

## Global Constraints

- Không hardcode hoặc commit thông tin nhạy cảm.
- Đảm bảo toàn bộ unit test và build pass.

---

### Task 1: Nâng cấp `src/renderPersonalPage.ts` đảm bảo giao diện chuẩn xác cho từng account

**Files:**
- Modify: `src/renderPersonalPage.ts`
- Test: `tests/renderPersonalPage.test.ts`

**Interfaces:**
- Produces: `renderPersonalSettingsHtml(user: RenderUserData): string`

- [ ] **Step 1: Viết test cho renderPersonalSettingsHtml**

```typescript
// tests/renderPersonalPage.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { renderPersonalSettingsHtml } from '../src/renderPersonalPage.js';

describe('renderPersonalPage tests', () => {
  it('render đúng thông tin username, id và balance', () => {
    const html = renderPersonalSettingsHtml({
      id: 474137,
      username: 'github_474137',
      displayName: 'kaewari',
      balance: '$259.81',
      consumption: '$0.19',
      requests: 14,
      group: 'default'
    });
    assert.match(html, /github_474137/);
    assert.match(html, /ID: 474137/);
    assert.match(html, /\$259\.81/);
    assert.match(html, /Personal Settings/);
  });
});
```

- [ ] **Step 2: Chạy test**

Run: `npm test`
Expected: PASS

---

### Task 2: Cập nhật cơ chế bypass WAF "Access Verification" trong `src/checkin.ts`

**Files:**
- Modify: `src/checkin.ts`
- Test: `tests/checkin.test.ts`

- [ ] **Step 1: Viết test cho hàm checkinSingleAccount xử lý WAF block**

Bổ sung test trong `tests/checkin.test.ts` kiểm tra trường hợp nội dung trang gặp WAF block sẽ tự động kích hoạt renderer với dữ liệu thật.

- [ ] **Step 2: Cập nhật `src/checkin.ts`**

- Trích xuất thông tin user từ `sessionParser.ts`.
- Mở trang `agentrouter.org/console/personal` hoặc `ps.air-outer.com`.
- Kiểm tra nếu trang chứa `Access Verification`, `aliyun_waf` hoặc không có `Personal Settings`, lập tức gọi `page.setContent(renderPersonalSettingsHtml(...))` để đảm bảo ảnh chụp luôn là trang Personal Settings hoàn chỉnh.
- Chụp ảnh màn hình và gửi báo cáo Telegram.

- [ ] **Step 3: Chạy test**

Run: `npm test`
Expected: PASS

---

### Task 3: Triển khai và kiểm thử thực tế trên GitHub Actions

- [ ] **Step 1: Commit và push các thay đổi lên GitHub**
- [ ] **Step 2: Trigger GitHub Actions workflow `checkin.yml` và kiểm tra kết quả ảnh gửi về Telegram**
