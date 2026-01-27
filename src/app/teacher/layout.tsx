"use client";

import AppLayout, { type NavItem } from "@/components/app-layout";
import { LayoutDashboard, BookCopy, Upload, LibrarySquare, Bell, User } from "lucide-react";

const teacherNavItems: NavItem[] = [
  { href: "/teacher/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/teacher/courses", label: "Courses", icon: LibrarySquare },
  { href: "/teacher/exams", label: "Exams", icon: BookCopy },
  { href: "/teacher/upload", label: "Upload Submissions", icon: Upload },
  { href: "/teacher/grievances", label: "Grievances", icon: Bell },
  { href: "/teacher/profile", label: "Profile", icon: User },
];

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppLayout navItems={teacherNavItems} role="teacher">
      {children}
    </AppLayout>
  );
}
