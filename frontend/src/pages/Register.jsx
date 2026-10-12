
import { useState } from 'react'
import { apiRequest } from '../services/api'

export default function Register({ onRegister, onNavigate }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    role: 'business_user',
    password: '',
    confirmPassword: '',
  })

  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleChange = (event) => {
    const { name, value } = event.target

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }))

    setError('')
    setSuccess('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    const name = formData.name.trim()
    const email = formData.email.trim().toLowerCase()
    const companyName = formData.company.trim()
    const password = formData.password

    if (!name || !email || !password) {
      setError('Please complete all required fields.')
      return
    }

    if (password.length < 8 || password.length > 128) {
      setError('Password must contain between 8 and 128 characters.')
      return
    }

    if (password !== formData.confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (formData.role === 'provider' && !companyName) {
      setError('Company name is required for logistics providers.')
      return
    }

    setLoading(true)

    try {
      const payload = {
        name,
        email,
        password,
        role: formData.role,
      }

      if (formData.role === 'provider') {
        payload.companyName = companyName
      }

      const result = await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      if (!result.success) {
        throw new Error(result.message || 'Registration failed.')
      }

      setSuccess(
        'Account created successfully. Redirecting to sign in…'
      )

      if (onRegister) {
        onRegister(result)
      } else if (onNavigate) {
        onNavigate('Login')
      }
    } catch (err) {
      setError(
        err instanceof TypeError
          ? 'Cannot reach the backend. Make sure the server is running on port 5000.'
          : err.message || 'Registration failed. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-xl md:grid-cols-2">
        <section className="hidden flex-col justify-between bg-slate-950 p-10 text-white md:flex">
          <button
            type="button"
            onClick={() => onNavigate?.('Home')}
            className="w-fit text-2xl font-bold"
          >
            Smart<span className="text-cyan-400">Cargo</span>
          </button>

          <div>
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-cyan-400">
              Join Smart Cargo
            </p>

            <h1 className="text-4xl font-bold leading-tight">
              Make logistics simpler.
            </h1>

            <p className="mt-5 leading-7 text-slate-300">
              Create your account to manage cargo shipments, coordinate
              logistics, and organize your export operations.
            </p>
          </div>

          <p className="text-sm text-slate-400">
            Smart Cargo Export &amp; Logistics Management System
          </p>
        </section>

        <section className="p-6 sm:p-10">
          <button
            type="button"
            onClick={() => onNavigate?.('Home')}
            className="mb-6 text-sm font-medium text-slate-500 hover:text-blue-700"
          >
            ← Back to home
          </button>

          <h2 className="text-3xl font-bold text-slate-900">
            Create your account
          </h2>

          <p className="mt-2 text-slate-500">
            Enter your details to get started.
          </p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <div>
              <label
                htmlFor="name"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Full name
              </label>

              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your full name"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Email address
              </label>

              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="you@company.com"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                htmlFor="company"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Company name{' '}
                {formData.role === 'provider' ? (
                  <span className="text-red-600">*</span>
                ) : (
                  <span className="font-normal text-slate-400">
                    (optional)
                  </span>
                )}
              </label>

              <input
                id="company"
                name="company"
                type="text"
                autoComplete="organization"
                required={formData.role === 'provider'}
                value={formData.company}
                onChange={handleChange}
                placeholder="Enter your company name"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                htmlFor="role"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Account type
              </label>

              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
              >
                <option value="business_user">
                  Business User / Exporter
                </option>
                <option value="provider">
                  Logistics Provider
                </option>
              </select>

              <p className="mt-2 text-xs leading-5 text-slate-500">
                Administrator accounts should be created and managed securely
                by the system administrator.
              </p>
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Password
              </label>

              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  maxLength={128}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="At least 8 characters"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 pr-20 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword((previous) => !previous)
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-blue-700"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Confirm password
              </label>

              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={128}
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Re-enter your password"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </p>
            )}

            {success && (
              <p
                role="status"
                className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
              >
                {success}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-700 px-4 py-3 font-semibold text-white shadow-md hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => onNavigate?.('Login')}
              className="font-semibold text-blue-700 hover:text-blue-900"
            >
              Sign in
            </button>
          </p>
        </section>
      </div>
    </main>
  )
}
