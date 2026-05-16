"use client";

import React, { useState } from "react";
import { EyeIcon, EyeOffIcon } from "@/components/admin/Icons";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, className = "", type, ...props }: InputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const inputType = isPassword ? (showPassword ? "text" : "password") : type;

  return (
    <div className="space-y-1.5 w-full">
      {label && <label className="text-xs font-bold uppercase tracking-widest text-slate-500">{label}</label>}
      <div className="relative group">
        <input 
          type={inputType}
          className={`w-full rounded-lg bg-slate-900 border border-slate-800 px-4 py-2.5 text-sm text-slate-200 outline-none transition-all focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 placeholder:text-slate-600 ${isPassword ? 'pr-12' : ''} ${className}`}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={togglePasswordVisibility}
            className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all focus:outline-none"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOffIcon className="h-4 w-4" />
            ) : (
              <EyeIcon className="h-4 w-4" />
            )}
          </button>
        )}
      </div>
      {hint && !error && <p className="text-[10px] text-slate-500 font-medium">{hint}</p>}
      {error && <p className="text-[10px] font-bold text-rose-500 uppercase">{error}</p>}
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Textarea({ label, error, hint, className = "", ...props }: TextareaProps) {
  return (
    <div className="space-y-1.5 w-full">
      {label && <label className="text-xs font-bold uppercase tracking-widest text-slate-500">{label}</label>}
      <textarea 
        className={`w-full rounded-lg bg-slate-900 border border-slate-800 px-4 py-2.5 text-sm text-slate-200 outline-none transition-all focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 placeholder:text-slate-600 min-h-[100px] ${className}`}
        {...props}
      />
      {hint && !error && <p className="text-[10px] text-slate-500 font-medium">{hint}</p>}
      {error && <p className="text-[10px] font-bold text-rose-500 uppercase">{error}</p>}
    </div>
  );
}

export function Switcher({ label, checked, onChange }: { label?: string, checked: boolean, onChange: (val: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4">
      {label && <span className="text-sm font-medium text-slate-300">{label}</span>}
      <button 
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:ring-offset-2 focus:ring-offset-slate-950 ${checked ? 'bg-emerald-500' : 'bg-slate-800'}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );
}

export function Checkbox({ label, checked, onChange, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group">
      <div className="relative flex items-center justify-center">
        <input 
          type="checkbox" 
          checked={checked}
          onChange={(e) => onChange && onChange(e)}
          className="peer sr-only" 
          {...props}
        />
        <div className="h-5 w-5 rounded border border-slate-800 bg-slate-900 transition-all peer-checked:bg-emerald-500 peer-checked:border-emerald-500 group-hover:border-slate-700" />
        <svg className="absolute h-3 w-3 text-slate-950 opacity-0 peer-checked:opacity-100 transition-opacity" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      {label && <span className="text-sm text-slate-300 group-hover:text-white transition-colors">{label}</span>}
    </label>
  );
}

export function Radio({ label, name, checked, onChange, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group">
      <div className="relative flex items-center justify-center">
        <input 
          type="radio" 
          name={name}
          checked={checked}
          onChange={(e) => onChange && onChange(e)}
          className="peer sr-only" 
          {...props}
        />
        <div className="h-5 w-5 rounded-full border border-slate-800 bg-slate-900 transition-all peer-checked:border-emerald-500 group-hover:border-slate-700" />
        <div className="absolute h-2.5 w-2.5 rounded-full bg-emerald-500 opacity-0 peer-checked:opacity-100 transition-opacity" />
      </div>
      {label && <span className="text-sm text-slate-300 group-hover:text-white transition-colors">{label}</span>}
    </label>
  );
}

export function FileInput({ label, onChange }: { label?: string, onChange?: (file: File | null) => void }) {
  return (
    <div className="space-y-1.5">
      {label && <label className="text-xs font-bold uppercase tracking-widest text-slate-500">{label}</label>}
      <div className="relative group">
        <input 
          type="file" 
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          onChange={(e) => onChange && onChange(e.target.files?.[0] || null)}
        />
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-dashed border-slate-800 bg-slate-900/50 group-hover:border-emerald-500/50 group-hover:bg-slate-900 transition-all text-sm text-slate-400 group-hover:text-slate-200">
          <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
          <span>Choose file or drag & drop</span>
        </div>
      </div>
    </div>
  );
}

interface Option {
  label: string;
  value: string;
}

export function SmartSelect({ 
  label, 
  options, 
  value, 
  onChange, 
  placeholder = "Select option..." 
}: { 
  label?: string, 
  options: Option[], 
  value: string, 
  onChange: (val: string) => void, 
  placeholder?: string 
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);

  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  const selectedOption = options.find(opt => opt.value === value);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`w-full relative ${label ? 'space-y-1.5' : ''}`} ref={containerRef}>
      {label && <label className="text-xs font-bold uppercase tracking-widest text-slate-500">{label}</label>}
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-4 rounded-lg bg-slate-900 border border-slate-800 px-4 py-2.5 text-sm transition-all focus:border-emerald-500/50 ${selectedOption ? 'text-slate-200' : 'text-slate-500'}`}
      >
        <span>{selectedOption ? selectedOption.label : placeholder}</span>
        <svg className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
          <div className="p-2 border-b border-slate-800">
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-emerald-500/50"
            />
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                    setSearch("");
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-slate-800 ${opt.value === value ? 'text-emerald-400 bg-emerald-500/5' : 'text-slate-300'}`}
                >
                  {opt.label}
                </button>
              ))
            ) : (
              <div className="px-4 py-4 text-xs text-slate-500 italic text-center">No results found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
