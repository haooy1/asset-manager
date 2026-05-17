"use client";

import { useState, useCallback } from "react";

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: "info" | "warning" | "danger";
}

interface AlertOptions {
  title?: string;
  message: string;
  confirmText?: string;
  type?: "info" | "success" | "error" | "warning";
}

interface DialogState {
  open: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText?: string;
  type: "info" | "warning" | "danger" | "success" | "error";
  resolve?: (value: boolean) => void;
}

/**
 * 内置确认弹窗 Hook
 * @returns {confirm, alert, ConfirmDialog} confirm/alert 方法 + 弹窗组件
 */
export function useDialog() {
  const [dialog, setDialog] = useState<DialogState>({
    open: false,
    title: "",
    message: "",
    confirmText: "确定",
    type: "info",
  });

  const confirm = useCallback(
    (options: ConfirmOptions): Promise<boolean> => {
      return new Promise((resolve) => {
        setDialog({
          open: true,
          title: options.title || "确认操作",
          message: options.message,
          confirmText: options.confirmText || "确定",
          cancelText: options.cancelText || "取消",
          type: options.type || "info",
          resolve,
        });
      });
    },
    [],
  );

  const alert = useCallback(
    (options: AlertOptions): Promise<void> => {
      return new Promise((resolve) => {
        setDialog({
          open: true,
          title: options.title || "提示",
          message: options.message,
          confirmText: options.confirmText || "确定",
          type: options.type || "info",
          resolve: (val: boolean) => {
            if (val) resolve();
          },
        });
      });
    },
    [],
  );

  const handleConfirm = useCallback(() => {
    setDialog((prev) => {
      prev.resolve?.(true);
      return { ...prev, open: false };
    });
  }, []);

  const handleCancel = useCallback(() => {
    setDialog((prev) => {
      prev.resolve?.(false);
      return { ...prev, open: false };
    });
  }, []);

  const ConfirmDialog = useCallback(() => {
    if (!dialog.open) return null;

    const typeStyles = {
      info: { icon: "ℹ️", confirmBg: "bg-blue-600 hover:bg-blue-700", iconBg: "bg-blue-100 text-blue-600" },
      warning: { icon: "⚠️", confirmBg: "bg-yellow-600 hover:bg-yellow-700", iconBg: "bg-yellow-100 text-yellow-600" },
      danger: { icon: "🗑️", confirmBg: "bg-red-600 hover:bg-red-700", iconBg: "bg-red-100 text-red-600" },
      success: { icon: "✅", confirmBg: "bg-green-600 hover:bg-green-700", iconBg: "bg-green-100 text-green-600" },
      error: { icon: "❌", confirmBg: "bg-red-600 hover:bg-red-700", iconBg: "bg-red-100 text-red-600" },
    };

    const style = typeStyles[dialog.type];
    const isAlert = dialog.cancelText === undefined;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl animate-in fade-in zoom-in duration-200">
          <div className="mb-4 flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full text-lg ${style.iconBg}`}>
              {style.icon}
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{dialog.title}</h3>
          </div>
          <p className="mb-6 text-sm leading-relaxed text-gray-600 whitespace-pre-line">{dialog.message}</p>
          <div className="flex justify-end gap-3">
            {!isAlert && (
              <button
                onClick={handleCancel}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                {dialog.cancelText}
              </button>
            )}
            <button
              onClick={handleConfirm}
              className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition ${style.confirmBg}`}
            >
              {dialog.confirmText}
            </button>
          </div>
        </div>
      </div>
    );
  }, [dialog, handleConfirm, handleCancel]);

  return { confirm, alert, ConfirmDialog };
}
