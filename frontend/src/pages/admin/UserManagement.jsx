
import { useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../../services/api'

const roleLabels = {
  business_user: 'Business User',
  provider: 'Logistics Provider',
  admin: 'Administrator',
}

const roleStyles = {
  business_user: 'bg-blue-50 text-blue-700',
  provider: 'bg-violet-50 text-violet-700',
  admin: 'bg-amber-50 text-amber-700',
}

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

const escapeCell = (value) =>
  `"${String(value ?? '').replace(/"/g, '""')}"`

export default function UserManagement() {
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('All')
  const [selectedUser, setSelectedUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [error, setError] = useState('')
  const [detailsError, setDetailsError] = useState('')
  const [exportError, setExportError] = useState('')

  useEffect(() => {
    let active = true

    async function loadUsers() {
      setLoading(true)
      setError('')

      try {
        const response = await apiRequest('/admin/users')

        if (!active) return

        setUsers(Array.isArray(response.users) ? response.users : [])
      } catch (err) {
        if (active) {
          setError(err.message || 'Failed to load registered accounts.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadUsers()

    return () => {
      active = false
    }
  }, [])

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase()

    return users.filter((user) => {
      const matchesSearch =
        !query ||
        String(user.id ?? '').toLowerCase().includes(query) ||
        String(user.name ?? '').toLowerCase().includes(query) ||
        String(user.email ?? '').toLowerCase().includes(query) ||
        String(user.company_name ?? '').toLowerCase().includes(query) ||
        String(user.phone ?? '').toLowerCase().includes(query)

      const matchesRole =
        roleFilter === 'All' || user.role === roleFilter

      return matchesSearch && matchesRole
    })
  }, [users, search, roleFilter])

  const stats = useMemo(
    () => ({
      total: users.length,
      businesses: users.filter(
        (user) => user.role === 'business_user',
      ).length,
      providers: users.filter(
        (user) => user.role === 'provider',
      ).length,
      administrators: users.filter(
        (user) => user.role === 'admin',
      ).length,
    }),
    [users],
  )

  async function viewUser(user) {
    setSelectedUser(user)
    setDetailsLoading(true)
    setDetailsError('')

    try {
      const response = await apiRequest(`/admin/users/${user.id}`)

      setSelectedUser((current) =>
        current?.id === user.id
          ? { ...user, ...(response.user || {}) }
          : current,
      )
    } catch (err) {
      setDetailsError(
        err.message || 'Could not load full account details.',
      )
    } finally {
      setDetailsLoading(false)
    }
  }

  function exportUsers() {
    setExportError('')

    try {
      const headings = [
        'User ID',
        'Name',
        'Email',
        'Role',
        'Company',
        'Phone',
        'Registration Date',
      ]

      const rows = filteredUsers.map((user) => [
        user.id,
        user.name,
        user.email,
        roleLabels[user.role] || user.role,
        user.company_name,
        user.phone,
        formatDate(user.created_at),
      ])

      const csv = [headings, ...rows]
        .map((row) => row.map(escapeCell).join(','))
        .join('\r\n')

      const blob = new Blob(['\uFEFF', csv], {
        type: 'text/csv;charset=utf-8;',
      })

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')

      link.href = url
      link.download = 'smart-cargo-users.csv'
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch {
      setExportError('Unable to export users. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 p-5 text-slate-900 lg:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Heading */}
        <div>
          <p className="text-sm font-medium text-blue-700">
            Administration / Accounts
          </p>

          <h1 className="mt-2 text-3xl font-extrabold tracking-tight">
            User Management
          </h1>

          <p className="mt-2 text-slate-600">
            View registered business users, logistics providers,
            and administrator accounts.
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="mt-7 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="font-semibold text-slate-800">
              Loading registered accounts...
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Retrieving data from the server.
            </p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div
            role="alert"
            className="mt-7 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800"
          >
            <p className="font-bold">Unable to load users</p>
            <p className="mt-2">{error}</p>
            <p className="mt-2 text-xs">
              Check your administrator login and ensure the backend is running.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 rounded-lg bg-red-700 px-4 py-2 font-semibold text-white hover:bg-red-800"
            >
              Reload Page
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Statistics */}
            <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  label: 'Total Accounts',
                  value: stats.total,
                  icon: '👥',
                  color: 'text-slate-900',
                },
                {
                  label: 'Business Users',
                  value: stats.businesses,
                  icon: '🏢',
                  color: 'text-blue-700',
                },
                {
                  label: 'Logistics Providers',
                  value: stats.providers,
                  icon: '🚚',
                  color: 'text-violet-700',
                },
                {
                  label: 'Administrators',
                  value: stats.administrators,
                  icon: '🛡️',
                  color: 'text-amber-700',
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
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>

            {/* User table */}
            <section className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 p-5">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <h2 className="text-lg font-bold">
                      Registered Accounts
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {filteredUsers.length} matching account
                      {filteredUsers.length === 1 ? '' : 's'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={exportUsers}
                    className="w-fit rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
                  >
                    ↓ Export CSV
                  </button>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search name, email, company, phone..."
                    aria-label="Search registered accounts"
                    className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                  />

                  <select
                    value={roleFilter}
                    onChange={(event) => setRoleFilter(event.target.value)}
                    aria-label="Filter accounts by role"
                    className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                  >
                    <option value="All">All roles</option>
                    <option value="business_user">Business User</option>
                    <option value="provider">Logistics Provider</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                {exportError && (
                  <p role="alert" className="mt-3 text-sm text-red-700">
                    {exportError}
                  </p>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-4 font-semibold">User</th>
                      <th className="px-5 py-4 font-semibold">Company</th>
                      <th className="px-5 py-4 font-semibold">Phone</th>
                      <th className="px-5 py-4 font-semibold">Role</th>
                      <th className="px-5 py-4 font-semibold">Registered</th>
                      <th className="px-5 py-4 font-semibold">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50">
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-900">
                            {user.name || '—'}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {user.email}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            ID: {user.id}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-slate-700">
                          {user.company_name || '—'}
                        </td>

                        <td className="px-5 py-4 text-slate-700">
                          {user.phone || '—'}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${
                              roleStyles[user.role] ||
                              'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {roleLabels[user.role] || user.role || 'Unknown'}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                          {formatDate(user.created_at)}
                        </td>

                        <td className="px-5 py-4">
                          <button
                            type="button"
                            onClick={() => viewUser(user)}
                            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold hover:bg-slate-100"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}

                    {filteredUsers.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-5 py-12 text-center text-slate-500"
                        >
                          {users.length === 0
                            ? 'No registered accounts found.'
                            : 'No accounts match your search or selected role.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {/* Account details modal */}
        {selectedUser && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setSelectedUser(null)
              }
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="user-dialog-title"
              className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-blue-700">
                    Account Details
                  </p>
                  <h2
                    id="user-dialog-title"
                    className="mt-1 text-xl font-extrabold"
                  >
                    {selectedUser.name || 'User Account'}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  aria-label="Close account details"
                  className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100"
                >
                  ✕
                </button>
              </div>

              {detailsLoading && (
                <p className="mt-6 text-sm text-slate-500">
                  Loading full account details...
                </p>
              )}

              {detailsError && (
                <p role="alert" className="mt-5 text-sm text-red-700">
                  {detailsError}
                </p>
              )}

              <div className="mt-6 space-y-4">
                {[
                  ['User ID', selectedUser.id],
                  ['Name', selectedUser.name],
                  ['Email', selectedUser.email],
                  [
                    'Role',
                    roleLabels[selectedUser.role] || selectedUser.role,
                  ],
                  ['Company', selectedUser.company_name],
                  ['Phone', selectedUser.phone],
                  ['Address', selectedUser.address],
                  ['Registration Date', formatDate(selectedUser.created_at)],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex flex-col justify-between gap-1 border-b border-slate-100 pb-3 sm:flex-row sm:gap-4"
                  >
                    <span className="text-sm text-slate-500">{label}</span>
                    <span className="break-words text-sm font-semibold sm:text-right">
                      {value || '—'}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
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