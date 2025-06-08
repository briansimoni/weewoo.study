import { PageProps } from "$fresh/server.ts";
import { ComponentType } from "preact";
import * as Icons from "../../icons/index.ts";

interface AdminToolCard {
  title: string;
  description: string;
  url: string;
  icon: ComponentType<{ className?: string }>;
}

// The admin middleware will automatically handle authentication
// We don't need a custom handler since middleware will reject unauthorized users

export default function AdminIndex(_props: PageProps) {
  const tools: AdminToolCard[] = [
    {
      title: "Product Manager",
      description: "Create, edit, and manage products in the store",
      url: "/admin/product-manager",
      icon: Icons.ShoppingBag,
    },
    {
      title: "Question Generator",
      description: "Create and manage quiz questions",
      url: "/admin/question-generator",
      icon: Icons.FileQuestion,
    },
    {
      title: "Question Library",
      description: "View and manage all questions in the database",
      url: "/admin/questions",
      icon: Icons.Library,
    },
    {
      title: "Debug Tools",
      description: "Debug tools and system diagnostics",
      url: "/admin/debug",
      icon: Icons.Bug,
    },
  ];

  return (
    <div class="bg-base-100 min-h-screen">
      <header class="bg-primary text-primary-content shadow-md py-4">
        <div class="container mx-auto px-4">
          <div class="flex justify-between items-center">
            <div class="flex items-center gap-2">
              <Icons.LayoutDashboard className="w-6 h-6" />
              <h1 class="text-xl font-bold">Admin Portal</h1>
            </div>
            <div class="flex gap-4">
              <a href="/" class="btn btn-ghost btn-sm">
                <Icons.Home className="w-4 h-4 mr-1" />
                Website
              </a>
              <a href="/logout" class="btn btn-ghost btn-sm">
                <Icons.LogOut className="w-4 h-4 mr-1" />
                Logout
              </a>
            </div>
          </div>
        </div>
      </header>

      <div class="container mx-auto p-4 max-w-5xl">
        <div class="flex flex-col items-center mb-8 mt-4">
          <h1 class="text-3xl font-bold mb-2">Admin Dashboard</h1>
          <p class="text-base-content/70">
            Manage your site content and settings
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((tool) => (
            <a
              href={tool.url}
              class="card bg-base-200 shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-1"
            >
              <div class="card-body">
                <div class="flex items-center gap-3 mb-2">
                  <div className="text-primary">
                    <tool.icon className="w-6 h-6" />
                  </div>
                  <h2 class="card-title">{tool.title}</h2>
                </div>
                <p class="text-base-content/70">{tool.description}</p>
              </div>
            </a>
          ))}
        </div>

        <div class="divider my-10">Reports & Analytics</div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="card bg-base-200 shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-1">
            <div class="card-body">
              <h2 class="card-title flex items-center gap-2">
                <Icons.ThumbsUp className="w-5 h-5 text-primary" />
                Question Reports
              </h2>
              <p class="text-base-content/70">
                View user feedback and improvement suggestions for questions
              </p>
              <div class="card-actions justify-end mt-4">
                <a href="/admin/question-reports" class="btn btn-primary">
                  View Reports
                </a>
              </div>
            </div>
          </div>

          <div class="card bg-base-200 shadow-lg">
            <div class="card-body">
              <h2 class="card-title flex items-center gap-2">
                <Icons.MessageCircle className="w-5 h-5 text-primary" />
                Support Tickets
              </h2>
              <p class="text-base-content/70">
                Manage customer support requests
              </p>
              <div class="card-actions justify-end mt-4">
                <a href="#" class="btn btn-primary">
                  Coming Soon
                </a>
              </div>
            </div>
          </div>
        </div>

        <footer class="mt-20 pb-10 text-center">
          <p class="text-base-content/60 text-sm">
            &copy; {new Date().getFullYear()} weewoo.study Admin Portal
          </p>
        </footer>
      </div>
    </div>
  );
}
