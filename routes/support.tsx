import { Head } from "$fresh/runtime.ts";
import { Handlers, PageProps } from "$fresh/server.ts";
import { CheckCircle, XCircle } from "lucide-preact";
import SupportForm from "../islands/SupportForm.tsx";

interface SupportPageData {
  success?: boolean;
  error?: string;
}

export default function Support({ data }: PageProps<SupportPageData>) {
  return (
    <>
      <Head>
        <title>Contact Support - WeeWoo.study</title>
        <script src="https://www.google.com/recaptcha/api.js?render=6Lc2v3crAAAAAJjzdpnvxKxk_qIAZZ-AewWvWY7X">
        </script>
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
              <CheckCircle class="stroke-current shrink-0 h-6 w-6" />
              <span>
                Your message has been sent successfully! I'll get back to you
                soon.
              </span>
            </div>
          )}

          {data?.error && (
            <div className="alert alert-error mb-6">
              <XCircle class="stroke-current shrink-0 h-6 w-6" />
              <span>{data.error}</span>
            </div>
          )}

          <SupportForm />
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
