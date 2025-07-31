import { Handlers, PageProps } from "$fresh/server.ts";
import { QuestionReport, QuestionStore } from "../../../lib/question_store.ts";
import { User, UserStore } from "../../../lib/user_store.ts";

interface Thing {
  user_id: string;
  user: User;
  reports: QuestionReport[];
}

export const handler: Handlers = {
  GET: async (_req, ctx) => {
    const [questionStore, userStore] = await Promise.all([
      QuestionStore.make(),
      UserStore.make(),
    ]);

    const reports = await questionStore.getQuestionReports();
    const reportsWithUserIds = reports.filter((
      report,
    ): report is QuestionReport & { user_id: string } =>
      report.user_id !== undefined
    );

    const uniqueUsers = new Set(
      reportsWithUserIds.map((report) => report.user_id),
    );

    const reportsByUserId = Object.groupBy(
      reportsWithUserIds,
      (report) => report.user_id,
    );

    const users = (await Promise.all(
      Array.from(uniqueUsers).map((userId) => userStore.getUser(userId)),
    ))
      .filter((user): user is User => Boolean(user));

    const pageData = users.map((user) => {
      const reports = reportsByUserId[user.user_id];
      return {
        user,
        reports,
      };
    });

    return ctx.render(pageData);
  },
};

interface PropItem {
  user: User;
  reports: (QuestionReport & {
    user_id: string;
  })[];
}

export default function ({ data }: PageProps<PropItem[]>) {
  const totalReports = data.reduce((sum, item) => sum + item.reports.length, 0);
  const totalUsers = data.length;
  const averageReportsPerUser = totalUsers > 0 ? (totalReports / totalUsers).toFixed(1) : '0';

  // Sort users by report count (descending)
  const sortedData = [...data].sort((a, b) => b.reports.length - a.reports.length);

  return (
    <div class="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div class="mb-8">
        <h1 class="text-3xl font-bold mb-2">Question Reports Dashboard</h1>
        <p class="text-base-content/70">Overview of users who have submitted question reports</p>
      </div>

      {/* Summary Stats using DaisyUI stats */}
      <div class="stats stats-vertical lg:stats-horizontal shadow mb-8 w-full">
        <div class="stat">
          <div class="stat-figure text-primary">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div class="stat-title">Total Users</div>
          <div class="stat-value text-primary">{totalUsers}</div>
          <div class="stat-desc">Users who submitted reports</div>
        </div>

        <div class="stat">
          <div class="stat-figure text-secondary">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div class="stat-title">Total Reports</div>
          <div class="stat-value text-secondary">{totalReports}</div>
          <div class="stat-desc">Reports submitted</div>
        </div>

        <div class="stat">
          <div class="stat-figure text-accent">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div class="stat-title">Average per User</div>
          <div class="stat-value text-accent">{averageReportsPerUser}</div>
          <div class="stat-desc">Reports per user</div>
        </div>
      </div>

      {/* Users Table using DaisyUI table */}
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title mb-4">Users by Report Activity</h2>
          <p class="text-base-content/70 mb-4">Sorted by number of reports submitted</p>
          
          <div class="overflow-x-auto">
            <table class="table table-zebra">
              <thead>
                <tr>
                  <th>User</th>
                  <th>User ID</th>
                  <th>Reports</th>
                  <th>Activity Level</th>
                </tr>
              </thead>
              <tbody>
                {sortedData.map(({ user, reports }) => {
                  const activityLevel = reports.length >= 10 ? 'High' : reports.length >= 5 ? 'Medium' : 'Low';
                  const badgeClass = reports.length >= 10 ? 'badge-error' : reports.length >= 5 ? 'badge-warning' : 'badge-success';
                  
                  return (
                    <tr key={user.user_id}>
                      <td>
                        <div class="font-bold">{user.display_name}</div>
                      </td>
                      <td>
                        <div class="text-sm opacity-50">{user.user_id}</div>
                      </td>
                      <td>
                        <div class="font-bold">{reports.length}</div>
                      </td>
                      <td>
                        <div class={`badge ${badgeClass}`}>
                          {activityLevel}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Empty state */}
      {totalUsers === 0 && (
        <div class="hero min-h-[400px]">
          <div class="hero-content text-center">
            <div class="max-w-md">
              <svg class="mx-auto h-12 w-12 text-base-content/30 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h1 class="text-2xl font-bold">No reports yet</h1>
              <p class="py-6 text-base-content/70">No users have submitted question reports yet.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
