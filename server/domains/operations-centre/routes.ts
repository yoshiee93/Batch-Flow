import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "../../db";
import { asyncHandler } from "../../lib/asyncHandler";
import { requirePermission } from "../../lib/authMiddleware";

export const operationsCentreRouter = Router();

const canView = requirePermission("operations_log.view");

function parseDateRange(from?: string, to?: string, defaultDays = 30) {
  let fromDate: Date;
  let toDate: Date;
  if (from && to) {
    fromDate = new Date(from);
    toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);
  } else {
    toDate = new Date();
    fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - defaultDays);
  }
  return { fromDate, toDate };
}

operationsCentreRouter.get("/operations-centre/overview", canView, asyncHandler(async (req, res) => {
  const { from, to } = req.query as Record<string, string | undefined>;
  const { fromDate, toDate } = parseDateRange(from, to);

  const [statsResult, avgResult, recentExt, recentIssues, recentAssessments, recentComments] = await Promise.all([
    db.execute(sql`
      SELECT
        COUNT(DISTINCT ol.source_id)::int AS production_runs,
        COUNT(DISTINCT CASE WHEN ol.note_type = 'drying_extension' THEN ol.source_id END)::int AS batches_with_extensions,
        COUNT(*) FILTER (WHERE ol.note_type = 'drying_extension')::int AS drying_extensions,
        COUNT(*) FILTER (WHERE ol.severity = 'issue' AND ol.status = 'open')::int AS open_issues,
        COUNT(*) FILTER (WHERE ol.status = 'open')::int AS unreviewed_entries,
        COUNT(*) FILTER (WHERE ol.severity = 'warning')::int AS warning_count,
        COUNT(*) FILTER (WHERE ol.severity = 'issue')::int AS issue_count
      FROM operations_log ol
      WHERE ol.created_at BETWEEN ${fromDate} AND ${toDate}
    `),
    db.execute(sql`
      SELECT ROUND(AVG(b.drying_time_hours::numeric), 2) AS avg_drying_time
      FROM batches b
      WHERE b.drying_time_hours IS NOT NULL
        AND b.created_at BETWEEN ${fromDate} AND ${toDate}
    `),
    db.execute(sql`
      SELECT ol.id, ol.batch_id, ol.source_id, ol.batch_number, ol.product_name,
             ol.machine, ol.note_type, ol.content, ol.severity, ol.status, ol.created_at
      FROM operations_log ol
      WHERE ol.note_type = 'drying_extension'
        AND ol.created_at BETWEEN ${fromDate} AND ${toDate}
      ORDER BY ol.created_at DESC
      LIMIT 10
    `),
    db.execute(sql`
      SELECT ol.id, ol.batch_id, ol.source_id, ol.batch_number, ol.product_name,
             ol.machine, ol.note_type, ol.content, ol.severity, ol.status, ol.created_at
      FROM operations_log ol
      WHERE ol.severity IN ('warning','issue')
        AND ol.created_at BETWEEN ${fromDate} AND ${toDate}
      ORDER BY ol.created_at DESC
      LIMIT 10
    `),
    db.execute(sql`
      SELECT ol.id, ol.batch_id, ol.source_id, ol.batch_number, ol.product_name,
             ol.machine, ol.note_type, ol.content, ol.severity, ol.status, ol.created_at
      FROM operations_log ol
      WHERE ol.note_type = 'product_assessment'
        AND ol.created_at BETWEEN ${fromDate} AND ${toDate}
      ORDER BY ol.created_at DESC
      LIMIT 10
    `),
    db.execute(sql`
      SELECT ol.id, ol.batch_id, ol.source_id, ol.batch_number, ol.product_name,
             ol.machine, ol.note_type, ol.content, ol.severity, ol.status, ol.created_at
      FROM operations_log ol
      WHERE ol.note_type = 'final_comment'
        AND ol.created_at BETWEEN ${fromDate} AND ${toDate}
      ORDER BY ol.created_at DESC
      LIMIT 10
    `),
  ]);

  const s: any = statsResult.rows[0] ?? {};
  const avg: any = avgResult.rows[0] ?? {};

  res.json({
    stats: {
      productionRuns: s.production_runs ?? 0,
      batchesWithExtensions: s.batches_with_extensions ?? 0,
      dryingExtensions: s.drying_extensions ?? 0,
      openIssues: s.open_issues ?? 0,
      unreviewedEntries: s.unreviewed_entries ?? 0,
      avgDryingTime: avg.avg_drying_time ? parseFloat(avg.avg_drying_time) : null,
      warningCount: s.warning_count ?? 0,
      issueCount: s.issue_count ?? 0,
    },
    recentExtensions: recentExt.rows,
    recentIssues: recentIssues.rows,
    recentAssessments: recentAssessments.rows,
    recentComments: recentComments.rows,
  });
}));

operationsCentreRouter.get("/operations-centre/products", canView, asyncHandler(async (req, res) => {
  const result = await db.execute(sql`
    SELECT
      b.product_id,
      p.name AS product_name,
      COUNT(DISTINCT b.id)::int AS run_count,
      ROUND(AVG(b.drying_time_hours::numeric) FILTER (WHERE b.drying_time_hours IS NOT NULL), 2) AS avg_drying_time,
      COUNT(DISTINCT b.id) FILTER (WHERE b.drying_extension_required = true)::int AS extension_count,
      MAX(b.created_at) AS most_recent_run,
      COUNT(ol.id) FILTER (WHERE ol.severity = 'warning')::int AS warning_count,
      COUNT(ol.id) FILTER (WHERE ol.severity = 'issue')::int AS issue_count
    FROM batches b
    JOIN products p ON p.id = b.product_id
    LEFT JOIN operations_log ol ON ol.source_id = b.id
    WHERE EXISTS (SELECT 1 FROM operations_log ol2 WHERE ol2.source_id = b.id)
    GROUP BY b.product_id, p.name
    ORDER BY run_count DESC, product_name ASC
  `);
  res.json(result.rows);
}));

operationsCentreRouter.get("/operations-centre/products/:productId", canView, asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const [logsResult, batchesResult] = await Promise.all([
    db.execute(sql`
      SELECT ol.id, ol.batch_id, ol.source_id, ol.batch_number, ol.product_name,
             ol.machine, ol.note_type, ol.content, ol.severity, ol.status, ol.created_at
      FROM operations_log ol
      WHERE ol.product_id = ${productId}
      ORDER BY ol.created_at DESC
      LIMIT 20
    `),
    db.execute(sql`
      SELECT b.id, b.batch_number, b.drying_time_hours, b.drying_machine,
             b.drying_extension_required, b.drying_extension_time_hours, b.created_at,
             b.status
      FROM batches b
      WHERE b.product_id = ${productId}
        AND EXISTS (SELECT 1 FROM operations_log ol WHERE ol.source_id = b.id)
      ORDER BY b.created_at DESC
      LIMIT 20
    `),
  ]);

  res.json({ recentLogs: logsResult.rows, recentBatches: batchesResult.rows });
}));

operationsCentreRouter.get("/operations-centre/machines", canView, asyncHandler(async (req, res) => {
  const result = await db.execute(sql`
    SELECT
      b.drying_machine AS machine,
      COUNT(DISTINCT b.id)::int AS run_count,
      ROUND(AVG(b.drying_time_hours::numeric) FILTER (WHERE b.drying_time_hours IS NOT NULL), 2) AS avg_drying_time,
      COUNT(DISTINCT b.id) FILTER (WHERE b.drying_extension_required = true)::int AS extension_count,
      MAX(b.created_at) AS most_recent_run,
      COUNT(ol.id) FILTER (WHERE ol.severity = 'warning')::int AS warning_count,
      COUNT(ol.id) FILTER (WHERE ol.severity = 'issue')::int AS issue_count
    FROM batches b
    LEFT JOIN operations_log ol ON ol.source_id = b.id
    WHERE b.drying_machine IS NOT NULL AND TRIM(b.drying_machine) != ''
      AND EXISTS (SELECT 1 FROM operations_log ol2 WHERE ol2.source_id = b.id)
    GROUP BY b.drying_machine
    ORDER BY run_count DESC, machine ASC
  `);
  res.json(result.rows);
}));

operationsCentreRouter.get("/operations-centre/machines/:machine", canView, asyncHandler(async (req, res) => {
  const machine = decodeURIComponent(req.params.machine);

  const [logsResult, batchesResult] = await Promise.all([
    db.execute(sql`
      SELECT ol.id, ol.batch_id, ol.source_id, ol.batch_number, ol.product_name,
             ol.machine, ol.note_type, ol.content, ol.severity, ol.status, ol.created_at
      FROM operations_log ol
      WHERE ol.machine = ${machine}
      ORDER BY ol.created_at DESC
      LIMIT 20
    `),
    db.execute(sql`
      SELECT b.id, b.batch_number, b.drying_time_hours, b.drying_machine,
             b.drying_extension_required, b.drying_extension_time_hours, b.created_at,
             b.status, p.name AS product_name
      FROM batches b
      JOIN products p ON p.id = b.product_id
      WHERE b.drying_machine = ${machine}
        AND EXISTS (SELECT 1 FROM operations_log ol WHERE ol.source_id = b.id)
      ORDER BY b.created_at DESC
      LIMIT 20
    `),
  ]);

  res.json({ recentLogs: logsResult.rows, recentBatches: batchesResult.rows });
}));

operationsCentreRouter.get("/operations-centre/analytics", canView, asyncHandler(async (req, res) => {
  const { from, to } = req.query as Record<string, string | undefined>;
  const { fromDate, toDate } = parseDateRange(from, to);

  const dtWhere = sql`AND b.created_at BETWEEN ${fromDate} AND ${toDate}`;
  const olWhere = sql`AND ol.created_at BETWEEN ${fromDate} AND ${toDate}`;

  const [
    avgByProduct,
    avgByMachine,
    extsByProduct,
    extsByMachine,
    severityByProduct,
    severityByMachine,
    noteTypeBreakdown,
    statusDistribution,
  ] = await Promise.all([
    db.execute(sql`
      SELECT p.name AS product_name,
             ROUND(AVG(b.drying_time_hours::numeric), 2) AS avg_drying_time,
             COUNT(DISTINCT b.id)::int AS run_count
      FROM batches b
      JOIN products p ON p.id = b.product_id
      WHERE b.drying_time_hours IS NOT NULL ${dtWhere}
      GROUP BY p.name ORDER BY avg_drying_time DESC
    `),
    db.execute(sql`
      SELECT b.drying_machine AS machine,
             ROUND(AVG(b.drying_time_hours::numeric), 2) AS avg_drying_time,
             COUNT(DISTINCT b.id)::int AS run_count
      FROM batches b
      WHERE b.drying_time_hours IS NOT NULL
        AND b.drying_machine IS NOT NULL AND TRIM(b.drying_machine) != ''
        ${dtWhere}
      GROUP BY b.drying_machine ORDER BY avg_drying_time DESC
    `),
    db.execute(sql`
      SELECT p.name AS product_name,
             COUNT(DISTINCT b.id) FILTER (WHERE b.drying_extension_required = true)::int AS extension_count,
             COUNT(DISTINCT b.id)::int AS run_count
      FROM batches b
      JOIN products p ON p.id = b.product_id
      WHERE EXISTS (SELECT 1 FROM operations_log ol WHERE ol.source_id = b.id)
        ${dtWhere}
      GROUP BY p.name ORDER BY extension_count DESC
    `),
    db.execute(sql`
      SELECT b.drying_machine AS machine,
             COUNT(DISTINCT b.id) FILTER (WHERE b.drying_extension_required = true)::int AS extension_count,
             COUNT(DISTINCT b.id)::int AS run_count
      FROM batches b
      WHERE b.drying_machine IS NOT NULL AND TRIM(b.drying_machine) != ''
        AND EXISTS (SELECT 1 FROM operations_log ol WHERE ol.source_id = b.id)
        ${dtWhere}
      GROUP BY b.drying_machine ORDER BY extension_count DESC
    `),
    db.execute(sql`
      SELECT ol.product_name,
             COUNT(*) FILTER (WHERE ol.severity = 'warning')::int AS warning_count,
             COUNT(*) FILTER (WHERE ol.severity = 'issue')::int AS issue_count,
             COUNT(*) FILTER (WHERE ol.severity = 'info')::int AS info_count
      FROM operations_log ol
      WHERE ol.product_name IS NOT NULL ${olWhere}
      GROUP BY ol.product_name ORDER BY (issue_count + warning_count) DESC
    `),
    db.execute(sql`
      SELECT ol.machine,
             COUNT(*) FILTER (WHERE ol.severity = 'warning')::int AS warning_count,
             COUNT(*) FILTER (WHERE ol.severity = 'issue')::int AS issue_count,
             COUNT(*) FILTER (WHERE ol.severity = 'info')::int AS info_count
      FROM operations_log ol
      WHERE ol.machine IS NOT NULL AND TRIM(ol.machine) != '' ${olWhere}
      GROUP BY ol.machine ORDER BY (issue_count + warning_count) DESC
    `),
    db.execute(sql`
      SELECT ol.note_type,
             COUNT(*)::int AS entry_count
      FROM operations_log ol
      WHERE true ${olWhere}
      GROUP BY ol.note_type ORDER BY entry_count DESC
    `),
    db.execute(sql`
      SELECT ol.status,
             COUNT(*)::int AS entry_count
      FROM operations_log ol
      WHERE true ${olWhere}
      GROUP BY ol.status ORDER BY entry_count DESC
    `),
  ]);

  res.json({
    avgDryingTimeByProduct: avgByProduct.rows,
    avgDryingTimeByMachine: avgByMachine.rows,
    extensionsByProduct: extsByProduct.rows,
    extensionsByMachine: extsByMachine.rows,
    severityByProduct: severityByProduct.rows,
    severityByMachine: severityByMachine.rows,
    noteTypeBreakdown: noteTypeBreakdown.rows,
    statusDistribution: statusDistribution.rows,
  });
}));
