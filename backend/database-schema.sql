-- ============================================
-- AIRTRACE DATABASE SCHEMA (PostgreSQL)
-- ============================================
-- This file creates all tables according to the ER diagram
-- Run this in PostgreSQL to set up the database

-- Note: In PostgreSQL, database creation is typically done outside the schema script.
-- If you need to create the database, do it in a separate command:
-- CREATE DATABASE airtrace;
-- \c airtrace

-- ============================================
-- TABLE: PASSENGER
-- ============================================
CREATE TABLE IF NOT EXISTS passenger (
    passenger_id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20),
    email VARCHAR(100) NOT NULL UNIQUE,
    passport_number VARCHAR(50) UNIQUE,
    address VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLE: STAFF
-- ============================================
CREATE TABLE IF NOT EXISTS staff (
    staff_id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(10) CHECK (role IN ('Admin', 'Staff')) NOT NULL DEFAULT 'Staff',
    employee_id VARCHAR(50) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLE: FLIGHT
-- ============================================
CREATE TABLE IF NOT EXISTS flight (
    flight_number VARCHAR(20) PRIMARY KEY,
    airline_name VARCHAR(100) NOT NULL,
    origin_airport VARCHAR(100) NOT NULL,
    arrival_time TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLE: LOCATION
-- ============================================
CREATE TABLE IF NOT EXISTS location (
    location_id SERIAL PRIMARY KEY,
    terminal_code VARCHAR(10) NOT NULL,
    zone_type VARCHAR(10) CHECK (zone_type IN ('Gate', 'Duty', 'Free')) NOT NULL,
    specific_spot VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLE: CATEGORY
-- ============================================
CREATE TABLE IF NOT EXISTS category (
    category_id SERIAL PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL UNIQUE,
    storage_requirements VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLE: ITEM (LUGGAGE/ITEMS)
-- ============================================
CREATE TABLE IF NOT EXISTS item (
    item_id SERIAL PRIMARY KEY,
    location_id INT,
    flight_number VARCHAR(20),
    category_id INT NOT NULL,
    registered_by_staff INT,
    item_name VARCHAR(100) NOT NULL,
    description TEXT,
    serial_number VARCHAR(100) UNIQUE,
    status VARCHAR(20) CHECK (status IN ('Lost', 'Found', 'Returned', 'Verified')) NOT NULL DEFAULT 'Found',
    date_found TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (location_id) REFERENCES location(location_id),
    FOREIGN KEY (flight_number) REFERENCES flight(flight_number),
    FOREIGN KEY (category_id) REFERENCES category(category_id),
    FOREIGN KEY (registered_by_staff) REFERENCES staff(staff_id)
);

-- ============================================
-- TABLE: CLAIM
-- ============================================
CREATE TABLE IF NOT EXISTS claim (
    claim_id SERIAL PRIMARY KEY,
    passenger_id INT NOT NULL,
    item_id INT NOT NULL,
    claim_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) CHECK (status IN ('Pending', 'Verified', 'Resolved')) NOT NULL DEFAULT 'Pending',
    proof_of_ownership VARCHAR(255),
    resolution_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (passenger_id) REFERENCES passenger(passenger_id),
    FOREIGN KEY (item_id) REFERENCES item(item_id),
    UNIQUE (passenger_id, item_id)
);

-- ============================================
-- INDEXES FOR BETTER PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_item_flight ON item(flight_number);
CREATE INDEX IF NOT EXISTS idx_item_category ON item(category_id);
CREATE INDEX IF NOT EXISTS idx_item_location ON item(location_id);
CREATE INDEX IF NOT EXISTS idx_item_status ON item(status);
CREATE INDEX IF NOT EXISTS idx_claim_passenger ON claim(passenger_id);
CREATE INDEX IF NOT EXISTS idx_claim_item ON claim(item_id);
CREATE INDEX IF NOT EXISTS idx_claim_status ON claim(status);

-- ============================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================

-- Sample Categories
INSERT INTO category (category_name, storage_requirements) VALUES 
('Suitcase', 'Standard luggage storage'),
('Backpack', 'Regular backpack area'),
('Electronics', 'Secure, climate-controlled'),
('Documents', 'Safe and dry location'),
('Sports Equipment', 'Large storage area');

-- Sample Flights
INSERT INTO flight (flight_number, airline_name, origin_airport, arrival_time) VALUES 
('BA123', 'British Airways', 'London (LHR)', '2026-02-01 14:30:00'),
('AA456', 'American Airlines', 'New York (JFK)', '2026-02-01 15:45:00'),
('LH789', 'Lufthansa', 'Frankfurt (FRA)', '2026-02-01 16:20:00'),
('SQ012', 'Singapore Airlines', 'Singapore (SIN)', '2026-02-01 17:00:00');

-- Sample Locations
INSERT INTO location (terminal_code, zone_type, specific_spot) VALUES 
('T1', 'Gate', 'Gate A5'),
('T1', 'Duty', 'Duty Free Zone 2'),
('T2', 'Gate', 'Gate B12'),
('T2', 'Free', 'Free Shop Area 3'),
('T1', 'Gate', 'Gate C8');

-- Sample Staff
INSERT INTO staff (username, password, role, employee_id) VALUES 
('staff1', 'staff123', 'Staff', 'EMP000'),
('admin1', 'admin123', 'Admin', 'EMP001'),
('staff2', 'staff123', 'Staff', 'EMP002'),
('staff3', 'staff123', 'Staff', 'EMP003');

-- Sample Passengers
INSERT INTO passenger (first_name, last_name, phone_number, email, passport_number) VALUES 
('John', 'Smith', '+44-123-456789', 'john.smith@email.com', 'GB123456'),
('Maria', 'Garcia', '+34-987-654321', 'maria.garcia@email.com', 'ES987654'),
('Sarah', 'Johnson', '+1-555-1234', 'sarah.johnson@email.com', 'US555123');

-- Sample Items
INSERT INTO item (flight_number, item_name, description, category_id, location_id, status, date_found, registered_by_staff) VALUES 
('BA123', 'Black Suitcase', 'Large black rolling suitcase with gold locks', 1, 1, 'Found', '2026-02-01 14:35:00', 2),
('AA456', 'Blue Backpack', 'North Face backpack with laptop compartment', 2, 2, 'Found', '2026-02-01 15:50:00', 2),
('LH789', 'Canon Camera', 'Professional DSLR camera with lens', 3, 3, 'Found', '2026-02-01 16:25:00', 3),
('BA123', 'Red Travel Bag', 'Medium red travel bag with shoulder strap', 1, 1, 'Found', '2026-02-01 17:10:00', 2),
('AA456', 'Leather Wallet', 'Brown leather wallet with multiple card slots', 4, 2, 'Found', '2026-02-01 17:45:00', 3),
('LH789', 'Sunglasses', 'Ray-Ban sunglasses with case', 4, 3, 'Found', '2026-02-01 18:20:00', 1),
('BA123', 'Silver Laptop', 'Dell XPS 15 silver laptop computer', 2, 1, 'Lost', '2026-01-31 10:20:00', 1),
('AA456', 'Pink Suitcase', 'Medium pink hard shell suitcase', 1, 2, 'Lost', '2026-01-30 14:15:00', 3),
('LH789', 'Headphones', 'Sony WH-1000XM4 wireless headphones', 4, 3, 'Lost', '2026-01-29 09:45:00', 2),
('BA123', 'Documents Folder', 'Brown leather document folder with business cards', 3, 1, 'Lost', '2026-02-01 12:30:00', 1);

-- Sample Claims
INSERT INTO claim (passenger_id, item_id, status, proof_of_ownership) VALUES 
(1, 1, 'Verified', 'Passport copy'),
(2, 2, 'Pending', null),
(3, 3, 'Verified', 'Receipt'),
(1, 4, 'Pending', null),
(2, 5, 'Verified', 'ID photo'),
(3, 6, 'Pending', null),
(1, 7, 'Pending', 'Email confirmation'),
(2, 8, 'Verified', 'Booking reference'),
(3, 9, 'Pending', null),
(1, 10, 'Verified', 'Travel insurance doc');
