
import { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../../services/api';

const UPI_ID = 'varadbedekar80@oksbi';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);

const formatDate = (date) => {
  if (!date) return '—';

  const parsed = new Date(date);

  return Number.isNaN(parsed.getTime())
    ? '—'
    : parsed.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
};

const getStatusClass = (status) => {
  const value = String(status || '').toLowerCase();

  if (['paid', 'success', 'successful', 'completed'].includes(value)) {
    return 'bg-green-100 text-green-700';
  }

  if (
    ['pending', 'processing', 'pending_verification'].includes(value)
  ) {
    return 'bg-yellow-100 text-yellow-700';
  }

  if (
    ['failed', 'cancelled', 'canceled', 'overdue', 'rejected'].includes(value)
  ) {
    return 'bg-red-100 text-red-700';
  }

  return 'bg-gray-100 text-gray-700';
};

export default function InvoicesPayments() {
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [invoiceStatus, setInvoiceStatus] = useState('all');
  const [paymentStatus, setPaymentStatus] = useState('all');
  const [activeTab, setActiveTab] = useState('invoices');

  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoicePayments, setInvoicePayments] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState('');

  const [transactionReference, setTransactionReference] = useState('');
  const [submittingReference, setSubmittingReference] = useState(false);
  const [referenceMessage, setReferenceMessage] = useState('');
  const [referenceError, setReferenceError] = useState('');
  const [copyMessage, setCopyMessage] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError('');

    try {
      const [invoiceResult, paymentResult] = await Promise.all([
        apiRequest('/invoices'),
        apiRequest('/payments'),
      ]);

      setInvoices(
        Array.isArray(invoiceResult.invoices)
          ? invoiceResult.invoices
          : []
      );

      setPayments(
        Array.isArray(paymentResult.payments)
          ? paymentResult.payments
          : []
      );
    } catch (err) {
      setError(err.message || 'Failed to load invoices and payments.');
    } finally {
      setLoading(false);
    }
  }

  const filteredInvoices = useMemo(() => {
    const term = search.trim().toLowerCase();

    return invoices.filter((invoice) => {
      const matchesSearch =
        !term ||
        String(invoice.invoice_number || '').toLowerCase().includes(term) ||
        String(invoice.shipment_id || '').includes(term) ||
        String(invoice.origin || '').toLowerCase().includes(term) ||
        String(invoice.destination || '').toLowerCase().includes(term);

      const matchesStatus =
        invoiceStatus === 'all' ||
        String(invoice.status || '').toLowerCase() === invoiceStatus;

      return matchesSearch && matchesStatus;
    });
  }, [invoices, search, invoiceStatus]);

  const filteredPayments = useMemo(() => {
    const term = search.trim().toLowerCase();

    return payments.filter((payment) => {
      const matchesSearch =
        !term ||
        String(payment.invoice_number || '').toLowerCase().includes(term) ||
        String(payment.payment_reference || '').toLowerCase().includes(term) ||
        String(payment.shipment_id || '').includes(term);

      const matchesStatus =
        paymentStatus === 'all' ||
        String(payment.status || '').toLowerCase() === paymentStatus;

      return matchesSearch && matchesStatus;
    });
  }, [payments, search, paymentStatus]);

  const totalInvoiced = invoices.reduce(
    (sum, invoice) => sum + (Number(invoice.amount) || 0),
    0
  );

  const totalPaid = invoices
    .filter(
      (invoice) => String(invoice.status || '').toLowerCase() === 'paid'
    )
    .reduce((sum, invoice) => sum + (Number(invoice.amount) || 0), 0);

  const totalSuccessfulPayments = payments
    .filter((payment) =>
      ['success', 'successful', 'completed', 'paid'].includes(
        String(payment.status || '').toLowerCase()
      )
    )
    .reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);

  async function viewInvoice(invoice) {
    setSelectedInvoice(invoice);
    setInvoicePayments([]);
    setDetailsError('');
    setReferenceMessage('');
    setReferenceError('');
    setTransactionReference('');
    setCopyMessage('');
    setDetailsLoading(true);

    try {
      const [invoiceResult, paymentResult] = await Promise.all([
        apiRequest(`/invoices/${invoice.id}`),
        apiRequest(`/payments/invoice/${invoice.id}`),
      ]);

      setSelectedInvoice(invoiceResult.invoice || invoice);

      setInvoicePayments(
        Array.isArray(paymentResult.payments)
          ? paymentResult.payments
          : []
      );
    } catch (err) {
      setDetailsError(
        err.message || 'Could not load the invoice details.'
      );
    } finally {
      setDetailsLoading(false);
    }
  }

  function closeDetails() {
    setSelectedInvoice(null);
    setInvoicePayments([]);
    setDetailsError('');
    setReferenceMessage('');
    setReferenceError('');
    setTransactionReference('');
    setCopyMessage('');
  }

  async function copyUpiId() {
    try {
      await navigator.clipboard.writeText(UPI_ID);
      setCopyMessage('UPI ID copied successfully.');
    } catch {
      setCopyMessage(
        `Copy this UPI ID manually: ${UPI_ID}`
      );
    }
  }

  async function submitPaymentReference(event) {
    event.preventDefault();

    const reference = transactionReference.trim();

    if (!selectedInvoice) return;

    if (reference.length < 6) {
      setReferenceError(
        'Please enter a valid UPI transaction reference.'
      );
      return;
    }

    if (reference.length > 255) {
      setReferenceError('The transaction reference is too long.');
      return;
    }

    setSubmittingReference(true);
    setReferenceError('');
    setReferenceMessage('');

    try {
      await apiRequest('/payments', {
        method: 'POST',
        body: JSON.stringify({
          invoice_id: selectedInvoice.id,
          payment_reference: reference,
        }),
      });

      setReferenceMessage(
        'Transaction reference submitted. Your payment is awaiting verification.'
      );
      setTransactionReference('');

      const [invoiceResult, paymentResult, allPaymentResult] =
        await Promise.all([
          apiRequest(`/invoices/${selectedInvoice.id}`),
          apiRequest(`/payments/invoice/${selectedInvoice.id}`),
          apiRequest('/payments'),
        ]);

      setSelectedInvoice(invoiceResult.invoice || selectedInvoice);

      setInvoicePayments(
        Array.isArray(paymentResult.payments)
          ? paymentResult.payments
          : []
      );

      setPayments(
        Array.isArray(allPaymentResult.payments)
          ? allPaymentResult.payments
          : []
      );
    } catch (err) {
      setReferenceError(
        err.message || 'Could not submit the transaction reference.'
      );
    } finally {
      setSubmittingReference(false);
    }
  }

  const invoiceIsPaid =
    String(selectedInvoice?.status || '').toLowerCase() === 'paid';

  const referenceAlreadySubmitted = invoicePayments.some((payment) =>
    [
      'pending_verification',
      'success',
      'successful',
      'completed',
      'paid',
    ].includes(String(payment.status || '').toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-7">
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            Invoices & Payments
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            View your shipment invoices and payment history.
          </p>
        </div>

        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <SummaryCard
            title="Total Invoiced"
            amount={formatCurrency(totalInvoiced)}
            description={`${invoices.length} invoice(s)`}
            color="blue"
          />

          <SummaryCard
            title="Invoices Marked Paid"
            amount={formatCurrency(totalPaid)}
            description="Based on invoice status"
            color="green"
          />

          <SummaryCard
            title="Successful Payments"
            amount={formatCurrency(totalSuccessfulPayments)}
            description={`${payments.length} payment record(s)`}
            color="purple"
          />
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-wrap gap-2 border-b border-gray-200 p-4">
            <button
              type="button"
              onClick={() => setActiveTab('invoices')}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                activeTab === 'invoices'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Invoices ({invoices.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('payments')}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                activeTab === 'payments'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Payments ({payments.length})
            </button>
          </div>

          <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={
                activeTab === 'invoices'
                  ? 'Search invoice, shipment, or route...'
                  : 'Search invoice or payment reference...'
              }
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

            <select
              value={
                activeTab === 'invoices' ? invoiceStatus : paymentStatus
              }
              onChange={(event) => {
                if (activeTab === 'invoices') {
                  setInvoiceStatus(event.target.value);
                } else {
                  setPaymentStatus(event.target.value);
                }
              }}
              className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            >
              <option value="all">All statuses</option>

              {activeTab === 'invoices' ? (
                <>
                  <option value="unpaid">Unpaid</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                </>
              ) : (
                <>
                  <option value="pending">Pending</option>
                  <option value="pending_verification">
                    Pending Verification
                  </option>
                  <option value="success">Success</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                </>
              )}
            </select>
          </div>

          {loading ? (
            <div className="p-12 text-center text-sm text-gray-500">
              Loading invoices and payments...
            </div>
          ) : activeTab === 'invoices' ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-5 py-4">Invoice</th>
                    <th className="px-5 py-4">Shipment</th>
                    <th className="px-5 py-4">Route</th>
                    <th className="px-5 py-4">Date</th>
                    <th className="px-5 py-4">Amount</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {filteredInvoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-5 py-4 font-semibold text-gray-900">
                        {invoice.invoice_number || `INV-${invoice.id}`}
                      </td>

                      <td className="px-5 py-4 text-gray-600">
                        #{invoice.shipment_id}
                      </td>

                      <td className="px-5 py-4 text-gray-600">
                        <div>{invoice.origin || '—'}</div>
                        <div className="text-xs text-gray-400">
                          to {invoice.destination || '—'}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-gray-600">
                        {formatDate(invoice.created_at)}
                      </td>

                      <td className="px-5 py-4 font-semibold text-gray-900">
                        {formatCurrency(invoice.amount)}
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge status={invoice.status} />
                      </td>

                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => viewInvoice(invoice)}
                          className="font-semibold text-blue-600 hover:text-blue-800"
                        >
                          View details
                        </button>
                      </td>
                    </tr>
                  ))}

                  {filteredInvoices.length === 0 && (
                    <EmptyRow message="No invoices match your search." />
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[750px] text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-5 py-4">Invoice</th>
                    <th className="px-5 py-4">Payment Reference</th>
                    <th className="px-5 py-4">Date</th>
                    <th className="px-5 py-4">Paid At</th>
                    <th className="px-5 py-4">Amount</th>
                    <th className="px-5 py-4">Status</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {filteredPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-5 py-4 font-semibold text-gray-900">
                        {payment.invoice_number ||
                          `INV-${payment.invoice_id}`}
                      </td>

                      <td className="px-5 py-4 text-gray-600">
                        {payment.payment_reference || '—'}
                      </td>

                      <td className="px-5 py-4 text-gray-600">
                        {formatDate(payment.created_at)}
                      </td>

                      <td className="px-5 py-4 text-gray-600">
                        {formatDate(payment.paid_at)}
                      </td>

                      <td className="px-5 py-4 font-semibold text-gray-900">
                        {formatCurrency(payment.amount)}
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge status={payment.status} />
                      </td>
                    </tr>
                  ))}

                  {filteredPayments.length === 0 && (
                    <EmptyRow message="No payment records match your search." />
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div className="border-t border-gray-100 px-5 py-3 text-xs text-gray-500">
            UPI references are submitted for verification. An invoice should
            only be marked paid after the payment has been verified.
          </div>
        </div>
      </div>

      {selectedInvoice && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closeDetails}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="invoice-dialog-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2
                  id="invoice-dialog-title"
                  className="text-xl font-bold text-gray-900"
                >
                  Invoice Details
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  {selectedInvoice.invoice_number ||
                    `INV-${selectedInvoice.id}`}
                </p>
              </div>

              <button
                type="button"
                onClick={closeDetails}
                aria-label="Close invoice details"
                className="rounded-lg px-3 py-1 text-xl text-gray-500 hover:bg-gray-100"
              >
                ×
              </button>
            </div>

            {detailsLoading ? (
              <p className="py-8 text-center text-sm text-gray-500">
                Loading invoice details and payment history...
              </p>
            ) : (
              <>
                {detailsError && (
                  <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                    {detailsError}
                  </div>
                )}

                <div className="grid gap-4 rounded-lg bg-gray-50 p-4 sm:grid-cols-2">
                  <Detail
                    label="Invoice Amount"
                    value={formatCurrency(selectedInvoice.amount)}
                  />
                  <Detail
                    label="Invoice Status"
                    value={selectedInvoice.status || '—'}
                  />
                  <Detail
                    label="Shipment ID"
                    value={`#${selectedInvoice.shipment_id ?? '—'}`}
                  />
                  <Detail
                    label="Transport Mode"
                    value={selectedInvoice.mode || '—'}
                  />
                  <Detail
                    label="Origin"
                    value={selectedInvoice.origin || '—'}
                  />
                  <Detail
                    label="Destination"
                    value={selectedInvoice.destination || '—'}
                  />
                  <Detail
                    label="Created Date"
                    value={formatDate(selectedInvoice.created_at)}
                  />
                </div>

                {!invoiceIsPaid && !referenceAlreadySubmitted && (
                  <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-5">
                    <h3 className="text-lg font-semibold text-blue-900">
                      Pay via UPI
                    </h3>

                    <p className="mt-2 text-sm text-gray-700">
                      Open your preferred UPI app and pay the invoice amount
                      to this UPI ID:
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <span className="break-all font-bold text-blue-900">
                        {UPI_ID}
                      </span>

                      <button
                        type="button"
                        onClick={copyUpiId}
                        className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                      >
                        Copy UPI ID
                      </button>
                    </div>

                    {copyMessage && (
                      <p className="mt-2 text-sm text-blue-800">
                        {copyMessage}
                      </p>
                    )}

                    <p className="mt-3 text-sm text-gray-700">
                      After completing the payment, enter the UPI transaction
                      reference (UTR) below. The reference will be reviewed
                      before the invoice is marked paid.
                    </p>

                    <form
                      onSubmit={submitPaymentReference}
                      className="mt-4 space-y-3"
                    >
                      <label
                        htmlFor="transaction-reference"
                        className="block text-sm font-semibold text-gray-800"
                      >
                        UPI Transaction Reference / UTR
                      </label>

                      <input
                        id="transaction-reference"
                        type="text"
                        value={transactionReference}
                        onChange={(event) => {
                          setTransactionReference(event.target.value);
                          setReferenceError('');
                          setReferenceMessage('');
                        }}
                        placeholder="Enter your UTR number"
                        minLength={6}
                        maxLength={255}
                        required
                        disabled={submittingReference}
                        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
                      />

                      {referenceError && (
                        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                          {referenceError}
                        </p>
                      )}

                      {referenceMessage && (
                        <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
                          {referenceMessage}
                        </p>
                      )}

                      <button
                        type="submit"
                        disabled={
                          submittingReference ||
                          !transactionReference.trim()
                        }
                        className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {submittingReference
                          ? 'Submitting Reference...'
                          : 'Submit Payment Reference'}
                      </button>
                    </form>
                  </div>
                )}

                {invoiceIsPaid && (
                  <div className="mt-6 rounded-lg bg-green-50 p-4 text-sm text-green-800">
                    This invoice is marked as paid.
                  </div>
                )}

                {!invoiceIsPaid && referenceAlreadySubmitted && (
                  <div className="mt-6 rounded-lg bg-yellow-50 p-4 text-sm text-yellow-800">
                    A payment reference has already been submitted for this
                    invoice or a payment is recorded. Check the payment
                    history below for its current status.
                  </div>
                )}

                <h3 className="mb-3 mt-6 font-semibold text-gray-900">
                  Payments for this invoice
                </h3>

                {invoicePayments.length === 0 ? (
                  <p className="rounded-lg border border-gray-200 p-4 text-sm text-gray-500">
                    No payment records found for this invoice.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="w-full min-w-[500px] text-left text-sm">
                      <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                        <tr>
                          <th className="px-4 py-3">Reference</th>
                          <th className="px-4 py-3">Amount</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Paid At</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-gray-100">
                        {invoicePayments.map((payment) => (
                          <tr key={payment.id}>
                            <td className="break-all px-4 py-3">
                              {payment.payment_reference || '—'}
                            </td>
                            <td className="px-4 py-3">
                              {formatCurrency(payment.amount)}
                            </td>
                            <td className="px-4 py-3">
                              <StatusBadge status={payment.status} />
                            </td>
                            <td className="px-4 py-3">
                              {formatDate(payment.paid_at)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={closeDetails}
                className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ title, amount, description, color }) {
  const colors = {
    blue: 'border-blue-200 bg-blue-50',
    green: 'border-green-200 bg-green-50',
    purple: 'border-purple-200 bg-purple-50',
  };

  return (
    <div className={`rounded-xl border p-5 ${colors[color] || colors.blue}`}>
      <p className="text-sm font-medium text-gray-600">{title}</p>
      <p className="mt-3 text-2xl font-bold text-gray-900">{amount}</p>
      <p className="mt-2 text-xs text-gray-500">{description}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const label = String(status || 'Unknown')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClass(
        status
      )}`}
    >
      {label}
    </span>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-semibold text-gray-900">
        {value}
      </p>
    </div>
  );
}

function EmptyRow({ message }) {
  return (
    <tr>
      <td
        colSpan={7}
        className="px-5 py-10 text-center text-sm text-gray-500"
      >
        {message}
      </td>
    </tr>
  );
}
