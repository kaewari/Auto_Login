export function renderPersonalSettingsHtml(user: { id: number; username: string; balance?: string }): string {
  const avatarText = user.username.replace('github_', 'G').slice(0, 2).toUpperCase() || 'GI';
  const balanceVal = user.balance || '$259.81';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Agent Router - Personal Settings</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #f7f8fa;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #1d2129;
      -webkit-font-smoothing: antialiased;
    }
    .layout {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }
    /* Top Header */
    .header {
      height: 60px;
      background: #ffffff;
      border-bottom: 1px solid #e5e6eb;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 24px;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 32px;
    }
    .logo {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 18px;
      font-weight: 700;
      color: #1d2129;
    }
    .logo-icon {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: conic-gradient(#ff7d00, #f53f3f, #722ed1, #165dff, #00b42a, #ff7d00);
    }
    .nav-links {
      display: flex;
      gap: 24px;
      font-size: 14px;
      font-weight: 500;
      color: #4e5969;
    }
    .nav-links span { cursor: pointer; }
    .nav-links span.active { color: #165dff; }
    .header-right {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .badge-icon {
      position: relative;
      font-size: 16px;
      cursor: pointer;
    }
    .badge-num {
      position: absolute;
      top: -6px;
      right: -8px;
      background: #f53f3f;
      color: #fff;
      font-size: 10px;
      padding: 1px 5px;
      border-radius: 10px;
      font-weight: 700;
    }
    .user-pill {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #f2f3f5;
      padding: 4px 12px 4px 6px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 500;
      color: #4e5969;
    }
    .user-pill-avatar {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: #86dfba;
      color: #006038;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 700;
    }

    /* Main Container */
    .container {
      display: flex;
      flex: 1;
    }
    .sidebar {
      width: 230px;
      background: #ffffff;
      border-right: 1px solid #e5e6eb;
      padding: 20px 12px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .side-group { margin-bottom: 24px; }
    .side-title {
      font-size: 11px;
      font-weight: 600;
      color: #86909c;
      text-transform: uppercase;
      padding: 0 12px 8px;
      letter-spacing: 0.5px;
    }
    .side-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-radius: 8px;
      font-size: 14px;
      color: #4e5969;
      cursor: pointer;
      margin-bottom: 4px;
      font-weight: 400;
    }
    .side-item.active {
      background: #e8f3ff;
      color: #165dff;
      font-weight: 600;
    }

    /* Content Pane */
    .content {
      flex: 1;
      padding: 28px 40px;
      max-width: 1300px;
    }

    /* User Profile Card */
    .profile-card {
      background: linear-gradient(135deg, #eef4ff 0%, #ffffff 60%, #fbfdff 100%);
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 32px;
      margin-bottom: 28px;
      position: relative;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.02);
    }
    .profile-header {
      display: flex;
      align-items: center;
      gap: 20px;
      margin-bottom: 24px;
    }
    .main-avatar {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      background: #94a3b8;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 26px;
      font-weight: 700;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .main-meta h1 {
      font-size: 22px;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 8px;
    }
    .tags {
      display: flex;
      gap: 8px;
    }
    .tag {
      background: #f1f5f9;
      color: #475569;
      font-size: 12px;
      padding: 3px 10px;
      border-radius: 6px;
      font-weight: 500;
    }

    .export-btn {
      position: absolute;
      top: 28px;
      right: 28px;
      width: 36px;
      height: 36px;
      border-radius: 8px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #475569;
      cursor: pointer;
    }

    .balance-box {
      margin-top: 12px;
    }
    .balance-label {
      font-size: 14px;
      color: #64748b;
      margin-bottom: 6px;
    }
    .balance-amount {
      font-size: 38px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.5px;
    }

    .stats-bar {
      display: flex;
      gap: 48px;
      margin-top: 24px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
    }
    .stat-block {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .stat-label {
      font-size: 13px;
      color: #64748b;
    }
    .stat-val {
      font-size: 15px;
      font-weight: 700;
      color: #1e293b;
    }

    /* Tabs & Models */
    .tabs-bar {
      display: flex;
      gap: 32px;
      border-bottom: 1px solid #e2e8f0;
      margin-bottom: 24px;
    }
    .tab-btn {
      padding: 12px 4px;
      font-size: 14px;
      font-weight: 500;
      color: #64748b;
      cursor: pointer;
      position: relative;
    }
    .tab-btn.active {
      color: #165dff;
      font-weight: 600;
    }
    .tab-btn.active::after {
      content: "";
      position: absolute;
      bottom: -1px;
      left: 0;
      right: 0;
      height: 2px;
      background: #165dff;
    }

    .section-title {
      font-size: 14px;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .section-sub {
      font-size: 12px;
      color: #94a3b8;
      margin-bottom: 16px;
    }

    .filter-pills {
      display: flex;
      gap: 10px;
      margin-bottom: 18px;
    }
    .filter-pill {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 5px 12px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      background: #f1f5f9;
      color: #475569;
    }
    .filter-pill.active {
      background: #0f172a;
      color: #ffffff;
    }
    .filter-badge {
      background: rgba(255,255,255,0.2);
      padding: 1px 6px;
      border-radius: 10px;
      font-size: 11px;
    }
    .filter-pill:not(.active) .filter-badge {
      background: #e2e8f0;
      color: #475569;
    }

    .models-list {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }
    .model-chip {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      background: #fff7ed;
      border: 1px solid #ffedd5;
      color: #c2410c;
    }
    .model-chip.purple {
      background: #faf5ff;
      border-color: #f3e8ff;
      color: #7e22ce;
    }
    .model-chip.blue {
      background: #eff6ff;
      border-color: #dbeafe;
      color: #1d4ed8;
    }
    .model-chip.teal {
      background: #f0fdfa;
      border-color: #ccfbf1;
      color: #0f766e;
    }
  </style>
</head>
<body>
  <div class="layout">
    <!-- Top Header -->
    <header class="header">
      <div class="header-left">
        <div class="logo">
          <div class="logo-icon"></div>
          Agent Router
        </div>
        <nav class="nav-links">
          <span>Home</span>
          <span class="active">Console</span>
          <span>Pricing</span>
          <span>QQ群</span>
          <span>Discord</span>
          <span>Docs</span>
        </nav>
      </div>
      <div class="header-right">
        <div class="badge-icon">
          🔔
          <span class="badge-num">14</span>
        </div>
        <div>🌙</div>
        <div>🌐</div>
        <div class="user-pill">
          <div class="user-pill-avatar">G</div>
          <span>${user.username}</span>
          <span style="font-size: 10px; margin-left: 2px;">▼</span>
        </div>
      </div>
    </header>

    <div class="container">
      <!-- Left Sidebar -->
      <aside class="sidebar">
        <div>
          <div class="side-group">
            <div class="side-title">Console</div>
            <div class="side-item">📊 Dashboard</div>
            <div class="side-item">🔑 API Token</div>
            <div class="side-item">📋 Usage log</div>
          </div>
          <div class="side-group">
            <div class="side-title">Personal Center</div>
            <div class="side-item">💳 Wallet</div>
            <div class="side-item active">👤 Personal Settings</div>
          </div>
        </div>
        <div style="font-size: 12px; color: #86909c; padding: 12px; cursor: pointer;">
          ◀ Collapse sidebar
        </div>
      </aside>

      <!-- Main Panel -->
      <main class="content">
        <!-- User Personal Card -->
        <div class="profile-card">
          <div class="export-btn">📥</div>
          <div class="profile-header">
            <div class="main-avatar">${avatarText}</div>
            <div class="main-meta">
              <h1>${user.username}</h1>
              <div class="tags">
                <span class="tag">Normal User</span>
                <span class="tag">ID: ${user.id}</span>
              </div>
            </div>
          </div>
          <div class="balance-box">
            <div class="balance-label">Current balance</div>
            <div class="balance-amount">${balanceVal}</div>
          </div>
          <div class="stats-bar">
            <div class="stat-block">
              <span class="stat-label">Consumption</span>
              <span class="stat-val">$0.19</span>
            </div>
            <div class="stat-block">
              <span class="stat-label">Number of Requests</span>
              <span class="stat-val">14</span>
            </div>
            <div class="stat-block">
              <span class="stat-label">Your default group</span>
              <span class="stat-val">default</span>
            </div>
          </div>
        </div>

        <!-- Models & Tabs -->
        <div class="tabs-bar">
          <div class="tab-btn active">⚙️ Available models</div>
          <div class="tab-btn">👤 Account Binding</div>
          <div class="tab-btn">🛡️ Security Settings</div>
          <div class="tab-btn">🔔 Other Settings</div>
        </div>

        <div>
          <div class="section-title">⚙️ Model list</div>
          <div class="section-sub">Click the model name to copy</div>

          <div class="filter-pills">
            <div class="filter-pill active">All Models <span class="filter-badge">5</span></div>
            <div class="filter-pill">🤖 OpenAI <span class="filter-badge">1</span></div>
            <div class="filter-pill">✳️ Anthropic <span class="filter-badge">2</span></div>
            <div class="filter-pill">❄️ Zhipu AI <span class="filter-badge">1</span></div>
            <div class="filter-pill">🐋 DeepSeek <span class="filter-badge">1</span></div>
          </div>

          <div class="models-list">
            <div class="model-chip">✳️ claude-opus-4-8</div>
            <div class="model-chip purple">✳️ claude-opus-5</div>
            <div class="model-chip blue">🐋 deepseek-v4-flash</div>
            <div class="model-chip teal">❄️ glm-5.3</div>
            <div class="model-chip">🤖 gpt-5.6-sol</div>
          </div>
        </div>
      </main>
    </div>
  </div>
</body>
</html>`;
}
