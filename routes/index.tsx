import { PageProps } from "$fresh/server.ts";

interface ExtendedPageProps extends PageProps {
  state: {
    session?: {
      user_id?: string;
    };
  };
}

export default function Home(props: ExtendedPageProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary to-secondary text-white">
      <div className="flex flex-col items-center gap-6">
        <div className="avatar">
          <div className="w-32 rounded-full">
            <img src="ambulance.svg" alt="EMS Logo" />
          </div>
        </div>
        <h1 className="text-4xl font-bold text-center">
          Welcome to EMS Practice Questions
        </h1>
        <p className="text-lg text-center">
          Prepare for your EMT and Paramedic exams with interactive practice
          questions.
        </p>
        <a href="/emt/practice">
          <button className="btn btn-primary btn-lg">Start Practice</button>
        </a>
      </div>
    </div>
  );
}
