// questions_crud_test.ts
import {
  assertArrayIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { User, UserStore } from "./user_store.ts";
import { assertObjectMatch } from "$std/assert/assert_object_match.ts";
import { assertEquals } from "$std/assert/assert_equals.ts";
import { CATEGORIES as _CATEGORIES } from "./categories.ts";

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
    questions_answered: 0,
    questions_correct: 0,
    categories: {}
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

  const leaderboard = await userStore.listLeaderbaord();

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

  const leaderboard = await userStore.listLeaderbaord();

  // there was a bug where two entries were being saved. There should only be one
  assertEquals(leaderboard.length, 1);

  teardown();
});

Deno.test("updating the display name should also update the leaderboard entry", async () => {
  await setup();

  const user = {
    ...testUser,
    stats: {
      questions_answered: 1,
      questions_correct: 1,
    },
  };

  await userStore.createUser(user);
  await userStore.updateUser({
    user_id: user.user_id,
    display_name: "peepoop",
  });
  const updatedUser = await userStore.getUser(user.user_id);
  assertEquals(updatedUser?.display_name, "peepoop");

  const leaderboard = await userStore.listLeaderbaord();
  const leaderboardEntry = leaderboard.find((entry) =>
    entry.user_id === user.user_id
  );
  assertEquals(leaderboardEntry?.display_name, "peepoop");
  teardown();
});

Deno.test("update user stats with category tracking", async () => {
  await setup();

  await userStore.createUser(testUser);
  
  // First update - answering a question in the 'Cardiovascular Emergencies' category correctly
  const category1 = "Cardiovascular Emergencies";
  await userStore.updateUser(
    {
      user_id: testUser.user_id,
      stats: {
        questions_answered: 1,
        questions_correct: 1,
      },
    },
    category1, // categoryId
    true // isCorrect
  );
  
  let user = await userStore.getUser(testUser.user_id);
  
  // Verify overall stats
  assertEquals(user?.stats.questions_answered, 1);
  assertEquals(user?.stats.questions_correct, 1);
  
  // Verify category stats
  assertEquals(user?.stats.categories?.[category1]?.questions_answered, 1);
  assertEquals(user?.stats.categories?.[category1]?.questions_correct, 1);
  
  // Second update - answering a question in the 'Trauma Overview' category incorrectly
  const category2 = "Trauma Overview";
  await userStore.updateUser(
    {
      user_id: testUser.user_id,
      stats: {
        questions_answered: 2,
        questions_correct: 1, // Didn't get this one right
      },
    },
    category2, // categoryId
    false // isCorrect
  );
  
  user = await userStore.getUser(testUser.user_id);
  
  // Verify updated overall stats
  assertEquals(user?.stats.questions_answered, 2);
  assertEquals(user?.stats.questions_correct, 1);
  
  // Verify trauma category stats
  assertEquals(user?.stats.categories?.[category2]?.questions_answered, 1);
  assertEquals(user?.stats.categories?.[category2]?.questions_correct, 0);
  
  // Verify cardiology category stats are still intact
  assertEquals(user?.stats.categories?.[category1]?.questions_answered, 1);
  assertEquals(user?.stats.categories?.[category1]?.questions_correct, 1);
  
  teardown();
});

Deno.test("update existing category stats", async () => {
  await setup();
  
  const category = "Airway Management";
  
  // Create user with predefined categories
  const userWithCategories = {
    ...testUser,
    stats: {
      questions_answered: 2,
      questions_correct: 1,
      categories: {
        [category]: {
          questions_answered: 2,
          questions_correct: 1
        }
      }
    }
  };
  
  await userStore.createUser(userWithCategories);
  
  // Update - answering another question in the 'Airway Management' category correctly
  await userStore.updateUser(
    {
      user_id: userWithCategories.user_id,
      stats: {
        questions_answered: 3,
        questions_correct: 2,
      },
    },
    category, // categoryId
    true // isCorrect
  );
  
  const user = await userStore.getUser(userWithCategories.user_id);
  
  // Verify overall stats
  assertEquals(user?.stats.questions_answered, 3);
  assertEquals(user?.stats.questions_correct, 2);
  
  // Verify updated category stats
  assertEquals(user?.stats.categories?.[category]?.questions_answered, 3);
  assertEquals(user?.stats.categories?.[category]?.questions_correct, 2);
  
  teardown();
});

Deno.test("update user with explicit category stats in payload", async () => {
  await setup();
  
  await userStore.createUser(testUser);
  
  const medicalCategory = "Medical Overview";
  const operationsCategory = "Transport Operations";
  
  // Update with explicit category stats in the payload
  await userStore.updateUser({
    user_id: testUser.user_id,
    stats: {
      questions_answered: 5,
      questions_correct: 3,
      categories: {
        [medicalCategory]: {
          questions_answered: 3,
          questions_correct: 2
        },
        [operationsCategory]: {
          questions_answered: 2,
          questions_correct: 1
        }
      }
    }
  });
  
  const user = await userStore.getUser(testUser.user_id);
  
  // Verify overall stats
  assertEquals(user?.stats.questions_answered, 5);
  assertEquals(user?.stats.questions_correct, 3);
  
  // Verify category stats
  assertEquals(user?.stats.categories?.[medicalCategory]?.questions_answered, 3);
  assertEquals(user?.stats.categories?.[medicalCategory]?.questions_correct, 2);
  assertEquals(user?.stats.categories?.[operationsCategory]?.questions_answered, 2);
  assertEquals(user?.stats.categories?.[operationsCategory]?.questions_correct, 1);
  
  teardown();
});
