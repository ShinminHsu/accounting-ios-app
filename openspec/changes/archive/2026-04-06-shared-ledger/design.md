## Context

目前 app 使用 SQLite local-first 架構（expo-sqlite），交易直接屬於 user，透過 project_id 關聯預算專案。沒有「帳本」容器的概念，也沒有辦法讓多人共同瀏覽一組交易。好友功能（friend-sync）已實作，提供 friendship 關係與 shared_transactions 寫入機制，但僅用於 paid_for_other 時的單向通知。

共享帳本需要一個新的資料層：ledgers 表作為容器，transactions 透過 ledger_id 歸屬，ledger_members 記錄哪些好友在這個帳本中。

## Goals / Non-Goals

**Goals:**
- 每位使用者有一個預設個人帳本，初始化時自動建立
- 可建立多個共享帳本，邀請已有好友關係的使用者加入
- 記帳時可選擇帳本（預設個人帳本），同時也可選預算專案
- 帳本視圖：可切換查看特定帳本的所有交易
- 代付提示：當好友在共享帳本以 paid_for_other 記錄涉及自己的交易，提示本人加入個人帳本

**Non-Goals:**
- 即時同步（帳本成員各自在本地記帳，不做跨裝置 realtime sync）
- 分帳計算（AA 制）
- 帳本權限控制（無管理員角色）
- 帳本間交易移動

## Decisions

### 一個交易只屬於一個帳本

每筆 transaction 有一個 `ledger_id`（NOT NULL，預設為個人帳本 ID）。不做多對多，避免複雜。若要同時追蹤共享帳本與個人帳本，使用現有的 project_id 做個人預算追蹤即可。

替代方案：transaction_ledgers 中間表（多對多）→ 過度設計，UI 也難以呈現。

### 個人帳本在 App 初始化時建立

`initDb()` + `seedDefaultCategories()` 之後新增 `seedPersonalLedger(userId)`：若無個人帳本則建立一個，name = '個人', is_personal = 1。這確保所有舊有交易可向後相容（migration 中 ledger_id 允許 NULL，現有交易 ledger_id 為 NULL 視為個人帳本）。

### 共享帳本邀請基於現有好友關係

只能邀請已是好友（friendship status = 'active'）的使用者加入帳本。使用 `ledger_members` 表記錄帳本成員，status 欄位為 'invited' / 'active'。邀請接受走 supabase realtime 或下次開 app 時拉取（因為此功能依賴網路，共享帳本本身是 cloud-based）。

> **重要架構決策**：個人帳本的交易存在本地 SQLite；共享帳本的交易需要同步到 Supabase，讓其他成員看得到。因此共享帳本的 write path 要同時寫本地 + Supabase。

### 共享帳本資料存在 Supabase，個人帳本存本地

- `ledgers` 表：Supabase（所有帳本，含個人帳本的 metadata）
- `ledger_members` 表：Supabase
- 個人帳本的 transactions：本地 SQLite（現有行為不變）
- 共享帳本的 transactions：本地 SQLite + 同步至 Supabase `shared_ledger_transactions` 表

這樣個人資料仍然 local-first，共享資料走 Supabase。

### 代付提示機制

當使用者進入共享帳本畫面，app 查詢該帳本中 `payer_type = 'paid_for_other'` 且 `contact_id` 對應自己 linked_user_id 的交易，若本地尚未有對應的 `paid_by_other` 交易，則顯示提示卡片讓使用者一鍵加入個人帳本。

## Risks / Trade-offs

- **[風險] 共享帳本需要網路**：個人帳本完全 offline，共享帳本需要 Supabase 連線。UI 需清楚區隔，離線時共享帳本顯示 "需要網路連線"。→ 緩解：先實作基本 CRUD，離線狀態顯示提示，不嘗試 offline queue。
- **[風險] 現有 transactions 沒有 ledger_id**：DB migration 允許 NULL，NULL = 個人帳本，向後相容。查詢個人帳本時條件為 `ledger_id IS NULL OR ledger_id = personal_ledger_id`。
- **[取捨] 共享帳本不做即時同步**：成員需手動 refresh 才能看到最新資料。這簡化了實作，代價是資料可能有延遲。

## Migration Plan

1. `004_ledgers`: 新增 `ledgers`、`ledger_members` 表（SQLite migration）
2. `transactions.ledger_id` 允許 NULL（現有資料相容）
3. App 啟動時執行 `seedPersonalLedger(userId)`：檢查是否有 personal ledger，沒有則建立
4. Supabase：新增 `ledgers`、`ledger_members`、`shared_ledger_transactions` 表（手動建立）
