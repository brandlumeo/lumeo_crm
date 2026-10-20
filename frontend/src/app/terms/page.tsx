import Link from "next/link";
import { FileText, ArrowLeft, Mail } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Lumeo CRM",
  description: "Terms and conditions of service for Lumeo CRM platform and integrations.",
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-[#FDFCFB] text-[#1A1A1A] py-16 px-4 sm:px-6 lg:px-8 font-sans selection:bg-[#eb5e28] selection:text-white">
      <div className="max-w-3xl mx-auto space-y-10">
        
        {/* Header Navigation */}
        <div className="flex items-center justify-between pb-6 border-b border-black/10">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-sm font-medium text-black/60 hover:text-black transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Lumeo CRM
          </Link>
          <span className="text-xs font-semibold uppercase tracking-wider text-black/40">
            Effective Date: October 2026
          </span>
        </div>

        {/* Title */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#eb5e28]/10 text-[#eb5e28] text-xs font-semibold tracking-wide uppercase">
            <FileText className="w-3.5 h-3.5" />
            Terms of Service
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-black sm:text-5xl">
            Terms of Service
          </h1>
          <p className="text-base text-black/70 leading-relaxed">
            Welcome to <strong>Lumeo CRM</strong>, operated by <strong>Brandlumeo</strong>. By accessing or using our website (<strong>lumeo.estgrp.in</strong>), applications, APIs, or integrations with third-party platforms (including Meta Platforms, Inc.), you agree to be bound by these Terms of Service.
          </p>
        </div>

        {/* Policy Body */}
        <div className="space-y-8 text-black/80 leading-relaxed text-sm sm:text-base">
          
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-black">
              1. Acceptance of Terms
            </h2>
            <p>
              By registering for an account or using Lumeo CRM, you confirm that you are at least 18 years old, possess the legal authority to bind your organization to these terms, and agree to abide by all applicable local and international laws.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-black">
              2. Description of Service
            </h2>
            <p>
              Lumeo CRM provides cloud-based software for managing customer relationships, sales leads, communication workflows, quotations, invoicing, attendance, and marketing integrations. We grant you a non-exclusive, non-transferable, revocable license to access and use our platform in accordance with your subscription plan.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-black">
              3. Meta (Facebook &amp; Instagram) Integration Terms
            </h2>
            <p>
              When connecting your Meta accounts to Lumeo CRM:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>You represent that you have administrative authority over the Facebook Pages and Instagram accounts connected.</li>
              <li>You agree to comply with Meta&apos;s Commercial Terms, Advertising Standards, and Platform Policies at all times.</li>
              <li>Lumeo CRM acts solely as a technical data conduit to synchronize authorized leads and events on your behalf.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-black">
              4. User Responsibilities &amp; Acceptable Use
            </h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Use the platform for spamming, harassment, unlawful telemarketing, or violating consumer privacy laws.</li>
              <li>Attempt to reverse-engineer, exploit vulnerabilities, or disrupt the operation of Lumeo CRM.</li>
              <li>Store or transmit sensitive restricted categories of data without required consent.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-black">
              5. Termination
            </h2>
            <p>
              You may terminate your account at any time. We reserve the right to suspend or terminate accounts that breach these Terms or engage in fraudulent activities.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-black">
              6. Contact Information
            </h2>
            <p>
              For legal questions or notices regarding these Terms:
            </p>
            <div className="p-4 rounded-xl border border-black/10 bg-white space-y-1">
              <p className="font-semibold text-black">Lumeo CRM / Brandlumeo</p>
              <p className="text-sm text-black/70 flex items-center gap-2">
                <Mail className="w-4 h-4 text-black/40" />
                Email: <a href="mailto:cvshamil39@gmail.com" className="text-[#eb5e28] underline">cvshamil39@gmail.com</a>
              </p>
              <p className="text-sm text-black/70">
                Website: <a href="https://lumeo.estgrp.in" className="text-[#eb5e28] underline">https://lumeo.estgrp.in</a>
              </p>
            </div>
          </section>

        </div>

        {/* Footer */}
        <div className="pt-8 border-t border-black/10 text-center text-xs text-black/50">
          &copy; {new Date().getFullYear()} Lumeo CRM &bull; Brandlumeo. All rights reserved.
        </div>

      </div>
    </div>
  );
}
