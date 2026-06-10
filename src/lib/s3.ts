import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: process.env.AWS_REGION ?? 'eu-central-1',
  // No credentials block — SDK auto-uses IAM role
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME!;

/**
 * Generate S3 key for model answer
 * Format: model-answers/{exam_id}/model-answer.pdf
 */
export function generateModelAnswerKey(examId: string): string {
  return `model-answers/${examId}/model-answer.pdf`;
}

/**
 * Generate S3 key for student answer
 * Format: student-answers/{exam_id}/{student_id}/answer-sheet.pdf
 */
export function generateStudentAnswerKey(examId: string, studentUserId: string): string {
  return `student-answers/${examId}/${studentUserId}/answer-sheet.pdf`;
}

/**
 * Upload file to S3 with generated key
 */
export async function uploadToS3(file: Buffer, key: string, contentType: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: file,
    ContentType: contentType,
  });

  await s3Client.send(command);
  return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}

/**
 * Upload model answer to S3
 */
export async function uploadModelAnswer(examId: string, file: Buffer): Promise<string> {
  const key = generateModelAnswerKey(examId);
  return uploadToS3(file, key, 'application/pdf');
}

/**
 * Upload student answer to S3
 */
export async function uploadStudentAnswer(examId: string, studentUserId: string, file: Buffer): Promise<string> {
  const key = generateStudentAnswerKey(examId, studentUserId);
  return uploadToS3(file, key, 'application/pdf');
}

export async function deleteFromS3(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  await s3Client.send(command);
}

export async function getSignedUploadUrl(key: string, contentType: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(s3Client, command, { expiresIn: 3600 });
}