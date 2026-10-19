export interface StudentProjectData {
  id?: string;
  title: string;
  description?: string;
  repoUrl?: string;
  liveUrl?: string;
  techStack?: string[];
  order?: number;
}

export interface StudentAchievementData {
  id?: string;
  title: string;
  category: "hackathon" | "certification" | "club" | "award" | "other";
  description?: string;
  date?: string;
}

export interface StudentProfileData {
  id?: string;
  userId?: string;
  resumeFileName?: string | null;
  resumeText?: string | null;
  resumePageCount?: number | null;
  targetRole?: string | null;
  linkedinUrl?: string | null;
  linkedinAbout?: string | null;
  githubUsername?: string | null;
  leetcodeUsername?: string | null;
  skills?: string[];
  projects: StudentProjectData[];
  achievements: StudentAchievementData[];
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface SaveProfilePayload {
  targetRole?: string;
  resumeFileName?: string;
  resumeText?: string;
  resumePageCount?: number;
  linkedinUrl?: string;
  linkedinAbout?: string;
  githubUsername?: string;
  leetcodeUsername?: string;
  skills?: string[];
  projects?: StudentProjectData[];
  achievements?: StudentAchievementData[];
}
