// A4 PCB document using pdf-lib (Worker-compatible). Source labels and internal data are never printed.
import { PDFDocument, StandardFonts, rgb, degrees, type PDFFont, type PDFPage } from "pdf-lib";
import type { CandidateSnapshot, FullVersion } from "./pcb.server";
import { dataSectionEmpty, pcbDisplayId, plannedDays } from "./model";

const A4 = { w: 595.28, h: 841.89 };
const M = 56;
const INK = rgb(0.12, 0.13, 0.15);
const MUTED = rgb(0.42, 0.44, 0.47);
const ACCENT = rgb(0.06, 0.45, 0.42);
const RULE = rgb(0.85, 0.86, 0.87);

/** Standard fonts only support WinAnsi; replace anything else. */
function clean(s: unknown): string {
  return String(s ?? "")
    .replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/[\u2013\u2014]/g, "-").replace(/\u2026/g, "...")
    .replace(/[\u2022\u25CF]/g, "-").replace(/\u20B9/g, "Rs.").replace(/\u2192/g, "->").replace(/\t/g, "  ")
    .replace(/[^\x0A\x20-\x7E\xA0-\xFF]/g, "");
}
const label = (s: string | null | undefined) => (s ? s.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : "");
const fmtDate = (d: string | null | undefined) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-");

export async function buildPcbPdf({ version: v, pcbCode, candidate: c, draft }: { version: FullVersion; pcbCode: string; candidate: CandidateSnapshot; draft: boolean }) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const id = pcbDisplayId(pcbCode, v.version);
  doc.setTitle(`Personal Career Blueprint - ${clean(c.full_name)} - ${id}`);
  doc.setAuthor("Coding361");

  let page: PDFPage = doc.addPage([A4.w, A4.h]);
  let y = A4.h - M;
  const newPage = () => { page = doc.addPage([A4.w, A4.h]); y = A4.h - M; };
  const ensure = (h: number) => { if (y - h < M + 20) newPage(); };

  const wrap = (text: string, f: PDFFont, size: number, width: number) => {
    const lines: string[] = [];
    for (const para of clean(text).split("\n")) {
      if (!para.trim()) { lines.push(""); continue; }
      let line = "";
      for (const word of para.split(/\s+/)) {
        const t = line ? `${line} ${word}` : word;
        if (f.widthOfTextAtSize(t, size) > width && line) { lines.push(line); line = word; } else line = t;
      }
      lines.push(line);
    }
    return lines;
  };
  const text = (t: string, o: { size?: number; f?: PDFFont; color?: ReturnType<typeof rgb>; indent?: number; gap?: number } = {}) => {
    const size = o.size ?? 10, f = o.f ?? font, x = M + (o.indent ?? 0);
    for (const line of wrap(t, f, size, A4.w - M - x)) {
      ensure(size * 1.45);
      page.drawText(line, { x, y: y - size, size, font: f, color: o.color ?? INK });
      y -= size * 1.45;
    }
    y -= o.gap ?? 4;
  };
  const heading = (t: string) => {
    ensure(60);
    y -= 10;
    page.drawText(clean(t), { x: M, y: y - 15, size: 15, font: bold, color: INK });
    y -= 22;
    page.drawLine({ start: { x: M, y }, end: { x: M + 40, y }, thickness: 2, color: ACCENT });
    y -= 12;
  };
  const sub = (t: string) => { ensure(30); y -= 4; text(t, { f: bold, size: 11, gap: 2 }); };
  const kv = (pairs: [string, unknown][]) => {
    for (const [k, val] of pairs) {
      if (val == null || val === "") continue;
      ensure(16);
      page.drawText(clean(k), { x: M, y: y - 9.5, size: 9.5, font: bold, color: MUTED });
      const lines = wrap(String(val), font, 10, A4.w - M * 2 - 150);
      lines.forEach((l, i) => { if (i) ensure(14); page.drawText(l, { x: M + 150, y: y - 10, size: 10, font, color: INK }); y -= 14.5; });
      y -= 2;
    }
    y -= 4;
  };
  const bullets = (items: string[]) => items.filter(Boolean).forEach((b) => text(`-  ${b}`, { indent: 6, gap: 1 }));

  // Cover
  page.drawRectangle({ x: 0, y: A4.h - 8, width: A4.w, height: 8, color: ACCENT });
  page.drawText("CODING361", { x: M, y: A4.h - 120, size: 13, font: bold, color: ACCENT });
  page.drawText("Personal Career Blueprint", { x: M, y: A4.h - 170, size: 30, font: bold, color: INK });
  y = A4.h - 230;
  text(c.full_name, { size: 18, f: bold, gap: 6 });
  text(v.primary_target_role ? `Target role: ${v.primary_target_role}` : "", { size: 12, color: MUTED, gap: 30 });
  kv([["Candidate ID", c.candidate_code], ["PCB ID", id], ["PCB Version", `V${v.version}`], ["Career path", v.primary_career_path], ["Duration", `${v.target_duration_days} days`], ["Date", fmtDate(v.approved_at ?? new Date().toISOString())], ["Status", draft ? "DRAFT - not approved" : "Approved"]]);

  const snap = (v.assessment_snapshot ?? {}) as { assessment_id?: string; assessment_date?: string; overall_score?: number; outcome?: string; summary?: string; strengths?: string[]; development_areas?: string[]; primary?: Record<string, string | null>; alternative?: Record<string, string | null> };
  const byPhase = (pid: string) => v.pcb_modules.filter((m) => m.phase_id === pid);
  const items = (mid: string) => v.pcb_day_items.filter((i) => i.module_id === mid);

  const renderData = (code: string) => {
    switch (code) {
      case "DATA_CANDIDATE":
        kv([["Name", c.full_name], ["Candidate ID", c.candidate_code], ["Education", c.education.join("; ")], ["Employment status", label(c.employment_status)], ["Experience", c.total_experience != null ? `${c.total_experience} years` : null], ["Current / last role", c.last_designation], ["Career gap", c.has_career_gap ? c.gap_duration || "Yes" : "No"], ["Existing skills", c.existing_skills], ["Preferred location", v.preferred_location ?? c.preferred_locations], ["Program plan", label(c.program_plan)]]);
        if (v.current_profile_summary) text(v.current_profile_summary);
        break;
      case "DATA_ASSESSMENT":
        if (!snap.assessment_id) { text("This blueprint was prepared without a finalized career assessment.", { color: MUTED }); break; }
        kv([["Assessment date", fmtDate(snap.assessment_date as string)], ["Overall score", snap.overall_score != null ? `${snap.overall_score} / 100` : null], ["Outcome", label(snap.outcome as string)]]);
        if (snap.strengths?.length) { sub("Strengths"); bullets(snap.strengths); }
        if (snap.development_areas?.length) { sub("Development areas"); bullets(snap.development_areas); }
        if (snap.summary) { sub("Consultant summary"); text(String(snap.summary)); }
        break;
      case "DATA_DIRECTION":
        kv([["Career transition goal", v.transition_goal], ["Primary career path", v.primary_career_path], ["Primary target role", v.primary_target_role], ["Alternative path", v.alt_career_path], ["Alternative role", v.alt_target_role], ["Target industry", v.target_industry], ["Preferred location", v.preferred_location], ["Expected outcome", v.expected_outcome]]);
        if (v.rationale) { sub("Recommendation rationale"); text(v.rationale); }
        break;
      case "DATA_SKILL_GAPS":
        for (const g of v.pcb_skill_gaps) {
          sub(`${g.skill}  (${label(g.priority)} priority)`);
          text([g.current_level && `Current: ${label(g.current_level)}`, g.target_level && `Target: ${label(g.target_level)}`].filter(Boolean).join("   |   "), { color: MUTED, size: 9.5, gap: 1 });
          if (g.description) text(g.description, { gap: 1 });
          if (g.action) text(`Recommended action: ${g.action}`);
        }
        break;
      case "DATA_CAPABILITIES":
        for (const cap of v.pcb_target_capabilities) { sub(cap.title); if (cap.description) text(cap.description, { gap: 1 }); if (cap.evidence) text(`Evidence: ${cap.evidence}`, { color: MUTED }); }
        break;
      case "DATA_RESOURCES":
        for (const r of v.pcb_resources) {
          sub(r.name);
          text([r.provider, label(r.resource_type), r.is_paid ? `Paid${r.estimated_cost ? ` (Rs. ${r.estimated_cost})` : ""}` : "Free"].filter(Boolean).join("  |  "), { color: MUTED, size: 9.5, gap: 1 });
          if (r.url) text(r.url, { size: 9, color: ACCENT, gap: 1 });
          if (r.section || r.start_ref) text([r.course_name, r.section, r.start_ref && `from ${r.start_ref}`, r.end_ref && `to ${r.end_ref}`].filter(Boolean).join(", "), { size: 9.5 });
        }
        break;
      case "DATA_CURRICULUM":
        text(`${plannedDays(v.pcb_day_items)} planned days  |  ${v.daily_hours ?? "-"} hours/day  |  ${v.weekly_days ?? "-"} days/week`, { color: MUTED, gap: 8 });
        for (const p of v.pcb_phases) {
          ensure(50);
          text(`${p.name}${p.start_day ? `  (Day ${p.start_day}${p.end_day ? `-${p.end_day}` : ""})` : ""}`, { f: bold, size: 12, color: ACCENT, gap: 2 });
          if (p.objective) text(p.objective, { color: MUTED, size: 9.5 });
          for (const m of byPhase(p.id)) {
            text(m.name, { f: bold, size: 10.5, indent: 8, gap: 1 });
            for (const it of items(m.id)) text(`${it.day_number ? `Day ${it.day_number}: ` : ""}${it.title}${it.expected_output ? ` - ${it.expected_output}` : ""}`, { indent: 18, size: 9.5, gap: 1 });
            y -= 3;
          }
        }
        break;
      case "DATA_MILESTONES":
        for (const m of v.pcb_milestones) { sub(`${m.target_day ? `Day ${m.target_day} - ` : ""}${m.name}`); if (m.description) text(m.description, { gap: 1 }); if (m.evidence) text(`Evidence: ${m.evidence}`, { color: MUTED }); }
        break;
      case "DATA_PROJECTS":
        for (const p of v.pcb_projects) {
          sub(`${p.name}  (${label(p.project_type)})`);
          kv([["Business scenario", p.scenario], ["Description", p.description], ["Technologies", p.technologies], ["Expected features", p.features], ["Deliverables", p.deliverables], ["Timeline", p.start_day ? `Day ${p.start_day}${p.end_day ? ` - ${p.end_day}` : ""}` : null], ["Difficulty", label(p.difficulty)], ["Why this project", p.selection_reason]]);
        }
        break;
      case "DATA_WEEKLY":
        for (const w of v.pcb_weekly_reviews) {
          sub(`${w.week_number ? `Week ${w.week_number}: ` : ""}${w.title}`);
          if (w.expected_progress) text(w.expected_progress, { gap: 1 });
          bullets(v.pcb_weekly_review_items.filter((i) => i.weekly_review_id === w.id).map((i) => i.item));
        }
        break;
    }
  };

  for (const b of v.pcb_content_blocks.filter((x) => x.is_included && x.code !== "DATA_COVER")) {
    const hasData = b.block_type === "DATA";
    if (!hasData && !(b.content ?? "").trim()) continue;
    if (hasData && b.code && dataSectionEmpty(b.code, v) && !(b.content ?? "").trim()) continue;
    heading(b.title);
    if (b.content?.trim()) text(b.content, { gap: 8 });
    if (hasData && b.code) renderData(b.code);
  }

  const pages = doc.getPages();
  pages.forEach((p, i) => {
    p.drawLine({ start: { x: M, y: 40 }, end: { x: A4.w - M, y: 40 }, thickness: 0.5, color: RULE });
    p.drawText(clean(`Coding361  |  ${id}  |  ${c.full_name}`), { x: M, y: 26, size: 8, font, color: MUTED });
    const n = `${i + 1} / ${pages.length}`;
    p.drawText(n, { x: A4.w - M - font.widthOfTextAtSize(n, 8), y: 26, size: 8, font, color: MUTED });
    if (draft) p.drawText("DRAFT", { x: 150, y: 300, size: 110, font: bold, color: rgb(0.85, 0.2, 0.2), opacity: 0.12, rotate: degrees(40) });
  });
  return await doc.save();
}
