import { zipSync, strToU8 } from 'fflate'

const xmlEscape = (value) => Array.from(String(value ?? ''))
  .filter((character) => {
    const codePoint = character.codePointAt(0)
    return codePoint === 0x09 || codePoint === 0x0a || codePoint === 0x0d
      || (codePoint >= 0x20 && codePoint <= 0xd7ff)
      || (codePoint >= 0xe000 && codePoint <= 0xfffd)
      || (codePoint >= 0x10000 && codePoint <= 0x10ffff)
  })
  .join('')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&apos;')

function columnName(index) {
  let name = ''
  let value = index + 1
  while (value > 0) {
    const remainder = (value - 1) % 26
    name = String.fromCharCode(65 + remainder) + name
    value = Math.floor((value - 1) / 26)
  }
  return name
}

function createWorksheet(rows) {
  const sheetRows = rows.map((row, rowIndex) => {
    const cells = row.map((value, columnIndex) => {
      const reference = `${columnName(columnIndex)}${rowIndex + 1}`
      if (typeof value === 'number' && Number.isFinite(value)) {
        return `<c r="${reference}"><v>${value}</v></c>`
      }
      return `<c r="${reference}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`
    }).join('')
    return `<row r="${rowIndex + 1}">${cells}</row>`
  }).join('')

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows}</sheetData></worksheet>`
}

function createWorkbook(sheets) {
  const contentTypes = [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
    '<Default Extension="xml" ContentType="application/xml"/>',
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>',
    ...sheets.map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`),
    '</Types>',
  ].join('')
  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map(({ name }, index) => `<sheet name="${xmlEscape(name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join('')}</sheets></workbook>`
  const workbookRelationships = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join('')}</Relationships>`
  const files = {
    '[Content_Types].xml': strToU8(contentTypes),
    '_rels/.rels': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'),
    'xl/workbook.xml': strToU8(workbook),
    'xl/_rels/workbook.xml.rels': strToU8(workbookRelationships),
  }

  sheets.forEach(({ rows }, index) => {
    files[`xl/worksheets/sheet${index + 1}.xml`] = strToU8(createWorksheet(rows))
  })

  return zipSync(files, { level: 6 })
}

const sum = (orders, field) => orders.reduce((total, order) => total + (Number(order[field]) || 0), 0)

function orderItems(order) {
  return (order.store_order_items ?? []).map((item) => {
    const variant = [item.design_name, item.variant, item.size ? `Size ${item.size}` : '']
      .filter(Boolean)
      .join(' · ')
    const selections = Array.isArray(item.selections) && item.selections.length
      ? ` (${item.selections.map((selection) => `${selection.name}: ${selection.design}${selection.color ? ` · ${selection.color}` : ''}${selection.size ? ` · Size ${selection.size}` : ''}`).join(' / ')})`
      : ''
    return `${Number(item.quantity) || 0} × ${item.product_name || item.product_sku || 'Item'}${variant ? ` · ${variant}` : ''}${selections}`
  }).join('\n')
}

function customerRows(orders) {
  return [
    [
      'Order reference',
      'Order date',
      'Customer name',
      'College',
      'Program',
      'Email',
      'Phone',
      'Order status',
      'GCash receipt submitted',
      'Item units',
      'Subtotal (PHP)',
      'Discount (PHP)',
      'GCash fee (PHP)',
      'Order total (PHP)',
      'Payments recorded (PHP)',
      'Remaining balance (PHP)',
      'Items and selections',
    ],
    ...orders.map((order) => [
      order.reference_code,
      order.created_at ? new Date(order.created_at).toLocaleString() : '',
      order.customer_name,
      order.college,
      order.program,
      order.email,
      order.phone,
      order.status,
      order.payment_method === 'GCash' ? (order.payment_receipt_path ? 'Yes' : 'No') : '',
      (order.store_order_items ?? []).reduce((total, item) => total + (Number(item.quantity) || 0), 0),
      Number(order.subtotal) || 0,
      Number(order.discount_amount) || 0,
      Number(order.gcash_fee) || 0,
      Number(order.total) || 0,
      Number(order.amount_paid) || 0,
      Math.max(0, (Number(order.total) || 0) - (Number(order.amount_paid) || 0)),
      orderItems(order),
    ]),
  ]
}

export function createOrderWorkbook({ activeOrders, cancelledOrders, paymentSummary, orderTotal, productSummary }) {
  const totalUnits = productSummary.reduce((total, product) => total + product.quantity, 0)
  const summaryRows = [
    ['POINTERS MERCH ORDER SUMMARY'],
    ['Generated', new Date().toLocaleString()],
    ['Cancelled orders are excluded from active totals and payment-method tabs; their count and order total are reported separately.'],
    ['Payment method reflects checkout selection. Payments recorded and remaining balance reflect amounts entered by store admins.'],
    [],
    ['OVERALL TOTALS'],
    ['Metric', 'Value'],
    ['Active orders', activeOrders.length],
    ['Items ordered (units)', totalUnits],
    ['Subtotal (PHP)', sum(activeOrders, 'subtotal')],
    ['Discounts (PHP)', sum(activeOrders, 'discount_amount')],
    ['GCash fees (PHP)', sum(activeOrders, 'gcash_fee')],
    ['Order total (PHP)', orderTotal],
    ['Payments recorded (PHP)', sum(activeOrders, 'amount_paid')],
    ['Remaining balance (PHP)', activeOrders.reduce((total, order) => total + Math.max(0, (Number(order.total) || 0) - (Number(order.amount_paid) || 0)), 0)],
    ['Cancelled orders', cancelledOrders.length],
    ['Cancelled order total (PHP)', sum(cancelledOrders, 'total')],
    [],
    ['PAYMENT METHOD SUMMARY'],
    ['Payment method', 'Active orders', 'Subtotal (PHP)', 'Discounts (PHP)', 'GCash fees (PHP)', 'Order total (PHP)', 'Payments recorded (PHP)', 'Remaining balance (PHP)'],
    ...paymentSummary.map(({ method, orderCount, total }) => {
      const methodOrders = activeOrders.filter((order) => order.payment_method === method)
      return [
        method,
        orderCount,
        sum(methodOrders, 'subtotal'),
        sum(methodOrders, 'discount_amount'),
        sum(methodOrders, 'gcash_fee'),
        total,
        sum(methodOrders, 'amount_paid'),
        methodOrders.reduce((balance, order) => balance + Math.max(0, (Number(order.total) || 0) - (Number(order.amount_paid) || 0)), 0),
      ]
    }),
    [],
    ['ITEMS ORDERED'],
    ['SKU', 'Product', 'Units ordered', 'Orders'],
    ...productSummary.map(({ sku, name, quantity, orderCount }) => [sku, name, quantity, orderCount]),
  ]
  const gcashOrders = activeOrders.filter((order) => order.payment_method === 'GCash')
  const cashOrders = activeOrders.filter((order) => order.payment_method === 'Cash over the counter')

  return createWorkbook([
    { name: 'Order Summary', rows: summaryRows },
    { name: 'GCash Orders', rows: [['GCash orders with customer details; cancelled orders excluded. Receipt submission does not indicate payment has been verified. Recorded payments are admin-entered.'], ['Active orders', gcashOrders.length], ['Order total (PHP)', sum(gcashOrders, 'total')], ['Payments recorded (PHP)', sum(gcashOrders, 'amount_paid')], ['Remaining balance (PHP)', gcashOrders.reduce((balance, order) => balance + Math.max(0, (Number(order.total) || 0) - (Number(order.amount_paid) || 0)), 0)], [], ...customerRows(gcashOrders)] },
    { name: 'Cash Orders', rows: [['Cash over-the-counter orders with customer details; cancelled orders excluded. Recorded payments are admin-entered.'], ['Active orders', cashOrders.length], ['Order total (PHP)', sum(cashOrders, 'total')], ['Payments recorded (PHP)', sum(cashOrders, 'amount_paid')], ['Remaining balance (PHP)', cashOrders.reduce((balance, order) => balance + Math.max(0, (Number(order.total) || 0) - (Number(order.amount_paid) || 0)), 0)], [], ...customerRows(cashOrders)] },
  ])
}
