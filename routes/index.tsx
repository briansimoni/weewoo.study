import type { ComponentChildren } from "preact";
import TrialQuestions from "../islands/TrialQuestions.tsx";
import AudioClip from "../islands/AudioClip.tsx";
import { AppProps } from "./_middleware.ts";
import { LinkButton } from "../components/ui/Button.tsx";
import { Card } from "../components/ui/Card.tsx";
import { Avatar } from "../components/ui/Avatar.tsx";
import { FeatureCard } from "../components/ui/FeatureCard.tsx";
import { VitalsMonitor } from "../components/landing/VitalsMonitor.tsx";
import {
  ArrowRight,
  Gift,
  Library,
  Shield,
  ShoppingBag,
  Star,
  TrendingUp,
  Trophy,
} from "lucide-preact";

const SECTION = "mx-auto w-full max-w-6xl px-4 sm:px-8";

const CELEBRITIES = [
  {
    name: "Donald Trump",
    image: "/trump.webp",
    audio: "/trump.mp3",
    quote:
      "WeeWoo Study is tremendous, believe me. The best EMS training program ever. It's huge!",
  },
  {
    name: "Snoop Dogg",
    image: "/Snoop-Dogg.webp",
    audio: "/snoop.mp3",
    quote:
      "Fo' shizzle, WeeWoo Study got me through my EMT training like a breeze. Now I'm savin' lives and droppin' rhymes!",
  },
];

const STUDENTS = [
  {
    name: "Oliver Clothesoff",
    role: "EMT-B, Texas",
    quote:
      "WeeWoo Study was a game-changer for my NREMT exam. I failed the exam 10 times, but after WeeWoo.study I passed and now my volunteer rescue squad let me loose in the streets to take care of patients!",
  },
  {
    name: "Hugh Jass",
    role: "Paramedic, California",
    quote:
      "I was flipping burgers at McDonalds until weewoo.study. Now I'm taking care of the people who I used to flip burgers for!",
  },
  {
    name: "Seymour Butz",
    role: "MD, PhD, New York",
    quote:
      "After I discovered weewoo.study, I was able to better understand first responders. The only downside is that whenever I wear the swag, women will NOT leave me alone.",
  },
];

const SWAG = [
  {
    name: "Premium Hoodie",
    image:
      "https://d3leqxp227sjlw.cloudfront.net/hoodie/unisex-premium-hoodie-black-left-front-67cdee667b71e.png",
    alt: "WeeWoo Study Premium Hoodie",
    description:
      "Stay warm and comfortable during long study sessions with our premium quality hoodie.",
    cta: "Shop Hoodies",
  },
  {
    name: "Camo Trucker Hat",
    image:
      "https://d3leqxp227sjlw.cloudfront.net/camo-hat/camouflage-trucker-hat-camo-olive-front-682a0e4ad0ca0.png",
    alt: "WeeWoo Study Camo Trucker Hat",
    description:
      "Top off your look with our stylish camo trucker hat, perfect for any EMS professional.",
    cta: "Shop Hats",
  },
  {
    name: "WeeWoo High-Waisted Bikini",
    image:
      "https://d3leqxp227sjlw.cloudfront.net/388417454/all-over-print-recycled-high-waisted-bikini-white-left-front-688c1b392b34d.png",
    alt: "WeeWoo High-Waisted Bikini",
    description:
      "Get the c-collars ready because you'll really be turning heads when you wear this to the pool.",
    cta: "Shop Swimwear",
  },
];

export default function Home(props: AppProps) {
  const signedIn = Boolean(props.state.session);
  return (
    <div class="flex flex-col gap-16 sm:gap-24">
      {/* Hero: the pitch and, for visitors, the free trial questions */}
      <section class="relative overflow-hidden border-b border-base-300">
        <EcgTrace />
        <div
          class={`${SECTION} relative flex flex-wrap items-center gap-10 py-12 lg:gap-16 lg:py-20`}
        >
          <div class="flex min-w-0 flex-[1_1_420px] flex-col gap-5">
            <p class="font-mono text-xs font-semibold uppercase tracking-widest text-secondary">
              NREMT practice · EMT · AEMT · Paramedic
            </p>
            <h1 class="text-5xl font-bold leading-none tracking-tight lg:text-7xl">
              Practice like it's <span class="text-primary">a real call.</span>
            </h1>
            <p class="max-w-xl text-lg text-base-content/75">
              Join thousands of EMTs who've passed their exams with confidence.
              Interactive practice questions, real-time feedback, and proven
              study methods.
            </p>
            <div class="flex flex-wrap gap-3">
              <LinkButton
                size="lg"
                href={signedIn ? "/emt/practice" : "#trial-questions"}
              >
                {signedIn ? "Start Practicing" : "Start Free Practice"}
                <ArrowRight class="size-5" />
              </LinkButton>
              <LinkButton
                size="lg"
                variant="neutral"
                href="/shop"
                class="border-base-300 bg-base-100"
              >
                Buy Swag
              </LinkButton>
            </div>
            {!signedIn && (
              <p class="font-mono text-sm text-base-content/60">
                5 free questions · no login · no ads
              </p>
            )}
          </div>
          {!signedIn && (
            <div
              id="trial-questions"
              class="min-w-0 flex-[1_1_380px] scroll-mt-4"
            >
              <TrialQuestions
                trial_questions_completed={props.state.preferences
                  ?.trial_questions_completed || false}
              />
            </div>
          )}
        </div>
      </section>

      <div class={SECTION}>
        <VitalsMonitor
          title="Vitals"
          status="Stable. Probably."
          readouts={[
            {
              label: "Practice questions",
              value: "420+",
              description: "Updated whenever",
              tone: "primary",
            },
            {
              label: "Students helped",
              value: "69K+",
              description: "Nice...",
              tone: "secondary",
            },
            {
              label: "Pass rate",
              value: "9000+",
              description: "Over 9000 success units",
              tone: "accent",
            },
          ]}
        />
      </div>

      <section class={SECTION} aria-labelledby="features-heading">
        <SectionHeading id="features-heading" title="Why Choose WeeWoo Study?">
          Our platform is designed by EMS professionals for EMS professionals.
          Everything you need to succeed in one place.
        </SectionHeading>
        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <FeatureCard icon={<Gift class="size-5" />} title="Always Free">
            WeeWoo Study is 100% free to use. No hidden fees or subscriptions.
          </FeatureCard>
          <FeatureCard
            icon={<Shield class="size-5" />}
            title="No Ads"
            tone="secondary"
          >
            No ads, no distractions, just focused learning.
          </FeatureCard>
          <FeatureCard
            icon={<TrendingUp class="size-5" />}
            title="Progress Tracking"
            tone="accent"
          >
            Detailed analytics show your strengths, weaknesses, and readiness
            for the actual exam.
          </FeatureCard>
          <FeatureCard
            icon={<Library class="size-5" />}
            title="Comprehensive Content"
            tone="info"
          >
            Covers all exam domains including medical, trauma, operations, and
            patient assessment.
          </FeatureCard>
          <FeatureCard
            icon={<ShoppingBag class="size-5" />}
            title="Epic Swag"
            tone="success"
          >
            Get some now before Nike buys us out and jacks up the prices.
          </FeatureCard>
          <FeatureCard
            icon={<Trophy class="size-5" />}
            title="Compete"
            tone="warning"
          >
            Compete with your peers and reach the top of the{" "}
            <a href="/leaderboard" class="link link-primary">leaderboard</a>.
          </FeatureCard>
        </div>
      </section>

      <section class={SECTION} aria-labelledby="celebrities-heading">
        <SectionHeading
          id="celebrities-heading"
          eyebrow="Incoming transmission"
          title="Celebrity Endorsements"
        >
          Listen to what famous people say about WeeWoo Study
        </SectionHeading>
        <div class="grid gap-4 md:grid-cols-2">
          {CELEBRITIES.map(({ name, image, audio, quote }) => (
            <article
              key={name}
              class="card overflow-hidden bg-base-100 shadow-xl"
            >
              <figure>
                <img
                  src={image}
                  alt={name}
                  class="aspect-video w-full object-cover"
                />
              </figure>
              <div class="card-body gap-4">
                <h3 class="card-title text-2xl">{name}</h3>
                <blockquote class="flex-1 text-lg text-base-content/80">
                  "{quote}"
                </blockquote>
                <AudioClip src={audio} label={`${name}'s endorsement`} />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section class={SECTION} aria-labelledby="students-heading">
        <SectionHeading id="students-heading" title="What Our Students Say">
          Real success stories from EMTs and Paramedics
        </SectionHeading>
        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {STUDENTS.map(({ name, role, quote }) => (
            <Card key={name} bodyClass="gap-4">
              <div
                class="flex gap-1 text-warning"
                role="img"
                aria-label="5 out of 5 stars"
              >
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} class="size-4 fill-current" />
                ))}
              </div>
              <blockquote class="flex-1 text-base-content/80">
                "{quote}"
              </blockquote>
              <div class="flex items-center gap-3">
                <Avatar name={name} size="sm" />
                <div>
                  <p class="font-semibold">{name}</p>
                  <p class="font-mono text-sm text-base-content/60">{role}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section class={SECTION} aria-labelledby="swag-heading">
        <div class="flex flex-wrap items-end justify-between gap-x-8">
          <SectionHeading id="swag-heading" title="Swag Store">
            Show your dedication to emergency medical services with our
            exclusive WeeWoo Study merchandise. Quality gear for the heroes in
            training.
          </SectionHeading>
          <LinkButton
            variant="neutral"
            href="/shop"
            class="mb-9 border-base-300 bg-base-100"
          >
            View All Merchandise <ArrowRight class="size-4" />
          </LinkButton>
        </div>
        <div class="grid gap-4 md:grid-cols-3">
          {SWAG.map(({ name, image, alt, description, cta }) => (
            <article
              key={name}
              class="card overflow-hidden bg-base-100 shadow-xl"
            >
              {/* A light tile in both themes, so the black hoodie shows. */}
              <figure data-theme="dayshift" class="p-5">
                <img
                  src={image}
                  alt={alt}
                  class="aspect-square w-full max-w-64 object-contain"
                />
              </figure>
              <div class="card-body gap-3">
                <h3 class="card-title">{name}</h3>
                <p class="text-base-content/70">{description}</p>
                <div class="card-actions mt-2">
                  <LinkButton href="/shop">{cta}</LinkButton>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section class={SECTION} aria-labelledby="cta-heading">
        <div class="flex flex-wrap items-center justify-between gap-6 rounded-box bg-primary p-8 text-primary-content sm:p-12">
          <div class="flex min-w-0 flex-[1_1_360px] flex-col gap-2">
            <h2 id="cta-heading" class="text-3xl font-bold sm:text-4xl">
              Your shift starts now.
            </h2>
            <p class="text-lg">
              {signedIn
                ? "No ads. No Nike. Just questions."
                : "Five free questions. No login. No ads. No Nike."}
            </p>
          </div>
          <LinkButton
            size="lg"
            variant="neutral"
            href={signedIn ? "/emt/practice" : "#trial-questions"}
          >
            Start Practicing <ArrowRight class="size-5" />
          </LinkButton>
        </div>
      </section>

      <footer class="border-t border-base-300 bg-base-100">
        <div
          class={`${SECTION} flex flex-wrap items-center justify-between gap-x-8 gap-y-4 py-7`}
        >
          <div>
            <p class="font-display text-lg font-bold">
              WeeWoo<span class="font-mono text-sm font-medium text-secondary">
                .study
              </span>
            </p>
            <p class="text-sm text-base-content/60">
              Test prep for EMS professionals.
            </p>
          </div>
          <nav aria-label="Footer" class="flex flex-wrap gap-x-2">
            {[
              ["/about", "About"],
              ["/support", "Support"],
              ["/leaderboard", "Leaderboard"],
              ["/shop", "Shop"],
            ].map(([href, label]) => (
              <a key={href} href={href} class="link link-hover px-2 py-2.5">
                {label}
              </a>
            ))}
          </nav>
          <p class="font-mono text-xs text-base-content/60">
            © WeeWoo Study
          </p>
        </div>
      </footer>
    </div>
  );
}

function SectionHeading(
  { id, eyebrow, title, children }: {
    id: string;
    eyebrow?: string;
    title: string;
    children: ComponentChildren;
  },
) {
  return (
    <div class="mb-9 flex max-w-2xl flex-col gap-3">
      {eyebrow && (
        <p class="font-mono text-xs font-semibold uppercase tracking-widest text-accent">
          {eyebrow}
        </p>
      )}
      <h2 id={id} class="text-3xl font-bold tracking-tight sm:text-4xl">
        {title}
      </h2>
      <p class="text-lg text-base-content/70">{children}</p>
    </div>
  );
}

/** A faint heartbeat line behind the hero. */
function EcgTrace() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1200 200"
      preserveAspectRatio="none"
      class="pointer-events-none absolute inset-x-0 bottom-0 h-24 w-full text-primary opacity-15"
    >
      <polyline
        points="0,120 410,120 430,60 455,175 480,20 505,150 525,120 785,120 800,90 818,140 832,120 1200,120"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linejoin="round"
        vector-effect="non-scaling-stroke"
      />
    </svg>
  );
}
