import { useEffect, useRef } from "preact/hooks";

// By declaring grecaptcha at the module level, we inform TypeScript that this
// variable will be available globally at runtime, provided by the Google script.
declare const grecaptcha: any;

export default function SupportForm() {
  // useRef provides a way to access the DOM element directly without race conditions.
  const tokenRef = useRef<HTMLInputElement>(null);

  // useEffect runs on the client, after the component's DOM has been rendered.
  // This is the guaranteed way to ensure the hidden input field exists.
  useEffect(() => {
    // Ensure grecaptcha is defined before calling grecaptcha.ready
    if (typeof grecaptcha === "undefined") {
      console.error("reCAPTCHA script not loaded.");
      return;
    }

    grecaptcha.ready(() => {
      grecaptcha
        .execute("6Lc2v3crAAAAAJjzdpnvxKxk_qIAZZ-AewWvWY7X", { action: "submit" })
        .then((token: string) => {
          if (tokenRef.current) {
            tokenRef.current.value = token;
          }
        })
        .catch((error: any) => {
          console.error("reCAPTCHA execution failed:", error);
        });
    });
  }, []);

  return (
    <form
      method="POST"
      action="/api/support"
      className="space-y-4"
      id="support-form"
    >
      <input
        ref={tokenRef}
        type="hidden"
        id="recaptcha-token"
        name="recaptcha-token"
      />
      <div className="form-control">
        <label className="label">
          <span className="label-text">Your Name</span>
        </label>
        <input
          type="text"
          name="name"
          placeholder="Enter your name"
          className="input input-bordered w-full"
          required
        />
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text">Your Email</span>
        </label>
        <input
          type="email"
          name="email"
          placeholder="Enter your email address"
          className="input input-bordered w-full"
          required
        />
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text">Subject</span>
        </label>
        <input
          type="text"
          name="subject"
          placeholder="Enter the subject of your message"
          className="input input-bordered w-full"
          required
        />
      </div>

      <div className="form-control">
        <label className="label block">
          <span className="label-text">Message</span>
        </label>
        <textarea
          name="message"
          placeholder="Type your message here..."
          className="textarea textarea-bordered w-full"
          required
        >
        </textarea>
      </div>

      <button type="submit" className="btn btn-primary w-full">
        Send Message
      </button>
    </form>
  );
}
