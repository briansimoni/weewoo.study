import { page, type PageProps } from "fresh";
import { Handlers } from "fresh/compat";
import {
  Database,
  FileQuestion,
  Library,
  type LucideIcon,
  ShoppingBag,
  ThumbsDown,
  Users,
} from "lucide-preact";
import { QuestionStore, type Scope, SCOPES } from "../../lib/question_store.ts";
import { AdminPage } from "../../components/admin/AdminPage.tsx";
import { SCOPE_LABELS } from "../../components/admin/ScopeTabs.tsx";
import { Card } from "../../components/ui/Card.tsx";
import { Stat, StatGrid } from "../../components/ui/Stat.tsx";

interface Data {
  questions: Record<Scope, number>;
  openReports: number;
}

const TOOLS: {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
}[] = [
  {
    title: "Questions",
    description: "Search, edit and delete questions in each bank.",
    href: "/admin/questions",
    icon: Library,
  },
  {
    title: "Question reports",
    description: "Read and resolve users' thumbs up and down.",
    href: "/admin/question-reports",
    icon: ThumbsDown,
  },
  {
    title: "Question generator",
    description: "Draft new questions from textbook chapters.",
    href: "/admin/question-generator",
    icon: FileQuestion,
  },
  {
    title: "Products",
    description: "Import products from Printful and edit the shop.",
    href: "/admin/product-manager",
    icon: ShoppingBag,
  },
  {
    title: "Users",
    description: "Accounts and their practice statistics.",
    href: "/admin/users",
    icon: Users,
  },
  {
    title: "Database",
    description: "Download a backup or restore one.",
    href: "/admin/database",
    icon: Database,
  },
];

export const handler: Handlers<Data> = {
  async GET() {
    const counts = await Promise.all(
      SCOPES.map(async (scope) =>
        (await QuestionStore.make(undefined, scope)).size()
      ),
    );
    const reports = await (await QuestionStore.make()).getQuestionReports();
    return page({
      questions: Object.fromEntries(
        SCOPES.map((scope, i) => [scope, counts[i]]),
      ) as Record<Scope, number>,
      openReports: reports.filter((r) => !r.resolved_at).length,
    });
  },
};

export default function AdminIndex({ data }: PageProps<Data>) {
  return (
    <AdminPage title="Dashboard" section="dashboard">
      <Card class="mb-8">
        <StatGrid class="sm:grid-cols-4">
          {SCOPES.map((scope) => (
            <a key={scope} href={`/admin/questions?scope=${scope}`}>
              <Stat
                title={`${SCOPE_LABELS[scope]} questions published`}
                value={data.questions[scope]}
              />
            </a>
          ))}
          <a href="/admin/question-reports">
            <Stat
              title="Open reports (EMT)"
              value={data.openReports}
              tone={data.openReports > 0 ? "warning" : "default"}
            />
          </a>
        </StatGrid>
      </Card>

      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map(({ title, description, href, icon: Icon }) => (
          <a
            key={href}
            href={href}
            class="card bg-base-100 transition-colors hover:bg-base-300/40"
          >
            <div class="card-body flex-row items-start gap-4">
              <Icon class="mt-1 size-5 shrink-0 text-primary" />
              <div>
                <h2 class="card-title text-lg">{title}</h2>
                <p class="text-sm text-base-content/70">{description}</p>
              </div>
            </div>
          </a>
        ))}
      </div>
    </AdminPage>
  );
}
