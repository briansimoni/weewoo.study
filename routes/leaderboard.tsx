import { LeaderBoardEntry, UserStore } from "../lib/user_store.ts";
import { AppHandlers, AppProps } from "./_middleware.ts";

export const handler: AppHandlers = {
  async GET(_req, ctx) {
    const userStore = await UserStore.make();
    const leaderboard = await userStore.listTopStreaks();
    return ctx.render({ leaderboard });
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
    <div className="max-w-xl mx-auto p-6 bg-base-100 shadow-xl rounded-xl">
      <h2 className="text-3xl font-bold mb-6 text-center">Leaderboard</h2>
      <div className="overflow-x-auto">
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
                        href={`/user/${entry.user_id}`}
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
      </div>
    </div>
  );
}
