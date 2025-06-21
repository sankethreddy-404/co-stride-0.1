"use client";
import React from "react";
import Link from "next/link";
import { Check, Star, Zap } from "lucide-react";
import PricingService from "@/lib/pricing";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

const HomePricing = () => {
  const tiers = PricingService.getAllTiers();
  const commonFeatures = PricingService.getCommonFeatures();

  return (
    <section id="pricing" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-medium mb-6">
            <Star className="w-4 h-4 mr-2" />
            Simple, Transparent Pricing
          </div>
          <h2 className="text-4xl font-bold mb-4">
            Choose Your Accountability Plan
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Start free and scale as your team grows. All plans include core
            accountability features.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {tiers.map((tier) => (
            <Card
              key={tier.name}
              className={`relative flex flex-col ${
                tier.popular
                  ? "border-primary-500 shadow-xl scale-105 bg-gradient-to-b from-primary-50 to-white"
                  : "border-gray-200 hover:border-primary-300 hover:shadow-lg"
              } transition-all duration-300`}
            >
              {tier.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-gradient-to-r from-primary-600 to-accent-600 text-white px-6 py-2 rounded-full text-sm font-semibold flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Most Popular
                  </div>
                </div>
              )}

              <CardHeader className="text-center pb-8">
                <CardTitle className="text-2xl">{tier.name}</CardTitle>
                <CardDescription className="text-gray-600 mt-2">
                  {tier.description}
                </CardDescription>
                <div className="mt-6">
                  <span className="text-5xl font-bold">
                    {PricingService.formatPrice(tier.price)}
                  </span>
                  <span className="text-gray-600 ml-2">/month</span>
                </div>
                {tier.price === 0 && (
                  <p className="text-sm text-green-600 font-medium mt-2">
                    Perfect for getting started
                  </p>
                )}
              </CardHeader>

              <CardContent className="flex-grow flex flex-col">
                <ul className="space-y-4 mb-8 flex-grow">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/auth/register"
                  className={`w-full text-center px-6 py-4 rounded-lg font-semibold transition-all duration-200 ${
                    tier.popular
                      ? "bg-gradient-to-r from-primary-600 to-accent-600 text-white hover:from-primary-700 hover:to-accent-700 shadow-lg hover:shadow-xl"
                      : "bg-gray-100 text-gray-900 hover:bg-gray-200 border border-gray-300"
                  }`}
                >
                  {tier.price === 0 ? "Start Free Trial" : "Get Started"}
                </Link>

                {tier.price === 0 && (
                  <p className="text-center text-sm text-gray-500 mt-3">
                    No credit card required
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <p className="text-gray-600 mb-4">
            All plans include: {commonFeatures.join(", ")}
          </p>
          <div className="flex justify-center items-center gap-8 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              14-day free trial
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              Cancel anytime
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              24/7 support
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomePricing;
