import React from 'react';
import ProductsList from './ProductsList'; // Import the component

export default function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <h1 className="text-2xl font-bold mb-4">Merch Products</h1>
      
      {/* Display the component here */}
      <ProductsList />
    </div>
  );
}