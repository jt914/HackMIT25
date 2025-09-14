'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getApiEndpoint } from "@/lib/config";
import ConnectionStateCard from './ConnectionStateCard';

interface ConnectionEvent {
  id: string;
  event_type: string;
  status: string;
  message?: string;
  metadata?: any;
  timestamp: string;
}

interface ConnectionState {
  id: string;
  user_email: string;
  source_type: string;
  source_name: string;
  is_connected: boolean;
  connection_status: string;
  health_status: string;
  credentials_set: boolean;
  last_sync_at?: string;
  last_sync_status?: string;
  sync_frequency?: string;
  data_count: number;
  created_at: string;
  updated_at: string;
  last_tested_at?: string;
  recent_events: ConnectionEvent[];
  error_count: number;
  last_error?: string;
  last_error_at?: string;
}

interface ConnectionSummary {
  total_connections: number;
  connected_count: number;
  healthy_count: number;
  error_count: number;
  last_sync_count: number;
  sources_by_type: Record<string, {
    total: number;
    connected: number;
    healthy: number;
  }>;
}

interface ConnectionDashboardProps {
  userEmail: string;
}

export default function ConnectionDashboard({ userEmail }: ConnectionDashboardProps) {
  const [connectionStates, setConnectionStates] = useState<ConnectionState[]>([]);
  const [summary, setSummary] = useState<ConnectionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [testingConnection, setTestingConnection] = useState<string | null>(null);
  const [error, setError] = useState('');

  const fetchConnectionStates = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch(getApiEndpoint(`connection-states/${userEmail}`));
      const data = await response.json();
      
      if (response.ok && data.success) {
        setConnectionStates(data.connection_states || []);
        setSummary(data.summary || null);
      } else {
        setError(data.error || 'Failed to fetch connection states');
      }
    } catch (error) {
      console.error('Error fetching connection states:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async (sourceType: string) => {
    try {
      setTestingConnection(sourceType);
      setError('');
      
      const response = await fetch(getApiEndpoint('test-connection'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: userEmail,
          source_type: sourceType
        }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        // Refresh connection states after test
        await fetchConnectionStates();
      } else {
        setError(data.error || 'Failed to test connection');
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      setError('Network error. Please try again.');
    } finally {
      setTestingConnection(null);
    }
  };

  useEffect(() => {
    if (userEmail) {
      fetchConnectionStates();
    }
  }, [userEmail]);

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800';
      case 'unhealthy':
        return 'bg-red-100 text-red-800';
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading connection states...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{summary.total_connections}</div>
              <div className="text-sm text-gray-600">Total Sources</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{summary.connected_count}</div>
              <div className="text-sm text-gray-600">Connected</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-emerald-600">{summary.healthy_count}</div>
              <div className="text-sm text-gray-600">Healthy</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{summary.error_count}</div>
              <div className="text-sm text-gray-600">Errors</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{summary.last_sync_count}</div>
              <div className="text-sm text-gray-600">Synced</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Overall Health Status */}
      {summary && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Data Sources Overview</CardTitle>
            <CardDescription>Status of all your connected data sources</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(summary.sources_by_type).map(([sourceType, stats]) => (
                <div key={sourceType} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium capitalize">{sourceType}</h3>
                    <Badge variant="outline">{stats.total}</Badge>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Connected:</span>
                      <span className={stats.connected > 0 ? 'text-green-600' : 'text-gray-500'}>
                        {stats.connected}/{stats.total}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Healthy:</span>
                      <span className={stats.healthy > 0 ? 'text-green-600' : 'text-gray-500'}>
                        {stats.healthy}/{stats.total}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connection State Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Connection Details</h2>
          <Button onClick={fetchConnectionStates} disabled={loading} variant="outline">
            {loading ? 'Refreshing...' : 'Refresh All'}
          </Button>
        </div>
        
        {connectionStates.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-gray-500">No connection states found.</p>
              <p className="text-sm text-gray-400 mt-2">
                Connection states will appear here once you configure your integrations.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {connectionStates.map((connectionState) => (
              <ConnectionStateCard
                key={connectionState.id}
                connectionState={connectionState}
                onTest={testConnection}
                onRefresh={fetchConnectionStates}
                isLoading={testingConnection === connectionState.source_type}
              />
            ))}
          </div>
        )}
      </div>

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Status Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Badge className="bg-green-100 text-green-800">Healthy</Badge>
              <span>Working properly</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-yellow-100 text-yellow-800">Degraded</Badge>
              <span>Some issues</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-red-100 text-red-800">Unhealthy</Badge>
              <span>Not working</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>
              <span>Not tested</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
