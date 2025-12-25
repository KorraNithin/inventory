'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import Navbar from '@/components/Navbar';
import { alertAPI } from '@/lib/api';
import { FiAlertTriangle, FiXCircle, FiCheckCircle } from 'react-icons/fi';

export default function AlertsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' or 'active'

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user) {
      fetchAlerts();
    }
  }, [user, authLoading, router, filter]);

  const fetchAlerts = async () => {
    try {
      const response = filter === 'active' 
        ? await alertAPI.getActive() 
        : await alertAPI.getAll();
      setAlerts(response.data.data);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (id) => {
    try {
      await alertAPI.resolve(id);
      fetchAlerts();
    } catch (error) {
      console.error('Error resolving alert:', error);
      alert('Error resolving alert');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  const canResolve = user.role === 'owner' || user.role === 'manager';

  const getAlertIcon = (type) => {
    switch (type) {
      case 'OUT_OF_STOCK':
        return <FiXCircle className="text-red-600 text-2xl" />;
      case 'LOW_STOCK':
        return <FiAlertTriangle className="text-yellow-600 text-2xl" />;
      case 'DEAD_STOCK':
        return <FiAlertTriangle className="text-orange-600 text-2xl" />;
      default:
        return <FiAlertTriangle className="text-gray-600 text-2xl" />;
    }
  };

  const getAlertColor = (type) => {
    switch (type) {
      case 'OUT_OF_STOCK':
        return 'border-red-500 bg-red-50';
      case 'LOW_STOCK':
        return 'border-yellow-500 bg-yellow-50';
      case 'DEAD_STOCK':
        return 'border-orange-500 bg-orange-50';
      default:
        return 'border-gray-500 bg-gray-50';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Alerts</h1>
          <p className="mt-1 text-sm text-gray-600">Manage inventory alerts and warnings</p>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 flex space-x-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            All Alerts
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'active'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Active Only
          </button>
        </div>

        {/* Alerts List */}
        {alerts.length > 0 ? (
          <div className="space-y-4">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-6 rounded-lg border-l-4 ${getAlertColor(alert.alert_type)} ${
                  alert.is_resolved ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="flex-shrink-0">
                      {getAlertIcon(alert.alert_type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {alert.product_name}
                        </h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded ${
                          alert.alert_type === 'OUT_OF_STOCK'
                            ? 'bg-red-200 text-red-800'
                            : alert.alert_type === 'LOW_STOCK'
                            ? 'bg-yellow-200 text-yellow-800'
                            : 'bg-orange-200 text-orange-800'
                        }`}>
                          {alert.alert_type.replace('_', ' ')}
                        </span>
                        {alert.is_resolved && (
                          <span className="px-2 py-1 text-xs font-medium rounded bg-green-200 text-green-800 flex items-center">
                            <FiCheckCircle className="mr-1" />
                            Resolved
                          </span>
                        )}
                      </div>
                      <p className="text-gray-700 mb-2">{alert.message}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>SKU: {alert.sku_code}</span>
                        <span>•</span>
                        <span>Current Stock: {alert.current_quantity}</span>
                        <span>•</span>
                        <span>Min Required: {alert.min_quantity}</span>
                        <span>•</span>
                        <span>{new Date(alert.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  {!alert.is_resolved && canResolve && (
                    <button
                      onClick={() => handleResolve(alert.id)}
                      className="ml-4 btn-primary text-sm"
                    >
                      Mark Resolved
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card text-center py-12">
            <FiCheckCircle className="mx-auto text-6xl text-green-500 mb-4" />
            <p className="text-gray-500 text-lg">No alerts found</p>
            <p className="text-gray-400 text-sm mt-2">All your inventory is in good shape!</p>
          </div>
        )}
      </div>
    </div>
  );
}
