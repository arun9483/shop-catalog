export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
}

export const formatPrice = (price: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(price);
