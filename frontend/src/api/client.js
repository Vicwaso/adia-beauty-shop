import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

export const api = axios.create({ baseURL: BASE_URL });

export const getCategories = () => api.get("/products/categories/").then(r => r.data);

export const getProducts = (params = {}) =>
  api.get("/products/", { params }).then(r => r.data);

export const getProduct = (slug) =>
  api.get(`/products/${slug}/`).then(r => r.data);

export const createOrder = (payload) =>
  api.post("/orders/", payload).then(r => r.data);

export const getOrder = (id) =>
  api.get(`/orders/${id}/`).then(r => r.data);

export const initiateStkPush = (payload) =>
  api.post("/payments/stk-push/", payload).then(r => r.data);
