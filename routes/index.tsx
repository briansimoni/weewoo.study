import { AppProps } from "./_middleware.ts";

export default function Home(props: AppProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="flex flex-col items-center gap-6">
        <div className="avatar">
          <div className="w-32">
            <img src="ambulance.svg" alt="EMS Logo" />
          </div>
        </div>
        <h1 className="text-4xl font-bold text-center">
          Welcome to WeeWoo Study
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
