'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getCurrentUserEmail, removeAuthToken, isAuthenticated } from "@/lib/backend-auth";
import { getApiEndpoint } from "@/lib/config";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Home,
  Settings as SettingsIcon,
  Plus,
  LogOut,
  MessageCircle,
  User,
  Shield,
  Link as LinkIcon,
  Github,
  BarChart3
} from 'lucide-react';

interface User {
  _id: string;
  name: string;
  email: string;
  username: string;
}

interface Repository {
  id: string;
  name: string;
  url: string;
  added_at: string;
  is_processed: boolean;
}

interface Integrations {
  github: boolean;
  linear: boolean;
  slack: boolean;
}

interface UserProfile {
  user: User;
  repositories: Repository[];
  integrations: Integrations;
}

export default function Settings() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('Settings');

  // Integration states
  const [linearApiKey, setLinearApiKey] = useState('');
  const [slackApiKey, setSlackApiKey] = useState('');
  const [slackChannelId, setSlackChannelId] = useState('');

  // Repository states
  const [newRepoName, setNewRepoName] = useState('');
  const [newRepoUrl, setNewRepoUrl] = useState('');
  const [isAddRepoDialogOpen, setIsAddRepoDialogOpen] = useState(false);

  const router = useRouter();
  const fetchUserProfileCalled = useRef(false);

  const fetchUserProfile = useCallback(async () => {
    try {
      if (!isAuthenticated()) {
        router.push('/login');
        return;
      }
      
      const userEmail = getCurrentUserEmail();
      if (!userEmail) {
        router.push('/login');
        return;
      }
      
      const response = await fetch(getApiEndpoint(`user-profile/${userEmail}`));
      const data = await response.json();
      
      if (response.ok && data.success) {
        setUserProfile({
          user: data.user,
          repositories: data.repositories || [],
          integrations: data.integrations || { github: false, linear: false, slack: false }
        });
        setName(data.user.username || '');
        setEmail(data.user.email || '');
      } else {
        // Fallback for basic user data
        const userData = {
          _id: userEmail,
          email: userEmail,
          name: userEmail.split('@')[0],
          username: userEmail.split('@')[0]
        };
        
        setUserProfile({
          user: userData,
          repositories: [],
          integrations: { github: false, linear: false, slack: false }
        });
        setName(userData.name);
        setEmail(userData.email);
      }
    } catch (_error) {
      console.error('Error fetching user profile:', _error);
      router.push('/login');
    }
  }, [router]);

  useEffect(() => {
    // Prevent double execution in React 19 Strict Mode
    if (fetchUserProfileCalled.current) return;
    fetchUserProfileCalled.current = true;

    fetchUserProfile();

    // Cleanup function to reset ref on unmount
    return () => {
      fetchUserProfileCalled.current = false;
    };
  }, [fetchUserProfile]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    // Normalize and validate username
    const normalizedName = name.toLowerCase();
    const usernameRegex = /^[a-z0-9-]+$/;
    if (!usernameRegex.test(normalizedName)) {
      setError('Username can only contain lowercase letters, numbers, and hyphens');
      setLoading(false);
      return;
    }

    if (normalizedName.length < 3) {
      setError('Username must be at least 3 characters long');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/user/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: normalizedName, email }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Profile updated successfully!');
        if (userProfile) {
          setUserProfile(prev => prev ? {
            ...prev,
            user: { ...prev.user, username: name, email }
          } : null);
        }
      } else {
        setError(data.error || 'Failed to update profile');
      }
    } catch (_error) {
      setError('Network error. Please try again.');
    }

    setLoading(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch('/api/user/change-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Password changed successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setError(data.error || 'Failed to change password');
      }
    } catch (_error) {
      setError('Network error. Please try again.');
    }

    setLoading(false);
  };

  const handleSetLinearApiKey = async () => {
    if (!linearApiKey.trim()) {
      setError('Please enter a Linear API key');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch(getApiEndpoint('set-linear-api-key'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: userProfile?.user.email, 
          api_key: linearApiKey 
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessage('Linear API key saved successfully!');
        setLinearApiKey('');
        if (userProfile) {
          setUserProfile(prev => prev ? {
            ...prev,
            integrations: { ...prev.integrations, linear: true }
          } : null);
        }
      } else {
        setError(data.error || 'Failed to save Linear API key');
      }
    } catch (_error) {
      setError('Network error. Please try again.');
    }

    setLoading(false);
  };

  const handleProcessLinearTickets = async () => {
    if (!userProfile?.integrations.linear) {
      setError('Please set your Linear API key first');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch(getApiEndpoint('process-linear-tickets'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userProfile.user.email }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessage('Linear tickets processed successfully!');
      } else {
        setError(data.error || 'Failed to process Linear tickets');
      }
    } catch (_error) {
      setError('Network error. Please try again.');
    }

    setLoading(false);
  };

  const handleSetSlackApiKey = async () => {
    if (!slackApiKey.trim()) {
      setError('Please enter a Slack API key');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch(getApiEndpoint('set-slack-api-key'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: userProfile?.user.email, 
          api_key: slackApiKey 
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessage('Slack API key saved successfully!');
        setSlackApiKey('');
        if (userProfile) {
          setUserProfile(prev => prev ? {
            ...prev,
            integrations: { ...prev.integrations, slack: true }
          } : null);
        }
      } else {
        setError(data.error || 'Failed to save Slack API key');
      }
    } catch (_error) {
      setError('Network error. Please try again.');
    }

    setLoading(false);
  };

  const handleProcessSlackMessages = async () => {
    if (!userProfile?.integrations.slack) {
      setError('Please set your Slack API key first');
      return;
    }

    if (!slackChannelId.trim()) {
      setError('Please enter a Slack channel ID');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch(getApiEndpoint('process-slack-messages'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: userProfile.user.email,
          channel_id: slackChannelId,
          limit: 200
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessage('Slack messages processed successfully!');
        setSlackChannelId('');
      } else {
        setError(data.error || 'Failed to process Slack messages');
      }
    } catch (_error) {
      setError('Network error. Please try again.');
    }

    setLoading(false);
  };

  const handleAddRepository = async () => {
    if (!newRepoName.trim() || !newRepoUrl.trim()) {
      setError('Please enter both repository name and URL');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch(getApiEndpoint('add-repository'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: userProfile?.user.email,
          repository_name: newRepoName,
          repository_url: newRepoUrl
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessage('Repository added successfully!');
        setNewRepoName('');
        setNewRepoUrl('');
        setIsAddRepoDialogOpen(false);
        fetchUserProfile(); // Refresh the profile data
      } else {
        setError(data.error || 'Failed to add repository');
      }
    } catch (_error) {
      setError('Network error. Please try again.');
    }

    setLoading(false);
  };

  const handleRemoveRepository = async (repositoryId: string) => {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch(getApiEndpoint('remove-repository'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: userProfile?.user.email,
          repository_id: repositoryId
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessage('Repository removed successfully!');
        fetchUserProfile(); // Refresh the profile data
      } else {
        setError(data.error || 'Failed to remove repository');
      }
    } catch (_error) {
      setError('Network error. Please try again.');
    }

    setLoading(false);
  };

  const handleProcessRepository = async (repositoryUrl: string) => {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch(getApiEndpoint('process-repository'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: userProfile?.user.email,
          github_url: repositoryUrl
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessage('Repository processed successfully!');
        fetchUserProfile(); // Refresh to update processed status
      } else {
        setError(data.error || 'Failed to process repository');
      }
    } catch (_error) {
      setError('Network error. Please try again.');
    }

    setLoading(false);
  };

  const handleLogout = async () => {
    try {
      removeAuthToken();
      router.push('/');
    } catch (_error) {
      console.error('Logout error:', error);
    }
  };

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-orange-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white/80 backdrop-blur-lg shadow-xl border-r border-orange-100 fixed h-full overflow-y-auto">
        <div className="p-6">
          <Link href="/dashboard" className="flex items-center group">
            <div className="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center mr-3 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105">
              <span className="text-white font-bold text-xl">C</span>
            </div>
            <span className="font-bold text-xl text-orange-600">CodeByte</span>
          </Link>
        </div>

        <nav className="mt-8">
          <div className="px-6 py-2">
            <Button
              variant="ghost"
              className="w-full justify-start rounded-xl hover:bg-orange-50 hover:text-orange-600 transition-all duration-300"
              asChild
            >
              <Link href="/dashboard">
                <Home className="mr-3 h-4 w-4" />
                Home
              </Link>
            </Button>
          </div>

          <div className="px-6 py-1">
            <Button
              variant="ghost"
              className="w-full justify-start rounded-xl hover:bg-orange-50 hover:text-orange-600 transition-all duration-300"
              asChild
            >
              <Link href="/chat">
                <MessageCircle className="mr-3 h-4 w-4" />
                Chat
              </Link>
            </Button>
          </div>

          <div className="px-6 py-1">
            <Button
              variant={activeTab === 'Settings' ? 'secondary' : 'ghost'}
              className={`w-full justify-start rounded-xl transition-all duration-300 ${
                activeTab === 'Settings'
                  ? 'bg-orange-100 text-orange-700 shadow-lg'
                  : 'hover:bg-orange-50 hover:text-orange-600'
              }`}
              onClick={() => setActiveTab('Settings')}
            >
              <SettingsIcon className="mr-3 h-4 w-4" />
              Settings
            </Button>
          </div>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 w-64 p-6 border-t border-orange-100 bg-white/80 backdrop-blur-lg">
          <div className="flex items-center">
            <Avatar className="mr-3">
              <AvatarFallback className="bg-orange-500 text-white shadow-lg">
                {userProfile.user.username?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-gray-900" title={userProfile.user.username}>{userProfile.user.username}</p>
              <p className="text-xs text-gray-600 truncate" title={userProfile.user.email}>{userProfile.user.email}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              title="Logout"
              className="hover:bg-orange-50 hover:text-orange-600 transition-colors rounded-lg"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-8 ml-64">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-4xl font-bold text-orange-600">Settings</h1>
            <p className="text-gray-600 mt-2">Manage your account and preferences</p>
          </div>
        </div>

        <div className="space-y-8">
          {message && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl">
              {message}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          {/* Profile Information */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                  <User className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <CardTitle className="text-xl text-gray-900">Profile Information</CardTitle>
                  <CardDescription>Update your personal information and account settings</CardDescription>
                </div>
              </div>
            </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Username</Label>
                    <Input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="mt-1"
                      placeholder="Enter your username"
                    />
                </div>
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="mt-1"
                  />
                </div>
              </div>
              <Button type="submit" disabled={loading} className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                {loading ? 'Updating...' : 'Update Profile'}
              </Button>
            </form>
          </CardContent>
        </Card>

          {/* Change Password */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Shield className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-xl text-gray-900">Change Password</CardTitle>
                  <CardDescription>Update your account password</CardDescription>
                </div>
              </div>
            </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className="mt-1"
                  />
                </div>
              </div>
              <Button type="submit" disabled={loading} className="border-orange-200 text-orange-600 hover:bg-orange-50 rounded-xl transition-all duration-300">
                {loading ? 'Changing...' : 'Change Password'}
              </Button>
            </form>
          </CardContent>
        </Card>

          {/* Repository Management */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                    <Github className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-gray-900">Repository Management</CardTitle>
                    <CardDescription>Manage your connected repositories</CardDescription>
                  </div>
                </div>
              <Dialog open={isAddRepoDialogOpen} onOpenChange={setIsAddRepoDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Repository
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Repository</DialogTitle>
                    <DialogDescription>
                      Add a new repository to your account for processing and learning.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="repoName">Repository Name</Label>
                      <Input
                        id="repoName"
                        value={newRepoName}
                        onChange={(e) => setNewRepoName(e.target.value)}
                        placeholder="my-awesome-project"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="repoUrl">Repository URL</Label>
                      <Input
                        id="repoUrl"
                        value={newRepoUrl}
                        onChange={(e) => setNewRepoUrl(e.target.value)}
                        placeholder="https://github.com/username/repo"
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddRepoDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddRepository} disabled={loading}>
                      {loading ? 'Adding...' : 'Add Repository'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {userProfile.repositories.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No repositories added yet. Click &quot;Add Repository&quot; to get started.</p>
            ) : (
              <div className="space-y-4">
                {userProfile.repositories.map((repo) => (
                  <div key={repo.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium break-words" title={repo.name}>{repo.name}</h3>
                        <Badge variant={repo.is_processed ? "default" : "secondary"}>
                          {repo.is_processed ? "Processed" : "Pending"}
                        </Badge>
                      </div>
                        <p className="text-sm text-gray-600 mt-1 break-all" title={repo.url}>{repo.url}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Added {new Date(repo.added_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {!repo.is_processed && (
                        <Button
                          size="sm"
                          onClick={() => handleProcessRepository(repo.url)}
                          disabled={loading}
                        >
                          Process
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRemoveRepository(repo.id)}
                        disabled={loading}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

          {/* Integrations */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <LinkIcon className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-xl text-gray-900">Integrations</CardTitle>
                  <CardDescription>Connect and manage your third-party integrations</CardDescription>
                </div>
              </div>
            </CardHeader>
          <CardContent className="space-y-6">
            {/* Linear Integration */}
            <div className="p-6 border border-gray-200 rounded-xl bg-gray-50/50">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">Linear</h3>
                  <Badge variant={userProfile.integrations.linear ? "default" : "secondary"}>
                    {userProfile.integrations.linear ? "Connected" : "Not Connected"}
                  </Badge>
                </div>
              </div>
              
              {!userProfile.integrations.linear && (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="linearApiKey">Linear API Key</Label>
                    <Input
                      id="linearApiKey"
                      type="password"
                      value={linearApiKey}
                      onChange={(e) => setLinearApiKey(e.target.value)}
                      placeholder="Enter your Linear API key"
                      className="mt-1"
                    />
                  </div>
                  <Button onClick={handleSetLinearApiKey} disabled={loading} size="sm">
                    {loading ? 'Saving...' : 'Save API Key'}
                  </Button>
                </div>
              )}
              
              {userProfile.integrations.linear && (
                <Button onClick={handleProcessLinearTickets} disabled={loading} size="sm">
                  {loading ? 'Processing...' : 'Process Linear Tickets'}
                </Button>
              )}
            </div>

            {/* Slack Integration */}
            <div className="p-6 border border-gray-200 rounded-xl bg-gray-50/50">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">Slack</h3>
                  <Badge variant={userProfile.integrations.slack ? "default" : "secondary"}>
                    {userProfile.integrations.slack ? "Connected" : "Not Connected"}
                  </Badge>
                </div>
              </div>
              
              {!userProfile.integrations.slack && (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="slackApiKey">Slack API Key</Label>
                    <Input
                      id="slackApiKey"
                      type="password"
                      value={slackApiKey}
                      onChange={(e) => setSlackApiKey(e.target.value)}
                      placeholder="Enter your Slack API key"
                      className="mt-1"
                    />
                  </div>
                  <Button onClick={handleSetSlackApiKey} disabled={loading} size="sm">
                    {loading ? 'Saving...' : 'Save API Key'}
                  </Button>
                </div>
              )}
              
              {userProfile.integrations.slack && (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="slackChannelId">Channel ID</Label>
                    <Input
                      id="slackChannelId"
                      value={slackChannelId}
                      onChange={(e) => setSlackChannelId(e.target.value)}
                      placeholder="Enter Slack channel ID (e.g., C1234567890)"
                      className="mt-1"
                    />
                  </div>
                  <Button onClick={handleProcessSlackMessages} disabled={loading} size="sm">
                    {loading ? 'Processing...' : 'Process Slack Messages'}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>


          {/* Account Statistics */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <CardTitle className="text-xl text-gray-900">Account Statistics</CardTitle>
                  <CardDescription>Overview of your account activity</CardDescription>
                </div>
              </div>
            </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center p-6 bg-orange-50 rounded-xl border border-orange-100">
                <div className="text-3xl font-bold text-orange-500">{userProfile.repositories.length}</div>
                <div className="text-sm text-gray-600 mt-1">Repositories</div>
              </div>
              <div className="text-center p-6 bg-blue-50 rounded-xl border border-blue-100">
                <div className="text-3xl font-bold text-blue-500">
                  {Object.values(userProfile.integrations).filter(Boolean).length}
                </div>
                <div className="text-sm text-gray-600 mt-1">Integrations</div>
              </div>
              <div className="text-center p-6 bg-purple-50 rounded-xl border border-purple-100">
                <div className="text-3xl font-bold text-purple-500">0</div>
                <div className="text-sm text-gray-600 mt-1">Lessons Completed</div>
              </div>
              <div className="text-center p-6 bg-green-50 rounded-xl border border-green-100">
                <div className="text-3xl font-bold text-green-500">0</div>
                <div className="text-sm text-gray-600 mt-1">Hours Learned</div>
              </div>
            </div>
          </CardContent>
        </Card>

          {/* Danger Zone */}
          <Card className="bg-red-50/80 backdrop-blur-sm border border-red-200 shadow-xl">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                  <LogOut className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <CardTitle className="text-xl text-red-900">Danger Zone</CardTitle>
                  <CardDescription>
                    Once you logout, you&apos;ll need to sign in again to access your account.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}