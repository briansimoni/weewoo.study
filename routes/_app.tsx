import { AppProps } from "./_middleware.ts";
export default function App(props: AppProps) {
  return (
    <html data-theme={props.state.session.preferences?.theme || "light"}>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>NREMT practice questions</title>
        <link rel="stylesheet" href="/dist.css" />

        <meta
          name="description"
          content="Prepare for your NREMT Basic, Advanced, or Paramedic exam with the most fun study app out there."
        />
        <meta
          name="keywords"
          content="EMT, Paramedic, EMS, study app, flashcards, quizzes, emergency medicine, NREMT"
        />

        <meta
          property="og:title"
          content="WeeWoo - Test prep for EMS Professionals"
        />
        <meta
          property="og:description"
          content="Prepare for your NREMT Basic, Advanced, or Paramedic exam with the most fun study app out there."
        />
        <meta property="og:image" content="/static/ambulance.svg" />
        <meta property="og:url" content="https://weewoo.study" />
        <meta property="og:type" content="website" />
      </head>
      <body>
        <props.Component />
      </body>
    </html>
  );
}
