# FarmLink

**AI-assisted, WhatsApp-first shared logistics for rural agricultural commerce.**

FarmLink helps farmers place agricultural supply orders through WhatsApp using voice or text. The platform extracts structured order information using AI, groups nearby orders into shared delivery trips, matches them with local shops, and provides real-time delivery updates.

## Features

* 🤖 AI-powered order extraction
* 💬 WhatsApp voice and text ordering
* 📍 Geospatial order grouping
* 🚚 Shared delivery trip optimization
* 🏪 Admin and shopkeeper dashboards
* 🔔 Real-time notifications
* 🗺️ Interactive maps
* 📊 Logistics analytics
* 🧠 AI Operations Assistant
* 🔐 Secure RBAC and concurrency-safe trip claiming

## Tech Stack

* **Frontend:** Next.js, TypeScript
* **Backend:** Node.js, Express
* **Database:** MongoDB
* **Real-time:** Socket.IO
* **AI:** Gemini
* **Messaging:** Twilio
* **Deployment:** Vercel, Render, MongoDB Atlas

## Live Demo

[FarmLink Live Demo](https://farm-link-azure.vercel.app)

## Getting Started

### Prerequisites

Make sure you have the following installed:

* Node.js
* npm
* MongoDB or a MongoDB Atlas account

### Clone the Repository

```bash
git clone https://github.com/khushi347/FarmLink.git
cd FarmLink
```

### Backend Setup

```bash
cd backend
npm install
npm start
```

Configure the backend environment variables using the provided `.env.example` file.

### Frontend Setup

Open a new terminal:

```bash
cd FarmLink/frontend
npm install
npm run dev
```

Configure the frontend environment variables using the provided `.env.example` file.

The frontend will typically be available at:

```text
http://localhost:3000
```

## Project Structure

```text
FarmLink/
├── backend/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── services/
│   └── ...
│
├── frontend/
│   ├── app/
│   ├── components/
│   ├── lib/
│   └── ...
│
├── .gitignore
└── README.md
```

## Deployment

FarmLink is deployed using:

* **Frontend:** Vercel
* **Backend:** Render
* **Database:** MongoDB Atlas

## Architecture

```text
Farmer
   │
   │ WhatsApp Voice / Text
   ▼
Twilio
   │
   ▼
FarmLink Backend
   │
   ├── AI Order Extraction
   ├── Order Validation
   ├── Geospatial Grouping
   ├── Trip Generation
   ├── Shop Matching
   └── Real-time Updates
   │
   ├───────────────┐
   ▼               ▼
MongoDB        Shopkeeper/Admin
                  Dashboard
```

## Author

**Khushi Sharma**

Built as an AI-assisted logistics platform focused on making agricultural commerce more accessible and efficient for rural communities.
