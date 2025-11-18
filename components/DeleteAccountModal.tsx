"use client";

import { startTransition, useEffect, useRef, useState } from "react";

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}

interface ConfirmationInputProps {
  expectedText: string;
  onTextChange: (text: string) => void;
  isLoading: boolean;
}

function ConfirmationInput({
  expectedText,
  onTextChange,
  isLoading,
}: ConfirmationInputProps) {
  const [text, setText] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newText = e.target.value;
    setText(newText);
    onTextChange(newText);
  };

  return (
    <input
      id="confirmation-text"
      type="text"
      value={text}
      onChange={handleChange}
      className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-destructive/50 focus:border-destructive"
      placeholder={expectedText}
      autoComplete="off"
      disabled={isLoading}
    />
  );
}

export function DeleteAccountModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
}: DeleteAccountModalProps) {
  const [confirmationText, setConfirmationText] = useState("");
  const [modalInstance, setModalInstance] = useState(0);
  const expectedText = "delete my account";
  const isMatch = confirmationText.toLowerCase() === expectedText;
  const prevIsOpenRef = useRef(isOpen);

  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      startTransition(() => {
        setModalInstance((prev) => prev + 1);
      });
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background border border-border rounded-lg shadow-lg w-full max-w-md overflow-hidden">
        <div className="p-6 space-y-4">
          <h3 className="text-lg font-bold text-foreground">
            Are you sure you want to delete your account?
          </h3>

          <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-md text-sm text-foreground">
            <p>
              This action is <strong>permanent</strong>{" "}
              and cannot be undone. All your notes and personal data will be
              wiped immediately.
            </p>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="confirmation-text"
              className="text-sm text-muted-foreground block"
            >
              To confirm, type <strong>{expectedText}</strong> below:
            </label>
            <ConfirmationInput
              key={modalInstance}
              expectedText={expectedText}
              onTextChange={setConfirmationText}
              isLoading={isLoading}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={!isMatch || isLoading}
              className="px-4 py-2 text-sm font-medium bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? "Deleting..." : "Delete Account"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
