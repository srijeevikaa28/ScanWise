
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  QrCode,
  Warehouse,
  BarChart,
  Moon,
  Sun,
  CheckCircle,
} from 'lucide-react';
import Header from '@/components/layout/header';

export default function LandingPage() {
  const features = [
    {
      icon: <QrCode className="h-10 w-10 text-primary" />,
      title: 'Effortless Scanning',
      description:
        'Use your device camera to scan QR codes from packaging or upload an image. Plain text IDs are automatically enriched with AI.',
    },
    {
      icon: <Warehouse className="h-10 w-10 text-primary" />,
      title: 'Smart Inventory',
      description:
        'Keep a real-time list of your products. Quantities are updated automatically when you scan an existing item.',
    },
    {
      icon: <BarChart className="h-10 w-10 text-primary" />,
      title: 'AI-Powered Insights',
      description:
        'Get actionable advice on your inventory, including low-stock alerts and notifications for expiring items.',
    },
  ];

  const benefits = [
    {
      icon: <CheckCircle className="h-6 w-6 text-green-500" />,
      text: 'Reduce food waste with expiry date tracking.',
    },
    {
      icon: <CheckCircle className="h-6 w-6 text-green-500" />,
      text: 'Save time with quick-scan and auto-fill features.',
    },
    {
      icon: <CheckCircle className="h-6 w-6 text-green-500" />,
      text: 'Access your inventory from anywhere, on any device.',
    },
    {
      icon: <CheckCircle className="h-6 w-6 text-green-500" />,
      text: 'Light and Dark mode for your viewing comfort.',
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-20 md:py-32 text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter mb-4 text-foreground animate-fade-in-down">
            Smart Inventory,{' '}
            <span className="text-primary">Simplified.</span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground mb-8 animate-fade-in-up">
            Scan QR codes, manage your stock, and get AI-powered insights to
            reduce waste and stay organized.
          </p>
          <div className="animate-fade-in-up animation-delay-300">
            <Link href="/dashboard">
              <Button size="lg">
                Get Started for Free
                <svg
                  className="ml-2 h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </Button>
            </Link>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="bg-secondary/60 backdrop-blur-lg py-20 md:py-28">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
              How It Works
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <Card key={index} className="text-center shadow-lg hover:shadow-primary/20 transition-shadow duration-300 bg-background/50">
                  <CardHeader>
                    <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit">
                      {feature.icon}
                    </div>
                    <CardTitle className="pt-4">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-20 md:py-28">
            <div className="container mx-auto px-4">
                <div className="space-y-6 max-w-3xl mx-auto text-center">
                    <h2 className="text-3xl md:text-4xl font-bold">
                        Everything You Need, Nothing You Don't
                    </h2>
                    <p className="text-muted-foreground text-lg">
                        ScanWise is designed to be powerful yet simple. We focus on the core features that help you manage your pantry, small business, or personal collection efficiently.
                    </p>
                    <ul className="space-y-4 inline-block text-left">
                        {benefits.map((benefit, index) => (
                            <li key={index} className="flex items-center gap-3">
                                {benefit.icon}
                                <span className="text-lg">{benefit.text}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </section>
      </main>

      <footer className="bg-secondary/60 backdrop-blur-lg">
        <div className="container mx-auto px-4 py-6 text-center text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} ScanWise. All Rights Reserved.</p>
        </div>
      </footer>
    </div>
  );
}
