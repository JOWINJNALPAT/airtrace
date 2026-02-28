# ⚡ Quick Start Guide - AirTrace System

## 🚀 Setup (5 minutes)

### Step 1: Create Database
```bash
# Connect to MySQL
mysql -u root -p

# Create database
CREATE DATABASE airtrace;
EXIT;

# Import schema
mysql -u root -p airtrace < backend/database-schema.sql
```

### Step 2: Start Backend Server
```bash
cd backend
npm install
npm start
```

You should see:
```
✈️  AIRTRACE BACKEND SERVER
🚀 Server running on http://localhost:3000
✅ Ready to receive requests!
```

### Step 3: Open Frontend
1. Open `frontend/index.html` in your browser
2. Click "Staff Portal" → "Staff Login"
3. Use demo credentials (see below)

---

## 🔐 Demo Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | admin1 | password123 |
| Desk Staff | desk1 | desk123 |
| Desk Staff | desk2 | desk123 |

---

## 📋 Database Tables

```
┌──────────────┐
│  PASSENGER   │
├──────────────┤
│ passenger_id │
│ first_name   │
│ last_name    │
│ email        │
│ phone_number │
│ passport_no  │
│ address      │
└──────────────┘
        │
        │ files
        ↓
┌──────────────┐
│   CLAIM      │
├──────────────┤
│ claim_id     │
│ passenger_id │◄──── Links to PASSENGER
│ item_id      │◄──── Links to ITEM
│ claim_date   │
│ status       │
└──────────────┘
        │
        │ for
        ↓
┌──────────────────────┐
│     ITEM             │
├──────────────────────┤
│ item_id              │
│ flight_number        │◄──── Links to FLIGHT
│ category_id          │◄──── Links to CATEGORY
│ location_id          │◄──── Links to LOCATION
│ registered_by_staff  │◄──── Links to STAFF
│ item_name            │
│ description          │
│ serial_number        │
│ status               │
│ date_found           │
└──────────────────────┘
     ↑        ↑
     │        │
Links│        │Links
  to │        │ to
┌────┴──┐  ┌──┴──────────┐
│ FLIGHT│  │  LOCATION   │
├───────┤  ├─────────────┤
│flight #│  │ location_id │
│airline │  │ terminal    │
│origin  │  │ zone_type   │
│arrival │  │ specific    │
└───────┘  └─────────────┘

CATEGORY and STAFF also link to ITEM
```

---

## 🎯 Main Features

### 1. **Passenger Search Items** 
- Go to `frontend/search.html`
- Enter flight number or claim ID
- See all found items with details

### 2. **Staff Add Items**
- Login with demo credentials
- Go to "Add Item" section
- Fill form with flight, category, location, status
- Item saved to database

### 3. **File Claims**
- In staff dashboard
- Go to "Create Claim" section
- Enter passenger ID and item ID
- Add proof of ownership
- Claim created and tracked

### 4. **Update Status**
- In staff dashboard
- Go to "Update Item Status" section
- Change status: Found → Verified → Returned
- Update tracked in database

---

## 🔗 API Endpoints Quick Reference

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/search-items?flight_number=BA123` | Search items by flight |
| GET | `/api/search-items?claim_id=5` | Search items by claim |
| POST | `/api/add-item` | Add found item |
| POST | `/api/create-claim` | File claim for item |
| PUT | `/api/update-item/:id` | Update item status |
| POST | `/api/register-passenger` | Register new passenger |
| POST | `/api/staff-login` | Staff authentication |
| GET | `/api/categories` | Get all categories |
| GET | `/api/flights` | Get all flights |
| GET | `/api/locations` | Get all locations |
| GET | `/api/claim/:id` | Get claim details |
| PUT | `/api/claim/:id` | Update claim status |

---

## 🧪 Test Data

**Sample Flights:**
- BA123 - British Airways (London → Terminal)
- AA456 - American Airlines (New York → Terminal)
- LH789 - Lufthansa (Frankfurt → Terminal)
- SQ012 - Singapore Airlines (Singapore → Terminal)

**Sample Items:**
- Item ID 1: Black Suitcase on BA123
- Item ID 2: Blue Backpack on AA456
- Item ID 3: Canon Camera on LH789

**Sample Passengers:**
- ID 1: John Smith (john.smith@email.com)
- ID 2: Maria Garcia (maria.garcia@email.com)
- ID 3: Sarah Johnson (sarah.johnson@email.com)

**Sample Categories:**
- ID 1: Suitcase
- ID 2: Backpack
- ID 3: Electronics
- ID 4: Documents
- ID 5: Sports Equipment

---

## 🎮 Try This First

### Exercise 1: Search for Items
1. Open `frontend/search.html`
2. Enter flight number: `BA123`
3. Click "Search Items"
4. See the Black Suitcase result

### Exercise 2: Add New Item
1. Login with `admin1` / `password123`
2. Scroll to "Add Item" section
3. Select flight: `BA123`
4. Select category: `Suitcase`
5. Item name: `Red Rolling Bag`
6. Location: `T1 - Gate A5`
7. Status: `Found`
8. Click "Add Item"
9. See success message

### Exercise 3: Create Claim
1. In staff dashboard
2. Scroll to "Create Claim"
3. Passenger ID: `1`
4. Item ID: `1`
5. Proof: `Passport copy provided`
6. Click "Create Claim"
7. See success with claim ID

### Exercise 4: Update Status
1. In staff dashboard
2. Scroll to "Update Item Status"
3. Item ID: `1`
4. New Status: `Returned`
5. Click "Update Status"
6. See success message

---

## 🐛 Troubleshooting

### Backend won't start
- Check MySQL is running
- Check credentials in `server.js` match your MySQL
- Check database `airtrace` exists
- Run: `npm install` first

### Frontend shows errors
- Open browser console (F12)
- Check if backend server is running
- Check API_URL in script.js is correct

### Database connection error
- Verify MySQL password is `2288` (or change in server.js)
- Check database `airtrace` is created
- Run the schema setup command again

### Forms not working
- Check all required fields filled
- Look at browser console for errors
- Verify backend is responding (check console logs in terminal)

---

## 📁 Key Files

```
backend/
  ├── server.js ..................... All API endpoints
  ├── package.json .................. Dependencies
  └── database-schema.sql ........... Database setup

frontend/
  ├── index.html .................... Home page
  ├── search.html ................... Search items
  ├── add-luggage.html .............. Staff dashboard
  ├── staff-login.html .............. Login page
  ├── script.js ..................... All JavaScript functions
  └── style.css ..................... Styling

Documentation/
  ├── README.md ..................... Full documentation
  ├── UPDATE_SUMMARY.md ............. What changed
  └── QUICK_START.md ................ This file!
```

---

## 💡 Quick Tips

✅ **Use dropdowns for fields** - They prevent errors
✅ **Check server logs** - Helps debug issues
✅ **Test with demo data** - Learn the system first
✅ **Save passwords** - You'll need them often
✅ **Keep browser console open** - See any errors
✅ **Use Clear button** - Resets all form fields

---

## 🚀 Next Level

Ready for more? Check out:
- **README.md** - Complete documentation
- **UPDATE_SUMMARY.md** - Detailed changes
- **database-schema.sql** - View database structure

---

## 🆘 Help

**Server not responding?**
```bash
# Check if running
curl http://localhost:3000

# Should return: {"message":"✈️ AirTrace Backend is Running!"}
```

**Need to reset everything?**
```bash
# Stop the server (Ctrl+C)
# Drop and recreate database
mysql -u root -p airtrace < backend/database-schema.sql
# Restart server
npm start
```

---

**Your AirTrace system is ready! Happy coding! 🎉**

*Last updated: February 1, 2026*
