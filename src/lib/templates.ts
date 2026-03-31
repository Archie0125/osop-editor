export interface OsopTemplate {
  id: string;
  name: string;
  yaml: string;
}

export const OSOP_TEMPLATES: OsopTemplate[] = [
  {
    id: 'conditional_approval',
    name: '4. Conditional Approval (IF/ELSE)',
    yaml: `osop_version: "1.0"
id: conditional_approval
name: Conditional Approval Workflow
description: Demonstrates how to use IF/ELSE routing in OSOP.
metadata:
  creation_date: "2026-03-31"
  version: "1.0.0"
  change_summary: "Initial creation of conditional approval workflow"

nodes:
  - id: submit_request
    type: human
    purpose: User submits a purchase request.
    role: employee
    explain:
      what: "員工提交採購申請"

  - id: check_amount
    type: system
    subtype: router
    purpose: Check if the purchase amount requires manager approval.
    explain:
      what: "系統判斷金額是否超過門檻"

  - id: auto_approve
    type: system
    purpose: Automatically approve small requests.
    explain:
      what: "自動核准小額採購"

  - id: manager_review
    type: human
    purpose: Manager reviews high-value requests.
    role: manager
    explain:
      what: "主管審核大額採購"

  - id: process_payment
    type: api
    purpose: Process the approved payment.
    explain:
      what: "呼叫 API 進行付款"

edges:
  - from: submit_request
    to: check_amount
    mode: sequential

  - from: check_amount
    to: auto_approve
    mode: conditional
    when: "amount < 1000"

  - from: check_amount
    to: manager_review
    mode: conditional
    when: "amount >= 1000"

  - from: auto_approve
    to: process_payment
    mode: sequential

  - from: manager_review
    to: process_payment
    mode: conditional
    when: "approved == true"
    label: "Approved"
`
  },
  {
    id: 'esg_pipeline',
    name: '1. ESG PDF Pipeline (預設)',
    yaml: `osop_version: "1.0"
id: esg_pipeline
name: ESG PDF Pipeline
metadata:
  creation_date: "2026-03-31"
  version: "1.1.0"
  change_summary: "Added metadata field to ESG pipeline"

nodes:
  - id: upload
    type: human
    purpose: Upload ESG PDF
    explain:
      what: "使用者上傳永續報告書 PDF"

  - id: extract
    type: agent
    role: executor
    purpose: Extract data from PDF
    runtime:
      model: gpt-4o
    explain:
      what: "AI 自動解析內容並抽取 ESG 指標"

  - id: validate
    type: system
    purpose: Validate extracted data format
    explain:
      what: "系統檢查資料 Schema 是否正確"

  - id: save_db
    type: db
    purpose: Store structured data
    explain:
      what: "最後資料進入資料庫並顯示於 Dashboard"

edges:
  - from: upload
    to: extract
  - from: extract
    to: validate
  - from: validate
    to: save_db
`
  },
  {
    id: 'hr_onboarding',
    name: '2. HR Employee Onboarding (新進員工報到)',
    yaml: `osop_version: "1.0"
id: hr_onboarding
name: HR Employee Onboarding
metadata:
  creation_date: "2026-03-31"
  version: "1.0.0"
  change_summary: "Initial version of HR onboarding workflow"

nodes:
  - id: input_details
    type: human
    purpose: Enter new employee details
    explain:
      what: "HR 輸入新員工基本資料與到職日"

  - id: provision_accounts
    type: api
    purpose: Create Google Workspace & Slack accounts
    explain:
      what: "呼叫 API 自動建立企業信箱與通訊軟體帳號"

  - id: draft_welcome_email
    type: agent
    purpose: Draft personalized welcome email
    runtime:
      model: claude-3-5-sonnet
    explain:
      what: "AI 根據員工職位與部門，草擬專屬歡迎信"

  - id: manager_approval
    type: human
    purpose: Review and approve setup
    explain:
      what: "直屬主管確認帳號權限與歡迎信內容"

  - id: send_email
    type: system
    purpose: Send welcome email to personal address
    explain:
      what: "系統正式發送歡迎信"

edges:
  - from: input_details
    to: provision_accounts
  - from: provision_accounts
    to: draft_welcome_email
  - from: draft_welcome_email
    to: manager_approval
  - from: manager_approval
    to: send_email
`
  },
  {
    id: 'cs_ticket_routing',
    name: '3. CS Ticket Routing (客服工單智能分派)',
    yaml: `osop_version: "1.0"
id: cs_ticket_routing
name: Customer Support Ticket Routing

nodes:
  - id: receive_ticket
    type: system
    purpose: Receive incoming support ticket
    explain:
      what: "系統接收來自 Zendesk 或 Email 的新工單"

  - id: analyze_sentiment
    type: agent
    purpose: Analyze urgency and sentiment
    runtime:
      model: gpt-4o-mini
    explain:
      what: "AI 分析客戶情緒、判斷問題類別與緊急程度"

  - id: auto_reply
    type: agent
    purpose: Generate auto-reply for simple queries
    explain:
      what: "若為常見問題，AI 直接生成並發送解答"

  - id: human_escalation
    type: human
    purpose: Handle complex or angry customer tickets
    explain:
      what: "若情緒憤怒或問題複雜，轉交真人客服處理"

  - id: update_crm
    type: db
    purpose: Log interaction to CRM
    explain:
      what: "將處理結果與標籤存入客戶關係管理系統"

edges:
  - from: receive_ticket
    to: analyze_sentiment
  - from: analyze_sentiment
    to: auto_reply
    mode: conditional
  - from: analyze_sentiment
    to: human_escalation
    mode: conditional
  - from: auto_reply
    to: update_crm
  - from: human_escalation
    to: update_crm
`
  },
  {
    id: 'software_cicd',
    name: '4. Software CI/CD Release (軟體發布流程)',
    yaml: `osop_version: "1.0"
id: software_cicd
name: Software Release Pipeline

nodes:
  - id: code_push
    type: git
    purpose: Developer pushes code to main
    explain:
      what: "工程師合併 PR 到 main 分支"

  - id: run_tests
    type: cicd
    purpose: Execute unit and integration tests
    explain:
      what: "GitHub Actions 執行自動化測試"

  - id: ai_code_review
    type: agent
    purpose: Perform security and quality review
    explain:
      what: "AI 掃描程式碼，尋找潛在漏洞或效能問題"

  - id: deploy_staging
    type: docker
    purpose: Deploy to staging environment
    explain:
      what: "打包 Docker Image 並部署至測試區"

  - id: qa_approval
    type: human
    purpose: QA team sign-off
    explain:
      what: "QA 團隊進行手動驗證並核准發布"

  - id: deploy_prod
    type: cicd
    purpose: Deploy to production
    explain:
      what: "正式部署至 Production 環境"

edges:
  - from: code_push
    to: run_tests
  - from: run_tests
    to: ai_code_review
  - from: ai_code_review
    to: deploy_staging
  - from: deploy_staging
    to: qa_approval
  - from: qa_approval
    to: deploy_prod
`
  },
  {
    id: 'content_publishing',
    name: '5. Content Publishing (行銷文章發布)',
    yaml: `osop_version: "1.0"
id: content_publishing
name: SEO Blog Post Publishing

nodes:
  - id: propose_topic
    type: human
    purpose: Propose blog topic and keywords
    explain:
      what: "行銷人員輸入文章主題與 SEO 關鍵字"

  - id: write_draft
    type: agent
    purpose: Generate SEO-optimized draft
    runtime:
      model: claude-3-5-sonnet
    explain:
      what: "AI 根據關鍵字撰寫 1500 字 SEO 文章草稿"

  - id: review_edit
    type: human
    purpose: Editor reviews and refines content
    explain:
      what: "主編審閱、修改語氣並確認內容正確性"

  - id: publish_cms
    type: api
    purpose: Push to WordPress CMS
    explain:
      what: "透過 API 自動發布至 WordPress 網站"

  - id: social_promo
    type: agent
    purpose: Generate social media posts
    explain:
      what: "AI 自動擷取文章重點，生成 Twitter/LinkedIn 宣傳貼文"

edges:
  - from: propose_topic
    to: write_draft
  - from: write_draft
    to: review_edit
  - from: review_edit
    to: publish_cms
  - from: publish_cms
    to: social_promo
`
  },
  {
    id: 'invoice_processing',
    name: '6. Invoice Processing (財務發票報銷)',
    yaml: `osop_version: "1.0"
id: invoice_processing
name: Automated Invoice Processing

nodes:
  - id: receive_invoice
    type: system
    purpose: Receive invoice email attachment
    explain:
      what: "系統自動攔截供應商寄來的 PDF 發票"

  - id: ocr_extract
    type: agent
    purpose: Extract amount, vendor, and date
    explain:
      what: "AI 視覺模型讀取發票，萃取金額與統編"

  - id: fraud_check
    type: system
    purpose: Validate against purchase orders
    explain:
      what: "系統比對 ERP 內的採購單，檢查是否有異常"

  - id: finance_approve
    type: human
    purpose: Final approval for large amounts
    explain:
      what: "若金額超過門檻，需財務主管人工簽核"

  - id: execute_payment
    type: api
    purpose: Schedule bank transfer
    explain:
      what: "透過銀行 API 排程匯款"

edges:
  - from: receive_invoice
    to: ocr_extract
  - from: ocr_extract
    to: fraud_check
  - from: fraud_check
    to: finance_approve
  - from: finance_approve
    to: execute_payment
`
  },
  {
    id: 'incident_response',
    name: '7. Incident Response (伺服器當機應變)',
    yaml: `osop_version: "1.0"
id: incident_response
name: Server Outage Incident Response

nodes:
  - id: alert_trigger
    type: system
    purpose: High CPU/Memory alert received
    explain:
      what: "監控系統發出 PagerDuty 警報"

  - id: investigate_logs
    type: agent
    purpose: Analyze recent server logs
    explain:
      what: "AI Agent 自動撈取 Datadog 日誌並尋找 Error Trace"

  - id: mitigation_proposal
    type: agent
    purpose: Suggest rollback or restart commands
    explain:
      what: "AI 提出修復建議（如重啟服務或退版）"

  - id: apply_fix
    type: human
    purpose: Engineer executes the fix
    explain:
      what: "值班工程師確認建議並執行修復指令"

  - id: post_mortem
    type: agent
    purpose: Draft incident post-mortem report
    explain:
      what: "AI 根據處理過程自動生成事後檢討報告草稿"

edges:
  - from: alert_trigger
    to: investigate_logs
  - from: investigate_logs
    to: mitigation_proposal
  - from: mitigation_proposal
    to: apply_fix
  - from: apply_fix
    to: post_mortem
`
  },
  {
    id: 'lead_qualification',
    name: '8. Lead Qualification (業務潛在客戶過濾)',
    yaml: `osop_version: "1.0"
id: lead_qualification
name: Sales Lead Qualification

nodes:
  - id: new_lead
    type: system
    purpose: New lead submits website form
    explain:
      what: "客戶在官網填寫諮詢表單"

  - id: enrich_data
    type: api
    purpose: Fetch company details via Clearbit
    explain:
      what: "透過 API 擴充客戶的公司規模、產業等資訊"

  - id: score_lead
    type: agent
    purpose: AI scores the lead (1-100)
    explain:
      what: "AI 根據公司背景與需求，給予潛在客戶評分"

  - id: sales_outreach
    type: human
    purpose: Sales rep calls high-scoring leads
    explain:
      what: "業務人員優先聯絡高分客戶"

  - id: nurture_campaign
    type: system
    purpose: Add low-scoring leads to email drip
    explain:
      what: "低分客戶自動加入電子報培育名單"

edges:
  - from: new_lead
    to: enrich_data
  - from: enrich_data
    to: score_lead
  - from: score_lead
    to: sales_outreach
    mode: conditional
  - from: score_lead
    to: nurture_campaign
    mode: conditional
`
  },
  {
    id: 'ecommerce_fulfillment',
    name: '9. E-commerce Fulfillment (電商訂單出貨)',
    yaml: `osop_version: "1.0"
id: ecommerce_fulfillment
name: E-commerce Order Fulfillment

nodes:
  - id: order_placed
    type: system
    purpose: Customer completes checkout
    explain:
      what: "顧客在 Shopify 完成付款"

  - id: inventory_check
    type: db
    purpose: Verify stock levels
    explain:
      what: "系統扣除庫存並確認商品充足"

  - id: pack_order
    type: human
    purpose: Warehouse staff packs items
    explain:
      what: "倉儲人員撿貨並包裝商品"

  - id: ship_label
    type: api
    purpose: Generate logistics shipping label
    explain:
      what: "呼叫物流 API 產生託運單號與標籤"

  - id: notify_customer
    type: system
    purpose: Send tracking link to customer
    explain:
      what: "系統發送出貨通知與追蹤連結給顧客"

edges:
  - from: order_placed
    to: inventory_check
  - from: inventory_check
    to: pack_order
  - from: pack_order
    to: ship_label
  - from: ship_label
    to: notify_customer
`
  },
  {
    id: 'security_patching',
    name: '10. Security Patching (資安漏洞修復)',
    yaml: `osop_version: "1.0"
id: security_patching
name: Security Vulnerability Patching

nodes:
  - id: vuln_scan
    type: system
    purpose: Daily security scan detects CVE
    explain:
      what: "Snyk 掃描發現開源套件有高風險漏洞"

  - id: assess_risk
    type: agent
    purpose: Evaluate impact on current architecture
    explain:
      what: "AI 評估該漏洞對現有系統的實際影響程度"

  - id: generate_patch
    type: agent
    purpose: AI writes code fix or bumps version
    explain:
      what: "AI 自動產生升級套件版本的 Pull Request"

  - id: review_patch
    type: human
    purpose: Security engineer reviews PR
    explain:
      what: "資安工程師審查程式碼變更"

  - id: deploy_patch
    type: cicd
    purpose: Merge and deploy hotfix
    explain:
      what: "合併 PR 並觸發緊急部署流程"

edges:
  - from: vuln_scan
    to: assess_risk
  - from: assess_risk
    to: generate_patch
  - from: generate_patch
    to: review_patch
  - from: review_patch
    to: deploy_patch
`
  },
  {
    id: 'legal_contract',
    name: '11. Legal Contract Review (法務合約審查)',
    yaml: `osop_version: "1.0"
id: legal_contract
name: Legal Contract AI Review

nodes:
  - id: upload_contract
    type: human
    purpose: Upload vendor contract PDF
    explain:
      what: "採購人員上傳供應商合約草案"

  - id: extract_clauses
    type: agent
    purpose: Extract liabilities and terms
    explain:
      what: "AI 擷取合約中的賠償責任、保密條款與付款條件"

  - id: risk_assessment
    type: agent
    purpose: Highlight non-standard clauses
    explain:
      what: "AI 比對公司標準範本，標記出高風險或異常條款"

  - id: lawyer_review
    type: human
    purpose: Legal counsel final review
    explain:
      what: "法務人員針對 AI 標記的風險進行最終審閱與批註"

  - id: sign_docusign
    type: api
    purpose: Send for e-signature
    explain:
      what: "透過 DocuSign API 發送電子簽名請求"

edges:
  - from: upload_contract
    to: extract_clauses
  - from: extract_clauses
    to: risk_assessment
  - from: risk_assessment
    to: lawyer_review
  - from: lawyer_review
    to: sign_docusign
`
  },
  {
    id: 'expense_reimbursement',
    name: '12. Expense Reimbursement (員工費用報銷)',
    yaml: `osop_version: "1.0"
id: expense_reimbursement
name: Employee Expense Reimbursement

nodes:
  - id: submit_receipt
    type: human
    purpose: Upload receipt photo
    explain:
      what: "員工拍照上傳計程車或餐飲收據"

  - id: extract_amount
    type: agent
    purpose: OCR extract amount and date
    explain:
      what: "AI 辨識收據上的總金額、日期與消費項目"

  - id: policy_check
    type: system
    purpose: Check against company limits
    explain:
      what: "系統檢查金額是否超出該職級的報銷上限"

  - id: manager_approve
    type: human
    purpose: Manager approves expense
    explain:
      what: "主管確認消費合理性並點擊核准"

  - id: payout
    type: api
    purpose: Transfer funds to payroll
    explain:
      what: "串接薪資系統，將款項併入下期薪水發放"

edges:
  - from: submit_receipt
    to: extract_amount
  - from: extract_amount
    to: policy_check
  - from: policy_check
    to: manager_approve
  - from: manager_approve
    to: payout
`
  },
  {
    id: 'agent_smart_contract',
    name: '13. Multi-Agent Smart Contract (跨 AI 協作)',
    yaml: `osop_version: "1.0"
id: agent_smart_contract
name: Multi-Agent Smart Contract
version: "1.2.0"

contract:
  guarantees:
    - "All code must pass static analysis"
    - "Human approval required for production"

nodes:
  - id: planner
    type: agent
    role: architect
    purpose: "OpenClaw: Analyze requirements and generate architecture"
    runtime:
      model: openclaw-v1
    outputs:
      - name: arch_doc
        schema: ArchitectureSchema
    explain:
      what: "OpenClaw 擔任架構師，產出系統設計文件"

  - id: coder
    type: agent
    role: developer
    purpose: "Claude: Write code based on architecture"
    runtime:
      model: claude-3-5-sonnet
    inputs:
      - name: arch_doc
        schema: ArchitectureSchema
    explain:
      what: "Claude 擔任工程師，根據架構文件撰寫程式碼"

  - id: reviewer
    type: agent
    role: security_auditor
    purpose: "Codex: Review code for vulnerabilities"
    runtime:
      model: codex-secure
    success_criteria:
      - "0 critical vulnerabilities"
    explain:
      what: "Codex 擔任資安稽核，驗證程式碼並確保無漏洞"

edges:
  - from: planner
    to: coder
  - from: coder
    to: reviewer
`
  },
  {
    id: 'parallel_processing',
    name: '14. Parallel Data Processing (並行處理)',
    yaml: `osop: "1.0.0"
name: "Parallel Data Processing"
description: "Demonstrates parallel execution of multiple tasks."

nodes:
  - id: "start_ingestion"
    type: "api"
    purpose: "Trigger data ingestion process"

  - id: "parallel_split"
    type: "system"
    subtype: "parallel"
    purpose: "Split workflow into parallel branches"

  - id: "process_images"
    type: "agent"
    purpose: "Process and resize images"

  - id: "process_text"
    type: "agent"
    purpose: "Extract and translate text"

  - id: "process_audio"
    type: "agent"
    purpose: "Transcribe audio files"

  - id: "parallel_join"
    type: "system"
    subtype: "parallel"
    purpose: "Wait for all parallel branches to complete"

  - id: "aggregate_results"
    type: "db"
    purpose: "Save aggregated results to database"

edges:
  - from: "start_ingestion"
    to: "parallel_split"
    mode: "sequential"

  - from: "parallel_split"
    to: "process_images"
    mode: "sequential"

  - from: "parallel_split"
    to: "process_text"
    mode: "sequential"

  - from: "parallel_split"
    to: "process_audio"
    mode: "sequential"

  - from: "process_images"
    to: "parallel_join"
    mode: "sequential"

  - from: "process_text"
    to: "parallel_join"
    mode: "sequential"

  - from: "process_audio"
    to: "parallel_join"
    mode: "sequential"

  - from: "parallel_join"
    to: "aggregate_results"
    mode: "sequential"
`
  },
  {
    id: 'retry_loop',
    name: '15. Retry Loop Workflow (重試迴圈)',
    yaml: `osop: "1.0.0"
name: "Retry Loop Workflow"
description: "Demonstrates a loop mechanism for retrying an operation until successful."

nodes:
  - id: "fetch_data"
    type: "api"
    purpose: "Attempt to fetch data from an external API"

  - id: "check_success"
    type: "system"
    subtype: "router"
    purpose: "Check if the API call was successful"

  - id: "process_data"
    type: "agent"
    purpose: "Process the successfully fetched data"

edges:
  - from: "fetch_data"
    to: "check_success"
    mode: "sequential"

  - from: "check_success"
    to: "process_data"
    mode: "conditional"
    when: "status == 'success'"

  - from: "check_success"
    to: "fetch_data"
    mode: "loop"
    when: "status == 'failed' AND retry_count < 3"
    label: "Retry API Call"
`
  },
  {
    id: 'fallback_error_handling',
    name: '16. Fallback Error Handling (錯誤備援)',
    yaml: `osop: "1.0.0"
name: "Fallback Error Handling"
description: "Demonstrates fallback routing when a primary operation fails."

nodes:
  - id: "primary_payment"
    type: "api"
    purpose: "Attempt payment via primary gateway"

  - id: "payment_status"
    type: "system"
    subtype: "router"
    purpose: "Check if primary payment succeeded"

  - id: "fallback_payment"
    type: "api"
    purpose: "Attempt payment via secondary gateway"

  - id: "payment_success"
    type: "db"
    purpose: "Record successful payment"

  - id: "payment_failed"
    type: "human"
    purpose: "Notify user of payment failure"

edges:
  - from: "primary_payment"
    to: "payment_status"
    mode: "sequential"

  - from: "payment_status"
    to: "payment_success"
    mode: "conditional"
    when: "success"

  - from: "payment_status"
    to: "fallback_payment"
    mode: "fallback"
    when: "otherwise"
    label: "Primary Failed"

  - from: "fallback_payment"
    to: "payment_success"
    mode: "conditional"
    when: "success"

  - from: "fallback_payment"
    to: "payment_failed"
    mode: "error"
    when: "otherwise"
    label: "Secondary Failed"
`
  }
];
