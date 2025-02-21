import "$std/dotenv/load.ts";
import { generateName } from "../lib/name_generator.ts";
import { UserStore } from "../lib/user_store.ts";

async function main() {
  const userStore = await UserStore.make();
  const users = await userStore.listUsers();
  console.log(users);

  // generate a display name for each user and update the db
  for (const user of users) {
    const display_name = generateName();
    await userStore.updateUser({ ...user, display_name });
  }
}

main();
