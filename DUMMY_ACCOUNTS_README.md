# AgroMitra Dummy Accounts

This file contains dummy accounts created for testing the AgroMitra application.

## 📋 Account Details

### Account 1: John Farmer
- **Email**: john.farmer@example.com
- **Phone**: 1234567890
- **Password**: password123
- **Language**: English
- **Location**: Fresno, Fresno County, California
- **Soil Type**: Loamy
- **Farm Size**: 25.5 acres
- **Experience**: Intermediate

### Account 2: Maria Garcia
- **Email**: maria.garcia@example.com
- **Phone**: 9876543210
- **Password**: password123
- **Language**: Hindi
- **Location**: Amritsar, Punjab, India
- **Soil Type**: Clay
- **Farm Size**: 15 acres
- **Experience**: Beginner

### Account 3: Rajesh Kumar
- **Email**: rajesh.kumar@example.com
- **Phone**: 5555555555
- **Password**: password123
- **Language**: Telugu
- **Location**: Guntur, Andhra Pradesh, India
- **Soil Type**: Sandy
- **Farm Size**: 40 acres
- **Experience**: Expert

## 🔗 API Endpoints

- **Login**: `POST http://localhost:3001/api/auth/login`
- **Register**: `POST http://localhost:3001/api/auth/register`
- **Profile**: `GET http://localhost:3001/api/auth/profile` (requires Authorization header)

## 🧪 Testing

You can test these accounts by:

1. **Using the frontend**: Visit http://localhost:3000/login and use any of the email/password combinations above
2. **Using curl**: 
   ```bash
   curl -X POST "http://localhost:3001/api/auth/login" \
     -H "Content-Type: application/json" \
     -d '{"email": "john.farmer@example.com", "password": "password123"}'
   ```
3. **Using the test script**: Run `node test-accounts.js` to display all account information

## 📁 Files

- `dummy-accounts.json` - Complete account data with tokens
- `test-accounts.js` - Script to display account information
- `DUMMY_ACCOUNTS_README.md` - This documentation file

## ⚠️ Important Notes

- All accounts use the same password: `password123`
- Tokens expire after 7 days
- These are test accounts only - do not use in production
- Accounts are stored in the MongoDB database

## 🗑️ Cleanup

To remove these test accounts, you can:
1. Delete them from the MongoDB database
2. Or simply ignore them as they don't affect production data
