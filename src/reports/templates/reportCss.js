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
      font-weight: 800;
    }

    h2 {
      margin: 0;
      font-size: 22px;
      line-height: 1.2;
      font-weight: 800;
      color: #ffffff;
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
      font-weight: bold;
    }

    .generated-time strong {
      color: #ffffff;
      font-weight: 800;
    }

    .top-summary {
      display: grid;
      grid-template-columns: repeat(6, minmax(130px, 1fr));
      gap: 12px;
      margin-bottom: 20px;
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
      font-weight: 800;
      margin-bottom: 6px;
      line-height: 1;
      color: #ffffff;
    }

    .summary-label {
      color: var(--muted);
      font-size: 13px;
      line-height: 1.25;
      font-weight: 600;
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
      gap: 10px;
      margin: 16px 0 22px 0;
    }

    .tab-button,
    .collapse-btn,
    .small-collapse-btn,
    .reset-all-btn,
    .whatsapp-btn,
    .copy-group-btn {
      cursor: pointer;
      touch-action: manipulation;
      font-weight: 800;
    }

    .tab-button {
      border: 1px solid var(--line);
      background: rgba(17,24,39,0.88);
      color: var(--text);
      border-radius: 999px;
      padding: 10px 14px;
      font-size: 14px;
      min-height: 42px;
      box-shadow: 0 6px 16px rgba(0,0,0,0.18);
    }

    .tab-button.active {
      background: linear-gradient(135deg, #0ea5e9, #2563eb);
      color: #fff;
      border-color: #38bdf8;
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
      font-weight: 600;
    }

    .message-controls {
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

    .control-group {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
      flex: 1;
    }

    .control-label {
      font-weight: 700;
      white-space: nowrap;
      color: var(--text);
    }

    .message-controls select {
      padding: 8px 10px;
      border-radius: 10px;
      border: 1px solid var(--line);
      font-weight: 700;
      font-size: 13px;
      max-width: 320px;
      min-height: 38px;
      cursor: pointer;
      background: var(--bg-soft);
      color: #fff;
      outline: none;
    }

    .switch-row {
      display: flex;
      gap: 6px;
      align-items: center;
      font-weight: 700;
      font-size: 13px;
      min-height: 34px;
      cursor: pointer;
      color: var(--text);
    }

    .switch-row input {
      width: 18px;
      height: 18px;
      cursor: pointer;
      margin: 0;
      accent-color: #38bdf8;
    }

    .global-reset-row {
      display: flex;
      justify-content: flex-end;
      margin: 8px 0 14px 0;
    }

    .reset-all-btn {
      border: 1px solid rgba(239,68,68,0.45);
      background: linear-gradient(135deg, #b91c1c, #dc2626);
      color: #fff;
      border-radius: 999px;
      padding: 10px 16px;
      font-size: 13px;
      min-height: 40px;
      box-shadow: 0 10px 20px rgba(185,28,28,0.22);
    }

    .section-progress-box {
      display: none;
    }

    .section-progress-row {
      display: none;
    }

    .section-progress-card,
    .publisher-card,
    .pending-confirm-box,
    .no-notification-box {
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
      font-weight: 700;
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
    }

    .publisher-card.sended {
      border-color: rgba(56,189,248,0.45);
      background: linear-gradient(180deg, rgba(11,31,48,0.98), rgba(15,23,42,0.98));
    }

    .publisher-card.confirmed {
      border-color: rgba(34,197,94,0.45);
      background: linear-gradient(180deg, rgba(12,36,24,0.98), rgba(15,23,42,0.98));
    }

    .removed-card {
      border-color: rgba(239,68,68,0.45);
      background: linear-gradient(180deg, rgba(42,18,24,0.98), rgba(20,12,18,0.98));
    }

    .no-notification-card {
      border-color: rgba(245,158,11,0.45);
      background: linear-gradient(180deg, rgba(45,32,12,0.98), rgba(15,23,42,0.98));
    }

    .publisher-topbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 18px;
      margin-bottom: 14px;
    }

    .publisher-title-wrap {
      flex: 1;
      min-width: 0;
    }

    .publisher-title {
      font-size: 18px;
      font-weight: 800;
      cursor: pointer;
      color: #ffffff;
      user-select: none;
      line-height: 1.25;
    }

    .publisher-title.copied {
      color: #60a5fa;
    }

    .count {
      color: var(--muted);
      font-size: 14px;
      margin-left: 6px;
    }

    .copied-msg {
      display: none;
      color: var(--green);
      font-size: 14px;
      margin-left: 10px;
    }

    .header-checks {
      display: flex;
      flex-wrap: nowrap;
      gap: 18px;
      align-items: center;
      justify-content: flex-end;
      flex-shrink: 0;
    }

    .header-check {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      font-weight: 800;
      white-space: nowrap;
      user-select: none;
      cursor: pointer;
      min-height: 34px;
    }

    .header-check input {
      width: 22px;
      height: 22px;
      margin: 0;
      cursor: pointer;
      flex-shrink: 0;
      accent-color: #38bdf8;
    }

    .sent-area {
      color: var(--accent);
    }

    .confirm-area {
      color: var(--green);
    }

    .action-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 14px;
    }

    .whatsapp-btn,
    .copy-group-btn {
      border-radius: 999px;
      padding: 10px 16px;
      font-size: 14px;
      min-height: 42px;
      border: 1px solid var(--line);
      box-shadow: 0 8px 18px rgba(0,0,0,0.18);
    }

    .whatsapp-btn {
      border-color: rgba(34,197,94,0.50);
      background: rgba(34,197,94,0.12);
      color: #86efac;
    }

    .copy-group-btn {
      border-color: rgba(96,165,250,0.45);
      background: rgba(59,130,246,0.12);
      color: #93c5fd;
    }

    .disabled-btn {
      opacity: 0.45;
      cursor: not-allowed;
      background: rgba(255,255,255,0.05);
      color: #94a3b8;
      border-color: var(--line);
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
    }

    .hello {
      font-weight: 800;
      font-size: 16px;
      color: #ffffff;
    }

    .message-spacer {
      height: 10px;
    }

    .line {
      margin-bottom: 6px;
      line-height: 1.45;
      overflow-wrap: anywhere;
      color: #e5e7eb;
    }

    .new-line {
      color: #bbf7d0;
      font-weight: 700;
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
      font-weight: 800;
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

    .group-footer-label {
      color: var(--muted);
      font-weight: 700;
      margin-right: 6px;
    }

    .group-footer-name {
      color: #a7f3d0;
      font-weight: 800;
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
      font-weight: 800;
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
      font-weight: 800;
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
      font-weight: 700;
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

    .copy-lines {
      display: none;
      white-space: pre-wrap;
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
      font-weight: 800;
      white-space: nowrap;
    }

    .fixed-progress-card.confirmed .fixed-progress-number {
      color: var(--green);
    }

    .fixed-progress-card.sended .fixed-progress-number {
      color: var(--accent);
    }

    .fixed-progress-card.completed .fixed-progress-number {
      color: var(--green);
    }

    .fixed-progress-card.pending .fixed-progress-number {
      color: var(--yellow);
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

    .delivery-history-controls label {
      color: #bfdbfe;
      font-size: 13px;
      font-weight: 900;
    }

    .delivery-history-controls select {
      background: var(--bg-soft);
      color: #ffffff;
      border: 1px solid var(--line);
      border-radius: 10px;
      padding: 9px 12px;
      font-size: 13px;
      font-weight: 800;
      min-height: 40px;
      min-width: 280px;
      cursor: pointer;
      outline: none;
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

    .video-preview,
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

    .asset-video-preview {
      width: 100%;
      max-height: 115px;
      object-fit: contain;
      border-radius: 10px;
      background: #020617;
      border: 1px solid rgba(148,163,184,0.18);
      display: block;
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

    .video-preview {
      color: #93c5fd;
      border-color: rgba(96,165,250,0.35);
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

      .top-summary {
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

      .fixed-progress-inner {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
      }

      .message-controls {
        padding: 8px 10px;
        gap: 8px;
        font-size: 12px;
      }

      .control-group {
        width: 100%;
        flex: 1 1 100%;
      }

      .message-controls select {
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

      .publisher-topbar {
        flex-direction: column;
        align-items: flex-start;
        gap: 10px;
      }

      .header-checks {
        justify-content: flex-start;
        flex-direction: row;
        flex-wrap: nowrap;
        gap: 18px;
        width: 100%;
      }

      .header-check {
        font-size: 12px;
      }

      .header-check input {
        width: 20px;
        height: 20px;
      }

      .action-buttons {
        gap: 10px;
      }

      .message-block {
        padding: 10px;
        font-size: 13px;
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

      .toast {
        bottom: 86px;
      }

      .fixed-progress-footer {
        padding: 8px 10px;
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

      .delivery-history-controls select {
        min-width: 0;
        width: 100%;
      }

      .delivery-summary-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
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

      .asset-missing,
      .video-preview {
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

      .action-buttons {
        flex-direction: column;
      }

      .whatsapp-btn,
      .copy-group-btn {
        width: 100%;
      }

      .message-block {
        font-size: 12.5px;
      }

      .hello {
        font-size: 14px;
      }

      .line {
        font-size: 12.5px;
      }
    }
  `;
};

module.exports = {
  buildReportCss
};