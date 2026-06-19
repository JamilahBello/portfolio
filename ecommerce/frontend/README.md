# **E-Commerce Full-Stack Platform**

![GitHub License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg)
![Next.js](https://img.shields.io/badge/next.js-15.4.10-blue.svg)
![Express.js](https://img.shields.io/badge/express.js-4.22.2-green.svg)
![MongoDB](https://img.shields.io/badge/mongodb-8.16.5-orange.svg)

---

## ✨ **Overview**

This is a **full-stack e-commerce platform** built with **Next.js**, **Express.js**, and **MongoDB**, featuring:
✅ **Admin Dashboard** (Next.js)
✅ **Frontend Store** (Next.js)
✅ **RESTful API** (Express.js)
✅ **User Authentication** (JWT)
✅ **Shopping Cart & Checkout**
✅ **Order Management**
✅ **Email Notifications**
✅ **Geographic Data Management** (States & Cities)
✅ **Soft Delete System** (for all entities)

Perfect for developers looking to build a **scalable, feature-rich e-commerce solution** with a **modern tech stack**.

---

## 🛠️ **Tech Stack**

| Category       | Technologies Used                          |
|---------------|------------------------------------------|
| **Frontend**  | Next.js (React 19), Tailwind CSS, TypeScript |
| **Backend**   | Express.js, Node.js, Mongoose (MongoDB) |
| **Authentication** | JWT, Bcrypt, Nodemailer |
| **Testing**   | Jest, Supertest, MongoDB Memory Server |
| **DevOps**    | Docker (optional), Nodemon, ESLint |

---

## 📦 **Installation**

### **Prerequisites**
- **Node.js** (≥18.0.0)
- **npm** (≥10.0.0) or **yarn** (≥1.22.0)
- **MongoDB** (local or cloud instance)

### **Quick Start**

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/ecommerce.git
   cd ecommerce
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the `ecommerce/api` directory with:
   ```env
   MONGO_URI=mongodb://localhost:27017/ecommerce
   JWT_SECRET=your_jwt_secret_here
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_email_password
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```
   - **Frontend (Next.js)**: `http://localhost:3000`
   - **Admin Dashboard**: `http://localhost:3001`
   - **API**: `http://localhost:3360`

---

## 🎯 **Usage**

### **1. Admin Dashboard (Next.js)**
- **Access**: `http://localhost:3001`
- **Features**:
  - Manage products, categories, and users.
  - View orders and invoices.
  - Configure geographic data (states & cities).

### **2. Frontend Store (Next.js)**
- **Access**: `http://localhost:3000`
- **Features**:
  - Browse products.
  - Add items to cart.
  - Checkout & order management.

### **3. API (Express.js)**
- **Base URL**: `http://localhost:3360/api/v1`
- **Key Endpoints**:
  - **Users**: `/users` (register, login, forgot password)
  - **Products**: `/products` (CRUD)
  - **Orders**: `/orders` (CRUD)
  - **Carts**: `/carts` (add/remove items)
  - **Invoices**: `/invoices` (generate, pay)
  - **Geographies**: `/geographies` (states & cities)

#### **Example: Create a Product**
```javascript
fetch('http://localhost:3360/api/v1/products', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${your_jwt_token}`
  },
  body: JSON.stringify({
    name: "Wireless Headphones",
    price: 99.99,
    description: "Premium noise-cancelling headphones",
    category: "electronics"
  })
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('Error:', error));
```

#### **Example: Get User Orders**
```javascript
fetch('http://localhost:3360/api/v1/orders', {
  headers: {
    'Authorization': `Bearer ${your_jwt_token}`
  }
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('Error:', error));
```

---

## 📁 **Project Structure**

```
ecommerce/
├── api/                  # Express.js backend
│   ├── controllers/      # Business logic
│   ├── models/           # MongoDB schemas
│   ├── routes/           # API endpoints
│   ├── middleware/       # Auth, validation
│   ├── utils/            # Helpers (validation, JWT, etc.)
│   ├── tests/            # Test files
│   ├── app.js            # Express app setup
│   └── server.js         # Server entry point
│
├── admin-frontend/       # Next.js admin dashboard
│   ├── src/
│   ├── package.json
│   └── next.config.js
│
├── frontend/             # Next.js storefront
│   ├── src/
│   ├── package.json
│   └── next.config.js
│
├── mern-contact/         # Legacy contact form (Next.js)
│   ├── src/
│   └── package.json
│
├── .env.example          # Environment variables template
├── package.json          # Root package (workspaces)
└── README.md             # This file
```

---

## 🔧 **Configuration**

### **Environment Variables**
| Variable          | Description                          |
|-------------------|--------------------------------------|
| `MONGO_URI`       | MongoDB connection string             |
| `JWT_SECRET`      | JWT signing secret                   |
| `EMAIL_USER`      | Email service username               |
| `EMAIL_PASS`      | Email service password               |

### **Customization**
- **Themes**: Modify `globals.css` in `admin-frontend/src/app/`.
- **API Routes**: Extend `routes/` in `api/` for new endpoints.
- **Database**: Update `models/` to add new collections.

---

## 🤝 **Contributing**

### **How to Contribute**
1. **Fork the repository**.
2. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature
   ```
3. **Commit changes**:
   ```bash
   git commit -m "Add new feature"
   ```
4. **Push to the branch**:
   ```bash
   git push origin feature/your-feature
   ```
5. **Open a Pull Request**.

### **Development Setup**
```bash
# Install dependencies
npm install

# Run all services (API, Frontend, Admin)
npm run dev
```

### **Code Style**
- **JavaScript/TypeScript**: Follow ES6+ conventions.
- **React**: Use hooks and functional components.
- **Testing**: Write unit tests with Jest.

---

## 📝 **License**

This project is licensed under the **MIT License** – free to use, modify, and distribute.

---

## 👥 **Authors & Contributors**

👤 **Maintainer**: [Your Name](https://github.com/yourusername)
🤝 **Contributors**: [List of contributors]

---

## 🐛 **Issues & Support**

### **Reporting Bugs**
- Open an issue on GitHub with:
  - Steps to reproduce.
  - Expected vs. actual behavior.
  - Screenshots/logs if applicable.

### **Getting Help**
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/ecommerce/discussions)
- **Community**: Join our [Slack/Discord](link)

---

## 🗺️ **Roadmap**

| Feature               | Status       | Description                          |
|-----------------------|-------------|--------------------------------------|
| **Payment Gateway**   | Planned     | Integrate Stripe/PayPal              |
| **Multi-Currency**    | Planned     | Support USD, EUR, GBP                |
| **Analytics Dashboard** | Planned | Sales & user behavior insights      |
| **Mobile App**        | Future      | React Native iOS/Android app        |

---

## 🚀 **Get Started Today!**

This e-commerce platform is **ready for production** and **scalable** for future growth. Whether you're building a **personal project** or a **commercial business**, this repository provides a **solid foundation** with **modern best practices**.

💡 **Star this repo** and **contribute** to make it even better! 🚀

---
**Happy coding!** 🎉