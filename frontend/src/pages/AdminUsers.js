import React, { useEffect, useState } from 'react';
import axios from 'axios';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');

  const load = async (p = 1, q = '') => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/users?page=${p}&limit=10&search=${encodeURIComponent(q)}`);
      setUsers(res.data?.data?.users || []);
      setTotalPages(res.data?.data?.pagination?.totalPages || 1);
      setPage(res.data?.data?.pagination?.currentPage || 1);
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(1, ''); }, []);

  const toggleActive = async (id, isActive) => {
    try {
      await axios.put(`/api/users/${id}/status`, { isActive: !isActive });
      load(page, search);
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Failed to update user');
    }
  };

  const deleteUser = async (id) => {
    if (!window.confirm('Delete this user and all their files?')) return;
    try {
      await axios.delete(`/api/users/${id}`);
      load(page, search);
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Failed to delete user');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Users</h2>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load(1, e.currentTarget.value)}
          placeholder="Search name or email"
          className="px-3 py-2 border rounded-md bg-white dark:bg-gray-800 text-sm"
        />
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      {loading ? (
        <div className="p-6"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>
      ) : (
        <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
              <tr>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Email</th>
                <th className="text-left p-3">Role</th>
                <th className="text-left p-3">Status</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u._id} className="border-t border-gray-200 dark:border-gray-700">
                  <td className="p-3 text-gray-900 dark:text-white">{u.name}</td>
                  <td className="p-3 text-gray-600 dark:text-gray-300">{u.email}</td>
                  <td className="p-3 capitalize text-gray-600 dark:text-gray-300">{u.role}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${u.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-3 text-right space-x-2">
                    <button onClick={() => toggleActive(u._id, u.isActive)} className="px-3 py-1 text-xs rounded bg-blue-600 text-white">{u.isActive ? 'Deactivate' : 'Activate'}</button>
                    <button onClick={() => deleteUser(u._id)} className="px-3 py-1 text-xs rounded bg-red-600 text-white">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-end space-x-2">
        <button disabled={page<=1} onClick={() => load(page-1, search)} className="px-3 py-1 text-sm border rounded disabled:opacity-50">Prev</button>
        <span className="text-sm text-gray-600 dark:text-gray-300">Page {page} of {totalPages}</span>
        <button disabled={page>=totalPages} onClick={() => load(page+1, search)} className="px-3 py-1 text-sm border rounded disabled:opacity-50">Next</button>
      </div>
    </div>
  );
};

export default AdminUsers;


