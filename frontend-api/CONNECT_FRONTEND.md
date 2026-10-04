# Connecting your React pages

Replace `import { products, categories } from "./products"` with API calls.

## FeaturedProducts.jsx / AllProducts.jsx
```jsx
import { useEffect, useState } from "react";
import { api } from "./api";

const [products, setProducts] = useState([]);
useEffect(() => {
  api.getProducts().then((d) => setProducts(d.products)).catch(console.error);
}, []);
```
Your existing client-side filter/sort code keeps working on this array.
Compute MIN_PRICE / MAX_PRICE inside a useMemo after the data loads.

## ProductDetails.jsx
```jsx
const [data, setData] = useState(null);
useEffect(() => { api.getProduct(id).then(setData).catch(() => setData(false)); }, [id]);
// data.product -> the product, data.related -> the 5 suggestions
```

## Images
`product.image` / `product.images` are full Supabase URLs, so the `import product1 from "./1.png"` lines are not needed.
Upload images through the admin API (POST /api/products, field "images").

## Categories
`api.getCategories()` -> [{ key, label, count }] (replaces `categories` + `countIn`).
