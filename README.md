# Task Management System (MERN Stack)

## Features
- Multi-user task management
- Role-based access control (Admin/Member)
- Project & task CRUD operations
- JWT Authentication
- Task status workflow (Todo → In Progress → Done)
- Search & pagination


## Tech Stack
**Backend:** Node.js, Express, MongoDB, JWT
**Frontend:** React, Vite, Tailwind CSS, Lucide Icons

## Installation

### Backend
```bash
cd backend
npm install
# Create .env file with:
# MONGO_URI=your_mongodb_connection
# JWT_SECRET=your_secret
# JWT_EXPIRE=30d
# PORT=5000
npm start
