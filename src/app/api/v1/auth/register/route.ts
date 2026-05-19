import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, generateToken, validatePassword } from '@/lib/auth';
import { registerSchema } from '@/lib/validations';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { sendWelcomeEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate input
        const validatedData = registerSchema.parse(body);

        // Validate password strength
        const passwordValidation = validatePassword(validatedData.password);
        if (!passwordValidation.isValid) {
            console.error('Password validation failed:', passwordValidation.errors);
            return errorResponse('Password validation failed', 400, passwordValidation.errors);
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email: validatedData.email },
        });

        if (existingUser) {
            console.warn('Attempt to register with existing email:', validatedData.email);
            return errorResponse('User with this email already exists', 409);
        }

        // Hash password
        const hashedPassword = await hashPassword(validatedData.password);

        // Create user
        const user = await prisma.user.create({
            data: {
                email: validatedData.email,
                name: validatedData.name,
                password: hashedPassword,
            },
            select: {
                id: true,
                email: true,
                name: true,
                createdAt: true,
            },
        });

        // Create Instructor or Student record based on role
        const role: "instructor" | "student" = validatedData.role;
        if (role === "instructor") {
            await prisma.instructor.create({
                data: { userId: user.id }
            });
        } else if (role === "student") {
            await prisma.student.create({
                data: { userId: user.id }
            });
        }

        // Generate JWT token with role
        const token = generateToken({
            userId: user.id,
            email: user.email,
            role, // Added role to token
        });

        console.log(token);
        console.log("sending email");

        // Send welcome email (don't await to not block response)
        sendWelcomeEmail(user.email, user.name, validatedData.role).catch(err =>
            console.error('Failed to send welcome email:', err)
        );

        console.log("email sent!");

        return successResponse(
            { user: { ...user, role }, token }, // Include role in response
            'User registered successfully',
            201
        );
    } catch (error) {
        return handleApiError(error);
    }
}