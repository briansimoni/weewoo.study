import { Head } from "$fresh/runtime.ts";
import { Handlers, PageProps } from "$fresh/server.ts";

interface SupportPageData {
  success?: boolean;
  error?: string;
}

export default function Support({ data }: PageProps<SupportPageData>) {
  return (
    <>
      <Head>
        <title>Contact Support - WeeWoo.study</title>
      </Head>
      <div className="min-h-screen bg-base-200 flex flex-col items-center p-6">
        <div className="max-w-xl w-full bg-base-100 shadow-xl rounded-lg p-8">
          <h1 className="text-3xl font-bold mb-6 text-primary text-center">
            Contact Support
          </h1>

          <p className="mb-6 text-base-content">
            Have a question, suggestion, question or issue about an order, or
            found a problem with the site? Fill out this form to send me a
            message and I'll get back to you as soon as possible.
          </p>

          {data?.success && (
            <div className="alert alert-success mb-6">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="stroke-current shrink-0 h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>
                Your message has been sent successfully! I'll get back to you
                soon.
              </span>
            </div>
          )}

          {data?.error && (
            <div className="alert alert-error mb-6">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="stroke-current shrink-0 h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{data.error}</span>
            </div>
          )}

          <form method="POST" action="/api/support" className="space-y-4">
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
        </div>
      </div>
    </>
  );
}

// Handle form submissions with client-side navigation
export const handler: Handlers<SupportPageData> = {
  GET(req, ctx) {
    const url = new URL(req.url);
    const success = url.searchParams.get("success") === "true";
    const error = url.searchParams.get("error");

    return ctx.render({
      success,
      error: error || undefined,
    });
  },
};
