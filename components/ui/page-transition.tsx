"use client";

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

export default function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  
  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: -10, scale: 1.04, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      transition={{
        type: "spring",
        bounce: 0.2,
        duration: 0.6,
        opacity: { duration: 0.4 }
      }}
      className="flex-1 w-full flex flex-col min-h-0"
    >
      {children}
    </motion.div>
  );
}
