-- PostgreSQL Schema for AirTrace

CREATE TABLE location (
    location_id SERIAL PRIMARY KEY,
    terminal_code VARCHAR(10),
    zone_type VARCHAR(50),
    specific_spot VARCHAR(255)
);

CREATE TABLE category (
    category_id SERIAL PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL,
    storage_requirements VARCHAR(255)
);

CREATE TABLE flight (
    flight_number VARCHAR(20) PRIMARY KEY,
    airline_name VARCHAR(100),
    origin_airport VARCHAR(10),
    arrival_time TIMESTAMP
);

CREATE TABLE passenger (
    passenger_id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20),
    email VARCHAR(100) NOT NULL,
    passport_number VARCHAR(50),
    address TEXT
);

CREATE TABLE staff (
    staff_id SERIAL PRIMARY KEY,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50)
);

CREATE TABLE item (
    item_id SERIAL PRIMARY KEY,
    location_id INT,
    flight_number VARCHAR(20),
    category_id INT,
    registered_by_staff INT,
    item_name VARCHAR(255) NOT NULL,
    description TEXT,
    serial_number VARCHAR(100),
    status VARCHAR(50) NOT NULL DEFAULT 'Found',
    date_found TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (location_id) REFERENCES location(location_id),
    FOREIGN KEY (flight_number) REFERENCES flight(flight_number),
    FOREIGN KEY (category_id) REFERENCES category(category_id),
    FOREIGN KEY (registered_by_staff) REFERENCES staff(staff_id)
);

CREATE TABLE claim (
    claim_id SERIAL PRIMARY KEY,
    passenger_id INT NOT NULL,
    item_id INT NOT NULL,
    claim_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) NOT NULL DEFAULT 'Pending',
    proof_of_ownership TEXT,
    resolution_date TIMESTAMP,
    FOREIGN KEY (passenger_id) REFERENCES passenger(passenger_id),
    FOREIGN KEY (item_id) REFERENCES item(item_id)
);

-- Basic Seed Data Example
INSERT INTO staff (employee_id, username, password, role) VALUES ('EMP-101', 'admin', 'password123', 'Manager');
INSERT INTO location (terminal_code, zone_type, specific_spot) VALUES ('T1', 'Lost Property', 'Shelf A1');
INSERT INTO category (category_name, storage_requirements) VALUES ('Electronics', 'Fragile, Room Temperature');
INSERT INTO flight (flight_number, airline_name, origin_airport, arrival_time) VALUES ('BA123', 'British Airways', 'LHR', NOW());
INSERT INTO item (flight_number, item_name, description, category_id, status) VALUES ('BA123', 'Black Bag', 'Samsonite hard case', 1, 'Found');
INSERT INTO passenger (first_name, last_name, email) VALUES ('Jowin', 'Jnalpat', 'jowin@example.com');
INSERT INTO claim (passenger_id, item_id, status) VALUES (1, 1, 'Pending');
