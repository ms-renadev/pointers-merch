// src/components/ProductList.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient'; // Import gikan sa src/supabaseClient.js

export default function ProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProducts() {
      try {
        // Query ang 'products' table sa Supabase
        const { data, error } = await supabase.from('products').select('*');
        
        if (error) {
          console.error('Error fetching products:', error);
        } else {
          setProducts(data);
        }
      } catch (err) {
        console.error('Unexpected error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, []);

  if (loading) return <div className="text-white p-4">Loading products...</div>;

  return (
    <div className="p-4 text-white">
      <h2 className="text-xl font-bold mb-4">Product Catalog</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {products.map((item) => (
          <div key={item.id} className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
            <h3 className="font-bold text-lg">{item.name}</h3>
            <p className="text-indigo-400 font-semibold">₱{item.price}</p>
          </div>
        ))}
      </div>
    </div>
  );
}