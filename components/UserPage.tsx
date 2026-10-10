import { Streak } from "../lib/streak_store.ts";
import { User } from "../lib/user_store.ts";
import { Avatar } from "./ui/Avatar.tsx";
import { Card } from "./ui/Card.tsx";
import { UserStats } from "./UserStats.tsx";

interface Props {
  user: User;
  streak?: Streak;
}

// The page that you see when you inspect a user other than yourself
export default function (props: Props) {
  const { user, streak } = props;
  return (
    <div class="flex items-center justify-center">
      <Card class="w-full max-w-3xl">
        <div class="flex flex-col md:flex-row items-center gap-6">
          <Avatar name={user.display_name} />
          <div class="flex-1 min-w-0 w-full">
            <h2 class="text-2xl font-bold mb-4">{user.display_name}</h2>
            <UserStats stats={user.stats} streakDays={streak?.days ?? 0} />
          </div>
        </div>
      </Card>
    </div>
  );
}
