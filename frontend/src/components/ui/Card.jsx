import React from 'react';
import { motion } from 'framer-motion';

export const Card = ({ children, className = '', delay = 0 }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={`glass-card p-6 ${className}`}
    >
      {children}
    </motion.div>
  );
};
