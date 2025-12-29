-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: mysql
-- Generation Time: Dec 29, 2025 at 12:51 AM
-- Server version: 8.0.43
-- PHP Version: 8.2.27

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `qayyim_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `courses`
--

CREATE TABLE `courses` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `courseCode` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `courseName` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sectionType` enum('LECTURE','LAB','TUTORIAL') COLLATE utf8mb4_unicode_ci NOT NULL,
  `sectionNumber` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `academicYear` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `semester` enum('FALL','SPRING','SUMMER') COLLATE utf8mb4_unicode_ci NOT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `courses`
--

INSERT INTO `courses` (`id`, `courseCode`, `courseName`, `sectionType`, `sectionNumber`, `academicYear`, `semester`, `isActive`) VALUES
('clcourse001', 'CS101', 'Introduction to Computer Science', 'LECTURE', '001', '2024-2025', 'FALL', 1),
('clcourse002', 'CS101', 'Introduction to Computer Science', 'LAB', '001', '2024-2025', 'FALL', 1),
('clcourse003', 'CS202', 'Data Structures and Algorithms', 'LECTURE', '001', '2024-2025', 'FALL', 1),
('clcourse004', 'CS202', 'Data Structures and Algorithms', 'LAB', '002', '2024-2025', 'FALL', 1),
('clcourse005', 'MATH201', 'Calculus II', 'LECTURE', '001', '2024-2025', 'FALL', 1),
('clcourse006', 'MATH201', 'Calculus II', 'TUTORIAL', '001', '2024-2025', 'FALL', 1),
('clcourse007', 'ENG301', 'Technical Writing', 'LECTURE', '001', '2024-2025', 'SPRING', 1),
('clcourse008', 'CS303', 'Database Systems', 'LECTURE', '001', '2024-2025', 'SPRING', 1),
('clcourse009', 'CS303', 'Database Systems', 'LAB', '001', '2024-2025', 'SPRING', 1),
('clcourse010', 'PHY101', 'Physics I', 'LECTURE', '001', '2024-2025', 'FALL', 1);

-- --------------------------------------------------------

--
-- Table structure for table `exams`
--

CREATE TABLE `exams` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `duration` int UNSIGNED DEFAULT NULL,
  `totalMarks` int UNSIGNED DEFAULT NULL,
  `questions` json DEFAULT NULL,
  `type` enum('MCQ','TRUE_FALSE','SHORT_ANSWER','MIXED') COLLATE utf8mb4_unicode_ci NOT NULL,
  `deadline` datetime(3) DEFAULT NULL,
  `modelAnswer` text COLLATE utf8mb4_unicode_ci,
  `rubric` text COLLATE utf8mb4_unicode_ci,
  `modelAnswerFile` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rubricFile` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  `courseId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `instructorId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `rubricLink` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `exams`
--

INSERT INTO `exams` (`id`, `title`, `description`, `duration`, `totalMarks`, `questions`, `type`, `deadline`, `modelAnswer`, `rubric`, `modelAnswerFile`, `rubricFile`, `isActive`, `createdAt`, `updatedAt`, `courseId`, `instructorId`, `rubricLink`) VALUES
('clexam001', 'CS101 Midterm Exam', 'Midterm examination covering programming fundamentals, variables, control structures, and functions.', 120, 100, '[{\"type\": \"SHORT_ANSWER\", \"points\": 10, \"question\": \"What is a variable in programming?\", \"model_answer\": \"A variable is a named storage location in memory that holds a value which can be changed during program execution.\"}, {\"type\": \"SHORT_ANSWER\", \"points\": 15, \"question\": \"Explain the difference between while and for loops.\", \"model_answer\": \"A while loop continues as long as a condition is true, while a for loop is typically used when the number of iterations is known beforehand and includes initialization, condition, and increment in one line.\"}, {\"type\": \"SHORT_ANSWER\", \"points\": 25, \"question\": \"Write a function to calculate factorial.\", \"model_answer\": \"def factorial(n):\\n    if n <= 1:\\n        return 1\\n    return n * factorial(n-1)\"}]', 'MIXED', '2024-11-15 23:59:59.000', 'See individual question model answers in the questions JSON field.', 'Grade based on correctness, code efficiency, and explanation clarity. Partial credit available for partially correct answers.', NULL, NULL, 1, '2024-10-25 10:00:00.000', '2024-10-25 10:00:00.000', 'clcourse001', 'cmhfehuu200027kic5hrxn5rm', NULL),
('clexam002', 'CS101 Final Exam', 'Comprehensive final exam covering all course topics including OOP, data structures basics, and file handling.', 180, 150, '[{\"type\": \"SHORT_ANSWER\", \"points\": 20, \"question\": \"What is object-oriented programming?\", \"model_answer\": \"OOP is a programming paradigm based on objects that contain data and code. Key principles include encapsulation, inheritance, polymorphism, and abstraction.\"}, {\"type\": \"TRUE_FALSE\", \"points\": 5, \"question\": \"Python uses dynamic typing. True or False?\", \"model_answer\": \"True\"}, {\"type\": \"SHORT_ANSWER\", \"points\": 30, \"question\": \"Implement a class for a bank account with deposit and withdraw methods.\", \"model_answer\": \"class BankAccount:\\n    def __init__(self, balance=0):\\n        self.balance = balance\\n    def deposit(self, amount):\\n        self.balance += amount\\n    def withdraw(self, amount):\\n        if amount <= self.balance:\\n            self.balance -= amount\\n            return True\\n        return False\"}]', 'MIXED', '2024-12-20 23:59:59.000', 'See individual question model answers.', 'Comprehensive rubric: Correctness (60%), Code quality (20%), Documentation (10%), Efficiency (10%)', NULL, NULL, 1, '2024-11-01 10:00:00.000', '2024-11-01 10:00:00.000', 'clcourse001', 'cmhfehuu200027kic5hrxn5rm', NULL),
('clexam003', 'CS202 Quiz 1 - Arrays and Lists', 'Quick quiz on arrays, lists, and basic complexity analysis.', 45, 50, '[{\"type\": \"MCQ\", \"points\": 10, \"options\": [\"O(1)\", \"O(n)\", \"O(log n)\", \"O(n^2)\"], \"question\": \"What is the time complexity of accessing an element in an array by index?\", \"model_answer\": \"O(1)\"}, {\"type\": \"TRUE_FALSE\", \"points\": 5, \"question\": \"A linked list allows O(1) insertion at the beginning. True or False?\", \"model_answer\": \"True\"}, {\"type\": \"SHORT_ANSWER\", \"points\": 15, \"question\": \"Explain the difference between arrays and linked lists.\", \"model_answer\": \"Arrays store elements in contiguous memory with O(1) access time but O(n) insertion/deletion. Linked lists use non-contiguous memory with O(n) access but O(1) insertion/deletion at known positions.\"}]', 'MIXED', '2024-11-08 23:59:59.000', 'See questions field.', 'Standard quiz rubric: correctness and clarity.', NULL, NULL, 1, '2024-10-20 09:00:00.000', '2024-10-20 09:00:00.000', 'clcourse003', 'cmhfehuu200027kic5hrxn5rm', NULL),
('clexam004', 'CS202 Midterm - Trees and Graphs', 'Midterm covering binary trees, BST, graph representations and traversals.', 90, 80, '[{\"type\": \"SHORT_ANSWER\", \"points\": 15, \"question\": \"What is a binary search tree?\", \"model_answer\": \"A binary search tree is a binary tree where for each node, all values in the left subtree are less than the node value, and all values in the right subtree are greater.\"}, {\"type\": \"SHORT_ANSWER\", \"points\": 25, \"question\": \"Implement BFS traversal for a graph.\", \"model_answer\": \"from collections import deque\\ndef bfs(graph, start):\\n    visited = set()\\n    queue = deque([start])\\n    visited.add(start)\\n    while queue:\\n        vertex = queue.popleft()\\n        for neighbor in graph[vertex]:\\n            if neighbor not in visited:\\n                visited.add(neighbor)\\n                queue.append(neighbor)\"}]', 'MIXED', '2024-11-25 23:59:59.000', 'See questions field.', 'Grade on correctness of algorithm, code quality, and time/space complexity analysis.', NULL, NULL, 1, '2024-10-28 09:00:00.000', '2024-10-28 09:00:00.000', 'clcourse003', 'cmhfehuu200027kic5hrxn5rm', NULL),
('clexam005', 'MATH201 Calculus Quiz', 'Integration techniques and applications.', 60, 40, '[{\"type\": \"SHORT_ANSWER\", \"points\": 10, \"question\": \"Integrate x^2 dx\", \"model_answer\": \"(x^3)/3 + C\"}, {\"type\": \"SHORT_ANSWER\", \"points\": 15, \"question\": \"What is the fundamental theorem of calculus?\", \"model_answer\": \"The fundamental theorem of calculus links differentiation and integration, stating that integration is the inverse of differentiation.\"}]', 'SHORT_ANSWER', '2024-11-10 23:59:59.000', 'See questions field.', 'Mathematical accuracy and showing work is required.', NULL, NULL, 1, '2024-10-15 14:00:00.000', '2024-10-15 14:00:00.000', 'clcourse005', 'cmhfehuu200027kic5hrxn5rm', NULL),
('cmj2vlv85000dux805gjqgot3', '1', '1', NULL, NULL, NULL, 'MIXED', NULL, NULL, NULL, 'https://ai-exam-grader-pdfs.s3.eu-central-1.amazonaws.com/model-answers/cmj2vlv85000dux805gjqgot3/model-answer.pdf', NULL, 1, '2025-12-12 13:01:35.190', '2025-12-12 13:01:36.193', NULL, 'cmiwtlxc90002uxtw9dgv4f6a', NULL),
('cmj2w554i000fux80mo68nnq8', '2', '2', NULL, NULL, NULL, 'MIXED', NULL, NULL, NULL, 'https://ai-exam-grader-pdfs.s3.eu-central-1.amazonaws.com/model-answers/cmj2w554i000fux80mo68nnq8/model-answer.pdf', NULL, 1, '2025-12-12 13:16:34.483', '2025-12-12 13:16:35.492', NULL, 'cmiwtlxc90002uxtw9dgv4f6a', NULL),
('cmj347f26000buxs82yirb0xw', '9', '9', NULL, NULL, NULL, 'TRUE_FALSE', NULL, NULL, NULL, 'https://ai-exam-grader-pdfs.s3.eu-central-1.amazonaws.com/model-answers/cmj347f26000buxs82yirb0xw/model-answer.pdf', NULL, 1, '2025-12-12 17:02:17.598', '2025-12-12 17:02:19.483', NULL, 'cmiwtlxc90002uxtw9dgv4f6a', NULL),
('cmj380hv50001uxl4td482gq3', '10', '10', NULL, NULL, NULL, 'MIXED', NULL, NULL, NULL, 'https://ai-exam-grader-pdfs.s3.eu-central-1.amazonaws.com/model-answers/cmj380hv50001uxl4td482gq3/model-answer.pdf', NULL, 1, '2025-12-12 18:48:53.105', '2025-12-12 18:48:54.100', NULL, 'cmiwtlxc90002uxtw9dgv4f6a', NULL),
('cmjadq0u90001uxd0p8fv50it', 'math', 'cs101', NULL, NULL, NULL, 'MIXED', '2025-12-01 00:00:00.000', NULL, 'haha mansy is gay  ', 'https://ai-exam-grader-pdfs.s3.eu-central-1.amazonaws.com/model-answers/cmjadq0u90001uxd0p8fv50it/model-answer.pdf', NULL, 1, '2025-12-17 19:03:05.368', '2025-12-17 19:03:06.036', NULL, 'cmiwtlxc90002uxtw9dgv4f6a', NULL),
('cmjae4gpv000buxd05lyl2udj', 'DataBase Midterm', 'Database', NULL, NULL, NULL, 'MIXED', NULL, NULL, NULL, 'https://ai-exam-grader-pdfs.s3.eu-central-1.amazonaws.com/model-answers/cmjae4gpv000buxd05lyl2udj/model-answer.pdf', NULL, 1, '2025-12-17 19:14:19.171', '2025-12-17 19:14:21.843', NULL, 'cmiwtlxc90002uxtw9dgv4f6a', NULL),
('cmjae9rl3000duxd0mnty5wbc', 'Data Structures Final ', 'CS202 - Data Structures and Algorithms', NULL, NULL, NULL, 'MIXED', NULL, NULL, NULL, 'https://ai-exam-grader-pdfs.s3.eu-central-1.amazonaws.com/model-answers/cmjae9rl3000duxd0mnty5wbc/model-answer.pdf', NULL, 1, '2025-12-17 19:18:26.535', '2025-12-17 19:18:28.371', 'clcourse003', 'cmiwtlxc90002uxtw9dgv4f6a', NULL),
('cmjdfxoqf0001uxksxx8qm6cy', 'OS', 'CS202 - Data Structures and Algorithms', NULL, NULL, NULL, 'MIXED', NULL, NULL, NULL, 'https://ai-exam-grader-pdfs.s3.eu-central-1.amazonaws.com/model-answers/cmjdfxoqf0001uxksxx8qm6cy/model-answer.pdf', NULL, 1, '2025-12-19 22:28:20.581', '2025-12-19 22:28:22.426', 'clcourse003', 'cmiwtlxc90002uxtw9dgv4f6a', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `grievances`
--

CREATE TABLE `grievances` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `grievanceType` enum('SCORE_DISAGREEMENT','INCORRECT_FEEDBACK','MISSING_ANSWER','OTHER') COLLATE utf8mb4_unicode_ci NOT NULL,
  `questionNumber` int DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('PENDING','UNDER_REVIEW','RESOLVED','REJECTED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `instructorResponse` text COLLATE utf8mb4_unicode_ci,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `reviewedAt` datetime(3) DEFAULT NULL,
  `resolvedAt` datetime(3) DEFAULT NULL,
  `studentId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `examId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `submissionId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `grievances`
--

INSERT INTO `grievances` (`id`, `grievanceType`, `questionNumber`, `description`, `status`, `instructorResponse`, `createdAt`, `reviewedAt`, `resolvedAt`, `studentId`, `examId`, `submissionId`) VALUES
('cmjanzbm10001uxnot6eyiure', 'INCORRECT_FEEDBACK', 3, 'I should get full mark this is stupid! I should get full mark this is stupid!', 'REJECTED', 'naaaah but ur so fckign bad lol u aint getting no marks', '2025-12-17 23:50:15.382', '2025-12-19 22:24:19.408', '2025-12-19 22:24:10.696', 'cmizjzhx20002uxvosih414ih', 'cmjadq0u90001uxd0p8fv50it', 'cmjadsbrj0003uxd0e4yl3u3f'),
('cmjdgfzph000buxksygwt5uee', 'MISSING_ANSWER', 2, 'dsdsds ssds sd sds  dsdsds ssds sd sds  dsdsds ssds sd sds  dsdsds ssds sd sds  ', 'PENDING', NULL, '2025-12-19 22:42:34.758', NULL, NULL, 'cmizjzhx20002uxvosih414ih', 'cmj347f26000buxs82yirb0xw', 'cmj37tn740001ux20dait45vn');

-- --------------------------------------------------------

--
-- Table structure for table `instructors`
--

CREATE TABLE `instructors` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `instructors`
--

INSERT INTO `instructors` (`id`, `userId`) VALUES
('cmhfehuu200027kic5hrxn5rm', 'cmhfehuiv00007kicjtc4h4zx'),
('cmiwtlxc90002uxtw9dgv4f6a', 'cmiwtlxbg0000uxtwpe4a46iv');

-- --------------------------------------------------------

--
-- Table structure for table `students`
--

CREATE TABLE `students` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `students`
--

INSERT INTO `students` (`id`, `userId`) VALUES
('cmhfemzzt00057kicoeo82gdz', 'cmhfemzx600037kicc6lzbv8e'),
('cmizjzhx20002uxvosih414ih', 'cmizjzhs60000uxvob8gle290');

-- --------------------------------------------------------

--
-- Table structure for table `submissions`
--

CREATE TABLE `submissions` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `marks` int UNSIGNED DEFAULT NULL,
  `feedback` text COLLATE utf8mb4_unicode_ci,
  `status` enum('PENDING','GRADED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `gradedAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  `studentId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `examId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fileLink` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `originalAnswers` json NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `submissions`
--

INSERT INTO `submissions` (`id`, `marks`, `feedback`, `status`, `gradedAt`, `createdAt`, `updatedAt`, `studentId`, `examId`, `fileLink`, `originalAnswers`) VALUES
('clsubmit001', 47, 'Good understanding of concepts. The factorial implementation using iteration is correct but the recursive solution would be more elegant. Minor point deduction for missing edge case handling.', 'GRADED', '2024-11-16 10:30:00.000', '2024-11-15 20:45:00.000', '2024-11-16 10:30:00.000', 'cmhfemzzt00057kicoeo82gdz', 'clexam001', 'https://storage.example.com/submissions/student1_exam1.pdf', '{}'),
('clsubmit002', 48, 'Solid understanding of OOP concepts. Bank account implementation is functional but missing validation in withdraw method (should check if balance is sufficient). Good effort overall.', 'GRADED', '2024-12-21 09:15:00.000', '2024-12-20 22:30:00.000', '2024-12-21 09:15:00.000', 'cmhfemzzt00057kicoeo82gdz', 'clexam002', 'https://storage.example.com/submissions/student1_exam2.pdf', '{}'),
('clsubmit003', 29, 'Excellent work on MCQ and True/False. The explanation of arrays vs linked lists is good but could be more detailed regarding memory allocation.', 'GRADED', '2024-11-09 08:45:00.000', '2024-11-08 23:15:00.000', '2024-11-09 08:45:00.000', 'cmhfemzzt00057kicoeo82gdz', 'clexam003', 'https://storage.example.com/submissions/student1_exam3.pdf', '{}'),
('clsubmit004', 35, 'Good grasp of BST concept. BFS implementation is mostly correct but using a proper deque would be more efficient than list.pop(0). Consider the performance implications.', 'GRADED', '2024-11-26 11:20:00.000', '2024-11-25 21:00:00.000', '2024-11-26 11:20:00.000', 'cmhfemzzt00057kicoeo82gdz', 'clexam004', 'https://storage.example.com/submissions/student1_exam4.pdf', '{}'),
('clsubmit005', 23, 'Perfect integration result. Good explanation of fundamental theorem but could include both parts of the theorem for completeness.', 'GRADED', '2024-11-11 09:00:00.000', '2024-11-10 22:50:00.000', '2024-11-11 09:00:00.000', 'cmhfemzzt00057kicoeo82gdz', 'clexam005', 'https://storage.example.com/submissions/student1_exam5.pdf', '{}'),
('cmj2w5k4m000hux80g6gyo5dy', NULL, NULL, 'PENDING', NULL, '2025-12-12 13:16:53.926', '2025-12-12 18:44:56.886', 'cmizjzhx20002uxvosih414ih', 'cmj2w554i000fux80mo68nnq8', 'https://ai-exam-grader-pdfs.s3.eu-central-1.amazonaws.com/student-answers/cmj2w554i000fux80mo68nnq8/cmizjzhs60000uxvob8gle290/answer-sheet.pdf', '{}'),
('cmj2weisz0001ux304wfikfmo', NULL, NULL, 'PENDING', NULL, '2025-12-12 13:23:52.116', '2025-12-12 17:01:55.116', 'cmizjzhx20002uxvosih414ih', 'cmj2vlv85000dux805gjqgot3', 'https://ai-exam-grader-pdfs.s3.eu-central-1.amazonaws.com/student-answers/cmj2vlv85000dux805gjqgot3/cmizjzhs60000uxvob8gle290/answer-sheet.pdf', '{}'),
('cmj323a8j0003ux30xoxwswse', NULL, NULL, 'PENDING', NULL, '2025-12-12 16:03:05.488', '2025-12-12 18:45:22.966', 'cmhfemzzt00057kicoeo82gdz', 'cmj2w554i000fux80mo68nnq8', 'https://ai-exam-grader-pdfs.s3.eu-central-1.amazonaws.com/student-answers/cmj2w554i000fux80mo68nnq8/cmhfemzx600037kicc6lzbv8e/answer-sheet.pdf', '{}'),
('cmj37tn740001ux20dait45vn', NULL, NULL, 'PENDING', NULL, '2025-12-12 18:43:33.424', '2025-12-12 18:43:33.424', 'cmizjzhx20002uxvosih414ih', 'cmj347f26000buxs82yirb0xw', 'https://ai-exam-grader-pdfs.s3.eu-central-1.amazonaws.com/student-answers/cmj347f26000buxs82yirb0xw/cmizjzhs60000uxvob8gle290/answer-sheet.pdf', '{}'),
('cmj380tj00003uxl4szj2dzjz', NULL, NULL, 'PENDING', NULL, '2025-12-12 18:49:08.219', '2025-12-12 18:49:14.562', 'cmizjzhx20002uxvosih414ih', 'cmj380hv50001uxl4td482gq3', 'https://ai-exam-grader-pdfs.s3.eu-central-1.amazonaws.com/student-answers/cmj380hv50001uxl4td482gq3/cmizjzhs60000uxvob8gle290/answer-sheet.pdf', '{}'),
('cmjadsbrj0003uxd0e4yl3u3f', NULL, NULL, 'PENDING', NULL, '2025-12-17 19:04:52.879', '2025-12-17 19:06:06.387', 'cmizjzhx20002uxvosih414ih', 'cmjadq0u90001uxd0p8fv50it', 'https://ai-exam-grader-pdfs.s3.eu-central-1.amazonaws.com/student-answers/cmjadq0u90001uxd0p8fv50it/cmizjzhs60000uxvob8gle290/answer-sheet.pdf', '{}'),
('cmjadtrhd0007uxd0tjkh7jq9', NULL, NULL, 'PENDING', NULL, '2025-12-17 19:05:59.905', '2025-12-17 19:05:59.905', 'cmhfemzzt00057kicoeo82gdz', 'cmjadq0u90001uxd0p8fv50it', 'https://ai-exam-grader-pdfs.s3.eu-central-1.amazonaws.com/student-answers/cmjadq0u90001uxd0p8fv50it/cmhfemzx600037kicc6lzbv8e/answer-sheet.pdf', '{}'),
('cmjaed5ji000fuxd0y055mhul', NULL, NULL, 'PENDING', NULL, '2025-12-17 19:21:04.590', '2025-12-17 19:21:04.590', 'cmhfemzzt00057kicoeo82gdz', 'cmjae9rl3000duxd0mnty5wbc', 'https://ai-exam-grader-pdfs.s3.eu-central-1.amazonaws.com/student-answers/cmjae9rl3000duxd0mnty5wbc/cmhfemzx600037kicc6lzbv8e/answer-sheet.pdf', '{}'),
('cmjdfysok0003uxksebe56is9', NULL, NULL, 'PENDING', NULL, '2025-12-19 22:29:12.501', '2025-12-19 22:32:05.037', 'cmhfemzzt00057kicoeo82gdz', 'cmjdfxoqf0001uxksxx8qm6cy', 'https://ai-exam-grader-pdfs.s3.eu-central-1.amazonaws.com/student-answers/cmjdfxoqf0001uxksxx8qm6cy/cmhfemzx600037kicc6lzbv8e/answer-sheet.pdf', '{}'),
('cmjdfytem0005uxkscy0urroa', NULL, NULL, 'PENDING', NULL, '2025-12-19 22:29:13.438', '2025-12-19 22:32:06.634', 'cmizjzhx20002uxvosih414ih', 'cmjdfxoqf0001uxksxx8qm6cy', 'https://ai-exam-grader-pdfs.s3.eu-central-1.amazonaws.com/student-answers/cmjdfxoqf0001uxksxx8qm6cy/cmizjzhs60000uxvob8gle290/answer-sheet.pdf', '{}');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `email`, `password`, `name`, `createdAt`, `updatedAt`) VALUES
('cmhfehuiv00007kicjtc4h4zx', 'mm@m.com', '$2b$10$zi8Orc.TM87XkZEVWDkdiO0H5sGjwh.zaFlvjFvBNDNS4frSY3Nr.', 'Mohamed Ahmed', '2025-10-31 22:04:09.800', '2025-11-28 20:55:10.614'),
('cmhfemzx600037kicc6lzbv8e', 'ymansy@gmail.com', '$2b$10$aL7amsJ4ZjaYMcimdxg.O.nbELb5R1baJCiLoeKeWEvsS1i2f9whW', 'Youssef Mohamed Mansy', '2025-10-31 22:04:09.800', '2025-11-28 20:55:10.614'),
('cmiwtlxbg0000uxtwpe4a46iv', 'adham@gmail.com', '$2b$10$3yG1Y.MC6VRsN90UeRBmUePdPlPTyW5JJFu0U51.8y6PWuohhGVsC', 'adham hossam', '2025-12-08 07:19:01.610', '2025-12-08 07:19:01.610'),
('cmizjzhs60000uxvob8gle290', 'adhams@gmail.com', '$2b$10$tuk96A.v5llU.x2eGHtike7TRM0q6qxzGclGPGwBK0qgiXxyj2Vnm', 'adham student', '2025-12-10 05:12:56.991', '2025-12-10 05:12:56.991');

-- --------------------------------------------------------

--
-- Table structure for table `_CourseInstructors`
--

CREATE TABLE `_CourseInstructors` (
  `A` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `B` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `_CourseInstructors`
--

INSERT INTO `_CourseInstructors` (`A`, `B`) VALUES
('clcourse001', 'cmhfehuu200027kic5hrxn5rm'),
('clcourse002', 'cmhfehuu200027kic5hrxn5rm'),
('clcourse003', 'cmhfehuu200027kic5hrxn5rm'),
('clcourse004', 'cmhfehuu200027kic5hrxn5rm'),
('clcourse005', 'cmhfehuu200027kic5hrxn5rm'),
('clcourse006', 'cmhfehuu200027kic5hrxn5rm'),
('clcourse010', 'cmhfehuu200027kic5hrxn5rm'),
('clcourse003', 'cmiwtlxc90002uxtw9dgv4f6a'),
('clcourse007', 'cmiwtlxc90002uxtw9dgv4f6a'),
('clcourse008', 'cmiwtlxc90002uxtw9dgv4f6a'),
('clcourse009', 'cmiwtlxc90002uxtw9dgv4f6a');

-- --------------------------------------------------------

--
-- Table structure for table `_CourseStudents`
--

CREATE TABLE `_CourseStudents` (
  `A` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `B` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `_CourseStudents`
--

INSERT INTO `_CourseStudents` (`A`, `B`) VALUES
('clcourse001', 'cmhfemzzt00057kicoeo82gdz'),
('clcourse002', 'cmhfemzzt00057kicoeo82gdz'),
('clcourse003', 'cmhfemzzt00057kicoeo82gdz'),
('clcourse004', 'cmhfemzzt00057kicoeo82gdz'),
('clcourse005', 'cmhfemzzt00057kicoeo82gdz'),
('clcourse001', 'cmizjzhx20002uxvosih414ih'),
('clcourse002', 'cmizjzhx20002uxvosih414ih'),
('clcourse008', 'cmizjzhx20002uxvosih414ih'),
('clcourse009', 'cmizjzhx20002uxvosih414ih'),
('clcourse010', 'cmizjzhx20002uxvosih414ih');

-- --------------------------------------------------------

--
-- Table structure for table `_prisma_migrations`
--

CREATE TABLE `_prisma_migrations` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `checksum` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `finished_at` datetime(3) DEFAULT NULL,
  `migration_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `logs` text COLLATE utf8mb4_unicode_ci,
  `rolled_back_at` datetime(3) DEFAULT NULL,
  `started_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `applied_steps_count` int UNSIGNED NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `_prisma_migrations`
--

INSERT INTO `_prisma_migrations` (`id`, `checksum`, `finished_at`, `migration_name`, `logs`, `rolled_back_at`, `started_at`, `applied_steps_count`) VALUES
('461b7346-1d30-4731-8b53-cebbd34634bd', 'fedfb59bae9b3e757c2e5cfa33e818d5c56d000f985c96430455aed730588864', '2025-12-08 07:04:07.936', '20251208070406_init', NULL, NULL, '2025-12-08 07:04:06.293', 1),
('c12b31d2-e273-41a5-8e03-52fbebba02ea', '1ef2c1e6e9dea35dda93ff14e2cfe1530c6f06c405f01cdb080e8d64af5a785a', '2025-12-08 06:50:22.253', '20251020214708_init', NULL, NULL, '2025-12-08 06:50:21.716', 1);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `courses`
--
ALTER TABLE `courses`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `courses_courseCode_sectionType_academicYear_semester_section_key` (`courseCode`,`sectionType`,`academicYear`,`semester`,`sectionNumber`);

--
-- Indexes for table `exams`
--
ALTER TABLE `exams`
  ADD PRIMARY KEY (`id`),
  ADD KEY `exams_createdAt_idx` (`createdAt`),
  ADD KEY `exams_instructorId_idx` (`instructorId`),
  ADD KEY `exams_courseId_idx` (`courseId`);

--
-- Indexes for table `grievances`
--
ALTER TABLE `grievances`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `grievances_submissionId_key` (`submissionId`),
  ADD KEY `grievances_studentId_idx` (`studentId`),
  ADD KEY `grievances_examId_idx` (`examId`),
  ADD KEY `grievances_status_idx` (`status`),
  ADD KEY `grievances_createdAt_idx` (`createdAt`);

--
-- Indexes for table `instructors`
--
ALTER TABLE `instructors`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `instructors_userId_key` (`userId`);

--
-- Indexes for table `students`
--
ALTER TABLE `students`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `students_userId_key` (`userId`);

--
-- Indexes for table `submissions`
--
ALTER TABLE `submissions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `submissions_studentId_examId_key` (`studentId`,`examId`),
  ADD KEY `submissions_studentId_idx` (`studentId`),
  ADD KEY `submissions_examId_idx` (`examId`),
  ADD KEY `submissions_status_idx` (`status`),
  ADD KEY `submissions_gradedAt_idx` (`gradedAt`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `users_email_key` (`email`);

--
-- Indexes for table `_CourseInstructors`
--
ALTER TABLE `_CourseInstructors`
  ADD UNIQUE KEY `_CourseInstructors_AB_unique` (`A`,`B`),
  ADD KEY `_CourseInstructors_B_index` (`B`);

--
-- Indexes for table `_CourseStudents`
--
ALTER TABLE `_CourseStudents`
  ADD UNIQUE KEY `_CourseStudents_AB_unique` (`A`,`B`),
  ADD KEY `_CourseStudents_B_index` (`B`);

--
-- Indexes for table `_prisma_migrations`
--
ALTER TABLE `_prisma_migrations`
  ADD PRIMARY KEY (`id`);

--
-- Constraints for dumped tables
--

--
-- Constraints for table `exams`
--
ALTER TABLE `exams`
  ADD CONSTRAINT `exams_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `courses` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `exams_instructorId_fkey` FOREIGN KEY (`instructorId`) REFERENCES `instructors` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `grievances`
--
ALTER TABLE `grievances`
  ADD CONSTRAINT `grievances_examId_fkey` FOREIGN KEY (`examId`) REFERENCES `exams` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `grievances_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `students` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `grievances_submissionId_fkey` FOREIGN KEY (`submissionId`) REFERENCES `submissions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `instructors`
--
ALTER TABLE `instructors`
  ADD CONSTRAINT `instructors_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `students`
--
ALTER TABLE `students`
  ADD CONSTRAINT `students_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `submissions`
--
ALTER TABLE `submissions`
  ADD CONSTRAINT `submissions_examId_fkey` FOREIGN KEY (`examId`) REFERENCES `exams` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `submissions_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `students` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `_CourseInstructors`
--
ALTER TABLE `_CourseInstructors`
  ADD CONSTRAINT `_CourseInstructors_A_fkey` FOREIGN KEY (`A`) REFERENCES `courses` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `_CourseInstructors_B_fkey` FOREIGN KEY (`B`) REFERENCES `instructors` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `_CourseStudents`
--
ALTER TABLE `_CourseStudents`
  ADD CONSTRAINT `_CourseStudents_A_fkey` FOREIGN KEY (`A`) REFERENCES `courses` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `_CourseStudents_B_fkey` FOREIGN KEY (`B`) REFERENCES `students` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
