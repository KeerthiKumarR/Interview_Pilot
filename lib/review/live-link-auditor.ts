import { ReviewCheckItem } from "./resume-auditor";

export interface LiveLinkCheckDetail {
  projectTitle: string;
  url: string;
  isAlive: boolean;
  statusCode: number | null;
  latencyMs: number;
  hostingProvider?: string;
  hasViewportTag?: boolean;
  message: string;
  fix?: string;
}

export interface LiveLinkAuditResult {
  score: number; // 0 to 100
  totalChecked: number;
  aliveCount: number;
  checks: ReviewCheckItem[];
  links: LiveLinkCheckDetail[];
  actionableFixes: string[];
  summary: string;
}

function detectHosting(url: string, headers: Headers): string {
  const host = url.toLowerCase();
  const serverHeader = (headers.get("server") || "").toLowerCase();

  if (host.includes(".vercel.app") || serverHeader.includes("vercel")) return "Vercel";
  if (host.includes(".netlify.app") || serverHeader.includes("netlify")) return "Netlify";
  if (host.includes(".onrender.com") || serverHeader.includes("render")) return "Render";
  if (host.includes(".railway.app")) return "Railway";
  if (host.includes(".github.io")) return "GitHub Pages";
  if (host.includes("fly.dev")) return "Fly.io";
  if (host.includes("aws") || host.includes("cloudfront")) return "AWS CloudFront";
  return "Custom / Cloud VPS";
}

/**
 * Pings candidate live demo URLs, measures latency, checks HTTP status codes,
 * and validates responsive viewport headers.
 */
export async function auditLiveLinks(
  projects: Array<{ title: string; liveUrl?: string | null; repoUrl?: string | null }>
): Promise<LiveLinkAuditResult> {
  const projectsWithLinks = (projects || []).filter(
    (p) => p.liveUrl && p.liveUrl.trim().startsWith("http")
  );

  const checks: ReviewCheckItem[] = [];
  const actionableFixes: string[] = [];
  const linkDetails: LiveLinkCheckDetail[] = [];

  if (projectsWithLinks.length === 0) {
    return {
      score: 0,
      totalChecked: 0,
      aliveCount: 0,
      checks: [
        {
          id: "live_url_presence",
          name: "Live Project Demo URL Present",
          passed: false,
          score: 0,
          message: "No live project deployment links found in profile.",
          fix: "Deploy at least one portfolio project live on Vercel, Netlify, or Render (free tiers) and add the URL.",
        },
      ],
      links: [],
      actionableFixes: [
        "Deploy your primary project to Vercel or Render free tier.",
        "Add the live demo URL to your project in the Profile tab.",
      ],
      summary: "No live demo URLs provided. Recruiters rarely clone code without seeing a live demo first.",
    };
  }

  let aliveCount = 0;
  let totalLatency = 0;

  for (const proj of projectsWithLinks) {
    const targetUrl = proj.liveUrl!.trim();
    const startTime = Date.now();

    try {
      const browserUA =
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

      // 15-second primary timeout (ample time for Vercel/Render free tier cold starts)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      let res: Response;
      let latencyMs = 0;

      try {
        res = await fetch(targetUrl, {
          method: "GET",
          headers: {
            "User-Agent": browserUA,
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          },
          signal: controller.signal,
          redirect: "follow",
        });
        clearTimeout(timeoutId);
        latencyMs = Date.now() - startTime;
      } catch (firstErr: any) {
        clearTimeout(timeoutId);
        // If aborted due to cold start, give a secondary 8s warm retry
        if (firstErr?.name === "AbortError") {
          const retryController = new AbortController();
          const retryTimeoutId = setTimeout(() => retryController.abort(), 8000);
          const retryStart = Date.now();

          res = await fetch(targetUrl, {
            method: "GET",
            headers: {
              "User-Agent": browserUA,
              Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            },
            signal: retryController.signal,
            redirect: "follow",
          });
          clearTimeout(retryTimeoutId);
          latencyMs = Date.now() - retryStart;
        } else {
          throw firstErr;
        }
      }

      totalLatency += latencyMs;
      const isAlive = res.status >= 200 && res.status < 400;
      const hosting = detectHosting(targetUrl, res.headers);

      // Inspect HTML preview for viewport tag (mobile responsiveness indicator)
      let hasViewport = false;
      try {
        const htmlSnippet = (await res.text()).slice(0, 4000).toLowerCase();
        hasViewport =
          htmlSnippet.includes('name="viewport"') ||
          htmlSnippet.includes("name='viewport'") ||
          htmlSnippet.includes("width=device-width");
      } catch {
        hasViewport = true;
      }

      if (isAlive) {
        aliveCount++;
      } else {
        actionableFixes.push(
          `Fix broken live link for "${proj.title}" (${targetUrl} returned HTTP ${res.status}).`
        );
      }

      linkDetails.push({
        projectTitle: proj.title,
        url: targetUrl,
        isAlive,
        statusCode: res.status,
        latencyMs,
        hostingProvider: hosting,
        hasViewportTag: hasViewport,
        message: isAlive
          ? `Online (HTTP ${res.status}) on ${hosting} in ${latencyMs}ms.`
          : `Offline/Error: Returned HTTP ${res.status}.`,
        fix: isAlive
          ? undefined
          : `Ensure the application server is deployed and responding with HTTP 200.`,
      });
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      const isTimeout = err?.name === "AbortError";

      actionableFixes.push(
        `Live link for "${proj.title}" is unreachable (${isTimeout ? "Timed out after 15s cold start" : "Network error"}).`
      );

      linkDetails.push({
        projectTitle: proj.title,
        url: targetUrl,
        isAlive: false,
        statusCode: null,
        latencyMs,
        message: isTimeout
          ? "Request timed out after 15 seconds (Free-tier cold start or offline)."
          : `Connection failed: ${err.message || "Unreachable host"}`,
        fix: "Verify domain DNS records and ensure the deployment service is active.",
      });
    }
  }

  // Generate Benchmark Checks
  const allAlive = aliveCount === projectsWithLinks.length && aliveCount > 0;
  checks.push({
    id: "link_http_status",
    name: "Live URLs Return HTTP 200 OK",
    passed: allAlive,
    score: allAlive ? 50 : aliveCount > 0 ? 25 : 0,
    message: allAlive
      ? `All ${aliveCount} project demo link(s) loaded successfully without errors.`
      : `${aliveCount}/${projectsWithLinks.length} project links responded with valid HTTP status.`,
    fix: allAlive
      ? undefined
      : "Verify that all project demo URLs open without 404 or server downtime errors.",
  });

  const avgLatency = projectsWithLinks.length > 0 ? Math.round(totalLatency / projectsWithLinks.length) : 0;
  const isFast = avgLatency > 0 && avgLatency < 2500;
  checks.push({
    id: "link_speed",
    name: "Fast Response Time (< 2.5s)",
    passed: isFast,
    score: isFast ? 25 : 12,
    message: isFast
      ? `Average response latency is snappy (${avgLatency}ms).`
      : `Average response latency was slow (${avgLatency}ms). Free tier spin-up may hurt first impressions.`,
    fix: isFast
      ? undefined
      : "Use a keep-alive ping or edge CDN to avoid slow cold-start spin-ups during recruiter evaluations.",
  });

  const mobileResponsive = linkDetails.every((l) => l.hasViewportTag);
  checks.push({
    id: "link_mobile_viewport",
    name: "Mobile Responsive Viewport Tag",
    passed: mobileResponsive,
    score: mobileResponsive ? 25 : 10,
    message: mobileResponsive
      ? "Mobile viewport configurations detected in loaded pages."
      : "Some project pages lack standard viewport meta tags for mobile screens.",
    fix: mobileResponsive
      ? undefined
      : "Add <meta name='viewport' content='width=device-width, initial-scale=1.0'> to your HTML.",
  });

  const totalScore = checks.reduce((sum, c) => sum + c.score, 0);

  return {
    score: Math.min(100, Math.round(totalScore)),
    totalChecked: projectsWithLinks.length,
    aliveCount,
    checks,
    links: linkDetails,
    actionableFixes: actionableFixes.slice(0, 5),
    summary: `${aliveCount} of ${projectsWithLinks.length} project link(s) are live and operational.`,
  };
}
