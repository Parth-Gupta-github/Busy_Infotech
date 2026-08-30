import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';
import {
  UtensilsCrossed,
  Plus,
  Edit2,
  Archive,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Search,
  CheckSquare,
  AlertTriangle,
  Save,
  X,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

export default function MenuPage() {
  const { user, isManager } = useAuth();

  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [includeArchived, setIncludeArchived] = useState(false);

  // Tracking unsaved inline edits (prices & availability)
  const [editedPrices, setEditedPrices] = useState({}); // { [itemId]: price }
  const [editedAvailability, setEditedAvailability] = useState({}); // { [itemId]: boolean }

  // Selection for Bulk Actions
  const [selectedIds, setSelectedIds] = useState([]);

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showBulkResultsModal, setShowBulkResultsModal] = useState(false);

  // Form States
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({ name: '', price: '', available: true });
  const [bulkData, setBulkData] = useState({ price: '', available: 'no_change' });
  const [bulkResults, setBulkResults] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch Menu Items
  const fetchMenu = async () => {
    try {
      setLoading(true);
      setError('');
      const endpoint = isManager && includeArchived ? '/menu?includeArchived=true' : '/menu';
      const data = await apiFetch(endpoint);
      setMenuItems(data);
      setEditedPrices({});
      setEditedAvailability({});
    } catch (err) {
      setError(err.message || 'Failed to fetch menu items.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenu();
  }, [includeArchived, isManager]);

  // Track price input change for inline editing
  const handleInlinePriceChange = (id, newPrice) => {
    setEditedPrices(prev => ({
      ...prev,
      [id]: newPrice
    }));
  };

  // Toggle inline availability for Managers
  const handleToggleInlineAvailability = (id, currentVal) => {
    setEditedAvailability(prev => ({
      ...prev,
      [id]: prev[id] !== undefined ? !prev[id] : !currentVal
    }));
  };

  // Discard all unsaved inline price & availability edits
  const handleDiscardAllEdits = () => {
    setEditedPrices({});
    setEditedAvailability({});
  };

  // Save ALL Inline Changed Prices & Availability in 1 Bulk Batch
  const handleSaveAllEdits = async () => {
    const priceIds = Object.keys(editedPrices);
    const availIds = Object.keys(editedAvailability);
    const allModifiedIds = Array.from(new Set([...priceIds, ...availIds]));

    if (allModifiedIds.length === 0) return;

    setActionLoading(true);
    setError('');

    const updates = allModifiedIds.map(id => {
      const updateObj = { id };
      if (editedPrices[id] !== undefined) {
        updateObj.price = parseFloat(editedPrices[id]);
      }
      if (editedAvailability[id] !== undefined) {
        updateObj.available = editedAvailability[id];
      }
      return updateObj;
    });

    try {
      const response = await apiFetch('/menu/bulk', {
        method: 'PATCH',
        body: JSON.stringify({ updates })
      });

      setBulkResults(response.results || []);
      setShowBulkResultsModal(true);
      setEditedPrices({});
      setEditedAvailability({});
      fetchMenu();
    } catch (err) {
      setError(err.message || 'Failed to save modifications.');
    } finally {
      setActionLoading(false);
    }
  };

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredItems.map(item => item.id));
    }
  };

  const toggleSelectItem = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Add Item Handler
  const handleCreateItem = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setError('');

    try {
      await apiFetch('/menu', {
        method: 'POST',
        body: JSON.stringify({
          name: formData.name,
          price: parseFloat(formData.price),
          available: formData.available
        })
      });

      setShowAddModal(false);
      setFormData({ name: '', price: '', available: true });
      fetchMenu();
    } catch (err) {
      setError(err.message || 'Failed to create menu item.');
    } finally {
      setActionLoading(false);
    }
  };

  // Edit Item Handler
  const handleUpdateItem = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setError('');

    try {
      await apiFetch(`/menu/${editingItem.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: formData.name,
          price: parseFloat(formData.price),
          available: formData.available
        })
      });

      setShowEditModal(false);
      setEditingItem(null);
      fetchMenu();
    } catch (err) {
      setError(err.message || 'Failed to update menu item.');
    } finally {
      setActionLoading(false);
    }
  };

  // Archive / Restore Handler
  const handleToggleArchive = async (id, currentArchivedStatus) => {
    try {
      await apiFetch(`/menu/${id}/archive`, {
        method: 'PATCH',
        body: JSON.stringify({ archived: !currentArchivedStatus })
      });
      fetchMenu();
    } catch (err) {
      alert(err.message || 'Failed to change archive status.');
    }
  };

  // Bulk Action Handler (via Modal Checkboxes)
  const handleBulkUpdate = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setError('');

    const updates = selectedIds.map(id => {
      const updateObj = { id };
      if (bulkData.price !== '') {
        updateObj.price = parseFloat(bulkData.price);
      }
      if (bulkData.available !== 'no_change') {
        updateObj.available = bulkData.available === 'true';
      }
      return updateObj;
    });

    try {
      const response = await apiFetch('/menu/bulk', {
        method: 'PATCH',
        body: JSON.stringify({ updates })
      });

      setBulkResults(response.results || []);
      setShowBulkModal(false);
      setShowBulkResultsModal(true);
      setSelectedIds([]);
      setBulkData({ price: '', available: 'no_change' });
      fetchMenu();
    } catch (err) {
      setError(err.message || 'Bulk update failed.');
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered Items
  const filteredItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    // Check display availability status (incorporates unsaved inline edit)
    const effectiveAvailable = editedAvailability[item.id] !== undefined
      ? editedAvailability[item.id]
      : item.available;

    if (filterStatus === 'AVAILABLE') return effectiveAvailable && !item.archived;
    if (filterStatus === 'UNAVAILABLE') return !effectiveAvailable && !item.archived;
    if (filterStatus === 'ARCHIVED') return item.archived;

    return true;
  });

  const modifiedIds = Array.from(new Set([...Object.keys(editedPrices), ...Object.keys(editedAvailability)]));
  const modifiedCount = modifiedIds.length;

  return (
    <div className="space-y-6 pb-20 relative">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 backdrop-blur-md p-6 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <UtensilsCrossed className="w-6 h-6 text-emerald-400" />
            <h1 className="text-2xl font-bold text-slate-100">Menu Management</h1>
          </div>
          <p className="text-slate-400 text-xs mt-1">
            {isManager ? 'Click prices or availability badges to edit inline, perform bulk actions, or add dishes' : 'View active menu items and availability'}
          </p>
        </div>

        {isManager && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setFormData({ name: '', price: '', available: true });
                setShowAddModal(true);
              }}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-emerald-500/20 flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Menu Item</span>
            </button>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter and Toolbar */}
      <div className="bg-slate-900/60 backdrop-blur-md p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search menu items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
          <div className="flex items-center bg-slate-950 rounded-xl p-1 border border-slate-800">
            {['ALL', 'AVAILABLE', 'UNAVAILABLE', ...(isManager ? ['ARCHIVED'] : [])].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  filterStatus === status
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {status.charAt(0) + status.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {/* Include Archived Checkbox */}
          {isManager && (
            <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 hover:border-slate-700">
              <input
                type="checkbox"
                checked={includeArchived}
                onChange={(e) => setIncludeArchived(e.target.checked)}
                className="rounded border-slate-700 text-emerald-500 focus:ring-0 bg-slate-900"
              />
              <span>Include Archived</span>
            </label>
          )}

          {/* Bulk Checkbox Action Button */}
          {isManager && selectedIds.length > 0 && (
            <button
              onClick={() => setShowBulkModal(true)}
              className="px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 cursor-pointer"
            >
              <CheckSquare className="w-4 h-4" />
              <span>Bulk Edit ({selectedIds.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Menu Table */}
      <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            Loading menu items...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No menu items found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-800">
                <tr>
                  {isManager && (
                    <th className="p-4 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.length > 0 && selectedIds.length === filteredItems.length}
                        onChange={toggleSelectAll}
                        className="rounded border-slate-700 text-emerald-500 focus:ring-0 bg-slate-900"
                      />
                    </th>
                  )}
                  <th className="p-4">Item Name</th>
                  <th className="p-4">Price (₹)</th>
                  <th className="p-4">Status</th>
                  {isManager && <th className="p-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredItems.map((item) => {
                  const isPriceModified = editedPrices[item.id] !== undefined;
                  const displayPrice = isPriceModified ? editedPrices[item.id] : item.price;

                  const isAvailModified = editedAvailability[item.id] !== undefined;
                  const displayAvailable = isAvailModified ? editedAvailability[item.id] : item.available;

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-800/30 transition-colors ${
                        item.archived ? 'opacity-50 bg-slate-950/40' : ''
                      }`}
                    >
                      {isManager && (
                        <td className="p-4 text-center">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(item.id)}
                            onChange={() => toggleSelectItem(item.id)}
                            className="rounded border-slate-700 text-emerald-500 focus:ring-0 bg-slate-900"
                          />
                        </td>
                      )}
                      <td className="p-4 font-semibold text-slate-100 flex items-center gap-2">
                        <span>{item.name}</span>
                        {item.archived && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                            ARCHIVED
                          </span>
                        )}
                      </td>

                      {/* Price Cell: Editable Input for Managers */}
                      <td className="p-4 font-mono font-medium">
                        {isManager ? (
                          <div className="relative inline-flex items-center">
                            <span className="absolute left-2.5 text-slate-400 text-xs font-bold">₹</span>
                            <input
                              type="number"
                              step="0.01"
                              value={displayPrice}
                              onChange={(e) => handleInlinePriceChange(item.id, e.target.value)}
                              className={`w-28 pl-6 pr-2 py-1 bg-slate-950 border rounded-lg text-xs font-mono text-emerald-400 focus:outline-none focus:ring-1 transition-all ${
                                isPriceModified
                                  ? 'border-amber-500 ring-1 ring-amber-500 bg-amber-500/10'
                                  : 'border-slate-800 focus:border-emerald-500 focus:ring-emerald-500'
                              }`}
                            />
                          </div>
                        ) : (
                          <span className="text-emerald-400">₹{parseFloat(item.price).toFixed(2)}</span>
                        )}
                      </td>

                      {/* Availability Cell: Clickable Toggle Badge for Managers */}
                      <td className="p-4">
                        {isManager ? (
                          <button
                            type="button"
                            onClick={() => handleToggleInlineAvailability(item.id, item.available)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer border ${
                              isAvailModified
                                ? 'border-amber-500 ring-1 ring-amber-500 bg-amber-500/10 text-amber-400'
                                : displayAvailable
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                                : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
                            }`}
                            title="Click to toggle availability"
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                displayAvailable ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
                              }`}
                            ></span>
                            <span>{displayAvailable ? 'Available' : 'Out of Stock'}</span>
                            {isAvailModified && (
                              <span className="text-[9px] font-bold px-1 rounded bg-amber-500/20 text-amber-300 ml-1">
                                MODIFIED
                              </span>
                            )}
                          </button>
                        ) : (
                          item.available ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                              Available
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                              Out of Stock
                            </span>
                          )
                        )}
                      </td>

                      {isManager && (
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setEditingItem(item);
                                setFormData({ name: item.name, price: item.price, available: item.available });
                                setShowEditModal(true);
                              }}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                              title="Edit Item Details"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleToggleArchive(item.id, item.archived)}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                item.archived
                                  ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400'
                                  : 'bg-red-500/10 hover:bg-red-500/20 text-red-400'
                              }`}
                              title={item.archived ? 'Restore Item' : 'Archive Item'}
                            >
                              {item.archived ? <RotateCcw className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Floating Sticky Bottom Bar for Unsaved Edits (Prices & Availability) */}
      {isManager && modifiedCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-xl w-[90%] bg-slate-900/95 backdrop-blur-xl border border-amber-500/40 rounded-2xl p-4 shadow-2xl shadow-amber-500/10 flex items-center justify-between gap-4 animate-bounce-short">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-100">
                Unsaved Menu Modifications
              </p>
              <p className="text-[11px] text-amber-400 font-medium">
                {modifiedCount} dish{modifiedCount > 1 ? 'es' : ''} modified (prices / availability)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDiscardAllEdits}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition-all cursor-pointer flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Discard</span>
            </button>
            <button
              type="button"
              onClick={handleSaveAllEdits}
              disabled={actionLoading}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-amber-500/20 flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{actionLoading ? 'Saving...' : 'Save All Changes'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-slate-100">Add New Menu Item</h2>
            <form onSubmit={handleCreateItem} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Dish Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Paneer Butter Masala"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Price (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="299.00"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="addAvailable"
                  checked={formData.available}
                  onChange={(e) => setFormData({ ...formData, available: e.target.checked })}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-0 bg-slate-950"
                />
                <label htmlFor="addAvailable" className="text-xs text-slate-300 cursor-pointer">
                  Available for ordering
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-xl cursor-pointer"
                >
                  {actionLoading ? 'Creating...' : 'Create Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {showEditModal && editingItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-slate-100">Edit Menu Item</h2>
            <form onSubmit={handleUpdateItem} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Dish Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Price (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="editAvailable"
                  checked={formData.available}
                  onChange={(e) => setFormData({ ...formData, available: e.target.checked })}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-0 bg-slate-950"
                />
                <label htmlFor="editAvailable" className="text-xs text-slate-300 cursor-pointer">
                  Available for ordering
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingItem(null);
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-xl cursor-pointer"
                >
                  {actionLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Action Checkbox Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-slate-100">
              Bulk Edit ({selectedIds.length} items selected)
            </h2>
            <p className="text-xs text-slate-400">
              Leave fields blank if you do not wish to modify them across selected items.
            </p>

            <form onSubmit={handleBulkUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  New Price for all (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Leave blank to keep existing prices"
                  value={bulkData.price}
                  onChange={(e) => setBulkData({ ...bulkData, price: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Availability Status
                </label>
                <select
                  value={bulkData.available}
                  onChange={(e) => setBulkData({ ...bulkData, available: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                >
                  <option value="no_change">Do not change availability</option>
                  <option value="true">Mark all as Available</option>
                  <option value="false">Mark all as Out of Stock</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-xl cursor-pointer"
                >
                  {actionLoading ? 'Applying...' : 'Apply Bulk Action'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Results Report Modal */}
      {showBulkResultsModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-bold text-slate-100">Bulk Action Execution Report</h2>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 border border-slate-800 rounded-xl p-3 bg-slate-950/50 divide-y divide-slate-800">
              {bulkResults.map((res, index) => (
                <div key={index} className="pt-2 first:pt-0 flex items-start gap-3 text-xs">
                  {res.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-semibold text-slate-200">
                      {res.itemName || `Item ID: ${res.id}`}
                    </p>
                    <p className={res.success ? 'text-emerald-400' : 'text-red-400'}>
                      {res.success ? 'Successfully updated.' : res.reason}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowBulkResultsModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
