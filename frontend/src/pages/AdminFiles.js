import React, { useEffect, useState } from 'react';
import axios from 'axios';

const formatSize = (bytes) => {
  if (!bytes) return '0 Bytes';
  const k = 1024; const sizes = ['Bytes','KB','MB','GB'];
  const i = Math.floor(Math.log(bytes)/Math.log(k));
  return `${(bytes/Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};

const AdminFiles = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const load = async (p=1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: String(p), limit: '10' });
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      const res = await axios.get(`/api/files/admin/list?${params.toString()}`);
      setFiles(res.data?.data?.files || []);
      setTotalPages(res.data?.data?.pagination?.totalPages || 1);
      setPage(res.data?.data?.pagination?.currentPage || 1);
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(1); }, []);

  const remove = async (id) => {
    if (!window.confirm('Delete this file permanently?')) return;
    try {
      await axios.delete(`/api/files/admin/manage/${id}`);
      load(page);
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Failed to delete file');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Files</h2>
        <div className="flex items-center gap-2">
          <input className="px-3 py-2 border rounded-md bg-white dark:bg-gray-800 text-sm" placeholder="Search name/desc/tags" value={search} onChange={(e)=>setSearch(e.target.value)} onKeyDown={(e)=> e.key==='Enter' && load(1)} />
          <select className="px-3 py-2 border rounded-md bg-white dark:bg-gray-800 text-sm" value={status} onChange={(e)=>{setStatus(e.target.value);}}>
            <option value="">All Status</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="processing">Processing</option>
          </select>
          <button onClick={()=>load(1)} className="px-3 py-2 text-sm rounded bg-blue-600 text-white">Apply</button>
        </div>
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
                <th className="text-left p-3">Uploader</th>
                <th className="text-left p-3">Size</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Visibility</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {files.map(f => (
                <tr key={f._id} className="border-t border-gray-200 dark:border-gray-700">
                  <td className="p-3 text-gray-900 dark:text-white">{f.originalName}</td>
                  <td className="p-3 text-gray-600 dark:text-gray-300">{f.uploadedBy?.name} <span className="text-xs text-gray-400">({f.uploadedBy?.email})</span></td>
                  <td className="p-3 text-gray-600 dark:text-gray-300">{formatSize(f.size)}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${f.status==='completed' ? 'bg-green-100 text-green-800' : f.status==='failed' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {f.status}
                    </span>
                  </td>
                  <td className="p-3 text-gray-600 dark:text-gray-300">{f.isPublic ? 'Public' : 'Private'}</td>
                  <td className="p-3 text-right space-x-2">
                    <button onClick={()=>remove(f._id)} className="px-3 py-1 text-xs rounded bg-red-600 text-white">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-end space-x-2">
        <button disabled={page<=1} onClick={()=>load(page-1)} className="px-3 py-1 text-sm border rounded disabled:opacity-50">Prev</button>
        <span className="text-sm text-gray-600 dark:text-gray-300">Page {page} of {totalPages}</span>
        <button disabled={page>=totalPages} onClick={()=>load(page+1)} className="px-3 py-1 text-sm border rounded disabled:opacity-50">Next</button>
      </div>
    </div>
  );
};

export default AdminFiles;


