import { FormEvent, useState } from "react";
import { useNavigate } from "react-router";
import { EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Checkbox from "../form/input/Checkbox";
import { useAuth } from "../../context/AuthContext";
import { ApiError } from "../../lib/api";
import LoginResultPopup, {
  type LoginResultStatus,
} from "./LoginResultPopup";

const SUCCESS_REDIRECT_MS = 1700;

type ResultState = {
  status: LoginResultStatus;
  title: string;
  message: string;
} | null;

export default function SignInForm() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResultState>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setResult(null);
    setLoading(true);

    try {
      await login(username.trim(), password, { remember_me: isChecked });
      setResult({
        status: "success",
        title: "Login berhasil",
        message: "Kredensial valid. Anda akan diarahkan ke dashboard MyHR.",
      });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Login failed";
      setResult({
        status: "error",
        title: "Login gagal",
        message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResultClose = () => {
    if (result?.status === "success") {
      navigate("/");
      return;
    }
    setResult(null);
  };

  return (
    <div>
      <div className="mb-7">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-500">
          Sign in
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl dark:text-white/90">
          Welcome back
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
          Enter your credentials to manage human resources operations.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <Label htmlFor="signin-username">Username</Label>
          <Input
            id="signin-username"
            name="username"
            autoComplete="username"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading || result?.status === "success"}
          />
        </div>

        <div>
          <Label htmlFor="signin-password">Password</Label>
          <div className="relative">
            <Input
              id="signin-password"
              name="password"
              autoComplete="current-password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              className="pr-11"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading || result?.status === "success"}
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              className="absolute top-1/2 right-3 z-10 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600 disabled:opacity-50 dark:hover:text-gray-300"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              disabled={loading || result?.status === "success"}
            >
              {showPassword ? (
                <EyeIcon className="fill-gray-500 dark:fill-gray-400" />
              ) : (
                <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400" />
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Checkbox
            id="signin-remember"
            checked={isChecked}
            onChange={setIsChecked}
            disabled={loading || result?.status === "success"}
            label="Keep me logged in"
          />
        </div>

        <button
          type="submit"
          disabled={loading || result?.status === "success"}
          className="group relative w-full overflow-hidden rounded-xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_-12px_rgba(70,95,255,0.8)] transition-all hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-brand-400"
        >
          <span className="absolute inset-0 translate-y-full bg-white/10 transition-transform duration-300 group-hover:translate-y-0" />
          <span className="relative inline-flex items-center justify-center gap-2">
            {loading ? (
              <>
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Signing in…
              </>
            ) : (
              "Sign in to MyHR"
            )}
          </span>
        </button>
      </form>

      <LoginResultPopup
        open={Boolean(result)}
        status={result?.status ?? "error"}
        title={result?.title ?? ""}
        message={result?.message ?? ""}
        onClose={handleResultClose}
        autoCloseMs={
          result?.status === "success" ? SUCCESS_REDIRECT_MS : undefined
        }
      />
    </div>
  );
}
