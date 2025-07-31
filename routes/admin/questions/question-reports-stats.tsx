import { Handlers, PageProps } from "$fresh/server.ts";
import { QuestionReport, QuestionStore } from "../../../lib/question_store.ts";
import { User, UserStore } from "../../../lib/user_store.ts";
import { Users, FileText, BarChart3, FileX, ArrowLeft } from "lucide-preact";

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
      {/* Navigation */}
      <div class="breadcrumbs text-sm mb-6">
        <ul>
          <li>
            <a href="/admin" class="flex items-center gap-2 hover:text-primary">
              <ArrowLeft size={16} />
              Admin Dashboard
            </a>
          </li>
          <li>Question Reports Stats</li>
        </ul>
      </div>

      {/* Header */}
      <div class="mb-8">
        <h1 class="text-3xl font-bold mb-2">Question Reports Dashboard</h1>
        <p class="text-base-content/70">Overview of users who have submitted question reports</p>
      </div>

      {/* Summary Stats using DaisyUI stats */}
      <div class="stats stats-vertical lg:stats-horizontal shadow mb-8 w-full">
        <div class="stat">
          <div class="stat-figure text-primary">
            <Users size={32} />
          </div>
          <div class="stat-title">Total Users</div>
          <div class="stat-value text-primary">{totalUsers}</div>
          <div class="stat-desc">Users who submitted reports</div>
        </div>

        <div class="stat">
          <div class="stat-figure text-secondary">
            <FileText size={32} />
          </div>
          <div class="stat-title">Total Reports</div>
          <div class="stat-value text-secondary">{totalReports}</div>
          <div class="stat-desc">Reports submitted</div>
        </div>

        <div class="stat">
          <div class="stat-figure text-accent">
            <BarChart3 size={32} />
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
              <div class="mx-auto mb-4 text-base-content/30">
                <FileX size={48} />
              </div>
              <h1 class="text-2xl font-bold">No reports yet</h1>
              <p class="py-6 text-base-content/70">No users have submitted question reports yet.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
