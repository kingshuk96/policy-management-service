# 🛡️ Policy Management Service

A scalable, modular Node.js backend built with **Fastify**, **MongoDB (Mongoose)**, and **Worker Threads** for multi-threaded file ingestion, policy search and user aggregations, real-time CPU monitoring with auto-restart, and dynamic scheduled message delivery.

---

## 📦 Tech Stack

| Layer | Technology |
|---|---|
| **Runtime** | Node.js (v18+) |
| **Framework** | [Fastify](https://fastify.dev/) (v4+) |
| **Database** | MongoDB + Mongoose ODM |
| **File Parsing** | `csv-parser`, `xlsx` |
| **Concurrency** | `worker_threads` (Off-main-thread ingestion) |
| **Process Management** | Node.js `cluster` (Multi-core load balancing) |
| **Scheduling** | `node-schedule` (Cron & timestamp scheduling) |
| **Monitoring** | `os-utils` (Real-time CPU spike detection & auto-restart) |
| **Testing** | Jest + Supertest (36 automated integration & unit tests) |

---

## 🏗️ Project Architecture

```
policy-management-service/
├── server.js                          # Cluster primary & worker entry point
├── package.json                       # Scripts and dependencies
├── .env.example                       # Template for environment variables
├── scripts/
│   └── db-init.js                     # Database index initialization script
├── src/
│   ├── app.js                         # Fastify instance builder & plugin registrations
│   ├── routes.js                      # Central route aggregator & model pre-loader
│   ├── config/
│   │   ├── db.js                      # MongoDB connection pool setup
│   │   └── env.js                     # Environment variable validation (fail-fast)
│   ├── middlewares/
│   │   ├── errorHandler.middleware.js # Global error handler
│   │   └── upload.middleware.js       # Multipart stream handler & file validator
│   └── modules/
│       ├── agent/                     # Agent model & service
│       ├── user/                      # User & Account models & services
│       ├── policy/                    # Policy, LOB, Carrier models, search & aggregation
│       ├── scheduler/                 # Dynamic message scheduler & cancellation service
│       ├── system/                    # Real-time CPU monitor service
│       └── upload/                    # File upload controller & worker_threads ingestion
└── tests/
    ├── fixtures/
    │   ├── sample_data.csv            # 10-row assessment dataset
    │   └── README.md                  # Manual curl testing guide
    ├── env.setup.js                   # Pre-test env override (policy_management_test DB)
    ├── setup.js                       # Global Mongoose setup/teardown & collection cleaner
    ├── upload.test.js                 # Multi-threaded CSV ingestion tests
    ├── policy.test.js                 # Search & aggregation pipeline tests
    ├── scheduler.test.js              # Message scheduling & cancellation tests
    └── monitor.test.js                # CPU threshold & spike detection unit tests
```

---

## ⚙️ Prerequisites

* **Node.js** (v18 or higher)
* **MongoDB** (Local instance or MongoDB Atlas connection string)
* **npm** (v9 or higher)

---

## 🚀 Getting Started

### 1. Clone & Install Dependencies

```bash
git clone <repository-url>
cd policy-management-service
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

| Variable | Description | Default |
|---|---|---|
| `PORT` | Port number the Fastify server listens on | `3000` |
| `MONGO_URI` | MongoDB connection string (Atlas or Local) | — |
| `CPU_THRESHOLD` | CPU percentage that triggers worker restart | `70` |
| `NODE_ENV` | Environment mode (`development` or `production`) | `development` |

### 3. Initialize Database Indexes

Build unique and compound indexes for fast searching and deduplication:

```bash
npm run db:init
```

---

## 🏃 Running the Application

### Production / Cluster Mode
Forks worker processes across CPU cores for maximum throughput and zero-downtime auto-restart:

```bash
npm start
```

### Development Mode (with hot-reload)
Watches for file changes and restarts automatically:

```bash
npm run dev
```

The server will be available at: **`http://localhost:3000`**

---

## 🧪 Running Automated Tests

The test suite runs **36 automated tests** in complete isolation against a dedicated `policy_management_test` database:

```bash
npm test
```

### Running Specific Test Suites

```bash
# Upload & Worker Thread Ingestion Tests
npx jest tests/upload.test.js

# Policy Search & Aggregation Tests
npx jest tests/policy.test.js

# Scheduled Message & Cancellation Tests
npx jest tests/scheduler.test.js

# CPU Spike & Auto-Restart Unit Tests
npx jest tests/monitor.test.js
```

---

## 📡 API Reference & Endpoints

### 1. Health Check
* **`GET /health`**
  * Verifies server status.
  * **Response (200 OK):**
    ```json
    {
      "success": true,
      "status": "ok",
      "timestamp": "2026-08-23T10:00:00.000Z"
    }
    ```

---

### 2. Multi-Threaded File Ingestion
* **`POST /api/upload`**
  * Ingests `.csv` or `.xlsx` files using background `worker_threads` without blocking the main event loop.
  * Automatically handles deduplication and relational linking for **Agents**, **Users**, **Accounts**, **LOBs**, **Carriers**, and **Policies**.
  * **Headers:** `Content-Type: multipart/form-data`
  * **Body (form-data):** `file`: `<select CSV or XLSX file>`
  * **Response (200 OK):**
    ```json
    {
      "success": true,
      "message": "File ingested successfully via worker thread",
      "data": {
        "originalName": "sample_data.csv",
        "totalRows": 10,
        "processed": 10,
        "failed": 0,
        "duration": "1.85s"
      }
    }
    ```

---

### 3. Policy Search by Username
* **`GET /api/policies/search?username=:name`**
  * Performs a case-insensitive search by user first name. Returns populated documents with resolved references (`userId`, `agentId`, `lobId`, `carrierId`).
  * **Example:** `GET http://localhost:3000/api/policies/search?username=John`
  * **Response (200 OK):**
    ```json
    {
      "success": true,
      "count": 3,
      "data": [
        {
          "policyNumber": "POL-001",
          "premiumAmount": 1250,
          "policyStartDate": "2024-01-01T00:00:00.000Z",
          "policyEndDate": "2025-01-01T00:00:00.000Z",
          "userId": { "firstName": "John", "email": "john@example.com", "phone": "555-0101" },
          "agentId": { "name": "Alex Mercer" },
          "lobId": { "categoryName": "Commercial Auto" },
          "carrierId": { "companyName": "Progressive" }
        }
      ]
    }
    ```

---

### 4. Aggregated Policies by User
* **`GET /api/policies/aggregated-by-user`**
  * MongoDB aggregation pipeline grouping policies by user with count, total, average, min, and max premium amounts, sorted descending by total premium.
  * **Example:** `GET http://localhost:3000/api/policies/aggregated-by-user`
  * **Response (200 OK):**
    ```json
    {
      "success": true,
      "count": 5,
      "data": [
        {
          "userId": "64f1a2b3c4d5e6f7a8b9c0d1",
          "user": {
            "firstName": "John",
            "email": "john@example.com",
            "phone": "555-0101",
            "state": "CA",
            "userType": "Primary"
          },
          "summary": {
            "totalPolicies": 3,
            "totalPremiumAmount": 3800,
            "avgPremiumAmount": 1266.67,
            "minPremium": 850,
            "maxPremium": 1700
          },
          "policyNumbers": ["POL-001", "POL-002", "POL-003"]
        }
      ]
    }
    ```

---

### 5. Dynamic Message Scheduling
* **`POST /api/scheduler/message`**
  * Schedules a message for database insertion at a specific day and time.
  * **Body (JSON):**
    ```json
    {
      "message": "Send policy renewal reminder to all policyholders",
      "day": "2026-12-25",
      "time": "10:00:00"
    }
    ```
  * **Response (201 Created):**
    ```json
    {
      "success": true,
      "message": "Message scheduled successfully",
      "data": {
        "taskId": "7b54a501-9251-4f40-b6aa-5f991f86ca2b",
        "message": "Send policy renewal reminder to all policyholders",
        "scheduledAt": "2026-12-25T10:00:00.000Z",
        "status": "pending"
      }
    }
    ```

---

### 6. Cancel Scheduled Message
* **`DELETE /api/scheduler/message/:taskId`**
  * Cancels a pending scheduled job across all cluster workers.
  * **Example:** `DELETE http://localhost:3000/api/scheduler/message/7b54a501-9251-4f40-b6aa-5f991f86ca2b`
  * **Response (200 OK):**
    ```json
    {
      "success": true,
      "message": "Scheduled job \"7b54a501-9251-4f40-b6aa-5f991f86ca2b\" has been cancelled."
    }
    ```

---

## ⚡ Key Highlights & Production Features

1. **High-Performance Worker Threads**: Heavy parsing of `.csv`/`.xlsx` files is offloaded to Node.js `worker_threads` with batched `bulkWrite` operations and micro-yielding, keeping the server responsive under heavy ingestion load.
2. **Flexible Header Normalization**: Automatically recognizes header variations (e.g. `policy_number`, `policynumber`, `company_name`, `carrier`, `category_name`, `lob`) and supports comma, tab, and semicolon delimiters.
3. **Real-Time CPU Monitoring**: Polls CPU usage every 2 seconds via `os-utils`. If CPU usage sustains at or above `CPU_THRESHOLD` (70%), it initiates a graceful worker exit and automatic replacement fork.
4. **Cluster Dampening & Warmup Window**: Built-in startup grace period prevents startup TLS connection storms from triggering false-positive restarts.
5. **Database-Backed Job Coordination**: Scheduled jobs and cancellations synchronize across all cluster worker processes via MongoDB.
