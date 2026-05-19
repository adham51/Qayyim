"use client";

import AppLayout, {type NavItem} from "@/components/app-layout";
import {LayoutDashboard, GraduationCap, FileWarning, User, Library} from "lucide-react";

const studentNavItems: NavItem[] = [
    {href: "/student/dashboard", label: "Dashboard", icon: LayoutDashboard},
    {href: "/student/courses", label: "My Courses", icon: Library},
    {href: "/student/results", label: "My Results", icon: GraduationCap},
    {href: "/student/grievance", label: "Submit Grievance", icon: FileWarning},
    {href: "/student/profile", label: "Profile", icon: User},
];

export default function StudentLayout({
                                          children,
                                      }: {
    children: React.ReactNode;
}) {
    return (
        <AppLayout navItems={studentNavItems}
                   role="student">
            {children}
        </AppLayout>
    );
}
