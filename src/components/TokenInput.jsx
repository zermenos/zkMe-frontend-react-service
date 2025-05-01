import React from "react";

const TokenInput = ({ value, onChange, token, disabled, placeholder }) => {
  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
      <div className="flex items-center gap-4">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder || "0.0"}
          className="w-full bg-transparent text-gray-900 text-lg outline-none disabled:text-gray-500"
        />
        <span className="text-gray-900 font-medium">{token}</span>
      </div>
    </div>
  );
};

export default TokenInput;
