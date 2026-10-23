import { FormEvent, useState } from "react";
import type { AuthUser } from "../../types/auth";
import { authService } from "../../services/auth";
import { ApiError } from "../../lib/api";
import { EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Button from "../ui/button/Button";
import Alert from "../ui/alert/Alert";
import { displayValue } from "./profileUtils";

type ChangePasswordCardProps = {
  user: AuthUser;
};

type VisibilityKey = "old" | "new" | "confirm";

const MIN_PASSWORD_LENGTH = 6;

export default function ChangePasswordCard({ user }: ChangePasswordCardProps) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [visibility, setVisibility] = useState<Record<VisibilityKey, boolean>>({
    old: false,
    new: false,
    confirm: false,
  });
  const [fieldError, setFieldError] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  function toggleVisibility(key: VisibilityKey) {
    setVisibility((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function resetForm() {
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setVisibility({ old: false, new: false, confirm: false });
  }

  function validate(): string | null {
    if (!oldPassword || !newPassword || !confirmPassword) {
      return "Current password, new password, and confirmation are required.";
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      return `New password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    }
    if (newPassword !== confirmPassword) {
      return "New password confirmation does not match.";
    }
    if (oldPassword === newPassword) {
      return "New password must be different from the current password.";
    }
    return null;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setFieldError("");

    const validationError = validate();
    if (validationError) {
      setFieldError(validationError);
      return;
    }

    setLoading(true);
    try {
      const result = await authService.changePassword({
        old_password: oldPassword,
        new_password: newPassword,
        renew_password: confirmPassword,
      });

      if (!result.success) {
        setError(result.message || "Failed to change password.");
        return;
      }

      setSuccess(result.message || "Password changed successfully.");
      resetForm();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to change password.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 p-5 dark:border-gray-800 lg:p-6">
      <div className="mb-5 lg:mb-6">
        <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          Security
        </h4>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Change your password. Username is your account identity and cannot be
          edited here.
        </p>
      </div>

      <div className="mb-5 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-white/[0.03]">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
          Account username
        </p>
        <p className="mt-1 font-mono text-sm font-medium text-gray-800 dark:text-white/90">
          {displayValue(user.username)}
        </p>
      </div>

      {success ? (
        <div className="mb-4">
          <Alert variant="success" title="Password updated" message={success} />
        </div>
      ) : null}

      {error ? (
        <div className="mb-4">
          <Alert variant="error" title="Could not update password" message={error} />
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <PasswordField
          id="old_password"
          label="Current password"
          value={oldPassword}
          visible={visibility.old}
          onToggle={() => toggleVisibility("old")}
          onChange={setOldPassword}
          disabled={loading}
          autoComplete="current-password"
        />

        <div>
          <PasswordField
            id="new_password"
            label="New password"
            value={newPassword}
            visible={visibility.new}
            onToggle={() => toggleVisibility("new")}
            onChange={setNewPassword}
            disabled={loading}
            autoComplete="new-password"
          />
          <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
            At least {MIN_PASSWORD_LENGTH} characters
          </p>
        </div>

        <PasswordField
          id="renew_password"
          label="Confirm new password"
          value={confirmPassword}
          visible={visibility.confirm}
          onToggle={() => toggleVisibility("confirm")}
          onChange={setConfirmPassword}
          disabled={loading}
          autoComplete="new-password"
        />

        {fieldError ? (
          <p className="text-sm text-error-500" role="alert">
            {fieldError}
          </p>
        ) : null}

        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={loading}>
            {loading ? "Updating..." : "Change password"}
          </Button>
        </div>
      </form>
    </div>
  );
}

type PasswordFieldProps = {
  id: string;
  label: string;
  value: string;
  visible: boolean;
  onToggle: () => void;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoComplete?: string;
};

function PasswordField({
  id,
  label,
  value,
  visible,
  onToggle,
  onChange,
  disabled,
  autoComplete,
}: PasswordFieldProps) {
  return (
    <div>
      <Label htmlFor={id}>
        {label} <span className="text-error-500">*</span>
      </Label>
      <div className="relative">
        <Input
          id={id}
          name={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          autoComplete={autoComplete}
          className="pr-11"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute z-30 -translate-y-1/2 right-4 top-1/2 rounded p-0.5 text-gray-500 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 dark:text-gray-400 dark:hover:text-gray-200"
          aria-label={visible ? `Hide ${label}` : `Show ${label}`}
        >
          {visible ? (
            <EyeIcon className="fill-current size-5" />
          ) : (
            <EyeCloseIcon className="fill-current size-5" />
          )}
        </button>
      </div>
    </div>
  );
}
