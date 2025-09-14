'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface ConnectionEvent {
  id: string;
  event_type: string;
  status: string;
  message?: string;
  metadata?: Record<string, unknown>;
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

interface ConnectionStateCardProps {
  connectionState: ConnectionState;
  onTest: (sourceType: string) => Promise<void>;
  onRefresh: () => void;
  isLoading?: boolean;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'healthy':
    case 'connected':
    case 'success':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'unhealthy':
    case 'disconnected':
    case 'error':
    case 'failure':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'degraded':
    case 'syncing':
    case 'in_progress':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getSourceIcon = (sourceType: string) => {
  switch (sourceType) {
    case 'github':
      return '🐙';
    case 'linear':
      return '📋';
    case 'slack':
      return '💬';
    default:
      return '🔗';
  }
};

const formatTimestamp = (timestamp: string) => {
  try {
    return new Date(timestamp).toLocaleString();
  } catch {
    return timestamp;
  }
};

const formatTimeAgo = (timestamp: string) => {
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  } catch {
    return timestamp;
  }
};

export default function ConnectionStateCard({ 
  connectionState, 
  onTest, 
  onRefresh, 
  isLoading = false 
}: ConnectionStateCardProps) {
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);

  const handleTest = async () => {
    await onTest(connectionState.source_type);
    setIsTestDialogOpen(false);
    onRefresh();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{getSourceIcon(connectionState.source_type)}</span>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-lg truncate" title={connectionState.source_name}>{connectionState.source_name}</CardTitle>
              <CardDescription className="capitalize truncate" title={connectionState.source_type}>{connectionState.source_type}</CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
            <Badge className={getStatusColor(connectionState.health_status)}>
              {connectionState.health_status}
            </Badge>
            <Badge className={getStatusColor(connectionState.connection_status)}>
              {connectionState.connection_status}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Connection Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center p-2 bg-gray-50 rounded">
            <div className="font-semibold text-lg">
              {connectionState.credentials_set ? '✅' : '❌'}
            </div>
            <div className="text-gray-600">Credentials</div>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded">
            <div className="font-semibold text-lg">{connectionState.data_count}</div>
            <div className="text-gray-600">Items Synced</div>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded">
            <div className="font-semibold text-lg">{connectionState.error_count}</div>
            <div className="text-gray-600">Errors</div>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded">
            <div className="font-semibold text-lg">{connectionState.recent_events.length}</div>
            <div className="text-gray-600">Events</div>
          </div>
        </div>

        {/* Last Sync Info */}
        {connectionState.last_sync_at && (
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-blue-900">Last Sync</div>
                <div className="text-sm text-blue-700">
                  {formatTimeAgo(connectionState.last_sync_at)} • {connectionState.last_sync_status}
                </div>
              </div>
              <Badge className={getStatusColor(connectionState.last_sync_status || 'unknown')}>
                {connectionState.last_sync_status || 'Unknown'}
              </Badge>
            </div>
          </div>
        )}

        {/* Error Info */}
        {connectionState.last_error && (
          <div className="p-3 bg-red-50 rounded-lg border border-red-200">
            <div className="font-medium text-red-900">Last Error</div>
            <div className="text-sm text-red-700 mt-1 break-words overflow-hidden" title={connectionState.last_error} style={{
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical'
            }}>
              {connectionState.last_error}
            </div>
            <div className="text-xs text-red-600 mt-1">
              {connectionState.last_error_at && formatTimeAgo(connectionState.last_error_at)}
            </div>
          </div>
        )}

        <Separator />

        {/* Actions */}
        <div className="flex gap-2">
          <Dialog open={isTestDialogOpen} onOpenChange={setIsTestDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={isLoading}>
                Test Connection
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Test {connectionState.source_name}</DialogTitle>
                <DialogDescription>
                  This will test the connection to verify it&apos;s working properly.
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setIsTestDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleTest} disabled={isLoading}>
                  {isLoading ? 'Testing...' : 'Test Now'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                View History
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{connectionState.source_name} - Event History</DialogTitle>
                <DialogDescription>
                  Recent connection events and activities
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-96 overflow-y-auto space-y-3">
                {connectionState.recent_events.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No events recorded yet</p>
                ) : (
                  connectionState.recent_events
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .map((event) => (
                      <div key={event.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge className={`text-xs px-2 py-1 ${getStatusColor(event.status)}`}>
                              {event.event_type}
                            </Badge>
                            <span className="text-sm font-medium capitalize">
                              {event.event_type.replace('_', ' ')}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {formatTimeAgo(event.timestamp)}
                          </span>
                        </div>
                        {event.message && (
                          <p className="text-sm text-gray-700 break-words overflow-hidden" title={event.message} style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical'
                          }}>{event.message}</p>
                        )}
                        {event.metadata && (
                          <div className="text-xs text-gray-500 mt-1">
                            {typeof event.metadata === 'object' && event.metadata !== null && 'response_time_ms' in event.metadata && (
                              <span>Response time: {String(event.metadata.response_time_ms)}ms</span>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Button variant="ghost" size="sm" onClick={onRefresh} disabled={isLoading}>
            {isLoading ? '⟳' : '↻'} Refresh
          </Button>
        </div>

        {/* Connection Details */}
        <div className="text-xs text-gray-500 space-y-1">
          <div>Created: {formatTimestamp(connectionState.created_at)}</div>
          <div>Updated: {formatTimestamp(connectionState.updated_at)}</div>
          {connectionState.last_tested_at && (
            <div>Last tested: {formatTimestamp(connectionState.last_tested_at)}</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
