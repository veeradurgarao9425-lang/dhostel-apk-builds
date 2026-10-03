# 🏠 Hostel Accounts Management Application

A comprehensive **React.js + Node.js** based application designed to manage multiple hostels efficiently.
This system allows a **Main Admin** to register hostels and their respective **Hostel Owners**, while each owner can manage student data, room allocations, fees, and expenses — all in one centralized dashboard.

---

## 🚀 Features

### 🧑‍💼 Admin Features

* **Dashboard**: Overview of all hostels, owners, and financial summaries
* **Hostel Management**: Add, edit, or remove hostels
* **Owner Management**: Register and manage hostel owners
* **Reports & Analytics**: View hostel-wise profit/loss and occupancy
* **Role-based Access**: Secure access for admin and owners only

### 🏠 Hostel Owner Features

* **Dashboard**: Summary of income, expenses, students, and rooms
* **Room Management**: Add, edit, and track room occupancy
* **Student Management**: Manage student profiles, admissions, and ID proofs
* **Fee Management**: Record payments, track dues, and generate receipts
* **Expense Management**: Record daily hostel expenses with proof uploads
* **Reports**: Generate income vs. expense and occupancy reports
* **Notifications**: Receive alerts for pending fees and updates

### 📱 Global Features

* **Responsive Design**: Fully mobile-friendly using Tailwind CSS
* **Authentication**: JWT-based login for Admin and Owners
* **File Uploads**: Upload receipts, ID proofs, and documents
* **Real-time Data Updates**: Instant synchronization with backend
* **Charts & Graphs**: Visualize financial data using Recharts

---

## 🛠️ Technology Stack

| Category               | Technology                           |
| ---------------------- | ------------------------------------ |
| **Frontend**           | React 18, TypeScript, Tailwind CSS   |
| **Backend**            | Node.js (Express.js)                 |
| **Database**           | MySQL / PostgreSQL                   |
| **Authentication**     | JWT (JSON Web Token)                 |
| **API Communication**  | Axios                                |
| **Charts**             | Recharts                             |
| **Icons**              | Lucide React                         |
| **Forms & Validation** | Formik & Yup                         |
| **Storage**            | Firebase / AWS S3 (for file uploads) |

---

## 📦 Installation

### Prerequisites

* Node.js 20+
* npm or yarn package manager
* Database setup (MySQL / PostgreSQL)

### Setup Instructions

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd hostel-accounts-management
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**
   Create a `.env` file in the project root:

   ```
   REACT_APP_API_URL=http://localhost:8081/api
   REACT_APP_ENVIRONMENT=development
   ```

4. **Start the development server**

   ```bash
   npm start
   ```

5. **Open in browser**

   ```
   http://localhost:3000
   ```

---

## 🎯 Available Scripts

| Command         | Description                            |
| --------------- | -------------------------------------- |
| `npm start`     | Start the frontend in development mode |
| `npm run build` | Build for production                   |
| `npm test`      | Run available tests                    |
| `npm run eject` | Eject from CRA configuration           |

---

## 🏗️ Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Buttons, Cards, Inputs, Tables, etc.
│   ├── layout/         # Header, Sidebar, Layout wrapper
│   └── Charts/         # Financial visualization components
├── pages/               # Page-level components
│   ├── AdminDashboard.tsx
│   ├── OwnerDashboard.tsx
│   ├── HostelList.tsx
│   ├── AddHostelForm.tsx
│   ├── AddOwnerForm.tsx
│   ├── RoomManagement.tsx
│   ├── StudentManagement.tsx
│   ├── FeeManagement.tsx
│   ├── ExpenseManagement.tsx
│   └── ReportsDashboard.tsx
├── services/           # API and data services
│   └── api.ts
├── hooks/              # Custom React hooks
├── types/              # TypeScript definitions
│   └── index.ts
├── utils/              # Helper utilities
│   └── formatCurrency.ts
└── App.tsx             # Main application entry
```

---

## 🎨 Design System

### Colors

* **Primary**: Indigo / Blue for main actions
* **Secondary**: Gray for text and background
* **Success**: Green for payments and positive actions
* **Warning**: Yellow for pending items
* **Error**: Red for errors and alerts

### Components

* **Cards**: Rounded corners, shadow, gradient headers
* **Buttons**: Primary, secondary, and outline variants
* **Forms**: Clean layout with inline validation messages
* **Tables**: Paginated, sortable, and responsive
* **Charts**: Visual representation of financial trends

---

## 🔐 User Roles

### 👑 Admin

* Add and manage hostels
* Register and manage hostel owners
* View hostel-wide financial and operational reports

### 🏠 Hostel Owner

* Manage rooms and students
* Handle fees, expenses, and receipts
* Generate reports and summaries
* Maintain hostel operational data

---

## 📱 Responsive Design

The application is built with a **mobile-first** approach:

* **Mobile**: Collapsible menu and vertical layout
* **Tablet**: Two-column layout with sidebar
* **Desktop**: Full dashboard layout with persistent sidebar

---

## 🔌 API Integration

* **Base URL**: Configurable via `.env`
* **Authentication**: JWT-based login
* **Error Handling**: Centralized error feedback and toasts
* **Loading States**: Skeleton loaders and spinners for smooth UX
* **Data Security**: HTTPS and secure tokens for all API calls

---

## 📊 Reports & Analytics

* Hostel-wise income and expense tracking
* Student fee status report
* Monthly profit/loss chart
* Room occupancy analysis
* Export to PDF/Excel

---

## 🚀 Deployment

### Production Build

```bash
npm run build
```

### Docker Deployment

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`feature/new-module`)
3. Commit your changes
4. Submit a pull request

---

## 📄 License

This project is licensed under the **MIT License**.

---

## 🆘 Support

For support and queries:

* Check official documentation
* Contact the development team
* Raise issues in the GitHub repository

---

## 🔄 Version History

| Version    | Changes                                         |
| ---------- | ----------------------------------------------- |
| **v1.0.0** | Initial release with Admin and Owner modules    |
| **v1.1.0** | Added room, fee, and expense management         |
| **v1.2.0** | Enhanced reports and improved UI/UX             |
| **v1.3.0** | Added notifications and responsive optimization |

---

Built with ❤️ for efficient multi-hostel management.
