
import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../../services/api';

const emptyForm = {
  name: '',
  description: '',
  weightKg: '',
  quantity: '1',
};

export default function CargoManagement({ onNavigate }) {
  const [cargoList, setCargoList] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadCargo = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const result = await apiRequest('/cargo');
      setCargoList(Array.isArray(result.cargo) ? result.cargo : []);
    } catch (err) {
      setError(err.message || 'Failed to load cargo.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCargo();
  }, [loadCargo]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  function startEdit(cargo) {
    setEditingId(cargo.id);
    setForm({
      name: cargo.name || '',
      description: cargo.description || '',
      weightKg: String(cargo.weight_kg ?? cargo.weightKg ?? ''),
      quantity: String(cargo.quantity ?? 1),
    });
    setError('');
    setSuccess('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      weightKg: Number(form.weightKg),
      quantity: Number(form.quantity),
    };

    try {
      const result = await apiRequest(
        editingId ? `/cargo/${editingId}` : '/cargo',
        {
          method: editingId ? 'PUT' : 'POST',
          body: JSON.stringify(payload),
        }
      );

      setSuccess(
        result.message ||
          (editingId ? 'Cargo updated successfully.' : 'Cargo added successfully.')
      );

      resetForm();
      await loadCargo();
    } catch (err) {
      setError(err.message || 'Unable to save cargo.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(cargo) {
    const confirmed = window.confirm(
      `Delete "${cargo.name}"? This cannot be undone.`
    );

    if (!confirmed) return;

    setError('');
    setSuccess('');
    setDeletingId(cargo.id);

    try {
      const result = await apiRequest(`/cargo/${cargo.id}`, {
        method: 'DELETE',
      });

      setSuccess(result.message || 'Cargo deleted successfully.');
      if (editingId === cargo.id) resetForm();
      await loadCargo();
    } catch (err) {
      setError(err.message || 'Unable to delete cargo.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
              Smart Cargo
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              Cargo Management
            </h1>
            <p className="mt-2 text-slate-500">
              Register and manage your cargo before creating a shipment.
            </p>
          </div>

          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('Create Shipment')}
              className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              Create Shipment →
            </button>
          )}
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700"
          >
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section className="h-fit rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-1">
            <h2 className="text-xl font-bold text-slate-900">
              {editingId ? 'Edit Cargo' : 'Add New Cargo'}
            </h2>
            <p className="mb-6 mt-1 text-sm text-slate-500">
              Enter the cargo details accurately.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="cargo-name"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Cargo Name *
                </label>
                <input
                  id="cargo-name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  maxLength={150}
                  placeholder="e.g. Electronic Components"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label
                  htmlFor="cargo-description"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Description
                </label>
                <textarea
                  id="cargo-description"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  maxLength={1000}
                  rows={3}
                  placeholder="Describe your cargo"
                  className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label
                  htmlFor="cargo-weight"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Total Weight (kg) *
                </label>
                <input
                  id="cargo-weight"
                  name="weightKg"
                  type="number"
                  value={form.weightKg}
                  onChange={handleChange}
                  required
                  min="0.01"
                  step="any"
                  placeholder="e.g. 250"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label
                  htmlFor="cargo-quantity"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Quantity *
                </label>
                <input
                  id="cargo-quantity"
                  name="quantity"
                  type="number"
                  value={form.quantity}
                  onChange={handleChange}
                  required
                  min="1"
                  step="1"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? 'Saving...'
                    : editingId
                      ? 'Update Cargo'
                      : 'Save Cargo'}
                </button>

                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    disabled={saving}
                    className="rounded-xl border border-slate-300 px-4 py-3 font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Your Saved Cargo
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {cargoList.length} cargo record
                  {cargoList.length === 1 ? '' : 's'}
                </p>
              </div>

              <button
                type="button"
                onClick={loadCargo}
                disabled={loading}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                {loading ? 'Refreshing...' : '↻ Refresh'}
              </button>
            </div>

            {loading ? (
              <div className="py-16 text-center text-slate-500">
                Loading your cargo...
              </div>
            ) : cargoList.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 px-6 py-12 text-center">
                <div className="mb-3 text-4xl">📦</div>
                <h3 className="font-semibold text-slate-800">
                  No cargo records yet
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  Add your first cargo using the form to get started.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {cargoList.map((cargo) => (
                  <article
                    key={cargo.id}
                    className="rounded-xl border border-slate-200 p-4 transition hover:border-blue-200 hover:bg-slate-50/50 sm:p-5"
                  >
                    <div className="flex flex-col justify-between gap-4 sm:flex-row">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="break-words font-bold text-slate-900">
                            {cargo.name}
                          </h3>
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                            ID: {cargo.id}
                          </span>
                        </div>

                        <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-500">
                          {cargo.description || 'No description provided.'}
                        </p>

                        <div className="mt-4 flex flex-wrap gap-3 text-sm">
                          <span className="rounded-lg bg-slate-100 px-3 py-2 text-slate-700">
                            ⚖️{' '}
                            {cargo.weight_kg ?? cargo.weightKg ?? '—'} kg
                          </span>
                          <span className="rounded-lg bg-slate-100 px-3 py-2 text-slate-700">
                            📦 Quantity: {cargo.quantity ?? '—'}
                          </span>
                        </div>
                      </div>

                      <div className="flex shrink-0 gap-2 sm:flex-col">
                        <button
                          type="button"
                          onClick={() => startEdit(cargo)}
                          className="rounded-lg border border-blue-200 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(cargo)}
                          disabled={deletingId === cargo.id}
                          className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                        >
                          {deletingId === cargo.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
