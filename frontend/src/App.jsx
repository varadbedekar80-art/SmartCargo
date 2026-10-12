
import { useState } from 'react'
import './App.css'

import Login from './pages/Login'
import Register from './pages/Register'

// Business User pages
import UserDashboard from './pages/user/UserDashboard'
import CargoManagement from './pages/user/CargoManagement'
import CreateShipment from './pages/user/CreateShipment'
import MyShipments from './pages/user/MyShipments'
import AvailableOffers from './pages/user/AvailableOffers'
import TrackShipment from './pages/user/TrackShipment'
import InvoicesPayments from './pages/user/InvoicesPayments'
import UserProfile from './pages/user/UserProfile'
import UserSettings from './pages/user/UserSettings'

// Logistics Provider pages
import ProviderDashboard from './pages/provider/ProviderDashboard'
import ShipmentRequests from './pages/provider/ShipmentRequests'
import ManageOffers from './pages/provider/ManageOffers'
import ActiveShipments from './pages/provider/ActiveShipments'
import TrackingUpdates from './pages/provider/TrackingUpdates'
import ProviderInvoices from './pages/provider/ProviderInvoices'
import ProviderProfile from './pages/provider/ProviderProfile'
import ProviderSettings from './pages/provider/ProviderSettings'

// Administrator pages
import AdminDashboard from './pages/admin/AdminDashboard'
import UserManagement from './pages/admin/UserManagement'
import ProviderManagement from './pages/admin/ProviderManagement'
import AdminShipments from './pages/admin/AdminShipments'
import AdminOffers from './pages/admin/AdminOffers'
import AdminPayments from './pages/admin/AdminPayments'
import AdminReports from './pages/admin/AdminReports'
import AdminSettings from './pages/admin/AdminSettings'

// Backend role names -> frontend workspace names.
const roleMap = {
  business_user: 'Business User',
  provider: 'Logistics Provider',
  administrator: 'Administrator',
  admin: 'Administrator',
}

// Pages available to each role.
const rolePages = {
  'Business User': [
    'Dashboard',
    'Cargo Management',
    'Create Shipment',
    'My Shipments',
    'Available Offers',
    'Track Shipment',
    'Invoices & Payments',
    'Profile',
    'Settings',
  ],

  'Logistics Provider': [
    'Dashboard',
    'Shipment Requests',
    'Manage Offers',
    'Active Shipments',
    'Tracking Updates',
    'Invoices',
    'Profile',
    'Settings',
  ],

  Administrator: [
    'Dashboard',
    'User Management',
    'Provider Management',
    'Shipments',
    'Offers',
    'Payments',
    'Reports',
    'Settings',
  ],
}

// Components mapped to their respective workspaces.
const pageComponents = {
  'Business User': {
    Dashboard: UserDashboard,
    'Cargo Management': CargoManagement,
    'Create Shipment': CreateShipment,
    'My Shipments': MyShipments,
    'Available Offers': AvailableOffers,
    'Track Shipment': TrackShipment,
    'Invoices & Payments': InvoicesPayments,
    Profile: UserProfile,
    Settings: UserSettings,
  },

  'Logistics Provider': {
    Dashboard: ProviderDashboard,
    'Shipment Requests': ShipmentRequests,
    'Manage Offers': ManageOffers,
    'Active Shipments': ActiveShipments,
    'Tracking Updates': TrackingUpdates,
    Invoices: ProviderInvoices,
    Profile: ProviderProfile,
    Settings: ProviderSettings,
  },

  Administrator: {
    Dashboard: AdminDashboard,
    'User Management': UserManagement,
    'Provider Management': ProviderManagement,
    Shipments: AdminShipments,
    Offers: AdminOffers,
    Payments: AdminPayments,
    Reports: AdminReports,
    Settings: AdminSettings,
  },
}

// Only business users and logistics providers can register or
// select their role from the public login chooser.
const publicRoles = [
  {
    role: 'Business User',
    description: 'Create shipments and manage your cargo.',
  },
  {
    role: 'Logistics Provider',
    description: 'Manage requests, offers and deliveries.',
  },
]

function App() {
  // Restore the previously saved user from session storage.
  const [authUser, setAuthUser] = useState(() => {
    try {
      const savedUser = sessionStorage.getItem('smartCargoUser')
      return savedUser ? JSON.parse(savedUser) : null
    } catch {
      return null
    }
  })

  // Restore the correct workspace when the page is refreshed.
  const initialRole = authUser ? roleMap[authUser.role] : null

  const validInitialRole =
    initialRole && rolePages[initialRole] ? initialRole : null

  const [selectedRole, setSelectedRole] = useState(validInitialRole)

  const [activePage, setActivePage] = useState(
    validInitialRole ? 'Dashboard' : 'Home'
  )

  const navItems = ['Home', 'About', 'Services', 'How It Works', 'Contact']

  // General page navigation.
  const navigate = (page) => {
    setActivePage(page)
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  // Navigate to a section on the public landing page.
  const goToSection = (item) => {
    const sectionId = item.toLowerCase().replaceAll(' ', '-')

    if (activePage !== 'Home') {
      setActivePage('Home')
    }

    window.setTimeout(() => {
      document.getElementById(sectionId)?.scrollIntoView({
        behavior: 'smooth',
      })
    }, 0)
  }

  // Log out and clear the locally stored session.
  const handleLogout = () => {
    sessionStorage.removeItem('smartCargoToken')
    sessionStorage.removeItem('smartCargoUser')

    setAuthUser(null)
    setSelectedRole(null)
    setActivePage('Home')

    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  // The authenticated backend role determines the workspace.
  const handleLogin = ({ user }) => {
    const backendRole = user?.role
    const frontendRole = roleMap[backendRole]

    if (!frontendRole || !rolePages[frontendRole]) {
      sessionStorage.removeItem('smartCargoToken')
      sessionStorage.removeItem('smartCargoUser')

      setAuthUser(null)
      setSelectedRole(null)
      setActivePage('Login')

      window.alert('Your account has an unsupported role.')
      return
    }

    setAuthUser(user)
    setSelectedRole(frontendRole)
    setActivePage('Dashboard')

    sessionStorage.setItem('smartCargoUser', JSON.stringify(user))

    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  // Select a role from the public login chooser.
  const selectRole = (role) => {
    if (!publicRoles.some((item) => item.role === role)) {
      return
    }

    setSelectedRole(role)
    setActivePage('Login')

    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  // Render the page belonging to the selected workspace.
  const renderWorkspacePage = () => {
    if (!selectedRole) return null

    const Page = pageComponents[selectedRole]?.[activePage]

    if (!Page) return null

    return (
      <Page
        onNavigate={navigate}
        onLogout={handleLogout}
        user={authUser}
      />
    )
  }

  // Public role chooser.
  if (activePage === 'Choose Role') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-5 py-12">
        <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
          <button
            type="button"
            onClick={() => {
              setSelectedRole(null)
              navigate('Home')
            }}
            className="text-sm font-semibold text-blue-700 hover:text-blue-900"
          >
            ← Back to Home
          </button>

          <div className="mt-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-700 text-2xl font-bold text-white">
              S
            </div>

            <h1 className="mt-5 text-2xl font-extrabold">
              Choose Your Workspace
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Select your account type to continue to sign in.
            </p>
          </div>

          <div className="mt-7 space-y-3">
            {publicRoles.map((item) => (
              <button
                type="button"
                key={item.role}
                onClick={() => selectRole(item.role)}
                className="w-full rounded-2xl border border-slate-200 p-5 text-left transition hover:border-blue-500 hover:bg-blue-50"
              >
                <span className="block font-bold text-slate-900">
                  {item.role}
                </span>

                <span className="mt-1 block text-sm text-slate-500">
                  {item.description}
                </span>
              </button>
            ))}
          </div>

          <p className="mt-6 text-center text-xs leading-5 text-slate-500">
            Your actual workspace is determined by your authenticated account.
          </p>
        </div>
      </div>
    )
  }

  // Login page.
  if (activePage === 'Login') {
    return (
      <Login
        onNavigate={navigate}
        onLogin={handleLogin}
        selectedRole={selectedRole}
      />
    )
  }

  // Registration page.
  if (activePage === 'Register') {
    return (
      <Register
        onNavigate={navigate}
        onRegister={() => navigate('Login')}
      />
    )
  }

  // Business User workspace.
  if (
    selectedRole === 'Business User' &&
    rolePages['Business User'].includes(activePage)
  ) {
    return (
      <div className="min-h-screen bg-slate-100 text-slate-900 md:flex">
        <aside className="bg-slate-950 text-white md:sticky md:top-0 md:flex md:h-screen md:w-64 md:shrink-0 md:flex-col">
          <div className="border-b border-white/10 px-6 py-6">
            <button
              type="button"
              onClick={() => navigate('Dashboard')}
              className="text-left"
            >
              <h1 className="text-2xl font-extrabold">
                Smart<span className="text-cyan-400">Cargo</span>
              </h1>

              <p className="mt-1 text-xs text-slate-400">
                Business User Portal
              </p>
            </button>
          </div>

          <nav className="flex gap-2 overflow-x-auto p-3 md:flex-1 md:flex-col">
            {rolePages['Business User'].map((page) => (
              <button
                type="button"
                key={page}
                onClick={() => navigate(page)}
                aria-current={activePage === page ? 'page' : undefined}
                className={`shrink-0 rounded-xl px-4 py-3 text-left text-sm font-medium transition ${
                  activePage === page
                    ? 'bg-blue-700 text-white'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                {page}
              </button>
            ))}
          </nav>

          <div className="hidden border-t border-white/10 p-5 md:block">
            <p className="text-sm font-semibold">
              {authUser?.name || 'Business User'}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              {authUser?.email || 'Exporter Account'}
            </p>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 flex flex-col gap-4 border-b border-slate-200 bg-white px-5 py-5 sm:flex-row sm:items-center sm:justify-between lg:px-8">
            <div>
              <p className="text-sm text-slate-500">
                Smart Cargo / Business Portal
              </p>

              <h2 className="mt-1 text-2xl font-bold">{activePage}</h2>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                aria-label="Notifications"
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 hover:bg-slate-50"
              >
                🔔
              </button>

              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-2 pr-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
                  {(authUser?.name || 'BU')
                    .split(' ')
                    .map((part) => part[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </div>

                <div>
                  <p className="text-sm font-semibold">
                    {authUser?.name || 'Business User'}
                  </p>

                  <p className="text-xs text-slate-500">
                    {authUser?.email || 'Exporter'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
              >
                Log Out
              </button>
            </div>
          </header>

          <div className="p-5 lg:p-8">{renderWorkspacePage()}</div>
        </main>
      </div>
    )
  }

  // Logistics Provider and Administrator workspaces.
  if (selectedRole && rolePages[selectedRole]?.includes(activePage)) {
    return (
      <div className="min-h-screen bg-slate-100 text-slate-900">
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white px-5 py-4 shadow-sm">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => navigate('Dashboard')}
              className="flex items-center gap-3 text-left"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-700 text-xl font-bold text-white">
                S
              </span>

              <span>
                <span className="block font-extrabold">
                  Smart<span className="text-blue-700">Cargo</span>
                </span>

                <span className="block text-xs text-slate-500">
                  {selectedRole} Portal
                </span>
              </span>
            </button>

            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
                {authUser?.name || selectedRole}
              </span>

              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
              >
                Log Out
              </button>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <nav className="mb-6 flex flex-wrap gap-2">
            {rolePages[selectedRole].map((page) => (
              <button
                type="button"
                key={page}
                onClick={() => navigate(page)}
                aria-current={activePage === page ? 'page' : undefined}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  activePage === page
                    ? 'bg-blue-700 text-white'
                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-blue-50'
                }`}
              >
                {page}
              </button>
            ))}
          </nav>

          {renderWorkspacePage()}
        </div>
      </div>
    )
  }

  // Public landing page.
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <button
            type="button"
            onClick={() => goToSection('Home')}
            className="flex items-center gap-3 text-left"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-700 text-xl font-bold text-white">
              S
            </span>

            <span>
              <span className="block text-xl font-extrabold tracking-tight">
                Smart<span className="text-blue-700">Cargo</span>
              </span>

              <span className="block text-xs text-slate-500">
                Export & Logistics
              </span>
            </span>
          </button>

          <div className="hidden items-center gap-7 lg:flex">
            {navItems.map((item) => (
              <button
                type="button"
                key={item}
                onClick={() => goToSection(item)}
                className="text-sm font-medium text-slate-600 transition hover:text-blue-700"
              >
                {item}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('Choose Role')}
              className="hidden rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 sm:block"
            >
              Log in
            </button>

            <button
              type="button"
              onClick={() => navigate('Register')}
              className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
            >
              Get Started
            </button>
          </div>
        </nav>
      </header>

      <main>
        {/* HOME HERO */}
        <section
          id="home"
          className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 text-white"
        >
          <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-blue-400/20 blur-3xl" />
          <div className="absolute -bottom-32 left-1/3 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />

          <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 md:py-28 lg:grid-cols-2 lg:px-8">
            <div>
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-blue-100">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Your cargo. Connected worldwide.
              </div>

              <h1 className="max-w-2xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                Global logistics,
                <span className="block text-cyan-300">made smarter.</span>
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-8 text-blue-100">
                Simplify export logistics with organized shipment requests,
                transparent shipping offers, tracking updates, and a single
                place to manage your cargo journey.
              </p>

              <div className="mt-9 flex flex-wrap gap-4">
                <button
                  type="button"
                  onClick={() => navigate('Register')}
                  className="rounded-xl bg-white px-6 py-3.5 font-bold text-blue-900 shadow-lg transition hover:bg-blue-50"
                >
                  Start Shipping →
                </button>

                <button
                  type="button"
                  onClick={() => goToSection('How It Works')}
                  className="rounded-xl border border-white/30 px-6 py-3.5 font-semibold text-white transition hover:bg-white/10"
                >
                  Explore How It Works
                </button>
              </div>

              <div className="mt-12 grid max-w-lg grid-cols-3 gap-5 border-t border-white/20 pt-7">
                <div>
                  <p className="text-2xl font-extrabold">3</p>
                  <p className="mt-1 text-sm text-blue-200">Transport modes</p>
                </div>

                <div>
                  <p className="text-2xl font-extrabold">24/7</p>
                  <p className="mt-1 text-sm text-blue-200">
                    Shipment visibility
                  </p>
                </div>

                <div>
                  <p className="text-2xl font-extrabold">1</p>
                  <p className="mt-1 text-sm text-blue-200">
                    Unified platform
                  </p>
                </div>
              </div>
            </div>

            <div className="relative rounded-3xl border border-white/15 bg-white/10 p-5 shadow-2xl backdrop-blur sm:p-7">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-200">Shipment overview</p>
                  <h2 className="mt-1 text-xl font-bold">Cargo journey</h2>
                </div>

                <span className="rounded-full bg-emerald-400/15 px-3 py-1.5 text-xs font-semibold text-emerald-300">
                  Sample preview
                </span>
              </div>

              <div className="mt-7 rounded-2xl bg-white p-5 text-slate-900">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Shipment ID
                    </p>
                    <p className="mt-1 font-bold">SC-2026-001</p>
                  </div>

                  <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                    In transit
                  </span>
                </div>

                <div className="my-7 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                  <div>
                    <p className="text-xs text-slate-500">Origin</p>
                    <p className="mt-1 text-lg font-extrabold">Mumbai</p>
                    <p className="text-xs text-slate-500">India</p>
                  </div>

                  <div className="flex items-center gap-1 text-blue-600">
                    <span className="h-px w-5 bg-blue-300 sm:w-10" />
                    <span aria-hidden="true">✈</span>
                    <span className="h-px w-5 bg-blue-300 sm:w-10" />
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-slate-500">Destination</p>
                    <p className="mt-1 text-lg font-extrabold">London</p>
                    <p className="text-xs text-slate-500">United Kingdom</p>
                  </div>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full w-3/5 rounded-full bg-gradient-to-r from-blue-700 to-cyan-400" />
                </div>

                <div className="mt-3 flex justify-between text-xs text-slate-500">
                  <span>Shipment booked</span>
                  <span>Journey in progress</span>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-white/10 bg-slate-950/20 p-4">
                  <p className="text-sm text-blue-200">Transport options</p>
                  <p className="mt-2 font-bold">Air · Sea · Road</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-950/20 p-4">
                  <p className="text-sm text-blue-200">Management</p>
                  <p className="mt-2 font-bold">One dashboard</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SERVICES */}
        <section id="services" className="bg-slate-50 px-5 py-20 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-bold uppercase tracking-widest text-blue-700">
                Our services
              </p>

              <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
                Everything your cargo needs
              </h2>

              <p className="mt-4 leading-7 text-slate-600">
                Tools to help businesses and logistics providers coordinate
                shipping from request to delivery.
              </p>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  icon: '✈',
                  title: 'Air Freight',
                  description:
                    'Explore air-shipping offers for time-sensitive cargo and international routes.',
                },
                {
                  icon: '🚢',
                  title: 'Sea Freight',
                  description:
                    'Manage sea cargo requests and coordinate larger consignments.',
                },
                {
                  icon: '🚚',
                  title: 'Road Transport',
                  description:
                    'Coordinate cargo movement with route-specific offers.',
                },
                {
                  icon: '📍',
                  title: 'Shipment Tracking',
                  description:
                    'Follow recorded shipment milestones from booking to delivery.',
                },
                {
                  icon: '📄',
                  title: 'Invoices & Payments',
                  description:
                    'View invoice details and payment records in one workspace.',
                },
                {
                  icon: '📊',
                  title: 'Management Dashboard',
                  description:
                    'Provide views suited to users, providers, and administrators.',
                },
              ].map((service) => (
                <article
                  key={service.title}
                  className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-2xl">
                    {service.icon}
                  </div>

                  <h3 className="mt-5 text-xl font-bold">{service.title}</h3>

                  <p className="mt-3 leading-7 text-slate-600">
                    {service.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ABOUT */}
        <section id="about" className="px-5 py-20 lg:px-8">
          <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-blue-700">
                About Smart Cargo
              </p>

              <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
                A clearer way to manage shipping operations.
              </h2>

              <p className="mt-5 leading-8 text-slate-600">
                Smart Cargo brings cargo owners and logistics providers
                together through a structured digital workflow. Shipment
                requests, offers, tracking milestones, and invoice records
                can be managed from one platform.
              </p>

              <div className="mt-7 space-y-4">
                {[
                  'Organized shipment request workflow',
                  'Separate experiences for each user role',
                  'Shipment and invoice information in one place',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                      ✓
                    </span>
                    <p className="text-slate-700">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl bg-gradient-to-br from-blue-700 to-slate-950 p-8 text-white sm:p-10">
              <p className="text-sm font-semibold uppercase tracking-widest text-blue-200">
                Built for coordination
              </p>

              <h3 className="mt-4 text-3xl font-extrabold">
                From shipment request to delivery.
              </h3>

              <p className="mt-4 leading-7 text-blue-100">
                Keep important shipping information organized and accessible
                to the right people throughout the cargo journey.
              </p>

              <div className="mt-8 space-y-5">
                {[
                  ['01', 'Create a shipment request'],
                  ['02', 'Review the provider response'],
                  ['03', 'Follow tracking milestones'],
                  ['04', 'Review invoice and payment records'],
                ].map(([number, title]) => (
                  <div key={number} className="flex items-center gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 font-bold">
                      {number}
                    </span>
                    <span className="font-semibold">{title}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="bg-blue-50 px-5 py-20 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="text-center">
              <p className="text-sm font-bold uppercase tracking-widest text-blue-700">
                How it works
              </p>

              <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl">
                Four steps. One connected workflow.
              </h2>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  number: '01',
                  title: 'Register',
                  text: 'Create a business or logistics provider account.',
                },
                {
                  number: '02',
                  title: 'Find an offer',
                  text: 'Review available transport offers and their routes.',
                },
                {
                  number: '03',
                  title: 'Manage shipment',
                  text: 'Submit a request and follow the provider response.',
                },
                {
                  number: '04',
                  title: 'Track progress',
                  text: 'View recorded milestones and related records.',
                },
              ].map((step) => (
                <article
                  key={step.number}
                  className="rounded-2xl border border-blue-100 bg-white p-6"
                >
                  <p className="text-3xl font-extrabold text-blue-700">
                    {step.number}
                  </p>

                  <h3 className="mt-4 text-xl font-bold">{step.title}</h3>

                  <p className="mt-3 leading-7 text-slate-600">
                    {step.text}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* CONTACT / GET STARTED */}
        <section id="contact" className="px-5 py-20 lg:px-8">
          <div className="mx-auto max-w-4xl rounded-3xl bg-slate-950 px-7 py-12 text-center text-white sm:px-12 sm:py-16">
            <p className="text-sm font-bold uppercase tracking-widest text-cyan-300">
              Get started
            </p>

            <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl">
              Ready to simplify your cargo workflow?
            </h2>

            <p className="mx-auto mt-4 max-w-2xl leading-7 text-slate-300">
              Create an account to explore the Smart Cargo platform.
            </p>

            <button
              type="button"
              onClick={() => navigate('Register')}
              className="mt-8 rounded-xl bg-cyan-300 px-6 py-3.5 font-bold text-slate-950 transition hover:bg-cyan-200"
            >
              Create Your Account →
            </button>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white px-5 py-8 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 text-sm text-slate-500 sm:flex-row sm:items-center">
          <p>
            © {new Date().getFullYear()} Smart Cargo. All rights reserved.
          </p>

          <p>Export & Logistics Management System</p>
        </div>
      </footer>
    </div>
  )
}

export default App