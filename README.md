# 🌍 Volunteer Hub – Backend API

## 📌 Project Overview

Volunteer Hub Backend is a RESTful API built with Node.js and Express that powers the Volunteer Hub platform.

It handles:

- User authentication & authorization (JWT-based)
- Volunteer opportunities management
- Applications tracking
- Impact report calculations
- Group events
- Community messaging
- Notifications

The backend connects to Supabase as the database and is deployed on Render.

---

## 🛠 Tech Stack

### Backend
- Node.js
- Express.js
- Supabase (PostgreSQL Database)
- JWT Authentication
- CORS Middleware

### Deployment
- Render (Backend Hosting)

---

## 📡 API Documentation

### 🔐 Authentication Routes
Base URL: `/api/auth`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register` | Register new user |
| POST | `/login` | Login user |

---

### 👤 Users Routes
Base URL: `/api/users`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/me` | Get current logged-in user |
| PUT | `/me` | Update current user profile |
| GET | `/:id/rating` | Get user rating |
| GET | `/:id/streak` | Get volunteering streak |
| GET | `/:id/hours` | Get total hours & history |

---

### 📊 Impact Routes
Base URL: `/api/impact`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/:id/hours` | Total volunteer hours |
| GET | `/:id/streak` | Monthly volunteering streak |
| GET | `/:id/rating` | Average rating |

---

### 🎯 Opportunities Routes
Base URL: `/api/opportunities`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get all opportunities |
| POST | `/` | Create opportunity |
| PUT | `/:id` | Update opportunity |
| DELETE | `/:id` | Delete opportunity |

---

### 💬 Messages Routes
Base URL: `/api/messages`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/unread-count` | Get unread message count |
| POST | `/` | Send message |

---

### 📅 Group Events Routes
Base URL: `/api/group-events`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get all events |
| POST | `/` | Create event |

---

## 🗄 Database Schema Explanation

The backend uses Supabase (PostgreSQL). Below are the core tables:

### 👤 users
- id (UUID)
- name
- email
- role (volunteer / organization)
- rating_score
- skills
- availability
- created_at

---

### 📂 opportunities
- id
- title
- description
- location
- organization_id
- created_at

---

### 📝 applications
- id
- volunteer_id
- opportunity_id
- organization_id
- hours
- completed (boolean)
- completed_at

---

### ⭐ ratings
- id
- volunteer_id
- rating
- created_at

---

### 💬 messages
- id
- sender_id
- receiver_id
- content
- read (boolean)
- created_at

---

## ⚙️ Installation Steps

Follow these steps to run the backend locally:

### 1️⃣ Clone Repository

```bash
git clone https://github.com/YOGISRI/Volunteer_Hub_Backend.git
cd Volunteer_Hub_Backend
cd backend
```
### 2️⃣ Install Dependencies
```bash
npm install
```
### 3️⃣ Setup Environment Variables
Create a .env file in the root directory and add:
```
PORT=5000
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_key
JWT_SECRET=your_jwt_secret
```
### Deploy Link: https://volunteer-hub-backend.onrender.com
