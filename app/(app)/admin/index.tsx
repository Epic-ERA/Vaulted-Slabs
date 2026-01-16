// app/(app)/admin/index.tsx
import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  TextInput,
  ImageBackground,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { getLatestSyncLogs } from '@/services/admin';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';
import { RefreshCw, Database as DatabaseIcon, Users } from 'lucide-react-native';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';

const BACKGROUND_IMAGE = require('@/assets/images/vaultedslabs-background-image.jpg');

type SyncLog = Database['public']['Tables']['sync_logs']['Row'];

interface UserData {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  app_metadata: any;
}

type SyncMode = 'starter' | 'full' | null;

export default function AdminScreen() {
  const { isAdmin } = useAuth();
  const params = useLocalSearchParams();
  const router = useRouter();
  const activeTab = (params.tab as string) || 'sync';

  const [syncing, setSyncing] = useState(false);
  const [syncMode, setSyncMode] = useState<SyncMode>(null);

  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);

  const [users, setUsers] = useState<UserData[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const showMsg = (title: string, message: string) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      // eslint-disable-next-line no-alert
      window.alert(`${title}\n\n${message}`);
      return;
    }
    Alert.alert(title, message);
  };

  function setTab(tab: 'sync' | 'users' | 'pricing') {
    router.replace({
      pathname: '/(app)/admin',
      params: { tab },
    });
  }

  useEffect(() => {
    if (isAdmin && activeTab === 'sync') {
      loadLogs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, activeTab]);

  useEffect(() => {
    if (isAdmin && activeTab === 'users') {
      loadUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, activeTab]);

  async function loadLogs() {
    setLoading(true);
    try {
      const latestLogs = await getLatestSyncLogs(10);
      setLogs(latestLogs);
    } catch (error: any) {
      console.error('Error loading logs:', error);
    } finally {
      setLoading(false);
    }
  }

  async function getAccessTokenOrThrow() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;

    const token = data?.session?.access_token;
    if (!token) {
      throw new Error('Not authenticated. Please log in again and retry.');
    }
    return token;
  }

  async function loadUsers() {
    setUsersLoading(true);
    try {
      const token = await getAccessTokenOrThrow();

      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: { action: 'list' },
        headers: { Authorization: `Bearer ${token}` },
      });

      if (error) {
        throw new Error((error as any)?.message || (error as any)?.context || JSON.stringify(error));
      }

      setUsers((data as any)?.users || []);
    } catch (error: any) {
      console.error('Error loading users:', error);
      showMsg('Error', error?.message || 'Failed to load users');
    } finally {
      setUsersLoading(false);
    }
  }

  async function handleSync(fullSync = false) {
    if (syncing) return;

    setSyncing(true);
    setSyncMode(fullSync ? 'full' : 'starter');

    try {
      const token = await getAccessTokenOrThrow();

      console.log('[SYNC] Starting pokemon-sync...', { fullSync });
      const startedAt = Date.now();

      const { data, error } = await supabase.functions.invoke('pokemon-sync', {
        body: { fullSync },
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log('[SYNC] Response', { data, error, ms: Date.now() - startedAt });

      if (error) {
        throw new Error((error as any)?.message || (error as any)?.context || JSON.stringify(error));
      }

      const setsSynced = (data as any)?.sets_synced ?? 0;
      const cardsSynced = (data as any)?.cards_synced ?? 0;

      showMsg('Sync Complete', `Synced ${setsSynced} sets and ${cardsSynced} cards`);
      await loadLogs();
      router.push('/(app)/sets');
    } catch (error: any) {
      console.error('Sync error:', error);
      showMsg(
        'Sync Failed',
        error?.message || 'An error occurred. Check Supabase → Edge Functions logs for pokemon-sync.'
      );
    } finally {
      setSyncing(false);
      setSyncMode(null);
    }
  }

  async function handleSetRole(userId: string, role: 'admin' | 'user') {
    try {
      const token = await getAccessTokenOrThrow();

      const { error } = await supabase.functions.invoke('admin-users', {
        body: { action: 'setRole', userId, role },
        headers: { Authorization: `Bearer ${token}` },
      });

      if (error) {
        throw new Error((error as any)?.message || (error as any)?.context || JSON.stringify(error));
      }

      showMsg('Success', `User role updated to ${role}`);
      await loadUsers();
    } catch (error: any) {
      console.error('Error setting role:', error);
      showMsg('Error', error?.message || 'Failed to update user role');
    }
  }

  if (!isAdmin) {
    return <Redirect href="/(app)/sets" />;
  }

  const filteredUsers = useMemo(() => {
    return users.filter((user) =>
      (user.email || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [users, searchQuery]);

  return (
    <View style={styles.root}>
      <ImageBackground source={BACKGROUND_IMAGE} style={styles.bg} resizeMode="cover">
        <View style={styles.bgOverlay} />

        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Admin Panel</Text>
            <Text style={styles.subtitle}>Manage data and settings</Text>
          </View>

          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'sync' && styles.tabButtonActive]}
              onPress={() => setTab('sync')}
              activeOpacity={0.85}
            >
              <DatabaseIcon size={16} color={activeTab === 'sync' ? '#0b0b0b' : '#fff'} />
              <Text style={[styles.tabText, activeTab === 'sync' && styles.tabTextActive]}>Sync</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'users' && styles.tabButtonActive]}
              onPress={() => setTab('users')}
              activeOpacity={0.85}
            >
              <Users size={16} color={activeTab === 'users' ? '#0b0b0b' : '#fff'} />
              <Text style={[styles.tabText, activeTab === 'users' && styles.tabTextActive]}>
                Users
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'pricing' && styles.tabButtonActive]}
              onPress={() => setTab('pricing')}
              activeOpacity={0.85}
            >
              <Text style={[styles.tabText, activeTab === 'pricing' && styles.tabTextActive]}>
                Pricing
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} contentContainerStyle={styles.contentPad}>
            {activeTab === 'sync' && (
              <>
                <View style={styles.card}>
                  <View style={styles.cardIconCentered}>
                    <DatabaseIcon size={32} color="#DC0A2D" />
                  </View>

                  <Text style={[styles.cardTitle, styles.centerText]}>Pokémon TCG Sync</Text>

                  <Text style={[styles.cardDescription, styles.centerText]}>
                    You must run Sync Starter Sets once to populate the database.
                  </Text>

                  <View style={styles.buttonGroup}>
                    <TouchableOpacity
                      style={[styles.button, syncing && styles.buttonDisabled]}
                      onPress={() => handleSync(false)}
                      disabled={syncing}
                      activeOpacity={0.85}
                    >
                      {syncing && syncMode === 'starter' ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <>
                          <RefreshCw size={18} color="#fff" />
                          <Text style={styles.buttonText}>Sync Starter Sets</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.button,
                        styles.buttonSecondary,
                        syncing && styles.buttonDisabled,
                      ]}
                      onPress={() => handleSync(true)}
                      disabled={syncing}
                      activeOpacity={0.85}
                    >
                      {syncing && syncMode === 'full' ? (
                        <ActivityIndicator color="#DC0A2D" />
                      ) : (
                        <>
                          <RefreshCw size={18} color="#DC0A2D" />
                          <Text style={[styles.buttonText, styles.buttonTextSecondary]}>
                            Full Sync (All Sets)
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.card}>
                  <Text style={[styles.cardTitle, styles.centerText]}>Recent Sync Logs</Text>

                  {loading ? (
                    <ActivityIndicator color="#DC0A2D" style={styles.logsLoader} />
                  ) : logs.length === 0 ? (
                    <Text style={[styles.emptyText, styles.centerText]}>No sync logs yet</Text>
                  ) : (
                    logs.map((log) => {
                      const status = (log as any).status as string;
                      const jobName = (log as any).job_name as string;
                      const startedAt = (log as any).started_at as string;
                      const details = (log as any).details;

                      return (
                        <View key={(log as any).id} style={styles.logItem}>
                          <View style={styles.logHeader}>
                            <Text style={styles.logJob}>{jobName}</Text>
                            <View
                              style={[
                                styles.statusBadge,
                                status === 'success' && styles.statusSuccess,
                                status === 'failed' && styles.statusFailed,
                                status === 'running' && styles.statusRunning,
                              ]}
                            >
                              <Text style={styles.statusText}>{status}</Text>
                            </View>
                          </View>

                          <Text style={styles.logDate}>
                            {startedAt ? new Date(startedAt).toLocaleString() : ''}
                          </Text>

                          {details && (
                            <Text style={styles.logDetails}>{JSON.stringify(details, null, 2)}</Text>
                          )}
                        </View>
                      );
                    })
                  )}

                  <TouchableOpacity
                    style={[styles.refreshLogsBtn, loading && styles.buttonDisabled]}
                    onPress={loadLogs}
                    disabled={loading}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.refreshLogsText}>{loading ? 'Loading…' : 'Refresh Logs'}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {activeTab === 'pricing' && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Monthly Card Pricing</Text>
                <Text style={styles.cardDescription}>
                  Manage average card prices for collection value analytics
                </Text>
                <Text style={styles.comingSoonText}>
                  Coming soon: Search cards and add pricing data
                </Text>
              </View>
            )}

            {activeTab === 'users' && (
              <View style={styles.card}>
                <Users size={32} color="#DC0A2D" style={styles.cardIcon} />
                <Text style={styles.cardTitle}>User Management</Text>
                <Text style={styles.cardDescription}>View all users and manage admin roles</Text>

                <View style={styles.searchBar}>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search by email..."
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                </View>

                {usersLoading ? (
                  <ActivityIndicator color="#DC0A2D" style={styles.logsLoader} />
                ) : filteredUsers.length === 0 ? (
                  <Text style={styles.emptyText}>No users found</Text>
                ) : (
                  filteredUsers.map((user) => {
                    const isUserAdmin = user.app_metadata?.role === 'admin';

                    return (
                      <View key={user.id} style={styles.userItem}>
                        <View style={styles.userInfo}>
                          <View style={styles.userEmailRow}>
                            <Text style={styles.userEmail}>{user.email}</Text>

                            {isUserAdmin && (
                              <View style={styles.adminBadge}>
                                <Text style={styles.adminBadgeText}>ADMIN</Text>
                              </View>
                            )}
                          </View>

                          <Text style={styles.userDate}>
                            Joined: {new Date(user.created_at).toLocaleDateString()}
                          </Text>

                          {user.last_sign_in_at && (
                            <Text style={styles.userDate}>
                              Last login: {new Date(user.last_sign_in_at).toLocaleDateString()}
                            </Text>
                          )}
                        </View>

                        <View style={styles.userActions}>
                          {isUserAdmin ? (
                            <TouchableOpacity
                              style={[styles.actionButton, styles.demoteButton]}
                              onPress={() => handleSetRole(user.id, 'user')}
                              activeOpacity={0.85}
                            >
                              <Text style={styles.actionButtonText}>Demote</Text>
                            </TouchableOpacity>
                          ) : (
                            <TouchableOpacity
                              style={[styles.actionButton, styles.promoteButton]}
                              onPress={() => handleSetRole(user.id, 'admin')}
                              activeOpacity={0.85}
                            >
                              <Text style={styles.actionButtonText}>Promote</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    );
                  })
                )}

                <TouchableOpacity
                  style={[styles.refreshLogsBtn, usersLoading && styles.buttonDisabled]}
                  onPress={loadUsers}
                  disabled={usersLoading}
                  activeOpacity={0.85}
                >
                  <Text style={styles.refreshLogsText}>
                    {usersLoading ? 'Loading…' : 'Refresh Users'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  bg: { flex: 1, width: '100%', height: '100%' },
  bgOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },

  container: { flex: 1, backgroundColor: 'transparent' },

  header: {
    padding: 20,
    paddingTop: 78,
    paddingBottom: 14,
    backgroundColor: 'rgba(0,0,0,0.0)',
  },
  title: { fontSize: 26, fontWeight: '800', color: '#fff', textAlign: 'center' },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.80)', textAlign: 'center', marginTop: 6 },

  tabRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  tabButtonActive: { backgroundColor: '#DC0A2D', borderColor: '#DC0A2D' },
  tabText: { color: '#fff', fontWeight: '800', fontSize: 12, letterSpacing: 0.3 },
  tabTextActive: { color: '#0b0b0b' },

  content: { flex: 1, paddingHorizontal: 16 },
  contentPad: { paddingTop: 16, paddingBottom: 140 },

  card: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  cardIcon: { marginBottom: 12 },
  cardIconCentered: { alignItems: 'center', marginBottom: 12 },
  centerText: { textAlign: 'center' },
  cardTitle: { fontSize: 18, fontWeight: '600', color: '#fff', marginBottom: 8 },
  cardDescription: { fontSize: 14, color: 'rgba(255,255,255,0.85)', marginBottom: 16 },

  buttonGroup: { gap: 12 },
  button: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: '#DC0A2D',
    borderRadius: 8,
  },
  buttonSecondary: { backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 2, borderColor: '#DC0A2D' },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  buttonTextSecondary: { color: '#DC0A2D' },

  logsLoader: { marginVertical: 20 },
  emptyText: { fontSize: 14, color: 'rgba(255,255,255,0.65)', fontStyle: 'italic' },

  logItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  logJob: { fontSize: 14, fontWeight: '600', color: '#fff' },

  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.15)' },
  statusSuccess: { backgroundColor: 'rgba(76, 175, 80, 0.3)' },
  statusFailed: { backgroundColor: 'rgba(244, 67, 54, 0.3)' },
  statusRunning: { backgroundColor: 'rgba(255, 152, 0, 0.3)' },
  statusText: { fontSize: 12, fontWeight: '600', color: '#fff' },

  logDate: { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginBottom: 4 },
  logDetails: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginTop: 8,
  },

  refreshLogsBtn: {
    marginTop: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  refreshLogsText: { color: '#fff', fontWeight: '800', fontSize: 13, letterSpacing: 0.2 },

  comingSoonText: { fontSize: 14, color: '#ff9500', fontStyle: 'italic' },

  searchBar: { marginBottom: 16 },
  searchInput: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },

  userItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  userInfo: { flex: 1 },
  userEmailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 8 },
  userEmail: { fontSize: 16, fontWeight: '600', color: '#fff' },

  adminBadge: { backgroundColor: 'rgba(220,10,45,0.3)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#DC0A2D' },
  adminBadgeText: { fontSize: 10, fontWeight: '600', color: '#DC0A2D' },

  userDate: { fontSize: 12, color: 'rgba(255,255,255,0.65)' },
  userActions: { marginLeft: 12 },

  actionButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6, borderWidth: 1 },
  promoteButton: { backgroundColor: 'rgba(52, 199, 89, 0.2)', borderColor: '#34c759' },
  demoteButton: { backgroundColor: 'rgba(244, 67, 54, 0.2)', borderColor: '#f44336' },
  actionButtonText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});
