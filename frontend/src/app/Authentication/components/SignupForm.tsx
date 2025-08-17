import React from "react";
import "./floating-label.css";

interface SignupFormProps {
  name: string;
  email: string;
  password: string;
  onNameChange: (v: string) => void;
  onEmailChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  error: string;
  success: string;
}

export default function SignupForm({ name, email, password, onNameChange, onEmailChange, onPasswordChange, onSubmit, error, success }: SignupFormProps) {
  return (
    <form className="flex flex-col gap-6 text-gray-900" autoComplete="off" onSubmit={onSubmit}>
      {/* Name Field */}
      <div className="relative overflow-hidden">
        <input
          type="text"
          id="signup-name"
          name="name"
          required
          value={name}
          onChange={e => onNameChange(e.target.value)}
          className={`peer h-12 w-full border-b-2 border-gray-200 focus:border-blue-500 outline-none bg-transparent transition-all text-gray-900 text-base px-0 ${name ? 'not-empty' : ''}`}
          placeholder=" "
        />
        <label
          htmlFor="signup-name"
          className={`absolute left-0 top-3 text-gray-400 text-base transition-all pointer-events-none
            peer-placeholder-shown:top-3 peer-placeholder-shown:text-base
            peer-focus:-top-4 peer-focus:text-sm peer-focus:text-blue-500
            ${name ? 'not-empty-label' : ''}`}
        >
          Full Name
        </label>
      </div>
      {/* Email Field */}
      <div className="relative overflow-hidden">
        <input
          type="email"
          id="signup-email"
          name="email"
          required
          value={email}
          onChange={e => onEmailChange(e.target.value)}
          className={`peer h-12 w-full border-b-2 border-gray-200 focus:border-blue-500 outline-none bg-transparent transition-all text-gray-900 text-base px-0 ${email ? 'not-empty' : ''}`}
          placeholder=" "
        />
        <label
          htmlFor="signup-email"
          className={`absolute left-0 top-3 text-gray-400 text-base transition-all pointer-events-none
            peer-placeholder-shown:top-3 peer-placeholder-shown:text-base
            peer-focus:-top-4 peer-focus:text-sm peer-focus:text-blue-500
            ${email ? 'not-empty-label' : ''}`}
        >
          Email address
        </label>
      </div>
      {/* Password Field */}
      <div className="relative overflow-hidden">
        <input
          type="password"
          id="signup-password"
          name="password"
          required
          value={password}
          onChange={e => onPasswordChange(e.target.value)}
          className={`peer h-12 w-full border-b-2 border-gray-200 focus:border-blue-500 outline-none bg-transparent transition-all text-gray-900 text-base px-0 ${password ? 'not-empty' : ''}`}
          placeholder=" "
        />
        <label
          htmlFor="signup-password"
          className={`absolute left-0 top-3 text-gray-400 text-base transition-all pointer-events-none
            peer-placeholder-shown:top-3 peer-placeholder-shown:text-base
            peer-focus:-top-4 peer-focus:text-sm peer-focus:text-blue-500
            ${password ? 'not-empty-label' : ''}`}
        >
          Password
        </label>
      </div>
      {/* Error/Success */}
      {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
      {success && <div className="text-green-600 text-sm mb-2">{success}</div>}
      {/* Signup Button */}
      <button
        type="submit"
        className="mt-2 h-12 rounded-xl text-white font-semibold text-lg bg-gradient-to-r from-green-400 to-blue-500 shadow-md hover:from-green-500 hover:to-blue-600 transition-all focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
      >
        Sign Up
      </button>
    </form>
  );
}
