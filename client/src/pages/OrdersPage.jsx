import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';
import {
  ShoppingBag,
  Plus,
  Search,
  User,
  Clock,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Archive,
  RotateCcw,
  FileText,
  Trash2,
  Eye,
  X,
  Utensils
} from 'lucide-react';

export default function OrdersPage() {
  const { user, isManager } = useAuth();

  // Orders and Pagination State
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalCount: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Menu items list for order creation picker
  const [menuItems, setMenuItems] = useState([]);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);

  // Create Order Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [tableNumber, setTableNumber] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [draftLines, setDraftLines] = useState([]); // Selected dishes: [{ menu_item_id, name, price, quantity, special_instructions }]

  // Current Dish Picker State inside Modal
  const [selectedMenuItemId, setSelectedMenuItemId] = useState('');
  const [dishQuantity, setDishQuantity] = useState(1);
  const [specialInstructions, setSpecialInstructions] = useState('');

  // Order Details View Modal State
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [actionLoading, setActionLoading] = useState(false);

  // Fetch Orders from Server
  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError('');

      let endpoint = `/orders?page=${page}&limit=10`;
      if (searchQuery.trim()) endpoint += `&search=${encodeURIComponent(searchQuery.trim())}`;
      if (statusFilter !== 'ALL') endpoint += `&status=${encodeURIComponent(statusFilter)}`;

      const data = await apiFetch(endpoint);
      setOrders(data.orders || []);
      setPagination(data.pagination || { page: 1, limit: 10, totalCount: 0, totalPages: 1 });
    } catch (err) {
      setError(err.message || 'Failed to fetch orders.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Available Menu Items for the Dish Picker
  const fetchMenuItems = async () => {
    try {
      const data = await apiFetch('/menu');
      // Filter active available dishes
      const availableDishes = (data || []).filter(item => item.available && !item.archived);
      setMenuItems(availableDishes);
      if (availableDishes.length > 0) {
        setSelectedMenuItemId(availableDishes[0].id);
      }
    } catch (err) {
      console.error('Failed to load menu items:', err);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchMenuItems();
  }, [page, statusFilter]);

  // Debounced Search Trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchOrders();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Add Dish to Draft Lines
  const handleAddDishToDraft = () => {
    if (!selectedMenuItemId) return;

    const dish = menuItems.find(m => m.id === selectedMenuItemId);
    if (!dish) return;

    const newLine = {
      menu_item_id: dish.id,
      name: dish.name,
      price: parseFloat(dish.price),
      quantity: parseInt(dishQuantity, 10) || 1,
      special_instructions: specialInstructions.trim()
    };

    setDraftLines(prev => [...prev, newLine]);
    setDishQuantity(1);
    setSpecialInstructions('');
  };

  // Remove Dish from Draft Lines
  const handleRemoveDraftLine = (index) => {
    setDraftLines(prev => prev.filter((_, i) => i !== index));
  };

  // Calculate Draft Order Subtotal
  const draftSubtotal = draftLines.reduce((sum, line) => sum + (line.price * line.quantity), 0);

  // Submit Create Order Handler
  const handleCreateOrder = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setError('');

    const payloadItems = draftLines.map(line => ({
      menu_item_id: line.menu_item_id,
      quantity: line.quantity,
      special_instructions: line.special_instructions
    }));

    try {
      await apiFetch('/orders', {
        method: 'POST',
        body: JSON.stringify({
          table_number: tableNumber,
          notes: orderNotes,
          items: payloadItems
        })
      });

      setShowAddModal(false);
      setTableNumber('');
      setOrderNotes('');
      setDraftLines([]);
      setPage(1);
      fetchOrders();
    } catch (err) {
      setError(err.message || 'Failed to create order.');
    } finally {
      setActionLoading(false);
    }
  };

  // View Order Details
  const handleViewOrderDetails = async (id) => {
    try {
      setDetailsLoading(true);
      const data = await apiFetch(`/orders/${id}`);
      setSelectedOrderDetails(data);
    } catch (err) {
      alert(err.message || 'Failed to load order details.');
    } finally {
      setDetailsLoading(false);
    }
  };

  // Archive / Restore Order Handler
  const handleToggleArchive = async (id, currentArchivedStatus) => {
    try {
      await apiFetch(`/orders/${id}/archive`, {
        method: 'PATCH',
        body: JSON.stringify({ archived: !currentArchivedStatus })
      });
      fetchOrders();
    } catch (err) {
      alert(err.message || 'Failed to update order archive status.');
    }
  };

  // Status Badge Helper
  const getStatusBadge = (status) => {
    const uppercaseStatus = (status || 'PLACED').toUpperCase();
    const styles = {
      PLACED: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      ACCEPTED: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      PREPARING: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      READY: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      SERVED: 'bg-slate-800 text-slate-300 border-slate-700',
      CANCELLED: 'bg-red-500/10 text-red-400 border-red-500/20'
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium border ${styles[uppercaseStatus] || styles.PLACED}`}>
        {uppercaseStatus.charAt(0) + uppercaseStatus.slice(1).toLowerCase()}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 backdrop-blur-md p-6 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-6 h-6 text-emerald-400" />
            <h1 className="text-2xl font-bold text-slate-100">Orders</h1>
          </div>
          <p className="text-slate-400 text-xs mt-1">
            Create orders with menu dishes & special instructions, search tables, and track order lifecycles
          </p>
        </div>

        <button
          onClick={() => {
            setTableNumber('');
            setOrderNotes('');
            setDraftLines([]);
            setShowAddModal(true);
          }}
          className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-emerald-500/20 flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Order</span>
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter and Search Toolbar */}
      <div className="bg-slate-900/60 backdrop-blur-md p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by table number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {['ALL', 'Placed', 'Accepted', 'Preparing', 'Ready', 'Served', 'Cancelled'].map((st) => (
            <button
              key={st}
              onClick={() => {
                setStatusFilter(st);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
                statusFilter === st
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200 bg-slate-950 border border-slate-800'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 text-sm bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          Loading orders...
        </div>
      ) : orders.length === 0 ? (
        <div className="p-12 text-center text-slate-500 text-sm bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800">
          No orders found matching your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orders.map((ord) => (
            <div
              key={ord.id}
              className={`bg-slate-900/60 backdrop-blur-md rounded-2xl border p-5 space-y-4 transition-all hover:border-slate-700 ${
                ord.archived ? 'opacity-50 border-slate-800/40 bg-slate-950/40' : 'border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-100">{ord.table_number}</h3>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                    Order #{ord.id.slice(0, 8)}
                  </p>
                </div>
                {getStatusBadge(ord.status)}
              </div>

              <div className="space-y-1.5 text-xs text-slate-400 pt-2 border-t border-slate-800/60">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <User className="w-3.5 h-3.5" />
                    Primary Waiter:
                  </span>
                  <span className="font-semibold text-slate-200">
                    {ord.primary_waiter_name || 'Unassigned'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <Clock className="w-3.5 h-3.5" />
                    Created:
                  </span>
                  <span>{new Date(ord.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <Utensils className="w-3.5 h-3.5" />
                    Dishes Added:
                  </span>
                  <span className="font-mono text-emerald-400 font-bold">{ord.item_count || 0} items</span>
                </div>

                {ord.notes && (
                  <div className="flex items-start gap-1.5 text-slate-400 bg-slate-950/60 p-2 rounded-lg border border-slate-800 mt-2">
                    <FileText className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-500" />
                    <span className="text-[11px] italic">{ord.notes}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-800/60">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-slate-500">Total</span>
                  <p className="text-base font-bold text-emerald-400 font-mono">
                    ₹{parseFloat(ord.total_amount || 0).toFixed(2)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleViewOrderDetails(ord.id)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer flex items-center gap-1 text-xs"
                    title="View Order Details"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Details</span>
                  </button>

                  {isManager && (
                    <button
                      onClick={() => handleToggleArchive(ord.id, ord.archived)}
                      className={`p-2 rounded-xl transition-colors cursor-pointer ${
                        ord.archived
                          ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400'
                          : 'bg-red-500/10 hover:bg-red-500/20 text-red-400'
                      }`}
                      title={ord.archived ? 'Restore Order' : 'Archive Order'}
                    >
                      {ord.archived ? <RotateCcw className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Bar */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between bg-slate-900/60 backdrop-blur-md p-4 rounded-2xl border border-slate-800 text-xs text-slate-400">
          <span>
            Showing page <strong className="text-slate-100">{pagination.page}</strong> of{' '}
            <strong className="text-slate-100">{pagination.totalPages}</strong> ({pagination.totalCount} total orders)
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page === 1}
              className="p-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 disabled:opacity-40 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(p + 1, pagination.totalPages))}
              disabled={page === pagination.totalPages}
              className="p-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 disabled:opacity-40 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Create Order Modal with Menu Item Selection & Special Instructions */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-100">Create New Order</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Table Number / Identifier *
                </label>
                <input
                  type="text"
                  required
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  placeholder="e.g. Table 4 or Bar 1"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Order Notes (Optional)
                </label>
                <input
                  type="text"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="e.g. Birthday party, near window"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Menu Item Picker Section (Goal #3) */}
              <div className="pt-3 border-t border-slate-800 space-y-3">
                <label className="block text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  Add Dishes to Order (Goal #3)
                </label>

                {menuItems.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No available dishes in menu.</p>
                ) : (
                  <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <label className="block text-[10px] text-slate-400 mb-1">Select Dish</label>
                        <select
                          value={selectedMenuItemId}
                          onChange={(e) => setSelectedMenuItemId(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                        >
                          {menuItems.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} — ₹{parseFloat(m.price).toFixed(2)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Qty</label>
                        <input
                          type="number"
                          min="1"
                          max="99"
                          value={dishQuantity}
                          onChange={(e) => setDishQuantity(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">
                        Special Instructions for Dish (e.g. Extra spicy, no onions)
                      </label>
                      <input
                        type="text"
                        value={specialInstructions}
                        onChange={(e) => setSpecialInstructions(e.target.value)}
                        placeholder="e.g. Extra cheese, no garlic"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleAddDishToDraft}
                      className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-semibold rounded-lg border border-slate-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Dish to Order</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Draft Selected Items List */}
              {draftLines.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <label className="block text-xs font-semibold text-slate-300">
                    Selected Dishes ({draftLines.length})
                  </label>

                  <div className="max-h-36 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-800">
                    {draftLines.map((line, idx) => (
                      <div key={idx} className="pt-2 first:pt-0 flex items-start justify-between gap-2 text-xs">
                        <div className="flex-1">
                          <p className="font-semibold text-slate-200">
                            {line.quantity}x {line.name}
                            <span className="text-slate-400 font-mono font-normal ml-2">
                              (₹{(line.price * line.quantity).toFixed(2)})
                            </span>
                          </p>
                          {line.special_instructions && (
                            <p className="text-[11px] text-amber-400 italic">
                              Note: {line.special_instructions}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveDraftLine(idx)}
                          className="text-slate-500 hover:text-red-400 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800 font-bold text-xs">
                    <span className="text-slate-400">Order Subtotal:</span>
                    <span className="text-emerald-400 font-mono text-sm">
                      ₹{draftSubtotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
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
                  {actionLoading ? 'Creating Order...' : 'Submit Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Order Details Modal (Goal #3 Lines & Price Snapshots) */}
      {selectedOrderDetails && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-slate-100">
                  {selectedOrderDetails.table_number}
                </h2>
                <p className="text-xs text-slate-400 font-mono">
                  Order ID: {selectedOrderDetails.id}
                </p>
              </div>
              {getStatusBadge(selectedOrderDetails.status)}
            </div>

            <div className="space-y-2 text-xs text-slate-300 bg-slate-950/50 p-3 rounded-xl border border-slate-800">
              <p><strong>Primary Waiter:</strong> {selectedOrderDetails.primary_waiter_name}</p>
              <p><strong>Created At:</strong> {new Date(selectedOrderDetails.created_at).toLocaleString()}</p>
              {selectedOrderDetails.notes && <p><strong>Notes:</strong> {selectedOrderDetails.notes}</p>}
            </div>

            {/* Order Lines with price_at_add snapshots */}
            <div className="space-y-2 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Ordered Items (Goal #3 Price Snapshots)
              </h3>

              {(!selectedOrderDetails.lines || selectedOrderDetails.lines.length === 0) ? (
                <p className="text-xs text-slate-500 italic">No item lines added to this order yet.</p>
              ) : (
                <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
                  {selectedOrderDetails.lines.map((line) => (
                    <div key={line.id} className="p-3 flex items-start justify-between gap-3 text-xs">
                      <div>
                        <p className="font-semibold text-slate-200">
                          {line.quantity}x {line.item_name}
                        </p>
                        <p className="text-[11px] text-slate-500 font-mono">
                          Price snapshot at add: ₹{parseFloat(line.price_at_add).toFixed(2)} each
                        </p>
                        {line.special_instructions && (
                          <p className="text-[11px] text-amber-400 italic mt-1">
                            Note: {line.special_instructions}
                          </p>
                        )}
                      </div>
                      <span className="font-mono font-bold text-emerald-400">
                        ₹{(line.quantity * parseFloat(line.price_at_add)).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <span className="text-xs font-bold text-slate-300">Total Order Amount:</span>
              <span className="text-lg font-bold font-mono text-emerald-400">
                ₹{parseFloat(selectedOrderDetails.total_amount || 0).toFixed(2)}
              </span>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedOrderDetails(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
