import React from 'react';

export const Button = ({ children, variant = 'primary', className = '', ...props }) => {
  const baseStyle = "flex items-center justify-center font-semibold rounded-lg px-6 py-3 transition-all duration-300 transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-gradient-to-r from-gold-500 to-gold-600 text-dark-900 hover:from-gold-400 hover:to-gold-500 hover:scale-105 shadow-[0_0_15px_rgba(245,158,11,0.15)] hover:shadow-[0_0_25px_rgba(245,158,11,0.4)]",
    secondary: "bg-dark-700 text-white hover:bg-dark-600 hover:scale-105",
    outline: "border border-dark-700 text-gray-300 hover:border-gold-500 hover:text-gold-500",
    ghost: "text-gray-400 hover:text-white hover:bg-dark-800"
  };

  return (
    <button className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};
