"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2 } from "lucide-react";

import { acceptInvite, fetchInviteDetails, storeTokens } from "@/lib/api";
import { useQueryClient, useQuery } from "@tanstack/react-query";

const acceptSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type AcceptForm = z.infer<typeof acceptSchema>;

function AcceptInviteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const queryClient = useQueryClient();

  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AcceptForm>({
    resolver: zodResolver(acceptSchema),
  });

  const { data: inviteDetails, isLoading: isLoadingInvite } = useQuery({
    queryKey: ["invite-details", token],
    queryFn: () => fetchInviteDetails(token!),
    enabled: Boolean(token),
  });

  useEffect(() => {
    if (inviteDetails) {
      if (inviteDetails.first_name) setValue("first_name", inviteDetails.first_name);
      if (inviteDetails.last_name) setValue("last_name", inviteDetails.last_name);
    }
  }, [inviteDetails, setValue]);

  const onSubmit = async (data: AcceptForm) => {
    if (!token) {
      setError("No invite token provided in URL.");
      return;
    }

    try {
      setError("");
      const tokens = await acceptInvite({ ...data, token });
      storeTokens(tokens);
      await queryClient.invalidateQueries();
      router.replace("/dashboard");
    } catch (err: any) {
      const data = err.response?.data;
      if (data) {
        if (data.error) {
          setError(data.error);
          return;
        }
        
        // Handle field validation errors (like "password")
        const firstErrorKey = Object.keys(data)[0];
        if (firstErrorKey && Array.isArray(data[firstErrorKey])) {
          setError(data[firstErrorKey][0]);
          return;
        }
      }
      
      setError("Failed to accept invite. The link may have expired.");
    }
  };

  if (!token) {
    return (
      <div className="text-center">
        <h2 className="text-2xl font-serif text-ink mb-2">Invalid Invite</h2>
        <p className="text-muted text-sm">No invite token was found in the URL.</p>
      </div>
    );
  }

  if (isLoadingInvite) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted mb-4" />
        <p className="text-sm text-muted">Loading invitation details...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[360px]">
      <div className="mb-10 text-center">
        <h1 className="text-[28px] font-serif text-ink tracking-tight mb-2">
          Join {inviteDetails?.company_name || "Workspace"}
        </h1>
        <p className="text-[14px] text-ink font-medium mt-1">
          {inviteDetails?.designation ? `Invited as ${inviteDetails.designation}` : "Team Invitation"}
          {inviteDetails?.department ? ` (${inviteDetails.department})` : ""}
        </p>
        <p className="text-[13px] text-muted mt-2">
          Set up your account details to accept the invitation.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <div className="p-3 text-[13px] text-red-600 bg-red-50 border border-red-100 rounded-md">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[12px] font-medium text-muted mb-1.5 uppercase tracking-wider">
              First name
            </label>
            <input
              {...register("first_name")}
              type="text"
              className="w-full bg-bone border border-line rounded-md px-3 py-2 text-[14px] outline-none focus:border-ink transition-colors"
            />
            {errors.first_name && (
              <p className="mt-1.5 text-[12px] text-red-500">
                {errors.first_name.message}
              </p>
            )}
          </div>
          <div>
            <label className="block text-[12px] font-medium text-muted mb-1.5 uppercase tracking-wider">
              Last name
            </label>
            <input
              {...register("last_name")}
              type="text"
              className="w-full bg-bone border border-line rounded-md px-3 py-2 text-[14px] outline-none focus:border-ink transition-colors"
            />
            {errors.last_name && (
              <p className="mt-1.5 text-[12px] text-red-500">
                {errors.last_name.message}
              </p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-[12px] font-medium text-muted mb-1.5 uppercase tracking-wider">
            Password
          </label>
          <input
            {...register("password")}
            type="password"
            className="w-full bg-bone border border-line rounded-md px-3 py-2 text-[14px] outline-none focus:border-ink transition-colors"
          />
          {errors.password && (
            <p className="mt-1.5 text-[12px] text-red-500">
              {errors.password.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full mt-4 bg-ink text-paper py-2.5 rounded-md text-[14px] font-medium hover:bg-ink/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          Accept Invite
        </button>
      </form>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-bone">
      <div className="flex flex-col justify-between p-8 sm:p-12 h-full">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-6 h-6 bg-ink rounded grid place-items-center text-paper font-serif italic font-bold text-sm">
            L
          </div>
          <span className="font-serif text-xl tracking-tight text-ink">
            Lumeo
          </span>
        </Link>

        <div className="flex-1 flex flex-col justify-center items-center py-12">
          <Suspense fallback={<Loader2 className="w-8 h-8 animate-spin text-muted" />}>
            <AcceptInviteForm />
          </Suspense>
        </div>

        <div className="text-[11px] text-muted font-mono">Copyright Lumeo 2026</div>
      </div>

      <div className="hidden lg:flex relative bg-ink text-paper p-16 flex-col justify-between overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,91,31,0.25),transparent_60%)] pointer-events-none" />
        <div className="relative">
          <div className="text-[11px] uppercase tracking-[0.18em] text-accent mb-4">
            Premium pipeline control
          </div>
          <h2 className="font-serif text-[64px] leading-[0.95] max-w-md">
            Built for teams who close the <em className="text-accent not-italic">whole quarter.</em>
          </h2>
        </div>
        <div className="relative grid grid-cols-3 gap-6 text-xs text-paper/70 max-w-md">
          <div>
            <div className="font-mono text-2xl text-paper mb-1">14d</div>
            free trial
          </div>
          <div>
            <div className="font-mono text-2xl text-paper mb-1">0</div>
            card up front
          </div>
          <div>
            <div className="font-mono text-2xl text-paper mb-1">5</div>
            live CRM views
          </div>
        </div>
      </div>
    </div>
  );
}

