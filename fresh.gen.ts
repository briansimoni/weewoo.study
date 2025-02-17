// DO NOT EDIT. This file is generated by Fresh.
// This file SHOULD be checked into source version control.
// This file is automatically updated during development when running `dev.ts`.

import * as $_404 from "./routes/_404.tsx";
import * as $_app from "./routes/_app.tsx";
import * as $_layout from "./routes/_layout.tsx";
import * as $_middleware from "./routes/_middleware.ts";
import * as $about from "./routes/about.tsx";
import * as $api_joke from "./routes/api/joke.ts";
import * as $api_jokes from "./routes/api/jokes.ts";
import * as $auth_callback from "./routes/auth/callback.ts";
import * as $auth_login from "./routes/auth/login.tsx";
import * as $auth_logout from "./routes/auth/logout.tsx";
import * as $emt_practice_index from "./routes/emt/practice/index.tsx";
import * as $greet_name_ from "./routes/greet/[name].tsx";
import * as $index from "./routes/index.tsx";
import * as $Counter from "./islands/Counter.tsx";
import * as $Feedback from "./islands/Feedback.tsx";
import * as $LoginIsland from "./islands/LoginIsland.tsx";
import * as $NavAvatar from "./islands/NavAvatar.tsx";
import type { Manifest } from "$fresh/server.ts";

const manifest = {
  routes: {
    "./routes/_404.tsx": $_404,
    "./routes/_app.tsx": $_app,
    "./routes/_layout.tsx": $_layout,
    "./routes/_middleware.ts": $_middleware,
    "./routes/about.tsx": $about,
    "./routes/api/joke.ts": $api_joke,
    "./routes/api/jokes.ts": $api_jokes,
    "./routes/auth/callback.ts": $auth_callback,
    "./routes/auth/login.tsx": $auth_login,
    "./routes/auth/logout.tsx": $auth_logout,
    "./routes/emt/practice/index.tsx": $emt_practice_index,
    "./routes/greet/[name].tsx": $greet_name_,
    "./routes/index.tsx": $index,
  },
  islands: {
    "./islands/Counter.tsx": $Counter,
    "./islands/Feedback.tsx": $Feedback,
    "./islands/LoginIsland.tsx": $LoginIsland,
    "./islands/NavAvatar.tsx": $NavAvatar,
  },
  baseUrl: import.meta.url,
} satisfies Manifest;

export default manifest;
