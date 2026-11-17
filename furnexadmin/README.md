# Ashirwad Furnex – Admin Panel (React + Tailwind)

## Run
1. `npm install`
2. `.env` me `VITE_API_ORIGIN=http://localhost:5000` (backend ka URL)
3. `npm run dev` -> http://localhost:5173

## Routes
/login, / (dashboard), /banners, /categories, /subcategories,
/products, /products/new, /products/:id/edit, /inquiries

## Backend me 2 changes zaroori
1. app.js: `helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } })`  (warna /uploads ki images admin panel me nahi dikhengi)
2. CORS origin `CLIENT_ORIGIN` admin panel ke URL se match karna chahiye.

## Agar kuch alag chale
- Login body / token keys: src/context/AuthContext.jsx
- Product ka FormData format: buildFormData() in src/pages/ProductForm.jsx
- Response se list nikalne ka logic: getList() in src/utils/helpers.js
