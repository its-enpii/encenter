'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/admin/ui/Core';
import { Input } from '@/components/admin/ui/Form';
import { ShieldIcon } from '@/components/admin/Icons';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem('auth_token');
        if (token) {
            router.replace('/admin');
        }
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await apiFetch('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (res.ok) {
                localStorage.setItem('auth_token', data.token);
                router.push('/admin'); // Redirect to admin after login
            } else {
                setError(data.message || 'Authentication failed. Please verify your credentials.');
            }
        } catch (err) {
            setError('System link error. Connection to secure vault lost.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-200 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-500/10 via-slate-950 to-slate-950"></div>
            <div className="absolute top-1/4 left-1/4 h-96 w-96 bg-emerald-500/5 rounded-full blur-[120px] animate-pulse"></div>
            
            <div className="max-w-md w-full p-10 relative z-10">
                <div className="bg-slate-900/40 backdrop-blur-2xl rounded-3xl border border-slate-800 shadow-2xl p-8 transition-all hover:border-emerald-500/20">
                    <div className="text-center mb-10">
                        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-4 shadow-inner">
                            <ShieldIcon className="h-8 w-8 text-emerald-400" />
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
                            EnCenter <span className="text-emerald-500">Access</span>
                        </h1>
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                            Secure Server Control Center
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold uppercase tracking-wide text-center animate-shake">
                                {error}
                            </div>
                        )}

                        <Input 
                            label="Operator Identity (Email)" 
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="operator@envault.io"
                            required
                            autoFocus
                        />

                        <Input 
                            label="Access Cipher (Password)" 
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />

                        <div className="pt-2">
                            <Button 
                                type="submit" 
                                className="w-full h-12 text-base" 
                                variant="primary" 
                                isLoading={loading}
                            >
                                {loading ? 'DECRYPTING...' : 'INITIALIZE ACCESS'}
                            </Button>
                        </div>
                    </form>

                    <div className="mt-10 pt-8 border-t border-slate-800 flex flex-col items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                AES-256 Encrypted Session
                            </span>
                        </div>
                        <p className="text-[10px] text-slate-600 text-center max-w-[200px] leading-relaxed">
                            Authorized personnel only. All access attempts are logged and monitored.
                        </p>
                    </div>
                </div>
            </div>

            {/* Subtle Grid Pattern */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
        </div>
    );
}
