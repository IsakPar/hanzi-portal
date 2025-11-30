/**
 * SubscriptionsPage
 * Dashboard for managing user subscriptions and viewing subscription metrics
 * 
 * 380 LOC
 */

import { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Users, 
  TrendingUp, 
  DollarSign, 
  Search, 
  Crown,
  Shield,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  RefreshCw,
  ChevronDown,
  Smartphone,
  Globe
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/services/api';

interface SubscriptionOverview {
  totalUsers: number;
  byTier: {
    free: number;
    premium: number; // Displayed as "Master" in UI
    pro: number;
  };
  byStatus: {
    none: number;
    active: number;
    past_due: number;
    canceled: number;
    expired: number;
  };
  byPlatform: {
    ios: number;
    android: number;
  };
  expiringIn7Days: number;
}

interface User {
  id: string;
  email: string;
  name: string | null;
  tier: 'free' | 'premium' | 'pro'; // premium = Master in UI
  role: 'user' | 'admin';
  subscriptionStatus: string | null;
  subscriptionPlatform: string | null;
  subscriptionExpiresAt: string | null;
  createdAt: string;
}

export default function SubscriptionsPage() {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<SubscriptionOverview | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTier, setSelectedTier] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [changingTier, setChangingTier] = useState(false);
  const [newTier, setNewTier] = useState<'free' | 'premium' | 'pro'>('free');
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [overviewRes, usersRes] = await Promise.all([
        api.get('/v1/admin/subscriptions/overview').catch(() => null),
        api.get('/v1/admin/users?limit=100'),
      ]);
      
      // Build overview from users if endpoint doesn't exist
      const usersList = (usersRes as { users: User[] })?.users || [];
      setUsers(usersList);
      
      if (overviewRes) {
        setOverview(overviewRes as SubscriptionOverview);
      } else {
        // Calculate overview from users
        const tierCounts = { free: 0, premium: 0, pro: 0 };
        const statusCounts = { none: 0, active: 0, past_due: 0, canceled: 0, expired: 0 };
        const platformCounts = { ios: 0, android: 0 };
        
        usersList.forEach((u: User) => {
          tierCounts[u.tier as keyof typeof tierCounts]++;
          if (u.subscriptionStatus) {
            statusCounts[u.subscriptionStatus as keyof typeof statusCounts]++;
          } else {
            statusCounts.none++;
          }
          if (u.subscriptionPlatform) {
            platformCounts[u.subscriptionPlatform as keyof typeof platformCounts]++;
          }
        });
        
        setOverview({
          totalUsers: usersList.length,
          byTier: tierCounts,
          byStatus: statusCounts,
          byPlatform: platformCounts,
          expiringIn7Days: 0,
        });
      }
    } catch (err) {
      setError('Failed to load subscription data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleChangeTier(userId: string, tier: 'free' | 'premium' | 'pro') {
    setChangingTier(true);
    try {
      await api.put(`/v1/admin/users/${userId}`, { tier });
      const tierLabel = tier === 'premium' ? 'Master' : tier;
      setSuccess(`User tier updated to ${tierLabel}`);
      setSelectedUser(null);
      await fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to update user tier');
    } finally {
      setChangingTier(false);
    }
  }

  const filteredUsers = users.filter(u => {
    const matchesSearch = !searchQuery || 
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.name?.toLowerCase().includes(searchQuery.toLowerCase());
    // Map 'master' filter to 'premium' tier in DB
    const filterTier = selectedTier === 'master' ? 'premium' : selectedTier;
    const matchesTier = selectedTier === 'all' || u.tier === filterTier;
    return matchesSearch && matchesTier;
  });

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'premium': // Displayed as "Master" in UI
        return <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-medium flex items-center gap-1"><Crown className="w-3 h-3" /> Master</span>;
      case 'pro':
        return <span className="px-2 py-1 bg-violet-100 text-violet-800 rounded-full text-xs font-medium flex items-center gap-1"><Shield className="w-3 h-3" /> Pro</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">Free</span>;
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'active':
        return <span className="text-green-600 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Active</span>;
      case 'past_due':
        return <span className="text-amber-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" /> Past Due</span>;
      case 'canceled':
        return <span className="text-red-600 flex items-center gap-1"><XCircle className="w-4 h-4" /> Canceled</span>;
      case 'expired':
        return <span className="text-gray-500 flex items-center gap-1"><Clock className="w-4 h-4" /> Expired</span>;
      default:
        return <span className="text-gray-400">None</span>;
    }
  };

  const getPlatformIcon = (platform: string | null) => {
    switch (platform) {
      case 'ios':
        return <span title="iOS"><Smartphone className="w-4 h-4 text-gray-500" /></span>;
      case 'android':
        return <span title="Android"><Smartphone className="w-4 h-4 text-green-500" /></span>;
      default:
        return <Globe className="w-4 h-4 text-gray-300" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
            <CreditCard className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Subscriptions</h1>
            <p className="text-sm text-gray-500">Manage user tiers and view subscription metrics</p>
          </div>
        </div>
        <Button variant="outline" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span className="text-red-700">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-500">×</button>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-500" />
          <span className="text-green-700">{success}</span>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Total Users</span>
            <Users className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{overview?.totalUsers || 0}</p>
        </div>
        
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-amber-700">Master Subscribers</span>
            <Crown className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-3xl font-bold text-amber-900">{overview?.byTier.premium || 0}</p>
          <p className="text-sm text-amber-600 mt-1">$9.99/month</p>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Active Subscriptions</span>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{overview?.byStatus.active || 0}</p>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Est. MRR</span>
            <DollarSign className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">
            ${((overview?.byTier.premium || 0) * 9.99).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* By Tier */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">By Tier</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Free</span>
              <span className="font-medium">{overview?.byTier.free || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-amber-600 flex items-center gap-1"><Crown className="w-4 h-4" /> Master</span>
              <span className="font-medium text-amber-600">{overview?.byTier.premium || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-violet-600 flex items-center gap-1"><Shield className="w-4 h-4" /> Pro</span>
              <span className="font-medium text-violet-600">{overview?.byTier.pro || 0}</span>
            </div>
          </div>
        </div>

        {/* By Status */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">By Status</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-green-600">Active</span>
              <span className="font-medium">{overview?.byStatus.active || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-amber-600">Past Due</span>
              <span className="font-medium">{overview?.byStatus.past_due || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-red-600">Canceled</span>
              <span className="font-medium">{overview?.byStatus.canceled || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Expired</span>
              <span className="font-medium">{overview?.byStatus.expired || 0}</span>
            </div>
          </div>
        </div>

        {/* By Platform */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">By Platform</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 flex items-center gap-2"><Smartphone className="w-4 h-4" /> iOS</span>
              <span className="font-medium">{overview?.byPlatform.ios || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 flex items-center gap-2"><Smartphone className="w-4 h-4 text-green-500" /> Android</span>
              <span className="font-medium">{overview?.byPlatform.android || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* User Management */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">User Management</h3>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by email or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="all">All Tiers</option>
              <option value="free">Free</option>
              <option value="master">Master</option>
              <option value="pro">Pro (Admin)</option>
            </select>
          </div>
        </div>

        <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
          {filteredUsers.map((user) => (
            <div key={user.id} className="p-4 hover:bg-gray-50 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{user.email}</p>
                <p className="text-sm text-gray-500">{user.name || 'No name'}</p>
              </div>
              <div className="flex items-center gap-4">
                {getTierBadge(user.tier)}
                {getStatusBadge(user.subscriptionStatus)}
                {getPlatformIcon(user.subscriptionPlatform)}
                <div className="relative">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedUser(user);
                      setNewTier(user.tier);
                    }}
                  >
                    Change Tier <ChevronDown className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {filteredUsers.length === 0 && (
            <div className="p-8 text-center text-gray-400">
              No users found
            </div>
          )}
        </div>
      </div>

      {/* Change Tier Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Change User Tier</h3>
            <p className="text-sm text-gray-500 mb-4">{selectedUser.email}</p>
            
            <div className="space-y-3 mb-6">
              {(['free', 'premium', 'pro'] as const).map((tier) => (
                <button
                  key={tier}
                  onClick={() => setNewTier(tier)}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                    newTier === tier 
                      ? 'border-purple-500 bg-purple-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {tier === 'premium' && <Crown className="w-5 h-5 text-amber-500" />}
                      {tier === 'pro' && <Shield className="w-5 h-5 text-violet-500" />}
                      <span className="font-medium">{tier === 'premium' ? 'Master' : tier === 'pro' ? 'Pro' : 'Free'}</span>
                    </div>
                    {tier === 'premium' && <span className="text-amber-600 text-sm">$9.99/mo</span>}
                    {tier === 'pro' && <span className="text-violet-600 text-sm">Admin</span>}
                  </div>
                </button>
              ))}
            </div>
            
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setSelectedUser(null)}>
                Cancel
              </Button>
              <Button 
                onClick={() => handleChangeTier(selectedUser.id, newTier)}
                disabled={changingTier || newTier === selectedUser.tier}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {changingTier ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
                Update Tier
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

