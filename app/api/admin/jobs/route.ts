import { NextResponse } from "next/server";
import { authorizeAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/jobs
 * Returns all jobs with applicant metrics and candidate profiles sorted by readiness score.
 */
export async function GET() {
  try {
    const isAdmin = await authorizeAdmin();
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const jobs = await prisma.jobPosting.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        applications: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                studentProfile: {
                  select: {
                    id: true,
                    targetRole: true,
                    githubUsername: true,
                    leetcodeUsername: true,
                    readinessScore: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    const enrichedJobs = jobs.map((j) => {
      // Sort applicants by readiness score descending
      const applicants = j.applications.map((a) => ({
        applicationId: a.id,
        status: a.status,
        appliedAt: a.appliedAt,
        notes: a.notes,
        studentName: a.user.name || "Candidate",
        studentEmail: a.user.email,
        githubUsername: a.user.studentProfile?.githubUsername || null,
        targetRole: a.user.studentProfile?.targetRole || null,
        readinessScore: a.user.studentProfile?.readinessScore?.overallScore || 0,
        readinessTier: a.user.studentProfile?.readinessScore?.tier || "Not evaluated",
      }));

      applicants.sort((a, b) => b.readinessScore - a.readinessScore);

      return {
        id: j.id,
        title: j.title,
        company: j.company,
        description: j.description,
        location: j.location,
        isRemote: j.isRemote,
        jobType: j.jobType,
        applyUrl: j.applyUrl,
        requiredSkills: j.requiredSkills,
        minReadinessScore: j.minReadinessScore,
        isMSOTInternal: j.isMSOTInternal,
        postedByStaff: j.postedByStaff,
        stipendOrSalary: j.stipendOrSalary,
        createdAt: j.createdAt,
        applicantCount: applicants.length,
        applicants,
      };
    });

    return NextResponse.json({
      success: true,
      jobs: enrichedJobs,
    });
  } catch (error: any) {
    console.error("Error in GET /api/admin/jobs:", error);
    return NextResponse.json(
      { error: "Failed to load admin jobs." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/jobs
 * Allows MSOT staff to post a new job or internship directly to students.
 */
export async function POST(req: Request) {
  try {
    const isAdmin = await authorizeAdmin();
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      title,
      company,
      description,
      location = "Bangalore / Remote",
      isRemote = true,
      jobType = "internship",
      applyUrl,
      requiredSkills = [],
      minReadinessScore = 60,
      isMSOTInternal = true,
      stipendOrSalary,
    } = body;

    if (!title || !company || !description || !applyUrl) {
      return NextResponse.json(
        { error: "Title, company, description, and applyUrl are required fields." },
        { status: 400 }
      );
    }

    const skillsArray = Array.isArray(requiredSkills)
      ? requiredSkills
      : typeof requiredSkills === "string"
      ? requiredSkills.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    const newJob = await prisma.jobPosting.create({
      data: {
        title: title.trim(),
        company: company.trim(),
        description: description.trim(),
        location: location.trim(),
        isRemote: !!isRemote,
        jobType: jobType.trim(),
        applyUrl: applyUrl.trim(),
        requiredSkills: skillsArray,
        minReadinessScore: Number(minReadinessScore) || 50,
        isMSOTInternal: !!isMSOTInternal,
        postedByStaff: true,
        stipendOrSalary: stipendOrSalary ? stipendOrSalary.trim() : null,
      },
    });

    return NextResponse.json({
      success: true,
      job: newJob,
    });
  } catch (error: any) {
    console.error("Error in POST /api/admin/jobs:", error);
    return NextResponse.json(
      { error: "Failed to post new job." },
      { status: 500 }
    );
  }
}
