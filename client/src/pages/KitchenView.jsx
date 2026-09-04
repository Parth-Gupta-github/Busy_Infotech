import React, { useState, useEffect } from 'react';
import { apiFetch } from '../services/api';
import { Clock, ChefHat, CheckCircle, AlertCircle, Utensils, RefreshCw, Sparkles, Filter } from 'lucide-react';

export default function KitchenView() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [showReadyPass, setShowReadyPass] = useState(false); // Toggle to show/hide orders already prepared

  // Fetch active kitchen orders
  const fetchKitchenOrders = async () => {
    try {
      const data = await apiFetch('/orders?includeArchived=false&limit=50');
      
      // Filter: Only show orders that have been sent to kitchen (exclude PLACED waiter drafts, SERVED & CANCELLED)
      const activeOrders = (data.orders || []).filter(order =>
        ['ACCEPTED', 'PREPARING', 'READY'].includes(order.status)
      );
      setOrders(activeOrders);
      setError(null);
    } catch (err) {
      console.error('Failed to load kitchen orders:', err);
      setError('Failed to refresh kitchen orders.');
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh KDS board every 10 seconds
  useEffect(() => {
    fetchKitchenOrders();
    const interval = setInterval(fetchKitchenOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  // Update order status with KDS one-click buttons
  const handleStatusUpdate = async (orderId, nextStatus) => {
    try {
      setUpdatingId(orderId);
      await apiFetch(`/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus })
      });
      await fetchKitchenOrders();
    } catch (err) {
      alert(err.message || 'Failed to update order status.');
    } finally {
      setUpdatingId(null);
    }
  };

  // Calculate elapsed time in minutes
  const getElapsedMinutes = (createdAt) => {
    const start = new Date(createdAt);
    const now = new Date();
    const diffMs = now - start;
    return Math.floor(diffMs / 60000);
  };

  // Helper to group and consolidate items for kitchen tickets
  // Separates new add-on dishes from previously prepared original items
  const consolidateItems = (rawItems = [], orderStatus) => {
    if (!rawItems || rawItems.length === 0) return { activeItems: [], preparedItems: [], hasAddOns: false };
    
    // Sort items by creation time to identify batches
    const sortedItems = [...rawItems].sort(
      (a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
    );

    const times = sortedItems.map(i => new Date(i.created_at || Date.now()).getTime());
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    // Detect distinct addition batches (> 30 seconds after first dish = add-on batch)
    const hasAddOns = (maxTime - minTime) > 30000;

    const activeMap = new Map();
    const preparedMap = new Map();

    // Find the latest batch boundary: items added within the last 30s of maxTime are "new"
    const latestBatchCutoff = hasAddOns ? (maxTime - 30000) : 0;

    sortedItems.forEach(item => {
      const key = `${item.item_name}_${item.special_instructions || ''}`;
      const itemTime = new Date(item.created_at || Date.now()).getTime();
      
      // An item is a "new add-on" if it was added significantly after the original batch
      const isNewAddOn = hasAddOns && (itemTime > latestBatchCutoff);

      // If there are add-ons: new items → activeMap, old items → preparedMap
      // If no add-ons: all items → activeMap (everything needs cooking)
      const targetMap = (hasAddOns && !isNewAddOn) ? preparedMap : activeMap;

      if (targetMap.has(key)) {
        const existing = targetMap.get(key);
        existing.quantity += (parseInt(item.quantity, 10) || 1);
        if (isNewAddOn) existing.isAddOn = true;
      } else {
        targetMap.set(key, {
          ...item,
          quantity: parseInt(item.quantity, 10) || 1,
          isAddOn: isNewAddOn
        });
      }
    });

    return {
      activeItems: Array.from(activeMap.values()),
      preparedItems: Array.from(preparedMap.values()),
      hasAddOns
    };
  };

  // Filter orders based on active preparation vs ready at pass (PLACED excluded from KDS entirely)
  const pendingOrders = orders.filter(o => ['ACCEPTED', 'PREPARING'].includes(o.status));
  const readyOrders = orders.filter(o => o.status === 'READY');
  const displayedOrders = showReadyPass ? orders : pendingOrders;

  // Color mapping for kitchen order statuses
  const statusColors = {
    ACCEPTED: { bg: 'bg-blue-500/10 dark:bg-blue-500/20', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-500/30', label: 'New Order — Queued' },
    PREPARING: { bg: 'bg-purple-500/10 dark:bg-purple-500/20', text: 'text-purple-700 dark:text-purple-400', border: 'border-purple-500/30', label: 'Cooking' },
    READY: { bg: 'bg-emerald-500/10 dark:bg-emerald-500/20', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-500/30', label: 'Ready at Pass' }
  };

  return (
    <div className="space-y-6">
      {/* KDS Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border shadow-sm backdrop-blur-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              Kitchen Display Screen (KDS)
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                {pendingOrders.length} Active Cooking Tickets
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Active kitchen cooking queue (prepared orders auto-clear from cooking board)</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle Ready at Pass Filter */}
          <button
            onClick={() => setShowReadyPass(!showReadyPass)}
            className={`px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              showReadyPass
                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/40 shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-200'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>{showReadyPass ? 'Hide Ready at Pass' : `Show Ready at Pass (${readyOrders.length})`}</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={fetchKitchenOrders}
            disabled={loading}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 transition-all flex items-center gap-2 cursor-pointer shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Kitchen Ticket Grid */}
      {loading && orders.length === 0 ? (
        <div className="text-center py-16 text-slate-500 dark:text-slate-400 text-sm">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          Loading live kitchen ticket board...
        </div>
      ) : displayedOrders.length === 0 ? (
        <div className="text-center py-16 px-6 bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3 text-emerald-500">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Kitchen Cooking Queue Clear!</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-md mx-auto">
            All kitchen orders have been prepared and marked ready. New orders placed by waiters will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayedOrders.map((order) => {
            const elapsedMins = getElapsedMinutes(order.created_at);
            const isDelayed = elapsedMins >= 15 && order.status !== 'READY';
            const statusConfig = statusColors[order.status] || statusColors.ACCEPTED;
            const { activeItems, preparedItems, hasAddOns } = consolidateItems(order.items, order.status);

            return (
              <div
                key={order.id}
                className={`flex flex-col bg-white dark:bg-slate-900 border rounded-2xl overflow-hidden transition-all shadow-md ${
                  isDelayed ? 'border-red-500/60 ring-2 ring-red-500/20' : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                {/* KOT Ticket Top Header */}
                <div className={`p-4 border-b flex items-center justify-between ${statusConfig.bg} ${statusConfig.border}`}>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-lg text-slate-900 dark:text-slate-100">{order.table_number}</span>
                      <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold ${statusConfig.text} ${statusConfig.border}`}>
                        {statusConfig.label}
                      </span>
                      {hasAddOns && (
                        <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/30 text-[10px] font-bold flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-purple-500" />
                          New Add-On
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                      Waiter: <span className="text-slate-900 dark:text-slate-200 font-semibold">{order.primary_waiter_name}</span>
                    </p>
                  </div>

                  {/* Elapsed Timer Badge */}
                  <div className={`px-2.5 py-1 rounded-xl border flex items-center gap-1.5 text-xs font-mono font-bold ${
                    isDelayed
                      ? 'bg-red-500 text-white border-red-600 animate-pulse shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-200'
                  }`}>
                    <Clock className="w-3.5 h-3.5" />
                    <span>{elapsedMins}m</span>
                  </div>
                </div>

                {/* Dish Items List */}
                <div className="p-4 flex-1 space-y-3 bg-slate-50/50 dark:bg-slate-950/30">
                  <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Utensils className="w-3.5 h-3.5" />
                    <span>Items to Prepare ({activeItems.length})</span>
                  </h4>

                  <div className="space-y-2.5">
                    {activeItems.length > 0 ? (
                      activeItems.map((item, idx) => (
                        <div
                          key={idx}
                          className={`p-3 rounded-xl border transition-all ${
                            item.isAddOn
                              ? 'bg-purple-500/5 dark:bg-purple-500/10 border-purple-500/30 ring-1 ring-purple-500/20'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm'
                          }`}
                        >
                          <div className="flex items-center justify-between font-semibold">
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-900 dark:text-slate-100">{item.item_name}</span>
                              {item.isAddOn && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                                  NEW ADD-ON
                                </span>
                              )}
                            </div>
                            <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold border border-emerald-500/20 text-xs">
                              x{item.quantity}
                            </span>
                          </div>
                          {item.special_instructions && (
                            <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1.5 font-medium italic bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                              Note: {item.special_instructions}
                            </p>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500 dark:text-slate-500 italic">No new items to prepare.</p>
                    )}
                  </div>

                  {/* Previously Cooked / Served Items Accordion */}
                  {preparedItems.length > 0 && (
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 space-y-1.5">
                      <div className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
                        <span>✓ Previously Prepared ({preparedItems.length}):</span>
                      </div>
                      <div className="space-y-1">
                        {preparedItems.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between text-[11px] text-slate-400 line-through opacity-70">
                            <span>{item.item_name}</span>
                            <span>x{item.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Special Order Notes */}
                {order.notes && (
                  <div className="px-4 py-2.5 bg-amber-500/10 border-t border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-300 font-medium">
                    Order Note: {order.notes}
                  </div>
                )}

                {/* One-Click Action Footer Buttons */}
                <div className="p-3.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                  {order.status === 'ACCEPTED' && (
                    <button
                      onClick={() => handleStatusUpdate(order.id, 'PREPARING')}
                      disabled={updatingId === order.id}
                      className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-purple-600/20 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <span>Start Cooking</span>
                    </button>
                  )}

                  {order.status === 'PREPARING' && (
                    <button
                      onClick={() => handleStatusUpdate(order.id, 'READY')}
                      disabled={updatingId === order.id}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Mark Ready for Service</span>
                    </button>
                  )}

                  {order.status === 'READY' && (
                    <span className="w-full py-2.5 text-center text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 rounded-xl border border-emerald-500/20 flex items-center justify-center gap-1.5">
                      <CheckCircle className="w-4 h-4" />
                      Ready at Pass (Prepared)
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
