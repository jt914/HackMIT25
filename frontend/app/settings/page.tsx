'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getCurrentUserEmail, removeAuthToken, isAuthenticated } from "@/lib/backend-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

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
  
  // Integration states
  const [linearApiKey, setLinearApiKey] = useState('');
  const [slackApiKey, setSlackApiKey] = useState('');
  const [slackChannelId, setSlackChannelId] = useState('');
  
  // Repository states
  const [newRepoName, setNewRepoName] = useState('');
  const [newRepoUrl, setNewRepoUrl] = useState('');
  const [isAddRepoDialogOpen, setIsAddRepoDialogOpen] = useState(false);
  
  const router = useRouter();

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
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
      
      const response = await fetch(`http://localhost:8000/user-profile/${userEmail}`);
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
    } catch (error) {
      console.error('Error fetching user profile:', error);
      router.push('/login');
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    // Validate username
    const usernameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!usernameRegex.test(name)) {
      setError('Username can only contain letters, numbers, underscores, and hyphens');
      setLoading(false);
      return;
    }

    if (name.length < 3) {
      setError('Username must be at least 3 characters long');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/user/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: name, email }),
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
    } catch (error) {
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
    } catch (error) {
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
      const response = await fetch('http://localhost:8000/set-linear-api-key', {
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
    } catch (error) {
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
      const response = await fetch('http://localhost:8000/process-linear-tickets', {
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
    } catch (error) {
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
      const response = await fetch('http://localhost:8000/set-slack-api-key', {
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
    } catch (error) {
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
      const response = await fetch('http://localhost:8000/process-slack-messages', {
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
    } catch (error) {
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
      const response = await fetch('http://localhost:8000/add-repository', {
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
    } catch (error) {
      setError('Network error. Please try again.');
    }

    setLoading(false);
  };

  const handleRemoveRepository = async (repositoryId: string) => {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch('http://localhost:8000/remove-repository', {
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
    } catch (error) {
      setError('Network error. Please try again.');
    }

    setLoading(false);
  };

  const handleProcessRepository = async (repositoryUrl: string) => {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch('http://localhost:8000/process-repository', {
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
    } catch (error) {
      setError('Network error. Please try again.');
    }

    setLoading(false);
  };

  const handleLogout = async () => {
    try {
      removeAuthToken();
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <Link href="/dashboard" className="mr-4 text-gray-600 hover:text-gray-900">
              ← Back to Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          </div>
          <div className="flex items-center">
            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center mr-3">
              <span className="text-white text-sm font-bold">
                {userProfile.user.username?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <span className="text-gray-700 font-medium">{userProfile.user.username}</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-8 space-y-8">
        {message && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            {message}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Update your personal information and account settings</CardDescription>
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
                    placeholder="Enter your username (no spaces or special characters)"
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
              <Button type="submit" disabled={loading}>
                {loading ? 'Updating...' : 'Update Profile'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>Update your account password</CardDescription>
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
              <Button type="submit" disabled={loading} variant="outline">
                {loading ? 'Changing...' : 'Change Password'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Repository Management */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Repository Management</CardTitle>
                <CardDescription>Manage your connected repositories</CardDescription>
              </div>
              <Dialog open={isAddRepoDialogOpen} onOpenChange={setIsAddRepoDialogOpen}>
                <DialogTrigger asChild>
                  <Button>Add Repository</Button>
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
              <p className="text-gray-500 text-center py-8">No repositories added yet. Click "Add Repository" to get started.</p>
            ) : (
              <div className="space-y-4">
                {userProfile.repositories.map((repo) => (
                  <div key={repo.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{repo.name}</h3>
                        <Badge variant={repo.is_processed ? "default" : "secondary"}>
                          {repo.is_processed ? "Processed" : "Pending"}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{repo.url}</p>
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
        <Card>
          <CardHeader>
            <CardTitle>Integrations</CardTitle>
            <CardDescription>Connect and manage your third-party integrations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Linear Integration */}
            <div className="p-4 border rounded-lg">
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
            <div className="p-4 border rounded-lg">
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
        <Card>
          <CardHeader>
            <CardTitle>Account Statistics</CardTitle>
            <CardDescription>Overview of your account activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-500">{userProfile.repositories.length}</div>
                <div className="text-sm text-gray-600">Repositories</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-500">
                  {userProfile.repositories.filter(r => r.is_processed).length}
                </div>
                <div className="text-sm text-gray-600">Processed</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-500">
                  {Object.values(userProfile.integrations).filter(Boolean).length}
                </div>
                <div className="text-sm text-gray-600">Integrations</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-500">0</div>
                <div className="text-sm text-gray-600">Lessons</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-900">Danger Zone</CardTitle>
            <CardDescription>
              Once you logout, you'll need to sign in again to access your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleLogout} variant="destructive">
              Logout
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}