# 🎯 AirTrace System Update Summary

## What's Been Updated

Your AirTrace system has been completely updated to match the database schema shown in your ER diagram. Here's what changed:

---

## ✅ Backend Updates (`backend/server.js`)

### New Database Tables Schema
The system now uses these 7 interconnected tables:
- **PASSENGER** - Stores passenger information
- **STAFF** - Airport staff members
- **FLIGHT** - Flight information
- **LOCATION** - Where items are found
- **CATEGORY** - Item categorization
- **ITEM** - Main luggage/items table (replacing "luggage" table)
- **CLAIM** - Links passengers to items they claim

### New/Updated API Endpoints

1. **`GET /api/search-items`** ✨
   - Search by flight_number, claim_id, or passenger_id
   - Returns items with full details including flight, category, location, airline info

2. **`POST /api/add-item`** ✨
   - Register found items with flight, category, location, serial number
   - Replaces old `/api/add-luggage`

3. **`POST /api/create-claim`** ✨ NEW
   - File claims for passengers to claim found items
   - Links passenger_id to item_id
   - Tracks proof of ownership

4. **`PUT /api/update-item/:item_id`** ✨ UPDATED
   - Update item status and location
   - Replaces old luggage status update

5. **`POST /api/register-passenger`** ✨ NEW
   - Create new passenger records
   - Stores passport, phone, email, address

6. **`POST /api/staff-login`** ✨ UPDATED
   - Now uses STAFF table with proper role fields
   - Returns staff_id, username, role, employee_id

7. **`GET /api/categories`** ✨ NEW
   - Get all item categories for dropdown menus

8. **`GET /api/flights`** ✨ NEW
   - Get all flights for dropdown menus

9. **`GET /api/locations`** ✨ NEW
   - Get all locations for dropdown menus

10. **`GET /api/claim/:claim_id`** ✨ NEW
    - Get detailed claim information with passenger and item details

11. **`PUT /api/claim/:claim_id`** ✨ NEW
    - Update claim status (Pending → Verified → Resolved)

---

## ✅ Frontend Updates

### `search.html` - Item Search
**Old:** Searched by ticket number for luggage
**New:** 
- Search by flight number OR claim ID
- Results show items with full details (category, airline, location, status)
- Better structured results display

### `add-luggage.html` - Staff Dashboard
**Old:** Simple form with color, size, ticket number
**New:** Three comprehensive sections:
1. **Add Item** - Register found items
   - Flight number (dropdown)
   - Item category (dropdown)
   - Item name, serial number, description
   - Location found (dropdown)
   - Status selection

2. **Create Claim** - File claims for passengers
   - Passenger ID
   - Item ID
   - Proof of ownership

3. **Update Item Status** - Modify existing items
   - Item ID
   - New status selection

### `staff-login.html` - No changes
- Still the same authentication page
- Now uses updated STAFF table

### `script.js` - JavaScript Functions
**New Functions:**
- `searchItems()` - Search by flight or claim ID
- `displayItems()` - Display items in cards
- `addItem()` - Register items
- `createClaim()` - File claims
- `updateItemStatus()` - Change status
- `loadCategories()` - Populate category dropdown
- `loadFlights()` - Populate flight dropdown
- `loadLocations()` - Populate location dropdown

**Updated Functions:**
- Form clearing now handles all new form fields
- Error/success message handling for new operations

---

## ✅ Database Schema (`database-schema.sql`)

### New File Created
Contains complete SQL schema with:
- All 7 tables with proper relationships
- Foreign key constraints
- Indexes for performance
- Sample data:
  - 5 Categories (Suitcase, Backpack, Electronics, Documents, Sports Equipment)
  - 4 Sample flights (BA, AA, LH, SQ)
  - 5 Sample locations (across T1 and T2 terminals)
  - 3 Sample staff members (1 Admin, 2 Desk)
  - 3 Sample passengers
  - 3 Sample items
  - 3 Sample claims

### How to Set Up:
```bash
mysql -u root -p airtrace < backend/database-schema.sql
```

---

## 🔄 Data Relationships

```
PASSENGER ──→ CLAIM ←── ITEM ←── FLIGHT
                           ↓
                        LOCATION
                           ↓
                        CATEGORY
                           ↑
                          STAFF
```

- Passengers file **CLAIMS** for **ITEMS**
- Items are found on **FLIGHTS** at **LOCATIONS**
- Items are categorized with **CATEGORIES**
- Staff **registers** items using **STAFF** accounts

---

## 🧪 Testing the New System

### Sample Data Available:

**Flights:**
- BA123 (British Airways from London)
- AA456 (American Airlines from New York)
- LH789 (Lufthansa from Frankfurt)
- SQ012 (Singapore Airlines from Singapore)

**Categories:**
- Suitcase (1)
- Backpack (2)
- Electronics (3)
- Documents (4)
- Sports Equipment (5)

**Staff Login:**
- Username: `admin1` Password: `password123`
- Username: `desk1` Password: `desk123`
- Username: `desk2` Password: `desk123`

**Sample Items:**
- Black Suitcase on flight BA123
- Blue Backpack on flight AA456
- Canon Camera on flight LH789

---

## 🚀 Running the System

### 1. Set Up Database
```bash
mysql -u root -p airtrace < backend/database-schema.sql
```

### 2. Start Backend
```bash
cd backend
npm install  # if first time
npm start
```

Server will run on: http://localhost:3000

### 3. Use Frontend
Open in browser:
- **Home:** `frontend/index.html`
- **Search:** `frontend/search.html`
- **Staff Portal:** `frontend/staff-login.html` → `frontend/add-luggage.html`

---

## 🎨 Key Improvements

✨ **Better Data Organization**
- Items are now in a dedicated ITEM table
- Proper categorization system
- Flight and location tracking

✨ **Enhanced Functionality**
- Claim filing system for passenger ownership
- Staff role management
- Location tracking for found items

✨ **Improved UI/UX**
- Dropdown menus instead of free text (prevents errors)
- Better search options
- Dedicated staff dashboard sections

✨ **Scalability**
- Relational database design
- Proper indexing for performance
- Foreign key constraints for data integrity

---

## 📋 File Changes Summary

| File | Status | Change |
|------|--------|--------|
| `backend/server.js` | ✅ Updated | Completely rewritten with new APIs |
| `backend/database-schema.sql` | ✅ Created | New file with complete schema |
| `frontend/script.js` | ✅ Updated | All new functions for new schema |
| `frontend/search.html` | ✅ Updated | Flight/claim ID search instead of ticket |
| `frontend/add-luggage.html` | ✅ Updated | Three sections: add item, create claim, update status |
| `frontend/index.html` | ℹ️ No change | Still works the same |
| `frontend/staff-login.html` | ℹ️ No change | Still works the same |
| `frontend/style.css` | ℹ️ No change | Still works the same |
| `README.md` | ✅ Created | Complete documentation |

---

## 🆘 Next Steps

1. **Create Database:**
   ```bash
   mysql -u root -p
   mysql> CREATE DATABASE airtrace;
   mysql> EXIT;
   mysql -u root -p airtrace < backend/database-schema.sql
   ```

2. **Install and Run Backend:**
   ```bash
   cd backend
   npm install
   npm start
   ```

3. **Test in Browser:**
   - Open `frontend/index.html`
   - Click "Staff Login"
   - Use `admin1` / `password123`
   - Add items, create claims, search items

4. **Verify Functionality:**
   - ✅ Staff can login
   - ✅ Staff can add items
   - ✅ Staff can create claims
   - ✅ Staff can update item status
   - ✅ Passengers can search items

---

## 💡 Example Workflows

### Workflow 1: Passenger Searching for Lost Item
1. Passenger goes to `search.html`
2. Enters flight number: `BA123`
3. System shows found items from that flight
4. Passenger sees their Black Suitcase listed as "Found"
5. Can request staff to file claim

### Workflow 2: Staff Registering Found Item
1. Staff logs in with `admin1`
2. Goes to Add Item section
3. Selects flight `BA123` from dropdown
4. Selects category `Suitcase` from dropdown
5. Enters: "Black Rolling Suitcase"
6. Selects location: "T1 - Gate A5"
7. Status: "Found"
8. Clicks "Add Item" → Success!

### Workflow 3: Passenger Claiming Item
1. Staff logs in
2. Gets passenger name, email, passport number
3. Registers passenger if new
4. Goes to Create Claim section
5. Enters Passenger ID (from registration)
6. Enters Item ID (from added item)
7. Adds proof of ownership (passport copy reference)
8. Clicks "Create Claim" → Claim filed!

---

**Your AirTrace system is now fully updated and ready to use! 🎉**
