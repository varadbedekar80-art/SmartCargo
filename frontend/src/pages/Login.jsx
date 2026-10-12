
import { useState } from 'react'
import { apiRequest } from '../services/api'

export default function Login({ onLogin, onNavigate }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })

  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (event) => {
    const { name, value } = event.target

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }))

    setError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    const email = formData.email.trim().toLowerCase()
    const password = formData.password

    if (!email || !password) {
      setError('Please enter your email and password.')
      return
    }

    setLoading(true)

    try {
      const result = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })

      if (!result.success || !result.token || !result.user) {
        throw new Error(result.message || 'Unable to sign in.')
      }

      const user = result.user

      // The backend determines the role.
      const roleMap = {
        business_user: 'Business User',
        provider: 'Logistics Provider',
        administrator: 'Administrator',
        admin: 'Administrator',
      }

      const frontendRole = roleMap[user.role]

      if (!frontendRole) {
        throw new Error('Your account has an unsupported role.')
      }

      // Store the token and user for this browser session.
      sessionStorage.setItem('smartCargoToken', result.token)
      sessionStorage.setItem('smartCargoUser', JSON.stringify(user))

      if (onLogin) {
        onLogin({
          token: result.token,
          user,
          role: frontendRole,
        })
      } else {
        setError(
          'Login succeeded, but the application navigation is not configured.'
        )
      }
    } catch (err) {
      setError(
        err instanceof TypeError
          ? 'Cannot reach the backend. Check that the server is running.'
          : err.message || 'Login failed. Please try again.'
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
              Smarter logistics
            </p>

            <h1 className="text-4xl font-bold leading-tight">
              Your cargo journey starts here.
            </h1>

            <p className="mt-5 leading-7 text-slate-300">
              Manage shipments, coordinate logistics, and keep your export
              operations organized in one place.
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
            className="mb-8 text-sm font-medium text-slate-500 hover:text-blue-700"
          >
            ← Back to home
          </button>

          <h2 className="text-3xl font-bold text-slate-900">
            Welcome back
          </h2>

          <p className="mt-2 text-slate-500">
            Sign in to access your Smart Cargo account.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
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
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
              />
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
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 pr-20 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
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

            {error && (
              <p
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-700 px-4 py-3 font-semibold text-white shadow-md hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-slate-600">
            Don&apos;t have an account?{' '}
            <button
              type="button"
              onClick={() => onNavigate?.('Register')}
              className="font-semibold text-blue-700 hover:text-blue-900"
            >
              Create account
            </button>
          </p>

          <p className="mt-6 text-center text-xs leading-5 text-slate-400">
            Sign in securely with your Smart Cargo account.
          </p>
        </section>
      </div>
    </main>
  )
}

