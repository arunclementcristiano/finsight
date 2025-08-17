"use client";
import { useState, useEffect } from "react";
import { Amplify, Auth } from "aws-amplify";
import { authConfig } from "../Authentication/amplify-config";
import LoginForm from "../Authentication/components/LoginForm";
import SignupForm from "../Authentication/components/SignupForm";
import ConfirmationModal from "../Authentication/components/ConfirmationModal";

export default function Home() {
  useEffect(() => {
    Amplify.configure({ Auth: authConfig as any });
  }, []);
  const [open, setOpen] = useState(true);
  const [tab, setTab] = useState<"login" | "signup">("login");
  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginSuccess, setLoginSuccess] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  // Signup state
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupError, setSignupError] = useState("");
  const [signupSuccess, setSignupSuccess] = useState("");
  // Confirmation modal state
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");

  // Handlers
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    setLoginSuccess("");
    setIsLoggingIn(true);
    try {
      await Auth.signIn(loginEmail, loginPassword);
      setLoginSuccess("Login successful!");
      window.location.href = "/PortfolioManagement/Onboarding";
    } catch (err: any) {
      setLoginError(err.message || "Login failed");
      setIsLoggingIn(false);
    }
  }
  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setSignupError("");
    setSignupSuccess("");
    try {
      await Auth.signUp({
        username: signupEmail,
        password: signupPassword,
        attributes: {
          email: signupEmail,
          name: signupName,
        },
      });
      setSignupSuccess("Sign up successful! Check your email for a confirmation code.");
      setConfirmEmail(signupEmail);
      setShowConfirm(true);
    } catch (err: any) {
      setSignupError(err.message || "Sign up failed");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50 relative overflow-hidden">
      {/* Finance SVG Background */}
      {/* ...existing SVG and modal code... */}
      {open && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: "rgba(0,0,0,0.15)", zIndex: 10 }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-2 sm:mx-0 p-6 sm:p-8 relative transition-all duration-200 flex flex-col">
            <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl" onClick={() => setOpen(false)} aria-label="Close">&times;</button>
            <div className="flex flex-col items-center mb-6">
              <img src="/finsight-logo.png" alt="FinSight Logo" className="w-24 h-24 mb-4" />
            </div>
            <div className="flex justify-center gap-8 mb-8 text-lg">
              <button
                className={`pb-2 text-lg font-semibold border-b-2 transition-colors ${tab === "login" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-400 hover:text-blue-500"}`}
                onClick={() => setTab("login")}
              >
                Login
              </button>
              <button
                className={`pb-2 text-lg font-semibold border-b-2 transition-colors ${tab === "signup" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-400 hover:text-blue-500"}`}
                onClick={() => setTab("signup")}
              >
                Sign Up
              </button>
            </div>
            <div className="py-8">
              {tab === "login"
                ? (
                  isLoggingIn ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <svg className="animate-spin h-8 w-8 text-blue-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                      </svg>
                      <span className="text-blue-600 font-semibold text-lg">Logging in…</span>
                    </div>
                  ) : (
                    <LoginForm
                      email={loginEmail}
                      password={loginPassword}
                      onEmailChange={setLoginEmail}
                      onPasswordChange={setLoginPassword}
                      onSubmit={handleLogin}
                      error={loginError}
                      success={loginSuccess}
                    />
                  )
                )
                : (
                  <SignupForm
                    name={signupName}
                    email={signupEmail}
                    password={signupPassword}
                    onNameChange={setSignupName}
                    onEmailChange={setSignupEmail}
                    onPasswordChange={setSignupPassword}
                    onSubmit={handleSignup}
                    error={signupError}
                    success={signupSuccess}
                  />
                )}
            </div>
          </div>
        </div>
      )}
      {/* Confirmation Modal */}
      {showConfirm && (
        <ConfirmationModal
          email={confirmEmail}
          onClose={() => setShowConfirm(false)}
        />
      )}

      {/* Inline style for floating label fix */}
      <style>{`
        input:not(:placeholder-shown) + label,
        input:focus + label {
          top: -1rem !important;
          font-size: 0.875rem !important;
          color: #3b82f6 !important;
        }
      `}</style>
    </div>
  );
}
