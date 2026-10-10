import { HttpError, type PageProps } from "fresh";
import { Head } from "fresh/runtime";
import { LinkButton } from "../components/ui/Button.tsx";
import { Card } from "../components/ui/Card.tsx";

export default function ErrorPage({ error }: PageProps) {
  const status = error instanceof HttpError ? error.status : 500;
  const title = status === 404 ? "Page not found" : "Something went wrong";
  return (
    <>
      <Head>
        <title>{status} - {title}</title>
      </Head>
      <div class="flex items-center justify-center px-4">
        <Card class="max-w-lg" bodyClass="items-center text-center p-10">
          <img
            class="mx-auto w-32 h-32 mb-6 animate-bounce"
            src="/ambulance.svg"
            alt="Ambulance"
          />
          <h1 class="text-6xl font-extrabold mb-4">{status}</h1>
          <p class="text-2xl text-base-content/70 mb-8">
            {status === 404
              ? "Oops! The page you're looking for doesn't exist."
              : "Oops! Something went wrong. Please try again later."}
          </p>
          <LinkButton href="/" size="lg">Go Back Home</LinkButton>
        </Card>
      </div>
    </>
  );
}
