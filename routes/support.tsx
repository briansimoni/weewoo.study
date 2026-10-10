import { Head } from "fresh/runtime";
import { page, type PageProps } from "fresh";
import { Alert } from "../components/ui/Alert.tsx";
import SupportForm from "../islands/SupportForm.tsx";
import { Handlers } from "fresh/compat";
import { Page } from "../components/ui/Page.tsx";
import { Card } from "../components/ui/Card.tsx";

interface SupportPageData {
  success?: boolean;
  error?: string;
}

export default function Support({ data }: PageProps<SupportPageData>) {
  return (
    <>
      <Head>
        <script src="https://www.google.com/recaptcha/api.js?render=6Lc2v3crAAAAAJjzdpnvxKxk_qIAZZ-AewWvWY7X">
        </script>
      </Head>
      <Page title="Contact Support" width="narrow">
        <Card bodyClass="p-8">
          <h1 className="text-3xl font-bold mb-6 text-primary text-center">
            Contact Support
          </h1>

          <p className="mb-6 text-base-content">
            Have a question, suggestion, question or issue about an order, or
            found a problem with the site? Fill out this form to send me a
            message and I'll get back to you as soon as possible.
          </p>

          {data?.success && (
            <Alert tone="success" class="mb-6">
              Your message has been sent successfully! I'll get back to you
              soon.
            </Alert>
          )}

          {data?.error && <Alert tone="error" class="mb-6">{data.error}</Alert>}

          <SupportForm />
        </Card>
      </Page>
    </>
  );
}

// Handle form submissions with client-side navigation
export const handler: Handlers<SupportPageData> = {
  GET(ctx) {
    const req = ctx.req;
    const url = new URL(req.url);
    const success = url.searchParams.get("success") === "true";
    const error = url.searchParams.get("error");

    return page({
      success,
      error: error || undefined,
    });
  },
};
