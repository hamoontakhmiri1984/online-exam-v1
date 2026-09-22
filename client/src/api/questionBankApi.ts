import type { Category } from '../constants/categories';
import { apiRequest, ApiError, API_BASE_URL, getAuthToken } from '../lib/apiClient';

export type QuestionDifficulty = 'Easy' | 'Medium' | 'Hard';

export type QuestionBank = {
  id: string;
  name: string;
  category: Category;
  instructorId: string;
  questionCount: number;
};

export type BankQuestion = {
  id: string;
  bankId: string;
  text: string;
  options: string[];
  correctOptionIndex: number;
  difficulty: QuestionDifficulty;
};

export type QuestionBankInput = {
  name: string;
  category: Category;
};

export type BankQuestionInput = {
  text: string;
  options: string[];
  correctOptionIndex: number;
  difficulty?: QuestionDifficulty;
};

export function getQuestionBanks(): Promise<QuestionBank[]> {
  return apiRequest<QuestionBank[]>('/banks');
}

export function getQuestionBankById(bankId: string): Promise<QuestionBank> {
  return apiRequest<QuestionBank>(`/banks/${bankId}`);
}

export function createQuestionBank(
  input: QuestionBankInput
): Promise<QuestionBank> {
  return apiRequest<QuestionBank>('/banks', {
    method: 'POST',
    body: input,
  });
}

export function updateQuestionBank(
  bankId: string,
  input: QuestionBankInput
): Promise<QuestionBank> {
  return apiRequest<QuestionBank>(`/banks/${bankId}`, {
    method: 'PUT',
    body: input,
  });
}

export function deleteQuestionBank(bankId: string): Promise<void> {
  return apiRequest<void>(`/banks/${bankId}`, {
    method: 'DELETE',
  });
}

export function getBankQuestions(bankId: string): Promise<BankQuestion[]> {
  return apiRequest<BankQuestion[]>(`/banks/${bankId}/questions`);
}

export function createBankQuestion(
  bankId: string,
  input: BankQuestionInput
): Promise<BankQuestion> {
  return apiRequest<BankQuestion>(`/banks/${bankId}/questions`, {
    method: 'POST',
    body: input,
  });
}

export function createBankQuestionsBulk(
  bankId: string,
  questions: BankQuestionInput[]
): Promise<BankQuestion[]> {
  if (questions.length === 0) {
    return Promise.resolve([]);
  }

  return apiRequest<BankQuestion[]>(`/banks/${bankId}/questions/bulk`, {
    method: 'POST',
    body: questions,
  });
}

export function updateBankQuestion(
  bankId: string,
  questionId: string,
  input: BankQuestionInput
): Promise<BankQuestion> {
  return apiRequest<BankQuestion>(`/banks/${bankId}/questions/${questionId}`, {
    method: 'PUT',
    body: input,
  });
}

export function deleteBankQuestion(
  bankId: string,
  questionId: string
): Promise<void> {
  return apiRequest<void>(`/banks/${bankId}/questions/${questionId}`, {
    method: 'DELETE',
  });
}

// ---------------------------------------------------------------------------
// ایمپورت از اکسل - سرور خودش فایل رو پارس می‌کنه (lib/questionExcel.ts سمت
// سرور)، پس اینجا فقط فایل رو multipart می‌فرستیم. چون هم آپلود فایل
// (FormData) هم دانلود باینری (فایل تمپلیت) با apiRequest معمولی (که همیشه
// JSON فرض می‌کنه) جور در نمیان، این دوتا خودشون مستقیم fetch می‌زنن -
// همون هدر Authorization/credentials رو دستی تکرار می‌کنیم.
// ---------------------------------------------------------------------------

export type BankQuestionImportError = {
  row: number;
  message: string;
};

export type BankQuestionImportResult = {
  created: BankQuestion[];
  errors: BankQuestionImportError[];
};

export async function importBankQuestionsFromExcel(
  bankId: string,
  file: File
): Promise<BankQuestionImportResult> {
  const formData = new FormData();
  formData.append('file', file);

  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(
      `${API_BASE_URL}/banks/${bankId}/questions/import-excel`,
      {
        method: 'POST',
        headers,
        body: formData,
        credentials: 'include',
      }
    );
  } catch {
    throw new ApiError(0, 'اتصال به سرور برقرار نشد');
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      data && typeof data === 'object' && 'error' in data
        ? String((data as { error?: unknown }).error)
        : `درخواست با خطا مواجه شد (${response.status})`;
    throw new ApiError(response.status, message, data);
  }

  return data as BankQuestionImportResult;
}

// فایل رو مستقیم دانلود می‌کنه (به‌جای برگردوندنِ URL) چون این مسیر نیاز به
// هدرِ Authorization داره - یه <a href> ساده نمی‌تونه هدر بفرسته
export async function downloadBankQuestionTemplate(): Promise<void> {
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/banks/import-template`, {
      headers,
      credentials: 'include',
    });
  } catch {
    throw new ApiError(0, 'اتصال به سرور برقرار نشد');
  }

  if (!response.ok) {
    throw new ApiError(response.status, 'دریافت فایل نمونه با خطا مواجه شد');
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'قالب-ایمپورت-سوالات.xlsx';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
