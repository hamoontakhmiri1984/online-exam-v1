import { apiRequest, ApiError } from '../lib/apiClient';

export type ExamAttempt = {
  id: string;
  examId: string;
  studentId: string;
  // Answers are omitted from finished attempts when review is disabled.
  answers: Record<string, number>;
  // Resume autosave revisions from the last value stored by the server.
  answersRevision?: number;
  correctCount: number;
  totalQuestions: number;
  startedAt: string; // Null means the attempt is still active.
  finishedAt: string | null;
  expiresAt: string; // The server deadline is authoritative.
  endedByTimeout: boolean;
  tabSwitchCount?: number;
  tabSwitches?: string[];
  fullscreenExitCount?: number;
  fullscreenExits?: string[];
  windowBlurCount?: number;
  windowBlurs?: string[];
};

// Narrow completed attempts for reports and averages.
export type FinishedExamAttempt = ExamAttempt & { finishedAt: string };

export function isFinishedAttempt(
  attempt: ExamAttempt
): attempt is FinishedExamAttempt {
  return attempt.finishedAt !== null;
}

export type StartedAttempt = {
  startedAt: string;
  expiresAt: string;
  // Server time aligns the countdown independently of the device clock.
  serverNow: string;
};

export function startAttempt(examId: string): Promise<StartedAttempt> {
  return apiRequest<StartedAttempt>(`/exams/${examId}/attempts/start`, {
    method: 'POST',
  });
}

// A rejected stale write returns the latest stored revision.
export type AutosaveResult = { saved: boolean; revision: number };

// Autosave revisions must increase; grading happens only on finish.
export function autosaveAnswers(
  examId: string,
  answers: Record<string, number>,
  revision: number
): Promise<AutosaveResult> {
  return apiRequest<AutosaveResult>(`/exams/${examId}/attempts/answers`, {
    method: 'PATCH',
    body: { answers, revision },
  });
}

export function finishAttempt(
  examId: string,
  answers: Record<string, number>
): Promise<ExamAttempt> {
  return apiRequest<ExamAttempt>(`/exams/${examId}/attempts/finish`, {
    method: 'POST',
    body: { answers },
  });
}

export function recordAttemptEvent(
  examId: string,
  type: 'TAB_HIDDEN' | 'FULLSCREEN_EXIT' | 'WINDOW_BLUR',
): Promise<{ recorded: boolean }> {
  return apiRequest<{ recorded: boolean }>(`/exams/${examId}/attempts/events`, {
    method: 'POST',
    body: { type },
  });
}

export function getAttemptsByExam(examId: string): Promise<ExamAttempt[]> {
  return apiRequest<ExamAttempt[]>(`/exams/${examId}/attempts`);
}

export type ExamAttemptAudit = ExamAttempt & {
  student: { id: string; name: string | null; username: string | null };
  tabSwitchCount: number;
  tabSwitches: string[];
  fullscreenExitCount: number;
  fullscreenExits: string[];
  windowBlurCount: number;
  windowBlurs: string[];
};

export type ExamAttemptAuditPage = {
  items: ExamAttemptAudit[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export function getExamAttemptAudit(
  examId: string,
  page = 1,
  pageSize = 25,
): Promise<ExamAttemptAuditPage> {
  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  return apiRequest<ExamAttemptAuditPage>(
    `/exams/${examId}/attempts/audit?${query.toString()}`,
  );
}

// Ignore inaccessible exams, but propagate infrastructure errors.
export async function getAttemptsForExams(
  examIds: string[]
): Promise<ExamAttempt[]> {
  const results = await Promise.all(
    examIds.map((examId) =>
      getAttemptsByExam(examId).catch((err) => {
        if (
          err instanceof ApiError &&
          (err.status === 403 || err.status === 404)
        ) {
          return [] as ExamAttempt[];
        }
        throw err;
      })
    )
  );
  return results.flat();
}

export async function getMyAttempt(
  examId: string
): Promise<ExamAttempt | undefined> {
  try {
    return await apiRequest<ExamAttempt>(`/exams/${examId}/attempts/me`);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 403)) {
      return undefined;
    }
    throw err;
  }
}

export async function getMyAttemptsForExams(
  examIds: string[]
): Promise<ExamAttempt[]> {
  const results = await Promise.all(examIds.map((id) => getMyAttempt(id)));
  return results.filter((a): a is ExamAttempt => a !== undefined);
}

export type FinishedAttemptWithExam = Omit<
  FinishedExamAttempt,
  'answers' | 'answersRevision'
> & {
  exam: {
    id: string;
    title: string;
    allowReview: boolean;
  };
};

// History remains available independently of current group membership.
export function getMyResultsHistory(): Promise<FinishedAttemptWithExam[]> {
  return apiRequest<FinishedAttemptWithExam[]>('/attempts/me');
}
