"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { IndianRupee, Layers } from "lucide-react";

import Link from "next/link";
import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { PageShell } from "@/components/page-shell";
import { CustomFieldsFormInputs } from "@/components/custom-fields-form-inputs";
import { createDeal } from "@/lib/api";
import { useDealPage, useCurrentCompany } from "@/lib/queries";
import type { DealInput } from "@/lib/types";
import { formatDateTime, formatINR, toNumber } from "@/lib/utils";

const PAGE_SIZE = 20;

function getStageLabel(stage: string, company: any) {
  if (!company?.deal_pipelines) return stage.replaceAll("_", " ");
  const found = company.deal_pipelines.find((s: any) => s.name.toLowerCase() === stage);
  return found ? found.name : stage.replaceAll("_", " ");
}

function getStageColor(stage: string, company: any) {
  if (!company?.deal_pipelines) return undefined;
  const found = company.deal_pipelines.find((s: any) => s.name.toLowerCase() === stage);
  return found ? found.color : undefined;
}

export default function DealsPage() {
  const queryClient = useQueryClient();
  const { data: company } = useCurrentCompany();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("");
  const [form, setForm] = useState<DealInput>({
    title: "",
    amount: "",
    stage: "prospect",
    deal_category: "",
    expected_close_date: null,
    custom_data: {},
  });

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    if ((company?.deal_pipelines?.length ?? 0) > 0 && form.stage === "prospect") {
      setForm(f => ({ ...f, stage: company?.deal_pipelines![0].name.toLowerCase() }));
    }
  }, [company]);

  const { data, isLoading } = useDealPage({
    page,
    search,
    stage: stage || undefined,
    ordering: "-created_at",
  });

  const mutation = useMutation({
    mutationFn: createDeal,
    onSuccess: () => {
      setForm({ title: "", amount: "", stage: "prospect", deal_category: "", expected_close_date: null, custom_data: {} });
      void queryClient.invalidateQueries({ queryKey: ["crm"] });
      void queryClient.invalidateQueries({ queryKey: ["crm-counts"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard-bundle"] });
    },
  });

  const rows = data?.results ?? [];

  return (
    <PageShell
      eyebrow="Deals"
      title="Pipeline, your way."
      description="Every stage change feeds the dashboard board, revenue trend, and pipeline value. Add deals here and they show up everywhere else in Lumeo."
    >
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.65fr)_360px] gap-6">
        <div className="card animate-rise">
          <div className="card-head flex-col items-start gap-4 sm:flex-row sm:items-center">
            <div className="card-title">
              Deal list
              <span className="card-title-meta">{data?.count ?? 0} total deals</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <Link href="/pipeline" className="btn mr-2" style={{ height: "40px", gap: "6px" }}>
                <Layers className="w-4 h-4 text-accent" />
                <span>Board View</span>
              </Link>
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                className="input sm:w-[220px]"
                placeholder="Search deals"
              />
              <select
                value={stage}
                onChange={(event) => {
                  setStage(event.target.value);
                  setPage(1);
                }}
                className="select sm:w-[180px]"
              >
                <option value="">All stages</option>
                {company?.deal_pipelines?.map((stage: any) => (
                  <option key={stage.id} value={stage.name.toLowerCase()}>
                    {stage.name}
                  </option>
                )) || (
                  <>
                    <option value="prospect">Prospect</option>
                    <option value="qualified">Qualified</option>
                    <option value="proposal">Proposal</option>
                    <option value="negotiation">Negotiation</option>
                    <option value="won">Won</option>
                    <option value="lost">Lost</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {!mounted || (isLoading && !data) ? (
            <div className="p-6 text-sm text-muted">Loading deals...</div>
          ) : rows.length === 0 ? (
            <EmptyState
              icon={Layers}
              title="No deals found"
              description="Create a deal on the right, or widen the current search and stage filters."
            />
          ) : (
            <DataTable
              columns={[
                {
                  key: "title",
                  header: "Deal",
                  render: (deal) => (
                    <Link href={`/deals/${deal.id}`} className="font-medium text-ink hover:text-accent transition-colors hover:underline">
                      {deal.title}
                    </Link>
                  ),
                },
                {
                  key: "deal_category",
                  header: "Category",
                  render: (deal) => deal.deal_category ? (
                    <span className="text-muted text-[13px]">{deal.deal_category}</span>
                  ) : <span className="text-muted/50 text-[13px]">-</span>
                },
                {
                  key: "stage",
                  header: "Stage",
                  sortable: true,
                  render: (deal) => (
                    <span 
                      className="chip"
                      style={getStageColor(deal.stage, company) ? { borderColor: getStageColor(deal.stage, company), color: getStageColor(deal.stage, company), backgroundColor: `${getStageColor(deal.stage, company)}15` } : undefined}
                    >
                      {getStageLabel(deal.stage, company)}
                    </span>
                  ),
                },
                {
                  key: "amount",
                  header: "Amount",
                  render: (deal) => (
                    <span className="font-serif text-[18px] text-ink">
                      {formatINR(toNumber(deal.amount))}
                    </span>
                  ),
                },
                {
                  key: "created_at",
                  header: "Created",
                  render: (deal) => formatDateTime(deal.created_at),
                },
              ]}
              rows={rows}
              count={data?.count ?? 0}
              page={page}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          )}
        </div>

        <div className="card animate-rise">
          <div className="card-head">
            <div className="card-title">
              New deal
              <span className="card-title-meta">Pipeline entry</span>
            </div>
          </div>
          <form
            className="p-5 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              mutation.mutate(form);
            }}
          >
            <label>
              <span className="label">Deal title</span>
              <input
                required
                className="input"
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Annual enterprise rollout"
              />
            </label>
            <label>
              <span className="label">Amount</span>
              <input
                required
                className="input"
                value={form.amount}
                onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
                placeholder="250000"
              />
            </label>
            <label>
              <span className="label">Stage</span>
              <select
                className="select"
                value={form.stage}
                onChange={(event) => setForm((current) => ({ ...current, stage: event.target.value }))}
              >
                {company?.deal_pipelines?.map((stage: any) => (
                  <option key={stage.id} value={stage.name.toLowerCase()}>
                    {stage.name}
                  </option>
                )) || (
                  <>
                    <option value="prospect">Prospect</option>
                    <option value="qualified">Qualified</option>
                    <option value="proposal">Proposal</option>
                    <option value="negotiation">Negotiation</option>
                    <option value="won">Won</option>
                    <option value="lost">Lost</option>
                  </>
                )}
              </select>
            </label>
            {(company?.deal_categories && company.deal_categories.length > 0) ? (
              <label>
                <span className="label">Category</span>
                <select
                  className="select"
                  value={form.deal_category || ""}
                  onChange={(event) => setForm((current) => ({ ...current, deal_category: event.target.value }))}
                >
                  <option value="">None</option>
                  {company.deal_categories.map((cat: any) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label>
              <span className="label">Expected close date</span>
              <input
                type="date"
                className="input"
                value={form.expected_close_date || ""}
                onChange={(event) => setForm((current) => ({ ...current, expected_close_date: event.target.value || null }))}
              />
            </label>

            <CustomFieldsFormInputs
              modelName="deal"
              values={form.custom_data || {}}
              onChange={(custom_data) => setForm((current) => ({ ...current, custom_data }))}
            />

            {mutation.isError ? (
              <div className="chip chip-warning justify-center">
                Could not create deal. Check the data and try again.
              </div>
            ) : null}

            <button type="submit" disabled={mutation.isPending} className="btn btn-primary w-full justify-center">
              {mutation.isPending ? "Creating..." : "Create deal"}
            </button>

            <div className="surface-muted p-4 text-[12px] text-muted flex items-start gap-2">
              <IndianRupee className="w-4 h-4 mt-0.5 text-ink-2" />
              Use raw numeric values for now. Lumeo formats them as INR after the record is saved.
            </div>
          </form>
        </div>
      </div>
    </PageShell>
  );
}
