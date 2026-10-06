// src/components/ProductList.jsx
import React, { useEffect, useState } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

export default function ProductList() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function fetchProducts() {
      if (!isSupabaseConfigured) {
        setError('Supabase is not configured.')
        setLoading(false)
        return
      }
      const { data, error: queryError } = await supabase
        .from('store_products')
        .select('sku, name, price, category')
        .eq('is_active', true)
        .order('sort_order')

      if (cancelled) return
      if (queryError) setError(queryError.message)
      else setProducts(data)
      setLoading(false)
    }

    fetchProducts()
    return () => { cancelled = true }
  }, [])

  if (loading) return <div className="p-4">Loading products...</div>
  if (error) return <div className="p-4" role="alert">Could not load products: {error}</div>

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Product Catalog</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {products.map((item) => (
          <div key={item.sku} className="p-4 border rounded-xl">
            <h3 className="font-bold text-lg">{item.name}</h3>
            <p className="font-semibold">₱{Number(item.price).toFixed(2)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}