import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';
import {
  ShoppingBag,
  Plus,
  Minus,
  Search,
  User,
  Users,
  UserPlus,
  UserMinus,
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
  Utensils,
  CheckCircle,
  Play,
  Flame,
  CheckCheck,
  Ban,
  History,
  Grid,
  Filter
} from 'lucide-react';

export default function OrdersPage() {
  const { user, isManager } = useAuth();

  // Orders and Pagination State
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalCount: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Total Restaurant Tables State (Manager Configurable)
  const [totalTables, setTotalTables] = useState(() => {
    const saved = localStorage.getItem('total_restaurant_tables');
    return saved ? parseInt(saved, 10) || 12 : 12;
  });

  // Save Total Tables to LocalStorage
  const handleUpdateTotalTables = (newCount) => {
    const validCount = Math.max(1, Math.min(100, newCount));
    setTotalTables(validCount);
    localStorage.setItem('total_restaurant_tables', validCount.toString());
  };

  // Menu items list for order creation & line addition pickers
  const [menuItems, setMenuItems] = useState([]);

  // Waiter Users list for collaborator selection (Goal #5)
  const [waiterUsers, setWaiterUsers] = useState([]);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showMyOrdersOnly, setShowMyOrdersOnly] = useState(() => !isManager);
  const [page, setPage] = useState(1);

  // Create Order Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalError, setModalError] = useState('');
  const [selectedTableNumber, setSelectedTableNumber] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [draftLines, setDraftLines] = useState([]);

  // Current Dish Picker State inside Create Modal
  const [selectedMenuItemId, setSelectedMenuItemId] = useState('');
  const [dishQuantity, setDishQuantity] = useState(1);
  const [specialInstructions, setSpecialInstructions] = useState('');

  // Add Item to Existing Active Order State
  const [addingLineToOrder, setAddingLineToOrder] = useState(null);
  const [appendMenuItemId, setAppendMenuItemId] = useState('');
  const [appendQuantity, setAppendQuantity] = useState(1);
  const [appendSpecialInstructions, setAppendSpecialInstructions] = useState('');

  // Void Order Line Modal State (Goal #3 Part B)
  const [voidingLineData, setVoidingLineData] = useState(null);
  const [voidQuantity, setVoidQuantity] = useState(1);
  const [voidReason, setVoidReason] = useState('');
  const [voidError, setVoidError] = useState('');

  // Collaborators Management Modal State (Goal #5)
  const [managingCollabsOrder, setManagingCollabsOrder] = useState(null);
  const [collabWaitersList, setCollabWaitersList] = useState([]);
  const [selectedCollabWaiterId, setSelectedCollabWaiterId] = useState('');
  const [collabError, setCollabError] = useState('');

  // Order Details View Modal State
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);

  // Audit Logs Modal State (Goal #9)
  const [auditLogsOrder, setAuditLogsOrder] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);

  const [actionLoading, setActionLoading] = useState(false);

  // Fetch Orders from Server
  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError('');

      let endpoint = `/orders?page=${page}&limit=10`;
      if (searchQuery.trim()) endpoint += `&search=${encodeURIComponent(searchQuery.trim())}`;
      if (statusFilter !== 'ALL') endpoint += `&status=${encodeURIComponent(statusFilter)}`;
      if (showMyOrdersOnly && user?.id) endpoint += `&waiterId=${encodeURIComponent(user.id)}`;

      const data = await apiFetch(endpoint);
      setOrders(data.orders || []);
      setPagination(data.pagination || { page: 1, limit: 10, totalCount: 0, totalPages: 1 });
    } catch (err) {
      setError(err.message || 'Failed to fetch orders.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Available Menu Items
  const fetchMenuItems = async () => {
    try {
      const data = await apiFetch('/menu');
      const availableDishes = (data || []).filter(item => item.available && !item.archived);
      setMenuItems(availableDishes);
      if (availableDishes.length > 0) {
        setSelectedMenuItemId(availableDishes[0].id);
        setAppendMenuItemId(availableDishes[0].id);
      }
    } catch (err) {
      console.error('Failed to load menu items:', err);
    }
  };

  // Fetch Waiters for Collaborator Assignment (Goal #5)
  const fetchWaiters = async () => {
    try {
      const data = await apiFetch('/auth/waiters');
      setWaiterUsers(data || []);
      if (data && data.length > 0) {
        setSelectedCollabWaiterId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load waiters list:', err);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchMenuItems();
    fetchWaiters();
  }, [page, statusFilter, showMyOrdersOnly, user?.id]);

  useEffect(() => {
    setShowMyOrdersOnly(!isManager);
  }, [user?.id, isManager]);

  // Debounced Search Trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchOrders();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Generate Table Options and Detect Occupied Tables
  const getTableOptions = () => {
    const tableOptions = [];
    for (let i = 1; i <= totalTables; i++) {
      const name = `Table ${i}`;
      const isOccupied = orders.some(o => 
        o.table_number.toLowerCase() === name.toLowerCase() && 
        !o.archived && 
        !['SERVED', 'CANCELLED'].includes((o.status || '').toUpperCase())
      );
      tableOptions.push({ number: i, name, isOccupied });
    }
    return tableOptions;
  };

  // Open Create Order Modal with First Available Unoccupied Table Selected
  const handleOpenAddModal = () => {
    const options = getTableOptions();
    const firstAvailable = options.find(t => !t.isOccupied);
    setSelectedTableNumber(firstAvailable ? firstAvailable.name : options[0]?.name || 'Table 1');
    setOrderNotes('');
    setDraftLines([]);
    setModalError('');
    setShowAddModal(true);
  };

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
    setModalError('');

    const payloadItems = draftLines.map(line => ({
      menu_item_id: line.menu_item_id,
      quantity: line.quantity,
      special_instructions: line.special_instructions
    }));

    try {
      await apiFetch('/orders', {
        method: 'POST',
        body: JSON.stringify({
          table_number: selectedTableNumber,
          notes: orderNotes,
          items: payloadItems
        })
      });

      setShowAddModal(false);
      setOrderNotes('');
      setDraftLines([]);
      setModalError('');
      setPage(1);
      fetchOrders();
    } catch (err) {
      setModalError(err.message || 'Failed to create order.');
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Append Dish Line to Existing Active Order
  const handleAppendDishLine = async (e) => {
    e.preventDefault();
    if (!addingLineToOrder || !appendMenuItemId) return;

    try {
      setActionLoading(true);
      const updatedOrder = await apiFetch(`/orders/${addingLineToOrder.id}/lines`, {
        method: 'POST',
        body: JSON.stringify({
          menu_item_id: appendMenuItemId,
          quantity: appendQuantity,
          special_instructions: appendSpecialInstructions
        })
      });

      setAddingLineToOrder(null);
      setAppendQuantity(1);
      setAppendSpecialInstructions('');
      if (selectedOrderDetails && selectedOrderDetails.id === updatedOrder.id) {
        setSelectedOrderDetails(updatedOrder);
      }
      fetchOrders();
    } catch (err) {
      alert(err.message || 'Failed to add dish to order.');
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Void Order Line with Mandatory Reason & Partial Quantity Support (Goal #3 Part B)
  const handleVoidOrderLineSubmit = async (e) => {
    e.preventDefault();
    if (!voidingLineData) return;

    if (!voidReason || !voidReason.trim()) {
      setVoidError('Void reason is required when voiding an order line.');
      return;
    }

    try {
      setActionLoading(true);
      setVoidError('');

      const updatedOrder = await apiFetch(
        `/orders/${voidingLineData.orderId}/lines/${voidingLineData.lineId}/void`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            void_quantity: parseInt(voidQuantity, 10) || voidingLineData.maxQuantity,
            void_reason: voidReason.trim()
          })
        }
      );

      setVoidingLineData(null);
      setVoidReason('');
      setVoidQuantity(1);
      setVoidError('');

      if (selectedOrderDetails && selectedOrderDetails.id === updatedOrder.id) {
        setSelectedOrderDetails(updatedOrder);
      }
      fetchOrders();
    } catch (err) {
      setVoidError(err.message || 'Failed to void order line.');
    } finally {
      setActionLoading(false);
    }
  };

  // Open Manage Collaborators Modal (Goal #5)
  const handleOpenManageCollabs = async (ord) => {
    try {
      setManagingCollabsOrder(ord);
      setCollabError('');
      const collabs = await apiFetch(`/orders/${ord.id}/collaborators`);
      setCollabWaitersList(collabs || []);
    } catch (err) {
      alert(err.message || 'Failed to load collaborators.');
    }
  };

  // Submit Add Collaborator Waiter (Goal #5)
  const handleAddCollaborator = async (e) => {
    e.preventDefault();
    if (!managingCollabsOrder || !selectedCollabWaiterId) return;

    try {
      setActionLoading(true);
      setCollabError('');

      const updatedOrder = await apiFetch(`/orders/${managingCollabsOrder.id}/collaborators`, {
        method: 'POST',
        body: JSON.stringify({ waiter_id: selectedCollabWaiterId })
      });

      const updatedCollabs = await apiFetch(`/orders/${managingCollabsOrder.id}/collaborators`);
      setCollabWaitersList(updatedCollabs || []);

      if (selectedOrderDetails && selectedOrderDetails.id === updatedOrder.id) {
        setSelectedOrderDetails(updatedOrder);
      }
      fetchOrders();
    } catch (err) {
      setCollabError(err.message || 'Failed to add collaborator.');
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Remove Collaborator Waiter (Goal #5)
  const handleRemoveCollaborator = async (waiterId) => {
    if (!managingCollabsOrder) return;

    try {
      setActionLoading(true);
      setCollabError('');

      const updatedOrder = await apiFetch(
        `/orders/${managingCollabsOrder.id}/collaborators/${waiterId}`,
        { method: 'DELETE' }
      );

      const updatedCollabs = await apiFetch(`/orders/${managingCollabsOrder.id}/collaborators`);
      setCollabWaitersList(updatedCollabs || []);

      if (selectedOrderDetails && selectedOrderDetails.id === updatedOrder.id) {
        setSelectedOrderDetails(updatedOrder);
      }
      fetchOrders();
    } catch (err) {
      setCollabError(err.message || 'Failed to remove collaborator.');
    } finally {
      setActionLoading(false);
    }
  };

  // Transition Order Lifecycle Status (Goal #4)
  const handleStatusTransition = async (orderId, newStatus) => {
    try {
      setActionLoading(true);
      await apiFetch(`/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
      fetchOrders();
    } catch (err) {
      alert(err.message || 'Status transition failed.');
    } finally {
      setActionLoading(false);
    }
  };

  // View Order Details Modal
  const handleViewOrderDetails = async (id) => {
    try {
      const data = await apiFetch(`/orders/${id}`);
      setSelectedOrderDetails(data);
    } catch (err) {
      alert(err.message || 'Failed to load order details.');
    }
  };

  // View Audit History Log Timeline Modal (Goal #9)
  const handleViewAuditLogs = async (order) => {
    try {
      setAuditLogsOrder(order);
      const logs = await apiFetch(`/orders/${order.id}/audit`);
      setAuditLogs(logs || []);
    } catch (err) {
      alert(err.message || 'Failed to load audit logs.');
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

  const tableOptionsList = getTableOptions();

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
            Manage orders, select tables, assign collaborators, void dish lines, and view audit history
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Manager Restaurant Table Capacity Control */}
          {isManager && (
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
              <Grid className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-400 font-medium">Tables:</span>
              <button
                onClick={() => handleUpdateTotalTables(totalTables - 1)}
                className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold transition-colors cursor-pointer"
                title="Decrease Restaurant Total Tables"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="font-bold font-mono text-emerald-400 px-1 text-sm">{totalTables}</span>
              <button
                onClick={() => handleUpdateTotalTables(totalTables + 1)}
                className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold transition-colors cursor-pointer"
                title="Increase Restaurant Total Tables"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          )}

          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-emerald-500/20 flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Order</span>
          </button>
        </div>
      </div>

      {/* Main Error Banner */}
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

        {/* Filters & Consolidated "My Orders" Toggle (Goal #5) */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <button
            onClick={() => {
              setShowMyOrdersOnly(!showMyOrdersOnly);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              showMyOrdersOnly
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                : 'bg-slate-950 text-slate-300 border border-slate-800 hover:text-white'
            }`}
            title="Toggle orders where you are Primary Waiter or Collaborator"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>{showMyOrdersOnly ? 'My Orders Only' : 'All Orders'}</span>
          </button>

          <div className="h-4 w-px bg-slate-800 shrink-0"></div>

          {['ALL', 'PLACED', 'ACCEPTED', 'PREPARING', 'READY', 'SERVED', 'CANCELLED'].map((st) => (
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
              {st === 'ALL' ? 'ALL' : st.charAt(0) + st.slice(1).toLowerCase()}
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
          No orders found matching your search or filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orders.map((ord) => {
            const currentStatus = (ord.status || 'PLACED').toUpperCase();
            const isActiveOrder = !ord.archived && !['SERVED', 'CANCELLED'].includes(currentStatus);

            return (
              <div
                key={ord.id}
                className={`bg-slate-900/60 backdrop-blur-md rounded-2xl border p-5 space-y-4 transition-all hover:border-slate-700 flex flex-col justify-between ${
                  ord.archived ? 'opacity-50 border-slate-800/40 bg-slate-950/40' : 'border-slate-800'
                }`}
              >
                <div className="space-y-4">
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
                </div>

                <div className="space-y-3 pt-3 border-t border-slate-800/60">
                  {/* Order Total & Quick Actions */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-slate-500">Total</span>
                      <p className="text-base font-bold text-emerald-400 font-mono">
                        ₹{parseFloat(ord.total_amount || 0).toFixed(2)}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isActiveOrder && (
                        <button
                          onClick={() => setAddingLineToOrder(ord)}
                          className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold"
                          title="Add Dish to Active Order"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Dish</span>
                        </button>
                      )}

                      {isActiveOrder && (
                        <button
                          onClick={() => handleOpenManageCollabs(ord)}
                          className="p-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold"
                          title="Manage Collaborating Waiters"
                        >
                          <Users className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        onClick={() => handleViewOrderDetails(ord.id)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer flex items-center gap-1 text-xs"
                        title="View Order Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Details</span>
                      </button>

                      <button
                        onClick={() => handleViewAuditLogs(ord)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer flex items-center gap-1 text-xs"
                        title="View Immutable Audit History"
                      >
                        <History className="w-3.5 h-3.5 text-amber-400" />
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
                          {ord.archived ? <RotateCcw className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Lifecycle State Machine Transition Action Buttons */}
                  <div className="pt-2 border-t border-slate-800/40 flex items-center gap-2">
                    {currentStatus === 'PLACED' && (
                      <>
                        <button
                          onClick={() => handleStatusTransition(ord.id, 'ACCEPTED')}
                          disabled={actionLoading}
                          className="flex-1 py-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>Accept Order</span>
                        </button>
                        <button
                          onClick={() => handleStatusTransition(ord.id, 'CANCELLED')}
                          disabled={actionLoading}
                          className="py-2 px-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-semibold rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                          title="Cancel Order"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          <span>Cancel</span>
                        </button>
                      </>
                    )}

                    {currentStatus === 'ACCEPTED' && (
                      <>
                        <button
                          onClick={() => handleStatusTransition(ord.id, 'PREPARING')}
                          disabled={actionLoading}
                          className="flex-1 py-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-400 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Flame className="w-3.5 h-3.5" />
                          <span>Start Preparing</span>
                        </button>
                        <button
                          onClick={() => handleStatusTransition(ord.id, 'CANCELLED')}
                          disabled={actionLoading}
                          className="py-2 px-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-semibold rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                          title="Cancel Order"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          <span>Cancel</span>
                        </button>
                      </>
                    )}

                    {currentStatus === 'PREPARING' && (
                      <button
                        onClick={() => handleStatusTransition(ord.id, 'READY')}
                        disabled={actionLoading}
                        className="w-full py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Mark Ready for Pickup</span>
                      </button>
                    )}

                    {currentStatus === 'READY' && (
                      <button
                        onClick={() => handleStatusTransition(ord.id, 'SERVED')}
                        disabled={actionLoading}
                        className="w-full py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Mark Served to Table</span>
                      </button>
                    )}

                    {(currentStatus === 'SERVED' || currentStatus === 'CANCELLED') && (
                      <div className="w-full py-1.5 text-center text-[11px] font-mono text-slate-500 bg-slate-950/60 rounded-xl border border-slate-800">
                        Lifecycle Complete ({currentStatus})
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
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

      {/* Manage Collaborators Modal (Goal #5) */}
      {managingCollabsOrder && (
        <div className="fixed inset-0 z-[110] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-400" />
                <div>
                  <h2 className="text-lg font-bold text-slate-100">
                    Collaborators — {managingCollabsOrder.table_number}
                  </h2>
                  <p className="text-xs text-slate-400 font-mono">
                    Primary Waiter: {managingCollabsOrder.primary_waiter_name}
                  </p>
                </div>
              </div>
              <button onClick={() => setManagingCollabsOrder(null)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            {collabError && (
              <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{collabError}</span>
              </div>
            )}

            {/* Current Collaborators List */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400">
                Assigned Collaborators ({collabWaitersList.length})
              </h3>

              {collabWaitersList.length === 0 ? (
                <p className="text-xs text-slate-500 italic bg-slate-950/50 p-3 rounded-xl border border-slate-800">
                  No additional waiters assigned to this order yet.
                </p>
              ) : (
                <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
                  {collabWaitersList.map((collab) => (
                    <div key={collab.waiter_id} className="p-3 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-semibold text-slate-200">{collab.waiter_name}</p>
                        <p className="text-[11px] text-slate-500 font-mono">{collab.waiter_email}</p>
                      </div>
                      <button
                        onClick={() => handleRemoveCollaborator(collab.waiter_id)}
                        disabled={actionLoading}
                        className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-[11px] font-semibold rounded-lg flex items-center gap-1 cursor-pointer"
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add New Collaborator Form */}
            <form onSubmit={handleAddCollaborator} className="pt-3 border-t border-slate-800 space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                Assign Additional Waiter
              </label>

              <div className="flex items-center gap-2">
                <select
                  value={selectedCollabWaiterId}
                  onChange={(e) => setSelectedCollabWaiterId(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                >
                  {waiterUsers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.email})
                    </option>
                  ))}
                </select>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-3.5 py-2 bg-purple-500 hover:bg-purple-600 text-white text-xs font-semibold rounded-xl flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Assign</span>
                </button>
              </div>
            </form>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setManagingCollabsOrder(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Void Order Line Modal with Mandatory Reason & Partial Quantity Support (Goal #3 Part B) */}
      {voidingLineData && (
        <div className="fixed inset-0 z-[110] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-red-400 flex items-center gap-2">
                <Trash2 className="w-5 h-5" />
                <span>Void Order Line</span>
              </h2>
              <button onClick={() => setVoidingLineData(null)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              You are voiding <strong className="text-slate-100">{voidingLineData.itemName}</strong>.
              Select quantity to void and provide a mandatory reason.
            </p>

            {voidError && (
              <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{voidError}</span>
              </div>
            )}

            <form onSubmit={handleVoidOrderLineSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Quantity to Void (Max {voidingLineData.maxQuantity})
                </label>
                <input
                  type="number"
                  min="1"
                  max={voidingLineData.maxQuantity}
                  value={voidQuantity}
                  onChange={(e) => setVoidQuantity(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-red-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Mandatory Void Reason *
                </label>
                <input
                  type="text"
                  required
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="e.g. Customer changed mind, kitchen out of ingredient"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setVoidingLineData(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-xl cursor-pointer"
                >
                  {actionLoading ? 'Voiding...' : `Void ${voidQuantity} Item(s)`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Dish Line to Existing Active Order Modal */}
      {addingLineToOrder && (
        <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-100">
                  Add Dish to {addingLineToOrder.table_number}
                </h2>
                <p className="text-xs text-slate-400">
                  Appends a new dish line with price snapshot to this active order
                </p>
              </div>
              <button onClick={() => setAddingLineToOrder(null)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAppendDishLine} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Select Dish</label>
                <select
                  value={appendMenuItemId}
                  onChange={(e) => setAppendMenuItemId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                >
                  {menuItems.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} — ₹{parseFloat(m.price).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  max="99"
                  value={appendQuantity}
                  onChange={(e) => setAppendQuantity(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Special Instructions (Optional)
                </label>
                <input
                  type="text"
                  value={appendSpecialInstructions}
                  onChange={(e) => setAppendSpecialInstructions(e.target.value)}
                  placeholder="e.g. Extra spicy, less oil"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setAddingLineToOrder(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-xl cursor-pointer"
                >
                  {actionLoading ? 'Adding...' : 'Add Dish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Order Modal with Dropdown Table Selector */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-100">Create New Order</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* In-Modal Error Banner Alert */}
            {modalError && (
              <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs flex items-center gap-2.5 shadow-md">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span className="font-semibold">{modalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Select Restaurant Table *
                </label>
                <select
                  required
                  value={selectedTableNumber}
                  onChange={(e) => setSelectedTableNumber(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                >
                  {tableOptionsList.map((t) => (
                    <option key={t.number} value={t.name} disabled={t.isOccupied}>
                      {t.name} {t.isOccupied ? '— ⚠️ Active Order (Occupied)' : '— Available'}
                    </option>
                  ))}
                </select>
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

              {/* Menu Item Picker Section */}
              <div className="pt-3 border-t border-slate-800 space-y-3">
                <label className="block text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  Add Dishes to Order
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
                        Special Instructions for Dish
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

      {/* View Order Details Modal */}
      {selectedOrderDetails && (
        <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
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
              
              {selectedOrderDetails.collaborators && selectedOrderDetails.collaborators.length > 0 && (
                <p className="text-purple-400">
                  <strong>Collaborators:</strong> {selectedOrderDetails.collaborators.map(c => c.waiter_name).join(', ')}
                </p>
              )}

              <p><strong>Created At:</strong> {new Date(selectedOrderDetails.created_at).toLocaleString()}</p>
              {selectedOrderDetails.notes && <p><strong>Notes:</strong> {selectedOrderDetails.notes}</p>}
            </div>

            {/* Order Lines with price_at_add snapshots & Voiding (Goal #3 Part B) */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Ordered Items
                </h3>

                {!['SERVED', 'CANCELLED'].includes((selectedOrderDetails.status || '').toUpperCase()) && (
                  <button
                    onClick={() => {
                      setAddingLineToOrder(selectedOrderDetails);
                      setSelectedOrderDetails(null);
                    }}
                    className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Dish</span>
                  </button>
                )}
              </div>

              {(!selectedOrderDetails.lines || selectedOrderDetails.lines.length === 0) ? (
                <p className="text-xs text-slate-500 italic">No item lines added to this order yet.</p>
              ) : (
                <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
                  {selectedOrderDetails.lines.map((line) => (
                    <div key={line.id} className="p-3 flex items-start justify-between gap-3 text-xs">
                      <div className="flex-1">
                        <p className={`font-semibold ${line.voided ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                          {line.quantity}x {line.item_name}
                        </p>
                        <p className="text-[11px] text-slate-500 font-mono">
                          Price snapshot at add: ₹{parseFloat(line.price_at_add).toFixed(2)} each
                        </p>
                        {line.special_instructions && (
                          <p className="text-[11px] text-amber-400 italic mt-0.5">
                            Note: {line.special_instructions}
                          </p>
                        )}
                        {line.voided && (
                          <p className="text-[11px] text-red-400 font-medium italic mt-1 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 inline-block">
                            Voided: "{line.void_reason}"
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-right">
                        <span className={`font-mono font-bold ${line.voided ? 'line-through text-slate-600' : 'text-emerald-400'}`}>
                          ₹{(line.quantity * parseFloat(line.price_at_add)).toFixed(2)}
                        </span>

                        {!line.voided && !['SERVED', 'CANCELLED'].includes((selectedOrderDetails.status || '').toUpperCase()) && (
                          <button
                            onClick={() => {
                              setVoidReason('');
                              setVoidQuantity(1);
                              setVoidError('');
                              setVoidingLineData({
                                orderId: selectedOrderDetails.id,
                                lineId: line.id,
                                itemName: line.item_name,
                                maxQuantity: line.quantity
                              });
                            }}
                            className="p-1 text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
                            title="Void Order Line Item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
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

      {/* View Immutable Audit History Log Timeline Modal */}
      {auditLogsOrder && (
        <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-amber-400" />
                <div>
                  <h2 className="text-lg font-bold text-slate-100">
                    Audit Trail — {auditLogsOrder.table_number}
                  </h2>
                  <p className="text-xs text-slate-400 font-mono">
                    Immutable Log (Uneditable)
                  </p>
                </div>
              </div>
              <button onClick={() => setAuditLogsOrder(null)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            {auditLogs.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-4 text-center">No audit logs recorded for this order.</p>
            ) : (
              <div className="space-y-3 pl-2 border-l-2 border-slate-800 my-2">
                {auditLogs.map((log) => {
                  let detailsObj = {};
                  try {
                    detailsObj = typeof log.details === 'string' ? JSON.parse(log.details) : (log.details || {});
                  } catch (e) {
                    detailsObj = { message: String(log.details) };
                  }

                  return (
                    <div key={log.id} className="relative pl-4 text-xs space-y-1">
                      <span className="absolute -left-[17px] top-1.5 w-2.5 h-2.5 rounded-full bg-amber-400 ring-4 ring-slate-900"></span>

                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-200">{log.action}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </div>

                      <p className="text-slate-400">
                        Actor: <strong className="text-slate-300">{log.actor_name}</strong> ({log.actor_role})
                      </p>

                      {log.old_status && log.new_status && (
                        <p className="text-slate-300 font-mono text-[11px]">
                          Transition: <span className="text-amber-400">{log.old_status}</span> ➔ <span className="text-emerald-400">{log.new_status}</span>
                        </p>
                      )}

                      {detailsObj.message && (
                        <p className="text-[11px] text-slate-500 italic">
                          {detailsObj.message}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setAuditLogsOrder(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Close Audit Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
