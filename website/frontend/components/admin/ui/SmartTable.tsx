"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
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
  
  // Separate initial loading from background refresh
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const hasFetchedOnce = useRef(false);

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
      // Only show full loading on first ever fetch
      if (!hasFetchedOnce.current) {
        setIsInitialLoad(true);
      } else {
        setIsRefreshing(true);
      }

      try {
        const params = new URLSearchParams({
          page: currentPage.toString(),
          per_page: itemsPerPage.toString(),
          search: debouncedSearch,
        });

        const response = await apiFetch(`${fetchUrl}?${params.toString()}`, {
          signal: controller.signal
        });
        const result = await response.json();

        // Handle Laravel Pagination format (result.data.data)
        // or Simple format (result.data as array)
        if (result.data && Array.isArray(result.data)) {
          setData(result.data);
          setTotalItems(result.total || result.data.length);
        } else if (result.data && result.data.data && Array.isArray(result.data.data)) {
          setData(result.data.data);
          setTotalItems(result.data.total || 0);
        } else {
          setData([]);
          setTotalItems(0);
        }

        hasFetchedOnce.current = true;
      } catch (error: any) {
        if (error.name === 'AbortError') return;
        console.error("Failed to fetch table data:", error);
      } finally {
        setIsInitialLoad(false);
        setIsRefreshing(false);
      }
    };

    fetchData();
    return () => controller.abort();
  }, [fetchUrl, currentPage, itemsPerPage, debouncedSearch, refreshKey]);

  // Show full loading on page/perPage/search change (user-initiated navigation)
  const handlePageChange = useCallback((page: number) => {
    hasFetchedOnce.current = false;
    setCurrentPage(page);
  }, []);

  const handlePerPageChange = useCallback((val: string) => {
    hasFetchedOnce.current = false;
    setItemsPerPage(Number(val));
    setCurrentPage(1);
  }, []);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    hasFetchedOnce.current = false;
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  }, []);

  // Client-side fallback if no fetchUrl
  const displayData = useMemo(() => {
    if (fetchUrl) return data;
    
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
            onChange={handleSearchChange}
            placeholder={searchPlaceholder}
            className="w-full rounded-xl bg-slate-950 border border-slate-800 py-2.5 pl-10 pr-4 text-sm text-slate-200 outline-none transition-all focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 placeholder:text-slate-600"
          />
          {/* Subtle spinner for background refresh — non-blocking */}
          {isRefreshing && (
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
            onChange={handlePerPageChange}
            placeholder={itemsPerPage.toString()}
          />
        </div>
      </div>

      {/* Table Container */}
      <div className="relative rounded-2xl border border-slate-800 bg-slate-900/40 shadow-xl overflow-hidden min-h-[200px]">
        {/* Full loading overlay ONLY on initial load */}
        {isInitialLoad && (
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px] z-20 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500/20 border-t-emerald-500"></div>
              <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Loading...</span>
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
            <tbody className="divide-y divide-slate-800/50 text-sm">
              {data.length > 0 ? (
                data.map((item, rowIdx) => (
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
                      <span className="text-sm italic">No data records found {searchTerm ? `for "${searchTerm}"` : ''}</span>
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
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1 || isInitialLoad}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-emerald-400 disabled:opacity-30 disabled:pointer-events-none transition-all"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/></svg>
            </button>
            
            <div className="flex items-center gap-1 px-2">
              {[...Array(totalPages)].map((_, i) => {
                if (i === 0 || i === totalPages - 1 || (i >= currentPage - 2 && i <= currentPage)) {
                   return (
                    <button
                      key={i}
                      onClick={() => handlePageChange(i + 1)}
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
              onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages || isInitialLoad}
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

