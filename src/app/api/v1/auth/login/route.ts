import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { comparePassword, generateToken } from '@/lib/auth';
import { loginSchema } from '@/lib/validations';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validatedData = loginSchema.parse(body);
    
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });
    
    if (!user) {
      return errorResponse('Invalid email or password', 401);
    }
    
    // Verify password
    const isPasswordValid = await comparePassword(validatedData.password, user.password);
    
    if (!isPasswordValid) {
      return errorResponse('Invalid email or password', 401);
    }
    
    // Determine role by checking Instructor or Student record
    let role = null;
    const instructor = await prisma.instructor.findUnique({ where: { userId: user.id } });
    if (instructor) {
      role = "instructor";
    } else {
      const student = await prisma.student.findUnique({ where: { userId: user.id } });
      if (student) {
        role = "student";
      }
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role,
    });
    
    // Return user data (exclude password)
    const { password: _, ...userWithoutPassword } = user;
    
    return successResponse(
      { user: { ...userWithoutPassword, role }, token },
      'Login successful'
    );
  } catch (error) {
    return handleApiError(error);
  }
}

