"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { SearchIcon } from "../Icons";
import { apiFetch } from "@/lib/api";
import { SmartSelect } from "./Form";

interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => React.ReactNode);
  className?: string;
  align?: "left" | "right" | "center";
}

interface SmartTableProps<T> {
  fetchUrl?: string; // If provided, fetching is server-side
  initialData?: T[]; // Fallback for client-side or initial SSR
  columns: Column<T>[];
  searchPlaceholder?: string;
  refreshKey?: number; // External trigger to reload data
}

export function SmartTable<T extends object>({ 
  fetchUrl, 
  initialData = [], 
  columns, 
  searchPlaceholder = "Search...",
  refreshKey = 0
}: SmartTableProps<T>) {
  const [data, setData] = useState<T[]>(initialData);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(initialData.length);
  const [isLoading, setIsLoading] = useState(false);

  // Per page options
  const perPageOptions = [
    { label: "5 Items", value: "5" },
    { label: "10 Items", value: "10" },
    { label: "20 Items", value: "20" },
    { label: "50 Items", value: "50" },
    { label: "100 Items", value: "100" },
  ];

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (!fetchUrl) return;

    const controller = new AbortController();
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: itemsPerPage.toString(),
          search: debouncedSearch,
        });

        const cleanUrl = fetchUrl.startsWith('/api/v1') ? fetchUrl.replace('/api/v1', '') : fetchUrl;
        const response = await apiFetch(`${cleanUrl}?${params.toString()}`, {
          signal: controller.signal
        });
        const result = await response.json();

        setData(result.data || []);
        setTotalItems(result.total || 0);
      } catch (error: any) {
        if (error.name === 'AbortError') return;
        console.error("Failed to fetch table data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    return () => controller.abort();
  }, [fetchUrl, currentPage, itemsPerPage, debouncedSearch, refreshKey]);

  // Client-side fallback if no fetchUrl
  const displayData = useMemo(() => {
    if (fetchUrl) return data;
    
    // Client side filtering/pagination if no URL
    const filtered = initialData.filter((item) =>
      Object.values(item).some(
        (val) => val && val.toString().toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
    
    setTotalItems(filtered.length);
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [data, initialData, fetchUrl, searchTerm, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  return (
    <div className="space-y-4">
      {/* Top Bar: Search and Per Page */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="relative w-full sm:max-w-xs group">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <SearchIcon className="h-4 w-4 text-slate-500 group-focus-within:text-emerald-500 transition-colors" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder={searchPlaceholder}
            className="w-full rounded-xl bg-slate-950 border border-slate-800 py-2.5 pl-10 pr-4 text-sm text-slate-200 outline-none transition-all focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 placeholder:text-slate-600"
          />
          {isLoading && (
            <div className="absolute inset-y-0 right-3 flex items-center">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500/20 border-t-emerald-500"></div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 min-w-[140px]">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 whitespace-nowrap">Per View</span>
          <SmartSelect 
            options={perPageOptions}
            value={itemsPerPage.toString()}
            onChange={(val) => {
              setItemsPerPage(Number(val));
              setCurrentPage(1);
            }}
            placeholder={itemsPerPage.toString()}
          />
        </div>
      </div>

      {/* Table Container */}
      <div className="relative rounded-2xl border border-slate-800 bg-slate-900/40 shadow-xl overflow-hidden min-h-[200px]">
        {isLoading && (
          <div className="absolute inset-0 bg-slate-950/20 backdrop-blur-[2px] z-20 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500/20 border-t-emerald-500"></div>
              <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Synchronizing...</span>
            </div>
          </div>
        )}
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/50 border-b border-slate-800 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                {columns.map((col, idx) => (
                  <th key={idx} className={`px-6 py-4 ${col.className || ""}`}>
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={`divide-y divide-slate-800/50 text-sm transition-opacity duration-200 ${isLoading ? 'opacity-40' : 'opacity-100'}`}>
              {displayData.length > 0 ? (
                displayData.map((item, rowIdx) => (
                  <tr key={rowIdx} className="hover:bg-slate-800/30 transition-colors group">
                    {columns.map((col, colIdx) => (
                      <td key={colIdx} className={`px-6 py-4 ${col.className || ""} ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : ""}`}>
                        {typeof col.accessor === "function" 
                          ? col.accessor(item) 
                          : (item[col.accessor as keyof T] as React.ReactNode)}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-500">
                      <svg className="h-10 w-10 opacity-20" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                      <span className="text-sm italic">No data records found for &quot;{searchTerm}&quot;</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            Showing <span className="text-slate-300">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-slate-300">{Math.min(currentPage * itemsPerPage, totalItems)}</span> of <span className="text-slate-300">{totalItems}</span>
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1 || isLoading}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-emerald-400 disabled:opacity-30 disabled:pointer-events-none transition-all"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/></svg>
            </button>
            
            <div className="flex items-center gap-1 px-2">
              {[...Array(totalPages)].map((_, i) => {
                // Show first, last, and current page with neighbors
                if (i === 0 || i === totalPages - 1 || (i >= currentPage - 2 && i <= currentPage)) {
                   return (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`h-8 w-8 rounded-lg text-xs font-bold transition-all ${
                        currentPage === i + 1 
                          ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20" 
                          : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      {i + 1}
                    </button>
                  );
                }
                if (i === 1 || i === totalPages - 2) return <span key={i} className="text-slate-700">...</span>;
                return null;
              })}
            </div>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || isLoading}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-emerald-400 disabled:opacity-30 disabled:pointer-events-none transition-all"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
