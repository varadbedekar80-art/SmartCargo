

import { useEffect, useState } from 'react';
import { apiRequest } from '../../services/api';

const emptyProfile = {
  fullName: '',
  email: '',
  company: '',
  phone: '',
  businessType: 'Exporter',
  country: 'India',
  address: '',
  website: '',
  description: '',
  registrationNumber: '',
  city: '',
};

export default function UserProfile() {
  const [profile, setProfile] = useState(emptyProfile);
  const [savedProfile, setSavedProfile] = useState(emptyProfile);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      setLoading(true);
      setError('');

      const result = await apiRequest('/business-profile');
      const data = result.profile || {};

      const loadedProfile = {
        fullName: data.fullName || '',
        email: data.email || '',
        company: data.company || '',
        phone: data.phone || '',
        businessType: data.businessType || 'Exporter',
        country: data.country || 'India',
        address: data.address || '',
        website: data.website || '',
        description: data.description || '',
        registrationNumber: data.registrationNumber || '',
        city: data.city || '',
      };

      setProfile(loadedProfile);
      setSavedProfile(loadedProfile);
    } catch (err) {
      setError(err.message || 'Failed to load your profile.');
    } finally {
      setLoading(false);
    }
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setProfile((previous) => ({
      ...previous,
      [name]: value,
    }));

    setMessage('');
    setError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setSaving(true);
    setMessage('');
    setError('');

    try {
      const result = await apiRequest('/business-profile', {
        method: 'PUT',
        body: JSON.stringify({
          fullName: profile.fullName,
          email: profile.email,
          company: profile.company,
          phone: profile.phone,
          businessType: profile.businessType,
          country: profile.country,
          address: profile.address,
          registrationNumber: profile.registrationNumber,
          city: profile.city,
          website: profile.website,
          description: profile.description,
        }),
      });

      const data = result.profile || {};

      const updatedProfile = {
        ...profile,
        fullName: data.fullName ?? profile.fullName,
        email: data.email ?? profile.email,
        company: data.company ?? profile.company,
        phone: data.phone ?? profile.phone,
        businessType: data.businessType ?? profile.businessType,
        country: data.country ?? profile.country,
        address: data.address ?? profile.address,
        registrationNumber:
          data.registrationNumber ?? profile.registrationNumber,
        city: data.city ?? profile.city,
      };

      setProfile(updatedProfile);
      setSavedProfile(updatedProfile);
      setEditing(false);
      setMessage(
        'Profile saved. Website and description are retained in this session but are not stored in the database by the current backend.'
      );
    } catch (err) {
      setError(err.message || 'Failed to update your profile.');
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500';

  const labelClass = 'mb-2 block text-sm font-semibold text-slate-700';

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 p-8 text-slate-600">
        Loading your profile...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-5 text-slate-900 lg:p-8">
      <div className="mx-auto max-w-6xl">
        <div>
          <p className="text-sm font-medium text-blue-700">
            Business User / Account
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight">
            My Profile
          </h1>
          <p className="mt-2 text-slate-600">
            Manage your personal information and business details.
          </p>
        </div>

        {message && (
          <div
            role="status"
            className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
          >
            {message}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
            <button
              type="button"
              onClick={loadProfile}
              className="ml-3 font-semibold underline"
            >
              Retry
            </button>
          </div>
        )}

        <div className="mt-7 grid items-start gap-6 lg:grid-cols-[300px_1fr]">
          <aside className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="bg-gradient-to-br from-blue-800 to-slate-900 p-6 text-white">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-3xl font-extrabold">
                {profile.fullName
                  .split(' ')
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((word) => word[0]?.toUpperCase())
                  .join('') || 'BU'}
              </div>

              <h2 className="mt-4 text-xl font-bold">
                {profile.fullName || 'Your name'}
              </h2>
              <p className="mt-1 break-all text-sm text-blue-100">
                {profile.email}
              </p>

              <span className="mt-4 inline-flex rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold">
                Business User
              </span>
            </div>

            <div className="space-y-4 p-5">
              <div>
                <p className="text-xs font-medium text-slate-500">Company</p>
                <p className="mt-1 font-semibold">
                  {profile.company || 'Not provided'}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-500">
                  Business type
                </p>
                <p className="mt-1 font-semibold">
                  {profile.businessType || 'Not provided'}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-500">Country</p>
                <p className="mt-1 font-semibold">
                  {profile.country || 'Not provided'}
                </p>
              </div>
            </div>
          </aside>

          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
          >
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-xl font-bold">Business Information</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Keep your account details accurate and up to date.
                </p>
              </div>

              {!editing && (
                <button
                  type="button"
                  onClick={() => {
                    setEditing(true);
                    setMessage('');
                    setError('');
                  }}
                  className="rounded-xl border border-blue-200 px-4 py-2.5 font-semibold text-blue-700 hover:bg-blue-50"
                >
                  Edit Profile
                </button>
              )}
            </div>

            <div className="mt-7 grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="fullName" className={labelClass}>
                  Full name
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  value={profile.fullName}
                  onChange={handleChange}
                  required
                  disabled={!editing || saving}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="email" className={labelClass}>
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={profile.email}
                  onChange={handleChange}
                  required
                  disabled={!editing || saving}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="company" className={labelClass}>
                  Company name
                </label>
                <input
                  id="company"
                  name="company"
                  value={profile.company}
                  onChange={handleChange}
                  required
                  disabled={!editing || saving}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="phone" className={labelClass}>
                  Phone number
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={profile.phone}
                  onChange={handleChange}
                  disabled={!editing || saving}
                  placeholder="+91 ..."
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="businessType" className={labelClass}>
                  Business type
                </label>
                <select
                  id="businessType"
                  name="businessType"
                  value={profile.businessType}
                  onChange={handleChange}
                  disabled={!editing || saving}
                  className={inputClass}
                >
                  <option value="Exporter">Exporter</option>
                  <option value="Importer">Importer</option>
                  <option value="Manufacturer">Manufacturer</option>
                  <option value="Trader">Trader</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="country" className={labelClass}>
                  Country
                </label>
                <input
                  id="country"
                  name="country"
                  value={profile.country}
                  onChange={handleChange}
                  disabled={!editing || saving}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="city" className={labelClass}>
                  City
                </label>
                <input
                  id="city"
                  name="city"
                  value={profile.city}
                  onChange={handleChange}
                  disabled={!editing || saving}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="registrationNumber" className={labelClass}>
                  Registration number
                </label>
                <input
                  id="registrationNumber"
                  name="registrationNumber"
                  value={profile.registrationNumber}
                  onChange={handleChange}
                  disabled={!editing || saving}
                  className={inputClass}
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="address" className={labelClass}>
                  Business address
                </label>
                <input
                  id="address"
                  name="address"
                  value={profile.address}
                  onChange={handleChange}
                  disabled={!editing || saving}
                  className={inputClass}
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="website" className={labelClass}>
                  Company website
                </label>
                <input
                  id="website"
                  name="website"
                  type="url"
                  value={profile.website}
                  onChange={handleChange}
                  disabled={!editing || saving}
                  placeholder="https://example.com"
                  className={inputClass}
                />
                <p className="mt-1 text-xs text-slate-500">
                  Website is not yet persisted by the current backend.
                </p>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="description" className={labelClass}>
                  Business description
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={4}
                  value={profile.description}
                  onChange={handleChange}
                  disabled={!editing || saving}
                  placeholder="Describe your business and the types of cargo you handle."
                  className={inputClass}
                />
                <p className="mt-1 text-xs text-slate-500">
                  Description is not yet persisted by the current backend.
                </p>
              </div>
            </div>

            {editing && (
              <div className="mt-7 flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    setProfile(savedProfile);
                    setEditing(false);
                    setMessage('');
                    setError('');
                  }}
                  className="rounded-xl border border-slate-300 px-5 py-3 font-semibold hover:bg-slate-50 disabled:opacity-60"
                >
                  Discard
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </form>
        </div>

        <p className="mt-8 text-center text-xs text-slate-500">
          Smart Cargo Export &amp; Logistics Management System
        </p>
      </div>
    </div>
  );
}
