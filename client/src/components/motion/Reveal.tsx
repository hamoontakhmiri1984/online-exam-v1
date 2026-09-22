import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { fadeUp, staggerContainer, staggerItem } from './variants';

type RevealProps = {
  children: ReactNode;
  className?: string;
  // برای section هایی که خودشون یه استگرِ داخلی دارن (مثلاً هدینگِ section
  // دیرتر از subtitle ظاهر نشه) - پیش‌فرض false یعنی خودِ children یهو
  // با هم (fadeUp) وارد می‌شن
  delay?: number;
};

// wrapper برای «وقتی اسکرول رسید به این بخش، محو+بالا بیا». یه‌بار اجرا
// می‌شه (once: true) - نه هر بار که کاربر بالا/پایین اسکرول کنه. آستانه‌ی
// ۰٫۲ یعنی وقتی ۲۰٪ از المان تو دیدِ کاربره شروع می‌شه، نه این‌که صبر کنه
// کامل بیاد وسط صفحه.
function Reveal({ children, className, delay = 0 }: RevealProps) {
  return (
    <motion.div
      className={className}
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}

export default Reveal;

type RevealGroupProps = {
  children: ReactNode;
  className?: string;
};

// برای گریدِ کارت‌ها: والد رو با این بپوشون، هر کارت رو با <RevealItem>؛
// وقتی گرید وارد دیدِ کاربر شد بچه‌ها یکی‌یکی با فاصله ظاهر می‌شن، نه
// هم‌زمان
export function RevealGroup({ children, className }: RevealGroupProps) {
  return (
    <motion.div
      className={className}
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
    >
      {children}
    </motion.div>
  );
}

export function RevealItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div className={className} variants={staggerItem}>
      {children}
    </motion.div>
  );
}
