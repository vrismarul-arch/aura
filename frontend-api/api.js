// Put this file in your React src/ folder.
// .env in the React project:  VITE_API_URL=http://localhost:5000/api
const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const token = () => localStorage.getItem("token");

async function request(path, { method = "GET", body, auth = false } = {}) {
  const headers = {};
  if (body) headers["Content-Type"] = "application/json";
  if (auth && token()) headers.Authorization = `Bearer ${token()}`;

  const res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}

export const api = {
  // products
  getProducts: (query = "") => request(`/products${query ? "?" + query : ""}`), // -> { products, total }
  getProduct: (id) => request(`/products/${id}`), // -> { product, related }
  getCategories: () => request("/products/categories"),

  // auth
  register: (b) => request("/auth/register", { method: "POST", body: b }),
  login: (b) => request("/auth/login", { method: "POST", body: b }),
  me: () => request("/auth/me", { auth: true }),

  // wishlist / cart (logged-in users)
  getWishlist: () => request("/me/wishlist", { auth: true }),
  toggleWishlist: (id) => request(`/me/wishlist/${id}`, { method: "POST", auth: true }),
  getCart: () => request("/me/cart", { auth: true }),
  addToCart: (productId, qty = 1) => request("/me/cart", { method: "POST", auth: true, body: { productId, qty } }),
  updateCart: (id, qty) => request(`/me/cart/${id}`, { method: "PUT", auth: true, body: { qty } }),
  removeFromCart: (id) => request(`/me/cart/${id}`, { method: "DELETE", auth: true }),

  // orders
  placeOrder: (b) => request("/orders", { method: "POST", auth: true, body: b }),
  myOrders: () => request("/orders/mine", { auth: true }),
};
