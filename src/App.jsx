import { useMemo, useState } from 'react'
import './App.css'

const products = [
  {
    sku: 'PTR-TEE-01',
    name: 'Official CICS POINTERS Graphic Tee',
    shortName: 'Official CICS Graphic Tee',
    category: 'apparel',
    price: 250,
    meta: '240 GSM',
    description:
      'Custom combed 240 GSM cotton with a low-poly Dino and CICS back illustration.',
    options: [
      { label: 'Version A · Magenta sleeves', value: 'Version A', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBqn6xHd3YgwCt8s7z5U3om5px2wiovoSJZ_VXpm7Fluz-dhGaCMRepC7t9Ox8TQA5diigXPWbMWEo0MnCueM7_1A52IzQaCZtIhd3omCDaDmQBhuJGteuhnnrE9CKEc62hiO_gHUIIbqWjdW66r_3olxqdKucEBUtlSHCCXbgPt0IhrFkK2wK1T83pPTrtUFO6iMAQAaGRhx0aKCKNpavsnWoauCXzO6Td6Ge8oxaOq2oRxljlk0wsB146sYTdxPI9MQ' },
      { label: 'Version B · Monochrome cream', value: 'Version B', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCDAukFbIUrp-14_QvOkrp39sxQBi29k7qPgOZWXBomsb-gV1Sj-ItqlIiPbf0vBcfKl0hBSYct_XbsiCdBGULEbufyHHttaa-EiXY5xmlez0nJ1c40xWXAh7mAxYGI4zVYD0h--DfoRnJXPQfASU_8cvgAem4QCr37JEmqoPFNr5mZ0MlL65J15U7Uvgrk2N3NPM3Yinbu27gtoLGzIXFr8c9iIqoZnOMifw0R4j4e5o5CLIF2og_2ka53jJHp1vOd-A' },
    ],
    sizes: ['S', 'M', 'L', 'XL'],
    type: 'tee',
  },
  {
    sku: 'PTR-LAN-02',
    name: 'Heavy-Duty POINTERS Lanyard',
    shortName: 'POINTERS Woven Lanyard',
    category: 'wearables',
    price: 120,
    meta: '1 INCH WIDTH',
    description:
      'Premium satin jacquard weave with quick-release buckle, CICS crest, and safety lock clip.',
    options: [
      { label: 'Version A · Kompsay waves', value: 'Version A', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDL4VjBVPFOMiS4OshV7Or6SLu6TCt5poZY45L5Yta8jV2gJ1Wmr_yRVGafhV2i37nSn5PkwmkbY6CpWAWjlTe-jayIpGWQ-H1dXznO7L-tCB6VuY1W8uKsajlyxV4krcGCNeH3JbggtQ2rMXjUouMb_jcwyN1fPSoiTS6V65od705uOBfe5f8LtxRaB0zVxZjpF-HQnFGliI7TpQP4kN_xjsEAg9Jrmex1M1FMkcviJyaUSNp9EVCuE83U5xmaMqW2Qw' },
      { label: 'Version B · MSU cloud', value: 'Version B', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAR7Ueq3ziWzL_uvXbub_-_ZOO3zk7KffP0BwtZheDjLbWkn4Gr8G1hp1cJOj7VFT-WWl7Lznhw36TlY0vC1w_Qum9hR5ZSx9y31cf-C4AvRXne0YrZt2S9AYU6HXpxY91TMpZ3CdBgFSH_y0A4bqBrvgUI1zwv3I1eVHw3qv64cU8MxdiPHmCf0tLgzRaZhwm1RJUApFekEqMP3iJYgQKN_aDJi_pedbq3nZ-bEoTbmca36UkLJ_8qzXEK69gYwfqdRg' },
    ],
  },
  {
    sku: 'PTR-KEY-03',
    name: 'Poly-Vector Meme & Node Keychains',
    shortName: 'Poly-Vector Acrylic Keychain',
    category: 'accessories',
    price: 13,
    meta: '3MM ACRYLIC',
    description:
      'Laser-cut double-sided acrylic with an industrial stainless-steel keyring.',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAsblWxdZqIpaKBA4Es8V9VdqupRWlcJE-mwQtumT053mshG0uNeY4Keub7wD433iNy64jdBDy62uHSUGkvzSVqQATzXguittlSW3i7uTTRAsRTXO8y29ZHxjTW-lWyzpld3PtPNdrMYXAHPC1sc1LXK70_CbBofplBXMtl40gDIjt0ahuX8gbUekXbqseYFlETl9hRtHVYm_0l_FrTwsip_JNU_ZS2itTBbDPgwlh49YFlan7MbzMY1pokG12RgD6nfw',
    variants: [
      'Cat Debugging Rage',
      'Why Code Works / Does Not',
      'C++ Programming',
      'Go Study!',
      'Progress Over Perfection',
    ],
  },
  {
    sku: 'PTR-PIN-04',
    name: 'Matte Finish Button Badges (44mm)',
    shortName: 'Matte Button Badge (44mm)',
    category: 'accessories',
    price: 13,
    meta: '44MM · VELVET MATTE',
    description:
      'Scratch-resistant velvet-touch finish with a rust-proof safety pin backing.',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAp8XYuj59k5nUnl-1L-WDvXnKjmqvUxuBU66yYk3YXWvzmHlEnrsLwtjjilAa572vT31sNRjNF9SuV1II8Th1l6haLIHFIcHoZjk6cAdixBrIL59SRsm1x_sX5JuyTRa-LMmMQl8vZeGHzMusEH119sKeYybKvCMu2oAL0AXTpbbNjq3nU2OLPqzLqGdgHimlx3Zb3aPXRwzMpjT_7_kq5933512ErnejPZXck9uYQVnb-P33oztr0gWDFsbC30utobg',
    variants: ['Poly Dino Mascot', 'Binary Pointer (0x7F)', 'Cyber CICS Crest', 'Retro Terminal'],
  },
  {
    sku: 'PTR-STK-05',
    name: 'Holographic & Matte Tech Vinyl Decals',
    shortName: 'Tech Vinyl Decals',
    category: 'accessories',
    price: 20,
    meta: 'DIE-CUT VINYL',
    description:
      'Waterproof, UV-resistant laminated vinyl stickers for everyday campus use.',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCQpaz-hb1cNVV8ey0ZPoOVBtbTNxwiGWALVuTiOLpCdqUuxdEZ22aBD1x9bNIWjpt2gxAX3KX-2-4u0znrWZ0QP7KGda7Em4IYr3P-Ap2DsC-SjL99i-Z75m1LSD6kZlH2te19EnrAeMTKiUX7t6a9nr1ulVI1BsTsXMXqYDFVWOQ6juaxpp0wQhkvis5AIbYQzXRLWDw8L7Ig0ZGMl9uOOeBd8II5SMTKcWaXsLYxBsC8wNLOC4eplr8zX4gfPz0FXg',
    type: 'stickers',
  },
]

const bundleImage =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuChqUR5xSk9y3KQIfJK_RJATAq22Cq2M15zf4_FUFj4JKzKWuj8nnF7wZu-Ct6o1Y5earZ4F3JCO8o0fT03HwZ6PAynzX1p3Rlb1cws78HTkrrJj29a0iF_zu9UzatTKmHrFGLetQE5eDltaq2t9ZzTpcGHL3q8z1zfhvTQvaG_KsJdEN5SBAC7sTkm5YU_Ts29VXWYTALMKHGmOt-niZ_0JKGa7brPIJlEv-pKtiKUxPiEMkUuo7lzQ8ec-SkVHn74tA'

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
          <span><i className="status-dot" /> MSU-MARAWI · COLLEGE OF INFORMATION &amp; COMPUTING SCIENCES · POINTERS 2026 DROP</span>
          <span className="system-status">SYS_STAT // ACTIVE_REGISTRY <b>BATCH_01 // CONFIRMED</b></span>
        </div>
      </div>
      <div className="navigation">
        <a className="brand" href="#top" aria-label="Pointers official store home">
          <span className="brand-mark">P<span>*</span></span>
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

function ProductCard({ product, addToCart }) {
  const [selectedOption, setSelectedOption] = useState(0)
  const [size, setSize] = useState('M')
  const [stickerPack, setStickerPack] = useState('4-Pack')
  const [selectedVariant, setSelectedVariant] = useState(product.variants?.[0] || '')
  const option = product.options?.[selectedOption]
  const price = product.type === 'stickers' && stickerPack === 'Single' ? 6 : product.price
  const image = option?.image || product.image
  const variant = [
    option?.value,
    product.type === 'tee' ? `Size ${size}` : null,
    product.variants ? selectedVariant : null,
    product.type === 'stickers' ? stickerPack : null,
  ].filter(Boolean).join(' / ')

  return (
    <article className={`product-card ${product.sku === 'PTR-STK-05' ? 'product-card-wide' : ''}`}>
      <div className="product-details">
        <div className="product-meta"><span>[SKU: {product.sku}]</span><b>{product.meta}</b></div>
        <div className={`product-photo ${product.options ? '' : 'product-photo-static'}`}>
          <img src={image} alt={product.name} loading="lazy" />
          {product.options && (
            <>
              <span className="photo-caption">{option.label.toUpperCase()}</span>
              <button className="photo-arrow photo-prev" type="button" aria-label="Previous style" onClick={() => setSelectedOption((selectedOption + product.options.length - 1) % product.options.length)}><Icon>chevron_left</Icon></button>
              <button className="photo-arrow photo-next" type="button" aria-label="Next style" onClick={() => setSelectedOption((selectedOption + 1) % product.options.length)}><Icon>chevron_right</Icon></button>
            </>
          )}
        </div>
        <h3>{product.name}</h3>
        <p className="product-description">{product.description}</p>
        {product.options && (
          <div className="option-group">
            <div className="option-heading"><span>{product.type === 'tee' ? 'OFFICIAL EDITION' : 'PATTERN VARIANT'}</span><b>{option.value.toUpperCase()}</b></div>
            <div className="segmented-options">
              {product.options.map((item, index) => (
                <button className={selectedOption === index ? 'selected' : ''} key={item.value} type="button" onClick={() => setSelectedOption(index)}>
                  {product.type === 'tee' ? `VER ${index ? 'B' : 'A'}` : item.value.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        )}
        {product.type === 'tee' && (
          <label className="field-label">SIZE SPEC
            <select value={size} onChange={(event) => setSize(event.target.value)}>
              {product.sizes.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
        )}
        {product.variants && (
          <label className="field-label">DESIGN SELECTION
            <select value={selectedVariant} onChange={(event) => setSelectedVariant(event.target.value)}>
              {product.variants.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
        )}
        {product.type === 'stickers' && (
          <div className="sticker-options">
            <span className="field-label">PACKAGING FORMAT</span>
            <div className="segmented-options">
              {['4-Pack', 'Single'].map((item) => <button key={item} className={stickerPack === item ? 'selected' : ''} type="button" onClick={() => setStickerPack(item)}>{item} · {money(item === 'Single' ? 6 : 20)}</button>)}
            </div>
          </div>
        )}
      </div>
      <div className="product-buy">
        <div><strong>{money(price)}</strong><span>{product.type === 'stickers' ? 'PER SELECTION' : 'TAX & LEVY INCL.'}</span></div>
        <button className="button-primary button-small" type="button" onClick={() => addToCart(product, variant || 'Standard', price)}>
          <Icon>add</Icon> ADD TO CART
        </button>
      </div>
    </article>
  )
}

function Cart({ cart, subtotal, discount, total, discountEnabled, onDiscount, onQuantity, onRemove, onCheckout }) {
  const count = cart.reduce((sum, item) => sum + item.qty, 0)
  return (
    <aside className="cart-column" id="cart">
      <div className="cart-panel">
        <div className="cart-heading"><span><Icon>terminal</Icon> LEDGER // 0xPTR_CART</span><b>{count} {count === 1 ? 'ITEM' : 'ITEMS'}</b></div>
        <div className="cart-items">
          {cart.length === 0 ? <div className="cart-empty">[LEDGER_EMPTY]<br />NO SPECIFICATIONS ALLOCATED YET.</div> : cart.map((item) => (
            <div className="cart-item" key={`${item.sku}-${item.variant}`}>
              <div className="cart-item-info"><b>{item.title}</b><span>{item.variant} · {money(item.price)}</span></div>
              <div className="cart-item-controls">
                <button type="button" aria-label={`Remove one ${item.title}`} onClick={() => onQuantity(item.sku, item.variant, -1)}>−</button>
                <b>{item.qty}</b>
                <button type="button" aria-label={`Add one ${item.title}`} onClick={() => onQuantity(item.sku, item.variant, 1)}>+</button>
                <strong>{money(item.price * item.qty)}</strong>
                <button className="remove-item" type="button" aria-label={`Remove ${item.title}`} onClick={() => onRemove(item.sku, item.variant)}><Icon>delete</Icon></button>
              </div>
            </div>
          ))}
        </div>
        <div className="cart-totals">
          <div><span>RAW_SUBTOTAL:</span><b>{money(subtotal)}</b></div>
          <label className="discount-toggle"><span><input checked={discountEnabled} onChange={(event) => onDiscount(event.target.checked)} type="checkbox" /> APPLY CICS GUILD SUBSIDY (5%)</span><b>−{money(discount)}</b></label>
          <div><span>ESTIMATED FULFILLMENT:</span><b>₱0.00 (CAMPUS PICKUP)</b></div>
          <div className="net-total"><span>NET_TOTAL_PAYABLE<small>OFFICIAL INVOICE BATCH #26</small></span><strong>{money(total)}</strong></div>
        </div>
        <button className="button-primary checkout-button" type="button" disabled={!cart.length} onClick={onCheckout}>PROCEED TO PRE-ORDER RESERVATION <Icon>arrow_forward</Icon></button>
        <p className="cart-footnote">SECURE DEPLOYMENT PROTOCOL // CAMPUS PICKUP</p>
      </div>
      <div className="security-note"><b><Icon>fingerprint</Icon> ORDER STATUS</b><p>This page creates a local reservation preview only. It does not submit your details to a school database.</p></div>
    </aside>
  )
}

function CheckoutModal({ isOpen, onClose, total, onSubmit, receipt }) {
  if (!isOpen) return null
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="checkout-modal" role="dialog" aria-modal="true" aria-labelledby="checkout-title">
        <div className="modal-heading">
          <div><span className="eyebrow">RESERVATION PROTOCOL // BATCH 2026</span><h2 id="checkout-title">{receipt ? 'RESERVATION PREVIEW' : 'STUDENT ALLOCATION DETAILS'}</h2></div>
          <button type="button" aria-label="Close checkout" onClick={onClose}><Icon>close</Icon></button>
        </div>
        {receipt ? (
          <div className="receipt">
            <span className="receipt-mark"><Icon>check</Icon></span>
            <p className="eyebrow">PREVIEW GENERATED // NOT SUBMITTED</p>
            <h3>Reservation details are ready</h3>
            <p>This confirmation exists only in this browser. Your order has <strong>not</strong> been sent to the CICS committee or saved to a database.</p>
            <div className="receipt-details">
              <div><span>PREVIEW REF:</span><b>{receipt}</b></div>
              <div><span>CLAIM POINT:</span><b>Lab 3 Student Lounge, CICS 2F</b></div>
              <div><span>PAYMENT STATUS:</span><b>NOT PAID · NOT SUBMITTED</b></div>
              <div><span>ESTIMATED TOTAL:</span><b>{money(total)}</b></div>
            </div>
            <div className="receipt-actions"><button className="button-primary" type="button" onClick={() => window.print()}>PRINT PREVIEW</button><button className="button-secondary" type="button" onClick={onClose}>RETURN TO STORE</button></div>
          </div>
        ) : (
          <form className="checkout-form" onSubmit={onSubmit}>
            <p className="form-notice">This is a front-end preview. Your information will not be stored or sent anywhere.</p>
            <div className="form-grid">
              <label>FULL NAME *<input name="name" autoComplete="name" required /></label>
              <label>UNIVERSITY ID NUMBER *<input name="studentId" required /></label>
              <label>EMAIL ADDRESS *<input name="email" type="email" autoComplete="email" required /></label>
              <label>CONTACT NUMBER *<input name="phone" type="tel" autoComplete="tel" required /></label>
              <label className="form-full">COLLEGE / PROGRAM &amp; YEAR *
                <select name="program" required defaultValue="">
                  <option value="" disabled>Select your program</option>
                  {['BS Computer Science', 'BS Information Technology', 'CICS Alumni', 'CICS Faculty / Laboratory Staff'].map((course) => <option key={course}>{course}</option>)}
                </select>
              </label>
            </div>
            <fieldset className="payment-options"><legend>PAYMENT SETTLEMENT CHANNEL *</legend>
              <label><input type="radio" name="payment" value="GCash" defaultChecked /> GCASH <small>Instant digital</small></label>
              <label><input type="radio" name="payment" value="Maya" /> MAYA <small>Digital wallet</small></label>
              <label><input type="radio" name="payment" value="Cash" /> CASH <small>Over-the-counter</small></label>
            </fieldset>
            <div className="payment-summary"><span>ESTIMATED TOTAL</span><b>{money(total)}</b></div>
            <button className="button-primary confirm-button" type="submit">GENERATE LOCAL PREVIEW <Icon>arrow_forward</Icon></button>
          </form>
        )}
      </section>
    </div>
  )
}

function App() {
  const [cart, setCart] = useState([])
  const [activeCategory, setActiveCategory] = useState('all')
  const [query, setQuery] = useState('')
  const [discountEnabled, setDiscountEnabled] = useState(false)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [receipt, setReceipt] = useState('')
  const [bundleSize, setBundleSize] = useState('M')
  const [bundleTee, setBundleTee] = useState('Version A')
  const [bundleLanyard, setBundleLanyard] = useState('Version A')

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.qty, 0), [cart])
  const discountableSubtotal = useMemo(
    () => cart.reduce((sum, item) => sum + (item.discountEligible ? item.price * item.qty : 0), 0),
    [cart],
  )
  const discount = discountEnabled ? discountableSubtotal * 0.05 : 0
  const total = subtotal - discount
  const itemCount = cart.reduce((sum, item) => sum + item.qty, 0)
  const visibleProducts = products.filter((product) => {
    const matchesCategory = activeCategory === 'all' || product.category === activeCategory
    const matchesQuery = `${product.name} ${product.sku} ${product.category}`.toLowerCase().includes(query.toLowerCase())
    return matchesCategory && matchesQuery
  })

  function addToCart(product, variant, price = product.price) {
    setCart((current) => {
      const existing = current.find((item) => item.sku === product.sku && item.variant === variant)
      if (existing) return current.map((item) => item === existing ? { ...item, qty: item.qty + 1 } : item)
      return [...current, {
        sku: product.sku,
        title: product.shortName,
        variant,
        price,
        qty: 1,
        discountEligible: product.sku !== 'PTR-BNDL-01',
      }]
    })
  }

  function addBundle() {
    addToCart({ sku: 'PTR-BNDL-01', shortName: 'The Compact Pointer Bundle' }, `${bundleTee} tee · ${bundleLanyard} lanyard · Size ${bundleSize}`, 395.2)
  }

  function changeQuantity(sku, variant, delta) {
    setCart((current) => current.flatMap((item) => {
      if (item.sku !== sku || item.variant !== variant) return [item]
      return item.qty + delta > 0 ? [{ ...item, qty: item.qty + delta }] : []
    }))
  }

  function removeItem(sku, variant) {
    setCart((current) => current.filter((item) => item.sku !== sku || item.variant !== variant))
  }

  function submitCheckout(event) {
    event.preventDefault()
    setReceipt(`#PTR-PREVIEW-${crypto.randomUUID().slice(0, 8).toUpperCase()}`)
  }

  function openCheckout() {
    setReceipt('')
    setIsCheckoutOpen(true)
  }

  function closeCheckout() {
    setIsCheckoutOpen(false)
  }

  return (
    <>
      <Header itemCount={itemCount} total={total} onCart={() => document.getElementById('cart')?.scrollIntoView({ behavior: 'smooth' })} onSearch={() => document.getElementById('catalog-search')?.focus()} />
      <main id="top">
        <section className="hero-section">
          <div className="hero-copy">
            <span className="eyebrow"><i className="status-dot" /> REGISTRY_CYCLE // BATCH 2026.1 · PRE-ORDERS ACTIVE</span>
            <p className="hero-overline">COLLEGE OF INFORMATION &amp; COMPUTING SCIENCES</p>
            <h1>THE CICS POINTERS<br /><em>BATCH '26</em> COLLECTION</h1>
            <p className="hero-description">Official limited-run merchandise for the computing community of MSU-Marawi. Built for campus life, made by POINTERS.</p>
            <div className="hero-actions"><a className="button-primary" href="#catalog">EXPLORE THE CATALOG <Icon>arrow_downward</Icon></a><a className="text-link" href="#bundle">VIEW THE BUNDLE <Icon>arrow_forward</Icon></a></div>
          </div>
          <div className="hero-art">
            <div className="hero-image-wrap"><img src={bundleImage} alt="POINTERS batch collection merchandise" /></div>
            <span className="art-stamp">RELEASE<br />01/26</span>
            <span className="art-caption">POINTERS COMPUTING SOCIETY<br />MSU-MARAWI · CICS</span>
          </div>
          <div className="hero-status"><div><span>ORDER PROTOCOL</span><b>PRE-ORDER ONLY</b></div><div><span>DISPATCH LOCATION</span><b>CICS LAB 3 · MARAWI</b></div><div><span>BATCH STATUS</span><b><i className="status-dot" /> OPEN FOR ORDERS</b></div></div>
        </section>

        <section className="bundle-section" id="bundle">
          <div className="section-kicker"><span>FLAGSHIP SUBSIDIZED INITIATIVE</span><span>BUNDLE_SPEC // PACK_01</span></div>
          <div className="bundle-card">
            <div className="bundle-visual"><img src={bundleImage} alt="The Compact Pointer Bundle" /><span>ALL-IN-ONE<br />DEPLOYMENT KIT</span></div>
            <div className="bundle-content">
              <p className="eyebrow">BUNDLE_SPEC // 0xALL-IN-ONE</p>
              <h2>THE COMPACT<br />POINTER BUNDLE</h2>
              <p>A starter kit for CICS students, upperclassmen, and alumni. Choose your tee and lanyard styles, plus a set of campus-ready accessories.</p>
              <ul className="bundle-includes">{['Official heavyweight tee · Version A or B', 'Heavy-duty woven POINTERS lanyard', 'Acrylic meme keychain', '44mm matte button badge', '4-pack waterproof tech stickers'].map((item) => <li key={item}><Icon>check_circle</Icon>{item}</li>)}</ul>
              <div className="bundle-selectors">
                <label>TEE STYLE<select value={bundleTee} onChange={(event) => setBundleTee(event.target.value)}><option>Version A</option><option>Version B</option></select></label>
                <label>LANYARD STYLE<select value={bundleLanyard} onChange={(event) => setBundleLanyard(event.target.value)}><option>Version A</option><option>Version B</option></select></label>
                <label>TEE SIZE<select value={bundleSize} onChange={(event) => setBundleSize(event.target.value)}>{['S', 'M', 'L', 'XL', '2XL'].map((size) => <option key={size}>{size}</option>)}</select></label>
              </div>
              <div className="bundle-buy"><div><span className="old-price">{money(416)}</span><strong>{money(395.2)}</strong><small>5% SUBSIDY INCLUDED · SAVE {money(20.8)}</small></div><button className="button-primary" type="button" onClick={addBundle}><Icon>add_shopping_cart</Icon> ADD FULL BUNDLE</button></div>
            </div>
          </div>
        </section>

        <section className="catalog-section" id="catalog">
          <div className="catalog-heading">
            <div><span className="eyebrow">DISPENSARY SPECIFICATION REGISTRY</span><h2>PRODUCT CATALOG <span>// RELEASE 01</span></h2></div>
            <label className="catalog-search"><Icon>search</Icon><input id="catalog-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products or SKU..." /></label>
          </div>
          <div className="catalog-filters" role="group" aria-label="Filter products">
            {[['all', '* ALL SPECS'], ['apparel', 'APPAREL'], ['wearables', 'WEARABLES'], ['accessories', 'ARTIFACTS']].map(([category, label]) => <button className={activeCategory === category ? 'active' : ''} key={category} type="button" onClick={() => setActiveCategory(category)}>{label}</button>)}
          </div>
          <div className="catalog-layout">
            <div className="product-grid">
              {visibleProducts.length ? visibleProducts.map((product) => <ProductCard key={product.sku} product={product} addToCart={addToCart} />) : <p className="no-results">No products match “{query}”. Try another search.</p>}
            </div>
            <Cart cart={cart} subtotal={subtotal} discount={discount} total={total} discountEnabled={discountEnabled} onDiscount={setDiscountEnabled} onQuantity={changeQuantity} onRemove={removeItem} onCheckout={openCheckout} />
          </div>
        </section>

        <section className="sizing-section" id="sizing-guide">
          <div className="sizing-heading"><span className="eyebrow">PRECISION MATRIX // HARDWARE FIT</span><h2>APPAREL SIZING SPECIFICATIONS</h2><p>Each heavyweight tee is tailored for a relaxed streetwear fit. Compare the measurements against a shirt that fits you well.</p></div>
          <div className="table-wrap"><table><thead><tr><th>SIZE TAG</th><th>CHEST WIDTH</th><th>BODY LENGTH</th><th>SHOULDER SPAN</th><th>HEIGHT GUIDE</th></tr></thead><tbody>
            {[
              ['S // 0xSMALL', '20 in / 50.8 cm', '27 in / 68.5 cm', '19 in / 48.2 cm', '5′0″–5′4″'],
              ['M // 0xMEDIUM', '21 in / 53.3 cm', '28 in / 71.1 cm', '20 in / 50.8 cm', '5′4″–5′8″'],
              ['L // 0xLARGE', '22 in / 55.9 cm', '29 in / 73.7 cm', '21 in / 53.3 cm', '5′8″–5′11″'],
              ['XL // 0xX-LARGE', '23 in / 58.4 cm', '30 in / 76.2 cm', '22 in / 55.9 cm', '5′11″–6′2″'],
              ['2XL // 0xXXL', '24 in / 61.0 cm', '31 in / 78.7 cm', '23 in / 58.4 cm', '6′2″ and above'],
            ].map((row) => <tr key={row[0]}>{row.map((cell) => <td key={cell}>{cell}</td>)}</tr>)}
          </tbody></table></div>
          <p className="table-note">Measurements are approximate. For a looser fit, consider choosing one size up.</p>
        </section>
      </main>
      <footer className="site-footer"><a className="brand" href="#top"><span className="brand-mark">P<span>*</span></span><span className="brand-copy"><span className="brand-title">POINTERS <b>OFFICIAL STORE</b></span><span className="brand-subtitle">MSU-MARAWI CICS · RELEASE 01/26</span></span></a><p>Student-run merchandise preview · For order assistance, contact the POINTERS CICS committee.</p><a href="#top">BACK TO TOP ↑</a></footer>
      <CheckoutModal isOpen={isCheckoutOpen} onClose={closeCheckout} total={total} onSubmit={submitCheckout} receipt={receipt} />
    </>
  )
}

export default App
