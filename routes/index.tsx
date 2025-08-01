import TrialQuestions from "../islands/TrialQuestions.tsx";
import { AppProps } from "./_middleware.ts";
import {
  BarChart,
  Gift,
  Library,
  Shield,
  ShoppingBag,
  TrendingUp,
  Trophy,
} from "lucide-preact";

export default function Home(props: AppProps) {
  return (
    <div className="h-[70vh]">
      {/* Hero Section */}
      <div className="h-[70vh] hero bg-gradient-to-br from-primary/10 to-secondary/10">
        <div className="hero-content text-center">
          <div className="max-w-md">
            <div className="avatar mb-8">
              <div className="w-24 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
                <img src="ambulance.svg" alt="WeeWoo Study Logo" />
              </div>
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              WeeWoo Study
            </h1>
            <p className="py-6 text-lg text-base-content/80">
              Join thousands of EMTs who've passed their exams with confidence.
              Interactive practice questions, real-time feedback, and proven
              study methods.
            </p>
            <div className="flex gap-4 justify-center">
              <a
                href={props.state.session
                  ? "/emt/practice"
                  : "#trial-questions"}
                className="btn btn-primary btn-lg"
              >
                Start Free Practice
              </a>
              <a href="/shop" className="btn btn-outline btn-lg">
                Buy Swag
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-base-200 py-16">
        <div className="container mx-auto px-4">
          <div className="stats stats-vertical lg:stats-horizontal shadow w-full">
            <div className="stat">
              <div className="stat-figure text-primary">
                <ShoppingBag className="inline-block w-8 h-8 stroke-current" />
              </div>
              <div className="stat-title">Practice Questions</div>
              <div className="stat-value text-primary">420+</div>
              <div className="stat-desc">Updated whenever</div>
            </div>

            <div className="stat">
              <div className="stat-figure text-secondary">
                <BarChart className="inline-block w-8 h-8 stroke-current" />
              </div>
              <div className="stat-title">Students Helped</div>
              <div className="stat-value text-secondary">69K+</div>
              <div className="stat-desc">Nice...</div>
            </div>

            <div className="stat">
              <div className="stat-figure text-accent">
                <Trophy className="inline-block w-8 h-8 stroke-current" />
              </div>
              <div className="stat-title">Pass Rate</div>
              <div className="stat-value text-accent">
                9000+
              </div>
              <div className="stat-desc">Over 9000 success units</div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              Why Choose WeeWoo Study?
            </h2>
            <p className="text-lg text-base-content/70 max-w-2xl mx-auto">
              Our platform is designed by EMS professionals for EMS
              professionals. Everything you need to succeed in one place.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body text-center">
                <div className="avatar mb-4">
                  <div className="rounded-full bg-primary/10 p-4 mx-auto flex items-center justify-center">
                    <Gift className="stroke-current text-primary w-6 h-6" />
                  </div>
                </div>
                <h3 className="card-title justify-center">Always Free</h3>
                <p className="text-base-content/70">
                  WeeWoo Study is 100% free to use. No hidden fees or
                  subscriptions.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body text-center">
                <div className="avatar mb-4">
                  <div className="rounded-full bg-secondary/10 p-4 mx-auto flex items-center justify-center">
                    <Shield className="stroke-current text-secondary w-6 h-6" />
                  </div>
                </div>
                <h3 className="card-title justify-center">
                  No Ads
                </h3>
                <p className="text-base-content/70">
                  No ads, no distractions, just focused learning.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body text-center">
                <div className="avatar mb-4">
                  <div className="rounded-full bg-accent/10 p-4 mx-auto flex items-center justify-center">
                    <TrendingUp className="stroke-current text-accent w-6 h-6" />
                  </div>
                </div>
                <h3 className="card-title justify-center">Progress Tracking</h3>
                <p className="text-base-content/70">
                  Detailed analytics show your strengths, weaknesses, and
                  readiness for the actual exam.
                </p>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body text-center">
                <div className="avatar mb-4">
                  <div className="rounded-full bg-info/10 p-4 mx-auto flex items-center justify-center">
                    <Library className="stroke-current text-info w-6 h-6" />
                  </div>
                </div>
                <h3 className="card-title justify-center">
                  Comprehensive Content
                </h3>
                <p className="text-base-content/70">
                  Covers all exam domains including medical, trauma, operations,
                  and patient assessment.
                </p>
              </div>
            </div>

            {/* Feature 5 */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body text-center">
                <div className="avatar mb-4">
                  <div className="rounded-full bg-success/10 p-4 mx-auto flex items-center justify-center">
                    <ShoppingBag className="stroke-current text-success w-6 h-6" />
                  </div>
                </div>
                <h3 className="card-title justify-center">
                  Epic Swag
                </h3>
                <p className="text-base-content/70">
                  Get some now before Nike buys us out and jacks up the prices.
                </p>
              </div>
            </div>

            {/* Feature 6 */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body text-center">
                <div className="avatar mb-4">
                  <div className="rounded-full bg-warning/10 p-4 mx-auto flex items-center justify-center">
                    <Trophy className="stroke-current text-warning w-6 h-6" />
                  </div>
                </div>
                <h3 className="card-title justify-center">Compete</h3>
                <p className="text-base-content/70">
                  Compete with your peers and reach the top of the leaderboard
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Swag Store Section */}
      <div className="py-16 bg-base-200">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Swag Store
            </h2>
            <p className="text-xl text-base-content/70 max-w-3xl mx-auto">
              Show your dedication to emergency medical services with our
              exclusive WeeWoo Study merchandise. Quality gear for the heroes in
              training.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-8xl mx-auto">
            {/* Hoodie */}
            <div className="card bg-base-100 shadow-xl">
              <figure className="px-10 pt-10">
                <img
                  src="https://d3leqxp227sjlw.cloudfront.net/hoodie/unisex-premium-hoodie-black-left-front-67cdee667b71e.png"
                  alt="WeeWoo Study Premium Hoodie"
                  className="rounded-xl h-64 object-cover"
                />
              </figure>
              <div className="card-body text-center">
                <h3 className="card-title justify-center">Premium Hoodie</h3>
                <p className="text-base-content/70">
                  Stay warm and comfortable during long study sessions with our
                  premium quality hoodie.
                </p>
                <div className="card-actions justify-center mt-4">
                  <a href="/shop" className="btn btn-primary">Shop Hoodies</a>
                </div>
              </div>
            </div>

            {/* Hat */}
            <div className="card bg-base-100 shadow-xl">
              <figure className="px-10 pt-10">
                <img
                  src="https://d3leqxp227sjlw.cloudfront.net/camo-hat/camouflage-trucker-hat-camo-olive-front-682a0e4ad0ca0.png"
                  alt="WeeWoo Study Camo Trucker Hat"
                  className="rounded-xl h-64 object-cover"
                />
              </figure>
              <div className="card-body text-center">
                <h3 className="card-title justify-center">Camo Trucker Hat</h3>
                <p className="text-base-content/70">
                  Top off your look with our stylish camo trucker hat, perfect
                  for any EMS professional.
                </p>
                <div className="card-actions justify-center mt-4">
                  <a href="/shop" className="btn btn-primary">Shop Hats</a>
                </div>
              </div>
            </div>

            {/* Hot Girl */}
            <div className="card bg-base-100 shadow-xl">
              <figure className="px-10 pt-10">
                <img
                  src="https://d3leqxp227sjlw.cloudfront.net/388417454/all-over-print-recycled-high-waisted-bikini-white-left-front-688c1b392b34d.png"
                  alt="WeeWoo High-Waisted Bikini"
                  className="rounded-xl h-64 object-cover"
                />
              </figure>
              <div className="card-body text-center">
                <h3 className="card-title justify-center">
                  WeeWoo High-Waisted Bikini
                </h3>
                <p className="text-base-content/70">
                  Get the c-collars ready because you'll really be turning heads
                  when you wear this to the pool.
                </p>
                <div className="card-actions justify-center mt-4">
                  <a href="/shop" className="btn btn-primary">Shop Swimwear</a>
                </div>
              </div>
            </div>
          </div>
          
          <div className="text-center mt-12">
            <a href="/shop" className="btn btn-outline btn-lg">
              View All Merchandise
            </a>
          </div>
        </div>
      </div>

      {/* Featured Audio Testimonials */}
      <div className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Celebrity Endorsements</h2>
            <p className="text-lg text-base-content/70">
              Listen to what famous people say about WeeWoo Study
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Trump Testimonial */}
            <div className="card bg-base-100 shadow-xl">
              <figure className="px-10 pt-10">
                <img
                  src="/trump.webp"
                  alt="Donald Trump Testimonial"
                  className="rounded-xl h-64 object-cover"
                />
              </figure>
              <div className="card-body text-center">
                <h3 className="card-title justify-center">Donald Trump</h3>
                <p className="text-base-content/70">
                  "WeeWoo Study is tremendous, believe me. The best EMS training
                  program ever. It's huge!"
                </p>
                <div className="card-actions justify-center mt-4">
                  <audio controls className="w-full max-w-sm">
                    <source src="/trump.mp3" type="audio/mpeg" />
                    Your browser does not support the audio element.
                  </audio>
                </div>
              </div>
            </div>

            {/* Snoop Dogg Testimonial */}
            <div className="card bg-base-100 shadow-xl">
              <figure className="px-10 pt-10">
                <img
                  src="/Snoop-Dogg.webp"
                  alt="Snoop Dogg Testimonial"
                  className="rounded-xl h-64 object-cover"
                />
              </figure>
              <div className="card-body text-center">
                <h3 className="card-title justify-center">Snoop Dogg</h3>
                <p className="text-base-content/70">
                  "Fo' shizzle, WeeWoo Study got me through my EMT training like
                  a breeze. Now I'm savin' lives and droppin' rhymes!"
                </p>
                <div className="card-actions justify-center mt-4">
                  <audio controls className="w-full max-w-sm">
                    <source src="/snoop.mp3" type="audio/mpeg" />
                    Your browser does not support the audio element.
                  </audio>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Testimonials Section */}
      <div className="bg-base-200 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">What Our Students Say</h2>
            <p className="text-lg text-base-content/70">
              Real success stories from EMTs and Paramedics
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <div className="flex items-center gap-4 mb-4">
                  <div className="avatar">
                    <div className="w-12 rounded-full bg-primary text-primary-content">
                      <div className="flex items-center justify-center h-full font-bold">
                        S
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-bold">Oliver Clothesoff</h4>
                    <p className="text-sm text-base-content/70">EMT-B, Texas</p>
                  </div>
                </div>
                <p className="text-base-content/80">
                  "WeeWoo Study was a game-changer for my NREMT exam. I failed
                  the exam 10 times, but after WeeWoo.study I passed and now my
                  volunteer rescue squad let me loose in the streets to take
                  care of patients!"
                </p>
                <div className="rating rating-sm mt-4">
                  <input
                    type="radio"
                    name="rating-1"
                    className="mask mask-star-2 bg-orange-400"
                  />
                  <input
                    type="radio"
                    name="rating-1"
                    className="mask mask-star-2 bg-orange-400"
                  />
                  <input
                    type="radio"
                    name="rating-1"
                    className="mask mask-star-2 bg-orange-400"
                  />
                  <input
                    type="radio"
                    name="rating-1"
                    className="mask mask-star-2 bg-orange-400"
                  />
                  <input
                    type="radio"
                    name="rating-1"
                    className="mask mask-star-2 bg-orange-400"
                    checked
                  />
                </div>
              </div>
            </div>

            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <div className="flex items-center gap-4 mb-4">
                  <div className="avatar">
                    <div className="w-12 rounded-full bg-secondary text-secondary-content">
                      <div className="flex items-center justify-center h-full font-bold">
                        M
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-bold">Hugh Jass</h4>
                    <p className="text-sm text-base-content/70">
                      Paramedic, California
                    </p>
                  </div>
                </div>
                <p className="text-base-content/80">
                  "I was flipping burgers at McDonalds until weewoo.study. Now
                  I'm taking care of the people who I used to flip burgers for!"
                </p>
                <div className="rating rating-sm mt-4">
                  <input
                    type="radio"
                    name="rating-2"
                    className="mask mask-star-2 bg-orange-400"
                  />
                  <input
                    type="radio"
                    name="rating-2"
                    className="mask mask-star-2 bg-orange-400"
                  />
                  <input
                    type="radio"
                    name="rating-2"
                    className="mask mask-star-2 bg-orange-400"
                  />
                  <input
                    type="radio"
                    name="rating-2"
                    className="mask mask-star-2 bg-orange-400"
                  />
                  <input
                    type="radio"
                    name="rating-2"
                    className="mask mask-star-2 bg-orange-400"
                    checked
                  />
                </div>
              </div>
            </div>

            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <div className="flex items-center gap-4 mb-4">
                  <div className="avatar">
                    <div className="w-12 rounded-full bg-accent text-accent-content">
                      <div className="flex items-center justify-center h-full font-bold">
                        A
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-bold">
                      Seymour Butz
                    </h4>
                    <p className="text-sm text-base-content/70">
                      MD, PHD, New York
                    </p>
                  </div>
                </div>
                <p className="text-base-content/80">
                  "After I discovered weewoo.study, I was able to better
                  understand first responders. The only downside is that
                  whenever I wear the swag, women will NOT leave me alone."
                </p>
                <div className="rating rating-sm mt-4">
                  <input
                    type="radio"
                    name="rating-3"
                    className="mask mask-star-2 bg-orange-400"
                  />
                  <input
                    type="radio"
                    name="rating-3"
                    className="mask mask-star-2 bg-orange-400"
                  />
                  <input
                    type="radio"
                    name="rating-3"
                    className="mask mask-star-2 bg-orange-400"
                  />
                  <input
                    type="radio"
                    name="rating-3"
                    className="mask mask-star-2 bg-orange-400"
                  />
                  <input
                    type="radio"
                    name="rating-3"
                    className="mask mask-star-2 bg-orange-400"
                    checked
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-16">
        <div
          id="trial-questions"
          className="container mx-auto px-4"
        >
          {!props.state.session && (
            <TrialQuestions
              trial_questions_completed={props.state.preferences
                ?.trial_questions_completed || false}
            />
          )}
          {props.state.session && (
            <div className="text-center">
              <a
                href="/emt/practice"
                className="btn btn-primary btn-lg"
              >
                Start Practicing
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="footer footer-center p-10 bg-base-200 text-base-content">
        {
          /* <div>
          <div className="avatar mb-4">
            <div className="w-12">
              <Home className="w-12 h-12 stroke-current" />
            </div>
          </div>
          <p className="font-bold">
            WeeWoo Study <br/>
            Your trusted partner in EMS education
          </p>
          <p>Empowering the next generation of emergency medical professionals since 2024</p>
        </div>
        <div>
          <div className="grid grid-flow-col gap-4">
            <a className="link link-hover">About</a>
            <a className="link link-hover">Contact</a>
            <a className="link link-hover">Privacy Policy</a>
            <a className="link link-hover">Terms of Service</a>
          </div>
        </div>
        <div>
          <p>Copyright  2024 - All rights reserved by WeeWoo Study</p>
        </div> */
        }
      </footer>
    </div>
  );
}
