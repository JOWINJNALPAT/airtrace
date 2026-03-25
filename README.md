# 🛫 AirTrace - Airport Luggage Management System

## Overview
AirTrace is a comprehensive airport luggage and lost item management system with a relational database architecture based on the provided ER diagram. It allows passengers to search for lost items and staff to manage found items, claims, and passenger information.

---

## 📊 Database Schema

### Tables (Based on ER Diagram)

#### 1. **PASSENGER**
Stores passenger information who claim lost items
- `passenger_id` (PK) - Primary Key
- `first_name` - First name
- `last_name` - Last name
- `phone_number` - Contact number
- `email` - Email address (UNIQUE)
- `passport_number` - Passport ID (UNIQUE)
- `address` - Residential address

#### 2. **STAFF**
Airport staff members who process luggage and claims
- `staff_id` (PK) - Primary Key
- `username` - Login username (UNIQUE)
- `password` - Login password
- `role` - Admin or Desk
- `employee_id` - Employee ID (UNIQUE)

#### 3. **FLIGHT**
Flight information connected to lost items
- `flight_number` (PK) - Flight identifier
- `airline_name` - Airline name
- `origin_airport` - Departure airport
- `arrival_time` - Arrival time

#### 4. **LOCATION**
Where items are found at the airport
- `location_id` (PK) - Primary Key
- `terminal_code` - Terminal (T1, T2, etc.)
- `zone_type` - Gate, Duty, or Free Shop
- `specific_spot` - Specific location details

#### 5. **CATEGORY**
Item classification (Suitcase, Electronics, Documents, etc.)
- `category_id` (PK) - Primary Key
- `category_name` - Category name (UNIQUE)
- `storage_requirements` - Special storage needs

#### 6. **ITEM** (Main luggage/items table)
Found items registered in the system
- `item_id` (PK) - Primary Key
- `location_id` (FK) - Location where found
- `flight_number` (FK) - Associated flight
- `category_id` (FK) - Item category
- `registered_by_staff` (FK) - Staff member who registered it
- `item_name` - Item name
- `description` - Item description
- `serial_number` - Serial number (UNIQUE)
- `status` - Lost/Found/Returned/Verified
- `date_found` - When item was found

#### 7. **CLAIM**
Claims filed by passengers for found items
- `claim_id` (PK) - Primary Key
- `passenger_id` (FK) - Passenger claiming item
- `item_id` (FK) - Item being claimed
- `claim_date` - When claim was filed
- `status` - Pending/Verified/Resolved
- `proof_of_ownership` - Document reference
- `resolution_date` - When claim was resolved

---

## 🚀 Backend APIs

> **Frontend Configuration**
> The client scripts read the API base URL dynamically. In development the default is `http://localhost:3000/api`.
> For production, you can inject the backend host using a `<meta name="api-base-url" ...>` tag in your HTML pages or
> by setting `window.API_BASE_URL` before loading `script.js`.  Vercel supports templating meta tags via environment
> variables in the project settings.



### Backend Setup

#### Installation
```bash
cd backend
npm install
```

#### Configuration
The backend now reads connection details and runtime settings from environment variables.
Set the following (Render will provide values; locally you can use a `.env` file with [dotenv] or export vars):

- `DATABASE_URL` (standard for Render/PostgreSQL)
- `DB_HOST` (default: localhost)
- `DB_USER` (default: postgres)
- `DB_PASSWORD` (default: empty)
- `DB_NAME` (default: airtrace)
- `DB_PORT` (default: 5432)
- `ALLOWED_ORIGINS` (comma-separated origins allowed by CORS, `*` for all)
- `PORT` (Render and similar platforms set this automatically)

Example `.env`:
```
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=airtrace
ALLOWED_ORIGINS=http://localhost:5500
```

#### Start Server
```bash
npm start
```

Server listens on `http://localhost:3000` by default (or the value of $PORT).  If deployed to Render or another host, use the generated URL.

### Available API Endpoints

#### 1. Search Items
```
GET /api/search-items
Query Parameters:
  - flight_number: Search by flight number (e.g., BA123)
  - claim_id: Search by claim ID
  - passenger_id: Search by passenger ID

Response:
{
  success: true,
  count: 2,
  items: [
    {
      item_id: 1,
      item_name: "Black Suitcase",
      category_name: "Suitcase",
      flight_number: "BA123",
      status: "Found",
      location_id: 1,
      ...
    }
  ]
}
```

#### 2. Add New Item
```
POST /api/add-item
Body:
{
  flight_number: "BA123",
  item_name: "Black Suitcase",
  description: "Large black rolling suitcase",
  serial_number: "SN123456",
  category_id: 1,
  location_id: 1,
  status: "Found",
  date_found: "2026-02-01T14:30:00",
  registered_by_staff: 2
}

Response:
{
  success: true,
  message: "Item added successfully",
  id: 1
}
```

#### 3. Create Claim
```
POST /api/create-claim
Body:
{
  passenger_id: 1,
  item_id: 1,
  claim_date: "2026-02-01T15:00:00",
  status: "Pending",
  proof_of_ownership: "Passport copy",
  resolution_date: null
}

Response:
{
  success: true,
  message: "Claim created successfully",
  claim_id: 1
}
```

#### 4. Update Item Status
```
PUT /api/update-item/:item_id
Body:
{
  status: "Returned",
  location_id: 1 (optional)
}

Response:
{
  success: true,
  message: "Item status updated"
}
```

#### 5. Register Passenger
```
POST /api/register-passenger
Body:
{
  first_name: "John",
  last_name: "Smith",
  phone_number: "+44-123-456789",
  email: "john@example.com",
  passport_number: "GB123456",
  address: "123 Main St"
}

Response:
{
  success: true,
  message: "Passenger registered successfully",
  passenger_id: 1
}
```

#### 6. Staff Login
```
POST /api/staff-login
Body:
{
  username: "admin1",
  password: "password123"
}

Response:
{
  success: true,
  message: "Login successful",
  staff: {
    staff_id: 1,
    username: "admin1",
    role: "Admin",
    employee_id: "EMP001"
  }
}
```

#### 7. Get All Categories
```
GET /api/categories

Response:
{
  success: true,
  categories: [
    {
      category_id: 1,
      category_name: "Suitcase",
      storage_requirements: "Standard luggage storage"
    }
  ]
}
```

#### 8. Get All Flights
```
GET /api/flights

Response:
{
  success: true,
  flights: [
    {
      flight_number: "BA123",
      airline_name: "British Airways",
      origin_airport: "London (LHR)",
      arrival_time: "2026-02-01T14:30:00"
    }
  ]
}
```

#### 9. Get All Locations
```
GET /api/locations

Response:
{
  success: true,
  locations: [
    {
      location_id: 1,
      terminal_code: "T1",
      zone_type: "Gate",
      specific_spot: "Gate A5"
    }
  ]
}
```

#### 10. Get Claim Details
```
GET /api/claim/:claim_id

Response:
{
  success: true,
  claim: {
    claim_id: 1,
    passenger_id: 1,
    item_id: 1,
    claim_date: "2026-02-01T15:00:00",
    status: "Verified",
    first_name: "John",
    last_name: "Smith",
    email: "john@example.com",
    item_name: "Black Suitcase",
    flight_number: "BA123"
  }
}
```

#### 11. Update Claim Status
```
PUT /api/claim/:claim_id
Body:
{
  status: "Verified",
  resolution_date: "2026-02-02T10:00:00"
}

Response:
{
  success: true,
  message: "Claim status updated"
}
```

---

## 💻 Frontend Pages

### 1. **index.html** - Home Page
- Welcome message and system overview
- Quick access buttons to search and login
- Feature descriptions

### 2. **search.html** - Search Items
- Search by flight number or claim ID
- Display found items with details
- Show item status, location, and category

### 3. **add-luggage.html** - Staff Dashboard
Three main sections:
- **Add Item**: Register found items with flight, category, location, and status
- **Create Claim**: File claims for passengers
- **Update Item Status**: Modify item status (Found → Returned, etc.)

### 4. **staff-login.html** - Staff Authentication
- Login form for airport staff
- Role-based access (Admin/Desk)

---

## 🗄️ Database Setup

### SQL Script
Run the `database-schema.sql` file to create all tables:

```bash
psql -U your_user -d airtrace -f backend/database-schema.sql
```

### What Gets Created:
- 7 tables with proper relationships
- Foreign key constraints
- Indexes for performance optimization
- Sample data for testing (categories, flights, locations, staff, passengers, items, claims)

### Sample Credentials:
**Admin:**
- Username: `admin1`
- Password: `password123`

**Desk Staff:**
- Username: `desk1` or `desk2`
- Password: `desk123`

---

## 📱 Frontend Functions

### Search Functions
- `searchItems()` - Search for items by flight or claim ID
- `displayItems()` - Display found items in card format

### Add/Manage Functions
- `addItem()` - Register found item
- `createClaim()` - File claim for item
- `updateItemStatus()` - Change item status
- `loadCategories()` - Populate category dropdown
- `loadFlights()` - Populate flight dropdown
- `loadLocations()` - Populate location dropdown

### Authentication
- `staffLogin()` - Authenticate staff member
- Staff data stored in localStorage

### Utility Functions
- `clearForm()` - Reset all form fields
- `showError()` - Display error message
- `showSuccess()` - Display success message

---

## 🔄 Workflow Example

### Passenger Searching for Lost Item:
1. Passenger visits `search.html`
2. Enters flight number (e.g., BA123)
3. System searches database for items on that flight
4. Results displayed showing found items with status
5. If item found, passenger can file a claim

### Staff Adding Found Item:
1. Staff logs in with credentials
2. Navigates to `add-luggage.html`
3. Selects flight from dropdown
4. Selects category (Suitcase, Electronics, etc.)
5. Enters item details and location found
6. Sets status to "Found"
7. Item saved to database

### Filing a Claim:
1. Staff receives passenger information
2. Creates passenger record if new
3. Files claim linking passenger to found item
4. Uploads proof of ownership
5. Status set to "Pending"
6. Admin verifies and updates to "Verified"

---

## 🛡️ Security Notes

- Passwords stored in database (consider hashing in production)
- CORS enabled for frontend access
- Input validation on all APIs
- Foreign key constraints enforce data integrity

---

## 🧪 Testing the System

### Using Postman or cURL:

**Search Items:**
```bash
curl http://localhost:3000/api/search-items?flight_number=BA123
```

**Add Item:**
```bash
curl -X POST http://localhost:3000/api/add-item \
  -H "Content-Type: application/json" \
  -d '{
    "flight_number":"BA123",
    "item_name":"Black Suitcase",
    "category_id":1,
    "status":"Found"
  }'
```

---

## 📝 File Structure

```
AirTrace/
├── backend/
│   ├── server.js (Express server with all APIs)
│   ├── package.json (Dependencies)
│   └── database-schema.sql (Database setup)
├── frontend/
│   ├── index.html (Home page)
│   ├── search.html (Search items)
│   ├── add-luggage.html (Staff dashboard)
│   ├── staff-login.html (Authentication)
│   ├── style.css (Styling)
│   └── script.js (Frontend logic)
└── README.md (This file)
```

---

## 🚀 Deployment

### For Production:
1. Move database password to environment variables
2. Hash staff passwords in database
3. Add HTTPS support
4. Implement proper authentication tokens
5. Add rate limiting
6. Deploy backend to server
7. Deploy frontend to CDN or web server

---

## 📞 Support

For issues or questions, check:
- Backend logs in server console
- Browser console (F12) for frontend errors
- Database connections and credentials

---

**Last Updated:** February 1, 2026
**Version:** 2.0 (Updated with new ER diagram schema)
