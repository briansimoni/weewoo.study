import { Head } from "$fresh/runtime.ts";

export default function Error404() {
  return (
    <>
      <Head>
        <title>404 - Page not found</title>
      </Head>
      <div class="min-h-screen flex items-center justify-center bg-gradient-to-r from-green-300 to-blue-500 px-4">
        <div class="bg-white p-10 rounded-xl shadow-2xl text-center max-w-lg">
          <img
            class="mx-auto w-32 h-32 mb-6 animate-bounce"
            src="/ambulance.svg"
            alt="Fresh logo: a sliced lemon dripping with juice"
          />
          <h1 class="text-6xl font-extrabold text-gray-800 mb-4">404</h1>
          <p class="text-2xl text-gray-600 mb-8">
            Oops! The page you&apos;re looking for doesn&apos;t exist.
          </p>
          <a
            href="/"
            class="inline-block px-8 py-4 bg-blue-600 text-white font-semibold rounded-full shadow hover:bg-blue-700 transition-colors"
          >
            Go Back Home
          </a>
        </div>
      </div>
    </>
  );
}
