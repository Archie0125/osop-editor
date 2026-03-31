# OSOP (Process Operating System) Editor

## 📖 關於 OSOP (About OSOP)
OSOP (Process Operating System v1.0) 是一個專為定義、編輯與視覺化「人機協作流程 (Human-AI Workflow)」所設計的系統。透過簡單易懂的 YAML 語法，使用者可以定義包含人類 (Human)、AI 代理 (Agent)、系統 (System)、API 等不同節點的自動化工作流，並透過多種視覺化視圖來檢視與管理這些流程。

## ✨ 核心功能 (Core Features)
- **即時 YAML 編輯器**: 支援即時語法解析與錯誤提示。
- **多維度視覺化視圖 (Multi-View Output)**:
  - 📊 **Graph View (圖表視圖)**: 以節點與連線呈現工作流的拓撲結構。
  - 📖 **Story View (故事視圖)**: 將生硬的流程轉換為易讀的敘事文本，說明每個步驟的 `what` 與 `why`。
  - 👥 **Role View (角色視圖)**: 依據參與者角色（如人類、AI、系統）進行分類與檢視。
  - 🤖 **Agent View (AI 代理視圖)**: 專注於 AI Agent 的任務分配、使用的模型 (如 GPT-4o, Claude 3.5 Sonnet) 等詳細資訊。
  - 💻 **MCP / CLI Code (指令碼視圖)**: 將流程轉換為 Model Context Protocol (MCP) 或 CLI 執行腳本。
- **豐富的內建模板 (Built-in Templates)**: 內建超過 10 種常見的企業自動化場景，隨開即用。

## 📋 內建應用場景模板 (Use Case Templates)
1. **ESG PDF Pipeline**: 自動解析永續報告書並抽取 ESG 指標。
2. **HR Employee Onboarding**: 新進員工報到與帳號自動開通。
3. **CS Ticket Routing**: 客服工單智能情緒分析與分派。
4. **Software CI/CD Release**: 軟體發布與 AI 程式碼審查流程。
5. **Content Publishing**: SEO 行銷文章自動生成與發布。
6. **Invoice Processing**: 財務發票 OCR 辨識與自動報銷。
7. **Incident Response**: 伺服器當機警報與 AI 智能除錯。
8. **Lead Qualification**: 業務潛在客戶自動評分與過濾。
9. **E-commerce Fulfillment**: 電商訂單庫存確認與自動出貨。
10. **Security Patching**: 資安漏洞掃描與自動修復 (Hotfix)。
11. **Legal Contract Review**: 法務合約 AI 審查與風險標記。
12. **Expense Reimbursement**: 員工費用單據辨識與審核。
13. **Multi-Agent Smart Contract**: 跨 AI 協作 (OpenClaw, Claude, Codex) 的智能合約開發。

## 🛠️ 技術棧 (Tech Stack)
- **前端框架**: React 19 + Vite
- **樣式**: Tailwind CSS v4 + Lucide React (Icons)
- **視覺化**: React Flow (`@xyflow/react`)
- **動畫**: Framer Motion (`motion`)
- **解析器**: `js-yaml`

## 🚀 快速開始 (Quick Start)
1. **安裝依賴套件**：
   ```bash
   npm install
   ```
2. **啟動開發伺服器**：
   ```bash
   npm run dev
   ```
3. **開啟應用程式**：在瀏覽器中前往 `http://localhost:3000` 即可開始使用 OSOP Editor。

## 🎮 操作指南 (How to Use)

OSOP Editor 的介面分為 **左側編輯區** 與 **右側視覺化預覽區**，提供直覺的即時操作體驗：

### 1. 選擇模板 (Select Template)
在左側面板的左上角下拉選單中，我們內建了 13 種常見的企業自動化場景（如 HR 報到、客服分派、資安修復等）。選擇任一模板，編輯器會自動載入對應的 OSOP YAML 程式碼。

### 2. 即時編輯 YAML (Real-time Editing)
- **即時解析**：在左側的文字編輯器中修改 YAML，系統會即時解析您的變更並同步更新右側視圖。
- **錯誤提示 (Error Handling)**：若 YAML 格式錯誤或縮排不正確，編輯器底部會立即彈出紅色的錯誤提示，幫助您快速除錯並確保流程結構正確。

### 3. 多維度視圖切換 (Switch Views)
在右側面板的上方導覽列，您可以點擊不同的頁籤來切換檢視模式：
- 📊 **Graph View**：可拖曳、縮放的節點圖，適合檢視整體流程架構與分支邏輯。
- 📖 **Story View**：將流程轉化為白話文故事，適合向非技術人員（如業務、PM）展示流程目的。
- 👥 **Role View**：以「角色（人類、AI、系統）」為維度，清晰列出每個參與者的負責事項。
- 🤖 **Agent View**：專為 AI 開發者設計，聚焦於 Agent 節點，顯示其使用的 LLM 模型（如 gpt-4o）與系統提示。
- 💻 **MCP / CLI Code**：將流程轉換為開發者可直接執行的指令碼或 MCP 配置。

### 4. 執行流程 (Run Workflow)
確認流程設計無誤後，點擊左側面板右上角的 **「Run」** 按鈕，即可將定義好的 OSOP 流程派發至底層引擎執行（目前為概念展示）。

## 📝 OSOP YAML 結構範例 (YAML Structure Example)
```yaml
osop_version: "1.0"
id: sample_workflow
name: Sample Workflow

nodes:
  - id: step_1
    type: human
    purpose: User input
    explain:
      what: "使用者輸入資料"
      
  - id: step_2
    type: agent
    role: executor
    purpose: Process data
    runtime:
      model: gpt-4o
    explain:
      what: "AI 處理資料"

edges:
  - from: step_1
    to: step_2
```
