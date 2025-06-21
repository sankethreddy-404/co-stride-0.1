"use client";

import React from 'react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { BarChart3, MessageSquare, Settings } from 'lucide-react';

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
    const params = useParams();
    const pathname = usePathname();
    const workspaceId = params.workspaceId as string;

    const navigation = [
        {
            name: 'Feed',
            href: `/app/workspaces/${workspaceId}`,
            icon: MessageSquare,
            exact: true
        },
        {
            name: 'Dashboard',
            href: `/app/workspaces/${workspaceId}/dashboard`,
            icon: BarChart3,
            exact: false
        },
        {
            name: 'Settings',
            href: `/app/workspaces/${workspaceId}/settings`,
            icon: Settings,
            exact: false
        }
    ];

    return (
        <div className="space-y-6">
            {/* Workspace Navigation */}
            <div className="border-b border-gray-200">
                <nav className="flex space-x-8 px-6">
                    {navigation.map((item) => {
                        const isActive = item.exact 
                            ? pathname === item.href
                            : pathname.startsWith(item.href);
                        
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                                    isActive
                                        ? 'border-primary-500 text-primary-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                <item.icon className="h-4 w-4" />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            {/* Page Content */}
            <div className="px-0">
                {children}
            </div>
        </div>
    );
}