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
  return (
    <>
      {data.map(({ user, reports }) => {
        return (
          <div>
            <h2>{user.display_name}</h2>
            <h4>{user.user_id}</h4>
            <p>number of reports: {reports.length}</p>
          </div>
        );
      })}
    </>
  );
}
