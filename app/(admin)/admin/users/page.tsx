import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { createAdminClient } from "@/src/lib/supabase/admin";
import { requireAdmin, type Role } from "@/src/lib/auth";
import { updateUserRole } from "./actions";
import AdminUserRowActions from "./AdminUserRowActions";

type SearchParams = Promise<{
  q?: string;
  role?: string;
  status?: string;
  updated?: string;
  error?: string;
}>;

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: Role;
  created_at: string | null;
  updated_at?: string | null;
};

type AdminUser = {
  id: string;
  email: string | null;
  fullName: string | null;
  role: Role;
  createdAt: string | null;
  lastSignInAt: string | null;
  emailConfirmedAt: string | null;
  status: "active" | "blocked";
  bookmarkCount: number;
  savedSearchCount: number;
  readingListCount: number;
};

type AdminUsersData = {
  users: AdminUser[];
  needsProfilesSetup: boolean;
};

const ROLE_OPTIONS: Role[] = ["member", "curator", "admin"];

function formatDate(value: string | null) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function isBlocked(user: User) {
  return Boolean(user.banned_until && new Date(user.banned_until).getTime() > Date.now());
}

function countByUser(rows: { user_id: string }[] | null) {
  const counts = new Map<string, number>();
  for (const row of rows ?? []) {
    counts.set(row.user_id, (counts.get(row.user_id) ?? 0) + 1);
  }
  return counts;
}

function isMissingProfilesTable(error: { code?: string; message?: string }) {
  return (
    error.code === "PGRST205" ||
    Boolean(error.message?.includes("public.profiles"))
  );
}

async function listAllAuthUsers() {
  const supabase = createAdminClient();
  const users: User[] = [];
  const perPage = 200;
  let page = 1;
  let lastPage = 1;

  do {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error) throw error;
    users.push(...data.users);
    lastPage = data.lastPage || page;
    page += 1;
  } while (page <= lastPage);

  return users;
}

function mapAuthUsersWithoutProfiles(authUsers: User[]): AdminUser[] {
  return authUsers.map((user) => ({
    id: user.id,
    email: user.email ?? null,
    fullName:
      typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : null,
    role: "member",
    createdAt: user.created_at,
    lastSignInAt: user.last_sign_in_at ?? null,
    emailConfirmedAt: user.email_confirmed_at ?? user.confirmed_at ?? null,
    status: isBlocked(user) ? "blocked" : "active",
    bookmarkCount: 0,
    savedSearchCount: 0,
    readingListCount: 0,
  }));
}

async function getAdminUsers(): Promise<AdminUsersData> {
  const supabase = createAdminClient();
  const [
    authUsers,
    profilesResult,
    bookmarksResult,
    savedSearchesResult,
    readingListsResult,
  ] = await Promise.all([
    listAllAuthUsers(),
    supabase
      .from("profiles")
      .select("id, email, full_name, role, created_at, updated_at")
      .order("created_at", { ascending: false }),
    supabase.from("bookmarks").select("user_id"),
    supabase.from("saved_searches").select("user_id"),
    supabase.from("reading_lists").select("user_id"),
  ]);

  if (profilesResult.error) {
    if (isMissingProfilesTable(profilesResult.error)) {
      return {
        users: mapAuthUsersWithoutProfiles(authUsers),
        needsProfilesSetup: true,
      };
    }
    throw profilesResult.error;
  }

  const profiles = new Map(
    ((profilesResult.data ?? []) as ProfileRow[]).map((profile) => [
      profile.id,
      profile,
    ])
  );
  const bookmarkCounts = countByUser(bookmarksResult.data);
  const savedSearchCounts = countByUser(savedSearchesResult.data);
  const readingListCounts = countByUser(readingListsResult.data);

  return {
    users: authUsers.map((user): AdminUser => {
      const profile = profiles.get(user.id);
      return {
        id: user.id,
        email: profile?.email ?? user.email ?? null,
        fullName:
          profile?.full_name ??
          (typeof user.user_metadata?.full_name === "string"
            ? user.user_metadata.full_name
            : null),
        role: profile?.role ?? "member",
        createdAt: profile?.created_at ?? user.created_at,
        lastSignInAt: user.last_sign_in_at ?? null,
        emailConfirmedAt: user.email_confirmed_at ?? user.confirmed_at ?? null,
        status: isBlocked(user) ? "blocked" : "active",
        bookmarkCount: bookmarkCounts.get(user.id) ?? 0,
        savedSearchCount: savedSearchCounts.get(user.id) ?? 0,
        readingListCount: readingListCounts.get(user.id) ?? 0,
      };
    }),
    needsProfilesSetup: false,
  };
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const admin = await requireAdmin();
  const query = (sp.q ?? "").trim().toLowerCase();
  const roleFilter = sp.role ?? "all";
  const statusFilter = sp.status ?? "all";
  const { users, needsProfilesSetup } = await getAdminUsers();

  const filteredUsers = users.filter((user) => {
    const matchesQuery =
      !query ||
      user.email?.toLowerCase().includes(query) ||
      user.fullName?.toLowerCase().includes(query) ||
      user.id.toLowerCase().includes(query);
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesStatus = statusFilter === "all" || user.status === statusFilter;
    return matchesQuery && matchesRole && matchesStatus;
  });

  const totalActiveUsers = users.filter((user) => user.status === "active").length;
  const totalBlockedUsers = users.filter((user) => user.status === "blocked").length;
  const totalUsingWorkspace = users.filter(
    (user) =>
      user.bookmarkCount + user.savedSearchCount + user.readingListCount > 0 ||
      user.lastSignInAt
  ).length;

  return (
    <div className="admin-dashboard admin-moderation-premium">
      <div className="admin-header">
        <div>
          <p className="admin-kicker">Access and moderation</p>
          <h1>Users</h1>
          <p className="admin-subtext">
            Track signups, see who is using the workspace, promote curators,
            grant admin access, and block accounts when needed.
          </p>
        </div>

        <div className="admin-actions">
          <Link href="/admin-login" className="admin-button admin-button-secondary">
            Admin sign-in
          </Link>
          <Link href="/signup" className="admin-button">
            Create account
          </Link>
        </div>
      </div>

      <section className="admin-overview-grid">
        <div className="admin-stat-card">
          <div className="admin-panel-label">Signups</div>
          <div className="admin-stat-number">{users.length}</div>
          <div className="admin-stat-text">Total Supabase Auth users</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-panel-label">Using workspace</div>
          <div className="admin-stat-number">{totalUsingWorkspace}</div>
          <div className="admin-stat-text">Signed in or saved research items</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-panel-label">Active</div>
          <div className="admin-stat-number">{totalActiveUsers}</div>
          <div className="admin-stat-text">Allowed to sign in</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-panel-label">Blocked</div>
          <div className="admin-stat-number">{totalBlockedUsers}</div>
          <div className="admin-stat-text">Sign-in disabled</div>
        </div>
      </section>

      {sp.updated ? <p className="admin-save-status">{sp.updated}</p> : null}
      {sp.error ? <p className="admin-error-status">{sp.error}</p> : null}
      {needsProfilesSetup ? (
        <section className="admin-error-status">
          <strong>Profiles table missing.</strong> Apply{" "}
          <code>supabase/migrations/0001_auth_and_research.sql</code> in
          Supabase before changing roles or tracking saved workspace activity.
          This screen is showing Auth users only for now.
        </section>
      ) : null}

      <section className="admin-table-surface admin-users-surface">
        <form className="admin-toolbar" action="/admin/users">
          <input
            className="admin-search"
            type="search"
            name="q"
            placeholder="Search name, email, or user ID"
            defaultValue={sp.q ?? ""}
          />
          <select className="admin-filter" name="role" defaultValue={roleFilter}>
            <option value="all">All roles</option>
            {ROLE_OPTIONS.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          <select className="admin-filter" name="status" defaultValue={statusFilter}>
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="blocked">Blocked</option>
          </select>
          <button className="admin-button" type="submit">
            Filter
          </button>
        </form>

        <div className="admin-users-table">
          <div className="admin-users-row admin-table-head">
            <span>User</span>
            <span>Role</span>
            <span>Activity</span>
            <span>Status</span>
            <span>Actions</span>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="admin-empty-state admin-users-empty">
              No users match those filters.
            </div>
          ) : (
            filteredUsers.map((user) => (
              <div className="admin-users-row" key={user.id}>
                <div className="admin-user-identity">
                  <strong>{user.fullName || user.email || "Unnamed user"}</strong>
                  <span>{user.email ?? "No email on account"}</span>
                  <code>{user.id}</code>
                </div>

                <form action={updateUserRole} className="admin-inline-form admin-role-form">
                  <input type="hidden" name="user_id" value={user.id} />
                  <select name="role" defaultValue={user.role} className="admin-filter admin-role-select">
                    {ROLE_OPTIONS.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="admin-small-button admin-primary-button"
                    disabled={needsProfilesSetup}
                  >
                    Save
                  </button>
                </form>

                <div className="admin-user-activity">
                  <span>Joined {formatDate(user.createdAt)}</span>
                  <span>Last sign-in {formatDate(user.lastSignInAt)}</span>
                  <span>
                    {user.bookmarkCount} bookmarks, {user.savedSearchCount} searches,{" "}
                    {user.readingListCount} lists
                  </span>
                </div>

                <div className="admin-user-status">
                  <span className={`admin-status-pill is-${user.status}`}>
                    {user.status}
                  </span>
                  <span>
                    {user.emailConfirmedAt
                      ? "Email confirmed"
                      : "Email not confirmed"}
                  </span>
                </div>

                <AdminUserRowActions
                  userId={user.id}
                  email={user.email}
                  status={user.status}
                  isSelf={user.id === admin.id}
                />
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
