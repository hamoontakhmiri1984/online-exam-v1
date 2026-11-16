import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { fadeUp, staggerContainer, staggerItem } from './variants';

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

function useIsLanding() {
  return useLocation().pathname === '/';
}

// The public landing page is intentionally static during scroll.
// Other pages retain their existing reveal animations.
function Reveal({ children, className, delay = 0 }: RevealProps) {
  const isLanding = useIsLanding();
  if (isLanding) return <div className={className}>{children}</div>;
  return (
    <motion.div className={className} variants={fadeUp}
      initial="hidden" whileInView="visible"
      viewport={{ once: true, amount: 0.2 }} transition={{ delay }}>
      {children}
    </motion.div>
  );
}

export default Reveal;

type RevealGroupProps = {
  children: ReactNode;
  className?: string;
};

export function RevealGroup({ children, className }: RevealGroupProps) {
  const isLanding = useIsLanding();
  if (isLanding) return <div className={className}>{children}</div>;
  return (
    <motion.div className={className} variants={staggerContainer}
      initial="hidden" whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}>
      {children}
    </motion.div>
  );
}

export function RevealItem({
  children, className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const isLanding = useIsLanding();
  if (isLanding) return <div className={className}>{children}</div>;
  return <motion.div className={className} variants={staggerItem}>{children}</motion.div>;
}
