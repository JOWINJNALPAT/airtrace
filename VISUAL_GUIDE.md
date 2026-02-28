# 🎨 AirTrace System - Visual Guide

## 📊 System Architecture

```
┌─────────────────────────────────────────────────────┐
│                    AIRTRACE v2.0                    │
│           Professional Luggage Management           │
└─────────────────────────────────────────────────────┘

┌──────────────────────┬──────────────────────┐
│    FRONTEND LAYER    │    BACKEND LAYER     │
├──────────────────────┼──────────────────────┤
│                      │                      │
│  HTML/CSS/JavaScript │  Node.js/Express     │
│                      │                      │
│  - index.html        │  - 12 API endpoints  │
│  - search.html       │  - MySQL queries     │
│  - add-luggage.html  │  - Data validation   │
│  - staff-login.html  │  - Error handling    │
│                      │                      │
│  script.js (366 L)   │  server.js (559 L)   │
│                      │                      │
└──────────────────────┴──────────────────────┘
         ↓                      ↓
    ┌────────────────────────────────┐
    │      DATABASE LAYER            │
    ├────────────────────────────────┤
    │       MySQL Database           │
    │    7 Tables + Relationships    │
    │    8 Performance Indexes       │
    │    6 Foreign Key Constraints   │
    └────────────────────────────────┘
```

---

## 🗄️ Database Relationships

```
                    ┌──────────────┐
                    │   PASSENGER  │
                    │  (first_name)│
                    └──────┬───────┘
                           │ files
                           ↓
                    ┌──────────────┐
                    │    CLAIM     │
                    │ (claim_date) │
                    └──────┬───────┘
                           │ for
                           ↓
                    ┌──────────────┐
                    │    ITEM      │
                    │ (item_name)  │
                    └──┬───────┬───┘
                  ↙    │       │    ↘
         ┌────────┐   │       │   ┌──────────┐
         │ FLIGHT │   │       │   │LOCATION  │
         └────────┘   │       │   └──────────┘
                      │       │
                      ↓       ↓
                   ┌──────────────┐
                   │  CATEGORY    │
                   └──────────────┘

    ┌──────────────┐
    │    STAFF     │
    │  (registers) │
    └──────┬───────┘
           │ registers
           ↓
        ITEM (in ITEM table)
```

---

## 🔄 Data Flow Diagram

```
PASSENGER SEARCH PATH:
┌──────────────────┐
│  Open search.html│
└────────┬─────────┘
         │
         ↓
┌──────────────────────┐
│ Enter Flight # BA123 │
└────────┬─────────────┘
         │
         ↓
┌──────────────────────────────┐
│ Click "Search Items"         │
└────────┬─────────────────────┘
         │
         ↓
┌───────────────────────────────────┐
│ Frontend: searchItems() function   │
└────────┬────────────────────────┘
         │ fetch API
         ↓
┌───────────────────────────────────┐
│ Backend: /api/search-items        │
│ (Query with flight_number)        │
└────────┬────────────────────────┘
         │ JOIN 5 tables
         ↓
┌───────────────────────────────────┐
│ Database: Complex query with joins│
│ ITEM + FLIGHT + CATEGORY + ...    │
└────────┬────────────────────────┘
         │ return results
         ↓
┌───────────────────────────────────┐
│ Frontend: displayItems() function  │
└────────┬────────────────────────┘
         │
         ↓
┌──────────────────────┐
│ Show items in browser│
└──────────────────────┘
```

---

## 📱 Frontend Pages Map

```
                    ┌─ index.html ──────────────┐
                    │ (Home Page)                │
                    │ - Welcome message         │
                    │ - Navigation links        │
                    │ - Feature overview        │
                    └─────────┬──────────────────┘
                              │
                    ┌─────────┴──────────┐
                    │                    │
         ┌──────────▼──────────┐   ┌─────▼──────────────┐
         │ search.html         │   │ staff-login.html   │
         │ (Search Items)      │   │ (Staff Login)      │
         │ - Flight # search   │   │ - Username field   │
         │ - Claim # search    │   │ - Password field   │
         │ - Results display   │   │ - Login button     │
         └─────────┬──────────┘   └─────┬──────────────┘
                   │                     │
                   │              (Redirects after login)
                   │                     │
         ┌─────────▼──────────────────────▼──────┐
         │      add-luggage.html                  │
         │      (Staff Dashboard)                 │
         ├──────────────────────────────────────┤
         │                                        │
         │  SECTION 1: Add Item                  │
         │  - Flight dropdown                    │
         │  - Category dropdown                  │
         │  - Location dropdown                  │
         │  - Item details                       │
         │                                        │
         │  SECTION 2: Create Claim              │
         │  - Passenger ID                       │
         │  - Item ID                            │
         │  - Proof of ownership                 │
         │                                        │
         │  SECTION 3: Update Status             │
         │  - Item ID                            │
         │  - New status selector                │
         │                                        │
         └────────────────────────────────────────┘
```

---

## 🔌 API Endpoints Map

```
API_URL = http://localhost:3000/api

SEARCH ENDPOINTS:
├─ GET /search-items?flight_number=BA123
├─ GET /search-items?claim_id=5
└─ GET /search-items?passenger_id=1

ITEM ENDPOINTS:
├─ POST /add-item
├─ PUT /update-item/:item_id
└─ GET /item/:item_id (implied)

CLAIM ENDPOINTS:
├─ POST /create-claim
├─ PUT /claim/:claim_id
└─ GET /claim/:claim_id

REFERENCE ENDPOINTS:
├─ GET /categories
├─ GET /flights
└─ GET /locations

AUTHENTICATION:
├─ POST /staff-login
└─ POST /register-passenger
```

---

## 📊 Database Table Structure

```
PASSENGER TABLE              STAFF TABLE
┌─────────────────────┐    ┌─────────────────────┐
│ passenger_id (PK)   │    │ staff_id (PK)       │
│ first_name          │    │ username (UNIQUE)   │
│ last_name           │    │ password            │
│ phone_number        │    │ role (Admin/Desk)   │
│ email (UNIQUE)      │    │ employee_id         │
│ passport_number     │    └─────────────────────┘
│ address             │
└─────────────────────┘

FLIGHT TABLE                 LOCATION TABLE
┌─────────────────────┐    ┌─────────────────────┐
│ flight_number (PK)  │    │ location_id (PK)    │
│ airline_name        │    │ terminal_code       │
│ origin_airport      │    │ zone_type           │
│ arrival_time        │    │ specific_spot       │
└─────────────────────┘    └─────────────────────┘

CATEGORY TABLE               ITEM TABLE
┌─────────────────────┐    ┌─────────────────────┐
│ category_id (PK)    │    │ item_id (PK)        │
│ category_name       │    │ location_id (FK)    │
│ storage_requirements│    │ flight_number (FK)  │
└─────────────────────┘    │ category_id (FK)    │
                            │ registered_by_staff │
                            │ item_name           │
                            │ description         │
CLAIM TABLE                 │ serial_number       │
┌──────────────────────┐   │ status              │
│ claim_id (PK)        │   │ date_found          │
│ passenger_id (FK)    │   └─────────────────────┘
│ item_id (FK)         │
│ claim_date           │
│ status               │
│ proof_of_ownership   │
│ resolution_date      │
└──────────────────────┘
```

---

## 🎯 User Journeys

### Journey 1: Passenger Finding Item
```
Passenger
   ↓ Opens search.html
   ↓ Enters flight number
   ↓ Clicks "Search Items"
   ↓ Sees item details
   ↓ Contacts staff
   ↓ Files claim with staff
   ↓ Item returned ✓
```

### Journey 2: Staff Adding Item
```
Staff (admin1)
   ↓ Logs in
   ↓ Selects flight
   ↓ Selects category
   ↓ Enters item details
   ↓ Selects location
   ↓ Clicks "Add Item"
   ↓ Item saved to database ✓
```

### Journey 3: Staff Filing Claim
```
Staff (desk1)
   ↓ Already logged in
   ↓ Gets passenger info
   ↓ Scrolls to "Create Claim"
   ↓ Enters passenger ID
   ↓ Enters item ID
   ↓ Adds proof docs
   ↓ Clicks "Create Claim"
   ↓ Claim filed ✓
   ↓ Follow up: Updates status
```

---

## 🔐 Security Model

```
AUTHENTICATION:
┌─────────────────────────────────────┐
│  Staff Member (username/password)   │
│           ↓ verify                  │
│   Database STAFF table check        │
│           ↓ success                 │
│   Return staff info to frontend     │
│           ↓ store                   │
│   localStorage on client            │
└─────────────────────────────────────┘

AUTHORIZATION:
┌─────────────────────────────────────┐
│  Staff member has role              │
│  - Admin: Full access               │
│  - Desk: Limited access             │
│  (Can be enforced on backend)       │
└─────────────────────────────────────┘

DATA INTEGRITY:
┌─────────────────────────────────────┐
│  Foreign keys prevent orphaned data │
│  Unique constraints prevent dupes   │
│  Indexes ensure performance         │
│  Transactions ensure consistency    │
└─────────────────────────────────────┘
```

---

## 📈 System Metrics

```
CAPACITY:
┌─────────────────────┐
│ Unlimited passengers│
│ Unlimited items     │
│ Unlimited claims    │
│ Performance depends │
│ on MySQL setup      │
└─────────────────────┘

PERFORMANCE:
┌─────────────────────┐
│ 8 indexes for speed │
│ Optimized queries   │
│ Connection pooling  │
│ < 1s response time  │
│ (typical)           │
└─────────────────────┘

SCALABILITY:
┌─────────────────────┐
│ Normalized schema   │
│ No data duplication │
│ Proper relationships│
│ Ready for growth    │
│ Easy to extend      │
└─────────────────────┘
```

---

## 🚀 Deployment Architecture

```
DEVELOPMENT:
┌────────────────────────────────────┐
│   Your Computer / VS Code          │
├────────────────────────────────────┤
│   Backend: localhost:3000          │
│   Frontend: file:// or localhost   │
│   Database: localhost MySQL        │
└────────────────────────────────────┘

PRODUCTION (Recommended):
┌────────────────────────────────────┐
│    Web Server / Cloud Platform     │
├────────────────────────────────────┤
│   Frontend: CDN / Static hosting   │
│   Backend: Node.js server          │
│   Database: Managed MySQL service  │
│   HTTPS: SSL certificate           │
└────────────────────────────────────┘
```

---

## 📊 File Organization

```
AirTrace/
│
├─ DOCUMENTATION (6 files)
│  ├─ START_HERE.md ................ Read first!
│  ├─ INDEX.md ..................... Document map
│  ├─ QUICK_START.md ............... Setup guide
│  ├─ README.md .................... Full reference
│  ├─ UPDATE_SUMMARY.md ............ What changed
│  └─ CHANGELOG.md ................. Version history
│
├─ backend/ (Production code)
│  ├─ server.js .................... API endpoints
│  ├─ database-schema.sql .......... Database setup
│  ├─ package.json ................. Dependencies
│  └─ node_modules/ ................ Installed packages
│
├─ frontend/ (UI code)
│  ├─ index.html ................... Home page
│  ├─ search.html .................. Search page
│  ├─ add-luggage.html ............. Staff dashboard
│  ├─ staff-login.html ............. Login page
│  ├─ script.js .................... JavaScript logic
│  └─ style.css .................... Styling
│
└─ .vscode/ (Editor config)
   └─ settings.json
```

---

## 🎓 Quick Reference

### To Start the System:
```
1. mysql < backend/database-schema.sql
2. cd backend && npm start
3. Open frontend/index.html
4. Login: admin1 / password123
```

### To Search Items:
```
1. Click "Find Items" on home page
2. Enter flight # (BA123) OR claim # (5)
3. Click "Search Items"
4. See results with full details
```

### To Add Item:
```
1. Login as staff
2. Select flight from dropdown
3. Select category from dropdown
4. Enter item details
5. Select location from dropdown
6. Click "Add Item"
```

### To File Claim:
```
1. Login as staff
2. Scroll to "Create Claim"
3. Enter passenger ID
4. Enter item ID
5. Add proof of ownership
6. Click "Create Claim"
```

---

## ✨ Key Features at a Glance

```
✅ Complete item tracking system
✅ Multi-table relational database
✅ Staff role management
✅ Passenger records
✅ Claim filing system
✅ Location tracking
✅ Category management
✅ Flight integration
✅ Comprehensive APIs
✅ Full documentation
✅ Sample data included
✅ Performance indexes
✅ Data integrity constraints
✅ Error handling
✅ Mobile-friendly UI
```

---

## 🎯 Next Steps

1. **Read:** [START_HERE.md](START_HERE.md)
2. **Setup:** Follow [QUICK_START.md](QUICK_START.md)
3. **Learn:** Review [README.md](README.md)
4. **Explore:** Try the system

---

**Version:** 2.0
**Status:** ✅ Complete
**Date:** February 1, 2026
