import { PrismaClient, ExamType, SubmissionStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting seed...');

    // Clear existing data in correct order (respecting foreign keys)
    await prisma.grievance.deleteMany();
    await prisma.submission.deleteMany();
    await prisma.exam.deleteMany();
    await prisma.$executeRaw`DELETE FROM _CourseInstructors`;
    await prisma.$executeRaw`DELETE FROM _CourseStudents`;
    await prisma.course.deleteMany();
    await prisma.instructor.deleteMany();
    await prisma.student.deleteMany();
    await prisma.user.deleteMany();

    console.log('Cleared existing data');

    // Create Users
    const user1 = await prisma.user.create({
        data: {
            id: 'cmhfehuiv00007kicjtc4h4zx',
            email: 'mm@m.com',
            password: '$2b$10$zi8Orc.TM87XkZEVWDkdiO0H5sGjwh.zaFlvjFvBNDNS4frSY3Nr.',
            name: 'Mohamed Ahmed',
            createdAt: new Date('2025-10-31T22:04:09.800Z'),
            updatedAt: new Date('2025-11-28T20:55:10.614Z'),
        },
    });

    const user2 = await prisma.user.create({
        data: {
            id: 'cmhfemzx600037kicc6lzbv8e',
            email: 'ymansy@gmail.com',
            password: '$2b$10$aL7amsJ4ZjaYMcimdxg.O.nbELb5R1baJCiLoeKeWEvsS1i2f9whW',
            name: 'Youssef Mohamed Mansy',
            createdAt: new Date('2025-10-31T22:08:10.074Z'),
            updatedAt: new Date('2025-11-28T18:41:26.808Z'),
        },
    });

    console.log('Created users');

    // Create Instructor
    const instructor1 = await prisma.instructor.create({
        data: {
            id: 'cmhfehuu200027kic5hrxn5rm',
            userId: user1.id,
        },
    });

    console.log('Created instructor');

    // Create Student
    const student1 = await prisma.student.create({
        data: {
            id: 'cmhfemzzt00057kicoeo82gdz',
            userId: user2.id,
        },
    });

    console.log('Created student');

    // Create Courses
    await prisma.course.createMany({
        data: [
            {
                id: 'clcourse001',
                courseCode: 'CS101',
                courseName: 'Introduction to Computer Science',
                sectionType: 'LECTURE',
                academicYear: '2024-2025',
                semester: 'FALL',
                isActive: true,
                sectionNumber: '001',
            },
            {
                id: 'clcourse002',
                courseCode: 'CS101',
                courseName: 'Introduction to Computer Science',
                sectionType: 'LAB',
                academicYear: '2024-2025',
                semester: 'FALL',
                isActive: true,
                sectionNumber: '001',
            },
            {
                id: 'clcourse003',
                courseCode: 'CS202',
                courseName: 'Data Structures and Algorithms',
                sectionType: 'LECTURE',
                academicYear: '2024-2025',
                semester: 'FALL',
                isActive: true,
                sectionNumber: '001',
            },
            {
                id: 'clcourse004',
                courseCode: 'CS202',
                courseName: 'Data Structures and Algorithms',
                sectionType: 'LAB',
                academicYear: '2024-2025',
                semester: 'FALL',
                isActive: true,
                sectionNumber: '002',
            },
            {
                id: 'clcourse005',
                courseCode: 'MATH201',
                courseName: 'Calculus II',
                sectionType: 'LECTURE',
                academicYear: '2024-2025',
                semester: 'FALL',
                isActive: true,
                sectionNumber: '001',
            },
            {
                id: 'clcourse006',
                courseCode: 'MATH201',
                courseName: 'Calculus II',
                sectionType: 'TUTORIAL',
                academicYear: '2024-2025',
                semester: 'FALL',
                isActive: true,
                sectionNumber: '001',
            },
            {
                id: 'clcourse007',
                courseCode: 'ENG301',
                courseName: 'Technical Writing',
                sectionType: 'LECTURE',
                academicYear: '2024-2025',
                semester: 'SPRING',
                isActive: true,
                sectionNumber: '001',
            },
            {
                id: 'clcourse008',
                courseCode: 'CS303',
                courseName: 'Database Systems',
                sectionType: 'LECTURE',
                academicYear: '2024-2025',
                semester: 'SPRING',
                isActive: true,
                sectionNumber: '001',
            },
            {
                id: 'clcourse009',
                courseCode: 'CS303',
                courseName: 'Database Systems',
                sectionType: 'LAB',
                academicYear: '2024-2025',
                semester: 'SPRING',
                isActive: true,
                sectionNumber: '001',
            },
            {
                id: 'clcourse010',
                courseCode: 'PHY101',
                courseName: 'Physics I',
                sectionType: 'LECTURE',
                academicYear: '2024-2025',
                semester: 'FALL',
                isActive: true,
                sectionNumber: '001',
            },
        ],
    });

    console.log('Created courses');

    // Connect Courses to Instructor
    await prisma.instructor.update({
        where: { id: instructor1.id },
        data: {
            courses: {
                connect: [
                    { id: 'clcourse001' },
                    { id: 'clcourse002' },
                    { id: 'clcourse003' },
                    { id: 'clcourse004' },
                    { id: 'clcourse005' },
                    { id: 'clcourse006' },
                    { id: 'clcourse007' },
                    { id: 'clcourse008' },
                    { id: 'clcourse009' },
                    { id: 'clcourse010' },
                ],
            },
        },
    });

    console.log('Connected courses to instructor');

    // Connect Courses to Student
    await prisma.student.update({
        where: { id: student1.id },
        data: {
            courses: {
                connect: [
                    { id: 'clcourse001' },
                    { id: 'clcourse002' },
                    { id: 'clcourse003' },
                    { id: 'clcourse005' },
                    { id: 'clcourse010' },
                ],
            },
        },
    });

    console.log('Connected courses to student');

    // Create Exams
    await prisma.exam.create({
        data: {
            id: 'clexam001',
            title: 'CS101 Midterm Exam',
            duration: 120,
            questions: [
                {
                    question: 'What is a variable in programming?',
                    model_answer:
                        'A variable is a named storage location in memory that holds a value which can be changed during program execution.',
                    points: 10,
                    type: 'SHORT_ANSWER',
                },
                {
                    question: 'Explain the difference between while and for loops.',
                    model_answer:
                        'A while loop continues as long as a condition is true, while a for loop is typically used when the number of iterations is known beforehand and includes initialization, condition, and increment in one line.',
                    points: 15,
                    type: 'SHORT_ANSWER',
                },
                {
                    question: 'Write a function to calculate factorial.',
                    model_answer:
                        'def factorial(n):\n    if n <= 1:\n        return 1\n    return n * factorial(n-1)',
                    points: 25,
                    type: 'SHORT_ANSWER',
                },
            ],
            type: ExamType.MIXED,
            examDate: new Date('2024-11-15T23:59:59.000Z'),
            modelAnswerFile: null,
            isActive: true,
            createdAt: new Date('2024-10-25T10:00:00.000Z'),
            updatedAt: new Date('2024-10-25T10:00:00.000Z'),
            instructorId: instructor1.id,
            courseId: 'clcourse001',
        },
    });

    await prisma.exam.create({
        data: {
            id: 'clexam002',
            title: 'CS101 Final Exam',
            duration: 180,
            questions: [
                {
                    question: 'What is object-oriented programming?',
                    model_answer:
                        'OOP is a programming paradigm based on objects that contain data and code. Key principles include encapsulation, inheritance, polymorphism, and abstraction.',
                    points: 20,
                    type: 'SHORT_ANSWER',
                },
                {
                    question: 'Python uses dynamic typing. True or False?',
                    model_answer: 'True',
                    points: 5,
                    type: 'TRUE_FALSE',
                },
                {
                    question: 'Implement a class for a bank account with deposit and withdraw methods.',
                    model_answer:
                        'class BankAccount:\n    def __init__(self, balance=0):\n        self.balance = balance\n    def deposit(self, amount):\n        self.balance += amount\n    def withdraw(self, amount):\n        if amount <= self.balance:\n            self.balance -= amount\n            return True\n        return False',
                    points: 30,
                    type: 'SHORT_ANSWER',
                },
            ],
            type: ExamType.MIXED,
            examDate: new Date('2024-12-20T23:59:59.000Z'),
            modelAnswerFile: null,
            isActive: true,
            createdAt: new Date('2024-11-01T10:00:00.000Z'),
            updatedAt: new Date('2024-11-01T10:00:00.000Z'),
            instructorId: instructor1.id,
            courseId: 'clcourse001',
        },
    });

    await prisma.exam.create({
        data: {
            id: 'clexam003',
            title: 'CS202 Quiz 1 - Arrays and Lists',
            duration: 45,
            questions: [
                {
                    question: 'What is the time complexity of accessing an element in an array by index?',
                    options: ['O(1)', 'O(n)', 'O(log n)', 'O(n^2)'],
                    model_answer: 'O(1)',
                    points: 10,
                    type: 'MCQ',
                },
                {
                    question: 'A linked list allows O(1) insertion at the beginning. True or False?',
                    model_answer: 'True',
                    points: 5,
                    type: 'TRUE_FALSE',
                },
                {
                    question: 'Explain the difference between arrays and linked lists.',
                    model_answer:
                        'Arrays store elements in contiguous memory with O(1) access time but O(n) insertion/deletion. Linked lists use non-contiguous memory with O(n) access but O(1) insertion/deletion at known positions.',
                    points: 15,
                    type: 'SHORT_ANSWER',
                },
            ],
            type: ExamType.MIXED,
            examDate: new Date('2024-11-08T23:59:59.000Z'),
            modelAnswerFile: null,
            isActive: true,
            createdAt: new Date('2024-10-20T09:00:00.000Z'),
            updatedAt: new Date('2024-10-20T09:00:00.000Z'),
            instructorId: instructor1.id,
            courseId: 'clcourse003',
        },
    });

    await prisma.exam.create({
        data: {
            id: 'clexam004',
            title: 'CS202 Midterm - Trees and Graphs',
            duration: 90,
            questions: [
                {
                    question: 'What is a binary search tree?',
                    model_answer:
                        'A binary search tree is a binary tree where for each node, all values in the left subtree are less than the node value, and all values in the right subtree are greater.',
                    points: 15,
                    type: 'SHORT_ANSWER',
                },
                {
                    question: 'Implement BFS traversal for a graph.',
                    model_answer:
                        'from collections import deque\ndef bfs(graph, start):\n    visited = set()\n    queue = deque([start])\n    visited.add(start)\n    while queue:\n        vertex = queue.popleft()\n        for neighbor in graph[vertex]:\n            if neighbor not in visited:\n                visited.add(neighbor)\n                queue.append(neighbor)',
                    points: 25,
                    type: 'SHORT_ANSWER',
                },
            ],
            type: ExamType.MIXED,
            examDate: new Date('2024-11-25T23:59:59.000Z'),
            modelAnswerFile: null,
            isActive: true,
            createdAt: new Date('2024-10-28T09:00:00.000Z'),
            updatedAt: new Date('2024-10-28T09:00:00.000Z'),
            instructorId: instructor1.id,
            courseId: 'clcourse003',
        },
    });

    await prisma.exam.create({
        data: {
            id: 'clexam005',
            title: 'MATH201 Calculus Quiz',
            duration: 60,
            questions: [
                {
                    question: 'Integrate x^2 dx',
                    model_answer: '(x^3)/3 + C',
                    points: 10,
                    type: 'SHORT_ANSWER',
                },
                {
                    question: 'What is the fundamental theorem of calculus?',
                    model_answer:
                        'The fundamental theorem of calculus links differentiation and integration, stating that integration is the inverse of differentiation.',
                    points: 15,
                    type: 'SHORT_ANSWER',
                },
            ],
            type: ExamType.SHORT_ANSWER,
            examDate: new Date('2024-11-10T23:59:59.000Z'),
            modelAnswerFile: null,
            isActive: true,
            createdAt: new Date('2024-10-15T14:00:00.000Z'),
            updatedAt: new Date('2024-10-15T14:00:00.000Z'),
            instructorId: instructor1.id,
            courseId: 'clcourse005',
        },
    });

    console.log('Created exams');

    // Create Submissions
    await prisma.submission.create({
        data: {
            id: 'clsubmit001',
            originalAnswers: {},
            status: SubmissionStatus.GRADED,
            gradedAt: new Date('2024-11-16T10:30:00.000Z'),
            createdAt: new Date('2024-11-15T20:45:00.000Z'),
            updatedAt: new Date('2024-11-16T10:30:00.000Z'),
            fileLink: 'https://storage.example.com/submissions/student1_exam1.pdf',
            studentId: student1.id,
            examId: 'clexam001',
        },
    });

    await prisma.submission.create({
        data: {
            id: 'clsubmit002',
            originalAnswers: {},
            status: SubmissionStatus.GRADED,
            gradedAt: new Date('2024-12-21T09:15:00.000Z'),
            createdAt: new Date('2024-12-20T22:30:00.000Z'),
            updatedAt: new Date('2024-12-21T09:15:00.000Z'),
            fileLink: 'https://storage.example.com/submissions/student1_exam2.pdf',
            studentId: student1.id,
            examId: 'clexam002',
        },
    });

    await prisma.submission.create({
        data: {
            id: 'clsubmit003',
            originalAnswers: {},
            status: SubmissionStatus.GRADED,
            gradedAt: new Date('2024-11-09T08:45:00.000Z'),
            createdAt: new Date('2024-11-08T23:15:00.000Z'),
            updatedAt: new Date('2024-11-09T08:45:00.000Z'),
            fileLink: 'https://storage.example.com/submissions/student1_exam3.pdf',
            studentId: student1.id,
            examId: 'clexam003',
        },
    });

    await prisma.submission.create({
        data: {
            id: 'clsubmit004',
            originalAnswers: {},
            status: SubmissionStatus.GRADED,
            gradedAt: new Date('2024-11-26T11:20:00.000Z'),
            createdAt: new Date('2024-11-25T21:00:00.000Z'),
            updatedAt: new Date('2024-11-26T11:20:00.000Z'),
            fileLink: 'https://storage.example.com/submissions/student1_exam4.pdf',
            studentId: student1.id,
            examId: 'clexam004',
        },
    });

    await prisma.submission.create({
        data: {
            id: 'clsubmit005',
            originalAnswers: {},
            status: SubmissionStatus.GRADED,
            gradedAt: new Date('2024-11-11T09:00:00.000Z'),
            createdAt: new Date('2024-11-10T22:50:00.000Z'),
            updatedAt: new Date('2024-11-11T09:00:00.000Z'),
            fileLink: 'https://storage.example.com/submissions/student1_exam5.pdf',
            studentId: student1.id,
            examId: 'clexam005',
        },
    });

    console.log('Created submissions');

    console.log('Seed completed successfully!');
}

main()
    .catch((e) => {
        console.error('Error during seeding:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });