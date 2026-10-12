
import { useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../../services/api'

export default function ProviderManagement() {
  const [providers, setProviders] = useState([])
  const [search, setSearch] = useState('')
  const [selectedProvider, setSelectedProvider] = useState(null)
  const [loading, setLoading] = useState(true)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [error, setError] = useState('')
  const [detailsError, setDetailsError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadProviders() {
      setLoading(true)
      setError('')

      try {
        const data = await apiRequest('/admin/users')

        if (!data.success) {
          throw new Error(data.message || 'Failed to load providers.')
        }

        const providerUsers = (data.users || []).filter(
          (user) => user.role === 'provider',
        )

        if (!cancelled) {
          setProviders(providerUsers)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Unable to load providers.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadProviders()

    return () => {
      cancelled = true
    }
  }, [])

  const stats = useMemo(
    () => ({
      total: providers.length,
      withCompany: providers.filter((p) => p.company_name).length,
      withPhone: providers.filter((p) => p.phone).length,
    }),
    [providers],
  )

  const filteredProviders = useMemo(() => {
    const query = search.trim().toLowerCase()

    return providers.filter((provider) =>
      [
        provider.id,
        provider.name,
        provider.email,
        provider.company_name,
        provider.phone,
      ].some((value) => String(value || '').toLowerCase().includes(query)),
    )
  }, [providers, search])

  async function openDetails(provider) {
    setSelectedProvider(provider)
    setDetailsError('')
    setDetailsLoading(true)

    try {
      const data = await apiRequest(`/admin/users/${provider.id}`)

      if (!data.success || !data.user) {
        throw new Error(data.message || 'Failed to load provider details.')
      }

      setSelectedProvider(data.user)
    } catch (err) {
      setDetailsError(err.message || 'Unable to load provider details.')
    } finally {
      setDetailsLoading(false)
    }
  }

  function exportCSV() {
    const columns = [
      ['id', 'Provider ID'],
      ['name', 'Contact Name'],
      ['email', 'Email'],
      ['company_name', 'Company'],
      ['phone', 'Phone'],
      ['address', 'Address'],
      ['created_at', 'Registration Date'],
    ]

    const escapeCSV = (value) =>
      `"${String(value ?? '').replace(/"/g, '""')}"`

    const rows = [
      columns.map(([, heading]) => escapeCSV(heading)).join(','),
      ...filteredProviders.map((provider) =>
        columns
          .map(([key]) => escapeCSV(provider[key]))
          .join(','),
      ),
    ]

    const blob = new Blob(['\uFEFF' + rows.join('\r\n')], {
      type: 'text/csv;charset=utf-8;',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = 'smart-cargo-providers.csv'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  function formatDate(value) {
    if (!value) return '—'

    const date = new Date(value)

    return Number.isNaN(date.getTime())
      ? '—'
      : date.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
  }

  return (
    <div className="min-h-screen bg-slate-100 p-5 text-slate-900 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-blue-700">
              Administration / Logistics Network
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight">
              Provider Management
            </h1>
            <p className="mt-2 text-slate-600">
              View registered logistics providers and their profile details.
            </p>
          </div>

          <button
            type="button"
            onClick={exportCSV}
            disabled={loading || filteredProviders.length === 0}
            className="w-fit rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Export CSV
          </button>
        </div>

        <div className="mt-7 grid gap-4 sm:grid-cols-3">
          {[
            {
              label: 'Registered Providers',
              value: stats.total,
              icon: '🚛',
              color: 'text-slate-900',
            },
            {
              label: 'Company Profiles',
              value: stats.withCompany,
              icon: '🏢',
              color: 'text-blue-700',
            },
            {
              label: 'Profiles with Phone',
              value: stats.withPhone,
              icon: '☎️',
              color: 'text-emerald-700',
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-slate-500">
                  {stat.label}
                </p>
                <span className="text-xl">{stat.icon}</span>
              </div>
              <p className={`mt-3 text-3xl font-extrabold ${stat.color}`}>
                {loading ? '—' : stat.value}
              </p>
            </div>
          ))}
        </div>

        <section className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <h2 className="text-lg font-bold">Registered Providers</h2>
            <p className="mt-1 text-sm text-slate-500">
              {loading
                ? 'Loading provider accounts...'
                : `${filteredProviders.length} matching provider${filteredProviders.length === 1 ? '' : 's'}`}
            </p>

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search company, contact, email or ID..."
              aria-label="Search providers"
              className="mt-5 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          {error && (
            <div
              role="alert"
              className="m-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              <p className="font-semibold">Could not load providers</p>
              <p className="mt-1">{error}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-3 rounded-lg border border-red-300 px-3 py-2 font-semibold hover:bg-red-100"
              >
                Reload page
              </button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-4 font-semibold">Provider</th>
                  <th className="px-5 py-4 font-semibold">Contact</th>
                  <th className="px-5 py-4 font-semibold">Company</th>
                  <th className="px-5 py-4 font-semibold">Registered</th>
                  <th className="px-5 py-4 font-semibold">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {!loading &&
                  !error &&
                  filteredProviders.map((provider) => (
                    <tr key={provider.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <p className="font-semibold">
                          {provider.name || '—'}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          ID: {provider.id}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p>{provider.email || '—'}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {provider.phone || 'Phone not provided'}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        {provider.company_name || 'Not provided'}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {formatDate(provider.created_at)}
                      </td>

                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => openDetails(provider)}
                          className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold hover:bg-slate-100"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}

                {!loading && !error && filteredProviders.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-12 text-center text-slate-500"
                    >
                      {providers.length === 0
                        ? 'No provider accounts are registered yet.'
                        : 'No providers match your search.'}
                    </td>
                  </tr>
                )}

                {loading && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-12 text-center text-slate-500"
                    >
                      Loading provider accounts...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {selectedProvider && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setSelectedProvider(null)
              }
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="provider-dialog-title"
              className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-blue-700">
                    Registered Provider
                  </p>
                  <h2
                    id="provider-dialog-title"
                    className="mt-1 text-xl font-extrabold"
                  >
                    {selectedProvider.company_name ||
                      selectedProvider.name ||
                      'Provider Details'}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedProvider(null)}
                  aria-label="Close provider details"
                  className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100"
                >
                  ✕
                </button>
              </div>

              {detailsLoading ? (
                <p className="py-10 text-center text-slate-500">
                  Loading provider details...
                </p>
              ) : detailsError ? (
                <div
                  role="alert"
                  className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                >
                  {detailsError}
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  {[
                    ['Provider ID', selectedProvider.id],
                    ['Contact Person', selectedProvider.name],
                    ['Email', selectedProvider.email],
                    ['Phone', selectedProvider.phone],
                    ['Company', selectedProvider.company_name],
                    ['Address', selectedProvider.address],
                    ['Registration Date', formatDate(selectedProvider.created_at)],
                    ['Account Role', selectedProvider.role],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="flex flex-col justify-between gap-1 border-b border-slate-100 pb-3 sm:flex-row sm:gap-4"
                    >
                      <span className="text-sm text-slate-500">{label}</span>
                      <span className="break-words text-sm font-semibold sm:text-right">
                        {value || 'Not provided'}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <p className="mt-5 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                This page displays the account and profile information
                currently available from the backend. Approval and suspension
                are not available until corresponding backend endpoints exist.
              </p>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedProvider(null)}
                  className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Close
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
