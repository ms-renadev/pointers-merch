import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import { normalizeCatalog, PRODUCT_FALLBACK } from './data/products'
import Admin from './components/Admin'
import {DispatchCountdown} from './components/DispatchCountdown'
import FaqSection from './components/FaqSection'
const productImageFiles = import.meta.glob(
  './assets/*.{avif,gif,jpg,jpeg,png,webp}',
  { eager: true, query: '?url', import: 'default' },
)
const productImages = Object.fromEntries(
  Object.entries(productImageFiles).map(([path, url]) => [
    path.split('/').pop().replace(/\.[^.]+$/, ''),
    url,
  ]),
)

const money = (amount) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount)

function Icon({ children, className = '' }) {
  return <span aria-hidden="true" className={`material-symbols-outlined ${className}`}>{children}</span>
}

function Header({ itemCount, total, onSearch, onCart }) {
  return (
    <header className="site-header">
      <div className="system-bar">
        <div className="system-bar-inner">
          <span><i className="status-dot" /> MSU-MARAWI · COLLEGE OF INFORMATION &amp; COMPUTING SCIENCES · POINTERS 2026-2027</span>
          <span className="system-status"> <b>BATCH_01</b></span>
        </div>
      </div>
      <div className="navigation">
        <a className="brand" href="#top" aria-label="Pointers official store home">
          <span className="brand-mark"><img src={productImages.logo} alt="" /></span>
          <span className="brand-copy">
            <span className="brand-title">POINTERS <b>OFFICIAL STORE</b></span>
            <span className="brand-subtitle">POINTERS COMPUTING SOCIETY // MSU-MARAWI CICS</span>
          </span>
        </a>
        <div className="nav-actions">
          <span className="batch-pill"><i className="status-dot" /> PRE-ORDERS OPEN</span>
          <button className="search-trigger" type="button" onClick={onSearch}><Icon>search</Icon><span>SEARCH_SPEC...</span><kbd>⌘K</kbd></button>
          <button className="cart-trigger" type="button" onClick={onCart}>
            <Icon>shopping_bag</Icon><span>CART</span><b>{String(itemCount).padStart(2, '0')}</b><strong>{money(total)}</strong>
          </button>
        </div>
      </div>
    </header>
  )
}

function ProductCard({ product, catalog, addToCart }) {
  const designs = Array.isArray(product.designs) ? product.designs : []
  const sizes = Array.isArray(product.sizes) ? product.sizes : []
  const [selectedDesign, setSelectedDesign] = useState(designs[0]?.name ?? '')
  const [selectedColor, setSelectedColor] = useState('Beige')
  const [customDesignFile, setCustomDesignFile] = useState(null)
  const [size, setSize] = useState(sizes.includes('M') ? 'M' : sizes[0] ?? '')
  const [bundleSelections, setBundleSelections] = useState(() =>
    Object.fromEntries((product.bundleItems ?? []).map((component) => {
      const includedProduct = catalog.find((item) => item.sku === component.sku)
      return [component.sku, includedProduct?.designs?.[0]?.name ?? '']
    })),
  )
  const [bundleColors, setBundleColors] = useState(() =>
    Object.fromEntries((product.bundleItems ?? []).map((component) => [component.sku, 'Beige'])),
  )
  const design = designs.find((item) => item.name === selectedDesign) ?? designs[0]
  const image = productImages[design?.imagePath]
    || (product.type === 'bundle' ? productImages['pointers cover page'] : null)
  const selectedBundleComponents = product.type === 'bundle'
    ? (product.bundleItems ?? []).map((component) => {
      const includedProduct = catalog.find((item) => item.sku === component.sku)
      const selectedComponentDesign = bundleSelections[component.sku]
        || includedProduct?.designs?.[0]?.name
        || ''
      const componentDesign = includedProduct?.designs?.find((item) => item.name === selectedComponentDesign)
      return {
        sku: component.sku,
        label: component.label,
        design: selectedComponentDesign,
        size: component.sku === 'PTR-TEE-01' ? size : null,
        color: component.sku === 'PTR-PIN-04' ? bundleColors[component.sku] : null,
        display: `${component.label}: ${componentDesign?.label ?? componentDesign?.name ?? selectedComponentDesign}${component.sku === 'PTR-PIN-04' ? ` · ${bundleColors[component.sku]}` : ''}${component.sku === 'PTR-TEE-01' ? ` · Size ${size}` : ''}`,
      }
    })
    : []
  const bundleVariant = selectedBundleComponents.map((component) => component.display).join(' / ')
  const isKeychain = product.sku === 'PTR-KEY-03'
  const isPin = product.sku === 'PTR-PIN-04'
  const isCustomDesign = isKeychain && selectedDesign === 'Custom design'
  const addSelectedProduct = () => {
    if (isCustomDesign && !customDesignFile) return
    const options = isPin
      ? [{ name: 'Color', design: selectedColor }]
      : isCustomDesign
        ? [{ name: 'Custom design file', design: customDesignFile.name, file: customDesignFile }]
        : []
    addToCart(
      product,
      product.type === 'bundle' ? bundleVariant : selectedDesign || 'Standard',
      product.type === 'bundle' ? null : size,
      product.type === 'bundle' ? selectedBundleComponents : [],
      options,
    )
  }

  return (
    <article className={`product-card ${product.type === 'bundle' ? 'bundle-product-card' : ''}`}>
      <div className="product-details">
        <div className="product-meta"><span>[SKU: {product.sku}]</span><b>{product.meta}</b></div>
        <div className={`product-photo ${image ? '' : 'product-photo-placeholder'}`}>
          {image
            ? <img src={image} alt={`${product.name}${design ? ` — ${design.label ?? design.name}` : ''}`} loading="lazy" />
            : <div className="image-placeholder"><span>{product.type === 'bundle' ? 'BUNDLE' : product.sku}</span><Icon>{product.type === 'bundle' ? 'inventory_2' : 'image'}</Icon><small>ADD YOUR PRODUCT IMAGE</small></div>}
          {designs.length > 1 && <span className="photo-caption">{design?.label ?? design?.name}</span>}
        </div>
        <h3>{product.name}</h3>
        <p className="product-description">{product.description}</p>
        {Array.isArray(product.bundleItems) && product.bundleItems.length > 0 && (
          <div className="bundle-component-options">
            <b className="bundle-options-heading">INCLUDED ITEMS · CHOOSE EACH DESIGN</b>
            {product.bundleItems.map((component) => {
              const includedProduct = catalog.find((item) => item.sku === component.sku)
              const componentDesigns = (includedProduct?.designs ?? [])
                .filter((item) => component.sku !== 'PTR-KEY-03' || item.name !== 'Custom design')
              return (
                <label className="field-label bundle-component-field" key={component.sku}>
                  {component.label.toUpperCase()}
                  <select
                    value={bundleSelections[component.sku] || componentDesigns[0]?.name || ''}
                    onChange={(event) => setBundleSelections((current) => ({
                      ...current,
                      [component.sku]: event.target.value,
                    }))}
                  >
                    {componentDesigns.map((item) => (
                      <option key={item.name} value={item.name}>{item.label ?? item.name}</option>
                    ))}
                  </select>
                  {component.sku === 'PTR-PIN-04' && (
                    <select
                      aria-label={`${component.label} color`}
                      value={bundleColors[component.sku] ?? 'Beige'}
                      onChange={(event) => setBundleColors((current) => ({
                        ...current,
                        [component.sku]: event.target.value,
                      }))}
                    >
                      <option value="Beige">Beige</option>
                      <option value="Magenta">Magenta</option>
                    </select>
                  )}
                </label>
              )
            })}
          </div>
        )}
        {product.type !== 'bundle' && designs.length > 0 && (
          <label className="field-label">{product.type === 'bundle' ? 'TEE & LANYARD DESIGN' : 'DESIGN'}
            <select value={selectedDesign} onChange={(event) => setSelectedDesign(event.target.value)}>
              {designs.map((item) => <option key={item.name} value={item.name}>{item.label ?? item.name}</option>)}
            </select>
          </label>
        )}
        {sizes.length > 0 && (
          <label className="field-label">{product.type === 'bundle' ? 'INCLUDED T-SHIRT SIZE' : 'SIZE'}
            <select value={size} onChange={(event) => setSize(event.target.value)}>
              {sizes.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
        )}
        {isPin && (
          <label className="field-label">BADGE COLOR
            <select value={selectedColor} onChange={(event) => setSelectedColor(event.target.value)}>
              <option value="Beige">Beige</option>
              <option value="Magenta">Magenta</option>
            </select>
          </label>
        )}
        {isCustomDesign && (
          <label className="field-label custom-design-upload">UPLOAD YOUR DESIGN *
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(event) => setCustomDesignFile(event.target.files?.[0] ?? null)}
            />
            <small>JPG, PNG, WebP, or PDF · Maximum 5 MB{customDesignFile ? ` · ${customDesignFile.name}` : ''}</small>
          </label>
        )}
      </div>
      <div className="product-buy">
        <div><strong>{money(product.price)}</strong>{product.compareAtPrice > product.price && <span className="old-price">{money(product.compareAtPrice)}</span>}<span>{product.type === 'bundle' ? 'PRICE PER SET' : 'PRICE PER ITEM'}</span></div>
        <button
          className="button-primary button-small"
          type="button"
          onClick={addSelectedProduct}
          disabled={isCustomDesign && !customDesignFile}
        >
         ADD TO CART
        </button>
      </div>
    </article>
  )
}

function Cart({ cart, subtotal, onQuantity, onRemove, onCheckout }) {
  const count = cart.reduce((sum, item) => sum + item.qty, 0)
  return (
    <aside className="cart-column" id="cart">
      <div className="cart-panel">
        <div className="cart-heading"><span><Icon>terminal</Icon> LEDGER</span><b>{count} {count === 1 ? 'ITEM' : 'ITEMS'}</b></div>
        <div className="cart-items">
          {cart.length === 0 ? <div className="cart-empty">[LEDGER_EMPTY]<br />NO SPECIFICATIONS ALLOCATED YET.</div> : cart.map((item) => (
            <div className="cart-item" key={item.id}>
              <div className="cart-item-info">
                <b>{item.title}</b>
                {item.components?.length
                  ? <ul className="cart-component-selections">{item.components.map((component) => <li key={component.sku}>{component.display}</li>)}</ul>
                  : <span>{item.variant}{item.size ? ` · Size ${item.size}` : ''}</span>}
              {item.options?.map((option, index) => (
                <span key={`${option.name}-${index}`}>{option.name}: {option.design}</span>
              ))}
              <span>{money(item.price)} each</span>
            </div>
            <div className="cart-item-controls">
              <button type="button" aria-label={`Remove one ${item.title}`} onClick={() => onQuantity(item.id, -1)}>−</button>
              <b>{item.qty}</b>
              <button type="button" aria-label={`Add one ${item.title}`} disabled={item.qty >= 20} onClick={() => onQuantity(item.id, 1)}>+</button>
              <strong>{money(item.price * item.qty)}</strong>
              <button className="remove-item" type="button" aria-label={`Remove ${item.title}`} onClick={() => onRemove(item.id)}><Icon>delete</Icon></button>
            </div>
            </div>
          ))}
        </div>
        <div className="cart-totals">
          <div><span>RAW_SUBTOTAL:</span><b>{money(subtotal)}</b></div>
          <div><span>ESTIMATED FULFILLMENT:</span><b>₱0.00 (CAMPUS PICKUP)</b></div>
          <div className="net-total"><span>TOTAL_PAYABLE<small>OFFICIAL INVOICE BATCH #26</small></span><strong>{money(subtotal)}</strong></div>
        </div>
        <button className="button-primary checkout-button" type="button" disabled={!cart.length} onClick={onCheckout}>PROCEED TO PRE-ORDER RESERVATION <Icon>arrow_forward</Icon></button>
        <p className="cart-footnote">SECURE DEPLOYMENT PROTOCOL // CAMPUS PICKUP</p>
      </div>
      <div className="security-note"><b><Icon>fingerprint</Icon> ORDER STATUS</b><p>Student order details are submitted securely to the configured POINTERS store database and visible only to authorized store admins.</p></div>
    </aside>
  )
}

function CheckoutModal({ isOpen, onClose, total, onSubmit, receipt, busy, error }) {
  const [paymentMethod, setPaymentMethod] = useState('GCash')
  const [programSelection, setProgramSelection] = useState('')
  if (!isOpen) return null

  function downloadOrderSummary() {
    const rows = [
      'POINTERS OFFICIAL STORE — ORDER SUMMARY',
      `Order reference: ${receipt.reference_code}`,
      `Payment method: ${receipt.payment_method}`,
      '',
      'ITEMS',
      ...receipt.items.flatMap((item) => [
        `${item.product_name} — ${item.quantity} × ${money(Number(item.unit_price))} = ${money(Number(item.line_total))}`,
        `  Design: ${item.design_name}${item.size ? ` · Size ${item.size}` : ''}`,
        ...(item.selections?.length
          ? [`  Selections: ${item.selections.map((selection) => `${selection.name}: ${selection.design}${selection.color ? ` · ${selection.color}` : ''}${selection.size ? ` · Size ${selection.size}` : ''}`).join(' / ')}`]
          : []),
      ]),
      '',
      `Subtotal: ${money(Number(receipt.subtotal))}`,
      `Total: ${money(Number(receipt.total))}`,
      `Payment status: ${receipt.payment_method === 'GCash' ? 'Receipt submitted — pending verification' : 'Pay over the counter'}`,
    ]
    const file = new Blob([rows.join('\n')], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(file)
    const link = document.createElement('a')
    link.href = url
    link.download = `POINTERS-${receipt.reference_code}-order-summary.txt`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose() }}>
      <section className="checkout-modal" role="dialog" aria-modal="true" aria-labelledby="checkout-title">
        <div className="modal-heading">
          <div><span className="eyebrow">RESERVATION PROTOCOL // BATCH 2026</span><h2 id="checkout-title">{receipt ? 'RESERVATION RECEIVED' : 'PAYMENT DETAILS'}</h2></div>
          <button type="button" aria-label="Close checkout" onClick={onClose} disabled={busy}><Icon>close</Icon></button>
        </div>
        {receipt ? (
          <div className="receipt">
            <span className="receipt-mark"><Icon>check</Icon></span>
            <p className="eyebrow">ORDER SAVED // PENDING REVIEW</p>
            <h3>Reservation received</h3>
            <p>Your order and itemized price summary were saved to the POINTERS store database. Keep this summary for your records.</p>
            <div className="receipt-details">
              <div><span>CLAIM REF:</span><b>{receipt.reference_code}</b></div>
              <div><span>PAYMENT METHOD:</span><b>{receipt.payment_method}</b></div>
              <div><span>PAYMENT STATUS:</span><b>{receipt.payment_method === 'GCash' ? 'RECEIPT SUBMITTED · PENDING VERIFICATION' : 'PAY OVER THE COUNTER'}</b></div>
              <div><span>SUBTOTAL:</span><b>{money(Number(receipt.subtotal))}</b></div>
              <div><span>ESTIMATED TOTAL:</span><b>{money(Number(receipt.total))}</b></div>
            </div>
            <div className="receipt-items">
              <h4>ITEMIZED ORDER</h4>
              {receipt.items.map((item, index) => (
                <div className="receipt-item" key={`${item.product_sku}-${index}`}>
                  <span>
                    <b>{item.quantity} × {item.product_name}</b>
                    <small>{item.design_name}{item.size ? ` · Size ${item.size}` : ''}</small>
                    {item.selections?.length > 0 && (
                      <small>{item.selections.map((selection) => `${selection.name}: ${selection.design}${selection.color ? ` · ${selection.color}` : ''}${selection.size ? ` · Size ${selection.size}` : ''}`).join(' / ')}</small>
                    )}
                    <small>{money(Number(item.unit_price))} each</small>
                  </span>
                  <b>{money(Number(item.line_total))}</b>
                </div>
              ))}
            </div>
            <div className="receipt-actions">
              <button className="button-primary" type="button" onClick={downloadOrderSummary}>DOWNLOAD ORDER SUMMARY</button>
              <button className="button-secondary" type="button" onClick={() => window.print()}>PRINT / SAVE AS PDF</button>
              <button className="button-secondary" type="button" onClick={onClose}>RETURN TO STORE</button>
            </div>
          </div>
        ) : (
          <form className="checkout-form" onSubmit={onSubmit}>
            <p className="form-notice">Your student details will be stored in the POINTERS store database for order fulfilment and will only be visible to authorized store admins.</p>
            <div className="form-grid">
              <label>FULL NAME *<input name="name" autoComplete="name" maxLength="120" required /></label>
              <label>COLLEGE *<input name="college" maxLength="120" required /></label>
              <label>EMAIL ADDRESS *<input name="email" type="email" autoComplete="email" maxLength="254" required /></label>
              <label>CONTACT NUMBER *<input name="phone" type="tel" autoComplete="tel" maxLength="40" required /></label>
              <label className="form-full">PROGRAM / AFFILIATION *
                <select
                  name="programSelection"
                  required
                  value={programSelection}
                  onChange={(event) => setProgramSelection(event.target.value)}
                >
                  <option value="" disabled>Select your program or affiliation</option>
                  <option value="BS Computer Science">BS Computer Science</option>
                  <option value="CICS Faculty / Staff">CICS Faculty / Staff</option>
                  <option value="CICS Alumni">CICS Alumni</option>
                  <option value="Others">Others</option>
                </select>
              </label>
              {programSelection === 'Others' && (
                <label className="form-full">SPECIFY PROGRAM / AFFILIATION *
                  <input name="otherProgram" maxLength="120" required />
                </label>
              )}
            </div>
            <fieldset className="payment-options"><legend>PAYMENT SETTLEMENT CHANNEL *</legend>
              <label><input type="radio" name="payment" value="GCash" checked={paymentMethod === 'GCash'} onChange={(event) => setPaymentMethod(event.target.value)} /> GCASH <small>Scan the QR or send to the number below</small></label>
              <label><input type="radio" name="payment" value="Cash over the counter" checked={paymentMethod === 'Cash over the counter'} onChange={(event) => setPaymentMethod(event.target.value)} /> CASH OVER THE COUNTER <small>Pay in person</small></label>
            </fieldset>
            {paymentMethod === 'GCash' && (
              <>
                <div className="gcash-payment-details">
                  <div>
                    <b>GCASH PAYMENT DETAILS</b>
                    <span>Account name: R.H.A</span>
                    <span>GCash number: +639641120052</span>
                    <p>Scan this QR code to pay with GCash.</p>
                  </div>
                  <img src={productImages.qr} alt="GCash QR code for R.H.A" />
                </div>
                <label className="payment-proof-field">UPLOAD GCASH PAYMENT RECEIPT *
                  <input
                    name="paymentReceipt"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    required
                  />
                  <small>Accepted: JPG, PNG, WebP, or PDF · Maximum 5 MB</small>
                </label>
              </>
            )}
            <div className="payment-summary"><span>ESTIMATED TOTAL</span><b>{money(total)}</b></div>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="button-primary confirm-button" type="submit" disabled={busy}>
              {busy ? paymentMethod === 'GCash' ? 'UPLOADING RECEIPT & SAVING…' : 'SAVING RESERVATION…' : 'CONFIRM PRE-ORDER'}
              <Icon>arrow_forward</Icon>
            </button>
          </form>
        )}
      </section>
    </div>
  )
}

function App() {
  const [products, setProducts] = useState(PRODUCT_FALLBACK)
  const [cart, setCart] = useState([])
  const [activeCategory, setActiveCategory] = useState('all')
  const [query, setQuery] = useState('')
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [receipt, setReceipt] = useState(null)
  const [checkoutBusy, setCheckoutBusy] = useState(false)
  const [checkoutError, setCheckoutError] = useState('')
  const isAdmin = new URLSearchParams(window.location.search).get('admin') === '1'

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined
    let cancelled = false
    async function loadCatalog() {
      const [productResult, variantResult] = await Promise.all([
        supabase.from('store_products').select('*').eq('is_active', true),
        supabase.from('store_product_variants').select('*').eq('is_active', true),
      ])
      if (cancelled) return
      if (productResult.error || variantResult.error) {
        console.error('Could not load the database catalog; using the spreadsheet fallback.', productResult.error ?? variantResult.error)
      } else if (productResult.data.length === 0) {
        console.warn('The database catalog is empty; using the spreadsheet fallback.')
      } else if (!productResult.data.every((product) =>
        typeof product.sku === 'string'
        && typeof product.short_name === 'string'
        && typeof product.product_type === 'string'
        && Number.isFinite(Number(product.price))
        && Array.isArray(product.sizes)
        && Array.isArray(product.bundle_items)
        && typeof product.discount_eligible === 'boolean')) {
        console.warn('The database catalog uses an older schema; using the spreadsheet fallback.')
      } else {
        setProducts(normalizeCatalog(productResult.data, variantResult.data))
      }
    }
    loadCatalog().catch((error) => {
      if (!cancelled) console.error('Could not load the database catalog; using the spreadsheet fallback.', error)
    })
    return () => { cancelled = true }
  }, [])

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.qty, 0), [cart])
  const total = subtotal
  const itemCount = cart.reduce((sum, item) => sum + item.qty, 0)
  const matchingProducts = products.filter((product) => {
    const matchesCategory = activeCategory === 'all' || product.category === activeCategory
    const matchesQuery = `${product.name} ${product.sku} ${product.category}`.toLowerCase().includes(query.toLowerCase())
    return matchesCategory && matchesQuery
  })

  function addToCart(product, variant, size, components = [], options = []) {
    setCart((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        sku: product.sku,
        title: product.shortName,
        variant,
        size,
        components,
        options,
        price: product.price,
        qty: 1,
      },
    ])
  }

  function changeQuantity(itemId, delta) {
    setCart((current) => current.flatMap((item) => {
      if (item.id !== itemId) return [item]
      return item.qty + delta > 0 && item.qty + delta <= 20 ? [{ ...item, qty: item.qty + delta }] : []
    }))
  }

  function removeItem(itemId) {
    setCart((current) => current.filter((item) => item.id !== itemId))
  }

  function openCheckout() {
    setReceipt(null)
    setCheckoutError('')
    setIsCheckoutOpen(true)
  }

  async function submitCheckout(event) {
    event.preventDefault()
    if (!isSupabaseConfigured) {
      setCheckoutError('Online reservations are unavailable until Supabase is configured and the database migration is installed.')
      return
    }
    setCheckoutBusy(true)
    setCheckoutError('')
    const formData = new FormData(event.currentTarget)
    const paymentMethod = formData.get('payment')
    const receipt = formData.get('paymentReceipt')
    const college = String(formData.get('college') ?? '').trim()
    const programSelection = String(formData.get('programSelection') ?? '')
    const otherProgram = String(formData.get('otherProgram') ?? '').trim()
    const program = programSelection === 'Others' ? otherProgram : programSelection
    let paymentReceiptPath = null
    let paymentReceiptUploaded = false
    const designFilePaths = new Map()
    const uploadedDesignPaths = []

    if (programSelection === 'Others' && !otherProgram) {
      setCheckoutError('Please specify your program or affiliation.')
      setCheckoutBusy(false)
      return
    }

    if (paymentMethod === 'GCash') {
      if (!(receipt instanceof File) || receipt.size === 0) {
        setCheckoutError('Upload your GCash payment receipt before confirming the pre-order.')
        setCheckoutBusy(false)
        return
      }
      if (receipt.size > 5 * 1024 * 1024) {
        setCheckoutError('The payment receipt must be 5 MB or smaller.')
        setCheckoutBusy(false)
        return
      }
      const receiptExtensions = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
        'application/pdf': 'pdf',
      }
      const extension = receiptExtensions[receipt.type]
      if (!extension) {
        setCheckoutError('Upload the payment receipt as a JPG, PNG, WebP, or PDF file.')
        setCheckoutBusy(false)
        return
      }
      paymentReceiptPath = `${crypto.randomUUID()}/payment-proof.${extension}`
    }

    for (const item of cart) {
      const customDesign = item.options?.find((option) => option.file instanceof File)
      if (!customDesign) continue
      if (item.sku !== 'PTR-KEY-03' || item.variant !== 'Custom design') {
        setCheckoutError('Custom design files can only be attached to keychain orders.')
        setCheckoutBusy(false)
        return
      }
      if (customDesign.file.size === 0 || customDesign.file.size > 5 * 1024 * 1024) {
        setCheckoutError('The keychain design file must be 5 MB or smaller.')
        setCheckoutBusy(false)
        return
      }
      const designExtensions = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
        'application/pdf': 'pdf',
      }
      const extension = designExtensions[customDesign.file.type]
      if (!extension) {
        setCheckoutError('Upload the keychain design as a JPG, PNG, WebP, or PDF file.')
        setCheckoutBusy(false)
        return
      }
      designFilePaths.set(item.id, `${crypto.randomUUID()}/custom-design.${extension}`)
    }

    async function cleanupUploadedReceipt() {
      if (!paymentReceiptUploaded || !paymentReceiptPath) return null
      try {
        const { error } = await supabase.storage
          .from('payment-proofs')
          .remove([paymentReceiptPath])
        if (error) return error.message
        paymentReceiptUploaded = false
        return null
      } catch (error) {
        return error.message
      }
    }
    async function cleanupUploadedDesigns() {
      if (uploadedDesignPaths.length === 0) return null
      const { error } = await supabase.storage
        .from('custom-designs')
        .remove(uploadedDesignPaths)
      if (error) return error.message
      uploadedDesignPaths.length = 0
      return null
    }
    async function cleanupUploadedFiles() {
      const errors = await Promise.all([cleanupUploadedReceipt(), cleanupUploadedDesigns()])
      return errors.filter(Boolean).join('; ') || null
    }

    const customer = {
      name: formData.get('name'),
      college,
      email: formData.get('email'),
      phone: formData.get('phone'),
      program,
    }
    const items = cart.map((item) => ({
      sku: item.sku,
      design: item.variant,
      size: item.size || null,
      quantity: item.qty,
      components: item.components,
      options: item.options?.map((option) => {
        const path = designFilePaths.get(item.id)
        return option.file
          ? { name: option.name, design: option.design, file_path: path }
          : option
      }) ?? [],
    }))
    try {
      if (receipt instanceof File && paymentReceiptPath) {
        const { error: uploadError } = await supabase.storage
          .from('payment-proofs')
          .upload(paymentReceiptPath, receipt, { contentType: receipt.type, upsert: false })
        if (uploadError) {
          setCheckoutError(`Could not upload the payment receipt: ${uploadError.message}`)
          return
        }
        paymentReceiptUploaded = true
      }

      for (const item of cart) {
        const customDesign = item.options?.find((option) => option.file instanceof File)
        const path = designFilePaths.get(item.id)
        if (!customDesign || !path) continue
        const { error: designUploadError } = await supabase.storage
          .from('custom-designs')
          .upload(path, customDesign.file, { contentType: customDesign.file.type, upsert: false })
        if (designUploadError) {
          setCheckoutError(`Could not upload the keychain design: ${designUploadError.message}`)
          const cleanupError = await cleanupUploadedFiles()
          if (cleanupError) setCheckoutError((current) => `${current}. Uploaded files could not be cleaned up: ${cleanupError}`)
          return
        }
        uploadedDesignPaths.push(path)
      }

      const { data, error } = await supabase.rpc('create_store_order', {
        p_customer: customer,
        p_payment_method: paymentMethod,
        p_discount_requested: false,
        p_items: items,
        p_payment_receipt_path: paymentReceiptPath,
      })
      if (error) {
        const cleanupError = await cleanupUploadedFiles()
        setCheckoutError(cleanupError
          ? `The order was not submitted: ${error.message}. Uploaded files could not be cleaned up: ${cleanupError}`
          : `The order was not submitted: ${error.message}`)
      } else {
        const savedItems = Array.isArray(data.items) && data.items.length
          ? data.items
          : cart.map((item) => ({
            product_sku: item.sku,
            product_name: item.title,
            design_name: item.variant,
            size: item.size,
            quantity: item.qty,
            unit_price: item.price,
            line_total: item.price * item.qty,
            selections: item.components.length
              ? item.components
              : item.options.map(({ file: _file, ...option }) => option),
          }))
        setReceipt({
          ...data,
          items: savedItems,
          payment_method: data.payment_method ?? paymentMethod,
          subtotal: data.subtotal ?? total,
          total: data.total ?? total,
        })
        setCart([])
      }
    } catch (error) {
      const cleanupError = await cleanupUploadedFiles()
      setCheckoutError(cleanupError
        ? `The order could not be submitted: ${error.message}. Uploaded files could not be cleaned up: ${cleanupError}`
        : `The order could not be submitted: ${error.message}`)
    } finally {
      setCheckoutBusy(false)
    }
  }

  if (isAdmin) return <Admin />
  const reservationDeadline = "2026-10-12T23:59:59";
  return (
    <>
      <Header itemCount={itemCount} total={total} onCart={() => document.getElementById('cart')?.scrollIntoView({ behavior: 'smooth' })} onSearch={() => document.getElementById('catalog-search')?.focus()} />
      <main id="top">
        <section className="hero-section">
          <div className="hero-copy">
            <span className="eyebrow"><i className="status-dot" /> PRE-ORDERS ACTIVE</span>
            <p className="hero-overline">COLLEGE OF INFORMATION &amp; COMPUTING SCIENCES</p>
            <h1>MSU-POINTERS<br /><em>BATCH '26</em> MERCHANDISE</h1>
            <p className="hero-description">OOfficial limited-run merchandise for the computing community of MSU-Marawi. Built for campus life, made by POINTERS. Everyone is reminded that payments must be settled by Monday, October 12, as ordering will begin right after, with priority given to those who have paid via GCash, so those paying over-the-counter should make their payments now at the CICS-Multimedia Room.</p>
            <div className="hero-actions"><a className="button-primary" href="#catalog">EXPLORE THE CATALOG <Icon>arrow_downward</Icon></a><a className="text-link" href="#bundle-guide">VIEW THE BUNDLES <Icon>arrow_forward</Icon></a></div>
          </div>
          
          <div className="hero-status hero-status-error">
            <DispatchCountdown targetDate={reservationDeadline} />
            <div className="dispatch-details">
              <div><span>ORDER PROTOCOL:</span><b>PRE-ORDER ONLY</b></div>
              <div><span>DISPATCH LOCATION:</span><b>CICS-MULTIMEDIA ROOM</b></div>
              <div><span>RELEASE DATE:</span><b className="accent">OCTOBER 18, 2026</b></div>
            </div>
          </div>
        </section>

        <section className="bundle-section" id="bundle-guide">
          <div className="section-kicker"><span>OFFICIAL BUNDLE PRICES</span></div>
          <div className="bundle-price-grid">
            {products.filter((product) => product.type === 'bundle').map((bundle) => (
              <a className="bundle-price-card" href="#catalog" key={bundle.sku} onClick={() => setActiveCategory('bundles')}>
                <span>{bundle.sku}</span><b>{bundle.shortName}</b><strong>{money(bundle.price)}</strong><small>REGULAR ITEM TOTAL {money(bundle.compareAtPrice)}</small>
              </a>
            ))}
          </div>
        </section>

        <section className="catalog-section" id="catalog">
          <div className="catalog-heading">
            <div><span className="eyebrow">DISPENSARY SPECIFICATION REGISTRY</span><h2>PRODUCT CATALOG </h2></div>
            <label className="catalog-search"><Icon>search</Icon><input id="catalog-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products or SKU..." /></label>
          </div>
          <div className="catalog-filters" role="group" aria-label="Filter products">
            {[['all', '* ALL SPECS'], ['apparel', 'APPAREL'], ['wearables', 'WEARABLES'], ['accessories', 'ARTIFACTS'], ['bundles', 'BUNDLES']].map(([category, label]) => <button className={activeCategory === category ? 'active' : ''} key={category} type="button" onClick={() => setActiveCategory(category)}>{label}</button>)}
          </div>
          <div className="catalog-layout">
            <div className="product-grid">
              {matchingProducts.length
                ? matchingProducts.map((product) => <ProductCard key={product.sku} product={product} catalog={products} addToCart={addToCart} />)
                : <p className="no-results">No products match “{query}”. Try another search.</p>}
            </div>
            <Cart cart={cart} subtotal={subtotal} onQuantity={changeQuantity} onRemove={removeItem} onCheckout={openCheckout} />
          </div>
        </section>

        <section className="sizing-section" id="sizing-guide">
          <div className="sizing-heading"><span className="eyebrow">PRECISION MATRIX // HARDWARE FIT</span><h2>APPAREL SIZING SPECIFICATIONS</h2><p>Each heavyweight tee is tailored for a relaxed streetwear fit. Compare the measurements against a shirt that fits you well.</p></div>
          <div className="table-wrap"><table><thead><tr><th>SIZE TAG</th><th>CHEST WIDTH</th><th>BODY LENGTH</th><th>SHOULDER SPAN</th><th>HEIGHT GUIDE</th></tr></thead><tbody>
            {[
              ['S-SMALL', '20 in / 50.8 cm', '27 in / 68.5 cm', '19 in / 48.2 cm', '5′0″–5′4″'],
              ['M-MEDIUM', '21 in / 53.3 cm', '28 in / 71.1 cm', '20 in / 50.8 cm', '5′4″–5′8″'],
              ['L-LARGE', '22 in / 55.9 cm', '29 in / 73.7 cm', '21 in / 53.3 cm', '5′8″–5′11″'],
              ['XL-X-LARGE', '23 in / 58.4 cm', '30 in / 76.2 cm', '22 in / 55.9 cm', '5′11″–6′2″'],
            ].map((row) => <tr key={row[0]}>{row.map((cell) => <td key={cell}>{cell}</td>)}</tr>)}
          </tbody></table></div>
          <p className="table-note">Measurements are approximate. For a looser fit, consider choosing one size up.</p>
        </section>
        <FaqSection />
      </main>
      <footer className="site-footer">
        <a className="brand" href="#top">
          <span className="brand-mark"><img src={productImages.logo} alt="" /></span>
          <span className="brand-copy">
            <span className="brand-title">POINTERS <b>OFFICIAL STORE</b></span>
            <span className="brand-subtitle">MSU-MARAWI CICS · RELEASE 01/26</span>
          </span>
        </a>
        <p>Student-run merchandise store · For order assistance, contact the POINTERS CICS committee.</p>
        
        {/* Idagdag ang <a href="#faq">FAQ</a> dito: */}
        <a href="#faq">FAQ</a>
        <a href="?admin=1">ADMIN</a>
        <a href="#top">BACK TO TOP ↑</a>
      </footer>
      <CheckoutModal isOpen={isCheckoutOpen} onClose={() => setIsCheckoutOpen(false)} total={total} onSubmit={submitCheckout} receipt={receipt} busy={checkoutBusy} error={checkoutError} />
    </>
  )
}

export default App
