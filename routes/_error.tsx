import { HttpError, type PageProps } from "fresh";
import { Head } from "fresh/runtime";

export default function ErrorPage({ error }: PageProps) {
  const status = error instanceof HttpError ? error.status : 500;
  const title = status === 404 ? "Page not found" : "Something went wrong";
  return (
    <>
      <Head>
        <title>{status} - {title}</title>
      </Head>
      <div class="flex items-center justify-center px-4">
        <div class="bg-white p-10 rounded-xl shadow-2xl text-center max-w-lg">
          <img
            class="mx-auto w-32 h-32 mb-6 animate-bounce"
            src="/ambulance.svg"
            alt="Ambulance"
          />
          <h1 class="text-6xl font-extrabold text-gray-800 mb-4">{status}</h1>
          <p class="text-2xl text-gray-600 mb-8">
            {status === 404
              ? "Oops! The page you're looking for doesn't exist."
              : "Oops! Something went wrong. Please try again later."}
          </p>
          <a
            href="/"
            class="inline-block px-8 py-4 bg-blue-600 text-white font-semibold rounded-full shadow-sm hover:bg-blue-700 transition-colors"
          >
            Go Back Home
          </a>
        </div>
      </div>
    </>
  );
}
