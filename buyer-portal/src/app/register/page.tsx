'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { buyerAuthAPI, getErrorMessage } from '@/lib/api';
import { Leaf, Mail, Lock, User, Phone, MapPin } from 'lucide-react';
import { statesAndDistricts, getDistrictsByState } from '@/data/states-districts';

export default function BuyerRegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    state: '',
    district: '',
    village: '',
    fullAddress: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const districtsForState = useMemo(() => getDistrictsByState(form.state), [form.state]);

  const handleStateChange = (state: string) => {
    setForm({ ...form, state, district: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token, buyer } = await buyerAuthAPI.register({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        password: form.password,
        address: {
          state: form.state,
          district: form.district,
          village: form.village,
          fullAddress: form.fullAddress,
        },
      });
      if (typeof window !== 'undefined') {
        localStorage.setItem('buyerToken', token);
        localStorage.setItem('buyer', JSON.stringify(buyer));
      }
      router.replace('/');
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <Link href="/" className="flex items-center gap-2 text-green-600 font-semibold mb-8">
        <Leaf className="w-5 h-5" />
        AgroMitra Buyer Portal
      </Link>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Create account</h1>
        <p className="text-gray-500 text-sm mb-6">Register with email, phone and address</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-2">Full name</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                <User className="w-5 h-5 shrink-0" />
              </div>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
                placeholder="Your name"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-2">Email</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                <Mail className="w-5 h-5 shrink-0" />
              </div>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
                placeholder="you@example.com"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-2">Phone number</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                <Phone className="w-5 h-5 shrink-0" />
              </div>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
                placeholder="10-digit mobile"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-2">Address</label>
            <div className="space-y-2">
              <input
                type="text"
                value={form.fullAddress}
                onChange={(e) => setForm({ ...form, fullAddress: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
                placeholder="Street / area"
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <select
                  value={form.state}
                  onChange={(e) => handleStateChange(e.target.value)}
                  className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-sm"
                  required
                >
                  <option value="">State</option>
                  {statesAndDistricts.map((s) => (
                    <option key={s.state} value={s.state}>{s.state}</option>
                  ))}
                </select>
                <select
                  value={form.district}
                  onChange={(e) => setForm({ ...form, district: e.target.value })}
                  className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-sm"
                  required
                  disabled={!form.state}
                >
                  <option value="">District</option>
                  {districtsForState.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={form.village}
                  onChange={(e) => setForm({ ...form, village: e.target.value })}
                  className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-sm"
                  placeholder="Village"
                />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-2">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                <Lock className="w-5 h-5 shrink-0" />
              </div>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
                placeholder="Min 6 characters"
                required
                minLength={6}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-green-600 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
