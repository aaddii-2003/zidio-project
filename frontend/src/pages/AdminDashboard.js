import React, { useEffect, useState } from 'react';
import axios from 'axios';

const StatCard = ({ title, value, subtitle }) => (
  <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
    <div className="text-sm text-gray-500 dark:text-gray-400">{title}</div>
    <div className="text-2xl font-semibold text-gray-900 dark:text-white">{value}</div>
    {subtitle && <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subtitle}</div>}
  </div>
);

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [usersRes, filesRes] = await Promise.all([
          axios.get('/api/users?page=1&limit=1'),
          axios.get('/api/files/admin/list?page=1&limit=1')
        ]);
        setStats({
          totalUsers: usersRes.data?.data?.pagination?.totalUsers || 0,
          totalFiles: filesRes.data?.data?.pagination?.totalFiles || 0
        });
      } catch (e) {
        setError(e.response?.data?.message || e.message || 'Failed to load admin stats');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="p-6"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-red-600">{error}</div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Manage users and files</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard title="Total Users" value={stats.totalUsers} />
        <StatCard title="Total Files" value={stats.totalFiles} />
      </div>
    </div>
  );
};

export default AdminDashboard;


