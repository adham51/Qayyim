"use client";

import {Component, useState} from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Logo } from "@/components/logo";
import Link from "next/link";
import { registerUser } from "@/services/authService";
import { useRouter } from "next/navigation";
import PasswordValidityChecker from "@/components/ui/password-checker"; // ✅ Correct import for App Router

export default function RegisterPage() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState("student");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [passwordValidity, setPasswordValidity] = useState({
        minLength: false,
        uppercase: false,
        lowercase: false,
        number: false,
        specialChar: false,
    });

    const router = useRouter();

    const handleRegister = async () => {
        setError("");

        // Validate fields
        if (!name || !email || !password || !role) {
            setError("Please fill in all fields");
            return;
        }

        setIsLoading(true);

        try {
            const response = await registerUser({ name, email, password, role });
            console.log("User registered successfully:", response);

            if (response.data?.token) {
                localStorage.setItem("token", response.data.token);
            }

            // Redirect based on role
            if (role === "student") {
                router.push("/student/dashboard");
            } else if (role === "instructor") {
                router.push("/teacher/dashboard");
            }

        } catch (error: any) {
            console.error("Registration Error:", error);
            const errorMessage = error.response?.data?.message || error.message || "An unexpected error occurred.";
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-muted">
            <div className="mb-8">
                <Logo/>
            </div>
            <Card className="w-full max-w-sm">
                <CardHeader className="text-center">
                    <CardTitle className="font-headline text-2xl">Create an Account</CardTitle>
                    <CardDescription>Join Qayyim to streamline your grading workflow.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                    {error && (
                        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                            {error}
                        </div>
                    )}
                    <div className="grid gap-2">
                        <Label htmlFor="full-name">Full Name</Label>
                        <Input
                            id="full-name"
                            placeholder="John Doe"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            disabled={isLoading}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="m@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={isLoading}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => {
                                const newPassword = e.target.value;
                                setPassword(newPassword);
                                setPasswordValidity({
                                    minLength: newPassword.length >= 8,
                                    uppercase: /[A-Z]/.test(newPassword),
                                    lowercase: /[a-z]/.test(newPassword),
                                    number: /[0-9]/.test(newPassword),
                                    specialChar: /[@$!%*?&]/.test(newPassword),
                                });
                            }}
                            required
                            disabled={isLoading}
                        />
                        <PasswordValidityChecker passwordValidity={passwordValidity}/>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="role">Role</Label>
                        <Select onValueChange={
                            (value) => {
                                setRole(value);
                            }
                        }
                                disabled={isLoading}>
                            <SelectTrigger id="role">
                                <SelectValue placeholder="Select your role"/>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="instructor">Teacher</SelectItem>
                                <SelectItem value="student">Student</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col">
                    <Button
                        className="w-full"
                        onClick={handleRegister}
                        disabled={isLoading}
                    >
                        {isLoading ? "Creating Account..." : "Create Account"}
                    </Button>
                </CardFooter>
            </Card>
            <p className="mt-4 text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link href="/login"
                      className="font-semibold text-primary underline">
                    Login
                </Link>
            </p>
        </div>
    );
}