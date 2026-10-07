import { useEffect, useState } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import '../App.css'

const orderStatuses = ['PENDING', 'CONFIRMED', 'FULFILLED', 'CANCELLED']

function formatMoney(value) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(value) || 0)
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
  const [isAdmin, setIsAdmin] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [adminRole, setAdminRole] = useState('assistant')
  const [orders, setOrders] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loadedForUser, setLoadedForUser] = useState('')
  const [error, setError] = useState(isSupabaseConfigured ? '' : 'Configure Supabase before opening the admin dashboard.')
  const [busyOrder, setBusyOrder] = useState('')
  const [activePreview, setActivePreview] = useState(null)

  // Role Permissions Logic
  // Secretariat at Executive lamang ang may Delete Rights
  const canDeleteOrders = ['secretariat', 'executive', 'superadmin'].includes(adminRole)
  // Lahat maliban sa pure assistant view ay pwedeng mag-update at mag-view ng receipts
  const canUpdateStatus = ['admin', 'secretariat', 'executive', 'superadmin', 'finance', 'assistant'].includes(adminRole)
  const canViewReceipts = ['admin', 'secretariat', 'executive', 'superadmin', 'finance'].includes(adminRole)

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined

    let mounted = true
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (mounted) {
        setSession(nextSession)
        if (!nextSession) {
          setOrders([])
          setLoadedForUser('')
          setIsAdmin(false)
          setAdminRole('assistant')
        } else {
          await verifyAdminAccess(nextSession.user.id)
        }
      }
    })

    supabase.auth.getSession().then(async ({ data, error: sessionError }) => {
      if (!mounted) return
      if (sessionError) setError(sessionError.message)
      setSession(data.session)
      if (data.session) {
        await verifyAdminAccess(data.session.user.id)
      }
      setAuthLoading(false)
    })

    return () => {
      mounted = false
      listener?.subscription?.unsubscribe()
    }
  }, [])

  async function verifyAdminAccess(userId) {
    const { data, error: adminErr } = await supabase
      .from('store_admins')
      .select('user_id, role')
      .eq('user_id', userId)
      .maybeSingle()

    if (adminErr) {
      setIsAdmin(false)
      setError(`Could not verify admin access: ${adminErr.message}`)
    } else if (!data) {
      setIsAdmin(false)
      setError('Access denied: This Supabase account is not listed in store_admins.')
    } else {
      setIsAdmin(true)
      setAdminRole(data.role?.toLowerCase() || 'assistant')
      setError('')
    }
  }

  useEffect(() => {
    if (!session || !isAdmin) return

    let cancelled = false
    supabase
      .from('store_orders')
      .select(`
        id,
        reference_code,
        customer_name,
        college,
        email,
        phone,
        program,
        payment_method,
        payment_receipt_path,
        subtotal,
        discount_amount,
        total,
        status,
        created_at,
        store_order_items (
          id,
          product_sku,
          product_name,
          variant,
          design_name,
          size,
          quantity,
          unit_price,
          line_total,
          selections
        )
      `)
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
  }, [session, isAdmin])

  const ordersLoading = Boolean(session && isAdmin && loadedForUser !== session.user.id)

  async function signIn(event) {
    event.preventDefault()
    setError('')
    const formData = new FormData(event.currentTarget)
    const userInput = formData.get('usernameOrEmail')?.trim().toLowerCase()
    const passwordInput = formData.get('password')

    if (!userInput || !passwordInput) {
      setError('Please provide both your username/email and password.')
      return
    }

    const email = userInput.includes('@') ? userInput : `${userInput}@pointers.internal`

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: passwordInput,
    })
    if (signInError) {
      const isAuthDatabaseError = signInError.message.toLowerCase().includes('database error')
      setError(isAuthDatabaseError
        ? 'Supabase Auth could not query its database. This is an Auth/database configuration issue, not the store_admins username or role. Check Supabase Auth logs and the SQL checks in the README.'
        : `Sign in failed: ${signInError.message}`)
    }
  }

  async function signOut() {
    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) setError(`Sign out failed: ${signOutError.message}`)
  }

  async function updateStatus(orderId, status) {
    if (!canUpdateStatus) {
      setError('Permission denied: You do not have access to update status.')
      return
    }

    setBusyOrder(orderId)
    setError('')
    const { error: updateError } = await supabase
      .from('store_orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', orderId)

    if (updateError) {
      setError(`Could not update order status: ${updateError.message}`)
    } else {
      setOrders((current) => current.map((order) => order.id === orderId ? { ...order, status } : order))
    }
    setBusyOrder('')
  }

  async function deleteOrder(orderId, referenceCode) {
    if (!canDeleteOrders) {
      setError('Permission denied: Only Secretariat and Executive officers can delete orders.')
      return
    }

    const confirmed = window.confirm(`Are you sure you want to permanently delete order ${referenceCode}? This action cannot be undone.`)
    if (!confirmed) return

    setBusyOrder(orderId)
    setError('')

    try {
      const { error: itemsDeleteError } = await supabase
        .from('store_order_items')
        .delete()
        .eq('order_id', orderId)

      if (itemsDeleteError) {
        throw new Error(`Failed to delete order items: ${itemsDeleteError.message}`)
      }

      const { error: orderDeleteError } = await supabase
        .from('store_orders')
        .delete()
        .eq('id', orderId)

      if (orderDeleteError) {
        throw new Error(`Failed to delete order: ${orderDeleteError.message}`)
      }

      setOrders((current) => current.filter((order) => order.id !== orderId))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyOrder('')
    }
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

  // Filter orders by search query
  const filteredOrders = orders.filter((o) => {
    const q = searchQuery.toLowerCase()
    return (
      o.reference_code?.toLowerCase().includes(q) ||
      o.customer_name?.toLowerCase().includes(q) ||
      o.program?.toLowerCase().includes(q) ||
      o.email?.toLowerCase().includes(q)
    )
  })

  if (authLoading) return <main className="admin-page"><p>Checking admin session…</p></main>

  return (
    <main className="admin-page">
      <header className="admin-header">
        <a href="/" className="text-link">← STORE</a>
        <div>
          <span className="eyebrow">POINTERS // PRIVATE AREA</span>
          <h1>ORDER ADMIN ({adminRole.toUpperCase()})</h1>
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

      {!session || !isAdmin ? (
        <form className="admin-login checkout-form" onSubmit={signIn}>
          <h2>ADMIN SIGN IN</h2>
          <label>
            USERNAME / EMAIL
            <input
              name="usernameOrEmail"
              type="text"
              autoComplete="username"
              placeholder="username or email"
              required
            />
          </label>
          <label>
            PASSWORD
            <span className="admin-password-field">
              <input
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
              />
              <button
                className="admin-password-toggle"
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((visible) => !visible)}
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8" />
                    <path d="M9.9 5.2A10.8 10.8 0 0112 5c5 0 8.5 4.2 9.5 7-.4 1.2-1.2 2.4-2.2 3.4M6.2 6.2C4.3 7.5 3 9.4 2.5 12c1 2.8 4.5 7 9.5 7 1.1 0 2.1-.2 3-.6" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </span>
          </label>
          <button className="button-primary" type="submit" disabled={!isSupabaseConfigured}>
            SIGN IN
          </button>
        </form>
      ) : (
        <section className="admin-orders">
          <div className="admin-orders-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <h2>PRE-ORDERS</h2>
            <input
              type="text"
              placeholder="Search Name, Ref Code, Program..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #ccc', minWidth: '240px' }}
            />
            <span>{ordersLoading ? 'LOADING…' : `${filteredOrders.length} ORDERS`}</span>
          </div>

          {!ordersLoading && filteredOrders.length === 0 && <p>No matching orders found.</p>}

          {filteredOrders.map((order) => (
            <article className="admin-order" key={order.id}>
              <div className="admin-order-heading">
                <div>
                  <b>{order.reference_code}</b>
                  <span>{new Date(order.created_at).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {/* UPDATE STATUS */}
                  {canUpdateStatus ? (
                    <select
                      aria-label={`Status for ${order.reference_code}`}
                      disabled={busyOrder === order.id}
                      value={order.status ? order.status.toUpperCase() : 'PENDING'}
                      onChange={(event) => updateStatus(order.id, event.target.value)}
                    >
                      {orderStatuses.map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  ) : (
                    <span style={{ padding: '4px 8px', background: '#eee', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.85rem' }}>
                      {order.status || 'PENDING'}
                    </span>
                  )}

                  {/* DELETE ORDER: Secretariat and Executive */}
                  {canDeleteOrders && (
                    <button
                      className="button-secondary"
                      type="button"
                      disabled={busyOrder === order.id}
                      style={{ color: 'var(--color-error, #d9534f)', borderColor: 'var(--color-error, #d9534f)' }}
                      onClick={() => deleteOrder(order.id, order.reference_code)}
                    >
                      DELETE ORDER
                    </button>
                  )}
                </div>
              </div>

              <div className="admin-order-customer">
                <b>{order.customer_name}{order.college ? ` · ${order.college}` : ''}</b>
                <span>{order.email} · {order.phone}</span>
                <span>{order.program} · {order.payment_method}</span>
                
                {/* PAYMENT RECEIPT */}
                {canViewReceipts && order.payment_receipt_path && (
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
                {order.store_order_items?.map((item, idx) => {
                  const cleanProductName = item.product_name ? item.product_name.split('(')[0].trim() : ''

                  const getSubDetailsString = () => {
                    if (item.selections && Array.isArray(item.selections) && item.selections.length > 0) {
                      const isBundle = item.product_name?.toLowerCase().includes('bundle')
                      const selectionDetails = item.selections.map((sel) => {
                        const parts = []
                        const selectionValue = sel.design || sel.version || sel.variant
                        if (sel.name && selectionValue) parts.push(`${sel.name}: ${selectionValue}`)
                        else if (selectionValue) parts.push(selectionValue)
                        else if (sel.name) parts.push(sel.name)
                        if (sel.color) parts.push(`Color: ${sel.color}`)
                        if (sel.size) parts.push(`Size: ${sel.size}`)
                        return parts.join(' · ') || JSON.stringify(sel)
                      }).join(' / ')
                      const design = item.design_name || item.variant
                      return [
                        !isBundle && design ? `Version: ${design}` : null,
                        selectionDetails,
                      ].filter(Boolean).join(' · ')
                    }

                    const directParts = []
                    const designVal = item.design_name || (typeof item.variant === 'string' ? item.variant : item.variant?.design || item.variant?.version)
                    if (designVal) directParts.push(`Version: ${designVal}`)

                    const colorOrSizeVal = item.size || (typeof item.variant === 'object' ? item.variant?.color || item.variant?.size : null)
                    if (colorOrSizeVal) directParts.push(`Color/Size: ${colorOrSizeVal}`)

                    if (directParts.length > 0) return directParts.join(' · ')
                    return null
                  }

                  const subDetailsText = getSubDetailsString()

                  return (
                    <li key={item.id || idx}>
                      <div>
                        <span>{item.quantity} × {cleanProductName}</span>

                        <div className="admin-item-selections" style={{ marginTop: '4px', color: 'var(--color-text-muted, #666)' }}>
                          {subDetailsText && (
                            <small style={{ display: 'block' }}>{subDetailsText}</small>
                          )}

                          {item.selections && Array.isArray(item.selections) && item.selections.filter((s) => s.file_path).map((selection) => (
                            <button
                              key={selection.file_path}
                              className="button-secondary"
                              type="button"
                              style={{ display: 'block', marginTop: '4px', fontSize: '0.8rem' }}
                              onClick={() => openImagePreview('custom-designs', selection.file_path, `Custom Keychain Design (${selection.design || cleanProductName})`)}
                            >
                              VIEW CUSTOM KEYCHAIN IMAGE
                            </button>
                          ))}
                        </div>
                      </div>
                      <b>{formatMoney(item.line_total || item.unit_price * item.quantity)}</b>
                    </li>
                  )
                })}
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