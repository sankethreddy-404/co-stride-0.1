"use client";

import React from 'react';

export default function AIChatLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="h-full">
            {children}
        </div>
    );
}