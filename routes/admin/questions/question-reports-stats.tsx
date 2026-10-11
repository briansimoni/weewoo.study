import { page, type PageProps } from "fresh";
import { QuestionReport, QuestionStore } from "../../../lib/question_store.ts";
import { User, UserStore } from "../../../lib/user_store.ts";
import { Handlers } from "fresh/compat";
import { AdminPage } from "../../../components/admin/AdminPage.tsx";
import { Badge } from "../../../components/ui/Badge.tsx";
import { Card } from "../../../components/ui/Card.tsx";
import { Stat, StatGrid } from "../../../components/ui/Stat.tsx";

export const handler: Handlers<PropItem[]> = {
  GET: async () => {
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
      const reports = reportsByUserId[user.user_id] ?? [];
      return {
        user,
        reports,
      };
    });

    return page(pageData);
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
  const averageReportsPerUser = totalUsers > 0
    ? (totalReports / totalUsers).toFixed(1)
    : "0";

  // Sort users by report count (descending)
  const sortedData = [...data].sort((a, b) =>
    b.reports.length - a.reports.length
  );

  return (
    <AdminPage
      title="Reporters"
      section="reports"
      back={{ href: "/admin/question-reports", label: "Question reports" }}
      description="Users who have reported EMT questions, most active first."
    >
      <Card class="mb-6">
        <StatGrid class="sm:grid-cols-3">
          <Stat title="Reporters" value={totalUsers} tone="primary" />
          <Stat title="Reports" value={totalReports} tone="secondary" />
          <Stat
            title="Average per user"
            value={averageReportsPerUser}
            tone="accent"
          />
        </StatGrid>
      </Card>

      {totalUsers === 0
        ? (
          <div class="rounded-box bg-base-100 p-10 text-center text-base-content/70">
            No signed-in user has reported a question yet.
          </div>
        )
        : (
          <div class="overflow-x-auto rounded-box bg-base-100">
            <table class="table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Reports</th>
                  <th>Activity</th>
                </tr>
              </thead>
              <tbody>
                {sortedData.map(({ user, reports }) => {
                  const [activity, tone] = reports.length >= 10
                    ? ["High", "error"] as const
                    : reports.length >= 5
                    ? ["Medium", "warning"] as const
                    : ["Low", "success"] as const;
                  return (
                    <tr key={user.user_id}>
                      <td>
                        <a
                          href={`/user/${encodeURIComponent(user.user_id)}`}
                          class="link link-hover font-medium"
                        >
                          {user.display_name}
                        </a>
                        <div class="font-mono text-xs text-base-content/60">
                          {user.user_id}
                        </div>
                      </td>
                      <td class="font-bold">{reports.length}</td>
                      <td>
                        <Badge tone={tone}>{activity}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
    </AdminPage>
  );
}
