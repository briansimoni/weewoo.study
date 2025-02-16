export default function About() {
  return (
    <div className="min-h-screen bg-base-200 flex flex-col items-center p-6">
      <div className="max-w-xl w-full text-center">
        <h1 className="text-4xl font-bold mb-6 text-primary">
          About EMS Practice Questions 🚑
        </h1>

        <p className="mb-4 text-lg">
          The other practice test apps are terrible.
        </p>

        <div className="divider"></div>

        <h2 className="text-2xl font-semibold mb-4">
          This is the best app
        </h2>
        <p className="mb-4">
          This app is free and to the point and has fun stuff like sounds and
          memes.
        </p>

        <p className="mb-4">
          <strong>NOTE</strong> The questions are AI-generated. 🤖
        </p>

        <div className="divider"></div>

        <h2 className="text-2xl font-semibold mb-4">
          Awesome Features (Because You're Awesome 😎)
        </h2>
        <ul className="list-disc list-inside text-left mb-6">
          <li className="mb-2">
            🎯 <span className="font-medium">Interactive Practice:</span>{" "}
            Instant feedback that keeps you on your toes.
          </li>
          <li className="mb-2">
            🔊 <span className="font-medium">Audio Cues:</span>{" "}
            Satisfying "ding!" for right answers and a "womp womp" for wrong
            ones. (Yes, we went there.)
          </li>
          <li className="mb-2">
            📊 <span className="font-medium">Performance Insights:</span>{" "}
            Track your brilliance and pinpoint areas to level up.
          </li>
          <li className="mb-2">
            🆓 <span className="font-medium">Free Access:</span>{" "}
            Because who likes paywalls? Not us. Not you.
          </li>
        </ul>

        <div className="divider"></div>

        <h2 className="text-2xl font-semibold mb-4">
          Who Should Use This? (Spoiler: You!)
        </h2>
        <ul className="list-disc list-inside text-left mb-6">
          <li className="mb-2">
            🚑 EMT students gearing up for the NREMT exam.
          </li>
          <li className="mb-2">
            🏥 Paramedics wanting a refresher without the snooze factor.
          </li>
          <li className="mb-2">
            👩‍🏫 Instructors looking for a fun teaching tool (less "Bueller?"
            and more "ooh!").
          </li>
        </ul>

        <div className="divider"></div>

        <h2 className="text-2xl font-semibold mb-4">
          How It Works (It's So Easy!)
        </h2>
        <div className="grid grid-cols-1 gap-4 mb-6">
          <div className="card bg-white shadow-md p-4">
            <h3 className="font-bold text-xl">1. Start a Practice Session</h3>
            <p>Pick a question and get ready to show off your EMS smarts.</p>
          </div>
          <div className="card bg-white shadow-md p-4">
            <h3 className="font-bold text-xl">2. Answer Questions</h3>
            <p>
              Make your choice and find out if you nailed it—or need a bit more
              caffeine.
            </p>
          </div>
          <div className="card bg-white shadow-md p-4">
            <h3 className="font-bold text-xl">3. Learn & Improve</h3>
            <p>
              Read the explanation and impress your friends with your EMS
              wisdom.
            </p>
          </div>
        </div>

        <div className="divider"></div>

        <h2 className="text-2xl font-semibold mb-4">Meet the Creator 👋</h2>
        <div className="flex flex-col items-center mb-6">
          <img
            src="/profile.jpg"
            alt="Creator's Profile Picture"
            className="w-48 h-48 rounded-full mb-4 border-4 border-primary"
          />
          <p className="text-lg mb-4">
            Hi. This is me. I'm just one guy making this app. I've been an EMT
            in Virginia for 10+ years.
          </p>
        </div>

        <div className="divider"></div>

        <h2 className="text-2xl font-semibold mb-4">Support the App 🚀</h2>
        <p className="mb-4">
          Donate so I can pay for the server and not shove ads in your face.
        </p>
        <div className="flex justify-center mb-6">
          <img
            src="/bitcoin-qr-code.png"
            alt="Bitcoin Donation QR Code"
            className="w-48 h-48"
          />
        </div>

        <div className="divider"></div>

        <h2 className="text-2xl font-semibold mb-4">
          Ready to Have Some Fun While You Study?
        </h2>
        <p className="mb-6">
          Do some practice questions. You won't. You're a 🥔
        </p>

        <a href="/emt/practice" className="btn btn-primary btn-lg">
          Start Practicing 🚑
        </a>
      </div>
    </div>
  );
}
