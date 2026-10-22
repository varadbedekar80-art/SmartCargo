
import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../../services/api'

const UPI_ID = 'varadbedekar80@oksbi'

const currency = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0)

const formatDate = (value) => {
  if (!value) return '—'
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const normalizeStatus = (status) => {
  const value = String(status || 'unpaid').toLowerCase()

  if (value === 'paid') return 'Paid'
  if (value === 'pending_verification') return 'Pending Verification'
  if (value === 'rejected') return 'Payment Rejected'
  if (value === 'partially_paid' || value === 'partially paid') {
    return 'Partially Paid'
  }
  if (value === 'overdue') return 'Overdue'

  return 'Unpaid'
}

const statusStyles = {
  Paid: 'bg-emerald-50 text-emerald-700',
  Unpaid: 'bg-amber-50 text-amber-700',
  Overdue: 'bg-red-50 text-red-700',
  'Partially Paid': 'bg-blue-50 text-blue-700',
  'Pending Verification': 'bg-violet-50 text-violet-700',
  'Payment Rejected': 'bg-red-50 text-red-700',
}

export default function ProviderInvoices() {
  const [invoices, setInvoices] = useState([])
  const [pendingPayments, setPendingPayments] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [reviewingId, setReviewingId] = useState(null)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')

  const loadInvoices = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const [invoiceResponse, paymentResponse] = await Promise.all([
        apiRequest('/invoices/provider'),
        apiRequest('/payments/provider/pending'),
      ])

      const loadedInvoices = (
        Array.isArray(invoiceResponse.invoices)
          ? invoiceResponse.invoices
          : []
      ).map((invoice) => ({
        ...invoice,
        amount: Number(invoice.amount) || 0,
        status: normalizeStatus(invoice.status),
      }))

      setInvoices(loadedInvoices)
      setPendingPayments(
        Array.isArray(paymentResponse.payments)
          ? paymentResponse.payments.map((payment) => ({
              ...payment,
              amount: Number(payment.amount) || 0,
            }))
          : [],
      )
    } catch (err) {
      setError(err.message || 'Unable to load invoices and payments.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadInvoices()
  }, [loadInvoices])

  const paymentsByInvoice = useMemo(() => {
    const grouped = {}

    for (const payment of pendingPayments) {
      const invoiceId = String(payment.invoice_id)

      if (!grouped[invoiceId]) grouped[invoiceId] = []
      grouped[invoiceId].push(payment)
    }

    return grouped
  }, [pendingPayments])

  const totals = useMemo(() => {
    return invoices.reduce(
      (result, invoice) => {
        result.billed += invoice.amount

        if (invoice.status === 'Paid') {
          result.received += invoice.amount
        } else {
          result.outstanding += invoice.amount
        }

        return result
      },
      { billed: 0, received: 0, outstanding: 0 },
    )
  }, [invoices])

  const filteredInvoices = useMemo(() => {
    const query = search.trim().toLowerCase()

    return invoices.filter((invoice) => {
      const matchesSearch =
        !query ||
        String(invoice.invoice_number || '').toLowerCase().includes(query) ||
        String(invoice.id).includes(query) ||
        String(invoice.shipment_id).includes(query) ||
        String(invoice.origin || '').toLowerCase().includes(query) ||
        String(invoice.destination || '').toLowerCase().includes(query) ||
        String(invoice.mode || '').toLowerCase().includes(query) ||
        String(invoice.customer_user_id || '').includes(query)

      const matchesStatus =
        statusFilter === 'All' || invoice.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [invoices, search, statusFilter])

  const downloadInvoice = (invoice) => {
    const content = [
      'SMART CARGO - INVOICE RECORD',
      '',
      `Invoice Number: ${invoice.invoice_number || invoice.id}`,
      `Invoice ID: ${invoice.id}`,
      `Shipment ID: ${invoice.shipment_id}`,
      `Customer User ID: ${invoice.customer_user_id ?? '—'}`,
      `Origin: ${invoice.origin || '—'}`,
      `Destination: ${invoice.destination || '—'}`,
      `Transport Mode: ${invoice.mode || '—'}`,
      `Issue Date: ${formatDate(invoice.created_at)}`,
      `Invoice Amount: ${currency(invoice.amount)}`,
      `Invoice Status: ${invoice.status}`,
      '',
      'This is an invoice record export, not a tax invoice.',
    ].join('\n')

    const blob = new Blob([content], {
      type: 'text/plain;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = `${invoice.invoice_number || `invoice-${invoice.id}`}.txt`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const viewInvoice = async (invoice) => {
    setSelectedInvoice(invoice)
    setFeedback('')
    setRejectionReason('')

    try {
      const response = await apiRequest(`/invoices/provider/${invoice.id}`)

      if (response.invoice) {
        setSelectedInvoice({
          ...response.invoice,
          amount: Number(response.invoice.amount) || 0,
          status: normalizeStatus(response.invoice.status),
        })
      }
    } catch (err) {
      setFeedback(
        `Showing available invoice data. ${err.message || 'Could not load details.'}`,
      )
    }
  }

  const reviewPayment = async (payment, decision) => {
    if (decision === 'approve') {
      const confirmed = window.confirm(
        `Have you verified that ₹${payment.amount.toFixed(2)} was actually received for UTR ${payment.payment_reference}? Only approve after checking your bank/UPI records.`,
      )

      if (!confirmed) return
    }

    let reason = ''

    if (decision === 'reject') {
      reason = rejectionReason.trim()

      if (reason.length < 3) {
        setFeedback('Enter a rejection reason of at least 3 characters.')
        return
      }
    }

    setReviewingId(payment.payment_id)
    setError('')
    setFeedback('')

    try {
      await apiRequest(
        `/payments/provider/${payment.payment_id}/review`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            decision,
            ...(decision === 'reject'
              ? { rejection_reason: reason }
              : {}),
          }),
        },
      )

      setFeedback(
        decision === 'approve'
          ? 'Payment marked as paid after verification.'
          : 'Payment reference rejected.',
      )
      setRejectionReason('')

      await loadInvoices()

      if (selectedInvoice) {
        const response = await apiRequest(
          `/invoices/provider/${selectedInvoice.id}`,
        )

        if (response.invoice) {
          setSelectedInvoice({
            ...response.invoice,
            amount: Number(response.invoice.amount) || 0,
            status: normalizeStatus(response.invoice.status),
          })
        }
      }
    } catch (err) {
      setError(err.message || 'Unable to review this payment.')
    } finally {
      setReviewingId(null)
    }
  }

  const selectedPayments =
    selectedInvoice
      ? paymentsByInvoice[String(selectedInvoice.id)] || []
      : []

  return (
    <div className="min-h-screen bg-slate-100 p-5 text-slate-900 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-blue-700">
              Logistics Provider / Finance
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight">
              Provider Invoices
            </h1>
            <p className="mt-2 text-slate-600">
              Review invoices and verify submitted UPI payment references.
            </p>
          </div>

          <button
            type="button"
            onClick={loadInvoices}
            disabled={loading}
            className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        <section className="mt-6 rounded-2xl border border-blue-200 bg-white p-5 shadow-sm">
          <h2 className="font-bold text-slate-900">UPI Payment Details</h2>
          <p className="mt-2 text-sm text-slate-600">
            Business users can send payments to this UPI ID and submit their
            transaction reference.
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="font-bold text-blue-800">{UPI_ID}</span>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(UPI_ID)
                  setFeedback('UPI ID copied.')
                } catch {
                  setFeedback(`Copy this UPI ID manually: ${UPI_ID}`)
                }
              }}
              className="rounded-lg border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
            >
              Copy UPI ID
            </button>
          </div>
        </section>

        {error && (
          <div
            role="alert"
            className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            {error}
            <button
              type="button"
              onClick={loadInvoices}
              className="ml-3 underline"
            >
              Try again
            </button>
          </div>
        )}

        {feedback && (
          <div
            role="status"
            className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900"
          >
            {feedback}
          </div>
        )}

        <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Total Invoiced</p>
            <p className="mt-3 text-2xl font-extrabold">
              {currency(totals.billed)}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              {invoices.length} invoices
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Value of Paid Invoices</p>
            <p className="mt-3 text-2xl font-extrabold text-emerald-700">
              {currency(totals.received)}
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Unpaid Invoice Value</p>
            <p className="mt-3 text-2xl font-extrabold text-amber-700">
              {currency(totals.outstanding)}
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Pending UTR References</p>
            <p className="mt-3 text-2xl font-extrabold text-violet-700">
              {pendingPayments.length}
            </p>
          </div>
        </div>

        <section className="mt-7 overflow-hidden rounded-2xl border bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold">Invoice Records</h2>
              <p className="mt-1 text-sm text-slate-500">
                {loading
                  ? 'Loading…'
                  : `${filteredInvoices.length} invoices found`}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search invoice, shipment, route…"
                aria-label="Search invoices"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
              />

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                aria-label="Filter invoices by status"
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
              >
                <option value="All">All statuses</option>
                <option value="Paid">Paid</option>
                <option value="Unpaid">Unpaid</option>
                <option value="Overdue">Overdue</option>
                <option value="Partially Paid">Partially Paid</option>
                <option value="Pending Verification">Pending Verification</option>
                <option value="Payment Rejected">Payment Rejected</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-4">Invoice</th>
                  <th className="px-5 py-4">Shipment / Customer</th>
                  <th className="px-5 py-4">Issue Date</th>
                  <th className="px-5 py-4">Route</th>
                  <th className="px-5 py-4">Amount</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {!loading &&
                  !error &&
                  filteredInvoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <p className="font-bold">
                          {invoice.invoice_number || `Invoice #${invoice.id}`}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          ID: {invoice.id}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p>Shipment #{invoice.shipment_id}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          Customer #{invoice.customer_user_id ?? '—'}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {formatDate(invoice.created_at)}
                      </td>

                      <td className="px-5 py-4">
                        <p>{invoice.origin || '—'}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          To: {invoice.destination || '—'}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Mode: {invoice.mode || '—'}
                        </p>
                      </td>

                      <td className="px-5 py-4 font-semibold">
                        {currency(invoice.amount)}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                            statusStyles[invoice.status] ||
                            'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {invoice.status}
                        </span>
                        {(paymentsByInvoice[String(invoice.id)] || []).length > 0 && (
                          <p className="mt-2 text-xs font-medium text-violet-700">
                            UTR submitted
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => viewInvoice(invoice)}
                            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold hover:bg-slate-100"
                          >
                            View / Verify
                          </button>
                          <button
                            type="button"
                            onClick={() => downloadInvoice(invoice)}
                            className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-800"
                          >
                            Download
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                {!loading && !error && filteredInvoices.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                      No invoices match your search or filter.
                    </td>
                  </tr>
                )}

                {loading && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                      Loading invoice records…
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {selectedInvoice && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setSelectedInvoice(null)
              }
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="invoice-dialog-title"
              className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-blue-700">
                    Invoice Details
                  </p>
                  <h2 id="invoice-dialog-title" className="mt-1 text-xl font-extrabold">
                    {selectedInvoice.invoice_number || `Invoice #${selectedInvoice.id}`}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedInvoice(null)}
                  aria-label="Close invoice details"
                  className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100"
                >
                  ✕
                </button>
              </div>

              <div className="mt-6 space-y-4">
                {[
                  ['Invoice ID', selectedInvoice.id],
                  ['Shipment ID', selectedInvoice.shipment_id],
                  ['Customer User ID', selectedInvoice.customer_user_id ?? '—'],
                  ['Origin', selectedInvoice.origin || '—'],
                  ['Destination', selectedInvoice.destination || '—'],
                  ['Transport Mode', selectedInvoice.mode || '—'],
                  ['Shipment Status', selectedInvoice.shipment_status || '—'],
                  ['Issue Date', formatDate(selectedInvoice.created_at)],
                  ['Invoice Amount', currency(selectedInvoice.amount)],
                  ['Invoice Status', selectedInvoice.status],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex flex-col justify-between gap-1 border-b border-slate-100 pb-3 sm:flex-row sm:gap-4"
                  >
                    <span className="text-sm text-slate-500">{label}</span>
                    <span className="text-sm font-semibold sm:text-right">{value}</span>
                  </div>
                ))}
              </div>

              <section className="mt-7 rounded-xl border border-blue-200 bg-blue-50 p-4">
                <h3 className="font-bold text-blue-950">UPI Payment Reference</h3>
                <p className="mt-2 text-sm text-slate-700">
                  UPI ID: <span className="font-semibold">{UPI_ID}</span>
                </p>

                {selectedPayments.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-600">
                    No pending UTR submissions for this invoice.
                  </p>
                ) : (
                  <div className="mt-4 space-y-4">
                    {selectedPayments.map((payment) => (
                      <div
                        key={payment.payment_id}
                        className="rounded-xl border border-blue-200 bg-white p-4"
                      >
                        <p className="text-sm text-slate-500">Transaction reference (UTR)</p>
                        <p className="mt-1 break-all font-bold">
                          {payment.payment_reference}
                        </p>

                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          <p className="text-sm">
                            <span className="text-slate-500">Amount: </span>
                            <strong>{currency(payment.amount)}</strong>
                          </p>
                          <p className="text-sm">
                            <span className="text-slate-500">Submitted: </span>
                            <strong>{formatDate(payment.submitted_at)}</strong>
                          </p>
                        </div>

                        <p className="mt-3 rounded-lg bg-violet-50 p-3 text-sm text-violet-800">
                          Pending verification. Check the actual transaction
                          in your bank/UPI records before approving.
                        </p>

                        <div className="mt-4">
                          <label className="text-sm font-semibold" htmlFor={`reject-reason-${payment.payment_id}`}>
                            Rejection reason (required only when rejecting)
                          </label>
                          <textarea
                            id={`reject-reason-${payment.payment_id}`}
                            value={rejectionReason}
                            onChange={(event) => setRejectionReason(event.target.value)}
                            rows={2}
                            maxLength={500}
                            placeholder="Example: Payment not found in bank records"
                            className="mt-2 w-full rounded-lg border border-slate-300 p-3 text-sm"
                          />
                        </div>

                        <div className="mt-4 flex flex-wrap gap-3">
                          <button
                            type="button"
                            disabled={reviewingId === payment.payment_id}
                            onClick={() => reviewPayment(payment, 'approve')}
                            className="rounded-lg bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                          >
                            {reviewingId === payment.payment_id
                              ? 'Processing…'
                              : 'Approve Payment'}
                          </button>

                          <button
                            type="button"
                            disabled={reviewingId === payment.payment_id}
                            onClick={() => reviewPayment(payment, 'reject')}
                            className="rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                          >
                            Reject Reference
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <div className="mt-6 flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={() => downloadInvoice(selectedInvoice)}
                  className="rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-800"
                >
                  Download Record
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedInvoice(null)}
                  className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold hover:bg-slate-100"
                >
                  Close
                </button>
              </div>
            </section>
          </div>
        )}

        <p className="mt-6 text-sm leading-6 text-slate-500">
          Payment references are user-submitted and are not proof of payment.
          Confirm receipt in your bank/UPI records before approving. Invoice
          status is updated by the backend after approval.
        </p>
      </div>
    </div>
  )
}
