export default function About() {
  return (
    <div className="min-h-screen bg-base-200 flex flex-col items-center p-6">
      <div className="max-w-xl w-full text-center">
        <h1 className="text-4xl font-bold mb-6 text-primary">
          🚨 About WeeWoo.study 🚑
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
            👩‍🏫 Instructors looking for a fun teaching tool (less "Bueller?" and
            more "ooh!").
          </li>
        </ul>

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

        <h2 className="text-2xl font-semibold mb-4">Email Communications 📧</h2>
        <p className="mb-4">
          We value your privacy. We only send emails concerning your order
          status, such as payment confirmation and shipping confirmation. We
          will never spam you or share your email address.
        </p>

        <div className="divider"></div>

        <h2 className="text-2xl font-semibold mb-4">
          Need Help or Have Feedback? 🤔
        </h2>
        <p className="mb-6">
          Found an issue, have a suggestion, or just want to say hi? Visit our
          support page to send me a message directly.
        </p>

        <a href="/support" className="btn btn-secondary mb-8">
          Contact Support 📧
        </a>

        {
          /* <div className="divider"></div>

        <h2 className="text-2xl font-semibold mb-4">
          Ready to Have Some Fun While You Study?
        </h2>
        <p className="mb-6">
          Do some practice questions. You won't. You're a 🥔
        </p>

        <a href="/emt/practice" className="btn btn-primary btn-lg">
          Start Practicing 🚑
        </a> */
        }
      </div>
    </div>
  );
}
