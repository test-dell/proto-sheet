# DA Sheet Manager - System Documentation

## Overview
The DA Sheet Manager is a comprehensive Decision Analysis and Vendor Evaluation system designed for HMSI (Honda). It provides tools for creating, managing, and evaluating vendor proposals using customizable templates with dynamic judgment parameters.

---

## 📊 Application Screens & Flows

### 1. Dashboard (Main Screen)
**Component:** `/components/Dashboard.tsx`
**Route:** `dashboard`

**Note:** No authentication required - Sign In/Sign Up removed. Direct access to dashboard.

#### Features:
- **Stats Overview:**
  - Total DA Sheets count
  
- **Recent DA Sheets Table:**
  - Sheet name
  - Type (License/Custom Development/SaaS)
  - Status badges (Draft/Submitted/Approved)
  - Created date
  - Actions: Edit, Export PDF, Delete

- **Quick Actions:**
  - Create New DA Sheet
  - View History
  - Manage Templates

#### User Flow:
1. User logs in → Dashboard displays
2. View all existing DA sheets
3. Click "Create New" → Navigate to Template Selection
4. Click "View History" → Navigate to History View
5. Click "Manage Templates" → Navigate to Template Editor
6. Click Edit on any sheet → Navigate to Vendor Evaluation
7. Click Export PDF → Download sheet as PDF
8. Click Delete → Confirm and remove sheet

---

### 2. Template Selection & Customization (Step 1-3)
**Component:** `/components/TemplateSelection.tsx`
**Route:** `da-editor-screen`

#### Features:
- **Step 1: Enter DA Sheet Name**
  - Input field for sheet name
  - Required field validation

- **Step 2: Select DA Template**
  - Grid of published templates
  - Template cards show: name, description
  - Visual selection indicator

- **Step 3: Customize Template**
  - Add/Remove categories
  - Add/Remove judgment parameters
  - Edit parameter names and weightages
  - Weightage validation (must equal 100%)
  - Real-time category weightage display
  - Total weightage badge (destructive if >100%)

#### Weightage Rules:
- Individual parameters: 5%, 10%, 15%, 20%, 25%, 30%
- Total must equal 100% to proceed
- Alert dialog if <100% or >100%
- "Evaluate Vendors" button disabled if total ≠ 100%

#### User Flow:
1. Enter DA Sheet name
2. Select a template from grid
3. Customize categories and parameters
4. Adjust weightages to total 100%
5. Click "Evaluate Vendors" → Navigate to Vendor Evaluation

---

### 3. Vendor Evaluation (DA Editor)
**Component:** `/components/DAEditor.tsx`
**Route:** `vendor-evaluation`

#### Features:

##### Vendor Management Section:
- **Add Vendors:**
  - Name field only (simplified)
  - Add multiple vendors
  - Remove vendors

##### Evaluation Matrix:
- **All Categories Visible:**
  - Scrollable view (600px height)
  - Shows all QCDMS categories
  - Category headers with weightage badges
  
- **Table Structure:**
  - Columns: Parameter Name, W%, Vendor 1 (Comment/Eval/Result), Vendor 2 (Comment/Eval/Result), etc.
  - Comment field per parameter per vendor
  - Evaluation score (0-10)
  - Auto-calculated result (eval × weightage)
  - Sub-total row per category
  - Grand total at bottom

- **Auto-Calculations:**
  - Result = Evaluation Score × Parameter Weightage
  - Category Sub-total = Sum of all results in category
  - Overall Score = Sum of all sub-totals

##### Action Buttons:
- Save as Draft
- Submit for Approval
- Preview DA Sheet (landscape PDF preview)
- Back to Dashboard

#### User Flow:
1. Add vendor names
2. For each vendor, for each parameter:
   - Enter evaluation score (0-10)
   - Add vendor-specific comments
3. Review auto-calculated results
4. Save as Draft or Submit
5. Preview before finalizing
6. Return to Dashboard

---

### 4. DA Sheet Preview (Landscape)
**Component:** `/components/DAPreview.tsx`
**Route:** Triggered from DA Editor

#### Features:
- **Landscape Layout:**
  - Fit to page width (max 297mm)
  - Scalable zoom controls (50%-200%)
  - Professional PDF-ready design

- **Content Sections:**
  - Sheet header with name, type, status
  - Vendor details
  - Full evaluation matrix
  - All categories and parameters
  - Final scores and rankings

- **Actions:**
  - Zoom In/Out
  - Download PDF
  - Close Preview

#### User Flow:
1. Click "Preview" from DA Editor
2. Review landscape layout
3. Adjust zoom if needed
4. Download PDF or close
5. Return to editing

---

### 5. Template Management
**Component:** `/components/TemplateEditor.tsx`
**Route:** `template-editor`

#### Features:
- **Template Library:**
  - List of all templates (Published & Drafts)
  - Template cards with name, type, description
  - Status badges (Published/Draft)

- **Actions per Template (with tooltips):**
  - **Edit** → Navigate to Template Edit Page
  - **Publish/Unpublish** → Toggle template availability
    - Eye icon (👁️) = Publish template (make available)
    - Eye-off icon (👁️‍🗨️) = Unpublish template (make draft)
  - **Delete** → Remove template permanently

- **Create New Template:**
  - Button to create blank template
  - Default QCDMS structure
  - Starts as Draft status

#### User Flow:
1. Click "Manage Templates" from Dashboard
2. View all available templates (Published and Draft)
3. Create new, edit, publish/unpublish, or delete
4. Return to Dashboard

---

### 6. Template Edit Page
**Component:** `/components/TemplateEditPage.tsx`
**Route:** `template-edit-page`

#### Features:
- **Template Metadata:**
  - Name, Type, Description
  
- **Category & Parameter Management:**
  - Add/Edit/Delete categories
  - Add/Edit/Delete judgment parameters
  - Set parameter weightages (5-30%)
  - Add parameter descriptions/criteria

- **Validation:**
  - Total weightage must equal 100%
  - Cannot delete last parameter in category
  - Cannot delete last category

- **Actions:**
  - Save as Draft
  - Publish Template (makes available for DA sheets)
  - Cancel/Back to Template Editor

#### User Flow:
1. Edit template structure
2. Adjust categories and parameters
3. Ensure weightages total 100%
4. Save as Draft or Publish
5. Return to Template Editor

---

### 7. History & Archive View
**Component:** `/components/TemplateHistory.tsx`
**Route:** `history`

#### Features:
- **Comprehensive Sheet Listing:**
  - All DA sheets with full details
  - Search functionality
  - Filter by type, status, date range
  
- **Advanced Filters:**
  - Type: All, License, Custom Development, SaaS
  - Status: All, Draft, Submitted, Approved
  - Date range picker

- **Table Columns:**
  - Sheet name
  - Type
  - Status
  - Created date
  - Created by
  - Version
  - Actions (Edit, Duplicate, Delete)

- **Bulk Actions:**
  - Export selected sheets
  - Delete multiple sheets

#### User Flow:
1. Click "View History" from Dashboard
2. Browse all sheets
3. Apply filters/search
4. Edit, duplicate, or delete sheets
5. Return to Dashboard

---

## 📋 Data Types & Structures

### Template Structure:
```typescript
Template {
  id: string
  name: string
  type: 'License' | 'Custom Development' | 'SaaS'
  description: string
  isDeployed: boolean
  categories: CategoryData[]
  createdAt: Date
  updatedAt: Date
}

CategoryData {
  id: string
  name: string (Quality, Cost, Delivery, Management, Safety - QCDMS)
  parameters: JudgmentParameter[]
}

JudgmentParameter {
  id: string
  name: string
  weightage: 5 | 10 | 15 | 20 | 25 | 30 (%)
  comment: string (criteria description)
}
```

### DA Sheet Structure:
```typescript
DASheet {
  id: string
  name: string
  type: 'License' | 'Custom Development' | 'SaaS'
  status: 'Draft' | 'Submitted' | 'Approved'
  templateId: string
  vendors: Vendor[]
  notes: string
  version: number
  createdAt: Date
  updatedAt: Date
  createdBy: string
  approvedBy?: string
  approvedAt?: Date
}

Vendor {
  id: string
  name: string
  scores: VendorScores
  overallScore: number
  notes: string
}

VendorScores {
  [categoryId]: {
    evaluations: JudgmentEvaluation[]
    subTotal: number
  }
}

JudgmentEvaluation {
  parameterId: string
  evalScore: number (0-10)
  result: number (evalScore × weightage)
  vendorComment: string
}
```

---

## 🎯 Default Templates Available

### 1. License Agreement Template (Published)
- **Type:** License
- **Status:** Published ✅
- **Categories:** Quality (30%), Cost (15%), Delivery (15%), Management (15%), Safety (15%)
- **Use Case:** Software licensing decisions
- **Total Parameters:** 13

### 2. Custom Development Template (Published)
- **Type:** Custom Development
- **Status:** Published ✅
- **Categories:** Quality (35%), Cost (20%), Delivery (15%), Management (15%), Safety (15%)
- **Use Case:** Custom software development vendor evaluation
- **Total Parameters:** 10

### 3. SaaS Solution Template (Published)
- **Type:** SaaS
- **Status:** Published ✅
- **Categories:** Quality (30%), Cost (20%), Delivery (20%), Management (15%), Safety (15%)
- **Use Case:** SaaS product evaluation
- **Total Parameters:** 10

### 4. Hardware Procurement Template (Draft)
- **Type:** License
- **Status:** Draft (Unpublished) 📝
- **Categories:** Quality (30%), Cost (30%), Delivery (20%), Management (15%), Safety (5%)
- **Use Case:** Hardware and equipment vendor evaluation
- **Total Parameters:** 9
- **Note:** This template is in draft mode and not available for creating new DA sheets until published

---

## 🔄 Complete User Journey

### Journey 1: Creating a New DA Sheet
1. **Login** → Auth screen with credentials
2. **Dashboard** → View existing sheets
3. **Create New** → Click "Create New DA Sheet"
4. **Template Selection** → 
   - Enter sheet name
   - Select template
   - Customize parameters (optional)
   - Validate weightages = 100%
5. **Vendor Evaluation** →
   - Add vendors
   - Score each parameter
   - Add comments
   - Review auto-calculated results
6. **Preview** → Review landscape PDF
7. **Save/Submit** → Save as draft or submit
8. **Dashboard** → Return to main view

### Journey 2: Managing Templates
1. **Dashboard** → Click "Manage Templates"
2. **Template Editor** → View all templates
3. **Create/Edit** → 
   - Click "Create New" or Edit existing
   - Navigate to Template Edit Page
4. **Edit Structure** →
   - Modify categories
   - Adjust parameters
   - Set weightages
5. **Publish** → Make available for DA sheets
6. **Template Editor** → Return to list
7. **Dashboard** → Back to main screen

### Journey 3: Reviewing History
1. **Dashboard** → Click "View History"
2. **History View** → See all sheets
3. **Filter/Search** → Find specific sheets
4. **Actions** → Edit, Duplicate, or Delete
5. **Dashboard** → Return to main view

---

## 🎨 UI/UX Highlights

### Design System:
- **Colors:** 
  - Primary: Indigo (#4F46E5)
  - Secondary: Purple, Pink gradients
  - Status: Green (Approved), Yellow (Submitted), Gray (Draft)
  
- **Components:**
  - Shadcn UI component library
  - Tailwind CSS for styling
  - Lucide icons
  - Toast notifications (Sonner)

### Responsive Design:
- Desktop-first approach
- Landscape orientation for PDF exports
- Scrollable tables for large datasets
- Modal dialogs for confirmations

### Accessibility:
- Keyboard navigation
- Screen reader support
- High contrast badges
- Clear action buttons

---

## 🔒 Role & Access

### Current Implementation:
- **Role-Agnostic:** All users can manage templates and create DA sheets
- **Future SSO Integration:** Portal authentication ready
- **No PII Collection:** System avoids collecting sensitive personal data

---

## 📄 Key Files Structure

```
/App.tsx                          - Main application router
/components/
  ├── Auth.tsx                    - Sign In/Sign Up screen
  ├── Dashboard.tsx               - Main dashboard
  ├── TemplateSelection.tsx       - Template selection + customization
  ├── DAEditor.tsx                - Vendor evaluation editor
  ├── DAPreview.tsx               - Landscape PDF preview
  ├── TemplateEditor.tsx          - Template management
  ├── TemplateEditPage.tsx        - Individual template editor
  ├── TemplateHistory.tsx         - History & archive view
  └── ui/                         - Reusable UI components
/types/da-types.ts                - TypeScript interfaces
/data/mock-data.ts                - Sample templates & sheets
/styles/globals.css               - Global styles
```

---

## ✅ Current Active Screens Summary

| # | Screen Name | Route | Component | Purpose |
|---|-------------|-------|-----------|---------|
| 1 | **Dashboard** | dashboard | Dashboard.tsx | Main hub, recent sheets |
| 2 | **Template Selection** | da-editor-screen | TemplateSelection.tsx | Create new DA sheet (Steps 1-3) |
| 3 | **Vendor Evaluation** | vendor-evaluation | DAEditor.tsx | Score vendors, evaluate parameters |
| 4 | **DA Preview** | - | DAPreview.tsx | Landscape PDF preview |
| 5 | **Template Editor** | template-editor | TemplateEditor.tsx | Manage templates library |
| 6 | **Template Edit Page** | template-edit-page | TemplateEditPage.tsx | Edit individual template |
| 7 | **History** | history | TemplateHistory.tsx | View all DA sheets archive |

**Total Active Screens: 7** (Auth removed - direct access)

---

## 🚀 Current Features Implemented

✅ Dashboard with DA sheet overview  
✅ Template selection with customization  
✅ Dynamic category & parameter management  
✅ Weightage validation (must equal 100%)  
✅ Alert popups for validation errors  
✅ Vendor evaluation matrix (all categories visible)  
✅ Individual vendor comments per parameter  
✅ Auto-calculated results  
✅ Landscape PDF preview (fit to page)  
✅ Template management (CRUD)  
✅ Template publishing/unpublishing workflow  
✅ Publish/Unpublish templates with Eye/Eye-off icons  
✅ Tooltips for template actions (Edit, Publish/Unpublish, Delete)  
✅ History view with filters  
✅ Search & filter capabilities  
✅ Duplicate & delete operations  
✅ Status management (Draft/Submitted/Approved)  
✅ 4 Default templates (3 Published + 1 Draft)  

---

## 📝 Notes

- **Mock Data:** System uses mock authentication and data storage
- **Production Ready:** Structure prepared for API integration
- **SSO Integration:** Ready for portal-based authentication
- **PDF Export:** Currently mocked, ready for real implementation
- **Validation:** Comprehensive weightage and field validation
- **User Experience:** Toast notifications for all actions

---

**Last Updated:** February 2, 2026  
**Version:** 2.0  
**Status:** Production Ready