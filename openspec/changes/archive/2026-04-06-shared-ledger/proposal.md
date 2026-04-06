## Why

用戶需要一個「帳本」概念來組織交易：個人的日常消費歸屬自己的預設帳本，旅遊或事件性消費可建立共享帳本邀請朋友加入。現有系統缺乏帳本容器，交易無法依情境分組或共享給特定朋友群組。

## What Changes

- 每位使用者自動擁有一個**預設個人帳本**（app 初始化時建立）
- 新增**共享帳本**功能：可建立帳本、設定名稱/期間、邀請朋友加入
- 新增記帳時可選擇目標帳本（預設為個人帳本）
- 交易可同時關聯**共享帳本**與**個人預算專案**（兩者獨立，可同時選）
- 當共享帳本中有成員以「別人幫我付」記錄一筆涉及你的支出時，app 提示你是否要將該筆加入個人帳本與預算追蹤
- 新增「帳本」頁面可切換瀏覽不同帳本的交易列表
- 共享帳本顯示所有成員的支出明細（依成員分組）

## Non-Goals

- 即時同步/多人同時編輯（帳本成員各自記帳，不做 conflict resolution）
- 帳本內的分帳/拆帳計算（AA 制、比例分攤）——屬於獨立功能
- 帳本的權限管理（所有成員平等，無管理員角色）
- 帳本間的交易移動

## Capabilities

### New Capabilities

- `ledger-core`: 帳本資料模型：ledgers 表、ledger_members 表、預設個人帳本初始化、CRUD 操作
- `ledger-transaction-link`: 交易與帳本的關聯：transactions 表新增 ledger_id 欄位、記帳時選擇帳本、預設歸屬個人帳本
- `ledger-sharing`: 共享帳本邀請流程：邀請好友加入帳本（基於現有 friend-sync）、成員列表管理
- `ledger-ui`: 帳本瀏覽 UI：帳本列表頁、帳本內交易明細、成員支出摘要、提示將他人代付記錄加入個人帳本

### Modified Capabilities

- `transaction-core`: transactions 表新增可選的 ledger_id 外鍵欄位；createTransaction 接受 ledgerID 參數

## Impact

- Affected specs: `ledger-core`（新）、`ledger-transaction-link`（新）、`ledger-sharing`（新）、`ledger-ui`（新）、`transaction-core`（修改）
- Affected code:
  - `src/lib/db.ts` — 新增 ledgers、ledger_members 表 migration
  - `src/lib/transactions.ts` — createTransaction 加 ledgerId 參數
  - `src/lib/ledgers.ts` — 新建
  - `src/screens/transactions/AddTransactionSheet.tsx` — 加帳本選擇器
  - `src/navigation/MainTabNavigator.tsx` — 可能新增帳本入口
  - `src/screens/ledgers/` — 新建帳本相關畫面
  - `src/types/database.ts` — 新增 Ledger、LedgerMember 類型
