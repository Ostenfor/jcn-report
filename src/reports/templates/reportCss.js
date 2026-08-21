const buildReportCss = () => {
  return `
    * {
      box-sizing: border-box;
    }

    :root {
      --bg: #0b0f14;
      --bg-soft: #111827;
      --bg-card: #121a24;
      --bg-card-2: #0f172a;
      --text: #f8fafc;
      --muted: #94a3b8;
      --line: #243041;
      --line-soft: #1e293b;
      --accent: #38bdf8;
      --blue: #3b82f6;
      --green: #22c55e;
      --yellow: #f59e0b;
      --red: #ef4444;
      --shadow: 0 10px 24px rgba(0,0,0,0.28);
      --radius: 16px;
    }

    html {
      background: var(--bg);
    }

    body {
      font-family: Arial, sans-serif;
      background:
        radial-gradient(circle at top left, rgba(59,130,246,0.08), transparent 28%),
        radial-gradient(circle at top right, rgba(168,85,247,0.06), transparent 24%),
        linear-gradient(180deg, #0b0f14 0%, #0c1118 100%);
      color: var(--text);
      padding: 24px 24px 120px 24px;
      margin: 0;
      font-size: 15px;
      min-height: 100vh;
    }

    h1 {
      margin: 0 0 6px 0;
      font-size: 30px;
      line-height: 1.1;
      font-weight: 900;
      color: #ffffff;
    }

    h2 {
      margin: 0;
      font-size: 22px;
      line-height: 1.2;
      font-weight: 900;
      color: #ffffff;
    }

    h3 {
      color: #ffffff;
    }

    button,
    input,
    select {
      font-family: inherit;
    }

    button {
      cursor: pointer;
      touch-action: manipulation;
    }

    .freshness-warning {
      position: sticky;
      top: 0;
      z-index: 1000;
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      align-items: center;
      gap: 18px;
      width: 100%;
      margin: -8px 0 24px 0;
      padding: 22px 24px;
      border: 4px solid transparent;
      border-radius: 18px;
      box-shadow: 0 18px 50px rgba(0,0,0,0.58);
      color: #ffffff;
    }

    .freshness-warning-hidden {
      display: none;
    }

    .overdue-alert-stack {
      width: 100%;
      margin: 0 0 22px;
      padding: 14px;
      border: 2px solid #fb923c;
      border-radius: 14px;
      background: linear-gradient(135deg, rgba(124, 45, 18, 0.97), rgba(154, 52, 18, 0.95));
      box-shadow: 0 14px 36px rgba(124, 45, 18, 0.35);
    }

    .overdue-alert-stack-hidden {
      display: none;
    }

    .overdue-alert-stack-header,
    .overdue-alert-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
    }

    .overdue-alert-stack-header {
      margin-bottom: 10px;
      color: #ffedd5;
    }

    .overdue-alert-stack-header button,
    .overdue-alert-item button {
      border: 1px solid rgba(255, 237, 213, 0.45);
      border-radius: 8px;
      color: #fff7ed;
      background: rgba(67, 20, 7, 0.45);
      font-weight: 900;
    }

    .overdue-alert-stack-header button {
      padding: 7px 10px;
    }

    .overdue-alert-list {
      display: grid;
      gap: 12px;
    }

    .overdue-alert-group {
      padding: 10px;
      border: 2px solid transparent;
      border-radius: 12px;
    }

    .overdue-alert-group-today {
      border-color: rgba(253, 186, 116, 0.75);
      background: rgba(154, 52, 18, 0.48);
    }

    .overdue-alert-group-yesterday {
      border-color: rgba(216, 180, 254, 0.7);
      background: rgba(88, 28, 135, 0.48);
    }

    .overdue-alert-group h3 {
      margin: 0 0 8px;
      color: #fff7ed;
      font-size: 14px;
    }

    .overdue-alert-group-yesterday h3 {
      color: #f3e8ff;
    }

    .overdue-alert-group h3 span {
      opacity: 0.82;
    }

    .overdue-alert-group-list {
      display: grid;
      gap: 8px;
    }

    .overdue-alert-item {
      padding: 10px 12px;
      border: 1px solid rgba(254, 215, 170, 0.35);
      border-radius: 10px;
      color: #fff7ed;
      background: rgba(67, 20, 7, 0.32);
    }

    .overdue-alert-content {
      display: grid;
      gap: 3px;
    }

    .overdue-alert-item span {
      color: #fed7aa;
      font-size: 12px;
    }

    .overdue-alert-item button {
      width: 32px;
      height: 32px;
      font-size: 20px;
      line-height: 1;
    }

    .overdue-alert-group-name {
      margin-top: 4px;
      color: #fff7ed !important;
    }

    .overdue-alert-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }

    .overdue-alert-item .overdue-copy-group-btn {
      width: auto;
      min-width: 105px;
      padding: 0 12px;
      border-color: rgba(125, 211, 252, 0.8);
      color: #e0f2fe;
      background: rgba(3, 105, 161, 0.55);
      font-size: 12px;
      line-height: normal;
      cursor: pointer;
    }

    .overdue-alert-item .overdue-copy-group-btn:disabled {
      opacity: 0.48;
      cursor: not-allowed;
    }

    .freshness-warning-yellow {
      background: linear-gradient(135deg, #854d0e, #ca8a04);
      border-color: #fde047;
      color: #fffbea;
    }

    .freshness-warning-red {
      background: linear-gradient(135deg, #7f1d1d, #dc2626);
      border-color: #fecaca;
      animation: freshness-warning-pulse 1.8s ease-in-out infinite;
    }

    .freshness-warning-icon {
      font-size: 42px;
      line-height: 1;
      font-weight: 900;
    }

    .freshness-warning-title {
      font-size: clamp(22px, 2.3vw, 38px);
      line-height: 1.05;
      font-weight: 1000;
      letter-spacing: 0.02em;
      text-transform: uppercase;
    }

    .freshness-warning-detail {
      margin-top: 8px;
      font-size: clamp(14px, 1.2vw, 19px);
      line-height: 1.35;
      font-weight: 900;
    }

    @keyframes freshness-warning-pulse {
      0%,
      100% {
        box-shadow: 0 18px 50px rgba(127,29,29,0.55);
      }

      50% {
        box-shadow: 0 18px 64px rgba(239,68,68,0.92);
      }
    }

    .generated-time {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: linear-gradient(135deg, #111827, #0f172a);
      color: #fff;
      border-radius: 999px;
      padding: 10px 14px;
      margin: 8px 0 20px 0;
      font-size: 14px;
      border: 1px solid var(--line);
      box-shadow: var(--shadow);
    }

    .generated-time span {
      color: #cbd5e1;
      font-weight: 800;
    }

    .generated-time strong {
      color: #ffffff;
      font-weight: 900;
    }

    .summary-card {
      background: linear-gradient(180deg, rgba(18,26,36,0.96), rgba(15,23,42,0.96));
      border: 1px solid var(--line);
      border-radius: var(--radius);
      padding: 16px;
      box-shadow: var(--shadow);
      min-width: 0;
    }

    .summary-number {
      font-size: 30px;
      font-weight: 900;
      margin-bottom: 6px;
      line-height: 1;
      color: #ffffff;
    }

    .summary-label {
      color: var(--muted);
      font-size: 13px;
      line-height: 1.25;
      font-weight: 700;
    }

    .summary-new .summary-number {
      color: var(--green);
    }

    .summary-removed .summary-number {
      color: var(--red);
    }

    .summary-no-notification .summary-number {
      color: var(--yellow);
    }

    .tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 9px;
      margin: 16px 0 22px 0;
      align-items: stretch;
    }

    .tab-group {
      --tab-group-accent: #64748b;
      --tab-group-bg: rgba(100, 116, 139, 0.07);
      --tab-active-start: #475569;
      --tab-active-end: #334155;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 7px;
      padding: 5px;
      border: 2px solid var(--tab-group-accent);
      border-radius: 14px;
      background: var(--tab-group-bg);
    }

    .tab-group-tracking {
      --tab-group-accent: #eab308;
      --tab-group-bg: rgba(234, 179, 8, 0.08);
      --tab-active-start: #ca8a04;
      --tab-active-end: #a16207;
    }

    .tab-group-reminders {
      --tab-group-accent: #06b6d4;
      --tab-group-bg: rgba(6, 182, 212, 0.08);
      --tab-active-start: #0ea5e9;
      --tab-active-end: #2563eb;
    }

    .tab-group-saturday {
      --tab-group-accent: #22c55e;
      --tab-group-bg: rgba(34, 197, 94, 0.08);
      --tab-active-start: #16a34a;
      --tab-active-end: #15803d;
    }

    .tab-group-removed {
      --tab-group-accent: #ef4444;
      --tab-group-bg: rgba(239, 68, 68, 0.08);
      --tab-active-start: #dc2626;
      --tab-active-end: #b91c1c;
    }

    .tab-group-screenshots {
      --tab-group-accent: #818cf8;
      --tab-group-bg: rgba(99, 102, 241, 0.08);
      --tab-active-start: #6366f1;
      --tab-active-end: #4f46e5;
    }

    .tab-group-clients {
      --tab-group-accent: #94a3b8;
      --tab-group-bg: rgba(148, 163, 184, 0.07);
      --tab-active-start: #64748b;
      --tab-active-end: #475569;
    }

    .tab-button {
      border: 1px solid var(--line);
      background: rgba(17,24,39,0.88);
      color: var(--text);
      border-radius: 999px;
      padding: 10px 14px;
      font-size: 14px;
      min-height: 42px;
      font-weight: 900;
      box-shadow: 0 6px 16px rgba(0,0,0,0.18);
    }

    .tab-button.active {
      background: linear-gradient(135deg, #0ea5e9, #2563eb);
      color: #fff;
      border-color: #38bdf8;
    }

    .tab-group .tab-button.active {
      background: linear-gradient(135deg, var(--tab-active-start), var(--tab-active-end));
      border-color: var(--tab-group-accent);
      box-shadow: 0 7px 18px color-mix(in srgb, var(--tab-group-accent) 28%, transparent);
    }

    @media (max-width: 720px) {
      .tab-group {
        width: 100%;
      }

      .tab-group .tab-button {
        flex: 1 1 auto;
      }
    }

    .report-section {
      display: none;
    }

    .report-section.active {
      display: block;
    }

    .section-title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      margin-top: 34px;
      margin-bottom: 12px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--line);
    }

    .collapse-btn,
    .small-collapse-btn {
      border: 1px solid var(--line);
      background: rgba(17,24,39,0.9);
      color: #fff;
      border-radius: 999px;
      padding: 9px 14px;
      white-space: nowrap;
      font-size: 13px;
      min-height: 40px;
      font-weight: 900;
    }

    .small-collapse-btn {
      color: #fde68a;
      border-color: rgba(245,158,11,0.45);
      font-size: 12px;
      min-height: 34px;
      padding: 7px 12px;
    }

    .section-body.collapsed,
    .pending-confirm-body.collapsed,
    .no-notification-body.collapsed {
      display: none;
    }

    .section-summary {
      color: var(--muted);
      margin-bottom: 10px;
      font-size: 14px;
      font-weight: 700;
    }

    .controls {
      position: sticky;
      top: 0;
      z-index: 50;
      background: rgba(12, 17, 24, 0.96);
      border: 1px solid var(--line);
      border-radius: 14px;
      padding: 10px 12px;
      margin-bottom: 12px;
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
      font-size: 13px;
      box-shadow: var(--shadow);
      backdrop-filter: blur(8px);
    }

    .controls label,
    .mention-switch {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: var(--text);
      font-weight: 800;
    }

    .controls select {
      padding: 8px 10px;
      border-radius: 10px;
      border: 1px solid var(--line);
      font-weight: 800;
      font-size: 13px;
      max-width: 340px;
      min-height: 38px;
      cursor: pointer;
      background: var(--bg-soft);
      color: #fff;
      outline: none;
    }

    .mention-switch input {
      width: 18px;
      height: 18px;
      cursor: pointer;
      margin: 0;
      accent-color: #38bdf8;
    }

    .pending-confirm-box,
    .no-notification-box,
    .publisher-card {
      background: linear-gradient(180deg, rgba(18,26,36,0.98), rgba(15,23,42,0.98));
      border: 1px solid var(--line);
      border-radius: 16px;
      box-shadow: var(--shadow);
    }

    .pending-confirm-box {
      background: linear-gradient(180deg, rgba(245,158,11,0.10), rgba(245,158,11,0.06));
      border-color: rgba(245,158,11,0.35);
      padding: 12px 14px;
      margin-bottom: 14px;
    }

    .pending-confirm-header,
    .no-notification-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .pending-confirm-header strong {
      color: #fde68a;
      font-size: 16px;
    }

    .pending-confirm-list {
      margin-top: 12px;
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }

    .pending-pill {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(245,158,11,0.40);
      color: #fde68a;
      border-radius: 999px;
      padding: 7px 12px;
      font-size: 13px;
      font-weight: 800;
    }

    .empty {
      background: var(--bg-card);
      border: 1px solid var(--line);
      border-radius: 14px;
      padding: 18px;
      color: var(--muted);
      margin-bottom: 16px;
      box-shadow: var(--shadow);
    }

    .publisher-card {
      padding: 16px;
      margin-bottom: 18px;
      overflow: hidden;
    }

    .publisher-card.sended {
      border-color: rgba(56,189,248,0.45);
      background: linear-gradient(180deg, rgba(11,31,48,0.98), rgba(15,23,42,0.98));
    }

    .publisher-card.confirmed {
      border-color: rgba(34,197,94,0.45);
      background: linear-gradient(180deg, rgba(12,36,24,0.98), rgba(15,23,42,0.98));
    }

    .publisher-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 10px;
    }

    .publisher-title {
      font-size: 18px;
      font-weight: 900;
      cursor: pointer;
      color: #ffffff;
      user-select: none;
      line-height: 1.25;
      min-width: 0;
    }

    .publisher-title.copied {
      color: #60a5fa;
    }

    .publisher-title small {
      color: var(--green);
      font-size: 13px;
      margin-left: 8px;
      font-weight: 900;
    }

    .publisher-status-row {
      display: flex;
      flex-wrap: nowrap;
      gap: 16px;
      align-items: center;
      justify-content: flex-end;
      flex-shrink: 0;
    }

    .status-check {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      font-size: 13px;
      font-weight: 900;
      white-space: nowrap;
      user-select: none;
      cursor: pointer;
      min-height: 34px;
    }

    .status-check input {
      width: 20px;
      height: 20px;
      margin: 0;
      cursor: pointer;
      flex-shrink: 0;
      accent-color: #38bdf8;
    }

    .sended-check {
      color: var(--accent);
    }

    .confirmed-check {
      color: var(--green);
    }

    .card-actions,
    .action-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin: 8px 0 12px 0;
      align-items: center;
    }

    .action-btn,
    .whatsapp-btn,
    .copy-message-btn,
    .copy-group-btn {
      appearance: none;
      border-radius: 999px;
      padding: 8px 13px;
      font-size: 13px;
      line-height: 1;
      min-height: 34px;
      border: 1px solid rgba(148, 163, 184, 0.35);
      background: rgba(15, 23, 42, 0.85);
      color: #e5e7eb;
      cursor: pointer;
      font-weight: 900;
      box-shadow: 0 8px 18px rgba(0,0,0,0.18);
    }

    .whatsapp-btn {
      border-color: rgba(34,197,94,0.55);
      background: rgba(34,197,94,0.14);
      color: #bbf7d0;
    }

    .copy-message-btn {
      border-color: rgba(59,130,246,0.55);
      background: rgba(59,130,246,0.14);
      color: #bfdbfe;
    }

    .copy-group-btn {
      border-color: rgba(245,158,11,0.55);
      background: rgba(245,158,11,0.14);
      color: #fde68a;
    }

    .disabled-btn,
    .action-btn:disabled,
    .copy-group-btn:disabled {
      opacity: 0.45;
      cursor: not-allowed;
      background: rgba(255,255,255,0.05);
      color: #94a3b8;
      border-color: var(--line);
    }

    .copy-lines {
      display: none;
      white-space: pre-wrap;
    }

    .message-block {
      cursor: pointer;
      padding: 14px;
      background: rgba(255,255,255,0.03);
      border-radius: 14px;
      border: 1px solid var(--line-soft);
      line-height: 1.45;
      font-size: 15px;
      overflow-wrap: anywhere;
      color: var(--text);
      transition: border-color 0.15s ease, background 0.15s ease;
    }

    .message-block:hover {
      border-color: rgba(96,165,250,0.45);
      background: rgba(59,130,246,0.05);
    }

    .dynamic-message {
      font-weight: 900;
      font-size: 15px;
      color: #ffffff;
      margin-bottom: 8px;
    }

    .message-lines {
      color: #e5e7eb;
    }

    .line {
      margin-bottom: 6px;
      line-height: 1.45;
      overflow-wrap: anywhere;
      color: #e5e7eb;
    }

    .new-line {
      color: #bbf7d0;
      font-weight: 800;
      background: rgba(34,197,94,0.10);
      border-left: 4px solid var(--green);
      padding: 6px 9px;
      border-radius: 8px;
    }

    .badge-new,
    .badge-removed {
      display: inline-block;
      margin-left: 8px;
      padding: 2px 7px;
      border-radius: 999px;
      color: #fff;
      font-size: 11px;
      font-weight: 900;
      vertical-align: middle;
    }

    .badge-new {
      background: var(--green);
      color: #08130c;
    }

    .badge-removed {
      background: var(--red);
    }

    .group-footer,
    .notes-footer {
      margin-top: 12px;
      padding: 11px 12px;
      background: rgba(255,255,255,0.03);
      border: 1px dashed #334155;
      border-radius: 12px;
      line-height: 1.35;
      color: var(--text);
    }

    .group-footer span {
      color: #ffffff;
      font-weight: 700;
    }

    .notes-footer {
      background: rgba(59,130,246,0.06);
      border-color: rgba(96,165,250,0.35);
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
    }

    .notes-footer-label {
      color: #bfdbfe;
      font-weight: 900;
      margin-right: 2px;
    }

    .notes-list {
      display: inline-flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
    }

    .note-label {
      display: inline-flex;
      align-items: center;
      padding: 4px 10px;
      border-radius: 999px;
      background: rgba(59,130,246,0.18);
      color: #bfdbfe;
      font-size: 12px;
      font-weight: 900;
      border: 1px solid rgba(96,165,250,0.35);
      white-space: nowrap;
    }

    .no-notification-box {
      margin-top: 22px;
      padding: 14px;
      border-color: rgba(245,158,11,0.35);
      background: linear-gradient(180deg, rgba(245,158,11,0.10), rgba(15,23,42,0.96));
    }

    .no-notification-header strong {
      display: block;
      color: #fde68a;
      font-size: 16px;
      margin-bottom: 3px;
    }

    .no-notification-header span {
      display: block;
      color: #fcd34d;
      font-size: 13px;
      font-weight: 800;
    }

    .no-notification-body {
      margin-top: 14px;
    }

    .no-notification-badge {
      display: inline-flex;
      align-items: center;
      margin-bottom: 12px;
      padding: 5px 10px;
      border-radius: 999px;
      background: rgba(245,158,11,0.16);
      color: #fde68a;
      font-size: 12px;
      font-weight: 900;
      border: 1px solid rgba(245,158,11,0.35);
    }

    .client-search-bar {
      position: sticky;
      top: 8px;
      z-index: 70;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 12px;
      margin-bottom: 16px;
      background: rgba(12, 17, 24, 0.97);
      border: 1px solid rgba(96,165,250,0.38);
      border-radius: 14px;
      box-shadow: var(--shadow);
    }

    .client-search-bar input {
      flex: 1;
      min-width: 180px;
      min-height: 40px;
      padding: 9px 12px;
      border-radius: 10px;
      border: 1px solid var(--line);
      background: var(--bg-soft);
      color: #ffffff;
      font-size: 14px;
      font-weight: 800;
      outline: none;
    }

    .client-search-bar span {
      color: #fde68a;
      font-size: 13px;
      font-weight: 900;
      white-space: nowrap;
    }

    .important-client-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
    }

    .important-client-card {
      background: linear-gradient(180deg, rgba(18,26,36,0.98), rgba(15,23,42,0.98));
      border: 1px solid var(--line);
      border-radius: 16px;
      padding: 14px;
      box-shadow: var(--shadow);
      min-width: 0;
    }

    .important-client-top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 12px;
    }

    .important-client-top h3 {
      margin: 0;
      font-size: 17px;
      line-height: 1.25;
      color: #ffffff;
    }

    .client-aliases {
      margin-top: 5px;
      color: var(--muted);
      font-size: 12px;
      font-weight: 800;
      overflow-wrap: anywhere;
    }

    .client-status {
      flex-shrink: 0;
      border-radius: 999px;
      padding: 5px 9px;
      font-size: 11px;
      font-weight: 900;
      white-space: nowrap;
      border: 1px solid var(--line);
    }

    .client-status.notify {
      color: #bbf7d0;
      background: rgba(34,197,94,0.12);
      border-color: rgba(34,197,94,0.35);
    }

    .client-status.no-notify {
      color: #fde68a;
      background: rgba(245,158,11,0.14);
      border-color: rgba(245,158,11,0.38);
    }

    .client-group-row,
    .client-notes-row {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      color: #e5e7eb;
      font-size: 13px;
      line-height: 1.35;
      margin-top: 10px;
      overflow-wrap: anywhere;
    }

    .client-group-row strong,
    .client-notes-row strong {
      color: #bfdbfe;
      min-width: 76px;
      font-weight: 900;
    }

    .muted-note {
      opacity: 0.65;
    }

    .toast {
      position: fixed;
      left: 50%;
      bottom: 92px;
      transform: translateX(-50%);
      max-width: calc(100% - 24px);
      background: rgba(15,23,42,0.96);
      color: #fff;
      padding: 12px 14px;
      border-radius: 14px;
      font-size: 14px;
      z-index: 9999;
      box-shadow: var(--shadow);
      border: 1px solid var(--line);
      display: none;
      text-align: center;
    }

    .toast.show {
      display: block;
    }

    .toast strong {
      color: #93c5fd;
    }

    .fixed-progress-footer {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 9998;
      background: rgba(8, 13, 20, 0.96);
      border-top: 1px solid rgba(96,165,250,0.22);
      box-shadow: 0 -10px 28px rgba(0,0,0,0.35);
      backdrop-filter: blur(10px);
      padding: 10px 14px;
    }

    .fixed-progress-footer.hidden-footer {
      display: none;
    }

    .fixed-progress-inner {
      max-width: 1600px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    #delivery-progress-footer .fixed-progress-inner {
      grid-template-columns: minmax(0, 1fr);
    }

    .fixed-progress-card {
      background: rgba(15,23,42,0.82);
      border: 1px solid rgba(148,163,184,0.22);
      border-radius: 14px;
      padding: 9px 11px;
      min-width: 0;
    }

    .fixed-progress-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 7px;
    }

    .fixed-progress-number {
      font-size: 18px;
      font-weight: 900;
      color: #ffffff;
      line-height: 1;
    }

    .fixed-progress-label {
      color: #bfdbfe;
      font-size: 12px;
      font-weight: 900;
      white-space: nowrap;
    }

    .fixed-progress-card.confirmed .fixed-progress-number,
    .fixed-progress-card.completed .fixed-progress-number {
      color: var(--green);
    }

    .fixed-progress-card.sended .fixed-progress-number {
      color: var(--accent);
    }

    .fixed-progress-track {
      height: 7px;
      background: #1e293b;
      border-radius: 999px;
      overflow: hidden;
    }

    .fixed-progress-fill {
      height: 100%;
      width: 0%;
      background: #dc2626;
      border-radius: 999px;
      transition: width 0.25s ease, background 0.25s ease;
    }

    .delivery-history-controls {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px;
      margin-bottom: 18px;
      background: rgba(255,255,255,0.035);
      border: 1px solid var(--line);
      border-radius: 14px;
      padding: 12px;
    }

    .delivery-history-controls strong {
      color: #bfdbfe;
      font-size: 13px;
      font-weight: 900;
    }

    .delivery-history-controls span {
      color: #ffffff;
      font-size: 13px;
      font-weight: 800;
    }

    .delivery-filter-bar {
      position: sticky;
      top: 8px;
      z-index: 90;

      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;

      margin: 0 0 18px 0;
      padding: 12px;

      background: rgba(12, 17, 24, 0.97);
      border: 1px solid rgba(96,165,250,0.38);
      border-radius: 14px;
      box-shadow: 0 12px 28px rgba(0,0,0,0.35);
      backdrop-filter: blur(10px);
    }

    .delivery-filter-bar label {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      color: #bfdbfe;
      font-size: 13px;
      font-weight: 900;
    }

    .delivery-publisher-filter {
      min-width: 260px;
      max-width: 420px;
      padding: 8px 10px;
      border-radius: 10px;
      border: 1px solid var(--line);
      background: var(--bg-soft);
      color: #ffffff;
      font-size: 13px;
      font-weight: 800;
      outline: none;
    }

    .delivery-filter-count {
      color: #fde68a;
      font-size: 13px;
      font-weight: 900;
    }

    .delivery-history-panel {
      display: none;
    }

    .delivery-history-panel.active-history-panel {
      display: block;
    }

    .delivery-summary-grid {
      display: grid;
      grid-template-columns: repeat(6, minmax(130px, 1fr));
      gap: 12px;
      margin-bottom: 22px;
    }

    .delivery-heading {
      margin: 26px 0 14px 0;
      font-size: 20px;
      color: #ffffff;
      border-bottom: 1px solid var(--line);
      padding-bottom: 10px;
    }

    .delivery-card {
      background: linear-gradient(180deg, rgba(18,26,36,0.98), rgba(15,23,42,0.98));
      border: 1px solid var(--line);
      border-radius: 16px;
      padding: 14px;
      margin-bottom: 13px;
      box-shadow: var(--shadow);
    }

    .delivery-card.status-approved {
      border-color: rgba(34,197,94,0.45);
    }

    .delivery-card.status-completed {
      border-color: rgba(56,189,248,0.45);
    }

    .delivery-card.status-pending {
      border-color: rgba(245,158,11,0.50);
    }

    .delivery-card.status-missing {
      border-color: rgba(239,68,68,0.45);
    }

    .delivery-card.status-unknown {
      border-color: rgba(148,163,184,0.45);
    }

    .delivery-card-top {
      display: flex;
      justify-content: space-between;
      gap: 14px;
      align-items: flex-start;
      margin-bottom: 10px;
    }

    .delivery-title {
      font-size: 17px;
      font-weight: 900;
      color: #ffffff;
      line-height: 1.25;
    }

    .delivery-title span {
      color: var(--muted);
      font-size: 12px;
      font-weight: 800;
    }

    .delivery-subtitle {
      color: #cbd5e1;
      font-size: 12px;
      margin-top: 5px;
      font-weight: 700;
    }

    .delivery-status {
      border-radius: 999px;
      padding: 6px 10px;
      font-size: 11px;
      font-weight: 900;
      white-space: nowrap;
      border: 1px solid var(--line);
    }

    .delivery-status.status-approved {
      color: #86efac;
      background: rgba(34,197,94,0.12);
      border-color: rgba(34,197,94,0.35);
    }

    .delivery-status.status-completed {
      color: #7dd3fc;
      background: rgba(56,189,248,0.12);
      border-color: rgba(56,189,248,0.35);
    }

    .delivery-status.status-pending {
      color: #fde68a;
      background: rgba(245,158,11,0.14);
      border-color: rgba(245,158,11,0.38);
    }

    .delivery-status.status-missing {
      color: #fecaca;
      background: rgba(239,68,68,0.12);
      border-color: rgba(239,68,68,0.35);
    }

    .delivery-status.status-unknown {
      color: #cbd5e1;
      background: rgba(148,163,184,0.12);
      border-color: rgba(148,163,184,0.35);
    }

    .delivery-source-row,
    .delivery-history-row {
      display: flex;
      flex-wrap: wrap;
      gap: 7px;
      margin-bottom: 11px;
    }

    .delivery-source-row span {
      display: inline-flex;
      border: 1px solid var(--line);
      background: rgba(255,255,255,0.04);
      color: #cbd5e1;
      border-radius: 999px;
      padding: 4px 8px;
      font-size: 11px;
      font-weight: 800;
    }

    .delivery-history-row span {
      display: inline-flex;
      border: 1px solid rgba(245,158,11,0.32);
      background: rgba(245,158,11,0.08);
      color: #fde68a;
      border-radius: 999px;
      padding: 4px 8px;
      font-size: 11px;
      font-weight: 800;
    }

    .delivery-assets {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
      margin-top: 9px;
    }

    .asset-box {
      background: rgba(255,255,255,0.035);
      border: 1px solid var(--line-soft);
      border-radius: 14px;
      padding: 8px;
      min-width: 0;
    }

    .asset-empty {
      opacity: 0.65;
    }

    .asset-label {
      color: #bfdbfe;
      font-size: 11px;
      font-weight: 900;
      margin-bottom: 7px;
    }

    .asset-preview {
      width: 100%;
      max-height: 105px;
      object-fit: contain;
      border-radius: 10px;
      background: #020617;
      border: 1px solid rgba(148,163,184,0.18);
    }

    .asset-video-preview {
      width: 100%;
      max-height: 115px;
      object-fit: contain;
      border-radius: 10px;
      background: #020617;
      border: 1px solid rgba(148,163,184,0.18);
      display: block;
    }

    .asset-missing {
      min-height: 75px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 10px;
      background: rgba(15,23,42,0.9);
      border: 1px dashed #334155;
      color: #94a3b8;
      font-size: 11px;
      font-weight: 900;
      text-align: center;
      padding: 8px;
    }

    .asset-open-link {
      display: inline-flex;
      margin-top: 7px;
      color: #93c5fd;
      font-size: 11px;
      font-weight: 900;
      text-decoration: none;
    }

    .asset-open-link:hover {
      text-decoration: underline;
    }

    .delivery-actions {
      margin-top: 10px;
    }

    .delivery-actions a {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      padding: 7px 12px;
      border: 1px solid rgba(96,165,250,0.42);
      background: rgba(59,130,246,0.12);
      color: #93c5fd;
      text-decoration: none;
      font-size: 12px;
      font-weight: 900;
    }

    .delivery-no-link {
      color: #94a3b8;
      font-size: 12px;
      font-weight: 800;
    }

    @media (max-width: 900px) {
      .freshness-warning {
        position: relative;
        grid-template-columns: 1fr;
        gap: 10px;
        padding: 18px;
      }

      .freshness-warning-icon {
        font-size: 34px;
      }

      body {
        padding: 12px 12px 96px 12px;
        font-size: 14px;
      }

      h1 {
        font-size: 22px;
      }

      h2 {
        font-size: 18px;
      }

      .delivery-summary-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
      }

      .summary-card {
        padding: 12px;
      }

      .summary-number {
        font-size: 22px;
      }

      .summary-label {
        font-size: 11px;
      }

      .controls {
        padding: 8px 10px;
        gap: 8px;
        font-size: 12px;
      }

      .controls label:first-child {
        width: 100%;
      }

      .controls select {
        flex: 1;
        max-width: none;
        min-width: 0;
        font-size: 12px;
      }

      .pending-confirm-box,
      .no-notification-box {
        padding: 10px;
      }

      .publisher-card {
        padding: 14px;
        margin-bottom: 14px;
      }

      .publisher-card-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
      }

      .publisher-status-row {
        justify-content: flex-start;
        flex-direction: row;
        flex-wrap: nowrap;
        gap: 16px;
        width: 100%;
      }

      .status-check {
        font-size: 12px;
      }

      .status-check input {
        width: 20px;
        height: 20px;
      }

      .card-actions,
      .action-buttons {
        gap: 8px;
      }

      .action-btn,
      .whatsapp-btn,
      .copy-message-btn,
      .copy-group-btn {
        font-size: 12px;
        min-height: 34px;
        padding: 8px 11px;
      }

      .message-block {
        padding: 10px;
        font-size: 13px;
      }

      .dynamic-message {
        font-size: 14px;
      }

      .group-footer,
      .notes-footer {
        font-size: 12px;
        padding: 8px 10px;
      }

      .note-label {
        font-size: 10px;
        padding: 3px 8px;
      }

      .line {
        font-size: 13px;
      }

      .client-search-bar {
        align-items: stretch;
        flex-direction: column;
        padding: 10px;
      }

      .client-search-bar input {
        width: 100%;
        min-width: 0;
      }

      .important-client-grid {
        grid-template-columns: 1fr;
        gap: 12px;
      }

      .important-client-top {
        flex-direction: column;
      }

      .client-status {
        white-space: normal;
      }

      .toast {
        bottom: 86px;
      }

      .fixed-progress-footer {
        padding: 8px 10px;
      }

      .fixed-progress-inner {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
      }

      .fixed-progress-card {
        padding: 8px;
        border-radius: 12px;
      }

      .fixed-progress-number {
        font-size: 15px;
      }

      .fixed-progress-label {
        font-size: 10px;
      }

      .fixed-progress-track {
        height: 6px;
      }

      .delivery-history-controls {
        align-items: stretch;
        flex-direction: column;
      }

      .delivery-filter-bar {
        position: sticky;
        top: 8px;
        z-index: 90;

        align-items: stretch;
        flex-direction: column;

        margin-bottom: 14px;
        padding: 10px;
      }

      .delivery-filter-bar label {
        align-items: stretch;
        flex-direction: column;
      }

      .delivery-publisher-filter {
        width: 100%;
        min-width: 0;
        max-width: none;
      }

      .delivery-card {
        padding: 16px;
        margin-bottom: 16px;
      }

      .delivery-card-top {
        flex-direction: column;
      }

      .delivery-title {
        font-size: 18px;
      }

      .delivery-subtitle {
        font-size: 13px;
      }

      .delivery-status {
        font-size: 12px;
        padding: 7px 11px;
      }

      .delivery-source-row span,
      .delivery-history-row span {
        font-size: 12px;
        padding: 5px 9px;
      }

      .delivery-assets {
        grid-template-columns: 1fr;
        gap: 12px;
      }

      .asset-box {
        padding: 10px;
      }

      .asset-label {
        font-size: 12px;
      }

      .asset-preview {
        max-height: 180px;
      }

      .asset-video-preview {
        max-height: 200px;
      }

      .asset-missing {
        min-height: 90px;
        font-size: 12px;
      }

      .asset-open-link {
        font-size: 12px;
      }
    }

    @media (max-width: 430px) {
      .tab-button {
        font-size: 11px;
        padding: 7px 9px;
      }

      .card-actions,
      .action-buttons {
        display: grid;
        grid-template-columns: 1fr;
      }

      .action-btn,
      .whatsapp-btn,
      .copy-message-btn,
      .copy-group-btn {
        width: 100%;
      }

      .publisher-status-row {
        gap: 12px;
      }

      .status-check {
        font-size: 11px;
      }

      .message-block {
        font-size: 12.5px;
      }

      .dynamic-message {
        font-size: 13.5px;
      }

      .line {
        font-size: 12.5px;
      }
    }

    .section-description {
      margin: 6px 0 0;
      color: var(--muted);
      font-size: 13px;
    }

    .master-summary-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(140px, 1fr));
      gap: 12px;
      margin-bottom: 16px;
    }

    .master-metric {
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 14px;
      background: rgba(15, 23, 42, 0.78);
    }

    .master-metric strong {
      display: block;
      font-size: 28px;
      line-height: 1;
      margin-bottom: 7px;
    }

    .master-metric span {
      color: var(--muted);
      font-size: 12px;
    }

    .metric-action strong,
    .metric-overdue strong {
      color: #fb7185;
    }

    .metric-overnight strong {
      color: #fbbf24;
    }

    .metric-closed strong {
      color: #4ade80;
    }

    .work-queue-toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: end;
      padding: 12px;
      margin-bottom: 16px;
      border: 1px solid var(--line);
      border-radius: 12px;
      background: rgba(15, 23, 42, 0.72);
    }

    .work-queue-toolbar label {
      display: grid;
      gap: 5px;
      color: var(--muted);
      font-size: 12px;
    }

    .work-queue-toolbar input,
    .work-queue-toolbar select,
    .delivery-manual-control input,
    .delivery-manual-control select,
    .compact-status-select {
      min-height: 38px;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 7px 9px;
      color: var(--text);
      background: #0f172a;
    }

    .work-queue-toolbar input {
      width: min(360px, 72vw);
    }

    .master-day-group {
      margin-top: 18px;
      padding: 14px;
      border: 1px solid rgba(56, 189, 248, 0.4);
      border-radius: 14px;
      background: rgba(14, 165, 233, 0.055);
    }

    .master-day-group + .master-day-group {
      margin-top: 30px;
      padding-top: 14px;
      border: 1px solid rgba(245, 158, 11, 0.5);
      background: rgba(245, 158, 11, 0.065);
    }

    .master-day-group h3 {
      margin: 0 0 12px;
      color: #e2e8f0;
      font-size: 20px;
    }

    .master-overnight-group h3 {
      color: #fbbf24;
    }

    .master-nocturnal-group,
    .master-day-group + .master-nocturnal-group {
      border-color: rgba(129, 140, 248, 0.55);
      background: rgba(79, 70, 229, 0.075);
    }

    .master-nocturnal-group h3 {
      color: #a5b4fc;
    }

    .master-group-description {
      margin: -5px 0 12px;
      color: #a5b4fc;
      font-size: 12px;
    }

    .master-nocturnal-group .delivery-card {
      border-color: rgba(129, 140, 248, 0.45);
      box-shadow: inset 4px 0 0 #6366f1;
    }

    .nocturnal-notice {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 7px;
      margin: 10px 0;
      padding: 9px 10px;
      border: 1px solid rgba(129, 140, 248, 0.45);
      border-radius: 10px;
      color: #c7d2fe;
      background: rgba(49, 46, 129, 0.28);
      font-size: 11px;
    }

    .nocturnal-tag {
      padding: 4px 8px;
      border-radius: 999px;
      color: #eef2ff;
      background: #4f46e5;
      font-size: 10px;
      font-weight: 900;
      text-transform: uppercase;
    }

    .master-overnight-group .delivery-card[data-overnight-candidate="false"]:not([data-overnight-cohort="true"]) {
      display: none;
    }

    .master-history-legend {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 14px;
    }

    .master-history-legend span {
      padding: 8px 11px;
      border: 1px solid var(--line);
      border-radius: 999px;
      color: var(--muted);
      background: rgba(15, 23, 42, 0.72);
      font-size: 12px;
    }

    .master-history-table {
      overflow: hidden;
      border: 1px solid var(--line);
      border-radius: 12px;
    }

    .master-history-day + .master-history-day {
      margin-top: 28px;
    }

    .master-history-day {
      padding: 14px;
      border-radius: 14px;
    }

    .master-history-today {
      border: 2px solid rgba(56, 189, 248, 0.5);
      background: rgba(14, 165, 233, 0.065);
    }

    .master-history-yesterday {
      border: 2px solid rgba(168, 85, 247, 0.5);
      background: rgba(126, 34, 206, 0.075);
    }

    .master-history-day-title {
      display: flex;
      align-items: end;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 11px;
    }

    .master-history-day-title h3 {
      margin: 0;
    }

    .master-history-today .master-history-day-title h3 {
      color: #7dd3fc;
    }

    .master-history-yesterday .master-history-day-title h3 {
      color: #d8b4fe;
    }

    .master-history-day-title span {
      color: var(--muted);
      font-size: 11px;
    }

    .master-history-header,
    .master-history-row {
      display: grid;
      grid-template-columns: minmax(190px, 1.2fr) minmax(180px, 1fr) minmax(150px, 0.8fr) minmax(210px, 1fr);
      gap: 12px;
      align-items: center;
    }

    .master-history-header {
      padding: 10px 14px;
      color: #94a3b8;
      background: #0b1220;
      font-size: 11px;
      font-weight: 900;
      text-transform: uppercase;
    }

    .master-history-row {
      padding: 13px 14px;
      border-top: 1px solid var(--line);
      background: rgba(15, 23, 42, 0.52);
    }

    .history-client,
    .history-result,
    .history-actions {
      display: grid;
      gap: 4px;
    }

    .history-client span,
    .history-status-source,
    .history-scheduled {
      color: var(--muted);
      font-size: 11px;
    }

    .history-client .nocturnal-tag {
      width: fit-content;
      padding: 3px 7px;
      color: #eef2ff;
      background: #4f46e5;
      font-size: 9px;
      font-weight: 900;
    }

    .history-status-label {
      width: fit-content;
      padding: 5px 8px;
      border-radius: 999px;
      color: #e2e8f0;
      background: #334155;
      font-size: 11px;
    }

    .history-status-label.status-approved,
    .history-status-label.status-completed {
      color: #86efac;
      background: rgba(34, 197, 94, 0.16);
    }

    .history-status-label.status-cancelled {
      color: #fda4af;
      background: rgba(244, 63, 94, 0.16);
    }

    .history-status-label.status-rescheduled {
      color: #fde68a;
      background: rgba(245, 158, 11, 0.16);
    }

    .history-reschedule-btn {
      width: fit-content;
      min-height: 32px;
      padding: 6px 10px;
      border: 1px solid #38bdf8;
      border-radius: 8px;
      color: #e0f2fe;
      background: rgba(14, 165, 233, 0.12);
      cursor: pointer;
      font-size: 11px;
      font-weight: 800;
    }

    .history-reschedule-btn.reschedule-active {
      border-color: #f59e0b;
      color: #fde68a;
      background: rgba(245, 158, 11, 0.16);
    }

    .history-delay-clock {
      color: #fbbf24;
      font-size: 10px;
      font-weight: 800;
    }

    .history-events-details summary {
      color: #7dd3fc;
      font-size: 11px;
      cursor: pointer;
    }

    .history-events-list {
      display: grid;
      gap: 6px;
      margin-top: 7px;
    }

    .history-event-item {
      display: grid;
      gap: 2px;
      padding: 7px;
      border-left: 2px solid #38bdf8;
      color: #cbd5e1;
      background: rgba(2, 6, 23, 0.55);
      font-size: 10px;
    }

    .history-event-item time,
    .history-event-empty {
      color: #64748b;
      font-size: 9px;
    }

    .delivery-delay-clock {
      margin-top: 7px;
      color: #fbbf24;
      font-size: 12px;
      font-weight: 800;
      text-align: right;
    }

    .delivery-card.delay-level-1 {
      box-shadow: inset 4px 0 0 #f59e0b;
    }

    .delivery-card.delay-level-2 {
      box-shadow: inset 5px 0 0 #f97316;
    }

    .delivery-card.delay-level-3 {
      box-shadow: inset 6px 0 0 #ef4444, 0 0 24px rgba(239, 68, 68, 0.12);
    }

    .delivery-card.status-cancelled {
      border-color: #64748b;
      opacity: 0.78;
    }

    .delivery-card.status-rescheduled {
      border-color: #a78bfa;
    }

    .delivery-card.status-no-response {
      border-color: #fb7185;
    }

    .delivery-manual-control {
      margin: 14px 0;
      padding: 12px;
      border: 1px solid #334155;
      border-radius: 12px;
      background: rgba(2, 6, 23, 0.46);
    }

    .manual-control-heading {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
    }

    .manual-override-badge {
      padding: 4px 8px;
      border-radius: 999px;
      color: var(--muted);
      background: #1e293b;
      font-size: 11px;
    }

    .manual-override-badge.manual-active {
      color: #fde68a;
      background: rgba(245, 158, 11, 0.18);
    }

    .manual-control-grid {
      display: grid;
      grid-template-columns: minmax(180px, 1fr) minmax(190px, 1fr) minmax(220px, 2fr) auto;
      gap: 10px;
      align-items: end;
    }

    .manual-control-grid label {
      display: grid;
      gap: 5px;
      color: var(--muted);
      font-size: 11px;
    }

    .return-auto-btn,
    .tracking-manage-btn,
    .notification-btn {
      min-height: 38px;
      border: 1px solid #475569;
      border-radius: 8px;
      padding: 7px 11px;
      color: #e2e8f0;
      background: #1e293b;
      cursor: pointer;
    }

    .notification-btn {
      border-color: #0ea5e9;
      color: #e0f2fe;
      background: rgba(14, 165, 233, 0.16);
    }

    .summary-context-title {
      margin: 18px 0 8px;
      color: #94a3b8;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .status-journey {
      margin: 12px 0 8px;
      padding: 11px 12px 9px;
      border: 1px solid #263449;
      border-radius: 12px;
      background: rgba(2, 6, 23, 0.42);
    }

    .journey-main-track {
      position: relative;
      display: grid;
      grid-template-columns: repeat(4, minmax(95px, 1fr));
      gap: 5px;
    }

    .journey-main-track::before {
      content: '';
      position: absolute;
      top: 13px;
      left: 12.5%;
      right: 12.5%;
      height: 3px;
      border-radius: 999px;
      background: #334155;
    }

    .journey-step {
      position: relative;
      z-index: 1;
      display: grid;
      justify-items: center;
      gap: 5px;
      border: 0;
      padding: 0 3px;
      color: #64748b;
      background: transparent;
      font-size: 10px;
      font-weight: 800;
      cursor: default;
    }

    .journey-dot {
      display: grid;
      place-items: center;
      width: 28px;
      height: 28px;
      border: 3px solid #334155;
      border-radius: 50%;
      color: transparent;
      background: #0f172a;
      transition: 0.18s ease;
    }

    .journey-step.journey-done {
      color: #86efac;
    }

    .journey-step.journey-done .journey-dot {
      border-color: #22c55e;
      color: #052e16;
      background: #4ade80;
    }

    .journey-step.journey-active {
      color: #e0f2fe;
    }

    .journey-step.journey-active .journey-dot {
      border-color: #38bdf8;
      color: #ffffff;
      background: #0284c7;
      box-shadow: 0 0 0 5px rgba(56, 189, 248, 0.14);
    }

    .journey-exceptions {
      display: flex;
      flex-wrap: wrap;
      gap: 7px;
      justify-content: center;
      margin-top: 11px;
      padding-top: 9px;
      border-top: 1px solid #1e293b;
    }

    .journey-exception {
      border: 1px solid #334155;
      border-radius: 999px;
      padding: 5px 9px;
      color: #94a3b8;
      background: #111827;
      font-size: 10px;
      font-weight: 800;
      cursor: pointer;
    }

    .journey-exception > span {
      opacity: 0;
    }

    .journey-exception.journey-active > span {
      opacity: 1;
    }

    .journey-exception.journey-active {
      border-color: #f59e0b;
      color: #fef3c7;
      background: rgba(245, 158, 11, 0.17);
      box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.08);
    }

    .delivery-flag-button.journey-active {
      border-color: #fb7185;
      color: #ffe4e6;
      background: rgba(244, 63, 94, 0.16);
    }

    .tracking-origin {
      margin-top: 7px;
      color: #64748b;
      font-size: 9px;
      text-align: right;
    }

    .tracking-origin.manual-active {
      color: #fbbf24;
      font-weight: 800;
    }

    .delivery-evidence {
      margin-top: 9px;
      border-top: 1px solid #243041;
      padding-top: 8px;
    }

    .delivery-evidence summary {
      width: fit-content;
      color: #7dd3fc;
      font-size: 11px;
      font-weight: 800;
      cursor: pointer;
      user-select: none;
    }

    .delivery-evidence[open] summary {
      margin-bottom: 10px;
    }

    .master-delivery-assets {
      grid-template-columns: repeat(3, minmax(90px, 150px));
      justify-content: start;
      margin: 9px 0 4px;
    }

    .master-whatsapp-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin: 12px 0 8px;
      padding: 10px 12px;
      border: 1px solid rgba(245, 158, 11, 0.32);
      border-radius: 11px;
      background: rgba(245, 158, 11, 0.08);
    }

    .master-whatsapp-row > div {
      display: grid;
      gap: 3px;
      min-width: 0;
    }

    .master-whatsapp-row span {
      color: #fbbf24;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    .master-whatsapp-row strong {
      color: #fef3c7;
      font-size: 13px;
      overflow-wrap: anywhere;
    }

    .master-whatsapp-row .copy-group-btn {
      flex-shrink: 0;
    }

    .master-delivery-assets .asset-box {
      padding: 6px;
      border-radius: 10px;
    }

    .master-delivery-assets .asset-preview,
    .master-delivery-assets .asset-video-preview {
      height: 64px;
      max-height: 64px;
    }

    .master-delivery-assets .asset-missing {
      min-height: 48px;
    }

    .delivery-updated-at {
      margin-top: 8px;
      color: #64748b;
      font-size: 10px;
    }

    .compact-tracking {
      display: grid;
      grid-template-columns: minmax(150px, 1fr) auto minmax(175px, auto) auto;
      gap: 8px;
      align-items: center;
      margin-top: 9px;
      padding: 8px;
      border: 1px solid #334155;
      border-radius: 9px;
      background: rgba(2, 6, 23, 0.55);
    }

    .compact-tracking .status-journey {
      grid-column: 1 / -1;
      width: 100%;
      margin: 2px 0 0;
      padding: 8px 10px 6px;
    }

    .status-journey-compact .journey-dot {
      width: 22px;
      height: 22px;
      border-width: 2px;
    }

    .status-journey-compact .journey-main-track::before {
      top: 10px;
    }

    .status-journey-compact .journey-step,
    .status-journey-compact .journey-exception {
      font-size: 9px;
    }

    .tracking-inline-status {
      color: #e2e8f0;
      font-size: 11px;
      font-weight: 750;
    }

    .tracking-inline-timer {
      color: #fbbf24;
      font-size: 11px;
      font-weight: 800;
      white-space: nowrap;
    }

    .compact-status-select {
      max-width: 230px;
      font-size: 11px;
    }

    .queue-exit-reason {
      margin: 12px 0;
      padding: 9px 11px;
      border-radius: 9px;
      color: #fef3c7;
      background: rgba(245, 158, 11, 0.14);
      font-size: 12px;
      font-weight: 800;
    }

    .tracking-highlight {
      animation: trackingPulse 0.7s ease-in-out 3;
    }

    @keyframes trackingPulse {
      50% {
        outline: 4px solid rgba(56, 189, 248, 0.45);
        transform: translateY(-2px);
      }
    }

    @media (max-width: 900px) {
      .master-summary-grid {
        grid-template-columns: repeat(2, minmax(130px, 1fr));
      }

      .manual-control-grid {
        grid-template-columns: 1fr 1fr;
      }

      .compact-tracking {
        grid-template-columns: 1fr auto;
      }

      .compact-tracking .status-journey {
        grid-column: 1 / -1;
      }

      .master-history-header {
        display: none;
      }

      .master-history-row {
        grid-template-columns: 1fr 1fr;
      }
    }

    @media (max-width: 560px) {
      .compact-tracking {
        grid-template-columns: 1fr;
      }

      .tracking-manage-btn {
        width: 100%;
        max-width: none;
      }

      .journey-main-track {
        grid-template-columns: repeat(4, minmax(62px, 1fr));
      }

      .delivery-delay-clock {
        text-align: left;
      }

      .master-history-row {
        grid-template-columns: 1fr;
      }
    }
  `;
};

module.exports = {
  buildReportCss
};
