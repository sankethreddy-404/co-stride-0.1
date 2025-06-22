import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle,
  Star,
  Users,
  Brain,
  MessageSquare,
  TrendingUp,
  Shield,
  Zap,
  Target,
} from "lucide-react";
import AuthAwareButtons from "@/components/AuthAwareButtons";
import HomePricing from "@/components/HomePricing";

export default function Home() {
  const productName = process.env.NEXT_PUBLIC_PRODUCTNAME;

  const features = [
    {
      icon: Target,
      title: "Progress Accountability",
      description:
        "Share daily updates with your team. Upload images, documents, and links to showcase real progress.",
      color: "text-blue-600",
      highlight: "Core Feature",
    },
    {
      icon: Users,
      title: "Team Collaboration",
      description:
        "Rate teammates&apos; work, leave constructive feedback, and build a culture of mutual accountability.",
      color: "text-green-600",
      highlight: "Team Building",
    },
    {
      icon: Brain,
      title: "AI-Powered Insights",
      description:
        "Get intelligent summaries of team progress, sentiment analysis, and actionable recommendations.",
      color: "text-purple-600",
      highlight: "AI Enhanced",
    },
    {
      icon: TrendingUp,
      title: "Analytics Dashboard",
      description:
        "Track team performance, engagement metrics, and progress trends with beautiful visualizations.",
      color: "text-orange-600",
      highlight: "Data Driven",
    },
    {
      icon: MessageSquare,
      title: "Real-time Discussions",
      description:
        "Comment on updates, ask questions, and maintain ongoing conversations around each project.",
      color: "text-red-600",
      highlight: "Communication",
    },
    {
      icon: Shield,
      title: "Secure Workspaces",
      description:
        "Private team spaces with role-based access, secure file sharing, and enterprise-grade security.",
      color: "text-indigo-600",
      highlight: "Enterprise Ready",
    },
  ];

  const testimonials = [
    {
      quote:
        "CoStride transformed how our remote team stays accountable. The daily progress updates and AI insights keep everyone motivated and aligned.",
      author: "Sarah Chen",
      role: "Engineering Manager",
      company: "TechFlow Inc.",
      avatar: "SC",
      rating: 5,
    },
    {
      quote:
        "Finally, a tool that makes accountability feel natural, not forced. The team rating system creates healthy competition and mutual support.",
      author: "Michael Rodriguez",
      role: "Product Lead",
      company: "InnovateLab",
      avatar: "MR",
      rating: 5,
    },
    {
      quote:
        "The AI summaries save me hours each week. I get instant insights into team dynamics and can address issues before they become problems.",
      author: "Jessica Kim",
      role: "Team Lead",
      company: "DataCorp",
      avatar: "JK",
      rating: 5,
    },
  ];

  const stats = [
    { label: "Teams Using CoStride", value: "2,500+" },
    { label: "Progress Updates Shared", value: "150K+" },
    { label: "Average Team Engagement", value: "94%" },
    { label: "Customer Satisfaction", value: "4.9/5" },
  ];

  const useCases = [
    {
      title: "Remote Development Teams",
      description:
        "Keep distributed developers accountable with daily code commits, feature demos, and peer reviews.",
      icon: "💻",
    },
    {
      title: "Creative Agencies",
      description:
        "Share design iterations, client feedback, and project milestones with visual progress tracking.",
      icon: "🎨",
    },
    {
      title: "Sales Teams",
      description:
        "Track daily activities, share client interactions, and celebrate wins together.",
      icon: "📈",
    },
    {
      title: "Fitness Accountability",
      description:
        "Share workout photos, nutrition logs, and progress measurements with your accountability partners.",
      icon: "💪",
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/95 backdrop-blur-sm z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex-shrink-0">
              <span className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-500 bg-clip-text text-transparent">
                {productName}
              </span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <Link
                href="#features"
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Features
              </Link>
              <Link
                href="#use-cases"
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Use Cases
              </Link>
              <Link
                href="#testimonials"
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Reviews
              </Link>
              <Link
                href="#pricing"
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Pricing
              </Link>
              <AuthAwareButtons variant="nav" />
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden bg-gradient-to-br from-primary-50 via-white to-accent-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-left">
              <div className="inline-flex items-center px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-medium mb-6">
                <Zap className="w-4 h-4 mr-2" />
                AI-Powered Team Accountability
              </div>
              <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-tight">
                Turn Your Team Into
                <span className="block text-primary-600">
                  Accountability Champions
                </span>
              </h1>
              <p className="mt-6 text-xl text-gray-600 leading-relaxed max-w-2xl">
                Stop wondering what your team is working on. CoStride creates a
                culture of transparency, mutual accountability, and continuous
                progress through daily updates, peer feedback, and AI insights.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row gap-4">
                <AuthAwareButtons />
                <Link
                  href="#demo"
                  className="inline-flex items-center px-6 py-3 rounded-lg border-2 border-primary-600 text-primary-600 font-medium hover:bg-primary-50 transition-colors"
                >
                  See How It Works
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </div>
              <div className="mt-8 flex items-center gap-6 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Start free today
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Google sign-in
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Setup in minutes
                </div>
              </div>
            </div>

            {/* Hero Visual */}
            <div className="relative">
              <div className="bg-white rounded-2xl shadow-2xl p-6 transform rotate-2 hover:rotate-0 transition-transform duration-300">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 pb-3 border-b">
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Development Team</h3>
                      <p className="text-sm text-gray-500">5 members active</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-green-700">
                          JD
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          Completed user authentication module
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <Star
                                key={i}
                                className="w-3 h-3 fill-yellow-400 text-yellow-400"
                              />
                            ))}
                          </div>
                          <span className="text-xs text-gray-500">
                            2 comments
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-blue-700">
                          SM
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          Deployed payment integration to staging
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex">
                            {[1, 2, 3, 4].map((i) => (
                              <Star
                                key={i}
                                className="w-3 h-3 fill-yellow-400 text-yellow-400"
                              />
                            ))}
                            <Star className="w-3 h-3 text-gray-300" />
                          </div>
                          <span className="text-xs text-gray-500">
                            1 comment
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t">
                    <div className="flex items-center gap-2 text-sm text-purple-600">
                      <Brain className="w-4 h-4" />
                      <span className="font-medium">AI Insight:</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Team velocity increased 23% this week. Great collaboration
                      on the auth module!
                    </p>
                  </div>
                </div>
              </div>

              {/* Floating elements */}
              <div className="absolute -top-4 -right-4 bg-green-500 text-white p-3 rounded-full shadow-lg">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div className="absolute -bottom-4 -left-4 bg-purple-500 text-white p-3 rounded-full shadow-lg">
                <Brain className="w-6 h-6" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl font-bold text-primary-600 mb-2">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              Everything You Need for Team Accountability
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Built specifically for teams who want to stay accountable,
              motivated, and continuously improving together.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white p-8 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 group"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`p-3 rounded-lg bg-gray-50 group-hover:bg-primary-50 transition-colors`}
                  >
                    <feature.icon className={`h-6 w-6 ${feature.color}`} />
                  </div>
                  <span className="text-xs font-semibold text-primary-600 bg-primary-50 px-2 py-1 rounded-full">
                    {feature.highlight}
                  </span>
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section id="use-cases" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Perfect for Any Team</h2>
            <p className="text-xl text-gray-600">
              From software teams to fitness groups, accountability drives
              results
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {useCases.map((useCase, index) => (
              <div
                key={index}
                className="text-center p-6 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <div className="text-4xl mb-4">{useCase.icon}</div>
                <h3 className="text-lg font-semibold mb-3">{useCase.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {useCase.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section
        id="testimonials"
        className="py-24 bg-gradient-to-br from-primary-600 to-primary-800"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Loved by Teams Worldwide
            </h2>
            <p className="text-xl text-primary-100">
              See how teams are transforming their accountability culture
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="bg-white/10 backdrop-blur-sm rounded-xl p-8 border border-white/20"
              >
                <div className="flex items-center gap-1 mb-4">
                  {Array.from({ length: testimonial.rating }, (_, i) => (
                    <Star
                      key={i}
                      className="w-5 h-5 fill-yellow-400 text-yellow-400"
                    />
                  ))}
                </div>
                <p className="text-white/90 mb-6 leading-relaxed">
                  &quot;{testimonial.quote}&quot;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary-400/30 flex items-center justify-center text-white font-semibold">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <p className="text-white font-semibold">
                      {testimonial.author}
                    </p>
                    <p className="text-primary-200 text-sm">
                      {testimonial.role}
                    </p>
                    <p className="text-primary-300 text-xs">
                      {testimonial.company}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <HomePricing />

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-primary-600 to-accent-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to Transform Your Team&apos;s Accountability?
          </h2>
          <p className="text-xl text-primary-100 mb-8">
            Join thousands of teams who&apos;ve discovered the power of daily
            accountability and AI insights
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/register"
              className="inline-flex items-center px-8 py-4 rounded-lg bg-white text-primary-600 font-semibold hover:bg-primary-50 transition-colors text-lg"
            >
              Start Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link
              href="#demo"
              className="inline-flex items-center px-8 py-4 rounded-lg border-2 border-white text-white font-semibold hover:bg-white/10 transition-colors text-lg"
            >
              Watch Demo
            </Link>
          </div>
          <p className="text-primary-200 text-sm mt-6">
            14-day free trial • No credit card required • Setup in minutes
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="col-span-2 md:col-span-1">
              <span className="text-2xl font-bold bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">
                {productName}
              </span>
              <p className="mt-4 text-gray-400 leading-relaxed">
                The accountability platform that transforms teams through
                transparency, peer feedback, and AI-powered insights.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
                Product
              </h4>
              <ul className="space-y-3">
                <li>
                  <Link
                    href="#features"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    Features
                  </Link>
                </li>
                <li>
                  <Link
                    href="#pricing"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link
                    href="#use-cases"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    Use Cases
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
                Company
              </h4>
              <ul className="space-y-3">
                <li>
                  <Link
                    href="/legal/terms"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    Terms
                  </Link>
                </li>
                <li>
                  <Link
                    href="/legal/privacy"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/legal/refund"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    Refunds
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
                Support
              </h4>
              <ul className="space-y-3">
                <li>
                  <Link
                    href="https://github.com/Razikus/supabase-nextjs-template"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    Documentation
                  </Link>
                </li>
                <li>
                  <Link
                    href="mailto:support@costride.com"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © {new Date().getFullYear()} {productName}. All rights reserved.
            </p>
            <div className="flex items-center gap-6 mt-4 md:mt-0">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Shield className="w-4 h-4" />
                Enterprise Security
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <CheckCircle className="w-4 h-4" />
                99.9% Uptime
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
