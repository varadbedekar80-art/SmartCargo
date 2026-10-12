
import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../../services/api'

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
}

export default function ProviderInvoices() {
  const [invoices, setInvoices] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')

  const loadInvoices = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response = await apiRequest('/invoices/provider')

      setInvoices(
        (Array.isArray(response.invoices) ? response.invoices : []).map(
          (invoice) => ({
            ...invoice,
            amount: Number(invoice.amount) || 0,
            status: normalizeStatus(invoice.status),
          }),
        ),
      )
    } catch (err) {
      setError(err.message || 'Unable to load invoices.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadInvoices()
  }, [loadInvoices])

  const totals = useMemo(() => {
    return invoices.reduce(
      (result, invoice) => {
        result.billed += invoice.amount

        // Invoice records currently expose invoice status, not individual
        // successful payment totals. These figures are based on that status.
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
      'Invoice record generated from Smart Cargo system data.',
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
      'Payment details and due dates are not included because they are not',
      'provided by the current provider invoice endpoint.',
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
    setError('')

    try {
      const response = await apiRequest(
        `/invoices/provider/${invoice.id}`,
      )

      if (response.invoice) {
        setSelectedInvoice({
          ...response.invoice,
          amount: Number(response.invoice.amount) || 0,
          status: normalizeStatus(response.invoice.status),
        })
      }
    } catch (err) {
      // The list record is still available if detail retrieval fails.
      setFeedback(
        `Showing the available invoice record. ${err.message || 'Detailed retrieval failed.'}`,
      )
    }
  }

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
              Review invoices associated with your shipments and their recorded status.
            </p>
          </div>

          <button
            type="button"
            onClick={loadInvoices}
            disabled={loading}
            className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Refreshing…' : 'Refresh Invoices'}
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            <p>{error}</p>
            <p className="mt-1 text-xs">
              Check that the backend is running, you are signed in as a
              Provider, and the provider invoice route and service have been added.
            </p>
            <button
              type="button"
              onClick={loadInvoices}
              className="mt-3 rounded-lg border border-red-300 px-3 py-2 font-semibold hover:bg-red-100"
            >
              Try Again
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

        <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Total Invoiced</p>
            <p className="mt-3 text-2xl font-extrabold">
              {currency(totals.billed)}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              {invoices.length} recorded invoice{invoices.length === 1 ? '' : 's'}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Value of Paid Invoices
            </p>
            <p className="mt-3 text-2xl font-extrabold text-emerald-700">
              {currency(totals.received)}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Based on invoice status, not payment transactions
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Unpaid Invoice Value
            </p>
            <p className="mt-3 text-2xl font-extrabold text-amber-700">
              {currency(totals.outstanding)}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Includes invoices not marked as paid
            </p>
          </div>
        </div>

        <section className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold">Invoice Records</h2>
              <p className="mt-1 text-sm text-slate-500">
                {loading
                  ? 'Loading invoices…'
                  : `${filteredInvoices.length} invoice${filteredInvoices.length === 1 ? '' : 's'} found`}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search invoice, shipment, route…"
                aria-label="Search invoices"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
              />

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                aria-label="Filter invoices by status"
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
              >
                <option value="All">All statuses</option>
                <option value="Paid">Paid</option>
                <option value="Unpaid">Unpaid</option>
                <option value="Overdue">Overdue</option>
                <option value="Partially Paid">Partially Paid</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-4 font-semibold">Invoice</th>
                  <th className="px-5 py-4 font-semibold">Shipment / Customer</th>
                  <th className="px-5 py-4 font-semibold">Issue Date</th>
                  <th className="px-5 py-4 font-semibold">Route</th>
                  <th className="px-5 py-4 font-semibold">Amount</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 font-semibold">Actions</th>
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
                        <p className="font-medium">
                          Shipment #{invoice.shipment_id}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Customer user #{invoice.customer_user_id ?? '—'}
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
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => viewInvoice(invoice)}
                            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold hover:bg-slate-100"
                          >
                            View
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
                    <td
                      colSpan={7}
                      className="px-5 py-12 text-center text-slate-500"
                    >
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
              className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-blue-700">
                    Invoice Details
                  </p>
                  <h2
                    id="invoice-dialog-title"
                    className="mt-1 text-xl font-extrabold"
                  >
                    {selectedInvoice.invoice_number ||
                      `Invoice #${selectedInvoice.id}`}
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
                  ['Due Date', 'Not available'],
                  ['Invoice Amount', currency(selectedInvoice.amount)],
                  ['Invoice Status', selectedInvoice.status],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex flex-col justify-between gap-1 border-b border-slate-100 pb-3 sm:flex-row sm:gap-4"
                  >
                    <span className="text-sm text-slate-500">{label}</span>
                    <span className="text-sm font-semibold sm:text-right">
                      {value}
                    </span>
                  </div>
                ))}
              </div>

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
          Invoice information comes from the backend. The current invoice API
          does not provide payment transaction totals or due dates, so this page
          does not invent them or mark invoices as paid.
        </p>
      </div>
    </div>
  )
}
