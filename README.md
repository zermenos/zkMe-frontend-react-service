# zkMe Wallet KYC & MeID Integration

This project is a simple React frontend that integrates zkMe's KYC (zkKYC) and Identity (MeID) verification flows.  
It allows users to:

- Connect their MetaMask wallet
- Start MeID verification
- Start KYC verification
- See success or failure messages after completing verification

---

## Installation

```bash
git clone <your-repo-url>
cd <project-folder>
npm install
```

---

## Running the Project

```bash
npm run dev
```

The app will be available at [http://localhost:5173].

---

## Configuration

Go to `src/App.jsx` and update these fields with your own zkMe credentials:

```javascript
new ZkMeWidget(
  'your-mchNo',     // Replace with your Merchant No
  'your-app-name',  // Your App Name
  '0x61',           // Your chain ID (HEX)
  provider,
  {
    lv: 'zkKYC' or 'MeID',  // Choose verification level
    programNo: 'your-program-id',
    theme: 'dark',
    locale: 'en',
  }
)
```

# Backend API

Make sure you have a working backend endpoint that issues zkMe access tokens at:

```
https://nest-api.zk.me/api/token/get
```

(This is required for proper authentication.)

---

# Folder Structure

```bash
src/
  ├── components/
  ├── App.jsx
  ├── index.css
  └── main.jsx

public/
  └── index.html

package.json
vite.config.js
README.md
```

---

# Important Notes

- `node_modules/` folder is excluded from the zip.
- After unzipping, run `npm install` before running the project.
- This project requires MetaMask extension to connect the wallet.
- Always replace test API keys with production keys before deploying.

---

# License

This project is provided for integration demonstration purposes.
