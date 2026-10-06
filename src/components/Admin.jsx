import { useEffect, useState } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import '../App.css'

const orderStatuses = ['pending', 'confirmed', 'fulfilled', 'cancelled']

function formatMoney(value) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(value))
}

export default function Admin() {
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured)
  const [orders, setOrders] = useState([])
  const [loadedForUser, setLoadedForUser] = useState('')
  const [error, setError] = useState(isSupabaseConfigured ? '' : 'Configure Supabase before opening the admin dashboard.')
  const [busyOrder, setBusyOrder] = useState('')

  // Subskripsyon sa Auth state changes at pagkuha ng active session
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

  // Pag-fetch ng orders kapag naka-log in ang admin session
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

  async function viewPaymentProof(path) {
    const proofWindow = window.open('about:blank', '_blank')
    if (!proofWindow) {
      setError('Allow pop-ups to view the private payment receipt.')
      return
    }

    const { data, error: proofError } = await supabase.storage
      .from('payment-proofs')
      .createSignedUrl(path, 300)
    if (proofError) {
      proofWindow.close()
      setError(`Could not open the payment receipt: ${proofError.message}`)
      return
    }

    proofWindow.location.href = data.signedUrl
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
          <p>Only accounts explicitly added to the store admin list can view student order details.</p>
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
                    onClick={() => viewPaymentProof(order.payment_receipt_path)}
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
                        <small>
                          {item.selections.map((selection) => `${selection.name}: ${selection.design}${selection.size ? ` · Size ${selection.size}` : ''}`).join(' / ')}
                        </small>
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