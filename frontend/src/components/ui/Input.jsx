import React from 'react';

export const Input = ({ label, id, className = '', ...props }) => {
  return (
    <div className={`mb-4 w-full ${className}`}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-400 mb-2">
          {label}
        </label>
      )}
      <input
        id={id}
        className="w-full bg-dark-900 border border-dark-700 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors"
        {...props}
      />
    </div>
  );
};

export const TextArea = ({ label, id, className = '', ...props }) => {
  return (
    <div className={`mb-4 w-full ${className}`}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-400 mb-2">
          {label}
        </label>
      )}
      <textarea
        id={id}
        className="w-full bg-dark-900 border border-dark-700 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors min-h-[100px] resize-y"
        {...props}
      />
    </div>
  );
};

export const Select = ({ label, id, options = [], className = '', ...props }) => {
  return (
    <div className={`mb-4 w-full ${className}`}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-400 mb-2">
          {label}
        </label>
      )}
      <select
        id={id}
        className="w-full bg-dark-900 border border-dark-700 rounded-lg p-3 text-white focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors appearance-none"
        {...props}
      >
        <option value="" disabled>Select an option</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
};
