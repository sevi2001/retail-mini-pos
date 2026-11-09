# 🛒 Retail Mini-POS

### Modern Point of Sale & Inventory Management System

A responsive, web-based Point of Sale (POS) application built using **Next.js, TypeScript, Tailwind CSS, and Firebase**.

Developed as a Software Engineering Take-Home Assessment for **NeoMatrix (Pvt) Ltd**, the application provides product management, inventory tracking, sales processing, and role-based access control.

## 🌐 Live Demo & Source Code

**🚀 Live Application:** [Retail Mini-POS](https://retail-mini-pos-swart.vercel.app/)

**💻 GitHub Repository:** [Retail Mini-POS GitHub](https://github.com/sevi2001/retail-mini-pos)

**👩‍💻 GitHub Profile:** [sevi2001](https://github.com/sevi2001)

---

## ✨ Key Features

### 🔐 Authentication & Authorization
- Secure login using Firebase Authentication
- Manager-based role authorization
- Protected application routes and operations

### 📦 Product & Inventory Management
- Add, edit, and manage products
- Product images and categories
- SKU-based product identification
- Product pricing and stock quantity tracking
- Low-stock and out-of-stock indicators
- Real-time inventory synchronization using Cloud Firestore

### 🛍️ Point of Sale & Checkout
- Interactive shopping cart
- Product quantity adjustments
- Automatic subtotal and total calculations
- Discount support
- Cash payment and change calculation
- Transaction-based stock updates
- Protection against duplicate sale submissions

### 📊 Dashboard & Sales History
- Inventory and sales overview
- Sales transaction history
- Receipt details
- Stock availability monitoring

---

## 🛠️ Technology Stack

| Technology | Purpose |
|---|---|
| Next.js | Full-stack web application framework |
| React | User interface |
| TypeScript | Type-safe application development |
| Tailwind CSS | Responsive styling |
| Firebase Authentication | User authentication |
| Cloud Firestore | Database and inventory management |
| Firebase Admin SDK | Secure server-side operations |
| Vercel | Application deployment |
| Git & GitHub | Version control and source code hosting |

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/sevi2001/retail-mini-pos.git
cd retail-mini-pos
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure Firebase

Create a `.env.local` file and configure the Firebase client credentials and Firebase Admin SDK environment variables required by the application.

Keep private credentials out of version control.

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Create a production build

```bash
npm run build
```

---

## ☁️ Deployment

The application is deployed on **Vercel** and integrated with **Firebase Authentication** and **Cloud Firestore**.

**Live Website:** https://retail-mini-pos-swart.vercel.app/

---

## 🔒 Security

- Firebase Authentication for user login
- Manager authorization for restricted operations
- Server-side Firebase Admin SDK
- Firestore transactions for inventory consistency
- Environment variables for configuration and private credentials

---

## 👩‍💻 Developer

**GitHub:** [sevi2001](https://github.com/sevi2001)

**Project Repository:** [retail-mini-pos](https://github.com/sevi2001/retail-mini-pos)

**Live Application:** [Retail Mini-POS](https://retail-mini-pos-swart.vercel.app/)

---

⭐ If you find this project useful, consider giving the repository a star!
