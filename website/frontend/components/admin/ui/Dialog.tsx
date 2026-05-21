"use client";

import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "./Core";
import { AlertCircleIcon, InfoIcon, ShieldIcon } from "../Icons";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  variant?: "info" | "warning" | "danger" | "success";
}

export function Modal({ isOpen, onClose, title, description, children, variant = "info" }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => { document.body.style.overflow = "unset"; };
  }, [isOpen]);

  if (!isOpen) return null;

  const icons = {
    info: <InfoIcon className="h-6 w-6 text-blue-400" />,
    warning: <AlertCircleIcon className="h-6 w-6 text-amber-400" />,
    danger: <AlertCircleIcon className="h-6 w-6 text-rose-400" />,
    success: <ShieldIcon className="h-6 w-6 text-emerald-400" />,
  };

  const borders = {
    info: "border-blue-500/20",
    warning: "border-amber-500/20",
    danger: "border-rose-500/20",
    success: "border-emerald-500/20",
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      {/* Content */}
      <div className={`relative w-full max-w-md bg-slate-900 border ${borders[variant]} rounded-3xl shadow-2xl animate-in fade-in zoom-in duration-300`}>
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`h-12 w-12 rounded-2xl bg-slate-950 border ${borders[variant]} flex items-center justify-center shrink-0`}>
              {icons[variant]}
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white tracking-tight">{title}</h3>
              {description && <p className="text-sm text-slate-400 leading-relaxed">{description}</p>}
            </div>
          </div>
          
          <div className="mt-6">
            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

interface ConfirmDialogProps extends Omit<ModalProps, "children"> {
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
}

export function ConfirmDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  description, 
  variant = "danger",
  confirmText = "Confirm Action",
  cancelText = "Cancel",
  isLoading = false
}: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} description={description} variant={variant}>
      <div className="flex gap-3 justify-end">
        <Button variant="ghost" onClick={onClose} disabled={isLoading}>
          {cancelText}
        </Button>
        <Button 
          variant={variant === "danger" ? "danger" : "primary"} 
          onClick={onConfirm}
          isLoading={isLoading}
        >
          {confirmText}
        </Button>
      </div>
    </Modal>
  );
}

interface AlertDialogProps extends Omit<ModalProps, "children"> {
  buttonText?: string;
}

export function AlertDialog({ 
  isOpen, 
  onClose, 
  title, 
  description, 
  variant = "info",
  buttonText = "Understood"
}: AlertDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} description={description} variant={variant}>
      <div className="flex justify-end">
        <Button variant="primary" onClick={onClose}>
          {buttonText}
        </Button>
      </div>
    </Modal>
  );
}
