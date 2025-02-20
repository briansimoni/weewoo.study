// questions_crud_test.ts
import {
  assertArrayIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { User, UserStore } from "./user_store.ts";
import { assertObjectMatch } from "$std/assert/assert_object_match.ts";
import { assertEquals } from "$std/assert/assert_equals.ts";

let userStore: UserStore;
let kv: Deno.Kv;

async function setup() {
  kv = await Deno.openKv(":memory:");
  userStore = await UserStore.make(kv);
}

function teardown() {
  userStore.closeConnection();
}

const testUser: User = {
  user_id: "auth0|1234",
  display_name: "Brian",
  created_at: "",
  stats: {
    streak: {
      days: 0,
    },
    questions_answered: 0,
    questions_correct: 0,
  },
};

Deno.test("Add and retrieve a user", async () => {
  await setup();

  await userStore.createUser(testUser);
  const user = await userStore.getUser("auth0|1234");

  assertObjectMatch(user!, {
    ...testUser,
  });

  teardown();
});

Deno.test("update a user", async () => {
  await setup();

  await userStore.createUser(testUser);
  await userStore.updateUser({
    ...testUser,
    display_name: "Brian 2",
    stats: {
      questions_answered: 1,
      questions_correct: 1,
      streak: {
        days: 0,
      },
    },
  });
  const user = await userStore.getUser("auth0|1234");

  assertObjectMatch(user!, {
    ...testUser,
    display_name: "Brian 2",
    stats: {
      questions_answered: 1,
      questions_correct: 1,
    },
  });

  teardown();
});

Deno.test("update leaderboard and list streaks", async () => {
  await setup();

  const users = [];
  for (let i = 0; i <= 10; i++) {
    users.push({
      ...testUser,
      user_id: String(i),
      stats: {
        questions_answered: 1,
        questions_correct: 1,
        streak: {
          days: 0,
        },
      },
    });
  }

  const proposedUpdates = users.map((user, i) => {
    return {
      ...user,
      stats: {
        questions_answered: i,
        questions_correct: i,
        streak: {
          days: 0,
        },
      },
    };
  });

  await Promise.all(users.map((user) => userStore.createUser(user)));
  await Promise.all(proposedUpdates.map((user) => userStore.updateUser(user)));

  const leaderboard = await userStore.listTopStreaks();

  assertArrayIncludes(leaderboard, [
    { user_id: "10", display_name: "Brian", questions_correct: 10 },
    { user_id: "10", display_name: "Brian", questions_correct: 10 },
    { user_id: "9", display_name: "Brian", questions_correct: 9 },
    { user_id: "8", display_name: "Brian", questions_correct: 8 },
    { user_id: "7", display_name: "Brian", questions_correct: 7 },
    { user_id: "6", display_name: "Brian", questions_correct: 6 },
    { user_id: "5", display_name: "Brian", questions_correct: 5 },
    { user_id: "4", display_name: "Brian", questions_correct: 4 },
    { user_id: "3", display_name: "Brian", questions_correct: 3 },
    { user_id: "2", display_name: "Brian", questions_correct: 2 },
    { user_id: "1", display_name: "Brian", questions_correct: 1 },
  ]);
  teardown();
});

Deno.test("when you are a new user and you get the first ever question wrong it doesn't mess things up", async () => {
  await setup();

  const user = {
    ...testUser,
    stats: {
      questions_answered: 0,
      questions_correct: 0,
      streak: {
        days: 0,
      },
    },
  };

  // user created for the first time
  await userStore.createUser(user);

  // user got the first question wrong
  const updatedUser = await userStore.updateUser({
    ...user,
    stats: {
      ...user.stats,
      questions_answered: user.stats.questions_answered + 1,
      questions_correct: user.stats.questions_correct + 0,
    },
  });

  // user get's a question right
  await userStore.updateUser({
    ...user,
    stats: {
      ...user.stats,
      questions_answered: updatedUser.stats.questions_answered + 1,
      questions_correct: updatedUser.stats.questions_correct + 1,
    },
  });

  const leaderboard = await userStore.listTopStreaks();

  // there was a bug where two entries were being saved. There should only be one
  assertEquals(leaderboard.length, 1);

  teardown();
});
