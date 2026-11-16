import { CheckCircle2, GraduationCap, BarChart3, ShieldCheck, Users } from 'lucide-react';

/** Original scalable illustration matching the Modern Glass Pro visual concept. */
export default function ExamHeroIllustration() {
  return (
    <div className="exam-art" aria-label="تصویرسازی لپ‌تاپ و کارت آزمون آنلاین">
      <div className="exam-art-halo" aria-hidden="true" />
      <div className="exam-art-back" aria-hidden="true" />
      <div className="exam-art-laptop">
        <div className="exam-art-screen">
          <div className="exam-art-screen-top"><span className="exam-art-dot" /><span className="exam-art-dot" /><span className="exam-art-dot" /></div>
          <div className="exam-art-screen-title"><span className="exam-art-spark" /> آزمون آنلاین</div>
          {[0, 1, 2].map(i => (
            <div key={i} className="exam-art-question">
              <CheckCircle2 size={23} strokeWidth={2.2} />
              <div><i /><i /></div>
            </div>
          ))}
        </div>
        <div className="exam-art-base"><span /></div>
      </div>
      <div className="exam-art-cap"><GraduationCap size={70} strokeWidth={1.8} /></div>
      <div className="exam-art-float exam-art-float-a"><BarChart3 size={29} /></div>
      <div className="exam-art-float exam-art-float-b"><ShieldCheck size={26} /></div>
      <div className="exam-art-float exam-art-float-c"><Users size={26} /></div>
    </div>
  );
}
