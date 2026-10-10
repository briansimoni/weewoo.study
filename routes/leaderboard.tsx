import { page } from "fresh";
import { LeaderBoardEntry, UserStore } from "../lib/user_store.ts";
import { AppHandlers, AppProps } from "./_middleware.ts";
import { Page } from "../components/ui/Page.tsx";
import { Card } from "../components/ui/Card.tsx";

export const handler: AppHandlers = {
  async GET() {
    const userStore = await UserStore.make();
    const leaderboard = await userStore.listLeaderbaord();
    return page({ leaderboard });
  },
};

interface LeaderboardProps extends AppProps {
  data: {
    leaderboard: LeaderBoardEntry[];
  };
}

export default function (props: LeaderboardProps) {
  const { leaderboard } = props.data;
  return (
    <Page title="Leaderboard" heading="Leaderboard" width="narrow">
      <Card bodyClass="p-0 sm:p-4 overflow-x-auto">
        <table className="table table-zebra w-full">
          <thead>
            <tr className="bg-primary text-primary-content">
              <th className="text-center">Rank</th>
              <th className="text-center">User</th>
              <th className="text-center">Questions Correct</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.length > 0
              ? (
                leaderboard.map((entry, index) => (
                  <tr key={entry.user_id} className="hover">
                    <td className="text-center">{index + 1}</td>
                    <td className="text-center">
                      <a
                        className="link-primary"
                        href={props.state.session?.user_id === entry.user_id
                          ? "/profile"
                          : `/user/${entry.user_id}`}
                      >
                        {entry.display_name}
                      </a>
                    </td>
                    <td className="text-center">{entry.questions_correct}</td>
                  </tr>
                ))
              )
              : (
                <tr>
                  <td colSpan={3} className="text-center py-4">
                    No data available
                  </td>
                </tr>
              )}
          </tbody>
        </table>
      </Card>
    </Page>
  );
}
