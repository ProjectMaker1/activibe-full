import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { apiRequest, withAuth } from '@shared/apiClient.js';
import CampaignModal from '../components/CampaignModal.jsx';
import CategoriesManager from '../components/CategoriesManager.jsx';
import countryList from 'react-select-country-list';
import 'flag-icons/css/flag-icons.min.css';
import Loader from '../components/Loader.jsx';

const TABS = {
  STATS: 'stats',
  REQUESTS: 'requests',
  USERS: 'users',
  CATEGORIES: 'categories',
};
const countryOptions = countryList().getData();

function getCountryMeta(code) {
  if (!code) return null;
  return countryOptions.find((c) => c.value === code) || null;
}

function AdminPanelPage() {
  const { tokens, isAdmin } = useAuth();

const [activeTab, setActiveTab] = useState(() => {
  if (typeof window === 'undefined') return TABS.REQUESTS;

  const saved = window.localStorage.getItem('adminActiveTab');
  return saved && Object.values(TABS).includes(saved) ? saved : TABS.REQUESTS;
});
const handleTabChange = (tab) => {
  setActiveTab(tab);
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('adminActiveTab', tab);
  }
};

  const [requestFilter, setRequestFilter] = useState('PENDING');

  const [campaigns, setCampaigns] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCampaign, setSelectedCampaign] = useState(null);

  // user actions (block / unblock / delete)
  const [userAction, setUserAction] = useState(null);
  const [userActionLoading, setUserActionLoading] = useState(false);
  const [userActionError, setUserActionError] = useState(null);

  // მონაცემების ჩატვირთვა
  useEffect(() => {
    const loadAdminData = async () => {
      if (!tokens.accessToken) return;
      setLoading(true);
      setError(null);
      try {
        const [campaignRes, usersRes] = await Promise.all([
          apiRequest('/admin/campaigns', withAuth(tokens.accessToken)),
          apiRequest('/admin/users', withAuth(tokens.accessToken)),
        ]);

        setCampaigns(campaignRes.campaigns || []);
        setUsers(usersRes.users || []);
      } catch (err) {
        console.error(err);
        setError(err.message || 'Failed to load admin data');
      } finally {
        setLoading(false);
      }
    };

    loadAdminData();
  }, [tokens.accessToken]);

  // approve / reject
  const handleStatusChange = async (id, newStatus) => {
    if (!tokens.accessToken) return;

    try {
      const endpoint =
        newStatus === 'APPROVED'
          ? `/admin/campaigns/${id}/approve`
          : `/admin/campaigns/${id}/reject`;

      await apiRequest(endpoint, withAuth(tokens.accessToken, { method: 'POST' }));

      setCampaigns((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c))
      );
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to update campaign');
    }
  };
  const handleDeleteCampaign = async (id) => {
    if (!tokens.accessToken) return;

    try {
      await apiRequest(
        `/admin/campaigns/${id}`,
        withAuth(tokens.accessToken, { method: 'DELETE' })
      );

      // წავშალოთ წაშლილი კამპანია სტეიტიდან
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
      // დავხუროთ მოდალი
      setSelectedCampaign(null);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to delete campaign');
    }
  };

  // --- USERS Actions helpers ---

const openUserAction = (type, user) => {
  setUserAction({
    type, // 'block' | 'unblock' | 'delete'
    user,
  });
  setUserActionError(null);
};


  const closeUserAction = () => {
    setUserAction(null);
    setUserActionError(null);
  };

  const reloadUsers = async () => {
    try {
      const usersRes = await apiRequest('/admin/users', withAuth(tokens.accessToken));
      setUsers(usersRes.users || []);
    } catch (err) {
      console.error(err);
    }
  };

const confirmUserAction = async () => {
  if (!userAction || !tokens.accessToken) return;

  const { type, user } = userAction;

  try {
    setUserActionLoading(true);
    setUserActionError(null);

    if (type === 'block') {
      await apiRequest(
        `/admin/users/${user.id}/block`,
        withAuth(tokens.accessToken, {
          method: 'POST',
        })
      );
    } else if (type === 'unblock') {
      await apiRequest(
        `/admin/users/${user.id}/unblock`,
        withAuth(tokens.accessToken, {
          method: 'POST',
        })
      );
    } else if (type === 'delete') {
      await apiRequest(
        `/admin/users/${user.id}`,
        withAuth(tokens.accessToken, {
          method: 'DELETE',
        })
      );
    }

    await reloadUsers();
    closeUserAction();
  } catch (err) {
    console.error(err);
    setUserActionError(err.message || 'Action failed');
  } finally {
    setUserActionLoading(false);
  }
};


  // აქ ვფილტრავთ აქტიური სტეტუსით (pending / approved / rejected)
  const filteredCampaigns = campaigns.filter((c) => c.status === requestFilter);

  // Users ტაბში ადმინებს არ ვაჩვენებთ
  const nonAdminUsers = users.filter((u) => u.role !== 'ADMIN');

  return (
    <div className="page">
      <header className="page-header">
        <h1>Admin panel</h1>
        <p>Review campaigns submitted by the community.</p>
      </header>

      <div className="admin-layout">
        {/* Sidebar */}
        <aside className="admin-sidebar">
          <h2 className="admin-sidebar-title">ActiVibe Admin</h2>
          <div className="admin-menu">
          <button
            type="button"
            className={`admin-menu-item ${activeTab === TABS.STATS ? 'active' : ''}`}
            onClick={() => handleTabChange(TABS.STATS)}
          >
            Statistics
          </button>

        <button
          type="button"
          className={`admin-menu-item ${
            activeTab === TABS.REQUESTS ? 'active' : ''
          }`}
          onClick={() => handleTabChange(TABS.REQUESTS)}
        >
          Incoming requests
        </button>

        <button
          type="button"
          className={`admin-menu-item ${activeTab === TABS.USERS ? 'active' : ''}`}
          onClick={() => handleTabChange(TABS.USERS)}
        >
          Users
        </button>

        <button
          type="button"
          className={`admin-menu-item ${
            activeTab === TABS.CATEGORIES ? 'active' : ''
          }`}
          onClick={() => handleTabChange(TABS.CATEGORIES)}
        >
          Categories
        </button>


          </div>
        </aside>

        {/* Main content */}
        <section className="admin-main">
        {loading && <Loader />}
          {error && <p className="status-error">{error}</p>}

          {!loading && !error && activeTab === TABS.STATS && (
            <StatsPlaceholder campaigns={campaigns} users={users} />
          )}

          {!loading && !error && activeTab === TABS.REQUESTS && (
            <RequestsTable
              campaigns={filteredCampaigns}
              allCampaigns={campaigns}
              filter={requestFilter}
              onFilterChange={setRequestFilter}
              onApprove={(id) => handleStatusChange(id, 'APPROVED')}
              onReject={(id) => handleStatusChange(id, 'REJECTED')}
              onRowClick={setSelectedCampaign}
            />
          )}
          {!loading && !error && activeTab === TABS.CATEGORIES && (
          <CategoriesManager />
        )}


          {!loading && !error && activeTab === TABS.USERS && (
            <UsersTable users={nonAdminUsers} onUserAction={openUserAction} />
          )}
        </section>
      </div>

      {/* Campaign details modal */}
      <CampaignModal
      campaign={selectedCampaign}
      isOpen={!!selectedCampaign}
      onClose={() => setSelectedCampaign(null)}
      isAdmin={isAdmin}
      onDelete={handleDeleteCampaign}
    />


      {/* User block/delete modal */}
      {userAction && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal">
            <h3>
              {userAction.type === 'block' && `Block user "${userAction.user.username}"`}
              {userAction.type === 'delete' &&
                `Delete user "${userAction.user.username}"`}
              {userAction.type === 'unblock' &&
                `Unblock user "${userAction.user.username}"`}
            </h3>

            {userAction.type === 'block' && (
              <p>This user will be blocked and won't be able to log in.</p>
            )}

            {userAction.type === 'delete' && (
              <p>
                User account will be deleted. Existing campaigns will stay on the
                platform.
              </p>
            )}

            {userAction.type === 'unblock' && (
              <p>User will be able to login again with this email/username.</p>
            )}

            {userActionError && (
              <p className="status-error" style={{ marginTop: 8 }}>
                {userActionError}
              </p>
            )}

            <div className="modal-actions" style={{ marginTop: 16 }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={closeUserAction}
                disabled={userActionLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className={
                  userAction.type === 'delete' ? 'btn-small-danger' : 'btn-primary'
                }
                onClick={confirmUserAction}
                disabled={userActionLoading}
                style={{ marginLeft: 8 }}
              >
                {userActionLoading ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPanelPage;

/* ---------- Tables + Filter ---------- */

function RequestsTable({
  campaigns,
  allCampaigns,
  filter,
  onFilterChange,
  onApprove,
  onReject,
  onRowClick,
}) {
  return (
    <>
      {/* ფილტრის ღილაკები – ყოველთვის Requests ცხრილთან ერთად */}
      <div className="request-filter-bar">
        <button
          type="button"
          className={`request-filter-btn pending ${
            filter === 'PENDING' ? 'active' : ''
          }`}
          onClick={() => onFilterChange('PENDING')}
        >
          Pending
        </button>
        <button
          type="button"
          className={`request-filter-btn approved ${
            filter === 'APPROVED' ? 'active' : ''
          }`}
          onClick={() => onFilterChange('APPROVED')}
        >
          Approved
        </button>
        <button
          type="button"
          className={`request-filter-btn rejected ${
            filter === 'REJECTED' ? 'active' : ''
          }`}
          onClick={() => onFilterChange('REJECTED')}
        >
          Rejected
        </button>
      </div>

      {allCampaigns.length === 0 && <p>No campaigns yet.</p>}

      {allCampaigns.length > 0 && campaigns.length === 0 && (
        <p>No campaigns in this state right now.</p>
      )}

      {campaigns.length > 0 && (
        <div className="admin-table">
          <div className="admin-table-header">
            <span>Campaign</span>
            <span>User</span>
            <span>Date</span>
            <span>Status / Actions</span>
          </div>
          {campaigns.map((c) => (
            <div
              key={c.id}
              className="admin-table-row"
              onClick={() => onRowClick(c)}
              style={{ cursor: 'pointer' }}
            >
              <span title={c.title}>{c.title}</span>
              <span>{c.createdBy?.email || '—'}</span>
              <span>{new Date(c.createdAt).toLocaleDateString()}</span>
              <span>
                {c.status === 'PENDING' ? (
                  <div className="admin-actions">
                    <button
                      type="button"
                      className="btn-small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onApprove(c.id);
                      }}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="btn-small-danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        onReject(c.id);
                      }}
                    >
                      Reject
                    </button>
                  </div>
                ) : (
                  <span
                    className={
                      c.status === 'APPROVED'
                        ? 'status-pill status-approved'
                        : 'status-pill status-rejected'
                    }
                  >
                    {c.status === 'APPROVED' ? 'Approved' : 'Rejected'}
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function UsersTable({ users, onUserAction }) {
  if (!users.length) {
    return <p>No users yet.</p>;
  }

  return (
    <div className="admin-table admin-table-users">
      <div className="admin-table-header admin-table-users-header">
        <span>Username</span>
        <span>Email</span>
        <span>Country</span>
        <span>Registered</span>
        <span>Campaign stats</span>
        <span>Actions</span>
      </div>

      {users.map((u) => {
        const countryMeta = getCountryMeta(u.country);

        return (
          <div
            key={u.id}
            className="admin-table-row admin-table-users-row"
          >
            <span>{u.username || '—'}</span>
            <span>{u.email}</span>

            <span>
              {countryMeta ? (
                <span className="admin-country">
                  <span className={`fi fi-${countryMeta.value.toLowerCase()}`} />
                  <span>{countryMeta.label}</span>
                </span>
              ) : (
                '—'
              )}
            </span>

            <span>{new Date(u.createdAt).toLocaleDateString()}</span>

            <span>
              Total: {u.totalCampaigns} · Approved: {u.approvedCampaigns} · Rejected:{' '}
              {u.rejectedCampaigns}
            </span>

            <span className="admin-table-users-actions">
              {!u.isBlocked ? (
                <>
                  <button
                    type="button"
                    className="btn-small"
                    onClick={() => onUserAction && onUserAction('block', u)}
                  >
                    Block
                  </button>
                  <button
                    type="button"
                    className="btn-small-danger"
                    onClick={() => onUserAction && onUserAction('delete', u)}
                  >
                    Delete
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn-small"
                    onClick={() => onUserAction && onUserAction('unblock', u)}
                  >
                    Unblock
                  </button>
                  <button
                    type="button"
                    className="btn-small-danger"
                    onClick={() => onUserAction && onUserAction('delete', u)}
                  >
                    Delete
                  </button>
                </>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}




function StatsPlaceholder({ campaigns, users }) {
  const totalUsers = users.length;
  const blockedUsers = users.filter((u) => u.isBlocked).length;
  const activeUsers = totalUsers - blockedUsers;

  const totalCampaigns = campaigns.length;
  const pending = campaigns.filter((c) => c.status === 'PENDING').length;
  const approved = campaigns.filter((c) => c.status === 'APPROVED').length;
  const rejected = campaigns.filter((c) => c.status === 'REJECTED').length;

  // ბოლო 30 დღე
  const now = new Date();
  const last30 = new Date(now);
  last30.setDate(now.getDate() - 30);

  const newUsers30 = users.filter(
    (u) => u.createdAt && new Date(u.createdAt) >= last30
  ).length;

  const newCampaigns30 = campaigns.filter(
    (c) => c.createdAt && new Date(c.createdAt) >= last30
  ).length;

  // ბოლო 6 თვის კამპანიები – პატარა bar chart
  const monthBuckets = [];
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleDateString(undefined, { month: 'short' }); // Jan, Feb ...
    const count = campaigns.filter((c) => {
      if (!c.createdAt) return false;
      const cd = new Date(c.createdAt);
      return cd.getFullYear() === d.getFullYear() && cd.getMonth() === d.getMonth();
    }).length;

    monthBuckets.push({ label, count });
  }
  const maxMonthCount = Math.max(...monthBuckets.map((m) => m.count), 1);

  // Status breakdown – პროცენტებში
  const statusTotal = pending + approved + rejected || 1;
  const pendingPct = Math.round((pending / statusTotal) * 100);
  const approvedPct = Math.round((approved / statusTotal) * 100);
  const rejectedPct = Math.round((rejected / statusTotal) * 100);

  // ტოპ ქვეყნები კამპანიების მიხედვით
  const countryMap = {};
  campaigns.forEach((c) => {
    const code = c.country || c.createdBy?.country;
    if (!code) return;
    countryMap[code] = (countryMap[code] || 0) + 1;
  });

  const topCountriesRaw = Object.entries(countryMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const topCountries = topCountriesRaw.map(([code, count]) => {
    const meta = getCountryMeta(code);
    return {
      code,
      label: meta?.label || code,
      count,
    };
  });

  return (
    <div className="stats-layout">
      {/* ზემოთა 3 ქარდი – ქუიქ სტატები */}
      <div className="admin-stats-grid">
        <div className="stats-card">
          <h2 className="stats-card-title">Users</h2>
          <p className="stats-main-number">{totalUsers}</p>
          <div className="stats-pill-row">
            <span className="stats-pill stats-pill-green">Active · {activeUsers}</span>
            <span className="stats-pill stats-pill-red">Blocked · {blockedUsers}</span>
          </div>
        </div>

        <div className="stats-card">
          <h2 className="stats-card-title">Campaigns</h2>
          <p className="stats-main-number">{totalCampaigns}</p>
          <div className="stats-pill-row">
            <span className="stats-pill stats-pill-yellow">Pending · {pending}</span>
            <span className="stats-pill stats-pill-green">Approved · {approved}</span>
            <span className="stats-pill stats-pill-red">Rejected · {rejected}</span>
          </div>
        </div>

        <div className="stats-card">
          <h2 className="stats-card-title">Last 30 days</h2>
          <div className="stats-30days-grid">
            <div>
              <p className="stats-small-label">New users</p>
              <p className="stats-30days-number">{newUsers30}</p>
            </div>
            <div>
              <p className="stats-small-label">New campaigns</p>
              <p className="stats-30days-number">{newCampaigns30}</p>
            </div>
          </div>
          <p className="stats-muted-text">Compared to previous activity window.</p>
        </div>
      </div>

      {/* ქვედა ნაწილი – ბარ ჩარტი + დეტალური სტატუსები / ქვეყნები */}
      <div className="stats-lower-grid">
        {/* Campaigns over time */}
        <div className="stats-card">
          <div className="stats-card-header">
            <h3>Campaigns over time</h3>
            <span className="stats-muted">Last 6 months</span>
          </div>

          <div className="stats-bar-chart">
            {monthBuckets.map((m) => {
              const heightPct = (m.count / maxMonthCount) * 100;
              return (
                <div key={m.label} className="stats-bar-col">
                  <div
                    className="stats-bar"
                    style={{ height: `${heightPct || 4}%` }} // ცოტა მაინც ჩანდეს
                  >
                    {m.count > 0 && (
                      <span className="stats-bar-value">{m.count}</span>
                    )}
                  </div>
                  <span className="stats-bar-label">{m.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Status breakdown + countries */}
        <div className="stats-card">
          <div className="stats-card-header">
            <h3>Campaign status</h3>
            <span className="stats-muted">{statusTotal} total</span>
          </div>

          <div className="stats-status-rows">
            <div className="stats-status-row">
              <span>Pending</span>
              <div className="stats-status-bar-wrapper">
                <div
                  className="stats-status-bar pending"
                  style={{ width: `${pendingPct}%` }}
                />
              </div>
              <span className="stats-status-number">
                {pending} · {pendingPct}%
              </span>
            </div>

            <div className="stats-status-row">
              <span>Approved</span>
              <div className="stats-status-bar-wrapper">
                <div
                  className="stats-status-bar approved"
                  style={{ width: `${approvedPct}%` }}
                />
              </div>
              <span className="stats-status-number">
                {approved} · {approvedPct}%
              </span>
            </div>

            <div className="stats-status-row">
              <span>Rejected</span>
              <div className="stats-status-bar-wrapper">
                <div
                  className="stats-status-bar rejected"
                  style={{ width: `${rejectedPct}%` }}
                />
              </div>
              <span className="stats-status-number">
                {rejected} · {rejectedPct}%
              </span>
            </div>
          </div>

          {topCountries.length > 0 && (
            <>
              <div className="stats-card-divider" />
              <div className="stats-card-header">
                <h3>Top countries</h3>
                <span className="stats-muted">By campaigns</span>
              </div>

              <ul className="stats-country-list">
                {topCountries.map((c) => (
                  <li key={c.code} className="stats-country-row">
                    <div className="stats-country-left">
                      <span className={`fi fi-${c.code.toLowerCase()}`} />
                      <span>{c.label}</span>
                    </div>
                    <div className="stats-country-right">
                      <span className="stats-country-count">{c.count}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
