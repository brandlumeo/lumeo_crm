import Link from "next/link";
import { Shield, ArrowLeft, Mail, Lock } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Lumeo CRM",
  description: "Privacy Policy and User Data Handling for Lumeo CRM and Meta integrations.",
};

export default function PrivacyPolicyPage() {
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
            <Shield className="w-3.5 h-3.5" />
            Compliance & Transparency
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-black sm:text-5xl">
            Privacy Policy
          </h1>
          <p className="text-base text-black/70 leading-relaxed">
            This Privacy Policy describes how <strong>Lumeo CRM</strong> (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;), operated by <strong>Brandlumeo</strong>, collects, uses, and safeguards information when you use our Customer Relationship Management (CRM) platform, website (<strong>lumeo.estgrp.in</strong>), and related Meta (Facebook &amp; Instagram) integrations.
          </p>
        </div>

        {/* Policy Body */}
        <div className="space-y-8 text-black/80 leading-relaxed text-sm sm:text-base">
          
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-black flex items-center gap-2">
              1. Information We Collect
            </h2>
            <p>
              When you use Lumeo CRM, we may collect the following categories of information:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Account &amp; Profile Information:</strong> Name, work email address, phone number, company name, and authentication credentials.
              </li>
              <li>
                <strong>Meta / Facebook Integration Data:</strong> When you connect your Facebook or Instagram account, we receive authorized public profile information, Facebook Page IDs, Page Access Tokens, and lead data generated through your Meta Lead Ads campaigns.
              </li>
              <li>
                <strong>Lead Information:</strong> Contact details (names, phone numbers, emails, inquiry questions) submitted by your customers through your marketing campaigns.
              </li>
              <li>
                <strong>Technical &amp; Usage Data:</strong> IP address, browser type, device information, and interaction logs within the CRM dashboard to maintain service security and reliability.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-black flex items-center gap-2">
              2. How We Use Your Information
            </h2>
            <p>We use the collected information exclusively to:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Provide, maintain, and operate the Lumeo CRM platform and its multi-tenant workspaces.</li>
              <li>Instantly synchronize incoming leads from Facebook and Instagram Lead Ads into your designated company sales pipeline.</li>
              <li>Send automated lead alerts, follow-up messages, and team notifications via your configured channels (Email, WhatsApp).</li>
              <li>Enable quality feedback reporting back to Meta Conversions API (CAPI) to optimize your marketing performance.</li>
              <li>Provide customer support, resolve technical issues, and ensure platform security.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-black flex items-center gap-2">
              3. Data Sharing &amp; Third-Party Services
            </h2>
            <p>
              <strong>We never sell, rent, or trade your personal data or your leads&apos; information to any third party.</strong>
            </p>
            <p>We only share data with trusted infrastructure providers essential to delivering our service:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Meta Platforms, Inc.:</strong> For Graph API and Webhook data synchronization of authorized advertising campaigns.</li>
              <li><strong>Secure Cloud Hosting:</strong> Enterprise-grade database and server infrastructure with strict data isolation per company workspace.</li>
              <li><strong>Legal Compliance:</strong> When required by law or lawful court order.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-black flex items-center gap-2">
              4. Data Security &amp; Isolation
            </h2>
            <p>
              Lumeo CRM utilizes industry-standard encryption protocols (HTTPS/TLS in transit, encrypted storage at rest). Each company&apos;s data is strictly partitioned using multi-tenant architecture, ensuring no unauthorized cross-organization data access can occur.
            </p>
          </section>

          {/* Explicit User Data Deletion Instructions required by Meta */}
          <section className="space-y-4 p-6 rounded-2xl bg-black/[0.03] border border-black/10">
            <h2 className="text-xl font-bold text-black flex items-center gap-2">
              <Lock className="w-5 h-5 text-[#eb5e28]" />
              5. User Data Deletion Instructions
            </h2>
            <p>
              In accordance with Meta Platform policies and international privacy regulations, you have full control over your data and can request complete deletion of your data at any time:
            </p>
            <ol className="list-decimal pl-5 space-y-2">
              <li>
                <strong>Disconnecting Meta Integration:</strong> You can disconnect your Facebook and Instagram integration at any time by navigating to <em>Settings &rarr; Meta &amp; Facebook Leads &rarr; Disconnect Page</em> within your Lumeo CRM account. This instantly revokes all access tokens and stops webhook lead reception.
              </li>
              <li>
                <strong>Complete Account &amp; Lead Deletion:</strong> To request permanent deletion of your account, company profile, and all synchronized lead records, please send an email to <a href="mailto:cvshamil39@gmail.com" className="text-[#eb5e28] underline font-medium">cvshamil39@gmail.com</a> with the subject line <em>&quot;Data Deletion Request - Lumeo CRM&quot;</em> along with your company name or registered email.
              </li>
              <li>
                <strong>Processing Timeline:</strong> We verify all requests and permanently purge all associated personal data from active databases and backups within <strong>7 business days</strong>, providing confirmation upon completion.
              </li>
            </ol>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-black flex items-center gap-2">
              6. Contact Us
            </h2>
            <p>
              If you have any questions, concerns, or inquiries regarding this Privacy Policy or our data handling practices, please contact our Data Protection representative:
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
