'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, CheckCircle, XCircle, Clock } from 'lucide-react';
import {
  ORDER_UPDATE_EVENT,
  getOrders,
  getOrderStats,
  initializeOrders,
  type Order,
  type OrderStats,
} from '../lib/orderStore';

interface OrderListProps {
  onStatsUpdate?: (stats: OrderStats) => void;
  title?: string;
}

export default function OrderList({ onStatsUpdate, title = 'Recent Orders' }: OrderListProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;

    const refresh = async () => {
      const nextOrders = await refreshOrders();
      if (!disposed) {
        setOrders(nextOrders);
        onStatsUpdate?.(getOrderStats(nextOrders));
      }
    };

    initializeOrders()
      .then((nextOrders) => {
        if (!disposed) {
          setOrders(nextOrders);
          setError(null);
          onStatsUpdate?.(getOrderStats(nextOrders));
        }
      })
      .catch((cause) => {
        if (!disposed) {
          setOrders([]);
          setError(cause instanceof Error ? cause.message : 'Unable to load orders');
        }
      });

    window.addEventListener(ORDER_UPDATE_EVENT, refresh);

    return () => {
      disposed = true;
      window.removeEventListener(ORDER_UPDATE_EVENT, refresh);
    };
  }, []);

  const refreshOrders = async () => {
    try {
      const nextOrders = await getOrders();
      setError(null);
      return nextOrders;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load orders');
      return [];
    }
  };

  const getStatusIcon = (status: Order['status']) => {
    switch(status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Package className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="surface-card p-6"
    >
      <h2 className="text-xl font-semibold text-gray-800 mb-4">{title}</h2>

      {error ? (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      ) : null}
      
      <div className="space-y-3">
        <AnimatePresence>
          {orders.map((order, index) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
              className="p-4 border border-gray-100 rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(order.status)}
                  <span className="font-semibold text-gray-800">{order.id}</span>
                </div>
                <span className="text-sm text-gray-500">{order.items} items</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-gray-600">{order.customer}</span>
                  <p className="text-xs text-slate-500">
                    {order.productName}
                    {order.platform ? ` on ${order.platform}` : ''}
                  </p>
                </div>
                <span className="font-bold text-blue-600">${order.amount}</span>
              </div>
              <div className="mt-2">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  order.status === 'completed' ? 'bg-green-100 text-green-800' :
                  order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {order.status}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}