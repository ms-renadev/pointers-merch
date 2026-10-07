import { useEffect, useState } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import '../App.css'

const orderStatuses = ['pending', 'confirmed', 'fulfilled', 'cancelled']

function formatMoney(value) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(value))
}

function extractStoragePath(rawPath, bucketName) {
  if (!rawPath) return ''
  if (rawPath.startsWith('http')) {
    const parts = rawPath.split(`${bucketName}/`)
    return parts[1] || rawPath
  }
  return rawPath.replace(new RegExp(`^${bucketName}/`), '')
}

export default function Admin() {
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured)
  const [orders, setOrders] = useState([])
  const [loadedForUser, setLoadedForUser] = useState('')
  const [error, setError] = useState(isSupabaseConfigured ? '' : 'Configure Supabase before opening the admin dashboard.')
  const [busyOrder, setBusyOrder] = useState('')
  const [activePreview, setActivePreview] = useState(null)

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined

    let mounted = true
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) {
        setSession(nextSession)
        if (!nextSession) {
          setOrders([])
          setLoadedForUser('')
        }
      }
    })

    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!mounted) return
      if (sessionError) setError(sessionError.message)
      setSession(data.session)
      setAuthLoading(false)
    })

    return () => {
      mounted = false
      listener?.subscription?.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!session) return

    let cancelled = false
    supabase
      .from('store_orders')
      .select('id, reference_code, customer_name, college, email, phone, program, payment_method, payment_receipt_path, subtotal, discount_amount, total, status, created_at, store_order_items(product_sku, product_name, design_name, size, quantity, unit_price, line_total, selections)')
      .order('created_at', { ascending: false })
      .then(({ data, error: queryError }) => {
        if (cancelled) return
        if (queryError) {
          setError(`Could not load orders: ${queryError.message}`)
        } else {
          setOrders(data || [])
          setError('')
        }
        setLoadedForUser(session.user.id)
      })

    return () => { cancelled = true }
  }, [session])

  const ordersLoading = Boolean(session && loadedForUser !== session.user.id)

  async function signIn(event) {
    event.preventDefault()
    setError('')
    const formData = new FormData(event.currentTarget)
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: formData.get('email'),
      password: formData.get('password'),
    })
    if (signInError) setError(`Sign in failed: ${signInError.message}`)
  }

  async function signOut() {
    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) setError(`Sign out failed: ${signOutError.message}`)
  }

  async function updateStatus(orderId, status) {
    setBusyOrder(orderId)
    setError('')
    const { error: updateError } = await supabase.from('store_orders').update({ status }).eq('id', orderId)
    if (updateError) {
      setError(`Could not update order status: ${updateError.message}`)
    } else {
      setOrders((current) => current.map((order) => order.id === orderId ? { ...order, status } : order))
    }
    setBusyOrder('')
  }

  async function openImagePreview(bucketName, rawPath, title) {
    try {
      const cleanPath = extractStoragePath(rawPath, bucketName)
      
      const { data, error: urlError } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(cleanPath, 3600)

      if (urlError) {
        const { data: publicData } = supabase.storage.from(bucketName).getPublicUrl(cleanPath)
        if (publicData?.publicUrl) {
          setActivePreview({ url: publicData.publicUrl, title })
          return
        }
        throw urlError
      }

      setActivePreview({ url: data.signedUrl, title })
    } catch (err) {
      setError(`Could not view file (${title}): ${err.message}`)
    }
  }

  if (authLoading) return <main className="admin-page"><p>Checking admin session…</p></main>

  return (
    <main className="admin-page">
      <header className="admin-header">
        <a href="/" className="text-link">← STORE</a>
        <div>
          <span className="eyebrow">POINTERS // PRIVATE AREA</span>
          <h1>ORDER ADMIN</h1>
        </div>
        {session && <button className="button-secondary" type="button" onClick={signOut}>SIGN OUT</button>}
      </header>

      {error && <p className="form-error" role="alert">{error}</p>}

      {activePreview && (
        <div className="admin-modal-overlay" onClick={() => setActivePreview(null)}>
          <div className="admin-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>{activePreview.title}</h3>
              <button className="button-secondary" onClick={() => setActivePreview(null)}>CLOSE</button>
            </div>
            <div className="admin-modal-body">
              <img src={activePreview.url} alt={activePreview.title} style={{ maxWidth: '100%', maxHeight: '75vh', objectFit: 'contain' }} />
            </div>
            <a href={activePreview.url} target="_blank" rel="noreferrer" className="text-link" style={{ marginTop: '10px', display: 'inline-block' }}>
              Open image in new tab
            </a>
          </div>
        </div>
      )}

      {!session ? (
        <form className="admin-login checkout-form" onSubmit={signIn}>
          <h2>ADMIN SIGN IN</h2>
          <label>
            EMAIL ADDRESS
            <input name="email" type="email" autoComplete="username" required placeholder="admin@cics-pointers.org" />
          </label>
          <label>
            PASSWORD
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
          <button className="button-primary" type="submit" disabled={!isSupabaseConfigured}>
            SIGN IN
          </button>
        </form>
      ) : (
        <section className="admin-orders">
          <div className="admin-orders-title">
            <h2>PRE-ORDERS</h2>
            <span>{ordersLoading ? 'LOADING…' : `${orders.length} ORDERS`}</span>
          </div>

          {!ordersLoading && orders.length === 0 && <p>No orders found.</p>}

          {orders.map((order) => (
            <article className="admin-order" key={order.id}>
              <div className="admin-order-heading">
                <div>
                  <b>{order.reference_code}</b>
                  <span>{new Date(order.created_at).toLocaleString()}</span>
                </div>
                <select
                  aria-label={`Status for ${order.reference_code}`}
                  disabled={busyOrder === order.id}
                  value={order.status}
                  onChange={(event) => updateStatus(order.id, event.target.value)}
                >
                  {orderStatuses.map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </div>

              <div className="admin-order-customer">
                <b>{order.customer_name}{order.college ? ` · ${order.college}` : ''}</b>
                <span>{order.email} · {order.phone}</span>
                <span>{order.program} · {order.payment_method}</span>
                
                {order.payment_receipt_path && (
                  <button
                    className="button-secondary"
                    type="button"
                    style={{ marginTop: '8px' }}
                    onClick={() => openImagePreview('payment-proofs', order.payment_receipt_path, `GCash Receipt: ${order.reference_code}`)}
                  >
                    VIEW PAYMENT RECEIPT
                  </button>
                )}
              </div>

              <ul>
                {order.store_order_items?.map((item, idx) => (
                  <li key={item.product_sku ? `${item.product_sku}-${idx}` : idx}>
                    <span>
                      {item.quantity} × {item.product_name}
                      {item.size ? ` · ${item.size}` : ''}
                      
                      {item.selections?.length > 0 && (
                        <div className="admin-item-selections" style={{ marginTop: '4px' }}>
                          <small>
                            {item.selections.map((selection) => 
                              `${selection.name || 'Custom'}: ${selection.design || ''}${selection.color ? ` · Color: ${selection.color}` : ''}${selection.size ? ` · Size ${selection.size}` : ''}`
                            ).join(' / ')}
                          </small>

                          {item.selections.filter((s) => s.file_path).map((selection) => (
                            <button
                              key={selection.file_path}
                              className="button-secondary"
                              type="button"
                              style={{ display: 'block', marginTop: '4px', fontSize: '0.8rem' }}
                              onClick={() => openImagePreview('custom-designs', selection.file_path, `Custom Keychain Design (${selection.design || item.product_name})`)}
                            >
                              VIEW CUSTOM KEYCHAIN IMAGE
                            </button>
                          ))}
                        </div>
                      )}
                    </span>
                    <b>{formatMoney(item.line_total)}</b>
                  </li>
                ))}
              </ul>

              <div className="admin-order-total">
                <span>Subtotal {formatMoney(order.subtotal)} · Discount −{formatMoney(order.discount_amount)}</span>
                <b>Total {formatMoney(order.total)}</b>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  )
}