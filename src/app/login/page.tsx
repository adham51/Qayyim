"use client";

import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Logo} from "@/components/logo";
import Link from "next/link";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {loginUser} from "@/services/authService";

export default function LoginPage() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [email, setEmail] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const handleLogin = async () => {
        // Reset error
        setError(null);

        // Validate inputs
        if (!email || !password) {
            setError("Please enter valid credentials.");
            return;
        }

        setIsLoading(true);

        try {
            const response = await loginUser({email, password});

            console.log("Login response:", response); // Debug log

            // Store token
            if (response.data?.token) {
                localStorage.setItem("token", response.data.token);
            }

            // Get role from correct path: response.data.user.role (not response.data.role)
            const userRole = response.data?.user?.role;

            console.log("userRole:", userRole);

            if (!userRole) {
                setError("Unable to determine user role.");
                return;
            }

            // Redirect based on role
            if (userRole === "STUDENT") {
                router.push("/student/dashboard");
            } else if (userRole === "instructor") {
                router.push("/teacher/dashboard");
            } else {
                setError("Invalid user role.");
            }
        } catch (error: any) {
            console.error("Login Error:", error);
            const errorMessage = error.message || "An unexpected error occurred.";
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
                    <CardTitle className="font-headline text-2xl">Welcome Back</CardTitle>
                    <CardDescription>Enter your credentials to access your account</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                    {error && (
                        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                            {error}
                        </div>
                    )}
                    <div className="grid gap-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="m@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={isLoading}
                            required/>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="&#9679;&#9679;&#9679;&#9679;&#9679;"
                            disabled={isLoading}
                            required
                        />
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                    <div className="w-1/2">
                        <Button
                            className="w-full"
                            onClick={handleLogin}
                            disabled={isLoading}
                        >
                            {isLoading ? "Logging in..." : "Login"}
                        </Button>
                    </div>
                    <div className="text-center text-sm">
                        <Link href="/forgot-password" className="underline">
                            Forgot your password?
                        </Link>
                    </div>
                </CardFooter>
            </Card>
            <p className="mt-4 text-center text-sm text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Link href="/register" className="font-semibold text-primary underline">
                    Sign up
                </Link>
            </p>
        </div>
    );
}