# Viral Bank Banking

A full-stack banking application that allows users to register, log in, manage accounts, view transactions, open fixed deposits, transfer money, and more. The project includes both a Node.js/Express backend and a React/Vanilla JS frontend.

## Features
- User registration and login using Customer ID
- Automatic account number assignment
- Checking account, credit card, and fixed deposit management
- Real-time FD maturity calculation with interest brackets
- Money transfer between accounts
- Transaction history and account summary
- Modern React frontend and a simple Vanilla JS/HTML frontend
- SQLite database for persistent storage

## Project Structure
```
banking-application/
  backend/         # Node.js/Express backend
  frontend/        # React and Vanilla JS frontend
  looks.json       # (Project-specific config)
  .gitignore       # Git ignore rules
  README.md        # Project documentation
```

## Getting Started

### Prerequisites
- Node.js (v14+ recommended)
- npm (comes with Node.js)

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the backend server:
   ```bash
   node app.js
   ```
   The backend will run on `http://localhost:3001` by default.

### Frontend Setup
#### React App
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the React development server:
   ```bash
   npm start
   ```
   The frontend will run on `http://localhost:3000` by default.

#### Vanilla JS/HTML App
- Open `frontend/public/index.html` directly in your browser for a simple version of the app.

## Database
- The backend uses SQLite databases (`users.db`, `accounts.db`, `transactions.db`, `creditcards.db`, `fixeddeposits.db`, `bank.db`) stored in the `backend/` directory.
- No manual setup is required; the backend will initialize the databases if they do not exist.

## Usage
- Register a new user with a unique Customer ID.
- Log in using your Customer ID and password.
- View account summaries, open fixed deposits, and manage credit cards.
- Transfer money between accounts and view transaction history.

## Contributing
1. Fork the repository
2. Create a new branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

## License
This project is for educational purposes.