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

async function downloadSummary(paymentSummary, activeOrders, orderTotal, cancelledOrders, productSummary) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 40
  const right = pageWidth - margin
  const formatPdfMoney = (value) => `PHP ${(Number(value) || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
  let y = 48

  const addPageIfNeeded = (height) => {
    if (y + height > pageHeight - 48) {
      doc.addPage()
      y = 44
      return true
    }
    return false
  }
  const drawItemTableHeader = () => {
    doc.setFillColor(247, 243, 245)
    doc.rect(margin, y - 13, right - margin, 22, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(55, 42, 47)
    doc.text('PRODUCT', margin + 8, y)
    doc.text('SKU', 300, y)
    doc.text('UNITS', 405, y, { align: 'right' })
    doc.text('ORDERS', right - 8, y, { align: 'right' })
    y += 22
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(178, 28, 104)
  doc.text('POINTERS MERCH ORDER SUMMARY', margin, y)
  y += 18
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(100, 85, 91)
  doc.text(`Generated ${new Date().toLocaleString()}`, margin, y)
  y += 22
  doc.setFontSize(8)
  doc.text('All loaded orders are included. Cancelled orders are excluded from active totals.', margin, y)
  y += 12
  doc.text('Payment amounts are order totals by selected method, not verified payments received.', margin, y)
  y += 24

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(55, 42, 47)
  doc.text('PAYMENT SUMMARY', margin, y)
  y += 14
  doc.setFontSize(9)
  doc.text('PAYMENT METHOD', margin + 8, y)
  doc.text('ORDERS', 400, y, { align: 'right' })
  doc.text('ORDER TOTAL', right - 8, y, { align: 'right' })
  y += 8

  paymentSummary.forEach(({ method, orderCount, total }) => {
    doc.setDrawColor(230, 225, 228)
    doc.line(margin, y, right, y)
    y += 15
    doc.setFont('helvetica', 'normal')
    doc.text(method, margin + 8, y)
    doc.text(String(orderCount), 400, y, { align: 'right' })
    doc.text(formatPdfMoney(total), right - 8, y, { align: 'right' })
    y += 8
  })

  const cancelledTotal = cancelledOrders.reduce((sum, order) => sum + (Number(order.total) || 0), 0)
  doc.setFillColor(247, 243, 245)
  doc.rect(margin, y, right - margin, 34, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(55, 42, 47)
  doc.text(`OVERALL ORDER TOTAL (${activeOrders.length} orders)`, margin + 8, y + 14)
  doc.setTextColor(178, 28, 104)
  doc.text(formatPdfMoney(orderTotal), right - 8, y + 14, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(100, 85, 91)
  doc.text(`Cancelled and excluded: ${cancelledOrders.length} orders · ${formatPdfMoney(cancelledTotal)}`, margin + 8, y + 27)
  y += 52

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(55, 42, 47)
  doc.text('ITEMS ORDERED', margin, y)
  y += 16
  drawItemTableHeader()

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  productSummary.forEach(({ name, sku, quantity, orderCount }) => {
    const productLines = doc.splitTextToSize(name, 220)
    const rowHeight = Math.max(22, productLines.length * 10 + 10)
    if (addPageIfNeeded(rowHeight + 4)) drawItemTableHeader()
    doc.setTextColor(55, 42, 47)
    doc.text(productLines, margin + 8, y + 2)
    doc.text(String(sku), 300, y + 2)
    doc.text(String(quantity), 405, y + 2, { align: 'right' })
    doc.text(String(orderCount), right - 8, y + 2, { align: 'right' })
    y += rowHeight
    doc.setDrawColor(230, 225, 228)
    doc.line(margin, y - 2, right, y - 2)
  })

  const pageCount = doc.getNumberOfPages()
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(130, 115, 121)
    doc.text(`Page ${page} of ${pageCount}`, right, pageHeight - 20, { align: 'right' })
  }

  doc.save(`pointers-order-summary-${new Date().toISOString().slice(0, 10)}.pdf`)
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

  const activeOrders = orders.filter((order) => order.status?.toLowerCase() !== 'cancelled')
  const cancelledOrders = orders.filter((order) => order.status?.toLowerCase() === 'cancelled')
  const paymentSummary = ['GCash', 'Cash over the counter'].map((method) => {
    const methodOrders = activeOrders.filter((order) => order.payment_method === method)
    return {
      method,
      orderCount: methodOrders.length,
      total: methodOrders.reduce((sum, order) => sum + (Number(order.total) || 0), 0),
    }
  })
  const orderTotal = activeOrders.reduce((sum, order) => sum + (Number(order.total) || 0), 0)
  const productSummaryBySku = new Map()

  activeOrders.forEach((order) => {
    const seenSkus = new Set()
    order.store_order_items?.forEach((item) => {
      const sku = item.product_sku || item.product_name || 'Unknown item'
      const product = productSummaryBySku.get(sku) || {
        sku,
        name: item.product_name ? item.product_name.split('(')[0].trim() : 'Unknown item',
        quantity: 0,
        orderCount: 0,
      }
      product.quantity += Number(item.quantity) || 0
      if (!seenSkus.has(sku)) {
        product.orderCount += 1
        seenSkus.add(sku)
      }
      productSummaryBySku.set(sku, product)
    })
  })
  const productSummary = [...productSummaryBySku.values()].sort((a, b) => a.name.localeCompare(b.name))

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
          <div className="admin-summary-header">
            <div>
              <span className="eyebrow">ORDER REPORT</span>
              <h2>ORDER SUMMARY</h2>
            </div>
            <button
              className="button-primary"
              type="button"
              onClick={async () => {
                setError('')
                try {
                  await downloadSummary(paymentSummary, activeOrders, orderTotal, cancelledOrders, productSummary)
                } catch (downloadError) {
                  setError(`Could not download order summary: ${downloadError.message}`)
                }
              }}
              disabled={ordersLoading || orders.length === 0}
            >
              DOWNLOAD SUMMARY PDF
            </button>
          </div>

          <div className="admin-summary-grid">
            {paymentSummary.map(({ method, orderCount, total }) => (
              <article className="admin-summary-card" key={method}>
                <span>{method.toUpperCase()}</span>
                <b>{formatMoney(total)}</b>
                <small>{orderCount} {orderCount === 1 ? 'ORDER' : 'ORDERS'} · excludes cancelled</small>
              </article>
            ))}
            <article className="admin-summary-card admin-summary-total">
              <span>OVERALL ORDER TOTAL</span>
              <b>{formatMoney(orderTotal)}</b>
              <small>{activeOrders.length} active {activeOrders.length === 1 ? 'order' : 'orders'}</small>
            </article>
          </div>

          <p className="admin-summary-note">
            These amounts are based on each order’s selected payment method; they do not confirm that payment was received.
            Cancelled orders are excluded from totals and listed separately in the download.
          </p>

          <div className="admin-product-summary">
            <h3>ITEMS ORDERED</h3>
            {productSummary.length === 0 ? (
              <p>{ordersLoading ? 'Loading item summary…' : 'No item orders to summarize.'}</p>
            ) : (
              <div className="admin-product-summary-list">
                {productSummary.map(({ sku, name, quantity, orderCount }) => (
                  <div className="admin-product-summary-row" key={sku}>
                    <b>{name}</b>
                    <span>{quantity} {quantity === 1 ? 'unit' : 'units'} · {orderCount} {orderCount === 1 ? 'order' : 'orders'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="admin-orders-title">
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